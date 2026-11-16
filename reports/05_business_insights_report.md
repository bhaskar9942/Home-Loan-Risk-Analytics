# Home Loan Risk Analytics: Business Insights and Recommendations

## 1. Project overview
This project upgrades an existing Home Loan Default Prediction project into a full analytics project. It combines Python (EDA and machine learning), SQL (MySQL business analysis) and Power BI (an interactive dashboard) to show which applicants are more likely to default and what a lending business can do with that information.

## 2. Business problem
A lender wants to understand which kinds of applicants default more often, so it can assess risk, focus its reviews and design its checks. The question is where default risk is concentrated, and how much of it can be seen from information collected at application time.

## 3. Dataset
- Main table: `application_train` (307,511 applicants, 122 columns).
- Target: `TARGET` (1 = defaulter, 0 = non-defaulter).
- Defaulters: 24,825 (8.07%). Non-defaulters: 282,686 (91.93%).
- Additional files (`bureau`, `bureau_balance`, `POS_CASH_balance`, `credit_card_balance`, `previous_application`, `installments_payments`) were used in the original Python notebook for data checks but were not part of the SQL or Power BI analysis.

## 4. Existing Python analysis
- EDA, missing-value and duplicate checks, data cleaning and feature engineering were completed before this upgrade.
- The best model was Gradient Boosting with a decision threshold of 0.1.
- Test results at that threshold: ROC-AUC 0.7529, recall for defaulters 57.54%, precision 18.98%, F1-score 28.55%.
- Meaning: the model finds more than half of the defaulters, but most applicants it flags would not default. It is suitable as a decision-support tool, not as an automatic decision-maker.

## 5. SQL business analysis
Twelve business questions were answered on `application_train` (see `reports/03_sql_business_analysis.md` and `sql/business_analysis.sql`).

## 6. Power BI dashboard
A one-page dashboard (`powerbi/home_loan_dashboard.pbix` and `.pdf`) shows the portfolio, default rate by credit score, age, occupation and income, the loan comparison, and slicers for loan type and education. Every number was checked against the SQL results (see `reports/04_powerbi_dashboard_report.md`).

## 7. Key findings

**Overall risk**
- 8.07% of applicants defaulted: about 1 in 12. This is the baseline.

**The clearest separators of risk**
| Factor | Lower-risk group | Higher-risk group |
|---|---|---|
| External credit score | 4.57% (score 0.6-0.8) | 18.84% (score under 0.2) |
| Occupation | 4.83% (Accountants) | 17.15% (Low-skill Laborers) |
| Age | 4.92% (60 and above) | 11.46% (under 30) |
| Employment length | 5.19% (10+ years) | 11.07% (1-2 years) |
| Education | 5.36% (Higher education) | 10.93% (Lower secondary) |

**Concentration of risk**
- Applicants with an external score under 0.4 are about 26% of applicants but about 45% of all defaulters.
- Applicants with a score under 0.2 are about 9% of applicants but about 21% of all defaulters.
- Combining age and score: ages 30-39 with a score under 0.2 default at 22.69% and under 30 with a score under 0.2 at 22.62%, against 2.94% for ages 60 and above with a score of 0.6-0.8.
- Three segments (under 40 and age 40-49 with a score under 0.2) hold about 6% of applicants but about 17% of defaulters.
- Eight occupations are above the baseline. They hold about 41% of applicants and about 54% of defaulters. Laborers alone account for 23.52% of all defaulters.

**Factors that did not separate risk clearly**
- Loan type: cash loans 8.35%, revolving loans 5.48%.
- Income: 5.95% to 8.62% across bands, with no steady pattern (the highest rate is in the 100,000-149,999 band).
- Loan size compared with income: 7.23% to 8.85%, with no steady rise as loans grow.
- Average loan amount: defaulters borrowed about 7% less than non-defaulters.

## 8. Recommendations
These are suggestions for a lending business, based only on patterns in this data.

1. **Use the external credit score as a main screening input.** It separated risk better than any other factor (4.57% to 18.84%). Applicants below 0.4 hold nearly half of all defaulters, so they are where extra checks have the most effect.
2. **Send the highest-risk segments to manual review, not automatic rejection.** Younger applicants with a score under 0.2 default at over 22%. A closer look at income documents and repayment capacity is a better use of effort than a refusal.
3. **Review income stability for short employment histories.** Applicants with under 3 years of employment default at about 11%, roughly double the rate at 10 or more years.
4. **Verify affordability and documents for the occupations that hold most defaults.** Laborers, Sales staff and Drivers together account for about 44% of all defaulters. Use this to direct reviews, not to reject people because of their job.
5. **Do not rely on loan size or loan-to-income alone.** Neither separated defaulters from non-defaulters in this data.
6. **Investigate revolving loans before changing product strategy.** They defaulted less (5.48% vs 8.35%), but they are a different product with possibly different customers, so the difference may not be caused by the product.
7. **Investigate the 55,374 applicants (about 18%) with the placeholder employment value.** They default at 5.40%, but who they are was not examined.
8. **Use the machine learning model for decision support only.** Its precision is low (18.98%), so many flagged applicants would not default, and a person should make the final decision.
9. **Extend the analysis with credit-history data.** The `bureau` data was not analysed in SQL and may add useful information.

## 9. Limitations
- Results are associations in historical data, not causes.
- Age, occupation and education overlap with each other and with income, so one factor may partly reflect another.
- Band boundaries were chosen by the analyst, and different boundaries could change the rates slightly.
- Some groups are small (for example Academic degree with 164 applicants, Low-skill Laborers with 2,093, and score 0.8 and above with 569), so their rates are less reliable.
- The meaning of the external score is not documented in the dataset.
- Credit-history data was not analysed in SQL or Power BI.
- The machine learning model has low precision, and the best threshold (0.1) was the lowest value tested.
- Age, occupation and education should not be used on their own to approve or reject applicants.

## 10. Conclusion
Default risk in this portfolio is not spread evenly. An external credit score, age, occupation and length of employment separate risk groups much more clearly than loan size or income band. Risk is concentrated in a small number of segments, which lets a lender focus extra review where it matters most. These findings should guide where to look more closely, and the final decision on an applicant should always involve a person, with the model and dashboard as support.