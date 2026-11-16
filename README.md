# Home Loan Risk Analytics

An end-to-end analytics project on home-loan applicant data: SQL business analysis in MySQL, a Power BI dashboard, a machine-learning model, and a Flask web application that gives a **decision-support estimate** for a loan applicant. It is meant to help a lender decide where to focus manual reviews. It is not an automatic approval or rejection tool.

## Business objective

Analyse applicant data to show where default risk concentrates, and estimate which applicants are more likely to default so that reviews can be prioritised. A person always makes the decision.

## Key results

Measured once on the project's own held-out test set (61,503 applicants, 4,965 of them defaulters) at a review threshold of 10%:

| Measure | Result |
|---|---|
| ROC-AUC, complete records | 0.7529 |
| Defaulters identified (recall) | 57.54% (2,857 of 4,965) |
| Precision | 18.98% |
| Applicants flagged for review | 15,051 of 61,503 (24.5%) |
| ROC-AUC, 11-field web form | 0.7418 |
| ROC-AUC, form with no external scores | 0.6444 |

Precision is low: most flagged applicants did not default. The threshold of 10% was the lowest value tested. These figures come from this project's own test set only and have not been checked on outside data.

## What the project covers

| Stage | What was done |
|---|---|
| Machine learning notebook | Data checks, EDA, cleaning, feature engineering, and four models compared (Logistic Regression, Random Forest, Decision Tree, Gradient Boosting). The final model is Gradient Boosting. |
| MySQL | Database and table created, 307,511 rows imported and checked against the CSV. |
| SQL business analysis | Twelve business questions answered in SQL (see highlights below). |
| Power BI | A dashboard built on a MySQL view, checked against the SQL results, exported to PDF. |
| Flask web application | A prediction API and a five-page website, with tests for the backend. |

## Findings from the SQL analysis

The overall default rate is 8.07% (24,825 of 307,511 applicants).

- Cash loans default more often than revolving loans: 8.35% against 5.48%.
- Default rate falls as external credit score 2 rises: 18.84% for scores under 0.2, down to 1.76% for 0.8 and above.
- Younger applicants default more often: 11.46% under age 30, against 4.92% at 60 and above.
- Education: 10.93% for lower secondary, against 5.36% for higher education.
- The three riskiest age-and-score segments hold about 6% of applicants but about 17% of defaulters.
- Credit history (the other source files) was not analysed in SQL or Power BI.

## Technology stack

| Area | Tools |
|---|---|
| Language and data | Python 3.9.6, pandas, NumPy, scikit-learn (Gradient Boosting), joblib, matplotlib, seaborn, Jupyter |
| Database | MySQL Server 8.0.46 and MySQL Workbench |
| Dashboard | Power BI Desktop |
| Backend | Flask 3.1.3 |
| Frontend | Plain HTML, CSS and JavaScript. No frameworks, no CDNs, no chart libraries (charts are hand-written SVG). |

## Architecture

```
application_train.csv
   |-- MySQL --> SQL business analysis --> view --> Power BI dashboard (PDF)
   |-- Notebook --> trained model + preprocessor (models/*.pkl)
                         |
               predict.py (validation, reliability rules, 10% threshold)
                         |
               Flask API (app.py) --> static HTML/CSS/JS pages in the browser
```

## The web application

The model and its saved preprocessor are used as trained. The form collects 11 fields.

- **Required:** loan type, education, income, loan amount, loan annuity, age.
- **Optional:** goods price, years employed, and external scores 1, 2 and 3.

The result is always worded "Above the review threshold" or "Below the review threshold". Each estimate also gets a reliability label that depends on which external scores were entered (measured on the test set):

| Scores entered | Reliability | ROC-AUC |
|---|---|---|
| 1, 2 and 3 | High | 0.7418 |
| 2 and 3 | Slightly reduced | 0.7339 |
| 1 and 2, or 1 and 3 | Reduced | 0.7081, 0.7089 |
| Score 2 only, or score 3 only | Low | 0.6968, 0.6950 |
| Score 1 only | Very low | 0.6652 |
| None | No risk label is shown | 0.6444 |

**Pages:** Home, Risk Prediction, Analytics, Dashboard and About.

- **Analytics** has two separate sections: fixed historical figures (model performance charts, each with a "View as table") and estimates made in the current browser tab. Those session estimates stay in the browser tab (`sessionStorage`) and keep only a short summary, never the applicant's income, loan amount, annuity, age or other entered values.
- **Dashboard** shows the Power BI report as a PDF.

**API:** `GET /health`, `GET /options`, `POST /predict`, `GET /dashboard.pdf`, and the page routes.

## Dataset

The project uses `application_train.csv`: 307,511 rows and 122 columns, where `TARGET` is 1 for a defaulter (8.07%) and 0 otherwise.

**The dataset is not included in this repository and must be obtained separately.** Its source is not documented here yet. Where a part of the project needs it, place the file at `data/raw/application_train.csv`.

The original notebook also read six other files for data checks (`bureau`, `bureau_balance`, `POS_CASH_balance`, `credit_card_balance`, `previous_application` and `installments_payments`). These are not included either.

**What needs which data:**

| Part of the project | Data needed |
|---|---|
| Web application (run locally) | None. It uses only the two model files in `models/`, which are included. |
| `api_test.py` and `reliability_test.py` | None |
| `golden_test.py`, `evaluate_form_inputs.py`, `evaluate_score_subsets.py`, `inspect_model.py` | `application_train.csv` only |
| Loading the data into MySQL | `application_train.csv` only |
| Notebook | `application_train.csv` for its first cell and for the modelling work. The six other files above are read only by data-check cells near the start of the notebook (file loading, missing-value and duplicate checks); the modelling does not use them. Without them the notebook cannot be run in full (see Limitations). |

## Installation and running

Developed and tested on Windows with PowerShell. Python 3.9 is recommended (the model was built with 3.9.6).

**A. Run the web application (no dataset needed)**

```powershell
git clone <repository-url>
cd <repository-folder>
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app\backend\app.py
```

Then open http://127.0.0.1:5000 in a browser. Stop the server with Ctrl + C. This is Flask's development server, for local use only.

**B. Run the tests that need no dataset** (same environment, from the project root)

```powershell
python app\backend\api_test.py
python app\backend\reliability_test.py
```

**C. Run the scripts that need the dataset**

First obtain `application_train.csv` and place it at `data\raw\application_train.csv`. Then, from the project root:

```powershell
python app\backend\golden_test.py
python app\backend\evaluate_form_inputs.py
python app\backend\evaluate_score_subsets.py
python app\backend\inspect_model.py
```

`golden_test.py` checks the web form's prediction path against the notebook's own logic and takes 1 to 2 minutes. The evaluate scripts measure how much accuracy the form loses and how reliability changes with the scores entered. `inspect_model.py` is a read-only inspection of the model and preprocessor.

**D. The notebook**

The first cell of `notebooks/home_lone.ipynb` reads `application_train.csv` by file name, so place the file in the notebook's working directory or change the path in that cell. The data-check cells near the start also read the six other files above (file loading, missing-value and duplicate checks) and will fail without them. The modelling cells do not use those files.

## Model dependency requirements

The saved model (`models/gradient_boosting_model.pkl`) and preprocessor (`models/home_loan_preprocessor.pkl`) were created with **scikit-learn 1.6.1** and **NumPy 2.0.2**. `requirements.txt` pins these versions. Do not upgrade or change them, because the files may not load, or may behave differently, with other versions. Only load pickle files from sources you trust.

## Rebuilding the database and dashboard

The SQL files in `sql/` are meant to be run in this order: `database_setup.sql`, `create_application_train.sql`, `load_application_train.sql`, `verify_import.sql`, `business_analysis.sql`, `dashboard_view.sql`. They were developed and run on MySQL Server 8.0.46; other versions were not tested.

`load_application_train.sql` loads the CSV from a folder your MySQL server allows (the `secure_file_priv` setting). Edit its file path to match your server.

The Power BI file (`.pbix`) is not included because it contains an imported copy of the data. The finished dashboard is included as `powerbi/home_loan_dashboard.pdf`. To rebuild it, connect Power BI Desktop to the MySQL view `vw_dashboard_applicants` in Import mode.

## Limitations

- It is a decision-support tool, not a loan decision.
- The trained model uses gender (its 6th most important input), which the form does not collect. The saved preprocessor fills it with the most frequent value in the training data (`F`). The model was deliberately left unchanged. `SK_ID_CURR` is also still a model input.
- The form is weaker than complete records (ROC-AUC 0.7418 against 0.7529), and much weaker with no external scores (0.6444).
- The model slightly under-estimates risk in the 20% to 40% range (average estimate 26.1%, actual 29.2%).
- All accuracy figures come from this project's own test set, with no external validation. They are fixed text on the pages and would need updating if the model changed.
- The data does not document the units of income and annuity, or what the external scores mean.
- The notebook cannot be run from top to bottom: it uses a variable (`X_train_scaled`) that is never defined, one cell was never run, and its data-check cells near the start read six other CSV files that are not included.
- Tested on Windows only. Other browsers, real phones and screen readers were not tested.

## Project structure

```
app/backend/       Flask app, prediction logic, tests and evaluation scripts
app/frontend/      HTML, CSS and JavaScript for the five pages
models/            Saved model and preprocessor
notebooks/         Machine-learning notebook
sql/               MySQL scripts
powerbi/           Dashboard PDF
reports/           Project reports 01 to 08
requirements.txt   Pinned Python packages
```

## Reports

`reports/` holds eight write-ups: existing work, database setup, SQL business analysis, Power BI dashboard, business insights, model inspection, app development, and website redesign.
