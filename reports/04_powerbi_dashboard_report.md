# Power BI Dashboard Report

## 1. Purpose
A one-page dashboard that shows home loan default risk for a business audience. Files: `powerbi/home_loan_dashboard.pbix` and `powerbi/home_loan_dashboard.pdf`.

## 2. Data source
- Source: MySQL database `home_loan_analytics`, table `application_train` (307,511 applicants).
- Power BI connects to a view, `vw_dashboard_applicants` (`sql/dashboard_view.sql`), instead of the full 122-column table.
- The view has 12 columns: applicant_id, target, customer_group, loan_type, education_level, occupation, age_group, income_group, score_band, loan_amount, income, annuity.
- Age, income and credit-score bands use the same boundaries as the SQL analysis, so the dashboard and SQL results can be compared directly.
- Mode: Import (a copy of the data is stored in the .pbix file). Refreshing needs the MySQL server running and the database password.

## 3. Measures (DAX)
- Total Applicants: count of rows in the view.
- Defaulters: count of rows where target = 1.
- Non-Defaulters: count of rows where target = 0.
- Default Rate %: Defaulters divided by Total Applicants.
- Avg Loan Amount, Avg Income, Avg Annuity: averages of the loan_amount, income and annuity columns.

## 4. Dashboard contents
| Visual | Business question |
|---|---|
| 4 KPI cards | How big is the portfolio and how risky is it? |
| Donut chart | What share of applicants defaulted? |
| Column chart: external credit score band | Which score levels carry more risk? |
| Column chart: age group | How does risk change with age? |
| Bar chart: occupation (groups with 1,000+ applicants) | Which occupations default more? |
| Column chart: income group | Does income relate to default? |
| Table: average loan, income, annuity | Do defaulters borrow more? |
| Slicers: loan type, education level | Do patterns hold inside a segment? |
| Text box: key insights | What should a reader remember? |

## 5. Verification against SQL
| Dashboard item | Dashboard result | SQL source | Match |
|---|---|---|---|
| Cards | 307,511 / 24,825 / 282,686 / 8.07% | Q1 | Yes |
| Donut | 8.07% defaulters, 91.93% non-defaulters | Q1 | Yes |
| Credit score chart | 18.84%, 11.62%, 7.79%, 4.57%, 1.76%, 7.88% | Q10 | Yes |
| Age chart | 11.46%, 9.58%, 7.66%, 6.13%, 4.92% | Q7 | Yes |
| Income chart | 8.20%, 8.62%, 8.45%, 7.55%, 5.95% | Q3 | Yes |
| Occupation chart | 16 groups, 17.15% down to 4.83% | Q12 | Yes |
| Loan table | defaulters 557,779 / 165,612 / 26,482; non-defaulters 602,648 / 169,078 / 27,164 | Q5 | Yes |
| Slicer: Revolving loans | 29,279 applicants, 1,604 defaulters, 5.48% | Q2 | Yes |
| Slicer: Cash loans | 278,232 applicants, 8.35% | Q2 | Yes |
| Slicer: Higher education | 74,863 applicants, 4,009 defaulters, 5.36% | Q6 | Yes |
| Slicer: Secondary education | 218,391 applicants, 19,524 defaulters, 8.94% | Q6 | Yes |

## 6. Design choices
- Column charts for ordered groups (score, age, income) and a horizontal bar chart for occupation, because its labels are long.
- Occupation groups with fewer than 1,000 applicants (Realty agents, HR staff, IT staff) are hidden because their rates are unstable.
- Applicants with no recorded occupation or credit score are shown as "Not recorded" and not removed.
- Page height was increased so all 16 occupations are visible without scrolling.

## 7. How to read the dashboard
- 8.07% is the baseline. Bars above it mark higher-risk groups and bars below it mark lower-risk groups.
- Click a slicer value to see how the cards and charts change for that segment. Reset both slicers before saving.

## 8. Limitations
- The dashboard shows associations in historical data, not causes.
- Only the application table is used. Credit-history data is not included.
- The data is a stored copy, so it does not update on its own.
- Some groups are small, so their rates should be read with care.
- Occupation, age and education should not be used to reject applicants.