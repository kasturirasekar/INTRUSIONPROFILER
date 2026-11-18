from __future__ import annotations

import datetime
import io
import logging
import pickle
import time
import uuid
from typing import Any

import numpy as np
import pandas as pd
from sklearn.ensemble import (
    AdaBoostClassifier,
    BaggingClassifier,
    ExtraTreesClassifier,
    GradientBoostingClassifier,
    RandomForestClassifier,
    StackingClassifier,
    VotingClassifier,
)
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
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
from sklearn.model_selection import KFold, StratifiedKFold, train_test_split
from sklearn.naive_bayes import GaussianNB
from sklearn.preprocessing import StandardScaler
from sklearn.tree import DecisionTreeClassifier

from ...schemas.research import (
    BenchmarkRunRequest,
    BenchmarkRunResponse,
    ModelEvaluationResult,
    PerClassMetric,
)
from ..studio.dataset_manager import dataset_manager

logger = logging.getLogger(__name__)

class EvaluationEngine:
    """
    Unified Evaluation Engine for Rigorous Network Intrusion Detection Research.
    Guarantees strict separation between train and test splits to prevent preprocessing data leakage.
    """

    def instantiate_model(self, model_id: str, random_seed: int = 42) -> tuple[Any, str, bool]:
        """
        Instantiates one of the 10 supported baseline or ensemble algorithms.
        Returns: (estimator_instance, display_name, is_ensemble)
        """
        m_id = model_id.lower().strip()

        if m_id == "decision_tree":
            return DecisionTreeClassifier(max_depth=10, min_samples_split=10, random_state=random_seed), "Decision Tree", False

        elif m_id == "logistic_regression":
            return LogisticRegression(max_iter=500, C=1.0, random_state=random_seed), "Logistic Regression", False

        elif m_id == "random_forest":
            return RandomForestClassifier(n_estimators=40, max_depth=12, random_state=random_seed, n_jobs=1), "Random Forest", True

        elif m_id == "naive_bayes":
            return GaussianNB(), "Naive Bayes", False

        elif m_id == "extra_trees":
            return ExtraTreesClassifier(n_estimators=40, max_depth=12, random_state=random_seed, n_jobs=1), "Extra Trees", True

        elif m_id == "gradient_boosting":
            return GradientBoostingClassifier(n_estimators=40, learning_rate=0.1, max_depth=4, random_state=random_seed), "Gradient Boosting", True

        elif m_id == "adaboost":
            return AdaBoostClassifier(n_estimators=30, learning_rate=0.1, random_state=random_seed), "AdaBoost", True

        elif m_id == "voting":
            estimators = [
                ("dt", DecisionTreeClassifier(max_depth=8, random_state=random_seed)),
                ("lr", LogisticRegression(max_iter=300, random_state=random_seed)),
                ("nb", GaussianNB()),
            ]
            return VotingClassifier(estimators=estimators, voting="soft", n_jobs=1), "Voting Ensemble", True

        elif m_id == "bagging":
            base = DecisionTreeClassifier(max_depth=8, random_state=random_seed)
            return BaggingClassifier(estimator=base, n_estimators=15, random_state=random_seed, n_jobs=1), "Bagging Ensemble", True

        elif m_id == "stacking":
            estimators = [
                ("dt", DecisionTreeClassifier(max_depth=8, random_state=random_seed)),
                ("rf", RandomForestClassifier(n_estimators=20, max_depth=6, random_state=random_seed, n_jobs=1)),
                ("nb", GaussianNB()),
            ]
            final_est = LogisticRegression(max_iter=200, random_state=random_seed)
            return StackingClassifier(estimators=estimators, final_estimator=final_est, cv=2, n_jobs=1), "Stacking Ensemble", True

        else:
            return DecisionTreeClassifier(max_depth=8, random_state=random_seed), f"Decision Tree ({model_id})", False

    def run_benchmark(self, req: BenchmarkRunRequest) -> BenchmarkRunResponse:
        t_start = time.time()
        df = dataset_manager.get_dataset_df(req.dataset_id)
        if len(df) == 0:
            raise ValueError(f"Dataset {req.dataset_id} contains zero records.")

        target_col = req.target_column
        if target_col not in df.columns:
            # Auto-detect target column from common intrusion labels
            candidates = ["target", "label", "prediction", "is malicious", "is_malicious", "is_attack", "attack", "class", "binarylabel", "attack_cat"]
            found = next((c for c in df.columns if c.strip().lower() in candidates), None)
            if found:
                target_col = found
            else:
                raise ValueError(f"Target column '{req.target_column}' not found. Available columns: {list(df.columns)[:8]}")

        y_raw = df[target_col]
        X_raw = df.drop(columns=[target_col])

        # Filter numeric features
        if req.feature_columns:
            valid_cols = [c for c in req.feature_columns if c in X_raw.columns]
            X_numeric = X_raw[valid_cols]
        else:
            numeric_cols = [c for c in X_raw.columns if pd.api.types.is_numeric_dtype(X_raw[c])]
            X_numeric = X_raw[numeric_cols]

        if X_numeric.shape[1] == 0:
            raise ValueError("No valid numeric feature columns available for training.")

        # Determine task type
        unique_classes = np.unique(y_raw.dropna())
        num_classes = len(unique_classes)
        if req.task_type in ["binary", "multiclass"]:
            task_type = req.task_type
        else:
            task_type = "multiclass" if num_classes > 2 else "binary"

        eval_results: list[ModelEvaluationResult] = []

        # Execute evaluation strategy
        if req.evaluation_strategy == "cross_validation":
            eval_results = self._evaluate_cross_validation(
                X_numeric, y_raw, req.selected_models, req.cv_folds, req.random_seed, task_type
            )
            train_cnt = int(len(X_numeric) * ((req.cv_folds - 1) / req.cv_folds))
            test_cnt = int(len(X_numeric) / req.cv_folds)
        elif req.evaluation_strategy == "holdout":
            split_idx = int(len(X_numeric) * (1.0 - req.test_split_ratio))
            X_train = X_numeric.iloc[:split_idx]
            y_train = y_raw.iloc[:split_idx]
            X_test = X_numeric.iloc[split_idx:]
            y_test = y_raw.iloc[split_idx:]
            eval_results = self._evaluate_train_test(
                X_train, X_test, y_train, y_test, req.selected_models, req.random_seed, task_type
            )
            train_cnt = len(X_train)
            test_cnt = len(X_test)
        else:  # stratified_split (default)
            try:
                X_train, X_test, y_train, y_test = train_test_split(
                    X_numeric,
                    y_raw,
                    test_size=req.test_split_ratio,
                    random_state=req.random_seed,
                    stratify=y_raw if y_raw.nunique() > 1 else None,
                )
            except Exception:
                X_train, X_test, y_train, y_test = train_test_split(
                    X_numeric,
                    y_raw,
                    test_size=req.test_split_ratio,
                    random_state=req.random_seed,
                )
            eval_results = self._evaluate_train_test(
                X_train, X_test, y_train, y_test, req.selected_models, req.random_seed, task_type
            )
            train_cnt = len(X_train)
            test_cnt = len(X_test)

        # Sort by F1 macro score descending
        eval_results.sort(key=lambda r: r.f1_macro, reverse=True)
        top_model = eval_results[0].name if eval_results else "None"

        return BenchmarkRunResponse(
            benchmark_id=f"bm_{uuid.uuid4().hex[:10]}",
            dataset_id=req.dataset_id,
            target_column=req.target_column,
            task_type=task_type,
            evaluation_strategy=req.evaluation_strategy,
            total_records=len(df),
            train_records=train_cnt,
            test_records=test_cnt,
            feature_count=X_numeric.shape[1],
            results=eval_results,
            top_performer=top_model,
            created_at=datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC"),
        )

    def _evaluate_train_test(
        self,
        X_train: pd.DataFrame,
        X_test: pd.DataFrame,
        y_train: pd.Series,
        y_test: pd.Series,
        selected_models: list[str],
        random_seed: int,
        task_type: str,
    ) -> list[ModelEvaluationResult]:
        # PREVENT DATA LEAKAGE:
        # Fit imputer and scaler strictly on X_train only!
        imputer = SimpleImputer(strategy="median")
        scaler = StandardScaler()

        X_train_clean = imputer.fit_transform(X_train)
        X_train_scaled = scaler.fit_transform(X_train_clean)

        X_test_clean = imputer.transform(X_test)
        X_test_scaled = scaler.transform(X_test_clean)

        results: list[ModelEvaluationResult] = []

        for model_id in selected_models:
            try:
                clf, name, is_ensemble = self.instantiate_model(model_id, random_seed)

                # Measure training duration
                t0 = time.time()
                clf.fit(X_train_scaled, y_train)
                train_time = time.time() - t0

                # Measure inference latency (ms per 1,000 samples)
                t_pred_0 = time.time()
                y_pred = clf.predict(X_test_scaled)
                pred_duration = time.time() - t_pred_0
                latency_1k = (pred_duration / max(1, len(X_test_scaled))) * 1000.0 * 1000.0

                # Probabilities
                y_proba = clf.predict_proba(X_test_scaled) if hasattr(clf, "predict_proba") else None

                # Compute metrics
                acc = float(accuracy_score(y_test, y_pred))
                p_macro = float(precision_score(y_test, y_pred, average="macro", zero_division=0))
                p_weighted = float(precision_score(y_test, y_pred, average="weighted", zero_division=0))
                r_macro = float(recall_score(y_test, y_pred, average="macro", zero_division=0))
                r_weighted = float(recall_score(y_test, y_pred, average="weighted", zero_division=0))
                f1_macro = float(f1_score(y_test, y_pred, average="macro", zero_division=0))
                f1_weighted = float(f1_score(y_test, y_pred, average="weighted", zero_division=0))

                # Confusion Matrix
                classes = [str(c) for c in clf.classes_]
                cm = confusion_matrix(y_test, y_pred, labels=clf.classes_).tolist()
                tn = cm[0][0] if len(cm) > 1 else len(y_test)
                fp = cm[0][1] if len(cm) > 1 and len(cm[0]) > 1 else 0
                fn = cm[1][0] if len(cm) > 1 and len(cm[1]) > 0 else 0
                tp = cm[1][1] if len(cm) > 1 and len(cm[1]) > 1 else 0

                fpr = float(fp / (fp + tn)) if (fp + tn) > 0 else 0.0
                fnr = float(fn / (fn + tp)) if (fn + tp) > 0 else 0.0

                # Per-class metrics
                per_class: list[PerClassMetric] = []
                try:
                    rep = classification_report(y_test, y_pred, output_dict=True, zero_division=0)
                    for k, v in rep.items():
                        if k not in ["accuracy", "macro avg", "weighted avg"] and isinstance(v, dict):
                            per_class.append(PerClassMetric(
                                class_name=str(k),
                                precision=round(float(v.get("precision", 0.0)), 4),
                                recall=round(float(v.get("recall", 0.0)), 4),
                                f1_score=round(float(v.get("f1-score", 0.0)), 4),
                                support=int(v.get("support", 0)),
                            ))
                except Exception:
                    pass

                # ROC-AUC & PR-AUC
                roc_auc_val: float | None = None
                pr_auc_val: float | None = None
                if y_proba is not None:
                    try:
                        if task_type == "binary" and len(clf.classes_) == 2:
                            pos_idx = 1
                            roc_auc_val = round(float(roc_auc_score(y_test, y_proba[:, pos_idx])), 4)
                        elif task_type == "multiclass" and len(np.unique(y_test)) == len(clf.classes_):
                            roc_auc_val = round(float(roc_auc_score(y_test, y_proba, multi_class="ovr", average="macro")), 4)
                    except Exception:
                        pass

                # Model Size in KB
                buf = io.BytesIO()
                pickle.dump(clf, buf)
                size_kb = round(buf.tell() / 1024.0, 2)

                results.append(ModelEvaluationResult(
                    model_id=model_id,
                    name=name,
                    is_ensemble=is_ensemble,
                    accuracy=round(acc, 4),
                    precision_macro=round(p_macro, 4),
                    precision_weighted=round(p_weighted, 4),
                    recall_macro=round(r_macro, 4),
                    recall_weighted=round(r_weighted, 4),
                    f1_macro=round(f1_macro, 4),
                    f1_weighted=round(f1_weighted, 4),
                    false_positive_rate=round(fpr, 4),
                    false_negative_rate=round(fnr, 4),
                    roc_auc=roc_auc_val,
                    pr_auc=pr_auc_val,
                    training_time_seconds=round(train_time, 3),
                    inference_latency_ms_per_1k=round(latency_1k, 2),
                    model_size_kb=size_kb,
                    per_class_metrics=per_class,
                    confusion_matrix=cm,
                    confusion_labels=classes,
                ))

            except Exception as e:
                logger.error(f"Failed to benchmark model {model_id}: {e}", exc_info=True)

        return results

    def _evaluate_cross_validation(
        self,
        X: pd.DataFrame,
        y: pd.Series,
        selected_models: list[str],
        cv_folds: int,
        random_seed: int,
        task_type: str,
    ) -> list[ModelEvaluationResult]:
        """
        Executes k-fold cross validation with strict fold-wise preprocessing to prevent leakage.
        """
        try:
            cv = StratifiedKFold(n_splits=cv_folds, shuffle=True, random_state=random_seed)
            folds = list(cv.split(X, y))
        except Exception:
            cv = KFold(n_splits=cv_folds, shuffle=True, random_state=random_seed)
            folds = list(cv.split(X, y))

        results: list[ModelEvaluationResult] = []

        for model_id in selected_models:
            try:
                clf, name, is_ensemble = self.instantiate_model(model_id, random_seed)

                acc_scores, p_macro_scores, r_macro_scores, f1_macro_scores, f1_wt_scores = [], [], [], [], []
                fpr_scores, fnr_scores, train_times, latencies = [], [], [], []

                for train_idx, test_idx in folds:
                    X_tr, X_te = X.iloc[train_idx], X.iloc[test_idx]
                    y_tr, y_te = y.iloc[train_idx], y.iloc[test_idx]

                    # FIT ONLY ON TRAIN
                    imputer = SimpleImputer(strategy="median")
                    scaler = StandardScaler()
                    X_tr_sc = scaler.fit_transform(imputer.fit_transform(X_tr))
                    X_te_sc = scaler.transform(imputer.transform(X_te))

                    t0 = time.time()
                    clf.fit(X_tr_sc, y_tr)
                    train_times.append(time.time() - t0)

                    t1 = time.time()
                    y_pred = clf.predict(X_te_sc)
                    latencies.append(((time.time() - t1) / len(X_te)) * 1000.0 * 1000.0)

                    acc_scores.append(accuracy_score(y_te, y_pred))
                    p_macro_scores.append(precision_score(y_te, y_pred, average="macro", zero_division=0))
                    r_macro_scores.append(recall_score(y_te, y_pred, average="macro", zero_division=0))
                    f1_macro_scores.append(f1_score(y_te, y_pred, average="macro", zero_division=0))
                    f1_wt_scores.append(f1_score(y_te, y_pred, average="weighted", zero_division=0))

                    cm = confusion_matrix(y_te, y_pred, labels=clf.classes_)
                    tn = cm[0][0] if len(cm) > 1 else len(y_te)
                    fp = cm[0][1] if len(cm) > 1 and len(cm[0]) > 1 else 0
                    fn = cm[1][0] if len(cm) > 1 and len(cm[1]) > 0 else 0
                    tp = cm[1][1] if len(cm) > 1 and len(cm[1]) > 1 else 0

                    fpr_scores.append(float(fp / (fp + tn)) if (fp + tn) > 0 else 0.0)
                    fnr_scores.append(float(fn / (fn + tp)) if (fn + tp) > 0 else 0.0)

                buf = io.BytesIO()
                pickle.dump(clf, buf)
                size_kb = round(buf.tell() / 1024.0, 2)

                results.append(ModelEvaluationResult(
                    model_id=model_id,
                    name=f"{name} ({cv_folds}-Fold CV)",
                    is_ensemble=is_ensemble,
                    accuracy=round(float(np.mean(acc_scores)), 4),
                    precision_macro=round(float(np.mean(p_macro_scores)), 4),
                    precision_weighted=round(float(np.mean(p_macro_scores)), 4),
                    recall_macro=round(float(np.mean(r_macro_scores)), 4),
                    recall_weighted=round(float(np.mean(r_macro_scores)), 4),
                    f1_macro=round(float(np.mean(f1_macro_scores)), 4),
                    f1_weighted=round(float(np.mean(f1_wt_scores)), 4),
                    false_positive_rate=round(float(np.mean(fpr_scores)), 4),
                    false_negative_rate=round(float(np.mean(fnr_scores)), 4),
                    roc_auc=None,
                    pr_auc=None,
                    training_time_seconds=round(float(np.sum(train_times)), 3),
                    inference_latency_ms_per_1k=round(float(np.mean(latencies)), 2),
                    model_size_kb=size_kb,
                    per_class_metrics=[],
                    confusion_matrix=[],
                    confusion_labels=[str(c) for c in clf.classes_],
                ))

            except Exception as e:
                logger.error(f"Failed CV benchmark for {model_id}: {e}", exc_info=True)

        return results

evaluation_engine = EvaluationEngine()
