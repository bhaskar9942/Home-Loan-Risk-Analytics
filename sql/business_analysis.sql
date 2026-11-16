USE home_loan_analytics;

-- Q1: Portfolio size and overall default rate
SELECT
    COUNT(*)                                    AS total_applicants,
    SUM(TARGET = 1)                             AS defaulters,
    SUM(TARGET = 0)                             AS non_defaulters,
    ROUND(100 * SUM(TARGET = 1) / COUNT(*), 2)  AS default_rate_pct
FROM application_train;


-- Q2: Default rate by loan type
SELECT
    NAME_CONTRACT_TYPE                                           AS loan_type,
    COUNT(*)                                                     AS applicants,
    SUM(TARGET = 1)                                              AS defaulters,
    ROUND(100 * SUM(TARGET = 1) / COUNT(*), 2)                   AS default_rate_pct,
    ROUND(100 * COUNT(*) / (SELECT COUNT(*) FROM application_train), 2) AS share_of_portfolio_pct
FROM application_train
GROUP BY NAME_CONTRACT_TYPE
ORDER BY default_rate_pct DESC;


-- Q3: Default rate by income group
SELECT
    CASE
        WHEN AMT_INCOME_TOTAL < 100000 THEN '1. Under 100,000'
        WHEN AMT_INCOME_TOTAL < 150000 THEN '2. 100,000 - 149,999'
        WHEN AMT_INCOME_TOTAL < 200000 THEN '3. 150,000 - 199,999'
        WHEN AMT_INCOME_TOTAL < 300000 THEN '4. 200,000 - 299,999'
        ELSE '5. 300,000 and above'
    END                                           AS income_group,
    COUNT(*)                                      AS applicants,
    SUM(TARGET = 1)                               AS defaulters,
    ROUND(100 * SUM(TARGET = 1) / COUNT(*), 2)    AS default_rate_pct
FROM application_train
GROUP BY income_group
ORDER BY income_group;


-- Q4: Default rate by occupation
SELECT
    COALESCE(OCCUPATION_TYPE, 'Not recorded')     AS occupation,
    COUNT(*)                                      AS applicants,
    SUM(TARGET = 1)                               AS defaulters,
    ROUND(100 * SUM(TARGET = 1) / COUNT(*), 2)    AS default_rate_pct
FROM application_train
GROUP BY COALESCE(OCCUPATION_TYPE, 'Not recorded')
ORDER BY default_rate_pct DESC;     


-- Q5: Loan amount, income and annuity: defaulters vs non-defaulters
SELECT
    CASE WHEN TARGET = 1 THEN 'Defaulter' ELSE 'Non-defaulter' END AS customer_group,
    COUNT(*)                          AS applicants,
    ROUND(AVG(AMT_CREDIT), 0)         AS avg_loan_amount,
    ROUND(AVG(AMT_INCOME_TOTAL), 0)   AS avg_income,
    ROUND(AVG(AMT_ANNUITY), 0)        AS avg_annuity
FROM application_train
GROUP BY TARGET
ORDER BY TARGET DESC;


-- Q6: Default rate by education level
SELECT
    NAME_EDUCATION_TYPE                                           AS education_level,
    COUNT(*)                                                      AS applicants,
    SUM(TARGET = 1)                                               AS defaulters,
    ROUND(100 * SUM(TARGET = 1) / COUNT(*), 2)                    AS default_rate_pct,
    ROUND(100 * COUNT(*) / (SELECT COUNT(*) FROM application_train), 2) AS share_of_portfolio_pct
FROM application_train
GROUP BY NAME_EDUCATION_TYPE
ORDER BY default_rate_pct DESC;


-- Q7: Default rate by age group
SELECT
    CASE
        WHEN -DAYS_BIRTH / 365 < 30 THEN '1. Under 30'
        WHEN -DAYS_BIRTH / 365 < 40 THEN '2. 30 - 39'
        WHEN -DAYS_BIRTH / 365 < 50 THEN '3. 40 - 49'
        WHEN -DAYS_BIRTH / 365 < 60 THEN '4. 50 - 59'
        ELSE '5. 60 and above'
    END                                           AS age_group,
    COUNT(*)                                      AS applicants,
    SUM(TARGET = 1)                               AS defaulters,
    ROUND(100 * SUM(TARGET = 1) / COUNT(*), 2)    AS default_rate_pct
FROM application_train
GROUP BY age_group
ORDER BY age_group;


-- Q8: Default rate by employment length
SELECT
    CASE
        WHEN DAYS_EMPLOYED = 365243       THEN '6. Placeholder value (365243)'
        WHEN -DAYS_EMPLOYED / 365 < 1     THEN '1. Under 1 year'
        WHEN -DAYS_EMPLOYED / 365 < 3     THEN '2. 1 - 2 years'
        WHEN -DAYS_EMPLOYED / 365 < 5     THEN '3. 3 - 4 years'
        WHEN -DAYS_EMPLOYED / 365 < 10    THEN '4. 5 - 9 years'
        ELSE '5. 10 years and above'
    END                                           AS employment_length,
    COUNT(*)                                      AS applicants,
    SUM(TARGET = 1)                               AS defaulters,
    ROUND(100 * SUM(TARGET = 1) / COUNT(*), 2)    AS default_rate_pct
FROM application_train
GROUP BY employment_length
ORDER BY employment_length;


-- Q9: Default rate by loan-to-income ratio
SELECT
    CASE
        WHEN AMT_CREDIT / AMT_INCOME_TOTAL < 2 THEN '1. Under 2x income'
        WHEN AMT_CREDIT / AMT_INCOME_TOTAL < 3 THEN '2. 2x - 3x income'
        WHEN AMT_CREDIT / AMT_INCOME_TOTAL < 4 THEN '3. 3x - 4x income'
        WHEN AMT_CREDIT / AMT_INCOME_TOTAL < 6 THEN '4. 4x - 6x income'
        ELSE '5. 6x income and above'
    END                                           AS loan_to_income,
    COUNT(*)                                      AS applicants,
    SUM(TARGET = 1)                               AS defaulters,
    ROUND(100 * SUM(TARGET = 1) / COUNT(*), 2)    AS default_rate_pct
FROM application_train
GROUP BY loan_to_income
ORDER BY loan_to_income;

-- Check for missing or zero values in the Q9 columns
SELECT
    SUM(AMT_CREDIT IS NULL)        AS null_credit,
    SUM(AMT_INCOME_TOTAL IS NULL)  AS null_income,
    SUM(AMT_INCOME_TOTAL = 0)      AS zero_income
FROM home_loan_analytics.application_train;


-- Q10: Default rate by external credit score (EXT_SOURCE_2)
SELECT
    CASE
        WHEN EXT_SOURCE_2 IS NULL THEN '6. Not recorded'
        WHEN EXT_SOURCE_2 < 0.2   THEN '1. Under 0.2'
        WHEN EXT_SOURCE_2 < 0.4   THEN '2. 0.2 - 0.4'
        WHEN EXT_SOURCE_2 < 0.6   THEN '3. 0.4 - 0.6'
        WHEN EXT_SOURCE_2 < 0.8   THEN '4. 0.6 - 0.8'
        ELSE '5. 0.8 and above'
    END                                           AS score_band,
    COUNT(*)                                      AS applicants,
    SUM(TARGET = 1)                               AS defaulters,
    ROUND(100 * SUM(TARGET = 1) / COUNT(*), 2)    AS default_rate_pct
FROM application_train
GROUP BY score_band
ORDER BY score_band;   


-- Q11: Riskiest and safest segments (age group x external score band)
WITH segmented AS (
    SELECT
        TARGET,
        CASE
            WHEN -DAYS_BIRTH / 365 < 30 THEN 'Under 30'
            WHEN -DAYS_BIRTH / 365 < 40 THEN '30 - 39'
            WHEN -DAYS_BIRTH / 365 < 50 THEN '40 - 49'
            WHEN -DAYS_BIRTH / 365 < 60 THEN '50 - 59'
            ELSE '60 and above'
        END AS age_group,
        CASE
            WHEN EXT_SOURCE_2 < 0.2 THEN 'Score under 0.2'
            WHEN EXT_SOURCE_2 < 0.4 THEN 'Score 0.2 - 0.4'
            WHEN EXT_SOURCE_2 < 0.6 THEN 'Score 0.4 - 0.6'
            WHEN EXT_SOURCE_2 < 0.8 THEN 'Score 0.6 - 0.8'
            ELSE 'Score 0.8 and above'
        END AS score_band
    FROM application_train
    WHERE EXT_SOURCE_2 IS NOT NULL
)
SELECT
    age_group,
    score_band,
    COUNT(*)                                      AS applicants,
    SUM(TARGET = 1)                               AS defaulters,
    ROUND(100 * SUM(TARGET = 1) / COUNT(*), 2)    AS default_rate_pct
FROM segmented
GROUP BY age_group, score_band
HAVING COUNT(*) >= 1000
ORDER BY default_rate_pct DESC;


-- Q12: Occupation risk ranking vs overall default rate
WITH occ AS (
    SELECT
        COALESCE(OCCUPATION_TYPE, 'Not recorded') AS occupation,
        COUNT(*)                                  AS applicants,
        SUM(TARGET = 1)                           AS defaulters
    FROM application_train
    GROUP BY COALESCE(OCCUPATION_TYPE, 'Not recorded')
    HAVING COUNT(*) >= 1000
)
SELECT
    RANK() OVER (ORDER BY defaulters / applicants DESC)  AS risk_rank,
    occupation,
    applicants,
    defaulters,
    ROUND(100 * defaulters / applicants, 2)              AS default_rate_pct,
    ROUND(100 * defaulters / applicants
          - 100 * (SELECT SUM(TARGET = 1) / COUNT(*) FROM application_train), 2)
                                                         AS pts_vs_overall_rate,
    ROUND(100 * defaulters
          / (SELECT SUM(TARGET = 1) FROM application_train), 2)
                                                         AS share_of_all_defaulters_pct
FROM occ
ORDER BY risk_rank;