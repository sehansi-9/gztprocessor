import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent / "gov.db"

def get_connection():
    return sqlite3.connect(DB_PATH)

def init_db():
    with get_connection() as conn:
        with open("schema.sql", "r", encoding="utf-8") as f:
            conn.executescript(f.read())
