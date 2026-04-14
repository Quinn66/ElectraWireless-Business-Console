/**
 * Feature 2 — Personal Financial Intelligence API service.
 *
 * All functions are structured to accept the same arguments they will when
 * the real backend is connected. To swap from mock → real, replace the
 * function bodies — the call sites don't change.
 */

import axios from "axios";
import type { Transaction } from "@/store/personalFinanceStore";
import { autoCategory, inferType } from "@/lib/categories";
import type { ParsedData } from "@/lib/importUtils";

const BASE_URL = (import.meta as Record<string, unknown> & { env: Record<string, string> }).env.VITE_API_URL ?? "http://localhost:8000";

export const pfApi = axios.create({ baseURL: BASE_URL });

// ── Mock data ─────────────────────────────────────────────────────────────────

export const MOCK_TRANSACTIONS: Transaction[] = [
  // January 2024
  { id: "m1",  date: "2024-01-05", description: "Woolworths",         amount: -145.50, type: "expense", category: "Groceries",     source: "csv" },
  { id: "m2",  date: "2024-01-08", description: "Shell Petrol",       amount: -82.00,  type: "expense", category: "Transport",     source: "csv" },
  { id: "m3",  date: "2024-01-10", description: "Netflix",            amount: -22.99,  type: "expense", category: "Subscriptions", source: "csv" },
  { id: "m4",  date: "2024-01-15", description: "Salary Direct Dep",  amount: 4200.00, type: "income",  category: "Income",        source: "csv" },
  { id: "m5",  date: "2024-01-18", description: "Rent Payment",       amount: -1800.00,type: "expense", category: "Housing",       source: "csv" },
  { id: "m6",  date: "2024-01-20", description: "Uber Eats",          amount: -38.50,  type: "expense", category: "Dining",        source: "csv" },
  { id: "m7",  date: "2024-01-22", description: "Electricity Bill",   amount: -180.00, type: "expense", category: "Utilities",     source: "csv" },
  { id: "m8",  date: "2024-01-25", description: "Spotify",            amount: -12.99,  type: "expense", category: "Subscriptions", source: "csv" },
  { id: "m9",  date: "2024-01-28", description: "Chemist Warehouse",  amount: -45.00,  type: "expense", category: "Health",        source: "csv" },
  // February 2024
  { id: "m10", date: "2024-02-02", description: "Coles",              amount: -162.30, type: "expense", category: "Groceries",     source: "csv" },
  { id: "m11", date: "2024-02-05", description: "Uber",               amount: -24.00,  type: "expense", category: "Transport",     source: "csv" },
  { id: "m12", date: "2024-02-10", description: "Amazon Prime",       amount: -9.99,   type: "expense", category: "Subscriptions", source: "csv" },
  { id: "m13", date: "2024-02-15", description: "Salary Direct Dep",  amount: 4200.00, type: "income",  category: "Income",        source: "csv" },
  { id: "m14", date: "2024-02-18", description: "Rent Payment",       amount: -1800.00,type: "expense", category: "Housing",       source: "csv" },
  { id: "m15", date: "2024-02-20", description: "McDonald's",         amount: -18.50,  type: "expense", category: "Dining",        source: "csv" },
  { id: "m16", date: "2024-02-22", description: "Internet Bill",      amount: -89.00,  type: "expense", category: "Utilities",     source: "csv" },
  { id: "m17", date: "2024-02-28", description: "JB Hi-Fi",           amount: -349.00, type: "expense", category: "Shopping",      source: "csv" },
  // March 2024
  { id: "m18", date: "2024-03-01", description: "Woolworths",         amount: -138.20, type: "expense", category: "Groceries",     source: "csv" },
  { id: "m19", date: "2024-03-05", description: "Shell Petrol",       amount: -90.00,  type: "expense", category: "Transport",     source: "csv" },
  { id: "m20", date: "2024-03-10", description: "Netflix",            amount: -22.99,  type: "expense", category: "Subscriptions", source: "csv" },
  { id: "m21", date: "2024-03-15", description: "Salary Direct Dep",  amount: 4200.00, type: "income",  category: "Income",        source: "csv" },
  { id: "m22", date: "2024-03-18", description: "Rent Payment",       amount: -1800.00,type: "expense", category: "Housing",       source: "csv" },
  { id: "m23", date: "2024-03-20", description: "Cafe Dining",        amount: -55.00,  type: "expense", category: "Dining",        source: "csv" },
  { id: "m24", date: "2024-03-22", description: "AGL Electricity",    amount: -195.00, type: "expense", category: "Utilities",     source: "csv" },
  { id: "m25", date: "2024-03-25", description: "David Jones",        amount: -280.00, type: "expense", category: "Shopping",      source: "csv" },
  { id: "m26", date: "2024-03-28", description: "Event Cinema",       amount: -42.00,  type: "expense", category: "Entertainment", source: "csv" },
];

// ── CSV parsing ───────────────────────────────────────────────────────────────

/** Heuristic: find column index whose header matches a pattern */
function findCol(headers: string[], patterns: RegExp[]): number {
  for (const p of patterns) {
    const i = headers.findIndex((h) => p.test(h));
    if (i !== -1) return i;
  }
  return -1;
}

/**
 * Parse a spreadsheet (already loaded via importUtils.parseFile) into
 * Transaction objects with auto-assigned categories.
 *
 * Handles two common bank statement layouts:
 *   Layout A: Date | Description | Amount (signed, negative = debit)
 *   Layout B: Date | Description | Debit | Credit
 */
export function parseBankStatement(data: ParsedData): Transaction[] {
  const h = data.headers.map((s) => s.toLowerCase().trim());

  const dateIdx = findCol(h, [/^date$/, /date/, /posted/, /trans/]);
  const descIdx = findCol(h, [/^description$/, /desc/, /merchant/, /payee/, /detail/, /memo/]);

  // Layout A: single signed amount column
  const amtIdx  = findCol(h, [/^amount$/, /^amt$/, /total/, /^sum$/]);
  // Layout B: separate debit/credit
  const debitIdx  = findCol(h, [/debit/, /withdrawal/, /payment/]);
  const creditIdx = findCol(h, [/credit/, /deposit/]);

  const toNum = (v: string | number | null): number => {
    if (v == null || v === "") return 0;
    const n = typeof v === "number" ? v : parseFloat(String(v).replace(/[$,\s]/g, ""));
    return isNaN(n) ? 0 : n;
  };

  const toDate = (v: string | number | null): string => {
    if (!v) return new Date().toISOString().slice(0, 10);
    // Excel serial date
    if (typeof v === "number" && v > 40000) {
      const d = new Date((v - 25569) * 86400 * 1000);
      return d.toISOString().slice(0, 10);
    }
    const d = new Date(String(v));
    return isNaN(d.getTime()) ? String(v) : d.toISOString().slice(0, 10);
  };

  return data.rows
    .filter((row) => row.some((c) => c !== null && c !== ""))
    .map((row, i) => {
      const description = descIdx >= 0 ? String(row[descIdx] ?? "") : `Transaction ${i + 1}`;
      const date = dateIdx >= 0 ? toDate(row[dateIdx]) : new Date().toISOString().slice(0, 10);

      let amount = 0;
      if (amtIdx >= 0) {
        amount = toNum(row[amtIdx]);
      } else if (debitIdx >= 0 || creditIdx >= 0) {
        const debit  = debitIdx  >= 0 ? toNum(row[debitIdx])  : 0;
        const credit = creditIdx >= 0 ? toNum(row[creditIdx]) : 0;
        // Credits are positive (money in), debits are negative (money out)
        amount = credit - Math.abs(debit);
      }

      const category = autoCategory(description);
      const type = inferType(category, amount);

      return {
        id: `csv-${Date.now()}-${i}`,
        date,
        description: description.trim(),
        amount,
        type,
        category,
        source: "csv" as const,
      };
    });
}

// ── API functions (mock implementations — swap bodies for real fetch) ─────────

export interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  netCashFlow: number;
  savingsRate: number;
  healthScore: number;
  healthGrade: string;
  monthlyBreakdown: Array<{
    month: string;
    income: number;
    expenses: number;
    net: number;
    runningBalance: number;
  }>;
  categoryTotals: Record<string, number>;
  incomeSources: Record<string, number>;
}

export interface PFInsight {
  id: string;
  type: "overspending" | "risk" | "opportunity";
  severity: "danger" | "warning" | "info";
  title: string;
  message: string;
}

/** Compute summary client-side from transactions (mock — replace with POST /personal-finance/transactions) */
export async function fetchSummary(transactions: Transaction[]): Promise<FinancialSummary> {
  // Group by month
  const byMonth: Record<string, { income: number; expenses: number }> = {};
  const catTotals: Record<string, number> = {};
  const incomeSources: Record<string, number> = {};

  for (const tx of transactions) {
    const month = tx.date.slice(0, 7); // yyyy-mm
    byMonth[month] ??= { income: 0, expenses: 0 };
    if (tx.amount > 0) {
      byMonth[month].income += tx.amount;
      incomeSources[tx.category] = (incomeSources[tx.category] ?? 0) + tx.amount;
    } else {
      byMonth[month].expenses += Math.abs(tx.amount);
      catTotals[tx.category] = (catTotals[tx.category] ?? 0) + Math.abs(tx.amount);
    }
  }

  const totalIncome   = transactions.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const netCashFlow   = totalIncome - totalExpenses;
  const savingsRate   = totalIncome > 0 ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 100) : 0;
  const healthScore   = computeHealthScore(savingsRate, totalExpenses, totalIncome);
  const healthGrade   = scoreToGrade(healthScore);

  let runningBalance = 0;
  const monthlyBreakdown = Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, { income, expenses }]) => {
      const net = income - expenses;
      runningBalance += net;
      return { month, income, expenses, net, runningBalance };
    });

  return { totalIncome, totalExpenses, netCashFlow, savingsRate, healthScore, healthGrade, monthlyBreakdown, categoryTotals: catTotals, incomeSources };
}

/** Compute rule-based insights (mock — replace with POST /personal-finance/insights) */
export async function fetchInsights(
  transactions: Transaction[],
  budgets: Record<string, number>
): Promise<PFInsight[]> {
  const insights: PFInsight[] = [];

  // Group current month spend by category
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthStr = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}`;

  const spendThisMonth: Record<string, number> = {};
  const spendLastMonth: Record<string, number> = {};
  let incomeThisMonth = 0;
  let expensesThisMonth = 0;

  for (const tx of transactions) {
    const m = tx.date.slice(0, 7);
    if (m === currentMonth) {
      if (tx.amount > 0) incomeThisMonth += tx.amount;
      else {
        expensesThisMonth += Math.abs(tx.amount);
        spendThisMonth[tx.category] = (spendThisMonth[tx.category] ?? 0) + Math.abs(tx.amount);
      }
    }
    if (m === prevMonthStr && tx.amount < 0) {
      spendLastMonth[tx.category] = (spendLastMonth[tx.category] ?? 0) + Math.abs(tx.amount);
    }
  }

  // Use most recent month if no current-month data (demo with past mock data)
  const latestMonth = [...new Set(transactions.map((t) => t.date.slice(0, 7)))].sort().at(-1) ?? "";
  const prevOfLatest = latestMonth
    ? `${new Date(latestMonth + "-01").getFullYear()}-${String(new Date(latestMonth + "-01").getMonth()).padStart(2, "0")}`
    : "";

  const effectiveSpend  = Object.keys(spendThisMonth).length ? spendThisMonth  : groupByMonthCat(transactions, latestMonth);
  const effectivePrev   = Object.keys(spendLastMonth).length ? spendLastMonth  : groupByMonthCat(transactions, prevOfLatest);
  const effectiveIncome = incomeThisMonth || transactions.filter((t) => t.date.startsWith(latestMonth) && t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const effectiveExp    = expensesThisMonth || Object.values(effectiveSpend).reduce((a, b) => a + b, 0);

  // Rule 1: overspending vs budget
  for (const [cat, limit] of Object.entries(budgets)) {
    const spent = effectiveSpend[cat] ?? 0;
    if (spent > limit) {
      insights.push({
        id: `over-${cat}`,
        type: "overspending",
        severity: "danger",
        title: `Overspending — ${cat}`,
        message: `You've spent $${spent.toFixed(0)} on ${cat} this month, exceeding your $${limit} budget by $${(spent - limit).toFixed(0)}.`,
      });
    }
  }

  // Rule 2: total expenses > total income (risk zone)
  if (effectiveIncome > 0 && effectiveExp > effectiveIncome) {
    insights.push({
      id: "risk-zone",
      type: "risk",
      severity: "danger",
      title: "Risk Zone — Expenses Exceed Income",
      message: `Total expenses ($${effectiveExp.toFixed(0)}) exceeded income ($${effectiveIncome.toFixed(0)}) this month. You're drawing down savings.`,
    });
  }

  // Rule 3: category spike vs prior month (>30% increase)
  for (const [cat, thisAmt] of Object.entries(effectiveSpend)) {
    const prevAmt = effectivePrev[cat] ?? 0;
    if (prevAmt > 0 && thisAmt / prevAmt > 1.3) {
      insights.push({
        id: `spike-${cat}`,
        type: "opportunity",
        severity: "warning",
        title: `Spending Spike — ${cat}`,
        message: `${cat} spending is up ${Math.round(((thisAmt - prevAmt) / prevAmt) * 100)}% vs last month ($${prevAmt.toFixed(0)} → $${thisAmt.toFixed(0)}).`,
      });
    }
  }

  // Sort: danger first
  return insights.sort((a, b) => (a.severity === "danger" ? -1 : b.severity === "danger" ? 1 : 0));
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function groupByMonthCat(transactions: Transaction[], month: string): Record<string, number> {
  const result: Record<string, number> = {};
  for (const tx of transactions) {
    if (tx.date.startsWith(month) && tx.amount < 0) {
      result[tx.category] = (result[tx.category] ?? 0) + Math.abs(tx.amount);
    }
  }
  return result;
}

function computeHealthScore(savingsRate: number, expenses: number, income: number): number {
  const savingsScore  = Math.min(30, (savingsRate / 20) * 30);
  const spendingRatio = income > 0 ? expenses / income : 1;
  const spendingScore = Math.max(0, 30 - (spendingRatio - 0.7) / 0.25 * 30);
  const stabilityScore = 20; // static for now without enough months
  const total = Math.round(savingsScore + spendingScore + stabilityScore);
  return Math.max(0, Math.min(100, total));
}

function scoreToGrade(score: number): string {
  if (score >= 80) return "A";
  if (score >= 65) return "B";
  if (score >= 50) return "C";
  if (score >= 35) return "D";
  return "F";
}
