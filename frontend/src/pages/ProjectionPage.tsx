import { useState } from "react";
import { useProjectionStore } from "@/store/projectionStore";
import { InputPanel } from "@/components/InputPanel";
import { OutputPanel } from "@/components/OutputPanel";
import { FinancialSummaryBar } from "@/components/FinancialSummaryBar";
import { SectorScreens, SECTOR_LIST, type SectorId } from "@/components/SectorScreens";
import { useProphetSync } from "@/hooks/useProphetSync";

const TABS = [
  { key: "projection", label: "Projection" },
  { key: "pl",         label: "P&L Forecast" },
  { key: "scenarios",  label: "Scenarios" },
  { key: "runway",     label: "Cash Runway" },
  { key: "sensitivity",label: "Sensitivity" },
  { key: "valuation",  label: "Valuation" },
  { key: "summary",    label: "Summary" },
];

export function ProjectionPage() {
  const { activeTab, setActiveTab } = useProjectionStore();
  useProphetSync();

  const [activeSector, setActiveSector] = useState<SectorId | null>(null);
  const [showSectorMenu, setShowSectorMenu] = useState(false);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-3.5 border-b border-border bg-white/40 backdrop-blur-md flex-shrink-0 relative z-50">

        {/* Breadcrumb */}
        <div className="text-[11px] text-muted-foreground mb-3.5 tracking-[0.04em] flex items-center">
          <span className="text-primary font-bold">ELLY</span>
          <span className="mx-1.5">—</span>
          <span>Business Console</span>
          <span className="mx-1.5 text-muted-foreground/50">›</span>
          <span>Finance</span>
          <span className="mx-1.5 text-muted-foreground/50">›</span>
          <span className="text-muted-foreground/70">
            {activeSector
              ? `Sectors › ${SECTOR_LIST.find(s => s.id === activeSector)?.label}`
              : "Financial Projection Engine"}
          </span>

          {/* Sectors dropdown */}
          <div className="ml-auto relative">
            <button
              onClick={() => setShowSectorMenu(m => !m)}
              className={[
                "bg-transparent rounded-[6px] text-[11px] font-semibold px-3 py-1 cursor-pointer tracking-[0.03em] transition-all duration-150 border",
                activeSector
                  ? "border-primary/40 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40 hover:text-primary",
              ].join(" ")}
            >
              Financial Sectors {showSectorMenu ? "▲" : "▼"}
            </button>

            {showSectorMenu && (
              <div
                className="absolute top-[calc(100%+6px)] right-0 bg-white/90 backdrop-blur-md border border-border rounded-[8px] overflow-hidden z-[200] min-w-[180px] shadow-[0_8px_24px_rgba(47,36,133,0.12)]"
                onMouseLeave={() => setShowSectorMenu(false)}
              >
                {SECTOR_LIST.map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => { setActiveSector(s.id); setShowSectorMenu(false); }}
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
              </div>
            )}
          </div>
        </div>

        {/* Tab Row */}
        <div className="flex gap-0">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={[
                  "bg-transparent border-none text-[12.5px] px-[18px] py-2 cursor-pointer tracking-[0.03em] transition-all duration-150 border-b-2 -mb-px",
                  isActive
                    ? "border-primary text-primary font-semibold"
                    : "border-transparent text-muted-foreground font-normal hover:text-foreground/80",
                ].join(" ")}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        <InputPanel onSensitivityClick={() => setActiveTab("sensitivity")} />
        <div className="flex flex-col flex-1 overflow-hidden">
          <FinancialSummaryBar />
          {activeSector ? (
            <SectorScreens activeSector={activeSector} onBack={() => setActiveSector(null)} />
          ) : (
            <OutputPanel activeTab={activeTab} />
          )}
        </div>
      </div>
    </div>
  );
}
