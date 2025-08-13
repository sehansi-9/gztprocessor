import json
from typing import Dict, List
from fastapi import APIRouter
from fastapi.params import Body

import utils as utils
from gztprocessor.database_handlers.transaction_database_handler import get_gazette_info
from gztprocessor.database_handlers.transaction_database_handler import (
    save_transactions,
)
from gztprocessor.database_handlers.transaction_database_handler import (
    get_saved_transactions,
)

general_router = APIRouter()

@general_router.get("/info/{gazette_number}")
def get_gazette_info_route(gazette_number: str):
    info = get_gazette_info(gazette_number)
    if info:
        return info
    return {"error": "No info found for gazette"}


@general_router.post("/transactions/{gazette_number}")
def save_current_transactions(
    gazette_number: str, transactions_json: List[Dict] = Body(...)
):
    transactions_str = json.dumps(transactions_json)
    save_transactions(gazette_number, transactions_str)
    return {"status": "success"}

@general_router.get("/transactions/{gazette_number}")
def load_transactions(gazette_number: str):
    result = get_saved_transactions(gazette_number)
    return {"transactions": json.loads(result["transactions"])}

