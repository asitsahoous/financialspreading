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
  Pill,
  Row,
  Spacer,
  Stack,
  Table,
  Text,
  useCanvasState,
  useHostTheme,
} from "./ui";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { resetDemoSession, showActionToast } from "./state";
import { renderTextWithSopLinks, SopLink, SopViewerPanel } from "./sopPolicy";
import { CompanySpreadView } from "./financials/CompanySpreadView";
import type { CompanyId } from "./financials/dataset";
import {
  BACKEND_WIRED_MAPPING_FIELDS,
  backendGatesToSignedKinds,
  ensureBackendCase,
  fetchBackendCase,
  fetchBackendDocuments,
  overrideBackendField,
  receiveBackendDocument,
  signBackendGate,
  type BackendCaseRole,
  type BackendGateId,
} from "./backendCase";

/** Minimal shape used for click-outside checks — avoids importing React.MouseEvent, which
 *  is not exported the same way across the app's Vite/@types-react setup and the Canvas
 *  TypeScript environment. */
type ClickTarget = { target: EventTarget | null; currentTarget: EventTarget | null };
/** Minimal shape used for text input/textarea change handlers — same portability reason as ClickTarget. */
type ChangeTarget = { target: { value: string } };

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

function downloadExportFile(filename: string, body: string, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([body], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function ActionToastBanner({ theme }: { theme: FigmaTheme }) {
  const [toast] = useCanvasState<string>("actionToast", "");
  if (!toast) return null;
  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 300,
        background: theme.bg.editor,
        border: `1px solid ${theme.stroke.secondary}`,
        borderRadius: 8,
        padding: "10px 14px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
        fontSize: 12,
        maxWidth: 360,
      }}
    >
      {toast}
    </div>
  );
}

function useDismissOnOutside(open: boolean, onClose: () => void, rootRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, rootRef]);
}

function ActionsMenu({
  theme,
  label,
  menuKey,
  items,
}: {
  theme: FigmaTheme;
  label: string;
  menuKey: string;
  items: { label: string; onClick: () => void }[];
}) {
  const [open, setOpen] = useCanvasState<boolean>(menuKey, false);
  const rootRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), [setOpen]);
  useDismissOnOutside(open, close, rootRef);
  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <Button variant="ghost" style={{ height: 28, fontSize: 11 }} onClick={() => setOpen(!open)}>
        {label}
      </Button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: 32,
            right: 0,
            background: theme.bg.editor,
            border: `1px solid ${theme.stroke.secondary}`,
            borderRadius: 8,
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
            zIndex: 60,
            minWidth: 180,
            overflow: "hidden",
          }}
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                item.onClick();
                setOpen(false);
              }}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "8px 12px",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 12,
                fontFamily: "Inter, sans-serif",
                color: theme.text.primary,
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function dxpCard(theme: FigmaTheme): CSSProperties {
  return {
    background: theme.bg.editor,
    border: `1px solid ${theme.stroke.secondary}`,
    borderRadius: 8,
    padding: "12px 16px",
  };
}

function navHighlightView(view: View): View {
  return view === "case" ? "caselist" : view;
}

function DxpLeftNav({
  theme,
  activeView,
  onNav,
}: {
  theme: FigmaTheme;
  activeView: View;
  onNav: (view: View) => void;
}) {
  const highlighted = navHighlightView(activeView);
  const navItems: { label: string; title: string; view: View }[] = [
    { label: "⌂", title: "Home — Command Center", view: "command" },
    { label: "⌕", title: "Search — Cases", view: "caselist" },
    { label: "☰", title: "Hub — InSight", view: "portfolio" },
    { label: "☷", title: "Apps — Agent Catalog", view: "agents" },
  ];
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
          {navItems.map((item) => {
            const isActive = item.view === highlighted;
            return (
              <button
                key={item.label}
                type="button"
                title={item.title}
                aria-label={item.title}
                aria-current={isActive ? "page" : undefined}
                onClick={() => onNav(item.view)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  color: theme.text.tertiary,
                  background: isActive ? theme.fill.secondary : "transparent",
                  border: "none",
                  borderLeft: isActive ? `2px solid ${theme.accent.primary}` : "none",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                {item.label}
              </button>
            );
          })}
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
  onHubClick,
  onTitleClick,
  onBackToList,
}: {
  title: string;
  theme: FigmaTheme;
  caseContext?: string;
  onHubClick?: () => void;
  onTitleClick?: () => void;
  onBackToList?: () => void;
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
        {onBackToList && (
          <span
            onClick={onBackToList}
            style={{ cursor: "pointer", fontSize: 14, color: theme.text.tertiary, marginRight: 4 }}
          >
            ←
          </span>
        )}
        <span
          onClick={onHubClick}
          style={{ cursor: onHubClick ? "pointer" : "default", fontSize: 12, color: theme.text.secondary }}
        >
          Hub
        </span>
        <Text size="small" tone="quaternary" as="span">/</Text>
        <span
          onClick={onTitleClick}
          style={{ cursor: onTitleClick ? "pointer" : "default", fontSize: 12, color: theme.text.secondary }}
        >
          {title}
        </span>
        {caseContext && (
          <>
            <Text size="small" tone="quaternary" as="span">/</Text>
            <Text size="small" weight="semibold" as="span">{caseContext}</Text>
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
  onClick,
  active,
  testId,
}: {
  level: "high" | "review" | "missing";
  label: string;
  theme: FigmaTheme;
  /** When provided, the badge becomes a clickable filter toggle instead of a static status pill. */
  onClick?: () => void;
  active?: boolean;
  testId?: string;
}) {
  const styles: Record<typeof level, { bg: string; fg: string }> = {
    high: { bg: theme.fill.tertiary, fg: theme.category.green },
    review: { bg: theme.fill.tertiary, fg: theme.category.orange },
    missing: { bg: theme.fill.tertiary, fg: theme.diff.removedLine },
  };
  const s = styles[level];
  return (
    <span
      role={onClick ? "button" : undefined}
      data-testid={testId}
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "4px 8px",
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 500,
        lineHeight: "16px",
        background: active ? s.fg : s.bg,
        color: active ? "#fff" : s.fg,
        border: `1px solid ${active ? s.fg : theme.stroke.tertiary}`,
        cursor: onClick ? "pointer" : undefined,
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

type CaseDetailTab = "extracted" | "exceptions" | "corrected" | "normalized";

function CaseDetailsTabBar({
  active,
  onChange,
  theme,
  counts,
}: {
  active: CaseDetailTab;
  onChange: (t: CaseDetailTab) => void;
  theme: FigmaTheme;
  counts: { extracted: number; exceptions: number; corrected: number; normalized: number };
}) {
  const tabs: { id: CaseDetailTab; label: string }[] = [
    { id: "extracted", label: `Extracted (${counts.extracted})` },
    { id: "exceptions", label: `Exceptions (${counts.exceptions})` },
    { id: "corrected", label: `Corrected (${counts.corrected})` },
    { id: "normalized", label: `Normalized (${counts.normalized})` },
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
  onOpenCreditPolicy,
  onOpenTrustLayer,
}: {
  children: ReactNode;
  view: View;
  setView: (v: View) => void;
  theme: FigmaTheme;
  caseContext?: string;
  onOpenCreditPolicy?: () => void;
  onOpenTrustLayer?: () => void;
}) {
  const [assistOpen, setAssistOpen] = useCanvasState<boolean>("insightAssistOpen", true);
  const [, setCreateCaseOpen] = useCanvasState<boolean>("createCaseOpen", false);
  const tabs: { id: View; label: string }[] = [
    { id: "command", label: "Command Center" },
    { id: "portfolio", label: "InSight" },
    { id: "caselist", label: "Cases" },
    { id: "spreading", label: "Financial Spread" },
    { id: "agents", label: "Agents" },
  ];
  return (
    <Row align="stretch" style={{ minHeight: 640, fontFamily: "Inter, sans-serif" }}>
      <DxpLeftNav theme={theme} activeView={view} onNav={setView} />
      <Stack
        gap={0}
        style={{
          flex: 1,
          padding: "16px 12px 16px 0",
          minWidth: 0,
        }}
      >
        <DxpBreadcrumb
          title="Case Explorer"
          theme={theme}
          caseContext={caseContext}
          onHubClick={() => setView("command")}
          onTitleClick={() => setView("caselist")}
          onBackToList={caseContext ? () => setView("caselist") : undefined}
        />
        <DxpTabBar
          tabs={tabs}
          active={navHighlightView(view)}
          onChange={setView}
          theme={theme}
          trailing={
            <Row gap={8} align="center">
              {onOpenTrustLayer && (
                <Button
                  variant="ghost"
                  style={{ height: 28, fontSize: 12, borderRadius: 4 }}
                  onClick={onOpenTrustLayer}
                  data-testid="trust-layer-button"
                >
                  Trust Layer
                </Button>
              )}
              {onOpenCreditPolicy && (
                <Button
                  variant="ghost"
                  style={{ height: 28, fontSize: 12, borderRadius: 4 }}
                  onClick={onOpenCreditPolicy}
                  data-testid="credit-policy-button"
                >
                  Credit Policy
                </Button>
              )}
              <Button
                variant="ghost"
                style={{ height: 28, fontSize: 12, borderRadius: 4 }}
                onClick={() => {
                  if (window.confirm("Reset all demo interactions (gates, audit log, filters)?")) {
                    resetDemoSession();
                  }
                }}
              >
                Reset demo
              </Button>
              <Button
                variant="primary"
                style={{ height: 28, fontSize: 12, borderRadius: 4 }}
                onClick={() => {
                  setCreateCaseOpen(true);
                  setView("caselist");
                }}
              >
                + Case
              </Button>
              <span style={{ width: 1, height: 20, background: theme.stroke.secondary }} />
              <button
                type="button"
                title={assistOpen ? "Hide InSight Assist" : "Show InSight Assist"}
                onClick={() => setAssistOpen(!assistOpen)}
                style={{
                  width: 24,
                  height: 24,
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: 16,
                  color: theme.text.tertiary,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {assistOpen ? "◧" : "▷"}
              </button>
            </Row>
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

/** Five human gates — governance anchors across the ACOS trust layer. */
const TRUST_GATES = [
  {
    id: 1,
    label: "Gate 1",
    title: "Confirm document set",
    agent: "Intake Agent",
    sop: "§4.2",
    why: "Agents halt extraction on incomplete packages — humans sign before any spread work begins.",
  },
  {
    id: 2,
    label: "Gate 2",
    title: "Sign off spread",
    agent: "Mapping + Review QA",
    sop: "§7.7",
    why: "Exceptions surface with page-level lineage — Risk Agent cannot run until analysts approve the spread.",
  },
  {
    id: 3,
    label: "Gate 3",
    title: "Risk officer review",
    agent: "Risk Agent",
    sop: "Covenant schedule",
    why: "Ratio formulas and covenant tests are agent-calculated — risk officers govern release to memo.",
  },
  {
    id: 4,
    label: "Gate 4",
    title: "Memo coherence review",
    agent: "Memo Composer",
    sop: "§12",
    why: "Every memo paragraph cites connector APIs — analysts verify bureau and AML/KYC evidence before committee.",
  },
  {
    id: 5,
    label: "Gate 5",
    title: "Credit committee decision",
    agent: "Decision Synthesis",
    sop: "Committee policy",
    why: "Decision rationale tree aggregates spread, connectors, and qualitative risk — committee signs the outcome.",
  },
] as const;

/** InSight DXP Trust Fabric — four pillars mapped to lending demo surfaces (gates remain primary). */
const TRUST_FABRIC_PILLARS = [
  {
    id: "sources",
    label: "Trusted Sources",
    short: "Sources",
    color: "#1860ec",
    demo: "Connector APIs on EIN/DUNS · document manifest per SOP §4.2",
    example: "Northern Retail: 2/9 docs — Intake Agent halts before spread. Walmart memo: Experian/Equifax/D&B synced on borrower EIN.",
  },
  {
    id: "evidence",
    label: "Trusted Evidence",
    short: "Evidence",
    color: "#6b7280",
    demo: "Uploaded policy + source PDFs with lifecycle and § linkage",
    example: "10-K page 43 in split-pane · §7.4 mapping rule opens Credit Policy viewer · seven-stage lifecycle rail.",
  },
  {
    id: "reasoning",
    label: "Trusted Reasoning",
    short: "Reasoning",
    color: "#1f8a65",
    demo: "Per-field confidence, agent reasoning, human correction lineage",
    example: "Walmart Total Assets 41% confidence — Trust Inspector shows OCR lineage and change log before Gate 2.",
  },
  {
    id: "action",
    label: "Trusted Action",
    short: "Action",
    color: "#6b4c9a",
    demo: "Gated orchestration, masked identifiers, immutable runtime log",
    example: "Orchestrator blocks Risk Agent until Gate 2 signed · connector IDs masked in UI · every accept/override appends to audit log.",
  },
] as const;

const TRUST_FABRIC_TAGLINE =
  "InSight governs evidence across the fabric — it does not replace your system of record. Five human gates are the lending checkpoints on top.";

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

const MAPPING_CORE_ROWS: MappingRow[] = [
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
    // Name matches backend/graph/nodes/document_intel.py's FIELD_TEMPLATES
    // exactly ("Receivables, net", not "Accounts Receivable") so this field
    // is wireable — see BACKEND_WIRED_MAPPING_FIELDS in backendCase.ts.
    field: "Receivables, net",
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
    sop: "§7.7",
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
    sop: "§8.2",
    source: "10-K p.44",
    reasoning: "Debt schedule footnote cross-validated; covenant schedule §3.1 consistent.",
    auditId: "trace-8843-wmt-debt",
  },
  {
    field: "Shareholders Equity",
    value: "$14,850M",
    confidence: "high",
    agentId: "mapping",
    sop: "§8.7",
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

const MAPPING_SYNTHETIC_FIELDS = [
  "Prepaid Expenses",
  "Other Current Assets",
  "Property Plant & Equipment",
  "Accumulated Depreciation",
  "Goodwill",
  "Intangible Assets",
  "Short-term Borrowings",
  "Accounts Payable",
  "Accrued Liabilities",
  "Deferred Revenue",
  "Current Portion LT Debt",
  "Operating Lease Liabilities",
  "Retained Earnings",
  "Treasury Stock",
  "Cost of Goods Sold",
  "Gross Profit",
  "Operating Expenses",
  "SG&A",
  "Depreciation & Amortization",
  "Interest Expense",
  "Income Tax Expense",
  "Net Income",
  "EBITDA",
  "Working Capital",
  "Free Cash Flow",
  "CapEx",
  "Dividends Paid",
  "Inventory - Finished Goods",
  "Inventory - Raw Materials",
  "Deferred Tax Assets",
];

const MAPPING_DATA: MappingRow[] = (() => {
  const core = MAPPING_CORE_ROWS;
  const target = 140;
  const extras: MappingRow[] = [];
  for (let i = 0; i < target - core.length; i++) {
    const label = MAPPING_SYNTHETIC_FIELDS[i % MAPPING_SYNTHETIC_FIELDS.length];
    const suffix = i >= MAPPING_SYNTHETIC_FIELDS.length ? ` (${Math.floor(i / MAPPING_SYNTHETIC_FIELDS.length) + 1})` : "";
    extras.push({
      field: `${label}${suffix}`,
      value: `$${(420 + i * 17).toLocaleString()}M`,
      confidence: "high",
      agentId: "mapping",
      sop: `§${7 + (i % 4)}.${(i % 6) + 1}`,
      source: `10-K p.${38 + (i % 18)}`,
      reasoning: "Auto-mapped per COA template; OCR confidence ≥95%; within YoY tolerance.",
      auditId: `trace-wmt-synth-${i + 1}`,
    });
  }
  return [...core, ...extras];
})();

// GAAP normalization — raw line item broken into internal chart-of-account components
type NormalizedRow = { lineItem: string; component: string; fy2025: string; fy2026: string; indent: number };

const NORMALIZED_VALUES: NormalizedRow[] = [
  { lineItem: "Current Assets", component: "—", fy2025: "$79,458M", fy2026: "$84,874M", indent: 0 },
  { lineItem: "Cash", component: "Time Deposits", fy2025: "$3,167M", fy2026: "$4,987M", indent: 1 },
  { lineItem: "Cash", component: "Marketable Securities", fy2025: "$5,870M", fy2026: "$5,740M", indent: 1 },
  { lineItem: "Receivables", component: "Accounts Receivable - Trade", fy2025: "$9,975M", fy2026: "$11,547M", indent: 1 },
  { lineItem: "Receivables", component: "Bad Debt Reserve", fy2025: "($312M)", fy2026: "($298M)", indent: 1 },
  { lineItem: "Receivables", component: "Less: Due From Related Co", fy2025: "($104M)", fy2026: "($98M)", indent: 1 },
  { lineItem: "Receivables", component: "Due From Related Co", fy2025: "$104M", fy2026: "$98M", indent: 1 },
  { lineItem: "Receivables", component: "Accounts Receivable - Other", fy2025: "$1,412M", fy2026: "$1,556M", indent: 1 },
  { lineItem: "Receivables", component: "Reserve for Receivable", fy2025: "($187M)", fy2026: "($172M)", indent: 1 },
  { lineItem: "Receivables", component: "Deferred Income Tax Recoverable", fy2025: "$96M", fy2026: "$104M", indent: 1 },
  { lineItem: "Inventories", component: "Raw Materials", fy2025: "$8,210M", fy2026: "$8,940M", indent: 1 },
  { lineItem: "Inventories", component: "Finished Goods", fy2025: "$48,225M", fy2026: "$49,911M", indent: 1 },
];

type CaseId = "walmart" | "northern-retail";

type IntakeDocRow = {
  name: string;
  received: boolean;
  sopRef: string;
  classification?: string;
  uploadedBy?: string;
  uploadedOn?: string;
  sizeKb?: number;
  uploadedFileName?: string;
};

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
    body: "Walmart Inc. — Term Loan B request $750M (negotiated structure: $250M revolver + $500M asset-backed line). Spread reflects FY2025 10-K; 1 mapping exception under review.",
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

type GateSignKind = "gate1-sign" | "gate2-sign" | "gate3-sign" | "gate4-sign" | "gate5-sign";

type IntakeDocOverride = Pick<
  IntakeDocRow,
  "received" | "uploadedBy" | "uploadedOn" | "sizeKb" | "classification" | "uploadedFileName"
>;
type IntakeDocOverridesByCase = Partial<Record<CaseId, Record<string, IntakeDocOverride>>>;

type DemoPortfolioContext = { entity: string; concern: string } | null;

type AuditEvent = RuntimeLogEntry & { id: string; caseId: CaseId; gateAction?: GateSignKind };

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
    defaultStage: "intake",
    trustScore: "94%",
    openExceptions: 1,
    agentTimeSaved: "~2.5 days",
    traces: WALMART_TRACES,
    runtimeLog: WALMART_RUNTIME_LOG,
    mappingData: MAPPING_DATA,
    // Names/sopRefs match backend/graph/nodes/intake.py's SOP_MANIFEST for
    // "term_loan_b" exactly, so this list can be marked received on the real
    // backend case via backendCase.ts instead of only local fixture state.
    intakeDocs: [
      { name: "10-K Annual Filing", received: true, sopRef: "§4.2.1", classification: "Annual Filing", uploadedBy: "Chloe Nile", uploadedOn: "04/07/2026", sizeKb: 1024 },
      { name: "Credit Application", received: true, sopRef: "§4.2.2", classification: "Application", uploadedBy: "Chloe Nile", uploadedOn: "04/07/2026", sizeKb: 310 },
      { name: "Q3 Cash Flow Statement", received: true, sopRef: "§4.2.3", classification: "Cash-Flow Report", uploadedBy: "Chloe Nile", uploadedOn: "04/07/2026", sizeKb: 500 },
      { name: "Covenant Schedule", received: true, sopRef: "§4.2.4", classification: "Covenant Schedule", uploadedBy: "Chloe Nile", uploadedOn: "04/07/2026", sizeKb: 220 },
      { name: "Auditor Letter", received: true, sopRef: "§4.2.5", classification: "Auditor Letter", uploadedBy: "Chloe Nile", uploadedOn: "04/07/2026", sizeKb: 180 },
      { name: "Management Representation", received: true, sopRef: "§4.2.6", classification: "Management Representation", uploadedBy: "Chloe Nile", uploadedOn: "04/07/2026", sizeKb: 210 },
      { name: "Intercompany Schedule", received: true, sopRef: "§4.2.7", classification: "Intercompany Schedule", uploadedBy: "Chloe Nile", uploadedOn: "04/07/2026", sizeKb: 340 },
      { name: "Guarantor Financials", received: true, sopRef: "§4.2.8", classification: "Guarantor Financials", uploadedBy: "Chloe Nile", uploadedOn: "04/07/2026", sizeKb: 700 },
      { name: "Collateral Appraisal", received: true, sopRef: "§4.2.9", classification: "Collateral Appraisal", uploadedBy: "Chloe Nile", uploadedOn: "04/07/2026", sizeKb: 980 },
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
    // Names/sopRefs match backend/graph/nodes/intake.py's SOP_MANIFEST for
    // "term_loan_b" exactly — see the matching comment on CASES.walmart above.
    intakeDocs: [
      { name: "Credit Application", received: true, sopRef: "§4.2.2", classification: "Application", uploadedBy: "Borrower Portal", uploadedOn: "Mar 17, 1:42 AM", sizeKb: 310 },
      { name: "10-K Annual Filing", received: true, sopRef: "§4.2.1", classification: "Annual Filing", uploadedBy: "Borrower Portal", uploadedOn: "Mar 17, 1:42 AM", sizeKb: 1980 },
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

type View = "command" | "portfolio" | "caselist" | "case" | "agents" | "spreading";

// ─── Case list data ──────────────────────────────────────────────────────────

type RiskStatus = "Low Risk" | "Moderate Risk" | "High Risk";
type CaseRowData = {
  id: string;
  entity: string;
  stageBadge: string;
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
    stageBadge: "Spreading",
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
    stageBadge: "Floor Plan · Covenant Breach",
    triggerType: "Covenant Breach",
    extractionConf: 68,
    exposure: "$59.4M",
    netMarginPct: "-3.40%",
    healthScore: 2.1,
    riskStatus: "High Risk",
    primaryConcern: "Debt Service Failure",
    tasks: 3,
    action: "Resolve",
    aiBlurb:
      "DSCR 0.00x — EBIT turned negative and can no longer service floor-plan debt. Inventory utilization climbing toward the 80% ceiling (SOP §3.4). Immediate restructuring conversation required.",
  },
  {
    id: "TRC-003",
    entity: "Tesla Rental Corp",
    stageBadge: "Liquidity Review",
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
    stageBadge: "Variance Review",
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
    stageBadge: "Annual Review",
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
    stageBadge: "Monthly Review",
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
    stageBadge: "Fleet Assessment",
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
    stageBadge: "Annual Review",
    triggerType: "Annual Review",
    extractionConf: 95,
    exposure: "$19.5M",
    netMarginPct: "2.30%",
    healthScore: 7.1,
    riskStatus: "Low Risk",
    primaryConcern: "None (Performing)",
    tasks: 0,
    action: "Review",
    aiBlurb: "Clean financials — all ratios within covenant bounds, improving D/E trend. Annual re-certification eligible for fast-track per SOP §4.4.",
  },
  {
    id: "NRT-009",
    entity: "Northern Retail LLC",
    stageBadge: "Intake Blocked",
    triggerType: "Revolving Credit",
    extractionConf: 22,
    exposure: "$8.5M",
    netMarginPct: "-14.30%",
    healthScore: 2.4,
    riskStatus: "High Risk",
    primaryConcern: "Incomplete Doc Set",
    tasks: 7,
    action: "Resolve",
    aiBlurb:
      "Gate 1 blocked — only 2 of 9 documents per SOP §4.2. Intake Agent halted the pipeline; human override is audited but Gate 1 does not pass until documents arrive.",
  },
];

/** Maps portfolio list row IDs to the interactive demo case workspace + stage. */
function caseRouteForRowId(rowId: string): { caseId: CaseId; stage: StageId } {
  if (rowId.startsWith("NRT")) return { caseId: "northern-retail", stage: "intake" };
  if (rowId.startsWith("WMT") || rowId.startsWith("CHY") || rowId.startsWith("TRC")) {
    return { caseId: "walmart", stage: "intake" };
  }
  if (rowId.startsWith("AWM") || rowId.startsWith("VNT") || rowId.startsWith("HRZ") || rowId.startsWith("MBE") || rowId.startsWith("SXT")) {
    return { caseId: "walmart", stage: "assessment" };
  }
  return { caseId: "walmart", stage: "memo" };
}

// ─── Ratio / Validate data ────────────────────────────────────────────────────

type RatioTab = "summary" | "liquidity" | "profitability" | "solvency" | "efficiency";

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
  efficiency: [
    {
      label: "Asset Turnover",
      actual: 2.28,
      threshold: 2.0,
      unit: "x",
      status: "pass",
      explanation: "Revenue generated per dollar of assets is above the 2.0x efficiency benchmark for retail.",
      trend2025: [2.10, 2.14, 2.16, 2.18, 2.20, 2.23, 2.26, 2.28],
      trend2024: [2.05, 2.08, 2.10, 2.12, 2.14, 2.16, 2.18, 2.20],
      trendLabel: "2.28",
      trendChange: "+4%",
      trendChangeTone: "positive",
    },
    {
      label: "Inventory Turnover",
      actual: 8.34,
      threshold: 7.5,
      unit: "x",
      status: "pass",
      explanation: "Inventory cycles 8.3x per year — faster than the 7.5x industry benchmark, indicating strong sell-through.",
      trend2025: [7.8, 7.9, 8.0, 8.1, 8.15, 8.2, 8.28, 8.34],
      trend2024: [7.5, 7.6, 7.7, 7.75, 7.8, 7.85, 7.9, 7.95],
      trendLabel: "8.34",
      trendChange: "+5%",
      trendChangeTone: "positive",
    },
    {
      label: "Days Sales Outstanding",
      actual: 6.3,
      threshold: 7.0,
      unit: " days",
      status: "pass",
      explanation: "Receivables collected in 6.3 days on average — better than the 7.0 day policy target.",
      trend2025: [6.8, 6.7, 6.6, 6.5, 6.4, 6.35, 6.32, 6.3],
      trend2024: [7.0, 6.9, 6.85, 6.8, 6.75, 6.7, 6.65, 6.6],
      trendLabel: "6.3d",
      trendChange: "-4%",
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
  trustNote,
}: {
  gate: string;
  reviewMin: string;
  stageLabel: string;
  theme: FigmaTheme;
  onViewStage?: () => void;
  trustNote?: string;
}) {
  return (
    <Stack gap={4}>
      {trustNote && (
        <Text size="small" tone="tertiary" style={{ fontStyle: "italic" }}>
          {trustNote}
        </Text>
      )}
      <Row
        align="center"
        justify="space-between"
        style={{
          marginTop: trustNote ? 0 : 4,
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
    </Stack>
  );
}

function TrustFabricFlowStrip({ theme: _theme, compact }: { theme: FigmaTheme; compact?: boolean }) {
  return (
    <Stack gap={compact ? 4 : 6}>
      <Row gap={4} wrap align="center" data-testid="trust-fabric-flow">
        {TRUST_FABRIC_PILLARS.map((p, i) => (
          <Row key={p.id} gap={4} align="center">
            <Row gap={5} align="center">
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: p.color,
                  flexShrink: 0,
                }}
                aria-hidden
              />
              <Text size="small" weight={compact ? "regular" : "semibold"} as="span" style={{ color: p.color }}>
                {compact ? p.short : p.label}
              </Text>
            </Row>
            {i < TRUST_FABRIC_PILLARS.length - 1 && (
              <Text size="small" tone="quaternary" as="span">
                →
              </Text>
            )}
          </Row>
        ))}
      </Row>
      {!compact && (
        <Text size="small" tone="tertiary">
          {TRUST_FABRIC_TAGLINE}
        </Text>
      )}
    </Stack>
  );
}

function TrustGateLadder({ theme, highlightGate }: { theme: FigmaTheme; highlightGate?: number }) {
  return (
    <Stack gap={6}>
      <Row gap={4} wrap align="center">
        {TRUST_GATES.map((g, i) => (
          <Row key={g.id} gap={4} align="center">
            <div
              style={{
                padding: "4px 8px",
                borderRadius: 6,
                border: `1px solid ${highlightGate === g.id ? theme.accent.primary : theme.stroke.secondary}`,
                background: highlightGate === g.id ? theme.fill.tertiary : theme.bg.editor,
                fontSize: 10,
                lineHeight: 1.3,
                minWidth: 72,
              }}
            >
              <Text weight="semibold" size="small" as="span">
                {g.label}
              </Text>
              <Text size="small" tone="quaternary" as="span">
                {g.title}
              </Text>
            </div>
            {i < TRUST_GATES.length - 1 && (
              <Text size="small" tone="quaternary" as="span">
                →
              </Text>
            )}
          </Row>
        ))}
      </Row>
      <Text size="small" tone="tertiary">
        Agents run between gates · Humans approve at each checkpoint · Policy anchors every block
      </Text>
    </Stack>
  );
}

function TrustLayerBanner({
  theme,
  onOpenTrustLayer,
  onOpenCreditPolicy,
}: {
  theme: FigmaTheme;
  onOpenTrustLayer?: () => void;
  onOpenCreditPolicy?: () => void;
}) {
  return (
    <div style={{ ...dxpCard(theme), padding: "12px 16px" }}>
      <Stack gap={10}>
        <Row align="start" justify="space-between" wrap gap={8}>
          <Stack gap={4} style={{ flex: 1, minWidth: 200 }}>
            <Row gap={8} align="center">
              <Text weight="semibold">ACOS Trust Layer</Text>
              <Pill tone="info">Agents operate · Humans govern</Pill>
            </Row>
            <Text size="small" tone="secondary">
              Not a spreadsheet with a chatbot — ten named agents do cognitive work (spreading, exceptions, covenant
              scans), five human gates govern release, and every action traces to uploaded SOP clauses and runtime audit
              events.
            </Text>
            <TrustFabricFlowStrip theme={theme} compact />
          </Stack>
          <Row gap={6} align="center">
            {onOpenTrustLayer && (
              <Button variant="primary" style={{ height: 28, fontSize: 11 }} onClick={onOpenTrustLayer}>
                View trust model
              </Button>
            )}
            {onOpenCreditPolicy && (
              <Button variant="ghost" style={{ height: 28, fontSize: 11 }} onClick={onOpenCreditPolicy}>
                Credit Policy
              </Button>
            )}
          </Row>
        </Row>
        <TrustGateLadder theme={theme} />
      </Stack>
    </div>
  );
}

function TrustLayerPanel({
  open,
  onClose,
  theme,
  onOpenCreditPolicy,
  onNavigateAgents,
}: {
  open: boolean;
  onClose: () => void;
  theme: FigmaTheme;
  onOpenCreditPolicy?: () => void;
  onNavigateAgents?: () => void;
}) {
  if (!open) return null;
  const agentList = Object.values(AGENTS);
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
          width: 460,
          maxWidth: "100%",
          height: "100%",
          background: theme.bg.editor,
          borderLeft: `1px solid ${theme.stroke.secondary}`,
          padding: 20,
          overflow: "auto",
          boxShadow: "-4px 0 24px rgba(0,0,0,0.12)",
        }}
        onClick={(e) => e.stopPropagation()}
        data-testid="trust-layer-panel"
      >
        <Stack gap={14}>
          <Row align="center" justify="space-between">
            <Text weight="semibold">ACOS Trust Layer</Text>
            <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18 }}>
              ×
            </button>
          </Row>
          <Text size="small" tone="tertiary">
            Demo fixture · read-only governance model
          </Text>
          <TrustFabricFlowStrip theme={theme} />
          <Callout tone="info" title="Why trust is the product differentiator">
            Evalueserve sells accuracy. Moody's sells integrated content. ACOS sells orchestration you can see — from
            portfolio alert to cell-level lineage, with humans signing at five named gates. The Trust Fabric below maps
            platform pillars to what you see in Walmart and Northern Retail demos.
          </Callout>
          <Stack gap={8}>
            <Text weight="semibold" size="small">
              Trust Fabric · lending surfaces
            </Text>
            <Text size="small" tone="tertiary">
              Gates (G1–G5) govern release; fabric pillars show where evidence is sourced, verified, reasoned, and
              acted on.
            </Text>
            <Grid columns={1} gap={8}>
              {TRUST_FABRIC_PILLARS.map((p) => (
                <div
                  key={p.id}
                  style={{
                    ...dxpCard(theme),
                    padding: 10,
                    borderLeft: `3px solid ${p.color}`,
                  }}
                >
                  <Row gap={8} align="center" wrap>
                    <div
                      style={{ width: 8, height: 8, borderRadius: "50%", background: p.color, flexShrink: 0 }}
                      aria-hidden
                    />
                    <Text weight="semibold" size="small" style={{ color: p.color }}>
                      {p.label}
                    </Text>
                  </Row>
                  <Text size="small" tone="secondary" style={{ marginTop: 4 }}>
                    {p.demo}
                  </Text>
                  <Text size="small" tone="tertiary" style={{ marginTop: 4, fontStyle: "italic" }}>
                    Demo: {p.example}
                  </Text>
                </div>
              ))}
            </Grid>
          </Stack>
          <Stack gap={8}>
            <Text weight="semibold" size="small">
              ACOS governance (gates + agents)
            </Text>
            <Grid columns={1} gap={8}>
              <div style={{ ...dxpCard(theme), padding: 10 }}>
                <Text weight="semibold" size="small">
                  Human gates
                </Text>
                <Text size="small" tone="secondary">
                  Five checkpoints where analysts, risk officers, and committee must sign before agents advance the
                  pipeline. Overrides are logged but do not bypass gates.
                </Text>
              </div>
              <div style={{ ...dxpCard(theme), padding: 10 }}>
                <Text weight="semibold" size="small">
                  Agent traces
                </Text>
                <Text size="small" tone="secondary">
                  Every stage records who acted (agent, human, system), structured input/reasoning/output, and runtime
                  audit events — not black-box scores.
                </Text>
              </div>
              <div style={{ ...dxpCard(theme), padding: 10 }}>
                <Text weight="semibold" size="small">
                  Policy anchors
                </Text>
                <Text size="small" tone="secondary">
                  Uploaded credit policy (SOP §4.2 manifest, §7.4 mapping, §12 AML/KYC) binds agent behavior. Click any §
                  link in the UI to open the policy viewer.
                </Text>
              </div>
            </Grid>
          </Stack>
          <Stack gap={8}>
            <Text weight="semibold" size="small">
              Five human gates
            </Text>
            {TRUST_GATES.map((g) => (
              <div key={g.id} style={{ ...dxpCard(theme), padding: 10 }}>
                <Row gap={8} align="center" wrap>
                  <Pill tone="warning">{g.label}</Pill>
                  <Text weight="semibold" size="small">
                    {g.title}
                  </Text>
                </Row>
                <Text size="small" tone="tertiary" style={{ marginTop: 4 }}>
                  {g.agent} · SOP {g.sop}
                </Text>
                <Text size="small" tone="secondary" style={{ marginTop: 4 }}>
                  {g.why}
                </Text>
              </div>
            ))}
          </Stack>
          <Stack gap={8}>
            <Row align="center" justify="space-between">
              <Text weight="semibold" size="small">
                Ten named agents
              </Text>
              {onNavigateAgents && (
                <Button variant="ghost" style={{ height: 26, fontSize: 11 }} onClick={onNavigateAgents}>
                  Open Agents tab →
                </Button>
              )}
            </Row>
            <Text size="small" tone="secondary">
              {agentList.length} specialized agents + Case Orchestrator. Each has visible identity, trust outputs, and
              optional human gate linkage.
            </Text>
            <Row gap={6} wrap>
              {agentList.map((a) => (
                <AgentTag key={a.id} agentId={a.id} theme={theme} />
              ))}
            </Row>
          </Stack>
          <Stack gap={8}>
            <Text weight="semibold" size="small">
              Demo story anchors
            </Text>
            <Text size="small" tone="secondary">
              <strong>Walmart Inc.</strong> — happy path: Mapping Agent completed 138/140 fields, Review Agent flagged
              one outlier, Gate 2 pending your sign-off (~12 min review, ~2.5 days saved).
            </Text>
            <Text size="small" tone="secondary">
              <strong>Northern Retail LLC</strong> — sad path: Intake Agent blocked at Gate 1 (2/9 docs per SOP §4.2).
              Same trust model as happy path — structured trace, audited override, pipeline held.
            </Text>
          </Stack>
          <Row gap={8}>
            {onOpenCreditPolicy && (
              <Button variant="ghost" onClick={onOpenCreditPolicy}>
                Open Credit Policy
              </Button>
            )}
            <Button variant="primary" onClick={onClose}>
              Close
            </Button>
          </Row>
        </Stack>
      </div>
    </div>
  );
}

function trustStripNarrative(gateLabel: string, caseId: CaseId): string {
  if (gateLabel.includes("Gate 1")) {
    return caseId === "northern-retail"
      ? "Intake Agent stopped — incomplete manifest per SOP §4.2. Humans sign Gate 1; agents do not guess."
      : "Document set verified — Gate 1 signed. Extraction and mapping agents ran overnight.";
  }
  if (gateLabel.includes("Gate 2")) {
    return "Spread exceptions surfaced with page lineage — your Gate 2 sign-off releases Risk Agent for covenant analysis.";
  }
  if (gateLabel.includes("Gate 3")) {
    return "Risk Agent calculated ratios and covenant tests — risk officer signs Gate 3 before memo composition.";
  }
  if (gateLabel.includes("Gate 4")) {
    return "Memo paragraphs cite connector APIs with masked entity IDs — analyst coherence review at Gate 4.";
  }
  if (gateLabel.includes("Gate 5")) {
    return "Decision Synthesis Agent built the rationale tree — credit committee signs Gate 5 to close the case.";
  }
  if (gateLabel.includes("closed")) {
    return "Full chain of custody recorded — portfolio alert through committee decision, every gate signed.";
  }
  return "Trust is structural: agent traces, human gates, and policy anchors on every case action.";
}

type CaseProgress = {
  gateLabel: string;
  gateTone: CaseDefinition["gateTone"];
  orchestratorStatus: string;
  nextBestAction: string;
  primaryCta: string;
  primaryStage: StageId;
  statusLabel: string;
};

function deriveCaseProgress(
  caseDef: CaseDefinition,
  caseId: CaseId,
  signed: Set<GateSignKind>,
  remainingExceptions: number,
  opts?: { receivedCount?: number; totalDocs?: number; northernUnlocked?: boolean; forceIntakeGate?: boolean; gate5Resolution?: "declined" | "tabled" },
): CaseProgress {
  const receivedCount = opts?.receivedCount ?? caseDef.intakeDocs.filter((d) => d.received).length;
  const totalDocs = opts?.totalDocs ?? caseDef.intakeDocs.length;
  const northernUnlocked = opts?.northernUnlocked ?? false;
  const forceIntakeGate = opts?.forceIntakeGate ?? false;

  if (opts?.gate5Resolution === "declined") {
    return {
      gateLabel: "Gate 5 declined",
      gateTone: "deleted",
      orchestratorStatus: "Credit committee declined the facility — case closed",
      nextBestAction: "Review runtime log for the committee's written rationale",
      primaryCta: "View decision",
      primaryStage: "decision",
      statusLabel: "Declined",
    };
  }
  if (opts?.gate5Resolution === "tabled") {
    return {
      gateLabel: "Gate 5 tabled",
      gateTone: "warning",
      orchestratorStatus: "Committee tabled the decision — additional information requested",
      nextBestAction: "Provide the requested information and resubmit to committee",
      primaryCta: "View decision",
      primaryStage: "decision",
      statusLabel: "In Progress",
    };
  }

  if (!signed.has("gate1-sign") && forceIntakeGate && (caseId === "walmart" || (caseId === "northern-retail" && !northernUnlocked))) {
    const missing = totalDocs - receivedCount;
    if (caseId === "northern-retail" && missing > 0) {
      return {
        gateLabel: "Gate 1 blocked",
        gateTone: "deleted",
        orchestratorStatus: `${receivedCount}/${totalDocs} documents received — extraction pipeline held`,
        nextBestAction: `Receive ${missing} missing document(s), then mark ingestion complete`,
        primaryCta: "Upload documents",
        primaryStage: "intake",
        statusLabel: "Blocked",
      };
    }
    return {
      gateLabel: "Gate 1 pending",
      gateTone: "warning",
      orchestratorStatus:
        missing > 0
          ? `${receivedCount}/${totalDocs} documents received — extraction pipeline held`
          : "All documents received — mark ingestion complete to release extraction",
      nextBestAction:
        missing > 0
          ? `Upload ${missing} remaining document(s), then mark ingestion complete`
          : "Mark ingestion complete to release extraction pipeline",
      primaryCta: missing > 0 ? "Upload documents" : "Mark Complete",
      primaryStage: "intake",
      statusLabel: "In Progress",
    };
  }
  if (signed.has("gate5-sign")) {
    return {
      gateLabel: "Case closed",
      gateTone: "success",
      orchestratorStatus: "Credit committee decision recorded — case closed",
      nextBestAction: "Review runtime log for full chain of custody",
      primaryCta: "View decision",
      primaryStage: "decision",
      statusLabel: "Approved",
    };
  }
  if (signed.has("gate4-sign")) {
    return {
      gateLabel: "Gate 5 pending",
      gateTone: "warning",
      orchestratorStatus: "Decision package ready — committee sign-off required",
      nextBestAction: "Review committee package and sign Gate 5",
      primaryCta: "Sign committee decision",
      primaryStage: "decision",
      statusLabel: "In Progress",
    };
  }
  if (signed.has("gate3-sign")) {
    return {
      gateLabel: "Gate 4 pending",
      gateTone: "warning",
      orchestratorStatus: "Memo Composer draft ready — coherence review required",
      nextBestAction: "Review connector citations and sign Gate 4",
      primaryCta: "Review memo",
      primaryStage: "memo",
      statusLabel: "In Progress",
    };
  }
  if (signed.has("gate2-sign")) {
    return {
      gateLabel: "Gate 3 pending",
      gateTone: "warning",
      orchestratorStatus: "Risk Agent active — ratio and covenant analysis running",
      nextBestAction: "Review Risk Agent output and sign Gate 3",
      primaryCta: "Review assessment",
      primaryStage: "assessment",
      statusLabel: "In Progress",
    };
  }
  if (remainingExceptions > 0) {
    return {
      gateLabel: "Gate 2 pending",
      gateTone: "warning",
      orchestratorStatus: caseDef.orchestratorStatus,
      nextBestAction: `Resolve ${remainingExceptions} mapping exception(s) on Exceptions tab, then sign Gate 2`,
      primaryCta: "Review exception",
      primaryStage: "review",
      statusLabel: "In Progress",
    };
  }
  return {
    gateLabel: "Gate 2 pending",
    gateTone: "warning",
    orchestratorStatus: caseDef.orchestratorStatus,
    nextBestAction: "Sign Gate 2 to release Risk Agent for ratio calculation",
    primaryCta: "Sign Gate 2",
    primaryStage: "review",
    statusLabel: "In Progress",
  };
}

const MAPPING_PAGE_SIZE = 20;

function CaseTrustStrip({
  caseDef,
  auditCount,
  theme,
  openExceptions,
  caseId,
  gateLabel,
  gateTone,
}: {
  caseDef: CaseDefinition;
  auditCount: number;
  theme: FigmaTheme;
  openExceptions?: number;
  caseId?: CaseId;
  gateLabel?: string;
  gateTone?: CaseDefinition["gateTone"];
}) {
  const eventCount = caseDef.runtimeLog.length + auditCount;
  const exceptions = openExceptions ?? caseDef.openExceptions;
  const resolvedGateLabel = gateLabel ?? caseDef.gateLabel;
  const resolvedGateTone = gateTone ?? caseDef.gateTone;
  const narrative = trustStripNarrative(resolvedGateLabel, caseId ?? "walmart");
  const activeGate = TRUST_GATES.find((g) => resolvedGateLabel.toLowerCase().includes(`gate ${g.id}`))?.id;
  return (
    <div
      style={{
        ...dxpCard(theme),
        padding: "10px 16px",
        background: theme.bg.elevated,
      }}
    >
      <Stack gap={8}>
        <Row align="center" justify="space-between" wrap gap={6}>
          <Row gap={8} align="center">
            <Text weight="semibold" size="small">
              Trust Layer
            </Text>
            <Pill tone="info">Case metrics</Pill>
          </Row>
          <Text size="small" tone="tertiary" style={{ fontStyle: "italic", maxWidth: 480 }}>
            {narrative}
          </Text>
        </Row>
        <TrustGateLadder theme={theme} highlightGate={activeGate} />
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
              {exceptions}
            </Text>
          </Stack>
          <Stack gap={2}>
            <Text size="small" tone="tertiary">
              Human gate
            </Text>
            <Pill tone={resolvedGateTone}>{resolvedGateLabel}</Pill>
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
      </Stack>
    </div>
  );
}

type GateAction =
  | { kind: "gate1-sign" }
  | { kind: "gate2-sign" }
  | { kind: "gate3-sign" }
  | { kind: "gate4-sign" }
  | { kind: "gate5-sign" }
  | { kind: "gate5-decline" }
  | { kind: "gate5-table" }
  | { kind: "mapping-accept"; field: string }
  | { kind: "mapping-override"; field: string; correctedValue?: string; note?: string }
  | { kind: "intake-override" }
  | { kind: "intake-doc-request" };

function isGateSignKind(kind: GateAction["kind"]): kind is GateSignKind {
  return (
    kind === "gate1-sign" ||
    kind === "gate2-sign" ||
    kind === "gate3-sign" ||
    kind === "gate4-sign" ||
    kind === "gate5-sign"
  );
}

function mergeIntakeDocs(
  baseDocs: IntakeDocRow[],
  overrides: Record<string, IntakeDocOverride> | undefined,
): IntakeDocRow[] {
  if (!overrides) return baseDocs;
  return baseDocs.map((doc) => {
    const o = overrides[doc.name];
    if (!o) return doc;
    return { ...doc, ...o };
  });
}

function intakeClassificationForDoc(doc: IntakeDocRow): string {
  if (doc.classification) return doc.classification;
  const walmartMatch = CASES.walmart.intakeDocs.find((d) => d.sopRef === doc.sopRef);
  return walmartMatch?.classification ?? "Supporting Document";
}

function formatIntakeTimestamp(): string {
  const d = new Date();
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
}

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
  if (mode === "gate1-sign") {
    return (
      <Row gap={8} wrap>
        <Button variant="primary" disabled={disabled} onClick={() => onAction({ kind: "gate1-sign" })}>
          Sign Gate 1 — Approve document set
        </Button>
        <Button variant="ghost" disabled={disabled} onClick={() => onAction({ kind: "intake-override" })}>
          Override with reason (logged)
        </Button>
      </Row>
    );
  }
  if (mode === "intake-override") {
    return (
      <Row gap={8} wrap>
        <Button variant="primary" onClick={() => onAction({ kind: "intake-doc-request" })}>
          Send doc request reminder
        </Button>
        <Button variant="ghost" onClick={() => onAction({ kind: "intake-override" })}>
          Override with reason (logged)
        </Button>
      </Row>
    );
  }
  if (mode === "gate5-sign") {
    return (
      <Row gap={8} wrap>
        <Button variant="primary" disabled={disabled} onClick={() => onAction({ kind: "gate5-sign" })}>
          Sign Gate 5 — Approve committee decision
        </Button>
        <Button
          variant="ghost"
          disabled={disabled}
          data-testid="gate5-decline"
          style={{ borderColor: "#B42018", color: "#B42018" }}
          onClick={() => onAction({ kind: "gate5-decline" })}
        >
          Decline (SOP §14)
        </Button>
        <Button variant="ghost" disabled={disabled} data-testid="gate5-table" onClick={() => onAction({ kind: "gate5-table" })}>
          Table — request more information
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
  openCase: (id: CaseId, stage?: StageId, fromRow?: CaseRowData) => void;
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
  const d = new Date();
  const now = `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
  if (action.kind === "gate1-sign") {
    return {
      id: `audit-${Date.now()}-gate1`,
      caseId,
      gateAction: "gate1-sign",
      time: now,
      stage: "Intake",
      actorKind: "human",
      actor: "J. Martinez (Credit Analyst)",
      input: "9/9 documents validated per SOP §4.2 manifest",
      reasoning: "Analyst signed Gate 1 after completeness check — Intake Agent released extraction pipeline",
      output: "Gate 1 passed — Document Intelligence Agent queued",
    };
  }
  if (action.kind === "gate2-sign") {
    return {
      id: `audit-${Date.now()}-gate2`,
      caseId,
      gateAction: "gate2-sign",
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
      gateAction: "gate3-sign",
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
      gateAction: "gate4-sign",
      time: now,
      stage: "Credit Memo",
      actorKind: "human",
      actor: "Sarah W. (Credit Analyst)",
      input: "Credit memo draft v1 — connector-sourced sections (Experian, Equifax, D&B, AML/KYC, Bloomberg)",
      reasoning: "Memo coherence reviewed — bureau citations verified against connector logs; AML/KYC attestation confirmed",
      output: "Gate 4 passed — Decision Synthesis Agent released for committee package",
    };
  }
  if (action.kind === "gate5-sign") {
    return {
      id: `audit-${Date.now()}-gate5`,
      caseId,
      gateAction: "gate5-sign",
      time: now,
      stage: "Credit Decision",
      actorKind: "human",
      actor: "Credit Committee",
      input: "Committee package — Decision score 5.45/10 · Conditional Approve (Negotiate)",
      reasoning: "Committee reviewed spread quality, connector bundle, and covenant headroom — approved negotiated structure",
      output: "Gate 5 passed — case closed with Conditional Approve; facility terms documented in memo",
    };
  }
  if (action.kind === "gate5-decline") {
    return {
      id: `audit-${Date.now()}-gate5-decline`,
      caseId,
      time: now,
      stage: "Credit Decision",
      actorKind: "human",
      actor: "Credit Committee",
      input: "Committee package — Decision score 5.45/10 · reviewed for final vote",
      reasoning: "Committee vote per SOP §14 — quorum reached; facility risk profile does not meet institution policy for approval at requested terms",
      output: "Gate 5 — DECLINED. Case closed; written rationale entered against Gate 5 per SOP §14. No appeal gate beyond Gate 5.",
    };
  }
  if (action.kind === "gate5-table") {
    return {
      id: `audit-${Date.now()}-gate5-table`,
      caseId,
      time: now,
      stage: "Credit Decision",
      actorKind: "human",
      actor: "Credit Committee",
      input: "Committee package — Decision score 5.45/10 · reviewed for final vote",
      reasoning: "Committee tabled the decision per SOP §14 — additional information requested before a final vote; this is a deferral, not a rejection",
      output: "Gate 5 — TABLED. Returned to analyst for additional information; case remains open pending re-submission to committee.",
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
    const hasCorrection = Boolean(action.correctedValue);
    return {
      id: `audit-${Date.now()}-override`,
      caseId,
      time: now,
      stage: "Review",
      actorKind: "human",
      actor: "Sarah W. (Credit Analyst)",
      input: `Override request: ${field}${hasCorrection ? ` → corrected to ${action.correctedValue}` : ""}`,
      reasoning: action.note
        ? `Documented exception override — reason: ${action.note}`
        : "Documented exception override — reason: verified against audited financials; scale corrected to $252.5B",
      output: `Override logged with reason and timestamp — audit ID trace-override-${Date.now()}`,
    };
  }
  if (action.kind === "intake-doc-request") {
    return {
      id: `audit-${Date.now()}-docreq`,
      caseId,
      time: now,
      stage: "Intake",
      actorKind: "human",
      actor: "J. Martinez (Credit Analyst)",
      input: "Gate 1 blocked — doc request reminder sent to borrower portal",
      reasoning: "Analyst requested missing Q3 cash flow, covenant schedule, and 5 additional items per SOP §4.2",
      output: "Borrower notification queued — pipeline remains blocked until documents received",
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

function InSightAssistPanel({ theme, scope = "portfolio" }: { theme: FigmaTheme; scope?: "portfolio" | "cases" }) {
  const [open, setOpen] = useCanvasState<boolean>("insightAssistOpen", true);
  const [chatInput, setChatInput] = useCanvasState<string>("insightAssistChat", "");
  const [chatReply, setChatReply] = useCanvasState<string>("insightAssistReply", "");
  const casesSummary =
    "As of 09 Apr 2026: 9 active cases in queue. 4 flagged High Risk (AutoWest, Tesla Rental, Vantage, Northern Retail). " +
    "Extraction complete on 6/8; 2 awaiting document intake. Orchestrator recommends prioritizing covenant breaches.";
  const portfolioSummary =
    "The portfolio is showing signs of stress with 23 active covenant breaches, a +7 increase since last month. " +
    "AutoWest Motors and Vantage Rental are currently the highest priority, both failing multiple covenants " +
    "(Current Ratio < 1.2x and DSCR < 1.5x) with Risk Scores of 9.";
  if (!open) return null;
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
        maxHeight: 720,
        overflow: "auto",
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
          <Text size="small" tone="quaternary">›</Text>
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
        <Text size="small" tone="tertiary">
          {scope === "cases" ? "Today's Summary — Case Queue" : "Today's Summary — Portfolio Level"} ›
        </Text>
        <Text weight="semibold">
          Hello John, your {scope === "cases" ? "Case Queue Summary" : "Portfolio Summary"} is ready for review.
        </Text>
        <div style={{ padding: "10px 12px", borderLeft: `3px solid ${theme.diff.removedLine}`, background: "#fff5f5", borderRadius: "0 6px 6px 0", fontSize: 12 }}>
          <Text weight="semibold" size="small">Critical Alert: Rising Credit Risk</Text>
        </div>
        <Text size="small" tone="secondary">
          {scope === "cases" ? casesSummary : portfolioSummary}
        </Text>
        {scope === "portfolio" && (
          <>
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
          </>
        )}
        {scope === "cases" && (
          <Row align="center" justify="space-between" style={{ padding: "8px 12px", border: `1px solid ${theme.stroke.tertiary}`, borderRadius: 6, fontSize: 12 }}>
            <Row gap={4} align="center">
              <span style={{ color: theme.accent.primary }}>›</span>
              <Text size="small">Extraction Summary</Text>
            </Row>
            <Text size="small" tone="tertiary">234 / 467</Text>
          </Row>
        )}
        <Divider />
        <Row align="center" style={{ padding: "8px 0" }}>
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && chatInput.trim()) {
                const agent = scope === "cases" ? "Case Orchestrator" : "Portfolio Sentinel";
                setChatReply(`${agent}: Prioritize AutoWest Motors (DSCR breach) and Vantage Rental ($120M variance) — both need analyst review today.`);
                setChatInput("");
                showActionToast("InSight Assist responded");
              }
            }}
            placeholder="Type your message here"
            style={{
              flex: 1,
              border: `1px solid ${theme.stroke.secondary}`,
              borderRadius: 6,
              padding: "6px 10px",
              fontSize: 12,
              color: theme.text.primary,
              background: theme.bg.elevated,
              fontFamily: "Inter, sans-serif",
            }}
          />
          <button
            type="button"
            onClick={() => {
              if (!chatInput.trim()) return;
              const agent = scope === "cases" ? "Case Orchestrator" : "Portfolio Sentinel";
              setChatReply(`${agent}: Prioritize AutoWest Motors (DSCR breach) and Vantage Rental ($120M variance) — both need analyst review today.`);
              setChatInput("");
              showActionToast("InSight Assist responded");
            }}
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: theme.accent.primary,
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginLeft: 8,
              cursor: "pointer",
              flexShrink: 0,
              color: "#fff",
              fontSize: 14,
            }}
          >
            ↑
          </button>
        </Row>
        {chatReply && (
          <Text size="small" tone="secondary" style={{ padding: "8px 10px", background: theme.bg.elevated, borderRadius: 6 }}>
            {chatReply}
          </Text>
        )}
        <Row gap={8} align="center" justify="space-between">
          <button
            type="button"
            onClick={() => showActionToast("Attachment picker opened (demo)")}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: theme.text.quaternary, fontFamily: "Inter, sans-serif" }}
          >
            + Attachment
          </button>
          <Row gap={4} align="center">
            <span style={{ fontSize: 11, color: theme.text.quaternary }}>
              Agent: {scope === "cases" ? "Case Orchestrator" : "Portfolio Sentinel"}
            </span>
            <AgentTag agentId={scope === "cases" ? "orchestrator" : "sentinel"} theme={theme} />
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
  openCase: (id: CaseId, stage?: StageId, fromRow?: CaseRowData) => void;
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
            const { caseId, stage } = caseRouteForRowId(row.id);
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
                onClick={() => openCase(caseId, stage, row)}
              >
                <Stack gap={6}>
                  <Row align="center" gap={6}>
                    <span style={{ fontSize: 12, color: theme.text.quaternary }}>⊞</span>
                    <Text weight="semibold" size="small">{row.entity}</Text>
                  </Row>
                  <Text size="small" tone="quaternary">04/08 · 3:50PM CST</Text>
                  <Row gap={6} align="center">
                    <Pill tone="neutral">{row.stageBadge}</Pill>
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

function ExportDropdown({ theme, caseRef }: { theme: FigmaTheme; caseRef: string }) {
  const [open, setOpen] = useCanvasState<boolean>("exportDropdownOpen", false);
  const [lastExport, setLastExport] = useCanvasState<string>("lastExportFormat", "");
  const rootRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), [setOpen]);
  useDismissOnOutside(open, close, rootRef);

  const handleExport = (format: "PDF" | "Excel") => {
    const isPdfDemo = format === "PDF";
    const ext = isPdfDemo ? "txt" : "csv";
    const mime = "text/plain;charset=utf-8";
    const body = isPdfDemo
      ? `[Demo PDF export — plain text placeholder]\nFinancial Spreading Export — ${caseRef}\nGenerated: ${new Date().toISOString()}\n`
      : `Case,Stage,Confidence\n${caseRef},Review,78%\n`;
    downloadExportFile(`${caseRef}.${ext}`, body, mime);
    setLastExport(`${format} · ${caseRef} · ${new Date().toLocaleTimeString()}`);
    setOpen(false);
    showActionToast(`Downloaded ${format} export for ${caseRef}`);
  };

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <Button variant="secondary" style={{ height: 28, fontSize: 11 }} onClick={() => setOpen(!open)}>
        Export ▾
      </Button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: 32,
            right: 0,
            background: theme.bg.editor,
            border: `1px solid ${theme.stroke.secondary}`,
            borderRadius: 8,
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
            zIndex: 50,
            minWidth: 160,
            overflow: "hidden",
          }}
        >
          {(["PDF", "Excel"] as const).map((fmt) => (
            <button
              key={fmt}
              type="button"
              onClick={() => handleExport(fmt)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "8px 12px",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 12,
                fontFamily: "Inter, sans-serif",
                color: theme.text.primary,
              }}
            >
              Export as {fmt}{fmt === "PDF" ? " (demo)" : ""}
            </button>
          ))}
        </div>
      )}
      {lastExport && !open && (
        <Text size="small" tone="quaternary" style={{ position: "absolute", top: 32, right: 0, whiteSpace: "nowrap" }}>
          Last: {lastExport}
        </Text>
      )}
    </div>
  );
}

function CollaboratorAvatars({ theme, initials }: { theme: FigmaTheme; initials: string[] }) {
  const colors = ["#0D9488", "#E91E8C", "#7B64B8"];
  return (
    <div style={{ display: "flex" }}>
      {initials.map((initial, i) => (
        <div
          key={initial}
          title={`${initial} is viewing this case`}
          style={{
            width: 22,
            height: 22,
            borderRadius: "50%",
            background: colors[i % colors.length],
            border: `2px solid ${theme.bg.editor}`,
            marginLeft: i > 0 ? -8 : 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 9,
            fontWeight: 700,
            color: "#fff",
          }}
        >
          {initial}
        </div>
      ))}
    </div>
  );
}

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

function ValidateRatiosPanel({ theme, onMarkComplete }: { theme: FigmaTheme; onMarkComplete?: () => void }) {
  const [tab, setTab] = useCanvasState<RatioTab>("ratioTab", "summary");
  const [calculating, setCalculating] = useCanvasState<boolean>("ratioCalculating", false);
  const tabs: { id: RatioTab; label: string }[] = [
    { id: "summary", label: "Summary" },
    { id: "liquidity", label: "Liquidity" },
    { id: "profitability", label: "Profitability" },
    { id: "solvency", label: "Solvency" },
    { id: "efficiency", label: "Efficiency" },
  ];

  const handleTabChange = (next: RatioTab) => {
    if (next === tab) return;
    setCalculating(true);
    setTab(next);
    window.setTimeout(() => setCalculating(false), 550);
  };

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
          <ActionsMenu
            theme={theme}
            label="Actions"
            menuKey="ratioActionsMenu"
            items={[
              { label: "Recalculate ratios", onClick: () => { setCalculating(true); window.setTimeout(() => setCalculating(false), 550); showActionToast("Risk Agent recalculated ratios"); } },
              { label: "Export ratio pack", onClick: () => { downloadExportFile("ratios-summary.csv", "Ratio,FY2025,FY2026\nCurrent Ratio,0.82,0.79\n"); showActionToast("Ratio pack downloaded"); } },
              { label: "Escalate to risk officer", onClick: () => showActionToast("Escalation sent to Risk Officer queue") },
            ]}
          />
          <Button variant="primary" style={{ height: 28, fontSize: 11 }} onClick={onMarkComplete} disabled={!onMarkComplete}>
            Mark Complete
          </Button>
        </Row>
      </Row>
      <Row gap={0} style={{ borderBottom: `1px solid ${theme.stroke.secondary}`, padding: "0 16px" }}>
        {tabs.map((t) => {
          const isActive = t.id === tab;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => handleTabChange(t.id)}
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
        {calculating && (
          <Row gap={8} align="center" style={{ padding: "24px 0", justifyContent: "center" }}>
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: "50%",
                border: `2px solid ${theme.stroke.tertiary}`,
                borderTopColor: theme.accent.primary,
                animation: "acos-spin 0.7s linear infinite",
              }}
            />
            <Text size="small" tone="tertiary">Calculating ratios…</Text>
            <style>{"@keyframes acos-spin { to { transform: rotate(360deg); } }"}</style>
          </Row>
        )}
        {!calculating && tab === "summary" && (
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
        {!calculating && tab !== "summary" && (
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

function CreditMemoFullView({
  theme,
  onClose,
  onSubmit,
  gate4Signed = false,
}: {
  theme: FigmaTheme;
  onClose: () => void;
  onSubmit?: () => void;
  gate4Signed?: boolean;
}) {
  const [expandedSections, setExpandedSections] = useCanvasState<string[]>("memoExpanded", ["rating"]);
  const [explainOpen, setExplainOpen] = useCanvasState<boolean>("memoExplainOpen", false);
  const [commentSection, setCommentSection] = useCanvasState<string | null>("memoCommentSection", null);
  const [commentDraft, setCommentDraft] = useCanvasState<string>("memoCommentDraft", "");

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
            <Button
              variant="ghost"
              style={{ marginLeft: "auto", height: 26, fontSize: 11 }}
              onClick={() => setExplainOpen(!explainOpen)}
            >
              Explain
            </Button>
          </Row>
          {explainOpen && (
            <Callout tone="info" title="Decision Agent rationale">
              Risk score 5.45/10 reflects high leverage and weak liquidity offset by strong operating cash flow and low fleet LTV (25.6%). Recommend Negotiate — reduced revolver plus asset-backed line.
            </Callout>
          )}
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
      onClick={(e: ClickTarget) => e.target === e.currentTarget && onClose()}
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
              <ActionsMenu
                theme={theme}
                label="Actions ▾"
                menuKey="memoActionsMenu"
                items={[
                  { label: "Assign reviewer", onClick: () => showActionToast("Assigned to M. Chen (Risk Officer)") },
                  { label: "Request revisions", onClick: () => showActionToast("Revision request logged to audit trail") },
                  { label: "Print preview", onClick: () => showActionToast("Opening print preview…") },
                ]}
              />
              <ExportDropdown theme={theme} caseRef="MEMO-REPORT" />
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
                    <Row
                      align="center"
                      justify="space-between"
                      style={{ padding: "14px 0" }}
                    >
                      <button
                        type="button"
                        onClick={() => toggle(section.id)}
                        style={{
                          flex: 1,
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: 0,
                          fontFamily: "Inter, sans-serif",
                          fontSize: 13,
                          fontWeight: 600,
                          color: theme.text.primary,
                          textAlign: "left",
                        }}
                      >
                        <span style={{ color: theme.text.quaternary }}>{isExpanded ? "∨" : "›"}</span>
                        {section.title}
                      </button>
                      <button
                        type="button"
                        onClick={() => setCommentSection(commentSection === section.id ? null : section.id)}
                        style={{
                          fontSize: 11,
                          color: theme.text.tertiary,
                          fontWeight: 400,
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          fontFamily: "Inter, sans-serif",
                          flexShrink: 0,
                          marginLeft: 8,
                        }}
                      >
                        + Comment
                      </button>
                    </Row>
                    {commentSection === section.id && (
                      <Stack gap={6} style={{ paddingBottom: 8 }}>
                        <textarea
                          value={commentDraft}
                          onChange={(e) => setCommentDraft(e.target.value)}
                          placeholder="Add analyst comment…"
                          rows={2}
                          style={{
                            width: "100%",
                            border: `1px solid ${theme.stroke.secondary}`,
                            borderRadius: 6,
                            padding: 8,
                            fontSize: 12,
                            fontFamily: "Inter, sans-serif",
                            resize: "vertical",
                          }}
                        />
                        <Row gap={8} justify="end">
                          <Button
                            variant="ghost"
                            style={{ height: 26, fontSize: 11 }}
                            onClick={() => {
                              setCommentSection(null);
                              setCommentDraft("");
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="primary"
                            style={{ height: 26, fontSize: 11 }}
                            disabled={!commentDraft.trim()}
                            onClick={() => {
                              showActionToast(`Comment saved on "${section.title}"`);
                              setCommentSection(null);
                              setCommentDraft("");
                            }}
                          >
                            Save comment
                          </Button>
                        </Row>
                      </Stack>
                    )}
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
            <Button
              variant="primary"
              style={{ height: 32, fontSize: 12, width: "100%" }}
              disabled={gate4Signed}
              onClick={() => {
                if (gate4Signed) return;
                onSubmit?.();
                showActionToast("Credit memo submitted — Gate 4 sign-off recorded");
                onClose();
              }}
            >
              {gate4Signed ? "Gate 4 already signed" : "Submit & sign Gate 4"}
            </Button>
          </Stack>
        </div>
      </div>
    </div>
  );
}

// ─── PortfolioView ─────────────────────────────────────────────────────────────

function PortfolioView({
  openCase,
  openSpread,
  theme,
  onOpenTrustLayer,
}: {
  openCase: (id: CaseId, stage?: StageId, fromRow?: CaseRowData) => void;
  openSpread?: (companyId: CompanyId) => void;
  theme: FigmaTheme;
  onOpenTrustLayer?: () => void;
}) {
  return (
    <Row gap={16} align="start">
      <Stack gap={16} style={{ flex: 1, minWidth: 0 }}>
      <Callout tone="info" title="Commercial lending at portfolio scale">
        Manual spreading hides covenant drift until quarter-end. Portfolio Sentinel Agent scanned the book overnight —
        23 covenant breaches (+7 this month), 12 open exceptions flagged by Review Agent, 312 agent-hours saved across 42
        cases. Every row below links trust status to gate-level evidence — one thread from alert to case.
      </Callout>
      {onOpenTrustLayer && (
        <Row gap={8} align="center">
          <Button variant="ghost" style={{ height: 26, fontSize: 11 }} onClick={onOpenTrustLayer}>
            How the Trust Layer works →
          </Button>
        </Row>
      )}
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

      <InFocusBanner rows={CASE_ROWS} theme={theme} openCase={openCase} />

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
              Current Ratio 0.82x (covenant &gt;1.2x). D/E 0.46x within limit. Revenue trend -12% YoY on spread.
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
              <Pill tone="deleted">Critical</Pill>
            </Row>
            <Row gap={8} align="center">
              <AgentTag agentId="sentinel" theme={theme} />
              <Text size="small" tone="tertiary">Current Ratio 0.61x (req ≥1.20x) · DSCR 0.00x (req ≥1.25x) — debt service coverage failure</Text>
            </Row>
            <Button variant="ghost" onClick={() => openSpread?.("autowest")}>
              View case → AutoWest master financial database
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
      <PortfolioRiskDistribution theme={theme} />
      </Stack>
      <InSightAssistPanel theme={theme} />
    </Row>
  );
}

function CommandCenterView({
  openCase,
  openSpread,
  theme,
  onOpenTrustLayer,
  onOpenCreditPolicy,
}: {
  openCase: (id: CaseId, stage?: StageId, fromRow?: CaseRowData) => void;
  openSpread?: (companyId: CompanyId) => void;
  theme: FigmaTheme;
  onOpenTrustLayer?: () => void;
  onOpenCreditPolicy?: () => void;
}) {
  const [hintDismissed, setHintDismissed] = useCanvasState<boolean>("demoWalkthroughHintDismissed", false);
  return (
    <Stack gap={16}>
      {!hintDismissed && (
        <Callout tone="warning" title="First walkthrough?">
          <Row align="center" justify="space-between" wrap gap={8}>
            <Text size="small">
              Click <strong>Reset demo</strong> (top-right tab bar) before your first demo so gates and buttons start fresh.
            </Text>
            <Button
              variant="ghost"
              style={{ height: 26, fontSize: 11 }}
              data-testid="dismiss-walkthrough-hint"
              onClick={() => setHintDismissed(true)}
            >
              Dismiss
            </Button>
          </Row>
        </Callout>
      )}
      <Callout tone="info" title="Since your last login">
        Agents processed 15 cases overnight · 3 need your review · Est. 28 min total
      </Callout>

      <TrustLayerBanner theme={theme} onOpenTrustLayer={onOpenTrustLayer} onOpenCreditPolicy={onOpenCreditPolicy} />

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
                trustNote="Intake Agent cited SOP §4.2 — agents stop; humans resolve completeness."
                onViewStage={() => openCase("northern-retail", "intake")}
              />
            }
          >
            <AgentTag agentId="intake" theme={theme} />
            <Text size="small" tone="secondary">
              Intake Agent blocked: 2 of 9 documents received. Missing Q3 cash flow, covenant schedule, and 5 more per SOP §4.2.
            </Text>
            <Button variant="primary" onClick={() => openCase("northern-retail", "intake")}>
              Resolve completeness
            </Button>
          </DxpQueueCard>
          <DxpQueueCard
            title="AutoWest Motors"
            trailing={<Pill tone="deleted">SLA 4h</Pill>}
            theme={theme}
            trustFooter={
              <QueueTrustFooter
                gate="Trust score 25%"
                reviewMin="20 min"
                stageLabel="Floor Plan · Master DB"
                theme={theme}
                onViewStage={() => openSpread?.("autowest")}
              />
            }
          >
            <AgentTag agentId="sentinel" theme={theme} />
            <Text size="small" tone="secondary">
              Covenant breach: Current Ratio 0.61x (req ≥1.20x). DSCR 0.00x (req ≥1.25x) — debt service coverage failure.
            </Text>
            <Button variant="primary" onClick={() => openSpread?.("autowest")}>
              Open AutoWest master financial database
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
                trustNote="Mapping Agent did the spread — your Gate 2 sign-off releases Risk Agent."
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
            trustFooter={<QueueTrustFooter gate="Gate 4 pending" reviewMin="8 min" stageLabel="Memo" theme={theme}
              onViewStage={() => openCase("walmart", "memo")}
            />}
          >
            <AgentTag agentId="memo" theme={theme} />
            <Text size="small" tone="secondary">
              Memo Composer draft ready · Gate 4 pending your coherence review.
            </Text>
            <Button variant="primary" onClick={() => openCase("walmart", "memo")}>
              Review memo
            </Button>
          </DxpQueueCard>
        </Stack>

        <Stack gap={8}>
          <H3>Agents working</H3>
          <DxpQueueCard
            title="Costco Wholesale"
            theme={theme}
            demoLabel="Synthetic portfolio queue — demo breadth"
            trustFooter={<QueueTrustFooter gate="—" reviewMin="—" stageLabel="Extraction" theme={theme}
              onViewStage={() => openCase("walmart", "extraction")}
            />}
          >
            <AgentTag agentId="document-intel" theme={theme} />
            <Text size="small" tone="secondary">
              Extracting 10-K filing (214 pages) · 67% complete
            </Text>
            <UsageBarPlaceholder theme={theme} pct={67} />
            <Button variant="primary" onClick={() => openCase("walmart", "extraction")}>
              Monitor extraction (Costco demo)
            </Button>
          </DxpQueueCard>
          <DxpQueueCard
            title="Target Corp"
            theme={theme}
            demoLabel="Synthetic portfolio queue — demo breadth"
            trustFooter={<QueueTrustFooter gate="—" reviewMin="—" stageLabel="Assessment" theme={theme}
              onViewStage={() => openCase("walmart", "assessment")}
            />}
          >
            <AgentTag agentId="risk" theme={theme} />
            <Text size="small" tone="secondary">
              Running covenant analysis across 4 periods
            </Text>
            <Button variant="primary" onClick={() => openCase("walmart", "assessment")}>
              Monitor assessment (Target demo)
            </Button>
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
            "Floor Plan · Master DB",
            <AgentTag agentId="sentinel" theme={theme} />,
            "Sentinel: DSCR 0.00x covenant breach detected",
            "~1.2 days",
            <Pill tone="deleted">Critical</Pill>,
            <Button variant="ghost" onClick={() => openSpread?.("autowest")}>View alert</Button>,
          ],
          [
            "Borrower 5",
            "Mapping",
            <AgentTag agentId="mapping" theme={theme} />,
            "Mapping complete — awaiting Gate 2",
            "~1.8 days",
            <Pill tone="success">98% conf</Pill>,
            <Button variant="ghost" onClick={() => openCase("walmart", "mapping")}>Monitor</Button>,
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
  onOpenSop,
}: {
  title: string;
  items: string[];
  theme: FigmaTheme;
  onOpenSop?: (section: string, appliedTo?: string) => void;
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
                {onOpenSop ? renderTextWithSopLinks(item, onOpenSop) : item}
              </Text>
            </Row>
          </span>
        ))}
      </Stack>
    </Stack>
  );
}

function StageTracePanel({
  trace,
  theme,
  onOpenSop,
}: {
  trace: StageTrace;
  theme: FigmaTheme;
  onOpenSop?: (section: string, appliedTo?: string) => void;
}) {
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
          <TraceSection title="Input" items={trace.input} theme={theme as FigmaTheme} onOpenSop={onOpenSop} />
          <TraceSection title="Reasoning" items={trace.reasoning} theme={theme as FigmaTheme} onOpenSop={onOpenSop} />
          <TraceSection title="Output" items={trace.output} theme={theme as FigmaTheme} onOpenSop={onOpenSop} />
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
            <Row gap={8} align="center">
              <Text weight="semibold" size="small">
                Connector Trust Panel
              </Text>
              <Pill tone="info">Trusted Sources</Pill>
            </Row>
            <Text size="small" tone="tertiary">
              {entitySummary} · authenticated API pulls with masked entity IDs in UI
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
  subtitles,
}: {
  activeId: CaseId;
  onChange: (id: CaseId) => void;
  theme: FigmaTheme;
  subtitles: Record<CaseId, string>;
}) {
  const items: { id: CaseId; label: string }[] = [
    { id: "walmart", label: CASES.walmart.title },
    { id: "northern-retail", label: CASES["northern-retail"].title },
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
                {subtitles[item.id]}
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
            aria-label={`${s.label} stage`}
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

// Cascading impact — which downstream totals move when a field is corrected
const IMPACT_MAP: Record<string, { metric: string; current: string; updated: string }[]> = {
  "Total Assets": [
    { metric: "Total Assets", current: "$100K", updated: "$284,668M" },
    { metric: "Total Current Assets", current: "$84,874M", updated: "$84,874M" },
    { metric: "Current Ratio", current: "0.001x", updated: "0.82x" },
    { metric: "D/E Ratio", current: "354.2x", updated: "0.46x" },
    { metric: "Health Score", current: "1.2 / 10", updated: "7.2 / 10" },
  ],
};

type ChangeLogEntry = { timestamp: string; actor: string; action: string; detail: string };

const DEFAULT_CHANGE_LOG: ChangeLogEntry[] = [
  { timestamp: "Mar 16, 2:22 AM", actor: "Document Intelligence", action: "Extracted", detail: "OCR pass — page 43, confidence 41%" },
  { timestamp: "Mar 16, 2:31 AM", actor: "Mapping Agent", action: "Mapped", detail: "Mapped to TOTAL_ASSETS per SOP §7.4" },
  { timestamp: "Mar 16, 2:33 AM", actor: "Review QA", action: "Flagged", detail: "YoY variance 99.99% — scale mismatch suspected" },
];

type TrustInspectorTab = "impact" | "changelog";

function TrustInspector({
  row,
  theme,
  onClose,
  onAccept,
  onOverride,
  onOpenSop,
}: {
  row: MappingRow | null;
  theme: ReturnType<typeof useHostTheme>;
  onClose: () => void;
  onAccept?: (field: string) => void;
  onOverride?: (field: string, correctedValue: string, note: string) => void;
  onOpenSop?: (section: string, appliedTo?: string) => void;
}) {
  const [tab, setTab] = useCanvasState<TrustInspectorTab>("trustInspectorTab", "impact");
  const [correctedValue, setCorrectedValue] = useCanvasState<string>("trustInspectorCorrectedValue", "");
  const [note, setNote] = useCanvasState<string>("trustInspectorNote", "");

  if (!row) return null;
  const cp = confidencePill(row.confidence);
  const agent = AGENTS[row.agentId];
  const reasoning =
    row.reasoning ??
    (row.confidence === "review"
      ? "Review Agent flagged this field for analyst verification."
      : `Mapped per ${row.sop ?? "SOP"}; high-confidence extraction from ${row.source ?? "source document"}.`);
  const impact = IMPACT_MAP[row.field];

  const handleApply = () => {
    if (!correctedValue && !note) {
      showActionToast("Enter a corrected value or note before applying");
      return;
    }
    onOverride?.(row.field, correctedValue || row.value, note);
    setCorrectedValue("");
    setNote("");
  };

  const handleCancel = () => {
    setCorrectedValue("");
    setNote("");
    onClose();
  };

  return (
    <div
      data-testid="trust-inspector-overlay"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        zIndex: 245,
        display: "flex",
        justifyContent: "flex-end",
      }}
      onClick={onClose}
    >
      <div
        style={{ width: 480, maxWidth: "100%", height: "100%", overflow: "auto", boxShadow: "-4px 0 24px rgba(0,0,0,0.12)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <Card style={{ borderRadius: 0, border: "none", height: "100%" }}>
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
          <Text size="small" tone="tertiary">
            Intelligence Layer · per-field confidence, agent reasoning, and correction lineage before Gate 2
          </Text>
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
          {row.sop && onOpenSop && (
            <Row justify="space-between">
              <Text size="small" tone="secondary">
                SOP reference
              </Text>
              <SopLink section={row.sop} appliedTo={row.field} onOpen={onOpenSop} testId="trust-inspector-sop-link" />
            </Row>
          )}
          {row.sop && !onOpenSop && (
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

          {/* Impact / Change Log tabs */}
          <Row gap={0} style={{ borderBottom: `1px solid ${theme.stroke.tertiary}` }}>
            {([
              { id: "impact" as const, label: "Impact" },
              { id: "changelog" as const, label: "Change Log" },
            ]).map((t) => {
              const isActive = t.id === tab;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  style={{
                    background: "none",
                    border: "none",
                    borderBottom: isActive ? "2px solid #1860ec" : "2px solid transparent",
                    padding: "6px 10px",
                    fontSize: 12,
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? theme.text.primary : theme.text.tertiary,
                    cursor: "pointer",
                    fontFamily: "Inter, sans-serif",
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </Row>

          {tab === "impact" && (
            <Stack gap={8}>
              {impact ? (
                <>
                  <Text size="small" tone="tertiary">
                    Correcting this field cascades to {impact.length - 1} downstream metric(s):
                  </Text>
                  <Table
                    headers={["Metric", "Current", "Updated"]}
                    rows={impact.map((i) => [
                      i.metric,
                      <Text size="small" tone="tertiary">{i.current}</Text>,
                      <Text size="small" weight="semibold" style={{ color: theme.category.green }}>{i.updated}</Text>,
                    ])}
                    striped
                  />
                </>
              ) : (
                <Text size="small" tone="tertiary">
                  No downstream metrics depend on this field.
                </Text>
              )}
            </Stack>
          )}

          {tab === "changelog" && (
            <Stack gap={6}>
              {DEFAULT_CHANGE_LOG.map((entry, i) => (
                <div key={i} style={{ ...dxpCard(theme), padding: "8px 10px" }}>
                  <Row align="center" justify="space-between">
                    <Text size="small" weight="semibold">{entry.action}</Text>
                    <Text size="small" tone="quaternary">{entry.timestamp}</Text>
                  </Row>
                  <Text size="small" tone="tertiary">{entry.actor} — {entry.detail}</Text>
                </div>
              ))}
            </Stack>
          )}

          <Divider />

          {/* Corrected value + note */}
          <Stack gap={6}>
            <Text size="small" weight="semibold">Corrected value</Text>
            <input
              type="text"
              value={correctedValue}
              onChange={(e: ChangeTarget) => setCorrectedValue(e.target.value)}
              placeholder={row.value}
              style={{
                padding: "6px 10px",
                borderRadius: 6,
                border: `1px solid ${theme.stroke.secondary}`,
                fontSize: 13,
                fontFamily: "Inter, sans-serif",
              }}
            />
            <Text size="small" weight="semibold">Note</Text>
            <textarea
              value={note}
              onChange={(e: ChangeTarget) => setNote(e.target.value)}
              placeholder="Type your message here"
              rows={2}
              style={{
                padding: "6px 10px",
                borderRadius: 6,
                border: `1px solid ${theme.stroke.secondary}`,
                fontSize: 13,
                fontFamily: "Inter, sans-serif",
                resize: "vertical",
              }}
            />
          </Stack>

          <Divider />
          <Text size="small" tone="tertiary">
            Agent: {agent.name} · Audit ID {row.auditId ?? `trace-${row.field.toLowerCase().replace(/\s/g, "-")}`}
          </Text>
          <Row gap={8}>
            <Button variant="primary" onClick={() => onAccept?.(row.field)}>
              Accept mapping
            </Button>
            <Button variant="ghost" onClick={handleCancel}>
              Cancel
            </Button>
            <Button variant="secondary" onClick={handleApply}>
              Apply correction
            </Button>
          </Row>
          <Text size="small" tone="quaternary">
            Enter a corrected value and/or note to apply an override. Accept mapping if the agent value is correct.
          </Text>
        </Stack>
      </CardBody>
        </Card>
      </div>
    </div>
  );
}

function caseDisplayTitle(caseId: CaseId): string {
  return caseId === "walmart" ? "Walmart Inc." : "Northern Retail LLC";
}

function caseDisplayCaseId(caseId: CaseId): string {
  return caseId === "walmart" ? "CS#001ABP" : "NRTL-REV-2025";
}

function formatDocSize(sizeKb: number): string {
  if (sizeKb >= 1024) return `${Math.round(sizeKb / 1024)} MB`;
  return `${sizeKb} KB`;
}

function formatDocCountLabel(received: number, total: number): string {
  return `${String(received).padStart(2, "0")}/${String(total).padStart(2, "0")} Documents Uploaded`;
}

function StatusDotBadge({
  label,
  tone,
}: {
  label: string;
  tone: "info" | "success" | "warning";
}) {
  const colors = { info: "#0A5AF5", success: "#1F8A65", warning: "#C08532" };
  const bg = { info: "#E8F0FE", success: "#E8F5EF", warning: "#FFF4E5" };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px",
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 500,
        background: bg[tone],
        color: colors[tone],
      }}
    >
      <span style={{ fontSize: 8 }}>●</span>
      {label}
    </span>
  );
}

function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
  theme,
}: {
  title: string;
  children?: ReactNode;
  defaultOpen?: boolean;
  theme: FigmaTheme;
}) {
  const [open, setOpen] = useCanvasState<boolean>(`collapse-${title}`, defaultOpen);
  return (
    <div style={{ borderTop: `1px solid ${theme.stroke.tertiary}` }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          padding: "10px 0",
          background: "none",
          border: "none",
          cursor: "pointer",
          fontFamily: "Inter, sans-serif",
          fontSize: 12,
          fontWeight: 600,
          color: theme.text.primary,
        }}
      >
        {title}
        <span style={{ fontSize: 10, color: theme.text.tertiary }}>{open ? "▾" : "▸"}</span>
      </button>
      {open && children && <div style={{ paddingBottom: 12 }}>{children}</div>}
    </div>
  );
}

function CollapsiblePipelineStepper({
  steps,
  theme,
}: {
  steps: PipelineStep[];
  theme: FigmaTheme;
}) {
  const [expanded, setExpanded] = useCanvasState<boolean>("pipelineStepperExpanded", true);
  return (
    <div>
      <Row align="center" justify="space-between" style={{ padding: "0 16px" }}>
        <div style={{ flex: 1 }} />
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          aria-label={expanded ? "Collapse pipeline" : "Expand pipeline"}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 12,
            color: theme.text.tertiary,
            padding: "4px 8px",
          }}
        >
          {expanded ? "▾" : "▸"}
        </button>
      </Row>
      {expanded && (
        <div style={{ padding: "0 16px 4px" }}>
          <CasePipelineStepper steps={steps} theme={theme} />
        </div>
      )}
    </div>
  );
}

type IntakeWorkspaceTab = "documents" | "exceptions";

function NextBestActionCard({
  theme,
  step,
  title,
  timestamp,
  explanation,
  onViewOlder,
}: {
  theme: FigmaTheme;
  step: number;
  title: string;
  timestamp: string;
  explanation: string;
  onViewOlder?: () => void;
}) {
  return (
    <div style={{ ...dxpCard(theme), padding: 16 }}>
      <Stack gap={10}>
        <Row gap={10} align="start">
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "#1860ec",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {step}
          </div>
          <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
            <Text weight="semibold" size="small">
              Next Best Action
            </Text>
            <Text size="small">{title}</Text>
            <Text size="small" tone="quaternary">
              {timestamp}
            </Text>
          </Stack>
        </Row>
        <div
          style={{
            padding: "8px 10px",
            borderRadius: 6,
            background: "#E8F0FE",
            border: `1px solid #B8D4FC`,
          }}
        >
          <Text size="small" style={{ color: "#0A5AF5" }}>
            {explanation}
          </Text>
        </div>
        {onViewOlder && (
          <button
            type="button"
            onClick={onViewOlder}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              fontSize: 11,
              color: theme.text.tertiary,
              textAlign: "left",
              fontFamily: "Inter, sans-serif",
            }}
          >
            View older
          </button>
        )}
      </Stack>
    </div>
  );
}

function CaseDetailsRightRail({
  theme,
  caseId,
  progress,
  runtimeLog,
  onPrimaryAction,
}: {
  theme: FigmaTheme;
  caseId: CaseId;
  progress: CaseProgress;
  runtimeLog: RuntimeLogEntry[];
  onPrimaryAction: () => void;
}) {
  const isNorthern = caseId === "northern-retail";
  const nbaTitle = isNorthern
    ? "Request missing documents from borrower portal"
    : "Evaluate Debt-to-Equity Restructuring & Liquidity Lifeline";
  const nbaExplanation = isNorthern
    ? "Gate 1 is blocked until all required documents are received per SOP §4.2."
    : "Completing this evaluation will resolve the 'Structural Insolvency' flag.";
  return (
    <Stack gap={12} style={{ width: 300, flexShrink: 0 }}>
      <NextBestActionCard
        theme={theme}
        step={isNorthern ? 1 : 3}
        title={nbaTitle}
        timestamp="03/17/2026 | 02:30 PM CST"
        explanation={nbaExplanation}
        onViewOlder={() => showActionToast("Prior recommendations archived (demo)")}
      />
      <div style={{ ...dxpCard(theme), padding: "0 16px" }}>
        <CollapsibleSection title="AI Tasks" theme={theme}>
          <Stack gap={6}>
            <Text size="small" tone="tertiary">
              Intake Agent: document classification complete
            </Text>
            <Text size="small" tone="tertiary">
              Connector Agent: EIN bureau sync queued after Gate 1
            </Text>
          </Stack>
        </CollapsibleSection>
        <CollapsibleSection title="Notes" theme={theme}>
          <Text size="small" tone="tertiary">
            No analyst notes yet. Overrides and gate sign-offs are logged to the audit trail.
          </Text>
        </CollapsibleSection>
        <CollapsibleSection title="Activity Log" theme={theme} defaultOpen>
          <Stack gap={4}>
            {runtimeLog.slice(-4).map((e, i) => (
              <Text key={`${e.time}-${i}`} size="small" tone="tertiary">
                {e.time} — {e.output}
              </Text>
            ))}
          </Stack>
        </CollapsibleSection>
      </div>
      <Button variant="primary" style={{ height: 32, fontSize: 12 }} onClick={onPrimaryAction}>
        {progress.primaryCta}
      </Button>
    </Stack>
  );
}

function CaseDetailsFooter({
  theme,
  entitySummary,
}: {
  theme: FigmaTheme;
  entitySummary: string;
}) {
  const [footerTab, setFooterTab] = useCanvasState<"details" | "comments">("caseFooterTab", "details");
  return (
    <div style={{ ...dxpCard(theme), padding: 0, overflow: "hidden" }}>
      <Row style={{ borderBottom: `1px solid ${theme.stroke.tertiary}`, padding: "0 16px" }}>
        {(["details", "comments"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFooterTab(tab)}
            style={{
              background: "none",
              border: "none",
              borderBottom: footerTab === tab ? `2px solid ${theme.accent.primary}` : "2px solid transparent",
              padding: "10px 12px",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: footerTab === tab ? 600 : 400,
              color: theme.text.primary,
              fontFamily: "Inter, sans-serif",
              textTransform: "capitalize",
            }}
          >
            {tab}
          </button>
        ))}
      </Row>
      <div style={{ padding: "0 16px" }}>
        <CollapsibleSection title="About Entity" theme={theme} defaultOpen>
          {footerTab === "details" ? (
            <Text size="small" tone="tertiary">
              {entitySummary}
            </Text>
          ) : (
            <Text size="small" tone="tertiary">
              No comments yet. Committee notes appear here after Gate 4 review.
            </Text>
          )}
        </CollapsibleSection>
      </div>
    </div>
  );
}

function CaseWorkspaceView({ theme }: { theme: FigmaTheme }) {
  const [caseId, setCaseId] = useCanvasState<CaseId>("activeCaseId", "walmart");
  const [stageId, setStageId] = useCanvasState<StageId>("caseStage", "review");
  const [selectedField, setSelectedField] = useCanvasState<string | null>("selectedField", null);
  const [detailTab, setDetailTab] = useCanvasState<CaseDetailTab>("caseDetailTab", "extracted");
  const [auditAppend, setAuditAppend] = useCanvasState<AuditEvent[]>("auditAppend", []);
  const [memoOpen, setMemoOpen] = useCanvasState<boolean>("memoFullOpen", false);
  const [lastCreatedLabel] = useCanvasState<string>("lastCreatedCaseLabel", "");
  const [savedAt, setSavedAt] = useCanvasState<string>("caseSavedAt", "");
  const [mappingSearch, setMappingSearch] = useCanvasState<string>("mappingFieldSearch", "");
  const [mappingPage, setMappingPage] = useCanvasState<number>("mappingPage", 0);
  const [confidenceFilter, setConfidenceFilter] = useCanvasState<"high" | "review" | "missing" | null>("mappingConfidenceFilter", null);
  const [intakeDocOverrides, setIntakeDocOverrides] = useCanvasState<IntakeDocOverridesByCase>("intakeDocOverrides", {});
  const [demoPortfolioContext] = useCanvasState<DemoPortfolioContext>("demoPortfolioContext", null);
  const [portfolioBannerDismissed, setPortfolioBannerDismissed] = useCanvasState<boolean>("portfolioBannerDismissed", false);
  const [, setSopViewer] = useCanvasState<{ section: string; appliedTo?: string } | null>("sopViewerOpen", null);

  const openSop = useCallback((section: string, appliedTo?: string) => {
    setSopViewer({ section, appliedTo });
  }, [setSopViewer]);

  // ── Real backend sync (Gate 1–5 sign-off only — see backendCase.ts) ────────
  const [backendCaseId, setBackendCaseId] = useState<string | null>(null);
  const [backendSignedGates, setBackendSignedGates] = useState<Set<string>>(new Set());
  const [backendSyncError, setBackendSyncError] = useState<string | null>(null);

  const refreshBackendGates = useCallback(async (id: string) => {
    const res = await fetchBackendCase(id);
    if (res) {
      setBackendSignedGates(backendGatesToSignedKinds(res.gates));
      setBackendSyncError(null);
    } else {
      setBackendSyncError("Could not reach the ACOS backend — gate signatures won't be saved this session.");
    }
  }, []);

  // Seeds intakeDocOverrides from the backend's real document-received state
  // so a reload reflects the backend, not just this tab's session — the
  // merge only ever adds `received: true` entries (see mergeIntakeDocs),
  // never un-marks a document the fixture already shows as received.
  const refreshBackendDocuments = useCallback(
    async (id: string, forRole: CaseId) => {
      const docs = await fetchBackendDocuments(id);
      if (!docs) return;
      setIntakeDocOverrides((prev) => ({
        ...prev,
        [forRole]: { ...(prev[forRole] ?? {}), ...docs },
      }));
    },
    [setIntakeDocOverrides],
  );

  useEffect(() => {
    let cancelled = false;
    setBackendCaseId(null);
    const role = caseId as BackendCaseRole;
    ensureBackendCase(role)
      .then((id) => {
        if (cancelled) return;
        setBackendCaseId(id);
        return Promise.all([refreshBackendGates(id), refreshBackendDocuments(id, caseId)]);
      })
      .catch(() => {
        if (!cancelled) setBackendSyncError("Could not reach the ACOS backend — gate signatures won't be saved this session.");
      });
    return () => {
      cancelled = true;
    };
  }, [caseId, refreshBackendGates, refreshBackendDocuments]);

  useEffect(() => {
    if (backendSyncError) showActionToast(backendSyncError);
  }, [backendSyncError]);

  const caseDef = CASES[caseId];
  const mergedIntakeDocs = mergeIntakeDocs(caseDef.intakeDocs, intakeDocOverrides[caseId]);
  const receivedCount = mergedIntakeDocs.filter((d) => d.received).length;
  const totalIntakeDocs = mergedIntakeDocs.length;

  const caseAudit = auditAppend.filter((e) => e.caseId === caseId);
  const signedGateActions = new Set([
    ...caseAudit.map((e) => e.gateAction).filter((g): g is GateSignKind => g != null),
    ...backendSignedGates,
  ] as GateSignKind[]);
  const gate1Signed = signedGateActions.has("gate1-sign");
  const isNorthern = caseId === "northern-retail";
  const missingNow = totalIntakeDocs - receivedCount;
  const gate1SignedAt = caseAudit.find((e) => e.gateAction === "gate1-sign")?.time;
  const mergedTraces: Record<StageId, StageTrace> = isNorthern
    ? {
        ...caseDef.traces,
        intake: {
          ...caseDef.traces.intake,
          status: gate1Signed ? "complete" : "blocked",
          timestamp: gate1Signed ? (gate1SignedAt ?? caseDef.traces.intake.timestamp) : caseDef.traces.intake.timestamp,
          summary: gate1Signed
            ? `${receivedCount} of ${totalIntakeDocs} documents received — Gate 1 signed, extraction unlocked`
            : missingNow === 0
              ? `${receivedCount} of ${totalIntakeDocs} documents received — Gate 1 sign-off required`
              : `${receivedCount} of ${totalIntakeDocs} documents received — ${missingNow} missing per SOP §4.2`,
          actors: caseDef.traces.intake.actors.map((a) =>
            a.kind === "human"
              ? {
                  ...a,
                  role: gate1Signed
                    ? "Signed Gate 1 — document set complete"
                    : missingNow === 0
                      ? "All documents received — ready to sign Gate 1"
                      : "Cannot sign Gate 1 — awaiting missing documents",
                }
              : a,
          ),
        },
      }
    : caseDef.traces;
  const northernPipelineUnlocked = isNorthern && gate1Signed && receivedCount === totalIntakeDocs;
  const memoSadPath = isNorthern && !northernPipelineUnlocked;
  const memoContent = isNorthern && northernPipelineUnlocked ? CASES.walmart : caseDef;
  const spreadMappingData = northernPipelineUnlocked ? CASES.walmart.mappingData : caseDef.mappingData;

  const acceptedFields = new Set(
    caseAudit.flatMap((e) => {
      const resolved: string[] = [];
      if (e.output.includes("Accepted mapping")) {
        const match = e.input.match(/Field: (.+?) —/);
        if (match?.[1]) resolved.push(match[1]);
      }
      if (e.input.includes("Override") || e.input.includes("corrected")) {
        for (const row of spreadMappingData) {
          if (row.confidence === "review" && e.input.includes(row.field)) {
            resolved.push(row.field);
          }
        }
      }
      return resolved;
    }),
  );
  const reviewExceptionCount = spreadMappingData.filter((r) => r.confidence === "review").length;
  const remainingExceptions = Math.max(0, reviewExceptionCount - acceptedFields.size);
  const gate5ResolutionFor = (audit: AuditEvent[]): "declined" | "tabled" | undefined => {
    if (audit.some((e) => e.id.includes("gate5-decline"))) return "declined";
    if (audit.some((e) => e.id.includes("gate5-table"))) return "tabled";
    return undefined;
  };
  const progress = deriveCaseProgress(caseDef, caseId, signedGateActions, remainingExceptions, {
    receivedCount,
    totalDocs: totalIntakeDocs,
    northernUnlocked: northernPipelineUnlocked,
    forceIntakeGate: stageId === "intake",
    gate5Resolution: gate5ResolutionFor(caseAudit),
  });

  const walmartAudit = auditAppend.filter((e) => e.caseId === "walmart");
  const walmartSigned = new Set(
    walmartAudit.map((e) => e.gateAction).filter((g): g is GateSignKind => g != null),
  );
  const walmartAccepted = new Set(
    walmartAudit.flatMap((e) => {
      const resolved: string[] = [];
      if (e.output.includes("Accepted mapping")) {
        const match = e.input.match(/Field: (.+?) —/);
        if (match?.[1]) resolved.push(match[1]);
      }
      return resolved;
    }),
  );
  const walmartExceptions = Math.max(
    0,
    CASES.walmart.mappingData.filter((r) => r.confidence === "review").length - walmartAccepted.size,
  );
  const northernAudit = auditAppend.filter((e) => e.caseId === "northern-retail");
  const northernSigned = new Set(
    northernAudit.map((e) => e.gateAction).filter((g): g is GateSignKind => g != null),
  );
  const northernMergedDocs = mergeIntakeDocs(
    CASES["northern-retail"].intakeDocs,
    intakeDocOverrides["northern-retail"],
  );
  const northernReceived = northernMergedDocs.filter((d) => d.received).length;
  const northernUnlockedForSwitcher =
    northernSigned.has("gate1-sign") && northernReceived === northernMergedDocs.length;
  const northernProgress = deriveCaseProgress(
    CASES["northern-retail"],
    "northern-retail",
    northernSigned,
    walmartExceptions,
    {
      receivedCount: northernReceived,
      totalDocs: northernMergedDocs.length,
      northernUnlocked: northernUnlockedForSwitcher,
    },
  );
  const walmartProgress = deriveCaseProgress(CASES.walmart, "walmart", walmartSigned, walmartExceptions, {
    gate5Resolution: gate5ResolutionFor(walmartAudit),
  });
  const caseSwitcherSubtitles: Record<CaseId, string> = {
    walmart: walmartProgress.gateLabel,
    "northern-retail": northernProgress.gateLabel,
  };

  const markDocReceived = useCallback(
    (docName: string, file?: File) => {
      const doc = mergedIntakeDocs.find((d) => d.name === docName);
      if (!doc || doc.received) return;
      const now = formatIntakeTimestamp();
      const sizeKb = file ? Math.max(1, Math.round(file.size / 1024)) : 240 + Math.floor(Math.random() * 400);
      const classification = intakeClassificationForDoc(doc);
      setIntakeDocOverrides((prev) => ({
        ...prev,
        [caseId]: {
          ...(prev[caseId] ?? {}),
          [docName]: {
            received: true,
            uploadedBy: "J. Martinez (Credit Analyst)",
            uploadedOn: now,
            sizeKb,
            classification,
            uploadedFileName: file?.name,
          },
        },
      }));
      if (backendCaseId) {
        receiveBackendDocument(backendCaseId, docName, "J. Martinez (Credit Analyst)", sizeKb, classification, file?.name).catch(
          () => setBackendSyncError(`"${docName}" received didn't reach the backend — it will not survive a reload.`),
        );
      }
      const nextCount = receivedCount + 1;
      showActionToast(
        file
          ? `${file.name} uploaded for ${docName} — ${nextCount}/${totalIntakeDocs} documents per SOP §4.2`
          : `${docName} received — ${nextCount}/${totalIntakeDocs} documents per SOP §4.2`,
      );
    },
    [backendCaseId, caseId, mergedIntakeDocs, receivedCount, setIntakeDocOverrides, totalIntakeDocs],
  );

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleFileInputChange = useCallback(
    (docName: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      markDocReceived(docName, file);
    },
    [markDocReceived],
  );

  const triggerFilePicker = useCallback((docName: string) => {
    fileInputRefs.current[docName]?.click();
  }, []);

  const markNextMissingDoc = useCallback(() => {
    const nextMissing = mergedIntakeDocs.find((d) => !d.received);
    if (!nextMissing) {
      showActionToast("All documents already received");
      return;
    }
    markDocReceived(nextMissing.name);
  }, [markDocReceived, mergedIntakeDocs]);

  useEffect(() => {
    setMappingPage(0);
  }, [mappingSearch, detailTab, confidenceFilter, setMappingPage]);

  const mergedLog: RuntimeLogEntry[] = [...caseDef.runtimeLog, ...caseAudit];
  const newEntryIds = new Set(caseAudit.map((e) => e.id));
  const activeTrace = mergedTraces[stageId];
  const selectedRow = spreadMappingData.find((r) => r.field === selectedField) ?? null;
  const mappingQuery = mappingSearch.trim().toLowerCase();
  const filteredMapping = spreadMappingData.filter(
    (r) =>
      (mappingQuery === "" ||
        r.field.toLowerCase().includes(mappingQuery) ||
        r.value.toLowerCase().includes(mappingQuery)) &&
      (confidenceFilter === null || r.confidence === confidenceFilter),
  );
  const mappingPageCount = Math.max(1, Math.ceil(filteredMapping.length / MAPPING_PAGE_SIZE));
  const safeMappingPage = Math.min(mappingPage, mappingPageCount - 1);
  const pagedMapping = filteredMapping.slice(
    safeMappingPage * MAPPING_PAGE_SIZE,
    safeMappingPage * MAPPING_PAGE_SIZE + MAPPING_PAGE_SIZE,
  );
  // Fire-and-forget: persists the signature to the real backend (see
  // backendCase.ts) and reconciles `backendSignedGates` from the server
  // response so a reload reflects the real, durable gate status. Local UX
  // (toasts, stage transitions) proceeds immediately without waiting on this.
  const persistGateToBackend = useCallback(
    (kind: GateSignKind) => {
      if (!backendCaseId) return;
      const gateId = kind.replace("-sign", "") as BackendGateId;
      signBackendGate(backendCaseId, gateId, "Sarah W. (Credit Analyst)")
        .then((res) => setBackendSignedGates(backendGatesToSignedKinds(res.gates)))
        .catch(() => setBackendSyncError(`Gate ${gateId} sign didn't reach the backend — it will not survive a reload.`));
    },
    [backendCaseId],
  );

  // Same fire-and-forget pattern, for the two non-approve Gate 5 committee
  // outcomes. Note: only the click itself is persisted here — the local
  // "already resolved this session" guards below still key off the local
  // audit log, not a backend refetch, so this doesn't yet survive a reload
  // the way Gate 1–5 approve does (see docs/KNOWN_ISSUES.md).
  const persistGate5Resolution = useCallback(
    (status: "rejected" | "tabled", reason: string) => {
      if (!backendCaseId) return;
      signBackendGate(backendCaseId, "gate5", "Credit Committee", reason, status).catch(() =>
        setBackendSyncError(`Gate 5 ${status === "rejected" ? "decline" : "table"} didn't reach the backend — it will not survive a reload.`),
      );
    },
    [backendCaseId],
  );

  // Same fire-and-forget pattern as persistGateToBackend, but only for
  // fields known to exist on both the frontend fixture and the backend's
  // seeded exception data (see BACKEND_WIRED_MAPPING_FIELDS in backendCase.ts).
  const persistMappingActionToBackend = useCallback(
    (action: Extract<GateAction, { kind: "mapping-accept" | "mapping-override" }>) => {
      if (!backendCaseId || !BACKEND_WIRED_MAPPING_FIELDS.has(action.field)) return;
      const isAccept = action.kind === "mapping-accept";
      const currentValue = spreadMappingData.find((r) => r.field === action.field)?.value ?? "";
      const correctedValue = isAccept ? currentValue : action.correctedValue || currentValue;
      const reason = isAccept
        ? "Analyst accepted the agent-mapped value as correct."
        : action.note || "Analyst-corrected value via Trust Inspector.";
      overrideBackendField(backendCaseId, action.field, correctedValue, reason, "Sarah W. (Credit Analyst)").catch(() =>
        setBackendSyncError(`Correction for ${action.field} didn't reach the backend — it will not survive a reload.`),
      );
    },
    [backendCaseId, spreadMappingData],
  );

  const appendAudit = (action: GateAction) => {
    if (isGateSignKind(action.kind)) {
      const alreadySigned = signedGateActions.has(action.kind);
      if (alreadySigned) {
        showActionToast("This gate was already signed in this session");
        return;
      }
      if (action.kind === "gate1-sign") {
        if (receivedCount < totalIntakeDocs) {
          showActionToast(`All ${totalIntakeDocs} documents required before signing Gate 1`);
          return;
        }
        const event = makeAuditEvent(caseId, action);
        setAuditAppend((prev) => [...prev, event]);
        persistGateToBackend(action.kind);
        showActionToast("Gate 1 signed — pipeline unlocked for extraction");
        setStageId("extraction");
        return;
      }
      if (action.kind === "gate2-sign" && remainingExceptions > 0) {
        showActionToast("Resolve mapping exceptions before signing Gate 2");
        setStageId("review");
        setDetailTab("exceptions");
        return;
      }
      if (action.kind === "gate5-sign" && caseAudit.some((e) => e.id.includes("gate5"))) {
        showActionToast("Gate 5 already has a committee decision recorded this session");
        return;
      }
      const event = makeAuditEvent(caseId, action);
      setAuditAppend((prev) => [...prev, event]);
      persistGateToBackend(action.kind);
      if (action.kind === "gate2-sign") {
        showActionToast("Gate 2 signed — Risk Agent released for assessment");
        setStageId("assessment");
        setDetailTab("extracted");
      } else if (action.kind === "gate3-sign") {
        showActionToast("Gate 3 signed — Memo Composer released");
        setStageId("memo");
      } else if (action.kind === "gate4-sign") {
        showActionToast("Gate 4 signed — Decision Synthesis released");
        setStageId("decision");
      } else if (action.kind === "gate5-sign") {
        showActionToast("Gate 5 signed — committee decision recorded");
      }
      return;
    }
    if (action.kind === "gate5-decline" || action.kind === "gate5-table") {
      const gate5AlreadyResolved = caseAudit.some((e) => e.id.includes("gate5"));
      if (gate5AlreadyResolved) {
        showActionToast("Gate 5 already has a committee decision recorded this session");
        return;
      }
    }
    const event = makeAuditEvent(caseId, action);
    setAuditAppend((prev) => [...prev, event]);
    if (action.kind === "intake-override") showActionToast("Intake override logged to audit trail");
    else if (action.kind === "intake-doc-request") showActionToast("Doc request reminder sent — pipeline remains blocked");
    else if (action.kind === "mapping-accept") {
      showActionToast(`Accepted mapping for ${action.field}`);
      persistMappingActionToBackend(action);
    } else if (action.kind === "mapping-override") {
      showActionToast("Override logged with reason and timestamp");
      persistMappingActionToBackend(action);
    }
    else if (action.kind === "gate5-decline") {
      showActionToast("Gate 5 declined — committee vote recorded, case closed per SOP §14");
      persistGate5Resolution("rejected", "Committee vote per SOP §14 — declined");
    } else if (action.kind === "gate5-table") {
      showActionToast("Gate 5 tabled — additional information requested, case remains open");
      persistGate5Resolution("tabled", "Committee tabled per SOP §14 — additional information requested");
    }
  };

  const switchCase = (id: CaseId) => {
    setCaseId(id);
    setStageId(CASES[id].defaultStage);
    setSelectedField(null);
    setMappingSearch("");
  };

  const [intakeTab, setIntakeTab] = useCanvasState<IntakeWorkspaceTab>("intakeWorkspaceTab", "documents");

  const handleMarkComplete = useCallback(() => {
    if (receivedCount < totalIntakeDocs) {
      showActionToast(`Upload remaining documents — ${formatDocCountLabel(receivedCount, totalIntakeDocs)}`);
      return;
    }
    if (gate1Signed) {
      showActionToast("Ingestion complete — advancing to extraction");
      setStageId("extraction");
      return;
    }
    appendAudit({ kind: "gate1-sign" });
  }, [receivedCount, totalIntakeDocs, gate1Signed, setStageId, appendAudit]);

  const missingDocs = totalIntakeDocs - receivedCount;
  const intakeComplete = gate1Signed || (caseId === "walmart" && stageId !== "intake");
  const pipelineSteps: PipelineStep[] = (() => {
    if (!intakeComplete) {
      return [
        { label: "Ingestion", status: "active" },
        { label: "Extractions", status: missingDocs > 0 ? "blocked" : "pending", badge: missingDocs > 0 ? missingDocs : undefined },
        { label: "Output", status: "pending" },
        { label: "Health", status: "pending" },
      ];
    }
    if (!signedGateActions.has("gate2-sign")) {
      return [
        { label: "Ingestion", status: "done" },
        { label: "Extractions", status: "done" },
        { label: "Output", status: "active", badge: remainingExceptions > 0 ? remainingExceptions : undefined },
        { label: "Health", status: "pending" },
      ];
    }
    return [
      { label: "Ingestion", status: "done" },
      { label: "Extractions", status: "done" },
      { label: "Output", status: "done" },
      { label: "Health", status: signedGateActions.has("gate5-sign") ? "done" : "active" },
    ];
  })();

  const showIntakeDetails = stageId === "intake";

  const showReviewWorkspace = stageId === "review" && (!isNorthern || northernPipelineUnlocked);
  const showAssessmentWorkspace = stageId === "assessment" && (!isNorthern || northernPipelineUnlocked);
  const showMemoWorkspace = stageId === "memo";
  const showDecisionWorkspace = stageId === "decision" && (!isNorthern || northernPipelineUnlocked);
  const showExtractionMapping =
    (stageId === "extraction" || stageId === "mapping") && (!isNorthern || northernPipelineUnlocked);

  return (
    <Stack gap={12}>
      {memoOpen && (
        <CreditMemoFullView
          theme={theme}
          onClose={() => setMemoOpen(false)}
          onSubmit={() => appendAudit({ kind: "gate4-sign" })}
          gate4Signed={signedGateActions.has("gate4-sign")}
        />
      )}
      {lastCreatedLabel && (
        <Callout tone="success" title={`Case created: ${lastCreatedLabel}`}>
          Intake Agent queued document validation for {lastCreatedLabel}. Demo opens the nearest matching workspace template.
        </Callout>
      )}
      <CaseSwitcher
        activeId={caseId}
        onChange={switchCase}
        theme={theme}
        subtitles={caseSwitcherSubtitles}
      />

      {demoPortfolioContext && !portfolioBannerDismissed && (
        <Callout tone="info" title={`Portfolio drill-down: ${demoPortfolioContext.entity}`}>
          <Row align="center" justify="space-between" wrap gap={8}>
            <Text size="small">
              Workspace uses Walmart spread template for demo depth — concern: {demoPortfolioContext.concern}
            </Text>
            <Button
              variant="ghost"
              style={{ height: 26, fontSize: 11 }}
              data-testid="dismiss-portfolio-banner"
              onClick={() => setPortfolioBannerDismissed(true)}
            >
              Dismiss
            </Button>
          </Row>
        </Callout>
      )}

      {northernPipelineUnlocked && stageId === "review" && (
        <Callout tone="info" title="Spreading template">
          Spreading template: Walmart FY2025 10-K (Northern Retail intake complete)
        </Callout>
      )}

      <div style={{ ...dxpCard(theme), padding: 0, overflow: "hidden" }}>
        {/* Case header bar */}
        <div style={{ padding: "10px 16px", borderBottom: `1px solid ${theme.stroke.tertiary}` }}>
          <Row align="center" justify="space-between" wrap gap={8}>
            <Row gap={8} align="center">
              <span style={{ fontSize: 16 }}>💼</span>
              <Text weight="semibold">{caseDisplayTitle(caseId)}</Text>
              <Text size="small" tone="quaternary">···</Text>
            </Row>
            <Row gap={8} align="center">
              <CollaboratorAvatars theme={theme} initials={["SW", "MC", "J"]} />
              <Button
                variant="ghost"
                style={{ height: 28, fontSize: 11 }}
                onClick={() => {
                  setSavedAt(new Date().toLocaleTimeString());
                  showActionToast(`Case draft saved · ${caseDef.caseRef}`);
                }}
              >
                Save
              </Button>
              {savedAt && (
                <Text size="small" tone="quaternary">
                  Saved {savedAt}
                </Text>
              )}
              <Button
                variant="primary"
                style={{ height: 28, fontSize: 11 }}
                onClick={() => {
                  setMemoOpen(true);
                  showActionToast("Generating credit memo draft (demo)");
                }}
              >
                Generate
              </Button>
            </Row>
          </Row>
        </div>
        {/* Case metadata row */}
        <div style={{ padding: "8px 16px", borderBottom: `1px solid ${theme.stroke.tertiary}` }}>
          <Row gap={24} wrap align="center">
            {[
              { label: "Case ID", value: caseDisplayCaseId(caseId) },
              { label: "Case / Trigger Type", value: isNorthern ? "Revolving Credit" : "New Loan" },
              { label: "SLA", value: isNorthern && missingDocs > 0 ? "4 hrs remaining" : isNorthern ? "Blocked" : "2 hrs remaining" },
            ].map((item) => (
              <div key={item.label}>
                <Stack gap={1}>
                  <Text size="small" tone="quaternary">{item.label}</Text>
                  <Text size="small" weight="semibold">{item.value}</Text>
                </Stack>
              </div>
            ))}
            <div>
              <Stack gap={1}>
                <Text size="small" tone="quaternary">Status</Text>
                <StatusDotBadge
                  label={isNorthern && missingDocs > 0 ? "Blocked" : progress.statusLabel}
                  tone={isNorthern && missingDocs > 0 ? "warning" : "info"}
                />
              </Stack>
            </div>
            <div>
              <Stack gap={1}>
                <Text size="small" tone="quaternary">Extraction Confidence</Text>
                {isNorthern && missingDocs > 0 ? (
                  <Pill tone="warning">{`${Math.round((receivedCount / totalIntakeDocs) * 100)}%`}</Pill>
                ) : (
                  <Pill tone="warning">78%</Pill>
                )}
              </Stack>
            </div>
            <div>
              <Stack gap={1}>
                <Text size="small" tone="quaternary">Risk</Text>
                <StatusDotBadge label={isNorthern ? "High Risk" : "Low Risk"} tone={isNorthern ? "warning" : "success"} />
              </Stack>
            </div>
            <div>
              <Stack gap={1}>
                <Text size="small" tone="quaternary">Normalization</Text>
                <Pill tone="warning">{isNorthern ? "Pending" : "Pending Validation"}</Pill>
              </Stack>
            </div>
          </Row>
        </div>
        {/* Pipeline stepper */}
        <CollapsiblePipelineStepper steps={pipelineSteps} theme={theme} />
        {/* Trust strip + briefing — hidden on intake (moved to right rail) */}
        {!showIntakeDetails && (
        <div style={{ padding: "8px 16px 12px" }}>
          <Stack gap={8}>
            <Row align="center" wrap gap={8}>
              <AgentTag agentId="orchestrator" theme={theme} />
              <Text size="small" tone="tertiary">
                Orchestrator: {progress.orchestratorStatus}
              </Text>
              <Spacer />
              <Pill tone={progress.gateTone}>{progress.gateLabel}</Pill>
            </Row>
            <CaseTrustStrip
              caseDef={caseDef}
              auditCount={caseAudit.length}
              theme={theme}
              openExceptions={remainingExceptions}
              caseId={caseId}
              gateLabel={progress.gateLabel}
              gateTone={progress.gateTone}
            />
            <Callout
              tone={isNorthern ? "warning" : "info"}
              title={isNorthern ? "Agents stopped — humans govern" : "Agents did the work — you approve"}
            >
              {caseDef.briefingBody}
            </Callout>
            <Row gap={8} align="center" wrap>
              <Text size="small" weight="semibold">Next best action:</Text>
              <Text size="small">{progress.nextBestAction}</Text>
              <Button
                variant="primary"
                style={{ height: 28, fontSize: 12, borderRadius: 4 }}
                onClick={() => {
                  setStageId(progress.primaryStage);
                  if (progress.primaryStage === "review" && remainingExceptions > 0) {
                    setDetailTab("exceptions");
                  }
                }}
              >
                {progress.primaryCta}
              </Button>
            </Row>
          </Stack>
        </div>
        )}
      </div>

      <Row gap={12} align="start" style={{ alignItems: "stretch" }}>
        <LifecycleRail traces={mergedTraces} activeId={stageId} onSelect={setStageId} theme={theme} />

        <Stack gap={12} style={{ flex: 1, minWidth: 0 }}>
          <StageTracePanel trace={activeTrace} theme={theme} onOpenSop={openSop} />

          {showIntakeDetails ? (
            <Row gap={12} align="start" style={{ alignItems: "stretch" }}>
              <Stack gap={12} style={{ flex: 1, minWidth: 0 }}>
                <div style={dxpCard(theme)}>
                  <Stack gap={12}>
                    <Row align="center" justify="space-between" wrap gap={8}>
                      <span data-testid="intake-doc-count-header">
                        <Text weight="semibold" size="small">
                          {formatDocCountLabel(receivedCount, totalIntakeDocs)}
                        </Text>
                      </span>
                      <Row gap={8} align="center">
                        <ActionsMenu
                          theme={theme}
                          label="Actions ▾"
                          menuKey="intakeActionsMenu"
                          items={[
                            { label: "Export document list", onClick: () => showActionToast("Document manifest exported (demo)") },
                            { label: "View SOP §4.2 manifest", onClick: () => openSop("§4.2", "Required document manifest") },
                            { label: "Request missing docs", onClick: () => appendAudit({ kind: "intake-doc-request" }) },
                          ]}
                        />
                        <Button
                          variant="primary"
                          style={{ height: 28, fontSize: 11 }}
                          data-testid="mark-complete-button"
                          disabled={gate1Signed}
                          onClick={handleMarkComplete}
                        >
                          Mark Complete
                        </Button>
                      </Row>
                    </Row>
                    <Row style={{ borderBottom: `1px solid ${theme.stroke.tertiary}` }}>
                      {(["documents", "exceptions"] as const).map((tab) => {
                        const count = tab === "documents" ? totalIntakeDocs : missingDocs;
                        return (
                          <button
                            key={tab}
                            type="button"
                            onClick={() => setIntakeTab(tab)}
                            style={{
                              background: "none",
                              border: "none",
                              borderBottom: intakeTab === tab ? `2px solid ${theme.accent.primary}` : "2px solid transparent",
                              padding: "8px 12px",
                              cursor: "pointer",
                              fontSize: 12,
                              fontWeight: intakeTab === tab ? 600 : 400,
                              color: theme.text.primary,
                              fontFamily: "Inter, sans-serif",
                            }}
                          >
                            {tab === "documents" ? `Documents (${count})` : `Exceptions (${count})`}
                          </button>
                        );
                      })}
                    </Row>
                    <Row justify="end" gap={8}>
                      <Text size="small" tone="quaternary">Use ↑ Upload file on a row to attach a real document</Text>
                      <Button
                        variant="ghost"
                        style={{ height: 26, fontSize: 11 }}
                        data-testid="intake-upload-button"
                        onClick={() => markNextMissingDoc()}
                      >
                        Quick-fill next (demo)
                      </Button>
                    </Row>
                    {isNorthern && !gate1Signed && missingDocs > 0 && (
                      <Callout tone="warning" title={`Gate 1 blocked — ${missingDocs} documents missing`}>
                        Intake Agent cannot release extraction. EIN captured from credit application — Connector
                        Agent ran preliminary AML entity screen; full bureau + guarantor SSN KYC deferred.
                      </Callout>
                    )}
                    {isNorthern && !gate1Signed && missingDocs === 0 && (
                      <Callout tone="info" title="All documents received — Gate 1 sign-off required">
                        Intake Agent validated all documents per SOP §4.2. Mark Complete to release extraction pipeline.
                      </Callout>
                    )}
                    {gate1Signed && (
                      <Callout tone="success" title="Gate 1 passed">
                        Intake Agent validated document set per SOP §4.2. EIN captured → Connector Agent synced
                        Experian, Equifax, D&B, and AML/KYC APIs in parallel.
                      </Callout>
                    )}
                    {intakeTab === "documents" && (
                      <Table
                        headers={["Document", "Classification", "Size", "Status", "Uploaded On", "Uploaded By", ""]}
                        rows={mergedIntakeDocs.map((doc) => [
                          <Row gap={6} align="center">
                            <span style={{ fontSize: 13, color: "#B42018" }}>📄</span>
                            <Stack gap={2}>
                              <Text size="small" weight="semibold">{doc.name}</Text>
                              <SopLink section={doc.sopRef} appliedTo={doc.name} onOpen={openSop} />
                              {doc.uploadedFileName && (
                                <Text size="small" tone="quaternary">Uploaded: {doc.uploadedFileName}</Text>
                              )}
                            </Stack>
                          </Row>,
                          doc.classification ? (
                            <Text size="small">{doc.classification}</Text>
                          ) : (
                            <Text size="small" tone="quaternary">—</Text>
                          ),
                          doc.sizeKb ? formatDocSize(doc.sizeKb) : "—",
                          doc.received ? (
                            <ExtractedBadge theme={theme} />
                          ) : (
                            <Pill tone="deleted">Missing</Pill>
                          ),
                          doc.uploadedOn ?? "—",
                          doc.uploadedBy ?? "—",
                          !doc.received ? (
                            <Row gap={6} align="center">
                              <input
                                ref={(el) => {
                                  fileInputRefs.current[doc.name] = el;
                                }}
                                type="file"
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.csv"
                                style={{ display: "none" }}
                                data-testid={`upload-input-${doc.name.replace(/\s+/g, "-").toLowerCase()}`}
                                onChange={handleFileInputChange(doc.name)}
                              />
                              <Button
                                variant="primary"
                                style={{ height: 24, fontSize: 10 }}
                                data-testid={`upload-file-${doc.name.replace(/\s+/g, "-").toLowerCase()}`}
                                onClick={() => triggerFilePicker(doc.name)}
                              >
                                ↑ Upload file
                              </Button>
                              <Button
                                variant="ghost"
                                style={{ height: 24, fontSize: 10 }}
                                data-testid={`mark-received-${doc.name.replace(/\s+/g, "-").toLowerCase()}`}
                                onClick={() => markDocReceived(doc.name)}
                              >
                                Mark received (demo)
                              </Button>
                            </Row>
                          ) : (
                            <ActionsMenu
                              theme={theme}
                              label="···"
                              menuKey={`doc-menu-${doc.name}`}
                              items={[
                                { label: "View document", onClick: () => showActionToast(`Opening ${doc.name} (demo)`) },
                                { label: "Re-classify", onClick: () => showActionToast("Re-classification queued (demo)") },
                              ]}
                            />
                          ),
                        ])}
                        rowTone={mergedIntakeDocs.map((d) => (d.received ? "success" : "danger"))}
                        striped
                      />
                    )}
                    {intakeTab === "exceptions" && (
                      <Stack gap={8}>
                        {missingDocs === 0 ? (
                          <Text size="small" tone="tertiary">No intake exceptions — all documents received and classified.</Text>
                        ) : (
                          mergedIntakeDocs
                            .filter((d) => !d.received)
                            .map((doc) => (
                              <Callout key={doc.name} tone="warning" title={`Missing: ${doc.name}`}>
                                Required per {doc.sopRef}. Upload or request from borrower portal.
                              </Callout>
                            ))
                        )}
                      </Stack>
                    )}
                    {isNorthern && !gate1Signed && missingDocs === 0 && (
                      <GateSignOffBar
                        mode="gate1-sign"
                        theme={theme}
                        disabled={gate1Signed}
                        onAction={(action) => appendAudit(action)}
                      />
                    )}
                    {isNorthern && !gate1Signed && missingDocs > 0 && (
                      <GateSignOffBar
                        mode="intake-override"
                        theme={theme}
                        onAction={(action) => appendAudit(action)}
                      />
                    )}
                  </Stack>
                </div>
                <CaseDetailsFooter theme={theme} entitySummary={caseDef.entitySummary} />
              </Stack>
              <CaseDetailsRightRail
                theme={theme}
                caseId={caseId}
                progress={progress}
                runtimeLog={mergedLog}
                onPrimaryAction={() => {
                  if (progress.primaryStage === "intake") handleMarkComplete();
                  else {
                    setStageId(progress.primaryStage);
                    if (progress.primaryStage === "review" && remainingExceptions > 0) setDetailTab("exceptions");
                  }
                }}
              />
            </Row>
          ) : (
            <>
          <Text weight="semibold" size="small">
            Stage workspace
          </Text>
          {showReviewWorkspace && (
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
                    counts={{
                      extracted: spreadMappingData.length,
                      exceptions: spreadMappingData.filter((r) => r.confidence === "review").length,
                      corrected: caseAudit.filter(
                        (e) =>
                          e.input.includes("Override") ||
                          e.input.includes("corrected") ||
                          e.output.includes("Accepted mapping"),
                      ).length,
                      normalized: NORMALIZED_VALUES.length,
                    }}
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
                  <input
                    type="text"
                    value={mappingSearch}
                    onChange={(e) => setMappingSearch(e.target.value)}
                    placeholder="Search fields"
                    style={{
                      border: `1px solid ${theme.stroke.secondary}`,
                      borderRadius: 4,
                      padding: "4px 8px",
                      fontSize: 12,
                      width: 160,
                      fontFamily: "Inter, sans-serif",
                    }}
                  />
                  <Row gap={8} align="center">
                    <Text size="small" tone="tertiary">
                      Extraction Confidence
                    </Text>
                    <FigmaConfidenceBadge
                      level="high"
                      label="High"
                      theme={theme}
                      active={confidenceFilter === "high"}
                      testId="confidence-filter-high"
                      onClick={() => setConfidenceFilter(confidenceFilter === "high" ? null : "high")}
                    />
                    <FigmaConfidenceBadge
                      level="review"
                      label="Review"
                      theme={theme}
                      active={confidenceFilter === "review"}
                      testId="confidence-filter-review"
                      onClick={() => setConfidenceFilter(confidenceFilter === "review" ? null : "review")}
                    />
                    <FigmaConfidenceBadge
                      level="missing"
                      label="Low"
                      theme={theme}
                      active={confidenceFilter === "missing"}
                      testId="confidence-filter-missing"
                      onClick={() => setConfidenceFilter(confidenceFilter === "missing" ? null : "missing")}
                    />
                    {confidenceFilter && (
                      <Button variant="ghost" style={{ height: 24, fontSize: 11 }} onClick={() => setConfidenceFilter(null)}>
                        Clear filter
                      </Button>
                    )}
                  </Row>
                </Row>
                <Row gap={0} align="stretch" style={{ minHeight: 400 }}>
                  <CasePdfPane theme={theme} />
                  <Stack gap={0} style={{ flex: 1, padding: 16, minWidth: 0 }}>
                    {detailTab === "extracted" && (
                      <Stack gap={8}>
                        <Table
                          headers={["Field", "Value", "Status", "Confidence", "Agent", ""]}
                          rows={pagedMapping.map((r) => {
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
                          rowTone={pagedMapping.map((r) =>
                            r.confidence === "review" ? "warning" : r.confidence === "high" ? "success" : "neutral",
                          )}
                          striped
                        />
                        {filteredMapping.length > MAPPING_PAGE_SIZE && (
                          <Row align="center" justify="space-between">
                            <Text size="small" tone="tertiary">
                              Showing {safeMappingPage * MAPPING_PAGE_SIZE + 1}–
                              {Math.min((safeMappingPage + 1) * MAPPING_PAGE_SIZE, filteredMapping.length)} of{" "}
                              {filteredMapping.length} fields
                            </Text>
                            <Row gap={8}>
                              <Button
                                variant="ghost"
                                style={{ height: 26, fontSize: 11 }}
                                disabled={safeMappingPage === 0}
                                onClick={() => setMappingPage(Math.max(0, safeMappingPage - 1))}
                              >
                                ← Prev
                              </Button>
                              <Button
                                variant="ghost"
                                style={{ height: 26, fontSize: 11 }}
                                disabled={safeMappingPage >= mappingPageCount - 1}
                                onClick={() => setMappingPage(Math.min(mappingPageCount - 1, safeMappingPage + 1))}
                              >
                                Next →
                              </Button>
                            </Row>
                          </Row>
                        )}
                      </Stack>
                    )}
                    {detailTab === "exceptions" && (
                      <Stack gap={8}>
                        {remainingExceptions === 0 ? (
                          <Callout tone="success" title="All exceptions resolved">
                            Mapping exceptions cleared. Sign Gate 2 below to release Risk Agent.
                          </Callout>
                        ) : (
                          spreadMappingData
                            .filter((r) => r.confidence === "review" && !acceptedFields.has(r.field))
                            .map((r) => (
                              <div key={r.field}>
                                <Callout tone="warning" title={`Review Agent exception — ${r.field}`}>
                                  {r.value} — {r.reasoning ?? "Flagged for analyst verification."}
                                </Callout>
                                <Button
                                  variant="primary"
                                  style={{ marginTop: 8 }}
                                  data-testid={`inspect-exception-${r.field.replace(/\s+/g, "-").toLowerCase()}`}
                                  onClick={() => setSelectedField(r.field)}
                                >
                                  Open Trust Inspector — {r.field}
                                </Button>
                              </div>
                            ))
                        )}
                      </Stack>
                    )}
                    {detailTab === "corrected" && (
                      <Stack gap={8}>
                        {caseAudit.filter((e) => e.input.includes("Override") || e.input.includes("corrected")).length === 0 ? (
                          <Text size="small" tone="tertiary">
                            No analyst corrections yet. Overrides are logged with reason and timestamp.
                          </Text>
                        ) : (
                          <Table
                            headers={["Time", "Field", "Action", "Reason"]}
                            rows={caseAudit
                              .filter((e) => e.input.includes("Override") || e.input.includes("corrected"))
                              .map((e) => [
                                e.time,
                                e.input.replace("Override request: ", "").replace("Field override request: ", ""),
                                <Pill tone="warning">Override</Pill>,
                                e.reasoning,
                              ])}
                            striped
                          />
                        )}
                      </Stack>
                    )}
                    {detailTab === "normalized" && (
                      <Stack gap={8}>
                        <Row gap={8} align="center">
                          <AgentTag agentId="mapping" theme={theme} />
                          <Text size="small" tone="tertiary">
                            Raw line items decomposed into internal chart-of-account components per GAAP normalization rules
                          </Text>
                        </Row>
                        <Table
                          headers={["Line Item", "Internal Component", "As of Jan 31, 2026", "As of Jan 31, 2025"]}
                          rows={NORMALIZED_VALUES.map((n) => [
                            <Text size="small" weight={n.indent === 0 ? "semibold" : undefined}>
                              {n.indent === 0 ? n.lineItem : ""}
                            </Text>,
                            <Text size="small" style={{ paddingLeft: n.indent * 16, color: n.indent === 0 ? theme.text.primary : theme.text.secondary }}>
                              {n.indent === 0 ? "—" : n.component}
                            </Text>,
                            <Text size="small" weight={n.indent === 0 ? "semibold" : undefined}>{n.fy2026}</Text>,
                            <Text size="small" tone="tertiary">{n.fy2025}</Text>,
                          ])}
                          striped
                        />
                      </Stack>
                    )}
                  </Stack>
                </Row>
              </div>
              {selectedRow && (
                <TrustInspector
                  row={selectedRow}
                  theme={theme}
                  onClose={() => setSelectedField(null)}
                  onOpenSop={openSop}
                  onAccept={(field) => {
                    appendAudit({ kind: "mapping-accept", field });
                    setSelectedField(null);
                  }}
                  onOverride={(field, correctedValue, note) => {
                    appendAudit({ kind: "mapping-override", field, correctedValue, note });
                    setSelectedField(null);
                  }}
                />
              )}
              <ValidateRatiosPanel
                theme={theme}
                onMarkComplete={() => {
                  showActionToast(
                    remainingExceptions > 0
                      ? "Ratios validated — resolve Total Assets exception, then sign Gate 2"
                      : "Ratios validated — sign Gate 2 below to release Risk Agent",
                  );
                  if (remainingExceptions > 0) setDetailTab("exceptions");
                }}
              />
              <Card>
                <CardHeader trailing={<AgentTag agentId="mapping" theme={theme} />}>
                  Gate 2 — Sign off spread
                </CardHeader>
                <CardBody>
                  <Callout tone="warning" title="Human Gate 2 required">
                    {remainingExceptions > 0
                      ? `Review Agent flagged ${remainingExceptions} exception(s). Accept or correct on Exceptions tab, then sign off to release Risk Agent.`
                      : "Exceptions cleared. Sign off to release Risk Agent for ratio calculation."}
                  </Callout>
                  <GateSignOffBar
                    mode="gate2-sign"
                    theme={theme}
                    disabled={signedGateActions.has("gate2-sign")}
                    onAction={(action) => appendAudit(action)}
                  />
                </CardBody>
              </Card>
            </>
          )}

          {isNorthern && !northernPipelineUnlocked && stageId !== "memo" && (
            <div style={dxpCard(theme)}>
              <Callout tone="warning" title="Pipeline held by Orchestrator">
                This stage has not started. Gate 1 is blocked on incomplete documents — see Intake stage trace for
                input, reasoning, and output. Downstream agents are queued but not assigned.
              </Callout>
            </div>
          )}

          {showAssessmentWorkspace && (
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
                    disabled={signedGateActions.has("gate3-sign")}
                    onAction={(action) => appendAudit(action)}
                  />
                </CardBody>
              </Card>
            </Stack>
          )}

          {showMemoWorkspace && (
            <Stack gap={12}>
              <ConnectorTrustPanel
                feeds={memoContent.connectorFeeds}
                entitySummary={memoContent.entitySummary}
                theme={theme}
              />
              <CreditMemoPreview sections={memoContent.memoSections} theme={theme} />
              {memoSadPath ? (
                <Callout tone="warning" title="Memo blocked — intake incomplete">
                  Connector Agent ran preliminary AML on EIN. Bureau and guarantor SSN KYC blocked — intake
                  incomplete. Connectors respect pipeline gates; full memo generates after Gate 1 and document set
                  completion.
                </Callout>
              ) : (
                <Card>
                  <CardHeader trailing={<AgentTag agentId="memo" theme={theme} />}>
                    Gate 4 — Memo coherence review
                  </CardHeader>
                  <CardBody>
                    <Callout tone="info" title="Memo draft ready for review">
                      Memo Composer Agent has drafted all sections. Connector citations verified. Gate 4 sign-off
                      releases Decision Synthesis Agent for committee package.
                    </Callout>
                    <GateSignOffBar
                      mode="gate4-sign"
                      theme={theme}
                      disabled={signedGateActions.has("gate4-sign")}
                      onAction={(action) => appendAudit(action)}
                    />
                  </CardBody>
                </Card>
              )}
            </Stack>
          )}

          {showDecisionWorkspace && (
            <Stack gap={12}>
              <DecisionRationalePanel theme={theme} />
              <Card>
                <CardHeader trailing={<AgentTag agentId="decision" theme={theme} />}>
                  Gate 5 — Credit committee decision
                </CardHeader>
                <CardBody>
                  <Callout tone="info" title="Committee package ready">
                    Decision Synthesis Agent recommends Conditional Approve (score 5.45/10). Spread, bureau
                    verification, AML/KYC attestation, and connector evidence bundle attached. Gate 5 sign-off
                    required to close the case. Committee composition, quorum, and decision options governed by{" "}
                    <SopLink section="§14" appliedTo="Gate 5 — Credit committee decision" onOpen={openSop} />.
                  </Callout>
                  {(() => {
                    const gate5Event = caseAudit.find((e) => e.id.includes("gate5"));
                    if (!gate5Event) return null;
                    const tone = gate5Event.id.includes("decline") ? "danger" : gate5Event.id.includes("table") ? "warning" : "success";
                    const title = gate5Event.id.includes("decline")
                      ? "Gate 5 — Declined"
                      : gate5Event.id.includes("table")
                        ? "Gate 5 — Tabled (additional information requested)"
                        : "Gate 5 — Approved";
                    return (
                      <Callout tone={tone} title={title}>
                        {gate5Event.output}
                      </Callout>
                    );
                  })()}
                  <Row gap={8} wrap>
                    <GateSignOffBar
                      mode="gate5-sign"
                      theme={theme}
                      disabled={caseAudit.some((e) => e.id.includes("gate5"))}
                      onAction={(action) => appendAudit(action)}
                    />
                    <Button variant="secondary" onClick={() => setMemoOpen(true)}>
                      View memo report
                    </Button>
                  </Row>
                </CardBody>
              </Card>
            </Stack>
          )}

          {showExtractionMapping && (
            <StageActivityCard
              stageId={stageId}
              theme={theme}
              onGoToReview={() => setStageId("review")}
            />
          )}
            </>
          )}
        </Stack>
      </Row>

      <CaseRuntimeLog entries={mergedLog} theme={theme} newEntryIds={newEntryIds} />
    </Stack>
  );
}

// ─── Portfolio risk distribution (Figma: period selector + legend) ─────────────

type RiskPeriod = "Yearly" | "Quarterly" | "Monthly";

const RISK_DISTRIBUTION: Record<RiskPeriod, { label: string; value: number; pct: string; color: string }[]> = {
  Yearly: [
    { label: "Low Risk", value: 150, pct: "60%", color: "#1F8A65" },
    { label: "Medium Risk", value: 77, pct: "30.2%", color: "#C08532" },
    { label: "High Risk", value: 23, pct: "9%", color: "#B42018" },
  ],
  Quarterly: [
    { label: "Low Risk", value: 142, pct: "57%", color: "#1F8A65" },
    { label: "Medium Risk", value: 82, pct: "33%", color: "#C08532" },
    { label: "High Risk", value: 26, pct: "10%", color: "#B42018" },
  ],
  Monthly: [
    { label: "Low Risk", value: 138, pct: "55%", color: "#1F8A65" },
    { label: "Medium Risk", value: 86, pct: "34%", color: "#C08532" },
    { label: "High Risk", value: 28, pct: "11%", color: "#B42018" },
  ],
};

function PortfolioRiskDistribution({ theme }: { theme: FigmaTheme }) {
  const [period, setPeriod] = useCanvasState<RiskPeriod>("riskDistPeriod", "Yearly");
  const [menuOpen, setMenuOpen] = useCanvasState<boolean>("riskPeriodMenuOpen", false);
  const data = RISK_DISTRIBUTION[period];
  const total = data.reduce((a, d) => a + d.value, 0) || 1;
  let acc = 0;
  const gradient = data
    .map((d) => {
      const start = (acc / total) * 100;
      acc += d.value;
      return `${d.color} ${start}% ${(acc / total) * 100}%`;
    })
    .join(", ");

  return (
    <div style={{ ...dxpCard(theme), padding: 16 }}>
      <Stack gap={12}>
        <Row align="center" justify="space-between">
          <Row gap={8} align="center">
            <AgentTag agentId="sentinel" theme={theme} />
            <Text size="small" tone="tertiary">Risk tiers · Portfolio Sentinel · nightly batch</Text>
          </Row>
          <div style={{ position: "relative" }}>
            <Button variant="ghost" style={{ height: 28, fontSize: 11 }} onClick={() => setMenuOpen(!menuOpen)}>
              {period} ▾
            </Button>
            {menuOpen && (
              <div
                style={{
                  position: "absolute",
                  top: 32,
                  right: 0,
                  background: theme.bg.editor,
                  border: `1px solid ${theme.stroke.secondary}`,
                  borderRadius: 8,
                  boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                  zIndex: 50,
                  minWidth: 120,
                  overflow: "hidden",
                }}
              >
                {(["Yearly", "Quarterly", "Monthly"] as RiskPeriod[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setPeriod(p);
                      setMenuOpen(false);
                    }}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "8px 12px",
                      background: p === period ? theme.fill.secondary : "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: 12,
                      fontFamily: "Inter, sans-serif",
                      color: theme.text.primary,
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
        </Row>
        <Row gap={24} align="start">
          <div
            style={{
              width: 180,
              height: 180,
              borderRadius: "50%",
              background: `conic-gradient(${gradient})`,
              flexShrink: 0,
            }}
          />
          <Stack gap={10} style={{ flex: 1, paddingTop: 8 }}>
            {data.map((d) => (
              <div key={d.label}>
                <Row gap={8} align="center">
                  <span style={{ width: 12, height: 12, borderRadius: "50%", background: d.color, flexShrink: 0 }} />
                  <Text size="small" weight="semibold">{d.label}</Text>
                </Row>
                <Text size="small" tone="tertiary" style={{ marginLeft: 20 }}>
                  {d.value} ({d.pct})
                </Text>
              </div>
            ))}
            <Text size="small" tone="secondary">
              Nearly 1 in 10 borrowers are High Risk, mirroring +7 covenant breaches this month.
            </Text>
          </Stack>
        </Row>
      </Stack>
    </div>
  );
}

// ─── Cases list toolbar helpers (Figma Flow 1) ────────────────────────────────

function ToolbarIconButton({
  icon,
  title,
  onClick,
  theme,
  active,
}: {
  icon: string;
  title: string;
  onClick: () => void;
  theme: FigmaTheme;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={{
        width: 32,
        height: 32,
        border: `1px solid ${active ? theme.accent.primary : theme.stroke.secondary}`,
        borderRadius: 4,
        background: active ? theme.fill.secondary : theme.bg.editor,
        cursor: "pointer",
        fontSize: 14,
        color: theme.text.secondary,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {icon}
    </button>
  );
}

function RowActionMenu({
  row,
  theme,
  openCase,
  caseId,
  stage,
}: {
  row: CaseRowData;
  theme: FigmaTheme;
  openCase: (id: CaseId, stage?: StageId, fromRow?: CaseRowData) => void;
  caseId: CaseId;
  stage: StageId;
}) {
  const [open, setOpen] = useCanvasState<boolean>(`rowMenu-${row.id}`, false);

  const run = (label: string, fn: () => void) => {
    fn();
    showActionToast(label);
    setOpen(false);
  };

  return (
    <div style={{ position: "relative" }}>
      <ToolbarIconButton
        icon="⋮"
        title="Row actions"
        theme={theme}
        onClick={() => setOpen(!open)}
      />
      {open && (
        <div
          style={{
            position: "absolute",
            top: 36,
            right: 0,
            background: theme.bg.editor,
            border: `1px solid ${theme.stroke.secondary}`,
            borderRadius: 8,
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
            zIndex: 60,
            minWidth: 160,
            overflow: "hidden",
          }}
        >
          {[
            { label: "Open case", fn: () => openCase(caseId, stage, row) },
            {
              label: "Export row",
              fn: () => {
                const csv = `Case ID,Entity,Stage,Risk\n${row.id},${row.entity},${row.stageBadge},${row.riskStatus}`;
                downloadExportFile(`${row.id}.csv`, csv, "text/csv;charset=utf-8");
              },
            },
            { label: "Add tag", fn: () => undefined },
            { label: "Archive", fn: () => undefined },
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => run(`${item.label}: ${row.entity}`, item.fn)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "8px 12px",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 12,
                fontFamily: "Inter, sans-serif",
                color: theme.text.primary,
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateCaseDialog({
  theme,
  onClose,
  openCase,
}: {
  theme: FigmaTheme;
  onClose: () => void;
  openCase: (id: CaseId, stage?: StageId, fromRow?: CaseRowData) => void;
}) {
  const [entity, setEntity] = useCanvasState<string>("newCaseEntity", "");
  const [trigger, setTrigger] = useCanvasState<string>("newCaseTrigger", "New Loan");
  const [, setLastCreatedLabel] = useCanvasState<string>("lastCreatedCaseLabel", "");

  const submitLabel = "Create & open intake";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
      }}
      onClick={onClose}
    >
      <div
        style={{ ...dxpCard(theme), width: 420, padding: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <Stack gap={12}>
          <Row align="center" justify="space-between">
            <Text weight="semibold">Create new case</Text>
            <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18 }}>×</button>
          </Row>
          <AgentTag agentId="intake" theme={theme} />
          <Text size="small" tone="secondary">
            Intake Agent will validate the document set against SOP §4.2 once submitted.
          </Text>
          <label style={{ fontSize: 12 }}>
            Borrower / Entity
            <input
              value={entity}
              onChange={(e) => setEntity(e.target.value)}
              placeholder="e.g. Acme Corp"
              style={{
                display: "block",
                width: "100%",
                marginTop: 4,
                padding: "8px 10px",
                border: `1px solid ${theme.stroke.secondary}`,
                borderRadius: 6,
                fontSize: 12,
                fontFamily: "Inter, sans-serif",
              }}
            />
          </label>
          <label style={{ fontSize: 12 }}>
            Trigger type
            <select
              value={trigger}
              onChange={(e) => setTrigger(e.target.value)}
              style={{
                display: "block",
                width: "100%",
                marginTop: 4,
                padding: "8px 10px",
                border: `1px solid ${theme.stroke.secondary}`,
                borderRadius: 6,
                fontSize: 12,
                fontFamily: "Inter, sans-serif",
              }}
            >
              {["New Loan", "Covenant Breach", "Monthly Review", "Annual Review"].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
          <Row gap={8} justify="end">
            <Button variant="ghost" style={{ height: 32, fontSize: 12 }} onClick={onClose}>Cancel</Button>
            <Button
              variant="primary"
              style={{ height: 32, fontSize: 12 }}
              disabled={!entity.trim()}
              onClick={() => {
                const label = entity.trim() || "New borrower";
                setLastCreatedLabel(label);
                setEntity("");
                onClose();
                const target: CaseId =
                  label.toLowerCase().includes("northern") ? "northern-retail" : "walmart";
                openCase(target, "intake");
              }}
            >
              {submitLabel}
            </Button>
          </Row>
        </Stack>
      </div>
    </div>
  );
}

function ViewInFocusToggle({ theme }: { theme: FigmaTheme }) {
  const [inFocusOpen, setInFocusOpen] = useCanvasState<boolean>("inFocusOpen", true);
  const [menuOpen, setMenuOpen] = useCanvasState<boolean>("viewInFocusMenuOpen", false);
  const rootRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setMenuOpen(false), [setMenuOpen]);
  useDismissOnOutside(menuOpen, close, rootRef);

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <Button variant="ghost" style={{ height: 28, fontSize: 11 }} onClick={() => setMenuOpen(!menuOpen)}>
        View In Focus ▾
      </Button>
      {menuOpen && (
        <div
          style={{
            position: "absolute",
            top: 32,
            right: 0,
            background: theme.bg.editor,
            border: `1px solid ${theme.stroke.secondary}`,
            borderRadius: 8,
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
            zIndex: 50,
            minWidth: 180,
            padding: 4,
          }}
        >
          <button
            type="button"
            onClick={() => {
              setInFocusOpen(true);
              setMenuOpen(false);
            }}
            style={{
              display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left",
              padding: "8px 10px", background: "none", border: "none", cursor: "pointer",
              fontSize: 12, fontFamily: "Inter, sans-serif", color: theme.text.primary, borderRadius: 6,
            }}
          >
            {inFocusOpen ? "✓" : ""} Show In Focus cards
          </button>
          <button
            type="button"
            onClick={() => {
              setInFocusOpen(false);
              setMenuOpen(false);
            }}
            style={{
              display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left",
              padding: "8px 10px", background: "none", border: "none", cursor: "pointer",
              fontSize: 12, fontFamily: "Inter, sans-serif", color: theme.text.primary, borderRadius: 6,
            }}
          >
            {!inFocusOpen ? "✓" : ""} Hide In Focus cards
          </button>
        </div>
      )}
    </div>
  );
}

function CaseRowExpansion({ row, theme, openCase }: { row: CaseRowData; theme: FigmaTheme; openCase?: (id: CaseId, stage?: StageId, fromRow?: CaseRowData) => void }) {
  const previewRows = MAPPING_DATA.slice(0, 4);
  const { caseId: targetCase, stage: targetStage } = caseRouteForRowId(row.id);
  return (
    <div style={{ padding: "12px 16px", background: theme.bg.elevated, borderTop: `1px solid ${theme.stroke.tertiary}` }}>
      <Stack gap={8}>
        <Row align="center" justify="space-between">
          <Text weight="semibold" size="small">Extraction preview — {row.entity}</Text>
          <Row gap={8} align="center">
            <AgentTag agentId="document-intel" theme={theme} />
            <Text size="small" tone="tertiary">{row.extractionConf}% confidence</Text>
          </Row>
        </Row>
        <Table
          headers={["Field", "Value", "Confidence"]}
          rows={previewRows.map((r) => {
            const cp = confidencePill(r.confidence);
            return [r.field, r.value, <Pill tone={cp.tone}>{cp.label}</Pill>];
          })}
          striped
        />
        <Row align="center" justify="space-between">
          <Text size="small" tone="quaternary">Showing 4 of 140 fields</Text>
          {openCase && (
            <Button variant="primary" style={{ height: 28, fontSize: 11 }} onClick={() => openCase(targetCase, targetStage, row)}>
              Open full case →
            </Button>
          )}
        </Row>
      </Stack>
    </div>
  );
}

function CasesListView({
  theme,
  openCase,
  onOpenTrustLayer,
}: {
  theme: FigmaTheme;
  openCase: (id: CaseId, stage?: StageId, fromRow?: CaseRowData) => void;
  onOpenTrustLayer?: () => void;
}) {
  const [expandedRow, setExpandedRow] = useCanvasState<string | null>("expandedCaseRow", null);
  const [search, setSearch] = useCanvasState<string>("casesSearch", "");
  const [riskFilter, setRiskFilter] = useCanvasState<RiskStatus | "all">("casesRiskFilter", "all");
  const [filterOpen, setFilterOpen] = useCanvasState<boolean>("casesFilterOpen", false);
  const [viewMode, setViewMode] = useCanvasState<"list" | "grid">("casesViewMode", "list");
  const [selected, setSelected] = useCanvasState<string[]>("casesSelected", []);
  const [inFocusOpen] = useCanvasState<boolean>("inFocusOpen", true);
  const filterRootRef = useRef<HTMLDivElement>(null);
  const closeFilter = useCallback(() => setFilterOpen(false), [setFilterOpen]);
  useDismissOnOutside(filterOpen, closeFilter, filterRootRef);

  function riskTone(r: RiskStatus): "deleted" | "warning" | "success" {
    if (r === "High Risk") return "deleted";
    if (r === "Moderate Risk") return "warning";
    return "success";
  }
  function actionTone(a: CaseRowData["action"]): "primary" | "ghost" {
    return a === "Negotiate" ? "primary" : "ghost";
  }

  const filteredRows = CASE_ROWS.filter((row) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      q === "" ||
      row.entity.toLowerCase().includes(q) ||
      row.triggerType.toLowerCase().includes(q) ||
      row.stageBadge.toLowerCase().includes(q);
    const matchesRisk = riskFilter === "all" || row.riskStatus === riskFilter;
    return matchesSearch && matchesRisk;
  });
  const visibleSelected = selected.filter((id) => filteredRows.some((r) => r.id === id));
  const rangeLabel =
    filteredRows.length === 0
      ? `0 of ${CASE_ROWS.length}`
      : `1–${filteredRows.length} of ${CASE_ROWS.length}`;

  const toggleSelect = (id: string) => {
    setSelected(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };
  const toggleSelectAll = () => {
    const allVisibleSelected =
      filteredRows.length > 0 && filteredRows.every((r) => selected.includes(r.id));
    if (allVisibleSelected) {
      setSelected(selected.filter((id) => !filteredRows.some((r) => r.id === id)));
    } else {
      const merged = new Set([...selected, ...filteredRows.map((r) => r.id)]);
      setSelected([...merged]);
    }
  };
  const runBulk = (action: string) => {
    const count = visibleSelected.length;
    if (count === 0) {
      const msg =
        selected.length > 0
          ? `${action}: ${selected.length} selected off-screen — clear filter`
          : `${action}: select cases first`;
      showActionToast(msg);
      return;
    }
    if (action === "Download") {
      const rows = filteredRows.filter((r) => visibleSelected.includes(r.id));
      const csv = [
        "Case ID,Entity,Stage,Risk,Exposure",
        ...rows.map((r) => `${r.id},${r.entity},${r.stageBadge},${r.riskStatus},${r.exposure}`),
      ].join("\n");
      downloadExportFile(`cases-export-${rows.length}.csv`, csv, "text/csv;charset=utf-8");
      showActionToast(`Downloaded ${count} case(s)`);
      return;
    }
    showActionToast(`${action}: ${count} case(s) updated`);
  };

  return (
    <Row gap={16} align="start">
      <Stack gap={12} style={{ flex: 1, minWidth: 0 }}>
        <Callout tone="info" title="From portfolio alert to committee decision">
          Nine borrowers in flight — agents calculated health scores and extraction confidence; humans govern at trust
          gates. <strong>Walmart Inc.</strong> is ready for your 12-minute Gate 2 review.{" "}
          <strong>Northern Retail LLC</strong> is blocked at Gate 1 (sad path — same trace model as happy path).
          {onOpenTrustLayer && (
            <>
              {" "}
              <button
                type="button"
                onClick={onOpenTrustLayer}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  fontFamily: "Inter, sans-serif",
                  fontSize: "inherit",
                  color: "#0a5af5",
                  textDecoration: "underline",
                }}
              >
                Trust Layer overview
              </button>
            </>
          )}
        </Callout>
        {filteredRows.length > 0 && inFocusOpen && (
          <InFocusBanner rows={filteredRows} theme={theme} openCase={openCase} />
        )}

        <Row align="center" justify="space-between" wrap gap={8}>
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
                background: theme.bg.editor,
              }}
            >
              <span style={{ color: theme.text.quaternary }}>⌕</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search"
                style={{
                  border: "none",
                  outline: "none",
                  fontSize: 12,
                  width: 120,
                  background: "transparent",
                  fontFamily: "Inter, sans-serif",
                  color: theme.text.primary,
                }}
              />
            </div>
            <div ref={filterRootRef} style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => setFilterOpen(!filterOpen)}
                style={{
                  border: `1px solid ${riskFilter !== "all" ? theme.accent.primary : theme.stroke.secondary}`,
                  borderRadius: 4,
                  padding: "4px 10px",
                  display: "flex",
                  gap: 6,
                  alignItems: "center",
                  fontSize: 12,
                  color: theme.text.secondary,
                  background: theme.bg.editor,
                  cursor: "pointer",
                  fontFamily: "Inter, sans-serif",
                }}
              >
                ⊟ Filter{riskFilter !== "all" ? ` · ${riskFilter}` : ""}
              </button>
              {filterOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: 34,
                    left: 0,
                    background: theme.bg.editor,
                    border: `1px solid ${theme.stroke.secondary}`,
                    borderRadius: 8,
                    boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                    zIndex: 50,
                    minWidth: 160,
                    overflow: "hidden",
                  }}
                >
                  {(["all", "Low Risk", "Moderate Risk", "High Risk"] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => {
                        setRiskFilter(f);
                        setFilterOpen(false);
                      }}
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "left",
                        padding: "8px 12px",
                        background: riskFilter === f ? theme.fill.secondary : "none",
                        border: "none",
                        cursor: "pointer",
                        fontSize: 12,
                        fontFamily: "Inter, sans-serif",
                        color: theme.text.primary,
                      }}
                    >
                      {f === "all" ? "All risk levels" : f}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Row>
          <Row gap={8} align="center" wrap>
            <Text size="small" tone="tertiary">
              {rangeLabel}
            </Text>
            <ToolbarIconButton icon="↓" title="Download selected" theme={theme} onClick={() => runBulk("Download")} />
            <ToolbarIconButton icon="🏷" title="Tag selected" theme={theme} onClick={() => runBulk("Tag")} />
            <ToolbarIconButton icon="📁" title="Move to folder" theme={theme} onClick={() => runBulk("Move")} />
            <ToolbarIconButton icon="⋮" title="More actions" theme={theme} onClick={() => runBulk("More")} />
            <span style={{ width: 1, height: 20, background: theme.stroke.secondary }} />
            <ToolbarIconButton
              icon="⊞"
              title="Grid view"
              theme={theme}
              active={viewMode === "grid"}
              onClick={() => setViewMode("grid")}
            />
            <ToolbarIconButton
              icon="☰"
              title="List view"
              theme={theme}
              active={viewMode === "list"}
              onClick={() => setViewMode("list")}
            />
            <ViewInFocusToggle theme={theme} />
            <AgentTag agentId="orchestrator" theme={theme} />
          </Row>
        </Row>

        {viewMode === "grid" ? (
          filteredRows.length === 0 ? (
            <Callout tone="info">No cases match your search or filter. Clear filters to see all {CASE_ROWS.length} cases.</Callout>
          ) : (
          <Grid columns={3} gap={12}>
            {filteredRows.map((row) => {
              const { caseId, stage } = caseRouteForRowId(row.id);
              return (
                <div
                  key={row.id}
                  style={{ ...dxpCard(theme), padding: 12, cursor: "pointer" }}
                  onClick={() => openCase(caseId, stage, row)}
                >
                  <Stack gap={6}>
                    <Row align="center" justify="space-between">
                      <Row gap={8} align="center">
                        <input
                          type="checkbox"
                          checked={selected.includes(row.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleSelect(row.id);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          style={{ cursor: "pointer" }}
                        />
                        <Text weight="semibold" size="small">{row.entity}</Text>
                      </Row>
                      <Pill tone={riskTone(row.riskStatus)}>• {row.riskStatus}</Pill>
                    </Row>
                    <Pill tone="neutral">{row.stageBadge}</Pill>
                    <Text size="small" tone="tertiary">{row.triggerType} · {row.exposure}</Text>
                    <ExtractionConfBadge pct={row.extractionConf} theme={theme} />
                    <Button variant={actionTone(row.action)} style={{ height: 28, fontSize: 11 }} onClick={(e) => { e.stopPropagation(); openCase(caseId, stage, row); }}>
                      {row.action}
                    </Button>
                  </Stack>
                </div>
              );
            })}
          </Grid>
          )
        ) : filteredRows.length === 0 ? (
          <Callout tone="info">No cases match your search or filter. Clear filters to see all {CASE_ROWS.length} cases.</Callout>
        ) : (
          <Table
            headers={[
              <input
                type="checkbox"
                checked={filteredRows.length > 0 && filteredRows.every((r) => selected.includes(r.id))}
                onChange={toggleSelectAll}
                style={{ cursor: "pointer" }}
              />,
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
            rows={filteredRows.map((row) => {
              const { caseId, stage } = caseRouteForRowId(row.id);
              const isExpanded = expandedRow === row.id;
              return [
                <input
                  type="checkbox"
                  checked={selected.includes(row.id)}
                  onChange={() => toggleSelect(row.id)}
                  style={{ cursor: "pointer" }}
                />,
                <Row gap={6} align="center">
                  <span
                    onClick={() => setExpandedRow(isExpanded ? null : row.id)}
                    style={{ color: theme.text.quaternary, fontSize: 11, cursor: "pointer", transform: isExpanded ? "rotate(90deg)" : "none", display: "inline-block" }}
                  >
                    ›
                  </span>
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
                <Row gap={4} align="center">
                  <Button
                    variant={actionTone(row.action)}
                    style={{ height: 28, fontSize: 11 }}
                    onClick={() => openCase(caseId, stage, row)}
                  >
                    {row.action}
                  </Button>
                  <RowActionMenu row={row} theme={theme} openCase={openCase} caseId={caseId} stage={stage} />
                </Row>,
              ];
            })}
            rowTone={filteredRows.map((r) =>
              r.riskStatus === "High Risk" ? "danger" : r.riskStatus === "Moderate Risk" ? "warning" : undefined,
            )}
            striped
            renderRowExtra={(ri) => {
              const row = filteredRows[ri];
              return expandedRow === row.id ? <CaseRowExpansion row={row} theme={theme} openCase={openCase} /> : null;
            }}
          />
        )}
      </Stack>
      <InSightAssistPanel theme={theme} scope="cases" />
    </Row>
  );
}

function AgentCatalogView({
  theme,
  onOpenTrustLayer,
}: {
  theme: ReturnType<typeof useHostTheme>;
  onOpenTrustLayer?: () => void;
}) {
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
      <Callout tone="info" title="Agent-first credit operating system">
        Ten named agents do the cognitive work — spreading, exception detection, covenant scans, memo drafting. Humans
        govern at five trust gates. The catalog below is the live runtime, not documentation.
        {onOpenTrustLayer && (
          <>
            {" "}
            <button
              type="button"
              onClick={onOpenTrustLayer}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                fontFamily: "Inter, sans-serif",
                fontSize: "inherit",
                color: "#0a5af5",
                textDecoration: "underline",
              }}
            >
              View Trust Layer model
            </button>
          </>
        )}
      </Callout>
      <TrustGateLadder theme={theme} />
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
  const [createOpen, setCreateOpen] = useCanvasState<boolean>("createCaseOpen", false);
  const [, setDemoPortfolioContext] = useCanvasState<DemoPortfolioContext>("demoPortfolioContext", null);
  const [, setPortfolioBannerDismissed] = useCanvasState<boolean>("portfolioBannerDismissed", false);
  const [sopViewer, setSopViewer] = useCanvasState<{ section: string; appliedTo?: string } | null>("sopViewerOpen", null);
  const [trustLayerOpen, setTrustLayerOpen] = useCanvasState<boolean>("trustLayerOpen", false);
  const [, setSpreadCompanyId] = useCanvasState<CompanyId>("spreadCompanyId", "walmart");

  const openTrustLayer = () => setTrustLayerOpen(true);
  const openCreditPolicy = () => setSopViewer({ section: "§4.2", appliedTo: "Credit Policy" });

  const [, setDetailTab] = useCanvasState<CaseDetailTab>("caseDetailTab", "extracted");

  /** Rows for these two borrowers now have their own real data on the master database — open the live spread, not a mismatched Walmart workspace. */
  const SPREAD_ROW_COMPANY: Record<string, CompanyId> = { AWM: "autowest", CHY: "coastal-hyundai" };

  const openSpread = (companyId: CompanyId) => {
    setSpreadCompanyId(companyId);
    setView("spreading");
    setCreateOpen(false);
  };

  const openCase = (id: CaseId, stage?: StageId, fromRow?: CaseRowData) => {
    if (fromRow) {
      const prefix = fromRow.id.split("-")[0];
      const spreadCompany = SPREAD_ROW_COMPANY[prefix];
      if (spreadCompany) {
        openSpread(spreadCompany);
        return;
      }
    }
    setCaseId(id);
    const resolvedStage = stage ?? CASES[id].defaultStage;
    setStageId(resolvedStage);
    setDetailTab(id === "walmart" && resolvedStage === "review" ? "exceptions" : "extracted");
    setView("case");
    setCreateOpen(false);
    if (fromRow && !fromRow.id.startsWith("WMT") && !fromRow.id.startsWith("NRT")) {
      setDemoPortfolioContext({ entity: fromRow.entity, concern: fromRow.primaryConcern });
      setPortfolioBannerDismissed(false);
    } else {
      setDemoPortfolioContext(null);
    }
  };

  const caseContext =
    view === "case"
      ? `Case Details: ${caseId === "walmart" ? "Walmart Inc." : "Northern Retail LLC"}`
      : undefined;

  return (
    <Stack gap={8}>
      <SopViewerPanel
        open={sopViewer != null}
        section={sopViewer?.section ?? null}
        appliedTo={sopViewer?.appliedTo}
        onClose={() => setSopViewer(null)}
        theme={theme}
      />
      <TrustLayerPanel
        open={trustLayerOpen}
        onClose={() => setTrustLayerOpen(false)}
        theme={theme}
        onOpenCreditPolicy={() => {
          setTrustLayerOpen(false);
          openCreditPolicy();
        }}
        onNavigateAgents={() => {
          setTrustLayerOpen(false);
          setView("agents");
        }}
      />
      {createOpen && (
        <CreateCaseDialog theme={theme} openCase={openCase} onClose={() => setCreateOpen(false)} />
      )}
      <DxpShell
        view={view}
        setView={setView}
        theme={theme}
        caseContext={caseContext}
        onOpenCreditPolicy={openCreditPolicy}
        onOpenTrustLayer={openTrustLayer}
      >
        {view === "command" && (
          <CommandCenterView
            openCase={openCase}
            openSpread={openSpread}
            theme={theme}
            onOpenTrustLayer={openTrustLayer}
            onOpenCreditPolicy={openCreditPolicy}
          />
        )}
        {view === "portfolio" && <PortfolioView openCase={openCase} openSpread={openSpread} theme={theme} onOpenTrustLayer={openTrustLayer} />}
        {view === "caselist" && <CasesListView theme={theme} openCase={openCase} onOpenTrustLayer={openTrustLayer} />}
        {view === "case" && <CaseWorkspaceView theme={theme} />}
        {view === "agents" && <AgentCatalogView theme={theme} onOpenTrustLayer={openTrustLayer} />}
        {view === "spreading" && (
          <CompanySpreadView onOpenSop={(section, appliedTo) => setSopViewer({ section, appliedTo })} />
        )}
      </DxpShell>
      <ActionToastBanner theme={theme} />
      <Text size="small" tone="quaternary" style={{ padding: "0 16px" }}>
        Demo arc: Portfolio Sentinel alert → Agent briefing → Trust Layer gates → Lifecycle trace → Trust Inspector →
        Connected decision
      </Text>
    </Stack>
  );
}
