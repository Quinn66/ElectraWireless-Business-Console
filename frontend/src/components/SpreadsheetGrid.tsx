import { useRef, useEffect } from "react";
import { HotTable } from "@handsontable/react";
import { registerAllModules } from "handsontable/registry";
import "handsontable/styles/handsontable.css";
import "handsontable/styles/ht-theme-main.css";
import type { ParsedData } from "@/lib/importUtils";
import { C_PRIMARY, C_BORDER } from "@/lib/colors";

registerAllModules();

interface SpreadsheetGridProps {
  data: ParsedData;
  onHeaderChange: (index: number, value: string) => void;
  /** Call this ref getter when you need the current grid data for extraction */
  gridRef: React.MutableRefObject<(() => ParsedData) | null>;
  fileKey: string;
}

export function SpreadsheetGrid({ data, onHeaderChange, gridRef, fileKey }: SpreadsheetGridProps) {
  const hotRef = useRef<any>(null);

  // Expose a getData function to the parent via gridRef
  useEffect(() => {
    gridRef.current = () => {
      if (hotRef.current?.hotInstance) {
        const hot = hotRef.current.hotInstance;
        const rows = (hot.getData() as (string | number | null)[][]).filter((r) =>
          r.some((c) => c !== null && c !== "")
        );
        return { headers: data.headers, rows };
      }
      return data;
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

      {/* Handsontable grid */}
      <div
        className="ht-theme-main"
        style={{
          border: `1px solid ${C_BORDER}`,
          borderRadius: "10px",
          overflow: "hidden",
        }}
      >
        <HotTable
          key={fileKey}
          ref={hotRef}
          data={data.rows.map((r) => [...r])}
          colHeaders={data.headers.map((h, i) => h || `Col ${i + 1}`)}
          rowHeaders={true}
          height={260}
          stretchH="all"
          contextMenu={true}
          manualColumnResize={true}
          manualRowResize={true}
          minSpareRows={1}
          fillHandle={true}
          undo={true}
          outsideClickDeselects={false}
          licenseKey="non-commercial-and-evaluation"
          tableClassName="htSpreadsheet"
        />
      </div>
      <div
        style={{
          fontSize: "10px",
          color: "hsl(245 16% 60%)",
          marginTop: "5px",
        }}
      >
        Right-click for insert/delete row options. Edit column names above.
      </div>
    </div>
  );
}
