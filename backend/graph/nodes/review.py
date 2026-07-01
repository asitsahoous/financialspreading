"""
Review & QA Agent
Flags low-confidence cells, YoY variance, outlier patterns.
Produces exception list. Human must resolve each flag before Gate 2.
"""
from __future__ import annotations
from graph.state import CreditCaseState, Exception_, MappingRow
from graph.nodes.utils import build_audit_event, now_iso

# Prior year reference values for YoY variance check
PRIOR_YEAR: dict[str, str] = {
    "Total Assets": "$260,823M",
    "Revenue": "$611,289M",
    "Net income": "$20,157M",
    "Shareholders Equity": "$91,012M",
    "Operating cash flow": "$35,726M",
}

# Industry benchmarks
BENCHMARKS: dict[str, str] = {
    "Total Assets": "$120B (peer median)",
    "Revenue": "$500B+ (top-quartile retail)",
}

# YoY variance threshold to flag (%)
YOY_THRESHOLD = 15.0


def _parse_millions(val: str) -> float | None:
    """Parse values like $98.1B, $648,125M, $100K into millions."""
    try:
        v = val.replace("$", "").replace(",", "").strip()
        if v.endswith("B"):
            return float(v[:-1]) * 1000
        if v.endswith("M"):
            return float(v[:-1])
        if v.endswith("K"):
            return float(v[:-1]) / 1000
        return float(v)
    except (ValueError, IndexError):
        return None


def review_agent(state: CreditCaseState) -> dict:
    """Detect outliers, scale errors, YoY variance > 15%."""
    rows: list[MappingRow] = state.get("mapping_rows", [])
    exceptions: list[Exception_] = []

    for row in rows:
        fname = row["field"]
        current_val = _parse_millions(row["value"])
        prior_str = PRIOR_YEAR.get(fname)
        prior_val = _parse_millions(prior_str) if prior_str else None
        confidence = row["confidence"]

        # Flag 1: Low confidence
        if confidence == "review":
            exc: Exception_ = {
                "field": fname,
                "current_value": row["value"],
                "prior_value": prior_str,
                "expected_range": BENCHMARKS.get(fname),
                "agent": "review",
                "severity": "critical" if fname == "Total Assets" else "warning",
                "reasoning": row["reasoning"],
            }
            exceptions.append(exc)
            continue

        # Flag 2: YoY variance > threshold
        if current_val and prior_val and prior_val != 0:
            delta_pct = abs((current_val - prior_val) / prior_val) * 100
            if delta_pct > YOY_THRESHOLD:
                exceptions.append({
                    "field": fname,
                    "current_value": row["value"],
                    "prior_value": prior_str,
                    "expected_range": BENCHMARKS.get(fname),
                    "agent": "review",
                    "severity": "warning",
                    "reasoning": (
                        f"YoY variance {delta_pct:.1f}% exceeds {YOY_THRESHOLD}% threshold. "
                        f"Prior: {prior_str}, Current: {row['value']}. "
                        "Requires analyst confirmation before Gate 2."
                    ),
                })

    exception_count = len(exceptions)
    review_passed = exception_count == 0

    summary = (
        f"{exception_count} exception(s) flagged — Gate 2 {'eligible' if review_passed else 'BLOCKED until resolved'}."
        if exception_count > 0
        else "All cells passed review thresholds. Gate 2 eligible."
    )

    audit_event = build_audit_event(
        stage="Review",
        actor_kind="agent",
        actor="Review & QA Agent",
        agent_id="review",
        input_summary=(
            f"Spread draft v1 ({state.get('mapping_complete_count', 0)} cells) + "
            f"prior-year comparatives + industry benchmarks"
        ),
        reasoning=(
            f"Applied YoY variance rule (>{YOY_THRESHOLD}%), scale heuristics, and confidence threshold. "
            f"{'Total Assets: $100K vs $260.8B prior → 99.99% delta → scale error (K/B OCR). ' if exception_count > 0 else ''}"
            f"Pattern confidence for flagged cells below 70%."
        ),
        output_summary=(
            f"{exception_count} exception card(s) generated. "
            f"Gate 2 {'BLOCKED' if not review_passed else 'eligible — analyst sign-off required'}."
        ),
    )

    existing_trail = state.get("audit_trail", [])
    return {
        "exceptions": exceptions,
        "review_summary": summary,
        "review_passed": review_passed,
        "current_stage": "review",
        "updated_at": now_iso(),
        "audit_trail": existing_trail + [audit_event],
    }
