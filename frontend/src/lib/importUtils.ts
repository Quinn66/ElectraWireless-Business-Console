import * as XLSX from "xlsx";
import Papa from "papaparse";

// ── Types ─────────────────────────────────────────────────────────────────────

export type DataStandard = "standard-csv" | "pl-statement" | "superstore" | "custom";
export type WizardStep = "standard" | "upload" | "confirm";

export interface ParsedData {
  headers: string[];
  rows: (string | number | null)[][];
}

export interface ExtractedValues {
  startingMRR?: number;
  growthRate?: number;
  cogsPercent?: number;
  marketingSpend?: number;
  payroll?: number;
}

export interface ColumnMapping {
  date: string;
  revenue: string;
  cogs: string;
  marketing: string;
  payroll: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

export const STANDARDS: { id: DataStandard; title: string; description: string; hint: string }[] = [
  {
    id: "standard-csv",
    title: "Standard CSV",
    description: "Two-column format: date and revenue",
    hint: "e.g. 2024-01, 18000",
  },
  {
    id: "pl-statement",
    title: "P&L Statement",
    description: "JP Morgan-style: rows = line items, columns = months",
    hint: "Revenue, COGS, Marketing, Payroll rows",
  },
  {
    id: "superstore",
    title: "Superstore / Retail",
    description: "Order Date, Sales, Profit columns",
    hint: "Aggregated by month automatically",
  },
  {
    id: "custom",
    title: "Custom",
    description: "Map your own column names manually",
    hint: "Full control over column mapping",
  },
];

export const SLIDER_RANGES = {
  startingMRR:    { min: 1000,  max: 100000, step: 1000 },
  growthRate:     { min: 0,     max: 30,     step: 1    },
  cogsPercent:    { min: 5,     max: 60,     step: 1    },
  marketingSpend: { min: 500,   max: 30000,  step: 500  },
  payroll:        { min: 5000,  max: 150000, step: 5000 },
};

export const FIELD_LABELS: Record<keyof ExtractedValues, string> = {
  startingMRR:    "Starting MRR",
  growthRate:     "Growth Rate",
  cogsPercent:    "COGS %",
  marketingSpend: "Marketing Spend",
  payroll:        "Payroll",
};

export const ORDERED_FIELDS = [
  "startingMRR",
  "growthRate",
  "cogsPercent",
  "marketingSpend",
  "payroll",
] as const;

// ── Utilities ─────────────────────────────────────────────────────────────────

export function clamp(min: number, max: number, v: number): number {
  return Math.max(min, Math.min(max, v));
}

export function parseFile(file: File): Promise<ParsedData> {
  return new Promise((resolve, reject) => {
    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "csv") {
      Papa.parse(file, {
        header: false,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          const raw = results.data as (string | number | null)[][];
          if (raw.length < 2) { reject(new Error("File appears empty or has only one row.")); return; }
          const headers = raw[0].map((h) => String(h ?? "").trim());
          resolve({ headers, rows: raw.slice(1) });
        },
        error: (err: Error) => reject(err),
      });
    } else if (ext === "xlsx" || ext === "xls") {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(e.target!.result as string, { type: "binary" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const raw = XLSX.utils.sheet_to_json<(string | number | null)[]>(ws, { header: 1 });
          if (raw.length < 2) { reject(new Error("Spreadsheet appears empty.")); return; }
          const headers = raw[0].map((h) => String(h ?? "").trim());
          resolve({ headers, rows: raw.slice(1) as (string | number | null)[][] });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error("Failed to read file."));
      reader.readAsBinaryString(file);
    } else {
      reject(new Error("Unsupported file type. Please upload a .csv or .xlsx file."));
    }
  });
}

export function toNum(v: string | number | null): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/[$,%\s]/g, ""));
  return isNaN(n) ? null : n;
}

export function avgGrowthRate(values: number[]): number | null {
  if (values.length < 2) return null;
  const rates: number[] = [];
  for (let i = 1; i < values.length; i++) {
    if (values[i - 1] > 0) {
      rates.push(((values[i] - values[i - 1]) / values[i - 1]) * 100);
    }
  }
  if (rates.length === 0) return null;
  return rates.reduce((s, r) => s + r, 0) / rates.length;
}

// ── Extraction by standard ────────────────────────────────────────────────────

export function extractStandardCSV(data: ParsedData): ExtractedValues {
  const hi = (patterns: RegExp[]) =>
    data.headers.findIndex((h) => patterns.some((p) => p.test(h)));

  const revIdx = hi([/revenue/i, /\bsales\b/i, /\bmrr\b/i, /\barr\b/i, /income/i, /amount/i]);
  if (revIdx < 0) return {};

  const revenues = data.rows
    .map((r) => toNum(r[revIdx]))
    .filter((v): v is number => v !== null && v > 0);

  if (revenues.length === 0) return {};

  const gr = avgGrowthRate(revenues);
  return {
    startingMRR: revenues[0],
    ...(gr !== null ? { growthRate: clamp(0, 30, Math.round(gr)) } : {}),
  };
}

export function extractPLStatement(data: ParsedData): ExtractedValues {
  const findRow = (patterns: RegExp[]) =>
    data.rows.find((r) => patterns.some((p) => p.test(String(r[0] ?? ""))));

  const monthValues = (row: (string | number | null)[]) =>
    row.slice(1).map(toNum).filter((v): v is number => v !== null);

  const revenueRow = findRow([/revenue/i, /\bsales\b/i, /total revenue/i, /\bincome\b/i]);
  const cogsRow    = findRow([/cogs/i, /cost of goods/i, /cost of sales/i]);
  const mktRow     = findRow([/marketing/i, /advertising/i, /\bads\b/i]);
  const payRow     = findRow([/payroll/i, /salary/i, /salaries/i, /wages/i, /\bstaff\b/i]);

  const result: ExtractedValues = {};

  if (revenueRow) {
    const revs = monthValues(revenueRow);
    if (revs.length > 0) {
      result.startingMRR = revs[0];
      const gr = avgGrowthRate(revs);
      if (gr !== null) result.growthRate = clamp(0, 30, Math.round(gr));

      if (cogsRow) {
        const cogs = monthValues(cogsRow);
        const pcts = revs
          .map((r, i) => (r > 0 && cogs[i] != null ? (cogs[i] / r) * 100 : null))
          .filter((v): v is number => v !== null);
        if (pcts.length > 0) {
          result.cogsPercent = clamp(5, 60, Math.round(pcts.reduce((s, v) => s + v, 0) / pcts.length));
        }
      }
    }
  }

  if (mktRow) {
    const vals = monthValues(mktRow);
    if (vals.length > 0) {
      result.marketingSpend = clamp(500, 30000, Math.round(vals.reduce((s, v) => s + v, 0) / vals.length / 500) * 500);
    }
  }

  if (payRow) {
    const vals = monthValues(payRow);
    if (vals.length > 0) {
      result.payroll = clamp(5000, 150000, Math.round(vals.reduce((s, v) => s + v, 0) / vals.length / 5000) * 5000);
    }
  }

  return result;
}

export function extractSuperstore(data: ParsedData): ExtractedValues {
  const hi = (patterns: RegExp[]) =>
    data.headers.findIndex((h) => patterns.some((p) => p.test(h)));

  const dateIdx  = hi([/order.?date/i, /\bdate\b/i, /\bmonth\b/i, /\bperiod\b/i]);
  const salesIdx = hi([/\bsales\b/i, /revenue/i, /amount/i]);
  if (dateIdx < 0 || salesIdx < 0) return {};

  const byMonth: Record<string, number> = {};
  data.rows.forEach((row) => {
    const raw = String(row[dateIdx] ?? "");
    const d = new Date(raw);
    if (isNaN(d.getTime())) return;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const sale = toNum(row[salesIdx]);
    if (sale !== null) byMonth[key] = (byMonth[key] ?? 0) + sale;
  });

  const revenues = Object.keys(byMonth).sort().map((k) => byMonth[k]);
  if (revenues.length === 0) return {};

  const gr = avgGrowthRate(revenues);
  return {
    startingMRR: revenues[0],
    ...(gr !== null ? { growthRate: clamp(0, 30, Math.round(gr)) } : {}),
  };
}

export function extractCustom(data: ParsedData, mapping: ColumnMapping): ExtractedValues {
  const colIdx = (name: string) => data.headers.indexOf(name);
  const getColValues = (name: string): number[] => {
    if (!name) return [];
    const idx = colIdx(name);
    if (idx < 0) return [];
    return data.rows.map((r) => toNum(r[idx])).filter((v): v is number => v !== null && v >= 0);
  };

  const revVals  = getColValues(mapping.revenue);
  const cogsVals = getColValues(mapping.cogs);
  const mktVals  = getColValues(mapping.marketing);
  const payVals  = getColValues(mapping.payroll);

  const result: ExtractedValues = {};

  if (revVals.length > 0) {
    result.startingMRR = clamp(1000, 100000, revVals[0]);
    const gr = avgGrowthRate(revVals);
    if (gr !== null) result.growthRate = clamp(0, 30, Math.round(gr));
  }

  if (cogsVals.length > 0 && revVals.length > 0) {
    const pcts = revVals
      .map((r, i) => (r > 0 && cogsVals[i] != null ? (cogsVals[i] / r) * 100 : null))
      .filter((v): v is number => v !== null);
    if (pcts.length > 0) {
      result.cogsPercent = clamp(5, 60, Math.round(pcts.reduce((s, v) => s + v, 0) / pcts.length));
    }
  }

  if (mktVals.length > 0) {
    result.marketingSpend = clamp(500, 30000, Math.round(mktVals.reduce((s, v) => s + v, 0) / mktVals.length / 500) * 500);
  }

  if (payVals.length > 0) {
    result.payroll = clamp(5000, 150000, Math.round(payVals.reduce((s, v) => s + v, 0) / payVals.length / 5000) * 5000);
  }

  return result;
}

export function fmtImportValue(key: keyof ExtractedValues, v: number): string {
  if (key === "startingMRR" || key === "marketingSpend" || key === "payroll") {
    return `$${v.toLocaleString("en-US")}`;
  }
  return `${v}%`;
}
