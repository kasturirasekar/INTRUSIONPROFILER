from __future__ import annotations

import logging
from typing import Any

from sklearn.ensemble import (
    AdaBoostClassifier,
    BaggingClassifier,
    ExtraTreesClassifier,
    GradientBoostingClassifier,
    RandomForestClassifier,
    StackingClassifier,
    VotingClassifier,
)
from sklearn.linear_model import LogisticRegression
from sklearn.naive_bayes import GaussianNB
from sklearn.neighbors import KNeighborsClassifier
from sklearn.svm import SVC
from sklearn.tree import DecisionTreeClassifier

from ...schemas.lab import BaseClassifierConfig, EnsembleConfig

logger = logging.getLogger(__name__)

class EnsembleBuilder:
    def create_base_estimator(
        self, model_id: str, params: dict[str, Any], random_seed: int = 42
    ) -> Any:
        # Sanitize and convert parameters
        p = dict(params)

        if model_id == "decision_tree":
            return DecisionTreeClassifier(
                criterion=p.get("criterion", "gini"),
                max_depth=int(p["max_depth"]) if p.get("max_depth") else 10,
                min_samples_split=int(p.get("min_samples_split", 10)),
                min_samples_leaf=int(p.get("min_samples_leaf", 5)),
                random_state=random_seed,
            )
        elif model_id == "random_forest":
            cw = p.get("class_weight")
            if cw == "none":
                cw = None
            return RandomForestClassifier(
                n_estimators=int(p.get("n_estimators", 50)),
                max_depth=int(p["max_depth"]) if p.get("max_depth") else 14,
                min_samples_split=int(p.get("min_samples_split", 5)),
                class_weight=cw,
                random_state=random_seed,
                n_jobs=1,
            )
        elif model_id == "logistic_regression":
            cw = p.get("class_weight")
            if cw == "none":
                cw = None
            return LogisticRegression(
                C=float(p.get("C", 1.0)),
                solver=p.get("solver", "lbfgs"),
                max_iter=int(p.get("max_iter", 500)),
                class_weight=cw,
                random_state=random_seed,
            )
        elif model_id == "knn":
            return KNeighborsClassifier(
                n_neighbors=int(p.get("n_neighbors", 5)),
                weights=p.get("weights", "uniform"),
                metric=p.get("metric", "euclidean"),
                n_jobs=1,
            )
        elif model_id == "svm":
            return SVC(
                C=float(p.get("C", 1.0)),
                kernel=p.get("kernel", "rbf"),
                probability=True,
                random_state=random_seed,
            )
        elif model_id == "naive_bayes":
            return GaussianNB(var_smoothing=float(p.get("var_smoothing", 1e-9)))
        elif model_id == "extra_trees":
            return ExtraTreesClassifier(
                n_estimators=int(p.get("n_estimators", 50)),
                max_depth=int(p["max_depth"]) if p.get("max_depth") else 14,
                random_state=random_seed,
                n_jobs=1,
            )
        elif model_id == "gradient_boosting":
            return GradientBoostingClassifier(
                n_estimators=int(p.get("n_estimators", 80)),
                learning_rate=float(p.get("learning_rate", 0.1)),
                max_depth=int(p.get("max_depth", 4)),
                random_state=random_seed,
            )
        elif model_id == "adaboost":
            return AdaBoostClassifier(
                n_estimators=int(p.get("n_estimators", 50)),
                learning_rate=float(p.get("learning_rate", 0.1)),
                random_state=random_seed,
            )
        else:
            return DecisionTreeClassifier(max_depth=8, random_state=random_seed)

    def build_ensemble(
        self, config: EnsembleConfig, random_seed: int = 42
    ) -> Any:
        strategy = config.strategy

        if strategy == "voting":
            estimators = []
            weights = []
            for item in config.base_classifiers:
                if item.enabled:
                    est = self.create_base_estimator(item.model_id, item.hyperparameters, random_seed)
                    estimators.append((item.model_id, est))
                    weights.append(float(item.weight))

            if not estimators:
                # Default fallback
                estimators = [
                    ("dt", DecisionTreeClassifier(max_depth=10, random_state=random_seed)),
                    ("rf", RandomForestClassifier(n_estimators=50, max_depth=12, random_state=random_seed, n_jobs=1)),
                    ("lr", LogisticRegression(max_iter=500, random_state=random_seed)),
                ]
                weights = [1.0, 1.0, 1.0]

            return VotingClassifier(
                estimators=estimators,
                voting=config.voting_type,
                weights=weights if len(weights) == len(estimators) else None,
                n_jobs=1,
            )

        elif strategy == "stacking":
            estimators = []
            for item in config.base_classifiers:
                if item.enabled:
                    est = self.create_base_estimator(item.model_id, item.hyperparameters, random_seed)
                    estimators.append((item.model_id, est))

            if not estimators:
                estimators = [
                    ("dt", DecisionTreeClassifier(max_depth=10, random_state=random_seed)),
                    ("rf", RandomForestClassifier(n_estimators=50, max_depth=12, random_state=random_seed, n_jobs=1)),
                    ("nb", GaussianNB()),
                ]

            meta = self.create_base_estimator(
                config.meta_classifier_id, config.meta_classifier_hyperparameters, random_seed
            )

            return StackingClassifier(
                estimators=estimators,
                final_estimator=meta,
                cv=config.cv_folds,
                passthrough=config.passthrough,
                n_jobs=1,
            )

        elif strategy == "bagging":
            base_est = self.create_base_estimator(
                config.base_estimator_id, {}, random_seed
            )
            return BaggingClassifier(
                estimator=base_est,
                n_estimators=config.n_estimators,
                max_samples=config.max_samples,
                bootstrap=config.bootstrap,
                random_state=random_seed,
                n_jobs=1,
            )

        elif strategy == "boosting":
            if config.base_estimator_id == "gradient_boosting":
                return GradientBoostingClassifier(
                    n_estimators=config.n_estimators,
                    learning_rate=config.learning_rate,
                    subsample=config.subsample,
                    random_state=random_seed,
                )
            else:
                base_est = DecisionTreeClassifier(max_depth=2, random_state=random_seed)
                return AdaBoostClassifier(
                    estimator=base_est,
                    n_estimators=config.n_estimators,
                    learning_rate=config.learning_rate,
                    random_state=random_seed,
                )

        else: # random_forest
            return RandomForestClassifier(
                n_estimators=config.n_estimators,
                max_samples=config.max_samples if config.max_samples < 1.0 else None,
                bootstrap=config.bootstrap,
                random_state=random_seed,
                n_jobs=-1,
            )

ensemble_builder = EnsembleBuilder()
