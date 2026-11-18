import pandas as pd

try:
    from config import PROCESSED_DIR
except ModuleNotFoundError:
    from .config import PROCESSED_DIR


def load_processed_split(task: str = "binary") -> tuple[pd.DataFrame, pd.DataFrame, pd.Series, pd.Series]:
    train_path = PROCESSED_DIR / f"{task}_train.csv.gz"
    test_path = PROCESSED_DIR / f"{task}_test.csv.gz"
    if not train_path.exists() or not test_path.exists():
        raise FileNotFoundError(
            f"Missing processed split files for task '{task}'. Run `python3 src/preprocessing.py --task {task}` first."
        )

    train = pd.read_csv(train_path)
    test = pd.read_csv(test_path)

    X_train = train.drop(columns=["target"])
    y_train = train["target"]
    X_test = test.drop(columns=["target"])
    y_test = test["target"]
    return X_train, X_test, y_train, y_test
