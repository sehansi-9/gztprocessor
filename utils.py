import json
from pathlib import Path

STATE_DIR = Path(__file__).resolve().parent / "state"
INPUT_DIR = Path(__file__).resolve().parent / "input"

def load_gazette_data_from_JSON(gazette_number: str, date_str: str) -> dict:
    """
    Load a gazette JSON file using gazette number and date.
    Expected file names:
    - ministry-initial_<gazette_number>_E_<date_str>.json
    - ministry-amendment_<gazette_number>_E_<date_str>.json

    Example:
    - ministry-initial_2289-43_E_2022-07-22.json
    - ministry-amendment_2297-78_E_2022-09-16.json
    """
    pattern = f"ministry-*_{gazette_number}_E_{date_str}.json"
    matching_files = list(INPUT_DIR.glob(pattern))

    if not matching_files:
        raise FileNotFoundError(
            f"No gazette file found for gazette {gazette_number} and date {date_str} in {INPUT_DIR}"
        )

    if len(matching_files) > 1:
        print(f"⚠️ Multiple gazette files found, using the first one: {matching_files[0].name}")

    json_path = matching_files[0]
    try:
        with open(json_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON format in {json_path}: {e}")
