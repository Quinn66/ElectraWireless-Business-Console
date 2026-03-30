import { useState, useEffect } from "react";
import { useProjectionStore } from "@/store/projectionStore";
import { calcMonthlyData, calcBreakeven } from "@/lib/projection";

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

  // 1. Churn exceeds growth → net MRR is shrinking
  if (churnRate > growthRate) {
    alerts.push({
      id: "churn-exceeds-growth",
      severity: "critical",
      title: "Churn Exceeds Growth",
      description: `Churn (${churnRate}%) is higher than monthly growth (${growthRate}%) — net MRR is shrinking each month.`,
    });
  }

  // 2. No break-even in forecast horizon
  if (breakeven === null) {
    alerts.push({
      id: "no-breakeven",
      severity: "warning",
      title: "Break-even Not Reached",
      description: `The business does not reach break-even within the ${forecastMonths}-month forecast window.`,
    });
  }

  // 3. Negative EBITDA / net profit in final month
  if (finalMonth.netProfit < 0) {
    alerts.push({
      id: "negative-ebitda-final",
      severity: "critical",
      title: "Negative EBITDA at Forecast End",
      description: `The business is still loss-making in Month ${forecastMonths}. Review your fixed cost structure.`,
    });
  }

  // 4. COGS ratio > 50%
  if (cogsPercent > 50) {
    alerts.push({
      id: "high-cogs",
      severity: "critical",
      title: "Critical COGS Ratio",
      description: `COGS at ${cogsPercent}% of revenue leaves critically thin gross margins — operational efficiency is at risk.`,
    });
  }

  // 5. Marketing spend exceeds gross profit in any month
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

  // 6. High growth (> 15%) without break-even
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

  // When an alert condition clears, remove it from the dismissed set so it
  // can reappear if the condition becomes true again.
  const activeAlertIdsKey = activeAlerts
    .map((a) => a.id)
    .sort()
    .join(",");

  useEffect(() => {
    const activeIds = new Set(activeAlertIdsKey ? activeAlertIdsKey.split(",") : []);
    setDismissed((prev) => {
      let changed = false;
      const next = new Set(prev);
      prev.forEach((id) => {
        if (!activeIds.has(id)) {
          next.delete(id);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [activeAlertIdsKey]);

  const visibleAlerts = activeAlerts.filter((a) => !dismissed.has(a.id));

  if (visibleAlerts.length === 0) return null;

  const criticalCount = visibleAlerts.filter((a) => a.severity === "critical").length;
  const warningCount = visibleAlerts.filter((a) => a.severity === "warning").length;
  const dominantColor = criticalCount > 0 ? "#E24B4A" : "#F59E0B";

  const dismiss = (id: string) =>
    setDismissed((prev) => new Set([...prev, id]));

  return (
    <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: "1px solid #1a1a24" }}>
      {/* ── Toggle bar ── */}
      <div
        onClick={() => setExpanded((e) => !e)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        <span style={{ fontSize: "11px", color: dominantColor, fontWeight: 700 }}>
          {expanded ? "▲" : "▼"}
        </span>

        {criticalCount > 0 && (
          <span
            style={{
              backgroundColor: "#E24B4A1a",
              border: "1px solid #E24B4A40",
              borderRadius: "4px",
              padding: "1px 8px",
              fontSize: "10.5px",
              fontWeight: 700,
              color: "#E24B4A",
              letterSpacing: "0.03em",
            }}
          >
            {criticalCount} critical
          </span>
        )}

        {warningCount > 0 && (
          <span
            style={{
              backgroundColor: "#F59E0B1a",
              border: "1px solid #F59E0B40",
              borderRadius: "4px",
              padding: "1px 8px",
              fontSize: "10.5px",
              fontWeight: 700,
              color: "#F59E0B",
              letterSpacing: "0.03em",
            }}
          >
            {warningCount} warning{warningCount > 1 ? "s" : ""}
          </span>
        )}

        <span style={{ fontSize: "10.5px", color: "#444" }}>
          {expanded ? "hide" : "show alerts"}
        </span>
      </div>

      {/* ── Alert cards ── */}
      {expanded && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
            marginTop: "10px",
          }}
        >
          {visibleAlerts.map((alert) => {
            const color = alert.severity === "critical" ? "#E24B4A" : "#F59E0B";
            return (
              <div
                key={alert.id}
                style={{
                  backgroundColor: `${color}0d`,
                  border: `1px solid ${color}2a`,
                  borderLeft: `3px solid ${color}`,
                  borderRadius: "6px",
                  padding: "9px 12px 9px 14px",
                  flex: "1 1 260px",
                  minWidth: "220px",
                  display: "flex",
                  gap: "10px",
                  alignItems: "flex-start",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "11.5px",
                      fontWeight: 700,
                      color,
                      marginBottom: "3px",
                    }}
                  >
                    {alert.title}
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#666",
                      lineHeight: 1.5,
                    }}
                  >
                    {alert.description}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    dismiss(alert.id);
                  }}
                  title="Dismiss for this session"
                  style={{
                    background: "none",
                    border: "none",
                    color: "#3a3a48",
                    cursor: "pointer",
                    fontSize: "12px",
                    padding: "0 2px",
                    flexShrink: 0,
                    lineHeight: 1,
                    transition: "color 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#888")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#3a3a48")}
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
