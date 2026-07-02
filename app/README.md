# Financial Spreading ACOS — Web Application

Production-style **Vite + React + TypeScript** build of the Agentic Credit OS (ACOS) board demo. Use this for engineering walkthroughs; the Cursor Canvas version remains for rapid prototyping.

## Quick start

```bash
cd app
npm install
npm run dev
```

Open **http://localhost:5173** — default landing is **Command Center**.

```bash
npm run build    # production bundle → dist/
npm run preview  # serve dist locally
```

**Requirements:** Node.js 20+ and npm 10+.

## What this demonstrates

| Pillar | Implementation |
|--------|----------------|
| **Agents as first-class actors** | 10 named agents, Command Center queues, lifecycle stage traces, agent KPIs on Insight |
| **Trust everywhere** | Trust Layer banner + fabric flow strip, shell panel (fabric pillars + G1–G5 ladder), Trust strip, Trust Inspector (Intelligence Layer), connector panel (Trusted Sources), gate sign-off → runtime audit log |
| **End-to-end case lifecycle** | 7 stages with Input / Reasoning / Output per stage |
| **Happy + sad paths** | Walmart (Gate 2 review) vs Northern Retail (Gate 1 blocked → resolve → full path) |
| **SOP policy viewer** | Click any § citation or **Credit Policy** in tab bar to open uploaded institution policy |

## User journeys (Playwright)

| ID | Entry | Asserts |
|----|-------|---------|
| J1–J7 | Command Center / Cases | Walmart happy path, Northern sad path, lifecycle, Gate 5 |
| J8 | Northern Retail intake | Upload/mark docs → Gate 1 → Gates 2–5 |
| J9 | SOP link in intake | §4.2.3 opens policy viewer |
| J10 | AutoWest Resolve | Portfolio drill-down banner |
| J11 | All 9 CASE_ROWS | Each row opens expected workspace |
| J12 | InSight + Agents | Tab smoke; In Focus banner on InSight |
| J13 | Northern Retail → Credit Memo | Connector sad path when Gate 1 blocked |

```bash
npm run test:e2e   # requires build + Playwright (see package.json)
```

## Application structure

```
app/
├── src/
│   ├── App.tsx                    # Shell banner + main export
│   ├── acos/
│   │   ├── FinancialSpreadingACOS.tsx   # Full ACOS UI (ported from Canvas)
│   │   ├── sopPolicy.tsx          # Credit Policy SOP fixture + viewer components
│   │   ├── ui.tsx                 # UI primitives (Canvas API shim)
│   │   ├── theme.ts               # Figma BMO light tokens
│   │   ├── state.ts               # Session-persisted demo state
│   │   └── financials/            # Live financial-spreading engine (Meridian Foods)
│   │       ├── taxonomy.ts        # Chart of accounts: source vs calculated nodes + dependsOn
│   │       ├── dataset.ts         # Generated 3-statement model, FY2022–25, ties out; 1 seeded defect
│   │       ├── engine.ts          # computeValues / runIntegrityChecks / lineageFor / formatting
│   │       ├── analytics.ts       # Units, YoY/CAGR, ratio thresholds, health scorecard
│   │       ├── SourceDocument.tsx # Rendered clickable statement pages (cell+page lineage)
│   │       └── MeridianSpread.tsx # Master-DB workspace: Spread/Trends/Ratios/Health/Source tabs
│   ├── main.tsx
│   └── index.css
├── netlify.toml                   # SPA redirect for deploy
└── package.json
```

### Tabs

1. **Command Center** — overnight agent queues, trust footers, agent queue table  
2. **Insight** — agent/trust KPIs, active cases table, Sentinel alerts, charts  
3. **Cases** — lifecycle rail, stage trace, workspaces, Trust Inspector, runtime log  
4. **Financial Spread** — Meridian Foods master financial database: period-column spread standardised to the ACOS chart of accounts, cell+page lineage, calculated-value dependency drill, in-cell correction with rationale (live recompute), cross-statement integrity checks, computed trust score, and Trends / Ratios / Health analytics  
5. **Agents** — catalog + last-24h activity strip  

### Financial Spread — how "real" it is

No backend, but the spreading is a genuine deterministic model, not fixtures:
- **Taxonomy-constrained extraction** — a chart of accounts (`taxonomy.ts`) decides what is a *source* value vs a *calculated* one; calculated nodes are recomputed by the engine, never trusted from the page.
- **Ties out** — the generated dataset (`dataset.ts`) is internally consistent (BS balances, CF ties to cash, NI ties, RE rolls) across FY2022–FY2025, with one deliberately seeded OCR defect (FY2025 Inventory) that breaks the balance sheet until corrected.
- **Lineage** — every value traces to its exact source page + cell; calculated values drill to their dependencies.
- **Human-in-the-loop** — correct any cell with a required rationale; dependents recompute live, integrity re-runs, and the edit is logged to the change history.
- **Measurable trust** — the trust score is computed from coverage + human-verification + open exceptions + integrity, and moves as you correct/verify.

### Interactive demo actions

- **Trust Inspector** → Accept / Override → appends to runtime log (highlighted)  
- **Assessment** → Sign Gate 2  
- **Northern Retail Intake** → Upload / Mark received → Gate 1 sign → pipeline unlocks (Walmart spread template)  
- **Credit Policy** tab bar button or § links → SOP viewer slide-over  
- Queue cards / portfolio alerts → drill into case stages  

State persists in `sessionStorage` for the browser session.

## Deploy (Netlify)

```bash
cd app
npm run build
npx netlify deploy --prod --dir=dist
```

Or connect the repo with:

- **Base directory:** `app`  
- **Build command:** `npm run build`  
- **Publish directory:** `app/dist`  

## Relationship to Canvas prototype

| Artifact | Location | Purpose |
|----------|----------|---------|
| Canvas (board prep) | `~/.cursor/projects/.../canvases/financial-spreading-acos.canvas.tsx` | Fast iteration beside chat |
| This app | `app/` | Engineering review, CI, Netlify deploy |

When updating the demo, port changes from Canvas → `FinancialSpreadingACOS.tsx` (or extract shared `data/` modules over time).

## Demo script

See [`../BOARD_DEMO_SCRIPT.md`](../BOARD_DEMO_SCRIPT.md) for the 15-minute board talk track.

## Architecture notes (for eng discussion)

- **No backend** — all case data, traces, and connectors are inline fixtures  
- **Gate model** — Gates 1–5 block downstream agents; human actions append audit events only  
- **Trust Fabric** — InSight platform framing (Sources → Evidence → Reasoning → Action) aligned to lending demo surfaces; gates remain the primary governance model  
- **Connector strategy** — Experian / Equifax / D&B on EIN; AML/KYC on EIN + UBO SSN; Bloomberg peers  
- **Next steps for production** — API layer for cases, real connector orchestration, auth (Netlify Identity), Postgres for audit immutability  

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Blank page after build | Ensure `netlify.toml` SPA redirect is present |
| State resets | Expected on new tab; uses `sessionStorage` |
| `npm` not found | Install [Node.js LTS](https://nodejs.org/) |
