"""
CsvDetect — anomaly detection for uploaded spreadsheet data.

Original implementation by Quinn (csvdetect branch).
Adapted to accept a cell map from the frontend instead of a hardcoded CSV,
and to return flagged cell IDs instead of raw row indices.
"""

import pandas as pd
from collections import deque
from sklearn.ensemble import IsolationForest, RandomForestRegressor


# ── Cell ID helpers ───────────────────────────────────────────────────────────

def col_index_to_letter(index: int) -> str:
    result = ""
    n = index + 1
    while n > 0:
        result = chr(65 + (n - 1) % 26) + result
        n = (n - 1) // 26
    return result


def to_cell_id(sheet_index: int, row_index: int, col_index: int) -> str:
    """Mirrors the frontend toCellId — e.g. (0, 2, 1) → 'S1_B3'"""
    return f"S{sheet_index + 1}_{col_index_to_letter(col_index)}{row_index + 1}"


# ── Grid construction ─────────────────────────────────────────────────────────

def _build_grid(cell_map: dict, sheet_index: int) -> list:
    """Build a 2-D grid from cell_map for a single sheet."""
    sheet_cells = {k: v for k, v in cell_map.items() if v.get("sheetIndex") == sheet_index}
    if not sheet_cells:
        return []

    max_row = max(v["rowIndex"] for v in sheet_cells.values())
    max_col = max(v["colIndex"] for v in sheet_cells.values())

    grid = [[None] * (max_col + 1) for _ in range(max_row + 1)]
    for entry in sheet_cells.values():
        grid[entry["rowIndex"]][entry["colIndex"]] = entry["value"]

    return grid


# ── Region detection ──────────────────────────────────────────────────────────

def _find_data_regions(grid: list) -> list:
    """
    BFS flood-fill over non-empty cells to find contiguous data regions.
    Returns list of (min_row, max_row, min_col, max_col) bounding boxes.
    Empty cells between or below tables are outside every bounding box and
    will never be flagged as missing values.
    """
    rows = len(grid)
    cols = len(grid[0]) if rows > 0 else 0
    visited = [[False] * cols for _ in range(rows)]
    regions = []

    for start_r in range(rows):
        for start_c in range(cols):
            if grid[start_r][start_c] is not None and not visited[start_r][start_c]:
                queue = deque([(start_r, start_c)])
                visited[start_r][start_c] = True
                min_r = max_r = start_r
                min_c = max_c = start_c

                while queue:
                    r, c = queue.popleft()
                    min_r, max_r = min(min_r, r), max(max_r, r)
                    min_c, max_c = min(min_c, c), max(max_c, c)
                    for dr, dc in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                        nr, nc = r + dr, c + dc
                        if (0 <= nr < rows and 0 <= nc < cols
                                and not visited[nr][nc]
                                and grid[nr][nc] is not None):
                            visited[nr][nc] = True
                            queue.append((nr, nc))

                regions.append((min_r, max_r, min_c, max_c))

    return regions


# ── DataFrame reconstruction ──────────────────────────────────────────────────

def _region_to_dataframe(grid: list, min_row: int, max_row: int, min_col: int, max_col: int):
    """
    Extract a sub-DataFrame from grid[min_row:max_row+1][min_col:max_col+1].
    The first row of the region is treated as the header.
    Returns (df, data_start_row) where data_start_row is the sheet row index
    of the first data row (i.e. min_row + 1).
    """
    sub = [row[min_col:max_col + 1] for row in grid[min_row:max_row + 1]]
    if not sub or len(sub) < 2:
        return None, min_row + 1

    raw_headers = sub[0]
    headers = [str(h) if h is not None else f"Col{min_col + i}" for i, h in enumerate(raw_headers)]
    data_rows = sub[1:]

    df = pd.DataFrame(data_rows, columns=headers)
    for col in df.columns:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    return df, min_row + 1  # data starts one row below the header in sheet coordinates


def cell_map_to_dataframe(cell_map: dict, sheet_index: int):
    """
    Reconstruct a pandas DataFrame from the frontend cell map for one sheet.
    Row 0 of the sheet is treated as the header row.
    Returns (df, header_row_offset) where header_row_offset=1 means data starts at rowIndex 1.
    """
    grid = _build_grid(cell_map, sheet_index)
    if not grid:
        return None, 1

    raw_headers = grid[0]
    headers = [str(h) if h is not None else f"Col{i}" for i, h in enumerate(raw_headers)]
    data_rows = grid[1:]

    df = pd.DataFrame(data_rows, columns=headers)
    for col in df.columns:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    return df, 1


# ── Anomaly detection ─────────────────────────────────────────────────────────

def detect_anomalies(cell_map: dict, sheet_index: int = 0) -> dict:
    """
    Run IsolationForest anomaly detection + RandomForestRegressor prediction
    on numeric columns of the specified sheet.

    Contiguous region detection ensures that empty cells between separate tables
    or below the data area are never flagged as missing values — only empty cells
    that fall within the bounding box of an identified data region are checked.

    Returns a dict with:
      - anomalies: list of flagged cells with cell IDs and predicted values
      - totalAnomalies: int
      - columnsAnalyzed: list of column names that were processed
    """
    grid = _build_grid(cell_map, sheet_index)
    if not grid:
        return {"anomalies": [], "totalAnomalies": 0, "columnsAnalyzed": []}

    regions = _find_data_regions(grid)
    if not regions:
        return {"anomalies": [], "totalAnomalies": 0, "columnsAnalyzed": []}

    all_results = []
    columns_analyzed = set()
    exclude = {"row id", "postal code", "id"}

    for min_row, max_row, min_col, max_col in regions:
        df, data_start_row = _region_to_dataframe(grid, min_row, max_row, min_col, max_col)

        if df is None or df.empty:
            continue

        numeric_cols = [
            col for col in df.select_dtypes(include=["number"]).columns
            if col.lower() not in exclude
        ]

        for target_col in numeric_cols:
            # Map region-local column position back to sheet column index
            region_col_pos = df.columns.get_loc(target_col)
            sheet_col_idx = min_col + region_col_pos

            # ── Flag blank cells within this region's bounding box only ───────
            blank_mask = df[target_col].isnull()
            for df_row_idx in df.index[blank_mask]:
                sheet_row_index = int(df_row_idx) + data_start_row
                all_results.append({
                    "cellId":         to_cell_id(sheet_index, sheet_row_index, sheet_col_idx),
                    "column":         target_col,
                    "rowIndex":       sheet_row_index,
                    "colIndex":       sheet_col_idx,
                    "originalValue":  None,
                    "predictedValue": None,
                    "difference":     None,
                    "severity":       "high",
                    "reason":         "missing",
                })

            col_data = df[[target_col]].dropna()
            if len(col_data) < 5:
                continue

            columns_analyzed.add(target_col)

            # Detect anomalies with IsolationForest (Quinn's approach)
            iso = IsolationForest(contamination=0.1, random_state=1)
            preds = iso.fit_predict(col_data)
            anomaly_idx = col_data.index[preds == -1]
            normal_idx  = col_data.index[preds == 1]

            if len(anomaly_idx) == 0:
                continue

            feature_cols = [c for c in numeric_cols if c != target_col]

            for df_row_idx in anomaly_idx:
                original = float(df.at[df_row_idx, target_col])

                if feature_cols:
                    train_df = df.loc[normal_idx, feature_cols + [target_col]].dropna()
                    if len(train_df) >= 5:
                        rf = RandomForestRegressor(n_estimators=100, random_state=1)
                        rf.fit(train_df[feature_cols], train_df[target_col])
                        row_features = df.loc[df_row_idx, feature_cols]
                        if row_features.isnull().any():
                            predicted = round(float(df.loc[normal_idx, target_col].mean()), 2)
                        else:
                            predicted = round(float(rf.predict(row_features.to_frame().T)[0]), 2)
                    else:
                        predicted = round(float(df.loc[normal_idx, target_col].mean()), 2)
                else:
                    predicted = round(float(df.loc[normal_idx, target_col].mean()), 2)

                diff = round(abs(original - predicted), 2)
                pct = (diff / abs(predicted) * 100) if predicted != 0 else 100
                severity = "high" if pct > 50 else "medium" if pct > 20 else "low"

                sheet_row_index = int(df_row_idx) + data_start_row

                all_results.append({
                    "cellId":         to_cell_id(sheet_index, sheet_row_index, sheet_col_idx),
                    "column":         target_col,
                    "rowIndex":       sheet_row_index,
                    "colIndex":       sheet_col_idx,
                    "originalValue":  original,
                    "predictedValue": predicted,
                    "difference":     diff,
                    "severity":       severity,
                    "reason":         "outlier",
                })

    severity_order = {"high": 0, "medium": 1, "low": 2}
    all_results.sort(key=lambda x: (severity_order[x["severity"]], -(x["difference"] or 0)))

    return {
        "anomalies":       all_results,
        "totalAnomalies":  len(all_results),
        "columnsAnalyzed": list(columns_analyzed),
    }
