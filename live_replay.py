"""Replay CSV flow records as a live stream into the prediction API.

This is a safe local demonstration of streaming inference. It replays recorded
CIC-IDS flow rows; it does not capture packets from a network interface.
"""

from __future__ import annotations

import argparse
import json
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

import pandas as pd


def send_batch(api_url: str, records: list[dict]) -> dict:
    payload = json.dumps({"records": records}).encode("utf-8")
    request = Request(
        api_url,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urlopen(request, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def replay_csv(
    csv_path: Path,
    api_url: str,
    batch_size: int,
    interval: float,
    loop: bool,
    max_batches: int | None,
) -> None:
    data = pd.read_csv(csv_path)
    if data.empty:
        raise ValueError(f"No records found in {csv_path}")

    print(f"Streaming {len(data):,} rows from {csv_path.name} to {api_url}")
    batches_sent = 0
    while True:
        for start in range(0, len(data), batch_size):
            batch = data.iloc[start : start + batch_size]
            records = batch.where(pd.notna(batch), None).to_dict(orient="records")
            try:
                result = send_batch(api_url, records)
            except (HTTPError, URLError) as exc:
                raise RuntimeError(f"Could not reach prediction API at {api_url}: {exc}") from exc

            predictions = result.get("predictions", [])
            attacks = sum(item.get("prediction") == "Attack" for item in predictions)
            print(
                f"rows {start + 1}-{start + len(batch)} | "
                f"attacks={attacks} | batch={len(predictions)}"
            )
            batches_sent += 1
            if max_batches is not None and batches_sent >= max_batches:
                return
            time.sleep(interval)

        if not loop:
            break
        print("Restarting replay from the first row...")


def main() -> None:
    parser = argparse.ArgumentParser(description="Replay recorded flow data as a live API feed.")
    parser.add_argument("csv_path", type=Path, help="CIC-IDS-style CSV file to replay")
    parser.add_argument("--api-url", default="http://127.0.0.1:8000/predict")
    parser.add_argument("--batch-size", type=int, default=25)
    parser.add_argument("--interval", type=float, default=1.0, help="Seconds between batches")
    parser.add_argument("--loop", action="store_true", help="Restart after reaching the end")
    parser.add_argument("--max-batches", type=int, help="Stop after sending this many batches")
    args = parser.parse_args()

    if args.batch_size < 1:
        parser.error("--batch-size must be at least 1")
    if args.interval < 0:
        parser.error("--interval cannot be negative")
    if args.max_batches is not None and args.max_batches < 1:
        parser.error("--max-batches must be at least 1")
    replay_csv(args.csv_path, args.api_url, args.batch_size, args.interval, args.loop, args.max_batches)


if __name__ == "__main__":
    main()
