import argparse
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from src.config import MODELS_DIR
from src.data_audit import clean_column_names


def load_model(model_path: str | None = None):
    path = model_path or MODELS_DIR / "final_model_random_forest.joblib"
    return joblib.load(path)


def predict_file(input_csv: str, output_csv: str, model_path: str | None = None) -> None:
    model = load_model(model_path)
    data = pd.read_csv(input_csv)
    data = clean_column_names(data)
    if "Label" in data.columns:
        data = data.drop(columns=["Label"])
    if "BinaryLabel" in data.columns:
        data = data.drop(columns=["BinaryLabel"])
    if "target" in data.columns:
        data = data.drop(columns=["target"])

    # CIC-IDS raw files contain infinite rates for some zero-duration flows.
    # The training preprocessing removes those rows; at prediction time, turn
    # them into missing values so the model pipeline's median imputer can
    # handle them without discarding predictions.
    numeric_columns = data.select_dtypes(include=[np.number]).columns
    non_finite_count = int(
        (~np.isfinite(data[numeric_columns].to_numpy())).sum()
    ) if len(numeric_columns) else 0
    if non_finite_count:
        data.loc[:, numeric_columns] = data[numeric_columns].replace(
            [np.inf, -np.inf], np.nan
        )
        print(f"Replaced {non_finite_count:,} non-finite feature value(s) with missing values.")

    predictions = model.predict(data)
    output = data.copy()
    output["predicted_label"] = predictions
    if hasattr(model, "predict_proba"):
        classes = list(model.classes_)
        if "Attack" in classes:
            output["attack_probability"] = model.predict_proba(data)[:, classes.index("Attack")]
    output_path = Path(output_csv)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output.to_csv(output_path, index=False)
    print(f"Predictions saved to: {output_csv}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Predict Benign/Attack for CIC-IDS flow CSV data.")
    parser.add_argument("--input", required=True, help="Input CSV containing CIC-IDS-style feature columns.")
    parser.add_argument("--output", default="outputs/predictions.csv")
    parser.add_argument("--model", default=None, help="Optional model path.")
    args = parser.parse_args()
    predict_file(args.input, args.output, model_path=args.model)


if __name__ == "__main__":
    main()
