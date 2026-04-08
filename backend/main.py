from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from forecast import (
    load_sample_data,
    load_prophet_historical,
    project_forward,
    run_prophet_forecast,
    run_slider_forecast,
)
from upload_parser import parse_uploaded_financial_file

app = FastAPI(title="ElectraWireless Business Console API")

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
    
