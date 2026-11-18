"""Send newly appended CICFlowMeter CSV rows to the prediction API."""

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


def monitor_csv(
    csv_path: Path,
    api_url: str,
    poll_interval: float,
    batch_size: int,
    start_at_end: bool,
) -> None:
    offset = 0
    print(f"Watching {csv_path} for new flow rows")

    while True:
        if not csv_path.exists():
            time.sleep(poll_interval)
            continue

        try:
            data = pd.read_csv(csv_path)
        except (OSError, pd.errors.ParserError):
            # CICFlowMeter may be writing a row while it is being read.
            time.sleep(poll_interval)
            continue

        if start_at_end and offset == 0:
            offset = len(data)

        if len(data) < offset:
            print("Input file was truncated; restarting from its first row")
            offset = 0

        while offset < len(data):
            batch = data.iloc[offset : offset + batch_size]
            records = batch.where(pd.notna(batch), None).to_dict(orient="records")
            try:
                result = send_batch(api_url, records)
            except (HTTPError, URLError) as exc:
                print(f"API unavailable: {exc}")
                break

            predictions = result.get("predictions", [])
            attacks = sum(item.get("prediction") == "Attack" for item in predictions)
            offset += len(batch)
            print(f"processed={offset} | new_rows={len(predictions)} | attacks={attacks}")

        time.sleep(poll_interval)


def main() -> None:
    parser = argparse.ArgumentParser(description="Bridge appended CICFlowMeter rows to the prediction API.")
    parser.add_argument("csv_path", type=Path, help="CSV currently being written by CICFlowMeter")
    parser.add_argument("--api-url", default="http://127.0.0.1:8000/predict")
    parser.add_argument("--poll-interval", type=float, default=2.0)
    parser.add_argument("--batch-size", type=int, default=25)
    parser.add_argument(
        "--start-at-end",
        action="store_true",
        help="Ignore existing rows and process only flows created after startup",
    )
    args = parser.parse_args()

    if args.poll_interval <= 0:
        parser.error("--poll-interval must be greater than zero")
    if args.batch_size < 1:
        parser.error("--batch-size must be at least 1")
    monitor_csv(args.csv_path, args.api_url, args.poll_interval, args.batch_size, args.start_at_end)


if __name__ == "__main__":
    main()
