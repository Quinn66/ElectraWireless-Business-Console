import { useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { SpreadsheetGrid } from "@/components/SpreadsheetGrid";
import { parseFile } from "@/lib/importUtils";
import type { ParsedData } from "@/lib/importUtils";
import { parseBankStatement } from "@/services/personalFinanceApi";
import { usePersonalFinanceStore } from "@/store/personalFinanceStore";
import { C_SUCCESS, C_ERROR, C_PRIMARY, C_BORDER } from "@/lib/colors";

interface Props {
  onClose: () => void;
}

type Step = "upload" | "preview";

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

export function BankStatementModal({ onClose }: Props) {
  const setPendingTransactions = usePersonalFinanceStore((s) => s.setPendingTransactions);

  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [editableData, setEditableData] = useState<ParsedData | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const gridDataRef  = useRef<(() => ParsedData) | null>(null);

  const handleFile = useCallback(async (f: File) => {
    setFile(f);
    setParseError(null);
    setIsLoading(true);
    try {
      const data = await parseFile(f);
      setParsedData(data);
      setEditableData({ headers: [...data.headers], rows: data.rows.map((r) => [...r]) });
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

  const handleConfirm = () => {
    const currentData = gridDataRef.current ? gridDataRef.current() : editableData;
    if (!currentData) return;
    const transactions = parseBankStatement(currentData);
    setPendingTransactions(transactions); // store transitions flowStep → "review"
    onClose();
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
          maxWidth: "600px",
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
            borderBottom: "1px solid rgba(255,255,255,0.50)",
            backgroundColor: "rgba(255,255,255,0.30)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "hsl(242 44% 30%)" }}>
              Import Bank Statement
            </div>
            <div style={{ fontSize: "11px", color: "hsl(245 16% 49%)", marginTop: "2px" }}>
              {step === "upload"  && "Upload a CSV or Excel export from your bank"}
              {step === "preview" && "Review parsed data before continuing"}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "hsl(245 16% 60%)", fontSize: "18px", cursor: "pointer", lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>

          {/* Format hint */}
          {step === "upload" && (
            <div
              style={{
                backgroundColor: "rgba(47,36,133,0.06)",
                border: `1px solid rgba(47,36,133,0.15)`,
                borderRadius: "8px",
                padding: "10px 14px",
                fontSize: "12px",
                color: "hsl(245 16% 49%)",
                marginBottom: "14px",
                lineHeight: 1.6,
              }}
            >
              <span style={{ fontWeight: 600, color: C_PRIMARY }}>Supported formats: </span>
              Date + Description + Amount (signed) or Date + Description + Debit + Credit columns.
              Most Australian bank exports (ANZ, CBA, Westpac, NAB) work out of the box.
            </div>
          )}

          {/* Drop zone */}
          {step === "upload" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${isDragging ? C_PRIMARY : file ? C_SUCCESS : C_BORDER}`,
                  borderRadius: "10px",
                  padding: "32px 20px",
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
                      {parsedData ? `${parsedData.rows.length} rows · ${parsedData.headers.length} columns` : ""}
                    </div>
                    <div style={{ fontSize: "11px", color: "hsl(245 16% 60%)", marginTop: "8px" }}>Click to replace</div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: "28px", marginBottom: "10px", opacity: 0.25 }}>↑</div>
                    <div style={{ fontSize: "13px", color: "hsl(245 16% 49%)", fontWeight: 500 }}>
                      Drag & drop or click to browse
                    </div>
                    <div style={{ fontSize: "11px", color: "hsl(245 16% 55%)", marginTop: "4px" }}>
                      .csv or .xlsx accepted
                    </div>
                  </>
                )}
              </div>

              {parseError && (
                <div style={{ backgroundColor: `${C_ERROR}1a`, border: `1px solid ${C_ERROR}44`, borderRadius: "8px", padding: "10px 14px", fontSize: "12px", color: C_ERROR }}>
                  {parseError}
                </div>
              )}
            </div>
          )}

          {/* Preview */}
          {step === "preview" && editableData && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ fontSize: "12.5px", color: "hsl(245 16% 55%)", lineHeight: 1.6 }}>
                <span style={{ fontWeight: 600, color: C_PRIMARY }}>{parsedData?.rows.length} transactions</span> found in{" "}
                <span style={{ color: C_PRIMARY }}>{file?.name}</span>. You can correct categories on the next screen.
              </div>
              <SpreadsheetGrid
                data={editableData}
                onHeaderChange={(i, value) =>
                  setEditableData((prev) => {
                    if (!prev) return prev;
                    const headers = [...prev.headers];
                    headers[i] = value;
                    return { ...prev, headers };
                  })
                }
                gridRef={gridDataRef}
                fileKey={file?.name ?? "bank"}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid rgba(255,255,255,0.50)",
            backgroundColor: "rgba(255,255,255,0.30)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <div>
            {step === "preview" && (
              <button style={btnGhost} onClick={() => setStep("upload")}>← Back</button>
            )}
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button style={btnGhost} onClick={onClose}>Cancel</button>
            {step === "upload" && (
              <button
                style={{ ...btnPrimary, opacity: editableData && !parseError ? 1 : 0.4, cursor: editableData && !parseError ? "pointer" : "not-allowed" }}
                disabled={!editableData || !!parseError}
                onClick={() => setStep("preview")}
              >
                Preview →
              </button>
            )}
            {step === "preview" && (
              <button style={btnPrimary} onClick={handleConfirm}>
                Continue to Review →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
