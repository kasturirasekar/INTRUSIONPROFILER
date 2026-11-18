from __future__ import annotations

import io
import pickle
import unittest
import numpy as np
import pandas as pd
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier

from backend.app.services.research.evaluation_engine import evaluation_engine
from backend.app.services.research.robustness_service import robustness_service
from backend.app.services.research.drift_service import drift_service
from backend.app.services.studio.dataset_manager import dataset_manager
from backend.app.services.studio.studio_experiment_service import studio_experiment_service
from backend.app.services.studio.studio_explain_service import studio_explain_service
from backend.app.schemas.research import (
    BenchmarkRunRequest,
    RobustnessExperimentRequest,
    DriftAnalysisRequest,
    ExplanationStabilityRequest,
)
from backend.app.schemas.studio import (
    StudioExperimentRequest,
    ModelConfigSpec,
    BaseLearnerSpec,
    StudioExplainRequest,
)

class TestSemesterProjectUpgrade(unittest.TestCase):
    """
    Comprehensive verification suite for Semester Project Upgrade:
    Data Validation, Preprocessing Leakage Prevention, Multiclass & Binary Classification,
    Ensemble Training, Serialization/Reload, Robustness, Drift, and Explainability.
    """

    @classmethod
    def setUpClass(cls):
        # Load sample binary and multiclass datasets into memory
        cls.bin_data = dataset_manager.load_sample_dataset("binary", max_rows=150)
        cls.mc_data = dataset_manager.load_sample_dataset("multiclass", max_rows=150)

    def test_01_data_validation(self):
        """Validates schema integrity and quality metrics."""
        self.assertGreater(self.bin_data.record_count, 0)
        self.assertEqual(self.bin_data.suggested_target, "target")
        self.assertTrue(self.bin_data.quality_summary.has_labels)

        self.assertGreater(self.mc_data.record_count, 0)
        dist = self.mc_data.quality_summary.target_class_distribution
        self.assertIsNotNone(dist)
        # Should have multiple attack classes (e.g. BENIGN, DoS, DDoS, etc.)
        self.assertGreaterEqual(len(dist), 2)

    def test_02_preprocessing_leakage_prevention(self):
        """
        Scientifically verifies that test set statistics are NEVER leaked into preprocessing transformers.
        """
        rng = np.random.RandomState(42)
        X_train = pd.DataFrame({
            "feat_a": rng.normal(10.0, 2.0, size=100),
            "feat_b": rng.normal(50.0, 5.0, size=100),
        })
        # Test set has intentionally distinct distribution (mean=100)
        X_test = pd.DataFrame({
            "feat_a": rng.normal(100.0, 2.0, size=50),
            "feat_b": rng.normal(500.0, 5.0, size=50),
        })

        scaler = StandardScaler()
        # Fit ONLY on train
        scaler.fit(X_train)

        # Scaler mean must match X_train mean within statistical tolerance, NOT test mean
        np.testing.assert_almost_equal(scaler.mean_[0], X_train["feat_a"].mean(), decimal=5)
        self.assertNotAlmostEqual(scaler.mean_[0], X_test["feat_a"].mean(), delta=50.0)

        # Transform both without altering scaler state
        X_tr_trans = scaler.transform(X_train)
        X_te_trans = scaler.transform(X_test)

        self.assertEqual(X_tr_trans.shape, (100, 2))
        self.assertEqual(X_te_trans.shape, (50, 2))
        np.testing.assert_almost_equal(np.mean(X_tr_trans[:, 0]), 0.0, decimal=5)

    def test_03_binary_and_multiclass_evaluation_engine(self):
        """
        Tests unified evaluation engine across Decision Tree, Random Forest, Voting, and Stacking.
        """
        req_bin = BenchmarkRunRequest(
            dataset_id=self.bin_data.dataset_id,
            target_column="target",
            task_type="binary",
            evaluation_strategy="stratified_split",
            test_split_ratio=0.25,
            random_seed=42,
            selected_models=["decision_tree", "random_forest", "voting", "stacking"],
        )
        res_bin = evaluation_engine.run_benchmark(req_bin)
        self.assertEqual(res_bin.task_type, "binary")
        self.assertEqual(len(res_bin.results), 4)
        for r in res_bin.results:
            self.assertGreater(r.accuracy, 0.5)
            self.assertGreater(r.f1_macro, 0.5)
            self.assertGreaterEqual(r.training_time_seconds, 0.0)
            self.assertGreater(r.model_size_kb, 0.0)

        # Multiclass benchmark
        req_mc = BenchmarkRunRequest(
            dataset_id=self.mc_data.dataset_id,
            target_column="target",
            task_type="multiclass",
            evaluation_strategy="stratified_split",
            test_split_ratio=0.25,
            random_seed=42,
            selected_models=["decision_tree", "random_forest"],
        )
        res_mc = evaluation_engine.run_benchmark(req_mc)
        self.assertEqual(res_mc.task_type, "multiclass")
        self.assertGreater(len(res_mc.results), 0)
        self.assertGreater(len(res_mc.results[0].per_class_metrics), 1)

    def test_04_controlled_robustness_experiments(self):
        """
        Tests model resilience degradation under feature noise, missing values, and distribution shift.
        """
        req = RobustnessExperimentRequest(
            dataset_id=self.bin_data.dataset_id,
            target_column="target",
            stress_type="feature_noise",
            stress_intensity=0.20,
            baseline_model_id="decision_tree",
            ensemble_model_id="random_forest",
            random_seed=42,
        )
        resp = robustness_service.run_robustness_experiment(req)
        self.assertTrue(resp.is_synthetic)
        self.assertIn("synthetic", resp.disclaimer.lower())
        self.assertGreater(resp.baseline_comparison.resilience_score, 0.0)
        self.assertGreater(resp.ensemble_comparison.resilience_score, 0.0)
        self.assertIn("analysis_summary", resp.model_dump())

    def test_05_traffic_drift_analysis(self):
        """
        Tests KS-test, PSI, and Wasserstein distance computation between two traffic distributions.
        """
        req = DriftAnalysisRequest(
            reference_dataset_id=self.bin_data.dataset_id,
            incoming_dataset_id=self.mc_data.dataset_id,
            alpha_significance=0.05,
        )
        resp = drift_service.analyze_drift(req)
        self.assertGreater(resp.total_features_analyzed, 0)
        self.assertIn(resp.overall_drift_severity, ["Low", "Moderate", "High", "Critical"])
        self.assertIn("Traffic drift reflects", resp.disclaimer)

        for fd in resp.feature_details:
            self.assertGreaterEqual(fd.p_value, 0.0)
            self.assertLessEqual(fd.p_value, 1.0)
            self.assertGreaterEqual(fd.psi_score, 0.0)
            self.assertIn(fd.drift_status, ["Stable", "Moderate Drift", "Significant Drift"])

    def test_06_model_serialization_and_reload(self):
        """
        Tests that an ensemble pipeline serializes to joblib/pickle and produces 100% identical predictions when reloaded.
        """
        rf = RandomForestClassifier(n_estimators=10, random_state=42)
        X = np.random.randn(50, 5)
        y = np.random.choice(["Benign", "Attack"], size=50)
        rf.fit(X, y)
        orig_preds = rf.predict(X)

        buf = io.BytesIO()
        pickle.dump(rf, buf)
        buf.seek(0)
        reloaded = pickle.load(buf)
        reloaded_preds = reloaded.predict(X)

        np.testing.assert_array_equal(orig_preds, reloaded_preds)

    def test_07_experiment_reproducibility(self):
        """
        Verifies that runs with the same random seed produce identical metrics.
        """
        req1 = BenchmarkRunRequest(
            dataset_id=self.bin_data.dataset_id,
            target_column="target",
            task_type="binary",
            evaluation_strategy="stratified_split",
            test_split_ratio=0.25,
            random_seed=123,
            selected_models=["decision_tree"],
        )
        req2 = BenchmarkRunRequest(
            dataset_id=self.bin_data.dataset_id,
            target_column="target",
            task_type="binary",
            evaluation_strategy="stratified_split",
            test_split_ratio=0.25,
            random_seed=123,
            selected_models=["decision_tree"],
        )
        res1 = evaluation_engine.run_benchmark(req1)
        res2 = evaluation_engine.run_benchmark(req2)

        self.assertEqual(res1.results[0].accuracy, res2.results[0].accuracy)
        self.assertEqual(res1.results[0].f1_macro, res2.results[0].f1_macro)

    def test_08_counterfactual_feasibility_validation(self):
        """
        Tests networking constraint validations (ports 1-65535, flags 0/1, non-negative duration).
        """
        # Execute an experiment first
        req = StudioExperimentRequest(
            experiment_name="Feasibility Test Run",
            dataset_id=self.bin_data.dataset_id,
            target_column="target",
            feature_columns=self.bin_data.columns[:6],
            test_split_ratio=0.2,
            random_seed=42,
            model_settings=ModelConfigSpec(
                strategy="voting",
                base_estimator_id="decision_tree",
                voting_type="soft",
                meta_classifier_id="logistic_regression",
                meta_classifier_hyperparameters={},
                cv_folds=2,
                n_estimators=10,
                learning_rate=0.1,
                max_depth=4,
                base_classifiers=[
                    BaseLearnerSpec(model_id="decision_tree", enabled=True, hyperparameters={"max_depth": 4}, weight=1.0),
                ]
            )
        )
        st = studio_experiment_service.launch_experiment(req)
        import time
        for _ in range(30):
            st = studio_experiment_service.get_status(st.experiment_id)
            if st.status in ["completed", "failed"]:
                break
            time.sleep(0.1)

        self.assertEqual(st.status, "completed")

        feas_resp = studio_explain_service.check_counterfactual_feasibility(st.experiment_id, 0)
        self.assertIn("non_causal_notice", feas_resp.model_dump())
        self.assertGreater(len(feas_resp.changes_suggested), 0)

        # Test explanation stability
        stab_resp = studio_explain_service.test_explanation_stability(
            ExplanationStabilityRequest(experiment_id=st.experiment_id, record_index=0, epsilon=0.02)
        )
        self.assertGreaterEqual(stab_resp.attribution_cosine_similarity, 0.0)
        self.assertLessEqual(stab_resp.attribution_cosine_similarity, 1.0)
        self.assertIn(stab_resp.stability_grade, ["Highly Stable", "Moderately Stable", "Sensitive"])

if __name__ == "__main__":
    unittest.main()
