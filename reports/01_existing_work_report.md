# Existing Work Report: Home Loan Default Prediction

## 1. What was already completed
- Data loading and understanding of `application_train.csv` (307,511 rows, 122 columns).
- Missing-value and duplicate checks on all 7 datasets. No duplicate rows were found.
- Exploratory data analysis, including distributions, skewness, outliers, age, external-source scores, and categorical default rates.
- Data cleaning: the placeholder value 365243 in `DAYS_EMPLOYED` was identified and handled with an indicator column.
- Feature engineering: `AGE_YEARS`, `CREDIT_INCOME_RATIO`, `ANNUITY_INCOME_RATIO`, `EMPLOYMENT_ANOMALY`, `DAYS_EMPLOYED_CLEAN`.
- Preprocessing: stratified 80/20 split, median imputation for numeric columns, most-frequent imputation and one-hot encoding for categorical columns.
- Model development and comparison: Logistic Regression, Random Forest, Decision Tree, Gradient Boosting.
- - Model and preprocessor saved with joblib (`gradient_boosting_model.pkl`, `home_loan_preprocessor.pkl`). The sample-prediction cell in the notebook (cell 157) was not executed, so a prediction test is part of the application work.

## 2. Target distribution
- Non-defaulters (TARGET = 0): 282,686 (91.93%)
- Defaulters (TARGET = 1): 24,825 (8.07%)
- The classes are imbalanced, so accuracy alone is misleading.

## 3. Selected model
- Model: Gradient Boosting (100 trees, learning rate 0.1, max depth 3, min samples per leaf 50).
- Selected decision threshold: 0.1.
- Saved files: `models/gradient_boosting_model.pkl` and `models/home_loan_preprocessor.pkl`.
- The preprocessor expects 125 input columns, including the 5 engineered features.

## 4. Evaluation results (test set, threshold 0.1)
| Metric | Value |
|---|---|
| Accuracy | about 76.75% |
| Precision (defaulters) | 18.98% |
| Recall (defaulters) | 57.54% |
| F1-score | 28.55% |
| ROC-AUC | 0.7529 |

Confusion matrix: 2,857 defaulters correctly identified, 2,108 missed, and 12,194 non-defaulters flagged as potential defaulters.

## 5. What can be reused
- The notebook, for the Python analysis section of the project.
- The saved model and preprocessor, for the future application.
- The EDA findings, as context for SQL and Power BI.

## 6. Points to note
- Precision is low, so many flagged applicants would not default.
- The best threshold (0.1) was the lowest value tested, so lower values were not explored.
- `SK_ID_CURR` (an ID column) was not removed from the model inputs.
- Findings describe associations, not causes.
- The model is decision support and should not approve or reject loans on its own.

## 7. What is still to do
- SQL business analysis (MySQL).
- Power BI dashboard.
- Business insights report.
- Optional Flask and frontend application.
- Git and GitHub preparation.