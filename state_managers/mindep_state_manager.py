# state_manager.py
import json
from pathlib import Path
from db_connections.db_gov import get_connection

PROJECT_ROOT = Path(__file__).resolve().parent.parent
STATE_DIR = PROJECT_ROOT / "state" / "mindep"

def get_state_file_path(gazette_number: str, date_str: str) -> Path:
    return STATE_DIR / f"state_{gazette_number}_{date_str}.json"


def load_state(gazette_number: str, date_str: str) -> dict:
    """
    Load a state snapshot by date (YYYY-MM-DD).
    Returns:
        (date_str, state_dict)
    """
    path = get_state_file_path(gazette_number, date_str)
    try:
        with open(path, "r", encoding="utf-8") as f:
            state_data = json.load(f)
        return state_data
    except FileNotFoundError:
        raise FileNotFoundError(f"State file for {date_str} not found at {path}")
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON format in {path}: {e}")
    
def get_state_by_date(date_str: str) -> dict | list[str]:
    """
    Given a date string, returns:
    - {"gazette_number": ..., "state": ...} if only one state file found
    - OR a list of gazette numbers if multiple files exist
    """
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    pattern = f"state_*_{date_str}.json"
    matching_files = list(STATE_DIR.glob(pattern))

    if not matching_files:
        raise FileNotFoundError(f"No state file found for date {date_str}")

    if len(matching_files) == 1:
        path = matching_files[0]
        try:
            with open(path, "r", encoding="utf-8") as f:
                state = json.load(f)
            name = path.stem.replace("state_", "")  # e.g. "2289-43_2022-07-22"
            gazette_number, _ = name.split("_", 1)
            return {"gazette_number": gazette_number, "state": state}
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON in {path}: {e}")
    else:
        gazette_numbers = []
        for file in matching_files:
            name = file.stem.replace("state_", "")
            gazette_number, _ = name.split("_", 1)
            gazette_numbers.append(gazette_number)
        return gazette_numbers



def get_latest_state() -> tuple[str, str, dict]:
    """
    Return (gazette_number, date_str, state_dict) of the most recent saved state,
    based on file modification time.
    """
    STATE_DIR.mkdir(parents=True, exist_ok=True)

    state_files = list(STATE_DIR.glob("state_*.json"))

    if not state_files:
        raise FileNotFoundError("No state files found.")

    # Sort files by last modification time (descending)
    state_files.sort(key=lambda f: f.stat().st_mtime, reverse=True)

    latest_path = state_files[0]
    combined = latest_path.stem.replace("state_", "")  # e.g. "2297-78_2022-09-16"

    try:
        gazette_number, date_str = combined.split("_", 1)
    except ValueError:
        raise ValueError(f"Unexpected state file name format: {latest_path.name}")

    try:
        with open(latest_path, "r", encoding="utf-8") as f:
            state_data = json.load(f)
        return gazette_number, date_str, state_data
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON format in {latest_path}: {e}")



def get_latest_state_date() -> tuple[str, str]:
    """
    Return (gazette_number, date_str) of the most recent saved state.
    """
    gazette_number, date_str, _ = get_latest_state()
    return gazette_number, date_str


def export_state_snapshot(gazette_number: str, date_str: str):
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
        state_path = get_state_file_path(gazette_number, date_str)
        with open(state_path, "w", encoding="utf-8") as f:
            json.dump(snapshot, f, indent=2, ensure_ascii=False)
        print(f"State snapshot exported to {state_path}")

    except IOError as e:
        raise IOError(f"Failed to write state snapshot to {state_path}: {e}")

def load_state_to_db(gazette_number: str, date_str: str):
    """
    Load a saved state snapshot from file into the database.
    This will replace the current contents of the ministry and department tables.
    """
    state_data = load_state(gazette_number, date_str)
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
