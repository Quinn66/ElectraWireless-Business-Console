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

  const totalRevenue = data.reduce((s, r) => s + r.revenue, 0);
  const totalExpenses = data.reduce((s, r) => s + r.expenses, 0);
  const totalProfit = data.reduce((s, r) => s + r.netProfit, 0);
  const avgGrossMargin = data.reduce((s, r) => s + r.grossMargin, 0) / data.length;

  const rowStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 0",
    borderBottom: "1px solid #131320",
    fontSize: "13px",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div
        style={{
          backgroundColor: "#12121A",
          border: "1px solid #1e1e2a",
          borderRadius: "10px",
          padding: "18px 20px",
        }}
      >
        <SectionTitle>Forecast Summary — {inputs.forecastMonths} Months</SectionTitle>
        <div style={rowStyle}>
          <span style={{ color: "#888" }}>Total Revenue</span>
          <span style={{ color: "#C9A84C", fontWeight: 600 }}>{formatCurrency(totalRevenue)}</span>
        </div>
        <div style={rowStyle}>
          <span style={{ color: "#888" }}>Total Expenses</span>
          <span style={{ color: "#E24B4A", fontWeight: 600 }}>{formatCurrency(totalExpenses)}</span>
        </div>
        <div style={rowStyle}>
          <span style={{ color: "#888" }}>Avg Gross Margin</span>
          <span style={{ color: "#f0f0f0", fontWeight: 600 }}>{avgGrossMargin.toFixed(1)}%</span>
        </div>
        <div style={{ ...rowStyle, borderBottom: "none" }}>
          <span style={{ color: "#888" }}>Net Profit / Loss</span>
          <span style={{ color: totalProfit >= 0 ? "#1D9E75" : "#E24B4A", fontWeight: 700, fontSize: "15px" }}>
            {formatCurrency(totalProfit)}
          </span>
        </div>
      </div>
      <div>
        <SectionTitle>Month-by-Month P&L</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {data.map((row) => {
            const profitPct = row.revenue > 0 ? (row.netProfit / row.revenue) * 100 : 0;
            return (
              <div
                key={row.month}
                style={{
                  backgroundColor: "#12121A",
                  border: "1px solid #1a1a24",
                  borderRadius: "6px",
                  padding: "8px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                <div style={{ fontSize: "11px", color: "#555", width: "28px", flexShrink: 0 }}>M{row.month}</div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      height: "4px",
                      borderRadius: "2px",
                      backgroundColor: "#1a1a24",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${Math.min(Math.abs(profitPct), 100)}%`,
                        backgroundColor: row.netProfit >= 0 ? "#1D9E75" : "#E24B4A",
                        borderRadius: "2px",
                      }}
                    />
                  </div>
                </div>
                <div style={{ fontSize: "12px", color: "#C9A84C", width: "52px", textAlign: "right" }}>
                  {formatCurrency(row.revenue)}
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: row.netProfit >= 0 ? "#1D9E75" : "#E24B4A",
                    width: "52px",
                    textAlign: "right",
                  }}
                >
                  {formatCurrency(row.netProfit)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

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
    </div>
  );
}
