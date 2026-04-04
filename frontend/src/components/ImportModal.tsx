import { useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { C_SUCCESS, C_ERROR, C_WARNING, C_PRIMARY, C_BORDER } from "@/lib/colors";
import { useProjectionStore } from "@/store/projectionStore";
import {
  STANDARDS,
  SLIDER_RANGES,
  FIELD_LABELS,
  ORDERED_FIELDS,
  clamp,
  parseFile,
  extractStandardCSV,
  extractPLStatement,
  extractSuperstore,
  extractCustom,
  fmtImportValue,
} from "@/lib/importUtils";
import type { DataStandard, ParsedData, ExtractedValues, ColumnMapping, WizardStep } from "@/lib/importUtils";

interface ImportModalProps {
  onClose: () => void;
  onImport: (applied: string[], skipped: string[]) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ImportModal({ onClose, onImport }: ImportModalProps) {
  const store = useProjectionStore();

  const [step, setStep] = useState<WizardStep>("standard");
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

    apply("startingMRR",    "Starting MRR",   store.setStartingMRR);
    apply("growthRate",     "Growth Rate",     store.setGrowthRate);
    apply("cogsPercent",    "COGS %",          store.setCogsPercent);
    apply("marketingSpend", "Marketing Spend", store.setMarketingSpend);
    apply("payroll",        "Payroll",         store.setPayroll);

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
                {ORDERED_FIELDS.map((key, i) => {
                  const v = extracted[key];
                  const isLast = i === ORDERED_FIELDS.length - 1;
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
