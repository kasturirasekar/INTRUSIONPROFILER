from sklearn.model_selection import StratifiedKFold

try:
    from config import RANDOM_SEED
except ModuleNotFoundError:
    from .config import RANDOM_SEED


def get_stratified_cv(n_splits: int = 3) -> StratifiedKFold:
    return StratifiedKFold(
        n_splits=n_splits,
        shuffle=True,
        random_state=RANDOM_SEED,
    )
