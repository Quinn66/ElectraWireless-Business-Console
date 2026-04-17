import { create } from "zustand";
import HyperFormula from "hyperformula";
import type { SheetData, WorkbookData, ExtractedValues } from "@/lib/importUtils";
import { buildCellMap } from "@/lib/cellMap";
import type { CellMap } from "@/lib/cellMap";
import { buildEngine, readSheet } from "@/lib/formulaEngine";

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
  /** HyperFormula instance — owns formula evaluation and dependency tracking. */
  hfEngine: HyperFormula | null;

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
  hfEngine: null,

  openWorkbook: (wb, onApplied) => {
    const engine = buildEngine(wb.sheets);

    // Replace raw values with HyperFormula-computed values so formulas
    // render correctly the moment the file opens.
    const sheets = wb.sheets.map((sheet, si) => {
      const sheetId = engine.getSheetId(sheet.name);
      if (sheetId === undefined) return sheet;
      const cols = sheet.rows.reduce((m, r) => Math.max(m, r.length), 0);
      const computedRows = readSheet(engine, sheetId, sheet.rows.length, cols);
      return { ...sheet, rows: computedRows };
    });

    set({
      isOpen: true,
      fileName: wb.fileName,
      sheets,
      activeSheetIndex: 0,
      selectedCell: null,
      cellMap: buildCellMap(sheets),
      onApplied: onApplied ?? null,
      hfEngine: engine,
    });
  },

  close: () =>
    set((state) => {
      state.hfEngine?.destroy();
      return {
        isOpen: false,
        fileName: "",
        sheets: [],
        activeSheetIndex: 0,
        selectedCell: null,
        cellMap: {},
        onApplied: null,
        hfEngine: null,
      };
    }),

  setActiveSheet: (index) => set({ activeSheetIndex: index, selectedCell: null }),

  setSelectedCell: (cell) => set({ selectedCell: cell }),

  updateCell: (sheetIndex, rowIndex, colIndex, value, formula) =>
    set((state) => {
      const sheet = state.sheets[sheetIndex];
      if (!sheet) return state;

      // Update HyperFormula — it handles dependency propagation automatically.
      if (state.hfEngine) {
        const sheetId = state.hfEngine.getSheetId(sheet.name);
        if (sheetId !== undefined) {
          state.hfEngine.setCellContents(
            { sheet: sheetId, row: rowIndex, col: colIndex },
            formula ?? value
          );
        }
      }

      // Read back all computed values for this sheet (dependents included).
      const cols = sheet.rows.reduce((m, r) => Math.max(m, r.length), 0);
      const computedRows = state.hfEngine
        ? (() => {
            const sheetId = state.hfEngine.getSheetId(sheet.name);
            return sheetId !== undefined
              ? readSheet(state.hfEngine, sheetId, sheet.rows.length, cols)
              : sheet.rows;
          })()
        : sheet.rows.map((row, ri) => {
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

      const sheets = state.sheets.map((s, si) =>
        si !== sheetIndex ? s : { ...s, rows: computedRows, formulas }
      );

      return { sheets, cellMap: buildCellMap(sheets) };
    }),
}));
