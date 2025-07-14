from fastapi import APIRouter, Body

from fastapi.params import Body
from typing import List

import state_managers.mindep_state_manager as mindep_state_manager
import gazette_processors.mindep_gazette_processor as mindep_gazette_processor
import database_handlers.mindep_database_handler as mindep_database
import csv_writer

router = APIRouter()


@router.get("/mindep/state/latest")
def get_latest_state():
    """
    Return the most recent state available with gazette number and date.
    """
    try:
        gazette_number, date_str, state = mindep_state_manager.get_latest_state()
        return {
            "gazette_number": gazette_number,
            "date": date_str,
            "state": state
        }
    except FileNotFoundError:
        return {"error": "No state files found."}
    except ValueError as e:
        return {"error": str(e)}

@router.get("/mindep/state/{date}")
def get_state_by_date(date: str):
    """
    If one state exists on the given date, return its state and gazette number.
    If multiple exist, return a list of gazette numbers for that date.
    """
    try:
        result = mindep_state_manager.get_state_by_date(date)

        if isinstance(result, dict):
            return {
                "gazette_number": result["gazette_number"],
                "date": date,
                "state": result["state"]
            }

        return {
            "date": date,
            "multiple_gazettes": True,
            "gazette_numbers": result
        }

    except FileNotFoundError:
        return {"error": f"No state found for date {date}"}
    except ValueError as e:
        return {"error": str(e)}



@router.get("/mindep/state/{date}/{gazette_number}")
def get_state_by_gazette_and_date(gazette_number: str, date: str):
    try:
        state = mindep_state_manager.load_state(gazette_number, date)
        return {"gazette_number": gazette_number, "date": date, "state": state}
    except FileNotFoundError:
        return {"error": "No state file found."}
    

@router.post("/mindep/state/{date}/{gazette_number}")
def load_state_to_db_by_gazette_and_date(gazette_number: str, date: str):
    try:
        mindep_state_manager.load_state_to_db(gazette_number, date)
        return {"message": f"Loaded state for gazette {gazette_number} on {date} to DB"}
    except FileNotFoundError:
        return {"error": f"State file for gazette {gazette_number} on {date} not found."}


@router.get("/mindep/initial/{date}/{gazette_number}")
def get_contents_of_initial_gazette(gazette_number: str, date: str):
    """
    Return contents of the initial gazette for given gazette number and date.
    """
    try:
        data = mindep_gazette_processor.extract_initial_gazette_data(gazette_number, date)
        return data
    except FileNotFoundError:
        return {"error": f"Gazette file for {gazette_number}, {date} not found."}



@router.post("/mindep/initial/{date}/{gazette_number}")
def create_state_from_initial_gazette(gazette_number: str, date: str, ministries: List[dict] = Body(...)):
    """
    Load ministries to DB and save state snapshot for initial gazette.
    """
    try:
        mindep_database.load_initial_state_to_db(gazette_number, date, ministries)
        csv_writer.generate_initial_add_csv(gazette_number, date, ministries)
        return {"message": f"State created for initial gazette {gazette_number} on {date}"}
    except FileNotFoundError:
        return {"error": f"Gazette file for {gazette_number}, {date} not found."}



@router.get("/mindep/amendment/{date}/{gazette_number}")
def get_contents_of_amendment_gazette(gazette_number: str, date: str):
    """
    Return the predicted transactions from the amendment gazette.
    """
    try:
        transactions = mindep_gazette_processor.process_amendment_gazette(gazette_number, date)
        return {
            "message": f"Amendment processed for {gazette_number} on {date}",
            "transactions": transactions,
        }
    except FileNotFoundError:
        return {"error": f"Gazette file for {gazette_number}, {date} not found."}


@router.post("/mindep/amendment/{date}/{gazette_number}")
def create_state_from_amendment_gazette(gazette_number: str, date: str, transactions: List[dict] = Body(...)):
    """
    Apply user-reviewed transactions and save new state snapshot.
    """
    try:
        mindep_database.apply_transactions_to_db(gazette_number, date, transactions)
        csv_writer.generate_amendment_csvs(gazette_number, date, transactions)
        return {"message": f"State updated for amendment gazette {gazette_number} on {date}"}
    except FileNotFoundError:
        return {"error": f"Gazette file for {gazette_number}, {date} not found."}


@router.delete("/mindep/reset")
def reset_system():
    """
    Deletes all state JSONs and clears database tables.
    """
    mindep_state_manager.clear_all_state_data()
    return {"message": "System reset: all state files deleted and database cleared."}