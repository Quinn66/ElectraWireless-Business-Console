import { useRef, useEffect, useMemo, useState, useCallback } from "react";
import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
import type { ColDef, GridApi, CellFocusedEvent, CellValueChangedEvent, ICellRendererParams } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import { useSpreadsheetStore } from "@/store/spreadsheetStore";
import { useProjectionStore } from "@/store/projectionStore";
import { colIndexToLetter, colLetterToIndex, toCellId } from "@/lib/cellMap";
import {
  extractStandardCSV, extractPLStatement, extractSuperstore,
  clamp, fmtImportValue, STANDARDS, SLIDER_RANGES, FIELD_LABELS, ORDERED_FIELDS,
} from "@/lib/importUtils";
import type { DataStandard, ExtractedValues } from "@/lib/importUtils";
import { C_PRIMARY, C_BORDER, C_SUCCESS, C_WARNING } from "@/lib/colors";

ModuleRegistry.registerModules([AllCommunityModule]);

const API_BASE = "http://localhost:8000";

// ── Anomaly types ─────────────────────────────────────────────────────────────

interface Anomaly {
  cellId: string;
  column: string;
  rowIndex: number;
  colIndex: number;
  originalValue: number | null;
  predictedValue: number | null;
  difference: number | null;
  severity: "high" | "medium" | "low";
  reason?: "outlier" | "missing";
}

const SEVERITY_COLOR = {
  high:   { bg: "rgba(239,68,68,0.13)",   border: "#ef4444", badge: "#ef4444",   label: "HIGH" },
  medium: { bg: "rgba(249,115,22,0.13)",  border: "#f97316", badge: "#f97316",  label: "MED"  },
  low:    { bg: "rgba(234,179,8,0.10)",   border: "#eab308", badge: "#ca8a04",  label: "LOW"  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function toNum(v: string | number | null): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/[$,%\s]/g, ""));
  return isNaN(n) ? null : n;
}

// rows already hold HyperFormula-computed values — just map to AG Grid objects
function sheetToRowObjects(rows: (string | number | null)[][]) {
  return rows.map(row => {
    const obj: Record<string, string | number | null> = {};
    row.forEach((val, ci) => { obj[`c${ci}`] = val ?? null; });
    return obj;
  });
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const btnPrimary: React.CSSProperties = {
  backgroundColor: C_PRIMARY, color: "#fff", border: "none",
  borderRadius: "8px", padding: "8px 18px", fontSize: "12.5px", fontWeight: 600, cursor: "pointer",
};
const btnGhost: React.CSSProperties = {
  backgroundColor: "transparent", color: "hsl(245 16% 55%)",
  border: `1px solid ${C_BORDER}`, borderRadius: "8px",
  padding: "8px 16px", fontSize: "12px", cursor: "pointer",
};

// ── Apply overlay ─────────────────────────────────────────────────────────────

function ApplyOverlay({ rows, onClose, onApplied }: { rows: (string | number | null)[][]; onClose: () => void; onApplied: () => void }) {
  const store = useProjectionStore();
  const { onApplied: storeCallback, close: closeSpreadsheet } = useSpreadsheetStore();

  // Auto-detect: try all formats, pick the one with the most extracted fields
  const extracted = useMemo<ExtractedValues>(() => {
    const headers = rows[0]?.map(h => String(h ?? "").trim()) ?? [];
    const parsedData = { headers, rows: rows.slice(1) };
    const candidates = [
      extractPLStatement(parsedData),
      extractStandardCSV(parsedData),
      extractSuperstore(parsedData),
    ];
    return candidates.reduce((best, cur) =>
      Object.keys(cur).length > Object.keys(best).length ? cur : best
    , {});
  }, [rows]);

  const handleApply = () => {
    const apply = <K extends keyof ExtractedValues>(key: K, setter: (v: number) => void) => {
      const v = extracted[key]; if (v !== undefined) setter(clamp(SLIDER_RANGES[key].min, SLIDER_RANGES[key].max, v));
    };
    apply("startingMRR", store.setStartingMRR); apply("growthRate", store.setGrowthRate);
    apply("cogsPercent", store.setCogsPercent); apply("marketingSpend", store.setMarketingSpend);
    apply("payroll", store.setPayroll);
    storeCallback?.(extracted); onApplied(); closeSpreadsheet();
  };

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 10, backgroundColor: "rgba(47,36,133,0.25)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ backgroundColor: "rgba(255,255,255,0.92)", borderRadius: "16px", border: `1px solid rgba(255,255,255,0.70)`, padding: "24px", width: "400px", maxHeight: "80vh", overflowY: "auto", boxShadow: "0 8px 40px rgba(80,60,180,0.18)" }}>
        <div style={{ fontSize: "14px", fontWeight: 700, color: "hsl(242 44% 30%)", marginBottom: "4px" }}>Apply to Dashboard</div>
        <div style={{ fontSize: "12px", color: "hsl(245 16% 55%)", marginBottom: "16px" }}>Values auto-detected from your spreadsheet.</div>
        <div style={{ border: `1px solid ${C_BORDER}`, borderRadius: "10px", overflow: "hidden", marginBottom: "16px" }}>
          {ORDERED_FIELDS.map((key, i) => {
            const v = extracted[key];
            return (
              <div key={key} style={{ display: "flex", alignItems: "center", padding: "10px 14px", borderBottom: i < ORDERED_FIELDS.length - 1 ? `1px solid ${C_BORDER}` : "none", backgroundColor: "rgba(255,255,255,0.7)" }}>
                <div style={{ flex: 1, fontSize: "12.5px", color: "hsl(242 44% 40%)" }}>{FIELD_LABELS[key]}</div>
                {v !== undefined ? <span style={{ fontSize: "13px", fontWeight: 600, color: C_SUCCESS }}>{fmtImportValue(key, v)}</span> : <span style={{ fontSize: "11px", color: C_WARNING }}>⚠ not detected</span>}
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={btnGhost}>Cancel</button>
          <button onClick={handleApply} style={btnPrimary}>Apply to Dashboard</button>
        </div>
      </div>
    </div>
  );
}

// ── ELLY sidebar ──────────────────────────────────────────────────────────────

interface EllySidebarProps {
  anomalies: Anomaly[];
  dismissed: Set<string>;
  loading: boolean;
  onDismiss: (cellId: string) => void;
  onAccept: (anomaly: Anomaly) => void;
  onFocus: (anomaly: Anomaly) => void;
  onClose: () => void;
}

function EllySidebar({ anomalies, dismissed, loading, onDismiss, onAccept, onFocus, onClose }: EllySidebarProps) {
  const visible = anomalies.filter(a => !dismissed.has(a.cellId));

  return (
    <div style={{ width: 300, flexShrink: 0, display: "flex", flexDirection: "column", borderLeft: `1px solid ${C_BORDER}`, backgroundColor: "rgba(248,247,255,0.98)" }}>
      {/* Header */}
      <div style={{ padding: "12px 14px 10px", borderBottom: `1px solid ${C_BORDER}`, display: "flex", alignItems: "center", gap: "8px", backgroundColor: "rgba(47,36,133,0.05)" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "12.5px", fontWeight: 700, color: "hsl(242 44% 28%)" }}>ELLY Anomaly Advisor</div>
          <div style={{ fontSize: "10.5px", color: "hsl(245 16% 55%)", marginTop: "1px" }}>
            {loading ? "Analysing…" : `${visible.length} issue${visible.length !== 1 ? "s" : ""} found`}
          </div>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "hsl(245 16% 60%)", fontSize: "15px", lineHeight: 1, padding: "2px 4px" }}>✕</button>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "10px", padding: "24px" }}>
          <div style={{ fontSize: "22px", opacity: 0.3 }}>⟳</div>
          <div style={{ fontSize: "12px", color: "hsl(245 16% 55%)" }}>Running anomaly detection…</div>
        </div>
      )}

      {/* Empty state */}
      {!loading && visible.length === 0 && (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "8px", padding: "24px" }}>
          <div style={{ fontSize: "26px", opacity: 0.25 }}>✓</div>
          <div style={{ fontSize: "12px", color: "hsl(245 16% 55%)", textAlign: "center" }}>No anomalies detected in this sheet</div>
        </div>
      )}

      {/* Anomaly list */}
      {!loading && visible.length > 0 && (
        <div style={{ flex: 1, overflowY: "auto", padding: "10px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {visible.map(a => {
              const s = SEVERITY_COLOR[a.severity];
              return (
                <div
                  key={a.cellId}
                  style={{ backgroundColor: s.bg, border: `1px solid ${s.border}30`, borderLeft: `3px solid ${s.border}`, borderRadius: "8px", padding: "10px 12px", cursor: "pointer" }}
                  onClick={() => onFocus(a)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "5px" }}>
                    <span style={{ fontSize: "9px", fontWeight: 700, color: "#fff", backgroundColor: s.badge, borderRadius: "3px", padding: "1px 5px", letterSpacing: "0.05em" }}>{s.label}</span>
                    <span style={{ fontSize: "11.5px", fontWeight: 600, color: "hsl(242 44% 28%)" }}>{a.cellId}</span>
                    <span style={{ fontSize: "10.5px", color: "hsl(245 16% 55%)" }}>· {a.column}</span>
                  </div>
                  <div style={{ fontSize: "11px", color: "hsl(242 44% 40%)", lineHeight: 1.5 }}>
                    {a.reason === "missing" ? (
                      <span style={{ color: "#ef4444", fontWeight: 600 }}>Empty cell — value is missing</span>
                    ) : (
                      <>
                        <span style={{ color: "hsl(245 16% 50%)" }}>Was </span>
                        <span style={{ fontWeight: 600 }}>{a.originalValue!.toLocaleString()}</span>
                        <span style={{ color: "hsl(245 16% 50%)" }}> — suggested </span>
                        <span style={{ fontWeight: 600, color: s.badge }}>{a.predictedValue!.toLocaleString()}</span>
                      </>
                    )}
                  </div>
                  {a.reason !== "missing" && (
                    <div style={{ fontSize: "10.5px", color: "hsl(245 16% 60%)", marginTop: "3px" }}>
                      Δ {a.difference!.toLocaleString()} ({Math.round(Math.abs(a.originalValue! - a.predictedValue!) / Math.abs(a.predictedValue! || 1) * 100)}%)
                    </div>
                  )}
                  <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
                    {a.predictedValue !== null && (
                      <button
                        onClick={e => { e.stopPropagation(); onAccept(a); }}
                        style={{ fontSize: "10.5px", fontWeight: 600, color: "#fff", backgroundColor: s.badge, border: "none", borderRadius: "5px", padding: "2px 10px", cursor: "pointer" }}
                      >
                        Accept
                      </button>
                    )}
                    <button
                      onClick={e => { e.stopPropagation(); onDismiss(a.cellId); }}
                      style={{ fontSize: "10.5px", color: "hsl(245 16% 55%)", background: "none", border: `1px solid ${C_BORDER}`, borderRadius: "5px", padding: "2px 10px", cursor: "pointer" }}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main SpreadsheetPage ──────────────────────────────────────────────────────

export function SpreadsheetPage() {
  const { isOpen, fileName, sheets, activeSheetIndex, cellMap, selectedCell, close, setActiveSheet, setSelectedCell, updateCell } =
    useSpreadsheetStore();

  const gridApiRef = useRef<GridApi | null>(null);
  const formulaInputRef = useRef<HTMLInputElement>(null);
  /** True while the formula bar input has focus — used to detect formula-entry mode. */
  const formulaBarActiveRef = useRef(false);

  const [formulaBarValue, setFormulaBarValue] = useState("");
  const [formulaRefCell, setFormulaRefCell] = useState<{ rowIndex: number; colIndex: number } | null>(null);
  const [showApply, setShowApply] = useState(false);
  const [ellyOpen, setEllyOpen] = useState(true);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [loadingAnomalies, setLoadingAnomalies] = useState(false);

  const activeSheet = sheets[activeSheetIndex];

  // ── Fetch anomalies when sheet or cell map changes ──
  useEffect(() => {
    if (!isOpen || Object.keys(cellMap).length === 0) return;
    setLoadingAnomalies(true);
    setDismissed(new Set());
    fetch(`${API_BASE}/detect-anomalies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cell_map: cellMap, sheet_index: activeSheetIndex }),
    })
      .then(r => r.json())
      .then(data => setAnomalies(data.anomalies ?? []))
      .catch(() => setAnomalies([]))
      .finally(() => setLoadingAnomalies(false));
  }, [isOpen, activeSheetIndex, cellMap]);

  // Build anomaly lookup for fast cell highlight
  const anomalyMap = useMemo(() => {
    const m: Record<string, Anomaly> = {};
    anomalies.forEach(a => { m[a.cellId] = a; });
    return m;
  }, [anomalies]);

  // Repaint cells after formulaRefCell changes so the old highlight clears
  useEffect(() => {
    gridApiRef.current?.refreshCells({ force: true });
  }, [formulaRefCell]);

  // Sync formula bar
  useEffect(() => {
    if (!selectedCell || !activeSheet) { setFormulaBarValue(""); return; }
    const formula = activeSheet.formulas[selectedCell.rowIndex]?.[selectedCell.colIndex];
    const value   = activeSheet.rows[selectedCell.rowIndex]?.[selectedCell.colIndex];
    setFormulaBarValue(formula ?? String(value ?? ""));
  }, [selectedCell, activeSheet]);

  const rowData = useMemo(() => {
    if (!activeSheet) return [];
    return sheetToRowObjects(activeSheet.rows);
  }, [activeSheet]);

  const numCols = useMemo(() => {
    if (!activeSheet) return 0;
    return Math.max(0, ...activeSheet.rows.map(r => r.length));
  }, [activeSheet]);

  const columnDefs = useMemo<ColDef[]>(() => {
    const rowNumCol: ColDef = {
      headerName: "", valueGetter: p => (p.node?.rowIndex ?? 0) + 1,
      width: 52, minWidth: 52, maxWidth: 52, pinned: "left", editable: false, suppressMovable: true,
      cellStyle: { color: "hsl(245 16% 60%)", backgroundColor: "rgba(245,244,255,0.9)", textAlign: "center", fontSize: "11px", fontWeight: 500, borderRight: `1px solid ${C_BORDER}` },
    };

    const dataCols: ColDef[] = Array.from({ length: numCols }, (_, ci) => ({
      headerName: colIndexToLetter(ci),
      field: `c${ci}`,
      editable: true,
      flex: 1,
      minWidth: 90,
      cellStyle: (params: any): { [key: string]: any } | undefined => {
        const ri = params.node.rowIndex ?? 0;
        // Highlight cell being pointed at during formula entry
        if (formulaRefCell && formulaRefCell.rowIndex === ri && formulaRefCell.colIndex === ci) {
          return { backgroundColor: "rgba(47,36,133,0.12)", outline: `2px solid ${C_PRIMARY}`, outlineOffset: "-2px" };
        }
        const cellId = toCellId(activeSheetIndex, ri, ci);
        const anomaly = anomalyMap[cellId];
        if (anomaly && !dismissed.has(cellId)) {
          const s = SEVERITY_COLOR[anomaly.severity];
          return { backgroundColor: s.bg, borderLeft: `3px solid ${s.border}` };
        }
        return undefined;
      },
      cellRenderer: (params: ICellRendererParams) => {
        const ri = params.node.rowIndex ?? 0;
        const formula = activeSheet?.formulas[ri]?.[ci];
        const cellId = toCellId(activeSheetIndex, ri, ci);
        const anomaly = anomalyMap[cellId];
        const color = formula ? C_PRIMARY : anomaly && !dismissed.has(cellId) ? SEVERITY_COLOR[anomaly.severity].badge : undefined;
        return <span title={formula ?? undefined} style={{ color, fontStyle: formula ? "italic" : undefined }}>{params.value ?? ""}</span>;
      },
    }));

    return [rowNumCol, ...dataCols];
  }, [numCols, activeSheet, activeSheetIndex, anomalyMap, dismissed, formulaRefCell]);

  const handleCellFocused = useCallback((e: CellFocusedEvent) => {
    if (e.rowIndex == null || !e.column) return;
    const colId = (e.column as any).getColId?.() as string;
    const ci = colId?.startsWith("c") ? parseInt(colId.slice(1)) : -1;
    if (ci < 0) return;
    // Suppress navigation when formula bar is active — mousedown handler takes over
    if (formulaBarActiveRef.current) return;
    setSelectedCell({ rowIndex: e.rowIndex, colIndex: ci });
  }, [setSelectedCell]);

  /** Insert a cell address into the formula bar at the current cursor position. */
  const insertCellRef = useCallback((rowIndex: number, colIndex: number) => {
    const ref = `${colIndexToLetter(colIndex)}${rowIndex + 1}`;
    const input = formulaInputRef.current;
    if (!input) return;
    const start = input.selectionStart ?? formulaBarValue.length;
    const end   = input.selectionEnd   ?? formulaBarValue.length;

    // If the cursor is sitting right after a cell reference (letters then digits),
    // replace that reference instead of appending — mirrors Excel's "point" mode.
    let insertAt = start;
    if (start === end) {
      const before = formulaBarValue.slice(0, start);
      const existingRef = before.match(/[A-Za-z]+[0-9]+$/);
      if (existingRef) insertAt = start - existingRef[0].length;
    }

    const next = formulaBarValue.slice(0, insertAt) + ref + formulaBarValue.slice(end);
    setFormulaBarValue(next);
    setFormulaRefCell({ rowIndex, colIndex });
    requestAnimationFrame(() => {
      input.setSelectionRange(start + ref.length, start + ref.length);
    });
  }, [formulaBarValue]);

  /**
   * Intercept grid clicks while the formula bar is active and a formula is being typed.
   * Calling preventDefault keeps focus on the formula bar so no blur/commit fires.
   * We then read col-id / row-index from AG Grid's DOM to identify the clicked cell.
   */
  const handleGridAreaMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!formulaBarActiveRef.current || !formulaBarValue.startsWith("=")) return;
    const cellEl = (e.target as HTMLElement).closest<HTMLElement>("[col-id]");
    const rowEl  = (e.target as HTMLElement).closest<HTMLElement>("[row-index]");
    if (!cellEl || !rowEl) return;
    const colId    = cellEl.getAttribute("col-id") ?? "";
    const rowIndex = parseInt(rowEl.getAttribute("row-index") ?? "-1");
    const ci       = colId.startsWith("c") ? parseInt(colId.slice(1)) : -1;
    if (ci < 0 || rowIndex < 0) return;
    e.preventDefault(); // keep formula bar focused
    insertCellRef(rowIndex, ci);
  }, [formulaBarValue, insertCellRef]);

  const handleCellValueChanged = useCallback((e: CellValueChangedEvent) => {
    const ri = e.node.rowIndex ?? 0;
    const colId = (e.column as any).getColId?.() as string;
    const ci = colId?.startsWith("c") ? parseInt(colId.slice(1)) : -1;
    if (ci < 0) return;
    const raw = String(e.newValue ?? "");
    if (raw.startsWith("=")) {
      updateCell(activeSheetIndex, ri, ci, null, raw);
    } else {
      const num = parseFloat(raw);
      updateCell(activeSheetIndex, ri, ci, isNaN(num) ? raw || null : num, null);
    }
  }, [activeSheetIndex, updateCell]);

  const handleFormulaBarCommit = useCallback(() => {
    if (!selectedCell) return;
    const raw = formulaBarValue;
    if (raw.startsWith("=")) {
      updateCell(activeSheetIndex, selectedCell.rowIndex, selectedCell.colIndex, null, raw);
    } else {
      const num = parseFloat(raw);
      updateCell(activeSheetIndex, selectedCell.rowIndex, selectedCell.colIndex, isNaN(num) ? raw || null : num, null);
    }
    gridApiRef.current?.refreshCells({ force: true });
  }, [formulaBarValue, selectedCell, activeSheetIndex, updateCell]);

  const handleFocusAnomaly = useCallback((a: Anomaly) => {
    if (!gridApiRef.current) return;
    gridApiRef.current.ensureIndexVisible(a.rowIndex, "middle");
    gridApiRef.current.setFocusedCell(a.rowIndex, `c${a.colIndex}`);
  }, []);

  const handleAcceptAnomaly = useCallback((a: Anomaly) => {
    if (a.predictedValue === null) return;
    updateCell(activeSheetIndex, a.rowIndex, a.colIndex, a.predictedValue, null);
    setDismissed(prev => new Set([...prev, a.cellId]));
    gridApiRef.current?.refreshCells({ force: true });
  }, [activeSheetIndex, updateCell]);

  const cellAddress = useMemo(() => {
    if (!selectedCell) return "";
    return `${colIndexToLetter(selectedCell.colIndex)}${selectedCell.rowIndex + 1}`;
  }, [selectedCell]);

  const visibleAnomalyCount = anomalies.filter(a => !dismissed.has(a.cellId)).length;

  if (!isOpen) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9000, backgroundColor: "rgba(240,238,255,0.97)", display: "flex", flexDirection: "column", fontFamily: "inherit" }}>

      {/* ── Top bar ── */}
      <div style={{ height: 48, flexShrink: 0, display: "flex", alignItems: "center", gap: "10px", padding: "0 16px", backgroundColor: "rgba(47,36,133,0.06)", borderBottom: `1px solid ${C_BORDER}` }}>
        <div style={{ fontSize: "13px", fontWeight: 600, color: "hsl(242 44% 30%)", flex: 1 }}>{fileName}</div>
        <button onClick={() => setShowApply(true)} style={{ ...btnPrimary, fontSize: "12px", padding: "6px 16px" }}>Apply to Dashboard ▸</button>
        <button
          onClick={() => setEllyOpen(o => !o)}
          style={{ fontSize: "12px", padding: "6px 14px", borderRadius: "8px", border: `1px solid ${ellyOpen ? C_PRIMARY : C_BORDER}`, backgroundColor: ellyOpen ? "rgba(47,36,133,0.09)" : "transparent", color: ellyOpen ? C_PRIMARY : "hsl(245 16% 55%)", cursor: "pointer", fontWeight: 600, position: "relative" }}
        >
          ELLY
          {visibleAnomalyCount > 0 && (
            <span style={{ position: "absolute", top: -6, right: -6, backgroundColor: "#ef4444", color: "#fff", borderRadius: "99px", fontSize: "9px", fontWeight: 700, minWidth: "16px", height: "16px", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px" }}>
              {visibleAnomalyCount}
            </span>
          )}
        </button>
        <button onClick={close} style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "hsl(245 16% 55%)", lineHeight: 1, padding: "4px 8px" }} title="Close">✕</button>
      </div>

      {/* ── Formula bar ── */}
      <div style={{ height: 36, flexShrink: 0, display: "flex", alignItems: "center", borderBottom: `1px solid ${C_BORDER}`, backgroundColor: "#fff" }}>
        <div style={{ width: 72, flexShrink: 0, textAlign: "center", fontSize: "12px", fontWeight: 600, color: "hsl(242 44% 40%)", borderRight: `1px solid ${C_BORDER}`, height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>{cellAddress || "—"}</div>
        <div style={{ width: 36, flexShrink: 0, textAlign: "center", fontSize: "13px", color: "hsl(245 16% 55%)", borderRight: `1px solid ${C_BORDER}`, height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>fx</div>
        <input
          ref={formulaInputRef}
          value={formulaBarValue}
          onChange={e => {
            setFormulaBarValue(e.target.value);
            if (!e.target.value.startsWith("=")) setFormulaRefCell(null);
          }}
          onFocus={() => { formulaBarActiveRef.current = true; }}
          onBlur={() => {
            formulaBarActiveRef.current = false;
            setFormulaRefCell(null);
            handleFormulaBarCommit();
          }}
          onKeyDown={e => {
            if (e.key === "Enter") { setFormulaRefCell(null); handleFormulaBarCommit(); }
            if (e.key === "Escape") { setFormulaRefCell(null); }
          }}
          placeholder="Select a cell to edit…"
          style={{ flex: 1, height: "100%", border: "none", outline: "none", padding: "0 12px", fontSize: "12.5px", fontFamily: "monospace", color: formulaBarValue.startsWith("=") ? C_PRIMARY : "hsl(242 44% 25%)", backgroundColor: "transparent" }}
        />
      </div>

      {/* ── Grid + ELLY sidebar ── */}
      <div style={{ flex: 1, minHeight: 0, display: "flex", position: "relative" }}>
        <div className="ag-theme-alpine" style={{ flex: 1, minWidth: 0 }} onMouseDown={handleGridAreaMouseDown}>
          <AgGridReact
            key={`${activeSheetIndex}-${fileName}`}
            rowData={rowData}
            columnDefs={columnDefs}
            onGridReady={p => { gridApiRef.current = p.api; }}
            onCellFocused={handleCellFocused}
            onCellValueChanged={handleCellValueChanged}
            suppressRowClickSelection={true}
            rowSelection="multiple"
            domLayout="normal"
          />
        </div>

        {ellyOpen && (
          <EllySidebar
            anomalies={anomalies}
            dismissed={dismissed}
            loading={loadingAnomalies}
            onDismiss={id => setDismissed(prev => new Set([...prev, id]))}
            onAccept={handleAcceptAnomaly}
            onFocus={handleFocusAnomaly}
            onClose={() => setEllyOpen(false)}
          />
        )}

        {showApply && activeSheet && (
          <ApplyOverlay rows={activeSheet.rows} onClose={() => setShowApply(false)} onApplied={() => setShowApply(false)} />
        )}
      </div>

      {/* ── Sheet tabs ── */}
      <div style={{ height: 36, flexShrink: 0, display: "flex", alignItems: "stretch", borderTop: `1px solid ${C_BORDER}`, backgroundColor: "rgba(47,36,133,0.04)", overflowX: "auto" }}>
        {sheets.map((sheet, i) => {
          const active = i === activeSheetIndex;
          return (
            <button key={i} onClick={() => setActiveSheet(i)} style={{ padding: "0 18px", fontSize: "12px", fontWeight: active ? 600 : 400, color: active ? C_PRIMARY : "hsl(245 16% 50%)", backgroundColor: active ? "#fff" : "transparent", border: "none", borderRight: `1px solid ${C_BORDER}`, borderTop: active ? `2px solid ${C_PRIMARY}` : "2px solid transparent", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
              {sheet.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
