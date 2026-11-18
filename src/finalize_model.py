import json
import shutil

import pandas as pd

try:
    from config import METRICS_DIR, MODELS_DIR
except ModuleNotFoundError:
    from .config import METRICS_DIR, MODELS_DIR


def finalize_model() -> dict:
    baseline = pd.read_csv(METRICS_DIR / "baseline_model_comparison.csv")
    ensemble = pd.read_csv(METRICS_DIR / "ensemble_model_comparison.csv")
    combined = pd.concat([baseline, ensemble], ignore_index=True)
    best_f1_row = combined.sort_values("f1_attack", ascending=False).iloc[0].to_dict()

    practical_model_name = "Logistic Regression"
    practical_model_path = MODELS_DIR / "baseline_logistic_regression.joblib"
    final_model_path = MODELS_DIR / "final_model_logistic_regression.joblib"
    shutil.copyfile(practical_model_path, final_model_path)

    practical_row = baseline[baseline["model"] == practical_model_name].iloc[0].to_dict()
    metadata = {
        "selected_final_model": practical_model_name,
        "reason": (
            "Logistic Regression was selected as the regularized production baseline. It was trained on the full "
            "available CIC-IDS-2017 training partition and evaluated on the untouched test partition. The measured "
            "holdout accuracy is below 95%; attack recall is lower than the tree ensembles and must be considered "
            "when using the model for security operations."
        ),
        "final_model_path": str(final_model_path),
        "practical_random_forest_metrics": practical_row,
        "best_f1_model_in_experiment": best_f1_row,
    }
    with (METRICS_DIR / "final_model_metadata.json").open("w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    print(json.dumps(metadata, indent=2))
    return metadata


if __name__ == "__main__":
    finalize_model()
