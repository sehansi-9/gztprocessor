from pathlib import Path
import json
import re
from db import get_connection

INPUT_DIR = Path(__file__).resolve().parent / "input"


def extract_column_II_changes(date_str: str) -> tuple[list[dict], list[int]]:
    """
    Extract column II ADDs and OMIT item numbers from gazette JSON.
    Returns:
      - list of new ministries from ADD
      - list of omitted item numbers (to resolve from previous state)
    """
    gazette_path = INPUT_DIR / f"gazette_{date_str}.json"
    if not gazette_path.exists():
        raise FileNotFoundError(f"Gazette file for {date_str} not found.")

    with open(gazette_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Filter column II entries
    adds = [
        entry for entry in data.get("ADD", []) if entry.get("affected_column") == "II"
    ]
    omits = [
        entry for entry in data.get("OMIT", []) if entry.get("affected_column") == "II"
    ]

    # Extract ministries from ADD
    new_ministries = []
    for entry in adds:
        ministry_name = entry["ministry_name"]
        departments = []
        for detail in entry.get("details", []):
            # Extract departments after ":"
            if ":" in detail:
                dept_part = detail.split(":", 1)[1]
                departments.extend([d.strip() for d in dept_part.split(",")])
        new_ministries.append({"name": ministry_name, "departments": departments})

    # Extract omitted item numbers (ints)
    omitted_numbers = []
    for entry in omits:
        for detail in entry.get("details", []):
            # Extract numbers like "26", "50", "51"
            numbers = re.findall(r"\b\d+\b", detail)
            omitted_numbers.extend(int(n) for n in numbers)

    return new_ministries, omitted_numbers


def resolve_omitted_items(omitted_numbers: list[int], ministry_name: str, date_str: str) -> list[dict]:
    """
    Resolve omitted department items for a specific ministry from the DB.
    Uses per-ministry position and state_version.
    """
    resolved = []

    with get_connection() as conn:
        cur = conn.cursor()

        # Get ministry_id from name and state_version
        cur.execute(
            "SELECT id FROM ministry WHERE name = ? AND state_version = ?",
            (ministry_name, date_str),
        )
        result = cur.fetchone()

        if not result:
            print(f"⚠️ Ministry '{ministry_name}' not found in state {date_str}")
            return resolved

        ministry_id = result[0]

        for pos in omitted_numbers:
            cur.execute(
                """
                SELECT name FROM department
                WHERE ministry_id = ? AND position = ? AND state_version = ?
                """,
                (ministry_id, pos, date_str),
            )
            row = cur.fetchone()

            if row:
                dept_name = row[0]
                resolved.append({"ministry": ministry_name, "department": dept_name})
            else:
                print(f"⚠️ Item {pos} not found under {ministry_name} in {date_str}")

    return resolved
