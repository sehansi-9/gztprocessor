import json
from pathlib import Path


STATE_DIR = Path(__file__).resolve().parent / "state"
INPUT_DIR = Path(__file__).resolve().parent / "input"

def load_gazette_data_from_JSON(date_str: str) -> dict:
    """
    Load the first gazette data from input/gazette_<date_str>.json
    Expects JSON format:
    {
      "ministers": [
        {
          "name": "Minister of X",
          "departments": ["Dept A", "Dept B"]
        }
      ]
    }
    Returns the parsed JSON data.
    """
    json_path = INPUT_DIR / f"gazette_{date_str}.json"
    try:
        with open(json_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        raise FileNotFoundError(
            f"Gazette input file for {date_str} not found at {json_path}"
        )
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON format in {json_path}: {e}")