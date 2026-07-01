"""
Document Intelligence Agent
OCR, SOP-driven page selection, raw field extraction.
Runs after Gate 1. Produces ExtractedField list with per-field confidence.
"""
from __future__ import annotations
import uuid
from graph.state import CreditCaseState, ExtractedField
from graph.nodes.utils import build_audit_event, now_iso, new_audit_id

# SOP §6 page map — which pages to read for which statements
SOP_PAGE_MAP = {
    "income_statement": {"pages": [38], "label": "IS p.38"},
    "balance_sheet": {"pages": [42, 43, 44], "label": "BS p.42–44"},
    "footnotes": {"pages": [87], "label": "Notes p.87"},
    "cash_flow": {"pages": [112], "label": "CF p.112"},
}

# Demo field extraction template — realistic Walmart-scale values
FIELD_TEMPLATES: list[dict] = [
    {"field": "Cash & Equivalents",      "value": "$10,727M",    "confidence": "high",   "page": 42,  "sop": "§7.1"},
    {"field": "Receivables, net",         "value": "$11,172M",    "confidence": "high",   "page": 42,  "sop": "§7.2"},
    {"field": "Inventories",              "value": "$58,851M",    "confidence": "high",   "page": 42,  "sop": "§7.3"},
    {"field": "Prepaid expenses",         "value": "$4,124M",     "confidence": "high",   "page": 42,  "sop": "§7.3"},
    {"field": "Total Current Assets",     "value": "$84,874M",    "confidence": "high",   "page": 42,  "sop": "§7.3"},
    {"field": "Property, plant & equip",  "value": "$136,083M",   "confidence": "high",   "page": 43,  "sop": "§7.5"},
    {"field": "Operating Lease ROU",      "value": "$14,750M",    "confidence": "review", "page": 43,  "sop": "§7.5"},
    {"field": "Finance Lease ROU",        "value": "$6,123M",     "confidence": "high",   "page": 43,  "sop": "§7.5"},
    {"field": "Goodwill",                 "value": "$28,735M",    "confidence": "high",   "page": 43,  "sop": "§7.6"},
    {"field": "Other long-term assets",   "value": "$14,103M",    "confidence": "high",   "page": 43,  "sop": "§7.6"},
    {"field": "Total Assets",             "value": "$100K",       "confidence": "review", "page": 43,  "sop": "§7.4"},
    {"field": "Short-term borrowings",    "value": "$6,998M",     "confidence": "high",   "page": 44,  "sop": "§8.1"},
    {"field": "Accounts payable",         "value": "$58,812M",    "confidence": "high",   "page": 44,  "sop": "§8.2"},
    {"field": "Accrued liabilities",      "value": "$31,187M",    "confidence": "high",   "page": 44,  "sop": "§8.2"},
    {"field": "Long-term Debt",           "value": "$35,420M",    "confidence": "high",   "page": 44,  "sop": "§8.3"},
    {"field": "Shareholders Equity",      "value": "$14,850M",    "confidence": "high",   "page": 44,  "sop": "§8.4"},
    {"field": "Revenue",                  "value": "$648,125M",   "confidence": "high",   "page": 38,  "sop": "§5.1"},
    {"field": "Cost of sales",            "value": "$490,776M",   "confidence": "high",   "page": 38,  "sop": "§5.2"},
    {"field": "Gross profit",             "value": "$157,349M",   "confidence": "high",   "page": 38,  "sop": "§5.2"},
    {"field": "Operating income",         "value": "$28,208M",    "confidence": "high",   "page": 38,  "sop": "§5.3"},
    {"field": "Net income",               "value": "$22,270M",    "confidence": "high",   "page": 38,  "sop": "§5.4"},
    {"field": "Operating cash flow",      "value": "$35,672M",    "confidence": "high",   "page": 112, "sop": "§9.1"},
    {"field": "Capital expenditures",     "value": "$21,600M",    "confidence": "high",   "page": 112, "sop": "§9.2"},
    {"field": "Free cash flow",           "value": "$14,072M",    "confidence": "high",   "page": 112, "sop": "§9.3"},
]

CONFIDENCE_REASONING = {
    "high": "OCR confidence ≥95%; layout model confirmed table structure; cross-page footnote refs validated.",
    "review": "OCR pattern confidence <70%; scale or magnitude inconsistency detected vs prior period.",
    "missing": "Field required by SOP but not located in extracted pages.",
}


def document_intel_agent(state: CreditCaseState) -> dict:
    """Extract fields from uploaded documents using SOP page map."""
    fields: list[ExtractedField] = []
    high_count = 0
    review_count = 0

    for tmpl in FIELD_TEMPLATES:
        conf = tmpl["confidence"]
        audit_id = new_audit_id(f"wmt-{tmpl['field'].lower().replace(' ', '-')[:12]}")
        reasoning = CONFIDENCE_REASONING[conf]

        # Specific reasoning for the Total Assets outlier
        if tmpl["field"] == "Total Assets":
            reasoning = (
                "FY2025 Total Assets extracted as $100K from p.43. "
                "Scale heuristic: magnitude inconsistent with revenue $648B → likely K/B OCR error. "
                "YoY delta vs $260.8B prior year: 99.99% variance → CRITICAL flag deferred to Review Agent."
            )
        if tmpl["field"] == "Operating Lease ROU":
            reasoning = (
                "Operating lease ROU extracted with 72% confidence. "
                "Cross-period tie-out with FY2024 ($13,599M): +8.5% — within review threshold."
            )

        if conf == "high":
            high_count += 1
        else:
            review_count += 1

        fields.append({
            "field": tmpl["field"],
            "value": tmpl["value"],
            "confidence": conf,
            "source_page": tmpl["page"],
            "sop_ref": tmpl["sop"],
            "agent": "document-intel",
            "audit_id": audit_id,
            "reasoning": reasoning,
        })

    total = len(fields)
    conf_pct = round((high_count / total) * 100, 1)
    summary = (
        f"{total} fields extracted from 10-K "
        f"(pages {', '.join(str(p) for p in [38, 42, 43, 44, 87, 112])}). "
        f"{high_count} high confidence, {review_count} review-tier."
    )

    audit_event = build_audit_event(
        stage="Extraction",
        actor_kind="agent",
        actor="Document Intelligence Agent",
        agent_id="document-intel",
        input_summary="3 statement packages + SOP §6 page map: IS p.38, BS p.42–44, Notes p.87, CF p.112",
        reasoning=(
            "Selected pages per SOP — ignored marketing and MD&A sections. "
            "Layout model detected table structures; OCR confidence scored per cell. "
            "Cross-page footnote refs linked to balance sheet line items."
        ),
        output_summary=f"{total} raw fields with source page + bounding region. "
                       f"Per-field confidence: {high_count} high, {review_count} review-tier.",
    )

    existing_trail = state.get("audit_trail", [])
    return {
        "extracted_fields": fields,
        "extraction_confidence_pct": conf_pct,
        "extraction_summary": summary,
        "current_stage": "extraction",
        "updated_at": now_iso(),
        "audit_trail": existing_trail + [audit_event],
    }
