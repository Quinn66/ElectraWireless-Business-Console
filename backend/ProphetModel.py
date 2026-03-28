import logging
logging.getLogger("cmdstanpy").setLevel(logging.ERROR)

import os
import contextlib
import pandas as pd
import matplotlib.pyplot as plt
from darts import TimeSeries
from darts.models import Prophet as DartsProphet
from darts.metrics import mae, mape
import json

# Load Revenue Data
df = pd.read_csv("sample_data.csv")
df['ds'] = pd.to_datetime(df['month'])
df['y'] = df['revenue'].astype(float)

# Train/Test Split (80/20)
split_idx = int(len(df) * 0.5)
train_df = df.iloc[:split_idx]
test_df = df.iloc[split_idx:]

# Convert to TimeSeries
train_series = TimeSeries.from_dataframe(train_df, time_col='ds', value_cols='y')
test_series = TimeSeries.from_dataframe(test_df, time_col='ds', value_cols='y')

# Initialize Prophet Model
model = DartsProphet(
    growth="linear",
    seasonality_mode="additive",
    yearly_seasonality=False,
    weekly_seasonality=False,
    daily_seasonality=False,
    changepoint_prior_scale=0.01
)

# Train Model
with contextlib.redirect_stderr(open(os.devnull, 'w')):
    model.fit(train_series, verbose=False)

# Historical Forecasts for Train
with contextlib.redirect_stderr(open(os.devnull, 'w')):
    train_pred_series = model.historical_forecasts(
        train_series,
        start=0.0,
        forecast_horizon=1,
        stride=1,
        retrain=True,
        verbose=False,
        show_warnings=False,
        overlap_end=False
    )

# Flatten predictions & align actuals
train_pred_values = train_pred_series.values().flatten().tolist()
train_actual_values = train_series.slice_intersect(train_pred_series).values().flatten().tolist()
train_time_values = [t.strftime("%Y-%m") for t in train_series.slice_intersect(train_pred_series).time_index]

# Forecast Test Period
with contextlib.redirect_stderr(open(os.devnull, 'w')):
    forecast_series = model.predict(len(test_series))

test_pred_values = forecast_series.values().flatten().tolist()
test_actual_values = test_series.values().flatten().tolist()
test_time_values = [t.strftime("%Y-%m") for t in test_series.time_index]

# Save to JSON
predictions = {
    "train": {
        "time": train_time_values,
        "actual": train_actual_values,
        "predicted": train_pred_values
    },
    "test": {
        "time": test_time_values,
        "actual": test_actual_values,
        "predicted": test_pred_values
    }
}

with open("predictions.json", "w") as f:
    json.dump(predictions, f, indent=4)

# Compute Metrics
mae_val = mae(test_series, forecast_series)
mape_val = mape(test_series, forecast_series)
print(f"Test MAE: {mae_val:.2f}, MAPE: {mape_val:.2f}%")

# Plot from JSON
with open("predictions.json", "r") as f:
    data = json.load(f)

plt.figure(figsize=(12,6))

# Training data
plt.plot(data["train"]["time"], data["train"]["actual"], label="Training Data", marker='o', color='green')
plt.plot(data["train"]["time"], data["train"]["predicted"], label="Predicted (Train)", linestyle='--', marker='x', color='red')

# Test data
plt.plot(data["test"]["time"], data["test"]["actual"], label="Actual (Test)", marker='o', color='blue')
plt.plot(data["test"]["time"], data["test"]["predicted"], label="Predicted (Test)", linestyle='--', marker='x', color='orange')

plt.xlabel("Month")
plt.ylabel("Revenue")
plt.title("Revenue Forecast (Train vs Actual vs Predicted)")
plt.legend()
plt.grid(True)
plt.xticks(rotation=0)

from matplotlib.ticker import MaxNLocator
plt.gca().xaxis.set_major_locator(MaxNLocator(nbins=12))

plt.tight_layout()
plt.show()