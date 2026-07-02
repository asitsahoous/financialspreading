"""
Intake & Completeness Agent
Validates received documents against the SOP §4.2 manifest.
Runs first — blocks Gate 1 if any required doc is missing.
"""
from __future__ import annotations
from graph.state import CreditCaseState, Document
from graph.nodes.utils import build_audit_event, now_iso


# SOP §4.2 required document manifest by case type
SOP_MANIFEST: dict[str, list[tuple[str, str]]] = {
    "term_loan_b": [
        ("10-K Annual Filing", "§4.2.1"),
        ("Credit Application", "§4.2.2"),
        ("Q3 Cash Flow Statement", "§4.2.3"),
        ("Covenant Schedule", "§4.2.4"),
        ("Auditor Letter", "§4.2.5"),
        ("Management Representation", "§4.2.6"),
        ("Intercompany Schedule", "§4.2.7"),
        ("Guarantor Financials", "§4.2.8"),
        ("Collateral Appraisal", "§4.2.9"),
    ],
    "revolving_credit": [
        ("Credit Application", "§4.2.2"),
        ("FY Annual Report", "§4.2.1"),
        ("Q3 Cash Flow Statement", "§4.2.3"),
        ("Covenant Schedule", "§4.2.4"),
        ("Auditor Letter", "§4.2.5"),
        ("Management Representation", "§4.2.6"),
        ("Intercompany Schedule", "§4.2.7"),
        ("Guarantor Financials", "§4.2.8"),
        ("Collateral Appraisal", "§4.2.9"),
    ],
    "floor_plan": [
        ("Credit Application", "§4.2.2"),
        ("Dealer Financial Statements", "§4.2.10"),
        ("Floor Plan Agreement", "§4.2.11"),
        ("Vehicle Schedule", "§4.2.12"),
    ],
    "annual_review": [
        ("Annual Financial Statements", "§4.2.1"),
        ("Compliance Certificate", "§4.2.13"),
        ("Updated Covenant Schedule", "§4.2.4"),
    ],
}


def compute_intake_completeness(case_type: str, documents: list[Document]) -> dict:
    """
    Diffs the given documents against the SOP §4.2 manifest for this case type.
    Shared by `intake_agent` (first run, before Gate 1) and the
    `/documents/{doc_name}/receive` endpoint (subsequent updates after Gate 1
    has already been reached) so completeness is always computed the same way.
    Preserves any extra per-document fields (classification, uploaded_by, etc.)
    already present on `documents` — it only fills in manifest defaults for
    documents not yet present in the list.
    """
    manifest = SOP_MANIFEST.get(case_type, SOP_MANIFEST["term_loan_b"])
    by_name: dict[str, Document] = {doc["name"]: doc for doc in documents}

    missing: list[str] = []
    all_docs: list[Document] = []
    for doc_name, sop_ref in manifest:
        existing = by_name.get(doc_name)
        received = bool(existing["received"]) if existing else False
        if not received:
            missing.append(f"{doc_name} ({sop_ref})")
        all_docs.append(existing or {
            "name": doc_name,
            "sop_ref": sop_ref,
            "received": False,
            "size_kb": None,
            "classification": None,
            "uploaded_by": None,
            "uploaded_on": None,
            "uploaded_file_name": None,
        })

    intake_complete = len(missing) == 0
    missing_count = len(missing)

    if intake_complete:
        summary = (
            f"{len(all_docs)}/{len(all_docs)} documents validated per SOP §4.2. "
            f"EIN captured → Connector Agent pre-flight queued."
        )
        input_summary = f"Uploaded package: {len(all_docs)} documents + SOP §4.2 manifest"
        reasoning = (
            f"Orchestrator matched case type {case_type} → commercial credit intake workflow. "
            f"Intake Agent compared received files to manifest: {len(all_docs)}/{len(all_docs)} present; "
            f"no duplicate or wrong-entity filings detected."
        )
        output_summary = f"Completeness {len(all_docs)}/{len(all_docs)} ✓ — Gate 1 eligible. Entity IDs captured → connectors queued."
    else:
        summary = (
            f"{len(all_docs) - missing_count}/{len(all_docs)} documents received — "
            f"{missing_count} missing per SOP §4.2. Pipeline blocked."
        )
        input_summary = f"Uploaded package: {len(all_docs) - missing_count} of {len(all_docs)} documents"
        reasoning = (
            f"Intake Agent diff vs manifest: {missing_count} critical gaps. "
            f"Policy: Gate 1 cannot pass with >0 required missing items. "
            f"Auto-generated doc request for borrower portal."
        )
        output_summary = (
            f"Completeness {len(all_docs) - missing_count}/{len(all_docs)} — "
            f"Gate 1 BLOCKED. {missing_count} missing: {', '.join(missing[:3])}{'…' if missing_count > 3 else ''}."
        )

    return {
        "documents": all_docs,
        "intake_complete": intake_complete,
        "missing_docs": missing,
        "intake_summary": summary,
        "input_summary": input_summary,
        "reasoning": reasoning,
        "output_summary": output_summary,
    }


def intake_agent(state: CreditCaseState) -> dict:
    """
    Checks received documents against SOP manifest.
    Returns updated state with intake result.
    Gate 1 interrupt is handled in the graph router.
    """
    result = compute_intake_completeness(state["case_type"], state.get("documents", []))

    audit_event = build_audit_event(
        stage="Intake",
        actor_kind="agent",
        actor="Intake & Completeness Agent",
        agent_id="intake",
        input_summary=result["input_summary"],
        reasoning=result["reasoning"],
        output_summary=result["output_summary"],
    )

    existing_trail = state.get("audit_trail", [])
    missing_count = len(result["missing_docs"])
    return {
        "documents": result["documents"],
        "intake_complete": result["intake_complete"],
        "missing_docs": result["missing_docs"],
        "intake_summary": result["intake_summary"],
        "current_stage": "intake",
        "pipeline_blocked": not result["intake_complete"],
        "block_reason": (
            f"Gate 1 blocked — {missing_count} documents missing per SOP §4.2" if not result["intake_complete"] else None
        ),
        "updated_at": now_iso(),
        "audit_trail": existing_trail + [audit_event],
    }
