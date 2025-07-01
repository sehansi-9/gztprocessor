# main.py
import os
from fastapi import FastAPI
from pathlib import Path

import state_manager

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


@app.post("/state/create/{date}")
def create_state_from_gazette(date: str):
    """
    Trigger state creation from input/gazette_<date>.json
    """
    try:
        state = state_manager.save_first_state(date)
        return {"message": f"State created for {date}", "state": state}
    except FileNotFoundError:
        return {"error": f"Gazette input file for {date} not found."}
