"""
Feature 3 — Investment Intelligence
Router: /investments/*
Owner: Nishant

Phases covered in this file:
  Phase 1  — route scaffold
  Phase 2  — holdings CRUD (Abdullah fills these in)
  Phase 3  — market data (Nishant fills these in)
  Phase 4  — portfolio analytics (Cole fills these in)
  Phase 6  — insights engine
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
import models
import market_data

router = APIRouter(prefix="/investments", tags=["Investments"])


class ManualPriceRequest(BaseModel):
    symbol: str        # e.g. "SYDPROPERTY" or "BTC"
    current_price: float  # manually entered price



# ── Holdings ──────────────────────────────────────────────────────────────────

@router.get("/holdings")
def get_holdings(db: Session = Depends(get_db)):
    """Return all holdings for the logged-in user. (Phase 2 — Abdullah)"""
    return db.query(models.InvestmentHolding).filter(
        models.InvestmentHolding.user_id == "demo-user"
    ).all()


@router.post("/holdings")
def add_holding(db: Session = Depends(get_db)):
    """Manually add a holding. (Phase 2 — Abdullah)"""
    return {"message": "TODO — Phase 2"}


@router.delete("/holdings/{holding_id}")
def delete_holding(holding_id: int, db: Session = Depends(get_db)):
    """Delete a holding by ID. (Phase 2 — Abdullah)"""
    return {"message": f"TODO — Phase 2, id={holding_id}"}


@router.post("/holdings/upload")
def upload_holdings_csv(db: Session = Depends(get_db)):
    """CSV bulk import of holdings. (Phase 2 — Abdullah)"""
    return {"message": "TODO — Phase 2"}


# ── Market Prices ─────────────────────────────────────────────────────────────

@router.get("/prices")
def get_prices(db: Session = Depends(get_db)):
    """Return latest cached market prices for all symbols in holdings."""
    return db.query(models.MarketPrice).all()


@router.post("/prices/refresh")
def refresh_prices(db: Session = Depends(get_db)):
    """
    Manually trigger a price refresh for all symbols in holdings.
    The scheduler also calls this automatically every 15 min.
    """
    result = market_data.refresh_all_prices(db)
    return result


# ── Portfolio Summary & Allocation ────────────────────────────────────────────

@router.get("/summary")
def get_summary(db: Session = Depends(get_db)):
    """Return total value, cost, P/L, return %. (Phase 4 — Cole)"""
    return {"message": "TODO — Phase 4"}


@router.get("/allocation")
def get_allocation(db: Session = Depends(get_db)):
    """Return allocation breakdown by asset type and symbol. (Phase 4 — Cole)"""
    return {"message": "TODO — Phase 4"}


# ── Insights ──────────────────────────────────────────────────────────────────

@router.get("/insights")
def get_insights(db: Session = Depends(get_db)):
    """Return categorised insights with severity. (Phase 6 — Jeffrey)"""
    return db.query(models.InvestmentInsight).filter(
        models.InvestmentInsight.user_id == "demo-user"
    ).all()


# ── Manual Price Fallback ─────────────────────────────────────────────────────

@router.post("/prices/manual")
def set_manual_price(req: ManualPriceRequest, db: Session = Depends(get_db)):
    """
    Manually set a price for a symbol when yfinance or CoinGecko fails.
    Useful for real estate, obscure funds, or when APIs are down.
    Uses the same upsert logic as the auto refresh.
    """
    symbol = req.symbol.upper()

    # Check the symbol actually exists in the user's holdings
    holding = db.query(models.InvestmentHolding).filter(
        models.InvestmentHolding.symbol == symbol
    ).first()

    if not holding:
        raise HTTPException(
            status_code=404,
            detail=f"No holding found for symbol '{symbol}'. Add the holding first."
        )

    # Reuse the same upsert function from market_data
    market_data.upsert_market_price(db, {
        "symbol":            symbol,
        "current_price":     req.current_price,
        "daily_change":      None,   # unknown for manual entry
        "percentage_change": None,   # unknown for manual entry
    })

    return {
        "message": f"Manual price set for {symbol}",
        "symbol":  symbol,
        "price":   req.current_price,
    }