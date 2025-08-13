import json
from gztprocessor.db_connections.db_trans import get_connection 

def create_record(gazette_number: str, gazette_type: str, gazette_format: str):
    with get_connection() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO transactions (gazette_number, gazette_type, gazette_format)
            SELECT ?, ?, ?
            WHERE NOT EXISTS (
                SELECT 1 FROM transactions WHERE gazette_number = ?
            )
            """,
            (gazette_number, gazette_type, gazette_format, gazette_number)
        )
        conn.commit()



def get_gazette_info(gazette_number: str):
    with get_connection() as conn:
        cur = conn.cursor()
        cur.execute(
            "SELECT gazette_type, gazette_format FROM transactions WHERE gazette_number = ?",
            (gazette_number,)
        )
        row = cur.fetchone()
        return {"gazette_type": row[0], "gazette_format": row[1]} if row else None


def save_transactions(gazette_number: str, data_json: dict):
    with get_connection() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            UPDATE transactions SET transactions = ? WHERE gazette_number = ?
            """,
            (json.dumps(data_json), gazette_number)
        )
        conn.commit()

def get_saved_transactions(gazette_number: str):
    with get_connection() as conn:
        cur = conn.cursor()
        cur.execute(
            "SELECT transactions FROM transactions WHERE gazette_number = ?",
            (gazette_number,)
        )
        row = cur.fetchone()
        if not row or row[0] is None:
            return {"transactions": [], "moves": []}
        return json.loads(row[0])  # Now returns entire saved object with transactions and moves


