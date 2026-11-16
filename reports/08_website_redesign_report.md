# Website Redesign Report

## Stage 1: shared design, navigation, clean URLs, Home page

**Backups:** before any change, `index.html`, `style.css`, `script.js`, `app.py` and `api_test.py` were copied to `app/_backup_before_redesign/` and checked identical by file hash. A second named copy of `index.html` was also saved.

**Files created (app/frontend):** `common.js`, `risk-prediction.html`, `analytics.html`, `dashboard.html`, `about.html`.
**Files replaced:** `style.css` (new design system, plus the result-box styles that were missing), `index.html` (now the Home page).
**Files changed (backend):** `app.py` — four page routes added (`/risk-prediction`, `/analytics`, `/dashboard`, `/about`). `/`, `/health`, `/options`, `/predict` and `/dashboard.pdf` are unchanged.
**Not changed:** `predict.py`, the model and preprocessor files, the prediction API, the threshold, and the reliability rules.

**What was built:** a sticky navigation bar with logo, five links, a backend status indicator (uses `/health`) and a mobile menu; a Home page with a hero, five verified facts (307,511 applicants; 8.07% default rate; ROC-AUC 0.7529 on complete records; 0.7418 for the 11-field form; 12 SQL business questions), a three-step explanation, four feature cards and a decision-support notice; the existing prediction form moved unchanged to `/risk-prediction` (all input IDs and names preserved); placeholder pages for Analytics, Dashboard and About.

**Tests run by the project owner:**
- `api_test.py` (extended with page-route checks): all 16 output lines as expected (existing API codes 200/200/200/200/200/400/400/400/405; six page routes 200 with the correct content type; form present on `/risk-prediction`).
- `reliability_test.py` and `golden_test.py`: PASS after the routes were added (backend prediction code unchanged).
- Browser: prediction at 38.54% (reliability High) and 19.61% (reliability Low, warning shown); Clear form; navigation and logo links; Home page buttons; 375 px layout with working menu and no horizontal scrolling.

**Not tested:** other browsers, tablet widths and automated accessibility checks.

**Cleanup still to do:** remove the temporary compatibility block at the bottom of `style.css`; `script.js` is still used by the prediction page until Stage 2; exclude `app/_backup_before_redesign/` from GitHub.


## Stage 2: Risk Prediction page

**Backup:** the whole `app/frontend` folder (8 files) was copied to `app/_backup_stage1_complete/frontend/` and checked identical by file hash before any Stage 2 change.

**Files:** `risk-prediction.html` replaced (two-column layout, required markers, help text, hidden-until-ready examples and scores indicator); `predict.js` created and now loaded by the page instead of `script.js`; `style.css` extended with layout, result-panel, gauge and field-message styles. No backend file changed.

**What was built:** the same 11 inputs, IDs and names, with a "Scores entered: n of 3" line, field-level validation that mirrors the backend rules, two example buttons labelled "(invented applicant)", and a result panel with a semicircle gauge (0 to 50%, with markers for the 10% review threshold and the 8.07% historical rate), the exact probability, the backend's own wording ("Above/Below the review threshold"), a reliability badge, the backend's warning and left-blank list, and a "What this means" note. For High reliability only, a line quotes the measured calibration of the 11-field form (for example, the 20% to 40% range: predicted 26.1%, 29.2% actually defaulted). Also: loading, not-enough-information (no risk label), validation-error and backend-unreachable states.

**Design change during testing:** the Step 2 sticky result panel was removed because the finished result card is about 840 px tall, taller than many screens. The page now scrolls the result into view after each estimate.

**API contract:** unchanged (GET /options; POST /predict with the same 11 keys; blank fields sent as null).

**Tests:**
- Real model (run by the project owner): Example A 38.54% (High); Example B 2.29% (High); one score 19.61% (Low, warning, no calibration line); two scores Slightly reduced; no scores "Not enough information"; client-side validation; backend unreachable; Clear form; 375 px layout with the result scrolling into view; `api_test.py` form check True.
- Automated (headless Chromium, with a stand-in for the model): 69 browser checks passed; the page's validation gave identical messages to the backend's `validate_inputs` on 20,000 random inputs; gauge geometry and 10% band edges checked.

**Limitations:** calibration figures shown in the page are fixed values from the test set and would need updating if the model changed; the examples are invented applicants; tested in Chromium and the owner's browser only, not with a screen reader or other browsers.

**Cleanup still to do:** `script.js` is no longer loaded by any page (remove after final checks); the temporary compatibility block at the bottom of `style.css`; exclude `app/_backup_*` folders from GitHub.


## Stage 3: Dashboard page

**Backup:** the whole `app/frontend` folder (9 files) was copied to `app/_backup_stage2_complete/frontend/` and checked identical by file hash before any Stage 3 change.

**Files:** `dashboard.html` replaced (it was a placeholder); `dashboard.js` created; `style.css` extended with dashboard styles; `assets/dashboard-preview.jpg` added (1600 x 1015 px, about 159 KB, rendered directly from the dashboard PDF). No backend change; the existing `/dashboard.pdf` route is used as it was.

**What was built:** the Power BI dashboard PDF shown inside the page, with "Open in new tab" and "Download PDF" buttons and the file size; five "Key findings" cards whose figures all come from the verified SQL results (8.07%; 18.84% vs 4.57%; 11.46% vs 4.92%; 17.15% / 4.83% / 2,093 applicants / 23.52% of defaulters; 5.95% / 8.62%); and a note that the PDF is a static snapshot and the interactive file is the .pbix.

**Behaviour:** the page checks that the PDF exists (a HEAD request) and shows an "unavailable" notice if it does not, or a "could not check" notice if the server cannot be reached. Browsers that cannot show PDFs inline, and screens up to 700 px wide, get the preview image linked to the full PDF; resizing switches between the two views. The PDF frame is given its address only when needed, so phones do not start a background download. With JavaScript off, the buttons still work. Chrome's thumbnail side panel is hidden with `#navpanes=0`.

**Tests:**
- Project owner: PDF displays inline on desktop; at 375 px the preview image shows with no horizontal scrolling; resizing between 375 px and 800 px switches views; with the PDF temporarily renamed the "not available" notice appears and the findings stay visible (file restored afterwards); `/dashboard` and `/dashboard.pdf` route checks pass.
- Automated (headless Chromium): 29 checks passed (desktop, simulated browser without a PDF viewer, 375 px, resizing, missing PDF, unreachable server, JavaScript off, other routes unaffected, no JavaScript or HTTP errors).

**Not tested:** real Android or iOS phones (the "no PDF viewer" case was simulated), Firefox and Safari, and a screen reader.

**Limitations:** the PDF is an image-based export, so its text is not selectable or searchable and its slicers do not work; the page does not update when the data changes; the findings are fixed text taken from the SQL results.

**Cleanup still to do:** `script.js` is no longer used; remove the temporary compatibility block at the bottom of `style.css`; keep `app/_backup_*` folders out of GitHub.


## Stage 4: About and How to Use page

**Backup:** the whole `app/frontend` folder (11 files, including `assets`) was copied to `app/_backup_stage3_complete/frontend/` and checked identical by file hash before any Stage 4 change.

**Files:** `about.html` replaced (it was a placeholder); `style.css` extended with About-page styles. No JavaScript, no backend change.

**Content:** nine sections with a contents list: the problem (307,511 applications, 24,825 defaulters, 8.07%); how the project was built (Python and machine learning, MySQL with 12 SQL questions, Power BI, Flask); a six-step prediction flow (the model expects 125 input columns; the form fills up to 15; the preprocessor fills the rest with typical values); a field guide; how to read the result, with a calibration table (estimates against actual default rates by range) and a threshold table (at 10%, 24.5% of applicants flagged, 56.2% of defaulters identified, 18.5% of flagged applicants defaulted, using the 11 form fields); reliability by external scores entered (ROC-AUC 0.742 down to 0.644, with the no-scores rule); ten limitations; technology; and a three-question FAQ (what "above the review threshold" means, why external scores are asked for, why gender is not asked). Every number was checked against results verified earlier in the project.

**Tests:**
- Project owner: desktop and 375 px layouts, contents links, FAQ, tables and figures all correct; `/about` returns HTTP 200; the wording of the limitations and the gender answer was reviewed and approved.
- Automated (headless Chromium): 27 checks passed (two-column desktop layout, sticky contents list, nine contents links, FAQ with mouse and keyboard, four tables with captions and column headers, 800 px and 375 px layouts with no sideways page scroll and wide tables scrolling inside their own boxes, other routes unaffected, no JavaScript or HTTP errors).

**Not tested:** other browsers and a screen reader.

**Limitations:** the figures on the page are fixed text and would need updating if the model changed.

**Cleanup still to do:** remove the unused `script.js`; remove the temporary compatibility block at the bottom of `style.css`; keep the `app/_backup_*` folders out of GitHub.

## Stage 5: Analytics page, session history and historical charts

**Backups:** `app/frontend` was copied to `app/_backup_stage4_complete/frontend/` (11 files) before Stage 5 began, to `app/_backup_stage5_step3_complete/frontend/` (13 files) before the historical section was added, and to `app/_backup_stage5_complete/frontend/` (14 files) when the stage was finished. Every copy was checked identical by file hash.

**Files:** `history.js`, `analytics.js` and `historical.js` created; `analytics.html` replaced (it was a placeholder); `style.css` extended (session styles, chart styles, and a fix to the `.page-body` padding); `predict.js` extended with a small addition that records each estimate (compared with the Stage 4 copy: 28 lines added, none removed or changed); `risk-prediction.html` now also loads `history.js`. No backend change: the model, the preprocessor, `predict.py`, the 10% threshold, the reliability rules and the API contract were not touched.

**Design decisions:** the Analytics page has two clearly separate sections. "Historical project data" holds fixed figures measured once on the project's test set. "This session's estimates" holds only what the person has just done in the current browser tab. Session estimates are never presented as real outcomes. The historical section shows how well the model performs (ROC-AUC and calibration) instead of redrawing default-rate charts that already exist in the Power BI dashboard; the dashboard itself stays a PDF.

**Session estimates:** each estimate made on the Risk Prediction page is recorded in `sessionStorage` (this browser tab only), under the key `hlra.session.history.v1`, with at most 100 records. Only a short summary is kept: time, loan type, which external scores were entered, whether a risk label was shown, whether an example button was used, the estimate, above or below the review threshold, and the reliability level. Income, loan amount, annuity, age, goods price, years employed, education and the score values are never stored. The page shows an empty state, summary cards (estimates with a risk label, estimates without one, average estimate, share above the review threshold), reliability counts, filters for reliability and result, a histogram of estimates by range with "View as table", a history table (newest first), a "Clear history" button, and a notice if the browser blocks storage. All dynamic text is inserted as plain text.

**Historical project data:** four summary cards (307,511 applicants; 8.07% default rate with 24,825 defaulters; ROC-AUC 0.7529 for complete records; ROC-AUC 0.7418 for the 11-field form) and two charts, each with a "View as table".
- ROC-AUC by external scores entered: eight horizontal bars from 0.742 (all three scores) down to 0.644 (no scores, drawn in grey). The axis starts at 0.5, which is random guessing, and says so on the chart.
- Estimates compared with actual outcomes: five estimate ranges, each with a pair of bars for the average estimate and the actual default rate (3.5/2.9, 7.0/6.9, 13.7/14.5, 26.1/29.2 and 47.0/45.5 percent), with the number of applicants in each range (25,614; 20,809; 11,312; 3,493; 275).
- The charts are hand-written SVG with no chart library. The figures are written once, in the HTML tables; `historical.js` reads those tables to draw the charts, so a chart and its table cannot disagree. With JavaScript off, the tables still show but the charts do not.

**Tests:**
- Project owner, session history and Analytics page (Stage 5, Steps 2 and 3): the empty state; creating estimates (including one with scores cleared, one with no scores, and invalid input that records nothing); the summary figures; the reliability and result filters; "View as table" matches the histogram; "Clear history"; history survives a reload and a new tab starts empty; the `.page-body` padding fix checked on all five pages at desktop width and 375 x 812; no sideways scroll on Analytics at 375 px; `/analytics` returns HTTP 200. The nine tests for the history feature also passed, including the checks of what is stored and the 100-record limit.
- Project owner, historical section (Stage 5, Step 4): both charts show the expected values and colours and match their tables; both "View as table" panels open; a new prediction appears in the session section and the historical section stays unchanged; both charts fit 375 px with no sideways page scroll; no `historical.js` errors in the browser Console; all five pages still work. A file comparison against the backup showed only `analytics.html` and `style.css` changed and `historical.js` new, with the other 11 files identical (including `predict.js`, `history.js` and `analytics.js`); `style.css` had no lines removed.
- Automated (headless Chromium, in a development sandbox with a stand-in model, not the real one): 47 checks passed for the session section (empty state, figures, filters, clear, hostile stored data shown as text, blocked storage, end to end, mobile). For the historical section, 21 checks passed on a copy of the site without the backend: bar widths proportional to the table values, bar order and colours, value and applicant labels, both tables, 375 px layout, JavaScript off, no JavaScript errors.

**Not tested:** real Android or iOS phones, Firefox, Safari, and a screen reader. The automated runs used no real model.

**Limitations:**
- Session history lives only in the current browser tab and disappears when the tab is closed.
- The historical figures are fixed text from the project's own test set. They are not updated automatically and would need changing if the model changed. They have not been checked on any outside data.
- At 375 px the charts shrink to fit the screen, so their text is small.
- The calibration shown is for the 11-field form on the test set only; the group of estimates at 40% and above is small (275 applicants).

**Cleanup still to do:** `script.js` is no longer used; remove the temporary compatibility block at the bottom of `style.css`; keep the `app/_backup_*` folders out of GitHub.

## Stage 6: Final checks and cleanup

**Backup:** `app/frontend` was copied to `app/_backup_stage6_before_cleanup/frontend/` (14 files) and checked identical by file hash before any cleanup.

**Backend re-check:** the project owner re-ran `api_test.py`, `reliability_test.py` and `golden_test.py`, and all three passed. In the golden test, sections A and B covered 2,506 rows in total (2,004 complete records and 502 form rows), with a largest probability difference of 0.0 and no change to any decision at the 10% threshold.

**Cleanup done:** the unused `script.js` (the page logic from before the redesign, loaded by no page; copies remain in the earlier backups) was deleted. The temporary compatibility block at the bottom of `style.css` (a comment and four rules that applied only to a `main` without the class `site-main`) was removed, because all five pages use `site-main` and the `.subtitle` class is not used anywhere. These were the only two changes. The "cleanup still to do" notes in the sections above are now done.

**Tests:**
- Project owner: a file comparison with the backup showed only `style.css` changed and `script.js` deleted, with every other file identical; all five pages passed at desktop width and at 375 x 812, with no functional issues.
- Automated (headless Chromium, on a copy of the site without the backend): screenshots of all five pages at desktop width and at 375 px were pixel-identical before and after the cleanup, with no new missing-file errors.

**Observation:** the browser's automatic request for `/favicon.ico` returns 404, because the site has no icon file. It does not affect any page.

**Not tested:** other browsers (Firefox, Safari), real phones and a screen reader.

**Still to do:** Git and GitHub (a `.gitignore` that keeps `.venv`, the data and the `app/_backup_*` folders out; the README; the first commit). Two lines in `analytics.html` have extra indentation from editing, which is cosmetic and does not affect the page.