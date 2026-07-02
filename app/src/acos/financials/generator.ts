/**
 * Parametric 3-statement generator.
 *
 * Given compact, human-readable business assumptions per fiscal year, produces
 * a full internally-consistent TRUE_VALUES set (all taxonomy source leaves,
 * 4 periods) — Balance Sheet balances and Cash Flow ties to cash *by
 * construction*, not by hand-balancing. Cash is always the plug, solved from
 * the indirect-method cash flow statement; Goodwill and Intangibles are held
 * constant (no unmodeled amortization) so the balance identity holds exactly.
 *
 * This is how the two new borrower datasets (AutoWest Motors, Coastal Hyundai)
 * and the migrated Walmart dataset are produced — verified with the same
 * integrity engine used at runtime, not eyeballed.
 */
import type { Period } from "./dataset";
import { PERIODS } from "./dataset";

export type YearAssumptions = {
  revenue: number; // $K, this period
  grossMarginPct: number; // 0..1
  sgaPct: number; // % of revenue
  daPct: number; // % of revenue (run-rate D&A)
  interestRate: number; // applied to period-end total debt
  taxRate: number; // 0..1, applied only if pretax > 0
  arPctOfRevenue: number;
  inventoryPctOfCogs: number;
  prepaidPctOfRevenue: number;
  apPctOfCogs: number;
  accruedPctOfRevenue: number;
  capexPctOfRevenue: number; // gross capex spend
  currentLtd: number; // $K, period-end balance
  ltd: number; // $K, period-end balance
  dividendPayoutPct: number; // 0..1 of positive net income
};

export type CompanyAssumptions = {
  /** FY2022 opening balance sheet (seed period — not delta-derived). */
  seed: {
    cash: number;
    ppeNet: number;
    goodwill: number;
    intangibles: number;
    commonStock: number;
  };
  /** One assumption set per period, chronological (FY2022..FY2025). */
  years: Record<Period, YearAssumptions>;
};

export type GeneratedValues = Record<string, [number, number, number, number]>;

export function generateCompanyValues(a: CompanyAssumptions): GeneratedValues {
  const v: Record<string, number[]> = {};
  const push = (tag: string, i: number, val: number) => {
    if (!v[tag]) v[tag] = [0, 0, 0, 0];
    v[tag][i] = val;
  };

  let prevAr = 0, prevInv = 0, prevPrepaid = 0, prevAp = 0, prevAccrued = 0;
  let prevCurrentLtd = 0, prevLtd = 0, prevRE = 0, prevPpeNet = a.seed.ppeNet, prevCash = a.seed.cash;

  PERIODS.forEach((period, i) => {
    const y = a.years[period];

    // Income statement
    const cogs = y.revenue * (1 - y.grossMarginPct);
    const grossProfit = y.revenue - cogs;
    const sga = y.revenue * y.sgaPct;
    const da = y.revenue * y.daPct;
    const ebit = grossProfit - sga - da;
    const totalDebtEnd = y.currentLtd + y.ltd;
    const interest = totalDebtEnd * y.interestRate;
    const pretax = ebit - interest;
    const tax = pretax > 0 ? pretax * y.taxRate : 0;
    const netIncome = pretax - tax;

    push("IS.REVENUE", i, y.revenue);
    push("IS.COGS", i, cogs);
    push("IS.SGA", i, sga);
    push("IS.DA", i, da);
    push("IS.INTEREST", i, interest);
    push("IS.TAX", i, tax);

    // Balance sheet — working capital & fixed assets
    const ar = y.revenue * y.arPctOfRevenue;
    const inventory = cogs * y.inventoryPctOfCogs;
    const prepaid = y.revenue * y.prepaidPctOfRevenue;
    const ap = cogs * y.apPctOfCogs;
    const accrued = y.revenue * y.accruedPctOfRevenue;
    const capexGross = y.revenue * y.capexPctOfRevenue;
    const ppeNet = i === 0 ? a.seed.ppeNet : prevPpeNet + capexGross - da;

    push("BS.AR", i, ar);
    push("BS.INVENTORY", i, inventory);
    push("BS.PREPAID", i, prepaid);
    push("BS.AP", i, ap);
    push("BS.ACCRUED", i, accrued);
    push("BS.CURRENT_LTD", i, y.currentLtd);
    push("BS.LTD", i, y.ltd);
    push("BS.PPE_NET", i, ppeNet);
    push("BS.GOODWILL", i, a.seed.goodwill);
    push("BS.INTANGIBLES", i, a.seed.intangibles);
    push("BS.COMMON_STOCK", i, a.seed.commonStock);

    if (i === 0) {
      // Seed period: cash and retained earnings are given/plugged directly.
      const assetsExRE =
        a.seed.cash + ar + inventory + prepaid + ppeNet + a.seed.goodwill + a.seed.intangibles;
      const liabExRE = ap + accrued + y.currentLtd + y.ltd;
      const re = assetsExRE - liabExRE - a.seed.commonStock;
      push("BS.RETAINED_EARNINGS", i, re);

      const dividends = netIncome > 0 ? netIncome * y.dividendPayoutPct : 0;
      // Seed-period CF: net income & D&A are real; working-capital/capex/debt
      // deltas have no prior period, so we choose small representative flows
      // and solve BEGIN_CASH as the plug so CF ties to the given cash balance.
      const changeWc = -(0.15 * (ar + inventory + prepaid - ap - accrued)) * 0.02;
      const capexCf = -capexGross;
      const debtNet = 0;
      const dividendsCf = -dividends;
      const cfo = netIncome + da + changeWc;
      const cfi = capexCf;
      const cff = debtNet + dividendsCf;
      const netChange = cfo + cfi + cff;
      const beginCash = a.seed.cash - netChange;

      push("CF.NET_INCOME", i, netIncome);
      push("CF.DA", i, da);
      push("CF.CHANGE_WC", i, changeWc);
      push("CF.CAPEX", i, capexCf);
      push("CF.DEBT_NET", i, debtNet);
      push("CF.DIVIDENDS", i, dividendsCf);
      push("CF.BEGIN_CASH", i, beginCash);

      prevAr = ar; prevInv = inventory; prevPrepaid = prepaid; prevAp = ap; prevAccrued = accrued;
      prevCurrentLtd = y.currentLtd; prevLtd = y.ltd; prevRE = re; prevPpeNet = ppeNet; prevCash = a.seed.cash;
      return;
    }

    // Delta-derived periods (FY2023+): cash is the plug.
    const dividends = netIncome > 0 ? netIncome * y.dividendPayoutPct : 0;
    const changeWc = -((ar - prevAr) + (inventory - prevInv) + (prepaid - prevPrepaid)) + ((ap - prevAp) + (accrued - prevAccrued));
    const cfo = netIncome + da + changeWc;
    const capexCf = -capexGross;
    const cfi = capexCf;
    const debtNet = (y.currentLtd + y.ltd) - (prevCurrentLtd + prevLtd);
    const dividendsCf = -dividends;
    const cff = debtNet + dividendsCf;
    const netChange = cfo + cfi + cff;
    const beginCash = prevCash;
    const endCash = beginCash + netChange;
    const re = prevRE + netIncome - dividends;

    push("BS.RETAINED_EARNINGS", i, re);
    push("CF.NET_INCOME", i, netIncome);
    push("CF.DA", i, da);
    push("CF.CHANGE_WC", i, changeWc);
    push("CF.CAPEX", i, capexCf);
    push("CF.DEBT_NET", i, debtNet);
    push("CF.DIVIDENDS", i, dividendsCf);
    push("CF.BEGIN_CASH", i, beginCash);
    push("BS.CASH", i, endCash);

    prevAr = ar; prevInv = inventory; prevPrepaid = prepaid; prevAp = ap; prevAccrued = accrued;
    prevCurrentLtd = y.currentLtd; prevLtd = y.ltd; prevRE = re; prevPpeNet = ppeNet; prevCash = endCash;
  });

  // FY2022 cash (BS.CASH) is the seed value itself.
  v["BS.CASH"][0] = a.seed.cash;

  return v as GeneratedValues;
}
