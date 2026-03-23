import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";

interface DataPoint {
  name: string;
  revenue?: number;
  expenses?: number;
  profit?: number;
  type: "historical" | "forecast";
}

interface Props {
  historical: { month: string; revenue: number; expenses: number; profit: number }[];
  forecast: { month: number; revenue: number; expenses: number; profit: number }[];
  loading: boolean;
}

const fmt$ = (v: number) =>
  v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`;

export default function ForecastChart({ historical, forecast, loading }: Props) {
  const histPoints: DataPoint[] = historical.map((d) => ({
    name: d.month,
    revenue: d.revenue,
    expenses: d.expenses,
    profit: d.revenue - d.expenses,
    type: "historical",
  }));

  const lastHistMonth = historical.length;
  const forecastPoints: DataPoint[] = forecast.map((d, i) => ({
    name: `+${d.month}mo`,
    revenue: d.revenue,
    expenses: d.expenses,
    profit: d.profit,
    type: "forecast",
  }));

  const data: DataPoint[] = [...histPoints, ...forecastPoints];
  const dividerName = forecastPoints[0]?.name;

  return (
    <div style={{ flex: 1, background: "#1a1d2e", borderRadius: "12px", padding: "1.5rem" }}>
      <h2 style={{ margin: "0 0 1.2rem", fontSize: "1rem", color: "#a0aec0", textTransform: "uppercase", letterSpacing: "0.08em" }}>
        Financial Forecast {loading && <span style={{ fontSize: "0.75rem" }}>(loading…)</span>}
      </h2>

      <ResponsiveContainer width="100%" height={380}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2d3248" />
          <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 11 }} />
          <YAxis tickFormatter={fmt$} tick={{ fill: "#6b7280", fontSize: 11 }} />
          <Tooltip
            formatter={(val: number) => `$${val.toLocaleString()}`}
            contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8 }}
            labelStyle={{ color: "#e5e7eb" }}
          />
          <Legend wrapperStyle={{ color: "#9ca3af", fontSize: 13 }} />
          {dividerName && (
            <ReferenceLine x={dividerName} stroke="#4f8ef7" strokeDasharray="6 3" label={{ value: "Forecast →", fill: "#4f8ef7", fontSize: 11 }} />
          )}
          <Line type="monotone" dataKey="revenue" stroke="#34d399" strokeWidth={2} dot={false} name="Revenue" />
          <Line type="monotone" dataKey="expenses" stroke="#f87171" strokeWidth={2} dot={false} name="Expenses" />
          <Line type="monotone" dataKey="profit" stroke="#60a5fa" strokeWidth={2} dot={false} name="Profit" strokeDasharray="5 3" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
