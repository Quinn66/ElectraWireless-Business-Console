import { useState, useEffect } from "react";
import { C_SUCCESS, C_WARNING } from "@/lib/colors";
import { useProjectionStore } from "@/store/projectionStore";
import { useSpreadsheetStore } from "@/store/spreadsheetStore";
import { ScenarioPills } from "./ScenarioPills";
import { formatCurrency } from "@/lib/projection";
import { ImportModal } from "./ImportModal";
import { SECTOR_LIST, type SectorId } from "./SectorScreens";

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
    <div className="mb-3.5">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-[11.5px] text-primary bg-primary/10 border border-primary/25 rounded px-2 py-0.5 font-semibold min-w-[48px] text-center">
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
        className="w-full"
      />
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] tracking-[0.1em] text-muted-foreground font-semibold uppercase mb-2.5 mt-1">
      {children}
    </div>
  );
}

interface InputPanelProps {
  onSensitivityClick: () => void;
  activeSector: SectorId | null;
  setActiveSector: (sector: SectorId | null) => void;
}

export function InputPanel({ onSensitivityClick, activeSector, setActiveSector }: InputPanelProps) {
  const {
    growthRate, setGrowthRate,
    startingMRR, setStartingMRR,
    churnRate, setChurnRate,
    cogsPercent, setCogsPercent,
    marketingSpend, setMarketingSpend,
    payroll, setPayroll,
    forecastMonths, setForecastMonths,
    activeScenario, saveCustomScenario, setActiveTab, activeTab,
  } = useProjectionStore();

  const { sheets, activeSheetIndex, setActiveSheet } = useSpreadsheetStore();
  const hasSheets = sheets.length > 0;

  const [savingName, setSavingName] = useState(false);
  const [scenarioName, setScenarioName] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [showSectorMenu, setShowSectorMenu] = useState(false);
  const [toast, setToast] = useState<{ applied: string[]; skipped: string[] } | null>(null);

  function handleSheetClick(index: number) {
    setActiveSheet(index);
    setActiveTab("your-data");
    setActiveSector(null);
    setShowSectorMenu(false);
  }

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <div className="w-[300px] flex-shrink-0 h-full overflow-y-auto bg-white/40 backdrop-blur-md border-r border-border px-4 py-5 flex flex-col gap-5">

      {/* Financial Sectors Dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowSectorMenu((m) => !m)}
          className={[
            "w-full bg-transparent rounded-lg py-2.5 flex items-center justify-between px-3.5 cursor-pointer transition-colors duration-150 border",
            activeSector || (activeTab === "your-data" && hasSheets)
              ? "border-primary/40 text-primary hover:bg-primary/10 hover:border-primary/60"
              : "border-border text-muted-foreground hover:bg-primary/5 hover:border-primary/40 hover:text-primary",
          ].join(" ")}
        >
          <span className="text-[12.5px] font-semibold tracking-[0.02em]">
            {activeSector
              ? SECTOR_LIST.find((s) => s.id === activeSector)?.label
              : activeTab === "your-data" && hasSheets
                ? sheets[activeSheetIndex]?.name ?? "Your Data"
                : "Financial Sectors"}
          </span>
          <span className="text-[10px] opacity-60">{showSectorMenu ? "▲" : "▼"}</span>
        </button>

        {showSectorMenu && (
          <div
            className="absolute top-[calc(100%+4px)] left-0 right-0 bg-white/95 backdrop-blur-md border border-border rounded-[8px] overflow-hidden z-[200] shadow-[0_8px_24px_rgba(47,36,133,0.12)]"
            onMouseLeave={() => setShowSectorMenu(false)}
          >
            {/* Built-in analysis sectors */}
            <p className="text-[9.5px] text-muted-foreground font-semibold tracking-widest uppercase px-3.5 pt-2.5 pb-1">
              Analysis
            </p>
            {SECTOR_LIST.map((s, i) => (
              <button
                key={s.id}
                onClick={() => { setActiveSector(s.id); setActiveTab("projection"); setShowSectorMenu(false); }}
                className={[
                  "block w-full text-left text-xs px-4 py-2.5 cursor-pointer transition-colors duration-100",
                  i < SECTOR_LIST.length - 1 ? "border-b border-border/50" : "",
                  activeSector === s.id
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:bg-primary/5 hover:text-foreground font-normal",
                ].join(" ")}
              >
                {s.label}
              </button>
            ))}

            {/* Uploaded sheet tabs — only shown when a workbook is loaded */}
            {hasSheets && (
              <>
                <div className="border-t border-border/60 mt-1" />
                <p className="text-[9.5px] text-muted-foreground font-semibold tracking-widest uppercase px-3.5 pt-2.5 pb-1">
                  Your Data
                </p>
                {sheets.map((sheet, i) => {
                  const isActive = activeTab === "your-data" && activeSheetIndex === i;
                  return (
                    <button
                      key={i}
                      onClick={() => handleSheetClick(i)}
                      className={[
                        "block w-full text-left text-xs px-4 py-2.5 cursor-pointer transition-colors duration-100",
                        i < sheets.length - 1 ? "border-b border-border/50" : "pb-3",
                        isActive
                          ? "bg-primary/10 text-primary font-semibold"
                          : "text-muted-foreground hover:bg-primary/5 hover:text-foreground font-normal",
                      ].join(" ")}
                    >
                      {sheet.name}
                    </button>
                  );
                })}
              </>
            )}
          </div>
        )}
      </div>

      {/* Import Button */}
      <button
        onClick={() => setShowImport(true)}
        className="w-full bg-transparent border border-primary/35 rounded-lg py-2.5 flex items-center justify-center gap-1.5 cursor-pointer transition-colors duration-150 hover:bg-primary/10 hover:border-primary/60"
      >
        <span className="text-[13px] text-primary">↑</span>
        <span className="text-[12.5px] font-semibold text-primary tracking-[0.02em]">
          Import Financial Data
        </span>
      </button>

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

      {/* Bottom Actions */}
      <div className="mt-auto flex flex-col gap-2">
        {/* Save Custom Scenario */}
        {activeScenario === "custom" && (
          <div>
            {!savingName ? (
              <button
                onClick={() => { setSavingName(true); setScenarioName(""); }}
                className="w-full bg-transparent text-primary border border-primary/30 rounded-lg py-2 text-[12.5px] font-semibold cursor-pointer tracking-[0.03em] transition-colors duration-150 hover:bg-primary/10 hover:border-primary/60"
              >
                Save Scenario…
              </button>
            ) : (
              <div className="flex flex-col gap-2">
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
                  className="bg-white/70 border border-primary/40 rounded-[6px] text-foreground text-[13px] px-2.5 py-2 outline-none w-full focus:border-primary/70"
                />
                <div className="flex gap-1.5">
                  <button
                    disabled={!scenarioName.trim()}
                    onClick={() => {
                      if (!scenarioName.trim()) return;
                      saveCustomScenario(scenarioName.trim());
                      setSavingName(false);
                      setActiveTab("scenarios");
                    }}
                    className="flex-1 rounded-[6px] py-2 text-xs font-semibold cursor-pointer transition-colors duration-150 border-none"
                    style={{
                      backgroundColor: scenarioName.trim() ? "hsl(var(--primary))" : "hsl(var(--muted))",
                      color: scenarioName.trim() ? "#fff" : "hsl(var(--muted-foreground))",
                      cursor: scenarioName.trim() ? "pointer" : "not-allowed",
                    }}
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setSavingName(false)}
                    className="bg-transparent text-muted-foreground border border-border rounded-[6px] px-3 py-2 text-xs cursor-pointer hover:border-muted-foreground transition-colors"
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
          className="w-full bg-primary text-primary-foreground border-none rounded-lg py-[11px] text-[13px] font-semibold cursor-pointer tracking-[0.03em] transition-opacity duration-150 hover:opacity-85"
        >
          Run Sensitivity Analysis
        </button>
      </div>

      {/* Import Modal */}
      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onImport={(applied, skipped) => {
            setShowImport(false);
            setToast({ applied, skipped });
          }}
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[2000] bg-white/90 backdrop-blur-md border border-border rounded-[10px] px-4 py-3.5 min-w-[260px] max-w-[360px] shadow-[0_8px_32px_rgba(47,36,133,0.15)]">
          <div className="text-xs font-bold text-foreground mb-2">Import Complete</div>
          {toast.applied.length > 0 && (
            <div className="mb-1.5">
              <div className="text-[10.5px] font-semibold mb-0.5" style={{ color: C_SUCCESS }}>
                ✓ Applied ({toast.applied.length})
              </div>
              {toast.applied.map((f) => (
                <div key={f} className="text-[11px] text-muted-foreground pl-2.5">{f}</div>
              ))}
            </div>
          )}
          {toast.skipped.length > 0 && (
            <div>
              <div className="text-[10.5px] font-semibold mb-0.5" style={{ color: C_WARNING }}>
                ⚠ Not detected ({toast.skipped.length})
              </div>
              {toast.skipped.map((f) => (
                <div key={f} className="text-[11px] text-muted-foreground pl-2.5">{f}</div>
              ))}
            </div>
          )}
          <button
            onClick={() => setToast(null)}
            className="absolute top-2.5 right-3 bg-transparent border-none text-muted-foreground/50 cursor-pointer text-[13px] hover:text-muted-foreground transition-colors"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
