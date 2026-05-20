import pandas as pd
import json
import os

OUTPUT_FILE = "ydata/csv_analysis_output.json"

TEST_FILE_PATHS = [
    r"ydata\AMD_6mo.csv",
    r"ydata\NVDA_6mo.csv"
]
# ================= CORE ANALYSIS =================
def analyze_csv(path):
    # ================= READ WITH 2-ROW HEADER FIX =================
    df = pd.read_csv(path, skiprows=[1])

    # ================= FIX COLUMN NAMES =================
    df.columns = [str(c).strip() for c in df.columns]

    # first column is actually DATE (not "Price")
    df = df.rename(columns={df.columns[0]: "Date"})

    # ================= PARSE DATE SAFELY =================
    df["Date"] = pd.to_datetime(df["Date"], errors="coerce")
    df = df.dropna(subset=["Date"])

    # ================= ENSURE CLOSE IS NUMERIC =================
    if "Close" not in df.columns:
        print(f"❌ Missing Close column in {path}")
        return None

    close = pd.to_numeric(df["Close"], errors="coerce").dropna()

    if len(close) < 2:
        print(f"❌ Not enough valid Close data in {path}")
        return None

    start = float(close.iloc[0])
    end = float(close.iloc[-1])

    return {
        "ticker": os.path.basename(path).replace("_6mo.csv", ""),
        "start_price": start,
        "end_price": end,
        "change_abs": end - start,
        "change_pct": ((end - start) / start) * 100,
        "data_points": int(len(close))
    }


# ================= NEW RUN FUNCTION (NO DIRECTORY LOGIC) =================
def run(file_paths):
    """
    Expects a LIST of full CSV file paths
    Example:
    [
        "ydata/AMD_6mo.csv",
        "ydata/NVDA_6mo.csv"
    ]
    """

    results = []

    if not file_paths:
        print("❌ No files provided")
        return []

    for path in file_paths:

        if not os.path.exists(path):
            print(f"❌ File not found: {path}")
            continue

        data = analyze_csv(path)

        if data:
            results.append(data)

    with open(OUTPUT_FILE, "w") as f:
        json.dump(results, f, indent=2)

    print(f"✅ Saved analysis → {OUTPUT_FILE}")

    return results


# ================= MANUAL TEST =================
if __name__ == "__main__":

    print("🧪 Running CSV Analyzer Test...")

    output = run(TEST_FILE_PATHS)

    print("\n📊 RESULTS:")
    print(json.dumps(output, indent=2))