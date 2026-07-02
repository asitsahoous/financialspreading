# Product Requirements — Commercial Lending Alpha (DXP)

**Source:** requirements table pasted by user, 2026-07-02. Reference docs listed below could not be fetched (Google Drive connector returned "entity not found" for all 9 links — likely not shared with the connected account, or belong to a different Drive account).

This is the feature backlog for the **Iron Mountain DXP Commercial Lending** product (dealership/commercial credit financial spreading), organized by Platform Epic. It is broader than what the current [`app/`](app/) demo prototype implements — see the **Coverage** column for what already exists in the prototype vs. what is net-new scope.

## Reference documents (link only — content not fetched)

| # | Link | Notes |
|---|------|-------|
| 1 | [Google Doc](https://docs.google.com/document/d/1fvwlKF8ivepJjbRcltmWpsW1lcuToPXhNkWnFGa54PY/edit?tab=t.0#heading=h.z6z848hyx57f) | not accessible to connected Drive account |
| 2 | [Google Doc](https://docs.google.com/document/d/19dF-pKv4JwQyE5aVm-lX77eEnNWxipOBEfi8aHt4aqM/edit?tab=t.0#heading=h.zennnoamngp2) | not accessible to connected Drive account |
| 3 | [Google Doc](https://docs.google.com/document/d/1hE-CDJRLxJEvdWBIt27SUJRKDgW5HBN7WhHwACYI91U/edit?tab=t.0) | not accessible to connected Drive account |
| 4 | [Google Doc](https://docs.google.com/document/d/1RLbwoRVFPA7b7bglZHkiYqec3C9vM9_xXZ1BvlJcTcM/edit?tab=t.0) | not accessible to connected Drive account |
| 5 | [Google Doc](https://docs.google.com/document/d/1-Rq1DFyzHcs1JFQU8vf0_WO9qTwGRL4uIre4Nuqh6rs/edit?tab=t.0) | not accessible to connected Drive account |
| 6 | [Google Doc](https://docs.google.com/document/d/11YkKTQNv2LRmArN1MMxotcrcykOKjbk8vgLj-UufO1U/edit?tab=t.0) | not accessible to connected Drive account |
| 7 | [Google Doc](https://docs.google.com/document/d/1-YV4xMUBSb7MhEnhMnHAN8zZJRMEsztSSw3B_NNHxk4/edit?tab=t.0) | not accessible to connected Drive account |
| 8 | [Drive file](https://drive.google.com/file/d/1Z0lAKmYdIhvpW18odERo5g5iC65kBBVc/view?usp=sharing) | not accessible to connected Drive account |
| 9 | [Drive file](https://drive.google.com/file/d/1G-TSK6tPBUtDW_xUY0flieYh-Qkx11eh/view?usp=sharing) | not accessible to connected Drive account |

## Full requirements table

| Sl No | Feature Name | Sprint / Story | Description | Priority | Platform Epic | Coverage in current demo |
|---|---|---|---|---|---|---|
| 1 | Auto Assignment of case — Assignment logic | Case Assignment | Automatically assign incoming dealership cases to available analysts (round-robin or similar). | MVP | Workflow | Not present — no analyst pool/assignment concept in `app/` or `backend/` |
| 2 | FS Split and Select | Enhancements to Splitting Processor | Ingest large documents/packages, identify and extract only Financial Statement pages, ignoring irrelevant pages. | POC | Ingestion / Extraction | Not present — demo statements are pre-rendered, not split from a source package |
| 3 | FS Ingestion and Extraction (Agentic Extraction) | Improvements to MDP; Data Studio and Agent Builder Requirements - CL Alpha | Extract PnL/BS/CFS into a preset structure. Must adapt to multi-year data (ignoring consolidated), and to different document formats — hence a custom processor. | POC | Ingestion / Extraction | Partial — `document_intel_agent` node exists in `backend/graph/nodes/document_intel.py` but is SOP/deterministic, not true agentic multi-format extraction |
| 5 | Supporting document Data Extract (DXP Key Value) | — | Extract and store data from standard application/credit forms/supporting docs into a structured key-value database. | POC | Ingestion / Extraction | Not present |
| 7 | Proactive Reminders & Notifications | — | Automated alerts to dealers/internal teams for late or missing monthly/quarterly Operating Reports or Loan Statements. | MVP | Workflow | Not present |
| 8 | Agentic Ingestion Exception Handling | — | If extraction issues exist or a document is missing, agent autonomously drafts an email to the dealer requesting the specific missing data — full automated followup. | MVP | Workflow | Not present — demo's "Override with reason (logged)" is manual, not agent-drafted outreach |
| 9 | Extracted vs. Output FS View | Financial Spreading - Initial POC thoughts; "Output View" | UI view mapping extracted components to final output FS components, showing rollups and calculations side-by-side. | MVP | Mapping | Partial — [CompanySpreadView.tsx](app/src/acos/financials/CompanySpreadView.tsx) shows the output spread with drill-to-source lineage, but not a dedicated side-by-side extracted-vs-output view |
| 10 | Rollup Visibility (sub of #9) | "All Views of Statements and configs.drawio" | Extracted data highlighted in the PDF against the cell; every extracted data point shows sub-components and how they roll up to the higher-level FC. | MVP | Mapping | Partial — [SourceDocument.tsx](app/src/acos/financials/SourceDocument.tsx) + lineage strip shows source page/cell, but not full sub-component rollup trees |
| 11 | Financial Component Map Rules — Edit and store | Data Studio and Agent Builder Requirements - CL Alpha | Predefined logic mapping raw extracted components (with hierarchy) to company Financial Components (description, alias, hierarchy). | MVP | Mapping | Partial — [taxonomy.ts](app/src/acos/financials/taxonomy.ts) defines the FC hierarchy/chart of accounts, but no edit/store UI for mapping rules |
| 12 | Financial Component Map Rules — Visual Look | "All Views of Statements and configs.drawio" | Save data mapping configurations and visualize them directly within the FS format UI. | MVP | Mapping | Not present |
| 14 | Temporal Data Mismatch Checks | Post MDP Validation - Data Mismatch Checks | AI agents/rules check discrepancies, e.g. yearly totals vs. 4-quarter collated totals vs. 12-month collated totals. | MVP | Validation | Not present — demo does BS-balances / CF-ties-to-cash checks, not cross-period temporal reconciliation |
| 15 | Historical Mismatch Checks | Post MDP Validation - Data Mismatch Checks | Cross-reference current filings with past filings (e.g. "Year 1" in "Year 2" annual report matches the actual "Year 1" report). | MVP | Validation | Not present |
| 16 | Custom Ratios UI | Ratio Calculator, Explainer etc.drawio | Interface to view ratios and their underlying calculation; ability to edit/manage custom ratios via BODMAS-style rules on Financial Components. | MVP | Analysis | Partial — Ratios tab in [FinancialSpreadingACOS.tsx](app/src/acos/FinancialSpreadingACOS.tsx) shows ratios vs. policy covenants, but ratios are fixed, not user-editable formulas |
| 18 | Inline AI Ratio Explainer | Ratio Calculator, Explainer etc.drawio | Snippet/chat UI explaining exactly how a specific ratio was calculated, pointing to raw data sources used. | MVP | Analysis | Not present — calculated-value drill-down exists ([analytics.ts](app/src/acos/financials/analytics.ts)) but no chat/explainer UI |
| 19 | Custom Risk Recommendation Engine | — | Flexible engine allowing single/multiple custom formulae combining ratios, metrics, and changes into a final quantitative risk score. | MVP | Analysis | Partial — `risk_agent` node exists in `backend/graph/nodes/risk.py` but not exposed as a user-configurable formula engine |
| 20 | Configurable Qualitative Risk Rules | — | Setup interface to define qualitative rules (e.g. "flag if management experience < 5 years"). | MVP | Analysis | Not present |
| 21 | Agentic Qualitative Risk Categorization | — | LLM agents evaluate non-numerical data (management experience, family relations, legal filings) against configurable rules to assign risk categories. | MVP | Analysis | Not present |
| 22 | Credit Memo Generation | Template Based Generation | UI button to instantly auto-generate a comprehensive credit memo from all extracted data, ratios, and risk scores. | POC | Reporting | Present (demo-level) — Credit Memo modal + `memo_agent` node / Gate 4 exist |
| 23 | Credit Memo Template Based | Template Based Generation | Generate credit memo using a pixel-perfect template; agent output plugs into placeholders only. | MVP | Reporting | Not present — current memo is agent-composed, not a template-with-placeholders system |
| 26 | Custom CSV/System Export | — | Generate output CSVs with customizable, savable mappings for download from DXP / upload into accounting software; must allow cell-level mapping against data points and arrays. | MVP | Reporting | Not present — demo export is a placeholder ("Export as PDF (demo)" downloads `.txt`) |
| 28 | Case-Level Dashboards | — | Configurable dashboards showing financial health and timelines for a specific dealer/case. | POC | Dashboards | Partial — Health tab (grade A–E) and Trust Strip exist per-case, but not a configurable dashboard builder |
| 29 | Time-Series Dashboards | — | Toggle/showcase dashboards filtered by Yearly, Monthly, or Quarterly data views. | POC | Dashboards | Partial — Trends tab shows YoY growth + CAGR (yearly only); no monthly/quarterly toggle |
| 30 | Portfolio-Level Dashboards | Portfolio Metrics Dashboard Requirements | High-level configurable dashboards showing aggregated metrics dynamically pulled from all active cases. | MVP | Dashboards | Partial — InSight tab shows portfolio KPIs/covenant chart/active cases table across the 4 demo borrowers, but not user-configurable |
| 31 | Custom Portfolio Metrics UI | — | Interface to view, edit, and manage custom portfolio metrics and ratios. | MVP | Analysis | Not present |
| 32 | Custom Portfolio Metrics UI (calculated values table) | — | A calculated-values table of specific macro-portfolio metrics that feeds into portfolio dashboards. | — | (unspecified) | Not present |

## Summary by Platform Epic

| Epic | # Items | MVP | POC |
|---|---|---|---|
| Workflow | 3 | 2 | 0 |
| Ingestion / Extraction | 3 | 0 | 3 |
| Mapping | 4 | 3 | 0 |
| Validation | 2 | 2 | 0 |
| Analysis | 6 | 5 | 0 |
| Reporting | 3 | 2 | 1 |
| Dashboards | 3 | 1 | 2 |
| (unspecified) | 1 | — | — |

**Total: 25 items** (Sl No 4, 6, 13, 17, 24, 25, 27 were skipped/not present in the source table).

## Read as a whole

- The current `app/` + `backend/` prototype is a **governance/gates + spreading-grid demo** — it proves out Mapping (rollup/lineage), Analysis (ratios/health), and the 5-gate Workflow skeleton, but with fixed/deterministic logic rather than the **configurable, agentic** systems this backlog asks for (editable mapping rules, custom ratio formulas, configurable qualitative risk rules, agentic exception-handling emails).
- **Ingestion/Extraction (POC)** and **Reporting's CSV export (MVP)** are the biggest gaps — nothing in the repo today splits/selects FS pages from a larger package, does true multi-format agentic extraction, or produces a mapped CSV/system export.
- **Workflow** items (auto-assignment, proactive reminders, agentic exception emails) are entirely absent — the demo assumes cases already exist and are already assigned.
