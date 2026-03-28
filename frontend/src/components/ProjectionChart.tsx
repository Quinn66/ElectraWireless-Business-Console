import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { MonthRow, formatCurrency } from "@/lib/projection";
import { HistoricalPoint, ProphetPoint, SliderForecastPoint } from "@/store/projectionStore";

interface ProjectionChartProps {
  data: MonthRow[];
  historical?: HistoricalPoint[];
  prophetForecast?: ProphetPoint[];
  sliderForecast?: SliderForecastPoint[];
}

function fmtDs(ds: string): string {
  const d = new Date(ds + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        backgroundColor: "#16161F",
        border: "1px solid #2a2a35",
        borderRadius: "8px",
        padding: "10px 14px",
        fontSize: "12px",
      }}
    >
      <div style={{ color: "#888", marginBottom: "6px", fontWeight: 600 }}>{label}</div>
      {payload.map((entry: any) => (
        <div key={entry.name} style={{ color: entry.color, marginBottom: "2px" }}>
          {entry.name}: {formatCurrency(entry.value)}
        </div>
      ))}
    </div>
  );
}

export function ProjectionChart({
  data,
  historical,
  prophetForecast,
  sliderForecast,
}: ProjectionChartProps) {
  const hasApiData = historical && historical.length > 0;

  if (hasApiData && sliderForecast && sliderForecast.length > 0) {
    // --- API-driven chart: historical + prophet baseline + slider forecast ---

    // Build unified data array — only show last 6 historical months so forecast dominates
    const histEntries = historical!.slice(-6).map((h) => ({
      name: fmtDs(h.ds),
      hist_revenue: h.revenue,
      hist_expenses: h.expenses,
      type: "historical" as const,
    }));

    const dividerName = histEntries[histEntries.length - 1]?.name ?? "";

    const forecastEntries = sliderForecast.map((s, i) => ({
      name: fmtDs(s.ds),
      slider_revenue: s.revenue,
      slider_expenses: s.expenses,
      net_profit: s.net_profit,
      prophet_revenue: prophetForecast?.[i]?.revenue ?? null,
      type: "forecast" as const,
    }));

    const chartData = [...histEntries, ...forecastEntries];

    const legendItems = [
      { color: "#888", label: "Historical Revenue", dashed: false },
      { color: "#5B7FD4", label: "Prophet Baseline", dashed: true },
      { color: "#C9A84C", label: "Your Forecast (Revenue)", dashed: false },
      { color: "#E24B4A", label: "Expenses", dashed: false },
      { color: "#1D9E75", label: "Net Profit", dashed: false },
    ];

    return (
      <div>
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a1a24" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: "#555" }}
              axisLine={false}
              tickLine={false}
              interval={Math.floor(chartData.length / 8)}
            />
            <YAxis
              tickFormatter={formatCurrency}
              tick={{ fontSize: 11, fill: "#555" }}
              axisLine={false}
              tickLine={false}
              width={55}
            />
            <Tooltip content={<CustomTooltip />} />
            {dividerName && (
              <ReferenceLine
                x={dividerName}
                stroke="#2a2a35"
                strokeDasharray="4 4"
                label={{ value: "Today", fill: "#444", fontSize: 10, position: "top" }}
              />
            )}
            <Line
              type="monotone"
              dataKey="hist_revenue"
              name="Historical Revenue"
              stroke="#555"
              strokeWidth={2}
              dot={false}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="prophet_revenue"
              name="Prophet Baseline"
              stroke="#5B7FD4"
              strokeWidth={1.5}
              strokeDasharray="5 3"
              dot={false}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="slider_revenue"
              name="Your Forecast (Revenue)"
              stroke="#C9A84C"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "#C9A84C" }}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="slider_expenses"
              name="Expenses"
              stroke="#E24B4A"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "#E24B4A" }}
              connectNulls={false}
            />
            <Area
              type="monotone"
              dataKey="net_profit"
              name="Net Profit"
              stroke="#1D9E75"
              strokeWidth={2}
              fill="#1D9E75"
              fillOpacity={0.1}
              dot={false}
              activeDot={{ r: 4, fill: "#1D9E75" }}
              connectNulls={false}
            />
          </ComposedChart>
        </ResponsiveContainer>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "14px 20px", paddingLeft: "55px", marginTop: "10px" }}>
          {legendItems.map(({ color, label, dashed }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div
                style={{
                  width: dashed ? 14 : 8,
                  height: dashed ? 2 : 8,
                  borderRadius: dashed ? 0 : "50%",
                  backgroundColor: color,
                  opacity: dashed ? 0.8 : 1,
                  borderBottom: dashed ? `2px dashed ${color}` : undefined,
                  background: dashed ? "none" : color,
                  borderTop: dashed ? `2px dashed ${color}` : undefined,
                }}
              />
              <span style={{ fontSize: "11px", color: "#666" }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // --- Fallback: local-math chart (backend not connected) ---
  const chartData = data.map((row) => ({
    name: `M${row.month}`,
    Revenue: Math.round(row.revenue),
    Expenses: Math.round(row.expenses),
    "Net Profit": Math.round(row.netProfit),
  }));

  return (
    <div>
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1a1a24" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: "#555" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatCurrency}
            tick={{ fontSize: 11, fill: "#555" }}
            axisLine={false}
            tickLine={false}
            width={55}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="Revenue"
            stroke="#C9A84C"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: "#C9A84C" }}
          />
          <Line
            type="monotone"
            dataKey="Expenses"
            stroke="#E24B4A"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: "#E24B4A" }}
          />
          <Area
            type="monotone"
            dataKey="Net Profit"
            stroke="#1D9E75"
            strokeWidth={2}
            fill="#1D9E75"
            fillOpacity={0.1}
            dot={false}
            activeDot={{ r: 4, fill: "#1D9E75" }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <div style={{ display: "flex", gap: "20px", paddingLeft: "55px", marginTop: "8px" }}>
        {[
          { color: "#C9A84C", label: "Revenue" },
          { color: "#E24B4A", label: "Expenses" },
          { color: "#1D9E75", label: "Net Profit" },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: color }} />
            <span style={{ fontSize: "11px", color: "#666" }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
