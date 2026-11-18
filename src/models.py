from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import Pipeline
from sklearn.svm import LinearSVC
from sklearn.tree import DecisionTreeClassifier

try:
    from config import RANDOM_SEED
    from preprocessing import build_scaled_preprocessor, build_tree_preprocessor
except ModuleNotFoundError:
    from .config import RANDOM_SEED
    from .preprocessing import build_scaled_preprocessor, build_tree_preprocessor


def get_baseline_models(feature_columns: list[str]) -> dict[str, Pipeline]:
    scaled_preprocessor = build_scaled_preprocessor(feature_columns)
    tree_preprocessor = build_tree_preprocessor(feature_columns)

    return {
        "Decision Tree": Pipeline(
            steps=[
                ("preprocess", tree_preprocessor),
                ("model", DecisionTreeClassifier(random_state=RANDOM_SEED)),
            ]
        ),
        "Logistic Regression": Pipeline(
            steps=[
                ("preprocess", scaled_preprocessor),
                (
                    "model",
                    LogisticRegression(
                        max_iter=1000,
                        random_state=RANDOM_SEED,
                    ),
                ),
            ]
        ),
        "Random Forest": Pipeline(
            steps=[
                ("preprocess", tree_preprocessor),
                (
                    "model",
                    RandomForestClassifier(
                        n_estimators=100,
                        random_state=RANDOM_SEED,
                        n_jobs=-1,
                    ),
                ),
            ]
        ),
        "Support Vector Machine": Pipeline(
            steps=[
                ("preprocess", scaled_preprocessor),
                (
                    "model",
                    LinearSVC(
                        dual=False,
                        max_iter=5000,
                        random_state=RANDOM_SEED,
                    ),
                ),
            ]
        ),
        "K-Nearest Neighbors": Pipeline(
            steps=[
                ("preprocess", scaled_preprocessor),
                ("model", KNeighborsClassifier(n_neighbors=5, n_jobs=-1)),
            ]
        ),
    }


def explain_baseline_model_choices() -> dict[str, str]:
    return {
        "Decision Tree": "Interpretable non-linear baseline that shows how tree splits separate benign and attack flows.",
        "Logistic Regression": "Linear baseline that helps test whether the classes are separable with a simple decision boundary.",
        "Random Forest": "Strong tree-based baseline and bagging ensemble; useful for feature importance and variance reduction.",
        "Support Vector Machine": "Linear margin-based classifier used as a computationally feasible SVM baseline for large flow data.",
        "K-Nearest Neighbors": "Distance-based baseline that is easy to understand, but prediction can be slow on large traffic datasets.",
    }
