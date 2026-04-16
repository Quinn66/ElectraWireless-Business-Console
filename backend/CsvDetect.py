import pandas as pd
from sklearn.ensemble import IsolationForest, RandomForestRegressor

# Load CSV
input_file = "Sample - Superstore.csv"
df = pd.read_csv(input_file, encoding="latin1")

# Select numeric columns - replace with already existing logic later
numeric_cols = df.select_dtypes(include=['number']).columns.tolist()
exclude_cols = ["Row ID", "Postal Code"]
numeric_cols = [col for col in numeric_cols if col not in exclude_cols]

# Store results
results = []

# Process each column
for target_col in numeric_cols:

    # Detect anomalies
    col_data = df[[target_col]].dropna()

    if len(col_data) < 10:
        continue

    iso = IsolationForest(random_state=1)
    preds = iso.fit_predict(col_data)

    anomaly_indices = col_data.index[preds == -1]
    normal_indices = col_data.index[preds == 1]

    if len(anomaly_indices) == 0:
        continue

    # Train model
    feature_cols = [c for c in numeric_cols if c != target_col]

    train_df = df.loc[normal_indices, feature_cols + [target_col]].dropna()

    if len(train_df) < 10:
        continue

    X_train = train_df[feature_cols]
    y_train = train_df[target_col]

    model = RandomForestRegressor(n_estimators=100, random_state=1)
    model.fit(X_train, y_train)

    # Predict anomalies
    for idx in anomaly_indices:
        row_features = df.loc[idx, feature_cols]

        # Skip rows with missing features
        if row_features.isnull().any():
            continue

        predicted_value = round(
            model.predict(row_features.to_frame().T)[0],
            2
        )

        original_value = df.at[idx, target_col]

        results.append({
            "Row": idx,
            "Column": target_col,
            "Original Value": original_value,
            "Predicted Value": predicted_value,
            "Difference": round(abs(original_value - predicted_value), 2)
        })

# Save results
results_df = pd.DataFrame(results)

output_file = "anomaly_predictions.csv"
results_df.to_csv(output_file, index=False)

# Final output
print(f"Done! Predictions saved in {output_file}")
print(f"Total anomalies predicted: {len(results_df)}")

if results_df.empty:
    print("No anomalies detected — try increasing contamination.")