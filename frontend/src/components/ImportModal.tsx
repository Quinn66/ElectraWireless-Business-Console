import { useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { C_SUCCESS, C_ERROR, C_WARNING, C_PRIMARY, C_BORDER } from "@/lib/colors";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { useProjectionStore } from "@/store/projectionStore";

// ── Types ─────────────────────────────────────────────────────────────────────

type DataStandard = "standard-csv" | "pl-statement" | "superstore" | "custom";
type Step = "standard" | "upload" | "confirm";

interface ParsedData {
  headers: string[];
  rows: (string | number | null)[][];
}

interface ExtractedValues {
  startingMRR?: number;
  growthRate?: number;
  cogsPercent?: number;
  marketingSpend?: number;
  payroll?: number;
}

interface ColumnMapping {
  date: string;
  revenue: string;
  cogs: string;
  marketing: string;
  payroll: string;
}

interface ImportModalProps {
  onClose: () => void;
  onImport: (applied: string[], skipped: string[]) => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STANDARDS: { id: DataStandard; title: string; description: string; hint: string }[] = [
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

const SLIDER_RANGES = {
  startingMRR:    { min: 1000,  max: 100000, step: 1000 },
  growthRate:     { min: 0,     max: 30,     step: 1    },
  cogsPercent:    { min: 5,     max: 60,     step: 1    },
  marketingSpend: { min: 500,   max: 30000,  step: 500  },
  payroll:        { min: 5000,  max: 150000, step: 5000 },
};

function clamp(min: number, max: number, v: number): number {
  return Math.max(min, Math.min(max, v));
}

// ── Parsing utilities ─────────────────────────────────────────────────────────

function parseFile(file: File): Promise<ParsedData> {
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

function toNum(v: string | number | null): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/[$,%\s]/g, ""));
  return isNaN(n) ? null : n;
}

function avgGrowthRate(values: number[]): number | null {
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

function extractStandardCSV(data: ParsedData): ExtractedValues {
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

function extractPLStatement(data: ParsedData): ExtractedValues {
  // First column is label, rest are month values
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
        const pcts = revs.map((r, i) => (r > 0 && cogs[i] != null ? (cogs[i] / r) * 100 : null))
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

function extractSuperstore(data: ParsedData): ExtractedValues {
  const hi = (patterns: RegExp[]) =>
    data.headers.findIndex((h) => patterns.some((p) => p.test(h)));

  const dateIdx  = hi([/order.?date/i, /\bdate\b/i, /\bmonth\b/i, /\bperiod\b/i]);
  const salesIdx = hi([/\bsales\b/i, /revenue/i, /amount/i]);
  if (dateIdx < 0 || salesIdx < 0) return {};

  // Group by month (YYYY-MM)
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

function extractCustom(data: ParsedData, mapping: ColumnMapping): ExtractedValues {
  const colIdx = (name: string) => data.headers.indexOf(name);
  const getColValues = (name: string): number[] => {
    if (!name) return [];
    const idx = colIdx(name);
    if (idx < 0) return [];
    return data.rows.map((r) => toNum(r[idx])).filter((v): v is number => v !== null && v >= 0);
  };

  const revVals = getColValues(mapping.revenue);
  const cogsVals = getColValues(mapping.cogs);
  const mktVals = getColValues(mapping.marketing);
  const payVals = getColValues(mapping.payroll);

  const result: ExtractedValues = {};

  if (revVals.length > 0) {
    result.startingMRR = clamp(1000, 100000, revVals[0]);
    const gr = avgGrowthRate(revVals);
    if (gr !== null) result.growthRate = clamp(0, 30, Math.round(gr));
  }

  if (cogsVals.length > 0 && revVals.length > 0) {
    const pcts = revVals.map((r, i) => (r > 0 && cogsVals[i] != null ? (cogsVals[i] / r) * 100 : null))
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

function fmtImportValue(key: keyof ExtractedValues, v: number): string {
  if (key === "startingMRR" || key === "marketingSpend" || key === "payroll") {
    return `$${v.toLocaleString("en-US")}`;
  }
  return `${v}%`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ImportModal({ onClose, onImport }: ImportModalProps) {
  const store = useProjectionStore();

  const [step, setStep] = useState<Step>("standard");
  const [standard, setStandard] = useState<DataStandard | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mapping, setMapping] = useState<ColumnMapping>({ date: "", revenue: "", cogs: "", marketing: "", payroll: "" });
  const [extracted, setExtracted] = useState<ExtractedValues | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (f: File) => {
    setFile(f);
    setParseError(null);
    setIsLoading(true);
    try {
      const data = await parseFile(f);
      setParsedData(data);
    } catch (err) {
      setParseError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleContinueFromUpload = () => {
    if (!parsedData || !standard) return;
    let values: ExtractedValues = {};
    if (standard === "standard-csv") values = extractStandardCSV(parsedData);
    else if (standard === "pl-statement") values = extractPLStatement(parsedData);
    else if (standard === "superstore") values = extractSuperstore(parsedData);
    else if (standard === "custom") values = extractCustom(parsedData, mapping);
    setExtracted(values);
    setStep("confirm");
  };

  const handleApply = () => {
    if (!extracted) return;
    const applied: string[] = [];
    const skipped: string[] = [];

    const apply = <K extends keyof ExtractedValues>(
      key: K,
      label: string,
      setter: (v: number) => void
    ) => {
      const v = extracted[key];
      if (v !== undefined) {
        const range = SLIDER_RANGES[key];
        setter(clamp(range.min, range.max, v));
        applied.push(label);
      } else {
        skipped.push(label);
      }
    };

    apply("startingMRR",    "Starting MRR",     store.setStartingMRR);
    apply("growthRate",     "Growth Rate",       store.setGrowthRate);
    apply("cogsPercent",    "COGS %",            store.setCogsPercent);
    apply("marketingSpend", "Marketing Spend",   store.setMarketingSpend);
    apply("payroll",        "Payroll",           store.setPayroll);

    onImport(applied, skipped);
  };

  // ── Styles ──
  const BG = "rgba(255,255,255,0.55)";

  const btnPrimary: React.CSSProperties = {
    backgroundColor: C_PRIMARY,
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    padding: "9px 20px",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    letterSpacing: "0.03em",
  };

  const btnGhost: React.CSSProperties = {
    backgroundColor: "transparent",
    color: "hsl(245 16% 55%)",
    border: `1px solid ${C_BORDER}`,
    borderRadius: "8px",
    padding: "9px 18px",
    fontSize: "12.5px",
    cursor: "pointer",
  };

  const FIELD_LABELS: Record<keyof ExtractedValues, string> = {
    startingMRR:    "Starting MRR",
    growthRate:     "Growth Rate",
    cogsPercent:    "COGS %",
    marketingSpend: "Marketing Spend",
    payroll:        "Payroll",
  };

  const orderedFields = ["startingMRR", "growthRate", "cogsPercent", "marketingSpend", "payroll"] as const;

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(47,36,133,0.20)",
        backdropFilter: "blur(6px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          backgroundColor: BG,
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          border: "2px solid rgba(255,255,255,0.70)",
          borderRadius: "20px",
          width: "100%",
          maxWidth: "580px",
          maxHeight: "90vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 8px 48px rgba(120,100,180,0.15)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px 16px",
            borderBottom: `1px solid rgba(255,255,255,0.50)`,
            backgroundColor: "rgba(255,255,255,0.30)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "hsl(242 44% 30%)" }}>
              Import Financial Data
            </div>
            <div style={{ fontSize: "11px", color: "hsl(245 16% 49%)", marginTop: "2px" }}>
              {step === "standard" && "Step 1 — Select a data format"}
              {step === "upload"   && "Step 2 — Upload and preview your file"}
              {step === "confirm"  && "Step 3 — Review and apply"}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close import modal"
            style={{ background: "none", border: "none", color: "hsl(245 16% 60%)", fontSize: "18px", cursor: "pointer", lineHeight: 1 }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "hsl(245 16% 40%)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "hsl(245 16% 60%)")}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>

          {/* ── Step 1: Standard Selection ── */}
          {step === "standard" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {STANDARDS.map((s) => {
                const active = standard === s.id;
                return (
                  <div
                    key={s.id}
                    onClick={() => setStandard(s.id)}
                    style={{
                      backgroundColor: active ? "rgba(47,36,133,0.08)" : "rgba(255,255,255,0.50)",
                      border: `1px solid ${active ? `${C_PRIMARY}` : C_BORDER}`,
                      borderLeft: `3px solid ${active ? C_PRIMARY : C_BORDER}`,
                      borderRadius: "8px",
                      padding: "13px 16px",
                      cursor: "pointer",
                      transition: "border-color 0.15s, background 0.15s",
                    }}
                    onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.borderColor = C_PRIMARY; }}
                    onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.borderColor = C_BORDER; }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontSize: "13px", fontWeight: 600, color: active ? C_PRIMARY : "hsl(242 44% 30%)", marginBottom: "3px" }}>
                          {s.title}
                        </div>
                        <div style={{ fontSize: "12px", color: "hsl(245 16% 55%)" }}>{s.description}</div>
                      </div>
                      <div
                        style={{
                          fontSize: "10px",
                          color: "hsl(245 16% 49%)",
                          backgroundColor: "rgba(47,36,133,0.07)",
                          borderRadius: "4px",
                          padding: "2px 7px",
                          whiteSpace: "nowrap",
                          marginLeft: "12px",
                          flexShrink: 0,
                        }}
                      >
                        {s.hint}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Step 2: Upload + Preview ── */}
          {step === "upload" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${isDragging ? C_PRIMARY : file ? C_SUCCESS : C_BORDER}`,
                  borderRadius: "10px",
                  padding: "28px 20px",
                  textAlign: "center",
                  cursor: "pointer",
                  backgroundColor: isDragging ? "rgba(47,36,133,0.08)" : "rgba(255,255,255,0.50)",
                  transition: "all 0.15s",
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  style={{ display: "none" }}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                />
                {isLoading ? (
                  <div style={{ color: "hsl(245 16% 49%)", fontSize: "13px" }}>Parsing file…</div>
                ) : file ? (
                  <>
                    <div style={{ fontSize: "13px", color: C_SUCCESS, fontWeight: 600 }}>✓ {file.name}</div>
                    <div style={{ fontSize: "11px", color: "hsl(245 16% 49%)", marginTop: "4px" }}>
                      {parsedData ? `${parsedData.rows.length} rows, ${parsedData.headers.length} columns` : ""}
                    </div>
                    <div style={{ fontSize: "11px", color: "hsl(245 16% 60%)", marginTop: "8px" }}>Click to replace</div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: "24px", marginBottom: "8px", opacity: 0.3 }}>↑</div>
                    <div style={{ fontSize: "13px", color: "hsl(245 16% 49%)", fontWeight: 500 }}>Drag & drop or click to browse</div>
                    <div style={{ fontSize: "11px", color: "hsl(245 16% 49%)", marginTop: "4px" }}>.csv or .xlsx accepted</div>
                  </>
                )}
              </div>

              {/* Parse error */}
              {parseError && (
                <div style={{ backgroundColor: `${C_ERROR}1a`, border: `1px solid ${C_ERROR}44`, borderRadius: "8px", padding: "10px 14px", fontSize: "12px", color: C_ERROR }}>
                  {parseError}
                </div>
              )}

              {/* Preview table */}
              {parsedData && !parseError && (
                <div>
                  <div style={{ fontSize: "10px", fontWeight: 600, color: "hsl(245 16% 49%)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "8px" }}>
                    File Preview (first 5 rows)
                  </div>
                  <div style={{ border: `1px solid ${C_BORDER}`, borderRadius: "10px", overflow: "hidden" }}>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ borderCollapse: "collapse", width: "100%", minWidth: "max-content" }}>
                      <thead>
                        <tr>
                          {parsedData.headers.map((h, i) => (
                            <th key={i} style={{ padding: "8px 12px", fontSize: "10.5px", color: "hsl(245 16% 49%)", fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", textAlign: "left", backgroundColor: "rgb(239, 237, 252)", borderBottom: `1px solid ${C_BORDER}`, whiteSpace: "nowrap" }}>
                              {h || `Col ${i + 1}`}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {parsedData.rows.slice(0, 5).map((row, ri) => (
                          <tr
                            key={ri}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "hsl(247 57% 33% / 0.04)")}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "")}
                          >
                            {parsedData.headers.map((_, ci) => (
                              <td key={ci} style={{ padding: "7px 12px", fontSize: "12px", color: "hsl(242 44% 40%)", borderBottom: `1px solid ${C_BORDER}`, whiteSpace: "nowrap", backgroundColor: "rgba(255,255,255,0.60)" }}>
                                {String(row[ci] ?? "")}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  </div>
                </div>
              )}

              {/* Custom column mapping */}
              {standard === "custom" && parsedData && (
                <div>
                  <div style={{ fontSize: "10px", fontWeight: 600, color: "hsl(245 16% 49%)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "10px" }}>
                    Column Mapping
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {(["revenue", "date", "cogs", "marketing", "payroll"] as const).map((field) => {
                      const labels: Record<string, string> = { revenue: "Revenue *", date: "Date", cogs: "COGS", marketing: "Marketing Spend", payroll: "Payroll" };
                      return (
                        <div key={field} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <div style={{ fontSize: "12px", color: "hsl(245 16% 49%)", width: "120px", flexShrink: 0 }}>{labels[field]}</div>
                          <select
                            value={mapping[field]}
                            onChange={(e) => setMapping((m) => ({ ...m, [field]: e.target.value }))}
                            style={{
                              flex: 1,
                              backgroundColor: "rgba(255,255,255,0.70)",
                              border: `1px solid ${C_BORDER}`,
                              borderRadius: "6px",
                              color: "hsl(242 44% 30%)",
                              fontSize: "12px",
                              padding: "6px 10px",
                              cursor: "pointer",
                            }}
                          >
                            <option value="">— Skip —</option>
                            {parsedData.headers.map((h, i) => (
                              <option key={i} value={h}>{h || `Column ${i + 1}`}</option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Step 3: Confirm ── */}
          {step === "confirm" && extracted && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ fontSize: "12.5px", color: "hsl(245 16% 55%)", lineHeight: 1.6 }}>
                The following values were extracted from <span style={{ color: C_PRIMARY }}>{file?.name}</span>. Review them before applying to the dashboard sliders.
              </div>
              <div style={{ border: `1px solid ${C_BORDER}`, borderRadius: "10px", overflow: "hidden" }}>
                {orderedFields.map((key, i) => {
                  const v = extracted[key];
                  const isLast = i === orderedFields.length - 1;
                  return (
                    <div
                      key={key}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        padding: "11px 16px",
                        borderBottom: isLast ? "none" : `1px solid ${C_BORDER}`,
                        backgroundColor: "rgba(255,255,255,0.60)",
                      }}
                    >
                      <div style={{ flex: 1, fontSize: "12.5px", color: "hsl(242 44% 40%)" }}>{FIELD_LABELS[key]}</div>
                      {v !== undefined ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: "13px", fontWeight: 600, color: C_SUCCESS }}>
                            {fmtImportValue(key, v)}
                          </span>
                          <span style={{ fontSize: "11px", color: C_SUCCESS, opacity: 0.7 }}>✓ detected</span>
                        </div>
                      ) : (
                        <span style={{ fontSize: "11px", color: C_WARNING }}>⚠ could not detect</span>
                      )}
                    </div>
                  );
                })}
              </div>
              <div style={{ fontSize: "11px", color: "hsl(245 16% 60%)", lineHeight: 1.5 }}>
                Only the fields marked as detected will be updated. All other sliders remain unchanged.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: `1px solid rgba(255,255,255,0.50)`,
            backgroundColor: "rgba(255,255,255,0.30)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <div>
            {step !== "standard" && (
              <button
                style={btnGhost}
                onClick={() => {
                  if (step === "confirm") setStep("upload");
                  else if (step === "upload") { setStep("standard"); setFile(null); setParsedData(null); setParseError(null); }
                }}
              >
                ← Back
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button style={btnGhost} onClick={onClose}>Cancel</button>
            {step === "standard" && (
              <button
                style={{ ...btnPrimary, opacity: standard ? 1 : 0.4, cursor: standard ? "pointer" : "not-allowed" }}
                disabled={!standard}
                onClick={() => setStep("upload")}
              >
                Continue →
              </button>
            )}
            {step === "upload" && (
              <button
                style={{ ...btnPrimary, opacity: (parsedData && !parseError) ? 1 : 0.4, cursor: (parsedData && !parseError) ? "pointer" : "not-allowed" }}
                disabled={!parsedData || !!parseError}
                onClick={handleContinueFromUpload}
              >
                Extract Data →
              </button>
            )}
            {step === "confirm" && (
              <button
                style={btnPrimary}
                onClick={handleApply}
              >
                Apply to Dashboard
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
