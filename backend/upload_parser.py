
from __future__ import annotations

import io
import json
import re
from typing import Any

import pandas as pd

SUPPORTED_EXTENSIONS = {".csv", ".xlsx", ".json"}

# ----------------------------
# Canonical field groups
# ----------------------------

FINANCIAL_ALIASES = {
    "date": ["date", "month", "period", "reporting_date", "statement_date"],
    "year": ["year", "fiscal_year"],
    "quarter": ["quarter", "qtr", "fiscal_quarter"],
    "month": ["month", "fiscal_month"],
    "company_id": ["company_id", "company", "entity_id", "business_id", "account_id"],

    "revenue": ["revenue", "sales", "income", "turnover", "mrr", "arr"],
    "expenses": ["expenses", "expense", "cost", "costs", "total_expenses", "opex"],
    "operating_income": ["operating_income", "operating_profit", "ebit"],
    "net_income": ["net_income", "net_profit", "profit", "net_earnings"],
    "cash_flow": ["cash_flow", "cashflow", "operating_cash_flow"],

    "assets": ["assets", "total_assets"],
    "liabilities": ["liabilities", "total_liabilities"],
    "equity": ["equity", "shareholder_equity"],

    "stock_price": ["stock_price", "share_price"],
    "volume_traded": ["volume_traded", "trading_volume"],
    "news_sentiment_score": ["news_sentiment_score", "sentiment_score"],
    "social_media_buzz": ["social_media_buzz", "social_buzz"],
    "sector_trend_index": ["sector_trend_index", "sector_trend"],
    "global_economic_score": ["global_economic_score", "economic_score"],
    "inflation_rate": ["inflation_rate", "inflation"],
    "exchange_rate": ["exchange_rate", "fx_rate"],
    "interest_rate": ["interest_rate", "rate"],

    "target_revenue_next_qtr": ["target_revenue_next_qtr", "next_quarter_revenue_target"],
    "target_anomaly_class": ["target_anomaly_class", "anomaly_class"],
    "audit_flag": ["audit_flag"],
    "fraud_flag": ["fraud_flag"],
    "market_shock_flag": ["market_shock_flag"],
    "policy_change_flag": ["policy_change_flag"],
}

SALES_ALIASES = {
    "order_date": ["order_date", "date", "transaction_date"],
    "ship_date": ["ship_date"],
    "sales": ["sales", "revenue"],
    "quantity": ["quantity", "qty"],
    "discount": ["discount"],
    "profit": ["profit", "net_profit"],

    "region": ["region"],
    "state": ["state"],
    "city": ["city"],
    "segment": ["segment"],
    "category": ["category"],
    "sub_category": ["sub_category", "subcategory"],
    "product_name": ["product_name", "product"],
    "order_id": ["order_id"],
    "customer_id": ["customer_id"],
    "product_id": ["product_id"],
}


# ----------------------------
# Utility helpers
# ----------------------------

def get_file_extension(filename: str) -> str:
    filename = filename.lower().strip()
    if "." not in filename:
        return ""
    return "." + filename.split(".")[-1]


def normalize_column_name(name: str) -> str:
    text = str(name).strip().lower()
    text = re.sub(r"[%$]", "", text)
    text = re.sub(r"[\s\-/]+", "_", text)
    text = re.sub(r"[(){}\[\]]", "", text)
    text = re.sub(r"__+", "_", text)
    return text.strip("_")


def load_csv_with_fallback(content: bytes) -> pd.DataFrame:
    last_error: Exception | None = None
    for encoding in ("utf-8", "utf-8-sig", "cp1252", "latin1"):
        try:
            return pd.read_csv(io.BytesIO(content), encoding=encoding)
        except UnicodeDecodeError as exc:
            last_error = exc
            continue
    if last_error:
        raise ValueError("Could not decode CSV file with supported encodings.") from last_error
    raise ValueError("Could not decode CSV file.")


def choose_best_excel_sheet(content: bytes) -> pd.DataFrame:
    workbook = pd.ExcelFile(io.BytesIO(content))
    best_df: pd.DataFrame | None = None
    best_score = -1

    for sheet_name in workbook.sheet_names:
        try:
            candidate = workbook.parse(sheet_name=sheet_name)
        except Exception:
            continue

        if candidate.empty:
            continue

        normalized = normalize_dataframe_columns(candidate)
        financial_mapping = find_mapping(normalized, FINANCIAL_ALIASES)
        sales_mapping = find_mapping(normalized, SALES_ALIASES)
        score = max(len(financial_mapping), len(sales_mapping))

        if score > best_score:
            best_score = score
            best_df = candidate

    if best_df is not None:
        return best_df

    # fallback to first sheet if nothing scored
    return workbook.parse(sheet_name=0)


def load_uploaded_file(filename: str, content: bytes) -> pd.DataFrame:
    ext = get_file_extension(filename)

    if ext == ".csv":
        return load_csv_with_fallback(content)

    if ext == ".xlsx":
        return choose_best_excel_sheet(content)

    if ext == ".json":
        parsed = json.loads(content.decode("utf-8"))

        if isinstance(parsed, list):
            return pd.DataFrame(parsed)

        if isinstance(parsed, dict):
            if isinstance(parsed.get("data"), list):
                return pd.DataFrame(parsed["data"])
            if isinstance(parsed.get("records"), list):
                return pd.DataFrame(parsed["records"])
            return pd.DataFrame([parsed])

        raise ValueError("Unsupported JSON structure")

    raise ValueError(f"Unsupported file type: {ext}")


def normalize_dataframe_columns(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df.columns = [normalize_column_name(col) for col in df.columns]
    return df


def find_mapping(df: pd.DataFrame, alias_dict: dict[str, list[str]]) -> dict[str, str]:
    mapping: dict[str, str] = {}
    available = set(df.columns)

    for canonical_name, aliases in alias_dict.items():
        for alias in aliases:
            alias_normalized = normalize_column_name(alias)
            if alias_normalized in available:
                mapping[canonical_name] = alias_normalized
                break

    return mapping


def safe_numeric(series: pd.Series) -> pd.Series:
    return pd.to_numeric(series, errors="coerce")


def safe_datetime(series: pd.Series) -> pd.Series:
    return pd.to_datetime(series, errors="coerce")


def quarter_to_month_start(year: Any, quarter: Any) -> str | None:
    try:
        y = int(float(year))
        q = int(float(quarter))
        quarter_month = {1: 1, 2: 4, 3: 7, 4: 10}
        if q not in quarter_month:
            return None
        return f"{y}-{quarter_month[q]:02d}-01"
    except Exception:
        return None


def year_month_to_date(year: Any, month: Any) -> str | None:
    try:
        y = int(float(year))
        m = int(float(month))
        if not 1 <= m <= 12:
            return None
        return f"{y}-{m:02d}-01"
    except Exception:
        return None


def _none_safe_records(df: pd.DataFrame) -> list[dict[str, Any]]:
    if df.empty:
        return []
    return df.where(pd.notnull(df), None).to_dict(orient="records")


# ----------------------------
# Classification
# ----------------------------

def classify_dataset(df: pd.DataFrame) -> tuple[str, dict[str, str]]:
    financial_mapping = find_mapping(df, FINANCIAL_ALIASES)
    sales_mapping = find_mapping(df, SALES_ALIASES)

    financial_score = len(financial_mapping)
    sales_score = len(sales_mapping)

    financial_indicators = {"revenue", "expenses", "assets", "liabilities", "equity", "cash_flow"}
    if len(financial_indicators.intersection(financial_mapping.keys())) >= 2:
        return "financial_statement_timeseries", financial_mapping

    sales_indicators = {"order_date", "sales", "quantity", "discount", "category", "region"}
    if len(sales_indicators.intersection(sales_mapping.keys())) >= 3:
        return "operational_sales_dataset", sales_mapping

    if financial_score >= sales_score and financial_score >= 3:
        return "financial_statement_timeseries", financial_mapping

    if sales_score > financial_score and sales_score >= 3:
        return "operational_sales_dataset", sales_mapping

    return "unknown", {}


# ----------------------------
# Parse quality
# ----------------------------

def build_parse_quality(valid_forecasting_rows: int, dropped_rows: int, warnings: list[str]) -> dict[str, Any]:
    if valid_forecasting_rows >= 24 and dropped_rows <= max(2, valid_forecasting_rows * 0.05) and len(warnings) <= 2:
        confidence = "high"
    elif valid_forecasting_rows >= 6:
        confidence = "medium"
    else:
        confidence = "low"

    return {
        "confidence": confidence,
        "valid_forecasting_rows": int(valid_forecasting_rows),
        "dropped_rows": int(dropped_rows),
        "warning_count": int(len(warnings)),
    }


# ----------------------------
# Financial statement normalization
# ----------------------------

def build_financial_statement_records(df: pd.DataFrame, mapping: dict[str, str]) -> pd.DataFrame:
    out = pd.DataFrame(index=df.index)

    for canonical, source in mapping.items():
        out[canonical] = df[source]

    if "date" in out.columns:
        out["date"] = safe_datetime(out["date"])

    if "year" in out.columns:
        out["year"] = safe_numeric(out["year"])

    if "quarter" in out.columns:
        out["quarter"] = safe_numeric(out["quarter"])

    if "month" in out.columns:
        out["month"] = safe_numeric(out["month"])

    if "date" not in out.columns and "year" in out.columns and "quarter" in out.columns:
        out["date"] = [quarter_to_month_start(y, q) for y, q in zip(out["year"], out["quarter"])]
        out["date"] = safe_datetime(out["date"])
    elif "date" not in out.columns and "year" in out.columns and "month" in out.columns:
        out["date"] = [year_month_to_date(y, m) for y, m in zip(out["year"], out["month"])]
        out["date"] = safe_datetime(out["date"])

    numeric_fields = [
        "revenue", "expenses", "operating_income", "net_income", "cash_flow",
        "assets", "liabilities", "equity",
        "stock_price", "volume_traded", "news_sentiment_score", "social_media_buzz",
        "sector_trend_index", "global_economic_score", "inflation_rate",
        "exchange_rate", "interest_rate", "target_revenue_next_qtr",
        "target_anomaly_class", "audit_flag", "fraud_flag",
        "market_shock_flag", "policy_change_flag",
    ]
    for field in numeric_fields:
        if field in out.columns:
            out[field] = safe_numeric(out[field])

    return out


def normalize_financial_statement_dataset(
    df: pd.DataFrame, mapping: dict[str, str]
) -> tuple[dict[str, Any], dict[str, Any], list[str], dict[str, Any]]:
    warnings: list[str] = []
    out = build_financial_statement_records(df, mapping)
    original_row_count = len(out)

    if "date" not in out.columns:
        warnings.append("No date or year/quarter/month combination could be derived for forecasting.")

    if "revenue" not in out.columns:
        warnings.append("No revenue-like column detected.")

    if "expenses" not in out.columns:
        warnings.append("No expenses-like column detected; forecasting rows will include expenses as null when unavailable.")

    if "company_id" in out.columns:
        entity_count = out["company_id"].dropna().nunique()
        if entity_count > 1:
            warnings.append(
                f"Detected {entity_count} entities in the uploaded file; backend will handle entity filtering automatically."
            )

    if "date" in out.columns:
        out["date"] = pd.to_datetime(out["date"], errors="coerce")

    # Duplicate detection before formatting
    if {"date", "company_id"}.issubset(out.columns):
        dup_count = int(out.duplicated(subset=["date", "company_id"], keep=False).sum())
        if dup_count > 0:
            warnings.append(f"Detected {dup_count} rows with duplicate date/company_id combinations.")
    elif "date" in out.columns:
        dup_count = int(out.duplicated(subset=["date"], keep=False).sum())
        if dup_count > 0:
            warnings.append(f"Detected {dup_count} rows with duplicate dates.")

    if "date" in out.columns:
        invalid_dates = int(out["date"].isna().sum())
        if invalid_dates > 0:
            warnings.append(f"Dropped {invalid_dates} rows because date could not be parsed.")
        out = out.dropna(subset=["date"]).copy()
        out["date"] = out["date"].dt.strftime("%Y-%m-%d")

    ordered_fields = [
        "date", "year", "quarter", "month", "company_id",
        "revenue", "expenses", "operating_income", "net_income", "cash_flow",
        "assets", "liabilities", "equity",
        "stock_price", "volume_traded", "news_sentiment_score", "social_media_buzz",
        "sector_trend_index", "global_economic_score", "inflation_rate",
        "exchange_rate", "interest_rate",
        "target_revenue_next_qtr", "target_anomaly_class",
        "audit_flag", "fraud_flag", "market_shock_flag", "policy_change_flag",
    ]
    present_fields = [f for f in ordered_fields if f in out.columns]
    normalized_records = _none_safe_records(out[present_fields]) if present_fields else []

    out = out.sort_values("date") if "date" in out.columns else out

    model_ready: dict[str, Any] = {
        "forecasting": [],
        "features": [],
        "training_targets": {},
    }

    valid_forecasting_rows = 0
    if "date" in out.columns and "revenue" in out.columns:
        valid_df = out.dropna(subset=["date", "revenue"]).copy()
        valid_forecasting_rows = len(valid_df)
        model_ready["forecasting"] = [
            {
                "ds": row["date"],
                "revenue": float(row["revenue"]),
                "expenses": (
                    float(row["expenses"])
                    if "expenses" in valid_df.columns and pd.notna(row.get("expenses"))
                    else None
                ),
            }
            for _, row in valid_df.iterrows()
        ]

    feature_fields = [
        "date", "revenue", "expenses", "operating_income", "net_income", "cash_flow",
        "inflation_rate", "exchange_rate", "interest_rate",
        "news_sentiment_score", "social_media_buzz", "sector_trend_index",
        "global_economic_score"
    ]
    existing_feature_fields = [f for f in feature_fields if f in out.columns]
    if existing_feature_fields:
        features_df = out[existing_feature_fields].copy()
        if "date" in features_df.columns:
            features_df = features_df.dropna(subset=["date"])
        model_ready["features"] = _none_safe_records(features_df)

    training_target_fields = [
        "date", "company_id", "target_revenue_next_qtr", "target_anomaly_class",
        "audit_flag", "fraud_flag", "market_shock_flag", "policy_change_flag"
    ]
    existing_target_fields = [f for f in training_target_fields if f in out.columns]
    if existing_target_fields:
        model_ready["training_targets"]["records"] = _none_safe_records(out[existing_target_fields])

    dropped_rows = max(0, original_row_count - valid_forecasting_rows)
    parse_quality = build_parse_quality(valid_forecasting_rows, dropped_rows, warnings)

    normalized_data = {
        "dataset_type": "financial_statement_timeseries",
        "records": normalized_records,
    }

    return normalized_data, model_ready, warnings, parse_quality


# ----------------------------
# Operational sales normalization
# ----------------------------

def build_sales_records(df: pd.DataFrame, mapping: dict[str, str]) -> pd.DataFrame:
    out = pd.DataFrame(index=df.index)

    for canonical, source in mapping.items():
        out[canonical] = df[source]

    if "order_date" in out.columns:
        out["order_date"] = safe_datetime(out["order_date"])

    if "ship_date" in out.columns:
        out["ship_date"] = safe_datetime(out["ship_date"])

    numeric_fields = ["sales", "quantity", "discount", "profit"]
    for field in numeric_fields:
        if field in out.columns:
            out[field] = safe_numeric(out[field])

    if "order_date" in out.columns:
        out["year"] = out["order_date"].dt.year
        out["quarter"] = out["order_date"].dt.quarter
        out["month"] = out["order_date"].dt.month

    return out


def normalize_operational_sales_dataset(
    df: pd.DataFrame, mapping: dict[str, str]
) -> tuple[dict[str, Any], dict[str, Any], list[str], dict[str, Any]]:
    warnings: list[str] = []
    out = build_sales_records(df, mapping)
    original_row_count = len(out)

    if "order_date" not in out.columns:
        warnings.append("No order_date-like column detected. Time-based aggregation may be limited.")

    if "sales" not in out.columns:
        warnings.append("No sales-like column detected.")

    if "profit" not in out.columns:
        warnings.append("No profit-like column detected; expenses cannot be inferred without profit.")
    else:
        warnings.append("Expenses for operational sales datasets are inferred as revenue minus profit.")

    invalid_dates = int(out["order_date"].isna().sum()) if "order_date" in out.columns else 0
    if invalid_dates > 0:
        warnings.append(f"Dropped {invalid_dates} rows because order_date could not be parsed.")

    if "order_date" in out.columns:
        dup_count = int(out.duplicated(subset=["order_date"], keep=False).sum())
        if dup_count > 0:
            warnings.append(f"Detected {dup_count} rows sharing the same order_date; monthly aggregation will combine them.")

    pretty = out.copy()
    if "order_date" in pretty.columns:
        pretty["order_date"] = pretty["order_date"].dt.strftime("%Y-%m-%d")
    if "ship_date" in pretty.columns:
        pretty["ship_date"] = pretty["ship_date"].dt.strftime("%Y-%m-%d")

    ordered_fields = [
        "order_date", "ship_date", "year", "quarter", "month",
        "sales", "quantity", "discount", "profit",
        "region", "state", "city", "segment",
        "category", "sub_category", "product_name",
        "order_id", "customer_id", "product_id",
    ]
    present_fields = [f for f in ordered_fields if f in pretty.columns]
    normalized_records = _none_safe_records(pretty[present_fields]) if present_fields else []

    model_ready: dict[str, Any] = {
        "forecasting": [],
        "features": [],
        "aggregations": {},
    }

    valid_forecasting_rows = 0
    if "order_date" in out.columns and "sales" in out.columns:
        agg_cols = {"sales": "sum"}
        if "profit" in out.columns:
            agg_cols["profit"] = "sum"

        monthly = (
            out.dropna(subset=["order_date"])
            .assign(month_start=lambda d: d["order_date"].dt.to_period("M").dt.to_timestamp())
            .groupby("month_start", as_index=False)
            .agg(agg_cols)
            .sort_values("month_start")
        )

        valid_forecasting_rows = len(monthly)
        model_ready["forecasting"] = [
            {
                "ds": row["month_start"].strftime("%Y-%m-%d"),
                "revenue": float(row["sales"]),
                "expenses": (
                    float(row["sales"] - row["profit"])
                    if "profit" in monthly.columns and pd.notna(row.get("profit"))
                    else None
                ),
            }
            for _, row in monthly.iterrows()
        ]

        model_ready["aggregations"]["monthly_financials"] = [
            {
                "date": row["month_start"].strftime("%Y-%m-%d"),
                "revenue": float(row["sales"]),
                "expenses": (
                    float(row["sales"] - row["profit"])
                    if "profit" in monthly.columns and pd.notna(row.get("profit"))
                    else None
                ),
                "profit": (float(row["profit"]) if "profit" in monthly.columns and pd.notna(row.get("profit")) else None),
            }
            for _, row in monthly.iterrows()
        ]

    feature_fields = ["order_date", "sales", "profit", "discount", "quantity", "region", "category", "segment"]
    existing_feature_fields = [f for f in feature_fields if f in pretty.columns]
    if existing_feature_fields:
        model_ready["features"] = _none_safe_records(pretty[existing_feature_fields])

    if "region" in out.columns and "sales" in out.columns:
        by_region = out.groupby("region", dropna=False, as_index=False)["sales"].sum()
        model_ready["aggregations"]["by_region"] = _none_safe_records(by_region)

    if "category" in out.columns and "sales" in out.columns:
        by_category = out.groupby("category", dropna=False, as_index=False)["sales"].sum()
        model_ready["aggregations"]["by_category"] = _none_safe_records(by_category)

    dropped_rows = max(0, original_row_count - valid_forecasting_rows)
    parse_quality = build_parse_quality(valid_forecasting_rows, dropped_rows, warnings)

    normalized_data = {
        "dataset_type": "operational_sales_dataset",
        "records": normalized_records,
    }

    return normalized_data, model_ready, warnings, parse_quality


# ----------------------------
# Main parser
# ----------------------------

def parse_uploaded_financial_file(filename: str, content: bytes) -> dict[str, Any]:
    ext = get_file_extension(filename)
    if ext not in SUPPORTED_EXTENSIONS:
        raise ValueError(f"Unsupported file type: {ext}")

    if not content:
        raise ValueError("Uploaded file is empty.")

    original_df = load_uploaded_file(filename, content)
    if original_df.empty:
        raise ValueError("Uploaded file contains no rows.")

    original_df = normalize_dataframe_columns(original_df)
    document_type, mapping = classify_dataset(original_df)

    if document_type == "financial_statement_timeseries":
        normalized_data, model_ready, warnings, parse_quality = normalize_financial_statement_dataset(original_df, mapping)
    elif document_type == "operational_sales_dataset":
        normalized_data, model_ready, warnings, parse_quality = normalize_operational_sales_dataset(original_df, mapping)
    else:
        warnings = ["Could not confidently classify the uploaded file into a supported dataset family."]
        normalized_data = {
            "dataset_type": "unknown",
            "records": _none_safe_records(original_df.head(20)),
        }
        model_ready = {"forecasting": []}
        parse_quality = build_parse_quality(0, len(original_df), warnings)

    parsed_successfully = len(model_ready.get("forecasting", [])) > 0

    return {
        "file_name": filename,
        "file_type": ext.replace(".", ""),
        "document_type": document_type,
        "parsed_successfully": parsed_successfully,
        "row_count": int(len(original_df)),
        "columns_detected": list(original_df.columns),
        "mapped_columns": mapping,
        "preview_rows": _none_safe_records(original_df.head(10)),
        "normalized_data": normalized_data,
        "model_ready": model_ready,
        "warnings": warnings,
        "parse_quality": parse_quality,
    }
