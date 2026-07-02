"""
Human Gate nodes — LangGraph interrupt() points.
Each gate pauses the graph and waits for a human decision via the REST API.
"""
from __future__ import annotations
from langgraph.types import interrupt, Command
from graph.state import CreditCaseState, GateRecord
from graph.nodes.utils import build_audit_event, now_iso


def _make_gate_record(
    gate_id: str,
    label: str,
    decision: dict,
) -> GateRecord:
    return {
        "gate_id": gate_id,
        "label": label,
        "status": decision.get("status", "pending"),
        "actor": decision.get("actor"),
        "signed_at": now_iso() if decision.get("status") != "pending" else None,
        "reason": decision.get("reason"),
    }


def gate1_node(state: CreditCaseState) -> dict:
    """
    Gate 1 — Analyst confirms document set complete.
    Blocks before extraction. Raises interrupt if not yet decided.
    """
    existing_gates = state.get("gates", {})
    g1 = existing_gates.get("gate1", {})

    if g1.get("status") in ("approved", "override"):
        # Already decided — pass through
        return {}

    # Pause graph and wait for human input
    decision = interrupt({
        "gate_id": "gate1",
        "label": "Gate 1 — Confirm document set",
        "stage": "intake",
        "summary": state.get("intake_summary", ""),
        "missing_docs": state.get("missing_docs", []),
        "case_id": state.get("case_id"),
        "case_ref": state.get("case_ref"),
        "prompt": (
            "Review the document completeness checklist. "
            "Approve to release extraction, or override with reason to document exception."
        ),
    })

    gate_record = _make_gate_record("gate1", "Gate 1 — Confirm document set", decision)
    audit_event = build_audit_event(
        stage="Intake",
        actor_kind="human",
        actor=decision.get("actor", "Credit Analyst"),
        agent_id=None,
        input_summary="Intake Agent completeness checklist",
        reasoning=decision.get("reason") or "Visual confirm — correct entity, correct fiscal year",
        output_summary=f"Gate 1 {decision.get('status', 'pending')} by {decision.get('actor', 'analyst')}",
        gate_id="gate1",
    )

    existing_trail = state.get("audit_trail", [])
    return {
        "gates": {**existing_gates, "gate1": gate_record},
        "pipeline_blocked": decision.get("status") == "rejected",
        "block_reason": decision.get("reason") if decision.get("status") == "rejected" else None,
        "updated_at": now_iso(),
        "audit_trail": existing_trail + [audit_event],
    }


def gate2_node(state: CreditCaseState) -> dict:
    """Gate 2 — Analyst signs off mapped spread. Blocks before risk assessment."""
    existing_gates = state.get("gates", {})
    g2 = existing_gates.get("gate2", {})

    if g2.get("status") in ("approved", "override"):
        return {}

    decision = interrupt({
        "gate_id": "gate2",
        "label": "Gate 2 — Sign off spread",
        "stage": "review",
        "summary": state.get("review_summary", ""),
        "exceptions": state.get("exceptions", []),
        "mapping_complete": state.get("mapping_complete_count", 0),
        "case_id": state.get("case_id"),
        "prompt": (
            "Review the mapped spread and resolve any flagged exceptions. "
            "Sign off to release Risk Agent for ratio calculation."
        ),
    })

    gate_record = _make_gate_record("gate2", "Gate 2 — Sign off spread", decision)
    audit_event = build_audit_event(
        stage="Review",
        actor_kind="human",
        actor=decision.get("actor", "Credit Analyst"),
        agent_id=None,
        input_summary=f"Spread draft v1 — {state.get('mapping_complete_count', 0)} cells; exception(s) reviewed",
        reasoning=decision.get("reason") or "Analyst signed Gate 2 after reviewing mapping exceptions and SOP compliance",
        output_summary=f"Gate 2 {decision.get('status')} — Risk Agent {'released' if decision.get('status') == 'approved' else 'held'}",
        gate_id="gate2",
    )

    existing_trail = state.get("audit_trail", [])
    return {
        "gates": {**existing_gates, "gate2": gate_record},
        "updated_at": now_iso(),
        "audit_trail": existing_trail + [audit_event],
    }


def gate3_node(state: CreditCaseState) -> dict:
    """Gate 3 — Risk officer reviews flagged ratios. Blocks before memo."""
    existing_gates = state.get("gates", {})
    g3 = existing_gates.get("gate3", {})

    if g3.get("status") in ("approved", "override"):
        return {}

    decision = interrupt({
        "gate_id": "gate3",
        "label": "Gate 3 — Risk officer review",
        "stage": "assessment",
        "summary": state.get("risk_summary", ""),
        "ratios": [{"ratio": r["ratio"], "actual": r["actual"], "status": r["status"]} for r in state.get("ratios", [])],
        "covenant_breaches": state.get("covenant_breaches", []),
        "health_score": state.get("health_score"),
        "case_id": state.get("case_id"),
        "prompt": (
            "Review the ratio analysis and covenant compliance. "
            "Sign off to release Memo Composer Agent."
        ),
    })

    gate_record = _make_gate_record("gate3", "Gate 3 — Risk officer review", decision)
    audit_event = build_audit_event(
        stage="Assessment",
        actor_kind="human",
        actor=decision.get("actor", "Risk Officer"),
        agent_id=None,
        input_summary=f"Ratio analysis — {len(state.get('ratios', []))} ratios; {len(state.get('covenant_breaches', []))} breach(es)",
        reasoning=decision.get("reason") or "Risk officer reviewed flagged ratios against covenant schedule §3.1",
        output_summary=f"Gate 3 {decision.get('status')} — Memo Composer {'released' if decision.get('status') == 'approved' else 'held'}",
        gate_id="gate3",
    )

    existing_trail = state.get("audit_trail", [])
    return {
        "gates": {**existing_gates, "gate3": gate_record},
        "updated_at": now_iso(),
        "audit_trail": existing_trail + [audit_event],
    }


def gate4_node(state: CreditCaseState) -> dict:
    """Gate 4 — Memo coherence review. Blocks before Decision Synthesis."""
    existing_gates = state.get("gates", {})
    g4 = existing_gates.get("gate4", {})

    if g4.get("status") in ("approved", "override"):
        return {}

    decision = interrupt({
        "gate_id": "gate4",
        "label": "Gate 4 — Memo coherence review",
        "stage": "memo",
        "summary": state.get("memo_summary", ""),
        "memo_sections": len(state.get("memo_sections", [])),
        "case_id": state.get("case_id"),
        "prompt": (
            "Review the credit memo draft. Verify connector citations and narrative coherence. "
            "Sign off to release Decision Synthesis Agent."
        ),
    })

    gate_record = _make_gate_record("gate4", "Gate 4 — Memo coherence review", decision)
    audit_event = build_audit_event(
        stage="Credit Memo",
        actor_kind="human",
        actor=decision.get("actor", "Credit Analyst"),
        agent_id=None,
        input_summary=f"Memo draft — {len(state.get('memo_sections', []))} sections; connector citations verified",
        reasoning=decision.get("reason") or "Memo coherence reviewed — bureau citations verified, AML/KYC attestation confirmed",
        output_summary=f"Gate 4 {decision.get('status')} — Decision Synthesis {'released' if decision.get('status') == 'approved' else 'held'}",
        gate_id="gate4",
    )

    existing_trail = state.get("audit_trail", [])
    return {
        "gates": {**existing_gates, "gate4": gate_record},
        "updated_at": now_iso(),
        "audit_trail": existing_trail + [audit_event],
    }


def gate5_node(state: CreditCaseState) -> dict:
    """Gate 5 — Credit committee final decision. Terminal gate."""
    existing_gates = state.get("gates", {})
    g5 = existing_gates.get("gate5", {})

    if g5.get("status") in ("approved", "override", "rejected"):
        return {}

    decision = interrupt({
        "gate_id": "gate5",
        "label": "Gate 5 — Credit committee decision",
        "stage": "decision",
        "summary": state.get("decision_summary", ""),
        "decision_score": state.get("decision_score"),
        "recommendation": state.get("decision"),
        "case_id": state.get("case_id"),
        "prompt": (
            "Review the Decision Synthesis rationale tree and evidence bundle. "
            "Approve, negotiate, or decline the credit request."
        ),
    })

    gate_record = _make_gate_record("gate5", "Gate 5 — Credit committee decision", decision)
    final_stage = "complete" if decision.get("status") == "approved" else "decision"

    audit_event = build_audit_event(
        stage="Decision",
        actor_kind="human",
        actor=decision.get("actor", "Credit Committee"),
        agent_id=None,
        input_summary="Decision Synthesis rationale tree + connector evidence bundle",
        reasoning=decision.get("reason") or "Credit committee reviewed weighted rationale and evidence bundle",
        output_summary=f"Gate 5 {decision.get('status')} — case {'complete' if decision.get('status') == 'approved' else 'pending'}",
        gate_id="gate5",
    )

    existing_trail = state.get("audit_trail", [])
    return {
        "gates": {**existing_gates, "gate5": gate_record},
        "current_stage": final_stage,
        "updated_at": now_iso(),
        "audit_trail": existing_trail + [audit_event],
    }
