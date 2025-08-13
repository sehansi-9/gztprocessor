from gztprocessor.db_connections.db_trans import get_connection

def create_record(gazette_number: str, gazette_type: str, gazette_format: str):
    with get_connection() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO transactions (gazette_type, gazette_format, gazette_number)
            VALUES (?, ?, ?)
            """,
            (gazette_type, gazette_format, gazette_number)
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

def save_transactions(gazette_number: str, transactions_json: str):
    with get_connection() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            UPDATE transactions
            SET transactions = ?
            WHERE gazette_number = ?
            """,
            (transactions_json, gazette_number)
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
            return {"transactions": []}  # Always return a list for consistency
        return {"transactions": row[0]}
