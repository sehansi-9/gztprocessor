
from fastapi import APIRouter

import utils as utils
from gztprocessor.database_handlers.transaction_database_handler import get_gazette_info

general_router = APIRouter()

@general_router.get("/info/{gazette_number}")
def get_gazette_info_route(gazette_number: str):
      info = get_gazette_info(gazette_number)  
      if info:
        return info
      return {"error": "No info found for gazette"}
    