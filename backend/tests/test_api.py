import unittest
from backend.app.api.routes import health, dashboard, traffic, threats, analytics, model, predictions, reports, lab, explainability, studio
from backend.app.schemas.prediction import SinglePredictionRequest
from backend.app.schemas.lab import DatasetSelectionConfig, PreprocessingConfig, EnsembleConfig, BaseClassifierConfig, ExperimentRequest, PreprocessingPreviewRequest
from backend.app.schemas.explainability import FlowExplainRequest, LimeExplainRequest, CounterfactualRequest, EnsembleExplainRequest

class TestBackendEndpoints(unittest.TestCase):
    def test_health(self):
        res = health.get_health()
        self.assertIn(res.status, ["ok", "degraded"])
        self.assertTrue(res.model_loaded)
        self.assertGreater(res.feature_count, 0)

    def test_dashboard_summary(self):
        res = dashboard.get_dashboard_summary()
        self.assertGreater(res.total_flows_analyzed, 0)
        self.assertGreater(len(res.severity_distribution), 0)
        self.assertGreater(len(res.traffic_timeline), 0)
        self.assertGreater(len(res.attack_distribution), 0)
        self.assertGreater(len(res.top_features), 0)

    def test_traffic_endpoint(self):
        res = traffic.get_traffic(page=1, page_size=10)
        self.assertEqual(len(res.items), 10)
        self.assertGreater(res.total, 0)
        self.assertGreaterEqual(res.total_pages, 1)

    def test_threats_endpoint(self):
        res = threats.get_threats(page=1, page_size=5)
        self.assertGreater(len(res.items), 0)
        for item in res.items:
            self.assertTrue(item.is_attack)

    def test_analytics_endpoint(self):
        res = analytics.get_analytics()
        self.assertGreater(res.sample_size, 0)
        self.assertGreater(len(res.top_destination_ports), 0)
        self.assertGreater(len(res.flow_duration_stats.histogram), 0)

    def test_model_performance(self):
        res = model.get_model_performance()
        self.assertGreater(len(res.models_compared), 0)
        self.assertGreater(len(res.feature_importances), 0)
        self.assertIn("Random Forest", [m.model for m in res.models_compared])

    def test_predict_single(self):
        sample_record = {
            "Destination Port": 80,
            "Flow Duration": 12000,
            "Total Fwd Packets": 10,
            "Total Backward Packets": 8,
            "Packet Length Mean": 450.0,
        }
        res = predictions.predict_single(SinglePredictionRequest(record=sample_record))
        self.assertEqual(res.total_processed, 1)
        self.assertEqual(len(res.results), 1)
        self.assertIn(res.results[0].prediction, ["Benign", "Attack"])

    def test_reports_summary(self):
        res = reports.get_executive_summary()
        self.assertIn("title", res)
        self.assertIn("accuracy", res)

    def test_reports_csv_export(self):
        res = reports.export_predictions_csv(max_rows=10)
        self.assertIn("Destination Port", res.body.decode("utf-8"))

    def test_lab_metadata_and_catalog(self):
        meta = lab.get_dataset_metadata()
        self.assertIn("CIC-IDS-2017", meta.name)
        self.assertGreater(meta.total_records, 0)
        self.assertGreater(len(meta.feature_names), 70)

        catalog = lab.get_available_models()
        self.assertGreaterEqual(len(catalog.base_classifiers), 8)
        self.assertGreaterEqual(len(catalog.ensemble_strategies), 4)

    def test_lab_dataset_and_preprocessing_preview(self):
        cfg = DatasetSelectionConfig(task_type="binary", train_rows=500, test_rows=200)
        preview = lab.preview_dataset(cfg)
        self.assertEqual(preview.train_count, 500)
        self.assertEqual(preview.test_count, 200)

        prep_cfg = PreprocessingConfig(scaling_strategy="standard", top_k_features=15)
        prep_preview = lab.preview_preprocessing(PreprocessingPreviewRequest(dataset_config=cfg, preprocessing_config=prep_cfg))
        self.assertEqual(prep_preview.transformed_train_shape[0], 500)
        self.assertGreater(len(prep_preview.applied_transformations), 0)

    def test_explainability_endpoints(self):
        samples = explainability.get_sample_flows()
        self.assertGreater(len(samples), 0)
        sample_features = samples[1]["features"]

        exp_res = explainability.explain_prediction(FlowExplainRequest(flow_features=sample_features, num_features=5))
        self.assertIn(exp_res.summary.predicted_class, ["Attack", "Benign"])
        self.assertGreater(len(exp_res.top_malicious_features), 0)
        self.assertGreater(len(exp_res.waterfall_steps), 2)

        lime_res = explainability.get_lime_explanation(LimeExplainRequest(flow_features=sample_features, num_perturbations=50, num_features=3))
        self.assertGreaterEqual(lime_res.surrogate_r2_fidelity, 0.0)
        self.assertGreater(len(lime_res.rules), 0)

        cf_res = explainability.get_counterfactual(CounterfactualRequest(flow_features=sample_features, desired_probability_threshold=0.45))
        self.assertIn("flipped_successfully", cf_res.model_dump())

        ens_res = explainability.get_ensemble_explanation(EnsembleExplainRequest(flow_features=sample_features))
        self.assertGreater(len(ens_res.base_learners), 0)

        interp = explainability.get_model_interpretability()
        self.assertGreater(len(interp.feature_importance_comparison), 0)

        profiles = explainability.get_attack_profiles()
        self.assertGreaterEqual(len(profiles), 4)

    def test_studio_endpoints(self):
        sample_res = studio.load_sample_dataset(task_type="binary", max_rows=150)
        self.assertIn("sample_cic_ids", sample_res.dataset_id)
        self.assertGreater(sample_res.record_count, 0)
        self.assertIsNotNone(sample_res.suggested_target)

        preview = studio.get_dataset_preview(sample_res.dataset_id, limit=5)
        self.assertGreater(len(preview["preview_rows"]), 0)

        runs = studio.list_studio_experiments()
        self.assertIsInstance(runs, list)

        # Test experiment creation and explainability
        from backend.app.schemas.studio import (
            StudioExperimentRequest,
            ModelConfigSpec,
            BaseLearnerSpec,
            StudioExplainRequest,
        )
        req = StudioExperimentRequest(
            experiment_name="Unit Test Studio Run",
            dataset_id=sample_res.dataset_id,
            target_column=sample_res.suggested_target,
            feature_columns=sample_res.columns[:8],
            test_split_ratio=0.2,
            random_seed=42,
            model_settings=ModelConfigSpec(
                strategy="voting",
                base_estimator_id="decision_tree",
                voting_type="soft",
                meta_classifier_id="logistic_regression",
                meta_classifier_hyperparameters={},
                cv_folds=3,
                n_estimators=10,
                learning_rate=0.1,
                max_depth=5,
                base_classifiers=[
                    BaseLearnerSpec(model_id="decision_tree", enabled=True, hyperparameters={"max_depth": 5}, weight=1.0),
                    BaseLearnerSpec(model_id="logistic_regression", enabled=True, hyperparameters={"max_iter": 100}, weight=1.0),
                ]
            )
        )
        status_resp = studio.create_studio_experiment(req)
        self.assertIn(status_resp.status, ["running", "completed"])

        import time
        final_status = status_resp
        for _ in range(50):
            final_status = studio.get_experiment_status(status_resp.experiment_id)
            if final_status.status in ["completed", "failed"]:
                break
            time.sleep(0.1)

        self.assertEqual(final_status.status, "completed")
        self.assertEqual(final_status.progress, 100)

        # Get results
        results = studio.get_experiment_results(status_resp.experiment_id)
        self.assertGreater(results.total_evaluated_records, 0)
        self.assertIsNotNone(results.accuracy)

        # Explain record 0
        exp_resp = studio.explain_record(
            StudioExplainRequest(experiment_id=status_resp.experiment_id, record_index=0, num_features=4)
        )
        self.assertIn(exp_resp.predicted_class, ["Attack", "Benign"])
        self.assertIsNotNone(exp_resp.shap)
        self.assertIsNotNone(exp_resp.lime)
        self.assertIsNotNone(exp_resp.counterfactual)
        self.assertIsNotNone(exp_resp.ensemble)

if __name__ == "__main__":
    unittest.main()
