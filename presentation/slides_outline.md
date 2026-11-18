# Presentation Outline: Ensemble Learning-Based Intrusion Detection Using CIC-IDS-2017

## Slide 1: Title

Cybersecurity Attack Detection Using Machine Learning: An Ensemble Learning Approach

## Slide 2: Motivation

- Networks generate huge traffic volumes.
- Manual detection is difficult.
- Missing an attack can be costly.
- ML can learn patterns from flow-level traffic.

## Slide 3: Problem Statement

- Input: CIC-IDS-2017 network-flow features.
- Output: `Benign` or `Attack`.
- Optional extension: multiclass attack classification.
- Main focus: compare individual classifiers and ensemble methods.

## Slide 4: Dataset

- CIC-IDS-2017 from Canadian Institute for Cybersecurity.
- 2,830,743 rows and 79 columns in the full audit.
- 78 features and 1 target label.
- Contains benign traffic and attacks such as DDoS, DoS, PortScan, Bot, Brute Force, Web Attack, Infiltration, and Heartbleed.

## Slide 5: Dataset Audit

- Missing values in `Flow Bytes/s`.
- Infinite values in `Flow Bytes/s` and `Flow Packets/s`.
- 308,381 estimated duplicate rows.
- Corrupted Web Attack labels were normalized.
- Severe class imbalance exists.

## Slide 6: Preprocessing

- Clean column names.
- Normalize labels.
- Replace infinity with missing values.
- Drop invalid rows.
- Remove duplicates.
- Create binary target.
- Stratified 80/20 train-test split.
- Avoid leakage by fitting preprocessing only on training data.

## Slide 7: EDA

Include:

- `class_distribution_multiclass.png`
- `class_distribution_binary.png`
- `data_quality_issues.png`

Key point: accuracy alone is misleading because benign traffic dominates.

## Slide 8: Baseline Models

Models:

- Decision Tree
- Logistic Regression
- Random Forest
- Support Vector Machine
- K-Nearest Neighbors

Best baseline: Random Forest with attack F1 = 0.9953.

## Slide 9: Ensemble Learning

Methods:

- Bagging: Random Forest
- Boosting: AdaBoost, Gradient Boosting
- Voting: Hard and Soft Voting
- Stacking: Base models plus meta-classifier

Key concept: ensembles combine multiple learners to improve robustness.

## Slide 10: Results

| Model | Accuracy | Attack Recall | Attack F1 | Train Time s |
|---|---:|---:|---:|---:|
| Random Forest | 0.9983 | 0.9943 | 0.9953 | 6.49 |
| AdaBoost | 0.9834 | 0.9415 | 0.9536 | 38.94 |
| Gradient Boosting | 0.9948 | 0.9768 | 0.9854 | 76.31 |
| Soft Voting | 0.9978 | 0.9912 | 0.9938 | 19.51 |
| Stacking | 0.9986 | 0.9951 | 0.9960 | 56.98 |

## Slide 11: Confusion Matrix

Random Forest:

| | Predicted Benign | Predicted Attack |
|---|---:|---:|
| Actual Benign | 38,965 | 31 |
| Actual Attack | 49 | 8,562 |

False negative = attack predicted as benign.

## Slide 12: Feature Importance

Top features:

- Avg Bwd Segment Size
- Packet Length Variance
- Max Packet Length
- Packet Length Std
- Average Packet Size
- Bwd Packet Length Std
- Destination Port

Interpretation: attacks show differences in packet size, response behavior, timing, and service targets.

## Slide 13: Class Imbalance

- Logistic Regression recall improved from 0.8510 to about 0.974 with oversampling/SMOTE.
- Precision decreased from 0.8692 to about 0.730.
- This shows the recall vs false-alarm trade-off.

## Slide 14: Limitations

- Main experiment used a development sample.
- Random split can be optimistic.
- Dataset artifacts may exist.
- Rare classes are difficult in multiclass classification.
- Real deployment needs live network validation.

## Slide 15: Conclusion

- Ensemble learning improved detection performance.
- Stacking achieved the best F1-score.
- Random Forest was selected as the practical final model due to speed and strong recall.
- Cybersecurity ML must prioritize recall, leakage prevention, and realistic evaluation.
