USE home_loan_analytics;

CREATE OR REPLACE VIEW vw_dashboard_applicants AS
SELECT
    SK_ID_CURR                                           AS applicant_id,
    TARGET                                               AS target,
    CASE WHEN TARGET = 1 THEN 'Defaulter'
         ELSE 'Non-defaulter' END                        AS customer_group,
    NAME_CONTRACT_TYPE                                   AS loan_type,
    NAME_EDUCATION_TYPE                                  AS education_level,
    COALESCE(OCCUPATION_TYPE, 'Not recorded')            AS occupation,
    CASE
        WHEN -DAYS_BIRTH / 365 < 30 THEN '1. Under 30'
        WHEN -DAYS_BIRTH / 365 < 40 THEN '2. 30 - 39'
        WHEN -DAYS_BIRTH / 365 < 50 THEN '3. 40 - 49'
        WHEN -DAYS_BIRTH / 365 < 60 THEN '4. 50 - 59'
        ELSE '5. 60 and above'
    END                                                  AS age_group,
    CASE
        WHEN AMT_INCOME_TOTAL < 100000 THEN '1. Under 100,000'
        WHEN AMT_INCOME_TOTAL < 150000 THEN '2. 100,000 - 149,999'
        WHEN AMT_INCOME_TOTAL < 200000 THEN '3. 150,000 - 199,999'
        WHEN AMT_INCOME_TOTAL < 300000 THEN '4. 200,000 - 299,999'
        ELSE '5. 300,000 and above'
    END                                                  AS income_group,
    CASE
        WHEN EXT_SOURCE_2 IS NULL THEN '6. Not recorded'
        WHEN EXT_SOURCE_2 < 0.2   THEN '1. Under 0.2'
        WHEN EXT_SOURCE_2 < 0.4   THEN '2. 0.2 - 0.4'
        WHEN EXT_SOURCE_2 < 0.6   THEN '3. 0.4 - 0.6'
        WHEN EXT_SOURCE_2 < 0.8   THEN '4. 0.6 - 0.8'
        ELSE '5. 0.8 and above'
    END                                                  AS score_band,
    AMT_CREDIT                                           AS loan_amount,
    AMT_INCOME_TOTAL                                     AS income,
    AMT_ANNUITY                                          AS annuity
FROM application_train;

-- Check 1: totals
SELECT COUNT(*) AS total_rows, SUM(target = 1) AS defaulters
FROM vw_dashboard_applicants;

-- Check 2: age groups (must match Q7)
SELECT age_group, COUNT(*) AS applicants, SUM(target = 1) AS defaulters
FROM vw_dashboard_applicants
GROUP BY age_group
ORDER BY age_group;
