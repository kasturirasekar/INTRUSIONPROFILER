from __future__ import annotations

import ast
import json
import logging
import threading
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd

from ..core.config import METRICS_DIR, MODELS_DIR, settings

logger = logging.getLogger(__name__)

class ModelService:
    def __init__(self) -> None:
        self.model: Any = None
        self.model_name: str = "Stacking Ensemble Classifier (Multi-Model Learning)"
        self.feature_names: list[str] = []
        self.feature_importances: list[dict[str, Any]] = []
        self.is_loaded: bool = False
        self._benchmarks_cache: list[dict[str, Any]] | None = None
        self._model_loader: threading.Thread | None = None

    def start_loading(self) -> None:
        """Start model deserialization after the API has bound its HTTP socket."""
        if self._model_loader is not None and self._model_loader.is_alive():
            return
        self._model_loader = threading.Thread(
            target=self._initialize_model,
            name="model-loader",
            daemon=True,
        )
        self._model_loader.start()

    def _initialize_model(self) -> None:
        self._load_model()
        self._load_feature_importances()

    @staticmethod
    def _patch_estimator_compatibility(root: Any) -> None:
        """Patch harmless sklearn estimator defaults missing from older pickles.

        The bundled model was serialized with an older scikit-learn release. In
        particular, old DecisionTree estimators do not have ``monotonic_cst``,
        which newer releases read during prediction. Walk nested pipelines and
        ensembles so the compatibility fix also covers fitted child models.
        """
        pending = [root]
        visited: set[int] = set()

        while pending:
            estimator = pending.pop()
            if estimator is None or id(estimator) in visited:
                continue
            visited.add(id(estimator))

            module = type(estimator).__module__
            class_name = type(estimator).__name__
            if module.startswith("sklearn.tree") and class_name.startswith("DecisionTree"):
                if not hasattr(estimator, "monotonic_cst"):
                    estimator.monotonic_cst = None

            if hasattr(estimator, "n_jobs"):
                estimator.n_jobs = 1
            if module.startswith("sklearn.linear_model") and not hasattr(estimator, "multi_class"):
                estimator.multi_class = "ovr"

            # Only follow known sklearn estimator containers, avoiding a walk
            # through arbitrary model/data attributes such as fitted arrays.
            for attr in ("named_steps", "named_estimators_"):
                children = getattr(estimator, attr, None)
                if isinstance(children, dict):
                    pending.extend(children.values())

            for attr in ("estimators_", "estimators"):
                children = getattr(estimator, attr, None)
                if isinstance(children, (list, tuple)):
                    for child in children:
                        if isinstance(child, tuple) and len(child) >= 2:
                            child = child[-1]
                        if not (isinstance(child, str) and child in {"drop", "passthrough"}):
                            pending.append(child)

            for attr in ("final_estimator_", "final_estimator", "estimator_", "base_estimator_"):
                child = getattr(estimator, attr, None)
                if child is not None:
                    pending.append(child)

    def _load_model(self) -> None:
        model_path = settings.MODEL_PATH
        if not model_path.exists():
            model_path = settings.FALLBACK_MODEL_PATH

        if not model_path.exists():
            # Second fallback if neither ensemble exists
            rf_path = MODELS_DIR / "final_model_random_forest.joblib"
            if rf_path.exists():
                model_path = rf_path

        if not model_path.exists():
            logger.warning("No model found at %s or %s", settings.MODEL_PATH, settings.FALLBACK_MODEL_PATH)
            self.is_loaded = False
            return

        try:
            self.model = joblib.load(model_path)
            self.is_loaded = True

            # Patch scikit-learn version differences for seamless unpickling
            if hasattr(self.model, "named_steps") and "preprocess" in self.model.named_steps:
                pre = self.model.named_steps["preprocess"]
                if not hasattr(pre, "_name_to_fitted_passthrough"):
                    pre._name_to_fitted_passthrough = {}
            self._patch_estimator_compatibility(self.model)
            
            # Determine ensemble architecture name
            if hasattr(self.model, "named_steps") and "model" in self.model.named_steps:
                est = self.model.named_steps["model"]
                est_type = type(est).__name__
                if "Stacking" in est_type:
                    self.model_name = "Stacking Ensemble Classifier (Multi-Model Learning)"
                elif "Voting" in est_type:
                    self.model_name = "Voting Ensemble Classifier (Soft Consensus)"
                else:
                    self.model_name = f"Ensemble Classifier ({est_type})"
            else:
                self.model_name = "Stacking Ensemble Classifier (Multi-Model Learning)"
            
            # Extract features from pipeline
            if hasattr(self.model, "feature_names_in_"):
                self.feature_names = list(self.model.feature_names_in_)
            elif hasattr(self.model, "named_steps") and "preprocess" in self.model.named_steps:
                pre = self.model.named_steps["preprocess"]
                if hasattr(pre, "transformers_") and len(pre.transformers_) > 0:
                    self.feature_names = list(pre.transformers_[0][2])
            logger.info("Successfully loaded ensemble model from %s with %d features", model_path, len(self.feature_names))
        except Exception as e:
            logger.error("Failed to load model from %s: %s", model_path, e)
            self.is_loaded = False

    def _load_feature_importances(self) -> None:
        if not self.is_loaded or self.model is None:
            return

        importances = None
        if hasattr(self.model, "named_steps") and "model" in self.model.named_steps:
            estimator = self.model.named_steps["model"]
            if hasattr(estimator, "feature_importances_"):
                importances = estimator.feature_importances_
            elif hasattr(estimator, "named_estimators_"):
                for est_name in ["rf", "dt", "random_forest", "decision_tree"]:
                    if est_name in estimator.named_estimators_ and hasattr(estimator.named_estimators_[est_name], "feature_importances_"):
                        importances = estimator.named_estimators_[est_name].feature_importances_
                        break

        if importances is not None and len(importances) == len(self.feature_names):
            df_imp = pd.DataFrame({"feature": self.feature_names, "importance": importances})
            df_imp = df_imp.sort_values("importance", ascending=False).reset_index(drop=True)
            results = []
            for rank, row in df_imp.iterrows():
                feat = str(row["feature"])
                category = "Flow Timing" if "IAT" in feat or "Duration" in feat else (
                    "Packet Sizing" if "Length" in feat or "Segment" in feat or "Size" in feat else (
                        "TCP Flags" if "Flag" in feat else "Network Port/Window"
                    )
                )
                results.append({
                    "feature": feat,
                    "importance": round(float(row["importance"]), 6),
                    "rank": int(rank) + 1,
                    "category": category,
                })
            self.feature_importances = results
        else:
            # Fallback to feature_selection_summary.json if available
            fs_path = METRICS_DIR / "feature_selection_summary.json"
            if fs_path.exists():
                try:
                    with fs_path.open() as f:
                        data = json.load(f)
                        top_features = data.get("top_features", [])
                        self.feature_importances = [
                            {"feature": feat, "importance": round(1.0 / (idx + 1), 4), "rank": idx + 1, "category": "Key Metric"}
                            for idx, feat in enumerate(top_features)
                        ]
                except Exception:
                    self.feature_importances = []

    def get_benchmarks(self) -> list[dict[str, Any]]:
        if self._benchmarks_cache is not None:
            return self._benchmarks_cache

        benchmarks = []
        # Baseline comparison
        base_csv = METRICS_DIR / "baseline_model_comparison.csv"
        if base_csv.exists():
            try:
                df_base = pd.read_csv(base_csv)
                for _, row in df_base.iterrows():
                    cm = ast.literal_eval(row["confusion_matrix"]) if "confusion_matrix" in row and pd.notna(row["confusion_matrix"]) else None
                    benchmarks.append({
                        "model": str(row["model"]),
                        "accuracy": float(row["accuracy"]),
                        "precision_attack": float(row["precision_attack"]),
                        "recall_attack": float(row["recall_attack"]),
                        "f1_attack": float(row["f1_attack"]),
                        "roc_auc": float(row["roc_auc"]) if pd.notna(row.get("roc_auc")) else None,
                        "average_precision": float(row["average_precision"]) if pd.notna(row.get("average_precision")) else None,
                        "training_time_seconds": float(row["training_time_seconds"]),
                        "prediction_time_seconds": float(row["prediction_time_seconds"]),
                        "confusion_matrix": cm,
                        "is_ensemble": False,
                    })
            except Exception as e:
                logger.error("Error reading baseline comparison: %s", e)

        # Ensemble comparison
        ens_csv = METRICS_DIR / "ensemble_model_comparison.csv"
        if ens_csv.exists():
            try:
                df_ens = pd.read_csv(ens_csv)
                for _, row in df_ens.iterrows():
                    cm = ast.literal_eval(row["confusion_matrix"]) if "confusion_matrix" in row and pd.notna(row["confusion_matrix"]) else None
                    benchmarks.append({
                        "model": str(row["model"]),
                        "accuracy": float(row["accuracy"]),
                        "precision_attack": float(row["precision_attack"]),
                        "recall_attack": float(row["recall_attack"]),
                        "f1_attack": float(row["f1_attack"]),
                        "roc_auc": float(row["roc_auc"]) if pd.notna(row.get("roc_auc")) else None,
                        "average_precision": float(row["average_precision"]) if pd.notna(row.get("average_precision")) else None,
                        "training_time_seconds": float(row["training_time_seconds"]),
                        "prediction_time_seconds": float(row["prediction_time_seconds"]),
                        "confusion_matrix": cm,
                        "is_ensemble": True,
                    })
            except Exception as e:
                logger.error("Error reading ensemble comparison: %s", e)

        self._benchmarks_cache = benchmarks
        return benchmarks

    def get_metadata(self) -> dict[str, Any]:
        meta_path = METRICS_DIR / "final_model_metadata.json"
        if meta_path.exists():
            try:
                with meta_path.open() as f:
                    return json.load(f)
            except Exception:
                pass
        return {}

model_service = ModelService()
