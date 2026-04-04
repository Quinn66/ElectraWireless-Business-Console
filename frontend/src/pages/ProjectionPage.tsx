import { useState, useRef, useEffect } from "react";
import { useProjectionStore } from "@/store/projectionStore";
import { InputPanel } from "@/components/InputPanel";
import { OutputPanel } from "@/components/OutputPanel";
import { FinancialSummaryBar } from "@/components/FinancialSummaryBar";
import { SectorScreens, SECTOR_LIST, type SectorId } from "@/components/SectorScreens";
import { useProphetSync } from "@/hooks/useProphetSync";

const ALL_TABS = [
  { key: "projection", label: "Projection" },
  { key: "pl",         label: "P&L Forecast" },
  { key: "scenarios",  label: "Scenarios" },
  { key: "runway",     label: "Cash Runway" },
  { key: "sensitivity",label: "Sensitivity" },
  { key: "valuation",  label: "Valuation" },
  { key: "summary",    label: "Summary" },
];

// Tabs hidden by default for user accounts
const USER_RESTRICTED_TABS = new Set(["scenarios", "sensitivity", "valuation"]);

export function ProjectionPage() {
  const { activeTab, setActiveTab, accountType } = useProjectionStore();
  useProphetSync();

  const [activeSector, setActiveSector] = useState<SectorId | null>(null);
  const [showSectorMenu, setShowSectorMenu] = useState(false);
  const [addedTabs, setAddedTabs] = useState<Set<string>>(new Set());
  const [showAddMenu, setShowAddMenu] = useState(false);
  const addMenuRef = useRef<HTMLDivElement>(null);

  // Close add-menu when clicking outside
  useEffect(() => {
    if (!showAddMenu) return;
    function handleClick(e: MouseEvent) {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setShowAddMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showAddMenu]);

  const isUserAccount = accountType === "user";

  // Tabs visible in the nav row
  const visibleTabs = isUserAccount
    ? ALL_TABS.filter((t) => !USER_RESTRICTED_TABS.has(t.key) || addedTabs.has(t.key))
    : ALL_TABS;

  // Tabs available to add via the '+' button
  const addableTabs = ALL_TABS.filter(
    (t) => USER_RESTRICTED_TABS.has(t.key) && !addedTabs.has(t.key)
  );

  function handleAddTab(key: string) {
    setAddedTabs((prev) => new Set([...prev, key]));
    setShowAddMenu(false);
    setActiveTab(key);
  }

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
        <div className="flex gap-0 items-center">
          {visibleTabs.map((tab) => {
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

          {/* Add tool button — only shown for user accounts with remaining addable tabs */}
          {isUserAccount && addableTabs.length > 0 && (
            <div className="relative ml-1" ref={addMenuRef}>
              <button
                onClick={() => setShowAddMenu((v) => !v)}
                title="Add tool"
                className={[
                  "flex items-center justify-center w-6 h-6 rounded-full cursor-pointer transition-all duration-150 border",
                  showAddMenu
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-transparent text-muted-foreground border-border hover:border-primary/60 hover:text-primary",
                ].join(" ")}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <line x1="5" y1="1" x2="5" y2="9" />
                  <line x1="1" y1="5" x2="9" y2="5" />
                </svg>
              </button>

              {showAddMenu && (
                <div className="absolute top-[calc(100%+6px)] left-0 bg-white/95 backdrop-blur-md border border-border rounded-[8px] overflow-hidden z-[200] min-w-[160px] shadow-[0_8px_24px_rgba(47,36,133,0.12)]">
                  <p className="text-[10px] text-muted-foreground font-semibold tracking-widest uppercase px-3.5 pt-2.5 pb-1">
                    Add tool
                  </p>
                  {addableTabs.map((tab, i) => (
                    <button
                      key={tab.key}
                      onClick={() => handleAddTab(tab.key)}
                      className={[
                        "block w-full text-left text-xs px-3.5 py-2 cursor-pointer transition-colors duration-100 text-muted-foreground hover:bg-primary/5 hover:text-foreground",
                        i < addableTabs.length - 1 ? "border-b border-border/50" : "pb-2.5",
                      ].join(" ")}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
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
