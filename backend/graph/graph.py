"""
ACOS Credit Case Graph
Assembles all agent nodes and human gate interrupts into a LangGraph StateGraph.

Flow:
  START → intake → [Gate 1 interrupt] → connector + document_intel → mapping
        → [Gate 2 interrupt] → review → risk → [Gate 3 interrupt]
        → memo → [Gate 4 interrupt] → decision → [Gate 5 interrupt] → END
"""
from __future__ import annotations
import os
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.sqlite import SqliteSaver

from graph.state import CreditCaseState
from graph.nodes.intake import intake_agent
from graph.nodes.document_intel import document_intel_agent
from graph.nodes.mapping import mapping_agent
from graph.nodes.review import review_agent
from graph.nodes.risk import risk_agent
from graph.nodes.memo import memo_agent
from graph.nodes.decision import decision_agent
from graph.nodes.connector import connector_agent
from graph.gates import gate1_node, gate2_node, gate3_node, gate4_node, gate5_node


def _route_after_intake(state: CreditCaseState) -> str:
    """Route to Gate 1 after intake runs."""
    return "gate1"


def _route_after_gate1(state: CreditCaseState) -> str:
    """If Gate 1 blocked/rejected, go to end. Otherwise proceed."""
    gates = state.get("gates", {})
    g1_status = gates.get("gate1", {}).get("status", "pending")
    if g1_status == "rejected":
        return END
    return "connector"


def _route_after_mapping(state: CreditCaseState) -> str:
    return "gate2"


def _route_after_gate2(state: CreditCaseState) -> str:
    gates = state.get("gates", {})
    g2_status = gates.get("gate2", {}).get("status", "pending")
    return "review" if g2_status in ("approved", "override") else END


def _route_after_review(state: CreditCaseState) -> str:
    return "risk"


def _route_after_risk(state: CreditCaseState) -> str:
    return "gate3"


def _route_after_gate3(state: CreditCaseState) -> str:
    gates = state.get("gates", {})
    g3_status = gates.get("gate3", {}).get("status", "pending")
    return "memo" if g3_status in ("approved", "override") else END


def _route_after_memo(state: CreditCaseState) -> str:
    return "gate4"


def _route_after_gate4(state: CreditCaseState) -> str:
    gates = state.get("gates", {})
    g4_status = gates.get("gate4", {}).get("status", "pending")
    return "decision" if g4_status in ("approved", "override") else END


def _route_after_decision(state: CreditCaseState) -> str:
    return "gate5"


def _route_after_gate5(state: CreditCaseState) -> str:
    return END


def build_graph(checkpointer=None):
    """Build and compile the ACOS credit case graph."""
    builder = StateGraph(CreditCaseState)

    # ── Agent nodes ────────────────────────────────────────────────────────────
    builder.add_node("intake", intake_agent)
    builder.add_node("connector", connector_agent)
    builder.add_node("document_intel", document_intel_agent)
    builder.add_node("mapping", mapping_agent)
    builder.add_node("review", review_agent)
    builder.add_node("risk", risk_agent)
    builder.add_node("memo", memo_agent)
    builder.add_node("decision", decision_agent)

    # ── Gate nodes (human interrupt points) ───────────────────────────────────
    builder.add_node("gate1", gate1_node)
    builder.add_node("gate2", gate2_node)
    builder.add_node("gate3", gate3_node)
    builder.add_node("gate4", gate4_node)
    builder.add_node("gate5", gate5_node)

    # ── Edges ─────────────────────────────────────────────────────────────────
    builder.add_edge(START, "intake")
    builder.add_conditional_edges("intake", _route_after_intake, {"gate1": "gate1"})
    builder.add_conditional_edges(
        "gate1",
        _route_after_gate1,
        {"connector": "connector", END: END},
    )

    # Connector and document_intel run in sequence after Gate 1
    builder.add_edge("connector", "document_intel")
    builder.add_edge("document_intel", "mapping")

    builder.add_conditional_edges("mapping", _route_after_mapping, {"gate2": "gate2"})
    builder.add_conditional_edges(
        "gate2",
        _route_after_gate2,
        {"review": "review", END: END},
    )

    builder.add_conditional_edges("review", _route_after_review, {"risk": "risk"})
    builder.add_conditional_edges("risk", _route_after_risk, {"gate3": "gate3"})
    builder.add_conditional_edges(
        "gate3",
        _route_after_gate3,
        {"memo": "memo", END: END},
    )

    builder.add_conditional_edges("memo", _route_after_memo, {"gate4": "gate4"})
    builder.add_conditional_edges(
        "gate4",
        _route_after_gate4,
        {"decision": "decision", END: END},
    )

    builder.add_conditional_edges("decision", _route_after_decision, {"gate5": "gate5"})
    builder.add_conditional_edges("gate5", _route_after_gate5, {END: END})

    # ── Checkpointer ──────────────────────────────────────────────────────────
    # NOTE: SqliteSaver/PostgresSaver.from_conn_string() are @contextmanager
    # generators — they must not be assigned directly (that yields the
    # _GeneratorContextManager wrapper, not a usable saver). Construct the
    # saver directly from an open connection instead, since this checkpointer
    # is meant to live for the whole process (FastAPI's lifespan), not a
    # single `with` block.
    if checkpointer is None:
        database_url = os.getenv("DATABASE_URL")
        if database_url:
            # Production: Postgres (e.g. Supabase). Imported lazily so local dev
            # without psycopg installed still works via the SQLite fallback below.
            from psycopg import Connection
            from psycopg.rows import dict_row
            from langgraph.checkpoint.postgres import PostgresSaver

            conn = Connection.connect(
                database_url, autocommit=True, prepare_threshold=0, row_factory=dict_row
            )
            checkpointer = PostgresSaver(conn)
            checkpointer.setup()
        else:
            import sqlite3

            db_path = os.getenv("SQLITE_PATH", "acos.db")
            conn = sqlite3.connect(db_path, check_same_thread=False)
            checkpointer = SqliteSaver(conn)

    return builder.compile(checkpointer=checkpointer, interrupt_before=[
        "gate1", "gate2", "gate3", "gate4", "gate5",
    ])
