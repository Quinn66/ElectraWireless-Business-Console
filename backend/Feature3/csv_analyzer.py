import pandas as pd
import json
import numpy as np
import yfinance as yf
from prophet import Prophet
import os

OUTPUT_FILE = "ydata/csv_analysis_output.json"
OUTPUT_FILE_PROPHET = "ydata/csv_prediction_output_analysis.json"
TEST_TICKERS = ["AMD", "NVDA"]

def project_investment_prophet(symbol: str, amount: float, years: float) -> dict | None:
    try:
        ticker = yf.Ticker(symbol)
        df = ticker.history(period="2y", auto_adjust=True)

        if df.empty or len(df) < 30:
            return None

        data = df.reset_index()[["Date", "Close"]].rename(
            columns={"Date": "ds", "Close": "y"}
        )

        # FIX timezone issue
        data["ds"] = pd.to_datetime(data["ds"]).dt.tz_localize(None)

        model = Prophet(
            daily_seasonality=False,
            weekly_seasonality=True,
            yearly_seasonality=True
        )

        model.fit(data)

        future_days = int(years * 365)
        future = model.make_future_dataframe(periods=future_days)

        forecast = model.predict(future)

        current_price = float(data["y"].iloc[-1])
        projected_price = float(forecast["yhat"].iloc[-1])

        units = amount / current_price
        projected_value = units * projected_price

        result = {
            "symbol": symbol,
            "invested": round(amount, 2),
            "units_bought": round(units, 4),
            "current_price": round(current_price, 2),
            "projected_price": round(projected_price, 2),
            "projected_years": years,
            "projected_value": round(projected_value, 2),
            "projected_gain": round(projected_value - amount, 2),
            "projected_gain_pct": round(((projected_value - amount) / amount) * 100, 2),
            "model": "prophet"
        }

        # ================= SAVE ONLY TO PROPHET FILE =================
        os.makedirs(os.path.dirname(OUTPUT_FILE_PROPHET), exist_ok=True)

        try:
            with open(OUTPUT_FILE_PROPHET, "r") as f:
                existing = json.load(f)
        except:
            existing = []

        existing.append(result)

        with open(OUTPUT_FILE_PROPHET, "w") as f:
            json.dump(existing, f, indent=2)

        return result

    except Exception as e:
        print(f"[ERROR Prophet Projection {symbol}]: {e}")
        return None

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

            # convenience
            "current_price": round(end, 2),
        }

    except Exception as e:
        print(f"[ERROR] {symbol}: {e}")
        return None

def format_market_data(csv_analysis_data, csv_prediction_data):

    analysis_lines = []
    prediction_lines = []

    # ===== ANALYSIS =====
    for x in csv_analysis_data:
        analysis_lines.append(
            f"{x.get('ticker')} | "
            f"chg={x.get('change_pct')}% | "
            f"vol={x.get('volatility_pct')}% | "
            f"pe={x.get('pe_ratio')} | "
            f"mcap={x.get('market_cap')} | "
            f"price={x.get('current_price')}"
        )

    # ===== PREDICTIONS =====
    for p in csv_prediction_data:
        prediction_lines.append(
            f"{p.get('symbol')} | "
            f"gain={p.get('projected_gain_pct')}% | "
            f"proj={p.get('projected_price')} | "
            f"yrs={p.get('projected_years')} | "
            f"model={p.get('model')}"
        )

    market_analysis = (analysis_lines)
    market_predictions = (prediction_lines)

    return market_analysis, market_predictions




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

    # --- existing ticker analysis test ---
    output = run(TEST_TICKERS)

    print("\n📊 ANALYSIS RESULTS:")
    print(json.dumps(output, indent=2))

    # ================= PROPHET PROJECTION TEST =================
    print("\n🚀 Running Prophet Projection Test...")

    test_symbol = "NVDA"
    test_amount = 1000
    test_years = 3

    projection = project_investment_prophet(
        symbol=test_symbol,
        amount=test_amount,
        years=test_years
    )

    print("\n📈 PROJECTION RESULT:")
    print(json.dumps(projection, indent=2))