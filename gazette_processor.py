from pathlib import Path
import json
import re
from db import get_connection
from state_manager import get_latest_state_date

INPUT_DIR = Path(__file__).resolve().parent / "input"


def extract_column_II_department_changes(
    date_str: str,
) -> tuple[list[dict], list[dict]]:
    """
    Extracts department-level ADDs and OMITs from Column II for an amendment gazette.

    Returns two lists:
    - added_departments: List of dicts → { ministry_name, departments }
    - removed_departments_raw: List of dicts → either:
        - { ministry_name, omitted_positions: [int, ...] }
        - { ministry_name, omitted_names: [str, ...] }
    """
    gazette_path = INPUT_DIR / f"gazette_{date_str}.json"
    if not gazette_path.exists():
        raise FileNotFoundError(f"Gazette file for {date_str} not found.")

    try:
        with open(gazette_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON format in {gazette_path}: {e}")

    # Focus on changes in Column II (departments)
    adds = [e for e in data.get("ADD", []) if e.get("affected_column") == "II"]
    omits = [e for e in data.get("OMIT", []) if e.get("affected_column") == "II"]

    added_departments = []
    for entry in adds:
        ministry_name = entry["ministry_name"]
        if not ministry_name:
            print(f"⚠️ Ministry name missing in ADD entry: {entry}")
            continue

        departments = []
        for detail in entry.get("details", []):
            # Match flexible patterns like:
            # "Inserted: item 3 — XYZ", "Inserted: XYZ after item 6", "Inserted: XYZ"
            match = re.match(
                r"Inserted:\s*(?:item\s*(\d+)\s*—\s*)?(.*?)(?:\s+after item\s+\d+)?$",
                detail.strip(),
                flags=re.IGNORECASE,
            )
        if match:
            position = match.group(1)  # This will be the number if "item X —" exists
            department_name = match.group(2).strip()
            departments.append(
                {
                    "name": department_name,
                    "position": int(position) if position else None,
                }
            )

        if departments:
            added_departments.append(
                {"ministry_name": ministry_name, "departments": departments}
            )

    removed_departments_raw = []
    for entry in omits:
        ministry_name = entry["ministry_name"]
        if not ministry_name:
            print(f"⚠️ Ministry name missing in OMIT entry: {entry}")
            continue
        positions = []
        for detail in entry.get("details", []):
            # Match "Omitted: item X" or "Omitted items X, Y"
            numbers = re.findall(
                r"Omitted.*?item[s]?\s*([\d,\sand]+)", detail, flags=re.IGNORECASE
            )
            if numbers:
                # Flatten items like '2, 4 and 6'
                raw = numbers[0]
                digits = re.findall(r"\d+", raw)
                positions.extend(int(n) for n in digits)
        if positions:
            removed_departments_raw.append(
                {"ministry_name": ministry_name, "omitted_positions": positions}
            )

    return added_departments, removed_departments_raw


def resolve_omitted_items(removed_departments_raw: list[dict], previous_date: str) -> list[dict]:
    """
    Convert position-based or name-based omissions into department names from the DB.
    """
    resolved = []
    try:
        with get_connection() as conn:
            cur = conn.cursor()
            for entry in removed_departments_raw:
                ministry = entry["ministry_name"]

                cur.execute(
                    "SELECT id FROM ministry WHERE name = ? AND state_version = ?",
                    (ministry, previous_date),
                )
                result = cur.fetchone()
                if not result:
                    print(f"⚠️ Ministry '{ministry}' not found in {previous_date}")
                    continue
                ministry_id = result[0]

                if "omitted_positions" in entry:
                    for pos in entry["omitted_positions"]:
                        cur.execute(
                            "SELECT name FROM department WHERE ministry_id = ? AND position = ? AND state_version = ?",
                            (ministry_id, pos, previous_date),
                        )
                        row = cur.fetchone()
                        if row:
                            resolved.append(
                                {"ministry": ministry, "department": row[0]}
                            )
                        else:
                            print(
                                f"⚠️ No dept at position {pos} under {ministry} on {previous_date}"
                            )

                elif "omitted_names" in entry:
                    for name in entry["omitted_names"]:
                        resolved.append({"ministry": ministry, "department": name})
    except Exception as e:
        print(f"❗ Error resolving omitted items: {e}")
        return []
    return resolved


def classify_department_changes(added: list[dict], removed: list[dict]) -> list[dict]:
    """
    Compare added and removed departments to detect MOVEs.

    Returns a list of classified transactions like:
    {
      type: 'MOVE' | 'ADD' | 'TERMINATE',
      department: 'Department Name',
      from_ministry: ...,   # for MOVE only
      to_ministry: ...      # for MOVE only
    }
    """
    transactions = []

    # Build sets for easy comparison
    added_map = {}  # dept -> ministry
    for item in added:
        for dept_entry in item["departments"]:
            name = dept_entry["name"]
            pos = dept_entry.get("position")  # might be None
            added_map[name] = {"ministry": item["ministry_name"], "position": pos}

    removed_map = {}  # dept -> ministry
    for item in removed:
        dept = item["department"]
        removed_map[dept] = item["ministry"]

    processed = set()

    # Detect MOVEs (in both removed and added)
    for dept, from_min in removed_map.items():
        if dept in added_map:
            to_entry = added_map[dept]
            transactions.append(
                {
                    "type": "MOVE",
                    "department": dept,
                    "from_ministry": from_min,
                    "to_ministry": to_entry["ministry"],
                    "position": to_entry["position"],
                }
            )
            processed.add(dept)

    # Remaining ADDs
    for dept, to_entry in added_map.items():
        if dept not in processed:
            transactions.append(
                {
                    "type": "ADD",
                    "department": dept,
                    "to_ministry": to_entry["ministry"],
                    "position": to_entry["position"],
                }
            )

    # Remaining TERMINATEs
    for dept, from_min in removed_map.items():
        if dept not in processed:
            transactions.append(
                {"type": "TERMINATE", "department": dept, "from_ministry": from_min}
            )

    return transactions


def process_amendment_gazette(date_str: str) -> list[dict]:
    """
    Process the amendment gazette and classify department-level transactions.
    Returns list of transactions: [{type: "MOVE", ...}, ...]
    """
    # Step 1: Extract column II department changes
    try:
        added, removed_raw = extract_column_II_department_changes(date_str)
    except ValueError as e:
        print(f"❗ Failed to extract column II changes {date_str}: {e}")
        return
    # Step 2: Get previous state
    try:
        prev_date = get_latest_state_date()
    except FileNotFoundError:
        print(f"❗ No previous state found for {date_str}. Cannot resolve changes.")
        return
    # Step 3: Resolve raw OMITs
    resolved_removed = resolve_omitted_items(removed_raw, prev_date)

    # Step 4: Classify transactions
    transactions = classify_department_changes(added, resolved_removed)

    return transactions
