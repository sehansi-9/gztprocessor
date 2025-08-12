DROP TABLE IF EXISTS transactions;

CREATE TABLE transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gazette_type TEXT NOT NULL,
    gazette_format TEXT NOT NULL,
    gazette_number TEXT NOT NULL,
    transactions TEXT CHECK(json_valid(transactions))
);
