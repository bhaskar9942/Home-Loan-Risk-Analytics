"""Evaluate the form when only some external scores are entered. Read-only."""
from itertools import combinations
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
print("Test rows:", len(X_test), "| defaulters:", int(y_test.sum()),
      "| actual default rate: %.2f%%" % (y_test.mean() * 100))

SCORES = ["EXT_SOURCE_1", "EXT_SOURCE_2", "EXT_SOURCE_3"]
print("\nShare of test applicants with the score truly missing in the data:")
print((X_test[SCORES].isna().mean() * 100).round(1).to_string())
print("Applicants missing all three scores: %.2f%%" % (X_test[SCORES].isna().all(axis=1).mean() * 100))
print("Applicants with all three scores present: %.1f%%" % (X_test[SCORES].notna().all(axis=1).mean() * 100))

BASIC = ["NAME_CONTRACT_TYPE", "NAME_EDUCATION_TYPE", "AMT_INCOME_TOTAL", "AMT_CREDIT",
         "AMT_ANNUITY", "DAYS_BIRTH", "AGE_YEARS", "CREDIT_INCOME_RATIO",
         "ANNUITY_INCOME_RATIO", "EMPLOYMENT_ANOMALY"]
OPTIONAL = ["AMT_GOODS_PRICE", "DAYS_EMPLOYED_CLEAN"]


def keep_only(columns):
    frame = pd.DataFrame(np.nan, index=X_test.index, columns=COLUMNS)
    for c in cat_cols:
        frame[c] = pd.Series([np.nan] * len(frame), index=frame.index, dtype=object)
    for c in columns:
        frame[c] = X_test[c]
    frame["EMPLOYMENT_ANOMALY"] = 0  # the form cannot express the placeholder
    return frame


def score(frame):
    return model.predict_proba(pre.transform(frame))[:, 1]


def worst_band_gap(p):
    bands = pd.cut(p, bins=[0, 0.05, 0.10, 0.20, 0.40, 1.01], right=False)
    t = (pd.DataFrame({"b": bands, "p": p, "y": y_test})
         .groupby("b", observed=True)
         .agg(n=("y", "size"), pred=("p", "mean"), act=("y", "mean")))
    t = t[t["n"] >= 500]
    return float((t["pred"] - t["act"]).abs().max() * 100)


print("\n=== Form with other fields entered, by external scores entered ===")
print("(all other form fields use real values; blank scores are filled by the preprocessor)")
header = (f"{'Scores entered':16s}{'AUC':>7s}{'vs all 3':>9s}{'Flagged':>9s}"
          f"{'Recall':>8s}{'Precis.':>9s}{'Mean pred':>10s}{'Max band gap':>14s}")
print(header)

reference_auc = None
for r in (3, 2, 1, 0):
    for combo in combinations(SCORES, r):
        label = "+".join(c[-1] for c in combo) if combo else "none"
        p = score(keep_only(BASIC + OPTIONAL + list(combo)))
        auc = roc_auc_score(y_test, p)
        if reference_auc is None:
            reference_auc = auc
        flagged = p >= THRESHOLD
        tp = int((flagged & (y_test == 1)).sum())
        print(f"{label:16s}{auc:7.4f}{auc - reference_auc:9.4f}{flagged.mean() * 100:8.1f}%"
              f"{tp / y_test.sum() * 100:7.1f}%{tp / max(int(flagged.sum()), 1) * 100:8.1f}%"
              f"{p.mean() * 100:9.2f}%{worst_band_gap(p):13.1f}pt")