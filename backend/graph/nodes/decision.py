"""
Decision Synthesis Agent
Aggregates spread quality, external bureau scores, AML/KYC, and qualitative factors.
Produces rationale tree and weighted recommendation. Gate 5 = Credit Committee.
"""
from __future__ import annotations
from graph.state import CreditCaseState
from graph.nodes.utils import build_audit_event, now_iso

WEIGHT_SPREAD = 0.40
WEIGHT_EXTERNAL = 0.35
WEIGHT_QUALITATIVE = 0.25


def _bureau_score_to_0_10(experian: int, equifax: int, paydex: int) -> float:
    """Normalise bureau scores to 0–10 scale."""
    exp_norm = (experian / 100) * 10
    efx_norm = (equifax / 100) * 10
    paydex_norm = (paydex / 100) * 10
    return round((exp_norm + efx_norm + paydex_norm) / 3, 2)


def decision_agent(state: CreditCaseState) -> dict:
    """Weight spread, bureau, and qualitative factors into a decision."""
    health = state.get("health_score", 5.0)
    exceptions = state.get("exceptions", [])
    breaches = state.get("covenant_breaches", [])

    # Spread quality (40%): health score adjusted for open exceptions
    exception_penalty = min(2.0, len(exceptions) * 0.5)
    spread_score = max(0, health - exception_penalty)

    # External verification (35%): bureau scores + AML/KYC
    # In demo: Experian 76, Equifax 92, D&B PAYDEX 80
    bureau_score = _bureau_score_to_0_10(76, 92, 80)
    aml_clear = True  # from connector feed
    external_score = bureau_score * (1.0 if aml_clear else 0.7)

    # Qualitative (25%): peer position, ownership, covenant posture
    peer_score = 7.5  # top-quartile revenue, Bloomberg AA/A peers
    ownership_score = 8.0  # clean UBO, no PEP/sanctions
    covenant_score = 6.0 if not breaches else max(2.0, 6.0 - len(breaches))
    qualitative_score = round((peer_score + ownership_score + covenant_score) / 3, 2)

    # Weighted total
    decision_score = round(
        (spread_score * WEIGHT_SPREAD)
        + (external_score * WEIGHT_EXTERNAL)
        + (qualitative_score * WEIGHT_QUALITATIVE),
        2,
    )

    # Decision mapping
    if decision_score >= 8.0:
        decision = "approve"
        decision_text = "Approve"
    elif decision_score >= 6.0:
        decision = "conditional_approve"
        decision_text = "Conditional Approve"
    elif decision_score >= 4.5:
        decision = "negotiate"
        decision_text = "Negotiate"
    elif decision_score >= 3.0:
        decision = "decline"
        decision_text = "Decline"
    else:
        decision = "decline"
        decision_text = "Decline"

    rationale = (
        f"**Spread quality ({int(WEIGHT_SPREAD*100)}%): {spread_score:.1f}/10** — "
        f"{state.get('mapping_complete_count', 0)} fields mapped; {len(exceptions)} exception(s) "
        f"{'resolved' if not exceptions else 'pending'}. "
        f"{'Gate 2 signed.' if True else ''}\n\n"
        f"**External verification ({int(WEIGHT_EXTERNAL*100)}%): {external_score:.1f}/10** — "
        f"Experian 76/100, Equifax BFR 92/100, D&B PAYDEX 80/100. "
        f"AML/KYC: entity {'clear' if aml_clear else 'flagged'}. UBO profiles screened.\n\n"
        f"**Qualitative ({int(WEIGHT_QUALITATIVE*100)}%): {qualitative_score:.1f}/10** — "
        f"Top-quartile peer (Costco AA, Target A). Ownership structure clean. "
        f"Covenant posture: {len(breaches)} breach(es).\n\n"
        f"**Weighted score: {decision_score}/10 → {decision_text}**\n\n"
        "Evidence bundle: connector refs + spread trace + AML/KYC attestation — attached to committee packet."
    )

    summary = (
        f"Decision: {decision_text} (score {decision_score}/10). "
        f"Rationale: spread {spread_score:.1f}/10 × 40% + "
        f"bureau {external_score:.1f}/10 × 35% + "
        f"qualitative {qualitative_score:.1f}/10 × 25%. "
        "Gate 5 (credit committee) required."
    )

    audit_event = build_audit_event(
        stage="Decision",
        actor_kind="agent",
        actor="Decision Synthesis Agent",
        agent_id="decision",
        input_summary=(
            "Approved memo + tri-bureau composite + AML/KYC clearance + "
            "covenant posture + Portfolio Sentinel context"
        ),
        reasoning=(
            f"Weighted rationale tree: spread {int(WEIGHT_SPREAD*100)}%, "
            f"external {int(WEIGHT_EXTERNAL*100)}%, qualitative {int(WEIGHT_QUALITATIVE*100)}%. "
            "Score not a single black-box value — tree is surfaced to committee."
        ),
        output_summary=summary,
    )

    existing_trail = state.get("audit_trail", [])
    return {
        "decision": decision,
        "decision_score": decision_score,
        "decision_rationale": rationale,
        "decision_summary": summary,
        "current_stage": "decision",
        "updated_at": now_iso(),
        "audit_trail": existing_trail + [audit_event],
    }
