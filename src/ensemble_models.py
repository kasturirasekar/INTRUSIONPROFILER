from sklearn.ensemble import (
    AdaBoostClassifier,
    GradientBoostingClassifier,
    RandomForestClassifier,
    StackingClassifier,
    VotingClassifier,
)
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.tree import DecisionTreeClassifier

try:
    from config import RANDOM_SEED
    from preprocessing import build_scaled_preprocessor, build_tree_preprocessor
except ModuleNotFoundError:
    from .config import RANDOM_SEED
    from .preprocessing import build_scaled_preprocessor, build_tree_preprocessor


def get_ensemble_models(feature_columns: list[str]) -> dict[str, Pipeline]:
    scaled_preprocessor = build_scaled_preprocessor(feature_columns)
    tree_preprocessor = build_tree_preprocessor(feature_columns)

    logistic = LogisticRegression(max_iter=1000, random_state=RANDOM_SEED)
    decision_stump = DecisionTreeClassifier(max_depth=1, random_state=RANDOM_SEED)
    decision_tree = DecisionTreeClassifier(max_depth=12, random_state=RANDOM_SEED)
    random_forest = RandomForestClassifier(
        n_estimators=100,
        random_state=RANDOM_SEED,
        n_jobs=-1,
    )
    compact_random_forest = RandomForestClassifier(
        n_estimators=50,
        max_depth=16,
        random_state=RANDOM_SEED,
        n_jobs=1,
    )
    gradient_boosting = GradientBoostingClassifier(
        n_estimators=80,
        learning_rate=0.1,
        max_depth=3,
        random_state=RANDOM_SEED,
    )

    hard_voting = VotingClassifier(
        estimators=[
            ("lr", logistic),
            ("dt", decision_tree),
            ("rf", compact_random_forest),
        ],
        voting="hard",
        n_jobs=1,
    )
    soft_voting = VotingClassifier(
        estimators=[
            ("lr", logistic),
            ("dt", decision_tree),
            ("rf", compact_random_forest),
        ],
        voting="soft",
        n_jobs=1,
    )
    stacking = StackingClassifier(
        estimators=[
            ("lr", logistic),
            ("dt", decision_tree),
            ("rf", compact_random_forest),
        ],
        final_estimator=LogisticRegression(max_iter=1000, random_state=RANDOM_SEED),
        cv=3,
        n_jobs=1,
    )

    return {
        "Random Forest Bagging": Pipeline(
            steps=[
                ("preprocess", tree_preprocessor),
                ("model", random_forest),
            ]
        ),
        "AdaBoost": Pipeline(
            steps=[
                ("preprocess", tree_preprocessor),
                (
                    "model",
                    AdaBoostClassifier(
                        estimator=decision_stump,
                        n_estimators=80,
                        learning_rate=0.5,
                        random_state=RANDOM_SEED,
                    ),
                ),
            ]
        ),
        "Gradient Boosting": Pipeline(
            steps=[
                ("preprocess", tree_preprocessor),
                ("model", gradient_boosting),
            ]
        ),
        "Hard Voting": Pipeline(
            steps=[
                ("preprocess", scaled_preprocessor),
                ("model", hard_voting),
            ]
        ),
        "Soft Voting": Pipeline(
            steps=[
                ("preprocess", scaled_preprocessor),
                ("model", soft_voting),
            ]
        ),
        "Stacking": Pipeline(
            steps=[
                ("preprocess", scaled_preprocessor),
                ("model", stacking),
            ]
        ),
    }


def explain_ensemble_model_choices() -> dict[str, str]:
    return {
        "Random Forest Bagging": "Uses bootstrap samples and many decision trees to reduce variance.",
        "AdaBoost": "Trains weak learners sequentially and increases focus on previously misclassified flows.",
        "Gradient Boosting": "Builds trees sequentially to correct residual errors from earlier learners.",
        "Hard Voting": "Combines class labels from multiple models using majority vote.",
        "Soft Voting": "Averages predicted probabilities, so confident models influence the final decision more.",
        "Stacking": "Feeds base-model predictions into a meta-classifier that learns how to combine them.",
    }
