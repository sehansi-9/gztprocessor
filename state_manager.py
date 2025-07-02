# state_manager.py
import json
from pathlib import Path
from datetime import date
from db import get_connection

STATE_DIR = Path(__file__).resolve().parent / "state"
INPUT_DIR = Path(__file__).resolve().parent / "input"


def get_state_file_path(date_str: str) -> Path:
    return STATE_DIR / f"state_{date_str}.json"


def load_state(date_str: str) -> dict:
    """
    Load a state snapshot by date (YYYY-MM-DD)
    """
    path = get_state_file_path(date_str)
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


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

    with open(latest_path, "r", encoding="utf-8") as f:
        return latest_date, json.load(f)


def load_initial_state_to_db(date_str: str):
    """
    Load the first full structure into the database and save a state snapshot.
    Expects JSON format:
    {
      "ministries": [
        {
          "name": "Minister of X",
          "departments": ["Dept A", "Dept B"]
        }
      ]
    }
    Saves state to DB and also state/state_<date_str>.json
    """
    json_path = INPUT_DIR / f"gazette_{date_str}.json"

    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    ministries = data.get("ministers", [])

    # here send the data to the frontend for validation
    #then get the confirmed list of ministries with departments

    with get_connection() as conn:
        cur = conn.cursor()

        for ministry in ministries:
            cur.execute(
                "INSERT INTO ministry (name, state_version) VALUES (?, ?)",
                (ministry["name"], date_str),
            )
            ministry_id = cur.lastrowid

            position = 1  # reset for each ministry
            for dept in ministry["departments"]:
                cur.execute(
                    "INSERT INTO department (name, ministry_id, position, state_version) VALUES (?, ?, ?, ?)",
                    (dept, ministry_id, position, date_str),
                )
                position += 1

        conn.commit()

    print(f"✅ Initial state inserted into database for {date_str}")

    # Export the inserted state back to a JSON file as a snapshot
    export_state_snapshot(date_str)


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

    with get_connection() as conn:
        cur = conn.cursor()

        # Get all ministries for this state
        cur.execute(
            "SELECT id, name FROM ministry WHERE state_version = ? ORDER BY id ASC",
            (date_str,),
        )
        ministries = cur.fetchall()

        for ministry_id, ministry_name in ministries:
            cur.execute(
                "SELECT name FROM department WHERE ministry_id = ? AND state_version = ? ORDER BY position ASC",
                (ministry_id, date_str),
            )
            departments = [row[0] for row in cur.fetchall()]
            snapshot["ministers"].append(
                {"name": ministry_name, "departments": departments}
            )

    # Write to state file
    state_path = STATE_DIR / f"state_{date_str}.json"
    with open(state_path, "w", encoding="utf-8") as f:
        json.dump(snapshot, f, indent=2, ensure_ascii=False)

    print(f"📦 State snapshot exported to {state_path}")
