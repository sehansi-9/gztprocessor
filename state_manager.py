# state_manager.py
import json
from pathlib import Path
from datetime import date
from typing import List, Dict
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
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
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
    try:
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except FileNotFoundError:
        raise FileNotFoundError(
            f"Gazette input file for {date_str} not found at {json_path}"
        )
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON format in {json_path}: {e}")

    ministries = data.get("ministers", [])
    if not ministries:
        raise ValueError(f"No ministries found in input file {json_path}")

    # here send the data to the frontend for validation
    # then get the confirmed list of ministries with departments

    try:
        with get_connection() as conn:
            cur = conn.cursor()

            for ministry in ministries:
                cur.execute(
                    "INSERT INTO ministry (name) VALUES (?)",
                    (ministry["name"],),
                )
                ministry_id = cur.lastrowid

                position = 1  # reset for each ministry
                for dept in ministry["departments"]:
                    cur.execute(
                        "INSERT INTO department (name, ministry_id, position) VALUES (?, ?, ?)",
                        (dept, ministry_id, position),
                    )
                    position += 1

            conn.commit()
    except Exception as e:
        raise RuntimeError(f"Failed to insert initial state into database: {e}")

    print(f"Initial state inserted into database for {date_str}")

    # Export the inserted state back to a JSON file as a snapshot
    try:
        export_state_snapshot(date_str)
    except Exception as e:
        raise RuntimeError(f"Failed to export state snapshot: {e}")


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

            # Get all ministries (no filtering by state_version)
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


def apply_transactions_to_db(transactions: list[dict], date_str: str):
    from collections import defaultdict
    from state_manager import export_state_snapshot

    with get_connection() as conn:
        cur = conn.cursor()

        # Step 1: Load current structure from DB
        ministry_depts = defaultdict(list)  # ministry_name -> [department_name1, department_name2, ...]

        cur.execute("""
            SELECT m.name, d.name 
            FROM ministry m 
            JOIN department d ON m.id = d.ministry_id 
            ORDER BY m.id, d.position
        """)
        for ministry_name, dept_name in cur.fetchall():
            ministry_depts[ministry_name].append(dept_name)

        # Step 2: Apply transactions in memory
        for tx in transactions:
            t = tx["type"]
            dept = tx["department"]

            if t == "MOVE":
                from_min = tx["from_ministry"]
                to_min = tx["to_ministry"]
                pos = tx.get("position")

                if dept not in ministry_depts[from_min]:
                    print(f"⚠️ {dept} not found in {from_min}")
                    continue

                # Remove from old ministry
                ministry_depts[from_min].remove(dept)

                # Insert into new ministry at correct position
                if pos is not None:
                    insert_at = pos - 1
                    if insert_at < 0:
                        insert_at = 0
                    ministry_depts[to_min].insert(insert_at, dept)
                else:
                    ministry_depts[to_min].append(dept)

            elif t == "ADD":
                to_min = tx["to_ministry"]
                pos = tx.get("position")

                # Avoid duplicates
                if dept in ministry_depts[to_min]:
                    continue

                if pos is not None:
                    insert_at = pos - 1
                    if insert_at < 0:
                        insert_at = 0
                    ministry_depts[to_min].insert(insert_at, dept)
                else:
                    ministry_depts[to_min].append(dept)

            elif t == "TERMINATE":
                from_min = tx["from_ministry"]
                if dept in ministry_depts[from_min]:
                    ministry_depts[from_min].remove(dept)

        # Step 3: Clear all departments
        cur.execute("DELETE FROM department")

        # Step 4: Re-insert departments with correct positions
        for ministry_name, departments in ministry_depts.items():
            # Get or create ministry
            cur.execute("SELECT id FROM ministry WHERE name = ?", (ministry_name,))
            row = cur.fetchone()
            if row:
                ministry_id = row[0]
            else:
                cur.execute("INSERT INTO ministry (name) VALUES (?)", (ministry_name,))
                ministry_id = cur.lastrowid

            for idx, dept_name in enumerate(departments, start=1):
                cur.execute(
                    "INSERT INTO department (name, ministry_id, position) VALUES (?, ?, ?)",
                    (dept_name, ministry_id, idx)
                )

        conn.commit()
        print("DB updated with new positions")

    # Step 5: Export state snapshot
    export_state_snapshot(date_str)
    print(f"Exported state snapshot for {date_str}")

