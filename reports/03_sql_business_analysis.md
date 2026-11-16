# SQL Business Analysis Results

All results come from the `home_loan_analytics.application_train` table (307,511 applicants).

## Q1. Portfolio size and overall default rate
- Query: `sql/business_analysis.sql` (Q1)
- Result: 307,511 applicants; 24,825 defaulters; 282,686 non-defaulters; default rate 8.07%.
- Insight: about 1 in 12 applicants defaulted. 8.07% is the baseline for comparing every segment.


## Q2. Default rate by loan type
- Result: cash loans 278,232 applicants, 8.35% default rate (90.48% of portfolio); revolving loans 29,279 applicants, 5.48% default rate (9.52% of portfolio).
- Insight: revolving loans defaulted less often than cash loans (5.48% vs 8.35%). Cash loans dominate the portfolio. The difference is an association, not proof that loan type causes default.


## Q3. Default rate by income group
- Result (applicants / default rate): under 100,000: 63,698 / 8.20%; 100,000-149,999: 91,591 / 8.62%; 150,000-199,999: 64,307 / 8.45%; 200,000-299,999: 65,176 / 7.55%; 300,000 and above: 22,739 / 5.95%.
- Insight: default rates are similar (8.20% to 8.62%) across the three lowest income bands and lower for higher incomes, reaching 5.95% for 300,000 and above. The relationship is not strictly linear: the highest rate is in the 100,000-149,999 band, not the lowest-income band. Income is associated with default but does not explain it alone.


## Q4. Default rate by occupation
- Result: 19 groups (18 occupations plus 96,391 applicants with no recorded occupation). Highest default rates: Low-skill Laborers 17.15% (2,093 applicants), Drivers 11.33%, Waiters/barmen staff 11.28%, Security staff 10.74%, Laborers 10.58%, Cooking staff 10.44%. Lowest: Accountants 4.83%, High skill tech staff 6.16%, Managers 6.21%, Core staff 6.30%. Applicants with no occupation recorded: 6.51%.
- Insight: default rates range from 4.83% to 17.15%. Manual and service roles tend to have higher rates and office or professional roles lower rates. Some groups are small (Low-skill Laborers 2,093; Waiters/barmen 1,348), so their rates are less reliable. This is an association, not a cause, and should not be used to reject applicants by occupation alone.


## Q5. Loan amount, income and annuity: defaulters vs non-defaulters
- Result: defaulters (24,825) had an average loan of 557,779, average income of 165,612 and average annuity of 26,482. Non-defaulters (282,686) had an average loan of 602,648, average income of 169,078 and average annuity of 27,164.
- Insight: defaulters borrowed about 7% less on average, and their income and annuity were only about 2% to 3% lower. Averages are similar, so loan amount alone does not separate the two groups. Loan size relative to income is examined in Q9.


## Q6. Default rate by education level
- Result (applicants / default rate): Lower secondary 3,816 / 10.93%; Secondary / secondary special 218,391 / 8.94%; Incomplete higher 10,277 / 8.48%; Higher education 74,863 / 5.36%; Academic degree 164 / 1.83%.
- Insight: default rates fall as education level rises. Secondary education (71% of applicants) is slightly above the 8.07% baseline and higher education (24%) is well below it. Academic degree has only 164 applicants and 3 defaulters, so its rate is unreliable. Education overlaps with income and occupation, so this is an association, not a cause.


## Q7. Default rate by age group
- Result (applicants / default rate): under 30: 45,000 / 11.46%; 30-39: 82,299 / 9.58%; 40-49: 76,543 / 7.66%; 50-59: 68,074 / 6.13%; 60 and above: 35,595 / 4.92%.
- Insight: default rate falls steadily with age. Applicants under 30 default at about 2.3 times the rate of applicants aged 60 and above. Age overlaps with income and job length, so this is an association, not a cause, and should not be used to reject applicants by age.


## Q8. Default rate by employment length
- Result (applicants / default rate): under 1 year: 27,904 / 10.98%; 1-2 years: 61,489 / 11.07%; 3-4 years: 46,874 / 9.67%; 5-9 years: 64,890 / 7.37%; 10 years and above: 50,980 / 5.19%; placeholder value 365243: 55,374 / 5.40%.
- Insight: default rate falls as employment length increases, from about 11% under 3 years to 5.19% at 10 years and above. The 365243 placeholder in DAYS_EMPLOYED applies to 55,374 applicants (about 18%) and was analysed as its own group; its default rate is 5.40%. Who these applicants are was not examined. Employment length overlaps with age, so this is an association, not a cause.


## Q9. Default rate by loan-to-income ratio
- Result (applicants / default rate): under 2x income: 71,036 / 7.48%; 2x-3x: 66,240 / 8.70%; 3x-4x: 50,380 / 8.85%; 4x-6x: 63,756 / 8.20%; 6x and above: 56,099 / 7.23%.
- Insight: default rates range only from 7.23% to 8.85%, with no steady rise as loans grow relative to income. Loan-to-income ratio alone is a weak signal in this data, which agrees with Q5. This does not show that affordability is unimportant.

- Data check: no missing loan amounts, no missing incomes and no zero incomes, so the ratio is valid for all 307,511 applicants.


## Q10. Default rate by external credit score (EXT_SOURCE_2)
- Result (applicants / default rate): under 0.2: 27,865 / 18.84%; 0.2-0.4: 51,078 / 11.62%; 0.4-0.6: 98,869 / 7.79%; 0.6-0.8: 128,470 / 4.57%; 0.8 and above: 569 / 1.76%; not recorded: 660 / 7.88%.
- Insight: default rate falls at every step as the score rises. The lowest band (under 0.2) holds about 9% of applicants but about 21% of all defaulters. The 0.8-and-above and not-recorded groups are small, so their rates are less reliable. The score separates risk levels well in this data, but it should be one input to a decision, not the only one.


## Q11. Riskiest and safest segments (age group x external score band)
- Method: applicants grouped by age group and EXT_SOURCE_2 band using a CTE. Applicants with no score were excluded, and segments under 1,000 applicants were hidden. 20 segments covering 306,282 applicants remain.
- Riskiest: age 30-39 with score under 0.2 (7,595 applicants, 22.69%); under 30 with score under 0.2 (6,101, 22.62%); 40-49 with score under 0.2 (5,425, 19.34%).
- Safest: age 60 and above with score 0.6-0.8 (15,257, 2.94%); 50-59 with score 0.6-0.8 (31,242, 3.85%); 40-49 with score 0.6-0.8 (35,249, 4.52%).
- Insight: the riskiest segment defaults at about 7.7 times the rate of the safest. The three riskiest segments hold about 6% of applicants but about 17% of all defaulters. Within every age group default falls as the score rises, and at the same score older applicants default less. These are associations, not causes.


## Q12. Occupation risk ranking vs overall default rate
- Method: occupations ranked by default rate with RANK(), compared with the overall rate (8.07%) and each occupation's share of all 24,825 defaulters. Occupations with fewer than 1,000 applicants (Realty agents, HR staff, IT staff) were hidden; they hold 1,840 applicants and 129 defaulters.
- Result: 8 of 16 groups are above the overall rate. Highest: Low-skill Laborers 17.15% (+9.08 points), Drivers 11.33% (+3.25), Waiters/barmen staff 11.28% (+3.20). Lowest: Accountants 4.83% (-3.24 points).
- Insight: the 8 above-average occupations hold about 41% of applicants but about 54% of defaulters. Laborers alone account for 23.52% of all defaulters, Sales staff 12.46% and Drivers 8.49%. Low-skill Laborers has the highest rate but only about 1.5% of defaulters because the group is small. Applicants with no occupation recorded hold 25.29% of defaulters but default below the overall rate (6.51%); their share reflects group size. Associations only, not causes, and not a basis for rejecting applicants by occupation.




---

## Summary of SQL findings

**Baseline:** 8.07% of 307,511 applicants defaulted (24,825 defaulters).

**Factors that separated risk groups most clearly**
| Factor | Lowest-risk group | Highest-risk group |
|---|---|---|
| External credit score (EXT_SOURCE_2) | 4.57% (score 0.6-0.8) | 18.84% (score under 0.2) |
| Occupation | 4.83% (Accountants) | 17.15% (Low-skill Laborers) |
| Age | 4.92% (60 and above) | 11.46% (under 30) |
| Employment length | 5.19% (10 years and above) | 11.07% (1-2 years) |
| Education | 5.36% (Higher education) | 10.93% (Lower secondary) |

**Factors with weaker or less clear patterns**
- Loan type: cash loans 8.35% vs revolving loans 5.48%.
- Income group: 5.95% (300,000 and above) to 8.62% (100,000-149,999). Not a steady pattern across all bands.
- Loan size compared with income: 7.23% to 8.85%, with no steady rise.
- Average loan amount: defaulters borrowed about 7% less than non-defaulters.

**Combined segments (age group x external score)**
- Riskiest: ages 30-39 with score under 0.2 (22.69%) and under 30 with score under 0.2 (22.62%).
- Safest: age 60 and above with score 0.6-0.8 (2.94%).
- The three riskiest segments hold about 6% of applicants but about 17% of defaulters.

**Where defaults are concentrated (by occupation):** Laborers account for 23.52% of all defaulters, Sales staff 12.46% and Drivers 8.49%.

## Limitations
- Only `application_train` was analysed in SQL. Credit-history data (`bureau.csv` and the other files) was not used, so credit history is not covered in the SQL analysis.
- The results describe associations in historical data. They do not show causes.
- Band boundaries (income, age, employment, score) were chosen by the analyst, and different boundaries could change the rates slightly.
- Some groups are small (Academic degree 164 applicants; Low-skill Laborers 2,093; 0.8-and-above score 569), so their rates are less reliable.
- 55,374 applicants (about 18%) have the placeholder value 365243 for employment length. They were analysed as their own group and were not investigated further.
- The meaning of the external score is not documented in the dataset, so it should be treated as one input to a decision and not the only one.
- Occupation, age, and education should not be used to reject applicants on their own.