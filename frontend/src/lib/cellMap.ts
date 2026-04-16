import type { SheetData } from "@/lib/importUtils";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CellEntry {
  cellId: string;
  sheetIndex: number;
  rowIndex: number;
  colIndex: number;
  value: string | number | null;
  formula: string | null;
}

/** Flat lookup: cellId → CellEntry */
export type CellMap = Record<string, CellEntry>;

// ── ID utilities ──────────────────────────────────────────────────────────────

/** Convert a 0-based column index to an Excel-style letter (0 → "A", 25 → "Z", 26 → "AA") */
export function colIndexToLetter(index: number): string {
  let result = "";
  let n = index + 1;
  while (n > 0) {
    result = String.fromCharCode(65 + ((n - 1) % 26)) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
}

/** Convert an Excel-style column letter to a 0-based index ("A" → 0, "AA" → 26) */
export function colLetterToIndex(letter: string): number {
  let result = 0;
  for (const ch of letter.toUpperCase()) {
    result = result * 26 + (ch.charCodeAt(0) - 64);
  }
  return result - 1;
}

/**
 * Build a stable cell ID.
 * Format: S{sheetNumber}_{colLetter}{rowNumber}   e.g. "S1_B3"
 * Both sheetNumber and rowNumber are 1-based.
 */
export function toCellId(sheetIndex: number, rowIndex: number, colIndex: number): string {
  return `S${sheetIndex + 1}_${colIndexToLetter(colIndex)}${rowIndex + 1}`;
}

/**
 * Parse a cell ID back into its components.
 * Returns null if the string is not a valid cell ID.
 */
export function parseCellId(cellId: string): { sheetIndex: number; rowIndex: number; colIndex: number } | null {
  const m = cellId.match(/^S(\d+)_([A-Z]+)(\d+)$/i);
  if (!m) return null;
  return {
    sheetIndex: parseInt(m[1]) - 1,
    colIndex:   colLetterToIndex(m[2]),
    rowIndex:   parseInt(m[3]) - 1,
  };
}

// ── Builder ───────────────────────────────────────────────────────────────────

/**
 * Build a complete flat CellMap from all sheets.
 * Called on workbook open and after every cell edit.
 */
export function buildCellMap(sheets: SheetData[]): CellMap {
  const map: CellMap = {};
  sheets.forEach((sheet, si) => {
    sheet.rows.forEach((row, ri) => {
      row.forEach((value, ci) => {
        const cellId = toCellId(si, ri, ci);
        map[cellId] = {
          cellId,
          sheetIndex: si,
          rowIndex:   ri,
          colIndex:   ci,
          value:      value ?? null,
          formula:    sheet.formulas[ri]?.[ci] ?? null,
        };
      });
    });
  });
  return map;
}
