/**
 * Deterministic financial compute + integrity + lineage engine.
 *
 * Source leaves come in as `${tag}@${period}` → number. Every calculated node
 * (subtotal, total, ratio) is resolved from its `dependsOn` inputs — so each
 * derived value carries the exact operands it was built from, and any of those
 * can be a source cell (traceable to a page) or itself calculated (traceable
 * further down). This is the real dependency graph that replaces the old
 * single hardcoded IMPACT_MAP.
 */
import type { NodeKind, TaxonomyNode, ValueFormat } from "./taxonomy";
import { TAXONOMY, getNode } from "./taxonomy";
import type { Period } from "./dataset";

export type ResolvedValue = {
  tag: string;
  period: Period;
  value: number;
  kind: NodeKind;
  node: TaxonomyNode;
  /** Direct dependencies with their resolved values (empty for source leaves). */
  inputs: { tag: string; value: number }[];
};

const key = (tag: string, period: Period) => `${tag}@${period}`;

function applyOp(op: string, values: number[]): number {
  switch (op) {
    case "sum":
      return values.reduce((a, b) => a + b, 0);
    case "subtract":
      return values.slice(1).reduce((a, b) => a - b, values[0] ?? 0);
    case "divide":
      return values[1] ? values[0] / values[1] : 0;
    default:
      return 0;
  }
}

/**
 * Resolve every taxonomy node for one period. `sourceValues` supplies the source
 * leaves; calculated nodes are derived recursively (memoised, cycle-guarded).
 */
export function computeValues(
  sourceValues: Record<string, number>,
  period: Period,
): Record<string, ResolvedValue> {
  const resolved: Record<string, ResolvedValue> = {};
  const inProgress = new Set<string>();

  function resolve(tag: string): ResolvedValue {
    if (resolved[tag]) return resolved[tag];
    const node = getNode(tag);
    if (!node) {
      const missing: ResolvedValue = {
        tag,
        period,
        value: 0,
        kind: "source",
        node: { tag, label: tag, statement: "RATIO", kind: "source", format: "currency" },
        inputs: [],
      };
      resolved[tag] = missing;
      return missing;
    }
    if (node.kind === "source") {
      const value = sourceValues[key(tag, period)] ?? 0;
      const rv: ResolvedValue = { tag, period, value, kind: "source", node, inputs: [] };
      resolved[tag] = rv;
      return rv;
    }
    // calculated
    if (inProgress.has(tag)) {
      // cycle guard — should never happen with the authored taxonomy
      const rv: ResolvedValue = { tag, period, value: 0, kind: "calculated", node, inputs: [] };
      resolved[tag] = rv;
      return rv;
    }
    inProgress.add(tag);
    const inputs = (node.dependsOn ?? []).map((dep) => {
      const child = resolve(dep);
      return { tag: dep, value: child.value };
    });
    inProgress.delete(tag);
    const value = applyOp(node.op ?? "sum", inputs.map((i) => i.value));
    const rv: ResolvedValue = { tag, period, value, kind: "calculated", node, inputs };
    resolved[tag] = rv;
    return rv;
  }

  for (const node of TAXONOMY) resolve(node.tag);
  return resolved;
}

export function computeAllPeriods(
  sourceValues: Record<string, number>,
  periods: Period[],
): Record<Period, Record<string, ResolvedValue>> {
  const out = {} as Record<Period, Record<string, ResolvedValue>>;
  for (const p of periods) out[p] = computeValues(sourceValues, p);
  return out;
}

// ─── Integrity checks (the balance sheet balances; cash flow ties; NI ties) ────

export type IntegrityCheck = {
  id: "bsBalances" | "cfTiesToCash" | "niTiesToCf";
  label: string;
  lhsLabel: string;
  lhs: number;
  rhsLabel: string;
  rhs: number;
  delta: number;
  pass: boolean;
};

const TIE_TOLERANCE = 0.5; // values are whole $-thousands; anything above rounding fails

export function runIntegrityChecks(
  resolved: Record<string, ResolvedValue>,
  period: Period,
): IntegrityCheck[] {
  const v = (tag: string) => resolved[tag]?.value ?? 0;
  const mk = (
    id: IntegrityCheck["id"],
    label: string,
    lhsLabel: string,
    lhs: number,
    rhsLabel: string,
    rhs: number,
  ): IntegrityCheck => ({ id, label, lhsLabel, lhs, rhsLabel, rhs, delta: lhs - rhs, pass: Math.abs(lhs - rhs) <= TIE_TOLERANCE });

  return [
    mk("bsBalances", "Balance sheet balances", "Total Assets", v("BS.TOTAL_ASSETS"), "Total Liabilities + Equity", v("BS.TOTAL_LIAB_EQUITY")),
    mk("cfTiesToCash", `Cash flow ties to cash (${period})`, "Ending Cash (CF)", v("CF.END_CASH"), "Cash (BS)", v("BS.CASH")),
    mk("niTiesToCf", "Net income ties across statements", "Net Income (IS)", v("IS.NET_INCOME"), "Net Income (CF)", v("CF.NET_INCOME")),
  ];
}

// ─── Lineage tree (drill any value down to its source cells) ───────────────────

export type LineageNode = {
  tag: string;
  label: string;
  value: number;
  kind: NodeKind;
  op?: string;
  formula?: string;
  children: LineageNode[];
};

export function lineageFor(
  tag: string,
  resolved: Record<string, ResolvedValue>,
): LineageNode | null {
  const rv = resolved[tag];
  if (!rv) return null;
  const build = (t: string, seen: Set<string>): LineageNode => {
    const r = resolved[t];
    const node = r?.node ?? getNode(t);
    const children: LineageNode[] =
      r && r.kind === "calculated" && !seen.has(t)
        ? (node?.dependsOn ?? []).map((dep) => build(dep, new Set(seen).add(t)))
        : [];
    return {
      tag: t,
      label: node?.label ?? t,
      value: r?.value ?? 0,
      kind: r?.kind ?? "source",
      op: node?.op,
      formula: node?.formula,
      children,
    };
  };
  return build(tag, new Set());
}

// ─── Formatting ────────────────────────────────────────────────────────────────

export function formatValue(value: number, format: ValueFormat): string {
  if (format === "ratio") return `${value.toFixed(2)}x`;
  if (format === "percent") return `${(value * 100).toFixed(1)}%`;
  // currency, in $ thousands
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(Math.round(value));
  return `${sign}$${abs.toLocaleString("en-US")}`;
}

export function formatTag(tag: string, value: number): string {
  const node = getNode(tag);
  return formatValue(value, node?.format ?? "currency");
}
