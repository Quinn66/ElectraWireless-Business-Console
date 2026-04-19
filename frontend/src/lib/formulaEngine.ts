import HyperFormula from 'hyperformula';
import type { SheetData } from './importUtils';

type RawCell = string | number | boolean | null;

function sheetToRaw(sheet: SheetData): RawCell[][] {
  return sheet.rows.map((row, ri) =>
    row.map((val, ci) => sheet.formulas[ri]?.[ci] ?? val ?? null)
  );
}

/** Build a HyperFormula instance from all sheets in the workbook. */
export function buildEngine(sheets: SheetData[]): HyperFormula {
  const named: Record<string, RawCell[][]> = {};
  sheets.forEach(s => { named[s.name] = sheetToRaw(s); });
  return HyperFormula.buildFromSheets(named, { licenseKey: 'gpl-v3' });
}

/**
 * Read back all computed cell values for one sheet from HyperFormula.
 * Called after every cell edit so dependents cascade automatically.
 */
export function readSheet(
  hf: HyperFormula,
  sheetId: number,
  rowCount: number,
  colCount: number,
): (string | number | null)[][] {
  const result: (string | number | null)[][] = [];
  for (let r = 0; r < rowCount; r++) {
    const row: (string | number | null)[] = [];
    for (let c = 0; c < colCount; c++) {
      const val = hf.getCellValue({ sheet: sheetId, row: r, col: c });
      row.push(typeof val === 'string' || typeof val === 'number' ? val : null);
    }
    result.push(row);
  }
  return result;
}
