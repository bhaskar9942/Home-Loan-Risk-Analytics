"""Golden test: checks predict.py against the notebook's own logic. Changes nothing."""
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

import predict  # the code under test

ROOT = Path(__file__).resolve().parents[2]
CSV = ROOT / "data" / "raw" / "application_train.csv"
TOLERANCE = 1e-9
THRESHOLD = 0.1

# Independent copies of the saved objects, so this test shares no state with predict.py
model = joblib.load(ROOT / "models" / "gradient_boosting_model.pkl")
pre = joblib.load(ROOT / "models" / "home_loan_preprocessor.pkl")
COLUMNS = list(pre.feature_names_in_)

df = pd.read_csv(CSV)

# The notebook's own feature engineering (cells 66, 71, 72, 100) and X (cell 134)
nb = df.copy()
nb["AGE_YEARS"] = nb["DAYS_BIRTH"].abs() / 365.25
nb["CREDIT_INCOME_RATIO"] = nb["AMT_CREDIT"] / nb["AMT_INCOME_TOTAL"]
nb["ANNUITY_INCOME_RATIO"] = nb["AMT_ANNUITY"] / nb["AMT_INCOME_TOTAL"]
nb["EMPLOYMENT_ANOMALY"] = (nb["DAYS_EMPLOYED"] == 365243).astype(int)
nb["DAYS_EMPLOYED_CLEAN"] = nb["DAYS_EMPLOYED"].replace(365243, np.nan)
X = nb.drop(columns=["TARGET", "DAYS_EMPLOYED"])[COLUMNS]
cat_cols = list(X.select_dtypes(exclude="number").columns)

# ---------- A. Complete records ----------
rng = np.random.default_rng(42)
idx = list(rng.choice(df.index.to_numpy(), size=2000, replace=False))
edge = [
    df.index[df["DAYS_EMPLOYED"] == 365243][0],
    df.index[df["EXT_SOURCE_1"].isna()][0],
    df.index[df["AMT_ANNUITY"].isna()][0],
    df.index[df["AMT_GOODS_PRICE"].isna()][0],
    df.index[df["OWN_CAR_AGE"].notna()][0],
]
idx = list(dict.fromkeys(idx + edge))
p_notebook = model.predict_proba(pre.transform(X.loc[idx]))[:, 1]
p_app = predict.score_frame(predict.to_model_frame(df.loc[idx]))
diff_a = np.abs(p_notebook - p_app)
flips_a = int(((p_notebook >= THRESHOLD) != (p_app >= THRESHOLD)).sum())
print("=== A. Complete records ===")
print("Rows tested:", len(idx), "(including the placeholder, missing-score, "
      "missing-annuity and missing-goods-price rows)")
print("Largest probability difference:", float(diff_a.max()))
print("Rows where the 0.1 decision differs:", flips_a)
print("RESULT:", "PASS" if diff_a.max() < TOLERANCE and flips_a == 0 else "FAIL")

# ---------- B. Form path ----------
ok = df[(df["AMT_ANNUITY"].notna()) & (df["DAYS_EMPLOYED"] != 365243)
        & (df["DAYS_BIRTH"].abs() / 365.25).between(18, 100)
        & (df["DAYS_EMPLOYED"].abs() <= df["DAYS_BIRTH"].abs())]
rows = ok.sample(500, random_state=7).index.tolist()
rows += ok.index[ok["AMT_GOODS_PRICE"].isna()][:1].tolist()
rows += ok.index[ok["EXT_SOURCE_1"].isna()][:1].tolist()
rows = list(dict.fromkeys(rows))


def nn(value):
    return None if pd.isna(value) else float(value)


def form_values(r):
    return {
        "loan_type": r["NAME_CONTRACT_TYPE"], "education": r["NAME_EDUCATION_TYPE"],
        "income": float(r["AMT_INCOME_TOTAL"]), "loan_amount": float(r["AMT_CREDIT"]),
        "annuity": float(r["AMT_ANNUITY"]), "goods_price": nn(r["AMT_GOODS_PRICE"]),
        "age_years": abs(float(r["DAYS_BIRTH"])) / 365.25,
        "years_employed": abs(float(r["DAYS_EMPLOYED"])) / 365.25,
        "ext_source_1": nn(r["EXT_SOURCE_1"]), "ext_source_2": nn(r["EXT_SOURCE_2"]),
        "ext_source_3": nn(r["EXT_SOURCE_3"]),
    }


p_form = []
for i in rows:
    frame, _ = predict.build_model_frame(form_values(df.loc[i]))
    p_form.append(float(predict.score_frame(frame)[0]))
p_form = np.array(p_form)

KEEP = ["NAME_CONTRACT_TYPE", "NAME_EDUCATION_TYPE", "AMT_INCOME_TOTAL", "AMT_CREDIT",
        "AMT_ANNUITY", "AMT_GOODS_PRICE", "DAYS_BIRTH", "EXT_SOURCE_1", "EXT_SOURCE_2",
        "EXT_SOURCE_3", "AGE_YEARS", "CREDIT_INCOME_RATIO", "ANNUITY_INCOME_RATIO",
        "EMPLOYMENT_ANOMALY", "DAYS_EMPLOYED_CLEAN"]
partial = pd.DataFrame(np.nan, index=rows, columns=COLUMNS)
for c in cat_cols:
    partial[c] = pd.Series([np.nan] * len(rows), index=rows, dtype=object)
for c in KEEP:
    partial[c] = X.loc[rows, c]
p_nb_partial = model.predict_proba(pre.transform(partial))[:, 1]
diff_b = np.abs(p_nb_partial - p_form)
flips_b = int(((p_nb_partial >= THRESHOLD) != (p_form >= THRESHOLD)).sum())
print("\n=== B. Form path (11 form values from real applicants) ===")
print("Rows tested:", len(rows))
print("Largest probability difference:", float(diff_b.max()))
print("Rows where the 0.1 decision differs:", flips_b)
print("RESULT:", "PASS" if diff_b.max() < TOLERANCE and flips_b == 0 else "FAIL")

# ---------- C. Sensitivity ----------
print("\n=== C. Do optional fields change the prediction? (first 100 rows of B) ===")
for field in ["goods_price", "years_employed", "ext_source_1", "ext_source_2", "ext_source_3"]:
    changed, used = 0, 0
    for i in rows[:100]:
        values = form_values(df.loc[i])
        if values[field] is None:
            continue
        used += 1
        without = dict(values, **{field: None})
        p_with = float(predict.score_frame(predict.build_model_frame(values)[0])[0])
        p_without = float(predict.score_frame(predict.build_model_frame(without)[0])[0])
        changed += abs(p_with - p_without) > TOLERANCE
    print(f"Removing {field}: prediction changed for {changed} of {used} rows")