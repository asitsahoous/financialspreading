"""
ACOS REST API Router
Endpoints for case management, gate sign-off, field overrides, and portfolio.
"""
from __future__ import annotations
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from langgraph.types import Command

from api.models import (
    CreateCaseRequest, GateDecisionRequest, FieldOverrideRequest,
    CaseResponse, AuditEventResponse, PortfolioResponse,
)
from graph.nodes.sentinel import sentinel_scan
from graph.nodes.utils import now_iso, build_audit_event

router = APIRouter()

# Graph instance injected via dependency
_graph = None


def get_graph():
    return _graph


def set_graph(graph):
    global _graph
    _graph = graph


def _case_ref(case_type: str, borrower_name: str) -> str:
    initials = "".join(w[0].upper() for w in borrower_name.split()[:3])
    suffix = case_type.split("_")[0].upper()[:3]
    year = datetime.now().year
    return f"{initials}-{suffix}-{year}"


def _state_to_response(state: dict) -> CaseResponse:
    return CaseResponse(
        case_id=state.get("case_id", ""),
        case_ref=state.get("case_ref", ""),
        borrower_name=state.get("borrower_name", ""),
        current_stage=state.get("current_stage", "intake"),
        pipeline_blocked=state.get("pipeline_blocked", False),
        health_score=state.get("health_score"),
        risk_tier=state.get("risk_tier"),
        decision=state.get("decision"),
        decision_score=state.get("decision_score"),
        gates=state.get("gates", {}),
        audit_trail_count=len(state.get("audit_trail", [])),
        created_at=state.get("created_at", ""),
        updated_at=state.get("updated_at", ""),
    )


# ─── Cases ────────────────────────────────────────────────────────────────────

@router.post("/cases", response_model=CaseResponse, status_code=201)
async def create_case(body: CreateCaseRequest, graph=Depends(get_graph)):
    """Create a new credit case and start the agent graph."""
    case_id = str(uuid.uuid4())
    case_ref = _case_ref(body.case_type, body.borrower_name)
    now = now_iso()

    initial_state: dict = {
        "case_id": case_id,
        "case_ref": case_ref,
        "case_type": body.case_type,
        "borrower_name": body.borrower_name,
        "borrower_ein": body.borrower_ein,
        "borrower_duns": body.borrower_duns,
        "ubo_profiles": body.ubo_profiles,
        "current_stage": "intake",
        "pipeline_blocked": False,
        "block_reason": None,
        "documents": body.documents,
        "intake_complete": False,
        "missing_docs": [],
        "intake_summary": "",
        "extracted_fields": [],
        "extraction_confidence_pct": 0.0,
        "extraction_summary": "",
        "mapping_rows": [],
        "mapping_complete_count": 0,
        "mapping_skipped_count": 0,
        "mapping_summary": "",
        "exceptions": [],
        "review_summary": "",
        "review_passed": False,
        "connector_feeds": [],
        "connector_summary": "",
        "ratios": [],
        "covenant_breaches": [],
        "health_score": 0.0,
        "risk_tier": "Moderate Risk",
        "risk_summary": "",
        "memo_sections": [],
        "memo_draft": "",
        "memo_summary": "",
        "decision": "pending",
        "decision_score": 0.0,
        "decision_rationale": "",
        "decision_summary": "",
        "gates": {},
        "audit_trail": [],
        "created_at": now,
        "updated_at": now,
        "sla_hours": body.sla_hours,
        "estimated_review_minutes": 12,
        "agent_time_saved_hours": 0.0,
    }

    config = {"configurable": {"thread_id": case_id}}

    # Run graph until first interrupt (Gate 1)
    try:
        await graph.ainvoke(initial_state, config=config)
    except Exception:
        # Graph interrupted at gate — expected behaviour
        pass

    state = graph.get_state(config)
    return _state_to_response(state.values)


@router.get("/cases/{case_id}", response_model=CaseResponse)
async def get_case(case_id: str, graph=Depends(get_graph)):
    """Get current state of a credit case."""
    config = {"configurable": {"thread_id": case_id}}
    state = graph.get_state(config)
    if not state or not state.values:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found")
    return _state_to_response(state.values)


@router.get("/cases/{case_id}/state")
async def get_case_state(case_id: str, graph=Depends(get_graph)):
    """Get full raw state for debugging."""
    config = {"configurable": {"thread_id": case_id}}
    state = graph.get_state(config)
    if not state or not state.values:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found")
    return state.values


@router.get("/cases/{case_id}/audit", response_model=list[AuditEventResponse])
async def get_audit_trail(case_id: str, graph=Depends(get_graph)):
    """Get the full audit trail for a case."""
    config = {"configurable": {"thread_id": case_id}}
    state = graph.get_state(config)
    if not state or not state.values:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found")
    return state.values.get("audit_trail", [])


# ─── Gates ────────────────────────────────────────────────────────────────────

@router.post("/cases/{case_id}/gates/{gate_id}", response_model=CaseResponse)
async def sign_gate(case_id: str, gate_id: str, body: GateDecisionRequest, graph=Depends(get_graph)):
    """
    Human sign-off or override for a gate.
    Resumes the LangGraph thread with the human decision.
    """
    config = {"configurable": {"thread_id": case_id}}
    state = graph.get_state(config)
    if not state or not state.values:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found")

    if body.gate_id != gate_id:
        raise HTTPException(status_code=400, detail="gate_id in path and body must match")

    # Resume graph with human decision via LangGraph Command
    decision_payload = {
        "status": body.status,
        "actor": body.actor,
        "reason": body.reason,
    }

    try:
        await graph.ainvoke(
            Command(resume=decision_payload),
            config=config,
        )
    except Exception:
        # May interrupt at next gate — expected
        pass

    updated_state = graph.get_state(config)
    return _state_to_response(updated_state.values)


# ─── Field overrides ──────────────────────────────────────────────────────────

@router.post("/cases/{case_id}/overrides", response_model=CaseResponse)
async def override_field(case_id: str, body: FieldOverrideRequest, graph=Depends(get_graph)):
    """Analyst overrides a mapped field value with a reason (Trust Inspector action)."""
    config = {"configurable": {"thread_id": case_id}}
    state = graph.get_state(config)
    if not state or not state.values:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found")

    current_state = dict(state.values)
    mapping_rows = current_state.get("mapping_rows", [])

    # Update the corrected field
    for row in mapping_rows:
        if row["field"] == body.field_name:
            row["value"] = body.corrected_value
            row["confidence"] = "high"
            row["reasoning"] = f"Analyst override: {body.reason}"
            break

    # Append audit event
    audit_event = build_audit_event(
        stage="Review",
        actor_kind="human",
        actor=body.actor,
        agent_id=None,
        input_summary=f"Field override request: {body.field_name}",
        reasoning=f"Analyst override — reason: {body.reason}",
        output_summary=f"Field '{body.field_name}' corrected to '{body.corrected_value}'. Override logged.",
        gate_id=None,
    )

    existing_trail = current_state.get("audit_trail", [])
    graph.update_state(
        config,
        {"mapping_rows": mapping_rows, "audit_trail": existing_trail + [audit_event]},
    )

    updated = graph.get_state(config)
    return _state_to_response(updated.values)


# ─── Portfolio ────────────────────────────────────────────────────────────────

@router.get("/portfolio", response_model=PortfolioResponse)
async def get_portfolio():
    """Portfolio Sentinel scan — alerts and KPIs."""
    return sentinel_scan()


@router.get("/portfolio/kpis")
async def get_portfolio_kpis():
    """Agent-authored portfolio KPIs."""
    return sentinel_scan()["kpis"]
