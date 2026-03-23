import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import InputPanel, { ForecastParams } from "./InputPanel";
import ForecastChart from "./ForecastChart";

const DEFAULT_PARAMS: ForecastParams = {
  revenue: 40100,
  expenses: 26000,
  growth_rate: 0.05,
  cost_growth_rate: 0.02,
  months: 12,
  what_if_annual_cost: 0,
};

interface HistoricalRow {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
}

interface ForecastRow {
  month: number;
  revenue: number;
  expenses: number;
  profit: number;
}

export default function App() {
  const [params, setParams] = useState<ForecastParams>(DEFAULT_PARAMS);
  const [historical, setHistorical] = useState<HistoricalRow[]>([]);
  const [forecast, setForecast] = useState<ForecastRow[]>([]);
  const [loading, setLoading] = useState(false);

  // Load historical data once on mount
  useEffect(() => {
    axios.get<{ data: HistoricalRow[] }>("/sample-data").then((res) => {
      setHistorical(res.data.data);
    });
  }, []);

  const runForecast = useCallback(async (p: ForecastParams) => {
    setLoading(true);
    try {
      const res = await axios.post<{ historical: HistoricalRow[]; forecast: ForecastRow[] }>("/forecast", p);
      setForecast(res.data.forecast);
    } finally {
      setLoading(false);
    }
  }, []);

  // Run forecast whenever params change
  useEffect(() => {
    runForecast(params);
  }, [params, runForecast]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#111827",
        color: "#e5e7eb",
        fontFamily: "'Inter', system-ui, sans-serif",
        padding: "2rem",
        boxSizing: "border-box",
      }}
    >
      <header style={{ marginBottom: "2rem" }}>
        <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700 }}>
          ElectraWireless Business Console
        </h1>
        <p style={{ margin: "0.3rem 0 0", color: "#6b7280", fontSize: "0.9rem" }}>
          Financial Forecasting Dashboard
        </p>
      </header>

      <div style={{ display: "flex", gap: "1.5rem", alignItems: "flex-start" }}>
        <InputPanel params={params} onChange={setParams} />
        <ForecastChart historical={historical} forecast={forecast} loading={loading} />
      </div>
    </div>
  );
}
