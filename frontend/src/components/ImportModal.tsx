import { useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { C_SUCCESS, C_ERROR, C_PRIMARY, C_BORDER } from "@/lib/colors";
import { useSpreadsheetStore } from "@/store/spreadsheetStore";
import { parseWorkbook } from "@/lib/importUtils";

interface ImportModalProps {
  onClose: () => void;
  onImport: (applied: string[], skipped: string[]) => void;
}

export function ImportModal({ onClose }: ImportModalProps) {
  const openWorkbook = useSpreadsheetStore((s) => s.openWorkbook);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (f: File) => {
    setFile(f);
    setParseError(null);
    setIsLoading(true);
    try {
      const wb = await parseWorkbook(f);
      openWorkbook(wb);
      onClose();
    } catch (err) {
      setParseError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [openWorkbook, onClose]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const BG = "rgba(255,255,255,0.55)";
  const btnPrimary: React.CSSProperties = {
    backgroundColor: C_PRIMARY, color: "#fff", border: "none",
    borderRadius: "8px", padding: "9px 20px", fontSize: "13px",
    fontWeight: 600, cursor: "pointer",
  };
  const btnGhost: React.CSSProperties = {
    backgroundColor: "transparent", color: "hsl(245 16% 55%)",
    border: `1px solid ${C_BORDER}`, borderRadius: "8px",
    padding: "9px 18px", fontSize: "12.5px", cursor: "pointer",
  };

  return createPortal(
    <div
      style={{
        position: "fixed", inset: 0,
        backgroundColor: "rgba(47,36,133,0.20)",
        backdropFilter: "blur(6px)", zIndex: 9999,
        display: "flex", alignItems: "center", justifyContent: "center", padding: "20px",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        backgroundColor: BG, backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        border: "2px solid rgba(255,255,255,0.70)",
        borderRadius: "20px", width: "100%", maxWidth: "480px",
        overflow: "hidden", display: "flex", flexDirection: "column",
        boxShadow: "0 8px 48px rgba(120,100,180,0.15)",
      }}>
        {/* Header */}
        <div style={{
          padding: "20px 24px 16px",
          borderBottom: `1px solid rgba(255,255,255,0.50)`,
          backgroundColor: "rgba(255,255,255,0.30)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "hsl(242 44% 30%)" }}>
              Import Spreadsheet
            </div>
            <div style={{ fontSize: "11px", color: "hsl(245 16% 49%)", marginTop: "2px" }}>
              Opens full Excel-like editor with multi-sheet support
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "hsl(245 16% 60%)", fontSize: "18px", cursor: "pointer" }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${isDragging ? C_PRIMARY : file ? C_SUCCESS : C_BORDER}`,
              borderRadius: "10px", padding: "36px 20px", textAlign: "center",
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
            ) : file && !parseError ? (
              <>
                <div style={{ fontSize: "13px", color: C_SUCCESS, fontWeight: 600 }}>✓ {file.name}</div>
                <div style={{ fontSize: "11px", color: "hsl(245 16% 60%)", marginTop: "4px" }}>Opening editor…</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: "28px", marginBottom: "10px", opacity: 0.25 }}>⊞</div>
                <div style={{ fontSize: "13px", color: "hsl(245 16% 49%)", fontWeight: 500 }}>
                  Drag & drop or click to browse
                </div>
                <div style={{ fontSize: "11px", color: "hsl(245 16% 55%)", marginTop: "4px" }}>
                  .csv or .xlsx — all sheets loaded automatically
                </div>
              </>
            )}
          </div>

          {parseError && (
            <div style={{
              backgroundColor: `${C_ERROR}1a`, border: `1px solid ${C_ERROR}44`,
              borderRadius: "8px", padding: "10px 14px", fontSize: "12px", color: C_ERROR,
            }}>
              {parseError}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: "14px 24px", borderTop: `1px solid rgba(255,255,255,0.50)`,
          backgroundColor: "rgba(255,255,255,0.30)", display: "flex", justifyContent: "flex-end",
        }}>
          <button style={btnGhost} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
