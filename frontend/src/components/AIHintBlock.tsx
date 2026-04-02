import { useState } from "react";
import { useProjectionStore } from "@/store/projectionStore";
import { calcMonthlyData, calcBreakeven, calcARR, formatCurrency } from "@/lib/projection";

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

  // Return up to 3, prioritising warnings
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
  const avgGrossMargin = data.length > 0 ? data.reduce((s, r) => s + r.grossMargin, 0) / data.length : 0;
  const effectiveGrowth = ((1 + inputs.growthRate / 100) * (1 - inputs.churnRate / 100) - 1) * 100;
  const finalMonth = data[data.length - 1];

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
    s === "warn" ? "#F59E0B" : s === "ok" ? "#1D9E75" : "#888";

  return (
    <div style={{ borderLeft: "2px solid #C9A84C", borderRadius: "0 6px 6px 0", overflow: "hidden" }}>
      {/* Header */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          backgroundColor: "#12121A",
          padding: "8px 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
        }}
      >
        <div style={{ fontSize: "10px", fontWeight: 700, color: "#C9A84C", letterSpacing: "0.1em" }}>
          ELLY INSIGHTS
        </div>
        <span style={{ fontSize: "10px", color: "#444" }}>{open ? "▲" : "▼"}</span>
      </div>

      {open && (
        <div style={{ backgroundColor: "#0f0f18", display: "flex", flexDirection: "column", gap: "0" }}>

          {/* Section 1: Configuration Assessment */}
          <div style={{ padding: "10px 12px", borderTop: "1px solid #1a1a24" }}>
            <div style={{ fontSize: "9px", fontWeight: 700, color: "#444", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "7px" }}>
              Configuration Assessment
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {hints.map((h, i) => (
                <p key={i} style={{ fontSize: "11px", color: hintColor(h.severity), lineHeight: 1.5, margin: 0 }}>
                  <span style={{ marginRight: "5px" }}>{h.severity === "warn" ? "⚠" : h.severity === "ok" ? "✓" : "ℹ"}</span>
                  {h.text}
                </p>
              ))}
            </div>
          </div>

          {/* Section 2: Growth Trajectory */}
          <div style={{ padding: "10px 12px", borderTop: "1px solid #1a1a24" }}>
            <div style={{ fontSize: "9px", fontWeight: 700, color: "#444", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "7px" }}>
              Growth Trajectory
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <p style={{ fontSize: "11px", color: "#aaa", lineHeight: 1.5, margin: 0 }}>
                At {inputs.growthRate}% growth and {inputs.churnRate}% churn, net effective growth is <span style={{ color: effectiveGrowth > 0 ? "#1D9E75" : "#E24B4A", fontWeight: 600 }}>{effectiveGrowth.toFixed(2)}%/mo</span>.
              </p>
              <p style={{ fontSize: "11px", color: "#aaa", lineHeight: 1.5, margin: 0 }}>
                Projected to reach <span style={{ color: "#C9A84C", fontWeight: 600 }}>{formatCurrency(arr)} ARR</span> by Month {inputs.forecastMonths}.
              </p>
              <p style={{ fontSize: "11px", color: "#aaa", lineHeight: 1.5, margin: 0 }}>
                {breakeven !== null
                  ? <>Break-even occurs in <span style={{ color: "#1D9E75", fontWeight: 600 }}>Month {breakeven}</span>.</>
                  : <span style={{ color: "#E24B4A" }}>Break-even not reached in this window.</span>}
              </p>
            </div>
          </div>

          {/* Section 3: Recommended Next Steps */}
          <div style={{ padding: "10px 12px", borderTop: "1px solid #1a1a24" }}>
            <div style={{ fontSize: "9px", fontWeight: 700, color: "#444", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "7px" }}>
              Recommended Next Steps
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              {recs.map((r, i) => (
                <p key={i} style={{ fontSize: "11px", color: "#888", lineHeight: 1.5, margin: 0 }}>
                  <span style={{ color: "#C9A84C", marginRight: "5px" }}>→</span>{r}
                </p>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
