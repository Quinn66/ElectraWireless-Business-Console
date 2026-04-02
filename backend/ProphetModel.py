import logging
logging.getLogger("cmdstanpy").setLevel(logging.WARNING)

import pandas as pd
import json
import matplotlib.pyplot as plt
from darts import TimeSeries
from darts.models import Prophet as DartsProphet

# adjust parameters currently just on default settings, these setting make it super innacurate for now
# prophet_params = {
#     "growth": "linear",                # "linear" or "logistic"
#     "seasonality_mode": "additive",    # "additive" or "multiplicative"
#     "yearly_seasonality": True,        # True, False, or int
#     "weekly_seasonality": True,        # True, False, or int
#     "daily_seasonality": False,        # True, False, or int
#     "changepoint_prior_scale": 0.05
# }

# loading data from the sample
df = pd.read_csv("sample_data.csv")
df['ds'] = pd.to_datetime(df['month'])
df['y'] = df['revenue'].astype(float)

# Convert to Darts TimeSeries
series = TimeSeries.from_dataframe(df, 'ds', 'y')

# train test data currently 50/50
split = len(series) // 2
train, test = series[:split], series[split:]

# darts prophet model using defualt settings for now
model = DartsProphet(
    # growth=prophet_params["growth"],
    # seasonality_mode=prophet_params["seasonality_mode"],
    # yearly_seasonality=prophet_params["yearly_seasonality"],
    # weekly_seasonality=prophet_params["weekly_seasonality"],
    # daily_seasonality=prophet_params["daily_seasonality"],
    # changepoint_prior_scale=prophet_params["changepoint_prior_scale"]
)
model.fit(train)

# Forecast test period
forecast = model.predict(len(test))


# Prepare full results JSON (train + test)
# Forecast for train period
train_pred = model.predict(len(train))

results = []
# Train period
for t, a, p in zip(train.time_index, train.values(), train_pred.values()):
    results.append({
        "month": str(t),
        "actual_revenue": float(a[0]),
        "predicted_revenue": float(p[0])
    })

# Test period
for t, a, p in zip(test.time_index, test.values(), forecast.values()):
    results.append({
        "month": str(t),
        "actual_revenue": float(a[0]),
        "predicted_revenue": float(p[0])
    })

with open("results.json", "w") as f:
    json.dump(results, f, indent=4)

print("Done. Full results saved to results.json")

# Plot from JSON
# make graph based off of the .json
with open("results.json", "r") as f:
    data = json.load(f)

months = [pd.to_datetime(d['month']) for d in data]
actual = [d['actual_revenue'] for d in data]
predicted = [d['predicted_revenue'] for d in data]

plt.figure(figsize=(12,6))

plt.plot(months, actual, label="Actual Revenue", color='blue', marker='o')
plt.plot(months, predicted, label="Predicted Revenue", color='red', linestyle='--', marker='x')

plt.xlabel("Month")
plt.ylabel("Revenue")
plt.title("Revenue Forecast")
plt.legend()
plt.grid(True)
plt.tight_layout()

plt.show()
plt.savefig("forecast.png")