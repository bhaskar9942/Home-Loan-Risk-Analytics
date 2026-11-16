# Database Setup Report: MySQL

## 1. What was built
- Database: `home_loan_analytics` (MySQL Server 8.0.46, utf8mb4).
- Table: `application_train`, with 122 columns matching `application_train.csv`.
- Primary key: `SK_ID_CURR`.
- Column types: 41 `INT`, 65 `DOUBLE`, 16 `VARCHAR(100)`. The counts match the notebook's `df.info()` output (41 int64, 65 float64, 16 object).

## 2. How the data was loaded
- Method: `LOAD DATA INFILE`, reading the CSV from MySQL's permitted import folder (`secure_file_priv`).
- Empty cells were converted to `NULL` with `NULLIF(@var, '')`, so missing values were not turned into zeros.
- Quoted text containing commas (for example `"Stone, brick"`) was kept as one value.
- The Workbench import wizard was not used because it is very slow for 307,511 rows × 122 columns.

## 3. Problem encountered
- Workbench showed Error 2013 (lost connection) after 30 seconds. This was Workbench's default read timeout, not a data error.
- The load completed on the server (307,511 rows). The timeout setting should be raised before importing the larger datasets.

## 4. Verification against the original CSV
| Check | MySQL | Python |
|---|---|---|
| Total rows | 307,511 | 307,511 |
| Non-defaulters (TARGET = 0) | 282,686 | 282,686 |
| Defaulters (TARGET = 1) | 24,825 | 24,825 |
| Missing OWN_CAR_AGE | 202,929 | 202,929 |
| Missing OCCUPATION_TYPE | 96,391 | 96,391 |
| Missing EXT_SOURCE_1 | 173,378 | 173,378 |
| Missing AMT_ANNUITY | 12 | 12 |
| Average income | 168,797.92 | 168,797.92 |

All values match.

## 5. Scripts
- `sql/database_setup.sql`
- `sql/create_application_train.sql`
- `sql/load_application_train.sql`
- `sql/verify_import.sql`

## 6. Notes
- The load script contains a local file path and no passwords.
- The other six datasets are not loaded yet. They will be added only when a business question needs them.