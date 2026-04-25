import { useProjectionStore } from "@/store/projectionStore";
import { calcMonthlyData, calcBreakeven, formatCurrency } from "@/lib/projection";
import { AnomalyAlerts } from "./AnomalyAlerts";
import { C_SUCCESS, C_ERROR } from "@/lib/colors";

const SCENARIO_LABELS: Record<string, string> = {
  bear: "Bear",
  base: "Base",
  bull: "Bull",
  custom: "Custom",
};

const SCENARIO_COLORS: Record<string, string> = {
  bear: C_ERROR,
  base: "hsl(var(--primary))",
  bull: C_SUCCESS,
  custom: "hsl(var(--muted-foreground))",
};

interface SummaryCardProps {
  label: string;
  children: React.ReactNode;
  subtext?: React.ReactNode;
}

function SummaryCard({ label, children, subtext }: SummaryCardProps) {
  return (
    <div className="bg-white/60 backdrop-blur-sm border border-border rounded-[10px] px-4 py-3 flex-1 min-w-[120px]">
      <div className="text-[10px] font-semibold text-muted-foreground tracking-[0.08em] uppercase mb-[7px]">
        {label}
      </div>
      <div className="text-[19px] font-bold leading-tight mb-1">
        {children}
      </div>
      {subtext && (
        <div className="text-[10.5px] text-muted-foreground mt-0.5">{subtext}</div>
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

  const totalRevenue = data.reduce((s, r) => s + r.revenue, 0);

  const revChangePct =
    prevMonth && prevMonth.revenue > 0
      ? ((finalMonth.revenue - prevMonth.revenue) / prevMonth.revenue) * 100
      : 0;
  const revChangeUp = revChangePct >= 0;

  const totalGrossProfit = data.reduce(
    (s, r) => s + r.revenue * (r.grossMargin / 100),
    0
  );
  const avgGrossMargin =
    data.reduce((s, r) => s + r.grossMargin, 0) / data.length;

  const netProfitColor = finalMonth.netProfit >= 0 ? C_SUCCESS : C_ERROR;

  const breakevenLabel =
    breakeven !== null ? `Month ${breakeven}` : `> ${inputs.forecastMonths} mo`;
  const breakevenColor = breakeven !== null ? "hsl(var(--primary))" : C_ERROR;

  const runwayLabel =
    breakeven !== null ? `${breakeven} mo` : `> ${inputs.forecastMonths} mo`;
  const runwayColor = breakeven !== null ? C_SUCCESS : C_ERROR;

  const scenarioKey = inputs.activeScenario;
  const scenarioLabel = SCENARIO_LABELS[scenarioKey] ?? "Custom";
  const scenarioColor = SCENARIO_COLORS[scenarioKey] ?? "hsl(var(--muted-foreground))";

  return (
    <div className="px-6 py-3 border-b border-border flex-shrink-0 bg-white/40 backdrop-blur-sm">
      <div className="flex gap-2.5 flex-wrap items-stretch">
        {/* 1 — Total Revenue */}
        <SummaryCard
          label="Total Revenue"
          subtext={
            <span style={{ color: revChangeUp ? C_SUCCESS : C_ERROR }}>
              {revChangeUp ? "▲" : "▼"} {Math.abs(revChangePct).toFixed(1)}% MoM (final)
            </span>
          }
        >
          <span className="text-primary">{formatCurrency(totalRevenue)}</span>
        </SummaryCard>

        {/* 2 — Gross Profit & Margin */}
        <SummaryCard
          label="Gross Profit"
          subtext={`${avgGrossMargin.toFixed(1)}% avg margin`}
        >
          <span className="text-foreground">{formatCurrency(totalGrossProfit)}</span>
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
            className="inline-block rounded-[6px] px-3 py-0.5 text-sm font-bold tracking-[0.06em] uppercase border"
            style={{
              backgroundColor: `color-mix(in srgb, ${scenarioColor} 12%, transparent)`,
              borderColor: `color-mix(in srgb, ${scenarioColor} 40%, transparent)`,
              color: scenarioColor,
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
