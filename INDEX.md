# Financial Spreading Board — Workspace Index

Last indexed: 2026-07-01

This workspace contains board-demo planning materials for Iron Mountain DXP **Commercial Lending / Financial Spreading**. Searchable text exports live in [`_index/`](_index/).

## Quick Links

| Category | Source | Searchable export |
|----------|--------|-------------------|
| **ACOS web app (engineering)** | [`app/`](app/) | Run `cd app && npm install && npm run dev` |
| Board demo script | [`BOARD_DEMO_SCRIPT.md`](BOARD_DEMO_SCRIPT.md) | 15-min click-through |
| Board demo deck | `(WIP) Crisp Deck _ Commercial Lending _ MASTER.pptx` | [`_index/_WIP_Crisp_Deck___Commercial_Lending___MASTER.pptx.md`](_index/_WIP_Crisp_Deck___Commercial_Lending___MASTER.pptx.md) |
| Dashboard mockups | `Financial Spreading Dashboards - Commercial Credit, Auto Finance, Rent Rolls.pptx` | [`_index/Financial_Spreading_Dashboards_-_Commercial_Credit_Auto_Finance_Rent_Rolls.pptx.md`](_index/Financial_Spreading_Dashboards_-_Commercial_Credit_Auto_Finance_Rent_Rolls.pptx.md) |
| Demo prep (Jun 29) | `Board Demo Prep - 2026_06_29 ... Notes by Gemini.docx` | [`_index/Board_Demo_Prep_-_2026_06_29_12_30_EDT_-_Notes_by_Gemini.docx.md`](_index/Board_Demo_Prep_-_2026_06_29_12_30_EDT_-_Notes_by_Gemini.docx.md) |
| Demo prep (Jun 30) | `Board Demo Prep - 2026_06_30 ... Notes by Gemini.docx` | [`_index/Board_Demo_Prep_-_2026_06_30_12_31_EDT_-_Notes_by_Gemini.docx.md`](_index/Board_Demo_Prep_-_2026_06_30_12_31_EDT_-_Notes_by_Gemini.docx.md) |
| Competitor — Evalueserve | `Financial Spreading Competitor/Evalueserve FS/*.md` | [`_index/Financial_Spreading_Competitor_Evalueserve_FS_www.evalueserve.com_product_lending-automation-suite_.2026-07-01T04_50_08.924Z.md.md`](_index/Financial_Spreading_Competitor_Evalueserve_FS_www.evalueserve.com_product_lending-automation-suite_.2026-07-01T04_50_08.924Z.md.md) |
| Competitor — Moody's | `Financial Spreading Competitor/Moody's FS/*.pdf` | [`_index/Financial_Spreading_Competitor_Moody_s_FS_Automated_Spreading.pdf.md`](_index/Financial_Spreading_Competitor_Moody_s_FS_Automated_Spreading.pdf.md) |

Full manifest: [`_index/MANIFEST.md`](_index/MANIFEST.md)

## Folder Structure

```
financial-spreading-board/
├── INDEX.md                          ← this file
├── BOARD_DEMO_SCRIPT.md              ← 15-min demo script
├── app/                              ← Vite React ACOS application
├── _index/                           ← searchable text exports (use for AI search)
├── (WIP) Crisp Deck ... MASTER.pptx  ← board presentation deck
├── Financial Spreading Dashboards ...pptx
├── Board Demo Prep - 2026_06_29 ...docx
├── Board Demo Prep - 2026_06_30 ...docx
└── Financial Spreading Competitor/
    ├── Evalueserve FS/
    └── Moody's FS/
```

## Re-run Indexing

```powershell
py scripts/reindex.py
```

Then in Cursor: **Command Palette → "Reindex Workspace"** (or reload the window).
