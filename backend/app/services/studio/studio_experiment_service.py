from __future__ import annotations

import datetime
import logging
import threading
import time
import uuid
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from fastapi import HTTPException
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from ...services.lab.ensemble_builder import ensemble_builder
from ...services.lab.experiment_db import experiment_db
from ...services.model_service import model_service
from ...services.prediction_service import prediction_service
from .dataset_manager import dataset_manager
from ...schemas.studio import (
    StudioExperimentRequest,
    StudioExperimentResult,
    StudioExperimentStatus,
    ConfusionMatrixDict,
)

logger = logging.getLogger(__name__)

MODELS_DIR = Path("backend/data/lab_models")
MODELS_DIR.mkdir(parents=True, exist_ok=True)


def _clean_numeric_features(features: pd.DataFrame, *, context: str) -> pd.DataFrame:
    """Coerce selected numeric features to float64 and turn unusable values into NaN.

    Rows and columns are retained. Missing and invalid measurements are left for the
    training-fitted imputer, rather than being replaced with an arbitrary constant.
    """
    cleaned = pd.DataFrame(index=features.index)
    diagnostics: list[str] = []

    for column in features.columns:
        original = features[column]
        numeric = pd.to_numeric(original, errors="coerce")
        # Converting through float64 catches values outside its finite range too.
        with np.errstate(over="ignore", invalid="ignore"):
            values = numeric.to_numpy(dtype=np.float64, na_value=np.nan)

        original_missing = original.isna().to_numpy()
        candidate_mask = (~original_missing) & (np.isnan(values) | np.isinf(values))
        out_of_range_mask = np.zeros(len(values), dtype=bool)
        invalid_conversion_mask = np.isnan(values) & ~original_missing
        for row_index in np.flatnonzero(candidate_mask):
            raw_value = original.iloc[row_index]
            try:
                decimal_value = Decimal(str(raw_value).strip())
                if decimal_value.is_finite() and abs(decimal_value) > Decimal(str(np.finfo(np.float64).max)):
                    out_of_range_mask[row_index] = True
            except (InvalidOperation, ValueError):
                pass
        invalid_conversion_mask &= ~out_of_range_mask
        invalid_conversion_count = int(invalid_conversion_mask.sum())
        out_of_float64_range = int(out_of_range_mask.sum())
        positive_infinite = int((np.isposinf(values) & ~out_of_range_mask).sum())
        negative_infinite = int((np.isneginf(values) & ~out_of_range_mask).sum())
        infinite = positive_infinite + negative_infinite
        affected = invalid_conversion_count + out_of_float64_range + infinite

        if affected:
            representatives: list[str] = []
            bad_mask = (~original_missing & np.isnan(values)) | np.isinf(values)
            for value in original[bad_mask].head(5).tolist():
                representatives.append(repr(value))
            diagnostics.append(
                f"{column}: +inf={positive_infinite}, -inf={negative_infinite}, "
                f"out-of-float64-range={out_of_float64_range}, "
                f"invalid-conversions={invalid_conversion_count}, examples={representatives}"
            )

        values[~np.isfinite(values)] = np.nan
        cleaned[column] = values

    if diagnostics:
        logger.warning(
            "Sanitized invalid numeric feature values before sklearn (%s): %s",
            context,
            "; ".join(diagnostics),
        )
    else:
        logger.info("No invalid numeric values found before sklearn (%s)", context)

    # A final boundary check prevents unsupported/object dtypes or infinities from
    # reaching sklearn if this helper is changed later.
    invalid_columns = []
    for column in cleaned.columns:
        series = cleaned[column]
        if not pd.api.types.is_float_dtype(series.dtype):
            invalid_columns.append(f"{column} (dtype={series.dtype})")
        elif np.isinf(series.to_numpy(dtype=np.float64, na_value=np.nan)).any():
            invalid_columns.append(f"{column} (contains infinity)")
    if invalid_columns:
        raise ValueError(
            "Numeric feature validation failed before imputation for: "
            + ", ".join(invalid_columns)
        )

    return cleaned


def _validate_imputed_features(values: np.ndarray, feature_names: list[str], *, context: str) -> None:
    array = np.asarray(values)
    if array.dtype.kind not in "fiu":
        raise ValueError(f"{context} preprocessing produced unsupported dtype {array.dtype}.")
    invalid_mask = ~np.isfinite(array.astype(np.float64, copy=False))
    if invalid_mask.any():
        columns = [feature_names[i] for i in np.flatnonzero(invalid_mask.any(axis=0))]
        raise ValueError(
            f"{context} preprocessing left non-finite values after imputation in: "
            + ", ".join(columns)
        )

class StudioExperimentService:
    def __init__(self) -> None:
        self.experiments: dict[str, StudioExperimentStatus] = {}
        self.results: dict[str, StudioExperimentResult] = {}
        self.models: dict[str, Any] = {}
        self.test_datasets: dict[str, pd.DataFrame] = {}

    def launch_experiment(self, req: StudioExperimentRequest) -> StudioExperimentStatus:
        exp_id = f"exp_{uuid.uuid4().hex[:10]}"
        now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC")

        is_labeled = bool(req.target_column and req.target_column.strip().lower() != "none")

        status = StudioExperimentStatus(
            experiment_id=exp_id,
            name=req.experiment_name,
            status="queued",
            stage="Initializing data validation",
            progress=5,
            is_labeled=is_labeled,
            dataset_id=req.dataset_id,
            created_at=now,
        )
        self.experiments[exp_id] = status

        # Run training in background thread
        thread = threading.Thread(target=self._run_pipeline, args=(exp_id, req), daemon=True)
        thread.start()

        return status

    def _run_pipeline(self, exp_id: str, req: StudioExperimentRequest) -> None:
        t0 = time.time()
        try:
            # 1. Ingest Data
            self._update_status(exp_id, "running", "Ingesting user dataset", 15)
            df = dataset_manager.get_dataset_df(req.dataset_id)
            if len(df) == 0:
                raise ValueError("Dataset is empty.")

            target_col = req.target_column
            if target_col and target_col not in df.columns:
                candidates = ["target", "label", "prediction", "is malicious", "is_malicious", "is_attack", "attack", "class", "binarylabel", "attack_cat"]
                found = next((c for c in df.columns if c.strip().lower() in candidates), None)
                if found:
                    target_col = found

            is_labeled = bool(target_col and target_col in df.columns)

            if is_labeled:
                y_raw = df[target_col]
                X_raw = df.drop(columns=[target_col])

                # Determine feature columns
                if req.feature_columns:
                    valid_cols = [c for c in req.feature_columns if c in X_raw.columns]
                    X_raw = X_raw[valid_cols]
                else:
                    # Keep numeric features
                    numeric_cols = [c for c in X_raw.columns if pd.api.types.is_numeric_dtype(X_raw[c])]
                    X_raw = X_raw[numeric_cols]

                if X_raw.shape[1] == 0:
                    raise ValueError("No valid numeric feature columns found in dataset.")

                numeric_columns: list[str] = []
                categorical_columns: list[str] = []
                for column in X_raw.columns:
                    if pd.api.types.is_numeric_dtype(X_raw[column]):
                        numeric_columns.append(column)
                    else:
                        parsed = pd.to_numeric(X_raw[column], errors="coerce")
                        if parsed.notna().any():
                            numeric_columns.append(column)
                        else:
                            categorical_columns.append(column)

                # Clean numeric values without dropping rows. Keep valid
                # categorical columns for train-fitted encoding below.
                if numeric_columns:
                    X_raw[numeric_columns] = _clean_numeric_features(
                        X_raw[numeric_columns], context=f"experiment {exp_id}"
                    )
                for column in categorical_columns:
                    X_raw[column] = X_raw[column].where(X_raw[column].notna(), np.nan)

                # Split train/test
                self._update_status(exp_id, "running", "Partitioning train/test splits", 30)
                try:
                    X_train, X_test, y_train, y_test = train_test_split(
                        X_raw,
                        y_raw,
                        test_size=req.test_split_ratio,
                        random_state=req.random_seed,
                        stratify=y_raw if y_raw.nunique() > 1 else None,
                    )
                except Exception:
                    X_train, X_test, y_train, y_test = train_test_split(
                        X_raw,
                        y_raw,
                        test_size=req.test_split_ratio,
                        random_state=req.random_seed,
                    )

                # Fit preprocessing strictly on X_train. Numeric measurements
                # use median imputation; selected categorical features use
                # train-fitted imputation and one-hot encoding.
                self._update_status(exp_id, "running", "Fitting preprocessing (imputation & scaling)", 45)
                transformers = []
                if numeric_columns:
                    transformers.append((
                        "numeric",
                        SimpleImputer(strategy="median", keep_empty_features=True),
                        numeric_columns,
                    ))
                if categorical_columns:
                    transformers.append((
                        "categorical",
                        Pipeline([
                            ("imputer", SimpleImputer(strategy="most_frequent", keep_empty_features=True)),
                            ("encoder", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
                        ]),
                        categorical_columns,
                    ))
                preprocessor = ColumnTransformer(
                    transformers,
                    remainder="drop",
                    sparse_threshold=0,
                    verbose_feature_names_out=False,
                )
                scaler = StandardScaler()

                X_train_clean = preprocessor.fit_transform(X_train)
                feature_names = list(preprocessor.get_feature_names_out())
                _validate_imputed_features(X_train_clean, feature_names, context="Training")
                X_train_scaled = scaler.fit_transform(X_train_clean)
                _validate_imputed_features(X_train_scaled, feature_names, context="Scaled training")

                X_test_clean = preprocessor.transform(X_test)
                _validate_imputed_features(X_test_clean, feature_names, context="Test")
                X_test_scaled = scaler.transform(X_test_clean)
                _validate_imputed_features(X_test_scaled, feature_names, context="Scaled test")

                # Build Model Architecture
                self._update_status(exp_id, "running", f"Instantiating {req.model_settings.strategy.upper()} ensemble", 60)
                from ...schemas.lab import EnsembleConfig as LabEnsembleConfig, BaseClassifierConfig as LabBaseConfig

                lab_base_configs = [
                    LabBaseConfig(
                        model_id=b.model_id,
                        enabled=b.enabled,
                        hyperparameters=b.hyperparameters,
                        weight=b.weight,
                    )
                    for b in req.model_settings.base_classifiers
                ]

                lab_ensemble_config = LabEnsembleConfig(
                    strategy=req.model_settings.strategy if req.model_settings.strategy != "individual" else "voting",
                    voting_type=req.model_settings.voting_type,
                    meta_classifier_id=req.model_settings.meta_classifier_id,
                    meta_classifier_hyperparameters=req.model_settings.meta_classifier_hyperparameters,
                    cv_folds=req.model_settings.cv_folds,
                    n_estimators=req.model_settings.n_estimators,
                    learning_rate=req.model_settings.learning_rate,
                    base_estimator_id=req.model_settings.base_estimator_id,
                    base_classifiers=lab_base_configs,
                )

                clf = ensemble_builder.build_ensemble(lab_ensemble_config)

                # Train Model
                self._update_status(exp_id, "running", "Fitting model estimators on training traffic", 75)
                t_train_start = time.time()
                clf.fit(X_train_scaled, y_train)
                train_time = time.time() - t_train_start

                # Predict & Evaluate
                self._update_status(exp_id, "running", "Evaluating model on held-out test traffic", 90)
                t_pred_start = time.time()
                y_pred = clf.predict(X_test_scaled)
                pred_time = time.time() - t_pred_start

                y_proba = clf.predict_proba(X_test_scaled) if hasattr(clf, "predict_proba") else None

                # Determine task type
                num_classes = y_raw.nunique()
                task_type = "multiclass" if num_classes > 2 else "binary"

                # Calculate metrics
                acc = float(accuracy_score(y_test, y_pred))
                pos_label = "Attack" if "Attack" in clf.classes_ else (clf.classes_[0] if len(clf.classes_) > 1 else None)

                if task_type == "binary" and pos_label is not None:
                    try:
                        prec = float(precision_score(y_test, y_pred, pos_label=pos_label, average="binary", zero_division=0))
                        rec = float(recall_score(y_test, y_pred, pos_label=pos_label, average="binary", zero_division=0))
                        f1 = float(f1_score(y_test, y_pred, pos_label=pos_label, average="binary", zero_division=0))
                    except Exception:
                        prec = float(precision_score(y_test, y_pred, average="weighted", zero_division=0))
                        rec = float(recall_score(y_test, y_pred, average="weighted", zero_division=0))
                        f1 = float(f1_score(y_test, y_pred, average="weighted", zero_division=0))
                else:
                    prec = float(precision_score(y_test, y_pred, average="weighted", zero_division=0))
                    rec = float(recall_score(y_test, y_pred, average="weighted", zero_division=0))
                    f1 = float(f1_score(y_test, y_pred, average="weighted", zero_division=0))

                macro_f1 = float(f1_score(y_test, y_pred, average="macro", zero_division=0))
                weighted_f1 = float(f1_score(y_test, y_pred, average="weighted", zero_division=0))

                # Per-class detailed report
                per_class_list: list[dict[str, Any]] = []
                try:
                    report_dict = classification_report(y_test, y_pred, output_dict=True, zero_division=0)
                    for k, v in report_dict.items():
                        if k not in ["accuracy", "macro avg", "weighted avg"] and isinstance(v, dict):
                            per_class_list.append({
                                "class_name": str(k),
                                "precision": round(float(v.get("precision", 0.0)), 4),
                                "recall": round(float(v.get("recall", 0.0)), 4),
                                "f1_score": round(float(v.get("f1-score", 0.0)), 4),
                                "support": int(v.get("support", 0)),
                            })
                except Exception as e:
                    logger.warning("Could not compute per-class classification report: %s", e)

                # ROC-AUC calculation if probabilities are available
                roc_auc_val: float | None = None
                if y_proba is not None:
                    try:
                        if task_type == "binary" and len(clf.classes_) == 2:
                            pos_idx = 1 if pos_label == clf.classes_[1] else 0
                            # Encode the configured positive class explicitly so the
                            # score column and ROC label orientation cannot disagree.
                            binary_truth = np.asarray(y_test == pos_label, dtype=np.int8)
                            roc_auc_val = round(float(roc_auc_score(binary_truth, y_proba[:, pos_idx])), 4)
                        elif task_type == "multiclass" and len(np.unique(y_test)) == len(clf.classes_):
                            roc_auc_val = round(float(roc_auc_score(y_test, y_proba, multi_class="ovr", average="macro")), 4)
                    except Exception as e:
                        logger.debug("ROC-AUC not computable: %s", e)

                # Confusion Matrix
                labels = [str(c) for c in clf.classes_]
                cm_matrix = confusion_matrix(y_test, y_pred, labels=clf.classes_).tolist()
                tn = cm_matrix[0][0] if len(cm_matrix) > 1 else len(y_test)
                fp = cm_matrix[0][1] if len(cm_matrix) > 1 and len(cm_matrix[0]) > 1 else 0
                fn = cm_matrix[1][0] if len(cm_matrix) > 1 and len(cm_matrix[1]) > 0 else 0
                tp = cm_matrix[1][1] if len(cm_matrix) > 1 and len(cm_matrix[1]) > 1 else 0

                fpr = float(fp / (fp + tn)) if (fp + tn) > 0 else 0.0
                fnr = float(fn / (fn + tp)) if (fn + tp) > 0 else 0.0

                cm_dict = ConfusionMatrixDict(
                    labels=labels,
                    matrix=cm_matrix,
                    true_negatives=int(tn),
                    false_positives=int(fp),
                    false_negatives=int(fn),
                    true_positives=int(tp),
                )

                # Predictions Preview
                pred_rows = []
                for i in range(min(50, len(X_test))):
                    row_data = {
                        col: float(X_test_clean[i, feature_idx])
                        for feature_idx, col in enumerate(feature_names[:10])
                    }
                    p_class = str(y_pred[i])
                    conf = float(np.max(y_proba[i])) if y_proba is not None else 1.0
                    pred_rows.append({
                        "index": i,
                        "ground_truth": str(y_test.iloc[i]),
                        "prediction": p_class,
                        "confidence": round(conf, 4),
                        "features": row_data,
                    })

                pred_counts = pd.Series(y_pred).value_counts().to_dict()
                mean_conf = float(np.mean([p["confidence"] for p in pred_rows])) if pred_rows else 1.0

                # Save pipeline for explanations
                pipeline_obj = {
                    "imputer": preprocessor,
                    "preprocessor": preprocessor,
                    "scaler": scaler,
                    "model": clf,
                    "feature_names": feature_names,
                    "is_labeled": True,
                    "task_type": task_type,
                    "classes": labels,
                }
                joblib.dump(pipeline_obj, MODELS_DIR / f"{exp_id}.joblib")
                self.models[exp_id] = pipeline_obj
                self.test_datasets[exp_id] = X_test.reset_index(drop=True)

                result = StudioExperimentResult(
                    experiment_id=exp_id,
                    name=req.experiment_name,
                    dataset_id=req.dataset_id,
                    is_labeled=True,
                    status="completed",
                    strategy=req.model_settings.strategy,
                    model_name=f"{req.model_settings.strategy.capitalize()} Pipeline",
                    training_time_seconds=round(train_time, 3),
                    prediction_time_seconds=round(pred_time, 3),
                    accuracy=round(acc, 4),
                    precision=round(prec, 4),
                    recall=round(rec, 4),
                    f1_score=round(f1, 4),
                    macro_f1=round(macro_f1, 4),
                    weighted_f1=round(weighted_f1, 4),
                    false_positive_rate=round(fpr, 4),
                    false_negative_rate=round(fnr, 4),
                    roc_auc=roc_auc_val,
                    task_type=task_type,
                    per_class_metrics=per_class_list,
                    confusion_matrix=cm_dict,
                    total_evaluated_records=len(X_test),
                    predicted_class_counts={str(k): int(v) for k, v in pred_counts.items()},
                    mean_confidence=round(mean_conf, 4),
                    predictions_preview=pred_rows,
                    created_at=self.experiments[exp_id].created_at,
                )

            else:
                # UNLABELED INFERENCE PATH
                self._update_status(exp_id, "running", "Executing inference on unlabeled flow records", 60)
                numeric_cols = [
                    c for c in df.columns
                    if pd.api.types.is_numeric_dtype(df[c])
                    or pd.to_numeric(df[c], errors="coerce").notna().any()
                ]
                if req.feature_columns:
                    numeric_cols = [c for c in req.feature_columns if c in numeric_cols]

                X_input = _clean_numeric_features(df[numeric_cols], context=f"inference {exp_id}")
                t_pred_start = time.time()

                # Reuse the production model's fitted preprocessing pipeline.
                # Never fit an imputer/scaler on the inference batch.
                m = model_service.model
                if m is None or not model_service.is_loaded:
                    raise ValueError("The production model is not loaded; Studio inference cannot run.")
                prepared, raw_input = prediction_service.prepare_dataframe(X_input)
                y_pred = m.predict(prepared)
                y_proba = m.predict_proba(prepared) if hasattr(m, "predict_proba") else None

                pred_time = time.time() - t_pred_start
                pred_counts = pd.Series(y_pred).value_counts().to_dict()

                pred_rows = []
                for i in range(min(50, len(X_input))):
                    p_class = str(y_pred[i])
                    conf = float(np.max(y_proba[i])) if y_proba is not None else 1.0
                    pred_rows.append({
                        "index": i,
                        "ground_truth": "Unlabeled",
                        "prediction": p_class,
                        "confidence": round(conf, 4),
                        "features": {
                            col: float(raw_input.iloc[i][col])
                            for col in numeric_cols[:10]
                            if col in raw_input.columns and pd.notna(raw_input.iloc[i][col])
                        },
                    })

                mean_conf = float(np.mean([p["confidence"] for p in pred_rows])) if pred_rows else 1.0

                pipeline_obj = {
                    "imputer": None,
                    "scaler": None,
                    "model": m,
                    "feature_names": list(prepared.columns),
                    "is_labeled": False,
                }
                joblib.dump(pipeline_obj, MODELS_DIR / f"{exp_id}.joblib")
                self.models[exp_id] = pipeline_obj
                self.test_datasets[exp_id] = X_input.reset_index(drop=True)

                result = StudioExperimentResult(
                    experiment_id=exp_id,
                    name=req.experiment_name,
                    dataset_id=req.dataset_id,
                    is_labeled=False,
                    status="completed",
                    strategy="Inference",
                    model_name=model_service.model_name,
                    training_time_seconds=0.0,
                    prediction_time_seconds=round(pred_time, 3),
                    accuracy=None,
                    precision=None,
                    recall=None,
                    f1_score=None,
                    macro_f1=None,
                    false_positive_rate=None,
                    false_negative_rate=None,
                    confusion_matrix=None,
                    total_evaluated_records=len(X_input),
                    predicted_class_counts={str(k): int(v) for k, v in pred_counts.items()},
                    mean_confidence=round(mean_conf, 4),
                    predictions_preview=pred_rows,
                    created_at=self.experiments[exp_id].created_at,
                )

            # Finalize
            self.results[exp_id] = result
            self._update_status(exp_id, "completed", "Experiment execution finished", 100)

            try:
                experiment_db.create_experiment({
                    "id": exp_id,
                    "name": req.experiment_name,
                    "created_at": self.experiments[exp_id].created_at,
                    "task_type": getattr(result, "task_type", "binary"),
                    "status": "completed",
                    "stage": "Finished",
                    "progress": 100,
                    "dataset_config": {
                        "dataset_id": req.dataset_id,
                        "target_column": req.target_column,
                        "random_seed": req.random_seed,
                    },
                    "preprocessing_config": {"imputation": "median", "scaling": "standard"},
                    "ensemble_config": req.model_settings.model_dump(),
                    "metrics": result.model_dump(),
                    "training_time_seconds": result.training_time_seconds,
                    "prediction_time_seconds": result.prediction_time_seconds,
                    "notes": f"Trained {result.model_name}",
                })
            except Exception as e_db:
                logger.warning("Could not persist experiment to sqlite: %s", e_db)

        except Exception as e:
            logger.error("Studio experiment execution failed: %s", e, exc_info=True)
            self._update_status(exp_id, "failed", f"Execution error: {str(e)}", 0, str(e))

    def _update_status(self, exp_id: str, status: str, stage: str, progress: int, error: str | None = None) -> None:
        if exp_id in self.experiments:
            self.experiments[exp_id].status = status  # type: ignore
            self.experiments[exp_id].stage = stage
            self.experiments[exp_id].progress = progress
            self.experiments[exp_id].error_message = error

    def get_status(self, exp_id: str) -> StudioExperimentStatus:
        if exp_id in self.experiments:
            return self.experiments[exp_id]
        raise HTTPException(status_code=404, detail=f"Experiment {exp_id} not found.")

    def get_results(self, exp_id: str) -> StudioExperimentResult:
        if exp_id in self.results:
            return self.results[exp_id]
        raise HTTPException(status_code=404, detail=f"Results for experiment {exp_id} not ready yet.")

studio_experiment_service = StudioExperimentService()
