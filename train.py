"""Run the main CIC-IDS-2017 binary intrusion detection workflow."""

from src.data_audit import print_audit_summary, run_audit
from src.eda import run_eda
from src.explainability import run_explainability
from src.feature_selection import run_feature_selection
from src.hyperparameter_tuning import run_tuning
from src.imbalance_experiments import run_imbalance_experiments
from src.preprocessing import run_preprocessing
from src.train_baselines import run_baseline_training
from src.train_ensembles import run_ensemble_training
from src.visualize_results import run_visualizations


def main() -> None:
    audit = run_audit()
    print_audit_summary(audit)
    run_eda()
    run_preprocessing(task="binary", sample_rows=250_000, save_splits=True)
    run_baseline_training()
    run_ensemble_training()
    run_imbalance_experiments()
    run_feature_selection(top_k=20)
    run_tuning(max_train_rows=40_000)
    run_explainability()
    run_visualizations()


if __name__ == "__main__":
    main()
