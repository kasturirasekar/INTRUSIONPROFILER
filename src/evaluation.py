import time

import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)


POSITIVE_LABEL = "Attack"


def get_positive_scores(model, X_test: pd.DataFrame) -> np.ndarray | None:
    if hasattr(model, "predict_proba"):
        probabilities = model.predict_proba(X_test)
        classes = list(model.classes_)
        if POSITIVE_LABEL in classes:
            return probabilities[:, classes.index(POSITIVE_LABEL)]
        return probabilities[:, 1]

    if hasattr(model, "decision_function"):
        scores = model.decision_function(X_test)
        if scores.ndim == 1:
            classes = getattr(model, "classes_", None)
            if classes is not None and len(classes) == 2 and classes[1] != POSITIVE_LABEL:
                scores = -scores
            return scores
    return None


def evaluate_binary_model(model, X_test: pd.DataFrame, y_test: pd.Series) -> dict:
    start = time.perf_counter()
    y_pred = model.predict(X_test)
    prediction_time = time.perf_counter() - start

    labels = ["Benign", "Attack"]
    scores = get_positive_scores(model, X_test)

    metrics = {
        "accuracy": accuracy_score(y_test, y_pred),
        "precision_attack": precision_score(
            y_test, y_pred, pos_label=POSITIVE_LABEL, zero_division=0
        ),
        "recall_attack": recall_score(
            y_test, y_pred, pos_label=POSITIVE_LABEL, zero_division=0
        ),
        "f1_attack": f1_score(y_test, y_pred, pos_label=POSITIVE_LABEL, zero_division=0),
        "prediction_time_seconds": prediction_time,
        "confusion_matrix_labels": labels,
        "confusion_matrix": confusion_matrix(y_test, y_pred, labels=labels).tolist(),
    }

    if scores is not None:
        y_binary = (y_test == POSITIVE_LABEL).astype(int)
        metrics["roc_auc"] = roc_auc_score(y_binary, scores)
        metrics["average_precision"] = average_precision_score(y_binary, scores)
    else:
        metrics["roc_auc"] = None
        metrics["average_precision"] = None

    return metrics


def train_and_evaluate_binary_model(
    model,
    X_train: pd.DataFrame,
    y_train: pd.Series,
    X_test: pd.DataFrame,
    y_test: pd.Series,
) -> dict:
    start = time.perf_counter()
    model.fit(X_train, y_train)
    training_time = time.perf_counter() - start

    metrics = evaluate_binary_model(model, X_test, y_test)
    metrics["training_time_seconds"] = training_time
    return metrics
