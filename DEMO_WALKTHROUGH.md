# Financial Spreading ACOS — Demo Walkthrough

A plain-language guide for presenting the demo. No engineering background required.

---

## Before you start

1. **Open a terminal** in the `app` folder and run:
   ```bash
   npm install
   npm run dev
   ```
2. **Open your browser** to **http://localhost:5173**
3. **Click Reset demo** — top-right of the tab bar, next to **+ Case**. Confirm when asked.
   - Do this **every time** you start a fresh walkthrough, or if buttons look greyed out / gates already signed.
4. You should land on **Command Center** (first tab). That is your home base.

**Tab names to know**

| What you see | What it is |
|--------------|------------|
| **Command Center** | Morning queue — what needs your attention |
| **InSight** | Portfolio view (note the capital **S** — not "Insight") |
| **Cases** | Full case list and case workspaces |
| **Financial Spread** | Master financial database for a borrower (Meridian Foods) — period-column spread, lineage, in-cell edit, trends/ratios/health, measurable trust |
| **Agents** | Catalog of the 10 demo agents |

Other useful buttons in the top bar: **Trust Layer** (explains the trust model), **Credit Policy** (opens the SOP viewer).

---

## 5-minute quick demo (Walmart happy path)

Goal: show agents did the work, one exception needs you, you sign a gate, pipeline moves forward.

| Step | Click this | You should see |
|------|------------|----------------|
| 1 | Stay on **Command Center** | Blue banner: "Since your last login…" Three columns of queue cards |
| 2 | **Walmart Inc.** card → **Review mapping** | Case workspace opens at **Review** stage. Case switcher shows **Walmart Inc. Spread**. Pipeline stepper shows Output active |
| 2b | **Cases** tab → Walmart row → **Negotiate** | Case Details intake view: **04/04 Documents Uploaded**, Ingestion step active, right-rail **Next Best Action** |
| 3 | Point to the **agent briefing** and **Case Trust Strip** | Trust score, Gate 2 pending, ~2.5 days saved |
| 4 | Left rail → **Review** (if not already there) | Split view: source PDF left, extracted fields right |
| 5 | Tab **Exceptions (1)** | One row: **Total Assets** at low confidence |
| 6 | **Inspect** on Total Assets | Trust Inspector opens on the right |
| 7 | **Accept mapping** | Toast: "Accepted mapping for Total Assets". Exception count drops to 0 |
| 8 | Scroll down → **Sign Gate 2 — Approve spread** | Toast: "Gate 2 signed — Risk Agent released". Stage moves to **Assessment** |
| 9 | *(Optional)* Click **Credit Memo** on the left rail | Connector panel, bureau scores, memo draft |

**One-liner for the audience:** "Agents spread 138 of 140 fields overnight. I fixed one outlier, signed Gate 2, and Risk Agent was released — that's governance, not a chatbot."

---

## 10-minute full demo (Walmart + Northern Retail sad path)

Do the 5-minute Walmart path first, then add the exception story.

### Part A — Northern Retail blocked at Gate 1

| Step | Click this | You should see |
|------|------------|----------------|
| 1 | **Command Center** tab | Northern Retail in the **Critical** column |
| 2 | **Resolve completeness** | Northern Retail case opens at **Intake** stage |
| 3 | Document table | 2 received, **7 Missing** (red pills). Header shows **02/09 Documents Uploaded** |
| 4 | **↑ Upload file** on a row *(pick a real file from your computer)*, or **Quick-fill next (demo)** for a fast run-through | Real upload shows the actual filename + size; quick-fill uses synthetic demo data. Toast shows progress (e.g. "3/9 documents") |
| 5 | After all **9/9** received | Blue callout: "All documents received — Gate 1 sign-off required" |
| 6 | **Sign Gate 1 — Approve document set** | Toast: "Gate 1 signed — pipeline unlocked". Stage advances |
| 7 | Switch to **Review** on the left rail | **Blue banner:** "Spreading template: Walmart FY2025 10-K (Northern Retail intake complete)" — this is intentional for demo depth |

**Sad-path beat (optional):** With docs still missing, click **Override with reason (logged)**. Override is **audited** but does **not** pass Gate 1 — pipeline stays blocked.

### Part B — Finish Walmart (if you reset between parts, redo Part A's Walmart steps)

| Step | Click this | You should see |
|------|------------|----------------|
| 8 | Case switcher → **Walmart Inc.** | Back to Review stage with 1 exception |
| 9 | Accept exception → **Sign Gate 2** | Assessment stage |
| 10 | **Sign Gate 3** → **Credit Memo** → **Sign Gate 4** → **Decision** → **Sign Gate 5** | Full lifecycle through committee sign-off |
| 11 | **InSight** tab | Portfolio KPIs, covenant chart, active cases table |
| 12 | **Agents** tab | Ten named agents and last-24h activity |

---

## Financial Spread — the master database deep-dive (Meridian Foods)

This is the newest and deepest surface. It shows **Trust** and **Agent-first** on the actual spreading grid where S&P, Moody's, and Evalueserve compete.

Click the **Financial Spread** tab. You land on **Meridian Foods Co.** — one borrower whose statements are standardised into a single **master financial database** and shown as period columns.

| Step | Click this | You should see |
|------|------------|----------------|
| 1 | **Financial Spread** tab | Meridian Foods header + a **trust ribbon** (Trust score, Human-verified, Open exceptions, Integrity, Lineage). A **red integrity banner**: "Balance sheet balances: off by 23,670" |
| 2 | Look at the **Spread** grid | Income Statement / Balance Sheet / Cash Flow with **FY2023–FY2025 columns** — side-by-side like Yahoo Finance / Capital IQ. **Inventory FY2025** is red (flagged) |
| 3 | **＋ Ingest prior-year statement (FY2022)** | A new **FY2022 column** appears — the master database grew |
| 4 | **Unit** toggle (Auto / K / MM / B) and **Order** | Numbers reformat; column order flips |
| 5 | Click the red **Inventory FY2025** value | A **lineage strip** opens: source page 2, the exact cell, low confidence, agent note ("source shows 26,300, read 2,630") |
| 6 | Type **26300**, add a **rationale**, click **Save correction** | Subtotals/totals/ratios **recompute live**, the integrity banner turns **green**, the exception clears, and the **Trust score jumps (≈27% → 65%)**. A **change-history** line is logged |
| 7 | Click a **calculated** value (e.g. a total or Current Ratio) | Its **formula expands** and it drills to the source values it depends on |
| 8 | **Trends** tab | YoY growth + CAGR per line |
| 9 | **Ratios** tab | Ratios across periods vs **policy covenants** (pass/warn/fail) with § links |
| 10 | **Health** tab | Composite **financial-health grade** (A–E) with liquidity/leverage/coverage/profitability pillars |
| 11 | **Source & Lineage** tab | The rendered borrower statement pages; click cells to trace both directions |

**One-liner for the audience:** "Every number traces to a source cell, every calculation traces to its inputs, the statements check themselves, and trust is a number you can audit — that's what we add on top of the like-for-like spread the incumbents sell."

**Note:** The Financial Spread state (ingested periods, corrections, verifications) persists for the browser session and is cleared by **Reset demo**.

---

## Why does this look broken? (FAQ)

### "Sign Gate 2 is greyed out or nothing happens"

**Not broken — by design.** Gate 2 stays blocked until you clear the mapping exception on Walmart:

1. Go to **Exceptions (1)** tab
2. **Inspect** → **Accept mapping** on Total Assets
3. Then **Sign Gate 2**

If you already signed Gate 2 earlier in this browser session, the button stays disabled. Click **Reset demo** and start again.

### "I clicked Sign Gate 2 and got a warning toast"

Same fix — resolve the Total Assets exception first. The app will switch you to the Exceptions tab automatically.

### "Northern Retail won't let me review the spread"

**Not broken.** Northern Retail is blocked at **Gate 1** until all 9 documents are marked received. Use **↑ Upload file** (real file picker) or **Quick-fill next (demo)** seven times, then sign Gate 1.

### "Northern Retail shows Walmart's 10-K"

**Intentional demo shortcut.** After Northern Retail completes intake, the spread workspace reuses the Walmart template so you can demo Gates 2–5 without building a second full spread. The blue banner explains this.

### "AutoWest / Costco / Target open Walmart"

**Intentional.** Cards labeled **"Synthetic portfolio queue — demo breadth"** route to Walmart workspaces to show depth. A banner may say "Workspace uses Walmart spread template for demo depth."

### "Buttons I clicked before are disabled now"

Your progress is saved in the browser for this session (`sessionStorage`). Gates you already signed cannot be signed twice. **Reset demo** clears everything and reloads the page.

### "Export PDF downloaded a .txt file"

**Demo placeholder.** PDF export is labeled **"Export as PDF (demo)"** and downloads plain text, not a real PDF.

### "InSight Assist chat doesn't really answer"

**Demo placeholder.** Typing and sending shows a toast only — not a live AI backend.

### "I can't find the Insight tab"

Look for **InSight** (capital **S**) — second tab in the bar.

### "Blank page after deploy"

Ensure the Netlify SPA redirect is configured (`app/netlify.toml`). For local dev, use `npm run dev`, not opening `dist/index.html` directly.

---

## What is real vs demo placeholder

| Works fully (click and see state change) | Demo / placeholder only |
|------------------------------------------|-------------------------|
| All five human gates (sign-off → audit log) | No real backend or database |
| Trust Inspector — Accept / Override / correction | PDF export → `.txt` file |
| Real file upload (↑ Upload file) — actual filename + size captured | InSight Assist chat replies |
| Lifecycle rail — stage traces, runtime log | Connector API calls (fixture data) |
| SOP viewer — § links open Credit Policy | AutoWest, Costco, Target → Walmart template |
| Validate Ratios tabs and sparklines | Case creation → nearest template |
| Credit Memo modal, Gate 5 committee actions | Real OCR / agent processing |
| Reset demo — full state wipe | Persistent login / multi-user |

---

## Screen map — what to click, what you should see

| Screen | Key buttons | Expected result |
|--------|-------------|-----------------|
| **Command Center** | Review mapping (Walmart) | Walmart case, Review stage, Exceptions tab |
| **Command Center** | Resolve completeness (Northern Retail) | Northern Retail, Intake, 7 missing docs |
| **Command Center** | Trust Layer | Slide-over: trust fabric, gates, agents |
| **Cases** (list) | Negotiate on Walmart row | Walmart Review workspace |
| **Cases** (workspace) | Case switcher pills | Toggle Walmart ↔ Northern Retail |
| **Cases** → Intake | ↑ Upload file (real picker) / Quick-fill next (demo) | Docs flip to Received; count toward 9/9 |
| **Cases** → Intake | Sign Gate 1 | Unlocks pipeline (Northern Retail) |
| **Cases** → Review | Exceptions (1) → Inspect → Accept mapping | Exception cleared |
| **Cases** → Review | Sign Gate 2 | Moves to Assessment |
| **Cases** → Assessment | Sign Gate 3 | Moves to Credit Memo |
| **Cases** → Credit Memo | Generate Report | Full-screen memo modal |
| **Cases** → Decision | Sign Gate 5 | Committee decision recorded |
| **InSight** | View case stage → Review (Walmart alert) | Back to Walmart Review |
| **Agents** | Agent cards | Read-only catalog + 24h activity strip |
| **Any view** | Reset demo (top right) | Confirm → page reloads to fresh state |

---

## Presenter tips

- **Always Reset demo** before a live audience.
- **Lead with Command Center** — it tells the "agents worked overnight" story.
- **Walmart = happy path** (Gate 2). **Northern Retail = sad path** (Gate 1).
- When something is blocked, **read the callout** — it usually says exactly which gate or step is missing.
- For the full board script with talk track, see [`BOARD_DEMO_SCRIPT.md`](BOARD_DEMO_SCRIPT.md).

---

## Technical quick reference (for helpers in the room)

```bash
cd app
npm run dev          # local demo
npm run build        # production build
npm run test:e2e     # 16 automated user-journey tests
```

Node 20+ required. Bundled Node available at `.tools/node-v22.16.0-win-x64/node.exe` if system Node is missing.
