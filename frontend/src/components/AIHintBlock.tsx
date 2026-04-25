import { useState } from "react";
import { useProjectionStore } from "@/store/projectionStore";
import { calcMonthlyData, calcBreakeven, calcARR, formatCurrency } from "@/lib/projection";
import { C_SUCCESS, C_ERROR, C_WARNING } from "@/lib/colors";

interface Hint {
  severity: "warn" | "info" | "ok";
  text: string;
}

function buildHints(
  growthRate: number,
  churnRate: number,
  cogsPercent: number,
  startingMRR: number,
  forecastMonths: number,
  marketingSpend: number,
  payroll: number,
  avgRevenue: number
): Hint[] {
  const hints: Hint[] = [];

  if (startingMRR < 5000)
    hints.push({ severity: "warn", text: `Starting MRR of ${formatCurrency(startingMRR)} is very low — projections at this level have high uncertainty.` });

  if (forecastMonths > 18)
    hints.push({ severity: "info", text: `Forecasting ${forecastMonths} months out reduces accuracy significantly. Consider using 12 months for planning.` });

  if (growthRate > 15)
    hints.push({ severity: "warn", text: `Growth rate of ${growthRate}% is ambitious — validate with at least 2 months of historical data before sharing with investors.` });

  if (churnRate > 5)
    hints.push({ severity: "warn", text: `Churn at ${churnRate}% is significantly offsetting growth. Review retention before scaling acquisition.` });

  if (avgRevenue > 0 && (marketingSpend / avgRevenue) * 100 > 20)
    hints.push({ severity: "warn", text: `Marketing spend is ${((marketingSpend / avgRevenue) * 100).toFixed(0)}% of average revenue — above the recommended 20% threshold.` });

  if (avgRevenue > 0 && (payroll / avgRevenue) * 100 > 60)
    hints.push({ severity: "warn", text: `Payroll is ${((payroll / avgRevenue) * 100).toFixed(0)}% of average revenue. Consider whether headcount is right-sized for current MRR.` });

  if (cogsPercent > 50)
    hints.push({ severity: "warn", text: `COGS at ${cogsPercent}% leaves thin gross margins. Review supplier costs or pricing strategy.` });

  if (hints.length === 0)
    hints.push({ severity: "ok", text: `Growth at ${growthRate}%/mo with ${churnRate}% churn looks well-balanced for early-stage SaaS.` });

  const sorted = [...hints.filter(h => h.severity === "warn"), ...hints.filter(h => h.severity !== "warn")];
  return sorted.slice(0, 3);
}

function buildRecommendations(
  growthRate: number,
  churnRate: number,
  cogsPercent: number,
  breakeven: number | null,
  forecastMonths: number,
  savedScenariosCount: number
): string[] {
  const recs: string[] = [];

  if (breakeven === null)
    recs.push("No break-even in sight — try reducing payroll or marketing spend, or increasing your starting MRR.");
  if (churnRate > 5)
    recs.push("Churn above 5% suggests retention work should precede scaling marketing spend.");
  if (cogsPercent > 50)
    recs.push("COGS above 50% — review supplier costs or consider a pricing strategy change.");
  if (growthRate > 20)
    recs.push("Growth above 20% is strong — stress test by loading the Bear scenario before presenting to investors.");
  if (recs.length === 0 && savedScenariosCount === 0)
    recs.push("Everything looks healthy. Save this configuration as a custom scenario to preserve it.");
  if (recs.length === 0)
    recs.push("Configuration looks healthy. Run a Sensitivity Analysis to explore growth vs churn trade-offs.");

  return recs.slice(0, 3);
}

export function AIHintBlock() {
  const inputs = useProjectionStore();
  const [open, setOpen] = useState(true);

  const data = calcMonthlyData(inputs);
  const breakeven = calcBreakeven(inputs);
  const arr = calcARR(inputs);
  const avgRevenue = data.length > 0 ? data.reduce((s, r) => s + r.revenue, 0) / data.length : 0;
  const effectiveGrowth = ((1 + inputs.growthRate / 100) * (1 - inputs.churnRate / 100) - 1) * 100;

  const hints = buildHints(
    inputs.growthRate, inputs.churnRate, inputs.cogsPercent,
    inputs.startingMRR, inputs.forecastMonths,
    inputs.marketingSpend, inputs.payroll, avgRevenue
  );

  const recs = buildRecommendations(
    inputs.growthRate, inputs.churnRate, inputs.cogsPercent,
    breakeven, inputs.forecastMonths, inputs.savedScenarios.length
  );

  const hintColor = (s: Hint["severity"]) =>
    s === "warn" ? C_WARNING : s === "ok" ? C_SUCCESS : "hsl(var(--muted-foreground))";

  return (
    <div className="border-l-2 border-primary rounded-r-[6px] overflow-hidden">
      {/* Header */}
      <div
        onClick={() => setOpen(o => !o)}
        className="bg-white/60 backdrop-blur-sm px-3 py-2 flex items-center justify-between cursor-pointer"
      >
        <div className="text-[10px] font-bold text-primary tracking-[0.1em]">
          ELLY INSIGHTS
        </div>
        <span className="text-[10px] text-muted-foreground/70">{open ? "▲" : "▼"}</span>
      </div>

      {open && (
        <div className="bg-white/40 backdrop-blur-sm flex flex-col">

          {/* Section 1: Configuration Assessment */}
          <div className="px-3 py-2.5 border-t border-border">
            <div className="text-[9px] font-bold text-muted-foreground/70 tracking-[0.1em] uppercase mb-[7px]">
              Configuration Assessment
            </div>
            <div className="flex flex-col gap-1.5">
              {hints.map((h, i) => (
                <p key={i} className="text-[11px] leading-relaxed m-0" style={{ color: hintColor(h.severity) }}>
                  <span className="mr-1">{h.severity === "warn" ? "⚠" : h.severity === "ok" ? "✓" : "ℹ"}</span>
                  {h.text}
                </p>
              ))}
            </div>
          </div>

          {/* Section 2: Growth Trajectory */}
          <div className="px-3 py-2.5 border-t border-border">
            <div className="text-[9px] font-bold text-muted-foreground/70 tracking-[0.1em] uppercase mb-[7px]">
              Growth Trajectory
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-[11px] text-foreground/70 leading-relaxed m-0">
                At {inputs.growthRate}% growth and {inputs.churnRate}% churn, net effective growth is{" "}
                <span className="font-semibold" style={{ color: effectiveGrowth > 0 ? C_SUCCESS : C_ERROR }}>
                  {effectiveGrowth.toFixed(2)}%/mo
                </span>.
              </p>
              <p className="text-[11px] text-foreground/70 leading-relaxed m-0">
                Projected to reach <span className="text-primary font-semibold">{formatCurrency(arr)} ARR</span> by Month {inputs.forecastMonths}.
              </p>
              <p className="text-[11px] text-foreground/70 leading-relaxed m-0">
                {breakeven !== null
                  ? <>Break-even occurs in <span className="font-semibold" style={{ color: C_SUCCESS }}>Month {breakeven}</span>.</>
                  : <span style={{ color: C_ERROR }}>Break-even not reached in this window.</span>}
              </p>
            </div>
          </div>

          {/* Section 3: Recommended Next Steps */}
          <div className="px-3 py-2.5 border-t border-border">
            <div className="text-[9px] font-bold text-muted-foreground/70 tracking-[0.1em] uppercase mb-[7px]">
              Recommended Next Steps
            </div>
            <div className="flex flex-col gap-1">
              {recs.map((r, i) => (
                <p key={i} className="text-[11px] text-muted-foreground leading-relaxed m-0">
                  <span className="text-primary mr-1">→</span>{r}
                </p>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
