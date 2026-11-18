from __future__ import annotations

from pathlib import Path
import urllib.request

import joblib
import numpy as np
import pandas as pd
import streamlit as st

from src.config import MODELS_DIR, DATA_DIR
from src.data_audit import clean_column_names

MODEL_PATH = MODELS_DIR / "final_model_random_forest.joblib"
SAMPLE_DATA_PATH = DATA_DIR / "processed" / "binary_test.csv.gz"

SEVERITY_ORDER = ["Critical", "High", "Medium", "Low", "Normal"]
SEVERITY_COLORS = {
    "Critical": "#ff4b4b",
    "High": "#ff8c42",
    "Medium": "#feca57",
    "Low": "#2ec4b6",
    "Normal": "#2ecc71",
}


def check_api_status(url: str = "http://127.0.0.1:8000/health") -> bool:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "StreamlitDashboard"})
        with urllib.request.urlopen(req, timeout=0.5) as resp:
            return resp.status == 200
    except Exception:
        return False


def apply_dashboard_theme() -> None:
    st.markdown(
        """
        <style>
        .stApp {
            background: linear-gradient(120deg, #081120 0%, #101f36 45%, #0b1730 100%);
            color: #ebf3ff;
        }
        .block-container {
            padding-top: 2rem;
            padding-bottom: 2rem;
        }
        h1, h2, h3 {
            color: #f7fbff;
        }
        .css-1d391kg, .css-18e3th9 {
            background: rgba(255,255,255,0.04);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 16px;
        }
        [data-testid="stMetricValue"] {
            color: #ffffff;
            font-size: 1.8rem;
            font-weight: 700;
        }
        [data-testid="stMetricLabel"] {
            color: #c9d9f5;
        }
        .metric-card {
            background: rgba(18, 27, 43, 0.8);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 18px;
            padding: 1rem 1.2rem;
            box-shadow: 0 8px 18px rgba(0,0,0,0.12);
        }
        .status-chip {
            display: inline-block;
            padding: 0.35rem 0.7rem;
            border-radius: 999px;
            font-weight: 700;
            font-size: 0.8rem;
            letter-spacing: 0.02em;
        }
        </style>
        """,
        unsafe_allow_html=True,
    )


@st.cache_resource
def load_model(model_path: str) -> object:
    path = Path(model_path)
    if not path.exists():
        raise FileNotFoundError(f"Model not found at: {path}")
    return joblib.load(path)


def prepare_features(data: pd.DataFrame) -> pd.DataFrame:
    df = clean_column_names(data.copy())
    label_columns = ["Label", "BinaryLabel", "target"]
    for column in label_columns:
        if column in df.columns:
            df = df.drop(columns=[column])

    if df.empty:
        raise ValueError("No feature columns are available after dropping labels.")

    # Match the project preprocessing pipeline, which converts everything to numeric
    # and treats non-finite values as missing values.
    df = df.apply(pd.to_numeric, errors="coerce")
    df.replace([np.inf, -np.inf], np.nan, inplace=True)
    return df


def classify_severity(label: str, probability: float) -> str:
    if label == "Attack":
        if probability >= 0.90:
            return "Critical"
        if probability >= 0.75:
            return "High"
        if probability >= 0.55:
            return "Medium"
        return "Low"
    return "Normal"


def build_alert_summary(result_df: pd.DataFrame) -> pd.DataFrame:
    alert_rows = result_df[result_df["predicted_label"] == "Attack"].copy()
    if alert_rows.empty:
        return pd.DataFrame(columns=["row_index", "severity", "attack_probability", "top_risk_features"])

    alert_rows = alert_rows.reset_index().rename(columns={"index": "row_index"})
    risk_columns = [
        col
        for col in alert_rows.columns
        if col not in {"predicted_label", "attack_probability", "severity", "row_index"}
    ]

    alert_rows["top_risk_features"] = (
        alert_rows[risk_columns]
        .apply(lambda row: ", ".join(row.nlargest(3).index.tolist()), axis=1)
    )
    return alert_rows[["row_index", "severity", "attack_probability", "top_risk_features"]].sort_values(
        ["severity", "attack_probability"], ascending=[True, False]
    )


def get_severity_breakdown(result_df: pd.DataFrame) -> pd.DataFrame:
    counts = result_df["severity"].value_counts().reindex(SEVERITY_ORDER, fill_value=0)
    return pd.DataFrame({"severity": counts.index, "count": counts.values})


def render_status_badge(text: str, color: str) -> str:
    return f'<span class="status-chip" style="background:{color}; color:white;">{text}</span>'


def get_feature_importance(model: object, feature_names: list[str], top_n: int = 10) -> pd.DataFrame:
    if hasattr(model, "named_steps") and "model" in model.named_steps:
        estimator = model.named_steps["model"]
        if hasattr(estimator, "feature_importances_"):
            importances = estimator.feature_importances_
            if len(importances) == len(feature_names):
                return (
                    pd.DataFrame({"feature": feature_names, "importance": importances})
                    .sort_values("importance", ascending=False)
                    .head(top_n)
                    .reset_index(drop=True)
                )

    fallback = pd.DataFrame(
        {"feature": feature_names[:top_n], "importance": [0.0] * min(top_n, len(feature_names))}
    )
    return fallback


def detect_time_column(raw_data: pd.DataFrame) -> str | None:
    candidates = [
        "Timestamp",
        "Flow Start Time",
        "flow_start_time",
        "time",
        "Time",
        "StartTime",
        "ts",
    ]
    for candidate in candidates:
        if candidate in raw_data.columns:
            return candidate
    return None


def build_threat_timeline(result_df: pd.DataFrame, raw_data: pd.DataFrame) -> pd.DataFrame:
    time_col = detect_time_column(raw_data)
    if time_col is None:
        return pd.DataFrame(columns=["time_bucket", "attack_count", "benign_count"]) 

    merged = raw_data.copy()
    merged = merged.reset_index(drop=True)
    merged["predicted_label"] = result_df["predicted_label"].reset_index(drop=True).to_numpy()
    merged["attack_probability"] = result_df["attack_probability"].reset_index(drop=True).to_numpy()
    if not pd.api.types.is_datetime64_any_dtype(merged[time_col]):
        try:
            merged[time_col] = pd.to_datetime(merged[time_col], errors="coerce")
        except Exception:
            return pd.DataFrame(columns=["time_bucket", "attack_count", "benign_count"])

    timeline = merged.dropna(subset=[time_col]).copy()
    timeline = timeline.assign(
        time_bucket=lambda df: df[time_col].dt.floor("5min")
    )
    attack_counts = (
        timeline[timeline["predicted_label"] == "Attack"]
        .groupby("time_bucket")
        .size()
        .rename("attack_count")
    )
    benign_counts = (
        timeline[timeline["predicted_label"] == "Benign"]
        .groupby("time_bucket")
        .size()
        .rename("benign_count")
    )
    combined = pd.concat([attack_counts, benign_counts], axis=1).fillna(0).reset_index()
    combined.columns = ["time_bucket", "attack_count", "benign_count"]
    return combined.sort_values("time_bucket").reset_index(drop=True)


def summarize_ip_activity(result_df: pd.DataFrame, raw_data: pd.DataFrame) -> pd.DataFrame:
    source_candidates = ["Source IP", "src_ip", "source_ip", "Src IP", "SourceIP"]
    dest_candidates = ["Destination IP", "dst_ip", "destination_ip", "Dst IP", "DestinationIP"]
    source_col = next((col for col in source_candidates if col in raw_data.columns), None)
    dest_col = next((col for col in dest_candidates if col in raw_data.columns), None)
    if source_col is None and dest_col is None:
        return pd.DataFrame(columns=["ip_type", "ip_address", "attack_count", "total_visits"])

    rows = raw_data.reset_index(drop=True).copy()
    rows["predicted_label"] = result_df["predicted_label"].reset_index(drop=True).to_numpy()
    rows["attack_probability"] = result_df["attack_probability"].reset_index(drop=True).to_numpy()

    records = []
    if source_col is not None:
        src = rows[[source_col, "predicted_label"]].copy()
        src["ip_type"] = "Source IP"
        src.columns = ["ip_address", "predicted_label", "ip_type"]
        records.append(src)
    if dest_col is not None:
        dst = rows[[dest_col, "predicted_label"]].copy()
        dst["ip_type"] = "Destination IP"
        dst.columns = ["ip_address", "predicted_label", "ip_type"]
        records.append(dst)

    summary = pd.concat(records, ignore_index=True)
    if summary.empty:
        return pd.DataFrame(columns=["ip_type", "ip_address", "attack_count", "total_visits"])

    summary["ip_address"] = summary["ip_address"].astype(str).fillna("unknown")
    summary["is_attack"] = summary["predicted_label"].eq("Attack")
    grouped = (
        summary.groupby(["ip_type", "ip_address"], as_index=False)
        .agg(attack_count=("is_attack", "sum"), total_visits=("is_attack", "size"))
        .sort_values(["ip_type", "attack_count", "total_visits"], ascending=[True, False, False])
    )
    return grouped.head(20).reset_index(drop=True)


def main() -> None:
    st.set_page_config(page_title="Cyber-Attack Intrusion Profiler", page_icon="🛡️", layout="wide")
    apply_dashboard_theme()

    st.title("Cyber-Attack Network Intrusion Profiler")
    st.caption("Ensemble-learning based intrusion detection for CIC-IDS style network flow data.")

    with st.sidebar:
        st.subheader("System Status")
        model_file = Path(MODEL_PATH)
        if model_file.exists():
            st.success(f"🟢 Model Loaded: `{model_file.name}`")
        else:
            st.error(f"🔴 Model Missing: `{model_file.name}`")

        api_online = check_api_status()
        if api_online:
            st.success("🟢 REST API: Connected (127.0.0.1:8000)")
        else:
            st.info("⚪ REST API: Offline (Optional)")

        st.markdown("---")
        st.subheader("Data Input Mode")
        data_mode = st.radio(
            "Choose Data Source:",
            ["Sample Network Flows (Demo)", "Upload Custom CSV File"],
            index=0,
            help="Choose sample data to instantly preview profiling or upload your own network capture CSV."
        )

        sample_size = 500
        if data_mode == "Sample Network Flows (Demo)":
            sample_size = st.slider("Number of flows to analyze", min_value=50, max_value=2500, value=500, step=50)

        st.markdown("---")
        st.subheader("Model Configuration")
        model_path = st.text_input("Model path", value=str(MODEL_PATH), help="Path to the trained joblib model file.")

    raw_data = None
    if data_mode == "Sample Network Flows (Demo)":
        if SAMPLE_DATA_PATH.exists():
            st.markdown(
                f"""
                <div style='padding:0.5rem 0 1rem 0; color:#dbeafe;'>
                    Analyzing <b>{sample_size:,}</b> simulated network flows from <code>data/processed/binary_test.csv.gz</code>.
                </div>
                """,
                unsafe_allow_html=True,
            )
            try:
                raw_data = pd.read_csv(SAMPLE_DATA_PATH, nrows=sample_size)
            except Exception as exc:
                st.error(f"Failed to read sample dataset: {exc}")
                return
        else:
            st.warning(f"Sample dataset not found at `{SAMPLE_DATA_PATH}`. Please upload a CSV instead.")
            data_mode = "Upload Custom CSV File"

    if data_mode == "Upload Custom CSV File":
        st.markdown(
            """
            <div style='padding:0.5rem 0 1rem 0; color:#dbeafe;'>
                Upload a CSV of network-flow features for classification, severity assessment, and threat profiling.
            </div>
            """,
            unsafe_allow_html=True,
        )
        uploaded_file = st.file_uploader(
            "Upload network flow CSV",
            type=["csv", "gz"],
            help="Use a CIC-IDS-like CSV with flow feature columns."
        )

        if uploaded_file is None:
            st.info("No file uploaded yet. Please upload a flow CSV to begin prediction, or switch to 'Sample Network Flows (Demo)' in the sidebar.")
            return

        try:
            raw_data = pd.read_csv(uploaded_file)
        except Exception as exc:
            st.error(f"Failed to read the uploaded CSV: {exc}")
            return

    if raw_data is None or raw_data.empty:
        st.warning("No data available to profile.")
        return

    try:
        prepared = prepare_features(raw_data)
    except Exception as exc:
        st.error(f"Could not prepare the feature matrix: {exc}")
        return

    try:
        model = load_model(model_path)
    except FileNotFoundError:
        st.error(f"Model file not found: {model_path}")
        return
    except Exception as exc:  # pragma: no cover - streamlit error handling
        st.error(f"Failed to load the model: {exc}")
        return

    try:
        predictions = model.predict(prepared)
    except Exception as exc:
        st.error(f"Prediction failed. Please make sure the uploaded CSV contains the same feature columns as the trained model: {exc}")
        st.info("Tip: remove ID-like columns such as Flow ID, Source IP, Destination IP, and Timestamp if they are present.")
        return

    classes = list(getattr(model, "classes_", ["Benign", "Attack"]))
    probability_matrix = None
    if hasattr(model, "predict_proba"):
        probability_matrix = model.predict_proba(prepared)

    attack_probability = np.zeros(len(prepared), dtype=float)
    if probability_matrix is not None:
        if "Attack" in classes:
            attack_probability = probability_matrix[:, classes.index("Attack")]
        elif probability_matrix.shape[1] > 1:
            attack_probability = probability_matrix[:, 1]
        else:
            attack_probability = probability_matrix[:, 0]

    result_df = prepared.copy()
    result_df["predicted_label"] = predictions
    result_df["attack_probability"] = np.clip(attack_probability, 0.0, 1.0)
    result_df["severity"] = [
        classify_severity(label, probability)
        for label, probability in zip(predictions, result_df["attack_probability"])
    ]

    attack_count = int((result_df["predicted_label"] == "Attack").sum())
    benign_count = int((result_df["predicted_label"] == "Benign").sum())
    average_confidence = float(result_df["attack_probability"].mean())
    critical_alerts = int((result_df["severity"] == "Critical").sum())
    high_alerts = int((result_df["severity"] == "High").sum())
    alert_summary = build_alert_summary(result_df)
    severity_breakdown = get_severity_breakdown(result_df)
    threat_timeline = build_threat_timeline(result_df, raw_data)
    ip_activity = summarize_ip_activity(result_df, raw_data)

    col1, col2, col3, col4, col5 = st.columns(5)
    col1.markdown(f'<div class="metric-card"><div style="color:#b8c8e5;">Rows</div><div style="font-size:2rem;font-weight:700;">{len(result_df)}</div></div>', unsafe_allow_html=True)
    col2.markdown(f'<div class="metric-card"><div style="color:#b8c8e5;">Benign</div><div style="font-size:2rem;font-weight:700;">{benign_count}</div></div>', unsafe_allow_html=True)
    col3.markdown(f'<div class="metric-card"><div style="color:#b8c8e5;">Attack</div><div style="font-size:2rem;font-weight:700;">{attack_count}</div></div>', unsafe_allow_html=True)
    col4.markdown(f'<div class="metric-card"><div style="color:#b8c8e5;">Critical</div><div style="font-size:2rem;font-weight:700;">{critical_alerts}</div></div>', unsafe_allow_html=True)
    col5.markdown(f'<div class="metric-card"><div style="color:#b8c8e5;">Avg. confidence</div><div style="font-size:2rem;font-weight:700;">{average_confidence * 100:.1f}%</div></div>', unsafe_allow_html=True)

    st.subheader("Security overview")
    overview_tab, table_tab, feature_tab, analytics_tab = st.tabs([
        "Overview",
        "Prediction table",
        "Feature insights",
        "Threat analytics",
    ])

    with overview_tab:
        left_col, right_col = st.columns([1.5, 1])
        with left_col:
            severity_breakdown["color"] = severity_breakdown["severity"].map(SEVERITY_COLORS)
            st.dataframe(
                severity_breakdown[["severity", "count"]].assign(
                    badge=lambda df: df["severity"].map(lambda s: render_status_badge(s, SEVERITY_COLORS.get(s, "#4aa3ff")))
                )[["severity", "count", "badge"]],
                use_container_width=True,
                hide_index=True,
            )
            st.bar_chart(severity_breakdown.set_index("severity")["count"])
        with right_col:
            if attack_count > 0:
                alert_summary_display = alert_summary.head(10).copy()
                alert_summary_display["attack_probability"] = alert_summary_display["attack_probability"].round(4)
                st.dataframe(alert_summary_display, use_container_width=True)
            else:
                st.success("No active attack alerts were detected in the uploaded data.")

    with table_tab:
        preview = result_df[[*prepared.columns, "predicted_label", "attack_probability", "severity"]].copy()
        preview["attack_probability"] = preview["attack_probability"].round(4)
        st.dataframe(preview.head(100), use_container_width=True)
        st.download_button(
            label="Download full prediction CSV",
            data=result_df.to_csv(index=False),
            file_name="cyber_intrusion_predictions.csv",
            mime="text/csv",
        )

    with feature_tab:
        feature_importance = get_feature_importance(model, list(prepared.columns), top_n=10)
        st.bar_chart(feature_importance.set_index("feature")["importance"])
        st.dataframe(feature_importance, use_container_width=True)

    with analytics_tab:
        if threat_timeline.empty:
            st.info("No timestamp metadata was found, so the live threat timeline is unavailable for this dataset.")
        else:
            st.subheader("Live threat timeline")
            timeline_chart = threat_timeline.set_index("time_bucket")
            st.line_chart(timeline_chart[["attack_count", "benign_count"]])

        st.subheader("Suspicious IP activity")
        if ip_activity.empty:
            st.info("No Source IP or Destination IP metadata was detected in the uploaded file.")
        else:
            st.dataframe(ip_activity, use_container_width=True)
            src_ips = ip_activity[ip_activity["ip_type"] == "Source IP"].head(5)
            dst_ips = ip_activity[ip_activity["ip_type"] == "Destination IP"].head(5)
            if not src_ips.empty or not dst_ips.empty:
                left_ip, right_ip = st.columns(2)
                with left_ip:
                    st.markdown("### Top source IPs")
                    st.dataframe(src_ips, use_container_width=True)
                with right_ip:
                    st.markdown("### Top destination IPs")
                    st.dataframe(dst_ips, use_container_width=True)

    st.caption("This dashboard combines intrusion prediction, severity classification, feature interpretation, and priority threat analytics to support real-world cyber-attack monitoring workflows.")


if __name__ == "__main__":
    main()
