# main.py
from fastapi import FastAPI

from db_connections.db_gov import init_db
from routes.mindep_router import router as mindep_router

if __name__ == "__main__":
    init_db()
    print("✅ Database initialized.")

app = FastAPI()
app.include_router(mindep_router)


@app.get("/")
def root():
    return {"message": "Gazette Processor backend running."}