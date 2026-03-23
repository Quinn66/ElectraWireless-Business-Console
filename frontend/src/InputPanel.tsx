import React from "react";

export interface ForecastParams {
  revenue: number;
  expenses: number;
  growth_rate: number;
  cost_growth_rate: number;
  months: number;
  what_if_annual_cost: number;
}

interface Props {
  params: ForecastParams;
  onChange: (updated: ForecastParams) => void;
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ marginBottom: "1.2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem" }}>
        <label style={{ fontWeight: 500 }}>{label}</label>
        <span style={{ color: "#4f8ef7", fontWeight: 600 }}>{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%" }}
      />
    </div>
  );
}

const fmt$ = (v: number) => `$${v.toLocaleString()}`;
const fmtPct = (v: number) => `${(v * 100).toFixed(1)}%`;
const fmtMo = (v: number) => `${v} mo`;

export default function InputPanel({ params, onChange }: Props) {
  const set = (key: keyof ForecastParams) => (val: number) =>
    onChange({ ...params, [key]: val });

  return (
    <div
      style={{
        background: "#1a1d2e",
        borderRadius: "12px",
        padding: "1.5rem",
        width: "280px",
        flexShrink: 0,
      }}
    >
      <h2 style={{ margin: "0 0 1.5rem", fontSize: "1rem", color: "#a0aec0", textTransform: "uppercase", letterSpacing: "0.08em" }}>
        Inputs
      </h2>

      <Slider label="Monthly Revenue" value={params.revenue} min={5000} max={100000} step={500} format={fmt$} onChange={set("revenue")} />
      <Slider label="Monthly Expenses" value={params.expenses} min={2000} max={80000} step={500} format={fmt$} onChange={set("expenses")} />
      <Slider label="Revenue Growth / Mo" value={params.growth_rate} min={0} max={0.2} step={0.005} format={fmtPct} onChange={set("growth_rate")} />
      <Slider label="Cost Growth / Mo" value={params.cost_growth_rate} min={0} max={0.1} step={0.005} format={fmtPct} onChange={set("cost_growth_rate")} />
      <Slider label="Forecast Period" value={params.months} min={3} max={36} step={3} format={fmtMo} onChange={set("months")} />

      <hr style={{ border: "1px solid #2d3248", margin: "1.2rem 0" }} />

      <p style={{ fontSize: "0.8rem", color: "#a0aec0", margin: "0 0 0.8rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        What-If Scenarios
      </p>

      <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", cursor: "pointer", marginBottom: "0.5rem" }}>
        <input
          type="checkbox"
          checked={params.what_if_annual_cost === 80000}
          onChange={(e) => set("what_if_annual_cost")(e.target.checked ? 80000 : 0)}
        />
        <span style={{ fontSize: "0.9rem" }}>Add Full-Time Hire (+$80k/yr)</span>
      </label>
    </div>
  );
}
