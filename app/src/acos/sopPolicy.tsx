import { Button, Row, Stack, Text } from "./ui";
import type { CSSProperties, ReactNode } from "react";

export type SopSection = {
  id: string;
  title: string;
  body: string;
};

/** Institution credit policy fixture — uploaded SOP for demo governance. */
export const CREDIT_POLICY_SOP: SopSection[] = [
  {
    id: "§4.2",
    title: "Required document manifest",
    body:
      "Commercial revolving credit and term loan packages require nine documents before Gate 1 sign-off: " +
      "(1) Annual filing / 10-K, (2) Credit application, (3) Q3 cash flow statement, (4) Covenant schedule, " +
      "(5) Auditor letter, (6) Management representation, (7) Intercompany schedule, (8) Guarantor financials, " +
      "(9) Collateral appraisal. Intake Agent blocks extraction until all nine are received and classified.",
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
      "Interim cash flow statement for the most recent quarter. Override / waiver policy: analysts may log a documented waiver per §4.2.3 " +
      "when borrower commits to delivery within 24 hours, but Gate 1 does not pass until the document is received or committee waives in writing.",
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
    id: "§6",
    title: "Page map for extraction",
    body:
      "Document Intelligence Agent must extract from SOP-defined pages only: Income Statement p.38, Balance Sheet pp.42–44, " +
      "Notes p.87, Cash Flow p.112. Marketing, MD&A narrative, and non-financial sections are excluded from spread population.",
  },
  {
    id: "§7.4",
    title: "Total Assets mapping rule",
    body:
      "Total Assets maps to COA line TOTAL_ASSETS from Balance Sheet p.43. Values must be stated in millions; " +
      "Review Agent flags outliers when YoY variance exceeds 15% or scale appears inconsistent with prior period.",
  },
  {
    id: "§12",
    title: "AML / KYC — Customer Identification Program",
    body:
      "Connector Agent runs AML/KYC CIP on borrower EIN and ultimate beneficial owner SSN before memo release. " +
      "Memo §12 attestation requires analyst confirmation that bureau and sanctions screens are current within 30 days.",
  },
];

export function getSopSection(sectionId: string): SopSection | undefined {
  const exact = CREDIT_POLICY_SOP.find((s) => s.id === sectionId);
  if (exact) return exact;
  const parent = sectionId.replace(/\.\d+$/, "");
  return CREDIT_POLICY_SOP.find((s) => s.id === parent);
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
