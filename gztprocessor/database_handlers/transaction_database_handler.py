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

