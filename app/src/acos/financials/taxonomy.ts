/**
 * ACOS financial taxonomy — the platform's canonical chart of accounts.
 *
 * Every value the platform knows about is a node here. Two kinds:
 *  - "source"     leaves are extracted directly from the borrower's statements.
 *  - "calculated" nodes (subtotals, totals, ratios) are NEVER extracted — the
 *    engine computes them from their `dependsOn` inputs. This is what lets a
 *    calculated value trace back to the original dependent source values.
 *
 * The taxonomy is what constrains extraction: a printed line that maps to a
 * source tag is captured; a printed subtotal maps to a calculated tag and is
 * recomputed (not trusted from the page). Nothing outside the taxonomy is kept.
 */

export type StatementKind = "IS" | "BS" | "CF" | "RATIO";
export type NodeKind = "source" | "calculated";
export type CalcOp = "sum" | "subtract" | "divide";
export type ValueFormat = "currency" | "ratio" | "percent";

export type TaxonomyNode = {
  tag: string;
  label: string;
  statement: StatementKind;
  kind: NodeKind;
  format: ValueFormat;
  /** Indentation level when printed on the source document / spread (0 = top). */
  indent?: number;
  /** Grouping header on the source document (e.g. "Current Assets"). */
  section?: string;
  /** Calculated-only: how the engine combines `dependsOn`. */
  op?: CalcOp;
  /** Calculated-only: tags this node is derived from (the dependency edges). */
  dependsOn?: string[];
  /** Calculated-only: human-readable formula for the UI. */
  formula?: string;
  /** SOP clause that governs this mapping/derivation rule. */
  sopRef?: string;
};

// ─── Income Statement ─────────────────────────────────────────────────────────
const INCOME_STATEMENT: TaxonomyNode[] = [
  { tag: "IS.REVENUE", label: "Net Revenue", statement: "IS", kind: "source", format: "currency", indent: 0, section: "Revenue", sopRef: "§5.1" },
  { tag: "IS.COGS", label: "Cost of Goods Sold", statement: "IS", kind: "source", format: "currency", indent: 0, section: "Revenue", sopRef: "§5.2" },
  { tag: "IS.GROSS_PROFIT", label: "Gross Profit", statement: "IS", kind: "calculated", format: "currency", indent: 0, section: "Revenue", op: "subtract", dependsOn: ["IS.REVENUE", "IS.COGS"], formula: "Net Revenue − Cost of Goods Sold", sopRef: "§5.3" },
  { tag: "IS.SGA", label: "Selling, General & Admin", statement: "IS", kind: "source", format: "currency", indent: 0, section: "Operating Expenses", sopRef: "§5.4" },
  { tag: "IS.DA", label: "Depreciation & Amortization", statement: "IS", kind: "source", format: "currency", indent: 0, section: "Operating Expenses", sopRef: "§5.5" },
  { tag: "IS.EBIT", label: "Operating Income (EBIT)", statement: "IS", kind: "calculated", format: "currency", indent: 0, section: "Operating Expenses", op: "subtract", dependsOn: ["IS.GROSS_PROFIT", "IS.SGA", "IS.DA"], formula: "Gross Profit − SG&A − D&A", sopRef: "§5.6" },
  { tag: "IS.INTEREST", label: "Interest Expense", statement: "IS", kind: "source", format: "currency", indent: 0, section: "Below the Line", sopRef: "§5.7" },
  { tag: "IS.PRETAX", label: "Pretax Income", statement: "IS", kind: "calculated", format: "currency", indent: 0, section: "Below the Line", op: "subtract", dependsOn: ["IS.EBIT", "IS.INTEREST"], formula: "EBIT − Interest Expense", sopRef: "§5.8" },
  { tag: "IS.TAX", label: "Income Tax Expense", statement: "IS", kind: "source", format: "currency", indent: 0, section: "Below the Line", sopRef: "§5.9" },
  { tag: "IS.NET_INCOME", label: "Net Income", statement: "IS", kind: "calculated", format: "currency", indent: 0, section: "Below the Line", op: "subtract", dependsOn: ["IS.PRETAX", "IS.TAX"], formula: "Pretax Income − Income Tax Expense", sopRef: "§5.10" },
  { tag: "IS.EBITDA", label: "EBITDA", statement: "IS", kind: "calculated", format: "currency", indent: 0, section: "Below the Line", op: "sum", dependsOn: ["IS.EBIT", "IS.DA"], formula: "EBIT + D&A", sopRef: "§5.11" },
];

// ─── Balance Sheet ────────────────────────────────────────────────────────────
const BALANCE_SHEET: TaxonomyNode[] = [
  { tag: "BS.CASH", label: "Cash & Equivalents", statement: "BS", kind: "source", format: "currency", indent: 1, section: "Current Assets", sopRef: "§7.1" },
  { tag: "BS.AR", label: "Accounts Receivable", statement: "BS", kind: "source", format: "currency", indent: 1, section: "Current Assets", sopRef: "§7.2" },
  { tag: "BS.INVENTORY", label: "Inventory", statement: "BS", kind: "source", format: "currency", indent: 1, section: "Current Assets", sopRef: "§7.3" },
  { tag: "BS.PREPAID", label: "Prepaid Expenses", statement: "BS", kind: "source", format: "currency", indent: 1, section: "Current Assets", sopRef: "§7.3" },
  { tag: "BS.TOTAL_CURRENT_ASSETS", label: "Total Current Assets", statement: "BS", kind: "calculated", format: "currency", indent: 0, section: "Current Assets", op: "sum", dependsOn: ["BS.CASH", "BS.AR", "BS.INVENTORY", "BS.PREPAID"], formula: "Cash + AR + Inventory + Prepaid", sopRef: "§7.4" },
  { tag: "BS.PPE_NET", label: "Property, Plant & Equipment, net", statement: "BS", kind: "source", format: "currency", indent: 1, section: "Non-current Assets", sopRef: "§7.5" },
  { tag: "BS.GOODWILL", label: "Goodwill", statement: "BS", kind: "source", format: "currency", indent: 1, section: "Non-current Assets", sopRef: "§7.6" },
  { tag: "BS.INTANGIBLES", label: "Intangible Assets, net", statement: "BS", kind: "source", format: "currency", indent: 1, section: "Non-current Assets", sopRef: "§7.6" },
  { tag: "BS.TOTAL_ASSETS", label: "Total Assets", statement: "BS", kind: "calculated", format: "currency", indent: 0, section: "Non-current Assets", op: "sum", dependsOn: ["BS.TOTAL_CURRENT_ASSETS", "BS.PPE_NET", "BS.GOODWILL", "BS.INTANGIBLES"], formula: "Total Current Assets + PP&E + Goodwill + Intangibles", sopRef: "§7.7" },

  { tag: "BS.AP", label: "Accounts Payable", statement: "BS", kind: "source", format: "currency", indent: 1, section: "Current Liabilities", sopRef: "§8.1" },
  { tag: "BS.ACCRUED", label: "Accrued Liabilities", statement: "BS", kind: "source", format: "currency", indent: 1, section: "Current Liabilities", sopRef: "§8.1" },
  { tag: "BS.CURRENT_LTD", label: "Current Portion of Long-term Debt", statement: "BS", kind: "source", format: "currency", indent: 1, section: "Current Liabilities", sopRef: "§8.2" },
  { tag: "BS.TOTAL_CURRENT_LIABILITIES", label: "Total Current Liabilities", statement: "BS", kind: "calculated", format: "currency", indent: 0, section: "Current Liabilities", op: "sum", dependsOn: ["BS.AP", "BS.ACCRUED", "BS.CURRENT_LTD"], formula: "AP + Accrued + Current LTD", sopRef: "§8.3" },
  { tag: "BS.LTD", label: "Long-term Debt", statement: "BS", kind: "source", format: "currency", indent: 1, section: "Non-current Liabilities", sopRef: "§8.2" },
  { tag: "BS.TOTAL_LIABILITIES", label: "Total Liabilities", statement: "BS", kind: "calculated", format: "currency", indent: 0, section: "Non-current Liabilities", op: "sum", dependsOn: ["BS.TOTAL_CURRENT_LIABILITIES", "BS.LTD"], formula: "Total Current Liabilities + Long-term Debt", sopRef: "§8.4" },
  { tag: "BS.TOTAL_DEBT", label: "Total Interest-bearing Debt", statement: "BS", kind: "calculated", format: "currency", indent: 0, section: "Non-current Liabilities", op: "sum", dependsOn: ["BS.CURRENT_LTD", "BS.LTD"], formula: "Current LTD + Long-term Debt", sopRef: "§8.5" },

  { tag: "BS.COMMON_STOCK", label: "Common Stock & APIC", statement: "BS", kind: "source", format: "currency", indent: 1, section: "Equity", sopRef: "§8.6" },
  { tag: "BS.RETAINED_EARNINGS", label: "Retained Earnings", statement: "BS", kind: "source", format: "currency", indent: 1, section: "Equity", sopRef: "§8.6" },
  { tag: "BS.TOTAL_EQUITY", label: "Total Shareholders' Equity", statement: "BS", kind: "calculated", format: "currency", indent: 0, section: "Equity", op: "sum", dependsOn: ["BS.COMMON_STOCK", "BS.RETAINED_EARNINGS"], formula: "Common Stock + Retained Earnings", sopRef: "§8.7" },
  { tag: "BS.TOTAL_LIAB_EQUITY", label: "Total Liabilities & Equity", statement: "BS", kind: "calculated", format: "currency", indent: 0, section: "Equity", op: "sum", dependsOn: ["BS.TOTAL_LIABILITIES", "BS.TOTAL_EQUITY"], formula: "Total Liabilities + Total Equity", sopRef: "§8.8" },
];

// ─── Cash Flow ────────────────────────────────────────────────────────────────
const CASH_FLOW: TaxonomyNode[] = [
  { tag: "CF.NET_INCOME", label: "Net Income", statement: "CF", kind: "source", format: "currency", indent: 1, section: "Operating Activities", sopRef: "§9.1" },
  { tag: "CF.DA", label: "Depreciation & Amortization", statement: "CF", kind: "source", format: "currency", indent: 1, section: "Operating Activities", sopRef: "§9.1" },
  { tag: "CF.CHANGE_WC", label: "Change in Working Capital", statement: "CF", kind: "source", format: "currency", indent: 1, section: "Operating Activities", sopRef: "§9.2" },
  { tag: "CF.CFO", label: "Cash from Operations", statement: "CF", kind: "calculated", format: "currency", indent: 0, section: "Operating Activities", op: "sum", dependsOn: ["CF.NET_INCOME", "CF.DA", "CF.CHANGE_WC"], formula: "Net Income + D&A + Δ Working Capital", sopRef: "§9.3" },
  { tag: "CF.CAPEX", label: "Capital Expenditures", statement: "CF", kind: "source", format: "currency", indent: 1, section: "Investing Activities", sopRef: "§9.4" },
  { tag: "CF.CFI", label: "Cash from Investing", statement: "CF", kind: "calculated", format: "currency", indent: 0, section: "Investing Activities", op: "sum", dependsOn: ["CF.CAPEX"], formula: "Capital Expenditures", sopRef: "§9.5" },
  { tag: "CF.DEBT_NET", label: "Net Debt Draws / (Repayments)", statement: "CF", kind: "source", format: "currency", indent: 1, section: "Financing Activities", sopRef: "§9.6" },
  { tag: "CF.DIVIDENDS", label: "Dividends Paid", statement: "CF", kind: "source", format: "currency", indent: 1, section: "Financing Activities", sopRef: "§9.6" },
  { tag: "CF.CFF", label: "Cash from Financing", statement: "CF", kind: "calculated", format: "currency", indent: 0, section: "Financing Activities", op: "sum", dependsOn: ["CF.DEBT_NET", "CF.DIVIDENDS"], formula: "Net Debt + Dividends Paid", sopRef: "§9.7" },
  { tag: "CF.NET_CHANGE", label: "Net Change in Cash", statement: "CF", kind: "calculated", format: "currency", indent: 0, section: "Reconciliation", op: "sum", dependsOn: ["CF.CFO", "CF.CFI", "CF.CFF"], formula: "CFO + CFI + CFF", sopRef: "§9.8" },
  { tag: "CF.BEGIN_CASH", label: "Beginning Cash Balance", statement: "CF", kind: "source", format: "currency", indent: 1, section: "Reconciliation", sopRef: "§9.8" },
  { tag: "CF.END_CASH", label: "Ending Cash Balance", statement: "CF", kind: "calculated", format: "currency", indent: 0, section: "Reconciliation", op: "sum", dependsOn: ["CF.BEGIN_CASH", "CF.NET_CHANGE"], formula: "Beginning Cash + Net Change in Cash", sopRef: "§9.9" },
];

// ─── Ratios (all calculated; the analytical layer) ────────────────────────────
const RATIOS: TaxonomyNode[] = [
  { tag: "BS.QUICK_ASSETS", label: "Quick Assets", statement: "RATIO", kind: "calculated", format: "currency", op: "subtract", dependsOn: ["BS.TOTAL_CURRENT_ASSETS", "BS.INVENTORY"], formula: "Total Current Assets − Inventory", sopRef: "§10.1" },
  { tag: "IS.DEBT_SERVICE", label: "Annual Debt Service", statement: "RATIO", kind: "calculated", format: "currency", op: "sum", dependsOn: ["IS.INTEREST", "BS.CURRENT_LTD"], formula: "Interest Expense + Current Portion of LTD", sopRef: "§10.2" },
  { tag: "RATIO.CURRENT", label: "Current Ratio", statement: "RATIO", kind: "calculated", format: "ratio", op: "divide", dependsOn: ["BS.TOTAL_CURRENT_ASSETS", "BS.TOTAL_CURRENT_LIABILITIES"], formula: "Total Current Assets / Total Current Liabilities", sopRef: "§10.3" },
  { tag: "RATIO.QUICK", label: "Quick Ratio", statement: "RATIO", kind: "calculated", format: "ratio", op: "divide", dependsOn: ["BS.QUICK_ASSETS", "BS.TOTAL_CURRENT_LIABILITIES"], formula: "Quick Assets / Total Current Liabilities", sopRef: "§10.3" },
  { tag: "RATIO.DE", label: "Debt / Equity", statement: "RATIO", kind: "calculated", format: "ratio", op: "divide", dependsOn: ["BS.TOTAL_DEBT", "BS.TOTAL_EQUITY"], formula: "Total Interest-bearing Debt / Total Equity", sopRef: "§10.4" },
  { tag: "RATIO.INTEREST_COVERAGE", label: "Interest Coverage", statement: "RATIO", kind: "calculated", format: "ratio", op: "divide", dependsOn: ["IS.EBIT", "IS.INTEREST"], formula: "EBIT / Interest Expense", sopRef: "§10.5" },
  { tag: "RATIO.DSCR", label: "Debt Service Coverage (DSCR)", statement: "RATIO", kind: "calculated", format: "ratio", op: "divide", dependsOn: ["IS.EBITDA", "IS.DEBT_SERVICE"], formula: "EBITDA / Annual Debt Service", sopRef: "§10.6" },
  { tag: "RATIO.NET_MARGIN", label: "Net Profit Margin", statement: "RATIO", kind: "calculated", format: "percent", op: "divide", dependsOn: ["IS.NET_INCOME", "IS.REVENUE"], formula: "Net Income / Net Revenue", sopRef: "§10.7" },
];

export const TAXONOMY: TaxonomyNode[] = [
  ...INCOME_STATEMENT,
  ...BALANCE_SHEET,
  ...CASH_FLOW,
  ...RATIOS,
];

export const TAXONOMY_BY_TAG: Record<string, TaxonomyNode> = Object.fromEntries(
  TAXONOMY.map((n) => [n.tag, n]),
);

export function getNode(tag: string): TaxonomyNode | undefined {
  return TAXONOMY_BY_TAG[tag];
}

/** Source leaves the platform expects to extract, in document order per statement. */
export function sourceTagsFor(statement: StatementKind): string[] {
  return TAXONOMY.filter((n) => n.statement === statement && n.kind === "source").map((n) => n.tag);
}

/** All nodes (source + calculated) printed on a given statement page, in order. */
export function nodesFor(statement: StatementKind): TaxonomyNode[] {
  return TAXONOMY.filter((n) => n.statement === statement);
}
