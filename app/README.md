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
| **Trust everywhere** | Trust strip, Trust Inspector, connector panel, gate sign-off → runtime audit log |
| **End-to-end case lifecycle** | 7 stages with Input / Reasoning / Output per stage |
| **Happy + sad paths** | Walmart (Gate 2 review) vs Northern Retail (Gate 1 blocked) |

## Application structure

```
app/
├── src/
│   ├── App.tsx                    # Shell banner + main export
│   ├── acos/
│   │   ├── FinancialSpreadingACOS.tsx   # Full ACOS UI (ported from Canvas)
│   │   ├── ui.tsx                 # UI primitives (Canvas API shim)
│   │   ├── theme.ts               # Figma BMO light tokens
│   │   └── state.ts               # Session-persisted demo state
│   ├── main.tsx
│   └── index.css
├── netlify.toml                   # SPA redirect for deploy
└── package.json
```

### Tabs

1. **Command Center** — overnight agent queues, trust footers, agent queue table  
2. **Insight** — agent/trust KPIs, active cases table, Sentinel alerts, charts  
3. **Cases** — lifecycle rail, stage trace, workspaces, Trust Inspector, runtime log  
4. **Agents** — catalog + last-24h activity strip  

### Interactive demo actions

- **Trust Inspector** → Accept / Override → appends to runtime log (highlighted)  
- **Assessment** → Sign Gate 2  
- **Northern Retail Intake** → Override with reason (audited; pipeline stays blocked)  
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
- **Connector strategy** — Experian / Equifax / D&B on EIN; AML/KYC on EIN + UBO SSN; Bloomberg peers  
- **Next steps for production** — API layer for cases, real connector orchestration, auth (Netlify Identity), Postgres for audit immutability  

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Blank page after build | Ensure `netlify.toml` SPA redirect is present |
| State resets | Expected on new tab; uses `sessionStorage` |
| `npm` not found | Install [Node.js LTS](https://nodejs.org/) |
