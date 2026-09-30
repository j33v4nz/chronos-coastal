"""Bounded, durable demo records stored outside the source tree."""
import json
import sqlite3
from contextlib import contextmanager
from pathlib import Path


class RecordStore:
    def __init__(self, directory):
        self.directory = Path(directory)

    @contextmanager
    def connect(self):
        self.directory.mkdir(parents=True, exist_ok=True)
        connection = sqlite3.connect(self.directory / "records.sqlite3", timeout=10)
        connection.execute("PRAGMA journal_mode=WAL")
        connection.execute("""CREATE TABLE IF NOT EXISTS records (
            kind TEXT NOT NULL, id TEXT NOT NULL, body TEXT NOT NULL,
            created_at TEXT NOT NULL, PRIMARY KEY (kind, id))""")
        try:
            with connection:
                yield connection
        finally:
            connection.close()

    def put(self, kind, ident, value):
        with self.connect() as connection:
            connection.execute(
                "INSERT OR REPLACE INTO records VALUES (?, ?, ?, ?)",
                (kind, ident, json.dumps(value, ensure_ascii=False),
                 value.get("created_at", value.get("timestamp", ""))),
            )
            connection.execute("""DELETE FROM records WHERE kind = ? AND id NOT IN
                (SELECT id FROM records WHERE kind = ? ORDER BY created_at DESC LIMIT 1000)""", (kind, kind))

    def get(self, kind, ident):
        with self.connect() as connection:
            row = connection.execute("SELECT body FROM records WHERE kind = ? AND id = ?", (kind, ident)).fetchone()
        return json.loads(row[0]) if row else None

    def recent(self, kind, limit=100):
        with self.connect() as connection:
            rows = connection.execute("SELECT body FROM records WHERE kind = ? ORDER BY created_at DESC LIMIT ?", (kind, limit)).fetchall()
        return [json.loads(row[0]) for row in rows]
