/**
 * Meridian Foods — live financial spreading workspace (master database).
 *
 * Each ingested statement is standardised to the ACOS chart of accounts and
 * mapped into one company-level master database, rendered as period columns for
 * side-by-side comparison (like Capital IQ / CreditLens "compare like-for-like").
 * ACOS layers its differentiators on top: clickable cell+page lineage, live
 * cross-statement integrity, in-cell human correction with rationale (tracked in
 * the case lifecycle), calculated-value dependency drill, and a computed,
 * auditable trust score. Agents do the mapping; humans govern via edits + gates.
 */
import { useState } from "react";
import { Button, Pill, Row, Stack, Text, useCanvasState, useHostTheme } from "../ui";
import { showActionToast } from "../state";
import { SopLink } from "../sopPolicy";
import { SourceDocument, STATEMENT_PAGES, cellId } from "./SourceDocument";
import {
  MERIDIAN,
  PERIODS,
  DEFAULT_INGESTED,
  extractedValueMap,
  sourceCell,
  type Period,
} from "./dataset";
import {
  computeValues,
  runIntegrityChecks,
  lineageFor,
  type ResolvedValue,
  type LineageNode,
} from "./engine";
import {
  formatUnit,
  yoyPct,
  cagrPct,
  fmtPct,
  ratioStatus,
  RATIO_META,
  healthScorecard,
  type Unit,
} from "./analytics";
import { nodesFor, getNode, type StatementKind } from "./taxonomy";

const STATEMENT_LABEL: Record<StatementKind, string> = {
  IS: "Income Statement",
  BS: "Balance Sheet",
  CF: "Cash Flow",
  RATIO: "Ratios & Analytics",
};
const PAGE_OF: Record<StatementKind, number> = { IS: 1, BS: 2, CF: 3, RATIO: 2 };
type SubTab = "spread" | "trends" | "ratios" | "health" | "source";
type EditRecord = { id: string; tag: string; period: Period; from: number; to: number; rationale: string; actor: string; at: string };

function collectLeaves(node: LineageNode): LineageNode[] {
  return node.children.length === 0 ? [node] : node.children.flatMap(collectLeaves);
}
function nowStamp() {
  const d = new Date();
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
}

export function MeridianSpreadView({ onOpenSop }: { onOpenSop?: (section: string, appliedTo?: string) => void }) {
  const theme = useHostTheme();
  const [ingested, setIngested] = useCanvasState<Period[]>("meridianIngested", DEFAULT_INGESTED);
  const [overrides, setOverrides] = useCanvasState<Record<string, number>>("meridianOverrides", {});
  const [editLog, setEditLog] = useCanvasState<EditRecord[]>("meridianEditLog", []);
  const [verified, setVerified] = useCanvasState<string[]>("meridianVerified", []);
  const [unit, setUnit] = useCanvasState<Unit>("meridianUnit", "auto");
  const [order, setOrder] = useCanvasState<"old2new" | "new2old">("meridianOrder", "old2new");
  const [subtab, setSubtab] = useCanvasState<SubTab>("meridianSubtab", "spread");
  const [selected, setSelected] = useState<{ tag: string; period: Period } | null>(null);
  const [highlight, setHighlight] = useState<string[]>([]);
  const [docPage, setDocPage] = useState<number>(2);
  const [editValue, setEditValue] = useState<string>("");
  const [editRationale, setEditRationale] = useState<string>("");

  const periodsChrono = PERIODS.filter((p) => ingested.includes(p));
  const cols = order === "new2old" ? [...periodsChrono].reverse() : periodsChrono;
  const latest = periodsChrono[periodsChrono.length - 1];
  const effective = { ...extractedValueMap(), ...overrides };
  const byPeriod: Record<string, Record<string, ResolvedValue>> = {};
  for (const p of periodsChrono) byPeriod[p] = computeValues(effective, p);
  const checksLatest = runIntegrityChecks(byPeriod[latest], latest);

  // Trust metrics (computed, auditable)
  const sourceTags = Object.values(byPeriod[latest]).filter((r) => r.kind === "source").map((r) => r.tag);
  const totalCells = sourceTags.length * periodsChrono.length;
  const verifiedCount = verified.length;
  const openExceptions = periodsChrono.flatMap((p) =>
    sourceTags.filter((t) => {
      const c = sourceCell(t, p);
      const id = cellId(t, p);
      return c?.confidence === "review" && overrides[id] === undefined;
    }),
  ).length;
  const integrityPassRate = checksLatest.filter((c) => c.pass).length / checksLatest.length;
  const verifiedPct = totalCells ? verifiedCount / totalCells : 0;
  const trustScore = Math.round((integrityPassRate * 0.4 + verifiedPct * 0.35 + (openExceptions === 0 ? 1 : 0) * 0.25) * 100);

  function selectSource(tag: string, period: Period) {
    setSelected({ tag, period });
    setHighlight([cellId(tag, period)]);
    const n = getNode(tag);
    if (n) setDocPage(PAGE_OF[n.statement]);
    const id = cellId(tag, period);
    setEditValue(String(effective[id] ?? ""));
    setEditRationale("");
  }
  function selectCalc(tag: string, period: Period) {
    setSelected({ tag, period });
    const lin = lineageFor(tag, byPeriod[period]);
    if (lin) {
      const leaves = collectLeaves(lin);
      setHighlight(leaves.map((l) => cellId(l.tag, period)));
      const first = getNode(leaves[0]?.tag ?? tag);
      if (first) setDocPage(PAGE_OF[first.statement]);
    }
  }
  function onCellClick(tag: string, period: Period) {
    const n = getNode(tag);
    if (n?.kind === "source") selectSource(tag, period);
    else selectCalc(tag, period);
  }

  function saveCorrection() {
    if (!selected) return;
    const id = cellId(selected.tag, selected.period);
    const parsed = Number(editValue.replace(/[,$\s]/g, ""));
    if (Number.isNaN(parsed)) {
      showActionToast("Enter a numeric value");
      return;
    }
    if (!editRationale.trim()) {
      showActionToast("A rationale is required to correct a value");
      return;
    }
    const from = effective[id] ?? 0;
    setOverrides((prev) => ({ ...prev, [id]: parsed }));
    setEditLog((prev) => [
      ...prev,
      { id: `edit-${Date.now()}`, tag: selected.tag, period: selected.period, from, to: parsed, rationale: editRationale.trim(), actor: "J. Martinez (Credit Analyst)", at: nowStamp() },
    ]);
    setVerified((prev) => (prev.includes(id) ? prev : [...prev, id]));
    showActionToast(`Corrected ${getNode(selected.tag)?.label} ${selected.period} → recomputed dependents`);
    setEditRationale("");
  }
  function acceptValue() {
    if (!selected) return;
    const id = cellId(selected.tag, selected.period);
    setVerified((prev) => (prev.includes(id) ? prev : [...prev, id]));
    showActionToast(`Accepted ${getNode(selected.tag)?.label} ${selected.period} — human-verified`);
  }
  function ingestFY2022() {
    setIngested((prev) => (prev.includes("FY2022") ? prev : PERIODS.filter((p) => [...prev, "FY2022"].includes(p))));
    showActionToast("Mapping Agent standardised FY2022 filing to ACOS chart of accounts — column added");
  }

  return (
    <Stack gap={12} style={{ fontFamily: "Inter, sans-serif" }}>
      {/* Header + trust ribbon */}
      <div style={{ border: `1px solid ${theme.stroke.secondary}`, borderRadius: 10, padding: "14px 16px", background: theme.bg.editor }}>
        <Row align="center" justify="space-between" wrap gap={8}>
          <Stack gap={2}>
            <Row gap={8} align="center">
              <Text weight="semibold" style={{ fontSize: 16 }}>{MERIDIAN.borrowerName}</Text>
              <Pill tone="info">Master financial database</Pill>
            </Row>
            <Text size="small" tone="tertiary">
              {MERIDIAN.entityType} · EIN {MERIDIAN.ein.slice(0, 6)}••• · {MERIDIAN.headquarters} · {MERIDIAN.auditor}
            </Text>
          </Stack>
          <TrustRibbon trustScore={trustScore} verifiedCount={verifiedCount} totalCells={totalCells} openExceptions={openExceptions} checks={checksLatest} theme={theme} />
        </Row>
        <Row gap={6} align="center" wrap style={{ marginTop: 10 }}>
          <Text size="small" tone="quaternary">Mapping Agent standardised {periodsChrono.length} filings to ACOS chart of accounts.</Text>
          {!ingested.includes("FY2022") && (
            <Button variant="ghost" style={{ height: 24, fontSize: 11 }} data-testid="ingest-fy2022" onClick={ingestFY2022}>
              ＋ Ingest prior-year statement (FY2022)
            </Button>
          )}
        </Row>
      </div>

      {/* Integrity banner */}
      <IntegrityBanner checks={checksLatest} period={latest} onTrace={() => selectCalc("BS.TOTAL_ASSETS", latest)} theme={theme} />

      {/* Controls */}
      <Row gap={12} align="center" justify="space-between" wrap>
        <Row gap={4} align="center">
          {(["spread", "trends", "ratios", "health", "source"] as SubTab[]).map((t) => (
            <Button key={t} variant={t === subtab ? "primary" : "ghost"} style={{ height: 28, fontSize: 12, textTransform: "capitalize" }} data-testid={`subtab-${t}`} onClick={() => setSubtab(t)}>
              {t === "source" ? "Source & Lineage" : t}
            </Button>
          ))}
        </Row>
        <Row gap={12} align="center" wrap>
          <Row gap={4} align="center">
            <Text size="small" tone="tertiary">Unit:</Text>
            {(["auto", "K", "MM", "B"] as Unit[]).map((u) => (
              <Button key={u} variant={u === unit ? "secondary" : "ghost"} style={{ height: 24, fontSize: 11, minWidth: 34, textTransform: u === "auto" ? "capitalize" : "none" }} data-testid={`unit-${u}`} onClick={() => setUnit(u)}>
                {u}
              </Button>
            ))}
          </Row>
          <Button variant="ghost" style={{ height: 24, fontSize: 11 }} data-testid="order-toggle" onClick={() => setOrder((o) => (o === "old2new" ? "new2old" : "old2new"))}>
            Order: {order === "old2new" ? "Oldest → newest" : "Newest → oldest"}
          </Button>
        </Row>
      </Row>

      {/* Body */}
      {subtab === "spread" && (
        <SpreadGrid statements={["IS", "BS", "CF"]} cols={cols} byPeriod={byPeriod} unit={unit} overrides={overrides} selected={selected} onCellClick={onCellClick} theme={theme} />
      )}
      {subtab === "trends" && <TrendsGrid periodsChrono={periodsChrono} cols={cols} byPeriod={byPeriod} theme={theme} />}
      {subtab === "ratios" && <RatiosGrid cols={cols} byPeriod={byPeriod} onOpenSop={onOpenSop} theme={theme} />}
      {subtab === "health" && <HealthCard resolved={byPeriod[latest]} period={latest} theme={theme} />}
      {subtab === "source" && (
        <Row gap={12} align="start">
          <Stack gap={8} style={{ flex: "0 0 48%", minWidth: 320 }}>
            <Row gap={6} wrap>
              {STATEMENT_PAGES.map((sp) => (
                <Button key={sp.page} variant={sp.page === docPage ? "secondary" : "ghost"} style={{ height: 24, fontSize: 11 }} data-testid={`docpage-${sp.statement}`} onClick={() => setDocPage(sp.page)}>
                  {STATEMENT_LABEL[sp.statement]}
                </Button>
              ))}
            </Row>
            <SourceDocument page={docPage} highlightCellIds={highlight} periods={periodsChrono} onCellClick={selectSource} />
          </Stack>
          <Stack gap={8} style={{ flex: 1, minWidth: 0 }}>
            <Text size="small" tone="tertiary">Click a value in any tab to trace it here. Source values show origin cell + confidence; calculated values expand to their dependencies.</Text>
            <ProvenancePanel
              selected={selected}
              byPeriod={byPeriod}
              editValue={editValue}
              editRationale={editRationale}
              setEditValue={setEditValue}
              setEditRationale={setEditRationale}
              onSave={saveCorrection}
              onAccept={acceptValue}
              onDrill={(tag, period) => onCellClick(tag, period)}
              onOpenSop={onOpenSop}
              editLog={editLog}
              verified={verified}
              theme={theme}
            />
          </Stack>
        </Row>
      )}

      {/* Provenance/edit strip under grid tabs too (so editing works without leaving Spread) */}
      {subtab !== "source" && selected && (
        <ProvenancePanel
          selected={selected}
          byPeriod={byPeriod}
          editValue={editValue}
          editRationale={editRationale}
          setEditValue={setEditValue}
          setEditRationale={setEditRationale}
          onSave={saveCorrection}
          onAccept={acceptValue}
          onDrill={(tag, period) => onCellClick(tag, period)}
          onOpenSop={onOpenSop}
          editLog={editLog}
          verified={verified}
          theme={theme}
        />
      )}
    </Stack>
  );
}

function TrustRibbon({ trustScore, verifiedCount, totalCells, openExceptions, checks, theme }: {
  trustScore: number; verifiedCount: number; totalCells: number; openExceptions: number;
  checks: ReturnType<typeof runIntegrityChecks>; theme: ReturnType<typeof useHostTheme>;
}) {
  const integrityOk = checks.every((c) => c.pass);
  const cell = (label: string, value: string, tone: "ok" | "warn" | "bad") => (
    <Stack gap={0} style={{ alignItems: "flex-end", padding: "0 10px", borderLeft: `1px solid ${theme.stroke.tertiary}` }}>
      <Text size="small" style={{ fontWeight: 700, color: tone === "bad" ? "#B42018" : tone === "warn" ? "#C08532" : "#1F8A65" }}>{value}</Text>
      <Text size="small" tone="quaternary">{label}</Text>
    </Stack>
  );
  return (
    <Row gap={0} align="center" data-testid="trust-ribbon">
      {cell("Trust score", `${trustScore}%`, trustScore >= 80 ? "ok" : trustScore >= 55 ? "warn" : "bad")}
      {cell("Human-verified", `${verifiedCount}/${totalCells}`, verifiedCount === totalCells ? "ok" : "warn")}
      {cell("Open exceptions", `${openExceptions}`, openExceptions === 0 ? "ok" : "bad")}
      {cell("Integrity", integrityOk ? "3/3" : `${checks.filter((c) => c.pass).length}/3`, integrityOk ? "ok" : "bad")}
      {cell("Lineage", "100%", "ok")}
    </Row>
  );
}

function IntegrityBanner({ checks, period, onTrace, theme }: {
  checks: ReturnType<typeof runIntegrityChecks>; period: Period; onTrace: () => void; theme: ReturnType<typeof useHostTheme>;
}) {
  const failing = checks.filter((c) => !c.pass);
  const ok = failing.length === 0;
  return (
    <div data-testid="integrity-banner" style={{ border: `1px solid ${ok ? "#B8E0CE" : "#F5C4BE"}`, background: ok ? "#F1FAF6" : "#FDECEA", borderRadius: 8, padding: "10px 14px" }}>
      <Row gap={10} align="center" wrap>
        <span style={{ fontSize: 16 }}>{ok ? "✓" : "⚠"}</span>
        <Text size="small" weight="semibold">
          {ok ? `Integrity checks pass for ${period} — statements tie out` : `Integrity check failed for ${period}`}
        </Text>
        {checks.map((c) => (
          <Pill key={c.id} tone={c.pass ? "success" : "deleted"}>
            {c.label}: {c.pass ? "OK" : `off by ${Math.abs(Math.round(c.delta)).toLocaleString("en-US")}`}
          </Pill>
        ))}
      </Row>
      {!ok && (
        <Text size="small" tone="secondary" style={{ marginTop: 6 }}>
          The platform caught a discrepancy the extraction agent introduced —{" "}
          <span style={{ color: theme.accent.primary, cursor: "pointer", textDecoration: "underline" }} onClick={onTrace}>trace Total Assets</span>, then correct the flagged cell to re-balance.
        </Text>
      )}
    </div>
  );
}

function SpreadGrid({ statements, cols, byPeriod, unit, overrides, selected, onCellClick, theme }: {
  statements: StatementKind[]; cols: Period[]; byPeriod: Record<string, Record<string, ResolvedValue>>;
  unit: Unit; overrides: Record<string, number>; selected: { tag: string; period: Period } | null;
  onCellClick: (tag: string, period: Period) => void; theme: ReturnType<typeof useHostTheme>;
}) {
  const grid = `minmax(220px, 1.4fr) repeat(${cols.length}, minmax(84px, 1fr))`;
  return (
    <Stack gap={12}>
      {statements.map((stmt) => (
        <div key={stmt} style={{ border: `1px solid ${theme.stroke.tertiary}`, borderRadius: 8, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: grid, background: theme.bg.elevated, borderBottom: `1px solid ${theme.stroke.secondary}`, padding: "8px 12px" }}>
            <Text size="small" weight="semibold">{STATEMENT_LABEL[stmt]}</Text>
            {cols.map((p) => (
              <Text key={p} size="small" weight="semibold" style={{ textAlign: "right" }}>{p}</Text>
            ))}
          </div>
          {nodesFor(stmt).map((node) => {
            const isCalc = node.kind === "calculated";
            return (
              <div key={node.tag} data-testid={`spread-row-${node.tag}`} style={{ display: "grid", gridTemplateColumns: grid, alignItems: "center", padding: "5px 12px", borderBottom: `1px solid ${theme.stroke.tertiary}`, background: selected?.tag === node.tag ? "#EAF1FE" : undefined }}>
                <Text size="small" weight={isCalc ? "semibold" : "regular"} style={{ paddingLeft: (node.indent ?? 0) * 10 }}>{node.label}</Text>
                {cols.map((p) => {
                  const rv = byPeriod[p]?.[node.tag];
                  const id = cellId(node.tag, p);
                  const cell = node.kind === "source" ? sourceCell(node.tag, p) : undefined;
                  const corrected = overrides[id] !== undefined;
                  const isException = cell?.confidence === "review" && !corrected;
                  const isSel = selected?.tag === node.tag && selected?.period === p;
                  return (
                    <div
                      key={p}
                      data-testid={`cell-${node.tag}-${p}`}
                      onClick={() => onCellClick(node.tag, p)}
                      style={{ textAlign: "right", fontSize: 12.5, fontWeight: isCalc ? 700 : 500, cursor: "pointer", padding: "2px 4px", borderRadius: 3, color: isException ? "#B42018" : theme.text.primary, background: isSel ? "#D7E6FE" : undefined, outline: isException ? "1px solid #F5C4BE" : undefined }}
                      title={corrected ? "Human-corrected" : isException ? "Flagged — low confidence" : node.kind === "calculated" ? "Calculated — click to trace" : "Source — click to trace/edit"}
                    >
                      {rv ? formatUnit(rv.value, node.format, unit) : "—"}
                      {corrected && <span style={{ color: "#1F8A65" }}> ✎</span>}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      ))}
      <Text size="small" tone="quaternary">
        Source rows are extracted &amp; standardised to the ACOS chart of accounts; <strong>bold</strong> rows are calculated by the engine (never trusted from the page). Red = flagged low-confidence; ✎ = human-corrected. Click any value to trace or edit it.
      </Text>
    </Stack>
  );
}

function TrendsGrid({ periodsChrono, cols, byPeriod, theme }: {
  periodsChrono: Period[]; cols: Period[]; byPeriod: Record<string, Record<string, ResolvedValue>>; theme: ReturnType<typeof useHostTheme>;
}) {
  const rows = ["IS.REVENUE", "IS.GROSS_PROFIT", "IS.EBITDA", "IS.NET_INCOME", "BS.TOTAL_ASSETS", "BS.TOTAL_DEBT", "BS.TOTAL_EQUITY", "CF.CFO", "RATIO.CURRENT", "RATIO.DSCR"];
  const grid = `minmax(200px, 1.3fr) repeat(${cols.length}, minmax(78px, 1fr)) 90px`;
  const yearsSpan = periodsChrono.length - 1;
  return (
    <div style={{ border: `1px solid ${theme.stroke.tertiary}`, borderRadius: 8, overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: grid, background: theme.bg.elevated, borderBottom: `1px solid ${theme.stroke.secondary}`, padding: "8px 12px" }}>
        <Text size="small" weight="semibold">Trend — YoY growth</Text>
        {cols.map((p) => <Text key={p} size="small" weight="semibold" style={{ textAlign: "right" }}>{p}</Text>)}
        <Text size="small" weight="semibold" style={{ textAlign: "right" }}>CAGR</Text>
      </div>
      {rows.map((tag) => {
        const node = getNode(tag);
        if (!node) return null;
        const cagr = cagrPct(byPeriod[periodsChrono[0]]?.[tag]?.value, byPeriod[periodsChrono[periodsChrono.length - 1]]?.[tag]?.value, yearsSpan);
        return (
          <div key={tag} style={{ display: "grid", gridTemplateColumns: grid, alignItems: "center", padding: "5px 12px", borderBottom: `1px solid ${theme.stroke.tertiary}` }}>
            <Text size="small">{node.label}</Text>
            {cols.map((p) => {
              const idx = periodsChrono.indexOf(p);
              const prev = idx > 0 ? byPeriod[periodsChrono[idx - 1]]?.[tag]?.value : undefined;
              const y = yoyPct(byPeriod[p]?.[tag]?.value ?? 0, prev);
              const tone = y === null ? theme.text.quaternary : y >= 0 ? "#1F8A65" : "#B42018";
              return <Text key={p} size="small" style={{ textAlign: "right", color: tone }}>{y === null ? "—" : `${y >= 0 ? "▲" : "▼"} ${fmtPct(y)}`}</Text>;
            })}
            <Text size="small" weight="semibold" style={{ textAlign: "right", color: cagr === null ? theme.text.quaternary : cagr >= 0 ? "#1F8A65" : "#B42018" }}>{fmtPct(cagr)}</Text>
          </div>
        );
      })}
    </div>
  );
}

function RatiosGrid({ cols, byPeriod, onOpenSop, theme }: {
  cols: Period[]; byPeriod: Record<string, Record<string, ResolvedValue>>; onOpenSop?: (s: string, a?: string) => void; theme: ReturnType<typeof useHostTheme>;
}) {
  const ratios = nodesFor("RATIO").filter((n) => n.tag.startsWith("RATIO."));
  const grid = `minmax(200px, 1.3fr) repeat(${cols.length}, minmax(78px, 1fr)) minmax(150px, 1fr)`;
  const toneColor = (s: string) => (s === "pass" ? "#1F8A65" : s === "warn" ? "#C08532" : "#B42018");
  return (
    <div style={{ border: `1px solid ${theme.stroke.tertiary}`, borderRadius: 8, overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: grid, background: theme.bg.elevated, borderBottom: `1px solid ${theme.stroke.secondary}`, padding: "8px 12px" }}>
        <Text size="small" weight="semibold">Ratio</Text>
        {cols.map((p) => <Text key={p} size="small" weight="semibold" style={{ textAlign: "right" }}>{p}</Text>)}
        <Text size="small" weight="semibold" style={{ textAlign: "right" }}>Policy threshold</Text>
      </div>
      {ratios.map((node) => (
        <div key={node.tag} style={{ display: "grid", gridTemplateColumns: grid, alignItems: "center", padding: "5px 12px", borderBottom: `1px solid ${theme.stroke.tertiary}` }}>
          <Row gap={6} align="center">
            <Text size="small">{node.label}</Text>
            {node.sopRef && onOpenSop && <SopLink section={node.sopRef} appliedTo={node.label} onOpen={onOpenSop} />}
          </Row>
          {cols.map((p) => {
            const v = byPeriod[p]?.[node.tag]?.value ?? 0;
            const s = ratioStatus(node.tag, v);
            const disp = node.format === "percent" ? `${(v * 100).toFixed(1)}%` : `${v.toFixed(2)}x`;
            return <Text key={p} size="small" weight="semibold" style={{ textAlign: "right", color: toneColor(s) }}>{disp}</Text>;
          })}
          <Text size="small" tone="tertiary" style={{ textAlign: "right" }}>{RATIO_META[node.tag]?.policy ?? "—"}</Text>
        </div>
      ))}
    </div>
  );
}

function HealthCard({ resolved, period, theme }: { resolved: Record<string, ResolvedValue>; period: Period; theme: ReturnType<typeof useHostTheme> }) {
  const health = healthScorecard(resolved);
  const gradeColor = health.overall >= 68 ? "#1F8A65" : health.overall >= 42 ? "#C08532" : "#B42018";
  return (
    <Row gap={16} align="start" wrap>
      <Stack gap={4} style={{ border: `1px solid ${theme.stroke.secondary}`, borderRadius: 10, padding: 18, minWidth: 200, alignItems: "center" }}>
        <Text size="small" tone="tertiary">Composite health · {period}</Text>
        <div style={{ fontSize: 44, fontWeight: 800, color: gradeColor, lineHeight: 1 }}>{health.grade}</div>
        <Text size="small" weight="semibold">{health.overall}/100</Text>
        <Text size="small" tone="quaternary" style={{ textAlign: "center" }}>Agent-scored from policy ratios; humans govern via gates.</Text>
      </Stack>
      <Stack gap={8} style={{ flex: 1, minWidth: 260 }}>
        {health.pillars.map((p) => (
          <div key={p.key} style={{ border: `1px solid ${theme.stroke.tertiary}`, borderRadius: 8, padding: "10px 12px" }}>
            <Row justify="space-between" align="center">
              <Text size="small" weight="semibold">{p.label}</Text>
              <Text size="small" weight="semibold" style={{ color: p.score >= 68 ? "#1F8A65" : p.score >= 42 ? "#C08532" : "#B42018" }}>{p.score}/100</Text>
            </Row>
            <div style={{ height: 6, borderRadius: 3, background: theme.fill.tertiary, marginTop: 6, overflow: "hidden" }}>
              <div style={{ width: `${p.score}%`, height: "100%", background: p.score >= 68 ? "#1F8A65" : p.score >= 42 ? "#C08532" : "#B42018" }} />
            </div>
            <Text size="small" tone="tertiary" style={{ marginTop: 4 }}>{p.note}</Text>
          </div>
        ))}
      </Stack>
    </Row>
  );
}

function ProvenancePanel({ selected, byPeriod, editValue, editRationale, setEditValue, setEditRationale, onSave, onAccept, onDrill, onOpenSop, editLog, verified, theme }: {
  selected: { tag: string; period: Period } | null;
  byPeriod: Record<string, Record<string, ResolvedValue>>;
  editValue: string; editRationale: string; setEditValue: (v: string) => void; setEditRationale: (v: string) => void;
  onSave: () => void; onAccept: () => void; onDrill: (tag: string, period: Period) => void; onOpenSop?: (s: string, a?: string) => void;
  editLog: EditRecord[]; verified: string[]; theme: ReturnType<typeof useHostTheme>;
}) {
  if (!selected) return <Text size="small" tone="tertiary">Select a value to see its lineage.</Text>;
  const { tag, period } = selected;
  const node = getNode(tag);
  const rv = byPeriod[period]?.[tag];
  if (!node || !rv) return null;
  const cell = node.kind === "source" ? sourceCell(tag, period) : undefined;
  const id = cellId(tag, period);
  const isVerified = verified.includes(id);
  const history = editLog.filter((e) => e.tag === tag && e.period === period);
  const disp = node.format === "percent" ? `${(rv.value * 100).toFixed(1)}%` : node.format === "ratio" ? `${rv.value.toFixed(2)}x` : `$${Math.round(rv.value).toLocaleString("en-US")}K`;

  return (
    <div data-testid="provenance-strip" style={{ border: `1px solid ${theme.stroke.secondary}`, borderRadius: 8, padding: "12px 14px", background: "#F8FAFF" }}>
      <Row justify="space-between" align="center" wrap gap={8}>
        <Text weight="semibold" size="small">Lineage · {node.label} ({period})</Text>
        <Row gap={6} align="center">
          {isVerified && <Pill tone="success">human-verified</Pill>}
          <Text weight="semibold" size="small">{disp}</Text>
        </Row>
      </Row>

      {node.kind === "source" && cell && (
        <Stack gap={6} style={{ marginTop: 8 }}>
          <Text size="small" tone="secondary">
            Extracted from <strong>{STATEMENT_LABEL[node.statement]}</strong>, page {cell.page}, cell{" "}
            <span style={{ color: theme.accent.primary, cursor: "pointer", textDecoration: "underline" }} onClick={() => onDrill(tag, period)}>{tag} · {period}</span>.{" "}
            Confidence: <strong style={{ color: cell.confidence === "review" ? "#B42018" : "#1F8A65" }}>{cell.confidence === "review" ? "low — flagged" : "high"}</strong>.
            {node.sopRef && onOpenSop && <> Rule: <SopLink section={node.sopRef} appliedTo={node.label} onOpen={onOpenSop} /></>}
          </Text>
          {cell.confidence === "review" && cell.reason && <Text size="small" tone="tertiary">Agent note: {cell.reason}</Text>}

          {/* In-cell correction */}
          <Row gap={8} align="end" wrap style={{ marginTop: 4 }}>
            <Stack gap={2}>
              <Text size="small" tone="tertiary">Corrected value ($K)</Text>
              <input data-testid="edit-value" value={editValue} onChange={(e) => setEditValue((e.target as HTMLInputElement).value)} style={{ padding: "6px 10px", borderRadius: 6, border: `1px solid ${theme.stroke.secondary}`, fontSize: 13, width: 130, fontFamily: "Inter, sans-serif" }} />
            </Stack>
            <Stack gap={2} style={{ flex: 1, minWidth: 200 }}>
              <Text size="small" tone="tertiary">Rationale (required)</Text>
              <input data-testid="edit-rationale" value={editRationale} onChange={(e) => setEditRationale((e.target as HTMLInputElement).value)} placeholder="e.g. Source page shows 26,300 — OCR scale error" style={{ padding: "6px 10px", borderRadius: 6, border: `1px solid ${theme.stroke.secondary}`, fontSize: 13, fontFamily: "Inter, sans-serif" }} />
            </Stack>
            <Button variant="primary" style={{ height: 32, fontSize: 12 }} data-testid="save-correction" onClick={onSave}>Save correction</Button>
            <Button variant="ghost" style={{ height: 32, fontSize: 12 }} data-testid="accept-value" onClick={onAccept}>Accept as-is</Button>
          </Row>
        </Stack>
      )}

      {node.kind === "calculated" && (
        <Stack gap={6} style={{ marginTop: 8 }}>
          <Text size="small" tone="secondary" style={{ fontFamily: "monospace" }}>{node.formula}</Text>
          <Row gap={6} wrap>
            {(lineageFor(tag, byPeriod[period])?.children ?? []).map((child) => (
              <span key={child.tag} onClick={() => onDrill(child.tag, period)} style={{ border: `1px solid ${theme.stroke.secondary}`, borderRadius: 6, padding: "4px 8px", fontSize: 12, cursor: "pointer", background: theme.bg.editor }} title="Drill into this dependency">
                {child.label}: <strong>{getNode(child.tag)?.format === "ratio" ? `${child.value.toFixed(2)}x` : `$${Math.round(child.value).toLocaleString("en-US")}K`}</strong>
              </span>
            ))}
          </Row>
          <Text size="small" tone="tertiary">Highlighted source cells on the left feed this value. Click a dependency to drill further.</Text>
        </Stack>
      )}

      {history.length > 0 && (
        <Stack gap={3} style={{ marginTop: 10, borderTop: `1px solid ${theme.stroke.tertiary}`, paddingTop: 8 }}>
          <Text size="small" weight="semibold">Change history (case lifecycle)</Text>
          {history.map((h) => (
            <Text key={h.id} size="small" tone="tertiary">
              {h.at} · {h.actor} corrected ${Math.round(h.from).toLocaleString("en-US")}K → ${Math.round(h.to).toLocaleString("en-US")}K — {h.rationale}
            </Text>
          ))}
        </Stack>
      )}
    </div>
  );
}
