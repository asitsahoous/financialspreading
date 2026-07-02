/**
 * Rendered source financial statement — the "as-filed" document pane.
 *
 * Replaces the old gray CasePdfPane placeholder. Each printed cell is
 * individually addressable by `${tag}@${period}` so an extracted value can jump
 * to and highlight its exact origin (page + cell). Source leaves are clickable;
 * calculated subtotals/totals are printed (as any real statement prints them)
 * but derived from the TRUE values so the document always ties out.
 */
import { useHostTheme } from "../ui";
import { MERIDIAN, PERIODS, trueValueMap, type Period } from "./dataset";
import { computeValues } from "./engine";
import { nodesFor, type StatementKind, type TaxonomyNode } from "./taxonomy";

export const STATEMENT_PAGES: { page: number; statement: StatementKind; title: string }[] =
  MERIDIAN.statementPages;

export function cellId(tag: string, period: Period): string {
  return `${tag}@${period}`;
}

/** Statement-style number: comma-grouped thousands, negatives in parentheses. */
function fmtStatement(value: number, format: TaxonomyNode["format"]): string {
  if (format === "ratio") return `${value.toFixed(2)}x`;
  if (format === "percent") return `${(value * 100).toFixed(1)}%`;
  const rounded = Math.round(value);
  const body = Math.abs(rounded).toLocaleString("en-US");
  return rounded < 0 ? `(${body})` : body;
}

export function SourceDocument({
  page,
  highlightCellIds,
  onCellClick,
  periods = PERIODS,
}: {
  page: number;
  highlightCellIds: string[];
  onCellClick?: (tag: string, period: Period) => void;
  periods?: Period[];
}) {
  const theme = useHostTheme();
  const pageDef = STATEMENT_PAGES.find((p) => p.page === page) ?? STATEMENT_PAGES[0];
  const nodes = nodesFor(pageDef.statement);
  const trueVals = trueValueMap();
  const computed: Record<string, Record<string, number>> = {};
  for (const p of periods) computed[p] = mapValues(computeValues(trueVals, p));
  const cols = `1fr repeat(${periods.length}, 84px)`;
  const highlight = new Set(highlightCellIds);

  return (
    <div
      style={{
        flex: "0 0 46%",
        minWidth: 320,
        border: `1px solid ${theme.stroke.secondary}`,
        borderRadius: 8,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        background: theme.bg.editor,
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          height: 36,
          padding: "0 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: `1px solid ${theme.stroke.tertiary}`,
          background: theme.bg.elevated,
          fontSize: 12,
          color: theme.text.tertiary,
        }}
      >
        <span>Source document · borrower filing</span>
        <span>Page {page} of {STATEMENT_PAGES.length}</span>
      </div>

      {/* "Paper" */}
      <div style={{ flex: 1, overflow: "auto", padding: 20, background: "#fbfbfa" }}>
        <div
          style={{
            background: "#ffffff",
            border: `1px solid ${theme.stroke.tertiary}`,
            borderRadius: 4,
            padding: "22px 26px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            fontFamily: "Georgia, 'Times New Roman', serif",
            maxWidth: 620,
            margin: "0 auto",
          }}
          data-testid={`source-page-${pageDef.statement}`}
        >
          {/* Document header */}
          <div style={{ textAlign: "center", borderBottom: `2px solid ${theme.text.primary}`, paddingBottom: 10, marginBottom: 12 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: theme.text.primary }}>{MERIDIAN.borrowerName}</div>
            <div style={{ fontSize: 13, color: theme.text.secondary, marginTop: 2 }}>{pageDef.title}</div>
            <div style={{ fontSize: 11, color: theme.text.tertiary, marginTop: 4 }}>
              Years ended December 31 · {MERIDIAN.unitsNote}
            </div>
          </div>

          {/* Column headers */}
          <div style={{ display: "grid", gridTemplateColumns: cols, gap: 0, marginBottom: 4 }}>
            <div />
            {periods.map((p) => (
              <div key={p} style={{ textAlign: "right", fontSize: 11, fontWeight: 700, color: theme.text.primary, paddingBottom: 4, borderBottom: `1px solid ${theme.text.primary}` }}>
                {p}
              </div>
            ))}
          </div>

          {/* Rows */}
          {nodes.map((node, i) => {
            const isTotal = node.kind === "calculated";
            const prevSection = i > 0 ? nodes[i - 1].section : undefined;
            const showSection = node.section && node.section !== prevSection;
            return (
              <div key={node.tag}>
                {showSection && (
                  <div style={{ fontSize: 11, fontWeight: 700, color: theme.text.secondary, marginTop: 10, marginBottom: 2, textTransform: "uppercase", letterSpacing: 0.3 }}>
                    {node.section}
                  </div>
                )}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: cols,
                    alignItems: "center",
                    borderTop: isTotal ? `1px solid ${theme.stroke.tertiary}` : undefined,
                    marginTop: isTotal ? 2 : 0,
                  }}
                >
                  <div
                    style={{
                      fontSize: 12.5,
                      color: theme.text.primary,
                      fontWeight: isTotal ? 700 : 400,
                      paddingLeft: (node.indent ?? 0) * 14,
                      padding: "3px 0",
                    }}
                  >
                    {node.label}
                  </div>
                  {periods.map((p) => {
                    const id = cellId(node.tag, p);
                    const val = computed[p][node.tag] ?? 0;
                    const clickable = node.kind === "source" && !!onCellClick;
                    const isHot = highlight.has(id);
                    return (
                      <div
                        key={p}
                        data-testid={`srccell-${node.tag}-${p}`}
                        onClick={clickable ? () => onCellClick!(node.tag, p) : undefined}
                        style={{
                          textAlign: "right",
                          fontSize: 12.5,
                          fontWeight: isTotal ? 700 : 400,
                          color: theme.text.primary,
                          padding: "3px 4px",
                          cursor: clickable ? "pointer" : "default",
                          background: isHot ? "#FFF3BF" : undefined,
                          outline: isHot ? "2px solid #E6A700" : undefined,
                          borderRadius: isHot ? 3 : undefined,
                          transition: "background 120ms",
                        }}
                        title={clickable ? "Extraction source cell" : undefined}
                      >
                        {fmtStatement(val, node.format)}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Footer */}
          <div style={{ marginTop: 16, paddingTop: 8, borderTop: `1px solid ${theme.stroke.tertiary}`, fontSize: 10, color: theme.text.tertiary, display: "flex", justifyContent: "space-between" }}>
            <span>{MERIDIAN.borrowerName} · FY2025 Annual Financial Statements</span>
            <span>Page {page} of {STATEMENT_PAGES.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function mapValues(resolved: Record<string, { value: number }>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [tag, r] of Object.entries(resolved)) out[tag] = r.value;
  return out;
}
