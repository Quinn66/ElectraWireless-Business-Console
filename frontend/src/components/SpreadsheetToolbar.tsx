import { useRef } from "react";
import { useSpreadsheetStore } from "@/store/spreadsheetStore";
import type { CellStyle } from "@/lib/importUtils";
import { C_BORDER, C_PRIMARY } from "@/lib/colors";

// ── Shared button styles ──────────────────────────────────────────────────────

function ToolBtn({
  active,
  disabled,
  title,
  onClick,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 28,
        height: 26,
        borderRadius: 5,
        border: active ? `1.5px solid rgba(47,36,133,0.50)` : "1.5px solid transparent",
        background: active ? "rgba(47,36,133,0.10)" : "transparent",
        color: disabled ? "hsl(245 16% 75%)" : active ? C_PRIMARY : "hsl(242 44% 30%)",
        cursor: disabled ? "default" : "pointer",
        fontSize: 13,
        fontWeight: 700,
        transition: "all 0.1s",
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        if (!disabled && !active)
          (e.currentTarget as HTMLButtonElement).style.background = "rgba(47,36,133,0.06)";
      }}
      onMouseLeave={(e) => {
        if (!active)
          (e.currentTarget as HTMLButtonElement).style.background = "transparent";
      }}
    >
      {children}
    </button>
  );
}

function Divider() {
  return (
    <div style={{ width: 1, height: 18, background: C_BORDER, flexShrink: 0, margin: "0 4px" }} />
  );
}

// ── Colour swatch button backed by a hidden <input type="color"> ──────────────

function ColorBtn({
  title,
  color,
  disabled,
  swatchPos,
  onChange,
}: {
  title: string;
  color: string;
  disabled?: boolean;
  swatchPos: "top" | "bottom";
  onChange: (hex: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const displayColor = disabled ? "#e5e3f0" : color;

  return (
    <button
      title={title}
      disabled={disabled}
      onClick={() => inputRef.current?.click()}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: 28,
        height: 26,
        borderRadius: 5,
        border: "1.5px solid transparent",
        background: "transparent",
        cursor: disabled ? "default" : "pointer",
        gap: 2,
        padding: "2px 4px",
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        if (!disabled)
          (e.currentTarget as HTMLButtonElement).style.background = "rgba(47,36,133,0.06)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "transparent";
      }}
    >
      {swatchPos === "top" && (
        <div style={{ width: 14, height: 4, borderRadius: 1, background: displayColor, border: "1px solid rgba(0,0,0,0.12)", flexShrink: 0 }} />
      )}
      <svg width="11" height="11" viewBox="0 0 14 14" fill={disabled ? "hsl(245 16% 75%)" : "hsl(242 44% 30%)"}>
        {swatchPos === "bottom"
          ? <path d="M2 1h10l1 3H1L2 1zm0 4h10l2 6H0L2 5zm5 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
          : <path d="M7 1L1 10h12L7 1zm0 3l4 5H3l4-5z" />}
      </svg>
      {swatchPos === "bottom" && (
        <div style={{ width: 14, height: 4, borderRadius: 1, background: displayColor, border: "1px solid rgba(0,0,0,0.12)", flexShrink: 0 }} />
      )}
      <input
        ref={inputRef}
        type="color"
        value={color}
        style={{ position: "absolute", width: 0, height: 0, opacity: 0, pointerEvents: "none" }}
        onChange={(e) => onChange(e.target.value)}
      />
    </button>
  );
}

// ── Main toolbar ──────────────────────────────────────────────────────────────

export function SpreadsheetToolbar() {
  const { sheets, activeSheetIndex, selectedCell, updateCellStyle } = useSpreadsheetStore();

  const activeSheet = sheets[activeSheetIndex];
  const cs: CellStyle | null | undefined =
    selectedCell != null
      ? activeSheet?.styles?.[selectedCell.rowIndex]?.[selectedCell.colIndex]
      : null;

  const noCell = selectedCell == null;

  function apply(partial: Partial<CellStyle>) {
    if (selectedCell == null) return;
    updateCellStyle(activeSheetIndex, selectedCell.rowIndex, selectedCell.colIndex, partial);
  }

  return (
    <div
      style={{
        height: 36,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        gap: 2,
        padding: "0 10px",
        borderBottom: `1px solid ${C_BORDER}`,
        backgroundColor: "rgba(255,255,255,0.80)",
        overflowX: "auto",
      }}
    >
      {/* Bold */}
      <ToolBtn title="Bold" active={!!cs?.bold} disabled={noCell} onClick={() => apply({ bold: !cs?.bold })}>
        B
      </ToolBtn>

      {/* Italic */}
      <ToolBtn title="Italic" active={!!cs?.italic} disabled={noCell} onClick={() => apply({ italic: !cs?.italic })}>
        <span style={{ fontStyle: "italic" }}>I</span>
      </ToolBtn>

      <Divider />

      {/* Fill colour */}
      <ColorBtn
        title="Fill colour"
        color={cs?.bgColor ?? "#ffffff"}
        disabled={noCell}
        swatchPos="bottom"
        onChange={(hex) => apply({ bgColor: hex })}
      />

      {/* Font colour */}
      <ColorBtn
        title="Font colour"
        color={cs?.fontColor ?? "#000000"}
        disabled={noCell}
        swatchPos="top"
        onChange={(hex) => apply({ fontColor: hex })}
      />

      <Divider />

      {/* Align left */}
      <ToolBtn
        title="Align left"
        active={cs?.hAlign === "left"}
        disabled={noCell}
        onClick={() => apply({ hAlign: "left" })}
      >
        <svg width="13" height="11" viewBox="0 0 13 11" fill="currentColor">
          <rect x="0" y="0" width="13" height="2" rx="1" />
          <rect x="0" y="4" width="9" height="2" rx="1" />
          <rect x="0" y="8" width="11" height="2" rx="1" />
        </svg>
      </ToolBtn>

      {/* Align centre */}
      <ToolBtn
        title="Align centre"
        active={cs?.hAlign === "center"}
        disabled={noCell}
        onClick={() => apply({ hAlign: "center" })}
      >
        <svg width="13" height="11" viewBox="0 0 13 11" fill="currentColor">
          <rect x="0" y="0" width="13" height="2" rx="1" />
          <rect x="2" y="4" width="9" height="2" rx="1" />
          <rect x="1" y="8" width="11" height="2" rx="1" />
        </svg>
      </ToolBtn>

      {/* Align right */}
      <ToolBtn
        title="Align right"
        active={cs?.hAlign === "right"}
        disabled={noCell}
        onClick={() => apply({ hAlign: "right" })}
      >
        <svg width="13" height="11" viewBox="0 0 13 11" fill="currentColor">
          <rect x="0" y="0" width="13" height="2" rx="1" />
          <rect x="4" y="4" width="9" height="2" rx="1" />
          <rect x="2" y="8" width="11" height="2" rx="1" />
        </svg>
      </ToolBtn>

      <Divider />

      {/* Clear formatting */}
      <ToolBtn
        title="Clear formatting"
        disabled={noCell || !cs}
        onClick={() => apply({ bgColor: undefined, fontColor: undefined, bold: undefined, italic: undefined, hAlign: undefined })}
      >
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M3 11L11 3M8 2l3 3-6 6H2v-3l6-6z" />
        </svg>
      </ToolBtn>

      {/* Right side: hint when no cell selected */}
      {noCell && (
        <span style={{ marginLeft: "auto", fontSize: 11, color: "hsl(245 16% 65%)", whiteSpace: "nowrap", paddingRight: 4 }}>
          Select a cell to format
        </span>
      )}
    </div>
  );
}
