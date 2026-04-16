import { useRef, useEffect, useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
import type { ColDef, GridApi, ICellRendererParams } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import type { ParsedData } from "@/lib/importUtils";
import { C_PRIMARY, C_BORDER } from "@/lib/colors";

ModuleRegistry.registerModules([AllCommunityModule]);

// ── Types ─────────────────────────────────────────────────────────────────────

type RowObj = Record<string, string | number | null>;

export interface SpreadsheetGridProps {
  data: ParsedData;
  onHeaderChange: (index: number, value: string) => void;
  /** Exposes a getData() function to parent so it can read current cell values */
  gridRef: React.MutableRefObject<(() => ParsedData) | null>;
  fileKey: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function rowsToObjects(rows: (string | number | null)[][]): RowObj[] {
  return rows.map((row) => {
    const obj: RowObj = {};
    row.forEach((val, ci) => { obj[`c${ci}`] = val ?? null; });
    return obj;
  });
}

// ── Formula cell renderer ─────────────────────────────────────────────────────

function FormulaCellRenderer(params: ICellRendererParams & { formula?: string }) {
  if (params.formula) {
    return (
      <span title={params.formula} style={{ color: C_PRIMARY, fontStyle: "italic" }}>
        {params.value ?? ""}
      </span>
    );
  }
  return <span>{params.value ?? ""}</span>;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SpreadsheetGrid({ data, onHeaderChange, gridRef, fileKey }: SpreadsheetGridProps) {
  const gridApiRef = useRef<GridApi | null>(null);
  const formulasRef = useRef<(string | null)[][]>(data.formulas ?? []);

  // Keep formulas ref in sync when data changes
  useEffect(() => {
    formulasRef.current = data.formulas ?? [];
  }, [data.formulas]);

  const rowData = useMemo(() => rowsToObjects(data.rows), [data.rows]);

  const columnDefs = useMemo<ColDef[]>(() => {
    return data.headers.map((header, colIdx) => ({
      field: `c${colIdx}`,
      headerName: header || `Col ${colIdx + 1}`,
      editable: true,
      flex: 1,
      minWidth: 80,
      cellRenderer: FormulaCellRenderer,
      cellRendererParams: (params: ICellRendererParams) => ({
        formula: formulasRef.current[params.node.rowIndex ?? 0]?.[colIdx] ?? undefined,
      }),
    }));
  }, [data.headers]);

  // Expose getData to parent — same contract as the old Handsontable version
  useEffect(() => {
    gridRef.current = (): ParsedData => {
      if (!gridApiRef.current) return data;
      const rows: (string | number | null)[][] = [];
      gridApiRef.current.forEachNode((node) => {
        rows.push(data.headers.map((_, ci) => node.data[`c${ci}`] ?? null));
      });
      return { headers: data.headers, rows, formulas: formulasRef.current };
    };
  });

  return (
    <div>
      {/* Column header editors */}
      <div style={{ marginBottom: "6px" }}>
        <div
          style={{
            fontSize: "10px",
            fontWeight: 600,
            color: "hsl(245 16% 49%)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: "6px",
          }}
        >
          Column Headers
        </div>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {data.headers.map((h, i) => (
            <input
              key={i}
              value={h}
              onChange={(e) => onHeaderChange(i, e.target.value)}
              placeholder={`Col ${i + 1}`}
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "hsl(245 57% 33%)",
                backgroundColor: "rgba(47,36,133,0.06)",
                border: `1px solid rgba(47,36,133,0.18)`,
                borderRadius: "5px",
                padding: "4px 8px",
                outline: "none",
                minWidth: "80px",
                maxWidth: "140px",
                flex: "1 1 80px",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = C_PRIMARY)}
              onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(47,36,133,0.18)")}
            />
          ))}
        </div>
      </div>

      {/* AG Grid */}
      <div
        className="ag-theme-alpine"
        style={{
          height: 260,
          border: `1px solid ${C_BORDER}`,
          borderRadius: "10px",
          overflow: "hidden",
        }}
      >
        <AgGridReact
          key={fileKey}
          rowData={rowData}
          columnDefs={columnDefs}
          onGridReady={(params) => { gridApiRef.current = params.api; }}
          suppressRowClickSelection={true}
          domLayout="normal"
        />
      </div>

      <div style={{ fontSize: "10px", color: "hsl(245 16% 60%)", marginTop: "5px" }}>
        Formula cells shown in{" "}
        <span style={{ color: C_PRIMARY, fontStyle: "italic" }}>purple italic</span>. Hover for formula. Edit column names above.
      </div>
    </div>
  );
}
