import {
  ComposedChart, Line, Area, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import { useProjectionStore } from "@/store/projectionStore";
import { calcMonthlyData, calcBreakeven, calcARR, formatCurrency } from "@/lib/projection";

// ── Shared helpers ────────────────────────────────────────────────────────────

const GOLD   = "#C9A84C";
const GREEN  = "#1D9E75";
const RED    = "#E24B4A";
const BLUE   = "#5B7FD4";
const BG     = "#12121A";
const BORDER = "#1e1e2a";
const BGIN   = "#131320";
const BGSEC  = "#0d0d14";

const fd = (v: number) => {
  const abs = Math.abs(Math.round(v));
  return `${v < 0 ? "−" : ""}$${abs.toLocaleString("en-US")}`;
};
const fp = (v: number) => `${v.toFixed(2)}%`;
const fc = formatCurrency;

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ backgroundColor: "#16161F", border: "1px solid #2a2a35", borderRadius: "8px", padding: "10px 14px", fontSize: "12px" }}>
      <div style={{ color: "#888", marginBottom: "6px", fontWeight: 600 }}>{label}</div>
      {payload.map((e: any) => (
        <div key={e.name} style={{ color: e.color ?? e.fill ?? "#aaa", marginBottom: "2px" }}>
          {e.name}: {typeof e.value === "number" ? fd(e.value) : e.value}
        </div>
      ))}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "8px 12px", fontSize: "10.5px", fontWeight: 600, color: "#555",
  letterSpacing: "0.07em", textTransform: "uppercase", backgroundColor: BGSEC,
  borderBottom: `1px solid ${BORDER}`, whiteSpace: "nowrap", textAlign: "right",
};
const tdStyle: React.CSSProperties = {
  padding: "7px 12px", fontSize: "12px", borderBottom: `1px solid ${BGIN}`,
  whiteSpace: "nowrap", textAlign: "right", backgroundColor: BG,
};

function LegendDot({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
      {dashed
        ? <div style={{ width: "14px", borderTop: `2px dashed ${color}` }} />
        : <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: color }} />}
      <span style={{ fontSize: "11px", color: "#666" }}>{label}</span>
    </div>
  );
}

// ── Shared panel layout ───────────────────────────────────────────────────────

interface SectorPanelProps {
  title: string;
  description: string;
  onBack: () => void;
  chart: React.ReactNode;
  table: React.ReactNode;
  insights: React.ReactNode;
}

function SectorPanel({ title, description, onBack, chart, table, insights }: SectorPanelProps) {
  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* Left: chart + table */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 0 20px 24px", display: "flex", flexDirection: "column", gap: "18px", minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", paddingRight: "20px" }}>
          <div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#f0f0f0", marginBottom: "3px" }}>{title}</div>
            <div style={{ fontSize: "11.5px", color: "#555" }}>{description}</div>
          </div>
          <button
            onClick={onBack}
            style={{ background: "none", border: "1px solid #2a2a38", borderRadius: "6px", color: "#666", fontSize: "11.5px", padding: "5px 12px", cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#C9A84C")}
            onMouseLeave={e => (e.currentTarget.style.color = "#666")}
          >
            ← Dashboard
          </button>
        </div>
        <div style={{ backgroundColor: BG, border: `1px solid ${BORDER}`, borderRadius: "10px", padding: "16px 18px", marginRight: "20px" }}>
          {chart}
        </div>
        <div style={{ backgroundColor: BG, border: `1px solid ${BORDER}`, borderRadius: "10px", overflow: "hidden", marginRight: "20px" }}>
          {table}
        </div>
      </div>
      {/* Right: insights */}
      <div style={{ width: "200px", flexShrink: 0, borderLeft: "1px solid #1a1a24", padding: "20px 14px", overflowY: "auto" }}>
        <div style={{ fontSize: "9.5px", fontWeight: 700, color: GOLD, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "14px" }}>
          Insights
        </div>
        {insights}
      </div>
    </div>
  );
}

function InsightRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ marginBottom: "14px" }}>
      <div style={{ fontSize: "10px", color: "#555", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "3px" }}>{label}</div>
      <div style={{ fontSize: "14px", fontWeight: 700, color: color ?? "#f0f0f0" }}>{value}</div>
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
      onBack={onBack}
      chart={
        <div>
          <div style={{ fontSize: "10px", fontWeight: 600, color: "#555", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "10px" }}>
            Revenue Forecast
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1a24" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#555" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fc} tick={{ fontSize: 10, fill: "#555" }} axisLine={false} tickLine={false} width={52} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="Revenue" name="Revenue" stroke={GOLD} strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
              <Line type="monotone" dataKey="Prophet" name="Prophet Baseline" stroke={BLUE} strokeWidth={1.5} strokeDasharray="5 3" dot={false} connectNulls={false} />
            </ComposedChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", gap: "16px", paddingLeft: "52px", marginTop: "8px" }}>
            <LegendDot color={GOLD} label="Revenue" />
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
                <tr key={r.month}>
                  <td style={{ ...tdStyle, textAlign: "left", paddingLeft: "14px", color: "#888" }}>Month {r.month}</td>
                  <td style={{ ...tdStyle, color: GOLD, fontWeight: 600 }}>{fd(r.revenue)}</td>
                  <td style={{ ...tdStyle, color: r.mom == null ? "#555" : r.mom >= 0 ? GREEN : RED }}>
                    {r.mom == null ? "—" : `${r.mom >= 0 ? "▲" : "▼"} ${Math.abs(r.mom).toFixed(1)}%`}
                  </td>
                  <td style={{ ...tdStyle, color: "#aaa" }}>{fd(r.cumRevenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      }
      insights={
        <>
          <InsightRow label="Current ARR" value={fc(arr)} color={GOLD} />
          <InsightRow label="Peak Revenue Month" value={`Month ${peakRow.month}`} color={GOLD} />
          <InsightRow label="Avg Monthly Growth" value={`${avgMom.toFixed(1)}%`} color={avgMom >= 0 ? GREEN : RED} />
          <InsightRow label="Starting MRR" value={fc(inputs.startingMRR)} />
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
      onBack={onBack}
      chart={
        <div>
          <div style={{ fontSize: "10px", fontWeight: 600, color: "#555", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "10px" }}>
            Stacked Expenses by Month
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1a24" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#555" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fc} tick={{ fontSize: 10, fill: "#555" }} axisLine={false} tickLine={false} width={52} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="COGS"      name="COGS"      stackId="a" fill={RED}  fillOpacity={0.85} />
              <Bar dataKey="Marketing" name="Marketing" stackId="a" fill={GOLD} fillOpacity={0.85} />
              <Bar dataKey="Payroll"   name="Payroll"   stackId="a" fill={BLUE} fillOpacity={0.85} />
            </ComposedChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", gap: "16px", paddingLeft: "52px", marginTop: "8px" }}>
            <LegendDot color={RED}  label="COGS" />
            <LegendDot color={GOLD} label="Marketing" />
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
                <tr key={r.month}>
                  <td style={{ ...tdStyle, textAlign: "left", paddingLeft: "14px", color: "#888" }}>Month {r.month}</td>
                  <td style={{ ...tdStyle, color: RED }}>{fd(r.cogs)}</td>
                  <td style={{ ...tdStyle, color: GOLD }}>{fd(r.marketing)}</td>
                  <td style={{ ...tdStyle, color: BLUE }}>{fd(r.payroll)}</td>
                  <td style={{ ...tdStyle, color: "#ccc", fontWeight: 600 }}>{fd(r.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      }
      insights={
        <>
          <InsightRow label="Largest Cost Driver" value={largest} color={largest === "COGS" ? RED : largest === "Payroll" ? BLUE : GOLD} />
          <InsightRow label="Avg Monthly Expenses" value={fc(avgExpenses)} color={RED} />
          <InsightRow label="Expenses / Revenue" value={`${expRatio.toFixed(1)}%`} color={expRatio > 100 ? RED : expRatio > 80 ? "#F59E0B" : GREEN} />
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
      onBack={onBack}
      chart={
        <div>
          <div style={{ fontSize: "10px", fontWeight: 600, color: "#555", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "10px" }}>
            Profit Trajectory
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1a24" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#555" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fc} tick={{ fontSize: 10, fill: "#555" }} axisLine={false} tickLine={false} width={52} />
              <Tooltip content={<CustomTooltip />} />
              {breakeven !== null && (
                <ReferenceLine x={`M${breakeven}`} stroke={GREEN} strokeDasharray="4 3"
                  label={{ value: "Break-even", fill: GREEN, fontSize: 9, position: "top" }} />
              )}
              <Area type="monotone" dataKey="Gross Profit" name="Gross Profit" stroke={GOLD} strokeWidth={2} fill={GOLD} fillOpacity={0.08} dot={false} />
              <Area type="monotone" dataKey="Net Profit" name="Net Profit" stroke={GREEN} strokeWidth={2} fill={GREEN} fillOpacity={0.1} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", gap: "16px", paddingLeft: "52px", marginTop: "8px" }}>
            <LegendDot color={GOLD}  label="Gross Profit" />
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
                <tr key={r.month}>
                  <td style={{ ...tdStyle, textAlign: "left", paddingLeft: "14px", color: "#888" }}>Month {r.month}</td>
                  <td style={{ ...tdStyle, color: r.grossProfit >= 0 ? GREEN : RED }}>{fd(r.grossProfit)}</td>
                  <td style={{ ...tdStyle, color: GREEN }}>{fp(r.grossMarginPct)}</td>
                  <td style={{ ...tdStyle, color: r.ebitda >= 0 ? GREEN : RED, fontWeight: 600 }}>{fd(r.ebitda)}</td>
                  <td style={{ ...tdStyle, color: r.netProfit >= 0 ? GREEN : RED, fontWeight: 600 }}>{fd(r.netProfit)}</td>
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
          <InsightRow label="Total Profit (Period)" value={fc(totalProfit)} color={totalProfit >= 0 ? GREEN : RED} />
          <InsightRow label="Break-even" value={breakeven !== null ? `Month ${breakeven}` : "Not reached"} color={breakeven !== null ? GOLD : RED} />
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
      onBack={onBack}
      chart={
        <div>
          <div style={{ fontSize: "10px", fontWeight: 600, color: "#555", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "10px" }}>
            Monthly Cash Flow + Cumulative Position
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1a24" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#555" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fc} tick={{ fontSize: 10, fill: "#555" }} axisLine={false} tickLine={false} width={52} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke="#2a2a35" strokeWidth={1} />
              <Bar dataKey="positiveCF" name="Cash Flow (Positive)" fill={GREEN} fillOpacity={0.85}>
                {chartData.map((_, i) => <Cell key={i} fill={GREEN} fillOpacity={0.85} />)}
              </Bar>
              <Bar dataKey="negativeCF" name="Cash Flow (Negative)" fill={RED} fillOpacity={0.85}>
                {chartData.map((_, i) => <Cell key={i} fill={RED} fillOpacity={0.85} />)}
              </Bar>
              <Line type="monotone" dataKey="Cumulative" name="Cumulative Cash" stroke={GOLD} strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", gap: "16px", paddingLeft: "52px", marginTop: "8px" }}>
            <LegendDot color={GREEN} label="Positive Cash Flow" />
            <LegendDot color={RED}   label="Negative Cash Flow" />
            <LegendDot color={GOLD}  label="Cumulative" />
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
                <tr key={r.name}>
                  <td style={{ ...tdStyle, textAlign: "left", paddingLeft: "14px", color: "#888" }}>{r.name}</td>
                  <td style={{ ...tdStyle, color: r.cashFlow >= 0 ? GREEN : RED, fontWeight: 600 }}>{fd(r.cashFlow)}</td>
                  <td style={{ ...tdStyle, color: r.Cumulative >= 0 ? GREEN : RED }}>{fd(r.Cumulative)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      }
      insights={
        <>
          <InsightRow label="Max Cash Burn" value={minCumulative < 0 ? fd(minCumulative) : "None"} color={minCumulative < 0 ? RED : GREEN} />
          {maxBurnRow && <InsightRow label="Peak Burn Month" value={maxBurnRow.name} color={RED} />}
          <InsightRow label="Cash Recovery" value={recoveryRow ? recoveryRow.name : "Not in window"} color={recoveryRow ? GREEN : RED} />
          <InsightRow label="Total Cash Generated" value={fc(totalCash)} color={totalCash >= 0 ? GREEN : RED} />
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
