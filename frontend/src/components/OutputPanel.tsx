import { useState, useEffect } from "react";
import { useProjectionStore } from "@/store/projectionStore";
import {
  calcMonthlyData,
  calcBreakeven,
  calcARR,
  formatCurrency,
} from "@/lib/projection";
import { MetricCard } from "./MetricCard";
import { BreakevenBar } from "./BreakevenBar";
import { ProjectionChart } from "./ProjectionChart";
import { MonthlyTable } from "./MonthlyTable";

interface OutputPanelProps {
  activeTab: string;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: "11px",
        fontWeight: 600,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "#555",
        marginBottom: "12px",
      }}
    >
      {children}
    </div>
  );
}

function SensitivityTable() {
  const inputs = useProjectionStore();
  const growthRates = [inputs.growthRate - 4, inputs.growthRate - 2, inputs.growthRate, inputs.growthRate + 2, inputs.growthRate + 4];
  const churnRates = [Math.max(0, inputs.churnRate - 2), Math.max(0, inputs.churnRate - 1), inputs.churnRate, inputs.churnRate + 1, inputs.churnRate + 2];

  const thStyle: React.CSSProperties = {
    fontSize: "11px", color: "#555", fontWeight: 500,
    padding: "8px 12px", borderBottom: "1px solid #1a1a24",
    textAlign: "center", letterSpacing: "0.04em",
  };
  const tdStyle: React.CSSProperties = {
    fontSize: "12px", padding: "8px 12px", textAlign: "center", borderBottom: "1px solid #131320",
  };

  return (
    <div>
      <SectionTitle>ARR Sensitivity — Growth Rate vs Churn Rate</SectionTitle>
      <div style={{ fontSize: "11px", color: "#555", marginBottom: "12px" }}>
        Each cell shows projected ARR at the end of the forecast period.
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, textAlign: "left" }}>Growth \ Churn</th>
              {churnRates.map((c) => (
                <th key={c} style={thStyle}>{c.toFixed(1)}% churn</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {growthRates.map((g) => (
              <tr key={g}>
                <td style={{ ...tdStyle, color: "#888", textAlign: "left", fontWeight: 500 }}>{g}% growth</td>
                {churnRates.map((c) => {
                  const arr = calcARR({ ...inputs, growthRate: g, churnRate: Math.max(0, c) });
                  const baseArr = calcARR(inputs);
                  const delta = arr - baseArr;
                  return (
                    <td
                      key={c}
                      style={{
                        ...tdStyle,
                        color: g === inputs.growthRate && c === inputs.churnRate
                          ? "#C9A84C"
                          : delta > 0 ? "#1D9E75" : delta < 0 ? "#E24B4A" : "#888",
                        fontWeight: g === inputs.growthRate && c === inputs.churnRate ? 700 : 400,
                        backgroundColor: g === inputs.growthRate && c === inputs.churnRate
                          ? "#1e1810"
                          : "transparent",
                      }}
                    >
                      {formatCurrency(arr)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CashRunwayDetail() {
  const inputs = useProjectionStore();
  const data = calcMonthlyData(inputs);
  const breakeven = calcBreakeven(inputs);

  let cumulativeProfit = 0;
  const runwayData = data.map((row) => {
    cumulativeProfit += row.netProfit;
    return { month: row.month, cumulative: cumulativeProfit };
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div>
        <SectionTitle>Cumulative Net Profit Trajectory</SectionTitle>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {runwayData.map((row) => (
            <div
              key={row.month}
              style={{
                backgroundColor: "#12121A",
                border: `1px solid ${row.cumulative >= 0 ? "#1D9E75" : "#E24B4A"}22`,
                borderRadius: "8px",
                padding: "10px 14px",
                minWidth: "80px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "10px", color: "#555", marginBottom: "4px" }}>M{row.month}</div>
              <div style={{ fontSize: "13px", fontWeight: 600, color: row.cumulative >= 0 ? "#1D9E75" : "#E24B4A" }}>
                {formatCurrency(row.cumulative)}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div
        style={{
          backgroundColor: "#12121A",
          border: "1px solid #1e1e2a",
          borderRadius: "10px",
          padding: "16px 18px",
        }}
      >
        <div style={{ fontSize: "13px", color: "#888", marginBottom: "8px" }}>Break-even Analysis</div>
        {breakeven !== null ? (
          <div>
            <div style={{ fontSize: "24px", fontWeight: 700, color: "#1D9E75" }}>Month {breakeven}</div>
            <div style={{ fontSize: "12px", color: "#555", marginTop: "4px" }}>
              You reach break-even {breakeven <= 3 ? "very early" : breakeven <= 6 ? "early" : "within"} in your forecast window.
            </div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: "24px", fontWeight: 700, color: "#E24B4A" }}>&gt; {inputs.forecastMonths} mo</div>
            <div style={{ fontSize: "12px", color: "#555", marginTop: "4px" }}>
              Break-even is not reached within the forecast horizon.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PLForecast() {
  const inputs = useProjectionStore();
  const data = calcMonthlyData(inputs);

  if (data.length === 0) return null;

  // Per-month computed values
  const months = data.map((row) => {
    const cogs = row.revenue * (inputs.cogsPercent / 100);
    const grossProfit = row.revenue - cogs;
    const netMarginPct = row.revenue > 0 ? (row.netProfit / row.revenue) * 100 : 0;
    return {
      month: row.month,
      revenue: row.revenue,
      cogs,
      grossProfit,
      grossMarginPct: row.grossMargin,
      marketingSpend: inputs.marketingSpend,
      payroll: inputs.payroll,
      totalOpEx: inputs.marketingSpend + inputs.payroll,
      ebitda: row.netProfit,
      netProfit: row.netProfit,
      netMarginPct,
    };
  });

  type MonthRow = (typeof months)[0];
  const n = months.length;

  // Summary column
  const totalRevenue     = months.reduce((s, m) => s + m.revenue, 0);
  const totalCogs        = months.reduce((s, m) => s + m.cogs, 0);
  const totalGrossProfit = months.reduce((s, m) => s + m.grossProfit, 0);
  const avgGrossMargin   = months.reduce((s, m) => s + m.grossMarginPct, 0) / n;
  const totalMarketing   = months.reduce((s, m) => s + m.marketingSpend, 0);
  const totalPayroll     = months.reduce((s, m) => s + m.payroll, 0);
  const totalOpEx        = months.reduce((s, m) => s + m.totalOpEx, 0);
  const totalEbitda      = months.reduce((s, m) => s + m.ebitda, 0);
  const totalNetProfit   = months.reduce((s, m) => s + m.netProfit, 0);
  const avgNetMargin     = months.reduce((s, m) => s + m.netMarginPct, 0) / n;

  // Formatters
  const fd = (v: number) => {
    const abs = Math.abs(Math.round(v));
    const sign = v < 0 ? "−" : "";
    return `${sign}$${abs.toLocaleString("en-US")}`;
  };
  const fp = (v: number) => `${v.toFixed(2)}%`;

  // Color helpers
  const profitColor = (v: number) => (v > 0 ? "#1D9E75" : v < 0 ? "#E24B4A" : "#888");
  const marginColor = (v: number) => (v >= 0 ? "#1D9E75" : "#E24B4A");

  // Style constants
  const BG        = "#12121A";
  const BG_SEC    = "#0d0d14";
  const BG_TOTAL  = "#0e0e16";
  const BORDER    = "#1a1a24";
  const BORDER_IN = "#131320";

  const baseThStyle: React.CSSProperties = {
    padding: "8px 12px",
    fontSize: "10.5px",
    fontWeight: 600,
    color: "#555",
    letterSpacing: "0.07em",
    textTransform: "uppercase",
    backgroundColor: BG_SEC,
    borderBottom: `1px solid ${BORDER}`,
    whiteSpace: "nowrap",
  };

  const baseTdStyle: React.CSSProperties = {
    padding: "7px 12px",
    fontSize: "12px",
    borderBottom: `1px solid ${BORDER_IN}`,
    whiteSpace: "nowrap",
    backgroundColor: BG,
  };

  const secTdStyle: React.CSSProperties = {
    padding: "6px 14px",
    fontSize: "9.5px",
    fontWeight: 700,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "#444",
    backgroundColor: BG_SEC,
    borderTop: `1px solid ${BORDER}`,
    borderBottom: `1px solid ${BORDER}`,
    whiteSpace: "nowrap",
  };

  // ── Render helpers (called as functions, not as <Component> to avoid remount) ──

  const renderSectionRow = (label: string) => (
    <tr key={`sec-${label}`}>
      <td style={{ ...secTdStyle, position: "sticky", left: 0, zIndex: 1 }}>{label}</td>
      {months.map((m) => (
        <td key={m.month} style={{ ...secTdStyle }} />
      ))}
      <td style={{ ...secTdStyle, backgroundColor: BG_TOTAL }} />
    </tr>
  );

  const renderDollarRow = (
    key: string,
    label: string,
    getValue: (m: MonthRow) => number,
    total: number,
    colorFn: (v: number) => string,
    bold = false,
    indent = false
  ) => (
    <tr key={key}>
      <td
        style={{
          ...baseTdStyle,
          textAlign: "left",
          position: "sticky",
          left: 0,
          zIndex: 1,
          paddingLeft: indent ? "26px" : "14px",
          color: bold ? "#ccc" : "#999",
          fontWeight: bold ? 700 : 400,
        }}
      >
        {label}
      </td>
      {months.map((m) => {
        const v = getValue(m);
        return (
          <td key={m.month} style={{ ...baseTdStyle, textAlign: "right", color: colorFn(v), fontWeight: bold ? 600 : 400 }}>
            {fd(v)}
          </td>
        );
      })}
      <td style={{ ...baseTdStyle, textAlign: "right", color: colorFn(total), fontWeight: bold ? 700 : 600, backgroundColor: BG_TOTAL }}>
        {fd(total)}
      </td>
    </tr>
  );

  const renderPctRow = (
    key: string,
    label: string,
    getValue: (m: MonthRow) => number,
    avg: number,
    colorFn: (v: number) => string
  ) => (
    <tr key={key}>
      <td
        style={{
          ...baseTdStyle,
          textAlign: "left",
          position: "sticky",
          left: 0,
          zIndex: 1,
          paddingLeft: "26px",
          color: "#666",
          fontStyle: "italic",
        }}
      >
        {label}
      </td>
      {months.map((m) => {
        const v = getValue(m);
        return (
          <td key={m.month} style={{ ...baseTdStyle, textAlign: "right", color: colorFn(v), fontStyle: "italic" }}>
            {fp(v)}
          </td>
        );
      })}
      <td style={{ ...baseTdStyle, textAlign: "right", color: colorFn(avg), fontStyle: "italic", backgroundColor: BG_TOTAL }}>
        {fp(avg)} avg
      </td>
    </tr>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <SectionTitle>Profit & Loss Statement — {inputs.forecastMonths}-Month Forecast</SectionTitle>
      <div
        style={{
          backgroundColor: BG,
          border: "1px solid #1e1e2a",
          borderRadius: "10px",
          overflow: "hidden",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              borderCollapse: "collapse",
              width: "100%",
              minWidth: `${160 + (months.length + 1) * 88}px`,
            }}
          >
            <colgroup>
              <col style={{ minWidth: "160px" }} />
              {months.map((m) => (
                <col key={m.month} style={{ minWidth: "88px" }} />
              ))}
              <col style={{ minWidth: "96px" }} />
            </colgroup>
            <thead>
              <tr>
                <th style={{ ...baseThStyle, textAlign: "left", position: "sticky", left: 0, zIndex: 2 }}>
                  Line Item
                </th>
                {months.map((m) => (
                  <th key={m.month} style={{ ...baseThStyle, textAlign: "right" }}>
                    M{m.month}
                  </th>
                ))}
                <th style={{ ...baseThStyle, textAlign: "right", backgroundColor: BG_TOTAL }}>
                  Total / Avg
                </th>
              </tr>
            </thead>
            <tbody>
              {/* ── Revenue ── */}
              {renderSectionRow("Revenue")}
              {renderDollarRow("rev",  "Total Revenue",         (m) => m.revenue,       totalRevenue,     () => "#C9A84C", true)}
              {renderDollarRow("cogs", "Cost of Goods Sold",    (m) => m.cogs,           totalCogs,        () => "#E24B4A")}
              {renderDollarRow("gp",   "Gross Profit",          (m) => m.grossProfit,    totalGrossProfit, profitColor,    true)}
              {renderPctRow("gm%",     "Gross Margin %",        (m) => m.grossMarginPct, avgGrossMargin,   marginColor)}

              {/* ── Operating Expenses ── */}
              {renderSectionRow("Operating Expenses")}
              {renderDollarRow("mkt",  "Marketing Spend",          (m) => m.marketingSpend, totalMarketing, () => "#888")}
              {renderDollarRow("pay",  "Payroll / Fixed Costs",    (m) => m.payroll,         totalPayroll,   () => "#888")}
              {renderDollarRow("opex", "Total Operating Expenses", (m) => m.totalOpEx,       totalOpEx,      () => "#888", true)}

              {/* ── Earnings ── */}
              {renderSectionRow("Earnings")}
              {renderDollarRow("ebitda", "EBITDA",           (m) => m.ebitda,     totalEbitda,    profitColor, true)}
              {renderDollarRow("np",     "Net Profit / Loss",(m) => m.netProfit,  totalNetProfit, profitColor, true)}
              {renderPctRow("nm%",       "Net Margin %",     (m) => m.netMarginPct, avgNetMargin, marginColor)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Scenario Stats + Checklist ────────────────────────────────────────────────

function ScenarioStats() {
  const { activeScenario, scenarioCounts, totalScenarioRuns } = useProjectionStore();

  const mostUsed = Object.entries(scenarioCounts).length > 0
    ? Object.entries(scenarioCounts).sort((a, b) => b[1] - a[1])[0][0]
    : "—";

  const LABEL: Record<string, string> = { bear: "Bear", base: "Base", bull: "Bull", custom: "Custom" };
  const COLOR: Record<string, string> = { bear: "#E24B4A", base: "#C9A84C", bull: "#1D9E75", custom: "#888" };

  const stats = [
    { label: "Scenarios Run", value: String(totalScenarioRuns), color: "#f0f0f0" },
    { label: "Most Used", value: LABEL[mostUsed] ?? mostUsed, color: COLOR[mostUsed] ?? "#888" },
    { label: "Active Now", value: LABEL[activeScenario] ?? activeScenario, color: COLOR[activeScenario] ?? "#888" },
  ];

  return (
    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
      {stats.map(s => (
        <div key={s.label} style={{ backgroundColor: "#12121A", border: "1px solid #1e1e2a", borderRadius: "8px", padding: "10px 16px", flex: "1 1 100px" }}>
          <div style={{ fontSize: "9.5px", fontWeight: 600, color: "#555", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "5px" }}>{s.label}</div>
          <div style={{ fontSize: "17px", fontWeight: 700, color: s.color }}>{s.value}</div>
        </div>
      ))}
    </div>
  );
}

function ProjectionChecklist() {
  const [open, setOpen] = useState(true);
  const inputs = useProjectionStore();
  const data = calcMonthlyData(inputs);
  const breakeven = calcBreakeven(inputs);
  const finalMonth = data[data.length - 1];

  const hasCriticalAlert =
    inputs.churnRate > inputs.growthRate ||
    (finalMonth != null && finalMonth.netProfit < 0 && breakeven === null) ||
    inputs.cogsPercent > 50;

  const items: { label: string; pass: boolean }[] = [
    { label: "Starting MRR above $1,000",                    pass: inputs.startingMRR > 1000 },
    { label: "Forecast period at least 6 months",            pass: inputs.forecastMonths >= 6 },
    { label: "Growth rate in realistic range (1–25%)",       pass: inputs.growthRate >= 1 && inputs.growthRate <= 25 },
    { label: "Churn rate below 10%",                         pass: inputs.churnRate < 10 },
    { label: "COGS below 70% of revenue",                    pass: inputs.cogsPercent < 70 },
    { label: "Break-even reached in forecast window",        pass: breakeven !== null },
    { label: "At least one custom scenario saved",           pass: inputs.savedScenarios.length > 0 },
    { label: "No critical anomaly alerts active",            pass: !hasCriticalAlert },
  ];

  const score = Math.round((items.filter(i => i.pass).length / items.length) * 100);

  return (
    <div style={{ backgroundColor: "#12121A", border: "1px solid #1e1e2a", borderRadius: "10px", overflow: "hidden" }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "#f0f0f0" }}>Projection Readiness Checklist</span>
          <span style={{
            fontSize: "10px", fontWeight: 700,
            color: score >= 80 ? "#1D9E75" : score >= 50 ? "#F59E0B" : "#E24B4A",
            backgroundColor: score >= 80 ? "#1D9E751a" : score >= 50 ? "#F59E0B1a" : "#E24B4A1a",
            border: `1px solid ${score >= 80 ? "#1D9E7530" : score >= 50 ? "#F59E0B30" : "#E24B4A30"}`,
            borderRadius: "4px", padding: "1px 8px",
          }}>
            {score}% ready
          </span>
        </div>
        <span style={{ fontSize: "10px", color: "#444" }}>{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <div style={{ borderTop: "1px solid #1a1a24" }}>
          {items.map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 16px", borderBottom: i < items.length - 1 ? "1px solid #131320" : "none" }}>
              <span style={{ fontSize: "13px", color: item.pass ? "#1D9E75" : "#E24B4A", flexShrink: 0 }}>
                {item.pass ? "✓" : "✗"}
              </span>
              <span style={{ fontSize: "12px", color: item.pass ? "#888" : "#aaa" }}>{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Valuation Tab ─────────────────────────────────────────────────────────────

function ValuationTab() {
  const inputs = useProjectionStore();
  const [discountRate, setDiscountRate]     = useState(10);  // annual %
  const [ebitdaMultiple, setEbitdaMultiple] = useState(6);
  const [revenueMultiple, setRevenueMultiple] = useState(3);

  const data = calcMonthlyData(inputs);
  if (data.length === 0) return null;

  const finalMonth = data[data.length - 1];
  const arr = calcARR(inputs);

  // DCF
  const monthlyR = discountRate / 100 / 12;
  let totalDCF = 0;
  const dcfRows = data.map((row) => {
    const pv = monthlyR === 0 ? row.netProfit : row.netProfit / Math.pow(1 + monthlyR, row.month);
    totalDCF += pv;
    return {
      month: row.month,
      cashFlow: row.netProfit,
      factor: monthlyR === 0 ? 1 : 1 / Math.pow(1 + monthlyR, row.month),
      pv,
    };
  });

  // EBITDA Multiple
  const annualisedEBITDA = finalMonth.netProfit * 12;
  const ebitdaValuation  = annualisedEBITDA * ebitdaMultiple;

  // Revenue Multiple
  const revenueValuation = arr * revenueMultiple;

  const fc = formatCurrency;
  const fd = (v: number) => {
    const abs = Math.abs(Math.round(v));
    return `${v < 0 ? "−" : ""}$${abs.toLocaleString("en-US")}`;
  };
  const profitColor = (v: number) => (v > 0 ? "#1D9E75" : v < 0 ? "#E24B4A" : "#888");

  const CARD: React.CSSProperties = {
    backgroundColor: "#12121A",
    border: "1px solid #1e1e2a",
    borderRadius: "10px",
    padding: "18px 20px",
    flex: "1 1 200px",
    minWidth: "180px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  };

  const SLIDER_WRAP: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  };

  const NOTE: React.CSSProperties = {
    fontSize: "11px",
    color: "#555",
    lineHeight: 1.55,
    borderTop: "1px solid #1a1a24",
    paddingTop: "10px",
    marginTop: "2px",
  };

  const BG_SEC = "#0d0d14";
  const BORDER = "#1a1a24";
  const BORDER_IN = "#131320";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <SectionTitle>Business Valuation — {inputs.forecastMonths}-Month Forecast</SectionTitle>

      {/* ── Three headline cards ── */}
      <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>

        {/* DCF Card */}
        <div style={CARD}>
          <div style={{ fontSize: "10px", fontWeight: 600, color: "#555", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            DCF Valuation
          </div>
          <div style={{ fontSize: "26px", fontWeight: 700, color: profitColor(totalDCF), lineHeight: 1 }}>
            {fc(totalDCF)}
          </div>
          <div style={SLIDER_WRAP}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: "11px", color: "#888" }}>Discount Rate</span>
              <span style={{ fontSize: "11px", fontWeight: 600, color: "#C9A84C", backgroundColor: "#1e1810", border: "1px solid #2e2212", borderRadius: "4px", padding: "1px 7px" }}>
                {discountRate}% annual
              </span>
            </div>
            <input type="range" min={5} max={30} step={1} value={discountRate}
              onChange={(e) => setDiscountRate(Number(e.target.value))} style={{ width: "100%" }} />
          </div>
          <p style={NOTE}>
            Present value of all projected cash flows discounted at your chosen annual rate. Best used when detailed multi-year projections are available.
          </p>
        </div>

        {/* EBITDA Multiple Card */}
        <div style={CARD}>
          <div style={{ fontSize: "10px", fontWeight: 600, color: "#555", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            EBITDA Multiple
          </div>
          <div style={{ fontSize: "26px", fontWeight: 700, color: annualisedEBITDA > 0 ? "#1D9E75" : "#E24B4A", lineHeight: 1 }}>
            {annualisedEBITDA > 0 ? fc(ebitdaValuation) : "N/A"}
          </div>
          <div style={{ fontSize: "11px", color: "#555" }}>
            Ann. EBITDA: <span style={{ color: profitColor(annualisedEBITDA), fontWeight: 600 }}>{fc(annualisedEBITDA)}</span>
          </div>
          <div style={SLIDER_WRAP}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: "11px", color: "#888" }}>Industry Multiple</span>
              <span style={{ fontSize: "11px", fontWeight: 600, color: "#C9A84C", backgroundColor: "#1e1810", border: "1px solid #2e2212", borderRadius: "4px", padding: "1px 7px" }}>
                {ebitdaMultiple}×
              </span>
            </div>
            <input type="range" min={1} max={20} step={0.5} value={ebitdaMultiple}
              onChange={(e) => setEbitdaMultiple(Number(e.target.value))} style={{ width: "100%" }} />
          </div>
          <p style={NOTE}>
            Annualised EBITDA multiplied by a sector-typical multiple. Common in M&amp;A transactions and private equity. Requires positive EBITDA.
          </p>
        </div>

        {/* Revenue Multiple Card */}
        <div style={CARD}>
          <div style={{ fontSize: "10px", fontWeight: 600, color: "#555", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Revenue Multiple
          </div>
          <div style={{ fontSize: "26px", fontWeight: 700, color: "#C9A84C", lineHeight: 1 }}>
            {fc(revenueValuation)}
          </div>
          <div style={{ fontSize: "11px", color: "#555" }}>
            ARR: <span style={{ color: "#C9A84C", fontWeight: 600 }}>{fc(arr)}</span>
          </div>
          <div style={SLIDER_WRAP}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: "11px", color: "#888" }}>Revenue Multiple</span>
              <span style={{ fontSize: "11px", fontWeight: 600, color: "#C9A84C", backgroundColor: "#1e1810", border: "1px solid #2e2212", borderRadius: "4px", padding: "1px 7px" }}>
                {revenueMultiple}×
              </span>
            </div>
            <input type="range" min={0.5} max={10} step={0.5} value={revenueMultiple}
              onChange={(e) => setRevenueMultiple(Number(e.target.value))} style={{ width: "100%" }} />
          </div>
          <p style={NOTE}>
            Projected ARR multiplied by a revenue multiple. Favoured for high-growth SaaS businesses. Appropriate even before the business reaches profitability.
          </p>
        </div>
      </div>

      {/* ── DCF detail table ── */}
      <div>
        <SectionTitle>DCF Breakdown — Monthly Discounted Cash Flows</SectionTitle>
        <div style={{ backgroundColor: "#12121A", border: "1px solid #1e1e2a", borderRadius: "10px", overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%", minWidth: "480px" }}>
              <thead>
                <tr>
                  {["Month", "Cash Flow", "Discount Factor", "Present Value"].map((h) => (
                    <th key={h} style={{ padding: "9px 14px", fontSize: "10.5px", fontWeight: 600, color: "#555", letterSpacing: "0.07em", textTransform: "uppercase", backgroundColor: BG_SEC, borderBottom: `1px solid ${BORDER}`, textAlign: h === "Month" ? "left" : "right", whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dcfRows.map((r) => (
                  <tr key={r.month}>
                    <td style={{ padding: "7px 14px", fontSize: "12px", color: "#888", borderBottom: `1px solid ${BORDER_IN}`, textAlign: "left" }}>
                      Month {r.month}
                    </td>
                    <td style={{ padding: "7px 14px", fontSize: "12px", color: profitColor(r.cashFlow), borderBottom: `1px solid ${BORDER_IN}`, textAlign: "right" }}>
                      {fd(r.cashFlow)}
                    </td>
                    <td style={{ padding: "7px 14px", fontSize: "12px", color: "#666", borderBottom: `1px solid ${BORDER_IN}`, textAlign: "right" }}>
                      {r.factor.toFixed(4)}
                    </td>
                    <td style={{ padding: "7px 14px", fontSize: "12px", fontWeight: 600, color: profitColor(r.pv), borderBottom: `1px solid ${BORDER_IN}`, textAlign: "right" }}>
                      {fd(r.pv)}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={3} style={{ padding: "9px 14px", fontSize: "12px", fontWeight: 700, color: "#888", backgroundColor: BG_SEC, textAlign: "right" }}>
                    Total DCF Valuation
                  </td>
                  <td style={{ padding: "9px 14px", fontSize: "14px", fontWeight: 700, color: profitColor(totalDCF), backgroundColor: BG_SEC, textAlign: "right" }}>
                    {fd(totalDCF)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Summary Tab ───────────────────────────────────────────────────────────────

const NOTES_KEY = "elly-user-notes";
const MAX_NOTES = 1000;

function generateSummary(
  inputs: ReturnType<typeof useProjectionStore.getState>,
  data: ReturnType<typeof calcMonthlyData>,
  breakeven: number | null,
  arr: number
): string {
  if (data.length === 0) return "";
  const finalMonth = data[data.length - 1];
  const avgGrossMargin = data.reduce((s, r) => s + r.grossMargin, 0) / data.length;
  const scenarioLabel = ({ bear: "Bear", base: "Base", bull: "Bull", custom: "current" } as Record<string, string>)[inputs.activeScenario] ?? "current";

  const s1 = breakeven !== null
    ? `Based on your ${scenarioLabel} scenario, the business is projected to reach break-even in Month ${breakeven} with a final ARR of ${formatCurrency(arr)}.`
    : `Under the ${scenarioLabel} scenario, break-even is not achieved within the ${inputs.forecastMonths}-month window; the projected ARR is ${formatCurrency(arr)}.`;

  const marginQuality = avgGrossMargin > 65 ? "strong" : avgGrossMargin > 45 ? "healthy" : avgGrossMargin > 25 ? "moderate" : "thin";
  const s2 = `Gross margins are ${marginQuality} at an average of ${avgGrossMargin.toFixed(1)}%${inputs.cogsPercent > 50 ? " — consider reviewing cost of goods" : ""}.`;

  let s3: string;
  if (inputs.churnRate > inputs.growthRate) {
    s3 = `Churn (${inputs.churnRate}%) is outpacing growth (${inputs.growthRate}%) — net MRR is declining and this is the most urgent area to address.`;
  } else if (finalMonth.netProfit >= 0) {
    s3 = `The business ends the forecast period in profit at Month ${inputs.forecastMonths}, with churn well-managed at ${inputs.churnRate}%.`;
  } else {
    s3 = `The business is still running a monthly deficit of ${formatCurrency(Math.abs(finalMonth.netProfit))} at Month ${inputs.forecastMonths}; reducing fixed costs or accelerating growth would improve the trajectory.`;
  }

  return `${s1} ${s2} ${s3}`;
}

function SummaryTab() {
  const inputs = useProjectionStore();
  const [notes, setNotes] = useState<string>(() => localStorage.getItem(NOTES_KEY) ?? "");

  useEffect(() => {
    localStorage.setItem(NOTES_KEY, notes);
  }, [notes]);

  const data = calcMonthlyData(inputs);
  const breakeven = calcBreakeven(inputs);
  const arr = calcARR(inputs);
  const summary = generateSummary(inputs, data, breakeven, arr);

  const remaining = MAX_NOTES - notes.length;
  const nearLimit = remaining < 100;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

      {/* AI-Generated Summary */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
          <SectionTitle>AI-Generated Summary</SectionTitle>
          <span style={{ fontSize: "10px", color: "#3a3a48", marginBottom: "12px" }}>Auto-updates with sliders</span>
        </div>
        <div
          style={{
            backgroundColor: "#12121A",
            border: "1px solid #1e1e2a",
            borderRadius: "10px",
            padding: "18px 20px",
            fontSize: "13px",
            color: "#aaa",
            lineHeight: 1.7,
          }}
        >
          {summary || "Adjust the sliders to generate a summary."}
        </div>
      </div>

      {/* User Notes */}
      <div>
        <SectionTitle>Your Notes</SectionTitle>
        <div
          style={{
            backgroundColor: "#12121A",
            border: "1px solid #1e1e2a",
            borderRadius: "10px",
            overflow: "hidden",
          }}
        >
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value.slice(0, MAX_NOTES))}
            placeholder="Add your own assumptions, context, or comments about this projection…"
            style={{
              width: "100%",
              minHeight: "140px",
              backgroundColor: "transparent",
              border: "none",
              outline: "none",
              color: "#ccc",
              fontSize: "13px",
              lineHeight: 1.65,
              padding: "16px 18px",
              resize: "vertical",
              fontFamily: "inherit",
              boxSizing: "border-box",
            }}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              padding: "6px 14px 10px",
              borderTop: "1px solid #1a1a24",
            }}
          >
            <span style={{ fontSize: "11px", color: nearLimit ? "#F59E0B" : "#3a3a48" }}>
              {notes.length} / {MAX_NOTES}
            </span>
          </div>
        </div>
        <div style={{ fontSize: "11px", color: "#3a3a48", marginTop: "6px" }}>
          Notes are saved automatically in your browser and included in exports.
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export function OutputPanel({ activeTab }: OutputPanelProps) {
  const inputs = useProjectionStore();
  const { apiData, apiLoading } = useProjectionStore();
  const data = calcMonthlyData(inputs);
  const arr = calcARR(inputs);
  const breakeven = calcBreakeven(inputs);
  const finalMonth = data[data.length - 1];
  const startingARR = inputs.startingMRR * 12;
  const arrDelta = arr - startingARR;

  const breakevenLabel = breakeven !== null
    ? `Month ${breakeven}`
    : `> ${inputs.forecastMonths} mo`;
  const breakevenSubtext = breakeven === null
    ? "Outside horizon"
    : breakeven <= 3
    ? "Early break-even"
    : "Within forecast";

  const netProfitColor = finalMonth?.netProfit >= 0 ? "#1D9E75" : "#E24B4A";
  const netProfitSubtext = finalMonth?.netProfit >= 0 ? "Profitable" : "Loss";

  return (
    <div
      style={{
        flex: 1,
        height: "100%",
        overflowY: "auto",
        padding: "24px 24px",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
      }}
    >
      {activeTab === "projection" && (
        <>
          {/* Metric Cards */}
          <div style={{ display: "flex", gap: "14px" }}>
            <MetricCard
              label="Projected ARR"
              value={formatCurrency(arr)}
              subtext={`${arrDelta >= 0 ? "+" : ""}${formatCurrency(arrDelta)} from starting ARR`}
            />
            <MetricCard
              label={`Net Profit (Month ${inputs.forecastMonths})`}
              value={formatCurrency(finalMonth?.netProfit ?? 0)}
              subtext={netProfitSubtext}
              valueColor={netProfitColor}
            />
            <MetricCard
              label="Break-even Month"
              value={breakevenLabel}
              subtext={breakevenSubtext}
              valueColor={breakeven !== null ? "#C9A84C" : "#E24B4A"}
            />
          </div>

          {/* Cash Runway Bar */}
          <div
            style={{
              backgroundColor: "#12121A",
              border: "1px solid #1e1e2a",
              borderRadius: "10px",
              padding: "16px 18px",
            }}
          >
            <BreakevenBar breakevenMonth={breakeven} forecastMonths={inputs.forecastMonths} />
          </div>

          {/* Chart */}
          <div
            style={{
              backgroundColor: "#12121A",
              border: "1px solid #1e1e2a",
              borderRadius: "10px",
              padding: "16px 18px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#555" }}>
                {apiData ? "Historical + Prophet Baseline + Your Forecast" : "Revenue vs Expenses vs Net Profit"}
              </div>
              {apiLoading && (
                <div style={{ fontSize: "10px", color: "#444", letterSpacing: "0.05em" }}>updating…</div>
              )}
            </div>
            <ProjectionChart
              data={data}
              historical={apiData?.historical}
              prophetForecast={apiData?.prophet_forecast}
              sliderForecast={apiData?.slider_forecast}
            />
          </div>

          {/* Monthly Table */}
          <div
            style={{
              backgroundColor: "#12121A",
              border: "1px solid #1e1e2a",
              borderRadius: "10px",
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "14px 18px 0", fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#555" }}>
              Monthly Breakdown
            </div>
            <div style={{ padding: "0 0 0 0" }}>
              <MonthlyTable data={data} forecastMonths={inputs.forecastMonths} />
            </div>
          </div>
        </>
      )}

      {activeTab === "pl" && (
        <PLForecast />
      )}

      {activeTab === "scenarios" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <ScenarioStats />
          <ProjectionChecklist />
          <div>
            <SectionTitle>Built-in Scenarios</SectionTitle>
            <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
              {(["bear", "base", "bull"] as const).map((scenario) => {
                const preset = {
                  bear: { growthRate: 3, startingMRR: 18000, churnRate: 7, cogsPercent: 30, marketingSpend: 2000, payroll: 35000 },
                  base: { growthRate: 8, startingMRR: 18000, churnRate: 3, cogsPercent: 22, marketingSpend: 4000, payroll: 35000 },
                  bull: { growthRate: 18, startingMRR: 18000, churnRate: 1.5, cogsPercent: 18, marketingSpend: 8000, payroll: 35000 },
                }[scenario];
                const scenarioInputs = { ...preset, forecastMonths: inputs.forecastMonths };
                const scenarioARR = calcARR(scenarioInputs);
                const scenarioBreakeven = calcBreakeven(scenarioInputs);
                const scenarioData = calcMonthlyData(scenarioInputs);
                const finalMonthData = scenarioData[scenarioData.length - 1];
                const colors = { bear: "#E24B4A", base: "#C9A84C", bull: "#1D9E75" };
                const color = colors[scenario];
                return (
                  <div
                    key={scenario}
                    style={{
                      backgroundColor: "#12121A",
                      border: `1px solid ${color}22`,
                      borderRadius: "10px",
                      padding: "18px 20px",
                      flex: "1 1 220px",
                      borderTop: `3px solid ${color}`,
                    }}
                  >
                    <div style={{ fontSize: "12px", fontWeight: 700, color, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "12px" }}>
                      {scenario} case
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                        <span style={{ color: "#666" }}>Projected ARR</span>
                        <span style={{ color: "#f0f0f0", fontWeight: 600 }}>{formatCurrency(scenarioARR)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                        <span style={{ color: "#666" }}>Break-even</span>
                        <span style={{ color, fontWeight: 600 }}>
                          {scenarioBreakeven !== null ? `Month ${scenarioBreakeven}` : `> ${inputs.forecastMonths} mo`}
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                        <span style={{ color: "#666" }}>Final Net Profit</span>
                        <span style={{ color: finalMonthData.netProfit >= 0 ? "#1D9E75" : "#E24B4A", fontWeight: 600 }}>
                          {formatCurrency(finalMonthData.netProfit)}
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                        <span style={{ color: "#666" }}>Growth / Churn</span>
                        <span style={{ color: "#888" }}>{preset.growthRate}% / {preset.churnRate}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Saved custom scenarios */}
          <div>
            <SectionTitle>
              Saved Custom Scenarios
              {inputs.savedScenarios.length > 0 && (
                <span style={{ color: "#C9A84C", marginLeft: "8px", fontWeight: 700 }}>
                  {inputs.savedScenarios.length}
                </span>
              )}
            </SectionTitle>
            {inputs.savedScenarios.length === 0 ? (
              <div
                style={{
                  backgroundColor: "#12121A",
                  border: "1px dashed #1e1e2a",
                  borderRadius: "10px",
                  padding: "28px 20px",
                  textAlign: "center",
                  color: "#3a3a48",
                  fontSize: "12px",
                }}
              >
                No saved scenarios yet. Adjust the sliders to create a custom scenario, then click <span style={{ color: "#C9A84C" }}>Save Scenario…</span> in the left panel.
              </div>
            ) : (
              <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
                {inputs.savedScenarios.map((sc) => {
                  const scInputs = {
                    growthRate: sc.growthRate,
                    startingMRR: sc.startingMRR,
                    churnRate: sc.churnRate,
                    cogsPercent: sc.cogsPercent,
                    marketingSpend: sc.marketingSpend,
                    payroll: sc.payroll,
                    forecastMonths: sc.forecastMonths,
                  };
                  const scARR = calcARR(scInputs);
                  const scBreakeven = calcBreakeven(scInputs);
                  const scData = calcMonthlyData(scInputs);
                  const scFinal = scData[scData.length - 1];
                  return (
                    <div
                      key={sc.id}
                      style={{
                        backgroundColor: "#12121A",
                        border: "1px solid #C9A84C22",
                        borderTop: "3px solid #C9A84C",
                        borderRadius: "10px",
                        padding: "16px 18px",
                        flex: "1 1 220px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                      }}
                    >
                      {/* Header row */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{ fontSize: "13px", fontWeight: 700, color: "#C9A84C", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {sc.name}
                        </div>
                        <button
                          onClick={() => inputs.deleteCustomScenario(sc.id)}
                          title="Delete scenario"
                          style={{
                            background: "none",
                            border: "none",
                            color: "#3a3a48",
                            cursor: "pointer",
                            fontSize: "14px",
                            padding: "0 2px",
                            lineHeight: 1,
                            transition: "color 0.15s",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "#E24B4A")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "#3a3a48")}
                        >
                          ✕
                        </button>
                      </div>

                      {/* Metrics */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                          <span style={{ color: "#666" }}>Projected ARR</span>
                          <span style={{ color: "#f0f0f0", fontWeight: 600 }}>{formatCurrency(scARR)}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                          <span style={{ color: "#666" }}>Break-even</span>
                          <span style={{ color: "#C9A84C", fontWeight: 600 }}>
                            {scBreakeven !== null ? `Month ${scBreakeven}` : `> ${sc.forecastMonths} mo`}
                          </span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                          <span style={{ color: "#666" }}>Final Net Profit</span>
                          <span style={{ color: scFinal.netProfit >= 0 ? "#1D9E75" : "#E24B4A", fontWeight: 600 }}>
                            {formatCurrency(scFinal.netProfit)}
                          </span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                          <span style={{ color: "#666" }}>Growth / Churn</span>
                          <span style={{ color: "#888" }}>{sc.growthRate}% / {sc.churnRate}%</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                          <span style={{ color: "#666" }}>Horizon</span>
                          <span style={{ color: "#888" }}>{sc.forecastMonths} mo</span>
                        </div>
                      </div>

                      {/* Load button */}
                      <button
                        onClick={() => inputs.loadCustomScenario(sc.id)}
                        style={{
                          marginTop: "2px",
                          backgroundColor: "transparent",
                          border: "1px solid #C9A84C44",
                          borderRadius: "6px",
                          color: "#C9A84C",
                          fontSize: "11.5px",
                          fontWeight: 600,
                          padding: "6px",
                          cursor: "pointer",
                          transition: "background 0.15s",
                          letterSpacing: "0.04em",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#C9A84C15")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                      >
                        Load into sliders
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "runway" && (
        <CashRunwayDetail />
      )}

      {activeTab === "sensitivity" && (
        <SensitivityTable />
      )}

      {activeTab === "valuation" && (
        <ValuationTab />
      )}

      {activeTab === "summary" && (
        <SummaryTab />
      )}
    </div>
  );
}
