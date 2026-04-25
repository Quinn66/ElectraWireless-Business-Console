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
split_idx = int(len(df) * 0.8)
train_df = df.iloc[:split_idx]
test_df = df.iloc[split_idx:]

train_series = TimeSeries.from_dataframe(train_df, time_col='ds', value_cols='y')
test_series = TimeSeries.from_dataframe(test_df, time_col='ds', value_cols='y')

# Initialize Prophet Model
model = DartsProphet(
    growth="linear",
    seasonality_mode="additive",
    yearly_seasonality=False,
    weekly_seasonality=False,
    daily_seasonality=False,
    changepoint_prior_scale=0.5
)

# Train Model
with contextlib.redirect_stderr(open(os.devnull, 'w')):
    model.fit(train_series, verbose=False)

# Forecast Test Period Only
with contextlib.redirect_stderr(open(os.devnull, 'w')):
    forecast_series = model.predict(len(test_series))

# Flatten predictions
forecast_values = forecast_series.values().flatten().tolist()
forecast_time_values = [t.strftime("%Y-%m") for t in test_series.time_index]

# Prepare Combined Data for Plot - test + train data combined for json and plotting
combined_actual_values = train_series.values().flatten().tolist() + test_series.values().flatten().tolist()
combined_pred_values = train_series.values().flatten().tolist() + forecast_values
combined_time_values = [t.strftime("%Y-%m") for t in train_series.time_index] + forecast_time_values

# Save to JSON
predictions = {
    "combined": {
        "time": combined_time_values,
        "actual": combined_actual_values,
        "predicted": combined_pred_values
    }
}

with open("predictions.json", "w") as f:
    json.dump(predictions, f, indent=4)
# MAE = Mean Absolute Error → average absolute difference between predicted and actual values
# MAPE = Mean Absolute Percentage Error → average percentage difference between predicted and actual values
# Compute Metrics on Test Only
mae_val = mae(test_series, forecast_series)
mape_val = mape(test_series, forecast_series)
print(f"Test MAE: {mae_val:.2f}, MAPE: {mape_val:.2f}%")

# Plot
plt.figure(figsize=(12,6))
plt.plot(combined_time_values, combined_actual_values, label="Actual Data", marker='o', color='green')
plt.plot(combined_time_values, combined_pred_values, label="Predicted Data", linestyle='--', marker='x', color='red')

plt.axvline(x=train_series.time_index[-1].strftime("%Y-%m"), color='black', linestyle=':', label='Train/Test Split')

plt.xlabel("Month")
plt.ylabel("Revenue")
plt.title("Revenue Forecast (Train + Test)")
plt.legend()
plt.grid(True)

from matplotlib.ticker import MaxNLocator
plt.gca().xaxis.set_major_locator(MaxNLocator(nbins=12))
plt.tight_layout()
plt.show()