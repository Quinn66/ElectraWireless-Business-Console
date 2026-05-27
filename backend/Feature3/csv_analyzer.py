import pandas as pd
import json
import numpy as np
import yfinance as yf

OUTPUT_FILE = "ydata/csv_analysis_output.json"

TEST_TICKERS = ["AMD", "NVDA"]


# ================= CORE ANALYSIS =================
def analyze_ticker(symbol: str) -> dict | None:
    try:
        ticker = yf.Ticker(symbol)

        # ================= PRICE HISTORY =================
        df = ticker.history(period="6mo", auto_adjust=True)

        if df.empty:
            print(f"❌ No data for {symbol}")
            return None

        close = df["Close"].dropna()

        if len(close) < 2:
            print(f"❌ Not enough data for {symbol}")
            return None

        start = float(close.iloc[0])
        end = float(close.iloc[-1])

        change_abs = end - start
        change_pct = (change_abs / start) * 100

        # ================= VOLATILITY =================
        daily_returns = close.pct_change().dropna()
        volatility_pct = (
            float(daily_returns.std() * np.sqrt(252) * 100)
            if not daily_returns.empty
            else None
        )

        # ================= PRICE RANGE =================
        high = float(close.max())
        low = float(close.min())

        # ================= FUNDAMENTALS =================
        info = ticker.info or {}

        return {
            "ticker": symbol,

            # price movement
            "start_price": round(start, 2),
            "end_price": round(end, 2),
            "change_abs": round(change_abs, 2),
            "change_pct": round(change_pct, 2),

            # dataset info
            "data_points": int(len(close)),

            # risk / stats
            "volatility_pct": round(volatility_pct, 2) if volatility_pct else None,
            "fifty_two_week_high": high,
            "fifty_two_week_low": low,

            # fundamentals
            "market_cap": info.get("marketCap"),
            "pe_ratio": info.get("trailingPE"),
            "sector": info.get("sector"),
            "industry": info.get("industry"),
            "exchange": info.get("exchange"),
            "country": info.get("country"),

            # convenience
            "current_price": round(end, 2),
        }

    except Exception as e:
        print(f"[ERROR] {symbol}: {e}")
        return None


# ================= RUN FUNCTION =================
def run(tickers):
    results = []

    if not tickers:
        print("❌ No tickers provided")
        return []

    for symbol in tickers:
        data = analyze_ticker(symbol)

        if data:
            results.append(data)

    with open(OUTPUT_FILE, "w") as f:
        json.dump(results, f, indent=2)

    print(f"✅ Saved analysis → {OUTPUT_FILE}")

    return results


# ================= MANUAL TEST =================
if __name__ == "__main__":
    print("🧪 Running YFinance Analyzer Test...")

    output = run(TEST_TICKERS)

    print("\n📊 RESULTS:")
    print(json.dumps(output, indent=2))