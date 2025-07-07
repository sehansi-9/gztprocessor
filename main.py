# main.py
from fastapi import FastAPI
from pathlib import Path

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


@app.get("/state/latest")
def get_latest_state():
    """
    Return the most recent state available and its date.
    """
    try:
        date_str, state = state_manager.get_latest_state()
        return {"date": date_str, "state": state}
    except FileNotFoundError:
        return {"error": "No state files found."}


@app.get("/state/{date}")
def get_state_by_date(date: str):
    """
    Load a state snapshot by date (YYYY-MM-DD)
    """
    try:
        state = state_manager.load_state(date)
        return state
    except FileNotFoundError:
        return {"error": f"State file for {date} not found."}


@app.get("/state/initial/{date}")
def get_contents_of_initial_gazette(date: str):
    """
    Return the contents of the initial gazette file for a given date.
    """
    try:
        data = gazette_processor.extract_initial_gazette_data(date)
        return data
    except FileNotFoundError:
        return {"error": f"Gazette input file for {date} not found."}


# TODO: this should accept a payload of ministries and departments from user after editing
@app.post("/state/initial/{date}")
def create_state_from_initial_gazette(date: str):
    """
    Trigger state creation for the initial gazette
    """
    try:
        database.load_initial_state_to_db(date) # change this later to accept ministries and departments from user
        return {"message": f"State created for initial gazette: {date}"}
    except FileNotFoundError:
        return {"error": f"Gazette input file for {date} not found."}


@app.get("/state/amendment/{date}")
def get_contents_of_amendment_gazette(date: str):
    try:
        transactions = gazette_processor.process_amendment_gazette(date)
        return {
            "message": f"Amendment processed for {date}",
            "transactions": transactions,
        }
    except FileNotFoundError:
        return {"error": f"Gazette input file for {date} not found."}


# TODO: this should accept a payload of edited transactions from user
@app.post("/state/amendment/{date}")
def create_state_from_amendment(date: str):
    """
    Trigger processing of an amendment gazette and return the detected transactions.
    """
    try:
        transactions = gazette_processor.process_amendment_gazette(
            date
        )  # remove this part later as the user is providing the edited transactions
        database.apply_transactions_to_db(transactions, date)
        return {
            "message": f"Amendment processed for {date}",
        }
    except FileNotFoundError:
        return {"error": f"Gazette input file for {date} not found."}


@app.delete("/reset")
def reset_system():
    """
    Deletes all state JSONs and clears database tables.
    """
    state_manager.clear_all_state_data()
    return {"message": "System reset: all state files deleted and database cleared."}
