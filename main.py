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
    Return the most recent state available and its date.
    """
    try:
        date_str, state = state_manager.get_latest_state()
        return {"date": date_str, "state": state}
    except FileNotFoundError:
        return {"error": "No state files found."}



@app.get("/mindep/state/{date}")
def get_state_by_date(date: str):
    """
    Load a state snapshot by date (YYYY-MM-DD)
    """
    try:
        state = state_manager.load_state(date)
        return {"date": date, "state": state}
    except FileNotFoundError:
        return {"error": "No state file found."}
    

@app.post("/mindep/state/{date}")
def load_state_to_db_by_date(date: str):
    """
    Load a state snapshot to db
    """
    try:
        state_manager.load_state_to_db(date)
    except FileNotFoundError:
        return {"error": f"State file for {date} not found."}


@app.get("/mindep/initial/{date}")
def get_contents_of_initial_gazette(date: str):
    """
    Return the contents of the initial gazette file for a given date.
    """
    try:
        data = gazette_processor.extract_initial_gazette_data(date)
        return data
    except FileNotFoundError:
        return {"error": f"Gazette input file for {date} not found."}



@app.post("/mindep/initial/{date}")
def create_state_from_initial_gazette(date: str, ministries: List[dict] = Body(...)):
    """
    Trigger state creation for the initial gazette
    """
    try:
        database.load_initial_state_to_db(date, ministries) 
        return {"message": f"State created for initial gazette: {date}"}
    except FileNotFoundError:
        return {"error": f"Gazette input file for {date} not found."}


@app.get("/mindep/amendment/{date}")
def get_contents_of_amendment_gazette(date: str):
    """
    Return the contents of the initial gazette file for a given date.
    """
    try:
        transactions = gazette_processor.process_amendment_gazette(date)
        return {
            "message": f"Amendment processed for {date}",
            "transactions": transactions,
        }
    except FileNotFoundError:
        return {"error": f"Gazette input file for {date} not found."}


@app.post("/mindep/amendment/{date}")
def create_state_from_amendment(date: str, transactions: List[dict] = Body(...)):
    """
    Trigger processing of an amendment gazette and return the detected transactions.
    """
    try:
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
