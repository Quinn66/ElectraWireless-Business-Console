import { useState, useEffect } from "react";
import { useProjectionStore } from "@/store/projectionStore";
import { calcMonthlyData, calcBreakeven } from "@/lib/projection";
import { C_ERROR, C_WARNING } from "@/lib/colors";

interface Alert {
  id: string;
  severity: "critical" | "warning";
  title: string;
  description: string;
}

function detectAlerts(
  growthRate: number,
  churnRate: number,
  cogsPercent: number,
  marketingSpend: number,
  forecastMonths: number,
  data: { revenue: number; grossMargin: number; netProfit: number }[],
  breakeven: number | null
): Alert[] {
  if (data.length === 0) return [];
  const alerts: Alert[] = [];
  const finalMonth = data[data.length - 1];

  if (churnRate > growthRate) {
    alerts.push({
      id: "churn-exceeds-growth",
      severity: "critical",
      title: "Churn Exceeds Growth",
      description: `Churn (${churnRate}%) is higher than monthly growth (${growthRate}%) — net MRR is shrinking each month.`,
    });
  }

  if (breakeven === null) {
    alerts.push({
      id: "no-breakeven",
      severity: "warning",
      title: "Break-even Not Reached",
      description: `The business does not reach break-even within the ${forecastMonths}-month forecast window.`,
    });
  }

  if (finalMonth.netProfit < 0) {
    alerts.push({
      id: "negative-ebitda-final",
      severity: "critical",
      title: "Negative EBITDA at Forecast End",
      description: `The business is still loss-making in Month ${forecastMonths}. Review your fixed cost structure.`,
    });
  }

  if (cogsPercent > 50) {
    alerts.push({
      id: "high-cogs",
      severity: "critical",
      title: "Critical COGS Ratio",
      description: `COGS at ${cogsPercent}% of revenue leaves critically thin gross margins — operational efficiency is at risk.`,
    });
  }

  const marketingExceedsGP = data.some(
    (row) => marketingSpend > row.revenue * (row.grossMargin / 100)
  );
  if (marketingExceedsGP) {
    alerts.push({
      id: "marketing-exceeds-gp",
      severity: "warning",
      title: "Marketing Exceeds Gross Profit",
      description:
        "Monthly marketing spend exceeds gross profit in at least one month — customer acquisition cost is unsustainable.",
    });
  }

  if (growthRate > 15 && breakeven === null) {
    alerts.push({
      id: "high-growth-no-breakeven",
      severity: "warning",
      title: "High Growth Without Profitability",
      description: `Growth rate of ${growthRate}% is strong but break-even is not reached. Validate unit economics before presenting to investors.`,
    });
  }

  return alerts;
}

export function AnomalyAlerts() {
  const inputs = useProjectionStore();
  const data = calcMonthlyData(inputs);
  const breakeven = calcBreakeven(inputs);

  const activeAlerts = detectAlerts(
    inputs.growthRate,
    inputs.churnRate,
    inputs.cogsPercent,
    inputs.marketingSpend,
    inputs.forecastMonths,
    data,
    breakeven
  );

  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState(false);

  const activeAlertIdsKey = activeAlerts.map((a) => a.id).sort().join(",");

  useEffect(() => {
    const activeIds = new Set(activeAlertIdsKey ? activeAlertIdsKey.split(",") : []);
    setDismissed((prev) => {
      let changed = false;
      const next = new Set(prev);
      prev.forEach((id) => {
        if (!activeIds.has(id)) { next.delete(id); changed = true; }
      });
      return changed ? next : prev;
    });
  }, [activeAlertIdsKey]);

  const visibleAlerts = activeAlerts.filter((a) => !dismissed.has(a.id));
  if (visibleAlerts.length === 0) return null;

  const criticalCount = visibleAlerts.filter((a) => a.severity === "critical").length;
  const warningCount  = visibleAlerts.filter((a) => a.severity === "warning").length;
  const dominantColor = criticalCount > 0 ? C_ERROR : C_WARNING;

  const dismiss = (id: string) => setDismissed((prev) => new Set([...prev, id]));

  return (
    <div className="mt-2.5 pt-2.5 border-t border-border">
      {/* Toggle bar */}
      <div
        onClick={() => setExpanded((e) => !e)}
        className="flex items-center gap-2 cursor-pointer select-none"
      >
        <span className="text-[11px] font-bold" style={{ color: dominantColor }}>
          {expanded ? "▲" : "▼"}
        </span>

        {criticalCount > 0 && (
          <span
            className="rounded px-2 py-0.5 text-[10.5px] font-bold tracking-[0.03em]"
            style={{
              backgroundColor: `${C_ERROR}1a`,
              border: `1px solid ${C_ERROR}40`,
              color: C_ERROR,
            }}
          >
            {criticalCount} critical
          </span>
        )}

        {warningCount > 0 && (
          <span
            className="rounded px-2 py-0.5 text-[10.5px] font-bold tracking-[0.03em]"
            style={{
              backgroundColor: `${C_WARNING}1a`,
              border: `1px solid ${C_WARNING}40`,
              color: C_WARNING,
            }}
          >
            {warningCount} warning{warningCount > 1 ? "s" : ""}
          </span>
        )}

        <span className="text-[10.5px] text-muted-foreground/60">
          {expanded ? "hide" : "show alerts"}
        </span>
      </div>

      {/* Alert cards */}
      {expanded && (
        <div className="flex flex-wrap gap-2 mt-2.5">
          {visibleAlerts.map((alert) => {
            const color = alert.severity === "critical" ? C_ERROR : C_WARNING;
            return (
              <div
                key={alert.id}
                className="rounded-[6px] flex gap-2.5 items-start flex-1 min-w-[220px]"
                style={{
                  backgroundColor: `${color}0d`,
                  border: `1px solid ${color}2a`,
                  borderLeft: `3px solid ${color}`,
                  padding: "9px 12px 9px 14px",
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[11.5px] font-bold mb-0.5" style={{ color }}>
                    {alert.title}
                  </div>
                  <div className="text-[11px] text-muted-foreground leading-relaxed">
                    {alert.description}
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); dismiss(alert.id); }}
                  aria-label="Dismiss alert"
                  title="Dismiss for this session"
                  className="bg-transparent border-none text-muted-foreground/40 cursor-pointer text-xs p-0.5 flex-shrink-0 leading-none transition-colors hover:text-muted-foreground"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
