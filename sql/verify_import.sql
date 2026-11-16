USE home_loan_analytics;

SELECT
    COUNT(*)                          AS total_rows,
    SUM(TARGET = 0)                   AS non_defaulters,
    SUM(TARGET = 1)                   AS defaulters,
    SUM(OWN_CAR_AGE IS NULL)          AS null_own_car_age,
    SUM(OCCUPATION_TYPE IS NULL)      AS null_occupation,
    SUM(EXT_SOURCE_1 IS NULL)         AS null_ext_source_1,
    SUM(AMT_ANNUITY IS NULL)          AS null_annuity,
    ROUND(AVG(AMT_INCOME_TOTAL), 2)   AS avg_income
FROM application_train;