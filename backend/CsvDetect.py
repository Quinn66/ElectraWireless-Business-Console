"""
CsvDetect — anomaly detection for uploaded spreadsheet data.

Original implementation by Quinn (csvdetect branch).
Adapted to accept a cell map from the frontend instead of a hardcoded CSV,
and to return flagged cell IDs instead of raw row indices.
"""

import pandas as pd
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


# ── DataFrame reconstruction ──────────────────────────────────────────────────

def cell_map_to_dataframe(cell_map: dict, sheet_index: int):
    """
    Reconstruct a pandas DataFrame from the frontend cell map for one sheet.
    Row 0 of the sheet is treated as the header row.
    Returns (df, header_row_offset) where header_row_offset=1 means data starts at rowIndex 1.
    """
    # Filter to the requested sheet
    sheet_cells = {k: v for k, v in cell_map.items() if v.get("sheetIndex") == sheet_index}
    if not sheet_cells:
        return None, 1

    max_row = max(v["rowIndex"] for v in sheet_cells.values())
    max_col = max(v["colIndex"] for v in sheet_cells.values())

    # Build 2-D grid
    grid = [[None] * (max_col + 1) for _ in range(max_row + 1)]
    for entry in sheet_cells.values():
        grid[entry["rowIndex"]][entry["colIndex"]] = entry["value"]

    if not grid:
        return None, 1

    # Row 0 → headers
    raw_headers = grid[0]
    headers = [str(h) if h is not None else f"Col{i}" for i, h in enumerate(raw_headers)]
    data_rows = grid[1:]

    df = pd.DataFrame(data_rows, columns=headers)

    # Coerce numeric columns
    for col in df.columns:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    return df, 1  # data starts at rowIndex 1


# ── Anomaly detection ─────────────────────────────────────────────────────────

def detect_anomalies(cell_map: dict, sheet_index: int = 0) -> dict:
    """
    Run IsolationForest anomaly detection + RandomForestRegressor prediction
    on numeric columns of the specified sheet.

    Returns a dict with:
      - anomalies: list of flagged cells with cell IDs and predicted values
      - totalAnomalies: int
      - columnsAnalyzed: list of column names that were processed
    """
    df, data_row_offset = cell_map_to_dataframe(cell_map, sheet_index)

    if df is None or df.empty:
        return {"anomalies": [], "totalAnomalies": 0, "columnsAnalyzed": []}

    # Only work with numeric columns that have enough data
    exclude = {"row id", "postal code", "id"}
    numeric_cols = [
        col for col in df.select_dtypes(include=["number"]).columns
        if col.lower() not in exclude
    ]

    results = []
    columns_analyzed = []

    for target_col in numeric_cols:
        col_idx = df.columns.get_loc(target_col)

        # ── Flag blank / empty cells first ───────────────────────────────────
        blank_mask = df[target_col].isnull()
        for df_row_idx in df.index[blank_mask]:
            sheet_row_index = int(df_row_idx) + data_row_offset
            results.append({
                "cellId":         to_cell_id(sheet_index, sheet_row_index, col_idx),
                "column":         target_col,
                "rowIndex":       sheet_row_index,
                "colIndex":       col_idx,
                "originalValue":  None,
                "predictedValue": None,
                "difference":     None,
                "severity":       "high",
                "reason":         "missing",
            })

        col_data = df[[target_col]].dropna()
        if len(col_data) < 5:
            continue

        columns_analyzed.append(target_col)

        # Detect anomalies with IsolationForest (Quinn's approach)
        iso = IsolationForest(contamination=0.1, random_state=1)
        preds = iso.fit_predict(col_data)
        anomaly_idx = col_data.index[preds == -1]
        normal_idx  = col_data.index[preds == 1]

        if len(anomaly_idx) == 0:
            continue

        # Train RandomForest on normal rows to predict expected values.
        # Fall back to column mean when no other numeric features exist.
        feature_cols = [c for c in numeric_cols if c != target_col]

        col_idx = df.columns.get_loc(target_col)

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
                # Only one numeric column — use mean of normal rows as baseline
                predicted = round(float(df.loc[normal_idx, target_col].mean()), 2)

            diff = round(abs(original - predicted), 2)

            # Severity based on relative difference
            pct = (diff / abs(predicted) * 100) if predicted != 0 else 100
            severity = "high" if pct > 50 else "medium" if pct > 20 else "low"

            # df_row_idx is 0-based within data rows; add offset for sheet row index
            sheet_row_index = int(df_row_idx) + data_row_offset

            results.append({
                "cellId":         to_cell_id(sheet_index, sheet_row_index, col_idx),
                "column":         target_col,
                "rowIndex":       sheet_row_index,
                "colIndex":       col_idx,
                "originalValue":  original,
                "predictedValue": predicted,
                "difference":     diff,
                "severity":       severity,
                "reason":         "outlier",
            })

    # Sort by severity then difference descending
    severity_order = {"high": 0, "medium": 1, "low": 2}
    results.sort(key=lambda x: (severity_order[x["severity"]], -(x["difference"] or 0)))

    return {
        "anomalies":       results,
        "totalAnomalies":  len(results),
        "columnsAnalyzed": columns_analyzed,
    }
