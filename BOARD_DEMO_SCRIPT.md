# Financial Spreading ACOS — 15-Minute Board Demo Script

**Audience:** Iron Mountain board  
**Format:** Scripted point-and-click (no live ingestion)  
**Prototype:** Open `financial-spreading-acos.canvas.tsx` in Cursor Canvas  
**Narrative:** Agents operate · Humans govern · Trust is measurable

---

## Pre-demo setup (30 seconds)

1. Open the ACOS canvas beside this script.
2. Start on **Command Center** tab (default landing).
3. Confirm DXP shell is visible: left nav, `Hub / Case Explorer` breadcrumb, tab bar.

**Opening line (30 sec):**

> "Commercial lending teams don't need another spreadsheet with a chatbot on the side. They need an agentic credit operating system — where specialized agents do the cognitive work, humans approve at trust gates, and every action is traceable from portfolio alert to case cell."

---

## Story 1 — Portfolio Sentinel wakes you up (2 min)

**Tab:** Command Center

| Step | Action | Talk track |
|------|--------|------------|
| 1 | Point to overnight callout | "Since your last login, agents processed 15 cases. Three need your review — estimated 28 minutes total." |
| 2 | Point to **Critical** column — Northern Retail | "Intake Agent blocked this case at Gate 1 — only 2 of 9 documents per SOP §4.2. The agent didn't guess; it stopped." |
| 3 | Point to **Needs your review** — Walmart | "Walmart is ready for human review. Mapping Agent finished 138 of 140 fields; Review Agent flagged one outlier." |
| 4 | Click **Review mapping** on Walmart card | Transitions to Cases tab |

**Pillar proof:** Agentic@Portfolio (overnight agent work visible first) + Trust@Portfolio (blocked cases show SOP reference)

---

## Story 2 — Agent briefing, not blank spreadsheet (1.5 min)

**Tab:** Cases (Case Workspace)

| Step | Action | Talk track |
|------|--------|------------|
| 1 | Point to agent briefing banner | "You don't open a blank spread. Agents already mapped the case. The banner tells you what's done, what's flagged, and how long review will take." |
| 2 | Point to **Case trust strip** | "Trust score, open exceptions, gate status, agent time saved, and audit event count — always visible." |
| 3 | Point to **Next best action** | "This used to live buried in a side panel. Now it's the primary CTA — resolve the outlier, then sign Gate 2." |
| 4 | Point to **Gate 2 pending** pill | "Humans govern. Risk Agent cannot run until you approve the spread." |

**Pillar proof:** Agentic@Case — agents did the work before the analyst arrived

---

## Story 3 — Lifecycle transparency (2.5 min)

**Tab:** Cases — Lifecycle Rail (left) + **Stage Trace Panel** (center, always visible)

| Step | Action | Talk track |
|------|--------|------------|
| 1 | Point to lifecycle rail | "Seven stages — each one is a runtime event, not a menu item." |
| 2 | Click **Intake** | "Stage trace opens: **Who acted** — Orchestrator routed the case, Intake Agent validated docs, Sarah signed Gate 1." |
| 3 | Point to Input / Reasoning / Output columns | "Every stage has structured **input** (what it received), **reasoning** (how the agent or system decided), and **output** (artifacts produced)." |
| 4 | Point to Gate 1 (passed) | "Human gates are first-class — not a checkbox buried in settings." |
| 5 | Click **Review** (active) | "Review Agent flagged the outlier; **you** are the pending actor on Gate 2. Assessment is **blocked** by Orchestrator until you sign." |
| 6 | Scroll to **Case runtime log** at bottom | "Full end-to-end audit: portfolio scan → orchestration → agents → human gates — seven columns including input, reasoning, output." |

**Pillar proof:** Both pillars — actor attribution (agent / human / system) + full trace per stage

---

## Story 4 — Completeness gate, sad path (2 min)

**Tab:** Command Center → **Northern Retail LLC**

| Step | Action | Talk track |
|------|--------|------------|
| 1 | Point to **Critical** column — Northern Retail | "Happy path is commodity. Exceptions are the demo — this case is agent-blocked at intake." |
| 2 | Click **Resolve completeness** | Opens Cases tab → Northern Retail · Intake stage |
| 3 | Point to **Case switcher** at top | "Two live cases — Walmart happy path vs Northern Retail sad path. Same runtime model, different trace." |
| 4 | Point to **Stage trace** — Intake | "Who acted: Orchestrator opened the case, Intake Agent ran the check, analyst cannot sign Gate 1." |
| 5 | Point to Input / Reasoning / Output | "Only 2 of 9 docs received. Agent reasoning: policy blocks Gate 1 with any missing required item. Output: entire pipeline held." |
| 6 | Scroll **9-row checklist** — 7 Missing pills | "Not a generic error — each missing doc tied to SOP §4.2." |
| 7 | Click **Override with reason (logged)** | "Sad-path trust: override is audited but pipeline stays blocked — Gate 1 does not pass until docs arrive." |
| 8 | Scroll to **runtime log** | "New human row highlighted — baseline events plus your override audit." |

**Pillar proof:** Trust gate + agent exception handling + full trace on sad path

---

## Story 5 — Intelligent mapping with trust proof (3 min)

**Tab:** Cases — Review stage (default)

| Step | Action | Talk track |
|------|--------|------------|
| 1 | Point to split-pane layout | "This matches our production Case Details design — source PDF on the left, extracted values on the right." |
| 2 | Point to tabs: **Extracted (140) / Exceptions (1)** | "Agents extracted 140 fields. One exception — not hidden in a footnote." |
| 3 | Point to confidence badges (High / Review / Low) | "Every cell has a confidence tier. Review Agent flagged Total Assets at 41%." |
| 4 | Point to **Total Assets $100K** row | "FY2024 was $98M. Industry median $120M. This isn't a rounding error — it's a decimal slip on page 43." |
| 5 | Click **Inspect** on Total Assets | Opens Trust Inspector |
| 6 | In Trust Inspector | "Source page, SOP §7.4, agent attribution, override history. Trust is a layer — not a tooltip." |
| 7 | Click **Accept mapping** or **Override with reason** | "Every human action appends to the runtime log — highlighted in blue. Gate 2 eligibility is traced." |
| 8 | Click **Exceptions (1)** tab | Show Review Agent exception card |

**Pillar proof:** Agent mapping + confidence/lineage per cell

---

## Story 6 — Connected decision (2.5 min)

**Tab:** Cases → Walmart → **Credit Memo** stage (lifecycle rail)

| Step | Action | Talk track |
|------|--------|------------|
| 1 | Point to **Stage trace** — Memo | "Memo Composer doesn't hallucinate bureau data — Connector Agent pulled Experian, Equifax, and D&B via API on the borrower's EIN." |
| 2 | Open **Connector Trust Panel** | "Six feeds: tri-bureau business scores, AML entity screen on EIN, UBO verification on SSN, Bloomberg peers. Each row: API name, ID type, masked identifier, sync status." |
| 3 | Point to Experian + Equifax rows | "Experian Intelliscore 76, Equifax BFR 92 — commercial business scores, not consumer FICO. That's the right connector for Walmart-scale commercial credit." |
| 4 | Point to AML + UBO rows | "AML/KYC: entity screened on EIN. Beneficial owners screened on SSN — ITIN path available for non-resident guarantors per policy." |
| 5 | Scroll **Credit memo draft** | "Every paragraph is source-tagged. Section 2 cites bureau APIs. Section 3 cites AML/KYC connectors. Auditors can trace memo text to API pull." |
| 6 | Click **Decision** on lifecycle rail | "Decision Agent weights spread 40%, external verification 35% — bureau + AML bundle — qualitative 25%. Not a black-box score." |
| 7 | Optional: switch to **Northern Retail** → Memo | "Sad path: only preliminary AML on EIN; bureau and guarantor SSN KYC blocked until intake completes. Connectors respect pipeline gates." |

**Pillar proof:** Agentic decision + connector trust + audit lineage

---

## Story 7 — Platform ROI close (2 min)

**Tab:** Insight

| Step | Action | Talk track |
|------|--------|------------|
| 1 | Point to **agent KPI row** (auto-pass 94%, exceptions 12, hours saved 312h) | "Portfolio isn't just BI anymore — Sentinel and Review QA authored these trust metrics." |
| 2 | Point to **Active cases** table | "Every borrower shows stage, last agent action, and trust status — one thread to the case workspace." |
| 3 | Point to Covenant Breaches deltas (red +1, +7) | "Sentinel surfaced 7 new breaches this month. Deltas are semantic — more breaches is bad, shown in red." |
| 4 | Point to Walmart Sentinel alert card | "Portfolio alert drills to case stage. One thread — not separate BI and case tools." |
| 5 | Point to covenant breach chart (Sentinel tag) | "Liquidity drives 40% of violations. Sentinel recommends prioritizing Current Ratio reviews." |
| 6 | Click **View case stage → Review** | Closes the loop back to Walmart case |

**Closing line (30 sec):**

> "Evalueserve sells accuracy. Moody's sells integrated content. DXP sells orchestration you can see — agents as actors, humans at gates, trust from portfolio to cell. Agents saved 2.5 days on this case alone. That's the platform story."

---

## Appendix — Agent Catalog tab (if time permits)

**Tab:** Agents

- Walk 10 agents: Orchestrator, Sentinel, Intake, Document Intelligence, Mapping, Review, Risk, Memo, Decision, Connector.
- Point to **Last 24h agent actions** strip at top — connects catalog to live runtime.
- Emphasize **human gates** (Gates 1–5) and **trust outputs** per agent.

---

## Timing summary

| Story | Minutes | Cumulative |
|-------|---------|------------|
| Opening | 0:30 | 0:30 |
| 1 — Sentinel wake-up | 2:00 | 2:30 |
| 2 — Agent briefing | 1:30 | 4:00 |
| 3 — Lifecycle trace | 2:00 | 6:00 |
| 4 — Completeness sad path | 1:30 | 7:30 |
| 5 — Mapping + Trust Inspector | 3:00 | 10:30 |
| 6 — Connected decision | 2:00 | 12:30 |
| 7 — Portfolio ROI close | 2:00 | 14:30 |
| Closing | 0:30 | **15:00** |

---

## Competitor positioning (use if board asks)

| Question | Answer |
|----------|--------|
| vs Moody's Spreading & Scoring | "They have audit logs. We have lifecycle rails — click a stage, see the agent, see the evidence." |
| vs Evalueserve Spreadsmart | "They claim 95% accuracy. We show which 5% needs you, why, and from which page." |
| vs generic AI copilots | "Copilots chat. ACOS orchestrates — ten named agents, five human gates, one portfolio-to-case thread." |
