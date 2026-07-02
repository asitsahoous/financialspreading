# Financial Spreading ACOS — Board Demo Script v2

**Audience:** Iron Mountain board · July 20, 2026  
**Format:** Scripted point-and-click — no live ingestion, no typing  
**Primary prototype:** `app/` web application → `npm install && npm run dev` → http://localhost:5173  
**Backup:** Cursor Canvas → open `financial-spreading-acos.canvas.tsx` beside chat  
**Narrative:** Agents operate · Humans govern · Trust is measurable · Orchestration you can see

---

## Pre-demo setup (1 minute)

1. Run `npm run dev` in `financial-spreading-board/app/` — confirm http://localhost:5173 is open
2. Start on **Command Center** tab (default landing)
3. Confirm DXP shell: left nav with Iron Mountain logo placeholder, breadcrumb `Hub / Case Explorer`, tab bar, **`Trust Layer`** button, `+ Case` button
4. Optional dry run: click **Trust Layer** in the tab bar — slide-over explains the Trust Fabric flow (Sources → Evidence → Reasoning → Action), five gates, ten agents, and SOP linkage (use if board asks "what is the trust model?")
5. Have this script open on a second monitor or printed — do not read from the screen during the demo

**Opening line (30 sec):**

> "Commercial lending teams don't need another spreadsheet with a chatbot on the side. They need an agentic credit operating system — where ten specialized agents do the cognitive work, humans approve at five named trust gates, and every action is traceable from a portfolio alert down to a single cell. That's ACOS."

---

## Story 1 — Portfolio Sentinel wakes you up (2 min)

**Tab: Command Center** (default landing)

| Step | Action | Talk track |
|------|--------|------------|
| 1 | Point to the overnight callout banner | "Since your last login, agents processed 15 cases overnight. Three need your attention — estimated 28 minutes total. That's the first thing you see, not a blank dashboard." |
| 1b | Point to **ACOS Trust Layer** banner below callout | "This isn't a copilot beside a spreadsheet. Ten agents do cognitive work; five human gates govern release; every action traces to SOP clauses and audit events. The flow strip — Sources to Action — is the InSight Trust Fabric; gates are where humans sign in lending." |
| 1c | *(Optional)* Click **View trust model** | "Four fabric pillars map to what you see in the demo: connectors and document manifest are Trusted Sources; uploaded 10-K and SOP § links are Trusted Evidence; per-field confidence in Trust Inspector is Trusted Reasoning; gates and the runtime log are Trusted Action. We didn't bolt on SHA-256 badges — we show the surfaces that matter for credit." |
| 2 | Point to **Critical** column — Northern Retail LLC · Gate 1 | "Intake Agent blocked this case at Gate 1. Only 2 of 9 documents per SOP §4.2. The agent didn't guess, it didn't hallucinate — it stopped and escalated." |
| 3 | Point to trust footer on Northern Retail card | "Agent trace · Gate 1 blocked · Est. 15 min review. Every queue card tells you which gate, which agent, and how long your review will take." |
| 4 | Point to **Needs your review** column — Walmart Inc. | "Walmart is ready. Mapping Agent finished 138 of 140 fields in 9 minutes. Review Agent flagged one outlier. Your job is 12 minutes, not 2.5 days." |
| 5 | Point to **Agents working** column — Costco, Target | "These are labeled 'Synthetic portfolio queue — demo breadth.' In production, these are real cases running in parallel. Agents don't sleep." |
| 6 | Point to Agent Queue table below | "Full queue: borrower, stage, last agent action, time saved, trust status. Northern Retail shows Gate 1 blocked with SOP §4.2 reference." |
| 7 | Click **Review mapping** on Walmart card | Navigates to Cases tab → Walmart case workspace |

**Pillar proof:** Agentic@Portfolio — overnight agent work visible first, not emails. Trust@Portfolio — SOP citations on blocked cards, not generic errors.

---

## Story 2 — Agent briefing, not blank spreadsheet (1.5 min)

**Tab: Cases (Case Workspace) — Walmart, Review stage**

| Step | Action | Talk track |
|------|--------|------------|
| 1 | Point to **case header bar** | "Case ID, Trigger Type, SLA, Status, Extraction Confidence 78%, Risk: Low Risk, Normalization: Balanced. You know the case state before you read a single cell." |
| 2 | Point to **pipeline stepper** — Ingestion ✓ → Extractions ✓ → Output (active 2) → Health | "Four stages of agent work — the first two are done. You're at Output, step 2 of 2. Agents authored this progress bar, not a project manager." |
| 3 | Point to **agent briefing callout** | "Mapping Agent completed 138/140 fields in 9 min. Review Agent flagged 1 outlier. Estimated review: 12 min. Agents saved ~2.5 days vs manual spread." |
| 4 | Point to **Case Trust Strip** | "Trust score 94%, 1 open exception, Gate 2 pending, agent time saved ~2.5 days, audit events. This strip is always visible — trust is structural, not a tooltip." |
| 5 | Point to **Next best action** + primary CTA | "Resolve Total Assets outlier, then sign Gate 2 to release Risk Agent. This used to be buried in a side panel. Now it's the first action." |
| 6 | Point to **Gate 2 pending** pill | "Humans govern. Risk Agent is queued but cannot run until you approve the spread. That's not a feature, that's the governance model." |

**Pillar proof:** Agentic@Case — agents did the work before the analyst arrived. Trust@Case — trust strip always visible, gate blocks Risk Agent until human signs.

---

## Story 3 — Lifecycle transparency (2 min)

**Tab: Cases — Lifecycle Rail (left) + Stage Trace Panel (center)**

| Step | Action | Talk track |
|------|--------|------------|
| 1 | Point to lifecycle rail on the left | "Seven stages — each one is a runtime event with a named actor, not a menu item. This is Asit's case lifecycle model." |
| 2 | Click **Intake** on lifecycle rail | "Stage trace: Who acted — Case Orchestrator routed the case; Intake Agent validated docs; Sarah W. signed Gate 1 at 2:18 AM." |
| 3 | Point to Input / Reasoning / Output columns | "Every stage has structured input — what it received. Reasoning — how the agent decided. Output — what artifacts were produced. Moody's has audit logs. We have structured reasoning." |
| 4 | Point to Gate 1 (passed, Sarah W.) | "Human gates are first-class runtime events — not checkboxes buried in settings. Gate 1 is signed, timestamped, attributed." |
| 5 | Click **Extraction** | "Document Intelligence extracted 140 fields from 10-K pages 42, 87, 112 per SOP §6 page map. 132 high confidence, 8 review-tier." |
| 6 | Click **Review** (active stage) | "Review Agent flagged the outlier. You are the pending actor on Gate 2. Assessment is blocked by Orchestrator until you sign." |
| 7 | Scroll to **Case runtime log** at bottom | "End-to-end audit: portfolio scan → orchestration → agents → human gates. Seven columns: time, stage, actor type, actor, input, reasoning, output. This is the complete chain of custody." |

**Pillar proof:** Both pillars — actor attribution on every stage (agent/human/system) + full structured reasoning trace per step.

---

## Story 4 — Completeness gate, sad path (2 min)

**Start: Command Center → Northern Retail LLC**

| Step | Action | Talk track |
|------|--------|------------|
| 1 | Return to **Command Center** tab | "Happy path is commodity — Evalueserve and Moody's both claim accuracy. Exceptions are the demo." |
| 2 | Click **Resolve completeness** on Northern Retail | Navigates to Cases → Northern Retail · Intake stage |
| 3 | Point to **case header** — status: Blocked, pipeline stepper shows Gate 1 blocked with badge 7 | "Same header layout — same runtime model. Different path." |
| 4 | Point to **Case switcher** | "Two live cases — Walmart happy path, Northern Retail sad path. Toggle between them at any time." |
| 5 | Point to **Stage trace** — Intake: blocked | "Who acted: Orchestrator opened the case, Intake Agent ran completeness check, J. Martinez cannot sign Gate 1." |
| 6 | Point to Input / Reasoning / Output | "2 of 9 docs received. Agent reasoning: policy blocks Gate 1 with any missing required item — no exceptions without a documented override. Output: entire pipeline held." |
| 7 | Point to **9-row document checklist** — 7 Missing pills | "Not a generic error. Each missing document is tied to its SOP §4.2 clause — click any § link to open the uploaded Credit Policy viewer." |
| 8 | Click **↑ Upload** or **Mark received (demo)** on missing rows | "Each upload marks the next missing document received — Intake Agent re-runs completeness. Demo: mark all seven, then Gate 1 sign-off unlocks the pipeline." |
| 9 | After 9/9 received, click **Sign Gate 1 — Approve document set** | "Gate 1 signed — extraction releases. Northern Retail continues on the Walmart spread template with a clear banner — full happy path through Gates 2–5." |
| 10 | Click **Override with reason (logged)** (optional sad-path beat) | "Override is audited but does not pass Gate 1 — same trust model as before." |
| 11 | Scroll to **runtime log** — new human row highlighted | "The override is traced. The analyst's intent is on record. The system didn't let them quietly bypass — it logged their decision." |

**Pillar proof:** Trust gate — agent stops the pipeline, human override is audited, sad path has the same structured trace as happy path.

---

## Story 5 — Intelligent mapping with trust proof (3 min)

**Tab: Cases → Walmart → Review stage (return)**

| Step | Action | Talk track |
|------|--------|------------|
| 1 | Switch back to **Walmart** case | "Back to the happy path. Walmart, Review stage." |
| 2 | Point to split-pane layout | "Source PDF on the left — Walmart FY2025 10-K, Balance Sheet, page 43. Extracted values on the right. Same split-pane as the Figma design." |
| 3 | Point to tabs: **Extracted (140) / Exceptions (1) / Corrected (0)** | "Agents extracted 140 fields. One exception — not hidden in a footnote. Not averaged away. Surfaced for you." |
| 4 | Point to **Launch Spread ↗** button | "From any point in review, you can launch the full credit memo. We'll come back to that." |
| 5 | Point to confidence badges — High (green), Medium (amber), Low (red) | "Every cell has a tier. Review Agent flagged Total Assets at 41% confidence." |
| 6 | Point to **Total Assets $100K** row | "FY2024 was $98.1 billion. Industry median $120 billion. This is not a rounding error — it's a decimal slip on page 43. OCR read thousands where billions was correct." |
| 7 | Click **Inspect** on Total Assets row | Opens Trust Inspector |
| 8 | In Trust Inspector — point to reasoning callout; click **§7.4** SOP link | "Source: 10-K page 43. Click §7.4 to open the uploaded Credit Policy — Total Assets mapping rule. Agent: Review QA. Trust is a layer — not a tooltip." |
| 9 | Click **Accept mapping** | "Human action appended to runtime log — highlighted in blue at the bottom. Gate 2 eligibility is now traceable to this decision." |
| 10 | Scroll down to **Validate Ratios** section | "Below the extraction table, the Risk Agent has queued the ratio analysis — waiting for Gate 2." |
| 11 | Click **Liquidity** tab in Validate Ratios | "Current Ratio 0.82x vs threshold 0.79x — amber. Sparkline shows 2025 vs 2024 trend quarterly. Risk Agent calculated this, not a spreadsheet formula." |
| 12 | Click **Profitability** tab | "Net Profit Margin improving YoY. ROA stable. EBIT Margin pending final audited statements." |
| 13 | Click **Mark Complete** | "Ratios validated — resolve Total Assets exception, then sign Gate 2 below." |
| 14 | Click **Sign Gate 2 — Approve spread** | "Risk Agent is released. Stage advances to Assessment." |

**Pillar proof:** Agent mapping with per-cell confidence + source lineage. Human accept/override is traced. Validate Ratios shows agent-calculated formulas with trend data.

---

## Story 6 — Connected decision (2.5 min)

**Tab: Cases → Walmart → Credit Memo stage (lifecycle rail)**

| Step | Action | Talk track |
|------|--------|------------|
| 1 | Click **Credit Memo** on lifecycle rail | Navigates to Memo stage |
| 2 | Point to **Stage trace** — Memo | "Connector Sync Agent pulled Experian, Equifax, and D&B bureau scores via API on the borrower's EIN — the night the case opened. Not a data entry field. An API call with a timestamp and an entity ID." |
| 3 | Open **Connector Trust Panel** | "Six feeds: Experian Intelliscore 76, Equifax BFR 92, D&B PAYDEX 80 — commercial business scores, not consumer FICO. AML/KYC entity screen on EIN. UBO verification on SSN for two beneficial owners. Bloomberg peer ratings." |
| 4 | Point to masked identifiers | "EIN 71-0415•••, SSN •••-••-4521. The system stores the real identifiers; the UI shows masked versions. Auditors can verify against the connector log." |
| 5 | Scroll **Credit memo draft** | "Every paragraph is source-tagged. Section 2 cites bureau APIs. Section 3 cites AML/KYC connectors with connector IDs. Auditors can trace memo text to API pull timestamp." |
| 6 | Click **Generate Report** button (top right) | Opens Credit Memo full-screen modal |
| 7 | Point to risk score **5.45 / 10.0** | "Risk Agent weighted the case: spread quality 40%, external verification 35%, qualitative 25%. Not a black box — a rationale tree." |
| 8 | Point to **DECISION: NEGOTIATE** | "Decision Synthesis Agent: conditional approval not recommended at $750M. Bifurcated structure proposed — $250M revolving + $500M asset-backed vehicle line." |
| 9 | Expand **Borrower Profile** section | "Collapsible sections — each with a comment CTA for the credit committee. Evidence bundle: Walmart EIN, 2 UBO SSN profiles, DUNS." |
| 10 | Point to **Trend & Variance Analysis** on right rail | "Three trend items: Tangible Net Worth declining, Current Ratio below 1.2x covenant, Interest Coverage improving. Numbered, attributable, actionable." |
| 11 | Switch to **Northern Retail** → Credit Memo stage | "Sad path: Connector Agent ran preliminary AML on EIN. Bureau and guarantor SSN KYC blocked — intake incomplete. The connectors respect the pipeline gates." |

**Pillar proof:** Agentic decision with connector trust. Every memo paragraph cites its API source. Decision Synthesis produces a rationale tree, not a score.

---

## Story 7 — Platform ROI close (2 min)

**Tab: InSight**

| Step | Action | Talk track |
|------|--------|------------|
| 1 | Click **InSight** tab | Navigate to Portfolio view |
| 2 | Point to **InSight Assist panel** (right side) | "Portfolio Sentinel authored this briefing overnight. Critical Alert: Rising Credit Risk. 23 active covenant breaches, +7 since last month. AutoWest and Vantage Rental are highest priority. That's an agent writing a morning brief, not a BI chart." |
| 3 | Point to **agent KPI row** | "Three agent-authored metrics: 94% auto-pass rate — Sentinel and Review QA. 12 open exceptions across the book — Review Agent flagged overnight. 312 agent-hours saved this month — Orchestrator rollup across 42 cases." |
| 4 | Point to **Active cases table** | "Every borrower: stage, last agent action, agent identity, trust status. Walmart in Review, Review QA flagged outlier, 1 flag. Northern Retail in Intake, blocked, Gate 1. AutoWest in Assessment, covenant breach detected. One thread — portfolio to case." |
| 5 | Point to **In Focus banner** | "High-risk cases surfaced by agent prioritization. Each card has an AI-authored analysis blurb — not a generic alert. Vantage Rental: '$120M discrepancy between Cash Flow Statement and Balance Sheet.'" |
| 6 | Point to Covenant Breaches deltas (red +1, +7) | "Deltas are semantic — more covenant breaches is bad, shown in red. Sentinel surfaced 7 new breaches this month." |
| 7 | Point to covenant chart — Sentinel tag | "Bar chart authored by Portfolio Sentinel Agent. Liquidity drives 40% of violations — Current Ratio <1.2x is 9 of 23 breaches. Sentinel recommends prioritizing Current Ratio reviews." |
| 8 | Click **View case stage → Review** on Walmart alert | Navigates back to Walmart Review stage |

**Closing line (30 sec):**

> "S&P and Moody's standardise to their chart of accounts so you can compare like-for-like. Evalueserve sells accuracy. We do all of that — the master database, the period-column spread, the ratios — and then we go further: every number traces to a source cell, every calculation traces to its inputs, the statements check themselves with live integrity, and trust is a number you can audit. Ten named agents, five human gates, portfolio alert to cell-level lineage. That's orchestration you can see."

---

## Story 8 — Financial Spread: master database, cell-level lineage & measurable trust (4 min)

**Tab: Financial Spread** (borrower: Meridian Foods Co.)

This is the deepest proof of the two board tenets — **Agents operate, Trust is measurable** — on the actual spreading surface where competitors compete (S&P ProSpread, Moody's CreditLens, Evalueserve Spreadsmart).

| Step | Action | Talk track |
|------|--------|------------|
| 1 | Click **Financial Spread** → land on **Meridian Foods Co.** | "One borrower, one **master financial database**. Every statement we ingest — any quarter, any year — is standardised by the Mapping Agent to the ACOS chart of accounts and mapped into these period columns. This is the 'compare like-for-like' grid S&P and Moody's sell — but watch what we put on top of it." |
| 2 | Point to the **period columns** (FY2023–FY2025) | "Side-by-side comparison, exactly like Capital IQ or a Yahoo Finance grid. Income statement, balance sheet, cash flow — all three, all periods, one source of truth." |
| 3 | Click **＋ Ingest prior-year statement (FY2022)** | "Add another filing and it maps straight into the master database — a new column appears. The database grows; the taxonomy keeps it apples-to-apples." |
| 4 | Toggle **Unit** (Auto / K / MM / B) and **Order** | "Analyst-grade ergonomics — units and ordering like any terminal they already use." |
| 5 | Point to the **red integrity banner** — "Balance sheet balances: off by 23,670" | "Here's the difference. The platform runs **cross-statement integrity checks live** — does the balance sheet balance, does cash flow tie to cash, does net income tie across statements. It caught a discrepancy the extraction agent introduced. Moody's and S&P give you a spread; we tell you whether the spread is internally consistent." |
| 6 | In the grid, point to **Inventory FY2025** in red (flagged) | "The Mapping Agent flagged one cell at low confidence — an OCR scale error. Every other number ties. The agent didn't hide it or average it away; it surfaced the one thing that needs a human." |
| 7 | Click the Inventory cell → **Lineage strip** opens | "Click any value and it traces to its exact **page and source cell** — the source document shows 26,300, the extraction read 2,630. That's cell-level lineage, not 'page 43'." |
| 8 | Type the corrected value + a **rationale**, click **Save correction** | "I correct it in place with a documented reason. Watch: the subtotals, totals, ratios, and the integrity banner **recompute live** — the balance sheet re-balances, the exception clears, and the **Trust score rises from 27% to 65%**. The edit is written to the case lifecycle with who/when/why." |
| 9 | Point to the **Trust ribbon** (Trust score, Human-verified, Open exceptions, Integrity, Lineage) | "Trust is a **computed, auditable number** — not a badge. Coverage, human-verification, open exceptions, integrity, and 100% lineage. You can see exactly how it's derived." |
| 10 | Click a **calculated value** (e.g. Current Ratio) | "Calculated values are never trusted from the page — the engine derives them and drills to their dependencies: Current Ratio → Total Current Assets → Cash, AR, Inventory, Prepaid → each a source cell. That's a rationale tree from a ratio down to a cell." |
| 11 | Click **Trends** then **Ratios** then **Health** | "Trend analysis (YoY, CAGR), ratios vs. your policy covenants with pass/warn/fail, and a composite financial-health grade — all computed off the same master database, all traceable back to source." |

**Pillar proof:** Agentic — agents standardise, map, calculate, and flag. Trust — every value has cell+page lineage, every calculation traces to its inputs, every human edit is logged, and trust is a live computed score. Integrity checks are a differentiator none of the incumbents foreground.

**One-liner:** "Evalueserve and Moody's give you a spread and an audit log. We give you a spread where every number traces to a source cell, every calculation traces to its inputs, the statements check themselves, and trust is a number you can audit."

---

## Appendix A — Agent Catalog (if time permits, 2 min)

**Tab: Agents**

| Step | Action | Talk track |
|------|--------|------------|
| 1 | Point to **Last 24h agent actions** strip | "Every agent action from the last 24 hours — timestamped, attributed, linked to a case. The catalog isn't documentation; it's the live runtime." |
| 2 | Walk the 10 agent cards | "Ten named agents, each with a stage, role, trust outputs, and optional human gate. Not 'AI' — named actors in the credit lifecycle." |
| 3 | Point to Gate pills (Gate 1–5) | "Five human gates across the pipeline. The agent catalog tells you where humans are required to govern." |
| 4 | Point to Connector strategy callout | "Experian, Equifax, D&B on EIN. AML/KYC on EIN + UBO SSN/ITIN. Bloomberg for peer benchmarking. Connector Agent orchestrates the bundle." |

---

## Appendix B — Cases list (if board asks about scale)

**Tab: Cases**

| Step | Action | Talk track |
|------|--------|------------|
| 1 | Point to **In Focus** cards — 4 High Risk borrowers | "Agent-prioritized — not sorted by upload date. AutoWest, Tesla Rental, Vantage Rental, and Northern Retail all flagged with AI-authored risk blurbs." |
| 2 | Point to table columns | "9 borrowers: Extraction Confidence %, Health Score x/10 (agent-calculated), Risk Status, Primary Concern, Tasks outstanding." |
| 3 | Point to color-coded Health Scores | "7.2/10 green for Walmart. 1.9/10 red for Vantage Rental. Agent-calculated, not analyst-entered." |
| 4 | Point to Extraction Confidence badges | "78% for Walmart — one outlier. 65% for Vantage Rental — needs more review. Confidence is per-case, surfaced at the list level." |

---

## Timing summary

| Story | Minutes | Cumulative | Pillar |
|-------|---------|------------|--------|
| Opening | 0:30 | 0:30 | — |
| 1 — Sentinel wake-up | 2:00 | 2:30 | Agentic + Trust @Portfolio |
| 2 — Agent briefing | 1:30 | 4:00 | Agentic + Trust @Case |
| 3 — Lifecycle trace | 2:00 | 6:00 | Both |
| 4 — Completeness sad path | 2:00 | 8:00 | Trust gate + exception |
| 5 — Mapping + Trust Inspector | 3:00 | 11:00 | Both |
| 6 — Connected decision | 2:30 | 13:30 | Agentic + Connector trust |
| 7 — Portfolio ROI close | 1:30 | 15:00 | Both @Portfolio |
| Closing | 0:30 | **15:00** | — |
| 8 — Financial Spread deep-dive *(optional / on request)* | 4:00 | **19:00** | Both @Spread — master DB, lineage, integrity, measurable trust |

**15-minute core** = Stories 1–7 + close. Run **Story 8** when the board asks "how does the actual spreading compare to Moody's / S&P?" — it is the deepest proof of the two tenets on the competitive battleground.

---

## Competitor positioning (board Q&A)

| Question | Answer |
|----------|--------|
| vs Moody's CreditLens / Spreading & Scoring | "CreditLens standardises to Moody's chart of accounts and gives you a spreading grid and an audit log. We match the grid — master database, period columns, like-for-like — then add cell+page lineage, live cross-statement integrity, and lifecycle rails. Click a stage, see the named agent, the structured reasoning, the gate. Governance you demonstrate, not document." |
| vs S&P Global ProSpread / Capital IQ | "ProSpread maps PDFs to the Capital IQ chart of accounts for an apples-to-apples view — same standardisation we do. Where we differ: every extracted value clicks through to its exact source cell, every calculated value drills to its inputs, and the balance sheet and cash flow check themselves live. Standardisation is table stakes; provable lineage and self-checking integrity are the wedge." |
| vs Evalueserve Spreadsmart | "They claim near-100% accuracy with templates and taxonomy. We show which values need you, why each was flagged, from which page and cell, by which agent, under which SOP clause — and a trust score you can audit. Accuracy is table stakes; measurable trust is the differentiator." |
| vs generic AI copilots | "Copilots chat. ACOS orchestrates — ten named agents, five human gates, one portfolio-to-case thread, a master financial database with cell-level lineage. The agent is in the workflow, not beside it." |
| Is 'trust' just a slogan? | "No — it's computed. On the Financial Spread tab the trust score is derived from extraction coverage, human-verification rate, open exceptions, and live integrity checks. Correct a flagged cell and watch it move. It's a number with a visible formula, not a badge." |
| How does it scale? | "The Cases list shows 9 borrowers with agent-calculated health scores and extraction confidence. Command Center shows parallel agent work across cases simultaneously. The orchestrator routes; analysts govern." |
| What about hallucination? | "Every memo paragraph cites its API source with a connector ID and timestamp. The Trust Inspector shows the exact OCR page and SOP clause. Humans sign off at five gates before the decision is reached." |
| What's the integration story? | "Connector Sync Agent: Experian and Equifax via EIN, D&B via DUNS, AML/KYC via EIN and SSN/ITIN for beneficial owners, Bloomberg for peer data. SOP rules are configurable — upload the institution's credit policy, the agents apply it." |

---

## Screen reference map

| App tab | Key interactions | Story |
|---------|-----------------|-------|
| **Command Center** | Trust Layer banner; queue cards with trust footers; agent queue table; overnight callout; all cards drillable | 1, 4 |
| **Trust Layer (shell)** | Tab bar **Trust Layer** button → slide-over: pillars, G1–G5 ladder, 10 agents, Walmart/Northern anchors | 1, Q&A |
| **Cases (list view)** | In Focus cards (toggle); Health Score; Extraction Confidence; inline row expansion with extraction preview; Open full case button | Appendix B |
| **Cases (workspace) → Walmart** | Pipeline stepper; case header metadata; Trust Strip; briefing; Gate 2; ← back nav + clickable breadcrumb | 2, 5 |
| **Cases (workspace) → lifecycle rail** | Click any stage → Input/Reasoning/Output; Gate sign-off; runtime log | 3 |
| **Cases → Intake** | Documents Uploaded table (classification, uploader, size, SOP); Gate 1 sign-off / override | 3, 4 |
| **Cases → Review** | Split PDF/table pane; Extracted/Exceptions/Corrected/Normalized tabs; Trust Inspector with Impact + Change Log tabs + correct value input; Validate Ratios (5 tabs: Summary, Liquidity, Profitability, Solvency, Efficiency); Gate 2 | 5 |
| **Cases → Assessment** | Risk formula panel; Gate 3 (Risk officer); ratio preview | 5 |
| **Cases → Credit Memo** | Connector Trust Panel; memo source tags; Gate 4; Generate Report modal with Export dropdown | 6 |
| **Cases → Credit Memo modal** | Risk score 5.45/10; DECISION: NEGOTIATE; 6 collapsible sections; Trend & Variance analysis; Export as PDF/Excel | 6 |
| **Cases → Decision** | Decision rationale tree; Gate 5 — credit committee sign-off; View memo report button | 6 |
| **Cases → Northern Retail** | Gate 1 blocked; 7 missing docs with classification badges; override logged; pipeline held | 4 |
| **InSight** | InSight Assist panel (Sentinel briefing); agent KPI row; active cases table; In Focus banner; Sentinel alerts; covenant chart | 7 |
| **Agents** | 10 agent cards; last-24h activity strip; connector strategy | Appendix A |
| **Financial Spread** | Master database with period columns; ingest prior-year; unit/order toggles; Spread / Trends / Ratios / Health / Source & Lineage tabs; live integrity banner; trust ribbon; in-cell edit with rationale | 8 |

---

## Interactive features (all functional)

| Feature | Where | What it does |
|---------|-------|-------------|
| **Clickable breadcrumb** | All case views | Hub → Command Center; Case Explorer → Cases list; ← arrow → back to Cases list |
| **Trust Inspector Impact tab** | Review stage → Inspect | Shows cascading effect table: which downstream metrics change when you correct the value |
| **Trust Inspector Change Log** | Review stage → Inspect | Timeline of who extracted, mapped, and flagged each field |
| **Trust Inspector Apply correction** | Review stage → Inspect | Corrected value + note → audit log entry with timestamp |
| **Corrected tab** | Review stage tabs | Shows overrides after analyst corrections — not just placeholder text |
| **Normalized tab** | Review stage tabs | GAAP component breakdown (Cash → Time Deposits, Marketable Securities, etc.) |
| **Inline row expansion** | Cases list → click chevron | Extraction preview (4 fields) + "Open full case →" button |
| **View In Focus toggle** | Cases list | Dropdown to show/hide the In Focus banner |
| **Export as PDF/Excel** | Case header + Credit Memo modal | Dropdown with last-export timestamp |
| **Gate 5 sign-off** | Decision stage | Credit committee Approve / Request revisions / View memo report |
| **Validate Ratios (5 tabs)** | Review stage | Summary + Liquidity + Profitability + Solvency + Efficiency with sparkline trend charts and "Calculating…" loading state |
| **Primary CTA** | Case header | Clicks route to the default stage for the case |
| **Launch Spread ↗** | Review stage | Opens full credit memo report modal |
| **All queue cards** | Command Center | Every card has a drillable button that opens the correct case + stage |
| **Trust Layer panel** | Tab bar (all views) | Read-only model: five gates, ten agents, policy anchors, competitor differentiation |
| **Master financial database** | Financial Spread tab | Period-column spread standardised to the ACOS chart of accounts; ingest more statements → more columns |
| **Cell + page lineage** | Financial Spread → click any value | Source values highlight their exact origin cell on the rendered statement page; calculated values drill to dependencies |
| **In-cell correction** | Financial Spread → click a source value | Edit value + required rationale → recomputes dependents live, re-runs integrity, logs to change history |
| **Live integrity checks** | Financial Spread (always visible) | Balance-sheet-balances, cash-flow-ties, net-income-ties — computed per period; flags the seeded FY2025 defect |
| **Computed trust score** | Financial Spread trust ribbon | Coverage + human-verified + open exceptions + integrity → auditable % that moves as you correct/verify |
| **Trends / Ratios / Health** | Financial Spread sub-tabs | YoY & CAGR; ratios vs policy covenants (pass/warn/fail); composite health grade — all off the master DB |
