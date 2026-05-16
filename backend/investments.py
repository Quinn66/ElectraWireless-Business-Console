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

import csv
import io
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
import models
import market_data
from portfolio_analytics import (
    calculate_portfolio_summary,
    compute_allocation,
    calculate_diversification_score,
)

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


@router.delete("/holdings")
def delete_all_holdings(db: Session = Depends(get_db)):
    """Clear all holdings and related data for the demo user."""
    db.query(models.InvestmentHolding).filter(
        models.InvestmentHolding.user_id == "demo-user"
    ).delete()
    db.query(models.PortfolioSnapshot).filter(
        models.PortfolioSnapshot.user_id == "demo-user"
    ).delete()
    db.query(models.MarketPrice).delete()
    db.commit()
    return {"message": "All investment data cleared"}


@router.post("/holdings/upload")
def upload_holdings_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """CSV bulk import of holdings. Replaces any previously CSV-imported holdings.
    Required columns: symbol, asset_type, quantity, buy_price. Optional: purchase_date."""
    # Clear previous CSV import so re-uploading replaces rather than appends
    db.query(models.InvestmentHolding).filter(
        models.InvestmentHolding.user_id == "demo-user",
        models.InvestmentHolding.source  == "csv",
    ).delete()
    db.commit()

    contents = file.file.read().decode("utf-8")
    reader = csv.DictReader(io.StringIO(contents))

    required = {"symbol", "asset_type", "quantity", "buy_price"}
    imported = 0
    symbols: list[str] = []
    errors: list[str] = []

    for i, raw_row in enumerate(reader, start=2):
        row = {k.strip().lower(): v.strip() for k, v in raw_row.items() if k}
        missing = required - row.keys()
        if missing:
            errors.append(f"Row {i}: missing columns {missing}")
            continue
        try:
            holding = models.InvestmentHolding(
                user_id=       "demo-user",
                symbol=        row["symbol"].upper(),
                asset_type=    row["asset_type"].lower(),
                quantity=      float(row["quantity"]),
                buy_price=     float(row["buy_price"]),
                purchase_date= row.get("purchase_date") or None,
                source=        "csv",
            )
            db.add(holding)
            symbols.append(holding.symbol)
            imported += 1
        except ValueError as e:
            errors.append(f"Row {i}: {e}")

    db.commit()

    if symbols:
        market_data.refresh_all_prices(db)

    return {"imported": imported, "symbols": symbols, "errors": errors}


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

def _holding_to_dict(h, price_map: dict) -> dict:
    """
    Convert an InvestmentHolding ORM row to a plain dict for analytics.
    Resolves current_price from the MarketPrice table (price_map).
    Falls back to None if the symbol has no price yet — analytics will
    use buy_price as a fallback so nothing crashes.
    """
    return {
        "id":            h.id,
        "user_id":       h.user_id,
        "symbol":        h.symbol,
        "asset_type":    h.asset_type,
        "quantity":      h.quantity,
        "buy_price":     h.buy_price,
        "purchase_date": h.purchase_date,
        "current_price": price_map.get(h.symbol.upper()),
    }


def _build_price_map(holdings, db: Session) -> dict:
    """Fetch all relevant MarketPrice rows in one query and return as symbol → price dict."""
    symbols = list({h.symbol.upper() for h in holdings})
    if not symbols:
        return {}
    rows = db.query(models.MarketPrice).filter(
        models.MarketPrice.symbol.in_(symbols)
    ).all()
    return {row.symbol: row.current_price for row in rows if row.current_price is not None}


def _build_daily_change_map(holdings, db: Session) -> dict:
    """Return symbol → {daily_change, percentage_change} for the gainers/losers widget."""
    symbols = list({h.symbol.upper() for h in holdings})
    if not symbols:
        return {}
    rows = db.query(models.MarketPrice).filter(
        models.MarketPrice.symbol.in_(symbols)
    ).all()
    return {
        row.symbol: {
            "daily_change":      row.daily_change,
            "percentage_change": row.percentage_change,
        }
        for row in rows
    }


@router.get("/summary")
def get_summary(include_volatility: bool = False, db: Session = Depends(get_db)):
    """
    Returns portfolio-level totals (value, cost, P&L, return %) plus per-asset
    performance (CAGR, optional annualised volatility) and diversification score.
    Also writes a PortfolioSnapshot to the DB for historical tracking.

    ?include_volatility=true  fetch annualised volatility via yfinance — stocks/ETFs only, slower
    """
    holdings  = db.query(models.InvestmentHolding).filter(
        models.InvestmentHolding.user_id == "demo-user"
    ).all()

    price_map      = _build_price_map(holdings, db)
    daily_map      = _build_daily_change_map(holdings, db)
    holding_dicts  = [_holding_to_dict(h, price_map) for h in holdings]

    summary         = calculate_portfolio_summary(holding_dicts, include_volatility)
    diversification = calculate_diversification_score(holding_dicts)

    # Attach daily change fields to each asset so the frontend gainers/losers widget
    # can sort by today's move rather than total return since purchase.
    for asset in summary.get("assets", []):
        daily = daily_map.get(asset["symbol"].upper(), {})
        asset["daily_change"]      = daily.get("daily_change")
        asset["percentage_change"] = daily.get("percentage_change")

    # Write a snapshot so the frontend can show historical portfolio growth
    snapshot = models.PortfolioSnapshot(
        user_id           = "demo-user",
        total_value       = summary["total_value"],
        total_cost        = summary["total_cost"],
        profit_loss       = summary["profit_loss"],
        return_percentage = summary["return_percentage"],
    )
    db.add(snapshot)
    db.commit()

    return {**summary, "diversification": diversification}


@router.get("/allocation")
def get_allocation(db: Session = Depends(get_db)):
    """
    Returns portfolio allocation split by symbol and by asset type.
    Each entry includes absolute value ($) and percentage of total portfolio.
    Prices come from MarketPrice table — falls back to buy_price if not yet refreshed.
    """
    holdings  = db.query(models.InvestmentHolding).filter(
        models.InvestmentHolding.user_id == "demo-user"
    ).all()

    price_map     = _build_price_map(holdings, db)
    holding_dicts = [_holding_to_dict(h, price_map) for h in holdings]

    return compute_allocation(holding_dicts)


# ── Portfolio Snapshots ───────────────────────────────────────────────────────

@router.get("/snapshots")
def get_snapshots(db: Session = Depends(get_db)):
    """
    Return one deduplicated snapshot per calendar day (latest write wins).
    The /summary endpoint writes a snapshot on each call, so this may have
    multiple rows per day — we collapse them here.
    """
    rows = (
        db.query(models.PortfolioSnapshot)
        .filter(models.PortfolioSnapshot.user_id == "demo-user")
        .order_by(models.PortfolioSnapshot.id.asc())
        .all()
    )
    by_date: dict = {}
    for r in rows:
        key = r.snapshot_date.isoformat() if hasattr(r.snapshot_date, "isoformat") else str(r.snapshot_date)
        by_date[key] = r  # last write per day wins
    return [
        {
            "date":              k,
            "total_value":       r.total_value,
            "profit_loss":       r.profit_loss,
            "return_percentage": r.return_percentage,
        }
        for k, r in sorted(by_date.items())
    ]


# ── Markowitz Risk-Return Data ─────────────────────────────────────────────────

@router.get("/markowitz")
def get_markowitz(db: Session = Depends(get_db)):
    """
    Risk-return scatter data per holding.
      risk = annualised volatility % (stocks/ETFs via yfinance; None for others)
      ret  = CAGR % (all asset types)
      value = current market value (bubble size)
    """
    from portfolio_analytics import calculate_asset_performance

    holdings = db.query(models.InvestmentHolding).filter(
        models.InvestmentHolding.user_id == "demo-user"
    ).all()
    if not holdings:
        return []

    price_map = _build_price_map(holdings, db)
    result = []
    for h in holdings:
        h_dict = _holding_to_dict(h, price_map)
        perf = calculate_asset_performance(h_dict, include_volatility=True)
        cagr_pct = round(perf["cagr"] * 100, 2) if perf["cagr"] is not None else None
        vol_pct  = round(perf["annualised_volatility"] * 100, 2) if perf["annualised_volatility"] is not None else None
        result.append({
            "symbol":     perf["symbol"],
            "asset_type": perf["asset_type"],
            "risk":       vol_pct,
            "ret":        cagr_pct,
            "value":      perf["current_value"],
        })
    return result


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