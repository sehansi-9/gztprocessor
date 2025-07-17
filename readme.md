# Gazette Processor API

A FastAPI backend for tracking and versioning structural changes in Sri Lankan government gazettes. Supports both:
- **MinDep**: Ministries and Departments (structural changes, e.g. ADD, TERMINATE, MOVE)
- **Person**: Person-portfolio assignments (appointments, removals, renames)

---

## Features
- Track and version changes in ministries/departments and person-portfolio assignments
- Detect and classify transactions: `ADD`, `TERMINATE`, `MOVE`, `RENAME`
- Expose REST API endpoints for loading, reviewing, applying, and resetting state
- Maintain versioned state snapshots for rollback/history
- Output CSVs for transactions

---

## Project Structure

```
.
├── main.py                      # FastAPI application entrypoint
├── csv_writer.py                # CSV output for transactions
├── utils.py                     # Utility functions (JSON loading, etc.)
├── database_handlers/           # DB logic for MinDep and Person
│   ├── mindep_database_handler.py
│   └── person_database_handler.py
├── db_connections/              # DB connection/init for MinDep and Person
│   ├── db_gov.py
│   └── db_person.py
├── gazette_processors/          # Gazette parsing and transaction detection
│   ├── mindep_gazette_processor.py
│   └── person_gazette_processor.py
├── input/                       # Gazette input files (by type/date/gazette)
│   ├── mindep/
│   └── person/
├── output/                      # Output CSVs (by type/date/gazette)
├── request_body/                # Sample request payloads
├── routes/                      # FastAPI routers for endpoints
│   ├── mindep_router.py
│   ├── person_router.py
│   └── state_router.py
├── schemas/                     # DB schema (SQL)
├── state/                       # Versioned state snapshots (by type)
│   ├── mindep/
│   └── person/
├── state_managers/              # State snapshot management
│   ├── mindep_state_manager.py
│   ├── person_state_manager.py
│   └── state_manager.py
└── readme.md
```

---

## Setup

1. **Install dependencies**
   ```bash
   pip install fastapi uvicorn rapidfuzz nltk
   ```
   (You may also need: `pip install python-multipart` for some FastAPI features.)

2. **Initialize databases**
   ```bash
   python main.py
   ```
   This creates SQLite DBs for both MinDep and Person.

3. **Run the API**
   ```bash
   uvicorn main:app --reload
   ```

4. **Ensure required folders exist**
   ```bash
   mkdir -p state/mindep state/person input/mindep input/person output/mindep output/person
   ```

---

## Input Formats

### MinDep Initial Gazette
For `/mindep/initial/{date}/{gazette_number}`:
```json
{
  "ministers": [
    {
      "name": "Minister of X",
      "departments": ["Dept A", "Dept B", "Dept C"]
    }
  ]
}
```

### MinDep Amendment Gazette
For `/mindep/amendment/{date}/{gazette_number}`:
```json
{
  "ADD": [
    { "ministry_name": "Minister of X", "affected_column": "II", "details": ["Inserted: item 4 — Department Y"] }
  ],
  "OMIT": [
    { "ministry_name": "Minister of Y", "affected_column": "II", "details": ["Omitted: item 6"] }
  ]
}
```

### Person Gazette (ADD/TERMINATE/RENAME)
For `/person/{date}/{gazette_number}`:
```json
{
  "ADD": [
    { "name": "Hon. Kabir Hashim", "Ministry": "Ministry of Roads and Highways", "date": "2018-07-15", "position": "Minister" }
  ],
  "TERMINATE": [
    { "name": "Hon. Thalatha Atukorale", "Ministry": "Ministry of Justice and Prison Reforms", "date": "2018-07-15", "position": "Minister" }
  ],
  "RENAME": [
    { "name": "Dr. Sarath Amunugama", "old ministry": "Ministry of Skills Development & Vocational Training", "new ministry": "Ministry of Skills Development, Vocational Training and Innovation", "date": "2018-06-20", "position": "Minister" }
  ]
}
```

---

## How It Works

### MinDep Flow
1. **Load initial state** from input file (JSON)
2. **Review** tabular content via GET endpoint
3. **POST** reviewed content to create initial state
4. **GET** amendment transactions (MOVE, ADD, TERMINATE) for review
5. **POST** reviewed transactions to update state
6. **Repeat** for further amendments
7. Each amendment is compared to previous state; transactions are applied to DB and a new JSON snapshot is saved

### Person Flow
1. **Load person gazette** (JSON with ADD/TERMINATE/RENAME)
2. **GET** predicted transactions for review
3. **POST** reviewed transactions to update state
4. **Repeat** for further gazettes
5. Each change is applied to DB and a new JSON snapshot is saved

---

## API Endpoints

### MinDep Endpoints
| Endpoint                                         | Method | Description                                                      |
| ------------------------------------------------ | ------ | ---------------------------------------------------------------- |
| `/mindep/state/latest`                           | GET    | Get latest saved state (gazette number, date, state)             |
| `/mindep/state/{date}`                           | GET    | Get state(s) for a specific date; returns gazette numbers if multiple |
| `/mindep/state/{date}/{gazette_number}`          | GET    | Get a specific state by date and gazette number                  |
| `/mindep/state/{date}/{gazette_number}`          | POST   | Load state snapshot into DB for a specific date and gazette      |
| `/mindep/initial/{date}/{gazette_number}`        | GET    | Preview contents of initial gazette                              |
| `/mindep/initial/{date}/{gazette_number}`        | POST   | Create initial state in DB & save snapshot                       |
| `/mindep/amendment/{date}/{gazette_number}`      | GET    | Detect transactions from amendment                               |
| `/mindep/amendment/{date}/{gazette_number}`      | POST   | Apply confirmed transactions to DB & snapshot                    |

### Person Endpoints
| Endpoint                                         | Method | Description                                                      |
| ------------------------------------------------ | ------ | ---------------------------------------------------------------- |
| `/person/state/latest`                           | GET    | Get latest saved persons and their portfolios                                     |
| `/person/state/{date}`                           | GET    | Get persons and portfolios for a specific date                          |
| `/person/state/{date}/{gazette_number}`          | GET    | Get a specific person and portfolio state by date and gazette number           |
| `/person/{date}/{gazette_number}`                | GET    | Preview predicted transactions from person gazette               |
| `/person/{date}/{gazette_number}`                | POST   | Apply reviewed transactions to DB & save snapshot                |

### System Reset
| Endpoint | Method   | Description                           |
| -------- | -------- | ------------------------------------- |
| `/mindep/state/reset` | DELETE | Deletes all MinDep state files and DB |
| `/person/state/reset` | DELETE | Deletes all Person state files and DB |

---

## Transaction Types

### MinDep
| Type        | Description                                                         |
| ----------- | ------------------------------------------------------------------- |
| `ADD`       | Department newly inserted in a ministry                             |
| `TERMINATE` | Department removed and not found elsewhere                          |
| `MOVE`      | Department omitted in one ministry and added in another (same name) |

### Person
| Type        | Description                                                         |
| ----------- | ------------------------------------------------------------------- |
| `ADD`       | Person assigned to a ministry/portfolio                             |
| `TERMINATE` | Person removed from a ministry/portfolio                            |
| `MOVE`      | Person moved from one ministry/portfolio to another                 |
| `RENAME`    | Ministry/portfolio renamed for a person                             |

---

## State Snapshot Formats

### MinDep Example
```json
{
  "ministers": [
    {
      "name": "Minister of Finance",
      "departments": [
        "Department of Treasury",
        "Inland Revenue",
        "Customs"
      ]
    }
  ]
}
```
Saved as: `state/mindep/state_{gazette_number}_{YYYY-MM-DD}.json`

### Person Example
```json
{
  "persons": [
    {
      "person_name": "Hon. John Doe",
      "portfolios": [
        { "name": "Ministry of Roads and Highways", "position": "Minister" }
      ]
    }
  ]
}
```
Saved as: `state/person/state_{gazette_number}_{YYYY-MM-DD}.json`

---

## Developer Notes
- The system relies on department/person position for parsing and matching
- MOVEs are inferred by matching omitted/added names
- RENAMEs are detected for person gazettes when ministry/portfolio names change
- Snapshots enable rollback, history tracking, and diffing
- Input/output file naming conventions are important (see `utils.py`)
- **Stemming, Fuzzy Matching, and Scores:**
  - For person gazettes, the system uses stemming (via NLTK's PorterStemmer) and fuzzy string matching (via RapidFuzz) to compare ministry/portfolio names.
  - Ministry/portfolio names are lowercased, stopwords removed, and stemmed before comparison.
  - Fuzzy matching computes a similarity score (token sort ratio) between new and existing ministry/portfolio names.
  - If the score exceeds a threshold (default 70) or there is word overlap, the system suggests possible terminates for adds and moves.
  - These suggestions, along with their scores, are included in the API response to help users review and confirm transactions.

---

## Testing
- Use `curl` or Postman to test endpoints
- See `input/` for sample gazette files and dates/gazette numbers

Example:
```bash
curl http://127.0.0.1:8000/mindep/amendment/2022-09-16/2297-78
curl http://127.0.0.1:8000/person/2022-09-16/2068-06
```

