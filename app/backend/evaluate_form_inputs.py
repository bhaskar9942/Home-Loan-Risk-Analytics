"""How much does the 11-field form lose compared with complete records? Read-only."""
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import train_test_split

ROOT = Path(__file__).resolve().parents[2]
THRESHOLD = 0.1

model = joblib.load(ROOT / "models" / "gradient_boosting_model.pkl")
pre = joblib.load(ROOT / "models" / "home_loan_preprocessor.pkl")
COLUMNS = list(pre.feature_names_in_)

df = pd.read_csv(ROOT / "data" / "raw" / "application_train.csv")

# The notebook's feature engineering (cells 66, 71, 72, 100) and X (cell 134)
nb = df.copy()
nb["AGE_YEARS"] = nb["DAYS_BIRTH"].abs() / 365.25
nb["CREDIT_INCOME_RATIO"] = nb["AMT_CREDIT"] / nb["AMT_INCOME_TOTAL"]
nb["ANNUITY_INCOME_RATIO"] = nb["AMT_ANNUITY"] / nb["AMT_INCOME_TOTAL"]
nb["EMPLOYMENT_ANOMALY"] = (nb["DAYS_EMPLOYED"] == 365243).astype(int)
nb["DAYS_EMPLOYED_CLEAN"] = nb["DAYS_EMPLOYED"].replace(365243, np.nan)
X = nb.drop(columns=["TARGET", "DAYS_EMPLOYED"])[COLUMNS]
y = df["TARGET"]
cat_cols = list(X.select_dtypes(exclude="number").columns)

# Same split settings as notebook cell 135
_, test_pos = train_test_split(np.arange(len(df)), test_size=0.20,
                               random_state=42, stratify=y)
X_test = X.iloc[test_pos]
y_test = y.iloc[test_pos].to_numpy()
print("Test rows:", len(X_test), "| defaulters:", int(y_test.sum()))


def score(frame):
    return model.predict_proba(pre.transform(frame))[:, 1]


def keep_only(columns):
    frame = pd.DataFrame(np.nan, index=X_test.index, columns=COLUMNS)
    for c in cat_cols:
        frame[c] = pd.Series([np.nan] * len(frame), index=frame.index, dtype=object)
    for c in columns:
        frame[c] = X_test[c]
    if "EMPLOYMENT_ANOMALY" in columns:
        frame["EMPLOYMENT_ANOMALY"] = 0  # the form cannot express the placeholder
    return frame


BASIC = ["NAME_CONTRACT_TYPE", "NAME_EDUCATION_TYPE", "AMT_INCOME_TOTAL", "AMT_CREDIT",
         "AMT_ANNUITY", "DAYS_BIRTH", "AGE_YEARS", "CREDIT_INCOME_RATIO",
         "ANNUITY_INCOME_RATIO", "EMPLOYMENT_ANOMALY"]
OPTIONAL = ["AMT_GOODS_PRICE", "DAYS_EMPLOYED_CLEAN"]
SCORES = ["EXT_SOURCE_1", "EXT_SOURCE_2", "EXT_SOURCE_3"]

scenarios = {
    "1. All 125 columns (notebook)": X_test,
    "2. All 11 form fields": keep_only(BASIC + OPTIONAL + SCORES),
    "3. Form without external scores": keep_only(BASIC + OPTIONAL),
    "4. Required fields only": keep_only(BASIC),
}

print("\n=== Performance at threshold 0.1 ===")
probabilities = {}
for name, frame in scenarios.items():
    p = score(frame)
    probabilities[name] = p
    flagged = p >= THRESHOLD
    tp = int((flagged & (y_test == 1)).sum())
    print(f"{name:34s} AUC {roc_auc_score(y_test, p):.4f} | flagged "
          f"{flagged.mean() * 100:5.1f}% | recall {tp / y_test.sum() * 100:5.1f}% | "
          f"precision {tp / max(int(flagged.sum()), 1) * 100:5.1f}%")

p_full = probabilities["1. All 125 columns (notebook)"]
flagged = p_full >= THRESHOLD
tp = int((flagged & (y_test == 1)).sum())
fp = int((flagged & (y_test == 0)).sum())
fn = int((~flagged & (y_test == 1)).sum())
print(f"\nNotebook check (all columns): true positives {tp}, false negatives {fn}, "
      f"false positives {fp}")
print("Notebook reported: 2857, 2108, 12194 and ROC-AUC 0.7529")


def calibration(name, p):
    bands = pd.cut(p, bins=[0, 0.05, 0.10, 0.20, 0.40, 1.01], right=False,
                   labels=["under 5%", "5-10%", "10-20%", "20-40%", "40% and above"])
    table = (pd.DataFrame({"band": bands, "p": p, "y": y_test})
             .groupby("band", observed=True)
             .agg(applicants=("y", "size"), avg_predicted=("p", "mean"),
                  actual_rate=("y", "mean")))
    table["avg_predicted"] = (table["avg_predicted"] * 100).round(1)
    table["actual_rate"] = (table["actual_rate"] * 100).round(1)
    print(f"\n=== Calibration: {name} (percent) ===")
    print(f"Mean predicted: {p.mean() * 100:.2f}% | actual default rate: "
          f"{y_test.mean() * 100:.2f}%")
    print(table.to_string())


calibration("all 125 columns", p_full)
calibration("all 11 form fields", probabilities["2. All 11 form fields"])