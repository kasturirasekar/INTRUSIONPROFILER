from pathlib import Path

RANDOM_SEED = 42

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = PROJECT_ROOT
OUTPUT_DIR = PROJECT_ROOT / "outputs"
METRICS_DIR = OUTPUT_DIR / "metrics"
FIGURES_DIR = OUTPUT_DIR / "figures"
MODELS_DIR = OUTPUT_DIR / "models"
PROCESSED_DIR = PROJECT_ROOT / "data" / "processed"

CIC_IDS_2017_FILES = [
    "Monday-WorkingHours.pcap_ISCX.csv",
    "Tuesday-WorkingHours.pcap_ISCX.csv",
    "Wednesday-workingHours.pcap_ISCX.csv",
    "Thursday-WorkingHours-Morning-WebAttacks.pcap_ISCX.csv",
    "Thursday-WorkingHours-Afternoon-Infilteration.pcap_ISCX.csv",
    "Friday-WorkingHours-Morning.pcap_ISCX.csv",
    "Friday-WorkingHours-Afternoon-PortScan.pcap_ISCX.csv",
    "Friday-WorkingHours-Afternoon-DDos.pcap_ISCX.csv",
]

LABEL_COLUMN = "Label"
BINARY_LABEL_COLUMN = "BinaryLabel"

WEB_LABEL_FIXES = {
    "Web Attack \ufffd Brute Force": "Web Attack - Brute Force",
    "Web Attack \ufffd Sql Injection": "Web Attack - Sql Injection",
    "Web Attack \ufffd XSS": "Web Attack - XSS",
}
