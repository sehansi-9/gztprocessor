# main.py
from fastapi import FastAPI
from pathlib import Path

from fastapi.params import Body
from fastapi import FastAPI, Body
from typing import List

import state_manager
import gazette_processor
import database

from db import init_db

if __name__ == "__main__":
    init_db()
    print("✅ Database initialized.")

app = FastAPI()


@app.get("/")
def root():
    return {"message": "Gazette Processor backend running."}


@app.get("/mindep/state/latest")
def get_latest_state():
    """
    Return the most recent state available with gazette number and date.
    """
    try:
        gazette_number, date_str, state = state_manager.get_latest_state()
        return {
            "gazette_number": gazette_number,
            "date": date_str,
            "state": state
        }
    except FileNotFoundError:
        return {"error": "No state files found."}
    except ValueError as e:
        return {"error": str(e)}

@app.get("/mindep/state/{date}")
def get_state_by_date(date: str):
    """
    If one state exists on the given date, return its state and gazette number.
    If multiple exist, return a list of gazette numbers for that date.
    """
    try:
        result = state_manager.get_state_by_date(date)

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



@app.get("/mindep/state/{date}/{gazette_number}")
def get_state_by_gazette_and_date(gazette_number: str, date: str):
    try:
        state = state_manager.load_state(gazette_number, date)
        return {"gazette_number": gazette_number, "date": date, "state": state}
    except FileNotFoundError:
        return {"error": "No state file found."}
    

@app.post("/mindep/state/{date}/{gazette_number}")
def load_state_to_db_by_gazette_and_date(gazette_number: str, date: str):
    try:
        state_manager.load_state_to_db(gazette_number, date)
        return {"message": f"Loaded state for gazette {gazette_number} on {date} to DB"}
    except FileNotFoundError:
        return {"error": f"State file for gazette {gazette_number} on {date} not found."}


@app.get("/mindep/initial/{date}/{gazette_number}")
def get_contents_of_initial_gazette(gazette_number: str, date: str):
    """
    Return contents of the initial gazette for given gazette number and date.
    """
    try:
        data = gazette_processor.extract_initial_gazette_data(gazette_number, date)
        return data
    except FileNotFoundError:
        return {"error": f"Gazette file for {gazette_number}, {date} not found."}



@app.post("/mindep/initial/{date}/{gazette_number}")
def create_state_from_initial_gazette(gazette_number: str, date: str, ministries: List[dict] = Body(...)):
    """
    Load ministries to DB and save state snapshot for initial gazette.
    """
    try:
        database.load_initial_state_to_db(gazette_number, date, ministries)
        return {"message": f"State created for initial gazette {gazette_number} on {date}"}
    except FileNotFoundError:
        return {"error": f"Gazette file for {gazette_number}, {date} not found."}



@app.get("/mindep/amendment/{date}/{gazette_number}")
def get_contents_of_amendment_gazette(gazette_number: str, date: str):
    """
    Return the predicted transactions from the amendment gazette.
    """
    try:
        transactions = gazette_processor.process_amendment_gazette(gazette_number, date)
        return {
            "message": f"Amendment processed for {gazette_number} on {date}",
            "transactions": transactions,
        }
    except FileNotFoundError:
        return {"error": f"Gazette file for {gazette_number}, {date} not found."}


@app.post("/mindep/amendment/{date}/{gazette_number}")
def create_state_from_amendment_gazette(gazette_number: str, date: str, transactions: List[dict] = Body(...)):
    """
    Apply user-reviewed transactions and save new state snapshot.
    """
    try:
        database.apply_transactions_to_db(gazette_number, date, transactions)
        return {"message": f"State updated for amendment gazette {gazette_number} on {date}"}
    except FileNotFoundError:
        return {"error": f"Gazette file for {gazette_number}, {date} not found."}


@app.delete("/reset")
def reset_system():
    """
    Deletes all state JSONs and clears database tables.
    """
    state_manager.clear_all_state_data()
    return {"message": "System reset: all state files deleted and database cleared."}
