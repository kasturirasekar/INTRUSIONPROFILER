from __future__ import annotations

from typing import Any
from ...schemas.lab import AvailableModelsResponse, HyperparameterSpec, ModelCatalogItem

CATALOG_MODELS: list[ModelCatalogItem] = [
    ModelCatalogItem(
        id="decision_tree",
        name="Decision Tree Classifier",
        category="Tree Based",
        role_in_intrusion_detection="Rule-based flow separator. Learns hierarchical threshold logic on features like Flow Duration and Packet Length.",
        description="Non-parametric supervised learner that recursively partitions traffic based on entropy or Gini impurity.",
        supported_tasks=["binary", "multiclass"],
        supports_predict_proba=True,
        hyperparameters=[
            HyperparameterSpec(name="criterion", type="str", default="gini", options=["gini", "entropy", "log_loss"], description="Function to measure split quality."),
            HyperparameterSpec(name="max_depth", type="int", default=10, min_value=1, max_value=50, description="Maximum tree depth. Controls model complexity and prevents overfitting on noise."),
            HyperparameterSpec(name="min_samples_split", type="int", default=10, min_value=2, max_value=100, description="Minimum samples required to split an internal node."),
            HyperparameterSpec(name="min_samples_leaf", type="int", default=5, min_value=1, max_value=50, description="Minimum samples required at a leaf node."),
        ],
        default_hyperparameters={"criterion": "gini", "max_depth": 10, "min_samples_split": 10, "min_samples_leaf": 5},
    ),
    ModelCatalogItem(
        id="random_forest",
        name="Random Forest Classifier",
        category="Tree Ensemble",
        role_in_intrusion_detection="High-variance reducer. Combines multiple uncorrelated decision trees trained on random feature subsets to prevent evasions.",
        description="Bootstrap aggregating ensemble of decision trees with feature sub-sampling.",
        supported_tasks=["binary", "multiclass"],
        supports_predict_proba=True,
        hyperparameters=[
            HyperparameterSpec(name="n_estimators", type="int", default=100, min_value=10, max_value=300, description="Number of trees in the forest."),
            HyperparameterSpec(name="max_depth", type="int", default=16, min_value=2, max_value=40, description="Maximum depth of individual trees."),
            HyperparameterSpec(name="min_samples_split", type="int", default=5, min_value=2, max_value=50, description="Minimum samples to split a node."),
            HyperparameterSpec(name="class_weight", type="str", default="balanced", options=["balanced", "balanced_subsample", "none"], description="Weights associated with classes to combat intrusion imbalance."),
        ],
        default_hyperparameters={"n_estimators": 100, "max_depth": 16, "min_samples_split": 5, "class_weight": "balanced"},
    ),
    ModelCatalogItem(
        id="logistic_regression",
        name="Logistic Regression",
        category="Linear Model",
        role_in_intrusion_detection="Baseline linear separator. Effective when flow features have strong monotonic relationships with attack likelihood.",
        description="Generalized linear model using sigmoid function for probability estimation.",
        supported_tasks=["binary", "multiclass"],
        supports_predict_proba=True,
        hyperparameters=[
            HyperparameterSpec(name="C", type="float", default=1.0, min_value=0.01, max_value=100.0, description="Inverse regularization strength. Smaller values specify stronger regularization."),
            HyperparameterSpec(name="solver", type="str", default="lbfgs", options=["lbfgs", "saga"], description="Optimization algorithm."),
            HyperparameterSpec(name="max_iter", type="int", default=500, min_value=100, max_value=2000, description="Maximum number of solver iterations."),
            HyperparameterSpec(name="class_weight", type="str", default="balanced", options=["balanced", "none"], description="Imbalance adjustment."),
        ],
        default_hyperparameters={"C": 1.0, "solver": "lbfgs", "max_iter": 500, "class_weight": "balanced"},
    ),
    ModelCatalogItem(
        id="knn",
        name="K-Nearest Neighbors (KNN)",
        category="Distance Based",
        role_in_intrusion_detection="Cluster-based outlier and attack profiler. Flags flows whose nearest neighbor signatures closely match known exploit profiles.",
        description="Instance-based non-parametric classifier using distance metrics in normalized feature space.",
        supported_tasks=["binary", "multiclass"],
        supports_predict_proba=True,
        hyperparameters=[
            HyperparameterSpec(name="n_neighbors", type="int", default=5, min_value=1, max_value=25, description="Number of nearest neighbors to query."),
            HyperparameterSpec(name="weights", type="str", default="uniform", options=["uniform", "distance"], description="Weight function used in prediction."),
            HyperparameterSpec(name="metric", type="str", default="euclidean", options=["euclidean", "manhattan"], description="Distance metric."),
        ],
        default_hyperparameters={"n_neighbors": 5, "weights": "uniform", "metric": "euclidean"},
    ),
    ModelCatalogItem(
        id="svm",
        name="Support Vector Machine (Linear/RBF)",
        category="Kernel Method",
        role_in_intrusion_detection="Maximal margin boundary identifier. Maximizes separation margin between benign network noise and malicious infiltration.",
        description="Identifies hyperplanes that maximize geometric distance to nearest data points.",
        supported_tasks=["binary"],
        supports_predict_proba=True,
        hyperparameters=[
            HyperparameterSpec(name="C", type="float", default=1.0, min_value=0.1, max_value=20.0, description="Regularization penalty parameter."),
            HyperparameterSpec(name="kernel", type="str", default="rbf", options=["rbf", "linear"], description="Kernel transformation function."),
        ],
        default_hyperparameters={"C": 1.0, "kernel": "rbf"},
    ),
    ModelCatalogItem(
        id="naive_bayes",
        name="Gaussian Naive Bayes",
        category="Probabilistic",
        role_in_intrusion_detection="Fast statistical baseline. Computes conditional probabilities under conditional feature independence assumptions.",
        description="Bayesian classifier assuming normal distribution of continuous network features.",
        supported_tasks=["binary", "multiclass"],
        supports_predict_proba=True,
        hyperparameters=[
            HyperparameterSpec(name="var_smoothing", type="float", default=1e-9, min_value=1e-12, max_value=1e-3, description="Portion of largest variance added to variance for numerical stability."),
        ],
        default_hyperparameters={"var_smoothing": 1e-9},
    ),
    ModelCatalogItem(
        id="extra_trees",
        name="Extra Trees Classifier",
        category="Tree Ensemble",
        role_in_intrusion_detection="Extremely randomized tree ensemble. Cuts computational overhead and reduces variance beyond standard Random Forest.",
        description="Randomized trees where both feature subset and split thresholds are chosen randomly.",
        supported_tasks=["binary", "multiclass"],
        supports_predict_proba=True,
        hyperparameters=[
            HyperparameterSpec(name="n_estimators", type="int", default=100, min_value=10, max_value=250, description="Number of trees."),
            HyperparameterSpec(name="max_depth", type="int", default=15, min_value=2, max_value=35, description="Tree depth."),
        ],
        default_hyperparameters={"n_estimators": 100, "max_depth": 15},
    ),
    ModelCatalogItem(
        id="gradient_boosting",
        name="Gradient Boosting Classifier",
        category="Boosting",
        role_in_intrusion_detection="Iterative error corrector. Focuses successive weak learners on subtle or stealthy attack flows missed by previous trees.",
        description="Sequential additive model optimizing pseudo-residuals using gradient descent.",
        supported_tasks=["binary", "multiclass"],
        supports_predict_proba=True,
        hyperparameters=[
            HyperparameterSpec(name="n_estimators", type="int", default=80, min_value=10, max_value=200, description="Number of boosting stages."),
            HyperparameterSpec(name="learning_rate", type="float", default=0.1, min_value=0.01, max_value=1.0, description="Shrinkage factor per stage."),
            HyperparameterSpec(name="max_depth", type="int", default=4, min_value=1, max_value=10, description="Maximum depth of individual regression estimators."),
        ],
        default_hyperparameters={"n_estimators": 80, "learning_rate": 0.1, "max_depth": 4},
    ),
    ModelCatalogItem(
        id="adaboost",
        name="AdaBoost Classifier",
        category="Boosting",
        role_in_intrusion_detection="Adaptive reweighting booster. Increases sample weights of false negatives (undetected attacks) so next stump isolates them.",
        description="Adaptive boosting algorithm sequentially combining weighted decision stumps.",
        supported_tasks=["binary", "multiclass"],
        supports_predict_proba=True,
        hyperparameters=[
            HyperparameterSpec(name="n_estimators", type="int", default=50, min_value=10, max_value=200, description="Number of estimators at which boosting is terminated."),
            HyperparameterSpec(name="learning_rate", type="float", default=0.1, min_value=0.01, max_value=1.0, description="Weight applied to each classifier at each boosting iteration."),
        ],
        default_hyperparameters={"n_estimators": 50, "learning_rate": 0.1},
    ),
]

ENSEMBLE_STRATEGIES = [
    {
        "id": "voting",
        "name": "Voting Classifier (Hard / Soft)",
        "description": "Combines predictions from multiple distinct base learners via majority vote or weighted average probabilities.",
        "cybersecurity_benefit": "Dramatically reduces single-model blind spots by requiring consensus among diverse algorithmic paradigms.",
        "modes": ["hard", "soft"],
    },
    {
        "id": "stacking",
        "name": "Stacking Classifier (Meta-Learner)",
        "description": "Trains heterogeneous base learners, collects out-of-fold predictions, and trains a meta-classifier to make the final determination.",
        "cybersecurity_benefit": "Learns which classifier performs best on which attack characteristics (e.g. tree on volume attacks, linear on port scans).",
        "supported_meta": ["logistic_regression", "decision_tree", "random_forest", "gradient_boosting"],
    },
    {
        "id": "bagging",
        "name": "Bootstrap Aggregating (Bagging)",
        "description": "Trains multiple instances of the same base learner on different random bootstrap subsets of the network flows.",
        "cybersecurity_benefit": "Stabilizes unstable base models and prevents overfitting to specific network anomalies or training artifacts.",
    },
    {
        "id": "boosting",
        "name": "Sequential Error Correction (Boosting)",
        "description": "Sequentially trains weak estimators where each stage focuses heavily on the network intrusions misclassified by earlier stages.",
        "cybersecurity_benefit": "Excels at catching low-footprint, stealthy attacks that slip past high-volume threshold filters.",
    },
    {
        "id": "random_forest",
        "name": "Random Forest (Bagged Random Subspace)",
        "description": "Builds a forest of decorrelated decision trees using both bootstrap sampling and random feature subset selection at each split.",
        "cybersecurity_benefit": "The gold standard in production intrusion detection: high accuracy, zero divergence, and rapid inference latency.",
    },
]

def get_available_models() -> AvailableModelsResponse:
    return AvailableModelsResponse(
        base_classifiers=CATALOG_MODELS,
        ensemble_strategies=ENSEMBLE_STRATEGIES,
    )
