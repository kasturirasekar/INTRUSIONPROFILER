from __future__ import annotations

import asyncio
import datetime
import logging
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from typing import Any

import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)

from ...schemas.lab import (
    ConfusionMatrixData,
    ExperimentRequest,
    ExperimentResults,
    SecurityTradeoffAnalysis,
)
from .dataset_service import dataset_service
from .ensemble_builder import ensemble_builder
from .experiment_db import experiment_db
from .preprocessing_service import preprocessing_service

logger = logging.getLogger(__name__)

thread_pool = ThreadPoolExecutor(max_workers=3)

class TrainingService:
    def launch_experiment(self, request: ExperimentRequest) -> str:
        exp_id = f"exp_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:6]}"
        now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        exp_data = {
            "id": exp_id,
            "name": request.name,
            "created_at": now_str,
            "task_type": request.dataset_config.task_type,
            "status": "running",
            "stage": "Initializing Experiment",
            "progress": 5,
            "dataset_config": request.dataset_config.model_dump(),
            "preprocessing_config": request.preprocessing_config.model_dump(),
            "ensemble_config": request.ensemble_config.model_dump(),
            "notes": request.notes,
        }
        experiment_db.create_experiment(exp_data)

        # Submit task to thread pool
        thread_pool.submit(self._run_experiment_sync, exp_id, request)
        return exp_id

    def _run_experiment_sync(self, exp_id: str, request: ExperimentRequest) -> None:
        try:
            logger.info("Starting experiment %s: %s", exp_id, request.name)

            # Stage 1: Dataset Loading
            experiment_db.update_experiment_status(
                exp_id, status="running", stage="Loading & Partitioning Dataset", progress=15
            )
            X_train, X_test, y_train, y_test = dataset_service.load_dataset_split(request.dataset_config)

            # Stage 2: Data Preprocessing (fitted strictly on train!)
            experiment_db.update_experiment_status(
                exp_id, status="running", stage="Applying Preprocessing Pipeline (No Data Leakage)", progress=35
            )
            X_tr, X_te, y_tr, y_te, feature_names = preprocessing_service.fit_and_transform(
                X_train, X_test, y_train, y_test, request.preprocessing_config, random_seed=request.dataset_config.random_seed
            )

            # Stage 3: Constructing Ensemble Architecture
            experiment_db.update_experiment_status(
                exp_id, status="running", stage="Assembling Classifiers & Meta-Learners", progress=55
            )
            model = ensemble_builder.build_ensemble(request.ensemble_config, random_seed=request.dataset_config.random_seed)

            # Stage 4: Training Model
            experiment_db.update_experiment_status(
                exp_id, status="running", stage="Training Ensemble Model Architecture", progress=70
            )
            start_train = time.perf_counter()
            model.fit(X_tr, y_tr)
            train_duration = time.perf_counter() - start_train

            # Stage 5: Prediction & Inference on Held-out Test Data
            experiment_db.update_experiment_status(
                exp_id, status="running", stage="Generating Test Predictions", progress=85
            )
            start_pred = time.perf_counter()
            y_pred = model.predict(X_te)
            pred_duration = time.perf_counter() - start_pred

            # Probabilities for ROC-AUC / PR-AUC
            y_proba = None
            if hasattr(model, "predict_proba"):
                try:
                    y_proba = model.predict_proba(X_te)
                except Exception:
                    y_proba = None

            # Stage 6: Cybersecurity Model Evaluation
            experiment_db.update_experiment_status(
                exp_id, status="running", stage="Computing Cybersecurity Trade-off Metrics", progress=95
            )
            metrics = self._calculate_metrics(
                y_te, y_pred, y_proba, model, feature_names, request.dataset_config.task_type
            )

            # Stage 7: Save experiment completed
            experiment_db.update_experiment_status(
                exp_id,
                status="completed",
                stage="Completed",
                progress=100,
                metrics=metrics.model_dump(),
                train_time=round(train_duration, 4),
                pred_time=round(pred_duration, 4),
            )
            logger.info("Experiment %s successfully completed in %.2fs", exp_id, train_duration + pred_duration)

        except Exception as e:
            logger.exception("Experiment %s failed: %s", exp_id, e)
            experiment_db.update_experiment_status(
                exp_id,
                status="failed",
                stage="Failed",
                progress=100,
                error_msg=str(e),
            )

    def _calculate_metrics(
        self,
        y_true: np.ndarray,
        y_pred: np.ndarray,
        y_proba: np.ndarray | None,
        model: Any,
        feature_names: list[str],
        task_type: str,
    ) -> ExperimentResults:
        is_binary = task_type == "binary"
        pos_label = "Attack" if "Attack" in y_true else 1

        acc = float(accuracy_score(y_true, y_pred))

        if is_binary:
            prec = float(precision_score(y_true, y_pred, pos_label=pos_label, zero_division=0))
            rec = float(recall_score(y_true, y_pred, pos_label=pos_label, zero_division=0))
            f1 = float(f1_score(y_true, y_pred, pos_label=pos_label, zero_division=0))
            macro_f1 = float(f1_score(y_true, y_pred, average="macro", zero_division=0))
            weighted_f1 = float(f1_score(y_true, y_pred, average="weighted", zero_division=0))
        else:
            prec = float(precision_score(y_true, y_pred, average="macro", zero_division=0))
            rec = float(recall_score(y_true, y_pred, average="macro", zero_division=0))
            f1 = float(f1_score(y_true, y_pred, average="weighted", zero_division=0))
            macro_f1 = float(f1_score(y_true, y_pred, average="macro", zero_division=0))
            weighted_f1 = float(f1_score(y_true, y_pred, average="weighted", zero_division=0))

        # Confusion matrix
        unique_labels = sorted(list(set(y_true) | set(y_pred)), key=lambda x: str(x))
        cm = confusion_matrix(y_true, y_pred, labels=unique_labels)
        cm_list = cm.tolist()

        if is_binary and cm.shape == (2, 2):
            tn, fp, fn, tp = int(cm[0, 0]), int(cm[0, 1]), int(cm[1, 0]), int(cm[1, 1])
        else:
            tp = int(np.diag(cm).sum())
            fp = int(cm.sum(axis=0).sum() - tp)
            fn = int(cm.sum(axis=1).sum() - tp)
            tn = int(cm.sum() - (tp + fp + fn))

        # Cybersecurity-specific rates
        detection_rate = round(tp / max(1, tp + fn) * 100, 2)
        false_alarm_rate = round(fp / max(1, fp + tn) * 100, 2)
        missed_attack_rate = round(fn / max(1, tp + fn) * 100, 2)

        # ROC-AUC
        roc_auc = None
        pr_auc = None
        if y_proba is not None and is_binary:
            try:
                classes = list(getattr(model, "classes_", ["Benign", "Attack"]))
                atk_idx = classes.index("Attack") if "Attack" in classes else 1
                y_bin = (pd.Series(y_true) == "Attack").astype(int).to_numpy()
                roc_auc = round(float(roc_auc_score(y_bin, y_proba[:, atk_idx])), 4)
                pr_auc = round(float(average_precision_score(y_bin, y_proba[:, atk_idx])), 4)
            except Exception:
                pass

        # Per class metrics
        report_dict = classification_report(y_true, y_pred, output_dict=True, zero_division=0)
        per_class: dict[str, dict[str, float]] = {}
        for k, v in report_dict.items():
            if isinstance(v, dict):
                per_class[str(k)] = {
                    "precision": round(float(v.get("precision", 0)), 4),
                    "recall": round(float(v.get("recall", 0)), 4),
                    "f1_score": round(float(v.get("f1-score", 0)), 4),
                    "support": float(v.get("support", 0)),
                }

        # Trade-off note
        burden = (
            "LOW analyst fatigue (under 1% false alarms)"
            if false_alarm_rate < 1.0
            else ("MODERATE alert fatigue (1-5% false alarms)" if false_alarm_rate < 5.0 else "HIGH alert fatigue (>5% false alarms)")
        )
        recommendation = (
            f"Recommended for high-security perimeter: Intercepted {detection_rate}% of attacks with only {false_alarm_rate}% false positive rate."
            if detection_rate >= 98.0 and false_alarm_rate <= 1.0
            else f"Requires alert tuning: Missed {missed_attack_rate}% of intrusion flows."
        )

        tradeoffs = SecurityTradeoffAnalysis(
            detection_rate=detection_rate,
            false_alarm_rate=false_alarm_rate,
            missed_attack_rate=missed_attack_rate,
            threat_severity_summary=f"Intercepted {tp} attacks; Missed {fn} intrusions; Generated {fp} false alarms.",
            analyst_operational_burden=burden,
            recommendation=recommendation,
        )

        # Feature importances if estimator has them
        feat_imp: list[dict[str, Any]] | None = None
        if hasattr(model, "feature_importances_"):
            imp = model.feature_importances_
            if len(imp) == len(feature_names):
                df_imp = pd.DataFrame({"feature": feature_names, "importance": imp}).sort_values("importance", ascending=False)
                feat_imp = [
                    {"feature": r["feature"], "importance": round(float(r["importance"]), 5), "rank": i + 1}
                    for i, (_, r) in enumerate(df_imp.head(15).iterrows())
                ]

        return ExperimentResults(
            accuracy=round(acc * 100, 2),
            precision=round(prec * 100, 2),
            recall=round(rec * 100, 2),
            f1_score=round(f1 * 100, 2),
            macro_f1=round(macro_f1 * 100, 2) if macro_f1 else None,
            weighted_f1=round(weighted_f1 * 100, 2) if weighted_f1 else None,
            roc_auc=roc_auc,
            pr_auc=pr_auc,
            confusion_matrix=ConfusionMatrixData(
                labels=[str(lbl) for lbl in unique_labels],
                matrix=cm_list,
                true_negatives=tn,
                false_positives=fp,
                false_negatives=fn,
                true_positives=tp,
            ),
            security_tradeoffs=tradeoffs,
            per_class_metrics=per_class,
            training_time_seconds=0.0,
            prediction_time_seconds=0.0,
            feature_importances=feat_imp,
        )

training_service = TrainingService()
