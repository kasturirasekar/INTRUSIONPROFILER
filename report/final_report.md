# Cybersecurity Attack Detection Using Machine Learning: An Ensemble Learning Approach on CIC-IDS-2017

## 1. Abstract

This project builds a machine learning-based intrusion detection system using the CIC-IDS-2017 dataset. The primary task is binary classification of network flows as `Benign` or `Attack`. A secondary multiclass experiment is included on a development subset. The project compares baseline classifiers with ensemble learning methods, evaluates class imbalance handling, studies feature importance, and discusses results from a cybersecurity perspective. On the executed binary development experiment, Stacking achieved the highest F1-score, while Random Forest was selected as the practical final model because it delivered nearly identical detection quality with much lower training cost.

## 2. Introduction

Intrusion Detection Systems monitor network traffic to identify malicious activity. Traditional signature-based systems are useful for known attacks but may struggle with new or changing attack patterns. Machine learning can learn statistical differences between benign and malicious flows, but it must be evaluated carefully because cybersecurity datasets are often imbalanced and may contain duplicated or artifact-heavy records.

This project focuses on ensemble learning because ensembles combine multiple weak or diverse learners to improve generalization.

## 3. Problem Statement

Given CIC-IDS-2017 network-flow features, build a classifier that predicts whether a flow is benign or an attack. The system should compare individual ML classifiers against ensemble methods and identify a model that balances detection performance and computational efficiency.

## 4. Objectives

- Audit and clean the CIC-IDS-2017 CSV files.
- Build a binary `Benign` vs `Attack` classifier.
- Optionally test multiclass attack classification.
- Compare baseline models and ensemble models.
- Evaluate attack recall, precision, F1-score, ROC-AUC, confusion matrix, training time, and prediction time.
- Study the effect of class imbalance handling.
- Identify important network-flow features.
- Save a reproducible final model.

## 5. Literature Review

Intrusion detection can be treated as a supervised classification problem when labelled traffic is available. Decision Trees are interpretable but may overfit. Logistic Regression provides a linear baseline. SVMs use margin maximization but can be computationally expensive. KNN is simple but slow at inference on large datasets. Ensemble methods often improve robustness: Random Forest uses bagging to reduce variance, while boosting methods learn sequentially from errors. Voting and stacking combine diverse models to improve final prediction.

## 6. Dataset Description

CIC-IDS-2017 was created by the Canadian Institute for Cybersecurity at the University of New Brunswick. It contains benign and attack traffic collected over five working days and converted to flow-level CSV features using CICFlowMeter.

Files used:

- Monday-WorkingHours.pcap_ISCX.csv
- Tuesday-WorkingHours.pcap_ISCX.csv
- Wednesday-workingHours.pcap_ISCX.csv
- Thursday-WorkingHours-Morning-WebAttacks.pcap_ISCX.csv
- Thursday-WorkingHours-Afternoon-Infilteration.pcap_ISCX.csv
- Friday-WorkingHours-Morning.pcap_ISCX.csv
- Friday-WorkingHours-Afternoon-PortScan.pcap_ISCX.csv
- Friday-WorkingHours-Afternoon-DDos.pcap_ISCX.csv

Full audit result:

- Total rows: 2,830,743
- Total columns: 79
- Features: 78
- Target: `Label`
- Estimated duplicate rows: 308,381
- Missing values found in `Flow Bytes/s`
- Infinite values found in `Flow Bytes/s` and `Flow Packets/s`
- Web Attack labels contained encoding artifacts and were normalized

Class distribution:

| Class | Count | Percentage |
|---|---:|---:|
| BENIGN | 2,273,097 | 80.3004 |
| DoS Hulk | 231,073 | 8.1630 |
| PortScan | 158,930 | 5.6144 |
| DDoS | 128,027 | 4.5227 |
| DoS GoldenEye | 10,293 | 0.3636 |
| FTP-Patator | 7,938 | 0.2804 |
| SSH-Patator | 5,897 | 0.2083 |
| DoS slowloris | 5,796 | 0.2048 |
| DoS Slowhttptest | 5,499 | 0.1943 |
| Bot | 1,966 | 0.0695 |
| Web Attack - Brute Force | 1,507 | 0.0532 |
| Web Attack - XSS | 652 | 0.0230 |
| Infiltration | 36 | 0.0013 |
| Web Attack - Sql Injection | 21 | 0.0007 |
| Heartbleed | 11 | 0.0004 |

## 7. Methodology

The project pipeline is:

```text
CIC-IDS-2017 -> Data Loading -> Dataset Audit -> Data Cleaning -> EDA
-> Target Creation -> Stratified Train/Test Split -> Preprocessing
-> Baseline Models -> Ensemble Models -> Imbalance Experiments
-> Feature Selection -> Hyperparameter Tuning -> Explainability
-> Cybersecurity Analysis -> Final Model
```

Architecture diagram source is available in `report/project_architecture.mmd`.

## 8. Data Preprocessing

Preprocessing included:

- Strip spaces from column names.
- Normalize corrupted Web Attack labels.
- Replace positive and negative infinity with missing values.
- Drop rows with missing/infinite values.
- Remove exact duplicate rows.
- Create binary label: `BENIGN` becomes `Benign`; all other labels become `Attack`.
- Perform an 80/20 stratified train/test split.
- Use preprocessing pipelines so imputation and scaling are fitted only on training data.

Executed binary development sample:

- Rows before cleaning: 250,000
- Rows removed due to missing/infinite values: 244
- Rows removed as duplicates: 11,722
- Rows after cleaning: 238,034
- Train rows: 190,427
- Test rows: 47,607

Train distribution:

- Attack: 34,444
- Benign: 155,983

Test distribution:

- Attack: 8,611
- Benign: 38,996

## 9. Exploratory Data Analysis

Generated EDA figures:

- `outputs/figures/class_distribution_multiclass.png`
- `outputs/figures/class_distribution_binary.png`
- `outputs/figures/data_quality_issues.png`
- `outputs/figures/correlation_heatmap_top_features.png`
- `outputs/figures/selected_feature_distributions.png`

EDA showed strong class imbalance, especially in multiclass classification. Packet size, backward packet statistics, and timing features appeared strongly related to attack detection.

## 10. Machine Learning Models

Baseline models:

| Model | Accuracy | Precision Attack | Recall Attack | F1 Attack | ROC-AUC | Train Time s | Predict Time s |
|---|---:|---:|---:|---:|---:|---:|---:|
| Decision Tree | 0.9982 | 0.9944 | 0.9957 | 0.9951 | 0.9972 | 6.9738 | 0.0261 |
| Logistic Regression | 0.9499 | 0.8692 | 0.8510 | 0.8600 | 0.9852 | 3.8322 | 0.0276 |
| Random Forest | 0.9983 | 0.9964 | 0.9943 | 0.9953 | 0.9997 | 6.4937 | 0.0735 |
| Support Vector Machine | 0.9493 | 0.8659 | 0.8517 | 0.8587 | 0.9840 | 67.9046 | 0.0248 |
| K-Nearest Neighbors | 0.9891 | 0.9656 | 0.9742 | 0.9699 | 0.9969 | 1.0797 | 6.0527 |

## 11. Ensemble Learning

Ensemble results:

| Model | Accuracy | Precision Attack | Recall Attack | F1 Attack | ROC-AUC | Train Time s | Predict Time s |
|---|---:|---:|---:|---:|---:|---:|---:|
| Random Forest Bagging | 0.9983 | 0.9964 | 0.9943 | 0.9953 | 0.9997 | 6.5209 | 0.0681 |
| AdaBoost | 0.9834 | 0.9660 | 0.9415 | 0.9536 | 0.9961 | 38.9416 | 0.2771 |
| Gradient Boosting | 0.9948 | 0.9942 | 0.9768 | 0.9854 | 0.9989 | 76.3061 | 0.0542 |
| Hard Voting | 0.9976 | 0.9970 | 0.9899 | 0.9934 | N/A | 19.4061 | 0.2346 |
| Soft Voting | 0.9978 | 0.9964 | 0.9912 | 0.9938 | 0.9995 | 19.5121 | 0.1329 |
| Stacking | 0.9986 | 0.9970 | 0.9951 | 0.9960 | 0.9999 | 56.9845 | 0.1831 |

Bagging: Random Forest trains many trees on bootstrapped samples and combines their predictions. This reduces variance compared with a single decision tree.

Boosting: AdaBoost and Gradient Boosting train learners sequentially. Each new learner focuses on errors made by previous learners.

Voting: Hard Voting uses majority class labels. Soft Voting averages probabilities.

Stacking: Base models generate predictions, and a meta-model learns how to combine them.

## 12. Experimental Setup

- Language: Python
- Libraries: pandas, numpy, matplotlib, seaborn, scikit-learn, imbalanced-learn, joblib
- Random seed: 42
- Split: 80/20 stratified
- Primary task: binary classification
- Main metric focus: Attack recall and Attack F1-score
- Development sample: 250,000 raw rows before cleaning
- Tuning: RandomizedSearchCV with 3-fold stratified CV on 40,000 training rows

## 13. Results

Best F1 model:

- Stacking
- Attack recall: 0.9951
- Attack F1: 0.9960
- Training time: 56.9845 seconds

Selected practical final model:

- Random Forest
- Attack recall: 0.9943
- Attack F1: 0.9953
- Training time: 6.4937 seconds
- Prediction time: 0.0735 seconds

Random Forest confusion matrix:

| | Predicted Benign | Predicted Attack |
|---|---:|---:|
| Actual Benign | 38,965 | 31 |
| Actual Attack | 49 | 8,562 |

## 14. Comparative Analysis

Ensemble learning generally outperformed simpler individual models. Stacking achieved the highest F1-score, but Random Forest was almost as strong while being much faster. AdaBoost and Gradient Boosting performed well but had lower recall and higher training time than Random Forest in this experiment.

KNN had good recall but slow prediction, which is a problem for real-time intrusion detection.

SVM and Logistic Regression had similar performance, showing that a linear decision boundary is not sufficient for best detection on this data.

## 15. Explainability

Top global Random Forest features:

| Rank | Feature |
|---:|---|
| 1 | Avg Bwd Segment Size |
| 2 | Packet Length Variance |
| 3 | Max Packet Length |
| 4 | Packet Length Std |
| 5 | Average Packet Size |
| 6 | Bwd Packet Length Std |
| 7 | Bwd Packet Length Max |
| 8 | Total Length of Bwd Packets |
| 9 | Bwd Packet Length Mean |
| 10 | Destination Port |

Interpretation:

- Packet length features help detect unusual payload or flow-size behavior.
- Backward packet features describe server-to-client response behavior, which can differ during attacks.
- Destination port is useful because attacks often target specific services.
- Timing features such as IAT values capture bursty or automated traffic behavior.

Explainability outputs:

- `outputs/metrics/explainability_global_importance.csv`
- `outputs/metrics/explainability_permutation_importance.csv`
- `outputs/metrics/explainability_summary.json`
- `outputs/figures/top_20_rf_feature_importance.png`

## 16. Cybersecurity Interpretation

False negatives are dangerous because an actual attack is classified as benign and may pass through the detection system. Random Forest missed 49 attacks in the test set. False positives also matter because they create unnecessary alerts and may overwhelm security analysts. Random Forest produced 31 false alarms.

Attack traffic differed from benign traffic mainly through packet-size statistics, backward-flow behavior, and timing patterns. Common attacks such as DDoS, DoS Hulk, and PortScan are easier to detect because they have many examples. Rare attacks such as Heartbleed, Infiltration, and SQL Injection are difficult because there are very few labelled examples.

## 17. Limitations

- The main experiment used a 250k-row development sample, not the full 2.83M-row dataset.
- Random splitting can be optimistic for network traffic because similar flows from the same time period may appear in both train and test.
- Exact duplicates were removed, but near-duplicate or time-correlated flows may remain.
- CIC-IDS-2017 may contain dataset artifacts that models can learn.
- Multiclass rare classes are not reliably learned from small samples.
- Real-world deployment would need live traffic validation and concept-drift monitoring.

## 18. Future Scope

- Run final experiments on the full cleaned dataset.
- Use day-wise or time-wise splitting.
- Add XGBoost or LightGBM if available.
- Add SHAP explanations for local interpretability.
- Build a streaming prediction interface.
- Evaluate model robustness against newer attack datasets.

## 19. Research Question Answers

RQ1: Does ensemble learning outperform individual classifiers?

Yes. Ensemble models, especially Random Forest and Stacking, outperformed Logistic Regression, SVM, and KNN on attack F1-score. Decision Tree was also strong, but Random Forest and Stacking were more robust ensemble choices.

RQ2: Which ensemble technique performs best?

Stacking achieved the highest attack F1-score of 0.9960. Random Forest bagging was the best practical ensemble because it was nearly as accurate and much faster.

RQ3: How does class imbalance affect attack detection?

Class imbalance made Logistic Regression miss more attacks. Class weighting, oversampling, and SMOTE increased attack recall from 0.8510 to around 0.97, but reduced precision because more benign flows were flagged as attacks.

RQ4: Which network traffic features are most important?

The most important features were mainly packet-size and backward-flow features, including `Avg Bwd Segment Size`, `Packet Length Variance`, `Max Packet Length`, `Packet Length Std`, and `Average Packet Size`.

RQ5: Can similar performance be achieved using fewer features?

Yes. A Random Forest trained with the top 20 selected features achieved accuracy 0.9969 and attack F1-score 0.9915, which is slightly lower than the full-feature model but still strong.

RQ6: What is the trade-off between performance and computational cost?

Stacking gave the best F1-score but required 56.9845 seconds of training. Random Forest achieved attack F1-score 0.9953 in only 6.4937 seconds, making it the better practical choice.

## 20. Conclusion

The project demonstrates that ensemble learning is effective for CIC-IDS-2017 binary intrusion detection. Stacking achieved the best F1-score, but Random Forest was selected as the final practical model due to its strong attack recall, high F1-score, fast prediction, and lower training cost. The project also shows that class imbalance, duplicate records, and evaluation design are as important as model selection in cybersecurity ML.

## 21. References

- CIC-IDS-2017 official dataset page: https://www.unb.ca/cic/datasets/ids-2017.html
- CICFlowMeter project: https://github.com/ahlashkari/CICFlowMeter
- scikit-learn documentation: https://scikit-learn.org/stable/
- imbalanced-learn documentation: https://imbalanced-learn.org/stable/
- Dataset summary example: https://github.com/icdfa/soc-training-program/blob/master/Datasets/CIC-IDS2017/README.md
