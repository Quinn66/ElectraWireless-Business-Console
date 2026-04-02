import { useProjectionStore } from "@/store/projectionStore";
import { calcMonthlyData, calcBreakeven, formatCurrency } from "@/lib/projection";
import { AnomalyAlerts } from "./AnomalyAlerts";

const SCENARIO_LABELS: Record<string, string> = {
  bear: "Bear",
  base: "Base",
  bull: "Bull",
  custom: "Custom",
};

const SCENARIO_COLORS: Record<string, string> = {
  bear: "#E24B4A",
  base: "#C9A84C",
  bull: "#1D9E75",
  custom: "#888",
};

interface SummaryCardProps {
  label: string;
  children: React.ReactNode;
  subtext?: React.ReactNode;
}

function SummaryCard({ label, children, subtext }: SummaryCardProps) {
  return (
    <div
      style={{
        backgroundColor: "#12121A",
        border: "1px solid #1e1e2a",
        borderRadius: "10px",
        padding: "12px 16px",
        flex: "1 1 140px",
        minWidth: "120px",
      }}
    >
      <div
        style={{
          fontSize: "10px",
          fontWeight: 600,
          color: "#555",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: "7px",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "19px",
          fontWeight: 700,
          lineHeight: 1.2,
          marginBottom: "4px",
        }}
      >
        {children}
      </div>
      {subtext && (
        <div style={{ fontSize: "10.5px", color: "#555", marginTop: "3px" }}>{subtext}</div>
      )}
    </div>
  );
}

export function FinancialSummaryBar() {
  const inputs = useProjectionStore();
  const data = calcMonthlyData(inputs);
  const breakeven = calcBreakeven(inputs);

  if (data.length === 0) return null;

  const finalMonth = data[data.length - 1];
  const prevMonth = data.length > 1 ? data[data.length - 2] : null;

  // Total Revenue: sum of all months
  const totalRevenue = data.reduce((s, r) => s + r.revenue, 0);

  // MoM % change: final month vs second-to-last month
  const revChangePct =
    prevMonth && prevMonth.revenue > 0
      ? ((finalMonth.revenue - prevMonth.revenue) / prevMonth.revenue) * 100
      : 0;
  const revChangeUp = revChangePct >= 0;

  // Gross Profit & Margin
  const totalGrossProfit = data.reduce(
    (s, r) => s + r.revenue * (r.grossMargin / 100),
    0
  );
  const avgGrossMargin =
    data.reduce((s, r) => s + r.grossMargin, 0) / data.length;

  // Net Profit / Loss (final month)
  const netProfitColor = finalMonth.netProfit >= 0 ? "#1D9E75" : "#E24B4A";

  // Cash Runway / Break-even
  const breakevenLabel =
    breakeven !== null ? `Month ${breakeven}` : `> ${inputs.forecastMonths} mo`;
  const breakevenColor = breakeven !== null ? "#C9A84C" : "#E24B4A";

  const runwayLabel =
    breakeven !== null ? `${breakeven} mo` : `> ${inputs.forecastMonths} mo`;
  const runwayColor = breakeven !== null ? "#1D9E75" : "#E24B4A";

  // Scenario
  const scenarioKey = inputs.activeScenario;
  const scenarioLabel = SCENARIO_LABELS[scenarioKey] ?? "Custom";
  const scenarioColor = SCENARIO_COLORS[scenarioKey] ?? "#888";

  return (
    <div
      style={{
        padding: "12px 24px",
        borderBottom: "1px solid #1a1a24",
        flexShrink: 0,
        backgroundColor: "#0A0A0F",
      }}
    >
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "stretch" }}>
        {/* 1 — Total Revenue */}
        <SummaryCard
          label="Total Revenue"
          subtext={
            <span style={{ color: revChangeUp ? "#1D9E75" : "#E24B4A" }}>
              {revChangeUp ? "▲" : "▼"} {Math.abs(revChangePct).toFixed(1)}% MoM (final)
            </span>
          }
        >
          <span style={{ color: "#C9A84C" }}>{formatCurrency(totalRevenue)}</span>
        </SummaryCard>

        {/* 2 — Gross Profit & Margin */}
        <SummaryCard
          label="Gross Profit"
          subtext={`${avgGrossMargin.toFixed(1)}% avg margin`}
        >
          <span style={{ color: "#f0f0f0" }}>{formatCurrency(totalGrossProfit)}</span>
        </SummaryCard>

        {/* 3 — Net Profit / Loss */}
        <SummaryCard
          label="Net Profit / Loss"
          subtext={
            <span style={{ color: netProfitColor }}>
              {finalMonth.netProfit >= 0 ? "Profitable" : "Loss"} — Month{" "}
              {inputs.forecastMonths}
            </span>
          }
        >
          <span style={{ color: netProfitColor }}>
            {formatCurrency(finalMonth.netProfit)}
          </span>
        </SummaryCard>

        {/* 4 — Cash Runway */}
        <SummaryCard
          label="Cash Runway"
          subtext={
            breakeven !== null ? "Break-even reached" : "Not in forecast horizon"
          }
        >
          <span style={{ color: runwayColor }}>{runwayLabel}</span>
        </SummaryCard>

        {/* 5 — Break-even Point */}
        <SummaryCard
          label="Break-even Point"
          subtext={
            breakeven !== null
              ? "Cumulative profit ≥ 0"
              : "Outside forecast window"
          }
        >
          <span style={{ color: breakevenColor }}>{breakevenLabel}</span>
        </SummaryCard>

        {/* 6 — Active Scenario */}
        <SummaryCard label="Scenario" subtext="Active scenario">
          <span
            style={{
              display: "inline-block",
              backgroundColor: `${scenarioColor}18`,
              border: `1px solid ${scenarioColor}44`,
              borderRadius: "6px",
              padding: "1px 12px",
              fontSize: "14px",
              fontWeight: 700,
              color: scenarioColor,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            {scenarioLabel}
          </span>
        </SummaryCard>
      </div>
      <AnomalyAlerts />
    </div>
  );
}
