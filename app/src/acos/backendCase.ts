/**
 * Adapter between the demo's two fixture case "roles" (walmart, northern-retail)
 * and real backend cases created via the FastAPI + LangGraph API (`acosApi`).
 *
 * Scope note: Gate 1–5 sign-off, document intake, and the "Total Assets"
 * mapping correction are wired to the real backend — CASES.walmart and
 * CASES["northern-retail"]'s intakeDocs now use the exact same names as
 * backend/graph/nodes/intake.py's SOP §4.2 manifest, so document names no
 * longer need reconciling. The rest of the mapping/exceptions data and Gate
 * 5 decline/table still stay on local fixture/session state — see
 * docs/KNOWN_ISSUES.md for what's left and why.
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
    .then(async (res) => {
      // IMPORTANT: the backend graph pauses at Gate 1's interrupt_before
      // boundary immediately on case creation and stays there until
      // explicitly resumed — regardless of whether intake is complete.
      // The Walmart happy-path UI starts directly at "Review" (Gate 2) and
      // never clicks "Sign Gate 1" (its narrative treats intake as already
      // done). Without this, the *next* gate call's resume value gets
      // consumed by Gate 1's still-pending interrupt() instead of the gate
      // the UI actually targeted — every subsequent gate ends up recorded
      // one step behind (gate2's payload lands under "gate1", etc). Only
      // do this when intake is actually complete (Walmart's seed); Northern
      // Retail's seed is intentionally partial and signs Gate 1 for real
      // through the Intake UI once documents are received.
      if (seed.receivedCount === TERM_LOAN_B_DOCS.length) {
        await signBackendGate(res.case_id, "gate1", "Sarah W. (Credit Analyst)").catch(() => {
          /* best-effort — if this fails, the first real gate action will surface the sync error */
        });
      }
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

export type BackendDocumentOverride = {
  received: boolean;
  uploadedBy?: string;
  uploadedOn?: string;
  sizeKb?: number;
  classification?: string;
  uploadedFileName?: string;
};

/** Full raw state includes `documents`, unlike the slim CaseResponse from getCase(). */
export async function fetchBackendDocuments(caseId: string): Promise<Record<string, BackendDocumentOverride> | null> {
  try {
    const state = await acosApi.getCaseState(caseId);
    const documents = (state.documents as
      | Array<{
          name: string;
          received: boolean;
          size_kb: number | null;
          classification: string | null;
          uploaded_by: string | null;
          uploaded_on: string | null;
          uploaded_file_name: string | null;
        }>
      | undefined) ?? [];
    const byName: Record<string, BackendDocumentOverride> = {};
    for (const doc of documents) {
      if (!doc.received) continue;
      byName[doc.name] = {
        received: true,
        uploadedBy: doc.uploaded_by ?? undefined,
        uploadedOn: doc.uploaded_on ?? undefined,
        sizeKb: doc.size_kb ?? undefined,
        classification: doc.classification ?? undefined,
        uploadedFileName: doc.uploaded_file_name ?? undefined,
      };
    }
    return byName;
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

/**
 * Marks a document received on the real backend. Only meaningful for the
 * canonical SOP §4.2 manifest names in TERM_LOAN_B_DOCS above — both
 * CASES.walmart and CASES["northern-retail"] intakeDocs now use those exact
 * names, so every document in either fixture can be wired.
 */
export async function receiveBackendDocument(
  caseId: string,
  docName: string,
  actor: string,
  sizeKb?: number,
  classification?: string,
  uploadedFileName?: string,
): Promise<CaseResponse> {
  return acosApi.receiveDocument(caseId, docName, {
    actor,
    size_kb: sizeKb,
    classification,
    uploaded_file_name: uploadedFileName,
  });
}

export type BackendGateId = "gate1" | "gate2" | "gate3" | "gate4" | "gate5";

/** Persists a gate decision to the real backend. Throws on failure — callers decide the UX fallback. */
export async function signBackendGate(
  caseId: string,
  gateId: BackendGateId,
  actor: string,
  reason?: string,
  status: "approved" | "override" | "rejected" | "tabled" = "approved",
): Promise<CaseResponse> {
  return acosApi.signGate(caseId, gateId, { gate_id: gateId, status, actor, reason });
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
