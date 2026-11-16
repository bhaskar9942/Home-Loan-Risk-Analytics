# Model Inspection Report (read-only)

Script: `app/backend/inspect_model.py`. No files were changed.

## 1. Objects
- Model: GradientBoostingClassifier (100 trees, learning rate 0.1, max depth 3).
- Preprocessor: ColumnTransformer, 125 input columns (109 numeric, 16 categorical), 249 output features.
- The model expects 249 features, which equals the preprocessor output (compatible).
- DAYS_EMPLOYED is not an input. DAYS_EMPLOYED_CLEAN and EMPLOYMENT_ANOMALY are. SK_ID_CURR is still an input.
- Encoder: handle_unknown='ignore'.

## 2. Values used when a field is blank
Loan type: Cash loans. Education: Secondary / secondary special. Occupation: Laborers. Income type: Working. Income: 147,600. Loan amount: 514,777.5. Annuity: 24,903. Age: 43.1 years. Years employed: about 4.5 years (-1,648 days). External scores 1/2/3: 0.505 / 0.566 / 0.535. The fill-in value for gender was not printed and will be read from the preprocessor.

## 3. Feature importance (by input column)
- EXT_SOURCE_3 0.3271, EXT_SOURCE_2 0.3095, EXT_SOURCE_1 0.0850 (together about 72%).
- Then DAYS_EMPLOYED_CLEAN 0.0371, AMT_GOODS_PRICE 0.0336, CODE_GENDER 0.0261, NAME_EDUCATION_TYPE 0.0254, AGE_YEARS 0.0198, AMT_ANNUITY 0.0167, AMT_CREDIT 0.0133.
- Top 10 columns hold 89.37% of total importance.
- Low importance: AMT_INCOME_TOTAL 0.0007 (rank 34), NAME_CONTRACT_TYPE 0.0025 (rank 28), OCCUPATION_TYPE 0.0026 (rank 27), EMPLOYMENT_ANOMALY 0.0000 (rank 92).
- Importance shows what the model uses, not causes. Related columns share importance.

## 4. Missing values in application_train.csv
53 of 120 raw input columns have no missing values and 67 have some. Highest: building-related columns (about 66% to 70% missing), OWN_CAR_AGE (66.0%) and EXT_SOURCE_1 (56.4%).

## 5. Implications for the app
- The external scores drive the prediction, so blank scores push results toward an average applicant.
- The model uses CODE_GENDER (6th most important). The app does not ask for it. This is a limitation and is documented.
- Partial-input predictions are less informed than the notebook's full-record test (ROC-AUC 0.7529). This will be measured.

## 6. Decisions
- The form has 11 fields: loan type, annual income, loan amount, annual annuity, goods price, age, years employed, education, and external scores 1, 2 and 3.
- AMT_GOODS_PRICE was added (importance 0.0336, rank 5). OCCUPATION_TYPE was removed (rank 27).
- Gender is not collected. The trained model is not changed, and the preprocessor fills the missing gender value. This is a documented limitation: the model uses gender, and in some places lenders may not use gender in credit decisions.