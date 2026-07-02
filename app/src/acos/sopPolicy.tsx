import { Button, Row, Stack, Text } from "./ui";
import type { CSSProperties, ReactNode } from "react";
import { TAXONOMY, type TaxonomyNode } from "./financials/taxonomy";
import { RATIO_META } from "./financials/analytics";

export type SopSection = {
  id: string;
  title: string;
  body: string;
};

/**
 * Institution Credit Policy — Commercial Lending Standard Operating Procedure.
 *
 * Structure:
 *  §1   Purpose, scope, applicability
 *  §2   Case type definitions (Term Loan B / Revolving / Floor Plan / Annual Review)
 *  §3   Covenant schedule & testing protocol
 *  §4   Document manifests by case type
 *  §5   Income Statement mapping rules      (generated from the ACOS chart of accounts)
 *  §6   Extraction page map & document control
 *  §7   Balance Sheet mapping rules — Assets            (generated)
 *  §8   Balance Sheet mapping rules — Liabilities & Equity (generated)
 *  §9   Cash Flow mapping rules             (generated)
 *  §10  Ratio & covenant policy             (generated from RATIO_META thresholds)
 *  §11  Exception management & escalation policy
 *  §12  AML / KYC — Customer Identification Program
 *  §13  Approval authority matrix by exposure
 *  §14  Credit committee charter (Gate 5)
 *
 * §5, §7, §8, §9, §10 are generated directly from `financials/taxonomy.ts` and
 * `financials/analytics.ts` so every chart-of-accounts tag and ratio threshold
 * used anywhere in the app has a real, matching policy clause — no "section not
 * found" citations. Governance sections (§1-4, §6, §11-14) are hand-authored.
 */

const GOVERNANCE_SOP: SopSection[] = [
  {
    id: "§1",
    title: "Purpose, scope & applicability",
    body:
      "This policy governs commercial credit origination, spreading, risk assessment, and portfolio monitoring for all facilities " +
      "underwritten through the Agentic Credit Operating System (ACOS). It applies to four case types defined in §2: Term Loan B, " +
      "Revolving Credit, Floor Plan (asset-based inventory financing), and Annual Review (existing relationship renewal). Agents " +
      "execute extraction, mapping, and analysis under this policy; humans retain sign-off authority at five named gates (§13).",
  },
  {
    id: "§2",
    title: "Case type definitions",
    body:
      "Term Loan B: amortizing facility secured by enterprise value and cash flow, full underwriting per §4.2. " +
      "Revolving Credit: committed line against working-capital assets, full underwriting per §4.2, redraws subject to borrowing-base " +
      "certificate. Floor Plan: asset-based inventory financing for dealers/distributors, collateral is titled inventory, underwriting " +
      "per §4.3 with monthly curtailment and physical inventory audit. Annual Review: existing performing relationship, no new facility, " +
      "lighter-touch re-certification per §4.4. Case type determines the document manifest (§4), applicable covenants (§3), and Gate 1 " +
      "completeness rule (§4.1).",
  },
  {
    id: "§3",
    title: "Covenant schedule & testing protocol",
    body:
      "All facilities carry financial covenants tested against submitted financials at each reporting period. Covenant test results are " +
      "computed by the Risk & Covenant Agent and cannot be recorded until Gate 2 (spread sign-off) has passed. A breach triggers an " +
      "Exception (§11, category Covenant-Breach, severity Critical) routed to the Risk Officer with a 5-business-day cure-notice clock. " +
      "Facility-specific covenants negotiated in the credit agreement may be tighter than the institution policy floor defined in §10; " +
      "the tighter of the two governs.",
  },
  {
    id: "§3.1",
    title: "Standard covenant package — Term Loan B / Revolving Credit",
    body:
      "Minimum Current Ratio ≥1.20x (policy floor, §10.3); maximum Debt/Equity per the facility's negotiated covenant, which may be " +
      "tighter than the §10.4 policy ceiling of 1.50x (e.g. an investment-grade borrower's credit agreement may set ≤0.55x). Tested " +
      "quarterly from the most recent spread. Two consecutive quarters within 10% of a threshold triggers a Watch-List exception " +
      "(severity Warning) even absent a technical breach.",
  },
  {
    id: "§3.4",
    title: "Floor Plan covenant package — fleet / inventory utilization",
    body:
      "Floor Plan facilities are tested monthly on Inventory Utilization (titled units financed ÷ approved flooring line) with a " +
      "ceiling of 80%; DSCR ≥1.25x per §10.6; and a rolling 90-day aging report — any unit aged past 270 days without a curtailment " +
      "payment is a Critical exception routed to the Risk Officer same-day. Physical inventory audit required semi-annually per §4.3.4.",
  },
  {
    id: "§4",
    title: "Document manifests — general submission standards",
    body:
      "All submitted financial statements must be in USD, prepared under US GAAP (or reconciled to GAAP), for the fiscal periods " +
      "specified by case type. The Intake Agent validates the manifest for the case's type (§4.2 / §4.3 / §4.4) before Document " +
      "Intelligence begins extraction. Gate 1 cannot pass with any required item missing; an analyst may log a documented waiver " +
      "for a single non-critical item under §11 (category Missing-Document, Warning severity) but the pipeline remains held pending " +
      "the item or a written committee waiver.",
  },
  {
    id: "§4.2",
    title: "Document manifest — Term Loan B & Revolving Credit",
    body:
      "Nine documents required before Gate 1 sign-off: (1) Annual filing / 10-K, (2) Credit application, (3) Interim cash flow " +
      "statement (most recent quarter), (4) Covenant schedule, (5) Auditor letter, (6) Management representation, (7) Intercompany " +
      "schedule, (8) Guarantor financials, (9) Collateral appraisal. Intake Agent blocks extraction until all nine are received and " +
      "classified per §4.2.1-§4.2.9.",
  },
  {
    id: "§4.2.1",
    title: "Annual filing / 10-K",
    body: "Audited annual financial statements or SEC 10-K filing for the most recent fiscal year. Required for all commercial credits above $5M.",
  },
  {
    id: "§4.2.2",
    title: "Credit application",
    body: "Signed borrower credit application capturing legal entity name, EIN, facility request, and authorized signatories. Triggers Connector Agent AML entity screen.",
  },
  {
    id: "§4.2.3",
    title: "Q3 cash flow statement",
    body:
      "Interim cash flow statement for the most recent quarter. Waiver policy: an analyst may log a documented waiver under §4.2.3 " +
      "when the borrower commits to delivery within 24 hours, but Gate 1 does not pass until the document is received or the credit " +
      "committee waives in writing per §11.4.",
  },
  {
    id: "§4.2.4",
    title: "Covenant schedule",
    body: "Schedule of financial covenants with test dates, thresholds, and headroom calculations for existing and proposed facilities.",
  },
  {
    id: "§4.2.5",
    title: "Auditor letter",
    body: "Independent auditor comfort letter or management letter referencing going-concern and material adjustments.",
  },
  {
    id: "§4.2.6",
    title: "Management representation",
    body: "Signed management representation letter attesting to completeness and accuracy of submitted financials.",
  },
  {
    id: "§4.2.7",
    title: "Intercompany schedule",
    body: "Detail of intercompany balances and eliminations for consolidated borrowers with multiple legal entities.",
  },
  {
    id: "§4.2.8",
    title: "Guarantor financials",
    body: "Financial statements for personal or corporate guarantors when guarantee support is part of the credit structure.",
  },
  {
    id: "§4.2.9",
    title: "Collateral appraisal",
    body: "Third-party appraisal report for pledged collateral updated within 12 months of facility closing.",
  },
  {
    id: "§4.3",
    title: "Document manifest — Floor Plan financing",
    body:
      "Six documents required before Gate 1: (1) Dealer floor-plan agreement, (2) Manufacturer invoice / titled-unit schedule, " +
      "(3) Inventory aging report (current within 30 days), (4) Flooring-line utilization report, (5) UCC-1 filing confirmation on " +
      "titled inventory, (6) Prior-period covenant certificate. Physical inventory audit (§4.3.4) is scheduled, not a Gate 1 " +
      "prerequisite, and occurs semi-annually post-closing.",
  },
  {
    id: "§4.3.1",
    title: "Dealer floor-plan agreement",
    body: "Executed flooring agreement establishing the approved line, advance rate per unit, and curtailment schedule.",
  },
  {
    id: "§4.3.2",
    title: "Manufacturer invoice / titled-unit schedule",
    body: "Itemized schedule of financed units with manufacturer invoice cost, VIN/serial, and title status — the collateral base for the facility.",
  },
  {
    id: "§4.3.3",
    title: "Inventory aging report",
    body: "Current inventory aging by unit; units aged beyond 270 days without curtailment trigger the §3.4 covenant test.",
  },
  {
    id: "§4.3.4",
    title: "Physical inventory audit",
    body: "Independent physical count reconciled to the titled-unit schedule, performed semi-annually; discrepancies over 2% of financed units are a Critical exception.",
  },
  {
    id: "§4.4",
    title: "Document manifest — Annual Review",
    body:
      "Four documents required for an existing performing relationship's annual re-certification: (1) Updated annual financial " +
      "statements, (2) Covenant compliance certificate signed by borrower CFO, (3) Updated insurance/collateral confirmation, " +
      "(4) Any material-change attestation. Annual Review does not require a new credit application, guarantor refresh, or full " +
      "appraisal unless a covenant breach or material adverse change is flagged during extraction.",
  },
  {
    id: "§6",
    title: "Extraction page map & document control",
    body:
      "Document Intelligence Agent extracts only from SOP-defined statement pages: Income Statement, Balance Sheet, and Cash Flow " +
      "as paginated in the borrower's filing. Marketing, MD&A narrative, and non-financial sections are excluded from spread " +
      "population. Every extracted value must carry a source page and source cell reference (§5-§9); a value without both is " +
      "rejected by the Mapping Agent and routed to Document Intelligence for re-extraction.",
  },
  {
    id: "§7",
    title: "Balance Sheet mapping rules — Assets (overview)",
    body:
      "Governs mapping of every Balance Sheet asset line to the chart of accounts (§7.1-§7.7): current assets (Cash, Accounts " +
      "Receivable, Inventory, Prepaid Expenses) and non-current assets (PP&E, Goodwill, Intangibles), plus the calculated subtotal " +
      "Total Current Assets and total Total Assets. See §5 for Income Statement and §8 for Liabilities & Equity mapping rules.",
  },
  {
    id: "§11",
    title: "Exception management & escalation policy",
    body:
      "An exception is any agent-flagged discrepancy requiring human review before the pipeline proceeds. Every exception carries a " +
      "category (§11.1), a severity (§11.2), a responsible reviewer (§11.3), and — for Critical exceptions — is barred from being " +
      "cleared by the same analyst who is signing the adjacent gate (segregation of duties). Unresolved exceptions block their gate " +
      "indefinitely; there is no silent bypass. An override always requires a documented rationale and is permanently logged to the " +
      "case audit trail.",
  },
  {
    id: "§11.1",
    title: "Exception categories",
    body:
      "OCR-Confidence (extraction below the §11.2 confidence floor), Scale-Mismatch (units/decimal inconsistent with prior period or " +
      "peer benchmark), YoY-Outlier (variance exceeding the field's expected range), Missing-Document (required manifest item absent), " +
      "Covenant-Breach (a §3/§10 threshold failed), Cross-Statement-Integrity (Balance Sheet does not balance, or Cash Flow does not " +
      "tie to the Balance Sheet cash balance), and Policy-Waiver (a documented exception to §4).",
  },
  {
    id: "§11.2",
    title: "Severity & confidence thresholds",
    body:
      "Extraction confidence ≥90% is High (auto-accepted, spot-checked); 60-89% is Review (must be inspected and accepted or " +
      "corrected before its gate); below 60% is Low (blocks the gate until corrected — cannot be accepted as-is). Severity is " +
      "independent of confidence: a Covenant-Breach or Cross-Statement-Integrity exception is always Critical regardless of the " +
      "underlying confidence score, because the business consequence — not the extraction quality — drives severity.",
  },
  {
    id: "§11.3",
    title: "Responsible reviewer by category",
    body:
      "OCR-Confidence, Scale-Mismatch, YoY-Outlier: Credit Analyst. Missing-Document: Credit Analyst, escalating to Credit " +
      "Administration after 2 business days unresolved. Covenant-Breach, Cross-Statement-Integrity: Risk Officer (Critical " +
      "exceptions may not be cleared by the Credit Analyst alone). Policy-Waiver: requires Credit Administration or Credit " +
      "Committee sign-off per §4 and §13.",
  },
  {
    id: "§11.4",
    title: "Escalation paths & SLA",
    body:
      "Warning-severity exceptions unresolved after 2 business days escalate to the Credit Analyst's manager. Critical-severity " +
      "exceptions unresolved after 1 business day escalate to the Risk Officer and appear on the Portfolio Sentinel Critical queue. " +
      "A written committee waiver (Gate 5 authority, §14) is required to proceed past any unresolved Critical exception without " +
      "correction. All escalations and their resolutions are appended to the case runtime log.",
  },
  {
    id: "§12",
    title: "AML / KYC — Customer Identification Program",
    body:
      "Connector Agent runs AML/KYC CIP on borrower EIN and ultimate beneficial owner SSN before memo release. " +
      "Memo §12 attestation requires analyst confirmation that bureau and sanctions screens are current within 30 days.",
  },
  {
    id: "§13",
    title: "Approval authority matrix by exposure",
    body:
      "Gate 1 (document completeness) and Gate 2 (spread sign-off, non-Critical exceptions only): Credit Analyst, any exposure. " +
      "Gate 2 with an open Critical exception, or aggregate exposure $1M-$25M: Senior Credit Analyst or Team Lead. Gate 3 (risk " +
      "assessment) and any facility $25M-$100M: Risk Officer. Gate 4 (memo coherence) mirrors the Gate 3 authority for the same " +
      "facility. Gate 5 (final decision) for exposure over $100M, any Floor Plan facility over $10M, or any facility with an " +
      "unresolved Watch-List flag: Credit Committee per §14. No individual may hold sign-off authority on a gate for a case where " +
      "they are also the named borrower relationship owner outside their analyst duties (conflict-of-interest bar).",
  },
  {
    id: "§14",
    title: "Credit committee charter (Gate 5)",
    body:
      "The Credit Committee is the final approval authority for facilities meeting the §13 threshold. Standing members: Chief " +
      "Credit Officer (chair), Head of Commercial Lending, Risk Officer assigned to the case, and one independent Committee " +
      "Member. Quorum is three members including the chair or their delegate. Decisions: Approve, Conditional Approve (with " +
      "negotiated terms), Decline, or Table (return for additional information, not a rejection). A Decline or Conditional " +
      "Approve requires a written rationale entered against Gate 5 and visible in the case runtime log. Committee decisions are " +
      "final; there is no appeal gate beyond Gate 5.",
  },
];

/** Human-readable statement name for generated clause prose. */
const STATEMENT_NAME: Record<string, string> = {
  IS: "Income Statement",
  BS: "Balance Sheet",
  CF: "Statement of Cash Flows",
  RATIO: "Ratio & Analytics",
};

function describeNode(node: TaxonomyNode): string {
  if (node.kind === "source") {
    return `${node.label} (tag ${node.tag}) is extracted directly from the borrower's ${STATEMENT_NAME[node.statement]}${node.section ? `, ${node.section} section` : ""}. It is never derived — Document Intelligence must locate a printed source cell and page for this line, or the field is left Low-confidence per §11.2.`;
  }
  return `${node.label} (tag ${node.tag}) is a calculated field and is never trusted from the printed page — the Mapping Agent computes it as: ${node.formula ?? "derived from its dependent tags"}. Any value the borrower prints for this line is used only to cross-check the agent's calculation.`;
}

/** Group taxonomy nodes by their sopRef and build one clause per unique § reference. */
function generateMappingClauses(statement: "IS" | "BS" | "CF"): SopSection[] {
  const nodes = TAXONOMY.filter((n) => n.statement === statement && n.sopRef);
  const byRef = new Map<string, TaxonomyNode[]>();
  for (const n of nodes) {
    const key = n.sopRef!;
    if (!byRef.has(key)) byRef.set(key, []);
    byRef.get(key)!.push(n);
  }
  return [...byRef.entries()]
    .sort((a, b) => sortSopId(a[0]) - sortSopId(b[0]))
    .map(([id, group]) => {
      const titles = group.map((n) => n.label).join(" / ");
      const bodies = group.map(describeNode).join(" ");
      return { id, title: `${STATEMENT_NAME[statement]} mapping — ${titles}`, body: bodies };
    });
}

function generateRatioClauses(): SopSection[] {
  const nodes = TAXONOMY.filter((n) => n.statement === "RATIO" && n.sopRef);
  const byRef = new Map<string, TaxonomyNode[]>();
  for (const n of nodes) {
    const key = n.sopRef!;
    if (!byRef.has(key)) byRef.set(key, []);
    byRef.get(key)!.push(n);
  }
  return [...byRef.entries()]
    .sort((a, b) => sortSopId(a[0]) - sortSopId(b[0]))
    .map(([id, group]) => {
      const titles = group.map((n) => n.label).join(" / ");
      const parts = group.map((n) => {
        const meta = RATIO_META[n.tag];
        const policyLine = meta ? ` Policy: ${meta.policy}.` : "";
        return `${n.label} = ${n.formula ?? "see chart of accounts"}.${policyLine}`;
      });
      return { id, title: `Ratio policy — ${titles}`, body: parts.join(" ") };
    });
}

function sortSopId(id: string): number {
  const parts = id.replace("§", "").split(".").map(Number);
  return parts[0] * 1000 + (parts[1] ?? 0);
}

const GENERATED_SOP: SopSection[] = [
  ...generateMappingClauses("IS"),
  ...generateMappingClauses("BS"),
  ...generateMappingClauses("CF"),
  ...generateRatioClauses(),
];

/** Full institution credit policy: hand-authored governance + generated chart-of-accounts / ratio clauses. */
export const CREDIT_POLICY_SOP: SopSection[] = [...GOVERNANCE_SOP, ...GENERATED_SOP];

const SOP_BY_ID: Record<string, SopSection> = Object.fromEntries(CREDIT_POLICY_SOP.map((s) => [s.id, s]));

export function getSopSection(sectionId: string): SopSection | undefined {
  const exact = SOP_BY_ID[sectionId];
  if (exact) return exact;
  const parent = sectionId.replace(/\.\d+$/, "");
  return SOP_BY_ID[parent];
}

const linkStyle: CSSProperties = {
  background: "none",
  border: "none",
  padding: 0,
  cursor: "pointer",
  fontFamily: "Inter, sans-serif",
  fontSize: "inherit",
  color: "#0a5af5",
  textDecoration: "underline",
};

export function SopLink({
  section,
  appliedTo,
  onOpen,
  testId,
}: {
  section: string;
  appliedTo?: string;
  onOpen: (section: string, appliedTo?: string) => void;
  testId?: string;
}) {
  return (
    <button
      type="button"
      data-testid={testId ?? `sop-link-${section.replace(/§/g, "")}`}
      onClick={(e) => {
        e.stopPropagation();
        onOpen(section, appliedTo);
      }}
      style={linkStyle}
    >
      {section}
    </button>
  );
}

export function renderTextWithSopLinks(
  text: string,
  onOpen: (section: string, appliedTo?: string) => void,
): ReactNode {
  const parts = text.split(/(§[\d.]+(?:\.\d+)?)/g);
  return parts.map((part, i) => {
    if (/^§[\d.]/.test(part)) {
      return <SopLink key={`${part}-${i}`} section={part} onOpen={onOpen} />;
    }
    return part;
  });
}

type FigmaTheme = { bg: { editor: string }; stroke: { secondary: string; tertiary: string }; text: { primary: string; tertiary: string } };

export function SopViewerPanel({
  open,
  section,
  appliedTo,
  onClose,
  theme,
}: {
  open: boolean;
  section: string | null;
  appliedTo?: string;
  onClose: () => void;
  theme: FigmaTheme;
}) {
  if (!open || !section) return null;
  const clause = getSopSection(section);
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        zIndex: 250,
        display: "flex",
        justifyContent: "flex-end",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 420,
          maxWidth: "100%",
          height: "100%",
          background: theme.bg.editor,
          borderLeft: `1px solid ${theme.stroke.secondary}`,
          padding: 20,
          overflow: "auto",
          boxShadow: "-4px 0 24px rgba(0,0,0,0.12)",
        }}
        onClick={(e) => e.stopPropagation()}
        data-testid="sop-viewer-panel"
      >
        <Stack gap={12}>
          <Row align="center" justify="space-between">
            <Text weight="semibold">Credit Policy / SOP</Text>
            <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18 }}>
              ×
            </button>
          </Row>
          <Text size="small" tone="tertiary">
            Uploaded institution policy · read-only
          </Text>
          {clause ? (
            <>
              <Text weight="semibold">{clause.id} — {clause.title}</Text>
              {appliedTo && (
                <Text size="small" tone="tertiary">
                  Applied to: {appliedTo}
                </Text>
              )}
              <Text size="small" tone="secondary">
                {clause.body}
              </Text>
            </>
          ) : (
            <Text size="small" tone="secondary">
              Section {section} not found in uploaded policy fixture.
            </Text>
          )}
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </Stack>
      </div>
    </div>
  );
}
