from __future__ import annotations

import json
import logging
import sqlite3
from pathlib import Path
from typing import Any

from ...core.config import PROJECT_ROOT

logger = logging.getLogger(__name__)

DB_PATH = PROJECT_ROOT / "backend" / "data" / "experiments.db"

class ExperimentDB:
    def __init__(self, db_path: Path = DB_PATH) -> None:
        self.db_path = db_path
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, timeout=5.0, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        try:
            conn.execute("PRAGMA journal_mode=WAL;")
        except Exception:
            pass
        return conn

    def _init_db(self) -> None:
        with self._get_connection() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS experiments (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    task_type TEXT NOT NULL,
                    status TEXT NOT NULL,
                    stage TEXT NOT NULL,
                    progress INTEGER NOT NULL DEFAULT 0,
                    dataset_config TEXT NOT NULL,
                    preprocessing_config TEXT NOT NULL,
                    ensemble_config TEXT NOT NULL,
                    metrics TEXT,
                    training_time_seconds REAL DEFAULT 0,
                    prediction_time_seconds REAL DEFAULT 0,
                    error_message TEXT,
                    notes TEXT
                )
                """
            )
            conn.commit()

    def create_experiment(self, exp_data: dict[str, Any]) -> None:
        with self._get_connection() as conn:
            conn.execute(
                """
                INSERT INTO experiments (
                    id, name, created_at, task_type, status, stage, progress,
                    dataset_config, preprocessing_config, ensemble_config,
                    metrics, training_time_seconds, prediction_time_seconds,
                    error_message, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    exp_data["id"],
                    exp_data["name"],
                    exp_data["created_at"],
                    exp_data.get("task_type", "binary"),
                    exp_data["status"],
                    exp_data.get("stage", "queued"),
                    exp_data.get("progress", 0),
                    json.dumps(exp_data.get("dataset_config", {})),
                    json.dumps(exp_data.get("preprocessing_config", {})),
                    json.dumps(exp_data.get("ensemble_config", {})),
                    json.dumps(exp_data.get("metrics", {})) if exp_data.get("metrics") else None,
                    exp_data.get("training_time_seconds", 0.0),
                    exp_data.get("prediction_time_seconds", 0.0),
                    exp_data.get("error_message"),
                    exp_data.get("notes"),
                ),
            )
            conn.commit()

    def update_experiment_status(
        self,
        exp_id: str,
        status: str,
        stage: str,
        progress: int,
        metrics: dict[str, Any] | None = None,
        train_time: float | None = None,
        pred_time: float | None = None,
        error_msg: str | None = None,
    ) -> None:
        with self._get_connection() as conn:
            query = """
                UPDATE experiments SET
                    status = ?,
                    stage = ?,
                    progress = ?
            """
            params: list[Any] = [status, stage, progress]

            if metrics is not None:
                query += ", metrics = ?"
                params.append(json.dumps(metrics))
            if train_time is not None:
                query += ", training_time_seconds = ?"
                params.append(train_time)
            if pred_time is not None:
                query += ", prediction_time_seconds = ?"
                params.append(pred_time)
            if error_msg is not None:
                query += ", error_message = ?"
                params.append(error_msg)

            query += " WHERE id = ?"
            params.append(exp_id)

            conn.execute(query, params)
            conn.commit()

    def get_experiment(self, exp_id: str) -> dict[str, Any] | None:
        with self._get_connection() as conn:
            cursor = conn.execute("SELECT * FROM experiments WHERE id = ?", (exp_id,))
            row = cursor.fetchone()
            if not row:
                return None
            return self._row_to_dict(row)

    def list_experiments(self, limit: int = 50) -> list[dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.execute(
                "SELECT * FROM experiments ORDER BY created_at DESC LIMIT ?", (limit,)
            )
            return [self._row_to_dict(row) for row in cursor.fetchall()]

    def delete_experiment(self, exp_id: str) -> bool:
        with self._get_connection() as conn:
            cursor = conn.execute("DELETE FROM experiments WHERE id = ?", (exp_id,))
            conn.commit()
            return cursor.rowcount > 0

    def compare_experiments(self, exp_ids: list[str]) -> list[dict[str, Any]]:
        with self._get_connection() as conn:
            placeholders = ",".join("?" for _ in exp_ids)
            cursor = conn.execute(
                f"SELECT * FROM experiments WHERE id IN ({placeholders})", exp_ids
            )
            return [self._row_to_dict(row) for row in cursor.fetchall()]

    def _row_to_dict(self, row: sqlite3.Row) -> dict[str, Any]:
        d = dict(row)
        for key in ["dataset_config", "preprocessing_config", "ensemble_config", "metrics"]:
            if d.get(key):
                try:
                    d[key] = json.loads(d[key])
                except Exception:
                    pass
        return d

experiment_db = ExperimentDB()
