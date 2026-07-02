"""
ACOS Credit Case State — the single object that flows through the LangGraph.
Every node reads from and writes to this TypedDict.
"""
from __future__ import annotations
from typing import Annotated, Any, Literal
from typing_extensions import TypedDict
from langgraph.graph.message import add_messages


# ─── Enums / literals ─────────────────────────────────────────────────────────

CaseType = Literal["term_loan_b", "revolving_credit", "floor_plan", "annual_review"]
StageId = Literal[
    "intake", "extraction", "mapping", "review",
    "assessment", "memo", "decision", "complete"
]
GateId = Literal["gate1", "gate2", "gate3", "gate4", "gate5"]
GateDecision = Literal["approved", "override", "rejected", "pending"]
Confidence = Literal["high", "review", "missing"]
RiskTier = Literal["Low Risk", "Moderate Risk", "High Risk"]


# ─── Sub-models ───────────────────────────────────────────────────────────────

class Document(TypedDict):
    name: str
    sop_ref: str
    received: bool
    size_kb: int | None
    classification: str | None
    uploaded_by: str | None
    uploaded_on: str | None
    uploaded_file_name: str | None


class ExtractedField(TypedDict):
    field: str
    value: str
    confidence: Confidence
    source_page: int | None
    sop_ref: str
    agent: str
    audit_id: str
    reasoning: str


class MappingRow(TypedDict):
    field: str
    coa_tag: str
    value: str
    confidence: Confidence
    sop_ref: str
    source_page: int | None
    reasoning: str
    audit_id: str


class Exception_(TypedDict):
    field: str
    current_value: str
    prior_value: str | None
    expected_range: str | None
    reasoning: str
    severity: Literal["critical", "warning", "info"]
    agent: str


class RatioResult(TypedDict):
    ratio: str
    formula: str
    actual: float | None
    threshold: float | None
    unit: str
    status: Literal["pass", "warn", "fail", "pending"]
    explanation: str
    trend_2025: list[float]
    trend_2024: list[float]


class ConnectorFeed(TypedDict):
    id: str
    provider: str
    api: str
    entity_id_type: str
    entity_id_masked: str
    status: Literal["synced", "pending", "blocked", "stale"]
    synced_at: str
    result: str
    memo_section: str


class MemoSection(TypedDict):
    title: str
    body: str
    source: str
    connector_ref: str


class AuditEvent(TypedDict):
    event_id: str
    timestamp: str
    stage: str
    actor_kind: Literal["agent", "human", "system"]
    actor: str
    agent_id: str | None
    input_summary: str
    reasoning: str
    output_summary: str
    gate_id: str | None


class GateRecord(TypedDict):
    gate_id: GateId
    label: str
    status: GateDecision
    actor: str | None
    signed_at: str | None
    reason: str | None


# ─── Main state ───────────────────────────────────────────────────────────────

class CreditCaseState(TypedDict):
    # Identity
    case_id: str
    case_ref: str
    case_type: CaseType
    borrower_name: str
    borrower_ein: str
    borrower_duns: str | None
    ubo_profiles: list[dict[str, str]]

    # Stage tracking
    current_stage: StageId
    pipeline_blocked: bool
    block_reason: str | None

    # Intake
    documents: list[Document]
    intake_complete: bool
    missing_docs: list[str]
    intake_summary: str

    # Extraction
    extracted_fields: list[ExtractedField]
    extraction_confidence_pct: float
    extraction_summary: str

    # Mapping
    mapping_rows: list[MappingRow]
    mapping_complete_count: int
    mapping_skipped_count: int
    mapping_summary: str

    # Review
    exceptions: list[Exception_]
    review_summary: str
    review_passed: bool

    # Connectors (run after Gate 1)
    connector_feeds: list[ConnectorFeed]
    connector_summary: str

    # Assessment / Risk
    ratios: list[RatioResult]
    covenant_breaches: list[str]
    health_score: float
    risk_tier: RiskTier
    risk_summary: str

    # Memo
    memo_sections: list[MemoSection]
    memo_draft: str
    memo_summary: str

    # Decision
    decision: Literal["approve", "conditional_approve", "negotiate", "decline", "pending"]
    decision_score: float
    decision_rationale: str
    decision_summary: str

    # Human gates (Gate 1–5)
    gates: dict[str, GateRecord]

    # Audit trail (append-only via langgraph state reducer)
    audit_trail: list[AuditEvent]

    # SLA / metadata
    created_at: str
    updated_at: str
    sla_hours: int
    estimated_review_minutes: int
    agent_time_saved_hours: float
