# state_manager.py
import json
from pathlib import Path
from datetime import date

STATE_DIR = Path(__file__).resolve().parent / "state"


def get_state_file_path(date_str: str) -> Path:
    return STATE_DIR / f"state_{date_str}.json"


def load_state(date_str: str) -> dict:
    """
    Load a state snapshot by date (YYYY-MM-DD)
    """
    path = get_state_file_path(date_str)
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_state(state_data: dict, date_str: str = None):
    """
    Save the current state to a versioned JSON file.
    If no date is given, use today's date.
    """
    if not date_str:
        date_str = date.today().isoformat()

    path = get_state_file_path(date_str)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(state_data, f, indent=2, ensure_ascii=False)

    print(f"✅ State saved to {path}")
