from fastapi import FastAPI, File, HTTPException, UploadFile, Depends
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
from LlamaModel import get_web_context, parse_output
from contextLlamaTest import get_analysis
from CsvDetectFull import detect_anomalies

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