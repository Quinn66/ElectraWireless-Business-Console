"""
ORM models for Feature 2 — Personal Financial Intelligence.

All three tables carry a user_id column — populate it from the authenticated
session once auth is wired up (Nishant/Cole, spec §3.3).

Encryption note (spec §3.3 — Nishant + Cole):
  The description and amount fields on PFTransaction store plaintext today.
  Replace the Column types with an EncryptedString / EncryptedFloat TypeDecorator
  (AES-256, key from env) before any real user data is stored in production.
"""

from datetime import datetime, date
from sqlalchemy import (
    Column, String, Float, Integer, Date, DateTime,
    UniqueConstraint, func,
)
from database import Base


class PFTransaction(Base):
    """One confirmed financial transaction belonging to a user."""

    __tablename__ = "pf_transactions"

    id          = Column(String,  primary_key=True)          # matches frontend Transaction.id
    user_id     = Column(String,  nullable=False, index=True)
    date        = Column(String,  nullable=False)             # ISO yyyy-mm-dd
    description = Column(String,  nullable=False)             # TODO: EncryptedString (§3.3)
    amount      = Column(Float,   nullable=False)             # TODO: EncryptedFloat  (§3.3)
    type        = Column(String,  nullable=False)             # income | expense | transfer
    category    = Column(String,  nullable=False)
    source      = Column(String,  nullable=False)             # csv | manual
    created_at  = Column(DateTime, default=func.now())


class PFBudget(Base):
    """Monthly budget limit per category for a user. One row per user+category."""

    __tablename__ = "pf_budgets"

    id            = Column(Integer, primary_key=True, autoincrement=True)
    user_id       = Column(String,  nullable=False, index=True)
    category      = Column(String,  nullable=False)
    budget_amount = Column(Float,   nullable=False)
    period        = Column(String,  nullable=False, default="monthly")  # monthly | annual
    updated_at    = Column(DateTime, default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("user_id", "category", name="uq_budget_user_category"),
    )


class PFSnapshot(Base):
    """
    Point-in-time financial health snapshot computed from a user's transactions.
    Written whenever the frontend requests a summary so trends can be tracked
    over time without re-scanning the full transaction history.
    """

    __tablename__ = "pf_snapshots"

    id               = Column(Integer, primary_key=True, autoincrement=True)
    user_id          = Column(String,  nullable=False, index=True)
    snapshot_date    = Column(Date,    nullable=False, default=date.today)
    health_score     = Column(Integer, nullable=True)   # 0–100
    savings_rate     = Column(Float,   nullable=True)   # percentage
    cashflow_balance = Column(Float,   nullable=True)   # net cash flow for the period
    created_at       = Column(DateTime, default=func.now())
