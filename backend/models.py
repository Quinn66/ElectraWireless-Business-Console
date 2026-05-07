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
    TypeDecorator, String, Float, Column, String, Float, Integer, Date, DateTime,
    UniqueConstraint, func,
)
from database import Base
import os
import base64
from cryptography.fernet import Fernet
from dotenv import load_dotenv
load_dotenv()

# Load key from environment
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")

if not ENCRYPTION_KEY:
    raise ValueError("ENCRYPTION_KEY not set")

cipher = Fernet(ENCRYPTION_KEY)


class EncryptedString(TypeDecorator):
    impl = String

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        encrypted = cipher.encrypt(value.encode())
        return encrypted.decode()

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        decrypted = cipher.decrypt(value.encode())
        return decrypted.decode()


class EncryptedFloat(TypeDecorator):
    impl = String  # store as string after encryption

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        encrypted = cipher.encrypt(str(value).encode())
        return encrypted.decode()

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        decrypted = cipher.decrypt(value.encode())
        return float(decrypted.decode())

class PFTransaction(Base):
    """One confirmed financial transaction belonging to a user."""

    __tablename__ = "pf_transactions"

    id          = Column(String,  primary_key=True)          # matches frontend Transaction.id
    user_id     = Column(String,  nullable=False, index=True)
    date        = Column(String,  nullable=False)             # ISO yyyy-mm-dd
    description = Column(EncryptedString,  nullable=False)             # TODO: EncryptedString (§3.3)
    amount      = Column(EncryptedFloat,   nullable=False)             # TODO: EncryptedFloat  (§3.3)
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


class InvestmentHolding(Base):
    """One investment holding belonging to a user (Phase 2 — Data Ingestion)."""

    __tablename__ = "investment_holdings"

    id            = Column(String,  primary_key=True)
    user_id       = Column(String,  nullable=False, index=True)
    symbol        = Column(String,  nullable=False)
    asset_type    = Column(String,  nullable=False)   # stock | crypto | etf | fund | real_estate
    quantity      = Column(Float,   nullable=False)
    buy_price     = Column(Float,   nullable=False)
    purchase_date = Column(String,  nullable=False)   # ISO yyyy-mm-dd
    source        = Column(String,  nullable=False, default="manual")  # manual | csv
    created_at    = Column(DateTime, default=func.now())


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

