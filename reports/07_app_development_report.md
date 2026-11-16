# App Development Report

## 1. Design decisions
- Form: loan type, income, loan amount, loan annuity, goods price, age, years employed, education, external scores 1 to 3.
- Required: loan type, education, income, loan amount, annuity, age. Optional: goods price, years employed, external scores. Blank fields are filled by the saved preprocessor.
- Occupation was removed (model importance rank 27). Gender is not collected; the model is unchanged and uses gender internally. This is a documented limitation.
- Income and annuity are labelled as in the dataset. The dataset does not say whether they are yearly or monthly.

## 2. Flask check
Minimal server (`app/backend/app.py`) ran locally; `/` and `/health` returned 200.

## 3. Prediction layer (`app/backend/predict.py`)
- Loads `models/gradient_boosting_model.pkl` and `models/home_loan_preprocessor.pkl`; nothing is retrained or refitted.
- Reads the 125 input columns, categorical columns and valid dropdown values from the preprocessor.
- Engineered features use the notebook's formulas (age uses 365.25 days).
- Result: estimated probability, compared with the notebook's threshold of 0.1 (flag when probability is 0.1 or higher).

## 4. Smoke test (`app/backend/smoke_test.py`)
- The row has 125 columns in the preprocessor's order; hand-calculated engineered values matched.
- Low external scores gave 38.54% and high scores 2.29%, in the expected direction.
- Invalid input returned clear error messages.


## 5. Golden test (`app/backend/golden_test.py`)
- A. Complete records: 2,004 real rows (including the 365243 placeholder, missing-score, missing-annuity and missing-goods-price rows). predict.py and the notebook's own formulas gave identical probabilities (largest difference 0.0) and identical 0.1 decisions.
- B. Form path: 502 real applicants, using only the 11 form values. Identical probabilities and decisions.
- C. Removing an optional field changed the prediction for 51 of 100 rows (goods price), 78 of 100 (years employed), 38 of 53 (external score 1), 91 of 100 (score 2) and 63 of 75 (score 3). Optional fields are used by the model. The test counts changes, not their size.
- Limits: both sides use the same saved model and preprocessor, so this shows the app reproduces the notebook's inputs, not that predictions are accurate.


## 6. Form accuracy and calibration (`app/backend/evaluate_form_inputs.py`)
Evaluated on the notebook's test set (61,503 rows, 4,965 defaulters; same split settings), threshold 0.1.

| Scenario | ROC-AUC | Flagged | Recall | Precision |
|---|---|---|---|---|
| All 125 columns | 0.7529 | 24.5% | 57.5% | 19.0% |
| All 11 form fields | 0.7418 | 24.5% | 56.2% | 18.5% |
| Form without external scores | 0.6444 | 2.9% | 8.2% | 22.6% |
| Required fields only | 0.5646 | 0.0% | 0.0% | 0.0% |

- The saved files reproduce the notebook's reported results exactly (ROC-AUC 0.7529; 2,857 true positives, 2,108 false negatives, 12,194 false positives).
- The full form loses little (AUC 0.011). Without the three external scores the model is much weaker, and with only the required fields it is close to chance.
- Calibration: mean predicted probability 8.04% vs actual default rate 8.07%. Predicted and actual rates by band were close (for example 10-20%: predicted 13.8%, actual 14.4%; 20-40%: predicted 26.5%, actual 29.4%). This was checked only on the historical test set.
- Cases with only one or two external scores were not evaluated.


## 7. Reliability by external scores entered (`app/backend/evaluate_score_subsets.py`)
Same test set (61,503 rows, 4,965 defaulters), threshold 0.1; all other form fields entered with real values.

| Scores entered | ROC-AUC | Change vs all three | Flagged | Recall | Precision | Mean predicted | Largest band gap |
|---|---|---|---|---|---|---|---|
| 1+2+3 | 0.7418 | 0.0000 | 24.5% | 56.2% | 18.5% | 8.03% | 3.1 pt |
| 2+3 | 0.7339 | -0.0079 | 25.4% | 55.7% | 17.7% | 8.25% | 2.6 pt |
| 1+2 | 0.7081 | -0.0338 | 21.5% | 46.6% | 17.5% | 7.65% | 7.8 pt |
| 1+3 | 0.7089 | -0.0330 | 16.4% | 39.2% | 19.3% | 6.92% | 6.8 pt |
| 1 | 0.6652 | -0.0766 | 5.5% | 14.6% | 21.2% | 6.21% | 9.0 pt |
| 2 | 0.6968 | -0.0451 | 21.9% | 45.3% | 16.7% | 7.90% | 7.2 pt |
| 3 | 0.6950 | -0.0469 | 16.4% | 37.2% | 18.3% | 7.06% | 6.8 pt |
| none | 0.6444 | -0.0974 | 2.9% | 8.2% | 22.6% | 6.36% | 11.7 pt |

- Scores 2 and 3 carry almost all of the value; score 1 adds the least.
- With fewer scores the model identifies fewer defaulters and its mean prediction falls below the actual 8.07%.
- In this data only 35.7% of applicants have all three scores; score 3 is missing for 19.8% and score 2 for 0.2%.
- App rules: all three scores = normal; 2+3 = slightly reduced; 1+2, 1+3 = reduced; a single score = low (score 1 alone: very low); no scores = no risk label.


## 8. Reliability rules in the code (`app/backend/predict.py`)
- No external score entered: no probability and no risk label; the user is asked for scores.
- One or two scores: the estimate is shown with a reliability level and a warning that quotes the measured ROC-AUC and share of defaulters identified for that combination (section 7).
- The statement that the model tends to under-estimate risk when scores are missing is based on the average predicted probability being below the actual default rate (8.07%) in those cases. Direction within each probability band was not measured.
- Test (`reliability_test.py`): all three scores 38.54%, reliability High; no scores returned `insufficient_information`.


## 9. Flask routes and web form tests
- `api_test.py`: /health 200; /options 200 (2 loan types, 5 education levels, threshold 10.0); /predict 200 for valid input (all three scores 38.54%, High; score 3 only 19.61%, Low); 200 `insufficient_information` with no scores; 400 for invalid values, non-JSON and non-object input; GET /predict 405.
- Web form (`app/frontend`, served by Flask): dropdowns loaded from /options. In the browser, all three scores gave 38.54% (reliability High, no warning); score 3 only gave 19.61% (Low, with warning); no scores gave "Not enough information" with no risk label; age 5 gave a validation error; Clear form emptied the fields; with the server stopped the page showed an error message.
- Browser results matched the backend tests exactly.
- The test applicant is invented, not a real person.


## 10. Final page changes
- The connection-error box is titled "Backend not reachable", separate from the validation-error box ("Please check the form").
- The page links to the Power BI dashboard PDF (`/dashboard.pdf`, served from `powerbi/home_loan_dashboard.pdf`). Power BI is not embedded: embedding requires publishing to the Power BI service, and account licensing was not checked.
- Tested in the browser: the PDF opens in a new tab; Clear form removes the result box with the fields.


## 11. Final verification
- `requirements.txt` includes flask==3.1.3 (8 packages, pinned).
- The obsolete `smoke_test.py` was removed (written before the reliability rules).
- After all changes: `api_test.py` returned the expected HTTP codes (200, 400, 405); `reliability_test.py` returned the expected result for all 8 score combinations (all three scores 38.54%, no scores `insufficient_information`); `golden_test.py` passed on 2,004 complete records and 502 form-path records (largest probability difference 0.0 in the earlier run).
- Limitations: the page is served by Flask's development server for local use only. The Power BI dashboard is linked as a PDF, not embedded.