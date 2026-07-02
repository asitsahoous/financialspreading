/**
 * Analytical layer over the master financial database: unit display, trend
 * (YoY / CAGR), ratio thresholds vs credit policy, and a composite financial
 * health scorecard. Pure functions over resolved engine values.
 */
import type { ValueFormat } from "./taxonomy";
import type { ResolvedValue } from "./engine";

export type Unit = "auto" | "K" | "MM" | "B";

/** Stored values are in $ thousands. Convert to the chosen display unit. */
export function formatUnit(value: number, format: ValueFormat, unit: Unit): string {
  if (format === "ratio") return `${value.toFixed(2)}x`;
  if (format === "percent") return `${(value * 100).toFixed(1)}%`;
  const abs = Math.abs(value);
  let divisor = 1;
  let suffix = "K";
  const eff: Unit = unit === "auto" ? (abs >= 1_000_000 ? "B" : abs >= 1000 ? "MM" : "K") : unit;
  if (eff === "B") {
    divisor = 1_000_000;
    suffix = "B";
  } else if (eff === "MM") {
    divisor = 1000;
    suffix = "MM";
  } else {
    divisor = 1;
    suffix = "K";
  }
  const scaled = value / divisor;
  const digits = suffix === "K" ? 0 : Math.abs(scaled) >= 100 ? 1 : 2;
  const body = Math.abs(scaled).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
  const signed = scaled < 0 ? `(${body})` : body;
  return `${signed}${suffix}`;
}

export function yoyPct(curr: number, prev: number | undefined): number | null {
  if (prev === undefined || prev === 0) return null;
  return (curr - prev) / Math.abs(prev);
}

export function cagrPct(first: number | undefined, last: number | undefined, years: number): number | null {
  if (first === undefined || last === undefined || first <= 0 || last <= 0 || years <= 0) return null;
  return Math.pow(last / first, 1 / years) - 1;
}

export function fmtPct(v: number | null): string {
  if (v === null) return "—";
  return `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}%`;
}

// ─── Ratio thresholds vs credit policy ────────────────────────────────────────

export type RatioMeta = { higherIsBetter: boolean; threshold: number; warnBand: number; policy: string };

export const RATIO_META: Record<string, RatioMeta> = {
  "RATIO.CURRENT": { higherIsBetter: true, threshold: 1.2, warnBand: 0.25, policy: "≥ 1.20x (SOP §10.3)" },
  "RATIO.QUICK": { higherIsBetter: true, threshold: 1.0, warnBand: 0.2, policy: "≥ 1.00x (SOP §10.3)" },
  "RATIO.DE": { higherIsBetter: false, threshold: 1.5, warnBand: 0.3, policy: "≤ 1.50x (SOP §10.4)" },
  "RATIO.INTEREST_COVERAGE": { higherIsBetter: true, threshold: 2.5, warnBand: 0.6, policy: "≥ 2.50x (SOP §10.5)" },
  "RATIO.DSCR": { higherIsBetter: true, threshold: 1.25, warnBand: 0.25, policy: "≥ 1.25x covenant (SOP §10.6)" },
  "RATIO.NET_MARGIN": { higherIsBetter: true, threshold: 0.025, warnBand: 0.01, policy: "≥ 2.5% (SOP §10.7)" },
};

export type RatioStatus = "pass" | "warn" | "fail";

export function ratioStatus(tag: string, value: number): RatioStatus {
  const m = RATIO_META[tag];
  if (!m) return "pass";
  if (m.higherIsBetter) {
    if (value >= m.threshold) return "pass";
    if (value >= m.threshold - m.warnBand) return "warn";
    return "fail";
  }
  if (value <= m.threshold) return "pass";
  if (value <= m.threshold + m.warnBand) return "warn";
  return "fail";
}

// ─── Composite financial health scorecard ─────────────────────────────────────

export type HealthPillar = { key: string; label: string; score: number; note: string; ratios: string[] };
export type HealthResult = { pillars: HealthPillar[]; overall: number; grade: string };

function scoreRatio(tag: string, value: number): number {
  const m = RATIO_META[tag];
  if (!m) return 70;
  // Map distance-from-threshold to 0..100 (100 = comfortably passing).
  const ref = m.threshold === 0 ? 1 : Math.abs(m.threshold);
  const rel = m.higherIsBetter ? (value - m.threshold) / ref : (m.threshold - value) / ref;
  return Math.max(0, Math.min(100, 60 + rel * 120));
}

export function healthScorecard(resolved: Record<string, ResolvedValue>): HealthResult {
  const v = (t: string) => resolved[t]?.value ?? 0;
  const avg = (tags: string[]) => tags.reduce((a, t) => a + scoreRatio(t, v(t)), 0) / tags.length;
  const pillars: HealthPillar[] = [
    { key: "liquidity", label: "Liquidity", ratios: ["RATIO.CURRENT", "RATIO.QUICK"], score: 0, note: "Current & quick ratios vs policy" },
    { key: "leverage", label: "Leverage", ratios: ["RATIO.DE"], score: 0, note: "Debt / equity vs policy ceiling" },
    { key: "coverage", label: "Debt Coverage", ratios: ["RATIO.DSCR", "RATIO.INTEREST_COVERAGE"], score: 0, note: "DSCR & interest coverage" },
    { key: "profitability", label: "Profitability", ratios: ["RATIO.NET_MARGIN"], score: 0, note: "Net margin vs policy floor" },
  ].map((p) => ({ ...p, score: Math.round(avg(p.ratios)) }));
  const overall = Math.round(pillars.reduce((a, p) => a + p.score, 0) / pillars.length);
  const grade = overall >= 80 ? "A" : overall >= 68 ? "B" : overall >= 55 ? "C" : overall >= 42 ? "D" : "E";
  return { pillars, overall, grade };
}
