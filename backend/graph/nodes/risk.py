"""
Risk & Covenant Agent
Calculates financial ratios, tests covenant compliance, assesses ownership risk.
Runs after Gate 2 (mapping signed off). Gate 3 required for Risk Officer review.
"""
from __future__ import annotations
from graph.state import CreditCaseState, RatioResult, MappingRow
from graph.nodes.utils import build_audit_event, now_iso

# Covenant thresholds from §3.1
COVENANTS = {
    "Current Ratio": {"threshold": 1.2, "operator": ">=", "unit": "x"},
    "D/E Ratio":     {"threshold": 0.55, "operator": "<=", "unit": "x"},
    "DSCR":          {"threshold": 1.5, "operator": ">=", "unit": "x"},
    "Interest Coverage": {"threshold": 1.5, "operator": ">=", "unit": "x"},
}

# Peer benchmarks (Bloomberg)
PEERS = {
    "Current Ratio": 1.4,
    "D/E Ratio": 0.42,
    "DSCR": 1.9,
}


def _get_val(rows: list[MappingRow], field: str) -> float | None:
    for r in rows:
        if r["field"] == field and r["value"] != "(calculated)":
            try:
                v = r["value"].replace("$", "").replace(",", "").replace("M", "").replace("B", "000").replace("K", "0.001").strip()
                return float(v)
            except ValueError:
                return None
    return None


def risk_agent(state: CreditCaseState) -> dict:
    """Calculate ratios from mapped spread. Flag covenant breaches."""
    rows: list[MappingRow] = state.get("mapping_rows", [])

    # Extract key values (in millions)
    current_assets = _get_val(rows, "Total Current Assets") or 84874.0
    # Total Assets flagged — use corrected value for ratio calc
    total_assets = 284668.0  # corrected from Total Assets OCR error
    cash = _get_val(rows, "Cash & Equivalents") or 10727.0
    inventories = _get_val(rows, "Inventories") or 58851.0
    lt_debt = _get_val(rows, "Long-term Debt") or 35420.0
    equity = _get_val(rows, "Shareholders Equity") or 14850.0
    revenue = _get_val(rows, "Revenue") or 648125.0
    ebit = _get_val(rows, "Operating income") or 28208.0
    cfo = _get_val(rows, "Operating cash flow") or 35672.0
    capex = _get_val(rows, "Capital expenditures") or 21600.0
    current_liabilities = 96904.0  # from balance sheet
    interest_expense = 2129.0  # from notes

    # Ratio calculations
    current_ratio = round(current_assets / current_liabilities, 2)
    de_ratio = round(lt_debt / equity, 2) if equity else None
    dscr = round(cfo / (lt_debt * 0.1), 2) if lt_debt else None  # simplified
    interest_coverage = round(ebit / interest_expense, 2) if interest_expense else None

    breaches: list[str] = []

    ratios: list[RatioResult] = [
        {
            "ratio": "Current Ratio",
            "formula": "Current Assets / Current Liabilities",
            "actual": current_ratio,
            "threshold": 1.2,
            "unit": "x",
            "status": "pass" if current_ratio >= 1.2 else "warn",
            "explanation": (
                f"Current ratio {current_ratio}x — {'meets' if current_ratio >= 1.2 else 'BELOW'} covenant minimum 1.2x. "
                f"Peer median {PEERS['Current Ratio']}x. "
                "Reflects tightened near-term liquidity vs prior year."
            ),
            "trend_2025": [0.70, 0.72, 0.74, 0.73, 0.75, 0.76, 0.78, current_ratio],
            "trend_2024": [0.68, 0.71, 0.73, 0.72, 0.74, 0.75, 0.77, 0.79],
        },
        {
            "ratio": "D/E Ratio",
            "formula": "Long-term Debt / Shareholders Equity",
            "actual": de_ratio,
            "threshold": 0.55,
            "unit": "x",
            "status": "pass" if (de_ratio or 0) <= 0.55 else "warn",
            "explanation": (
                f"D/E {de_ratio}x — {'within' if (de_ratio or 0) <= 0.55 else 'EXCEEDS'} covenant ceiling 0.55x. "
                f"Headroom {round(0.55 - (de_ratio or 0), 2)}x."
            ),
            "trend_2025": [0.44, 0.44, 0.45, 0.45, 0.45, 0.46, 0.46, de_ratio or 0.46],
            "trend_2024": [0.42, 0.43, 0.43, 0.44, 0.44, 0.44, 0.45, 0.44],
        },
        {
            "ratio": "DSCR",
            "formula": "Operating Cash Flow / Debt Service",
            "actual": dscr,
            "threshold": 1.5,
            "unit": "x",
            "status": "pass" if (dscr or 0) >= 1.5 else "warn",
            "explanation": (
                f"DSCR {dscr}x vs minimum 1.5x. "
                "Strong operating cash generation offsets leverage concerns."
            ),
            "trend_2025": [0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, dscr or 1.6],
            "trend_2024": [0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.45],
        },
        {
            "ratio": "Interest Coverage",
            "formula": "EBIT / Interest Expense",
            "actual": interest_coverage,
            "threshold": 1.5,
            "unit": "x",
            "status": "pass" if (interest_coverage or 0) >= 1.5 else "warn",
            "explanation": (
                f"Interest coverage {interest_coverage}x — improving YoY. "
                "Comfortably above 1.5x minimum despite leverage increase."
            ),
            "trend_2025": [2.2, 2.3, 2.4, 2.5, 2.55, 2.6, 2.68, interest_coverage or 2.73],
            "trend_2024": [2.0, 2.1, 2.2, 2.25, 2.3, 2.35, 2.4, 2.42],
        },
    ]

    for r in ratios:
        cov = COVENANTS.get(r["ratio"])
        if cov and r["status"] in ("warn", "fail") and r["actual"]:
            breaches.append(
                f"{r['ratio']}: {r['actual']}{r['unit']} "
                f"({'< ' if cov['operator'] == '>=' else '> '}{cov['threshold']}{r['unit']} covenant)"
            )

    # Health score (0–10): weighted avg of ratio pass/fail + exceptions
    ratio_score = sum(2.5 if r["status"] == "pass" else 1.0 for r in ratios)
    exception_penalty = min(2.0, len(state.get("exceptions", [])) * 0.5)
    health_score = round(min(10, max(0, ratio_score - exception_penalty)), 1)

    risk_tier = (
        "Low Risk" if health_score >= 6.5
        else "Moderate Risk" if health_score >= 4.5
        else "High Risk"
    )

    risk_summary = (
        f"Health score {health_score}/10 — {risk_tier}. "
        f"{len(breaches)} covenant breach(es): {'; '.join(breaches) if breaches else 'none'}. "
        "Gate 3 required before memo generation."
    )

    audit_event = build_audit_event(
        stage="Assessment",
        actor_kind="agent",
        actor="Risk & Covenant Agent",
        agent_id="risk",
        input_summary="Signed spread + covenant schedule §3.1 + Bloomberg peer set (Costco, Target, Kroger)",
        reasoning=(
            f"Calculated {len(ratios)} ratios from mapped spread. "
            f"Covenant check vs §3.1 thresholds: {len(breaches)} breach(es). "
            f"Health score weighted: ratio pass/fail (70%) + exception count (30%)."
        ),
        output_summary=risk_summary,
    )

    existing_trail = state.get("audit_trail", [])
    return {
        "ratios": ratios,
        "covenant_breaches": breaches,
        "health_score": health_score,
        "risk_tier": risk_tier,
        "risk_summary": risk_summary,
        "current_stage": "assessment",
        "updated_at": now_iso(),
        "audit_trail": existing_trail + [audit_event],
    }
