"""Shared utilities for all agent nodes."""
from __future__ import annotations
import uuid
from datetime import datetime, timezone


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_audit_id(prefix: str) -> str:
    return f"trace-{uuid.uuid4().hex[:8]}-{prefix}"


def new_event_id() -> str:
    return f"evt-{uuid.uuid4().hex[:12]}"


def build_audit_event(
    stage: str,
    actor_kind: str,
    actor: str,
    agent_id: str | None,
    input_summary: str,
    reasoning: str,
    output_summary: str,
    gate_id: str | None = None,
) -> dict:
    return {
        "event_id": new_event_id(),
        "timestamp": now_iso(),
        "stage": stage,
        "actor_kind": actor_kind,
        "actor": actor,
        "agent_id": agent_id,
        "input_summary": input_summary,
        "reasoning": reasoning,
        "output_summary": output_summary,
        "gate_id": gate_id,
    }
