"""Read-only inspection of the saved model and preprocessor. Changes nothing."""
from pathlib import Path
import joblib
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
model = joblib.load(ROOT / "models" / "gradient_boosting_model.pkl")
pre = joblib.load(ROOT / "models" / "home_loan_preprocessor.pkl")

input_cols = list(pre.feature_names_in_)
feat_names = list(pre.get_feature_names_out())

print("=== A. Objects ===")
print("Model type:", type(model).__name__)
print("Preprocessor type:", type(pre).__name__)
print("Input columns:", len(input_cols))
print("Transformed features (preprocessor output):", len(feat_names))
print("Model n_features_in_:", model.n_features_in_)
print("Compatible (equal):", model.n_features_in_ == len(feat_names))
print("Trees:", model.n_estimators_, "| learning_rate:", model.learning_rate,
      "| max_depth:", model.max_depth)

# Collect column types, categories and fill-in values from the fitted preprocessor
num_cols, cat_cols = [], []
imputer_values, categories = {}, {}
encoder_info = None
for name, trans, cols in pre.transformers_:
    if name == "remainder":
        continue
    steps = trans.steps if hasattr(trans, "steps") else [("single", trans)]
    kind = "num"
    for _, step in steps:
        if hasattr(step, "categories_"):
            kind = "cat"
            encoder_info = (step.handle_unknown, step.drop)
            for c, cats in zip(cols, step.categories_):
                categories[c] = list(cats)
        if hasattr(step, "statistics_"):
            for c, v in zip(cols, step.statistics_):
                imputer_values[c] = v
    (cat_cols if kind == "cat" else num_cols).extend(list(cols))

print("\n=== B. Column types ===")
print("Numeric input columns:", len(num_cols))
print("Categorical input columns:", len(cat_cols))
print("Categorical columns:", cat_cols)
print("Encoder (handle_unknown, drop):", encoder_info)
eng = ["AGE_YEARS", "CREDIT_INCOME_RATIO", "ANNUITY_INCOME_RATIO",
       "EMPLOYMENT_ANOMALY", "DAYS_EMPLOYED_CLEAN"]
print("Engineered columns in input:", [c for c in eng if c in input_cols])
print("DAYS_EMPLOYED in input:", "DAYS_EMPLOYED" in input_cols)
print("DAYS_BIRTH in input:", "DAYS_BIRTH" in input_cols)
print("SK_ID_CURR in input:", "SK_ID_CURR" in input_cols)

print("\n=== C. Dropdown values and fill-in values for blank fields ===")
for c in ["NAME_CONTRACT_TYPE", "NAME_EDUCATION_TYPE", "OCCUPATION_TYPE", "NAME_INCOME_TYPE"]:
    print(c, "-> values:", categories.get(c))
    print("    filled with when blank:", imputer_values.get(c))
for c in ["AMT_INCOME_TOTAL", "AMT_CREDIT", "AMT_ANNUITY", "AGE_YEARS", "DAYS_BIRTH",
          "DAYS_EMPLOYED_CLEAN", "EMPLOYMENT_ANOMALY", "EXT_SOURCE_1", "EXT_SOURCE_2", "EXT_SOURCE_3"]:
    print(c, "filled with when blank:", imputer_values.get(c))


def source_col(f):
    base = f.split("__", 1)[1] if "__" in f else f
    if base in input_cols:
        return base
    matches = [c for c in input_cols if base.startswith(c + "_")]
    return max(matches, key=len) if matches else None


imp = pd.Series(model.feature_importances_, index=feat_names)
src = pd.Series([source_col(f) for f in feat_names], index=feat_names)
by_col = imp.groupby(src).sum().sort_values(ascending=False)
rank = by_col.rank(ascending=False).astype(int)

print("\n=== D. Model importance by input column ===")
print("Transformed features not matched to an input column:", int(src.isna().sum()))
print("Top 20 input columns:")
print(by_col.head(20).round(4).to_string())
print("Share held by the top 10 columns:", round(by_col.head(10).sum(), 4))
print("Importance and rank of candidate form fields:")
for c in ["EXT_SOURCE_1", "EXT_SOURCE_2", "EXT_SOURCE_3", "AMT_CREDIT", "AMT_ANNUITY",
          "AMT_INCOME_TOTAL", "AGE_YEARS", "DAYS_BIRTH", "DAYS_EMPLOYED_CLEAN",
          "EMPLOYMENT_ANOMALY", "NAME_CONTRACT_TYPE", "NAME_EDUCATION_TYPE",
          "OCCUPATION_TYPE", "NAME_INCOME_TYPE", "CREDIT_INCOME_RATIO", "ANNUITY_INCOME_RATIO"]:
    print(f"  {c}: importance {by_col.get(c, 0):.4f}, rank {rank.get(c, '-')}")

print("\n=== E. Missing values in application_train.csv ===")
df = pd.read_csv(ROOT / "data" / "raw" / "application_train.csv")
raw_cols = [c for c in input_cols if c in df.columns]
print("Input columns not in the CSV (engineered):", [c for c in input_cols if c not in df.columns])
miss = (df[raw_cols].isna().mean() * 100).sort_values(ascending=False)
print("Input columns with 0% missing:", int((miss == 0).sum()), "of", len(raw_cols))
print("Input columns with some missing:", int((miss > 0).sum()))
print("Highest missing (%):")
print(miss[miss > 0].head(25).round(1).to_string())