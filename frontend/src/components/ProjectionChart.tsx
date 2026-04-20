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
import { C_PRIMARY, C_VIOLET, C_HIST, C_ERROR, C_SUCCESS } from "@/lib/colors";

// Chart line colour aliases
const C_REVENUE  = C_PRIMARY;
const C_PROPHET  = C_VIOLET;
const C_EXPENSES = C_ERROR;
const C_PROFIT   = C_SUCCESS;

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

interface TooltipEntry { name: string; value: number; color?: string; }
interface TooltipProps { active?: boolean; payload?: TooltipEntry[]; label?: string; }

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/90 backdrop-blur-sm border border-border rounded-lg px-3.5 py-2.5 text-xs shadow-[0_4px_16px_rgba(47,36,133,0.12)]">
      <div className="text-muted-foreground mb-1.5 font-semibold">{label}</div>
      {payload.map((entry) => (
        <div key={entry.name} className="mb-0.5" style={{ color: entry.color }}>
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
    const histEntries = historical!.slice(-6).map((h) => ({
      name: fmtDs(h.ds),
      hist_revenue: h.revenue,
      hist_expenses: h.expenses,
      type: "historical" as const,
    }));

    const dividerName = histEntries[histEntries.length - 1]?.name ?? "";

    const forecastEntries = sliderForecast.map((s) => {
      const match = prophetForecast?.find((p) => p.ds === s.ds);
      return {
        name: fmtDs(s.ds),
        slider_revenue: s.revenue,
        slider_expenses: s.expenses,
        net_profit: s.net_profit,
        prophet_revenue: match?.revenue ?? null,
        prophet_lower: match?.yhat_lower ?? null,
        prophet_upper: match?.yhat_upper ?? null,
        type: "forecast" as const,
      };
    });

    const chartData = [...histEntries, ...forecastEntries];

    const legendItems = [
      { color: C_HIST,     label: "Historical Revenue",         dashed: false, band: false },
      { color: C_PROPHET,  label: "Prophet Baseline",           dashed: true,  band: false },
      { color: C_PROPHET,  label: "Prophet Confidence Band",    dashed: false, band: true  },
      { color: C_REVENUE,  label: "Your Forecast (Revenue)",    dashed: false, band: false },
      { color: C_EXPENSES, label: "Expenses",                   dashed: false, band: false },
      { color: C_PROFIT,   label: "Net Profit",                 dashed: false, band: false },
    ];

    return (
      <div>
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(47,36,133,0.08)" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: "#6b6890" }}
              axisLine={false}
              tickLine={false}
              interval={Math.floor(chartData.length / 8)}
            />
            <YAxis
              tickFormatter={formatCurrency}
              tick={{ fontSize: 11, fill: "#6b6890" }}
              axisLine={false}
              tickLine={false}
              width={55}
            />
            <Tooltip content={<CustomTooltip />} />
            {dividerName && (
              <ReferenceLine
                x={dividerName}
                stroke="rgba(47,36,133,0.20)"
                strokeDasharray="4 4"
                label={{ value: "Today", fill: "#6b6890", fontSize: 10, position: "top" }}
              />
            )}
            <Line type="monotone" dataKey="hist_revenue"    name="Historical Revenue"      stroke={C_HIST}     strokeWidth={2}   dot={false} connectNulls={false} />
            <Area type="monotone" dataKey="prophet_upper"  name="Prophet Confidence Band"  stroke="none"       fill={C_PROPHET} fillOpacity={0.10} dot={false} connectNulls={false} legendType="none" />
            <Area type="monotone" dataKey="prophet_lower"  name=""                         stroke="none"       fill="white"     fillOpacity={1}    dot={false} connectNulls={false} legendType="none" />
            <Line type="monotone" dataKey="prophet_revenue" name="Prophet Baseline"         stroke={C_PROPHET}  strokeWidth={1.5} strokeDasharray="5 3" dot={false} connectNulls={false} />
            <Line type="monotone" dataKey="slider_revenue"  name="Your Forecast (Revenue)"  stroke={C_REVENUE}  strokeWidth={2}   dot={false} activeDot={{ r: 4, fill: C_REVENUE }}  connectNulls={false} />
            <Line type="monotone" dataKey="slider_expenses" name="Expenses"                 stroke={C_EXPENSES} strokeWidth={2}   dot={false} activeDot={{ r: 4, fill: C_EXPENSES }} connectNulls={false} />
            <Area type="monotone" dataKey="net_profit"      name="Net Profit"               stroke={C_PROFIT}   strokeWidth={2}   fill={C_PROFIT} fillOpacity={0.08} dot={false} activeDot={{ r: 4, fill: C_PROFIT }} connectNulls={false} />
          </ComposedChart>
        </ResponsiveContainer>

        <div className="flex flex-wrap gap-x-5 gap-y-1 pl-[55px] mt-2.5">
          {legendItems.map(({ color, label, dashed, band }) => (
            <div key={label} className="flex items-center gap-1.5">
              {band
                ? <div style={{ width: 14, height: 8, borderRadius: "2px", backgroundColor: color, opacity: 0.25 }} />
                : dashed
                  ? <div style={{ width: 14, borderTop: `2px dashed ${color}`, opacity: 0.8 }} />
                  : <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: color }} />}
              <span className="text-[11px] text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Fallback: local-math chart
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
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(47,36,133,0.08)" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b6890" }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 11, fill: "#6b6890" }} axisLine={false} tickLine={false} width={55} />
          <Tooltip content={<CustomTooltip />} />
          <Line type="monotone" dataKey="Revenue"    stroke={C_REVENUE}  strokeWidth={2} dot={false} activeDot={{ r: 4, fill: C_REVENUE }}  />
          <Line type="monotone" dataKey="Expenses"   stroke={C_EXPENSES} strokeWidth={2} dot={false} activeDot={{ r: 4, fill: C_EXPENSES }} />
          <Area type="monotone" dataKey="Net Profit" stroke={C_PROFIT}   strokeWidth={2} fill={C_PROFIT} fillOpacity={0.08} dot={false} activeDot={{ r: 4, fill: C_PROFIT }} />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="flex gap-5 pl-[55px] mt-2">
        {[
          { color: C_REVENUE,  label: "Revenue"    },
          { color: C_EXPENSES, label: "Expenses"   },
          { color: C_PROFIT,   label: "Net Profit" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: color }} />
            <span className="text-[11px] text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
