/**
 * Meridian Foods Co. — generated 3-statement model (FY2023–FY2025).
 *
 * Every number is authored to be internally consistent:
 *   • Balance Sheet balances   (Total Assets = Total Liabilities + Equity)
 *   • Cash Flow ties to cash   (Ending Cash = Balance Sheet Cash)
 *   • Net Income ties          (Cash Flow Net Income = Income Statement Net Income)
 *   • Retained earnings roll    (RE_t = RE_{t-1} + Net Income_t − Dividends_t)
 *
 * `trueValue` is what the borrower's statement actually prints. `extractedValue`
 * is what the extraction agent read — identical except for ONE deliberately
 * seeded misread (FY2025 Inventory), which breaks the balance-sheet tie until a
 * human corrects it. That single defect drives the confidence → exception →
 * in-cell edit → re-balance narrative; every other figure withstands scrutiny.
 */
import type { StatementKind } from "./taxonomy";
import { getNode } from "./taxonomy";

export type Period = "FY2022" | "FY2023" | "FY2024" | "FY2025";
/** Every period held in the company's master financial database. */
export const PERIODS: Period[] = ["FY2022", "FY2023", "FY2024", "FY2025"];
/** Periods ingested by default; earlier statements are added on demand ("master DB grows"). */
export const DEFAULT_INGESTED: Period[] = ["FY2023", "FY2024", "FY2025"];

export type Confidence = "high" | "review";

export type SourceCell = {
  tag: string;
  period: Period;
  /** As printed on the borrower's statement ($ thousands). */
  trueValue: number;
  /** As read by the extraction agent (== trueValue unless misread). */
  extractedValue: number;
  confidence: Confidence;
  reason?: string;
  /** Document page the value appears on. */
  page: number;
};

export const MERIDIAN = {
  caseId: "meridian" as const,
  borrowerName: "Meridian Foods Co.",
  entityType: "Private C-Corp · packaged-foods manufacturing & distribution",
  ein: "47-0913322",
  duns: "07-412-8890",
  headquarters: "Columbus, OH",
  unitsNote: "$ in thousands, except ratios",
  auditor: "Whitfield & Boyd LLP (unqualified opinion)",
  statementPages: [
    { page: 1, statement: "IS" as StatementKind, title: "Consolidated Statements of Operations" },
    { page: 2, statement: "BS" as StatementKind, title: "Consolidated Balance Sheets" },
    { page: 3, statement: "CF" as StatementKind, title: "Consolidated Statements of Cash Flows" },
  ],
};

const PAGE_OF_STATEMENT: Record<StatementKind, number> = { IS: 1, BS: 2, CF: 3, RATIO: 0 };

// Raw as-printed values, ordered [FY2022, FY2023, FY2024, FY2025]. Source leaves only.
const TRUE_VALUES: Record<string, [number, number, number, number]> = {
  // Income Statement
  "IS.REVENUE": [142000, 154200, 168900, 182400],
  "IS.COGS": [101600, 109482, 118230, 127680],
  "IS.SGA": [30500, 32900, 35800, 38300],
  "IS.DA": [5000, 5300, 5700, 6100],
  "IS.INTEREST": [2750, 2900, 3050, 3180],
  "IS.TAX": [540, 905, 1530, 1785],
  // Balance Sheet — assets
  "BS.CASH": [4900, 5600, 6900, 8450],
  "BS.AR": [17200, 18400, 20100, 21900],
  "BS.INVENTORY": [20600, 22100, 24050, 26300],
  "BS.PREPAID": [2300, 2500, 2800, 3150],
  "BS.PPE_NET": [43800, 45100, 46900, 48600],
  "BS.GOODWILL": [12400, 12400, 12400, 12400],
  "BS.INTANGIBLES": [6100, 5700, 5300, 4900],
  // Balance Sheet — liabilities & equity
  "BS.AP": [13300, 14200, 15400, 16700],
  "BS.ACCRUED": [6313, 6700, 7200, 7850],
  "BS.CURRENT_LTD": [3700, 3900, 4200, 4500],
  "BS.LTD": [36300, 37100, 37900, 38200],
  "BS.COMMON_STOCK": [20000, 20000, 20000, 20000],
  "BS.RETAINED_EARNINGS": [27687, 29900, 33750, 38450],
  // Cash Flow (authored to tie: Ending Cash = BS Cash each year)
  "CF.NET_INCOME": [1610, 2713, 4590, 5355],
  "CF.DA": [5000, 5300, 5700, 6100],
  "CF.CHANGE_WC": [-900, -1050, -2250, -2450],
  "CF.CAPEX": [-5010, -6213, -7100, -7400],
  "CF.DEBT_NET": [300, 450, 1100, 600],
  "CF.DIVIDENDS": [-400, -500, -740, -655],
  "CF.BEGIN_CASH": [4300, 4900, 5600, 6900],
};

// The single seeded extraction defect.
const EXCEPTIONS: {
  tag: string;
  period: Period;
  extractedValue: number;
  confidence: Confidence;
  reason: string;
}[] = [
  {
    tag: "BS.INVENTORY",
    period: "FY2025",
    extractedValue: 2630,
    confidence: "review",
    reason:
      "OCR scale error — source page shows 26,300 but extraction read 2,630 (dropped digit). Implied YoY change −89% vs +9% expected; Balance Sheet no longer balances by 23,670.",
  },
];

function periodIndex(period: Period): number {
  return PERIODS.indexOf(period);
}

/** Full set of extracted source cells (with true values + provenance). */
export const SOURCE_CELLS: SourceCell[] = (() => {
  const cells: SourceCell[] = [];
  for (const [tag, values] of Object.entries(TRUE_VALUES)) {
    const node = getNode(tag);
    const page = node ? PAGE_OF_STATEMENT[node.statement] : 0;
    for (const period of PERIODS) {
      const trueValue = values[periodIndex(period)];
      const exc = EXCEPTIONS.find((e) => e.tag === tag && e.period === period);
      cells.push({
        tag,
        period,
        trueValue,
        extractedValue: exc ? exc.extractedValue : trueValue,
        confidence: exc ? exc.confidence : "high",
        reason: exc?.reason,
        page,
      });
    }
  }
  return cells;
})();

export function sourceCell(tag: string, period: Period): SourceCell | undefined {
  return SOURCE_CELLS.find((c) => c.tag === tag && c.period === period);
}

/** Map of `${tag}@${period}` → extracted (as-read) value — the engine's inputs. */
export function extractedValueMap(): Record<string, number> {
  const map: Record<string, number> = {};
  for (const c of SOURCE_CELLS) map[`${c.tag}@${c.period}`] = c.extractedValue;
  return map;
}

/** Map of `${tag}@${period}` → true (as-printed) value — the source document. */
export function trueValueMap(): Record<string, number> {
  const map: Record<string, number> = {};
  for (const c of SOURCE_CELLS) map[`${c.tag}@${c.period}`] = c.trueValue;
  return map;
}

export const SEEDED_EXCEPTIONS = EXCEPTIONS;
