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
3. Confirm DXP shell: left nav with Iron Mountain logo placeholder, breadcrumb `Hub / Case Explorer`, tab bar, `+ Case` button
4. Have this script open on a second monitor or printed — do not read from the screen during the demo

**Opening line (30 sec):**

> "Commercial lending teams don't need another spreadsheet with a chatbot on the side. They need an agentic credit operating system — where ten specialized agents do the cognitive work, humans approve at five named trust gates, and every action is traceable from a portfolio alert down to a single cell. That's ACOS."

---

## Story 1 — Portfolio Sentinel wakes you up (2 min)

**Tab: Command Center** (default landing)

| Step | Action | Talk track |
|------|--------|------------|
| 1 | Point to the overnight callout banner | "Since your last login, agents processed 15 cases overnight. Three need your attention — estimated 28 minutes total. That's the first thing you see, not a blank dashboard." |
| 2 | Point to **Critical** column — Northern Retail LLC · Gate 1 | "Intake Agent blocked this case at Gate 1. Only 2 of 9 documents per SOP §4.2. The agent didn't guess, it didn't hallucinate — it stopped and escalated." |
| 3 | Point to trust footer on Northern Retail card | "Agent trace · Gate 1 blocked · Est. 15 min review. Every queue card tells you which gate, which agent, and how long your review will take." |
| 4 | Point to **Needs your review** column — Walmart Inc. | "Walmart is ready. Mapping Agent finished 138 of 140 fields in 9 minutes. Review Agent flagged one outlier. Your job is 12 minutes, not 2.5 days." |
| 5 | Point to **Agents working** column — Costco, Target | "These are labeled 'synthetic queue — demo breadth.' In production, these are real cases running in parallel. Agents don't sleep." |
| 6 | Point to Agent Queue table below | "Full queue: borrower, stage, last agent action, time saved, trust status. Northern Retail shows Gate 1 blocked with SOP §4.2 reference." |
| 7 | Click **Review mapping** on Walmart card | Navigates to Cases tab → Walmart case workspace |

**Pillar proof:** Agentic@Portfolio — overnight agent work visible first, not emails. Trust@Portfolio — SOP citations on blocked cards, not generic errors.

---

## Story 2 — Agent briefing, not blank spreadsheet (1.5 min)

**Tab: Cases (Case Workspace) — Walmart, Review stage**

| Step | Action | Talk track |
|------|--------|------------|
| 1 | Point to **case header bar** | "Case ID, Trigger Type, SLA, Status, Extraction Confidence 99%, Risk: Low Risk, Normalization: Balanced. You know the case state before you read a single cell." |
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
| 7 | Point to **9-row document checklist** — 7 Missing pills | "Not a generic error. Each missing document is tied to its SOP §4.2 clause. The agent knows which clause requires which document." |
| 8 | Click **Override with reason (logged)** | "Watch the runtime log. A new human row appears — highlighted. Override is audited. But the pipeline stays blocked — Gate 1 does not pass until the documents arrive." |
| 9 | Scroll to **runtime log** — new human row highlighted | "The override is traced. The analyst's intent is on record. The system didn't let them quietly bypass — it logged their decision." |

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
| 8 | In Trust Inspector — point to reasoning callout | "Source: 10-K page 43. SOP §7.4. Agent: Review QA. Audit ID trace-8842-wmt-assets. Reasoning: FY2024 $98.1B, industry median $120B, pattern match 41%. Trust is a layer — not a tooltip." |
| 9 | Click **Accept mapping** | "Human action appended to runtime log — highlighted in blue at the bottom. Gate 2 eligibility is now traceable to this decision." |
| 10 | Scroll down to **Validate Ratios** section | "Below the extraction table, the Risk Agent has queued the ratio analysis — waiting for Gate 2." |
| 11 | Click **Liquidity** tab in Validate Ratios | "Current Ratio 0.82x vs threshold 0.79x — amber. Sparkline shows 2025 vs 2024 trend quarterly. Risk Agent calculated this, not a spreadsheet formula." |
| 12 | Click **Profitability** tab | "Net Profit Margin improving YoY. ROA stable. EBIT Margin pending final audited statements." |
| 13 | Click **Mark Complete** | "Risk Agent is released. Gate 2 signed." |

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

**Tab: Insight**

| Step | Action | Talk track |
|------|--------|------------|
| 1 | Click **Insight** tab | Navigate to Portfolio view |
| 2 | Point to **InSight Assist panel** (right side) | "Portfolio Sentinel authored this briefing overnight. Critical Alert: Rising Credit Risk. 23 active covenant breaches, +7 since last month. AutoWest and Vantage Rental are highest priority. That's an agent writing a morning brief, not a BI chart." |
| 3 | Point to **agent KPI row** | "Three agent-authored metrics: 94% auto-pass rate — Sentinel and Review QA. 12 open exceptions across the book — Review Agent flagged overnight. 312 agent-hours saved this month — Orchestrator rollup across 42 cases." |
| 4 | Point to **Active cases table** | "Every borrower: stage, last agent action, agent identity, trust status. Walmart in Review, Review QA flagged outlier, 1 flag. Northern Retail in Intake, blocked, Gate 1. AutoWest in Assessment, covenant breach detected. One thread — portfolio to case." |
| 5 | Point to **In Focus banner** | "High-risk cases surfaced by agent prioritization. Each card has an AI-authored analysis blurb — not a generic alert. Vantage Rental: '$120M discrepancy between Cash Flow Statement and Balance Sheet.'" |
| 6 | Point to Covenant Breaches deltas (red +1, +7) | "Deltas are semantic — more covenant breaches is bad, shown in red. Sentinel surfaced 7 new breaches this month." |
| 7 | Point to covenant chart — Sentinel tag | "Bar chart authored by Portfolio Sentinel Agent. Liquidity drives 40% of violations — Current Ratio <1.2x is 9 of 23 breaches. Sentinel recommends prioritizing Current Ratio reviews." |
| 8 | Click **View case stage → Review** on Walmart alert | Navigates back to Walmart Review stage |

**Closing line (30 sec):**

> "Evalueserve sells accuracy. Moody's sells integrated content. DXP sells orchestration you can see — ten named agents, five human gates, trust from portfolio alert to cell-level lineage. Agents saved 2.5 days on this case alone. Across 42 cases this month, that's 312 hours. That's the platform story."

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
| 1 | Point to **In Focus** cards — 4 High Risk borrowers | "Agent-prioritized — not sorted by upload date. AutoWest, Tesla Rental, Vantage Rental all flagged with AI-authored risk blurbs." |
| 2 | Point to table columns | "8 borrowers: Extraction Confidence %, Health Score x/10 (agent-calculated), Risk Status, Primary Concern, Tasks outstanding." |
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

---

## Competitor positioning (board Q&A)

| Question | Answer |
|----------|--------|
| vs Moody's Spreading & Scoring | "Moody's has audit logs — we have lifecycle rails. Click a stage, see the named agent, see the structured reasoning, see the gate. That's governance you can demonstrate, not document." |
| vs Evalueserve Spreadsmart | "They claim 95% accuracy. We show which 5% needs you, why it was flagged, from which page, by which agent, under which SOP clause. Accuracy is table stakes; lineage is the differentiator." |
| vs generic AI copilots | "Copilots chat. ACOS orchestrates — ten named agents, five human gates, one portfolio-to-case thread, connector bundle with masked entity IDs. The agent is in the workflow, not beside it." |
| How does it scale? | "The Cases list shows 8 borrowers with agent-calculated health scores and extraction confidence. Command Center shows parallel agent work across cases simultaneously. The orchestrator routes; analysts govern." |
| What about hallucination? | "Every memo paragraph cites its API source with a connector ID and timestamp. The Trust Inspector shows the exact OCR page and SOP clause. Humans sign off at five gates before the decision is reached." |
| What's the integration story? | "Connector Sync Agent: Experian and Equifax via EIN, D&B via DUNS, AML/KYC via EIN and SSN/ITIN for beneficial owners, Bloomberg for peer data. SOP rules are configurable — upload the institution's credit policy, the agents apply it." |

---

## Screen reference map

| App tab | Key interactions | Story |
|---------|-----------------|-------|
| **Command Center** | Queue cards with trust footers; agent queue table; overnight callout | 1, 4 |
| **Cases (list view)** | In Focus cards; Health Score; Extraction Confidence; Risk Status table | Appendix B |
| **Cases (workspace) → Walmart** | Pipeline stepper; case header metadata; Trust Strip; briefing; Gate 2 | 2, 5 |
| **Cases (workspace) → lifecycle rail** | Click any stage → Input/Reasoning/Output; Gate sign-off; runtime log | 3 |
| **Cases → Review** | Split PDF/table pane; confidence badges; Trust Inspector; Validate Ratios | 5 |
| **Cases → Credit Memo** | Connector Trust Panel; memo source tags; Generate Report modal | 6 |
| **Cases → Credit Memo modal** | Risk score 5.45/10; DECISION: NEGOTIATE; collapsible sections | 6 |
| **Cases → Northern Retail** | Gate 1 blocked; sad-path trace; override logged | 4 |
| **Insight** | InSight Assist panel; agent KPI row; active cases table; Sentinel alerts | 7 |
| **Agents** | 10 agent cards; last-24h activity strip; connector strategy | Appendix A |
