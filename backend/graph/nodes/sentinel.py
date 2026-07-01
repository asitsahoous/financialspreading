"""
Portfolio Sentinel Agent
Scans the portfolio hourly. Detects covenant breaches, ratio deterioration,
overdue filings. Returns alert cards for the Command Center.
Runs independently — not part of the case graph.
"""
from __future__ import annotations
from datetime import datetime, timezone
from graph.nodes.utils import build_audit_event, now_iso


# Demo portfolio data — in production this reads from the case database
PORTFOLIO_CASES = [
    {
        "case_id": "walmart",
        "borrower": "Walmart Inc.",
        "current_ratio": 0.79,
        "de_ratio": 0.46,
        "dscr": 1.65,
        "covenant_current_ratio_min": 1.2,
        "covenant_de_max": 0.55,
        "health_score": 7.2,
        "risk_tier": "Low Risk",
        "stage": "review",
        "exposure_m": 2000,
    },
    {
        "case_id": "autowest",
        "borrower": "AutoWest Motors",
        "current_ratio": 0.85,
        "de_ratio": 5.2,
        "dscr": 0.95,
        "covenant_current_ratio_min": 1.2,
        "covenant_de_max": 3.0,
        "health_score": 2.1,
        "risk_tier": "High Risk",
        "stage": "assessment",
        "exposure_m": 12.4,
    },
    {
        "case_id": "tesla-rental",
        "borrower": "Tesla Rental Corp",
        "current_ratio": 0.85,
        "de_ratio": 3.8,
        "dscr": 0.88,
        "covenant_current_ratio_min": 1.2,
        "covenant_de_max": 4.0,
        "health_score": 4.2,
        "risk_tier": "High Risk",
        "stage": "review",
        "exposure_m": 32.0,
    },
]


def sentinel_scan() -> dict:
    """
    Scan portfolio for covenant breaches and risk deterioration.
    Returns alert list + portfolio KPIs.
    """
    alerts = []
    total_breaches = 0
    high_risk_count = 0

    for case in PORTFOLIO_CASES:
        case_alerts = []

        if case["current_ratio"] < case["covenant_current_ratio_min"]:
            total_breaches += 1
            case_alerts.append(
                f"Current Ratio {case['current_ratio']}x < covenant {case['covenant_current_ratio_min']}x"
            )

        if case["de_ratio"] > case["covenant_de_max"]:
            total_breaches += 1
            case_alerts.append(
                f"D/E {case['de_ratio']}x > covenant {case['covenant_de_max']}x"
            )

        if case["dscr"] < 1.5:
            case_alerts.append(f"DSCR {case['dscr']}x below 1.5x minimum")

        if case["risk_tier"] == "High Risk":
            high_risk_count += 1

        if case_alerts:
            alerts.append({
                "case_id": case["case_id"],
                "borrower": case["borrower"],
                "breaches": case_alerts,
                "severity": "critical" if case["risk_tier"] == "High Risk" else "warning",
                "health_score": case["health_score"],
                "risk_tier": case["risk_tier"],
                "stage": case["stage"],
                "exposure_m": case["exposure_m"],
                "generated_at": now_iso(),
                "agent": "sentinel",
            })

    # Portfolio KPIs
    kpis = {
        "total_cases": len(PORTFOLIO_CASES),
        "total_breaches": total_breaches,
        "high_risk_count": high_risk_count,
        "agent_auto_pass_rate": 94,  # % of cases auto-passed without human exception
        "open_exceptions_book": 12,
        "agent_hours_saved_mtd": 312,
        "total_exposure_b": sum(c["exposure_m"] for c in PORTFOLIO_CASES) / 1000,
    }

    return {
        "alerts": alerts,
        "kpis": kpis,
        "generated_at": now_iso(),
    }
