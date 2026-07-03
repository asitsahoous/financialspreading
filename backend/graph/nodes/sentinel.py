"""
Portfolio Sentinel Agent
Scans all real cases the graph's checkpointer knows about. Detects covenant
breaches and risk deterioration using each case's actual risk_agent output
(health_score, risk_tier, covenant_breaches — see graph/nodes/risk.py).
Returns alert cards for the Command Center / InSight portfolio view.
"""
from __future__ import annotations
from graph.nodes.utils import now_iso


def _distinct_thread_ids(graph) -> list[str]:
    """
    checkpointer.list(None) returns checkpoints across *all* threads ordered
    newest-first, so the first occurrence of each thread_id is that case's
    most recent checkpoint. Fully materializes the list before returning —
    calling graph.get_state() (a separate DB read) while still iterating
    this generator reuses the same SQLite connection/cursor and deadlocks
    the sync SqliteSaver; this was hit and confirmed during verification.
    """
    seen: list[str] = []
    seen_set: set[str] = set()
    for checkpoint_tuple in list(graph.checkpointer.list(None)):
        thread_id = checkpoint_tuple.config.get("configurable", {}).get("thread_id")
        if thread_id and thread_id not in seen_set:
            seen_set.add(thread_id)
            seen.append(thread_id)
    return seen


def _iter_latest_case_states(graph):
    """Yields the current state.values for every distinct case the checkpointer has seen."""
    for thread_id in _distinct_thread_ids(graph):
        state = graph.get_state({"configurable": {"thread_id": thread_id}})
        if state and state.values and state.values.get("case_id"):
            yield state.values


def sentinel_scan(graph) -> dict:
    """
    Scan every real case for covenant breaches and risk deterioration.
    Returns alert list + portfolio KPIs, computed from actual case state
    rather than a fixture — a case only has health_score/risk_tier/
    covenant_breaches populated once its risk_agent node has run (i.e. past
    Gate 2), so cases still in intake/mapping simply won't generate an alert
    yet, which is correct: there's nothing to flag before risk assessment.
    """
    alerts = []
    total_cases = 0
    total_breaches = 0
    high_risk_count = 0
    open_exceptions = 0

    for values in _iter_latest_case_states(graph):
        total_cases += 1
        breaches = values.get("covenant_breaches") or []
        risk_tier = values.get("risk_tier", "Moderate Risk")
        open_exceptions += len(values.get("exceptions") or [])

        if risk_tier == "High Risk":
            high_risk_count += 1
        total_breaches += len(breaches)

        if not breaches:
            continue

        alerts.append({
            "case_id": values["case_id"],
            "borrower": values.get("borrower_name", "Unknown"),
            "breaches": breaches,
            "severity": "critical" if risk_tier == "High Risk" else "warning",
            "health_score": values.get("health_score", 0.0),
            "risk_tier": risk_tier,
            "stage": values.get("current_stage", "intake"),
            # Loan/exposure amount isn't modeled on CreditCaseState yet (no
            # field captures requested/outstanding amount) — real cases
            # report 0 here rather than a fabricated number; adding that
            # field is tracked as follow-up in docs/KNOWN_ISSUES.md.
            "exposure_m": 0,
            "generated_at": now_iso(),
            "agent": "sentinel",
        })

    kpis = {
        "total_cases": total_cases,
        "total_breaches": total_breaches,
        "high_risk_count": high_risk_count,
        "open_exceptions_book": open_exceptions,
        # Not modeled: no historical/timing data is tracked yet to compute a
        # real auto-pass rate or hours-saved estimate (these were narrative
        # fixture numbers, not a defined formula, even conceptually). 0
        # rather than a fabricated figure, matching exposure_m above.
        "agent_auto_pass_rate": 0,
        "agent_hours_saved_mtd": 0,
        "total_exposure_b": 0,
    }

    return {
        "alerts": alerts,
        "kpis": kpis,
        "generated_at": now_iso(),
    }
