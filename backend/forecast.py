import numpy as np
import pandas as pd
from pathlib import Path
from datetime import date

SAMPLE_DATA_PATH = Path(__file__).parent / "sample_data.csv"
PROPHET_DATA_PATH = Path(__file__).parent / "sample_data_prophet.csv"


def load_sample_data() -> list[dict]:
    df = pd.read_csv(SAMPLE_DATA_PATH)
    df["profit"] = df["revenue"] - df["expenses"]
    return df.to_dict(orient="records")


def load_prophet_historical() -> list[dict]:
    df = pd.read_csv(PROPHET_DATA_PATH)
    df["profit"] = df["revenue"] - df["expenses"]
    return df.to_dict(orient="records")


def _next_month_dates(last_ds: str, n: int) -> list[str]:
    """Returns n monthly date strings (YYYY-MM-DD) starting one month after last_ds."""
    last = pd.Timestamp(last_ds)
    dates = []
    for i in range(1, n + 1):
        next_date = last + pd.DateOffset(months=i)
        dates.append(next_date.strftime("%Y-%m-%d"))
    return dates


def run_prophet_forecast(months: int) -> list[dict]:
    """
    Runs Prophet on the historical CSV and returns a forecast.
    Falls back to linear trend extrapolation if Prophet is not installed.
    """
    df = pd.read_csv(PROPHET_DATA_PATH)
    last_ds = df["ds"].iloc[-1]
    future_dates = _next_month_dates(last_ds, months)

    try:
        from prophet import Prophet  # noqa: PLC0415

        prophet_df = df[["ds", "revenue"]].rename(columns={"revenue": "y"})
        prophet_df["ds"] = pd.to_datetime(prophet_df["ds"])

        model = Prophet(
            yearly_seasonality=True,
            weekly_seasonality=False,
            daily_seasonality=False,
            seasonality_mode="multiplicative",
        )
        model.fit(prophet_df)

        future = pd.DataFrame({"ds": pd.to_datetime(future_dates)})
        forecast = model.predict(future)

        return [
            {
                "ds": future_dates[i],
                "revenue": round(max(0, row["yhat"]), 2),
                "yhat_lower": round(max(0, row["yhat_lower"]), 2),
                "yhat_upper": round(row["yhat_upper"], 2),
            }
            for i, (_, row) in enumerate(forecast.iterrows())
        ]

    except ImportError:
        # Prophet not installed — use linear trend + hard-coded seasonality multipliers
        # derived from the two full years of historical data in the CSV.
        revenues = df["revenue"].values
        n = len(revenues)
        x = np.arange(n)
        slope, intercept = np.polyfit(x, revenues, 1)

        # Monthly seasonality factors computed from 2023–2024 data (indices 0-23)
        season_indices = list(range(min(24, n)))
        season_months = [pd.Timestamp(df["ds"].iloc[i]).month for i in season_indices]
        monthly_avg = {}
        for i, m in enumerate(season_months):
            monthly_avg.setdefault(m, []).append(revenues[i])
        overall_avg = revenues[season_indices].mean()
        season_factors = {
            m: (sum(v) / len(v)) / overall_avg for m, v in monthly_avg.items()
        }

        result = []
        for i, ds in enumerate(future_dates):
            trend_val = intercept + slope * (n + i)
            month = pd.Timestamp(ds).month
            sf = season_factors.get(month, 1.0)
            yhat = max(0, trend_val * sf)
            result.append(
                {
                    "ds": ds,
                    "revenue": round(yhat, 2),
                    "yhat_lower": round(yhat * 0.88, 2),
                    "yhat_upper": round(yhat * 1.12, 2),
                }
            )
        return result


def run_slider_forecast(
    starting_mrr: float,
    growth_rate: float,   # monthly % as integer, e.g. 8 = 8%
    churn_rate: float,    # monthly % as integer, e.g. 3 = 3%
    cogs_percent: float,  # % of revenue, e.g. 22
    marketing_spend: float,
    payroll: float,
    months: int,
) -> list[dict]:
    """
    Compound-growth projection driven entirely by slider values.
    Returns a list of monthly dicts with ds, revenue, expenses, gross_margin, net_profit.
    """
    df = pd.read_csv(PROPHET_DATA_PATH)
    last_ds = df["ds"].iloc[-1]
    future_dates = _next_month_dates(last_ds, months)

    results = []
    prev_mrr = starting_mrr
    for ds in future_dates:
        mrr = prev_mrr * (1 + growth_rate / 100) * (1 - churn_rate / 100)
        cogs = mrr * (cogs_percent / 100)
        expenses = cogs + marketing_spend + payroll
        gross_margin = ((mrr - cogs) / mrr * 100) if mrr > 0 else 0
        net_profit = mrr - expenses
        results.append(
            {
                "ds": ds,
                "revenue": round(mrr, 2),
                "expenses": round(expenses, 2),
                "gross_margin": round(gross_margin, 2),
                "net_profit": round(net_profit, 2),
            }
        )
        prev_mrr = mrr

    return results


def project_forward(
    revenue: float,
    expenses: float,
    growth_rate: float,
    cost_growth_rate: float,
    months: int,
    what_if_annual_cost: float = 0.0,
) -> list[dict]:
    """Legacy simple compound-growth projection (kept for /forecast endpoint)."""
    extra_monthly_cost = what_if_annual_cost / 12
    results = []
    for i in range(1, months + 1):
        projected_revenue = revenue * ((1 + growth_rate) ** i)
        projected_expenses = (expenses + extra_monthly_cost) * ((1 + cost_growth_rate) ** i)
        projected_profit = projected_revenue - projected_expenses
        results.append(
            {
                "month": i,
                "revenue": round(projected_revenue, 2),
                "expenses": round(projected_expenses, 2),
                "profit": round(projected_profit, 2),
            }
        )
    return results
