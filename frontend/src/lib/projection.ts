export interface ProjectionInputs {
  growthRate: number;
  startingMRR: number;
  churnRate: number;
  cogsPercent: number;
  marketingSpend: number;
  payroll: number;
  forecastMonths: number;
}

export interface MonthRow {
  month: number;
  revenue: number;
  expenses: number;
  grossMargin: number;
  netProfit: number;
}

export function calcMonthlyData(inputs: ProjectionInputs): MonthRow[] {
  const {
    growthRate,
    startingMRR,
    churnRate,
    cogsPercent,
    marketingSpend,
    payroll,
    forecastMonths,
  } = inputs;

  const rows: MonthRow[] = [];
  let prevMRR = startingMRR;

  for (let i = 1; i <= forecastMonths; i++) {
    const mrr = prevMRR * (1 + growthRate / 100) * (1 - churnRate / 100);
    const revenue = mrr;
    const cogs = revenue * (cogsPercent / 100);
    const expenses = cogs + marketingSpend + payroll;
    const grossMargin = revenue > 0 ? ((revenue - cogs) / revenue) * 100 : 0;
    const netProfit = revenue - expenses;

    rows.push({ month: i, revenue, expenses, grossMargin, netProfit });
    prevMRR = mrr;
  }

  return rows;
}

export function calcBreakeven(inputs: ProjectionInputs): number | null {
  const rows = calcMonthlyData(inputs);
  const found = rows.find((r) => r.netProfit >= 0);
  return found ? found.month : null;
}

const MONTHS_PER_YEAR = 12;

export function calcARR(inputs: ProjectionInputs): number {
  const rows = calcMonthlyData(inputs);
  if (rows.length === 0) return 0;
  return rows[rows.length - 1].revenue * MONTHS_PER_YEAR;
}

/**
 * Formats a dollar value with full precision and comma separators.
 * Uses a unicode minus for negative values. e.g. −$12,345
 * Use this for tables where exact figures matter; use formatCurrency for axis labels.
 */
export function formatDollar(v: number): string {
  const abs = Math.abs(Math.round(v));
  const sign = v < 0 ? "−" : "";
  return `${sign}$${abs.toLocaleString("en-US")}`;
}

export function formatCurrency(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) {
    return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  }
  if (abs >= 1_000) {
    return `${sign}$${Math.round(abs / 1_000)}k`;
  }
  return `${sign}$${Math.round(abs)}`;
}
