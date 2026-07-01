/**
 * ACOS API Client
 * Connects the React app to the LangGraph FastAPI backend.
 * Falls back to demo mode (static data) if VITE_API_URL is not set.
 */

const BASE_URL = import.meta.env.VITE_API_URL ?? "";

export const isLiveMode = BASE_URL.length > 0;

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}/api/v1${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ACOS API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CaseResponse {
  case_id: string;
  case_ref: string;
  borrower_name: string;
  current_stage: string;
  pipeline_blocked: boolean;
  health_score: number | null;
  risk_tier: string | null;
  decision: string | null;
  decision_score: number | null;
  gates: Record<string, GateRecord>;
  audit_trail_count: number;
  created_at: string;
  updated_at: string;
}

export interface GateRecord {
  gate_id: string;
  label: string;
  status: "approved" | "override" | "rejected" | "pending";
  actor: string | null;
  signed_at: string | null;
  reason: string | null;
}

export interface AuditEvent {
  event_id: string;
  timestamp: string;
  stage: string;
  actor_kind: "agent" | "human" | "system";
  actor: string;
  agent_id: string | null;
  input_summary: string;
  reasoning: string;
  output_summary: string;
  gate_id: string | null;
}

export interface PortfolioData {
  alerts: PortfolioAlert[];
  kpis: PortfolioKpis;
  generated_at: string;
}

export interface PortfolioAlert {
  case_id: string;
  borrower: string;
  breaches: string[];
  severity: "critical" | "warning";
  health_score: number;
  risk_tier: string;
  stage: string;
  exposure_m: number;
  generated_at: string;
  agent: string;
}

export interface PortfolioKpis {
  total_cases: number;
  total_breaches: number;
  high_risk_count: number;
  agent_auto_pass_rate: number;
  open_exceptions_book: number;
  agent_hours_saved_mtd: number;
  total_exposure_b: number;
}

export interface CreateCaseBody {
  borrower_name: string;
  case_type: "term_loan_b" | "revolving_credit" | "floor_plan" | "annual_review";
  borrower_ein: string;
  borrower_duns?: string;
  ubo_profiles?: Array<Record<string, string>>;
  documents?: Array<Record<string, unknown>>;
  sla_hours?: number;
}

export interface GateDecisionBody {
  gate_id: string;
  status: "approved" | "override" | "rejected";
  actor: string;
  reason?: string;
}

export interface FieldOverrideBody {
  field_name: string;
  corrected_value: string;
  reason: string;
  actor: string;
}

// ─── API calls ────────────────────────────────────────────────────────────────

export const acosApi = {
  /** Create a new credit case and start the agent graph. */
  createCase: (body: CreateCaseBody) =>
    request<CaseResponse>("/cases", { method: "POST", body: JSON.stringify(body) }),

  /** Get current case state. */
  getCase: (caseId: string) =>
    request<CaseResponse>(`/cases/${caseId}`),

  /** Get full raw case state (for debugging). */
  getCaseState: (caseId: string) =>
    request<Record<string, unknown>>(`/cases/${caseId}/state`),

  /** Get the audit trail for a case. */
  getAuditTrail: (caseId: string) =>
    request<AuditEvent[]>(`/cases/${caseId}/audit`),

  /** Human gate sign-off or override. */
  signGate: (caseId: string, gateId: string, body: GateDecisionBody) =>
    request<CaseResponse>(`/cases/${caseId}/gates/${gateId}`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  /** Analyst field value override (Trust Inspector). */
  overrideField: (caseId: string, body: FieldOverrideBody) =>
    request<CaseResponse>(`/cases/${caseId}/overrides`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  /** Portfolio Sentinel scan — alerts + KPIs. */
  getPortfolio: () =>
    request<PortfolioData>("/portfolio"),

  /** Health check — calls root-level /health, not /api/v1/health. */
  health: async () => {
    const res = await fetch(`${BASE_URL}/health`);
    if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
    return res.json() as Promise<{ status: string }>;
  },
};
