import {
  ComposedChart, Line, Area, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import { useProjectionStore } from "@/store/projectionStore";
import { calcMonthlyData, calcBreakeven, calcARR, formatCurrency, formatDollar } from "@/lib/projection";
import { C_SUCCESS, C_ERROR, C_VIOLET, C_WARNING, C_PRIMARY, C_BORDER, C_BORDER_IN } from "@/lib/colors";

// ── Shared helpers ────────────────────────────────────────────────────────────

const GREEN = C_SUCCESS;
const RED   = C_ERROR;
const BLUE  = C_VIOLET;
const BG    = "rgba(255,255,255,0.60)";

const fp = (v: number) => `${v.toFixed(2)}%`;

interface TooltipEntry { name: string; value: number | string; color?: string; fill?: string; }
interface TooltipProps { active?: boolean; payload?: TooltipEntry[]; label?: string; }

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ backgroundColor: "rgba(255,255,255,0.92)", backdropFilter: "blur(8px)", border: `1px solid ${C_BORDER}`, borderRadius: "8px", padding: "10px 14px", fontSize: "12px" }}>
      <div style={{ color: "hsl(245 16% 49%)", marginBottom: "6px", fontWeight: 600 }}>{label}</div>
      {payload.map((e) => (
        <div key={e.name} style={{ color: e.color ?? e.fill ?? "#9CA3AF", marginBottom: "2px" }}>
          {e.name}: {typeof e.value === "number" ? formatDollar(e.value) : e.value}
        </div>
      ))}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "8px 12px", fontSize: "10.5px", fontWeight: 600, color: "hsl(245 16% 49%)",
  letterSpacing: "0.07em", textTransform: "uppercase", backgroundColor: "rgb(239, 237, 252)",
  borderBottom: `1px solid ${C_BORDER}`, whiteSpace: "nowrap", textAlign: "right",
};
const tdStyle: React.CSSProperties = {
  padding: "7px 12px", fontSize: "12px", borderBottom: `1px solid ${C_BORDER_IN}`,
  whiteSpace: "nowrap", textAlign: "right", backgroundColor: BG,
};

function LegendDot({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
      {dashed
        ? <div style={{ width: "14px", borderTop: `2px dashed ${color}` }} />
        : <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: color }} />}
      <span style={{ fontSize: "11px", color: "hsl(245 16% 55%)" }}>{label}</span>
    </div>
  );
}

// ── Shared panel layout ───────────────────────────────────────────────────────

interface SectorPanelProps {
  title: string;
  description: string;
  chart: React.ReactNode;
  table: React.ReactNode;
  insights: React.ReactNode;
}

function SectorPanel({ title, description, chart, table, insights }: SectorPanelProps) {
  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* Left: chart + table */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 0 20px 24px", display: "flex", flexDirection: "column", gap: "18px", minWidth: 0 }}>
        <div style={{ paddingRight: "20px" }}>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "hsl(242 44% 30%)", marginBottom: "3px" }}>{title}</div>
          <div style={{ fontSize: "11.5px", color: "hsl(245 16% 49%)" }}>{description}</div>
        </div>
        <div style={{ backgroundColor: BG, border: `1px solid ${C_BORDER}`, borderRadius: "10px", padding: "16px 18px", marginRight: "20px" }}>
          {chart}
        </div>
        <div style={{ backgroundColor: BG, border: `1px solid ${C_BORDER}`, borderRadius: "10px", overflow: "hidden", marginRight: "20px" }}>
          {table}
        </div>
      </div>
      {/* Right: insights */}
      <div style={{ width: "220px", flexShrink: 0, borderLeft: `1px solid ${C_BORDER}`, padding: "20px 14px", overflowY: "auto", backgroundColor: BG, backdropFilter: "blur(8px)" }}>
        <div style={{ fontSize: "9.5px", fontWeight: 700, color: C_PRIMARY, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "14px" }}>
          Insights
        </div>
        {insights}
      </div>
    </div>
  );
}

function InsightRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ backgroundColor: BG, border: `1px solid ${C_BORDER}`, borderRadius: "10px", padding: "12px 14px", marginBottom: "10px" }}>
      <div style={{ fontSize: "10px", color: "hsl(245 16% 49%)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "5px" }}>{label}</div>
      <div style={{ fontSize: "18px", fontWeight: 700, lineHeight: 1.2, color: color ?? C_PRIMARY }}>{value}</div>
    </div>
  );
}

// ── Revenue Analysis ──────────────────────────────────────────────────────────

function RevenueScreen({ onBack }: { onBack: () => void }) {
  const inputs = useProjectionStore();
  const { apiData } = useProjectionStore();
  const data = calcMonthlyData(inputs);
  const arr = calcARR(inputs);

  if (data.length === 0) return null;

  const chartData = data.map((row, i) => ({
    name: `M${row.month}`,
    Revenue: Math.round(row.revenue),
    ...(apiData?.historical && i === 0 ? { Historical: null } : {}),
    Prophet: null as number | null,
  }));

  let cumRevenue = 0;
  const tableData = data.map((row, i) => {
    cumRevenue += row.revenue;
    const prev = data[i - 1];
    const mom = prev && prev.revenue > 0 ? ((row.revenue - prev.revenue) / prev.revenue) * 100 : null;
    return { month: row.month, revenue: row.revenue, mom, cumRevenue };
  });

  const peakRow = data.reduce((best, r) => (r.revenue > best.revenue ? r : best), data[0]);
  const avgMom = tableData.slice(1).reduce((s, r) => s + (r.mom ?? 0), 0) / Math.max(1, tableData.length - 1);

  return (
    <SectorPanel
      title="Revenue Analysis"
      description="Projected revenue trajectory, growth rate, and cumulative revenue over the forecast period."

      chart={
        <div>
          <div style={{ fontSize: "10px", fontWeight: 600, color: "hsl(245 16% 49%)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "10px" }}>
            Revenue Forecast
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(47,36,133,0.08)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#6b6890" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 10, fill: "#6b6890" }} axisLine={false} tickLine={false} width={52} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="Revenue" name="Revenue" stroke={C_PRIMARY} strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
              <Line type="monotone" dataKey="Prophet" name="Prophet Baseline" stroke={BLUE} strokeWidth={1.5} strokeDasharray="5 3" dot={false} connectNulls={false} />
            </ComposedChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", gap: "16px", paddingLeft: "52px", marginTop: "8px" }}>
            <LegendDot color={C_PRIMARY} label="Revenue" />
            <LegendDot color={BLUE} label="Prophet Baseline (placeholder)" dashed />
          </div>
        </div>
      }
      table={
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", minWidth: "480px" }}>
            <thead>
              <tr>
                {["Month", "Revenue", "MoM Growth", "Cumulative Revenue"].map(h => (
                  <th key={h} style={{ ...thStyle, textAlign: h === "Month" ? "left" : "right", paddingLeft: h === "Month" ? "14px" : undefined }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableData.map(r => (
                <tr key={r.month} onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "hsl(247 57% 33% / 0.04)")} onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "")}>
                  <td style={{ ...tdStyle, textAlign: "left", paddingLeft: "14px", color: "hsl(245 16% 49%)" }}>Month {r.month}</td>
                  <td style={{ ...tdStyle, color: C_PRIMARY, fontWeight: 600 }}>{formatDollar(r.revenue)}</td>
                  <td style={{ ...tdStyle, color: r.mom == null ? "#555" : r.mom >= 0 ? GREEN : RED }}>
                    {r.mom == null ? "—" : `${r.mom >= 0 ? "▲" : "▼"} ${Math.abs(r.mom).toFixed(1)}%`}
                  </td>
                  <td style={{ ...tdStyle, color: "hsl(242 44% 40%)" }}>{formatDollar(r.cumRevenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      }
      insights={
        <>
          <InsightRow label="Current ARR" value={formatCurrency(arr)} color={C_PRIMARY} />
          <InsightRow label="Peak Revenue Month" value={`Month ${peakRow.month}`} color={C_PRIMARY} />
          <InsightRow label="Avg Monthly Growth" value={`${avgMom.toFixed(1)}%`} color={avgMom >= 0 ? GREEN : RED} />
          <InsightRow label="Starting MRR" value={formatCurrency(inputs.startingMRR)} />
          <InsightRow label="Forecast Months" value={`${inputs.forecastMonths} mo`} />
        </>
      }
    />
  );
}

// ── Cost Analysis ─────────────────────────────────────────────────────────────

function CostScreen({ onBack }: { onBack: () => void }) {
  const inputs = useProjectionStore();
  const data = calcMonthlyData(inputs);

  if (data.length === 0) return null;

  const chartData = data.map(row => {
    const cogs = Math.round(row.revenue * (inputs.cogsPercent / 100));
    return { name: `M${row.month}`, COGS: cogs, Marketing: inputs.marketingSpend, Payroll: inputs.payroll };
  });

  const tableData = data.map(row => {
    const cogs = row.revenue * (inputs.cogsPercent / 100);
    return { month: row.month, cogs, marketing: inputs.marketingSpend, payroll: inputs.payroll, total: row.expenses };
  });

  const avgExpenses = data.reduce((s, r) => s + r.expenses, 0) / data.length;
  const avgRevenue  = data.reduce((s, r) => s + r.revenue, 0) / data.length;
  const expRatio    = avgRevenue > 0 ? (avgExpenses / avgRevenue) * 100 : 0;
  const avgCogs     = data.reduce((s, r) => s + r.revenue * (inputs.cogsPercent / 100), 0) / data.length;
  const largest     = avgCogs >= inputs.marketingSpend && avgCogs >= inputs.payroll ? "COGS"
    : inputs.payroll >= inputs.marketingSpend ? "Payroll" : "Marketing";

  return (
    <SectorPanel
      title="Cost Analysis"
      description="Breakdown of COGS, marketing spend, and payroll as stacked cost components per month."

      chart={
        <div>
          <div style={{ fontSize: "10px", fontWeight: 600, color: "hsl(245 16% 49%)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "10px" }}>
            Stacked Expenses by Month
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(47,36,133,0.08)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#6b6890" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 10, fill: "#6b6890" }} axisLine={false} tickLine={false} width={52} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="COGS"      name="COGS"      stackId="a" fill={RED}  fillOpacity={0.85} />
              <Bar dataKey="Marketing" name="Marketing" stackId="a" fill={C_PRIMARY} fillOpacity={0.85} />
              <Bar dataKey="Payroll"   name="Payroll"   stackId="a" fill={BLUE} fillOpacity={0.85} />
            </ComposedChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", gap: "16px", paddingLeft: "52px", marginTop: "8px" }}>
            <LegendDot color={RED}  label="COGS" />
            <LegendDot color={C_PRIMARY} label="Marketing" />
            <LegendDot color={BLUE} label="Payroll" />
          </div>
        </div>
      }
      table={
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", minWidth: "480px" }}>
            <thead>
              <tr>
                {["Month", "COGS", "Marketing", "Payroll", "Total Expenses"].map(h => (
                  <th key={h} style={{ ...thStyle, textAlign: h === "Month" ? "left" : "right", paddingLeft: h === "Month" ? "14px" : undefined }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableData.map(r => (
                <tr key={r.month} onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "hsl(247 57% 33% / 0.04)")} onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "")}>
                  <td style={{ ...tdStyle, textAlign: "left", paddingLeft: "14px", color: "hsl(245 16% 49%)" }}>Month {r.month}</td>
                  <td style={{ ...tdStyle, color: RED }}>{formatDollar(r.cogs)}</td>
                  <td style={{ ...tdStyle, color: C_PRIMARY }}>{formatDollar(r.marketing)}</td>
                  <td style={{ ...tdStyle, color: BLUE }}>{formatDollar(r.payroll)}</td>
                  <td style={{ ...tdStyle, color: "#ccc", fontWeight: 600 }}>{formatDollar(r.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      }
      insights={
        <>
          <InsightRow label="Largest Cost Driver" value={largest} color={largest === "COGS" ? RED : largest === "Payroll" ? BLUE : C_PRIMARY} />
          <InsightRow label="Avg Monthly Expenses" value={formatCurrency(avgExpenses)} color={RED} />
          <InsightRow label="Expenses / Revenue" value={`${expRatio.toFixed(1)}%`} color={expRatio > 100 ? RED : expRatio > 80 ? C_WARNING : GREEN} />
          <InsightRow label="COGS %" value={`${inputs.cogsPercent}%`} color={inputs.cogsPercent > 50 ? RED : GREEN} />
        </>
      }
    />
  );
}

// ── Profitability Analysis ────────────────────────────────────────────────────

function ProfitabilityScreen({ onBack }: { onBack: () => void }) {
  const inputs = useProjectionStore();
  const data = calcMonthlyData(inputs);
  const breakeven = calcBreakeven(inputs);

  if (data.length === 0) return null;

  const chartData = data.map(row => {
    const cogs = row.revenue * (inputs.cogsPercent / 100);
    return {
      name: `M${row.month}`,
      "Gross Profit": Math.round(row.revenue - cogs),
      "Net Profit": Math.round(row.netProfit),
    };
  });

  const tableData = data.map(row => {
    const cogs = row.revenue * (inputs.cogsPercent / 100);
    const grossProfit = row.revenue - cogs;
    const netMargin = row.revenue > 0 ? (row.netProfit / row.revenue) * 100 : 0;
    return { month: row.month, grossProfit, grossMarginPct: row.grossMargin, ebitda: row.netProfit, netProfit: row.netProfit, netMarginPct: netMargin };
  });

  const firstProfitable = data.find(r => r.netProfit >= 0);
  const avgNetMargin = data.reduce((s, r) => s + (r.revenue > 0 ? (r.netProfit / r.revenue) * 100 : 0), 0) / data.length;
  const totalProfit = data.reduce((s, r) => s + r.netProfit, 0);

  return (
    <SectorPanel
      title="Profitability Analysis"
      description="Gross profit and net profit trajectories with break-even point marked."

      chart={
        <div>
          <div style={{ fontSize: "10px", fontWeight: 600, color: "hsl(245 16% 49%)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "10px" }}>
            Profit Trajectory
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(47,36,133,0.08)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#6b6890" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 10, fill: "#6b6890" }} axisLine={false} tickLine={false} width={52} />
              <Tooltip content={<CustomTooltip />} />
              {breakeven !== null && (
                <ReferenceLine x={`M${breakeven}`} stroke={GREEN} strokeDasharray="4 3"
                  label={{ value: "Break-even", fill: GREEN, fontSize: 9, position: "top" }} />
              )}
              <Area type="monotone" dataKey="Gross Profit" name="Gross Profit" stroke={C_PRIMARY} strokeWidth={2} fill={C_PRIMARY} fillOpacity={0.08} dot={false} />
              <Area type="monotone" dataKey="Net Profit" name="Net Profit" stroke={GREEN} strokeWidth={2} fill={GREEN} fillOpacity={0.1} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", gap: "16px", paddingLeft: "52px", marginTop: "8px" }}>
            <LegendDot color={C_PRIMARY}  label="Gross Profit" />
            <LegendDot color={GREEN} label="Net Profit" />
          </div>
        </div>
      }
      table={
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", minWidth: "560px" }}>
            <thead>
              <tr>
                {["Month", "Gross Profit", "Gross Margin", "EBITDA", "Net Profit", "Net Margin"].map(h => (
                  <th key={h} style={{ ...thStyle, textAlign: h === "Month" ? "left" : "right", paddingLeft: h === "Month" ? "14px" : undefined }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableData.map(r => (
                <tr key={r.month} onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "hsl(247 57% 33% / 0.04)")} onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "")}>
                  <td style={{ ...tdStyle, textAlign: "left", paddingLeft: "14px", color: "hsl(245 16% 49%)" }}>Month {r.month}</td>
                  <td style={{ ...tdStyle, color: r.grossProfit >= 0 ? GREEN : RED }}>{formatDollar(r.grossProfit)}</td>
                  <td style={{ ...tdStyle, color: GREEN }}>{fp(r.grossMarginPct)}</td>
                  <td style={{ ...tdStyle, color: r.ebitda >= 0 ? GREEN : RED, fontWeight: 600 }}>{formatDollar(r.ebitda)}</td>
                  <td style={{ ...tdStyle, color: r.netProfit >= 0 ? GREEN : RED, fontWeight: 600 }}>{formatDollar(r.netProfit)}</td>
                  <td style={{ ...tdStyle, color: r.netMarginPct >= 0 ? GREEN : RED, fontStyle: "italic" }}>{fp(r.netMarginPct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      }
      insights={
        <>
          <InsightRow label="First Profitable Month" value={firstProfitable ? `Month ${firstProfitable.month}` : "Not reached"} color={firstProfitable ? GREEN : RED} />
          <InsightRow label="Avg Net Margin" value={fp(avgNetMargin)} color={avgNetMargin >= 0 ? GREEN : RED} />
          <InsightRow label="Total Profit (Period)" value={formatCurrency(totalProfit)} color={totalProfit >= 0 ? GREEN : RED} />
          <InsightRow label="Break-even" value={breakeven !== null ? `Month ${breakeven}` : "Not reached"} color={breakeven !== null ? C_PRIMARY : RED} />
        </>
      }
    />
  );
}

// ── Cash Flow Analysis ────────────────────────────────────────────────────────

function CashFlowScreen({ onBack }: { onBack: () => void }) {
  const inputs = useProjectionStore();
  const data = calcMonthlyData(inputs);

  if (data.length === 0) return null;

  let cumulative = 0;
  const chartData = data.map(row => {
    cumulative += row.netProfit;
    return {
      name: `M${row.month}`,
      cashFlow: Math.round(row.netProfit),
      positiveCF: row.netProfit >= 0 ? Math.round(row.netProfit) : 0,
      negativeCF: row.netProfit < 0 ? Math.round(row.netProfit) : 0,
      Cumulative: Math.round(cumulative),
    };
  });

  const minCumulative = Math.min(...chartData.map(r => r.Cumulative));
  const maxBurnRow    = chartData.find(r => r.Cumulative === minCumulative);
  const recoveryRow   = chartData.find((r, i) => i > 0 && chartData[i - 1].Cumulative < 0 && r.Cumulative >= 0);
  const totalCash     = chartData[chartData.length - 1].Cumulative;

  return (
    <SectorPanel
      title="Cash Flow Analysis"
      description="Monthly net cash flows with cumulative cash position showing burn rate and recovery."

      chart={
        <div>
          <div style={{ fontSize: "10px", fontWeight: 600, color: "hsl(245 16% 49%)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "10px" }}>
            Monthly Cash Flow + Cumulative Position
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(47,36,133,0.08)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#6b6890" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 10, fill: "#6b6890" }} axisLine={false} tickLine={false} width={52} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke="rgba(47,36,133,0.15)" strokeWidth={1} />
              <Bar dataKey="positiveCF" name="Cash Flow (Positive)" fill={GREEN} fillOpacity={0.85}>
                {chartData.map((_, i) => <Cell key={i} fill={GREEN} fillOpacity={0.85} />)}
              </Bar>
              <Bar dataKey="negativeCF" name="Cash Flow (Negative)" fill={RED} fillOpacity={0.85}>
                {chartData.map((_, i) => <Cell key={i} fill={RED} fillOpacity={0.85} />)}
              </Bar>
              <Line type="monotone" dataKey="Cumulative" name="Cumulative Cash" stroke={C_PRIMARY} strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", gap: "16px", paddingLeft: "52px", marginTop: "8px" }}>
            <LegendDot color={GREEN} label="Positive Cash Flow" />
            <LegendDot color={RED}   label="Negative Cash Flow" />
            <LegendDot color={C_PRIMARY}  label="Cumulative" />
          </div>
        </div>
      }
      table={
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", minWidth: "380px" }}>
            <thead>
              <tr>
                {["Month", "Net Cash Flow", "Cumulative Cash"].map(h => (
                  <th key={h} style={{ ...thStyle, textAlign: h === "Month" ? "left" : "right", paddingLeft: h === "Month" ? "14px" : undefined }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {chartData.map(r => (
                <tr key={r.name} onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "hsl(247 57% 33% / 0.04)")} onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "")}>
                  <td style={{ ...tdStyle, textAlign: "left", paddingLeft: "14px", color: "hsl(245 16% 49%)" }}>{r.name}</td>
                  <td style={{ ...tdStyle, color: r.cashFlow >= 0 ? GREEN : RED, fontWeight: 600 }}>{formatDollar(r.cashFlow)}</td>
                  <td style={{ ...tdStyle, color: r.Cumulative >= 0 ? GREEN : RED }}>{formatDollar(r.Cumulative)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      }
      insights={
        <>
          <InsightRow label="Max Cash Burn" value={minCumulative < 0 ? formatDollar(minCumulative) : "None"} color={minCumulative < 0 ? RED : GREEN} />
          {maxBurnRow && <InsightRow label="Peak Burn Month" value={maxBurnRow.name} color={RED} />}
          <InsightRow label="Cash Recovery" value={recoveryRow ? recoveryRow.name : "Not in window"} color={recoveryRow ? GREEN : RED} />
          <InsightRow label="Total Cash Generated" value={formatCurrency(totalCash)} color={totalCash >= 0 ? GREEN : RED} />
        </>
      }
    />
  );
}

// ── Entry point ───────────────────────────────────────────────────────────────

export const SECTOR_LIST = [
  { id: "revenue",       label: "Revenue Analysis" },
  { id: "cost",          label: "Cost Analysis" },
  { id: "profitability", label: "Profitability Analysis" },
  { id: "cashflow",      label: "Cash Flow Analysis" },
] as const;

export type SectorId = (typeof SECTOR_LIST)[number]["id"];

interface SectorScreensProps {
  activeSector: SectorId;
  onBack: () => void;
}

export function SectorScreens({ activeSector, onBack }: SectorScreensProps) {
  if (activeSector === "revenue")       return <RevenueScreen onBack={onBack} />;
  if (activeSector === "cost")          return <CostScreen onBack={onBack} />;
  if (activeSector === "profitability") return <ProfitabilityScreen onBack={onBack} />;
  if (activeSector === "cashflow")      return <CashFlowScreen onBack={onBack} />;
  return null;
}
