import {
  BarChart,
  Button,
  Callout,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Grid,
  H2,
  H3,
  PieChart,
  Pill,
  Row,
  Spacer,
  Stack,
  Table,
  Text,
  useCanvasState,
  useHostTheme,
} from "./ui";
import type { CSSProperties, MouseEvent, ReactNode } from "react";

/**
 * Figma BMO design tokens (Financial Spreading BMO file)
 * Mapped to useHostTheme() — Canvas forbids hardcoded hex.
 *
 * | Figma variable          | Value    | Canvas token              |
 * |-------------------------|----------|---------------------------|
 * | base/primary            | #0a5af5  | theme.accent.primary      |
 * | base/border             | #c2cad6  | theme.stroke.secondary    |
 * | base/sidebar            | #fafafa  | theme.bg.chrome           |
 * | base/sidebar-accent     | #e1e5ea  | theme.fill.secondary      |
 * | tab active underline    | #1860ec  | theme.accent.primary      |
 * | text/primary KPI        | #1a1a1a  | theme.text.primary        |
 * | text/secondary label    | 60% black| theme.text.tertiary       |
 * | border-radius/md        | 8px      | borderRadius: 8           |
 * | border-radius/xs        | 4px      | borderRadius: 4 (buttons) |
 * | button height           | 28px     | height: 28                |
 * | KPI value size          | 34px     | fontSize: 34 semibold     |
 * | paragraph/small         | 12–14px  | Text size="small"         |
 * | Left nav width          | 72px     | width: 72                 |
 * | Avatar                  | teal-600 | theme.accent.control alt  |
 */

type FigmaTheme = ReturnType<typeof useHostTheme>;

function dxpCard(theme: FigmaTheme): CSSProperties {
  return {
    background: theme.bg.editor,
    border: `1px solid ${theme.stroke.secondary}`,
    borderRadius: 8,
    padding: "12px 16px",
  };
}

function DxpLeftNav({ theme }: { theme: FigmaTheme }) {
  return (
    <div
      style={{
        width: 72,
        minWidth: 72,
        background: theme.bg.chrome,
        borderRight: `1px solid ${theme.stroke.tertiary}`,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        minHeight: 640,
      }}
    >
      <Stack gap={24} style={{ alignItems: "center", width: "100%" }}>
        <div
          style={{
            width: 32,
            height: 25,
            background: theme.fill.quaternary,
            borderRadius: 4,
          }}
        />
        <Stack gap={10} style={{ width: "100%", alignItems: "center" }}>
          {["H", "S", "Q"].map((label, i) => (
            <div
              key={label}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                color: theme.text.tertiary,
                background: i === 2 ? theme.fill.secondary : "transparent",
                borderLeft: i === 2 ? `2px solid ${theme.accent.primary}` : "none",
              }}
            >
              {label}
            </div>
          ))}
        </Stack>
      </Stack>
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 9999,
          background: theme.accent.control,
          color: theme.text.onAccent,
          fontSize: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        SW
      </div>
    </div>
  );
}

function DxpBreadcrumb({
  title,
  theme,
  caseContext,
}: {
  title: string;
  theme: FigmaTheme;
  caseContext?: string;
}) {
  return (
    <Row
      align="center"
      justify="space-between"
      style={{
        height: 48,
        padding: "0 12px",
        background: theme.bg.editor,
        border: `1px solid ${theme.stroke.secondary}`,
        borderBottom: "none",
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
      }}
    >
      <Row gap={8} align="center">
        <Text size="small" tone="secondary" as="span">
          Hub
        </Text>
        <Text size="small" tone="quaternary" as="span">
          /
        </Text>
        <Text size="small" tone="secondary" as="span">
          {title}
        </Text>
        {caseContext && (
          <>
            <Text size="small" tone="quaternary" as="span">
              /
            </Text>
            <Text size="small" weight="semibold" as="span">
              {caseContext}
            </Text>
          </>
        )}
      </Row>
      <Text size="small" tone="tertiary" as="span">
        Agent assist
      </Text>
    </Row>
  );
}

function DxpTabBar({
  tabs,
  active,
  onChange,
  theme,
  trailing,
}: {
  tabs: { id: View; label: string }[];
  active: View;
  onChange: (v: View) => void;
  theme: FigmaTheme;
  trailing?: ReactNode;
}) {
  return (
    <Row
      align="center"
      justify="space-between"
      style={{
        height: 48,
        padding: "10px 16px",
        background: theme.bg.editor,
        border: `1px solid ${theme.stroke.secondary}`,
        borderTop: "none",
      }}
    >
      <Row gap={4} align="end" style={{ height: "100%" }}>
        {tabs.map((t) => {
          const isActive = t.id === active;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange(t.id)}
              style={{
                background: "none",
                border: "none",
                borderBottom: isActive ? `2px solid ${theme.accent.primary}` : "2px solid transparent",
                padding: "4px 12px 12px",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: isActive ? 600 : 400,
                color: theme.text.primary,
                fontFamily: "Inter, sans-serif",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </Row>
      {trailing}
    </Row>
  );
}

// Figma confirmed: positive delta = #1860ec (tab-active underline / info blue), negative = #b42018
const FIGMA_DELTA_POSITIVE = "#1860ec";

function deltaColor(
  val: string,
  theme: FigmaTheme,
  trend?: "positive" | "negative"
): string {
  if (trend === "negative") return theme.diff.removedLine;
  if (trend === "positive") return FIGMA_DELTA_POSITIVE;
  if (val.startsWith("-")) return theme.diff.removedLine;
  if (val.startsWith("+")) return FIGMA_DELTA_POSITIVE;
  return theme.text.secondary;
}

function FigmaKpiCard({
  label,
  value,
  sub1,
  sub1Val,
  sub1Trend,
  sub2,
  sub2Val,
  sub2Trend,
  theme,
}: {
  label: string;
  value: string;
  sub1: string;
  sub1Val: string;
  sub1Trend?: "positive" | "negative";
  sub2?: string;
  sub2Val?: string;
  sub2Trend?: "positive" | "negative";
  theme: FigmaTheme;
}) {
  return (
    <div style={dxpCard(theme)}>
      <Stack gap={8}>
        <Text size="small" tone="tertiary">
          {label}
        </Text>
        <Text
          style={{
            fontSize: 34,
            fontWeight: 600,
            lineHeight: 1.24,
            color: theme.text.primary,
            letterSpacing: "0.25px",
          }}
        >
          {value}
        </Text>
        <Divider />
        <Row justify="space-between">
          <Text size="small" tone="tertiary">
            {sub1}
          </Text>
          <Text
            size="small"
            style={{ color: deltaColor(sub1Val, theme, sub1Trend), fontWeight: 500 }}
          >
            {sub1Val}
          </Text>
        </Row>
        {sub2 && sub2Val && (
          <Row justify="space-between">
            <Text size="small" tone="tertiary">
              {sub2}
            </Text>
            <Text
              size="small"
              style={{ color: deltaColor(sub2Val, theme, sub2Trend), fontWeight: 500 }}
            >
              {sub2Val}
            </Text>
          </Row>
        )}
      </Stack>
    </div>
  );
}

function ExtractedBadge({ theme }: { theme: FigmaTheme }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 6px",
        borderRadius: 4,
        fontSize: 12,
        fontWeight: 500,
        background: theme.fill.tertiary,
        color: theme.text.secondary,
        border: `1px solid ${theme.stroke.tertiary}`,
      }}
    >
      • Extracted
    </span>
  );
}

function FigmaConfidenceBadge({
  level,
  label,
  theme,
}: {
  level: "high" | "review" | "missing";
  label: string;
  theme: FigmaTheme;
}) {
  const styles: Record<typeof level, { bg: string; fg: string }> = {
    high: { bg: theme.fill.tertiary, fg: theme.category.green },
    review: { bg: theme.fill.tertiary, fg: theme.category.orange },
    missing: { bg: theme.fill.tertiary, fg: theme.diff.removedLine },
  };
  const s = styles[level];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "4px 8px",
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 500,
        lineHeight: "16px",
        background: s.bg,
        color: s.fg,
        border: `1px solid ${theme.stroke.tertiary}`,
      }}
    >
      {label}
    </span>
  );
}

function DxpQueueCard({
  title,
  trailing,
  children,
  theme,
  trustFooter,
  demoLabel,
}: {
  title: string;
  trailing?: ReactNode;
  children: ReactNode;
  theme: FigmaTheme;
  trustFooter?: ReactNode;
  demoLabel?: string;
}) {
  return (
    <div style={dxpCard(theme)}>
      <Stack gap={8}>
        <Row align="center" justify="space-between" wrap>
          <Stack gap={2}>
            <Text weight="semibold" size="small">
              {title}
            </Text>
            {demoLabel && (
              <Text size="small" tone="quaternary">
                {demoLabel}
              </Text>
            )}
          </Stack>
          {trailing}
        </Row>
        {children}
        {trustFooter}
      </Stack>
    </div>
  );
}

type CaseDetailTab = "extracted" | "exceptions" | "corrected";

function CaseDetailsTabBar({
  active,
  onChange,
  theme,
  counts,
}: {
  active: CaseDetailTab;
  onChange: (t: CaseDetailTab) => void;
  theme: FigmaTheme;
  counts: { extracted: number; exceptions: number; corrected: number };
}) {
  const tabs: { id: CaseDetailTab; label: string }[] = [
    { id: "extracted", label: `Extracted (${counts.extracted})` },
    { id: "exceptions", label: `Exceptions (${counts.exceptions})` },
    { id: "corrected", label: `Corrected (${counts.corrected})` },
  ];
  return (
    <Row
      gap={4}
      align="end"
      style={{
        padding: "0 16px",
        height: 48,
        flex: 1,
      }}
    >
      {tabs.map((t) => {
        const isActive = t.id === active;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            style={{
              background: "none",
              border: "none",
              borderBottom: isActive ? `2px solid #1860ec` : "2px solid transparent",
              padding: "4px 12px 12px",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: isActive ? 600 : 400,
              color: theme.text.primary,
              fontFamily: "Inter, sans-serif",
              whiteSpace: "nowrap",
            }}
          >
            {t.label}
          </button>
        );
      })}
    </Row>
  );
}

function CasePdfPane({ theme }: { theme: FigmaTheme }) {
  return (
    <Stack
      gap={0}
      style={{
        flex: "0 0 42%",
        minWidth: 280,
        border: `1px solid ${theme.stroke.secondary}`,
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      <Row
        align="center"
        justify="space-between"
        style={{
          height: 40,
          padding: "0 16px",
          borderBottom: `1px solid ${theme.stroke.tertiary}`,
          background: theme.bg.elevated,
        }}
      >
        <Text size="small" tone="tertiary">
          PDF viewer
        </Text>
        <Text size="small" tone="quaternary">
          1–1 of 1 Pages
        </Text>
      </Row>
      <div
        style={{
          flex: 1,
          minHeight: 360,
          background: theme.fill.quaternary,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
        }}
      >
        <Stack gap={8} style={{ alignItems: "center" }}>
          <Text size="small" tone="tertiary">
            Walmart Inc. — FY2025 10-K
          </Text>
          <Text size="small" tone="quaternary">
            Balance Sheet · p. 43
          </Text>
        </Stack>
      </div>
    </Stack>
  );
}

function DxpShell({
  children,
  view,
  setView,
  theme,
  caseContext,
}: {
  children: ReactNode;
  view: View;
  setView: (v: View) => void;
  theme: FigmaTheme;
  caseContext?: string;
}) {
  const tabs: { id: View; label: string }[] = [
    { id: "command", label: "Command Center" },
    { id: "portfolio", label: "Insight" },
    { id: "caselist", label: "Cases" },
    { id: "agents", label: "Agents" },
  ];
  return (
    <Row align="stretch" style={{ minHeight: 640, fontFamily: "Inter, sans-serif" }}>
      <DxpLeftNav theme={theme} />
      <Stack
        gap={0}
        style={{
          flex: 1,
          padding: "16px 12px 16px 0",
          minWidth: 0,
        }}
      >
        <DxpBreadcrumb title="Case Explorer" theme={theme} caseContext={caseContext} />
        <DxpTabBar
          tabs={tabs}
          active={view}
          onChange={setView}
          theme={theme}
          trailing={
            <Button variant="primary" style={{ height: 28, fontSize: 12, borderRadius: 4 }}>
              + Case
            </Button>
          }
        />
        <div
          style={{
            background: theme.bg.editor,
            border: `1px solid ${theme.stroke.secondary}`,
            borderTop: "none",
            borderBottomLeftRadius: 8,
            borderBottomRightRadius: 8,
            padding: 16,
            flex: 1,
          }}
        >
          {children}
        </div>
      </Stack>
    </Row>
  );
}

// ─── Agent catalog (ACOS) ───────────────────────────────────────────────────

type AgentId =
  | "orchestrator"
  | "sentinel"
  | "intake"
  | "document-intel"
  | "mapping"
  | "review"
  | "risk"
  | "memo"
  | "decision"
  | "connector";

type AgentDef = {
  id: AgentId;
  name: string;
  shortName: string;
  stage: string;
  role: string;
  trustOutputs: string[];
  humanGate?: string;
};

const AGENTS: Record<AgentId, AgentDef> = {
  orchestrator: {
    id: "orchestrator",
    name: "Case Orchestrator",
    shortName: "Orchestrator",
    stage: "All stages",
    role: "Routes cases, assigns sub-tasks, escalates exceptions",
    trustOutputs: ["Stage transition log", "SLA tracking"],
  },
  sentinel: {
    id: "sentinel",
    name: "Portfolio Sentinel",
    shortName: "Sentinel",
    stage: "Portfolio",
    role: "Scans loan book hourly; ranks covenant breaches and deteriorations",
    trustOutputs: ["Alert evidence chain", "Drill-down to case stage"],
  },
  intake: {
    id: "intake",
    name: "Intake & Completeness",
    shortName: "Intake",
    stage: "Document intake",
    role: "Validates doc set vs SOP; splits 200-page filings",
    trustOutputs: ["Missing doc checklist", "SOP § reference"],
    humanGate: "Gate 1 — Confirm document set",
  },
  "document-intel": {
    id: "document-intel",
    name: "Document Intelligence",
    shortName: "Doc Intel",
    stage: "Extraction",
    role: "OCR, SOP-driven page selection, raw field extraction",
    trustOutputs: ["Per-field confidence", "Source page ref"],
  },
  mapping: {
    id: "mapping",
    name: "Mapping & Normalization",
    shortName: "Mapping",
    stage: "Mapping",
    role: "Maps values to chart of accounts; ignores calculable totals",
    trustOutputs: ["SOP clause per mapping", "Mapping rationale"],
    humanGate: "Gate 2 — Sign off spread",
  },
  review: {
    id: "review",
    name: "Review & QA",
    shortName: "Review QA",
    stage: "Review",
    role: "Flags low-confidence cells, YoY variance, outlier patterns",
    trustOutputs: ["Exception cards", "Compare-to-prior"],
  },
  risk: {
    id: "risk",
    name: "Risk & Covenant",
    shortName: "Risk",
    stage: "Assessment",
    role: "Calculates ratios, covenant compliance, ownership risk",
    trustOutputs: ["Formula breakdown", "Peer benchmark"],
    humanGate: "Gate 3 — Risk officer review",
  },
  memo: {
    id: "memo",
    name: "Memo Composer",
    shortName: "Memo",
    stage: "Credit memo",
    role: "Drafts memo; embeds connector-sourced bureau scores, AML/KYC, and market data with source tags",
    trustOutputs: ["Source tag per paragraph", "Connector lineage in memo"],
    humanGate: "Gate 4 — Memo coherence review",
  },
  decision: {
    id: "decision",
    name: "Decision Synthesis",
    shortName: "Decision",
    stage: "Credit decision",
    role: "Aggregates spread, tri-bureau business scores, AML/KYC clearance, and qualitative risk",
    trustOutputs: ["Rationale tree", "Connector evidence bundle"],
    humanGate: "Gate 5 — Credit committee",
  },
  connector: {
    id: "connector",
    name: "Connector Sync",
    shortName: "Connector",
    stage: "Cross-cutting",
    role: "API orchestration: Experian, Equifax, D&B bureau scores; AML/KYC via EIN/SSN/ITIN; Bloomberg market data",
    trustOutputs: ["Per-connector sync status", "Entity ID + scope audit", "Records cited in memo"],
  },
};

type StageId =
  | "intake"
  | "extraction"
  | "mapping"
  | "review"
  | "assessment"
  | "memo"
  | "decision";

type ActorKind = "agent" | "human" | "system";

type StageActor = {
  kind: ActorKind;
  name: string;
  agentId?: AgentId;
  role: string;
};

type StageTrace = {
  id: StageId;
  label: string;
  status: "complete" | "active" | "pending" | "blocked";
  timestamp?: string;
  summary: string;
  actors: StageActor[];
  input: string[];
  reasoning: string[];
  output: string[];
  gate?: {
    id: string;
    label: string;
    status: "passed" | "pending" | "blocked";
    actor?: string;
    signedAt?: string;
  };
};

/** End-to-end case runtime — every stage: who acted, what went in, how they reasoned, what came out */
const WALMART_TRACES: Record<StageId, StageTrace> = {
  intake: {
    id: "intake",
    label: "Intake",
    status: "complete",
    timestamp: "Mar 16, 2:14 AM",
    summary: "9/9 documents validated per SOP §4.2",
    actors: [
      { kind: "system", name: "Case Orchestrator", role: "Opened case WMT-TLB-2025; assigned Intake queue" },
      { kind: "agent", name: "Intake & Completeness", agentId: "intake", role: "Validated document set vs SOP manifest" },
      { kind: "human", name: "Sarah W. (Credit Analyst)", role: "Signed Gate 1 — document set complete" },
    ],
    input: [
      "Uploaded package: credit application, 10-K (214 pp), covenant schedule, Q3 cash flow",
      "SOP §4.2 required-doc manifest (9 items)",
      "Prior-year spread template (FY2024 Walmart baseline)",
    ],
    reasoning: [
      "Orchestrator matched case type Term Loan B → commercial credit intake workflow",
      "Intake Agent compared received files to manifest: 9/9 present; no duplicate or wrong-entity filings",
      "10-K split into 3 statement packages (IS, BS, CF) per platform ingestion rules",
    ],
    output: [
      "Completeness checklist: 9/9 ✓",
      "Gate 1 passed — analyst sign-off logged",
      "Entity IDs captured (EIN) → Connector Agent pre-flight: bureau + AML/KYC APIs queued",
      "Document packages routed to Document Intelligence Agent",
    ],
    gate: { id: "gate-1", label: "Gate 1 — Confirm document set", status: "passed", actor: "Sarah W.", signedAt: "Mar 16, 2:18 AM" },
  },
  extraction: {
    id: "extraction",
    label: "Extraction",
    status: "complete",
    timestamp: "Mar 16, 2:22 AM",
    summary: "140 fields extracted from 10-K (pages 42, 87, 112)",
    actors: [
      { kind: "system", name: "Case Orchestrator", role: "Released extraction after Gate 1" },
      { kind: "agent", name: "Document Intelligence", agentId: "document-intel", role: "OCR + SOP page selection + field extraction" },
    ],
    input: [
      "3 statement packages from Intake stage",
      "SOP §6 page map: IS p.38, BS p.42–44, notes p.87, CF p.112",
      "FY2024 field anchors for layout validation",
    ],
    reasoning: [
      "Selected pages per SOP — ignored marketing and MD&A sections",
      "Layout model detected table structures; OCR confidence scored per cell",
      "Cross-page footnote refs linked to balance sheet line items",
    ],
    output: [
      "140 raw fields with source page + bounding region",
      "Per-field confidence: 132 high, 8 review-tier",
      "Extraction artifact v1 → Mapping Agent",
    ],
  },
  mapping: {
    id: "mapping",
    label: "Mapping",
    status: "complete",
    timestamp: "Mar 16, 2:31 AM",
    summary: "138/140 mapped; 2 calculable totals skipped per SOP",
    actors: [
      { kind: "agent", name: "Mapping & Normalization", agentId: "mapping", role: "COA mapping + SOP normalization" },
    ],
    input: [
      "140 extracted fields from Document Intelligence",
      "Institution chart of accounts (commercial credit template)",
      "SOP §7 mapping rules + FY2024 mapped spread for tie-out",
    ],
    reasoning: [
      "Mapped line items to COA; ignored 2 subtotals that SOP §7.5 marks as calculable",
      "Cross-period tie-out: revenue and equity rolls match prior spread within 0.2%",
      "Total Assets mapped from p.43 — scale read as thousands (flag deferred to Review)",
    ],
    output: [
      "138 cells populated in spread draft v1",
      "2 cells intentionally blank (calculated fields)",
      "Mapping rationale log with SOP clause per row",
    ],
  },
  review: {
    id: "review",
    label: "Review",
    status: "active",
    timestamp: "Needs you — Gate 2",
    summary: "1 outlier flagged — Total Assets $100K vs FY2024 $98B",
    actors: [
      { kind: "agent", name: "Review & QA", agentId: "review", role: "Variance + outlier detection" },
      { kind: "human", name: "Sarah W. (Credit Analyst)", role: "Resolve exception + sign Gate 2 (pending)" },
    ],
    input: [
      "Spread draft v1 from Mapping Agent (138/140 cells)",
      "FY2024 comparative spread ($98.1B Total Assets)",
      "Industry benchmark feed (peer median $120B assets)",
      "Review rules: YoY variance >15%, scale mismatch, confidence <70%",
    ],
    reasoning: [
      "YoY variance rule: Total Assets $100K vs $98.1B prior → 99.99% delta → CRITICAL",
      "Scale heuristic: value magnitude inconsistent with revenue $648B → likely K/B OCR error on p.43",
      "Pattern confidence 41%; all other cells pass review thresholds",
    ],
    output: [
      "1 exception card: Total Assets — linked to Trust Inspector",
      "Gate 2 BLOCKED — Risk Agent cannot start until spread signed",
      "Estimated analyst time: 12 min to resolve + sign",
    ],
    gate: { id: "gate-2", label: "Gate 2 — Sign off spread", status: "pending", actor: "Sarah W." },
  },
  assessment: {
    id: "assessment",
    label: "Assessment",
    status: "blocked",
    summary: "Blocked — waiting Gate 2 sign-off",
    actors: [
      { kind: "system", name: "Case Orchestrator", role: "Held stage transition — gate dependency" },
      { kind: "agent", name: "Risk & Covenant", agentId: "risk", role: "Ratio + covenant analysis (queued)" },
      { kind: "human", name: "M. Chen (Risk Officer)", role: "Gate 3 review on flagged ratios (future)" },
    ],
    input: [
      "Signed spread (not yet available — Gate 2 pending)",
      "Covenant schedule §3.1: Current Ratio >1.2x, D/E <0.55x",
      "Bloomberg peer set: Costco, Target, Kroger",
    ],
    reasoning: [
      "Orchestrator policy: no ratio calc on unsigned spread",
      "Portfolio Sentinel pre-alert: Current Ratio 0.79x on draft numbers (informational only)",
    ],
    output: [
      "Stage status: blocked",
      "Queued tasks: 14 ratios, 4 covenant tests, qualitative ownership scan",
    ],
    gate: { id: "gate-3", label: "Gate 3 — Risk officer review", status: "blocked" },
  },
  memo: {
    id: "memo",
    label: "Credit Memo",
    status: "pending",
    summary: "Connectors synced — memo draft ready after Gate 3",
    actors: [
      { kind: "agent", name: "Memo Composer", agentId: "memo", role: "Assembles narrative + connector-sourced sections" },
      {
        kind: "agent",
        name: "Connector Sync",
        agentId: "connector",
        role: "Experian + Equifax + D&B bureau APIs; AML/KYC entity screen (EIN); Bloomberg peers",
      },
      { kind: "human", name: "Sarah W. (Credit Analyst)", role: "Gate 4 coherence review (future)" },
    ],
    input: [
      "Assessment ratios + covenant results (pending Gate 2/3)",
      "Internal spread + exception resolution log",
      "Connector bundle: Experian Intelliscore 76, Equifax BFR 92, D&B PAYDEX 80",
      "AML/KYC: entity EIN screened — OFAC/sanctions clear; 2 UBO profiles (SSN) clear",
      "Bloomberg: competitor ratings + 90-day news",
    ],
    reasoning: [
      "Memo template: Term Loan B — commercial credit with mandatory external verification section",
      "Connector policy: bureau scores must be <30 days; AML/KYC must pass before memo cites compliance paragraph",
      "Memo Composer auto-inserts tagged paragraphs — each cites connector ID + pull timestamp",
    ],
    output: [
      "Memo draft v1 (preview): spread summary, tri-bureau scores, AML/KYC attestation, peer benchmarking",
      "Connector Trust Panel — 5 feeds synced, auditable entity IDs",
      "Pending: Gate 4 sign-off before Decision Agent",
    ],
    gate: { id: "gate-4", label: "Gate 4 — Memo coherence review", status: "pending" },
  },
  decision: {
    id: "decision",
    label: "Decision",
    status: "pending",
    summary: "Pending memo approval + committee",
    actors: [
      { kind: "agent", name: "Decision Synthesis", agentId: "decision", role: "Weighted rationale tree across spread + connectors" },
      { kind: "human", name: "Credit Committee", role: "Gate 5 final decision" },
    ],
    input: [
      "Approved credit memo with connector-cited sections",
      "Tri-bureau composite: Experian 76 / Equifax 92 / D&B PAYDEX 80",
      "AML/KYC clearance (entity EIN + UBO SSN screens)",
      "Covenant posture + Portfolio Sentinel context",
    ],
    reasoning: [
      "Spread quality weight 40% — 1 open exception reduces confidence tier",
      "External verification weight 35% — bureau scores above institution floor; AML/KYC green",
      "Qualitative weight 25% — ownership structure, peer benchmarks",
      "Rationale tree surfaced — not a single black-box score",
    ],
    output: [
      "Pending: Conditional Approve recommendation with connector evidence bundle attached",
      "Pending: committee sign-off + immutable audit record",
    ],
    gate: { id: "gate-5", label: "Gate 5 — Credit committee decision", status: "pending" },
  },
};

const NORTHERN_RETAIL_TRACES: Record<StageId, StageTrace> = {
  intake: {
    id: "intake",
    label: "Intake",
    status: "blocked",
    timestamp: "Blocked — Gate 1",
    summary: "2 of 9 documents received — 7 missing per SOP §4.2",
    actors: [
      { kind: "system", name: "Case Orchestrator", role: "Opened case NRTL-REV-2025; assigned Intake queue" },
      { kind: "agent", name: "Intake & Completeness", agentId: "intake", role: "Ran completeness check vs SOP manifest" },
      { kind: "human", name: "J. Martinez (Credit Analyst)", role: "Cannot sign Gate 1 — awaiting missing documents" },
    ],
    input: [
      "Received: credit application, FY2024 annual report (incomplete — missing notes)",
      "SOP §4.2 required-doc manifest (9 items for commercial revolving credit)",
      "Borrower portal upload timestamp: Mar 17, 1:42 AM",
    ],
    reasoning: [
      "Orchestrator matched case type Revolving Credit → 9-doc commercial intake manifest",
      "Intake Agent diff: 2/9 received; 7 critical gaps including Q3 cash flow and covenant schedule",
      "Policy: Gate 1 cannot pass with >0 required missing items; no analyst override without documented exception",
    ],
    output: [
      "Completeness exception (7) — case escalated to Command Center Critical queue",
      "Gate 1 BLOCKED — workflow halted before extraction",
      "Doc request package auto-generated for borrower portal",
    ],
    gate: { id: "gate-1", label: "Gate 1 — Confirm document set", status: "blocked", actor: "J. Martinez" },
  },
  extraction: {
    id: "extraction",
    label: "Extraction",
    status: "pending",
    summary: "Not started — Gate 1 blocked",
    actors: [
      { kind: "system", name: "Case Orchestrator", role: "Held stage — intake incomplete" },
      { kind: "agent", name: "Document Intelligence", agentId: "document-intel", role: "Queued (not assigned)" },
    ],
    input: ["Would require complete statement packages after Gate 1"],
    reasoning: ["Orchestrator dependency graph: Extraction requires Gate 1 passed + 9/9 manifest"],
    output: ["Stage status: pending — no OCR run"],
  },
  mapping: {
    id: "mapping",
    label: "Mapping",
    status: "pending",
    summary: "Not started",
    actors: [{ kind: "system", name: "Case Orchestrator", role: "Stage locked upstream" }],
    input: ["Would require extracted fields from Document Intelligence"],
    reasoning: ["Blocked by intake failure — no fields to map"],
    output: ["Stage status: pending"],
  },
  review: {
    id: "review",
    label: "Review",
    status: "pending",
    summary: "Not started",
    actors: [{ kind: "agent", name: "Review & QA", agentId: "review", role: "Not invoked" }],
    input: ["Would require spread draft from Mapping Agent"],
    reasoning: ["No spread artifact exists for this case"],
    output: ["Stage status: pending"],
  },
  assessment: {
    id: "assessment",
    label: "Assessment",
    status: "pending",
    summary: "Not started",
    actors: [{ kind: "agent", name: "Risk & Covenant", agentId: "risk", role: "Not invoked" }],
    input: ["Would require signed spread + covenant schedule (missing)"],
    reasoning: ["Covenant schedule is among missing intake documents"],
    output: ["Stage status: pending"],
  },
  memo: {
    id: "memo",
    label: "Credit Memo",
    status: "blocked",
    summary: "Cannot generate — Gate 1 blocked; connectors partial",
    actors: [
      { kind: "agent", name: "Connector Sync", agentId: "connector", role: "Preliminary AML on EIN only" },
      { kind: "agent", name: "Memo Composer", agentId: "memo", role: "Blocked — insufficient intake" },
    ],
    input: [
      "EIN from credit application (available)",
      "Guarantor SSN on file — KYC blocked pending docs",
      "Bureau APIs: deferred until financial package complete",
    ],
    reasoning: [
      "Memo Composer policy: no draft without Gate 1 + minimum connector bundle",
      "AML entity pre-screen allowed on partial intake — flagged as preliminary only",
    ],
    output: [
      "Connector Trust Panel: 1 synced, 2 pending, 1 blocked",
      "Memo: not generated — see blocked status",
    ],
  },
  decision: {
    id: "decision",
    label: "Decision",
    status: "pending",
    summary: "Not started",
    actors: [{ kind: "agent", name: "Decision Synthesis", agentId: "decision", role: "Not invoked" }],
    input: ["Would require approved memo"],
    reasoning: ["Case cannot reach decision without complete spread pipeline"],
    output: ["Stage status: pending"],
  },
};

type RuntimeLogEntry = {
  time: string;
  stage: string;
  actorKind: ActorKind;
  actor: string;
  input: string;
  reasoning: string;
  output: string;
};

const WALMART_RUNTIME_LOG: RuntimeLogEntry[] = [
  {
    time: "Mar 16, 2:10 AM",
    stage: "Orchestration",
    actorKind: "system",
    actor: "Case Orchestrator",
    input: "New case WMT-TLB-2025 from origination queue",
    reasoning: "Case type Term Loan B → standard commercial workflow",
    output: "Case opened; Intake Agent assigned",
  },
  {
    time: "Mar 16, 2:14 AM",
    stage: "Intake",
    actorKind: "agent",
    actor: "Intake Agent",
    input: "9-doc package + SOP §4.2 manifest",
    reasoning: "All required docs present; 10-K split into 3 packages",
    output: "Completeness 9/9; routed to extraction",
  },
  {
    time: "Mar 16, 2:18 AM",
    stage: "Intake",
    actorKind: "human",
    actor: "Sarah W.",
    input: "Intake Agent checklist",
    reasoning: "Visual confirm — correct entity, correct fiscal year",
    output: "Gate 1 signed",
  },
  {
    time: "Mar 16, 2:18 AM",
    stage: "Connectors",
    actorKind: "agent",
    actor: "Connector Sync",
    input: "EIN from credit application · UBO roster (2 SSN)",
    reasoning: "Parallel API pull: Experian Business, Equifax Business, D&B, AML/KYC entity + UBO",
    output: "5 connector feeds synced — eligible for memo insertion",
  },
  {
    time: "Mar 16, 2:22 AM",
    stage: "Extraction",
    actorKind: "agent",
    actor: "Doc Intel",
    input: "Statement packages + SOP §6 page map",
    reasoning: "OCR + layout on pages 38, 42–44, 87, 112",
    output: "140 fields extracted",
  },
  {
    time: "Mar 16, 2:31 AM",
    stage: "Mapping",
    actorKind: "agent",
    actor: "Mapping Agent",
    input: "140 fields + COA + SOP §7",
    reasoning: "Mapped 138; skipped 2 calculable totals",
    output: "Spread draft v1",
  },
  {
    time: "Mar 16, 2:33 AM",
    stage: "Review",
    actorKind: "agent",
    actor: "Review QA",
    input: "Spread v1 + FY2024 + benchmarks",
    reasoning: "Total Assets scale mismatch; YoY 99.99% delta",
    output: "1 exception; Gate 2 blocked",
  },
  {
    time: "Mar 16, 6:00 AM",
    stage: "Portfolio",
    actorKind: "agent",
    actor: "Portfolio Sentinel",
    input: "Overnight book scan + draft spread ratios",
    reasoning: "Current Ratio 0.79x < covenant 1.2x",
    output: "Critical alert → Command Center",
  },
];

const NORTHERN_RETAIL_RUNTIME_LOG: RuntimeLogEntry[] = [
  {
    time: "Mar 17, 1:40 AM",
    stage: "Orchestration",
    actorKind: "system",
    actor: "Case Orchestrator",
    input: "New case NRTL-REV-2025 from borrower portal",
    reasoning: "Case type Revolving Credit → commercial intake workflow",
    output: "Case opened; Intake Agent assigned",
  },
  {
    time: "Mar 17, 1:42 AM",
    stage: "Intake",
    actorKind: "agent",
    actor: "Intake Agent",
    input: "2 uploaded files + SOP §4.2 manifest (9 items)",
    reasoning: "Diff vs manifest: 7 required documents missing",
    output: "Completeness 2/9; Gate 1 blocked",
  },
  {
    time: "Mar 17, 1:43 AM",
    stage: "Intake",
    actorKind: "system",
    actor: "Case Orchestrator",
    input: "Gate 1 blocked event",
    reasoning: "Policy: halt pipeline on incomplete doc set",
    output: "Extraction–Decision stages held; escalated to Critical queue",
  },
  {
    time: "Mar 17, 1:44 AM",
    stage: "Intake",
    actorKind: "agent",
    actor: "Intake Agent",
    input: "Missing doc list",
    reasoning: "Auto-generate borrower request per SOP §4.2 template",
    output: "7-item doc request sent to portal",
  },
  {
    time: "Mar 17, 1:43 AM",
    stage: "Connectors",
    actorKind: "agent",
    actor: "Connector Sync",
    input: "EIN from credit application",
    reasoning: "Partial intake — preliminary AML entity screen only; bureau + SSN KYC deferred",
    output: "AML entity CLEAR (preliminary); Experian/Equifax pending; guarantor KYC blocked",
  },
  {
    time: "Mar 17, 6:00 AM",
    stage: "Command Center",
    actorKind: "system",
    actor: "Case Orchestrator",
    input: "Overnight blocked-case scan",
    reasoning: "Northern Retail SLA 4h on Gate 1 resolution",
    output: "Surfaced in Critical — agent blocked column",
  },
];

type MappingRow = {
  field: string;
  value: string;
  confidence: "high" | "review" | "missing";
  agentId: AgentId;
  sop?: string;
  source?: string;
  reasoning?: string;
  auditId?: string;
};

const MAPPING_DATA: MappingRow[] = [
  {
    field: "Cash & Equivalents",
    value: "$9,857M",
    confidence: "high",
    agentId: "mapping",
    sop: "§7.1",
    source: "10-K p.42",
    reasoning: "Mapped per COA template; OCR confidence 98%; ties to FY2024 within 0.1%.",
    auditId: "trace-8840-wmt-cash",
  },
  {
    field: "Accounts Receivable",
    value: "$6,210M",
    confidence: "high",
    agentId: "mapping",
    sop: "§7.2",
    source: "10-K p.42",
    reasoning: "Line item matched to trade receivables note; no YoY variance flag.",
    auditId: "trace-8841-wmt-ar",
  },
  {
    field: "Total Assets",
    value: "$100K",
    confidence: "review",
    agentId: "review",
    sop: "§7.4",
    source: "10-K p.43",
    reasoning:
      "FY2024 Total Assets was $98.1B. Industry median $120B. OCR may have misread scale (K vs B). Pattern match confidence 41%.",
    auditId: "trace-8842-wmt-assets",
  },
  {
    field: "Long-term Debt",
    value: "$35,420M",
    confidence: "high",
    agentId: "mapping",
    sop: "§8.1",
    source: "10-K p.44",
    reasoning: "Debt schedule footnote cross-validated; covenant schedule §3.1 consistent.",
    auditId: "trace-8843-wmt-debt",
  },
  {
    field: "Shareholders Equity",
    value: "$14,850M",
    confidence: "high",
    agentId: "mapping",
    sop: "§8.3",
    source: "10-K p.44",
    reasoning: "Equity roll matches prior spread; no review threshold triggered.",
    auditId: "trace-8844-wmt-equity",
  },
  {
    field: "Revenue",
    value: "$648,125M",
    confidence: "high",
    agentId: "mapping",
    sop: "§5.1",
    source: "10-K p.38",
    reasoning: "Income statement top-line; segment note tie-out within tolerance.",
    auditId: "trace-8845-wmt-rev",
  },
];

type CaseId = "walmart" | "northern-retail";

type IntakeDocRow = { name: string; received: boolean; sopRef: string };

type EntityIdType = "EIN" | "SSN" | "ITIN" | "DUNS";

type ConnectorFeed = {
  id: string;
  provider: string;
  api: string;
  entityIdType: EntityIdType;
  entityIdMasked: string;
  status: "synced" | "stale" | "pending" | "blocked";
  syncedAt: string;
  result: string;
  memoSection: string;
};

type MemoSection = {
  title: string;
  body: string;
  source: string;
  connectorRef: string;
};

const WALMART_CONNECTORS: ConnectorFeed[] = [
  {
    id: "exp",
    provider: "Experian",
    api: "Experian Business API · Intelliscore Plus",
    entityIdType: "EIN",
    entityIdMasked: "71-0415•••",
    status: "synced",
    syncedAt: "Mar 16, 2:18 AM",
    result: "Intelliscore Plus: 76 / 100 — Low–medium business risk",
    memoSection: "External credit verification",
  },
  {
    id: "efx",
    provider: "Equifax",
    api: "Equifax Business API · Business Failure Risk Score",
    entityIdType: "EIN",
    entityIdMasked: "71-0415•••",
    status: "synced",
    syncedAt: "Mar 16, 2:18 AM",
    result: "BFR Score: 92 — Low delinquency probability (1–100 scale)",
    memoSection: "External credit verification",
  },
  {
    id: "dnb",
    provider: "Dun & Bradstreet",
    api: "D&B Direct API · PAYDEX + DUNS lookup",
    entityIdType: "DUNS",
    entityIdMasked: "05-907-••••",
    status: "synced",
    syncedAt: "Mar 16, 2:19 AM",
    result: "PAYDEX: 80 · Payment performance above industry median",
    memoSection: "External credit verification",
  },
  {
    id: "aml",
    provider: "AML/KYC Provider",
    api: "Entity screening API · OFAC / PEP / sanctions",
    entityIdType: "EIN",
    entityIdMasked: "71-0415•••",
    status: "synced",
    syncedAt: "Mar 16, 2:18 AM",
    result: "Entity: CLEAR · OFAC/sanctions: no match · Adverse media: none material",
    memoSection: "AML / KYC compliance",
  },
  {
    id: "ubo",
    provider: "AML/KYC Provider",
    api: "Beneficial ownership API · UBO identity verification",
    entityIdType: "SSN",
    entityIdMasked: "•••-••-4521 (2 UBO profiles)",
    status: "synced",
    syncedAt: "Mar 16, 2:19 AM",
    result: "2 UBO profiles screened — SSN match, PEP/sanctions clear",
    memoSection: "AML / KYC compliance",
  },
  {
    id: "bbg",
    provider: "Bloomberg",
    api: "Bloomberg API · peer ratings + news",
    entityIdType: "EIN",
    entityIdMasked: "71-0415•••",
    status: "synced",
    syncedAt: "Mar 16, 11:42 PM",
    result: "Costco AA / Target A · 3 material headlines (90d)",
    memoSection: "Competitive benchmarking",
  },
];

const WALMART_MEMO_SECTIONS: MemoSection[] = [
  {
    title: "1. Borrower summary",
    body: "Walmart Inc. — Term Loan B request $2.5B. Spread draft reflects FY2025 10-K; 1 mapping exception under review.",
    source: "Internal spread + Mapping Agent",
    connectorRef: "—",
  },
  {
    title: "2. External credit verification",
    body: "Experian Intelliscore Plus 76/100. Equifax Business Failure Risk Score 92 (low risk). D&B PAYDEX 80 — payment behavior above peer median.",
    source: "Experian Business API · Equifax Business API · D&B Direct API",
    connectorRef: "connector-exp, connector-efx, connector-dnb",
  },
  {
    title: "3. AML / KYC compliance",
    body: "Entity screened on EIN — OFAC/sanctions clear, no material adverse media. Beneficial ownership: 2 UBO profiles verified via SSN — PEP/sanctions clear. CIP requirements satisfied per policy §12.",
    source: "AML/KYC Entity + UBO APIs",
    connectorRef: "connector-aml, connector-ubo",
  },
  {
    title: "4. Competitive benchmarking",
    body: "Costco bond rating AA; Target A. Revenue scale and liquidity profile position borrower at top of peer set.",
    source: "Bloomberg API",
    connectorRef: "connector-bbg",
  },
  {
    title: "5. Recommendation (draft)",
    body: "Conditional approval pending resolution of Total Assets mapping exception and Gate 2 spread sign-off.",
    source: "Memo Composer Agent",
    connectorRef: "—",
  },
];

const NORTHERN_RETAIL_CONNECTORS: ConnectorFeed[] = [
  {
    id: "exp",
    provider: "Experian",
    api: "Experian Business API · Intelliscore Plus",
    entityIdType: "EIN",
    entityIdMasked: "84-2931•••",
    status: "pending",
    syncedAt: "—",
    result: "Awaiting complete financials — score pull deferred",
    memoSection: "External credit verification",
  },
  {
    id: "efx",
    provider: "Equifax",
    api: "Equifax Business API",
    entityIdType: "EIN",
    entityIdMasked: "84-2931•••",
    status: "pending",
    syncedAt: "—",
    result: "Queued — intake incomplete",
    memoSection: "External credit verification",
  },
  {
    id: "aml",
    provider: "AML/KYC Provider",
    api: "Entity screening API",
    entityIdType: "EIN",
    entityIdMasked: "84-2931•••",
    status: "synced",
    syncedAt: "Mar 17, 1:43 AM",
    result: "Preliminary entity screen: CLEAR (limited — partial doc set)",
    memoSection: "AML / KYC compliance",
  },
  {
    id: "guar",
    provider: "AML/KYC Provider",
    api: "Guarantor identity verification API",
    entityIdType: "SSN",
    entityIdMasked: "•••-••-8834 (principal guarantor)",
    status: "blocked",
    syncedAt: "—",
    result: "Blocked — missing management representation + guarantor financials",
    memoSection: "AML / KYC compliance",
  },
];

const NORTHERN_RETAIL_MEMO_SECTIONS: MemoSection[] = [
  {
    title: "Memo status",
    body: "Credit memo cannot be generated — Gate 1 blocked. Connector Agent ran preliminary AML entity screen on EIN from credit application; full bureau pull and guarantor SSN KYC require complete intake.",
    source: "Connector Sync Agent",
    connectorRef: "connector-aml (partial)",
  },
];

type AuditEvent = RuntimeLogEntry & { id: string; caseId: CaseId };

type CaseDefinition = {
  id: CaseId;
  title: string;
  caseRef: string;
  orchestratorStatus: string;
  gateLabel: string;
  gateTone: "success" | "warning" | "deleted" | "info" | "neutral";
  briefingTitle: string;
  briefingBody: string;
  nextBestAction: string;
  primaryCta: string;
  defaultStage: StageId;
  trustScore: string;
  openExceptions: number;
  agentTimeSaved: string;
  traces: Record<StageId, StageTrace>;
  runtimeLog: RuntimeLogEntry[];
  mappingData: MappingRow[];
  intakeDocs: IntakeDocRow[];
  connectorFeeds: ConnectorFeed[];
  memoSections: MemoSection[];
  entitySummary: string;
};

const CASES: Record<CaseId, CaseDefinition> = {
  walmart: {
    id: "walmart",
    title: "Walmart Inc. Spread",
    caseRef: "WMT-TLB-2025",
    orchestratorStatus: "Review stage active · Gate 2 blocking Assessment",
    gateLabel: "Gate 2 pending",
    gateTone: "warning",
    briefingTitle: "Agent briefing",
    briefingBody:
      "Mapping Agent completed 138/140 fields in 9 min. Review Agent flagged 1 outlier. Estimated review: 12 min. Agents saved ~2.5 days vs manual spread.",
    nextBestAction: "Resolve Total Assets outlier, then sign Gate 2 to release Risk Agent",
    primaryCta: "Start review",
    defaultStage: "review",
    trustScore: "94%",
    openExceptions: 1,
    agentTimeSaved: "~2.5 days",
    traces: WALMART_TRACES,
    runtimeLog: WALMART_RUNTIME_LOG,
    mappingData: MAPPING_DATA,
    intakeDocs: [
      { name: "10-K Annual Filing", received: true, sopRef: "§4.2.1" },
      { name: "Credit Application", received: true, sopRef: "§4.2.2" },
      { name: "Q3 Cash Flow Stmt", received: true, sopRef: "§4.2.3" },
      { name: "Covenant Schedule", received: true, sopRef: "§4.2.4" },
      { name: "Auditor Letter", received: true, sopRef: "§4.2.5" },
      { name: "Management Representation", received: true, sopRef: "§4.2.6" },
      { name: "Intercompany Schedule", received: true, sopRef: "§4.2.7" },
      { name: "Guarantor Financials", received: true, sopRef: "§4.2.8" },
      { name: "Collateral Appraisal", received: true, sopRef: "§4.2.9" },
    ],
    connectorFeeds: WALMART_CONNECTORS,
    memoSections: WALMART_MEMO_SECTIONS,
    entitySummary: "Entity: Walmart Inc. · EIN 71-0415188 · DUNS on file · 2 UBO profiles (SSN screened)",
  },
  "northern-retail": {
    id: "northern-retail",
    title: "Northern Retail LLC",
    caseRef: "NRTL-REV-2025",
    orchestratorStatus: "Intake blocked · Gate 1 holding entire pipeline",
    gateLabel: "Gate 1 blocked",
    gateTone: "deleted",
    briefingTitle: "Intake Agent blocked",
    briefingBody:
      "2 of 9 documents received. Missing Q3 cash flow, covenant schedule, and 5 more per SOP §4.2. Doc request sent to borrower portal. SLA: 4 hours to resolve.",
    nextBestAction: "Request missing documents from borrower or document exception override with reason",
    primaryCta: "Resolve completeness",
    defaultStage: "intake",
    trustScore: "N/A",
    openExceptions: 7,
    agentTimeSaved: "—",
    traces: NORTHERN_RETAIL_TRACES,
    runtimeLog: NORTHERN_RETAIL_RUNTIME_LOG,
    mappingData: [],
    intakeDocs: [
      { name: "Credit Application", received: true, sopRef: "§4.2.2" },
      { name: "FY2024 Annual Report", received: true, sopRef: "§4.2.1" },
      { name: "Q3 Cash Flow Statement", received: false, sopRef: "§4.2.3" },
      { name: "Covenant Schedule", received: false, sopRef: "§4.2.4" },
      { name: "Auditor Letter", received: false, sopRef: "§4.2.5" },
      { name: "Management Representation", received: false, sopRef: "§4.2.6" },
      { name: "Intercompany Schedule", received: false, sopRef: "§4.2.7" },
      { name: "Guarantor Financials", received: false, sopRef: "§4.2.8" },
      { name: "Collateral Appraisal", received: false, sopRef: "§4.2.9" },
    ],
    connectorFeeds: NORTHERN_RETAIL_CONNECTORS,
    memoSections: NORTHERN_RETAIL_MEMO_SECTIONS,
    entitySummary: "Entity: Northern Retail LLC · EIN 84-2931847 · Guarantor SSN on file · KYC partial",
  },
};

type View = "command" | "portfolio" | "caselist" | "case" | "agents";

// ─── Case list data ──────────────────────────────────────────────────────────

type RiskStatus = "Low Risk" | "Moderate Risk" | "High Risk";
type CaseRowData = {
  id: string;
  entity: string;
  triggerType: string;
  extractionConf: number;
  exposure: string;
  netMarginPct: string;
  healthScore: number;
  riskStatus: RiskStatus;
  primaryConcern: string;
  tasks: number;
  action: "Negotiate" | "Resolve" | "Review";
  aiBlurb: string;
};

const CASE_ROWS: CaseRowData[] = [
  {
    id: "WMT-001",
    entity: "Walmart Inc.",
    triggerType: "New Loan",
    extractionConf: 78,
    exposure: "$2.0B",
    netMarginPct: "-8.54%",
    healthScore: 7.2,
    riskStatus: "Low Risk",
    primaryConcern: "None (Performing)",
    tasks: 1,
    action: "Negotiate",
    aiBlurb:
      "The primary risks are the increasing reliance on debt and the slight decline in liquidity. Mapping exception on Total Assets flagged — requires analyst confirmation before Gate 2.",
  },
  {
    id: "AWM-002",
    entity: "AutoWest Motors",
    triggerType: "Covenant Breach",
    extractionConf: 68,
    exposure: "$12.4M",
    netMarginPct: "-12.20%",
    healthScore: 2.1,
    riskStatus: "High Risk",
    primaryConcern: "Debt Service Failure",
    tasks: 3,
    action: "Resolve",
    aiBlurb:
      "DSCR < 1.10x detected: Operational expenses increased 12% YoY, causing a breach in the primary debt service covenant. Immediate restructuring conversation required.",
  },
  {
    id: "TRC-003",
    entity: "Tesla Rental Corp",
    triggerType: "Monthly Review",
    extractionConf: 76,
    exposure: "$32.0M",
    netMarginPct: "-5.20%",
    healthScore: 4.2,
    riskStatus: "High Risk",
    primaryConcern: "EV Residual Values",
    tasks: 1,
    action: "Resolve",
    aiBlurb:
      "Liquidity Compression: Current ratio fell to 0.85x as used EV market volatility forced a $25M write-down on fleet residual values.",
  },
  {
    id: "VNT-004",
    entity: "Vantage Rental",
    triggerType: "Cov. Breach",
    extractionConf: 65,
    exposure: "$2.8M",
    netMarginPct: "-9.40%",
    healthScore: 1.9,
    riskStatus: "High Risk",
    primaryConcern: "Technical Default",
    tasks: 1,
    action: "Review",
    aiBlurb:
      "Variance Detected: A $120M discrepancy identified between the Statement of Cash Flows and the Balance Sheet. Technical default risk if not resolved within 30 days.",
  },
  {
    id: "HRZ-005",
    entity: "Hertz Global",
    triggerType: "Annual Review",
    extractionConf: 91,
    exposure: "$420.0M",
    netMarginPct: "-3.10%",
    healthScore: 5.8,
    riskStatus: "Moderate Risk",
    primaryConcern: "Fleet Optimization",
    tasks: 5,
    action: "Review",
    aiBlurb: "Moderate risk — fleet utilization tracking below 80% benchmark. Review covenant §3.4 headroom.",
  },
  {
    id: "MBE-006",
    entity: "Mercedes Benz",
    triggerType: "Monthly Review",
    extractionConf: 92,
    exposure: "$8.2M",
    netMarginPct: "4.20%",
    healthScore: 6.1,
    riskStatus: "Moderate Risk",
    primaryConcern: "Liquidity Compression",
    tasks: 1,
    action: "Review",
    aiBlurb: "Stable but liquidity tightening — operating cash flow coverage at 1.05x vs minimum 1.2x.",
  },
  {
    id: "SXT-007",
    entity: "Sixt SE (US Ops)",
    triggerType: "Annual Review",
    extractionConf: 88,
    exposure: "$115.0M",
    netMarginPct: "2.10%",
    healthScore: 6.4,
    riskStatus: "Moderate Risk",
    primaryConcern: "Rapid Fleet Growth",
    tasks: 1,
    action: "Review",
    aiBlurb: "Fleet expansion outpacing financing capacity. D/E approaching covenant ceiling at 3.1x.",
  },
  {
    id: "CHY-008",
    entity: "Coastal Hyundai",
    triggerType: "New Loan",
    extractionConf: 95,
    exposure: "$15.5M",
    netMarginPct: "3.80%",
    healthScore: 7.2,
    riskStatus: "Low Risk",
    primaryConcern: "None (Performing)",
    tasks: 0,
    action: "Review",
    aiBlurb: "Clean financials — all ratios within covenant bounds. New loan request eligible for fast-track.",
  },
];

// ─── Ratio / Validate data ────────────────────────────────────────────────────

type RatioTab = "summary" | "liquidity" | "profitability" | "solvency";

type RatioCardData = {
  label: string;
  actual: number;
  threshold: number;
  unit: string;
  status: "pass" | "warn" | "fail";
  explanation: string;
  trend2025: number[];
  trend2024: number[];
  trendLabel: string;
  trendChange: string;
  trendChangeTone: "positive" | "negative";
};

const RATIO_DATA: Record<Exclude<RatioTab, "summary">, RatioCardData[]> = {
  liquidity: [
    {
      label: "Current Ratio",
      actual: 0.82,
      threshold: 0.79,
      unit: "x",
      status: "warn",
      explanation:
        "The company's ability to meet its short-term obligations has slightly decreased, reflecting tighter near-term liquidity.",
      trend2025: [0.7, 0.72, 0.74, 0.73, 0.75, 0.76, 0.78, 0.82],
      trend2024: [0.68, 0.71, 0.73, 0.72, 0.74, 0.75, 0.77, 0.79],
      trendLabel: "0.2",
      trendChange: "0%",
      trendChangeTone: "negative",
    },
    {
      label: "Quick Ratio",
      actual: 0.2,
      threshold: 0.2,
      unit: "x",
      status: "pass",
      explanation:
        "The company's ability to meet its most immediate obligations without relying on inventory remains stable.",
      trend2025: [0.18, 0.19, 0.2, 0.19, 0.2, 0.21, 0.2, 0.2],
      trend2024: [0.17, 0.18, 0.19, 0.18, 0.19, 0.2, 0.19, 0.2],
      trendLabel: "0.2",
      trendChange: "0%",
      trendChangeTone: "positive",
    },
    {
      label: "Oper. CF Ratio",
      actual: 0.38,
      threshold: 0.39,
      unit: "x",
      status: "warn",
      explanation:
        "The company's ability to cover its current liabilities with the cash it generates from operations is slightly below threshold.",
      trend2025: [0.36, 0.37, 0.38, 0.38, 0.37, 0.38, 0.39, 0.38],
      trend2024: [0.35, 0.36, 0.37, 0.37, 0.38, 0.39, 0.38, 0.39],
      trendLabel: "0.38",
      trendChange: "-3%",
      trendChangeTone: "negative",
    },
  ],
  profitability: [
    {
      label: "Net Profit Margin",
      actual: 0.2,
      threshold: 0.2,
      unit: "%",
      status: "pass",
      explanation:
        "The company's ability to convert revenue into profit has improved, which is a positive indicator of operational efficiency.",
      trend2025: [0.05, 0.08, 0.05, 0.07, 0.08, 0.1, 0.09, 0.2],
      trend2024: [0.04, 0.06, 0.04, 0.06, 0.07, 0.08, 0.08, 0.17],
      trendLabel: "-8.5%",
      trendChange: "-4%",
      trendChangeTone: "negative",
    },
    {
      label: "ROA",
      actual: 0.08,
      threshold: 0.08,
      unit: "x",
      status: "pass",
      explanation:
        "The company's efficiency in using its assets to generate earnings has remained stable.",
      trend2025: [0.06, 0.07, 0.06, 0.07, 0.08, 0.09, 0.08, 0.08],
      trend2024: [0.06, 0.07, 0.06, 0.07, 0.08, 0.08, 0.08, 0.08],
      trendLabel: "0.08",
      trendChange: "0%",
      trendChangeTone: "positive",
    },
    {
      label: "EBIT Margin",
      actual: 0,
      threshold: 0,
      unit: "%",
      status: "warn",
      explanation:
        "Data not available to assess the trend in earnings before interest and taxes.",
      trend2025: [],
      trend2024: [],
      trendLabel: "N/A",
      trendChange: "N/A",
      trendChangeTone: "negative",
    },
  ],
  solvency: [
    {
      label: "D/E Ratio",
      actual: 0.46,
      threshold: 0.55,
      unit: "x",
      status: "pass",
      explanation: "Debt-to-equity is within covenant ceiling of 0.55x. Headroom of 0.09x.",
      trend2025: [0.44, 0.44, 0.45, 0.45, 0.45, 0.46, 0.46, 0.46],
      trend2024: [0.42, 0.43, 0.43, 0.44, 0.44, 0.44, 0.45, 0.44],
      trendLabel: "0.46",
      trendChange: "+5%",
      trendChangeTone: "negative",
    },
    {
      label: "Interest Coverage",
      actual: 2.73,
      threshold: 1.5,
      unit: "x",
      status: "pass",
      explanation: "Interest coverage is improving and comfortably above the 1.5x minimum.",
      trend2025: [2.2, 2.3, 2.4, 2.5, 2.55, 2.6, 2.68, 2.73],
      trend2024: [2.0, 2.1, 2.2, 2.25, 2.3, 2.35, 2.4, 2.42],
      trendLabel: "2.73",
      trendChange: "+13%",
      trendChangeTone: "positive",
    },
  ],
};

const SUMMARY_METRICS = [
  { label: "Revenues", fy2025: "$680,985,000,000", fy2026: "$713,163,000,000", change: "+$32,178,000,000" },
  { label: "EBITDA", fy2025: "N/A", fy2026: "N/A", change: "N/A" },
  { label: "Net Income", fy2025: "$20,157,000,000", fy2026: "$22,270,000,000", change: "+$2,113,000,000" },
  { label: "Total Assets", fy2025: "$260,823,000,000", fy2026: "$284,668,000,000", change: "+$23,845,000,000" },
  { label: "Total Debt", fy2025: "N/A", fy2026: "N/A", change: "N/A" },
  { label: "Cash & Equiv", fy2025: "N/A", fy2026: "N/A", change: "N/A" },
  { label: "Oper. Cash Flow", fy2025: "N/A", fy2026: "N/A", change: "N/A" },
];

function confidencePill(c: MappingRow["confidence"]) {
  if (c === "high") return { label: "High 98%", tone: "success" as const };
  if (c === "review") return { label: "Review 41%", tone: "warning" as const };
  return { label: "Missing", tone: "deleted" as const };
}

function AgentTag({ agentId, theme }: { agentId: AgentId; theme: ReturnType<typeof useHostTheme> }) {
  const a = AGENTS[agentId];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px",
        borderRadius: 4,
        background: theme.fill.tertiary,
        border: `1px solid ${theme.stroke.secondary}`,
        fontSize: 11,
        color: theme.text.secondary,
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: theme.accent.primary }} />
      {a.shortName}
    </span>
  );
}

function QueueTrustFooter({
  gate,
  reviewMin,
  stageLabel,
  theme,
  onViewStage,
}: {
  gate: string;
  reviewMin: string;
  stageLabel: string;
  theme: FigmaTheme;
  onViewStage?: () => void;
}) {
  return (
    <Row
      align="center"
      justify="space-between"
      style={{
        marginTop: 4,
        paddingTop: 8,
        borderTop: `1px solid ${theme.stroke.tertiary}`,
      }}
    >
      <Text size="small" tone="quaternary">
        Agent trace · {gate} · Est. {reviewMin} review
      </Text>
      {onViewStage && (
        <Button variant="ghost" onClick={onViewStage} style={{ fontSize: 11, height: 24 }}>
          View {stageLabel} →
        </Button>
      )}
    </Row>
  );
}

function CaseTrustStrip({ caseDef, auditCount, theme }: { caseDef: CaseDefinition; auditCount: number; theme: FigmaTheme }) {
  const eventCount = caseDef.runtimeLog.length + auditCount;
  return (
    <div
      style={{
        ...dxpCard(theme),
        padding: "10px 16px",
        background: theme.bg.elevated,
      }}
    >
      <Row gap={16} wrap align="center">
        <Stack gap={2}>
          <Text size="small" tone="tertiary">
            Trust score
          </Text>
          <Text weight="semibold" size="small">
            {caseDef.trustScore}
          </Text>
        </Stack>
        <Stack gap={2}>
          <Text size="small" tone="tertiary">
            Open exceptions
          </Text>
          <Text weight="semibold" size="small">
            {caseDef.openExceptions}
          </Text>
        </Stack>
        <Stack gap={2}>
          <Text size="small" tone="tertiary">
            Human gate
          </Text>
          <Pill tone={caseDef.gateTone}>{caseDef.gateLabel}</Pill>
        </Stack>
        <Stack gap={2}>
          <Text size="small" tone="tertiary">
            Agent time saved
          </Text>
          <Text weight="semibold" size="small">
            {caseDef.agentTimeSaved}
          </Text>
        </Stack>
        <Stack gap={2}>
          <Text size="small" tone="tertiary">
            Audit events
          </Text>
          <Text weight="semibold" size="small">
            {eventCount}
          </Text>
        </Stack>
      </Row>
    </div>
  );
}

type GateAction =
  | { kind: "gate2-sign" }
  | { kind: "gate3-sign" }
  | { kind: "gate4-sign" }
  | { kind: "mapping-accept"; field: string }
  | { kind: "mapping-override"; field: string }
  | { kind: "intake-override" };

function GateSignOffBar({
  mode,
  theme: _theme,
  onAction,
  disabled,
}: {
  mode: GateAction["kind"];
  theme: FigmaTheme;
  onAction: (action: GateAction) => void;
  disabled?: boolean;
}) {
  if (mode === "gate2-sign") {
    return (
      <Row gap={8} wrap>
        <Button variant="primary" disabled={disabled} onClick={() => onAction({ kind: "gate2-sign" })}>
          Sign Gate 2 — Approve spread
        </Button>
        <Button variant="ghost" disabled={disabled} onClick={() => onAction({ kind: "mapping-override", field: "spread" })}>
          Override with reason (logged)
        </Button>
      </Row>
    );
  }
  if (mode === "gate3-sign") {
    return (
      <Row gap={8} wrap>
        <Button variant="primary" disabled={disabled} onClick={() => onAction({ kind: "gate3-sign" })}>
          Sign Gate 3 — Approve risk assessment
        </Button>
        <Button variant="ghost" disabled={disabled} onClick={() => onAction({ kind: "mapping-override", field: "risk-assessment" })}>
          Request revisions (logged)
        </Button>
      </Row>
    );
  }
  if (mode === "gate4-sign") {
    return (
      <Row gap={8} wrap>
        <Button variant="primary" disabled={disabled} onClick={() => onAction({ kind: "gate4-sign" })}>
          Sign Gate 4 — Approve memo
        </Button>
        <Button variant="ghost" disabled={disabled} onClick={() => onAction({ kind: "mapping-override", field: "memo" })}>
          Request revisions (logged)
        </Button>
      </Row>
    );
  }
  if (mode === "intake-override") {
    return (
      <Row gap={8} wrap>
        <Button variant="primary">Send doc request reminder</Button>
        <Button variant="ghost" onClick={() => onAction({ kind: "intake-override" })}>
          Override with reason (logged)
        </Button>
      </Row>
    );
  }
  return null;
}

function RiskFormulaPanel({ theme }: { theme: FigmaTheme }) {
  const rows = [
    { ratio: "Current Ratio", formula: "Current Assets / Current Liabilities", status: "Preview — Gate 2 blocked", tone: "warning" as const },
    { ratio: "Debt / Equity", formula: "Total Debt / Shareholders Equity", status: "Preview — Gate 2 blocked", tone: "warning" as const },
    { ratio: "DSCR", formula: "EBITDA / Debt Service", status: "Queued", tone: "neutral" as const },
  ];
  return (
    <div style={dxpCard(theme)}>
      <Stack gap={12}>
        <Row align="center" justify="space-between">
          <Text weight="semibold" size="small">
            Ratio formulas — Risk Agent preview
          </Text>
          <AgentTag agentId="risk" theme={theme} />
        </Row>
        <Text size="small" tone="tertiary">
          Formulas shown for transparency; Risk Agent cannot finalize until Gate 2 signed.
        </Text>
        <Table
          headers={["Ratio", "Formula", "Status"]}
          rows={rows.map((r) => [r.ratio, r.formula, <Pill tone={r.tone}>{r.status}</Pill>])}
          striped
        />
      </Stack>
    </div>
  );
}

function StageActivityCard({
  stageId,
  theme,
  onGoToReview,
}: {
  stageId: "extraction" | "mapping";
  theme: FigmaTheme;
  onGoToReview?: () => void;
}) {
  const isExtraction = stageId === "extraction";
  const agentId = isExtraction ? "document-intel" : "mapping";
  return (
    <div style={dxpCard(theme)}>
      <Stack gap={12}>
        <Row align="center" justify="space-between">
          <Text weight="semibold" size="small">
            {isExtraction ? "Extraction activity" : "Mapping activity"}
          </Text>
          <AgentTag agentId={agentId} theme={theme} />
        </Row>
        {isExtraction ? (
          <>
            <Text size="small">140/140 fields extracted · 132 high confidence · 8 review-tier</Text>
            <Table
              headers={["Field", "Value", "Confidence", "Source"]}
              rows={[
                ["Revenue", "$648,125M", <Pill tone="success">High 98%</Pill>, "10-K p.38"],
                ["Total Assets", "$100,000K", <Pill tone="warning">Review 62%</Pill>, "10-K p.43"],
                ["Cash & Equivalents", "$9,857M", <Pill tone="success">High 99%</Pill>, "10-K p.42"],
              ]}
              striped
            />
          </>
        ) : (
          <>
            <Text size="small">138/140 mapped · 2 calculable totals skipped per SOP §7.5</Text>
            <Table
              headers={["Field", "COA mapping", "SOP", "Status"]}
              rows={[
                ["Revenue", "Operating revenue", "§5.1", <ExtractedBadge theme={theme} />],
                ["Total Assets", "Total assets", "§7.4", <Pill tone="warning">Deferred to Review</Pill>],
                ["Long-term Debt", "Term debt", "§8.1", <ExtractedBadge theme={theme} />],
              ]}
              striped
            />
          </>
        )}
        {onGoToReview && (
          <Button variant="ghost" onClick={onGoToReview}>
            Go to review stage
          </Button>
        )}
      </Stack>
    </div>
  );
}

function PortfolioBorrowerTable({
  openCase,
  theme,
}: {
  openCase: (id: CaseId, stage?: StageId) => void;
  theme: FigmaTheme;
}) {
  const rows: {
    borrower: string;
    stage: string;
    agentAction: string;
    agentId: AgentId;
    trust: ReactNode;
    caseId: CaseId;
    stageId: StageId;
  }[] = [
    {
      borrower: "Walmart Inc.",
      stage: "Review",
      agentAction: "Review QA flagged Total Assets outlier",
      agentId: "review",
      trust: <Pill tone="warning">1 flag</Pill>,
      caseId: "walmart",
      stageId: "review",
    },
    {
      borrower: "Northern Retail LLC",
      stage: "Intake",
      agentAction: "Intake blocked Gate 1 — 2/9 docs",
      agentId: "intake",
      trust: <Pill tone="deleted">Blocked</Pill>,
      caseId: "northern-retail",
      stageId: "intake",
    },
    {
      borrower: "AutoWest Motors",
      stage: "Assessment",
      agentAction: "Sentinel covenant breach — DSCR 0.95x",
      agentId: "sentinel",
      trust: <Pill tone="deleted">Critical</Pill>,
      caseId: "walmart",
      stageId: "assessment",
    },
  ];
  return (
    <Stack gap={8}>
      <H3>Active cases — agent status</H3>
      <Text size="small" tone="tertiary">
        Source: Case Orchestrator · portfolio rollup · live agent traces
      </Text>
      <Table
        headers={["Borrower", "Stage", "Last agent action", "Agent", "Trust", "Action"]}
        rows={rows.map((r) => [
          r.borrower,
          r.stage,
          r.agentAction,
          <AgentTag agentId={r.agentId} theme={theme} />,
          r.trust,
          <Button variant="ghost" onClick={() => openCase(r.caseId, r.stageId)}>
            Open case
          </Button>,
        ])}
        striped
      />
    </Stack>
  );
}

function makeAuditEvent(caseId: CaseId, action: GateAction): AuditEvent {
  const now = "Just now";
  if (action.kind === "gate2-sign") {
    return {
      id: `audit-${Date.now()}-gate2`,
      caseId,
      time: now,
      stage: "Review",
      actorKind: "human",
      actor: "Sarah W. (Credit Analyst)",
      input: "Spread draft v1 — 138/140 cells; 1 exception under review",
      reasoning: "Analyst signed Gate 2 after reviewing mapping exceptions and SOP compliance",
      output: "Gate 2 passed — Risk Agent released for ratio calculation",
    };
  }
  if (action.kind === "gate3-sign") {
    return {
      id: `audit-${Date.now()}-gate3`,
      caseId,
      time: now,
      stage: "Assessment",
      actorKind: "human",
      actor: "M. Chen (Risk Officer)",
      input: "Ratio analysis — Current Ratio 0.82x, D/E 0.46x, Interest Coverage 2.73x",
      reasoning: "Risk Officer reviewed flagged ratios against covenant schedule §3.1 — DSCR and D/E within limits; Current Ratio below 1.2x covenant flagged",
      output: "Gate 3 passed — Memo Composer Agent released; Connector bundle attached",
    };
  }
  if (action.kind === "gate4-sign") {
    return {
      id: `audit-${Date.now()}-gate4`,
      caseId,
      time: now,
      stage: "Credit Memo",
      actorKind: "human",
      actor: "Sarah W. (Credit Analyst)",
      input: "Credit memo draft v1 — connector-sourced sections (Experian, Equifax, D&B, AML/KYC, Bloomberg)",
      reasoning: "Memo coherence reviewed — bureau citations verified against connector logs; AML/KYC attestation confirmed",
      output: "Gate 4 passed — Decision Synthesis Agent released for committee package",
    };
  }
  if (action.kind === "mapping-accept") {
    return {
      id: `audit-${Date.now()}-accept`,
      caseId,
      time: now,
      stage: "Review",
      actorKind: "human",
      actor: "Sarah W. (Credit Analyst)",
      input: `Field: ${action.field} — Review Agent exception card`,
      reasoning: "Analyst accepted agent mapping after verifying source page and scale correction",
      output: `Accepted mapping for ${action.field} — exception cleared; Gate 2 eligible`,
    };
  }
  if (action.kind === "mapping-override") {
    const field = action.field === "spread" ? "spread sign-off" : action.field;
    return {
      id: `audit-${Date.now()}-override`,
      caseId,
      time: now,
      stage: "Review",
      actorKind: "human",
      actor: "Sarah W. (Credit Analyst)",
      input: `Override request: ${field}`,
      reasoning: "Documented exception override — reason: verified against audited financials; scale corrected to $252.5B",
      output: `Override logged with reason and timestamp — audit ID trace-override-${Date.now()}`,
    };
  }
  return {
    id: `audit-${Date.now()}-intake`,
    caseId,
    time: now,
    stage: "Intake",
    actorKind: "human",
    actor: "J. Martinez (Credit Analyst)",
    input: "Gate 1 blocked — 7 missing documents per SOP §4.2",
    reasoning: "Exception override requested — borrower committed to upload within 24h; documented waiver per policy §4.2.3",
    output: "Override logged — pipeline remains blocked until documents received (Gate 1 not passed)",
  };
}

// ─── InSight Assist panel ──────────────────────────────────────────────────

function InSightAssistPanel({ theme }: { theme: FigmaTheme }) {
  const [open, setOpen] = useCanvasState<boolean>("insightAssistOpen", true);
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          position: "fixed",
          right: 24,
          top: 80,
          background: theme.accent.primary,
          color: "#fff",
          border: "none",
          borderRadius: 8,
          padding: "8px 14px",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          zIndex: 100,
        }}
      >
        InSight Assist ▸
      </button>
    );
  }
  return (
    <div
      style={{
        width: 340,
        minWidth: 320,
        border: `1px solid ${theme.stroke.secondary}`,
        borderRadius: 8,
        background: theme.bg.editor,
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        height: "fit-content",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          borderBottom: `1px solid ${theme.stroke.tertiary}`,
        }}
      >
        <Row gap={8} align="center">
          <span style={{ fontSize: 14, color: theme.accent.primary }}>✦</span>
          <Text weight="semibold" size="small">InSight Assist</Text>
        </Row>
        <button
          type="button"
          onClick={() => setOpen(false)}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: theme.text.tertiary }}
        >
          ×
        </button>
      </div>
      <Stack gap={12} style={{ padding: 16 }}>
        <Text size="small" tone="tertiary">Today's Summary · Portfolio Level &rsaquo;</Text>
        <Text weight="semibold">Hello, your Portfolio Summary is ready for review.</Text>
        <div style={{ padding: "10px 12px", borderLeft: `3px solid ${theme.diff.removedLine}`, background: "#fff5f5", borderRadius: "0 6px 6px 0", fontSize: 12 }}>
          <Text weight="semibold" size="small">Critical Alert: Rising Credit Risk</Text>
        </div>
        <Text size="small" tone="secondary">
          The portfolio is showing signs of stress with 23 active covenant breaches, a +7 increase since last month.
          AutoWest Motors and Vantage Rental are currently the highest priority, both failing multiple covenants
          (Current Ratio &lt; 1.2x and DSCR &lt; 1.5x) with Risk Scores of 9.
        </Text>
        <Text weight="semibold" size="small">Key Observations:</Text>
        <Stack gap={8}>
          {[
            { label: "Liquidity Strain", body: "The \"Current Ratio < 1.2x\" is your most frequent breach (9 occurrences), suggesting a tightening of short-term liquidity across the dealer network." },
            { label: "Utilization Warning", body: "Average Credit Utilization has climbed to 70% (+4% MoM). High utilization paired with the 8 overdue financial submissions suggests potential cash flow struggles in 10% of your active dealers." },
            { label: "Portfolio Health", body: "60% of your portfolio remains Low Risk, but the 9% High Risk segment ($40.5M equivalent) is concentrated in dealers with high D/E ratios." },
          ].map((item) => (
            <div key={item.label} style={{ fontSize: 12, lineHeight: 1.5 }}>
              <span style={{ fontWeight: 600 }}>{item.label}:</span>{" "}
              <span style={{ color: theme.text.tertiary }}>{item.body}</span>
            </div>
          ))}
        </Stack>
        <Divider />
        <Row align="center" style={{ padding: "8px 0" }}>
          <div
            style={{
              flex: 1,
              border: `1px solid ${theme.stroke.secondary}`,
              borderRadius: 6,
              padding: "6px 10px",
              fontSize: 12,
              color: theme.text.quaternary,
              background: theme.bg.elevated,
            }}
          >
            Type your message here
          </div>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: theme.accent.primary,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginLeft: 8,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <span style={{ color: "#fff", fontSize: 14 }}>↑</span>
          </div>
        </Row>
        <Row gap={8} align="center" justify="space-between">
          <Text size="small" tone="quaternary">+ Attachment</Text>
          <Row gap={4} align="center">
            <span style={{ fontSize: 11, color: theme.text.quaternary }}>Agent: Portfolio Sentinel</span>
            <AgentTag agentId="sentinel" theme={theme} />
          </Row>
        </Row>
      </Stack>
    </div>
  );
}

// ─── In Focus cards (Figma Cases tab) ─────────────────────────────────────────

function InFocusBanner({
  rows,
  theme,
  openCase,
}: {
  rows: CaseRowData[];
  theme: FigmaTheme;
  openCase: (id: CaseId, stage?: StageId) => void;
}) {
  const [open, setOpen] = useCanvasState<boolean>("inFocusOpen", true);
  if (!open) return null;
  const highlight = rows.filter((r) => r.riskStatus === "High Risk").slice(0, 4);
  const allHighlight = [...highlight, ...rows.filter((r) => r.riskStatus !== "High Risk")].slice(0, 4);

  function riskTone(r: RiskStatus): "deleted" | "warning" | "success" {
    if (r === "High Risk") return "deleted";
    if (r === "Moderate Risk") return "warning";
    return "success";
  }

  function caseForRow(id: string): { caseId: CaseId; stage: StageId } {
    if (id.startsWith("WMT")) return { caseId: "walmart", stage: "review" };
    return { caseId: "northern-retail", stage: "intake" };
  }

  return (
    <div
      style={{
        ...dxpCard(theme),
        marginBottom: 4,
      }}
    >
      <Stack gap={10}>
        <Row align="center" justify="space-between">
          <Text weight="semibold" size="small">In Focus</Text>
          <button
            type="button"
            onClick={() => setOpen(false)}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: theme.text.tertiary }}
          >
            ×
          </button>
        </Row>
        <div style={{ display: "flex", gap: 12, overflowX: "auto" }}>
          {allHighlight.map((row) => {
            const { caseId, stage } = caseForRow(row.id);
            return (
              <div
                key={row.id}
                style={{
                  flex: "0 0 240px",
                  border: `1px solid ${theme.stroke.secondary}`,
                  borderRadius: 8,
                  padding: 12,
                  background: theme.bg.editor,
                  cursor: "pointer",
                }}
                onClick={() => openCase(caseId, stage)}
              >
                <Stack gap={6}>
                  <Row align="center" gap={6}>
                    <span style={{ fontSize: 12, color: theme.text.quaternary }}>⊞</span>
                    <Text weight="semibold" size="small">{row.entity}</Text>
                  </Row>
                  <Text size="small" tone="quaternary">04/08 · 3:50PM CST</Text>
                  <Row gap={6} align="center">
                    <Pill tone="neutral">{row.primaryConcern}</Pill>
                    <Pill tone={riskTone(row.riskStatus)}>• {row.riskStatus}</Pill>
                  </Row>
                  <div
                    style={{
                      padding: "8px 10px",
                      borderRadius: 6,
                      border: `1px solid ${theme.stroke.tertiary}`,
                      background: theme.bg.elevated,
                      fontSize: 11,
                      lineHeight: 1.5,
                      color: theme.text.secondary,
                    }}
                  >
                    <Row gap={4} align="start">
                      <span style={{ color: theme.accent.primary, flexShrink: 0, marginTop: 1 }}>✦</span>
                      <span>{row.aiBlurb.slice(0, 120)}{row.aiBlurb.length > 120 ? "…" : ""}</span>
                    </Row>
                  </div>
                </Stack>
              </div>
            );
          })}
        </div>
      </Stack>
    </div>
  );
}

// ─── Health Score indicator ────────────────────────────────────────────────────

function HealthScorePill({ score, theme }: { score: number; theme: FigmaTheme }) {
  const color =
    score >= 6.5 ? theme.category.green : score >= 4.5 ? "#1860ec" : theme.diff.removedLine;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 12,
        fontWeight: 500,
        color,
      }}
    >
      {score.toFixed(1)} / 10
    </span>
  );
}

function ExtractionConfBadge({ pct, theme }: { pct: number; theme: FigmaTheme }) {
  const color = pct >= 85 ? theme.category.green : pct >= 70 ? "#C08532" : theme.diff.removedLine;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 7px",
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 600,
        color: "#fff",
        background: color,
      }}
    >
      {pct}%
    </span>
  );
}

// ─── Pipeline stepper ─────────────────────────────────────────────────────────

type PipelineStep = {
  label: string;
  status: "done" | "active" | "pending" | "blocked";
  badge?: number;
};

function CasePipelineStepper({ steps, theme }: { steps: PipelineStep[]; theme: FigmaTheme }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, padding: "10px 0" }}>
      {steps.map((step, i) => {
        const isDone = step.status === "done";
        const isActive = step.status === "active";
        const isBlocked = step.status === "blocked";
        const bg = isDone ? theme.category.green : isActive ? "#1860ec" : isBlocked ? theme.diff.removedLine : theme.fill.tertiary;
        const fg = isDone || isActive || isBlocked ? "#fff" : theme.text.tertiary;
        return (
          <div key={step.label} style={{ display: "flex", alignItems: "center", flex: 1 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 6,
                background: bg,
                flex: 1,
              }}
            >
              {isDone && (
                <span style={{ color: fg, fontWeight: 700, fontSize: 13 }}>✓</span>
              )}
              {step.badge != null && !isDone && (
                <span
                  style={{
                    background: "#fff",
                    color: bg,
                    borderRadius: "50%",
                    width: 18,
                    height: 18,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {step.badge}
                </span>
              )}
              <span style={{ fontSize: 12, fontWeight: 500, color: fg, whiteSpace: "nowrap" }}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ width: 24, height: 2, background: theme.stroke.tertiary, flexShrink: 0 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Sparkline (mini trend chart) ────────────────────────────────────────────

function Sparkline({
  data2025,
  data2024,
  height = 200,
  theme,
  yLabel,
}: {
  data2025: number[];
  data2024: number[];
  height?: number;
  theme: FigmaTheme;
  yLabel?: string;
}) {
  const all = [...data2025, ...data2024].filter((v) => isFinite(v));
  if (all.length === 0) {
    return (
      <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Text size="small" tone="quaternary">No data available</Text>
      </div>
    );
  }
  const min = Math.min(...all);
  const max = Math.max(...all);
  const range = max - min || 1;
  const W = 400;
  const H = height - 40;
  const pts = (arr: number[]) =>
    arr.map((v, i) => `${(i / (arr.length - 1)) * W},${H - ((v - min) / range) * H}`).join(" ");
  const quarters = ["Q1", "Q2", "Q3", "Q4"];

  return (
    <div style={{ position: "relative" }}>
      {yLabel && (
        <div style={{ position: "absolute", top: 0, left: 0, fontSize: 11, color: theme.text.secondary, fontWeight: 600 }}>
          {yLabel}
        </div>
      )}
      <svg viewBox={`0 0 ${W} ${H + 30}`} style={{ width: "100%", height }}>
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => (
          <line
            key={frac}
            x1={0}
            y1={H - frac * H}
            x2={W}
            y2={H - frac * H}
            stroke={theme.stroke.tertiary}
            strokeWidth={1}
          />
        ))}
        {data2024.length > 1 && (
          <polyline points={pts(data2024)} fill="none" stroke="#c2cad6" strokeWidth={2} strokeLinecap="round" />
        )}
        {data2025.length > 1 && (
          <polyline points={pts(data2025)} fill="none" stroke="#1860ec" strokeWidth={2.5} strokeLinecap="round" />
        )}
        {data2025.length > 0 && (
          <circle
            cx={(data2025.length - 1) / (data2025.length - 1) * W}
            cy={H - ((data2025[data2025.length - 1] - min) / range) * H}
            r={4}
            fill="#1860ec"
          />
        )}
        {quarters.map((q, i) => (
          <text
            key={q}
            x={(i / (quarters.length - 1)) * W}
            y={H + 20}
            textAnchor="middle"
            fontSize={10}
            fill={theme.text.quaternary}
          >
            {q}
          </text>
        ))}
        {[min, (min + max) / 2, max].map((v, i) => (
          <text key={i} x={W + 4} y={H - (i * H) / 2 + 4} fontSize={9} fill={theme.text.quaternary}>
            {v.toFixed(2)}
          </text>
        ))}
      </svg>
      <Row gap={12} align="center" style={{ marginTop: 4 }}>
        <Row gap={4} align="center">
          <div style={{ width: 16, height: 2, background: "#1860ec", borderRadius: 1 }} />
          <Text size="small" tone="tertiary">2025</Text>
        </Row>
        <Row gap={4} align="center">
          <div style={{ width: 16, height: 2, background: "#c2cad6", borderRadius: 1 }} />
          <Text size="small" tone="tertiary">2024</Text>
        </Row>
      </Row>
    </div>
  );
}

// ─── Validate Ratios panel ────────────────────────────────────────────────────

function ValidateRatiosPanel({ theme }: { theme: FigmaTheme }) {
  const [tab, setTab] = useCanvasState<RatioTab>("ratioTab", "summary");
  const tabs: { id: RatioTab; label: string }[] = [
    { id: "summary", label: "Summary" },
    { id: "liquidity", label: "Liquidity" },
    { id: "profitability", label: "Profitability" },
    { id: "solvency", label: "Solvency" },
  ];

  return (
    <div
      style={{
        border: `1px solid ${theme.stroke.secondary}`,
        borderRadius: 8,
        background: theme.bg.editor,
        overflow: "hidden",
      }}
    >
      <Row align="center" justify="space-between" style={{ padding: "12px 16px", borderBottom: `1px solid ${theme.stroke.tertiary}` }}>
        <Text weight="semibold" size="small">Validate Ratios</Text>
        <Row gap={8} align="center">
          <Button variant="ghost" style={{ height: 28, fontSize: 11 }}>Actions</Button>
          <Button variant="primary" style={{ height: 28, fontSize: 11 }}>Mark Complete</Button>
        </Row>
      </Row>
      <Row gap={0} style={{ borderBottom: `1px solid ${theme.stroke.secondary}`, padding: "0 16px" }}>
        {tabs.map((t) => {
          const isActive = t.id === tab;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              style={{
                background: "none",
                border: "none",
                borderBottom: isActive ? `2px solid #1860ec` : "2px solid transparent",
                padding: "10px 12px",
                fontSize: 12,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? "#1a1a1a" : theme.text.tertiary,
                cursor: "pointer",
                fontFamily: "Inter, sans-serif",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </Row>
      <div style={{ padding: 16 }}>
        {tab === "summary" && (
          <Table
            headers={["Financial Metrics", "FY2025", "FY2026", "Change"]}
            rows={SUMMARY_METRICS.map((m) => [
              <Text weight="semibold" size="small">{m.label}</Text>,
              m.fy2025,
              m.fy2026,
              <Text
                size="small"
                style={{
                  color: m.change.startsWith("+") ? theme.category.green : m.change === "N/A" ? theme.text.tertiary : theme.diff.removedLine,
                }}
              >
                {m.change}
              </Text>,
            ])}
            striped
          />
        )}
        {tab !== "summary" && (
          <Row gap={16} align="start">
            <Stack gap={8} style={{ flex: "0 0 280px" }}>
              {(RATIO_DATA[tab as Exclude<RatioTab, "summary">] ?? []).map((r) => {
                const hasData = r.trend2025.length > 0;
                const borderColor =
                  r.status === "pass" ? theme.category.green : r.status === "warn" ? "#C08532" : theme.diff.removedLine;
                return (
                  <div
                    key={r.label}
                    style={{
                      border: `1px solid ${theme.stroke.secondary}`,
                      borderRadius: 8,
                      padding: 12,
                      background: theme.bg.elevated,
                    }}
                  >
                    <Stack gap={4}>
                      <Row align="center" justify="space-between">
                        <Text weight="semibold" size="small">{r.label}</Text>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            padding: "2px 8px",
                            borderRadius: 4,
                            border: `1px solid ${borderColor}`,
                            color: borderColor,
                            background: "transparent",
                          }}
                        >
                          {hasData ? `${r.actual}${r.unit} > ${r.threshold}${r.unit}` : "N/A"}
                        </span>
                      </Row>
                      <Text size="small" tone="secondary">{r.explanation}</Text>
                    </Stack>
                  </div>
                );
              })}
            </Stack>
            <Stack gap={8} style={{ flex: 1, minWidth: 0 }}>
              {(() => {
                const selected = (RATIO_DATA[tab as Exclude<RatioTab, "summary">] ?? [])[0];
                if (!selected || selected.trend2025.length === 0) {
                  return <Text size="small" tone="tertiary">No trend data available</Text>;
                }
                const changeColor = selected.trendChangeTone === "positive" ? theme.category.green : theme.diff.removedLine;
                return (
                  <>
                    <Row gap={8} align="center">
                      <Text style={{ fontSize: 28, fontWeight: 600 }}>{selected.trendLabel}</Text>
                      <span style={{ fontSize: 12, color: changeColor, fontWeight: 500 }}>
                        {selected.trendChangeTone === "positive" ? "↑" : "↓"} {selected.trendChange} YoY
                      </span>
                    </Row>
                    <Row gap={4} align="center">
                      <AgentTag agentId="risk" theme={theme} />
                      <Text size="small" tone="tertiary">Risk Agent calculated · FY2025 vs FY2024</Text>
                    </Row>
                    <Sparkline
                      data2025={selected.trend2025}
                      data2024={selected.trend2024}
                      height={200}
                      theme={theme}
                      yLabel={selected.label}
                    />
                  </>
                );
              })()}
            </Stack>
          </Row>
        )}
      </div>
    </div>
  );
}

// ─── Credit Memo Full View (Review & Submit) ──────────────────────────────────

function CreditMemoFullView({ theme, onClose }: { theme: FigmaTheme; onClose: () => void }) {
  const [expandedSections, setExpandedSections] = useCanvasState<string[]>("memoExpanded", ["rating"]);

  const toggle = (id: string) => {
    setExpandedSections(
      expandedSections.includes(id) ? expandedSections.filter((s) => s !== id) : [...expandedSections, id],
    );
  };

  const sections = [
    {
      id: "rating",
      title: "Rating & Recommendation Summary",
      content: (
        <Stack gap={12}>
          <Text size="small" weight="semibold">Final Risk Rating</Text>
          <div style={{ fontSize: 32, fontWeight: 600, color: theme.text.primary }}>5.45 / 10.0</div>
          <div
            style={{
              padding: 14,
              borderRadius: 8,
              border: `1px solid ${theme.stroke.secondary}`,
              background: theme.bg.elevated,
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            <Row gap={6} align="start">
              <span style={{ color: theme.accent.primary, flexShrink: 0, marginTop: 2 }}>✦</span>
              <Stack gap={6}>
                <Text size="small">
                  The "High Risk" categorization is driven by a combination of factors. The primary weaknesses are the
                  company's poor profitability, high leverage, and weak liquidity ratios. The negative tangible net
                  worth and consistent net losses are significant red flags. However, the score is prevented from being
                  lower by several mitigating factors.
                </Text>
                <Text size="small" tone="secondary">
                  The company's core operations generate strong and consistent cash flow, and the interest coverage
                  ratio is improving. Most importantly, the very low loan-to-value on the vehicle fleet provides a
                  substantial collateral cushion, reducing the potential for loss in a default scenario.
                </Text>
              </Stack>
            </Row>
          </div>
          <Row gap={16} align="center">
            <Stack gap={2}>
              <Text size="small" tone="tertiary">Risk Category</Text>
              <Pill tone="deleted">High Risk</Pill>
            </Stack>
            <Stack gap={2}>
              <Text size="small" tone="tertiary">Normalization</Text>
              <Pill tone="info">Balanced</Pill>
            </Stack>
            <Stack gap={2}>
              <Text size="small" tone="tertiary">Extraction Confidence</Text>
              <Row gap={4} align="center">
                <span style={{ color: theme.category.green, fontSize: 12 }}>✓</span>
                <Text size="small">Verified</Text>
              </Row>
            </Stack>
            <Button variant="ghost" style={{ marginLeft: "auto", height: 26, fontSize: 11 }}>Explain</Button>
          </Row>
        </Stack>
      ),
    },
    {
      id: "borrower",
      title: "Borrower Profile & Ownership",
      content: (
        <Text size="small" tone="secondary">
          Walmart Inc. — publicly traded (NYSE: WMT) — incorporated Delaware — EIN 71-0415188 — 2 UBO profiles screened
          (SSN match, PEP/sanctions clear). Controlling shareholder: Walton family trust (48.7%). No material adverse
          ownership change since last review.
        </Text>
      ),
    },
    {
      id: "benchmarking",
      title: "Competitive Benchmarking",
      content: (
        <Table
          headers={["Peer", "Rating", "Current Ratio", "D/E", "Net Margin"]}
          rows={[
            ["Costco", "AA", "1.21x", "0.38x", "2.7%"],
            ["Target", "A", "0.99x", "0.44x", "3.1%"],
            ["Walmart (WMT)", <Text weight="semibold">Watchlist</Text>, "0.82x", "0.46x", "-8.5%"],
          ]}
          rowTone={[undefined, undefined, "warning"]}
          striped
        />
      ),
    },
    {
      id: "loan",
      title: "Loan Request",
      content: (
        <Grid columns={3} gap={12}>
          {[
            { label: "Request amount", value: "$750M" },
            { label: "Facility type", value: "Corporate Revolving Credit" },
            { label: "Tenor", value: "36 months" },
            { label: "Proposed rate", value: "SOFR + 225bps" },
            { label: "Collateral", value: "Vehicle fleet (LTV 25.6%)" },
            { label: "Jurisdiction", value: "Delaware" },
          ].map((item) => (
            <div key={item.label}>
              <Stack gap={2}>
                <Text size="small" tone="tertiary">{item.label}</Text>
                <Text size="small" weight="semibold">{item.value}</Text>
              </Stack>
            </div>
          ))}
        </Grid>
      ),
    },
    {
      id: "financials",
      title: "Key Financial Metrics",
      content: (
        <Table
          headers={["Metric", "FY2025", "FY2026", "Trend"]}
          rows={[
            ["Revenue", "$680.9B", "$713.2B", <Pill tone="success">+4.7%</Pill>],
            ["Net Income", "$20.2B", "$22.3B", <Pill tone="success">+10.4%</Pill>],
            ["EBITDA margin", "N/A", "N/A", <Pill tone="neutral">N/A</Pill>],
            ["Current Ratio", "0.79x", "0.82x", <Pill tone="warning">Below 1.2x</Pill>],
            ["D/E Ratio", "0.44x", "0.46x", <Pill tone="success">Within 0.55x</Pill>],
          ]}
          rowTone={[undefined, undefined, undefined, "warning", undefined]}
          striped
        />
      ),
    },
    {
      id: "ratio-analysis",
      title: "Financial Ratio Analysis — Profitability",
      content: (
        <Text size="small" tone="secondary">
          Net Profit Margin improving YoY to 3.1%. ROA stable at 0.08x. EBIT Margin data pending final audited
          statements. Risk Agent assessment: profitability trajectory is positive but leverage remains elevated.
        </Text>
      ),
    },
  ];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
      onClick={(e: MouseEvent<HTMLDivElement>) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: theme.bg.editor,
          borderRadius: 12,
          width: "100%",
          maxWidth: 1100,
          maxHeight: "90vh",
          display: "flex",
          overflow: "hidden",
          boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
        }}
      >
        {/* Left panel */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <Row align="center" justify="space-between" style={{ padding: "16px 20px", borderBottom: `1px solid ${theme.stroke.secondary}` }}>
            <Text weight="semibold">Review & Submit Credit Memo Report</Text>
            <Row gap={8}>
              <Button variant="ghost" style={{ height: 28, fontSize: 11 }}>Actions</Button>
              <Button variant="secondary" style={{ height: 28, fontSize: 11 }}>Export</Button>
              <button
                type="button"
                onClick={onClose}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: theme.text.tertiary, padding: "0 4px" }}
              >
                ×
              </button>
            </Row>
          </Row>
          <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 20px" }}>
            <Stack gap={0}>
              {sections.map((section) => {
                const isExpanded = expandedSections.includes(section.id);
                return (
                  <div key={section.id} style={{ borderBottom: `1px solid ${theme.stroke.tertiary}` }}>
                    <button
                      type="button"
                      onClick={() => toggle(section.id)}
                      style={{
                        width: "100%",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "14px 0",
                        fontFamily: "Inter, sans-serif",
                        fontSize: 13,
                        fontWeight: 600,
                        color: theme.text.primary,
                      }}
                    >
                      <Row gap={8} align="center">
                        <span style={{ color: theme.text.quaternary }}>{isExpanded ? "∨" : "›"}</span>
                        {section.title}
                      </Row>
                      <span style={{ fontSize: 11, color: theme.text.tertiary, fontWeight: 400 }}>+ Comment</span>
                    </button>
                    {isExpanded && (
                      <div style={{ paddingBottom: 16 }}>
                        {section.content}
                      </div>
                    )}
                  </div>
                );
              })}
            </Stack>
          </div>
        </div>

        {/* Right panel — DECISION */}
        <div
          style={{
            width: 340,
            borderLeft: `1px solid ${theme.stroke.secondary}`,
            overflowY: "auto",
            padding: 20,
            background: theme.bg.elevated,
          }}
        >
          <Stack gap={14}>
            <Text weight="semibold" size="small">Final Credit Recommendation &amp; Comprehensive Justification</Text>
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 6,
                border: `2px solid ${theme.accent.primary}`,
                background: "#EEF4FF",
              }}
            >
              <Text weight="semibold" style={{ color: theme.accent.primary, fontSize: 13 }}>DECISION: NEGOTIATE</Text>
            </div>
            <Text size="small" tone="secondary">
              An outright approval of the requested $750 million credit facility is not recommended due to the
              significant structural weaknesses and financial risks inherent in the borrower's profile. The company's
              negative tangible net worth of ($4.8 billion) and a history of net losses, including a ($995 million)
              loss in 2025, point to a precarious financial position.
            </Text>
            <Text size="small" tone="secondary">
              The high leverage and weak liquidity ratios further amplify the risk. However, a complete decline is
              also not warranted. Walmart is a systemically important player in the global mobility market with a
              strong brand portfolio and a business that generates substantial operating cash flow ($3.3 billion
              in 2025).
            </Text>
            <Divider />
            <Text weight="semibold" size="small">Target Loan Structure</Text>
            <Stack gap={6}>
              <Text size="small" tone="secondary">
                <strong>Corporate Revolving Credit Facility:</strong> A reduced facility of $250,000,000 (down
                from $500,000,000) to provide necessary working capital.
              </Text>
              <Text size="small" tone="secondary">
                <strong>Asset-Backed Vehicle Line:</strong> A facility of up to $500,000,000, strictly governed by
                a borrowing base tied to the value of the vehicle fleet.
              </Text>
            </Stack>
            <Divider />
            <div>
              <button
                type="button"
                onClick={() => toggle("trend")}
                style={{
                  width: "100%",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "6px 0",
                  fontSize: 12,
                  fontWeight: 600,
                  color: theme.accent.primary,
                  fontFamily: "Inter, sans-serif",
                }}
              >
                Trend &amp; Variance Analysis
                <span>{expandedSections.includes("trend") ? "∧" : "∨"}</span>
              </button>
              {expandedSections.includes("trend") && (
                <Stack gap={6} style={{ marginTop: 8 }}>
                  {[
                    { num: "01", label: "Tangible Net Worth", sub: "-$4.8B · declining trend" },
                    { num: "02", label: "Current Ratio", sub: "0.82x · below 1.2x covenant" },
                    { num: "03", label: "Interest Coverage", sub: "2.73x · improving YoY" },
                  ].map((t) => (
                    <div key={t.num}>
                    <Row gap={8} align="start">
                      <span
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: "50%",
                          background: theme.accent.primary,
                          color: "#fff",
                          fontSize: 10,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          marginTop: 2,
                        }}
                      >
                        {t.num}
                      </span>
                      <Stack gap={1}>
                        <Text size="small" weight="semibold">{t.label}</Text>
                        <Text size="small" tone="tertiary">{t.sub}</Text>
                      </Stack>
                    </Row>
                    </div>
                  ))}
                </Stack>
              )}
            </div>
            <Divider />
            <Row gap={8}>
              <AgentTag agentId="decision" theme={theme} />
              <Text size="small" tone="tertiary">Decision Synthesis · {new Date().toLocaleDateString()}</Text>
            </Row>
          </Stack>
        </div>
      </div>
    </div>
  );
}

// ─── PortfolioView ─────────────────────────────────────────────────────────────

function PortfolioView({
  openCase,
  theme,
}: {
  openCase: (id: CaseId, stage?: StageId) => void;
  theme: FigmaTheme;
}) {
  return (
    <Row gap={16} align="start">
      <Stack gap={16} style={{ flex: 1, minWidth: 0 }}>
      <Grid columns={3} gap={12}>
        <FigmaKpiCard
          label="Agent auto-pass rate"
          value="94%"
          sub1="Week-over-week"
          sub1Val="+2%"
          sub1Trend="positive"
          sub2="Source"
          sub2Val="Sentinel + Review QA"
          theme={theme}
        />
        <FigmaKpiCard
          label="Open exceptions (book)"
          value="12"
          sub1="Since last week"
          sub1Val="+3"
          sub1Trend="negative"
          sub2="Review Agent overnight"
          sub2Val="7 flagged"
          theme={theme}
        />
        <FigmaKpiCard
          label="Agent hours saved (MTD)"
          value="312h"
          sub1="Month-over-month"
          sub1Val="+18%"
          sub1Trend="positive"
          sub2="Orchestrator rollup"
          sub2Val="42 cases"
          theme={theme}
        />
      </Grid>
      <Text size="small" tone="tertiary">
        Source: Portfolio Sentinel Agent · commercial book FY2025
      </Text>

      <Grid columns={3} gap={12}>
        <FigmaKpiCard
          label="Total Exposure"
          value="$1.8B"
          sub1="Month-over-Month"
          sub1Val="+6%"
          sub2="Year-over-Year"
          sub2Val="+9"
          theme={theme}
        />
        <FigmaKpiCard
          label="Covenant Breaches"
          value="23"
          sub1="Since last week"
          sub1Val="+1"
          sub1Trend="negative"
          sub2="Since last month"
          sub2Val="+7"
          sub2Trend="negative"
          theme={theme}
        />
        <FigmaKpiCard
          label="Overdue Financial Submission"
          value="8"
          sub1="Since last week"
          sub1Val="+3"
          sub2="Since last month"
          sub2Val="+5"
          theme={theme}
        />
      </Grid>

      <PortfolioBorrowerTable openCase={openCase} theme={theme} />

      <H2>Portfolio Sentinel alerts</H2>
      <Stack gap={8}>
        <div style={dxpCard(theme)}>
          <Stack gap={8}>
            <Row align="center" justify="space-between">
              <Text weight="semibold" size="small">
                Walmart Inc. — Covenant breach
              </Text>
              <Pill tone="deleted">Critical</Pill>
            </Row>
            <Row gap={8} align="center">
              <AgentTag agentId="sentinel" theme={theme} />
              <Text size="small" tone="tertiary">Generated Mar 17, 6:00 AM</Text>
            </Row>
            <Text>
              Current Ratio 0.79x (covenant &gt;1.2x). D/E 0.46x within limit. Revenue trend -12% YoY on spread.
            </Text>
            <Text size="small" tone="secondary">
              Evidence: FY2025 spread · Covenant schedule §3.1 · Bloomberg peer median 1.4x
            </Text>
            <Button variant="primary" onClick={() => openCase("walmart", "review")}>
              View case stage → Review
            </Button>
          </Stack>
        </div>
        <div style={dxpCard(theme)}>
          <Stack gap={8}>
            <Row align="center" justify="space-between">
              <Text weight="semibold" size="small">
                AutoWest Motors — Covenant breach
              </Text>
              <Pill tone="warning">Warning</Pill>
            </Row>
            <Row gap={8} align="center">
              <AgentTag agentId="sentinel" theme={theme} />
              <Text size="small" tone="tertiary">DSCR 0.95x · Floor plan utilization 88%</Text>
            </Row>
            <Button variant="ghost" onClick={() => openCase("walmart", "assessment")}>
              View case stage → Assessment
            </Button>
          </Stack>
        </div>
      </Stack>

      <H2>Covenant breach analysis</H2>
      <Row gap={8} align="center">
        <AgentTag agentId="sentinel" theme={theme} />
        <Text size="small" tone="tertiary">
          Source: Portfolio Sentinel Agent · Commercial credit book · FY2025
        </Text>
      </Row>
      <BarChart
        categories={["Current Ratio", "DSCR", "D/E", "Floor Plan Util"]}
        series={[{ name: "Breaches", data: [9, 6, 5, 3], tone: "danger" }]}
        height={200}
      />
      <Callout tone="info">
        Liquidity drives 40% of violations — Sentinel recommends prioritizing Current Ratio reviews.
      </Callout>

      <H2>Portfolio risk distribution</H2>
      <Row gap={8} align="center">
        <AgentTag agentId="sentinel" theme={theme} />
        <Text size="small" tone="tertiary">
          Risk tiers scored by Portfolio Sentinel Agent · nightly batch
        </Text>
      </Row>
      <Row gap={24} align="start">
        <PieChart
          data={[
            { label: "Low", value: 150 },
            { label: "Medium", value: 77 },
            { label: "High", value: 23 },
          ]}
          size={180}
        />
        <Stack gap={4} style={{ flex: 1 }}>
          <Text size="small" tone="secondary">
            Nearly 1 in 10 borrowers are High Risk, mirroring +7 covenant breaches this month.
          </Text>
        </Stack>
      </Row>
      </Stack>
      <InSightAssistPanel theme={theme} />
    </Row>
  );
}

function CommandCenterView({
  openCase,
  setView,
  theme,
}: {
  openCase: (id: CaseId, stage?: StageId) => void;
  setView: (v: View) => void;
  theme: FigmaTheme;
}) {
  return (
    <Stack gap={16}>
      <Callout tone="info" title="Since your last login">
        Agents processed 15 cases overnight · 3 need your review · Est. 28 min total
      </Callout>

      <Grid columns={3} gap={12}>
        <Stack gap={8}>
          <H3>Critical — agent blocked</H3>
          <DxpQueueCard
            title="Northern Retail LLC"
            trailing={<Pill tone="deleted">Gate 1</Pill>}
            theme={theme}
            trustFooter={
              <QueueTrustFooter
                gate="Gate 1 blocked"
                reviewMin="15 min"
                stageLabel="Intake"
                theme={theme}
                onViewStage={() => openCase("northern-retail", "intake")}
              />
            }
          >
            <AgentTag agentId="intake" theme={theme} />
            <Text size="small" tone="secondary">
              Intake Agent blocked: 2 of 9 documents received. Missing Q3 cash flow, covenant schedule, and 4 more per SOP §4.2.
            </Text>
            <Button variant="primary" onClick={() => openCase("northern-retail", "intake")}>
              Resolve completeness
            </Button>
          </DxpQueueCard>
          <DxpQueueCard
            title="AutoWest Motors"
            trailing={<Pill tone="deleted">SLA 4h</Pill>}
            theme={theme}
            demoLabel="Synthetic portfolio queue — demo breadth"
            trustFooter={
              <QueueTrustFooter gate="Gate 3 pending" reviewMin="20 min" stageLabel="Assessment" theme={theme} />
            }
          >
            <AgentTag agentId="sentinel" theme={theme} />
            <Text size="small" tone="secondary">
              Covenant breach: Current Ratio 0.85x (req &gt;1.2x). DSCR 0.95x.
            </Text>
            <Button variant="primary" onClick={() => openCase("walmart", "assessment")}>
              Open case workspace
            </Button>
          </DxpQueueCard>
        </Stack>

        <Stack gap={8}>
          <H3>Needs your review</H3>
          <DxpQueueCard
            title="Walmart Inc."
            trailing={<Pill tone="warning">12 min</Pill>}
            theme={theme}
            trustFooter={
              <QueueTrustFooter
                gate="Gate 2 pending"
                reviewMin="12 min"
                stageLabel="Review"
                theme={theme}
                onViewStage={() => openCase("walmart", "review")}
              />
            }
          >
            <Row gap={6} wrap>
              <AgentTag agentId="mapping" theme={theme} />
              <AgentTag agentId="review" theme={theme} />
            </Row>
            <Text size="small" tone="secondary">
              Mapping Agent completed 138/140 fields. Review Agent flagged 1 outlier on Total Assets.
            </Text>
            <Button variant="primary" onClick={() => openCase("walmart", "review")}>
              Review mapping
            </Button>
          </DxpQueueCard>
          <DxpQueueCard
            title="Borrower 3 — Floor Plan"
            theme={theme}
            demoLabel="Synthetic portfolio queue — demo breadth"
            trustFooter={<QueueTrustFooter gate="Gate 4 pending" reviewMin="8 min" stageLabel="Memo" theme={theme} />}
          >
            <AgentTag agentId="memo" theme={theme} />
            <Text size="small" tone="secondary">
              Memo Composer draft ready · Gate 4 pending your coherence review.
            </Text>
          </DxpQueueCard>
        </Stack>

        <Stack gap={8}>
          <H3>Agents working</H3>
          <DxpQueueCard
            title="Costco Wholesale"
            theme={theme}
            demoLabel="Synthetic portfolio queue — demo breadth"
            trustFooter={<QueueTrustFooter gate="—" reviewMin="—" stageLabel="Extraction" theme={theme} />}
          >
            <AgentTag agentId="document-intel" theme={theme} />
            <Text size="small" tone="secondary">
              Extracting 10-K filing (214 pages) · 67% complete
            </Text>
            <UsageBarPlaceholder theme={theme} pct={67} />
          </DxpQueueCard>
          <DxpQueueCard
            title="Target Corp"
            theme={theme}
            demoLabel="Synthetic portfolio queue — demo breadth"
            trustFooter={<QueueTrustFooter gate="—" reviewMin="—" stageLabel="Assessment" theme={theme} />}
          >
            <AgentTag agentId="risk" theme={theme} />
            <Text size="small" tone="secondary">
              Running covenant analysis across 4 periods
            </Text>
          </DxpQueueCard>
        </Stack>
      </Grid>

      <H2>Agent queue</H2>
      <Table
        headers={["Borrower", "Stage", "Agent status", "Last agent action", "Time saved", "Trust", "Action"]}
        rows={[
          [
            "Walmart Inc.",
            "Review",
            <AgentTag agentId="review" theme={theme} />,
            "Review QA flagged Total Assets outlier",
            "~2.5 days",
            <Pill tone="warning">1 flag</Pill>,
            <Button variant="ghost" onClick={() => openCase("walmart", "review")}>Review</Button>,
          ],
          [
            "Northern Retail LLC",
            "Intake",
            <AgentTag agentId="intake" theme={theme} />,
            "Intake blocked — SOP §4.2 completeness",
            "—",
            <Pill tone="deleted">Gate 1</Pill>,
            <Button variant="ghost" onClick={() => openCase("northern-retail", "intake")}>Resolve</Button>,
          ],
          [
            "AutoWest Motors",
            "Assessment",
            <AgentTag agentId="sentinel" theme={theme} />,
            "Sentinel: covenant breach detected",
            "~1.2 days",
            <Pill tone="deleted">Critical</Pill>,
            <Button variant="ghost" onClick={() => setView("portfolio")}>View alert</Button>,
          ],
          [
            "Borrower 5",
            "Mapping",
            <AgentTag agentId="mapping" theme={theme} />,
            "Mapping complete — awaiting Gate 2",
            "~1.8 days",
            <Pill tone="success">98% conf</Pill>,
            "Monitor",
          ],
        ]}
        striped
      />
    </Stack>
  );
}

function UsageBarPlaceholder({ theme, pct }: { theme: ReturnType<typeof useHostTheme>; pct: number }) {
  return (
    <div
      style={{
        height: 6,
        borderRadius: 3,
        background: theme.fill.quaternary,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${pct}%`,
          height: "100%",
          background: theme.accent.primary,
          borderRadius: 3,
        }}
      />
    </div>
  );
}

function actorKindPill(kind: ActorKind) {
  if (kind === "agent") return { label: "Agent", tone: "info" as const };
  if (kind === "human") return { label: "Human", tone: "warning" as const };
  return { label: "System", tone: "neutral" as const };
}

function ActorChip({
  actor,
  theme,
}: {
  actor: StageActor;
  theme: FigmaTheme;
}) {
  const ap = actorKindPill(actor.kind);
  return (
    <div
      style={{
        ...dxpCard(theme),
        padding: "8px 10px",
        flex: "1 1 180px",
        minWidth: 160,
      }}
    >
      <Stack gap={4}>
        <Row gap={6} align="center">
          <Pill tone={ap.tone}>{ap.label}</Pill>
          {actor.agentId ? <AgentTag agentId={actor.agentId} theme={theme} /> : null}
        </Row>
        <Text weight="semibold" size="small">
          {actor.name}
        </Text>
        <Text size="small" tone="tertiary">
          {actor.role}
        </Text>
      </Stack>
    </div>
  );
}

function TraceSection({
  title,
  items,
}: {
  title: string;
  items: string[];
  theme: FigmaTheme;
}) {
  return (
    <Stack gap={6} style={{ flex: 1, minWidth: 0 }}>
      <Text weight="semibold" size="small">
        {title}
      </Text>
      <Stack gap={4}>
        {items.map((item, i) => (
          <span key={i}>
            <Row gap={8} align="start">
              <Text size="small" tone="quaternary" as="span" style={{ marginTop: 2 }}>
                •
              </Text>
              <Text size="small" tone="secondary">
                {item}
              </Text>
            </Row>
          </span>
        ))}
      </Stack>
    </Stack>
  );
}

function StageTracePanel({ trace, theme }: { trace: StageTrace; theme: FigmaTheme }) {
  const statusTone =
    trace.status === "complete"
      ? "success"
      : trace.status === "active"
        ? "warning"
        : trace.status === "blocked"
          ? "deleted"
          : "neutral";

  return (
    <div style={dxpCard(theme)}>
      <Stack gap={12}>
        <Row align="center" justify="space-between" wrap>
          <Row gap={8} align="center">
            <H3>{trace.label} — stage trace</H3>
            <Pill tone={statusTone}>{trace.status}</Pill>
          </Row>
          {trace.timestamp && (
            <Text size="small" tone="tertiary">
              {trace.timestamp}
            </Text>
          )}
        </Row>

        <Text size="small" tone="secondary">
          {trace.summary}
        </Text>

        <Stack gap={6}>
          <Text weight="semibold" size="small">
            Who acted
          </Text>
          <Row gap={8} wrap align="stretch">
            {trace.actors.map((a, i) => (
              <span key={i}>
                <ActorChip actor={a} theme={theme} />
              </span>
            ))}
          </Row>
        </Stack>

        <Divider />

        <Row gap={16} align="start" wrap>
          <TraceSection title="Input" items={trace.input} theme={theme as FigmaTheme} />
          <TraceSection title="Reasoning" items={trace.reasoning} theme={theme as FigmaTheme} />
          <TraceSection title="Output" items={trace.output} theme={theme as FigmaTheme} />
        </Row>

        {trace.gate && (
          <>
            <Divider />
            <Row align="center" justify="space-between" wrap gap={8}>
              <Stack gap={4}>
                <Text weight="semibold" size="small">
                  Human gate
                </Text>
                <Text size="small">{trace.gate.label}</Text>
              </Stack>
              <Row gap={8} align="center">
                <Pill
                  tone={
                    trace.gate.status === "passed"
                      ? "success"
                      : trace.gate.status === "pending"
                        ? "warning"
                        : "deleted"
                  }
                >
                  {trace.gate.status}
                </Pill>
                {trace.gate.actor && (
                  <Text size="small" tone="tertiary">
                    {trace.gate.actor}
                    {trace.gate.signedAt ? ` · ${trace.gate.signedAt}` : ""}
                  </Text>
                )}
              </Row>
            </Row>
          </>
        )}
      </Stack>
    </div>
  );
}

function CaseRuntimeLog({
  entries,
  theme,
  newEntryIds,
}: {
  entries: RuntimeLogEntry[];
  theme: FigmaTheme;
  newEntryIds?: Set<string>;
}) {
  return (
    <Stack gap={8}>
      <H3>Case runtime log — end to end</H3>
      <Text size="small" tone="tertiary">
        Portfolio alert → orchestration → stage agents → human gates → portfolio update
        {newEntryIds && newEntryIds.size > 0 ? " · New human actions highlighted" : ""}
      </Text>
      <Table
        headers={["Time", "Stage", "Actor type", "Actor", "Input", "Reasoning", "Output"]}
        rows={entries.map((e, i) => {
          const ap = actorKindPill(e.actorKind);
          const entryId = "id" in e ? (e as AuditEvent).id : `base-${i}`;
          const isNew = newEntryIds?.has(entryId);
          return [
            <Text size="small" weight={isNew ? "semibold" : undefined} style={isNew ? { color: theme.accent.primary } : undefined}>
              {e.time}
            </Text>,
            e.stage,
            <Pill tone={ap.tone}>{ap.label}</Pill>,
            e.actor,
            e.input,
            e.reasoning,
            e.output,
          ];
        })}
        striped
      />
    </Stack>
  );
}

function connectorStatusPill(status: ConnectorFeed["status"]) {
  if (status === "synced") return { label: "Synced", tone: "success" as const };
  if (status === "stale") return { label: "Stale", tone: "warning" as const };
  if (status === "blocked") return { label: "Blocked", tone: "deleted" as const };
  return { label: "Pending", tone: "neutral" as const };
}

function ConnectorTrustPanel({
  feeds,
  entitySummary,
  theme,
}: {
  feeds: ConnectorFeed[];
  entitySummary: string;
  theme: FigmaTheme;
}) {
  return (
    <div style={dxpCard(theme)}>
      <Stack gap={12}>
        <Row align="center" justify="space-between" wrap>
          <Stack gap={4}>
            <Text weight="semibold" size="small">
              Connector Trust Panel
            </Text>
            <Text size="small" tone="tertiary">
              {entitySummary}
            </Text>
          </Stack>
          <AgentTag agentId="connector" theme={theme} />
        </Row>
        <Callout tone="info" title="Connector strategy">
          Bureau scores via Experian, Equifax, and D&B APIs on business identifiers (EIN/DUNS). AML/KYC uses
          entity EIN for corporate screening; guarantor/UBO identity via SSN or ITIN where applicable. Every
          memo paragraph cites connector ID + sync time.
        </Callout>
        <Table
          headers={["Provider", "API", "ID type", "Identifier", "Status", "Result", "Memo section"]}
          rows={feeds.map((f) => {
            const sp = connectorStatusPill(f.status);
            return [
              f.provider,
              f.api,
              f.entityIdType,
              f.entityIdMasked,
              <Pill tone={sp.tone}>{sp.label}</Pill>,
              f.result,
              f.memoSection,
            ];
          })}
          striped
        />
      </Stack>
    </div>
  );
}

function CreditMemoPreview({ sections, theme }: { sections: MemoSection[]; theme: FigmaTheme }) {
  return (
    <div style={dxpCard(theme)}>
      <Stack gap={12}>
        <Row align="center" justify="space-between">
          <Text weight="semibold">Credit memo draft — connector-sourced sections</Text>
          <AgentTag agentId="memo" theme={theme} />
        </Row>
        {sections.map((s, i) => (
          <span key={i}>
            <Stack gap={6}>
              <Text weight="semibold" size="small">
                {s.title}
              </Text>
              <Text size="small">{s.body}</Text>
              <Row gap={8} wrap>
                <Text size="small" tone="tertiary">
                  Source: {s.source}
                </Text>
                {s.connectorRef !== "—" && (
                  <Pill tone="info">{s.connectorRef}</Pill>
                )}
              </Row>
              {i < sections.length - 1 && <Divider />}
            </Stack>
          </span>
        ))}
      </Stack>
    </div>
  );
}

function DecisionRationalePanel({ theme }: { theme: FigmaTheme }) {
  return (
    <div style={dxpCard(theme)}>
      <Stack gap={12}>
        <Row align="center" justify="space-between">
          <Text weight="semibold">Decision rationale tree (preview)</Text>
          <AgentTag agentId="decision" theme={theme} />
        </Row>
        <Grid columns={3} gap={12}>
          <Stack gap={6}>
            <Text weight="semibold" size="small">
              Spread quality (40%)
            </Text>
            <Text size="small" tone="secondary">
              138/140 mapped · 1 exception open · Gate 2 unsigned
            </Text>
            <Pill tone="warning">Reduced confidence</Pill>
          </Stack>
          <Stack gap={6}>
            <Text weight="semibold" size="small">
              External verification (35%)
            </Text>
            <Text size="small" tone="secondary">
              Experian 76 · Equifax 92 · D&B PAYDEX 80 · AML/KYC clear
            </Text>
            <Pill tone="success">Above policy floor</Pill>
          </Stack>
          <Stack gap={6}>
            <Text weight="semibold" size="small">
              Qualitative (25%)
            </Text>
            <Text size="small" tone="secondary">
              Top-quartile peer · Sentinel covenant flag on draft ratios
            </Text>
            <Pill tone="warning">Watchlist signal</Pill>
          </Stack>
        </Grid>
        <Divider />
        <Row gap={8} align="center">
          <Text weight="semibold">Synthesis:</Text>
          <Pill tone="neutral">Conditional Approve (pending Gates 2–4)</Pill>
        </Row>
        <Text size="small" tone="tertiary">
          Evidence bundle: memo connector refs + spread trace + AML/KYC attestation — attached to committee packet
        </Text>
      </Stack>
    </div>
  );
}

function CaseSwitcher({
  activeId,
  onChange,
  theme,
}: {
  activeId: CaseId;
  onChange: (id: CaseId) => void;
  theme: FigmaTheme;
}) {
  const items: { id: CaseId; label: string; sub: string }[] = [
    { id: "walmart", label: "Walmart Inc.", sub: "Gate 2 · mapping review" },
    { id: "northern-retail", label: "Northern Retail LLC", sub: "Gate 1 blocked · sad path" },
  ];
  return (
    <Row gap={8} wrap>
      {items.map((item) => {
        const isActive = item.id === activeId;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            style={{
              textAlign: "left",
              padding: "8px 12px",
              borderRadius: 8,
              border: `1px solid ${isActive ? theme.accent.primary : theme.stroke.secondary}`,
              background: isActive ? theme.fill.tertiary : theme.bg.editor,
              cursor: "pointer",
              fontFamily: "Inter, sans-serif",
              minWidth: 200,
            }}
          >
            <Stack gap={2}>
              <Text weight="semibold" size="small" style={{ color: theme.text.primary }}>
                {item.label}
              </Text>
              <Text size="small" tone="tertiary">
                {item.sub}
              </Text>
            </Stack>
          </button>
        );
      })}
    </Row>
  );
}

function LifecycleRail({
  traces,
  activeId,
  onSelect,
  theme,
}: {
  traces: Record<StageId, StageTrace>;
  activeId: StageId;
  onSelect: (id: StageId) => void;
  theme: ReturnType<typeof useHostTheme>;
}) {
  const stages = Object.values(traces) as StageTrace[];
  return (
    <Stack
      gap={4}
      style={{
        minWidth: 200,
        padding: 12,
        background: theme.bg.elevated,
        borderRadius: 8,
        border: `1px solid ${theme.stroke.tertiary}`,
      }}
    >
      <Text weight="semibold" size="small">
        Case lifecycle
      </Text>
      <Text size="small" tone="quaternary">
        Click stage → full trace
      </Text>
      <Divider />
      {stages.map((s) => {
        const isActive = s.id === activeId;
        const actorSummary = s.actors.map((a) => a.kind).join(" · ");
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(s.id)}
            style={{
              textAlign: "left",
              padding: "8px 10px",
              borderRadius: 6,
              border: `1px solid ${isActive ? theme.accent.primary : theme.stroke.tertiary}`,
              background: isActive ? theme.fill.tertiary : "transparent",
              cursor: "pointer",
              color: theme.text.primary,
            }}
          >
            <Stack gap={4}>
              <Row gap={6} align="center" wrap>
                <Text weight="semibold" size="small" as="span">
                  {s.label}
                </Text>
                <Pill
                  tone={
                    s.status === "complete"
                      ? "success"
                      : s.status === "active"
                        ? "warning"
                        : s.status === "blocked"
                          ? "deleted"
                          : "neutral"
                  }
                >
                  {s.status}
                </Pill>
              </Row>
              <Text size="small" tone="tertiary" as="span">
                {s.summary}
              </Text>
              <Text size="small" tone="quaternary" as="span">
                Actors: {actorSummary}
              </Text>
              {s.timestamp && (
                <Text size="small" tone="quaternary" as="span">
                  {s.timestamp}
                </Text>
              )}
            </Stack>
          </button>
        );
      })}
    </Stack>
  );
}

function TrustInspector({
  row,
  theme,
  onClose,
  onAccept,
  onOverride,
}: {
  row: MappingRow | null;
  theme: ReturnType<typeof useHostTheme>;
  onClose: () => void;
  onAccept?: (field: string) => void;
  onOverride?: (field: string) => void;
}) {
  if (!row) return null;
  const cp = confidencePill(row.confidence);
  const agent = AGENTS[row.agentId];
  const reasoning =
    row.reasoning ??
    (row.confidence === "review"
      ? "Review Agent flagged this field for analyst verification."
      : `Mapped per ${row.sop ?? "SOP"}; high-confidence extraction from ${row.source ?? "source document"}.`);
  return (
    <Card>
      <CardHeader
        trailing={
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        }
      >
        Trust Inspector
      </CardHeader>
      <CardBody>
        <Stack gap={10}>
          <Text weight="semibold">{row.field}</Text>
          <Row gap={8}>
            <Pill tone={cp.tone}>{cp.label}</Pill>
            <AgentTag agentId={row.agentId} theme={theme} />
          </Row>
          <Divider />
          <Row justify="space-between">
            <Text size="small" tone="secondary">
              Extracted value
            </Text>
            <Text weight="semibold">{row.value}</Text>
          </Row>
          {row.source && (
            <Row justify="space-between">
              <Text size="small" tone="secondary">
                Source
              </Text>
              <Text size="small">{row.source}</Text>
            </Row>
          )}
          {row.sop && (
            <Row justify="space-between">
              <Text size="small" tone="secondary">
                SOP reference
              </Text>
              <Text size="small">Credit Policy {row.sop}</Text>
            </Row>
          )}
          {row.confidence === "review" ? (
            <Callout tone="warning" title="Review Agent reasoning">
              {reasoning}
            </Callout>
          ) : (
            <Callout tone="info" title="Agent lineage">
              {reasoning}
            </Callout>
          )}
          <Divider />
          <Text size="small" tone="tertiary">
            Agent: {agent.name} · Audit ID {row.auditId ?? `trace-${row.field.toLowerCase().replace(/\s/g, "-")}`}
          </Text>
          <Row gap={8}>
            <Button variant="primary" onClick={() => onAccept?.(row.field)}>
              Accept mapping
            </Button>
            <Button variant="ghost" onClick={() => onOverride?.(row.field)}>
              Override with reason
            </Button>
          </Row>
        </Stack>
      </CardBody>
    </Card>
  );
}

function CaseWorkspaceView({ theme }: { theme: FigmaTheme }) {
  const [caseId, setCaseId] = useCanvasState<CaseId>("activeCaseId", "walmart");
  const [stageId, setStageId] = useCanvasState<StageId>("caseStage", "review");
  const [selectedField, setSelectedField] = useCanvasState<string | null>("selectedField", null);
  const [detailTab, setDetailTab] = useCanvasState<CaseDetailTab>("caseDetailTab", "extracted");
  const [auditAppend, setAuditAppend] = useCanvasState<AuditEvent[]>("auditAppend", []);
  const [memoOpen, setMemoOpen] = useCanvasState<boolean>("memoFullOpen", false);

  const caseDef = CASES[caseId];
  const caseAudit = auditAppend.filter((e) => e.caseId === caseId);
  const mergedLog: RuntimeLogEntry[] = [...caseDef.runtimeLog, ...caseAudit];
  const newEntryIds = new Set(caseAudit.map((e) => e.id));
  const activeTrace = caseDef.traces[stageId];
  const selectedRow = caseDef.mappingData.find((r) => r.field === selectedField) ?? null;
  const isNorthern = caseId === "northern-retail";
  const receivedCount = caseDef.intakeDocs.filter((d) => d.received).length;

  const appendAudit = (action: GateAction) => {
    const event = makeAuditEvent(caseId, action);
    setAuditAppend([...auditAppend, event]);
  };

  const switchCase = (id: CaseId) => {
    setCaseId(id);
    setStageId(CASES[id].defaultStage);
    setSelectedField(null);
  };

  const pipelineSteps: PipelineStep[] = isNorthern
    ? [
        { label: "Ingestion", status: "done" },
        { label: "Extractions", status: "blocked", badge: 7 },
        { label: "Output", status: "pending", badge: 3 },
        { label: "Health", status: "pending", badge: 4 },
      ]
    : [
        { label: "Ingestion", status: "done" },
        { label: "Extractions", status: "done" },
        { label: "Output", status: "active", badge: 2 },
        { label: "Health", status: "pending", badge: 4 },
      ];

  return (
    <Stack gap={12}>
      {memoOpen && <CreditMemoFullView theme={theme} onClose={() => setMemoOpen(false)} />}
      <CaseSwitcher activeId={caseId} onChange={switchCase} theme={theme} />

      <div style={{ ...dxpCard(theme), padding: 0, overflow: "hidden" }}>
        {/* Case header bar */}
        <div style={{ padding: "10px 16px", borderBottom: `1px solid ${theme.stroke.tertiary}` }}>
          <Row align="center" justify="space-between" wrap gap={8}>
            <Row gap={8} align="center">
              <span style={{ fontSize: 16 }}>⊞</span>
              <Text weight="semibold">{caseDef.title}</Text>
              <Text size="small" tone="quaternary">···</Text>
            </Row>
            <Row gap={8} align="center">
              <div style={{ display: "flex", gap: 2 }}>
                {[1, 2, 3].map((i) => (
                  <div key={i} style={{ width: 20, height: 20, borderRadius: "50%", background: theme.fill.secondary, border: `2px solid ${theme.bg.editor}`, marginLeft: i > 1 ? -6 : 0 }} />
                ))}
              </div>
              <Button variant="ghost" style={{ height: 28, fontSize: 11 }}>Save</Button>
              <Button variant="primary" style={{ height: 28, fontSize: 11 }} onClick={() => setMemoOpen(true)}>
                Generate Report
              </Button>
            </Row>
          </Row>
        </div>
        {/* Case metadata row */}
        <div style={{ padding: "8px 16px", borderBottom: `1px solid ${theme.stroke.tertiary}` }}>
          <Row gap={24} wrap align="center">
            {[
              { label: "Case ID", value: isNorthern ? "NRTL-REV-2025" : "WMT-TLB-2025" },
              { label: "Case / Trigger Type", value: isNorthern ? "Revolving Credit" : "New Loan" },
              { label: "SLA", value: isNorthern ? "Blocked" : "2 hrs remaining" },
              { label: "Status", value: isNorthern ? "Blocked" : "In Progress" },
              { label: "Extraction Confidence", value: isNorthern ? "2/9 docs" : "99%" },
              { label: "Risk", value: isNorthern ? "High Risk" : "Low Risk" },
              { label: "Normalization", value: isNorthern ? "Pending" : "Balanced" },
            ].map((item) => (
              <div key={item.label}>
                <Stack gap={1}>
                  <Text size="small" tone="quaternary">{item.label}</Text>
                  <Text size="small" weight="semibold">{item.value}</Text>
                </Stack>
              </div>
            ))}
          </Row>
        </div>
        {/* Pipeline stepper */}
        <div style={{ padding: "4px 16px" }}>
          <CasePipelineStepper steps={pipelineSteps} theme={theme} />
        </div>
        {/* Trust strip + briefing */}
        <div style={{ padding: "8px 16px 12px" }}>
          <Stack gap={8}>
            <Row align="center" wrap gap={8}>
              <AgentTag agentId="orchestrator" theme={theme} />
              <Text size="small" tone="tertiary">
                Orchestrator: {caseDef.orchestratorStatus}
              </Text>
              <Spacer />
              <Pill tone={caseDef.gateTone}>{caseDef.gateLabel}</Pill>
            </Row>
            <CaseTrustStrip caseDef={caseDef} auditCount={caseAudit.length} theme={theme} />
            <Callout tone={isNorthern ? "warning" : "info"} title={caseDef.briefingTitle}>
              {caseDef.briefingBody}
            </Callout>
            <Row gap={8} align="center" wrap>
              <Text size="small" weight="semibold">Next best action:</Text>
              <Text size="small">{caseDef.nextBestAction}</Text>
              <Button variant="primary" style={{ height: 28, fontSize: 12, borderRadius: 4 }}>
                {caseDef.primaryCta}
              </Button>
            </Row>
          </Stack>
        </div>
      </div>

      <Row gap={12} align="start" style={{ alignItems: "stretch" }}>
        <LifecycleRail traces={caseDef.traces} activeId={stageId} onSelect={setStageId} theme={theme} />

        <Stack gap={12} style={{ flex: 1, minWidth: 0 }}>
          <StageTracePanel trace={activeTrace} theme={theme} />

          <Text weight="semibold" size="small">
            Stage workspace
          </Text>
          {stageId === "intake" && (
            <div style={dxpCard(theme)}>
              <Stack gap={12}>
                <Row align="center" justify="space-between">
                  <Text weight="semibold" size="small">
                    Document intake — completeness ({receivedCount}/{caseDef.intakeDocs.length})
                  </Text>
                  <AgentTag agentId="intake" theme={theme} />
                </Row>
                {isNorthern ? (
                  <Callout tone="warning" title="Gate 1 blocked — 7 documents missing">
                    Intake Agent cannot release extraction. EIN captured from credit application — Connector
                    Agent ran preliminary AML entity screen; full bureau + guarantor SSN KYC deferred.
                  </Callout>
                ) : (
                  <Callout tone="success" title="Gate 1 passed">
                    Intake Agent validated 9/9 documents per SOP §4.2. EIN captured → Connector Agent synced
                    Experian, Equifax, D&B, and AML/KYC APIs in parallel.
                  </Callout>
                )}
                <Table
                  headers={["Document", "SOP ref", "Status", "Agent"]}
                  rows={caseDef.intakeDocs.map((doc) => [
                    doc.name,
                    doc.sopRef,
                    doc.received ? (
                      <ExtractedBadge theme={theme} />
                    ) : (
                      <Pill tone="deleted">Missing</Pill>
                    ),
                    "Intake",
                  ])}
                  rowTone={caseDef.intakeDocs.map((d) => (d.received ? "success" : "danger"))}
                  striped
                />
                {isNorthern && (
                  <GateSignOffBar
                    mode="intake-override"
                    theme={theme}
                    onAction={(action) => appendAudit(action)}
                  />
                )}
              </Stack>
            </div>
          )}

          {stageId === "review" && !isNorthern && (
            <>
              <div
                style={{
                  border: `1px solid ${theme.stroke.secondary}`,
                  borderRadius: 8,
                  overflow: "hidden",
                  background: theme.bg.editor,
                }}
              >
                <Row align="center" justify="space-between" style={{ borderBottom: `1px solid ${theme.stroke.secondary}` }}>
                  <CaseDetailsTabBar
                    active={detailTab}
                    onChange={setDetailTab}
                    theme={theme}
                    counts={{ extracted: 140, exceptions: 1, corrected: 0 }}
                  />
                  <Button
                    variant="primary"
                    style={{ height: 28, fontSize: 11, margin: "0 12px", flexShrink: 0 }}
                    onClick={() => setMemoOpen(true)}
                  >
                    Launch Spread ↗
                  </Button>
                </Row>
                <Row
                  align="center"
                  justify="space-between"
                  style={{ padding: "8px 16px", borderBottom: `1px solid ${theme.stroke.tertiary}` }}
                >
                  <Text size="small" tone="tertiary">
                    Search fields
                  </Text>
                  <Row gap={8} align="center">
                    <Text size="small" tone="tertiary">
                      Extraction Confidence
                    </Text>
                    <FigmaConfidenceBadge level="high" label="High" theme={theme} />
                    <FigmaConfidenceBadge level="review" label="Review" theme={theme} />
                    <FigmaConfidenceBadge level="missing" label="Low" theme={theme} />
                  </Row>
                </Row>
                <Row gap={0} align="stretch" style={{ minHeight: 400 }}>
                  <CasePdfPane theme={theme} />
                  <Stack gap={0} style={{ flex: 1, padding: 16, minWidth: 0 }}>
                    {detailTab === "extracted" && (
                      <Table
                        headers={["Field", "Value", "Status", "Confidence", "Agent", ""]}
                        rows={caseDef.mappingData.map((r) => {
                          const cp = confidencePill(r.confidence);
                          return [
                            r.field,
                            r.value,
                            <ExtractedBadge theme={theme} />,
                            <FigmaConfidenceBadge level={r.confidence} label={cp.label} theme={theme} />,
                            <AgentTag agentId={r.agentId} theme={theme} />,
                            <Button variant="ghost" onClick={() => setSelectedField(r.field)}>
                              Inspect
                            </Button>,
                          ];
                        })}
                        rowTone={caseDef.mappingData.map((r) =>
                          r.confidence === "review" ? "warning" : r.confidence === "high" ? "success" : "neutral"
                        )}
                        striped
                      />
                    )}
                    {detailTab === "exceptions" && (
                      <Stack gap={8}>
                        <Callout tone="warning" title="Review Agent exception">
                          Total Assets $100K — FY2024 was $98M; industry median $120M. Likely decimal error on p.43.
                        </Callout>
                        <Button variant="primary" onClick={() => setSelectedField("Total Assets")}>
                          Open Trust Inspector
                        </Button>
                      </Stack>
                    )}
                    {detailTab === "corrected" && (
                      <Text size="small" tone="tertiary">
                        No analyst corrections yet. Overrides are logged with reason and timestamp.
                      </Text>
                    )}
                  </Stack>
                </Row>
              </div>
              {selectedRow && (
                <TrustInspector
                  row={selectedRow}
                  theme={theme}
                  onClose={() => setSelectedField(null)}
                  onAccept={(field) => {
                    appendAudit({ kind: "mapping-accept", field });
                    setSelectedField(null);
                  }}
                  onOverride={(field) => {
                    appendAudit({ kind: "mapping-override", field });
                    setSelectedField(null);
                  }}
                />
              )}
              <ValidateRatiosPanel theme={theme} />
            </>
          )}

          {isNorthern && stageId !== "intake" && stageId !== "memo" && stageId !== "decision" && (
            <div style={dxpCard(theme)}>
              <Callout tone="warning" title="Pipeline held by Orchestrator">
                This stage has not started. Gate 1 is blocked on incomplete documents — see Intake stage trace for
                input, reasoning, and output. Downstream agents are queued but not assigned.
              </Callout>
            </div>
          )}

          {!isNorthern && stageId === "assessment" && (
            <Stack gap={12}>
              <RiskFormulaPanel theme={theme} />
              <Card>
                <CardHeader trailing={<AgentTag agentId="risk" theme={theme} />}>
                  Risk & covenant — Gate 3 pending
                </CardHeader>
                <CardBody>
                  <Callout tone="warning" title="Gate 3 — Risk officer review required">
                    Risk Agent has queued 14 ratios and 4 covenant tests. Risk officer must sign off before Memo Composer is released.
                  </Callout>
                  <GateSignOffBar
                    mode="gate3-sign"
                    theme={theme}
                    onAction={(action) => appendAudit(action)}
                  />
                </CardBody>
              </Card>
            </Stack>
          )}

          {!isNorthern && stageId === "memo" && (
            <Stack gap={12}>
              <ConnectorTrustPanel
                feeds={caseDef.connectorFeeds}
                entitySummary={caseDef.entitySummary}
                theme={theme}
              />
              <CreditMemoPreview sections={caseDef.memoSections} theme={theme} />
              <Card>
                <CardHeader trailing={<AgentTag agentId="memo" theme={theme} />}>
                  Gate 4 — Memo coherence review
                </CardHeader>
                <CardBody>
                  <Callout tone="info" title="Memo draft ready for review">
                    Memo Composer Agent has drafted all sections. Connector citations verified. Gate 4 sign-off releases Decision Synthesis Agent for committee package.
                  </Callout>
                  <GateSignOffBar
                    mode="gate4-sign"
                    theme={theme}
                    onAction={(action) => appendAudit(action)}
                  />
                </CardBody>
              </Card>
            </Stack>
          )}

          {isNorthern && stageId === "memo" && (
            <Stack gap={12}>
              <ConnectorTrustPanel
                feeds={caseDef.connectorFeeds}
                entitySummary={caseDef.entitySummary}
                theme={theme}
              />
              <CreditMemoPreview sections={caseDef.memoSections} theme={theme} />
            </Stack>
          )}

          {!isNorthern && stageId === "decision" && <DecisionRationalePanel theme={theme} />}

          {isNorthern && stageId === "decision" && (
            <div style={dxpCard(theme)}>
              <Callout tone="warning" title="Decision stage not available">
                Decision Agent requires approved memo with complete connector bundle. Resolve Gate 1 intake
                block first.
              </Callout>
            </div>
          )}

          {!isNorthern && (stageId === "extraction" || stageId === "mapping") && (
            <StageActivityCard
              stageId={stageId}
              theme={theme}
              onGoToReview={() => setStageId("review")}
            />
          )}
        </Stack>
      </Row>

      <CaseRuntimeLog entries={mergedLog} theme={theme} newEntryIds={newEntryIds} />
    </Stack>
  );
}

function CasesListView({
  theme,
  openCase,
}: {
  theme: FigmaTheme;
  openCase: (id: CaseId, stage?: StageId) => void;
}) {
  function riskTone(r: RiskStatus): "deleted" | "warning" | "success" {
    if (r === "High Risk") return "deleted";
    if (r === "Moderate Risk") return "warning";
    return "success";
  }
  function actionTone(a: CaseRowData["action"]): "primary" | "ghost" {
    return a === "Negotiate" ? "primary" : "ghost";
  }
  function caseForRow(row: CaseRowData): { caseId: CaseId; stage: StageId } {
    if (row.id.startsWith("WMT")) return { caseId: "walmart", stage: "review" };
    if (row.id.startsWith("AWM") || row.id.startsWith("NRT")) return { caseId: "northern-retail", stage: "intake" };
    return { caseId: "walmart", stage: "review" };
  }

  return (
    <Stack gap={12}>
      <InFocusBanner rows={CASE_ROWS} theme={theme} openCase={openCase} />

      <Row align="center" justify="space-between">
        <Row gap={8} align="center">
          <div
            style={{
              border: `1px solid ${theme.stroke.secondary}`,
              borderRadius: 4,
              padding: "4px 10px 4px 8px",
              display: "flex",
              gap: 6,
              alignItems: "center",
              fontSize: 12,
              color: theme.text.tertiary,
            }}
          >
            <span>⌕</span> Search
          </div>
          <div
            style={{
              border: `1px solid ${theme.stroke.secondary}`,
              borderRadius: 4,
              padding: "4px 10px",
              display: "flex",
              gap: 6,
              alignItems: "center",
              fontSize: 12,
              color: theme.text.tertiary,
            }}
          >
            ⊟ Filter
          </div>
        </Row>
        <Row gap={8} align="center">
          <Text size="small" tone="tertiary">1–8 of 8</Text>
          <AgentTag agentId="orchestrator" theme={theme} />
        </Row>
      </Row>

      <Table
        headers={[
          "",
          "Case (Entity)",
          "Trigger Type",
          "Extraction Conf.",
          "Exposure",
          "Net Margin %",
          "Health Score",
          "Risk Status",
          "Primary Concern",
          "Tasks",
          "Action",
        ]}
        rows={CASE_ROWS.map((row) => {
          const { caseId, stage } = caseForRow(row);
          return [
            <input type="checkbox" style={{ cursor: "pointer" }} />,
            <Row gap={6} align="center">
              <span style={{ color: theme.text.quaternary, fontSize: 11 }}>›</span>
              <Text weight="semibold" size="small">{row.entity}</Text>
            </Row>,
            row.triggerType,
            <ExtractionConfBadge pct={row.extractionConf} theme={theme} />,
            row.exposure,
            <Text
              size="small"
              style={{
                color: row.netMarginPct.startsWith("-") ? theme.diff.removedLine : theme.category.green,
              }}
            >
              {row.netMarginPct}
            </Text>,
            <HealthScorePill score={row.healthScore} theme={theme} />,
            <Pill tone={riskTone(row.riskStatus)}>• {row.riskStatus}</Pill>,
            <Text size="small" tone="secondary">{row.primaryConcern}</Text>,
            row.tasks > 0 ? (
              <span
                style={{
                  background: theme.accent.primary,
                  color: "#fff",
                  borderRadius: "50%",
                  width: 20,
                  height: 20,
                  fontSize: 11,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {String(row.tasks).padStart(2, "0")}
              </span>
            ) : (
              <Text size="small" tone="quaternary">N/A</Text>
            ),
            <Button
              variant={actionTone(row.action)}
              style={{ height: 28, fontSize: 11 }}
              onClick={() => openCase(caseId, stage)}
            >
              {row.action}
            </Button>,
          ];
        })}
        rowTone={CASE_ROWS.map((r) =>
          r.riskStatus === "High Risk" ? "danger" : r.riskStatus === "Moderate Risk" ? "warning" : undefined,
        )}
        striped
      />
    </Stack>
  );
}

function AgentCatalogView({ theme }: { theme: ReturnType<typeof useHostTheme> }) {
  const agentList = Object.values(AGENTS);
  const recentActions = [
    { time: "Mar 17, 6:02 AM", agentId: "review" as AgentId, action: "Flagged Total Assets outlier — WMT-TLB-2025" },
    { time: "Mar 17, 1:45 AM", agentId: "intake" as AgentId, action: "Blocked Gate 1 — NRTL-REV-2025 (2/9 docs)" },
    { time: "Mar 17, 6:00 AM", agentId: "sentinel" as AgentId, action: "Covenant breach alert — Walmart Current Ratio 0.79x" },
    { time: "Mar 16, 2:31 AM", agentId: "mapping" as AgentId, action: "Completed 138/140 mappings — WMT-TLB-2025" },
    { time: "Mar 16, 2:19 AM", agentId: "connector" as AgentId, action: "Synced Experian + Equifax + D&B on EIN 71-0415•••" },
  ];
  return (
    <Stack gap={16}>
      <div style={dxpCard(theme)}>
        <Stack gap={8}>
          <Row align="center" justify="space-between">
            <Text weight="semibold" size="small">
              Last 24h agent actions
            </Text>
            <AgentTag agentId="orchestrator" theme={theme} />
          </Row>
          <Table
            headers={["Time", "Agent", "Action"]}
            rows={recentActions.map((a) => [
              a.time,
              <AgentTag agentId={a.agentId} theme={theme} />,
              a.action,
            ])}
            striped
          />
        </Stack>
      </div>
      <Callout tone="info" title="Connector strategy">
        Connector Sync Agent orchestrates external APIs: Experian and Equifax business bureau scores (via EIN),
        D&B PAYDEX, AML/KYC entity screening (EIN), and guarantor/UBO identity (SSN or ITIN). Results flow into
        Memo Composer with source tags and into Decision Synthesis as weighted evidence.
      </Callout>
      <Text tone="secondary">
        Nine specialized agents + orchestrator. Each has visible identity, trust outputs, and optional human gates.
      </Text>
      <Grid columns={2} gap={12}>
        {agentList.map((a) => (
          <div key={a.id}>
            <Card>
              <CardHeader trailing={<AgentTag agentId={a.id} theme={theme} />}>{a.name}</CardHeader>
              <CardBody>
                <Stack gap={6}>
                  <Text size="small" tone="tertiary">
                    Stage: {a.stage}
                  </Text>
                  <Text size="small">{a.role}</Text>
                  {a.humanGate && <Pill tone="warning">{a.humanGate}</Pill>}
                  <Text size="small" weight="semibold">
                    Trust outputs
                  </Text>
                  <Text size="small" tone="secondary">
                    {a.trustOutputs.join(" · ")}
                  </Text>
                </Stack>
              </CardBody>
            </Card>
          </div>
        ))}
      </Grid>
    </Stack>
  );
}

export default function FinancialSpreadingACOS() {
  const theme = useHostTheme();
  const [view, setView] = useCanvasState<View>("acosView", "command");
  const [caseId, setCaseId] = useCanvasState<CaseId>("activeCaseId", "walmart");
  const [, setStageId] = useCanvasState<StageId>("caseStage", "review");

  const openCase = (id: CaseId, stage?: StageId) => {
    setCaseId(id);
    setStageId(stage ?? CASES[id].defaultStage);
    setView("case");
  };

  const caseContext = view === "case" ? `${CASES[caseId].title} · ${CASES[caseId].caseRef}` : undefined;

  return (
    <Stack gap={8}>
      <DxpShell view={view} setView={setView} theme={theme} caseContext={caseContext}>
        {view === "command" && <CommandCenterView openCase={openCase} setView={setView} theme={theme} />}
        {view === "portfolio" && <PortfolioView openCase={openCase} theme={theme} />}
        {view === "caselist" && <CasesListView theme={theme} openCase={openCase} />}
        {view === "case" && <CaseWorkspaceView theme={theme} />}
        {view === "agents" && <AgentCatalogView theme={theme} />}
      </DxpShell>
      <Text size="small" tone="quaternary" style={{ padding: "0 16px" }}>
        Demo arc: Portfolio Sentinel alert → Case briefing → Lifecycle trace → Trust inspector → Connected decision
      </Text>
    </Stack>
  );
}
