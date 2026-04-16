import { create } from "zustand";
import type { SheetData, WorkbookData, ExtractedValues } from "@/lib/importUtils";
import { buildCellMap } from "@/lib/cellMap";
import type { CellMap } from "@/lib/cellMap";

export interface SelectedCell {
  rowIndex: number;
  colIndex: number;
}

interface SpreadsheetState {
  isOpen: boolean;
  fileName: string;
  sheets: SheetData[];
  activeSheetIndex: number;
  selectedCell: SelectedCell | null;
  /** Flat lookup: cellId → CellEntry. Rebuilt on open and after every edit. */
  cellMap: CellMap;
  /** Optional callback fired when user clicks Apply to Dashboard */
  onApplied: ((values: ExtractedValues) => void) | null;

  openWorkbook: (wb: WorkbookData, onApplied?: (values: ExtractedValues) => void) => void;
  close: () => void;
  setActiveSheet: (index: number) => void;
  setSelectedCell: (cell: SelectedCell | null) => void;
  updateCell: (
    sheetIndex: number,
    rowIndex: number,
    colIndex: number,
    value: string | number | null,
    formula?: string | null
  ) => void;
}

export const useSpreadsheetStore = create<SpreadsheetState>((set) => ({
  isOpen: false,
  fileName: "",
  sheets: [],
  activeSheetIndex: 0,
  selectedCell: null,
  cellMap: {},
  onApplied: null,

  openWorkbook: (wb, onApplied) =>
    set({
      isOpen: true,
      fileName: wb.fileName,
      sheets: wb.sheets,
      activeSheetIndex: 0,
      selectedCell: null,
      cellMap: buildCellMap(wb.sheets),
      onApplied: onApplied ?? null,
    }),

  close: () =>
    set({ isOpen: false, fileName: "", sheets: [], activeSheetIndex: 0, selectedCell: null, cellMap: {}, onApplied: null }),

  setActiveSheet: (index) => set({ activeSheetIndex: index, selectedCell: null }),

  setSelectedCell: (cell) => set({ selectedCell: cell }),

  updateCell: (sheetIndex, rowIndex, colIndex, value, formula) =>
    set((state) => {
      const sheets = state.sheets.map((sheet, si) => {
        if (si !== sheetIndex) return sheet;
        const rows = sheet.rows.map((row, ri) => {
          if (ri !== rowIndex) return row;
          const next = [...row];
          next[colIndex] = value;
          return next;
        });
        const formulas = sheet.formulas.map((fRow, ri) => {
          if (ri !== rowIndex) return fRow;
          const next = [...fRow];
          next[colIndex] = formula ?? null;
          return next;
        });
        return { ...sheet, rows, formulas };
      });
      return { sheets, cellMap: buildCellMap(sheets) };
    }),
}));
