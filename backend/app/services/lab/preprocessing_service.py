from __future__ import annotations

import logging
from typing import Any

import numpy as np
import pandas as pd
from imblearn.over_sampling import RandomOverSampler, SMOTE
from imblearn.under_sampling import RandomUnderSampler
from sklearn.feature_selection import SelectKBest, f_classif
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import MinMaxScaler, RobustScaler, StandardScaler

from ...schemas.lab import PreprocessingConfig, PreprocessingPreviewResponse
from .dataset_service import dataset_service

logger = logging.getLogger(__name__)

class PreprocessingService:
    def fit_and_transform(
        self,
        X_train: pd.DataFrame,
        X_test: pd.DataFrame,
        y_train: pd.Series,
        y_test: pd.Series,
        config: PreprocessingConfig,
        random_seed: int = 42,
    ) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, list[str]]:
        """
        Applies preprocessing strictly fitted on X_train only to prevent data leakage.
        Returns:
            X_train_proc, X_test_proc, y_train_resampled, y_test, selected_feature_names
        """
        feature_names = list(X_train.columns)
        applied_steps = []

        # 1. Feature selection (manual or top-K)
        if config.feature_selection_strategy == "manual" and config.selected_features:
            keep_cols = [c for c in config.selected_features if c in feature_names]
            if keep_cols:
                X_train = X_train[keep_cols]
                X_test = X_test[keep_cols]
                feature_names = keep_cols
                applied_steps.append(f"Manual feature selection ({len(keep_cols)} features)")
        elif config.feature_selection_strategy == "top_k":
            k = min(config.top_k_features, len(feature_names))
            # Temporary median impute for feature selector
            temp_imputer = SimpleImputer(strategy="median")
            X_temp = temp_imputer.fit_transform(X_train)
            selector = SelectKBest(score_func=f_classif, k=k)
            selector.fit(X_temp, y_train)
            mask = selector.get_support()
            feature_names = [feat for feat, m in zip(feature_names, mask) if m]
            X_train = X_train[feature_names]
            X_test = X_test[feature_names]
            applied_steps.append(f"Top-{k} ANOVA F-score feature selection")

        # 2. Imputation
        if config.missing_value_strategy == "drop":
            train_valid = ~X_train.isna().any(axis=1)
            X_train = X_train[train_valid]
            y_train = y_train[train_valid]
            test_valid = ~X_test.isna().any(axis=1)
            X_test = X_test[test_valid]
            y_test = y_test[test_valid]
            applied_steps.append("Row dropping on missing values")
        else:
            strategy = "mean" if config.missing_value_strategy == "mean" else "median"
            imputer = SimpleImputer(strategy=strategy)
            X_train_arr = imputer.fit_transform(X_train)
            X_test_arr = imputer.transform(X_test)
            applied_steps.append(f"SimpleImputer ({strategy})")

        if config.missing_value_strategy != "drop":
            X_tr_data = X_train_arr
            X_te_data = X_test_arr
        else:
            X_tr_data = X_train.to_numpy()
            X_te_data = X_test.to_numpy()

        # 3. Scaling (fit on train only!)
        if config.scaling_strategy == "standard":
            scaler = StandardScaler()
            X_tr_data = scaler.fit_transform(X_tr_data)
            X_te_data = scaler.transform(X_te_data)
            applied_steps.append("StandardScaler (zero mean, unit variance)")
        elif config.scaling_strategy == "minmax":
            scaler = MinMaxScaler()
            X_tr_data = scaler.fit_transform(X_tr_data)
            X_te_data = scaler.transform(X_te_data)
            applied_steps.append("MinMaxScaler (0 to 1 scaling)")
        elif config.scaling_strategy == "robust":
            scaler = RobustScaler()
            X_tr_data = scaler.fit_transform(X_tr_data)
            X_te_data = scaler.transform(X_te_data)
            applied_steps.append("RobustScaler (median & IQR scaling)")

        # 4. Imbalance Handling (Applied to training data ONLY!)
        y_tr_arr = y_train.to_numpy()
        y_te_arr = y_test.to_numpy()

        if config.imbalance_strategy == "smote":
            try:
                # Find min class size
                counts = pd.Series(y_tr_arr).value_counts()
                min_c = counts.min()
                k_neigh = min(5, max(1, min_c - 1))
                if k_neigh >= 1:
                    sm = SMOTE(k_neighbors=k_neigh, random_state=random_seed)
                    X_tr_data, y_tr_arr = sm.fit_resample(X_tr_data, y_tr_arr)
                    applied_steps.append(f"SMOTE synthetic oversampling (k_neighbors={k_neigh})")
            except Exception as e:
                logger.warning("SMOTE failed, falling back to RandomOverSampler: %s", e)
                ros = RandomOverSampler(random_state=random_seed)
                X_tr_data, y_tr_arr = ros.fit_resample(X_tr_data, y_tr_arr)
                applied_steps.append("RandomOverSampler (fallback)")
        elif config.imbalance_strategy == "random_oversample":
            ros = RandomOverSampler(random_state=random_seed)
            X_tr_data, y_tr_arr = ros.fit_resample(X_tr_data, y_tr_arr)
            applied_steps.append("RandomOverSampler")
        elif config.imbalance_strategy == "random_undersample":
            rus = RandomUnderSampler(random_state=random_seed)
            X_tr_data, y_tr_arr = rus.fit_resample(X_tr_data, y_tr_arr)
            applied_steps.append("RandomUnderSampler")

        return X_tr_data, X_te_data, y_tr_arr, y_te_arr, feature_names

    def preview_preprocessing(
        self, dataset_cfg: Any, prep_cfg: PreprocessingConfig
    ) -> PreprocessingPreviewResponse:
        X_train, X_test, y_train, y_test = dataset_service.load_dataset_split(dataset_cfg)
        orig_shape = list(X_train.shape)
        orig_dist = {str(k): int(v) for k, v in y_train.value_counts().items()}

        X_tr, X_te, y_tr, y_te, feats = self.fit_and_transform(
            X_train, X_test, y_train, y_test, prep_cfg, random_seed=dataset_cfg.random_seed
        )

        trans_dist = {str(k): int(v) for k, v in pd.Series(y_tr).value_counts().items()}

        note = (
            "Preprocessing is strictly fitted on training flows and applied downstream to testing flows. "
            f"Scaling strategy: {prep_cfg.scaling_strategy.upper()}; Imbalance handling: {prep_cfg.imbalance_strategy.upper()}."
        )

        return PreprocessingPreviewResponse(
            original_train_shape=orig_shape,
            transformed_train_shape=list(X_tr.shape),
            features_retained=feats[:15],
            original_class_distribution=orig_dist,
            transformed_class_distribution=trans_dist,
            applied_transformations=[
                f"Missing values: {prep_cfg.missing_value_strategy}",
                f"Scaling: {prep_cfg.scaling_strategy}",
                f"Class Balance: {prep_cfg.imbalance_strategy}",
                f"Feature Selection: {prep_cfg.feature_selection_strategy}",
            ],
            cybersecurity_impact_note=note,
        )

preprocessing_service = PreprocessingService()
