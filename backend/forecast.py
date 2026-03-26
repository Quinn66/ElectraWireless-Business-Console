import numpy as np
import pandas as pd
from pathlib import Path

SAMPLE_DATA_PATH = Path(__file__).parent / "sample_data.csv"


def load_sample_data() -> list[dict]:
    df = pd.read_csv(SAMPLE_DATA_PATH)
    df["profit"] = df["revenue"] - df["expenses"]
    return df.to_dict(orient="records")


def project_forward(
        # test commi
    revenue: float,
    expenses: float,
    growth_rate: float,  # monthly % as decimal, e.g. 0.05 = 5%
    cost_growth_rate: float,  # monthly % as decimal
    months: int,
    what_if_annual_cost: float = 0.0,  # extra annual cost (e.g. $80k hire)
) -> list[dict]:
    """
    Simple compound-growth projection — no Prophet needed for demo.
    Returns a list of monthly dicts: { month, revenue, expenses, profit }
    """
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
