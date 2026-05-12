from fastapi import FastAPI, File, HTTPException, UploadFile, Depends, Body
from datetime import date as date_today
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from database import engine, Base, get_db
import models  # registers ORM models

from forecast import (
    load_sample_data,
    load_prophet_historical,
    project_forward,
    run_prophet_forecast,
    run_slider_forecast,
)

from upload_parser import parse_uploaded_financial_file
from portfolio_analytics import (
    calculate_portfolio_summary,
    compute_allocation,
    calculate_diversification_score,
)
from LlamaModel import get_web_context, parse_output
from contextLlamaTest import get_analysis
from CsvDetectFull import detect_anomalies
from dotenv import load_dotenv
load_dotenv()
from sqlalchemy.orm import Session
from sqlalchemy import func
from uuid import uuid4

app = FastAPI(title="ElectraWireless Business Console API")

# Create all PF tables on startup if they don't already exist
Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in production
    allow_methods=["*"],
    allow_headers=["*"],
)


class ForecastRequest(BaseModel):
    revenue: float = Field(..., description="Current monthly revenue ($)")
    expenses: float = Field(..., description="Current monthly expenses ($)")
    growth_rate: float = Field(0.05, description="Monthly revenue growth rate (0.05 = 5%)")
    cost_growth_rate: float = Field(0.02, description="Monthly expense growth rate")
    months: int = Field(12, ge=1, le=60, description="Months to project forward")
    what_if_annual_cost: float = Field(0.0, description="Optional extra annual cost (e.g. $80000 for a hire)")


class ForecastResponse(BaseModel):
    historical: list[dict]
    forecast: list[dict]


@app.get("/")
def root():
    return {"status": "ok", "message": "ElectraWireless Business Console API"}


@app.get("/sample-data")
def get_sample_data():
    """Returns the hardcoded historical demo data."""
    return {"data": load_sample_data()}


class ProphetForecastRequest(BaseModel):
    starting_mrr: float = Field(18000, description="Starting MRR for slider projection ($)")
    growth_rate: float = Field(8.0, description="Monthly revenue growth rate (%)")
    churn_rate: float = Field(3.0, description="Monthly churn rate (%)")
    cogs_percent: float = Field(22.0, description="COGS as % of revenue")
    marketing_spend: float = Field(4000.0, description="Monthly marketing spend ($)")
    payroll: float = Field(35000.0, description="Monthly payroll ($)")
    months: int = Field(12, ge=1, le=60, description="Months to forecast")


class ProphetForecastResponse(BaseModel):
    historical: list[dict]
    prophet_forecast: list[dict]
    slider_forecast: list[dict]


@app.post("/prophet-forecast", response_model=ProphetForecastResponse)
def prophet_forecast(req: ProphetForecastRequest):
    """
    Returns three data series for the chart:
    - historical: actual revenue/expenses from sample_data_prophet.csv
    - prophet_forecast: Prophet model baseline (or linear-trend fallback if Prophet not installed)
    - slider_forecast: compound-growth projection driven by the slider inputs
    """
    historical = load_prophet_historical()
    prophet = run_prophet_forecast(req.months)
    slider = run_slider_forecast(
        starting_mrr=req.starting_mrr,
        growth_rate=req.growth_rate,
        churn_rate=req.churn_rate,
        cogs_percent=req.cogs_percent,
        marketing_spend=req.marketing_spend,
        payroll=req.payroll,
        months=req.months,
    )
    return {"historical": historical, "prophet_forecast": prophet, "slider_forecast": slider}


class AnalyzeRequest(BaseModel):
    question: str
    use_web_context: bool = Field(False, description="Fetch live web context via DuckDuckGo before analysis")
    # User's current dashboard slider values — used to fetch real forecast context for ELLY
    starting_mrr:    float = Field(18000.0, description="Starting MRR ($)")
    growth_rate:     float = Field(8.0,     description="Monthly revenue growth rate (%)")
    churn_rate:      float = Field(3.0,     description="Monthly churn rate (%)")
    cogs_percent:    float = Field(22.0,    description="COGS as % of revenue")
    marketing_spend: float = Field(4000.0,  description="Monthly marketing spend ($)")
    payroll:         float = Field(35000.0, description="Monthly payroll ($)")
    months:          int   = Field(12,      description="Forecast horizon (months)")


@app.post("/analyze")
def analyze(req: AnalyzeRequest):
    """Run an AI what-if analysis via Groq, grounded in the user's real forecast data."""
    historical       = load_prophet_historical()
    prophet_forecast = run_prophet_forecast(req.months)
    slider_forecast  = run_slider_forecast(
        starting_mrr=req.starting_mrr,
        growth_rate=req.growth_rate,
        churn_rate=req.churn_rate,
        cogs_percent=req.cogs_percent,
        marketing_spend=req.marketing_spend,
        payroll=req.payroll,
        months=req.months,
    )
    current_params = {
        "starting_mrr":    req.starting_mrr,
        "growth_rate":     req.growth_rate,
        "churn_rate":      req.churn_rate,
        "cogs_percent":    req.cogs_percent,
        "marketing_spend": req.marketing_spend,
        "payroll":         req.payroll,
        "months":          req.months,
    }
    analysis = get_analysis(req.question, historical, prophet_forecast, slider_forecast, current_params)
    return parse_output(analysis)


# ── Anomaly detection (Quinn's CsvDetect) ────────────────────────────────────

class DetectAnomaliesRequest(BaseModel):
    cell_map: dict = Field(..., description="Frontend cell map: cellId → {value, formula, sheetIndex, rowIndex, colIndex}")
    sheet_index: int = Field(0, description="Which sheet to analyse (0-based)")


@app.post("/detect-anomalies")
def detect_anomalies_endpoint(req: DetectAnomaliesRequest):
    """
    Run IsolationForest anomaly detection + RandomForestRegressor prediction
    on numeric columns of the uploaded spreadsheet.
    Returns flagged cell IDs with original values, predicted values, and severity.
    """
    return detect_anomalies(req.cell_map, req.sheet_index)


@app.post("/forecast", response_model=ForecastResponse)
def forecast(req: ForecastRequest):
    """
    Projects revenue, expenses, and profit forward using compound growth.
    Also returns the historical sample data so the frontend can render
    both history and forecast on a single chart.
    """
    historical = load_sample_data()
    projected = project_forward(
        revenue=req.revenue,
        expenses=req.expenses,
        growth_rate=req.growth_rate,
        cost_growth_rate=req.cost_growth_rate,
        months=req.months,
        what_if_annual_cost=req.what_if_annual_cost,
    )
    return {"historical": historical, "forecast": projected}

# ── Phase 1 models (stub — Nishant will expand) ──────────────────────────────

class HoldingCreate(BaseModel):
    user_id:       str   = Field(..., description="User identifier")
    symbol:        str   = Field(..., description="Ticker or asset name e.g. AAPL, BTC")
    asset_type:    str   = Field(..., description="stock | etf | crypto | fund | real_estate")
    quantity:      float = Field(..., gt=0)
    buy_price:     float = Field(..., gt=0, description="Price paid per unit ($)")
    purchase_date: str   = Field(..., description="ISO date YYYY-MM-DD")
    source:        str   = Field("manual", description="manual | csv | api")
    current_price: float | None = Field(None, description="Live price; falls back to buy_price if omitted")


class InvestmentHolding(HoldingCreate):
    id: int


# ── Shared in-memory store — Abdullah's Phase 2 CRUD will append/delete here ─
_next_holding_id: int = 1
holdings_db: list[dict] = []


# ── Phase 4: Portfolio Analytics ──────────────────────────────────────────────

@app.get("/investments/summary")
def investments_summary(
    user_id: str | None = None,
    include_volatility: bool = False,
):
    """
    Returns portfolio-level totals (value, cost, P&L, return %) plus
    per-asset performance (CAGR, optional annualised volatility).
    Also includes diversification score and overexposure flags.

    ?user_id=        filter to one user (omit for all)
    ?include_volatility=true  fetch annualised volatility via yfinance (slower)
    """
    subset = [h for h in holdings_db if user_id is None or h["user_id"] == user_id]
    summary     = calculate_portfolio_summary(subset, include_volatility)
    diversification = calculate_diversification_score(subset)
    return {**summary, "diversification": diversification}


@app.get("/investments/allocation")
def investments_allocation(user_id: str | None = None):
    """
    Returns portfolio allocation split by symbol and by asset type.
    Each entry includes absolute value ($) and percentage of total portfolio.

    ?user_id=  filter to one user (omit for all)
    """
    subset = [h for h in holdings_db if user_id is None or h["user_id"] == user_id]
    return compute_allocation(subset)


@app.post("/upload-financial-data")
async def upload_financial_data(file: UploadFile = File(...)):
    try:
        if not file.filename:
            raise HTTPException(status_code=400, detail="No file uploaded")
        
        content = await file.read()
        result = parse_uploaded_financial_file(file.filename, content)
        return result
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"An error occurred while processing the file: {str(e)}")
    
@app.post("/pf/transactions/upload")
async def upload_pf_transactions(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    content = await file.read()
    parsed = parse_uploaded_financial_file(file.filename, content)

    records = parsed.get("normalized_data", {}).get("records", [])
    saved = []

    for row in records:
        amount = row.get("amount") or row.get("revenue") or row.get("expenses") or row.get("sales")
        if amount is None:
            continue

        amount = float(amount)
        transaction_type = "income" if amount >= 0 else "expense"

        transaction = models.PFTransaction(
            id=str(uuid4()),
            user_id="demo-user",
            date=str(row.get("date") or ""),
            description=str(row.get("description") or "Imported transaction"),
            amount=abs(amount),
            type=transaction_type,
            category=str(row.get("category") or "Uncategorised"),
            source="csv",
        )

        db.add(transaction)
        saved.append(transaction)

    db.commit()

    return {
        "parsed_successfully": parsed.get("parsed_successfully"),
        "imported_count": len(saved),
    }

@app.get("/pf/transactions")
def get_pf_transactions(db: Session = Depends(get_db)):
    return db.query(models.PFTransaction).all()

@app.get("/pf/summary")
def get_pf_summary(db: Session = Depends(get_db)):
    transactions = db.query(models.PFTransaction).all()

    income = sum(t.amount for t in transactions if t.type == "income")
    expenses = sum(t.amount for t in transactions if t.type == "expense")
    net = income - expenses

    savings_rate = (net / income * 100) if income else 0

    # Simple health score logic
    health_score = 50
    if savings_rate > 20:
        health_score += 30
    elif savings_rate > 10:
        health_score += 20
    elif savings_rate < 0:
        health_score -= 30

    health_score = max(0, min(100, int(health_score)))

    snapshot = models.PFSnapshot(
        user_id="demo-user",
        health_score=health_score,
        savings_rate=savings_rate,
        cashflow_balance=net,
    )

    db.add(snapshot)
    db.commit()

    return {
        "income": income,
        "expenses": expenses,
        "net_cash_flow": net,
        "savings_rate": savings_rate,
        "health_score": health_score,
    }

@app.get("/pf/insights")
def get_pf_insights(db: Session = Depends(get_db)):
    transactions = db.query(models.PFTransaction).all()
    budgets = db.query(models.PFBudget).all()

    income = sum(t.amount for t in transactions if t.type == "income")
    expenses = sum(t.amount for t in transactions if t.type == "expense")

    insights = []

    if expenses > income:
        insights.append("You are spending more than you earn")

    if income > 0:
        savings_rate = ((income - expenses) / income) * 100
        if savings_rate < 10:
            insights.append("Savings rate is below 10%")

    for budget in budgets:
        category_spend = sum(
            t.amount for t in transactions
            if t.type == "expense" and t.category == budget.category
        )

        if category_spend > budget.budget_amount:
            insights.append(f"Over budget in {budget.category}")

    return insights

class BudgetRequest(BaseModel):
    category: str
    budget_amount: float
    period: str = "monthly"


@app.post("/pf/budgets")
def create_budget(req: BudgetRequest, db: Session = Depends(get_db)):
    existing = db.query(models.PFBudget).filter(
        models.PFBudget.user_id == "demo-user",
        models.PFBudget.category == req.category
    ).first()

    if existing:
        existing.budget_amount = req.budget_amount
        existing.period = req.period
    else:
        budget = models.PFBudget(
            user_id="demo-user",
            category=req.category,
            budget_amount=req.budget_amount,
            period=req.period,
        )
        db.add(budget)

    db.commit()
    return {"status": "success"}

@app.get("/pf/budgets")
def get_budgets(db: Session = Depends(get_db)):
    return db.query(models.PFBudget).all()


# ── Phase 2: Investment Holdings ─────────────────────────────────────────────

class HoldingCreate(BaseModel):
    symbol:        str
    asset_type:    str    # stock | crypto | etf | fund | real_estate
    quantity:      float
    buy_price:     float
    purchase_date: str    # ISO yyyy-mm-dd


@app.post("/investments/holdings", status_code=201)
def create_holding(req: HoldingCreate, db: Session = Depends(get_db)):
    holding = models.InvestmentHolding(
        id=str(uuid4()),
        user_id="demo-user",
        symbol=req.symbol.upper().strip(),
        asset_type=req.asset_type.strip().lower(),
        quantity=req.quantity,
        buy_price=req.buy_price,
        purchase_date=req.purchase_date,
        source="manual",
    )
    db.add(holding)
    db.commit()
    db.refresh(holding)
    return holding


@app.get("/investments/holdings")
def get_holdings(db: Session = Depends(get_db)):
    return db.query(models.InvestmentHolding).filter(
        models.InvestmentHolding.user_id == "demo-user"
    ).order_by(models.InvestmentHolding.created_at.desc()).all()


@app.delete("/investments/holdings/{holding_id}", status_code=204)
def delete_holding(holding_id: str, db: Session = Depends(get_db)):
    holding = db.query(models.InvestmentHolding).filter(
        models.InvestmentHolding.id == holding_id,
        models.InvestmentHolding.user_id == "demo-user",
    ).first()
    if not holding:
        raise HTTPException(status_code=404, detail="Holding not found")
    db.delete(holding)
    db.commit()


@app.delete("/investments/holdings", status_code=204)
def clear_all_holdings(db: Session = Depends(get_db)):
    db.query(models.InvestmentHolding).filter(
        models.InvestmentHolding.user_id == "demo-user"
    ).delete()
    db.commit()


@app.post("/investments/holdings/upload")
async def upload_holdings_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    import pandas as pd
    import io

    if not (file.filename or "").lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted")

    content = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {e}")

    df.columns = [str(c).strip().lower() for c in df.columns]

    required = {"symbol", "asset_type", "quantity", "buy_price"}
    missing = required - set(df.columns)
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Missing required columns: {', '.join(sorted(missing))}. "
                   f"Expected: symbol, asset_type, quantity, buy_price, purchase_date (optional)",
        )

    saved, errors = [], []
    for i, row in df.iterrows():
        try:
            holding = models.InvestmentHolding(
                id=str(uuid4()),
                user_id="demo-user",
                symbol=str(row["symbol"]).upper().strip(),
                asset_type=str(row["asset_type"]).strip().lower(),
                quantity=float(row["quantity"]),
                buy_price=float(row["buy_price"]),
                purchase_date=str(row.get("purchase_date", date_today.today())).strip(),
                source="csv",
            )
            db.add(holding)
            saved.append(holding.symbol)
        except Exception as e:
            errors.append(f"Row {int(i) + 2}: {e}")

    db.commit()
    return {"imported": len(saved), "symbols": saved, "errors": errors}


# ── Feature 3: Investment Insights (rule-based, no live prices needed) ────────

@app.get("/investments/insights")
def get_investment_insights(db: Session = Depends(get_db)):
    holdings = db.query(models.InvestmentHolding).filter(
        models.InvestmentHolding.user_id == "demo-user"
    ).all()

    if not holdings:
        return []

    total = sum(h.quantity * h.buy_price for h in holdings)
    if total == 0:
        return []

    insights = []

    # Per-symbol overexposure
    symbol_map: dict[str, float] = {}
    for h in holdings:
        symbol_map[h.symbol] = symbol_map.get(h.symbol, 0) + h.quantity * h.buy_price

    for symbol, value in sorted(symbol_map.items(), key=lambda x: -x[1]):
        pct = value / total * 100
        if pct > 40:
            insights.append({
                "type": "Overexposure",
                "message": f"{symbol} makes up {pct:.1f}% of your portfolio. Concentrated positions amplify both gains and losses.",
                "severity": "high",
                "affected": [symbol],
            })
        elif pct > 30:
            insights.append({
                "type": "Concentrated Position",
                "message": f"{symbol} represents {pct:.1f}% of your portfolio. Consider whether this aligns with your risk tolerance.",
                "severity": "medium",
                "affected": [symbol],
            })

    # Crypto concentration
    crypto_value = sum(h.quantity * h.buy_price for h in holdings if h.asset_type == "crypto")
    crypto_pct = crypto_value / total * 100
    if crypto_pct > 50:
        insights.append({
            "type": "Crypto Concentration",
            "message": f"{crypto_pct:.1f}% of your portfolio is in crypto — a highly volatile asset class. Consider diversifying into more stable instruments.",
            "severity": "high",
            "affected": list({h.symbol for h in holdings if h.asset_type == "crypto"}),
        })
    elif crypto_pct > 30:
        insights.append({
            "type": "Crypto Concentration",
            "message": f"{crypto_pct:.1f}% of your portfolio is in crypto assets. High volatility class — review your risk horizon.",
            "severity": "medium",
            "affected": list({h.symbol for h in holdings if h.asset_type == "crypto"}),
        })

    # Low diversification (< 4 distinct symbols)
    n_symbols = len(symbol_map)
    if n_symbols < 4:
        insights.append({
            "type": "Low Diversification",
            "message": f"Your portfolio holds only {n_symbols} distinct asset{'s' if n_symbols != 1 else ''}. Broader diversification reduces unsystematic risk.",
            "severity": "high" if n_symbols <= 2 else "medium",
            "affected": list(symbol_map.keys()),
        })

    # Single asset-type dominance (> 80%)
    type_map: dict[str, float] = {}
    for h in holdings:
        type_map[h.asset_type] = type_map.get(h.asset_type, 0) + h.quantity * h.buy_price
    type_labels = {"stock": "Stocks", "crypto": "Crypto", "etf": "ETFs", "fund": "Funds", "real_estate": "Real Estate"}
    for atype, value in type_map.items():
        pct = value / total * 100
        if pct > 80:
            insights.append({
                "type": "Asset Type Concentration",
                "message": f"{pct:.1f}% of your portfolio is in {type_labels.get(atype, atype)}. Spreading across asset classes reduces correlation risk.",
                "severity": "medium",
                "affected": list({h.symbol for h in holdings if h.asset_type == atype}),
            })

    # No ETF or fund exposure
    if not any(h.asset_type in ("etf", "fund") for h in holdings):
        insights.append({
            "type": "No Index / Fund Exposure",
            "message": "Portfolio contains no ETFs or mutual funds. Adding broad-market index exposure can reduce volatility without sacrificing long-term returns.",
            "severity": "low",
            "affected": [],
        })

    # Clean bill of health
    if not insights:
        insights.append({
            "type": "Portfolio Looks Balanced",
            "message": f"No significant concentration risks detected across your {n_symbols} holdings. Keep reviewing as positions shift.",
            "severity": "info",
            "affected": [],
        })

    return insights


# ── Feature 2 AI Insights ─────────────────────────────────────────────────────

from Feature2.F2Insights import build_finance_prompt, get_analysis, parse_llm_output


@app.post("/pf/ai-insights")
def ai_insights(req: dict = Body(...)):
    prompt = build_finance_prompt(req)
    raw = get_analysis(prompt)
    return parse_llm_output(raw)