import { useState } from "react";
import { useProjectionStore } from "@/store/projectionStore";
import { ScenarioPills } from "./ScenarioPills";
import { AIHintBlock } from "./AIHintBlock";
import { formatCurrency } from "@/lib/projection";

interface SliderRowProps {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  formatValue: (v: number) => string;
}

function SliderRow({ label, min, max, step, value, onChange, formatValue }: SliderRowProps) {
  return (
    <div style={{ marginBottom: "14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
        <span style={{ fontSize: "12px", color: "#999" }}>{label}</span>
        <span
          style={{
            fontSize: "11.5px",
            color: "#C9A84C",
            backgroundColor: "#1e1810",
            border: "1px solid #2e2212",
            borderRadius: "4px",
            padding: "2px 8px",
            fontWeight: 600,
            minWidth: "48px",
            textAlign: "center",
          }}
        >
          {formatValue(value)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%" }}
      />
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: "10px",
        letterSpacing: "0.1em",
        color: "#555",
        fontWeight: 600,
        textTransform: "uppercase",
        marginBottom: "10px",
        marginTop: "4px",
      }}
    >
      {children}
    </div>
  );
}

export function InputPanel({ onSensitivityClick }: { onSensitivityClick: () => void }) {
  const {
    growthRate, setGrowthRate,
    startingMRR, setStartingMRR,
    churnRate, setChurnRate,
    cogsPercent, setCogsPercent,
    marketingSpend, setMarketingSpend,
    payroll, setPayroll,
    forecastMonths, setForecastMonths,
    activeScenario, saveCustomScenario, setActiveTab,
  } = useProjectionStore();

  const [savingName, setSavingName] = useState(false);
  const [scenarioName, setScenarioName] = useState("");

  return (
    <div
      style={{
        width: "300px",
        flexShrink: 0,
        height: "100%",
        overflowY: "auto",
        backgroundColor: "#0d0d14",
        borderRight: "1px solid #1a1a24",
        padding: "20px 16px",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
      }}
    >
      {/* Scenario Presets */}
      <div>
        <SectionLabel>Scenario Preset</SectionLabel>
        <ScenarioPills />
      </div>

      {/* Revenue Drivers */}
      <div>
        <SectionLabel>Revenue Drivers</SectionLabel>
        <SliderRow
          label="Monthly Growth Rate"
          min={0} max={30} step={1}
          value={growthRate}
          onChange={setGrowthRate}
          formatValue={(v) => `${v}%`}
        />
        <SliderRow
          label="Starting MRR"
          min={1000} max={100000} step={1000}
          value={startingMRR}
          onChange={setStartingMRR}
          formatValue={(v) => formatCurrency(v)}
        />
        <SliderRow
          label="Churn Rate"
          min={0} max={15} step={0.5}
          value={churnRate}
          onChange={setChurnRate}
          formatValue={(v) => `${v}%`}
        />
      </div>

      {/* Cost Drivers */}
      <div>
        <SectionLabel>Cost Drivers</SectionLabel>
        <SliderRow
          label="COGS %"
          min={5} max={60} step={1}
          value={cogsPercent}
          onChange={setCogsPercent}
          formatValue={(v) => `${v}%`}
        />
        <SliderRow
          label="Marketing Spend"
          min={500} max={30000} step={500}
          value={marketingSpend}
          onChange={setMarketingSpend}
          formatValue={(v) => formatCurrency(v)}
        />
        <SliderRow
          label="Payroll"
          min={5000} max={150000} step={5000}
          value={payroll}
          onChange={setPayroll}
          formatValue={(v) => formatCurrency(v)}
        />
      </div>

      {/* Time Horizon */}
      <div>
        <SectionLabel>Time Horizon</SectionLabel>
        <SliderRow
          label="Forecast Period"
          min={3} max={24} step={1}
          value={forecastMonths}
          onChange={setForecastMonths}
          formatValue={(v) => `${v} mo`}
        />
      </div>

      {/* AI Hint */}
      <AIHintBlock />

      {/* Save Custom Scenario */}
      {activeScenario === "custom" && (
        <div>
          {!savingName ? (
            <button
              onClick={() => { setSavingName(true); setScenarioName(""); }}
              style={{
                width: "100%",
                backgroundColor: "transparent",
                color: "#C9A84C",
                border: "1px solid #C9A84C44",
                borderRadius: "8px",
                padding: "9px",
                fontSize: "12.5px",
                fontWeight: 600,
                cursor: "pointer",
                letterSpacing: "0.03em",
                transition: "background 0.15s, border-color 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#C9A84C11"; e.currentTarget.style.borderColor = "#C9A84C88"; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.borderColor = "#C9A84C44"; }}
            >
              Save Scenario…
            </button>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <input
                autoFocus
                type="text"
                placeholder="Scenario name"
                value={scenarioName}
                onChange={(e) => setScenarioName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && scenarioName.trim()) {
                    saveCustomScenario(scenarioName.trim());
                    setSavingName(false);
                    setActiveTab("scenarios");
                  }
                  if (e.key === "Escape") setSavingName(false);
                }}
                style={{
                  backgroundColor: "#12121A",
                  border: "1px solid #C9A84C66",
                  borderRadius: "6px",
                  color: "#f0f0f0",
                  fontSize: "13px",
                  padding: "8px 10px",
                  outline: "none",
                  width: "100%",
                  boxSizing: "border-box",
                }}
              />
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  disabled={!scenarioName.trim()}
                  onClick={() => {
                    if (!scenarioName.trim()) return;
                    saveCustomScenario(scenarioName.trim());
                    setSavingName(false);
                    setActiveTab("scenarios");
                  }}
                  style={{
                    flex: 1,
                    backgroundColor: scenarioName.trim() ? "#C9A84C" : "#2a2a35",
                    color: scenarioName.trim() ? "#fff" : "#555",
                    border: "none",
                    borderRadius: "6px",
                    padding: "8px",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: scenarioName.trim() ? "pointer" : "not-allowed",
                    transition: "background 0.15s",
                  }}
                >
                  Save
                </button>
                <button
                  onClick={() => setSavingName(false)}
                  style={{
                    backgroundColor: "transparent",
                    color: "#555",
                    border: "1px solid #222",
                    borderRadius: "6px",
                    padding: "8px 12px",
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sensitivity Analysis Button */}
      <button
        onClick={onSensitivityClick}
        style={{
          width: "100%",
          backgroundColor: "#C9A84C",
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          padding: "11px",
          fontSize: "13px",
          fontWeight: 600,
          cursor: "pointer",
          letterSpacing: "0.03em",
          transition: "opacity 0.15s",
          marginTop: "auto",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
      >
        Run Sensitivity Analysis
      </button>
    </div>
  );
}
