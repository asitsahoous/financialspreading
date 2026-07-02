/**
 * Master financial database — multi-company registry.
 *
 * Four borrowers, one engine, one chart of accounts:
 *  - Meridian Foods Co.   (term_loan_b equivalent)   hand-authored, ties out
 *  - Walmart Inc.         (term_loan_b)              generated, ties out
 *  - AutoWest Motors      (floor_plan, distressed)   generated, ties out
 *  - Coastal Hyundai      (annual_review, healthy)   generated, ties out — no seeded exception
 *
 * Every number is authored/generated to be internally consistent:
 *   - Balance Sheet balances   (Total Assets = Total Liabilities + Equity)
 *   - Cash Flow ties to cash   (Ending Cash = Balance Sheet Cash)
 *   - Net Income ties          (Cash Flow Net Income = Income Statement Net Income)
 * Walmart and AutoWest each carry ONE deliberately seeded extraction defect
 * (computed from the true value, not hand-typed) that breaks an integrity
 * check until a human corrects it — Meridian's is on Inventory, Walmart's on
 * PP&E, AutoWest's on Inventory (its floor-plan collateral line). Coastal
 * Hyundai has none — a routine, clean annual re-certification.
 */
import type { StatementKind } from "./taxonomy";
import { getNode } from "./taxonomy";
import { generateCompanyValues, type CompanyAssumptions, type YearAssumptions } from "./generator";

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

export type CompanyId = "meridian" | "walmart" | "autowest" | "coastal-hyundai";

export type CaseType = "term_loan_b" | "revolving_credit" | "floor_plan" | "annual_review";

export type CompanyProfile = {
  caseId: CompanyId;
  borrowerName: string;
  entityType: string;
  ein: string;
  duns: string;
  headquarters: string;
  unitsNote: string;
  auditor: string;
  caseType: CaseType;
  statementPages: { page: number; statement: StatementKind; title: string }[];
};

const STANDARD_PAGES = (title1: string, title2: string, title3: string): CompanyProfile["statementPages"] => [
  { page: 1, statement: "IS", title: title1 },
  { page: 2, statement: "BS", title: title2 },
  { page: 3, statement: "CF", title: title3 },
];

export const COMPANY_PROFILES: Record<CompanyId, CompanyProfile> = {
  meridian: {
    caseId: "meridian",
    borrowerName: "Meridian Foods Co.",
    entityType: "Private C-Corp · packaged-foods manufacturing & distribution",
    ein: "47-0913322",
    duns: "07-412-8890",
    headquarters: "Columbus, OH",
    unitsNote: "$ in thousands, except ratios",
    auditor: "Whitfield & Boyd LLP (unqualified opinion)",
    caseType: "term_loan_b",
    statementPages: STANDARD_PAGES(
      "Consolidated Statements of Operations",
      "Consolidated Balance Sheets",
      "Consolidated Statements of Cash Flows",
    ),
  },
  walmart: {
    caseId: "walmart",
    borrowerName: "Walmart Inc.",
    entityType: "Public C-Corp (NYSE: WMT) · multinational retail & wholesale",
    ein: "71-0415188",
    duns: "05-907-4321",
    headquarters: "Bentonville, AR",
    unitsNote: "$ in thousands, except ratios",
    auditor: "Ernst & Young LLP (unqualified opinion)",
    caseType: "term_loan_b",
    statementPages: STANDARD_PAGES(
      "Consolidated Statements of Income",
      "Consolidated Balance Sheets",
      "Consolidated Statements of Cash Flows",
    ),
  },
  autowest: {
    caseId: "autowest",
    borrowerName: "AutoWest Motors",
    entityType: "Private LLC · multi-franchise automotive dealer group (floor-plan financed)",
    ein: "83-2214490",
    duns: "11-889-2201",
    headquarters: "Fresno, CA",
    unitsNote: "$ in thousands, except ratios",
    auditor: "Carrow & Nunez CPAs (unqualified opinion, going-concern note)",
    caseType: "floor_plan",
    statementPages: STANDARD_PAGES(
      "Statements of Operations",
      "Balance Sheets",
      "Statements of Cash Flows",
    ),
  },
  "coastal-hyundai": {
    caseId: "coastal-hyundai",
    borrowerName: "Coastal Hyundai",
    entityType: "Private LLC · single-point automotive dealership (floor-plan financed)",
    ein: "94-3350871",
    duns: "16-702-4478",
    headquarters: "Ventura, CA",
    unitsNote: "$ in thousands, except ratios",
    auditor: "Delrio & Sable LLP (unqualified opinion)",
    caseType: "annual_review",
    statementPages: STANDARD_PAGES(
      "Statements of Operations",
      "Balance Sheets",
      "Statements of Cash Flows",
    ),
  },
};

/** Back-compat named export used by earlier Meridian-only code paths. */
export const MERIDIAN = COMPANY_PROFILES.meridian;

const PAGE_OF_STATEMENT: Record<StatementKind, number> = { IS: 1, BS: 2, CF: 3, RATIO: 0 };

// ─── Meridian Foods — hand-authored (unchanged from original build) ───────────

const MERIDIAN_TRUE_VALUES: Record<string, [number, number, number, number]> = {
  "IS.REVENUE": [142000, 154200, 168900, 182400],
  "IS.COGS": [101600, 109482, 118230, 127680],
  "IS.SGA": [30500, 32900, 35800, 38300],
  "IS.DA": [5000, 5300, 5700, 6100],
  "IS.INTEREST": [2750, 2900, 3050, 3180],
  "IS.TAX": [540, 905, 1530, 1785],
  "BS.CASH": [4900, 5600, 6900, 8450],
  "BS.AR": [17200, 18400, 20100, 21900],
  "BS.INVENTORY": [20600, 22100, 24050, 26300],
  "BS.PREPAID": [2300, 2500, 2800, 3150],
  "BS.PPE_NET": [43800, 45100, 46900, 48600],
  "BS.GOODWILL": [12400, 12400, 12400, 12400],
  "BS.INTANGIBLES": [6100, 5700, 5300, 4900],
  "BS.AP": [13300, 14200, 15400, 16700],
  "BS.ACCRUED": [6313, 6700, 7200, 7850],
  "BS.CURRENT_LTD": [3700, 3900, 4200, 4500],
  "BS.LTD": [36300, 37100, 37900, 38200],
  "BS.COMMON_STOCK": [20000, 20000, 20000, 20000],
  "BS.RETAINED_EARNINGS": [27687, 29900, 33750, 38450],
  "CF.NET_INCOME": [1610, 2713, 4590, 5355],
  "CF.DA": [5000, 5300, 5700, 6100],
  "CF.CHANGE_WC": [-900, -1050, -2250, -2450],
  "CF.CAPEX": [-5010, -6213, -7100, -7400],
  "CF.DEBT_NET": [300, 450, 1100, 600],
  "CF.DIVIDENDS": [-400, -500, -740, -655],
  "CF.BEGIN_CASH": [4300, 4900, 5600, 6900],
};

type ExceptionSeed = { tag: string; period: Period; extractedValue: number; confidence: Confidence; reason: string };

const MERIDIAN_EXCEPTIONS: ExceptionSeed[] = [
  {
    tag: "BS.INVENTORY",
    period: "FY2025",
    extractedValue: 2630,
    confidence: "review",
    reason:
      "OCR scale error — source page shows 26,300 but extraction read 2,630 (dropped digit). Implied YoY change −89% vs +9% expected; Balance Sheet no longer balances by 23,670.",
  },
];

// ─── Walmart Inc. — generated (term_loan_b) ────────────────────────────────────

function walmartYear(revenue: number, o: Partial<YearAssumptions>): YearAssumptions {
  return {
    revenue,
    grossMarginPct: 0.246,
    sgaPct: 0.19,
    daPct: 0.019,
    interestRate: 0.045,
    taxRate: 0.24,
    arPctOfRevenue: 0.0103,
    inventoryPctOfCogs: 0.138,
    prepaidPctOfRevenue: 0.006,
    apPctOfCogs: 0.165,
    accruedPctOfRevenue: 0.05,
    capexPctOfRevenue: 0.033,
    currentLtd: 4200000,
    ltd: 35000000,
    dividendPayoutPct: 0.35,
    ...o,
  };
}

const WALMART_ASSUMPTIONS: CompanyAssumptions = {
  seed: { cash: 9200000, ppeNet: 150000000, goodwill: 29000000, intangibles: 7500000, commonStock: 3000000 },
  years: {
    FY2022: walmartYear(570000000, { currentLtd: 4000000, ltd: 34000000 }),
    FY2023: walmartYear(600000000, { grossMarginPct: 0.247, sgaPct: 0.19, apPctOfCogs: 0.166, currentLtd: 4100000, ltd: 34700000 }),
    FY2024: walmartYear(627000000, { grossMarginPct: 0.248, sgaPct: 0.189, apPctOfCogs: 0.167, currentLtd: 4200000, ltd: 35100000 }),
    FY2025: walmartYear(652000000, { grossMarginPct: 0.249, sgaPct: 0.187, apPctOfCogs: 0.168, currentLtd: 4300000, ltd: 35400000 }),
  },
};

// ─── AutoWest Motors — generated (floor_plan, distressed) ─────────────────────

function autowestYear(revenue: number, o: Partial<YearAssumptions>): YearAssumptions {
  return {
    revenue,
    grossMarginPct: 0.11,
    sgaPct: 0.095,
    daPct: 0.008,
    interestRate: 0.079,
    taxRate: 0.22,
    arPctOfRevenue: 0.018,
    inventoryPctOfCogs: 0.22,
    prepaidPctOfRevenue: 0.004,
    apPctOfCogs: 0.05,
    accruedPctOfRevenue: 0.012,
    capexPctOfRevenue: 0.006,
    currentLtd: 42000,
    ltd: 6000,
    dividendPayoutPct: 0,
    ...o,
  };
}

const AUTOWEST_ASSUMPTIONS: CompanyAssumptions = {
  seed: { cash: 1900, ppeNet: 9800, goodwill: 0, intangibles: 300, commonStock: 500 },
  years: {
    FY2022: autowestYear(148000, { currentLtd: 38000, ltd: 6200 }),
    FY2023: autowestYear(156000, { currentLtd: 41500, ltd: 6100 }),
    FY2024: autowestYear(161000, { grossMarginPct: 0.107, sgaPct: 0.098, currentLtd: 47000, ltd: 6000 }),
    FY2025: autowestYear(164000, { grossMarginPct: 0.102, sgaPct: 0.101, interestRate: 0.085, currentLtd: 53500, ltd: 5900 }),
  },
};

// ─── Coastal Hyundai — generated (annual_review, healthy) ─────────────────────

function coastalYear(revenue: number, o: Partial<YearAssumptions>): YearAssumptions {
  return {
    revenue,
    grossMarginPct: 0.135,
    sgaPct: 0.088,
    daPct: 0.007,
    interestRate: 0.062,
    taxRate: 0.24,
    arPctOfRevenue: 0.015,
    inventoryPctOfCogs: 0.15,
    prepaidPctOfRevenue: 0.004,
    apPctOfCogs: 0.06,
    accruedPctOfRevenue: 0.014,
    capexPctOfRevenue: 0.01,
    currentLtd: 8500,
    ltd: 14000,
    dividendPayoutPct: 0.2,
    ...o,
  };
}

const COASTAL_ASSUMPTIONS: CompanyAssumptions = {
  seed: { cash: 4200, ppeNet: 15200, goodwill: 1200, intangibles: 600, commonStock: 1000 },
  years: {
    FY2022: coastalYear(122000, { currentLtd: 2600, ltd: 20400 }),
    FY2023: coastalYear(129500, { currentLtd: 2750, ltd: 20050 }),
    FY2024: coastalYear(136800, { currentLtd: 2900, ltd: 19700 }),
    FY2025: coastalYear(144200, { currentLtd: 3050, ltd: 19450 }),
  },
};

// ─── Registry ──────────────────────────────────────────────────────────────────

const TRUE_VALUES_BY_COMPANY: Record<CompanyId, Record<string, [number, number, number, number]>> = {
  meridian: MERIDIAN_TRUE_VALUES,
  walmart: generateCompanyValues(WALMART_ASSUMPTIONS),
  autowest: generateCompanyValues(AUTOWEST_ASSUMPTIONS),
  "coastal-hyundai": generateCompanyValues(COASTAL_ASSUMPTIONS),
};

/** Build a seeded exception from a fraction of the true value — no hand-typed numbers. */
function scaleDefect(
  companyId: CompanyId,
  tag: string,
  period: Period,
  divisor: number,
  reason: string,
): ExceptionSeed {
  const idx = PERIODS.indexOf(period);
  const trueValue = TRUE_VALUES_BY_COMPANY[companyId][tag][idx];
  return { tag, period, extractedValue: Math.round(trueValue / divisor), confidence: "review", reason };
}

const EXCEPTIONS_BY_COMPANY: Record<CompanyId, ExceptionSeed[]> = {
  meridian: MERIDIAN_EXCEPTIONS,
  walmart: [
    scaleDefect(
      "walmart",
      "BS.PPE_NET",
      "FY2025",
      100,
      "OCR scale error — Document Intelligence dropped two orders of magnitude reading Property, Plant & Equipment off the Balance Sheet page. Balance Sheet no longer balances until corrected.",
    ),
  ],
  autowest: [
    scaleDefect(
      "autowest",
      "BS.INVENTORY",
      "FY2025",
      10,
      "OCR misread on the titled-unit inventory schedule (§4.3.2) — one decimal place dropped. This is the floor-plan collateral base; understating it materially misstates the borrowing-base calculation.",
    ),
  ],
  "coastal-hyundai": [],
};

// ─── Public accessors ──────────────────────────────────────────────────────────

export function sourceCellsFor(companyId: CompanyId): SourceCell[] {
  const cells: SourceCell[] = [];
  const trueValues = TRUE_VALUES_BY_COMPANY[companyId];
  const exceptions = EXCEPTIONS_BY_COMPANY[companyId];
  for (const [tag, values] of Object.entries(trueValues)) {
    const node = getNode(tag);
    const page = node ? PAGE_OF_STATEMENT[node.statement] : 0;
    PERIODS.forEach((period, i) => {
      const trueValue = values[i];
      const exc = exceptions.find((e) => e.tag === tag && e.period === period);
      cells.push({
        tag,
        period,
        trueValue,
        extractedValue: exc ? exc.extractedValue : trueValue,
        confidence: exc ? exc.confidence : "high",
        reason: exc?.reason,
        page,
      });
    });
  }
  return cells;
}

export function sourceCellFor(companyId: CompanyId, tag: string, period: Period): SourceCell | undefined {
  return sourceCellsFor(companyId).find((c) => c.tag === tag && c.period === period);
}

export function extractedValueMapFor(companyId: CompanyId): Record<string, number> {
  const map: Record<string, number> = {};
  for (const c of sourceCellsFor(companyId)) map[`${c.tag}@${c.period}`] = c.extractedValue;
  return map;
}

export function trueValueMapFor(companyId: CompanyId): Record<string, number> {
  const map: Record<string, number> = {};
  for (const c of sourceCellsFor(companyId)) map[`${c.tag}@${c.period}`] = c.trueValue;
  return map;
}

export function seededExceptionsFor(companyId: CompanyId): ExceptionSeed[] {
  return EXCEPTIONS_BY_COMPANY[companyId];
}
