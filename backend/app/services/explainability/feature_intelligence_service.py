from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from ...core.config import PROCESSED_DATA_DIR

logger = logging.getLogger(__name__)

FEATURE_DEFINITIONS: dict[str, dict[str, Any]] = {
    "Destination Port": {
        "category": "Network Endpoint",
        "layer": "Transport (L4)",
        "unit": "Port Number (1-65535)",
        "definition": "The TCP or UDP service port on the destination host.",
        "cyber_context": "Well-known ports (80, 443, 22, 53) host standard services. High randomized ports or rapid port sweeps are characteristic of PortScan attacks or C2 reverse shells.",
        "attack_associations": ["PortScan", "Infiltration", "Botnet"],
    },
    "Flow Duration": {
        "category": "Flow Timing",
        "layer": "Flow Session",
        "unit": "Microseconds (μs)",
        "definition": "Total time elapsed between the first and last packet observed in the bidirectional network session.",
        "cyber_context": "Microsecond flows occur in port scans and TCP SYN floods. Persistently long flows often indicate slowloris DoS or continuous data exfiltration.",
        "attack_associations": ["DoS Slowloris", "PortScan", "DDoS"],
    },
    "Total Fwd Packets": {
        "category": "Volume & Count",
        "layer": "Transport (L4)",
        "unit": "Packet Count",
        "definition": "Total number of packets transmitted in the forward direction (source to destination).",
        "cyber_context": "High packet volume without corresponding backward traffic is a primary indicator of volumetric DoS/DDoS or brute force credential attempts.",
        "attack_associations": ["DDoS", "DoS Hulk", "FTP-Patator"],
    },
    "Total Backward Packets": {
        "category": "Volume & Count",
        "layer": "Transport (L4)",
        "unit": "Packet Count",
        "definition": "Total number of packets transmitted in the backward direction (destination to source).",
        "cyber_context": "Zero or near-zero backward packets indicate half-open connections or unanswered probes typical of SYN flooding and reconnaissance.",
        "attack_associations": ["SYN Flood", "PortScan"],
    },
    "Total Length of Fwd Packets": {
        "category": "Payload Sizing",
        "layer": "Transport/App (L4/L7)",
        "unit": "Bytes",
        "definition": "Total byte payload transferred in all forward packets.",
        "cyber_context": "Massive forward lengths indicate buffer overflow attempts or data injection, while abnormally small lengths suggest reconnaissance.",
        "attack_associations": ["Web Attack", "Infiltration"],
    },
    "Total Length of Bwd Packets": {
        "category": "Payload Sizing",
        "layer": "Transport/App (L4/L7)",
        "unit": "Bytes",
        "definition": "Total byte payload transferred in all backward packets from server to client.",
        "cyber_context": "Disproportionate backward bytes occur during unauthorized data exfiltration or reflective amplification attacks (NTP/DNS amplification).",
        "attack_associations": ["Data Exfiltration", "DDoS Amplification"],
    },
    "Fwd Packet Length Max": {
        "category": "Payload Sizing",
        "layer": "Transport (L4)",
        "unit": "Bytes",
        "definition": "Maximum packet length observed in the forward stream.",
        "cyber_context": "Jumbo frames hitting MTU limits (1500 bytes) represent bulk payload transfers, whereas small max lengths suggest fragmented probing.",
        "attack_associations": ["DoS Hulk", "Web Attack"],
    },
    "Fwd Packet Length Min": {
        "category": "Payload Sizing",
        "layer": "Transport (L4)",
        "unit": "Bytes",
        "definition": "Minimum packet length observed in the forward stream.",
        "cyber_context": "Zero-byte payloads are typical for TCP control flags (SYN, ACK) during handshake or denial-of-service floods.",
        "attack_associations": ["PortScan", "TCP SYN Flood"],
    },
    "Fwd Packet Length Mean": {
        "category": "Payload Sizing",
        "layer": "Transport (L4)",
        "unit": "Bytes",
        "definition": "Average packet length across all forward packets in the flow.",
        "cyber_context": "Benign HTTP traffic averages 300-800 bytes per request. DoS attacks frequently generate static-sized repetitive payloads.",
        "attack_associations": ["DoS Hulk", "Botnet"],
    },
    "Fwd Packet Length Std": {
        "category": "Payload Sizing",
        "layer": "Transport (L4)",
        "unit": "Bytes",
        "definition": "Standard deviation of forward packet lengths.",
        "cyber_context": "High variance indicates varied, dynamic human traffic. Low variance near zero indicates automated, scripted attack tools.",
        "attack_associations": ["Botnet", "Brute Force"],
    },
    "Bwd Packet Length Max": {
        "category": "Payload Sizing",
        "layer": "Transport (L4)",
        "unit": "Bytes",
        "definition": "Maximum packet length observed in the backward direction.",
        "cyber_context": "Standard servers return full MTU responses (1460-1500 bytes). Abnormally small responses may signal HTTP error responses (404/403/500) during fuzzing.",
        "attack_associations": ["Web Attack - Brute Force", "PortScan"],
    },
    "Bwd Packet Length Mean": {
        "category": "Payload Sizing",
        "layer": "Transport (L4)",
        "unit": "Bytes",
        "definition": "Average packet size returned by the server/destination.",
        "cyber_context": "DDoS targets often return small RST or ICMP unreachable packets, dramatically depressing backward packet length means.",
        "attack_associations": ["DDoS", "DoS GoldenEye"],
    },
    "Bwd Packet Length Std": {
        "category": "Payload Sizing",
        "layer": "Transport (L4)",
        "unit": "Bytes",
        "definition": "Standard deviation of backward packet lengths.",
        "cyber_context": "Monotonous zero-variance backward responses are characteristic of server exhaustion or connection resets.",
        "attack_associations": ["DoS", "PortScan"],
    },
    "Flow Bytes/s": {
        "category": "Throughput & Rate",
        "layer": "Flow Session",
        "unit": "Bytes/second",
        "definition": "Data transfer rate calculated as total bidirectional bytes divided by flow duration.",
        "cyber_context": "Extreme throughput spikes signify volumetric flooding or large exfiltration tunnels.",
        "attack_associations": ["DDoS", "DoS Hulk"],
    },
    "Flow Packets/s": {
        "category": "Throughput & Rate",
        "layer": "Flow Session",
        "unit": "Packets/second",
        "definition": "Packet transmission intensity per second.",
        "cyber_context": "High packets/sec with tiny packet sizes is the textbook signature of link-saturating DDoS attacks.",
        "attack_associations": ["DDoS", "UDP Flood", "SYN Flood"],
    },
    "Flow IAT Mean": {
        "category": "Inter-Arrival Timing",
        "layer": "Flow Session",
        "unit": "Microseconds (μs)",
        "definition": "Mean Inter-Arrival Time (IAT) between successive packets in the bidirectional flow.",
        "cyber_context": "Human web browsing exhibits Poisson-distributed bursty IATs. Scripted exploits display rigid, clockwork periodicity or sub-millisecond bursts.",
        "attack_associations": ["Botnet C2", "DoS Hulk"],
    },
    "Flow IAT Std": {
        "category": "Inter-Arrival Timing",
        "layer": "Flow Session",
        "unit": "Microseconds (μs)",
        "definition": "Standard deviation of inter-arrival timing between packets.",
        "cyber_context": "Near-zero timing variance indicates deterministic automated socket writes rather than interactive user behavior.",
        "attack_associations": ["Brute Force", "Botnet"],
    },
    "Flow IAT Max": {
        "category": "Inter-Arrival Timing",
        "layer": "Flow Session",
        "unit": "Microseconds (μs)",
        "definition": "Maximum observed silence between two packets in the flow.",
        "cyber_context": "High IAT Max with low packet counts points to persistent reverse shells or periodic beaconing heartbeats.",
        "attack_associations": ["Botnet Heartbeat", "Infiltration"],
    },
    "Flow IAT Min": {
        "category": "Inter-Arrival Timing",
        "layer": "Flow Session",
        "unit": "Microseconds (μs)",
        "definition": "Minimum observed gap between consecutive packets.",
        "cyber_context": "Zero or near-zero IAT Min indicates hardware-speed raw socket packet injection typical of weaponized stressers.",
        "attack_associations": ["DDoS", "PortScan"],
    },
    "Fwd IAT Total": {
        "category": "Inter-Arrival Timing",
        "layer": "Flow Session",
        "unit": "Microseconds (μs)",
        "definition": "Cumulative time between forward packets from client to server.",
        "cyber_context": "Measures client activity duration. Sudden truncation points to connection dropping.",
        "attack_associations": ["PortScan"],
    },
    "SYN Flag Count": {
        "category": "TCP Control Flags",
        "layer": "Transport (L4)",
        "unit": "Flag Count (0 or 1)",
        "definition": "Count of packets with the TCP Synchronize (SYN) control bit activated.",
        "cyber_context": "SYN packets initiate the TCP 3-way handshake. Flows with SYN but no following ACK indicate half-open SYN scanning or SYN flood exhaustion.",
        "attack_associations": ["PortScan", "SYN Flood"],
    },
    "ACK Flag Count": {
        "category": "TCP Control Flags",
        "layer": "Transport (L4)",
        "unit": "Flag Count (0 or 1)",
        "definition": "Count of packets with the TCP Acknowledgment (ACK) flag set.",
        "cyber_context": "Standard TCP sessions always involve mutual ACKs. Missing ACKs confirm incomplete or spoofed connections.",
        "attack_associations": ["SYN Flood", "UDP Spoofing"],
    },
    "RST Flag Count": {
        "category": "TCP Control Flags",
        "layer": "Transport (L4)",
        "unit": "Flag Count (0 or 1)",
        "definition": "Count of packets with the TCP Reset (RST) flag set.",
        "cyber_context": "RST abruptly terminates sessions. Elevated RST frequencies reveal closed port probing or intrusion detection system resets.",
        "attack_associations": ["PortScan", "TCP Reset Attack"],
    },
    "PSH Flag Count": {
        "category": "TCP Control Flags",
        "layer": "Transport (L4)",
        "unit": "Flag Count (0 or 1)",
        "definition": "Count of packets with the Push (PSH) flag set, requesting immediate buffer flushing.",
        "cyber_context": "Frequently set in interactive protocols (SSH, Telnet) or HTTP requests. Unusual clusters occur in web attacks and shell payloads.",
        "attack_associations": ["Web Attack", "SSH-Patator"],
    },
    "FIN Flag Count": {
        "category": "TCP Control Flags",
        "layer": "Transport (L4)",
        "unit": "Flag Count (0 or 1)",
        "definition": "Count of packets with the TCP Finish (FIN) flag set.",
        "cyber_context": "Gracefully terminates TCP sessions. FIN scans exploit RFC compliance by sending unsolicited FIN packets to map stealthily.",
        "attack_associations": ["Stealth FIN Scan", "PortScan"],
    },
    "Down/Up Ratio": {
        "category": "Traffic Symmetry",
        "layer": "Flow Session",
        "unit": "Ratio (Bwd Packets / Fwd Packets)",
        "definition": "Ratio of incoming download packets to outgoing upload packets.",
        "cyber_context": "Normal web traffic exhibits Down/Up ratio > 1 (small request, large web response). DoS attacks show ratios near 0.",
        "attack_associations": ["DoS", "DDoS", "PortScan"],
    },
    "Average Packet Size": {
        "category": "Payload Sizing",
        "layer": "Network/Transport (L3/L4)",
        "unit": "Bytes",
        "definition": "Mean size of all packets transmitted across both directions of the flow.",
        "cyber_context": "A critical discriminator between volumetric attacks (fixed small size) and legitimate web browsing (wide distribution).",
        "attack_associations": ["DDoS", "DoS Hulk"],
    },
    "Init_Win_bytes_forward": {
        "category": "TCP Windowing",
        "layer": "Transport (L4)",
        "unit": "Bytes (Window Size)",
        "definition": "TCP initial receive window advertisement from the sender.",
        "cyber_context": "Different operating systems (Windows, Linux, macOS) use distinct default initial windows. Unusual values expose OS fingerprinting or raw socket crafting.",
        "attack_associations": ["Reconnaissance", "OS Fingerprinting"],
    },
    "Init_Win_bytes_backward": {
        "category": "TCP Windowing",
        "layer": "Transport (L4)",
        "unit": "Bytes (Window Size)",
        "definition": "TCP initial receive window advertisement sent in reverse direction.",
        "cyber_context": "Zero or missing backward window size reveals that the destination never completed handshake negotiation.",
        "attack_associations": ["PortScan", "SYN Flood"],
    },
    "Active Mean": {
        "category": "Flow Timing",
        "layer": "Session State",
        "unit": "Microseconds (μs)",
        "definition": "Average duration a flow was actively transmitting packets before going idle.",
        "cyber_context": "Long active periods indicate persistent transfers; rapid pulse activations indicate automated polling or C2 beacons.",
        "attack_associations": ["Botnet", "Data Exfiltration"],
    },
    "Idle Mean": {
        "category": "Flow Timing",
        "layer": "Session State",
        "unit": "Microseconds (μs)",
        "definition": "Average duration a flow was dormant between active bursts.",
        "cyber_context": "Periodic idle intervals are the hallmark of automated malware beaconing (e.g. Cobalt Strike sleeping 60 seconds between check-ins).",
        "attack_associations": ["Botnet C2", "Infiltration"],
    },
}

class FeatureIntelligenceService:
    def __init__(self) -> None:
        self.stats_cache: dict[str, dict[str, Any]] = {}
        self._initialized: bool = False

    def _ensure_stats(self) -> None:
        if self._initialized:
            return
        self._initialized = True
        self._load_empirical_stats()

    def _load_empirical_stats(self) -> None:
        from ...core.config import SAMPLES_DATA_DIR
        sample_path = SAMPLES_DATA_DIR / "sample_cic_binary.csv"
        if not sample_path.exists():
            sample_path = PROCESSED_DATA_DIR / "binary_test.csv.gz"
        if not sample_path.exists():
            return

        try:
            # Sample records for fast statistical reference
            df = pd.read_csv(sample_path, nrows=1000)
            target_col = "target" if "target" in df.columns else ("Label" if "Label" in df.columns else None)
            if not target_col:
                return

            benign_df = df[df[target_col] == "Benign"]
            attack_df = df[df[target_col] == "Attack"]

            feature_cols = [c for c in df.columns if c != target_col]

            for col in feature_cols:
                b_vals = pd.to_numeric(benign_df[col], errors="coerce").dropna()
                a_vals = pd.to_numeric(attack_df[col], errors="coerce").dropna()

                self.stats_cache[col] = {
                    "benign_mean": float(b_vals.mean()) if len(b_vals) > 0 else 0.0,
                    "benign_median": float(b_vals.median()) if len(b_vals) > 0 else 0.0,
                    "benign_std": float(b_vals.std()) if len(b_vals) > 0 else 0.0,
                    "attack_mean": float(a_vals.mean()) if len(a_vals) > 0 else 0.0,
                    "attack_median": float(a_vals.median()) if len(a_vals) > 0 else 0.0,
                    "attack_std": float(a_vals.std()) if len(a_vals) > 0 else 0.0,
                    "min_val": float(df[col].min()),
                    "max_val": float(df[col].max()),
                }
        except Exception as e:
            logger.warning("Could not pre-calculate empirical feature stats: %s", e)

    def get_feature_info(self, feature_name: str) -> dict[str, Any]:
        self._ensure_stats()
        info = FEATURE_DEFINITIONS.get(feature_name, {
            "category": "Network Metric",
            "layer": "Transport / Flow",
            "unit": "Numeric",
            "definition": f"Network telemetry indicator for {feature_name}.",
            "cyber_context": "Evaluated by the intrusion profiling ensemble to detect anomalous flow behaviors.",
            "attack_associations": ["Anomalous Traffic"],
        })

        stats = self.stats_cache.get(feature_name, {})
        return {
            "name": feature_name,
            **info,
            "statistics": stats,
        }

    def get_all_features(self) -> list[dict[str, Any]]:
        self._ensure_stats()
        # Return all known features
        from ...core.config import SAMPLES_DATA_DIR
        sample_path = SAMPLES_DATA_DIR / "sample_cic_binary.csv"
        feature_names = list(FEATURE_DEFINITIONS.keys())
        if sample_path.exists():
            try:
                sample = pd.read_csv(sample_path, nrows=1)
                feature_names = [c for c in sample.columns if c.lower() not in ["target", "label"]]
            except Exception:
                pass

        results = []
        for feat in feature_names:
            results.append(self.get_feature_info(feat))
        return results

feature_intelligence_service = FeatureIntelligenceService()
