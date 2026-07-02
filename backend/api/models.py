"""Pydantic request/response models for the REST API."""
from __future__ import annotations
from pydantic import BaseModel, Field
from typing import Any, Literal


class CreateCaseRequest(BaseModel):
    borrower_name: str
    case_type: Literal["term_loan_b", "revolving_credit", "floor_plan", "annual_review"] = "term_loan_b"
    borrower_ein: str
    borrower_duns: str | None = None
    ubo_profiles: list[dict[str, str]] = Field(default_factory=list)
    documents: list[dict[str, Any]] = Field(default_factory=list)
    sla_hours: int = 48


class GateDecisionRequest(BaseModel):
    gate_id: str
    status: Literal["approved", "override", "rejected"]
    actor: str
    reason: str | None = None


class FieldOverrideRequest(BaseModel):
    field_name: str
    corrected_value: str
    reason: str
    actor: str


class ReceiveDocumentRequest(BaseModel):
    actor: str
    size_kb: int | None = None
    classification: str | None = None
    uploaded_file_name: str | None = None


class CaseResponse(BaseModel):
    case_id: str
    case_ref: str
    borrower_name: str
    current_stage: str
    pipeline_blocked: bool
    health_score: float | None
    risk_tier: str | None
    decision: str | None
    decision_score: float | None
    gates: dict[str, Any]
    audit_trail_count: int
    created_at: str
    updated_at: str


class AuditEventResponse(BaseModel):
    event_id: str
    timestamp: str
    stage: str
    actor_kind: str
    actor: str
    agent_id: str | None
    input_summary: str
    reasoning: str
    output_summary: str
    gate_id: str | None


class PortfolioResponse(BaseModel):
    alerts: list[dict[str, Any]]
    kpis: dict[str, Any]
    generated_at: str
