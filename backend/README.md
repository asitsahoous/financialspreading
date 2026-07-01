# ACOS LangGraph Backend

**LangGraph + FastAPI** backend for the Agentic Credit Operating System.  
10 named agents, 5 human gates, SQLite/PostgreSQL checkpointer, full audit trail.

## Architecture

```
FastAPI server (main.py)
  └── LangGraph StateGraph (graph/graph.py)
        ├── intake_agent       → Gate 1 (interrupt) → connector_agent
        ├── document_intel     → mapping_agent
        ├── mapping_agent      → Gate 2 (interrupt) → review_agent
        ├── review_agent       → risk_agent
        ├── risk_agent         → Gate 3 (interrupt) → memo_agent
        ├── memo_agent         → Gate 4 (interrupt) → decision_agent
        └── decision_agent     → Gate 5 (interrupt) → END

Checkpointer: SQLite (local dev) → PostgreSQL (production)
```

## Quick start (local)

```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
python main.py
```

API docs: **http://localhost:8000/docs**  
Health: **http://localhost:8000/health**

## Running a case end-to-end

```bash
# 1. Create a case (starts intake agent)
curl -X POST http://localhost:8000/api/v1/cases \
  -H "Content-Type: application/json" \
  -d '{
    "borrower_name": "Walmart Inc.",
    "case_type": "term_loan_b",
    "borrower_ein": "71-0415188",
    "borrower_duns": "05-907-4321",
    "ubo_profiles": [{"ssn_last4": "4521"}, {"ssn_last4": "8834"}],
    "documents": [
      {"name": "10-K Annual Filing", "received": true},
      {"name": "Credit Application", "received": true},
      {"name": "Q3 Cash Flow Statement", "received": true},
      {"name": "Covenant Schedule", "received": true},
      {"name": "Auditor Letter", "received": true},
      {"name": "Management Representation", "received": true},
      {"name": "Intercompany Schedule", "received": true},
      {"name": "Guarantor Financials", "received": true},
      {"name": "Collateral Appraisal", "received": true}
    ]
  }'
# → Returns {case_id, current_stage: "intake", gates: {gate1: {status: "pending"}}}

# 2. Sign Gate 1 (analyst confirms doc set)
curl -X POST http://localhost:8000/api/v1/cases/{case_id}/gates/gate1 \
  -H "Content-Type: application/json" \
  -d '{"gate_id": "gate1", "status": "approved", "actor": "Sarah W."}'

# 3. Sign Gate 2 (analyst signs off spread)
curl -X POST http://localhost:8000/api/v1/cases/{case_id}/gates/gate2 \
  -H "Content-Type: application/json" \
  -d '{"gate_id": "gate2", "status": "approved", "actor": "Sarah W."}'

# 4. Override a field (Trust Inspector)
curl -X POST http://localhost:8000/api/v1/cases/{case_id}/overrides \
  -H "Content-Type: application/json" \
  -d '{
    "field_name": "Total Assets",
    "corrected_value": "$284,668M",
    "reason": "OCR scale error on p.43 — corrected to billions",
    "actor": "Sarah W."
  }'

# 5. Continue through Gates 3, 4, 5 in the same way
# 6. Get audit trail
curl http://localhost:8000/api/v1/cases/{case_id}/audit
# 7. Get portfolio alerts
curl http://localhost:8000/api/v1/portfolio
```

## Agent nodes

| Node | File | Gate |
|------|------|------|
| Intake & Completeness | `graph/nodes/intake.py` | Gate 1 |
| Connector Sync | `graph/nodes/connector.py` | — |
| Document Intelligence | `graph/nodes/document_intel.py` | — |
| Mapping & Normalization | `graph/nodes/mapping.py` | Gate 2 |
| Review & QA | `graph/nodes/review.py` | — |
| Risk & Covenant | `graph/nodes/risk.py` | Gate 3 |
| Memo Composer | `graph/nodes/memo.py` | Gate 4 |
| Decision Synthesis | `graph/nodes/decision.py` | Gate 5 |
| Connector Sync | `graph/nodes/connector.py` | — |
| Portfolio Sentinel | `graph/nodes/sentinel.py` | — (scheduled) |

## Connecting real LLMs (optional)

Add to `.env`:
```
OPENAI_API_KEY=sk-...
# or
ANTHROPIC_API_KEY=claude-...
```

The agents will automatically use LLM-based reasoning for extraction, review, and decision nodes when a key is present. Without keys, they use deterministic SOP-based logic (identical output for demo purposes).

## Production deployment

### Database: switch to PostgreSQL

```python
# In graph/graph.py, replace:
from langgraph.checkpoint.sqlite import SqliteSaver
checkpointer = SqliteSaver.from_conn_string("acos.db")

# With:
from langgraph.checkpoint.postgres import PostgresSaver
checkpointer = PostgresSaver.from_conn_string(os.getenv("DATABASE_URL"))
```

### Deploy on Fly.io (recommended for Python backend)

```bash
fly launch --name acos-backend
fly secrets set DATABASE_URL=postgresql://...
fly deploy
```

### Connect frontend

In `app/.env`:
```
VITE_API_URL=https://acos-backend.fly.dev
```

## API reference

Full interactive docs at `/docs` (Swagger UI).

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/cases` | Create case + start agents |
| GET | `/api/v1/cases/{id}` | Get case summary |
| GET | `/api/v1/cases/{id}/state` | Get full raw state |
| GET | `/api/v1/cases/{id}/audit` | Get audit trail |
| POST | `/api/v1/cases/{id}/gates/{gate_id}` | Sign/override gate |
| POST | `/api/v1/cases/{id}/overrides` | Field value override |
| GET | `/api/v1/portfolio` | Portfolio Sentinel scan |
