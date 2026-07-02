# CL Alpha Production Planning — Document Suite

**Last updated:** 2026-07-02

This folder is the comprehensive plan for turning the `app/`/`backend/` prototype into a production system covering all 25 items in [../PRODUCT_REQUIREMENTS.md](../PRODUCT_REQUIREMENTS.md). Read in this order:

1. **[PRD.md](PRD.md)** — what to build. Full feature specs (user stories, acceptance criteria, exceptions) for all 25 backlog items, plus cross-cutting requirements (audit, RBAC, multi-tenancy, notifications, error handling).
2. **[TECHNICAL_ARCHITECTURE.md](TECHNICAL_ARCHITECTURE.md)** — how to build it. Target system architecture, concrete technology recommendations (database, OCR/LLM, auth, hosting), data model, migration path from the current prototype.
3. **[WORKFLOWS_AND_EXCEPTIONS.md](WORKFLOWS_AND_EXCEPTIONS.md)** — how it behaves. Every major workflow (case creation through decision, plus admin/rule workflows) with happy path and every exception path mapped to a recovery — no dead ends.
4. **[KNOWN_ISSUES.md](KNOWN_ISSUES.md)** — what's broken today. Full code-audit results: every non-functional button, placeholder, and mock-data surface in the current app, prioritized P0/P1/P2, each with a fix tied back to the PRD/architecture.
5. **[ROADMAP.md](ROADMAP.md)** — what order to build it in. Six phases sequenced by dependency (Foundation → Ingestion → Rule Engines → Workflow Automation → Reporting → Launch Readiness), each with an explicit exit gate.

## How these fit together

The PRD defines *what*, the architecture defines *how*, the workflow catalog defines *behavior under all conditions* (not just the happy path), the known-issues doc grounds all of it in the *actual current state* of the code (not assumptions), and the roadmap sequences the work. Known-issue IDs are cross-referenced from the roadmap so remediation isn't a separate, disconnected backlog — it's interleaved with feature delivery.

## Scope note

These documents describe a **production target**. The current `app/` + `backend/` remains a working board-demo prototype in the meantime — see [../DEMO_WALKTHROUGH.md](../DEMO_WALKTHROUGH.md) for presenting it as-is. Nothing in this folder should be read as "the demo is broken" — it's "the demo is a demo, and here's what it takes to make it a product."
