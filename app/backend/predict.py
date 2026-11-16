"""Prediction logic for the Home Loan Risk app.

Builds the 125-column row that the saved preprocessor expects, applies the saved
preprocessor and model, and returns the estimated default probability.
Nothing is retrained and nothing is fitted here.
"""
import math
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
MODEL_PATH = ROOT / "models" / "gradient_boosting_model.pkl"
PREPROCESSOR_PATH = ROOT / "models" / "home_loan_preprocessor.pkl"

THRESHOLD = 0.1          # threshold selected in the notebook (cell 153)
BASE_RATE_PCT = 8.07     # overall default rate in application_train
DAYS_PER_YEAR = 365.25   # same constant the notebook uses for AGE_YEARS
PLACEHOLDER = 365243     # placeholder value in DAYS_EMPLOYED
MAX_AMOUNT = 1_000_000_000

_model = joblib.load(MODEL_PATH)
_preprocessor = joblib.load(PREPROCESSOR_PATH)
INPUT_COLUMNS = list(_preprocessor.feature_names_in_)


def _read_preprocessor(pre):
    """Find the categorical columns and their valid values inside the fitted preprocessor."""
    categorical, categories = [], {}
    for name, trans, cols in pre.transformers_:
        if name == "remainder":
            continue
        steps = trans.steps if hasattr(trans, "steps") else [("single", trans)]
        for _, step in steps:
            if hasattr(step, "categories_"):
                categorical.extend(list(cols))
                for col, cats in zip(cols, step.categories_):
                    categories[col] = [str(c) for c in cats]
    return categorical, categories


CATEGORICAL_COLUMNS, CATEGORY_VALUES = _read_preprocessor(_preprocessor)

# form key: (label, required, minimum, maximum)
NUMBER_FIELDS = {
    "income": ("Income", True, 1, MAX_AMOUNT),
    "loan_amount": ("Loan amount", True, 1, MAX_AMOUNT),
    "annuity": ("Loan annuity", True, 1, MAX_AMOUNT),
    "goods_price": ("Goods price", False, 1, MAX_AMOUNT),
    "age_years": ("Age in years", True, 18, 100),
    "years_employed": ("Years employed", False, 0, 60),
    "ext_source_1": ("External score 1", False, 0, 1),
    "ext_source_2": ("External score 2", False, 0, 1),
    "ext_source_3": ("External score 3", False, 0, 1),
}
# form key: (label, dataset column)
CHOICE_FIELDS = {
    "loan_type": ("Loan type", "NAME_CONTRACT_TYPE"),
    "education": ("Education", "NAME_EDUCATION_TYPE"),
}


class InputError(ValueError):
    """Raised when the submitted values are missing or invalid."""


def _fmt(x):
    return f"{x:,.0f}" if x >= 1000 else f"{x:g}"


def validate_inputs(data):
    """Check the submitted values and return a clean dictionary (blank optional fields = None)."""
    if not isinstance(data, dict):
        raise InputError("Input must be a JSON object.")
    clean, errors = {}, []

    for key, (label, required, low, high) in NUMBER_FIELDS.items():
        value = data.get(key)
        if value is None or (isinstance(value, str) and value.strip() == ""):
            if required:
                errors.append(f"{label} is required.")
            clean[key] = None
            continue
        if isinstance(value, bool):
            errors.append(f"{label} must be a number.")
            continue
        try:
            number = float(value)
        except (TypeError, ValueError):
            errors.append(f"{label} must be a number.")
            continue
        if not math.isfinite(number) or number < low or number > high:
            errors.append(f"{label} must be between {_fmt(low)} and {_fmt(high)}.")
            continue
        clean[key] = number

    for key, (label, column) in CHOICE_FIELDS.items():
        value = data.get(key)
        if value is None or str(value).strip() == "":
            errors.append(f"{label} is required.")
            continue
        value = str(value).strip()
        if value not in CATEGORY_VALUES[column]:
            errors.append(f"{label} must be one of: " + ", ".join(CATEGORY_VALUES[column]) + ".")
            continue
        clean[key] = value

    if (not errors and clean["years_employed"] is not None
            and clean["years_employed"] > clean["age_years"]):
        errors.append("Years employed cannot be greater than age.")

    if errors:
        error = InputError(" ".join(errors))
        error.errors = errors
        raise error
    return clean


def add_engineered_features(df):
    """The five engineered features, with the same formulas as the notebook
    (cells 66, 71, 72 and 100)."""
    out = df.copy()
    out["AGE_YEARS"] = out["DAYS_BIRTH"].abs() / DAYS_PER_YEAR
    out["CREDIT_INCOME_RATIO"] = out["AMT_CREDIT"] / out["AMT_INCOME_TOTAL"]
    out["ANNUITY_INCOME_RATIO"] = out["AMT_ANNUITY"] / out["AMT_INCOME_TOTAL"]
    out["EMPLOYMENT_ANOMALY"] = (out["DAYS_EMPLOYED"] == PLACEHOLDER).astype(int)
    out["DAYS_EMPLOYED_CLEAN"] = out["DAYS_EMPLOYED"].replace(PLACEHOLDER, np.nan)
    return out


def to_model_frame(raw):
    """Return the exact 125-column frame the preprocessor expects.
    Columns that are not supplied stay blank (NaN) and are filled by the saved preprocessor."""
    engineered = add_engineered_features(raw)
    frame = pd.DataFrame(np.nan, index=engineered.index, columns=INPUT_COLUMNS)
    for col in CATEGORICAL_COLUMNS:
        frame[col] = pd.Series([np.nan] * len(frame), index=frame.index, dtype=object)
    for col in INPUT_COLUMNS:
        if col in engineered.columns:
            frame[col] = engineered[col]
    return frame


def score_frame(frame):
    """Estimated default probability for each row of a 125-column frame."""
    return _model.predict_proba(_preprocessor.transform(frame))[:, 1]


def _blank_if_none(value):
    return np.nan if value is None else value


def build_model_frame(data):
    """Validate the form values and build the 125-column row."""
    clean = validate_inputs(data)
    years = clean["years_employed"]
    raw = pd.DataFrame({
        "NAME_CONTRACT_TYPE": [clean["loan_type"]],
        "NAME_EDUCATION_TYPE": [clean["education"]],
        "AMT_INCOME_TOTAL": [clean["income"]],
        "AMT_CREDIT": [clean["loan_amount"]],
        "AMT_ANNUITY": [clean["annuity"]],
        "AMT_GOODS_PRICE": [_blank_if_none(clean["goods_price"])],
        "DAYS_BIRTH": [-clean["age_years"] * DAYS_PER_YEAR],
        "DAYS_EMPLOYED": [np.nan if years is None else -years * DAYS_PER_YEAR],
        "EXT_SOURCE_1": [_blank_if_none(clean["ext_source_1"])],
        "EXT_SOURCE_2": [_blank_if_none(clean["ext_source_2"])],
        "EXT_SOURCE_3": [_blank_if_none(clean["ext_source_3"])],
    })
    return to_model_frame(raw), clean


# Measured on the notebook's test set with evaluate_score_subsets.py (threshold 0.1).
FULL_AUC, FULL_RECALL = 0.7418, 56.2
RELIABILITY = {
    (1, 2, 3): {"level": "High", "auc": 0.7418, "recall_pct": 56.2},
    (2, 3): {"level": "Slightly reduced", "auc": 0.7339, "recall_pct": 55.7},
    (1, 2): {"level": "Reduced", "auc": 0.7081, "recall_pct": 46.6},
    (1, 3): {"level": "Reduced", "auc": 0.7089, "recall_pct": 39.2},
    (2,): {"level": "Low", "auc": 0.6968, "recall_pct": 45.3},
    (3,): {"level": "Low", "auc": 0.6950, "recall_pct": 37.2},
    (1,): {"level": "Very low", "auc": 0.6652, "recall_pct": 14.6},
}
UNDERESTIMATES = {"Reduced", "Low", "Very low"}
NOTE = ("Decision-support estimate only. It is not a loan decision. "
        "Fields that were not entered are filled with typical values.")
INSUFFICIENT_MESSAGE = (
    "Please enter at least one external credit score (EXT_SOURCE 1, 2 or 3). "
    "Without any score the model cannot give a meaningful risk estimate: in testing "
    "it flagged almost no one (ROC-AUC 0.644).")


def reliability_for(entered):
    """entered: tuple of the external score numbers (1, 2, 3) that were provided."""
    info = RELIABILITY[entered]
    if info["level"] == "High":
        return {"level": "High", "warning": None}
    label = "score" if len(entered) == 1 else "scores"
    numbers = " and ".join(str(i) for i in entered)
    text = (f"Only external {label} {numbers} entered. In testing on historical data this "
            f"combination had ROC-AUC {info['auc']:.3f} (all three scores: {FULL_AUC:.3f}) "
            f"and identified about {info['recall_pct']:.1f}% of defaulters at the review "
            f"threshold (all three: {FULL_RECALL:.1f}%).")
    if info["level"] in UNDERESTIMATES:
        text += " The model also tends to under-estimate risk when scores are missing."
    text += " Enter all three scores for the most reliable estimate."
    return {"level": info["level"], "warning": text}


def predict_applicant(data):
    """Main function used by the app: validate, apply the reliability rules, predict."""
    frame, clean = build_model_frame(data)
    entered = tuple(i for i in (1, 2, 3) if clean[f"ext_source_{i}"] is not None)
    if not entered:
        return {"status": "insufficient_information",
                "message": INSUFFICIENT_MESSAGE, "note": NOTE}

    probability = float(score_frame(frame)[0])
    above = probability >= THRESHOLD
    reliability = reliability_for(entered)
    left_blank = [NUMBER_FIELDS[k][0] for k in NUMBER_FIELDS
                  if not NUMBER_FIELDS[k][1] and clean[k] is None]
    return {
        "status": "ok",
        "probability": round(probability, 4),
        "probability_pct": round(100 * probability, 2),
        "threshold_pct": round(100 * THRESHOLD, 2),
        "above_threshold": above,
        "risk_level": ("Above the review threshold" if above
                       else "Below the review threshold"),
        "base_rate_pct": BASE_RATE_PCT,
        "reliability": reliability["level"],
        "warning": reliability["warning"],
        "left_blank": left_blank,
        "note": NOTE,
    }