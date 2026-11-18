# Viva Questions And Answers

## 1. What is CIC-IDS-2017?

CIC-IDS-2017 is a labelled intrusion detection dataset created by the Canadian Institute for Cybersecurity. It contains benign and attack network traffic represented as flow-level features.

## 2. What is an Intrusion Detection System?

An IDS monitors network or system activity to detect suspicious or malicious behavior.

## 3. What is the main objective of this project?

To classify network flows as benign or attack and compare individual ML classifiers with ensemble learning methods.

## 4. Why did you use binary classification first?

Binary classification is more stable because all attack types are grouped together. Multiclass classification is harder because some attacks have very few samples.

## 5. What is class imbalance?

Class imbalance occurs when one class has many more samples than another. In this dataset, benign flows are much more common than several attack classes.

## 6. Why is accuracy misleading in cybersecurity?

A model can get high accuracy by predicting the majority class while missing rare attacks. Recall and F1-score are more informative.

## 7. What is a false negative in this project?

A false negative is an attack flow predicted as benign. It is dangerous because the attack may not be detected.

## 8. What is a false positive?

A false positive is benign traffic predicted as attack. It creates unnecessary alerts.

## 9. What is precision?

Precision measures how many predicted attacks were actually attacks.

## 10. What is recall?

Recall measures how many actual attacks were detected.

## 11. What is F1-score?

F1-score is the harmonic mean of precision and recall.

## 12. What is ROC-AUC?

ROC-AUC measures how well the model separates positive and negative classes across thresholds.

## 13. What is a confusion matrix?

It shows true positives, true negatives, false positives, and false negatives.

## 14. What is a Decision Tree?

A Decision Tree splits data based on feature conditions to make predictions.

## 15. What is Random Forest?

Random Forest is an ensemble of decision trees trained on bootstrap samples with random feature selection.

## 16. What is bagging?

Bagging trains multiple models on different bootstrap samples and combines their predictions to reduce variance.

## 17. What is boosting?

Boosting trains models sequentially, where each new model focuses on correcting previous errors.

## 18. What is AdaBoost?

AdaBoost assigns higher weight to misclassified samples so later weak learners focus on difficult cases.

## 19. What is Gradient Boosting?

Gradient Boosting builds models sequentially to minimize prediction error using gradient-based optimization.

## 20. What is hard voting?

Hard voting predicts the class chosen by the majority of base classifiers.

## 21. What is soft voting?

Soft voting averages predicted class probabilities and selects the class with the highest average probability.

## 22. What is stacking?

Stacking uses base models to generate predictions, then trains a meta-model to combine those predictions.

## 23. Which model performed best?

Stacking had the highest F1-score in the binary experiment, but Random Forest was selected as the practical final model.

## 24. Why was Random Forest selected as the final model?

It had very high attack recall and F1-score with much lower training time than stacking.

## 25. What is overfitting?

Overfitting happens when a model learns training-specific patterns and performs poorly on new data.

## 26. What is bias?

Bias is error from overly simple assumptions in a model.

## 27. What is variance?

Variance is sensitivity to training data changes. High variance can cause overfitting.

## 28. How does Random Forest reduce variance?

It averages many decision trees trained on different samples and feature subsets.

## 29. What is cross-validation?

Cross-validation splits training data into folds to estimate model performance during training and tuning.

## 30. What is SMOTE?

SMOTE creates synthetic minority-class samples by interpolating between existing minority samples.

## 31. Why should SMOTE be applied only to training data?

Applying SMOTE before splitting causes data leakage because synthetic samples can influence the test set.

## 32. What is data leakage?

Data leakage occurs when information from the test set or future data influences training.

## 33. What feature was most important?

The Random Forest ranked backward packet size features and packet length variation highly.

## 34. Why is destination port useful?

Attacks often target specific services, so destination port can help identify suspicious traffic.

## 35. Why is multiclass classification harder?

The model must distinguish between attack types, and rare classes may not have enough examples.

## 36. What are the limitations of this project?

The main experiment used a sample, random splitting may be optimistic, and real-world traffic can differ from CIC-IDS-2017.

## 37. What is the final cybersecurity conclusion?

Ensemble learning improves detection, but model evaluation must focus on recall, false negatives, class imbalance, and realistic deployment constraints.
