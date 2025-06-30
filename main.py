# main.py
from fastapi import FastAPI
from pathlib import Path

import state_manager

app = FastAPI()

@app.get("/")
def root():
    return {"message": "Gazette Processor backend running."}


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
