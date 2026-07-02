/**
 * Adapter between the demo's two fixture case "roles" (walmart, northern-retail)
 * and real backend cases created via the FastAPI + LangGraph API (`acosApi`).
 *
 * Scope note: only Gate 1–5 sign-off is wired to the real backend here — gate
 * IDs map 1:1 with no naming ambiguity. Document intake, mapping/exceptions,
 * and Gate 5 decline/table stay on local fixture/session state for now: the
 * frontend's fixture document names (e.g. Walmart's "WLBOR", "WLBBSHEET")
 * don't match the backend's fixed 9-item SOP §4.2 manifest names at all, and
 * reconciling that is separate follow-up work (see docs/KNOWN_ISSUES.md).
 */
import { acosApi, type CaseResponse, type GateRecord } from "../api/client";

export type BackendCaseRole = "walmart" | "northern-retail";

const SESSION_KEY_PREFIX = "acos:backendCaseId:";

// Backend's fixed term_loan_b SOP §4.2 manifest (see backend/graph/nodes/intake.py).
const TERM_LOAN_B_DOCS = [
  "10-K Annual Filing",
  "Credit Application",
  "Q3 Cash Flow Statement",
  "Covenant Schedule",
  "Auditor Letter",
  "Management Representation",
  "Intercompany Schedule",
  "Guarantor Financials",
  "Collateral Appraisal",
];

const ROLE_SEED: Record<BackendCaseRole, { borrower_name: string; ein: string; receivedCount: number }> = {
  // All 9 docs received — matches the Walmart happy-path narrative (docs already complete).
  walmart: { borrower_name: "Walmart Inc.", ein: "71-0415188", receivedCount: 9 },
  // Only 2 of 9 received — matches the Northern Retail sad-path narrative (Gate 1 blocked).
  "northern-retail": { borrower_name: "Northern Retail LLC", ein: "84-2931847", receivedCount: 2 },
};

function readCachedCaseId(role: BackendCaseRole): string | null {
  try {
    return sessionStorage.getItem(`${SESSION_KEY_PREFIX}${role}`);
  } catch {
    return null;
  }
}

function writeCachedCaseId(role: BackendCaseRole, caseId: string) {
  try {
    sessionStorage.setItem(`${SESSION_KEY_PREFIX}${role}`, caseId);
  } catch {
    /* ignore */
  }
}

/** Clears cached real-backend case pointers — called from "Reset demo". */
export function clearBackendCaseCache() {
  try {
    for (const role of Object.keys(ROLE_SEED)) {
      sessionStorage.removeItem(`${SESSION_KEY_PREFIX}${role}`);
    }
  } catch {
    /* ignore */
  }
}

const inFlightCreates = new Map<BackendCaseRole, Promise<string>>();

/**
 * Returns the real backend case_id for this demo role, creating it on the
 * backend on first use (and caching the pointer in sessionStorage — "which
 * case is open" is legitimate local UI-navigation state, not business data;
 * the case itself now lives server-side).
 */
export async function ensureBackendCase(role: BackendCaseRole): Promise<string> {
  const cached = readCachedCaseId(role);
  if (cached) return cached;

  const existing = inFlightCreates.get(role);
  if (existing) return existing;

  const seed = ROLE_SEED[role];
  const promise = acosApi
    .createCase({
      borrower_name: seed.borrower_name,
      case_type: "term_loan_b",
      borrower_ein: seed.ein,
      documents: TERM_LOAN_B_DOCS.map((name, i) => ({ name, received: i < seed.receivedCount })),
    })
    .then((res) => {
      writeCachedCaseId(role, res.case_id);
      return res.case_id;
    })
    .finally(() => {
      inFlightCreates.delete(role);
    });

  inFlightCreates.set(role, promise);
  return promise;
}

export async function fetchBackendCase(caseId: string): Promise<CaseResponse | null> {
  try {
    return await acosApi.getCase(caseId);
  } catch {
    return null;
  }
}

/**
 * Persists a mapping accept/override to the real backend's Trust Inspector
 * endpoint (`POST /cases/{id}/overrides`). Field names are only wired for
 * fields that are known to exist on both sides — currently just "Total
 * Assets", the one exception seeded identically in both the frontend fixture
 * and the backend's `document_intel.py` (same field name, same seeded
 * $100K value) — see docs/KNOWN_ISSUES.md for why the broader mapping data
 * isn't wired yet (same fixture/backend mismatch as document intake).
 */
export const BACKEND_WIRED_MAPPING_FIELDS = new Set(["Total Assets"]);

export async function overrideBackendField(
  caseId: string,
  fieldName: string,
  correctedValue: string,
  reason: string,
  actor: string,
): Promise<CaseResponse> {
  return acosApi.overrideField(caseId, { field_name: fieldName, corrected_value: correctedValue, reason, actor });
}

export type BackendGateId = "gate1" | "gate2" | "gate3" | "gate4" | "gate5";

/** Persists a gate approval to the real backend. Throws on failure — callers decide the UX fallback. */
export async function signBackendGate(
  caseId: string,
  gateId: BackendGateId,
  actor: string,
  reason?: string,
): Promise<CaseResponse> {
  return acosApi.signGate(caseId, gateId, { gate_id: gateId, status: "approved", actor, reason });
}

/** `gates["gate1"].status` → the frontend's `GateSignKind` union, for the 5 sign actions this module wires up. */
export function backendGatesToSignedKinds(gates: Record<string, GateRecord> | undefined): Set<string> {
  const signed = new Set<string>();
  if (!gates) return signed;
  for (const [gateId, record] of Object.entries(gates)) {
    if (record.status === "approved" || record.status === "override") {
      signed.add(`${gateId}-sign`);
    }
  }
  return signed;
}
