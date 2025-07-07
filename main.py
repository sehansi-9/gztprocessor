# main.py
import os
from fastapi import FastAPI
from pathlib import Path

import state_manager
import gazette_processor

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


#call this endpoint to create the first state from gazette JSON
@app.post("/state/create/initial/{date}")
def create_state_from_first_gazette(date: str):
    """
    Trigger state creation from input/gazette_<date>.json 
    """
    try:
        state_manager.load_initial_state_to_db(date)
        return {"message": f"State created for {date}"}
    except FileNotFoundError:
        return {"error": f"Gazette input file for {date} not found."}

@app.post("/state/create/{date}")
def create_state_from_amendment(date: str):
    """
    Trigger processing of an amendment gazette and return the detected transactions.
    """
    try:
        transactions = gazette_processor.process_amendment_gazette(date)
        #state_manager.apply_transactions(transactions, date)
        return {
            "message": f"Amendment processed for {date}",
            "transactions": transactions
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