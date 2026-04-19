import numpy as np
import pandas as pd
try:
    import matplotlib.pyplot as plt
    MATPLOTLIB_AVAILABLE = True
except ImportError:
    MATPLOTLIB_AVAILABLE = False
from pathlib import Path
from datetime import datetime
from typing import Tuple, List, Dict
import warnings
import json
warnings.filterwarnings('ignore')

# Darts and Prophet imports
try:
    from darts import TimeSeries
    from darts.models import Prophet as DartsProphet
    from darts.dataprocessing.transformers import Scaler
    from darts.metrics import mae, mape
    DARTS_AVAILABLE = True
    # Compatibility shim: older Darts versions expose to_dataframe(), newer ones use pd_dataframe()
    if not hasattr(TimeSeries, 'pd_dataframe') and hasattr(TimeSeries, 'to_dataframe'):
        TimeSeries.pd_dataframe = TimeSeries.to_dataframe
except ImportError:
    print("Warning: Darts library not available. Please install with: pip install darts")
    DARTS_AVAILABLE = False
    TimeSeries = None
    DartsProphet = None

# Define the path to the financial dataset
FINANCIAL_DATA_PATH = Path(__file__).parent / "Sample_data/financial_dataset.csv"

def load_and_preprocess_data(file_path: str = None, company_id: str = "CMP_001") -> pd.DataFrame:
    """
    Load and preprocess the financial dataset.

    Args:
        file_path: Path to the CSV file (optional, defaults to FINANCIAL_DATA_PATH)
        company_id: Company ID to filter data for (optional, defaults to "CMP_001")

    Returns:
        Preprocessed DataFrame with datetime index and selected features
    """
    if file_path is None:
        file_path = FINANCIAL_DATA_PATH

    print(f"Loading data from: {file_path}")

    # Load the dataset
    df = pd.read_csv(file_path)
    print(f"Original dataset shape: {df.shape}")
    print(f"Available companies: {df['Company_ID'].unique()}")

    # Filter for specific company if provided
    if company_id:
        df = df[df['Company_ID'] == company_id].copy()
        print(f"Filtered dataset shape for {company_id}: {df.shape}")

    if df.empty:
        raise ValueError(f"No data found for company {company_id}")

    # Convert Year + Quarter to proper datetime column 'ds'
    # Quarter 1 = January, Quarter 2 = April, Quarter 3 = July, Quarter 4 = October
    quarter_to_month = {1: 1, 2: 4, 3: 7, 4: 10}
    df['ds'] = pd.to_datetime(
        df['Year'].astype(str) + '-' + 
        df['Quarter'].map(quarter_to_month).astype(str) + '-01'
    )

    # Sort by date to ensure proper time series order
    df = df.sort_values('ds').reset_index(drop=True)

    print(f"Date range: {df['ds'].min()} to {df['ds'].max()}")
    print(f"Number of quarters: {len(df)}")

    return df

def select_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Select appropriate features and avoid leakage columns.

    Args:
        df: Preprocessed DataFrame

    Returns:
        DataFrame with selected features
    """
    # Define target variable
    target_col = 'Revenue'

    # Define potential covariates (excluding future-leakage columns)
    covariate_cols = [
        # Economic indicators (often known/forecasted in advance)
        'Inflation_Rate', 'Exchange_Rate', 'Interest_Rate',

        # Market sentiment (can be projected/estimated)
        'News_Sentiment_Score', 'Social_Media_Buzz',
        'Sector_Trend_Index', 'Global_Economic_Score',

        # Market data (available for forecasting)
        'Stock_Price', 'Volume_Traded',

        # Flags (policy/external events)
        'Market_Shock_Flag', 'Policy_Change_Flag'
    ]

    # Exclude future-based or leakage columns
    leakage_cols = ['Target_Revenue_Next_Qtr', 'Target_Anomaly_Class']

    # Select available columns
    available_covariates = [col for col in covariate_cols if col in df.columns]

    # Create final feature set
    feature_cols = ['ds', target_col] + available_covariates
    selected_df = df[feature_cols].copy()

    print(f"Selected features: {feature_cols}")
    print(f"Target variable: {target_col}")
    print(f"Covariates: {available_covariates}")

    return selected_df

def handle_missing_values(df: pd.DataFrame) -> pd.DataFrame:
    """
    Handle missing values in the dataset.

    Args:
        df: DataFrame with potential missing values

    Returns:
        DataFrame with missing values handled
    """
    print("Checking for missing values...")
    missing_counts = df.isnull().sum()
    print(f"Missing values per column:\n{missing_counts[missing_counts > 0]}")

    # For time series, we'll use forward fill followed by backward fill
    df_clean = df.copy()

    # Fill missing values for numeric columns
    numeric_cols = df_clean.select_dtypes(include=[np.number]).columns
    for col in numeric_cols:
        if col != 'ds':  # Skip datetime column
            df_clean[col] = df_clean[col].fillna(method='ffill').fillna(method='bfill')

    # If there are still missing values, fill with median
    for col in numeric_cols:
        if col != 'ds' and df_clean[col].isnull().any():
            df_clean[col] = df_clean[col].fillna(df_clean[col].median())

    print("Missing values handled.")
    return df_clean
def add_mathematical_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    # Growth rate (based on past)
    df['growth_rate'] = df['Revenue'].pct_change().shift(1)

    # Moving averages (past only)
    df['ma_2'] = df['Revenue'].rolling(2).mean().shift(1)
    df['ma_4'] = df['Revenue'].rolling(4).mean().shift(1)

    # Momentum (past only)
    df['momentum_1'] = (df['Revenue'] - df['Revenue'].shift(1)).shift(1)
    df['momentum_2'] = (df['Revenue'] - df['Revenue'].shift(2)).shift(1)

    df = df.dropna().reset_index(drop=True)

    return df

def split_data(df: pd.DataFrame, test_size: float = 0.2) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    Split the dataset into train and test sets.

    Args:
        df: Preprocessed DataFrame
        test_size: Proportion of data to use for testing

    Returns:
        Tuple of (train_df, test_df)
    """
    # Calculate split point
    split_idx = int(len(df) * (1 - test_size))

    train_df = df.iloc[:split_idx].copy()
    test_df = df.iloc[split_idx:].copy()

    print(f"Train set: {len(train_df)} quarters ({train_df['ds'].min()} to {train_df['ds'].max()})")
    print(f"Test set: {len(test_df)} quarters ({test_df['ds'].min()} to {test_df['ds'].max()})")

    return train_df, test_df

def create_darts_timeseries(df: pd.DataFrame, target_col: str = 'Revenue', 
                           covariate_cols: List[str] = None) -> Tuple[TimeSeries, TimeSeries]:
    """
    Convert DataFrame to Darts TimeSeries format.

    Args:
        df: DataFrame with time series data
        target_col: Name of the target column
        covariate_cols: List of covariate column names

    Returns:
        Tuple of (target_series, covariates_series)
    """
    if not DARTS_AVAILABLE:
        raise ImportError("Darts library is required for this function")

    # Create target time series
    target_series = TimeSeries.from_dataframe(
        df, 
        time_col='ds', 
        value_cols=[target_col],
        freq='QS'  # Quarterly start frequency
    )

    # Create covariates time series if provided
    covariates_series = None
    if covariate_cols:
        available_covariates = [col for col in covariate_cols if col in df.columns]
        if available_covariates:
            covariates_series = TimeSeries.from_dataframe(
                df,
                time_col='ds',
                value_cols=available_covariates,
                freq='QS'
            )

    return target_series, covariates_series

def train_prophet_model(train_target: TimeSeries, train_covariates: TimeSeries = None) -> DartsProphet:
    """
    Train a Prophet model using Darts.

    Args:
        train_target: Training target time series
        train_covariates: Training covariates time series (optional)

    Returns:
        Trained Prophet model
    """
    if not DARTS_AVAILABLE:
        raise ImportError("Darts library is required for this function")

    print("Training Prophet model...")

    # Initialize Prophet model with appropriate parameters for quarterly data
    model = DartsProphet(
        changepoint_prior_scale= 0.05,  # default ~0.05 →lower = smoother
        yearly_seasonality=True,
        weekly_seasonality=False,
        daily_seasonality=False,
        seasonality_mode='multiplicative',
        add_seasonalities=[
            {
                'name': 'quarterly',
                'seasonal_periods': 4,
                'fourier_order': 2
            }
        ]
    )

    #Train the model
    if train_covariates is not None:
        model.fit(train_target, future_covariates=train_covariates)
    else:
        model.fit(train_target)

    print("Prophet model training completed.")
    return model

def generate_forecast(model: DartsProphet, n_periods: int, 
                     future_covariates: TimeSeries = None) -> TimeSeries:
    """
    Generate forecasts using the trained model.

    Args:
        model: Trained Prophet model
        n_periods: Number of periods to forecast
        future_covariates: Future covariates (optional)

    Returns:
        Forecast time series
    """
    print(f"Generating forecast for {n_periods} periods...")

    if future_covariates is not None:
        forecast = model.predict(n=n_periods, future_covariates=future_covariates)
    else:
        forecast = model.predict(n=n_periods)

    print("Forecast generation completed.")
    return forecast

def evaluate_model(actual: TimeSeries, predicted: TimeSeries) -> Dict[str, float]:
    """
    Evaluate the model using MAE and MAPE metrics.

    Args:
        actual: Actual values time series
        predicted: Predicted values time series

    Returns:
        Dictionary with evaluation metrics
    """
    if not DARTS_AVAILABLE:
        raise ImportError("Darts library is required for this function")

    # Calculate metrics
    mae_score = mae(actual, predicted)
    mape_score = mape(actual, predicted)

    metrics = {
        'MAE': mae_score,
        'MAPE': mape_score
    }

    print(f"Model Evaluation Metrics:")
    print(f"MAE (Mean Absolute Error): {mae_score:.2f}")
    print(f"MAPE (Mean Absolute Percentage Error): {mape_score:.2f}%")

    return metrics

def plot_results(train_target: TimeSeries, test_target: TimeSeries,
                forecast: TimeSeries, save_path: str = None):
    """
    Plot actual vs predicted values.

    Args:
        train_target: Training target time series
        test_target: Test target time series
        forecast: Forecast time series
        save_path: Path to save the plot (optional)
    """
    if not MATPLOTLIB_AVAILABLE:
        print("matplotlib not available — skipping plot.")
        return
    plt.figure(figsize=(12, 8))

    # Plot training data
    train_target.plot(label='Training Data', color='blue', alpha=0.7)

    # Plot actual test data
    test_target.plot(label='Actual (Test)', color='green', linewidth=2)

    # Plot forecast
    forecast.plot(label='Forecast', color='red', linewidth=2, linestyle='--')

    plt.title('Revenue Forecasting: Actual vs Predicted', fontsize=16, fontweight='bold')
    plt.xlabel('Date', fontsize=12)
    plt.ylabel('Revenue', fontsize=12)
    plt.legend(fontsize=12)
    plt.grid(True, alpha=0.3)
    plt.tight_layout()

    if save_path:
        plt.savefig(save_path, dpi=300, bbox_inches='tight')
        print(f"Plot saved to: {save_path}")

    plt.show()


def save_predictions_to_json(train_df, test_df, forecast, company_id, filename="predictions.json"):
    # Convert forecast to DataFrame
    forecast_df = forecast.to_dataframe().reset_index()
    forecast_df.columns = ['ds', 'revenue']

    # Simulate bounds (since Darts Prophet doesn't give easily)
    forecast_df['yhat_lower'] = forecast_df['revenue'] * 0.9
    forecast_df['yhat_upper'] = forecast_df['revenue'] * 1.1

    # Combine historical data
    full_df = pd.concat([train_df, test_df]).reset_index(drop=True)

    historical = []
    for _, row in full_df.iterrows():
        revenue = row['Revenue']
        expenses = revenue * 0.7
        profit = revenue - expenses

        historical.append({
            "ds": row['ds'].strftime("%Y-%m-%d"),
            "revenue": round(float(revenue), 2),
            "expenses": round(float(expenses), 2),
            "profit": round(float(profit), 2),
        })

    # Prophet forecast
    prophet_forecast = []
    for _, row in forecast_df.iterrows():
        prophet_forecast.append({
            "ds": row['ds'].strftime("%Y-%m-%d"),
            "revenue": round(float(row['revenue']), 2),
            "yhat_lower": round(float(row['yhat_lower']), 2),
            "yhat_upper": round(float(row['yhat_upper']), 2),
        })

    # Slider forecast (simple logic)
    slider_forecast = []
    for _, row in forecast_df.iterrows():
        revenue = row['revenue']
        expenses = revenue * 0.7
        gross_margin = revenue * 0.6
        net_profit = revenue - expenses

        slider_forecast.append({
            "ds": row['ds'].strftime("%Y-%m-%d"),
            "revenue": round(float(revenue), 2),
            "expenses": round(float(expenses), 2),
            "gross_margin": round(float(gross_margin), 2),
            "net_profit": round(float(net_profit), 2),
        })

    # Final JSON structure
    output = {
        "historical": historical,
        "prophet_forecast": prophet_forecast,
        "slider_forecast": slider_forecast,
        "available_entities": [company_id]
    }

    # Save to file
    with open(filename, "w") as f:
        json.dump(output, f, indent=4)

    print(f"\nPredictions saved to {filename}")

def main_forecasting_pipeline(company_id: str = "CMP_001", test_size: float = 0.2):
    """
    Main function to run the complete forecasting pipeline.

    Args:
        company_id: Company ID to analyze
        test_size: Proportion of data for testing
    """
    try:
        print("="*60)
        print("FINANCIAL TIME SERIES FORECASTING PIPELINE")
        print("="*60)

        # Step 1: Load and preprocess data
        print("\n1. Loading and preprocessing data...")
        df = load_and_preprocess_data(company_id=company_id)

        # Step 2: Select features
        print("\n2. Selecting features...")
        df_features = select_features(df)

        # Step 3: Handle missing values
        print("\n3. Handling missing values...")
        df_clean = handle_missing_values(df_features)

        print("\n3. Adding mathematical features...")
        df_clean = add_mathematical_features(df_clean)

        # Step 4: Split data
        print("\n4. Splitting data...")
        train_df, test_df = split_data(df_clean, test_size=test_size)

        # Step 5: Create Darts TimeSeries
        print("\n5. Converting to Darts TimeSeries format...")
        covariate_cols = [
            col for col in df_clean.columns
            if col in ['growth_rate', 'ma_2', 'ma_4', 'momentum_1', 'momentum_2']
        ]

        train_target, train_covariates = create_darts_timeseries(
            train_df, target_col='Revenue', covariate_cols=covariate_cols
        )
        test_target, test_covariates = create_darts_timeseries(
            test_df, target_col='Revenue', covariate_cols=covariate_cols
        )

        # Step 6: Train Prophet model
        print("\n6. Training Prophet model...")
        model = train_prophet_model(train_target, train_covariates)

        # Step 7: Generate forecast
        print("\n7. Generating forecast...")
        n_test_periods = len(test_df)
        forecast = generate_forecast(model, n_test_periods, test_covariates)

        # Step 8: Evaluate model
        print("\n8. Evaluating model...")
        metrics = evaluate_model(test_target, forecast)

        # Step 9: Plot results
        print("\n9. Plotting results...")
        plot_results(train_target, test_target, forecast)

        print("\n10. Saving predictions to JSON...")
        save_predictions_to_json(train_df, test_df, forecast, company_id)

        print("\n" + "="*60)
        print("PIPELINE COMPLETED SUCCESSFULLY!")
        print("="*60)

        return {
            'model': model,
            'forecast': forecast,
            'metrics': metrics,
            'train_data': train_df,
            'test_data': test_df
        }

    except Exception as e:
        print(f"Error in forecasting pipeline: {str(e)}")
        raise

# Additional utility functions for backward compatibility
def load_sample_data() -> List[Dict]:
    """Load and return financial data as list of dictionaries for backward compatibility."""
    try:
        df = load_and_preprocess_data()
        df_features = select_features(df)
        df_clean = handle_missing_values(df_features)
        return df_clean.to_dict(orient="records")
    except Exception as e:
        print(f"Error loading sample data: {e}")
        return []

def load_prophet_historical() -> List[Dict]:
    """Return full historical series from sample_data_prophet.csv as [{ds, revenue, expenses, profit}]."""
    csv_path = Path(__file__).parent / "Sample_data" / "sample_data_prophet.csv"
    df = pd.read_csv(csv_path)
    df['ds'] = pd.to_datetime(df['ds'])
    df = df.sort_values('ds').reset_index(drop=True)
    results = []
    for _, row in df.iterrows():
        revenue = float(row['revenue'])
        expenses = float(row['expenses'])
        results.append({
            "ds": row['ds'].strftime("%Y-%m-%d"),
            "revenue": round(revenue, 2),
            "expenses": round(expenses, 2),
            "profit": round(revenue - expenses, 2),
        })
    return results


def run_prophet_forecast(months: int, company_id: str = "CMP_001") -> List[Dict]:
    """
    Train Prophet on sample_data_prophet.csv and return a `months`-period ahead forecast.
    Dates start the month after the last entry in the CSV so they align with run_slider_forecast.
    Falls back to a linear-trend extrapolation if Darts/Prophet is unavailable.
    """
    csv_path = Path(__file__).parent / "Sample_data" / "sample_data_prophet.csv"
    df = pd.read_csv(csv_path)
    df['ds'] = pd.to_datetime(df['ds'])
    df = df.sort_values('ds').reset_index(drop=True)
    last_date = df['ds'].max()

    # Future monthly dates that match run_slider_forecast output
    future_dates = [last_date + pd.DateOffset(months=i + 1) for i in range(months)]

    if DARTS_AVAILABLE:
        try:
            series = TimeSeries.from_dataframe(df, time_col='ds', value_cols='revenue', freq='MS')
            model = DartsProphet(
                yearly_seasonality=True,
                weekly_seasonality=False,
                daily_seasonality=False,
                seasonality_mode='multiplicative',
            )
            model.fit(series)
            forecast = model.predict(months)
            forecast_df = forecast.pd_dataframe().reset_index()
            forecast_df.columns = ['ds', 'revenue']
            results = []
            for _, row in forecast_df.iterrows():
                revenue_val = max(0.0, float(row['revenue']))
                results.append({
                    "ds": pd.Timestamp(row['ds']).strftime("%Y-%m-%d"),
                    "revenue": round(revenue_val, 2),
                    "yhat_lower": round(revenue_val * 0.85, 2),
                    "yhat_upper": round(revenue_val * 1.15, 2),
                })
            return results
        except Exception as e:
            print(f"Prophet model failed, using linear fallback: {e}")

    # Linear-trend fallback
    x = np.arange(len(df))
    y = df['revenue'].values
    slope, intercept = np.polyfit(x, y, 1)
    results = []
    for i, ds in enumerate(future_dates):
        revenue_val = float(max(0.0, slope * (len(df) + i) + intercept))
        results.append({
            "ds": ds.strftime("%Y-%m-%d"),
            "revenue": round(revenue_val, 2),
            "yhat_lower": round(revenue_val * 0.85, 2),
            "yhat_upper": round(revenue_val * 1.15, 2),
        })
    return results


def run_slider_forecast(
    starting_mrr: float,
    growth_rate: float,
    churn_rate: float,
    cogs_percent: float,
    marketing_spend: float,
    payroll: float,
    months: int,
) -> List[Dict]:
    """
    Generate a monthly compound-growth projection driven by the dashboard slider inputs.
    Dates start the month after the last entry in sample_data_prophet.csv so they align
    with run_prophet_forecast output.
    """
    csv_path = Path(__file__).parent / "Sample_data" / "sample_data_prophet.csv"
    df = pd.read_csv(csv_path)
    df['ds'] = pd.to_datetime(df['ds'])
    last_date = df['ds'].max()

    net_monthly_growth = (growth_rate - churn_rate) / 100.0
    mrr = starting_mrr
    results = []
    for i in range(months):
        ds = last_date + pd.DateOffset(months=i + 1)
        mrr = mrr * (1.0 + net_monthly_growth)
        revenue = mrr
        cogs = revenue * (cogs_percent / 100.0)
        total_expenses = cogs + marketing_spend + payroll
        gross_margin = revenue - cogs
        net_profit = revenue - total_expenses
        results.append({
            "ds": ds.strftime("%Y-%m-%d"),
            "revenue": round(revenue, 2),
            "expenses": round(total_expenses, 2),
            "gross_margin": round(gross_margin, 2),
            "net_profit": round(net_profit, 2),
        })
    return results


def project_forward(
    revenue: float,
    expenses: float,
    growth_rate: float,
    cost_growth_rate: float,
    months: int,
    what_if_annual_cost: float = 0.0,
) -> List[Dict]:
    """Simple compound-growth projection used by the /forecast endpoint."""
    base_date = pd.Timestamp.now().normalize().replace(day=1)
    monthly_extra = what_if_annual_cost / 12.0
    results = []
    for i in range(months):
        ds = base_date + pd.DateOffset(months=i + 1)
        revenue *= (1.0 + growth_rate)
        expenses *= (1.0 + cost_growth_rate)
        total_expenses = expenses + monthly_extra
        results.append({
            "ds": ds.strftime("%Y-%m-%d"),
            "revenue": round(revenue, 2),
            "expenses": round(total_expenses, 2),
            "profit": round(revenue - total_expenses, 2),
        })
    return results

if __name__ == "__main__":
    # Check if Darts is available
    if not DARTS_AVAILABLE:
        print("Please install the required libraries:")
        print("pip install darts")
        print("pip install prophet")
        exit(1)

    # Run the main forecasting pipeline
    try:
        results = main_forecasting_pipeline(company_id="CMP_002", test_size=0.2)

        print("\nForecasting pipeline completed successfully!")

        # Optionally, you can also test other companies
        # results_cmp002 = main_forecasting_pipeline(company_id="CMP_002", test_size=0.2)

    except Exception as e:
        print(f"Pipeline failed with error: {e}")
