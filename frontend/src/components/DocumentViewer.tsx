import { useRef } from "react";
import { AgGridReact } from "ag-grid-react";
import type { ColDef, GridApi } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import { C_BORDER, C_PRIMARY } from "@/lib/colors";
import * as XLSX from "xlsx";
import type { StoredDocument } from "@/store/documentStore";

interface DocumentViewerProps {
  doc: StoredDocument;
  gridRef: React.MutableRefObject<any>;
}

const BG = "rgba(255,255,255,0.55)";

export function DocumentViewer({ doc, gridRef }: DocumentViewerProps) {
  const objectUrlRef = useRef<string | null>(null);
  const gridApiRef = useRef<GridApi | null>(null);

  const getObjectUrl = () => {
    if (!objectUrlRef.current) {
      objectUrlRef.current = URL.createObjectURL(doc.file);
    }
    return objectUrlRef.current;
  };

  const handleExport = () => {
    if (doc.parsedData && gridApiRef.current) {
      const rows: (string | number | null)[][] = [];
      gridApiRef.current.forEachNode((node) => {
        rows.push(
          (doc.parsedData!.headers ?? []).map((_, ci) => node.data[`c${ci}`] ?? null)
        );
      });
      const ws = XLSX.utils.aoa_to_sheet([doc.parsedData.headers, ...rows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      XLSX.writeFile(wb, doc.name.replace(/\.[^.]+$/, "") + "_edited.xlsx");
    } else {
      const a = document.createElement("a");
      a.href = getObjectUrl();
      a.download = doc.name;
      a.click();
    }
  };

  const colDefs: ColDef[] = (doc.parsedData?.headers ?? []).map((h, ci) => ({
    field: `c${ci}`,
    headerName: h || `Col ${ci + 1}`,
    editable: true,
    flex: 1,
    minWidth: 80,
  }));

  const rowData = (doc.parsedData?.rows ?? []).map((row) => {
    const obj: Record<string, string | number | null> = {};
    row.forEach((val, ci) => { obj[`c${ci}`] = val ?? null; });
    return obj;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: "10px" }}>

      {/* Toolbar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        backgroundColor: BG, border: `1px solid ${C_BORDER}`, borderRadius: "10px",
        padding: "8px 14px", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <FileIcon ext={doc.ext} />
          <div>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "hsl(242 44% 30%)" }}>{doc.name}</div>
            <div style={{ fontSize: "10.5px", color: "hsl(245 16% 55%)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {doc.ext.toUpperCase()} · uploaded {new Date(doc.uploadedAt).toLocaleDateString()}
            </div>
          </div>
        </div>
        <button
          onClick={handleExport}
          style={{
            fontSize: "11px", fontWeight: 600, color: C_PRIMARY,
            backgroundColor: "rgba(47,36,133,0.08)", border: `1px solid rgba(47,36,133,0.20)`,
            borderRadius: "6px", padding: "5px 12px", cursor: "pointer",
          }}
        >
          ↓ Export
        </button>
      </div>

      {/* Viewer area */}
      <div style={{ flex: 1, minHeight: 0, borderRadius: "10px", overflow: "hidden", border: `1px solid ${C_BORDER}` }}>

        {/* Spreadsheet (xlsx / csv) */}
        {doc.parsedData && (
          <div className="ag-theme-alpine" style={{ height: "100%" }}>
            <AgGridReact
              key={doc.id}
              rowData={rowData}
              columnDefs={colDefs}
              onGridReady={(params) => {
                gridApiRef.current = params.api;
                gridRef.current = params.api;
              }}
              domLayout="normal"
            />
          </div>
        )}

        {/* PDF */}
        {doc.ext === "pdf" && (
          <iframe
            src={getObjectUrl()}
            style={{ width: "100%", height: "100%", border: "none", backgroundColor: "#525659" }}
            title={doc.name}
          />
        )}

        {/* DOCX → HTML */}
        {doc.docxHtml && (
          <div
            style={{
              height: "100%", overflowY: "auto", padding: "24px 28px",
              backgroundColor: "#fff", fontSize: "13.5px", lineHeight: 1.7,
              color: "#1a1a2e",
            }}
            dangerouslySetInnerHTML={{ __html: doc.docxHtml }}
          />
        )}

        {/* Images */}
        {["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(doc.ext) && (
          <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f5f5f5", overflow: "auto" }}>
            <img
              src={getObjectUrl()}
              alt={doc.name}
              style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
            />
          </div>
        )}

        {/* Unsupported fallback */}
        {!doc.parsedData && !doc.docxHtml && doc.ext !== "pdf" && !["jpg","jpeg","png","gif","webp","svg"].includes(doc.ext) && (
          <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "8px", backgroundColor: BG }}>
            <FileIcon ext={doc.ext} size={32} />
            <p style={{ fontSize: "13px", color: "hsl(245 16% 55%)" }}>Preview not available for .{doc.ext} files</p>
            <button onClick={handleExport} style={{ fontSize: "12px", color: C_PRIMARY, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
              Download file
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function FileIcon({ ext, size = 16 }: { ext: string; size?: number }) {
  const color =
    ["xlsx", "xls", "csv"].includes(ext) ? "#1D6F42" :
    ext === "pdf" ? "#E44D26" :
    ["doc", "docx"].includes(ext) ? "#2B579A" :
    ["jpg", "jpeg", "png", "gif", "webp"].includes(ext) ? "#9B59B6" :
    "hsl(247 57% 33%)";

  const label =
    ["xlsx", "xls"].includes(ext) ? "XLS" :
    ext === "csv" ? "CSV" :
    ext === "pdf" ? "PDF" :
    ["doc", "docx"].includes(ext) ? "DOC" :
    ["jpg", "jpeg", "png", "gif", "webp"].includes(ext) ? "IMG" :
    ext.toUpperCase().slice(0, 3);

  return (
    <div style={{
      width: size * 2, height: size * 2.2, backgroundColor: color, borderRadius: "3px",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.55, fontWeight: 700, color: "#fff", letterSpacing: "0.04em",
      flexShrink: 0,
    }}>
      {label}
    </div>
  );
}
