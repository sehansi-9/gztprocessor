# state_manager.py
import json
from pathlib import Path
from datetime import date
from typing import List, Dict
from db import get_connection

STATE_DIR = Path(__file__).resolve().parent / "state"

def get_state_file_path(date_str: str) -> Path:
    return STATE_DIR / f"state_{date_str}.json"


def load_state(date_str: str) -> tuple[str, dict]:
    """
    Load a state snapshot by date (YYYY-MM-DD).
    Returns:
        (date_str, state_dict)
    """
    path = get_state_file_path(date_str)
    try:
        with open(path, "r", encoding="utf-8") as f:
            state_data = json.load(f)
        return state_data
    except FileNotFoundError:
        raise FileNotFoundError(f"State file for {date_str} not found at {path}")
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON format in {path}: {e}")


def get_latest_state() -> tuple[str, dict]:
    """
    Return (date_str, state_dict) of the most recent saved state.
    """
    STATE_DIR.mkdir(parents=True, exist_ok=True)

    state_files = sorted([f for f in STATE_DIR.glob("state_*.json")])

    if not state_files:
        raise FileNotFoundError("No state files found.")

    latest_path = state_files[-1]
    latest_date = latest_path.stem.replace("state_", "")

    try:
        with open(latest_path, "r", encoding="utf-8") as f:
            state_data = json.load(f)
        return latest_date, state_data
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON format in {latest_path}: {e}")


def get_latest_state_date() -> str:
    """
    Return date of the most recent saved state.
    """
    STATE_DIR.mkdir(parents=True, exist_ok=True)

    state_files = sorted([f for f in STATE_DIR.glob("state_*.json")])

    if not state_files:
        raise FileNotFoundError("No state files found.")

    latest_path = state_files[-1]
    latest_date = latest_path.stem.replace("state_", "")

    return latest_date

def export_state_snapshot(date_str: str):
    """
    Query the current state for a given date_str and export as a JSON file.
    Format:
    {
      "ministries": [
        {
          "name": "Minister of X",
          "departments": ["Dept A", "Dept B"]
        }
      ]
    }
    """
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    snapshot = {"ministers": []}

    try:
        with get_connection() as conn:
            cur = conn.cursor()

            cur.execute("SELECT id, name FROM ministry ORDER BY id ASC")
            ministries = cur.fetchall()

            for ministry_id, ministry_name in ministries:
                cur.execute(
                    "SELECT name FROM department WHERE ministry_id = ? ORDER BY position ASC",
                    (ministry_id,),
                )
                departments = [row[0] for row in cur.fetchall()]
                snapshot["ministers"].append(
                    {"name": ministry_name, "departments": departments}
                )
    except Exception as e:
        raise RuntimeError(f"Failed to query state data: {e}")

    # Write to state file
    try:
        state_path = STATE_DIR / f"state_{date_str}.json"
        with open(state_path, "w", encoding="utf-8") as f:
            json.dump(snapshot, f, indent=2, ensure_ascii=False)
        print(f"State snapshot exported to {state_path}")

    except IOError as e:
        raise IOError(f"Failed to write state snapshot to {state_path}: {e}")

def load_state_to_db(date_str: str):
    """
    Load a saved state snapshot from file into the database.
    This will replace the current contents of the ministry and department tables.
    """
    state_data = load_state(date_str)
    ministries = state_data.get("ministers", [])

    if not ministries:
        raise ValueError(f"No ministries found in state file for {date_str}")

    with get_connection() as conn:
        cur = conn.cursor()

        # Clear existing data
        cur.execute("DELETE FROM department")
        cur.execute("DELETE FROM ministry")

        for ministry in ministries:
            cur.execute("INSERT INTO ministry (name) VALUES (?)", (ministry["name"],))
            ministry_id = cur.lastrowid

            for pos, dept in enumerate(ministry["departments"], start=1):
                cur.execute(
                    "INSERT INTO department (name, ministry_id, position) VALUES (?, ?, ?)",
                    (dept, ministry_id, pos),
                )

        conn.commit()

    print(f"Loaded state for {date_str} into the database.")


def clear_all_state_data():
    """
    Deletes all state snapshot files and clears the database tables.
    """
    # 1. Delete all state files
    if STATE_DIR.exists():
        for f in STATE_DIR.glob("state_*.json"):
            f.unlink()
        print("All state snapshot files deleted.")

    # 2. Clear database
    with get_connection() as conn:
        cur = conn.cursor()
        cur.execute("DELETE FROM department")
        cur.execute("DELETE FROM ministry")
        conn.commit()
        print("Ministry and department tables cleared.")
