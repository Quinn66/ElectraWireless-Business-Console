import { useState } from "react";
import { useProjectionStore } from "@/store/projectionStore";
import { InputPanel } from "@/components/InputPanel";
import { OutputPanel } from "@/components/OutputPanel";
import { FinancialSummaryBar } from "@/components/FinancialSummaryBar";
import { SectorScreens, SECTOR_LIST, type SectorId } from "@/components/SectorScreens";
import { useProphetSync } from "@/hooks/useProphetSync";

const TABS = [
  { key: "projection", label: "Projection" },
  { key: "pl", label: "P&L Forecast" },
  { key: "scenarios", label: "Scenarios" },
  { key: "runway", label: "Cash Runway" },
  { key: "sensitivity", label: "Sensitivity" },
  { key: "valuation", label: "Valuation" },
  { key: "summary", label: "Summary" },
];

export function ProjectionPage() {
  const { activeTab, setActiveTab } = useProjectionStore();
  useProphetSync();

  const [activeSector, setActiveSector] = useState<SectorId | null>(null);
  const [showSectorMenu, setShowSectorMenu] = useState(false);

  const handleSensitivityClick = () => {
    setActiveTab("sensitivity");
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        backgroundColor: "#0A0A0F",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "14px 24px 0",
          borderBottom: "1px solid #1a1a24",
          backgroundColor: "#0A0A0F",
          flexShrink: 0,
        }}
      >
        {/* Breadcrumb */}
        <div style={{ fontSize: "11px", color: "#444", marginBottom: "14px", letterSpacing: "0.04em", display: "flex", alignItems: "center" }}>
          <span style={{ color: "#C9A84C", fontWeight: 700 }}>ELLY</span>
          <span style={{ margin: "0 6px" }}>—</span>
          <span>Business Console</span>
          <span style={{ margin: "0 6px", color: "#333" }}>›</span>
          <span>Finance</span>
          <span style={{ margin: "0 6px", color: "#333" }}>›</span>
          <span style={{ color: "#888" }}>
            {activeSector ? `Sectors › ${SECTOR_LIST.find(s => s.id === activeSector)?.label}` : "Financial Projection Engine"}
          </span>

          {/* Sectors dropdown */}
          <div style={{ marginLeft: "auto", position: "relative" }}>
            <button
              onClick={() => setShowSectorMenu(m => !m)}
              style={{
                background: "none",
                border: `1px solid ${activeSector ? "#C9A84C66" : "#2a2a38"}`,
                borderRadius: "6px",
                color: activeSector ? "#C9A84C" : "#555",
                fontSize: "11px",
                fontWeight: 600,
                padding: "4px 12px",
                cursor: "pointer",
                letterSpacing: "0.03em",
                transition: "all 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#C9A84C66"; e.currentTarget.style.color = "#C9A84C"; }}
              onMouseLeave={e => { if (!activeSector) { e.currentTarget.style.borderColor = "#2a2a38"; e.currentTarget.style.color = "#555"; } }}
            >
              Financial Sectors {showSectorMenu ? "▲" : "▼"}
            </button>
            {showSectorMenu && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  right: 0,
                  backgroundColor: "#12121A",
                  border: "1px solid #1e1e2a",
                  borderRadius: "8px",
                  overflow: "hidden",
                  zIndex: 200,
                  minWidth: "180px",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                }}
                onMouseLeave={() => setShowSectorMenu(false)}
              >
                {SECTOR_LIST.map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => { setActiveSector(s.id); setShowSectorMenu(false); }}
                    style={{
                      display: "block",
                      width: "100%",
                      background: activeSector === s.id ? "#1e1e10" : "none",
                      border: "none",
                      borderBottom: i < SECTOR_LIST.length - 1 ? "1px solid #1a1a24" : "none",
                      color: activeSector === s.id ? "#C9A84C" : "#888",
                      fontSize: "12px",
                      fontWeight: activeSector === s.id ? 600 : 400,
                      padding: "10px 16px",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "background 0.1s, color 0.1s",
                    }}
                    onMouseEnter={e => { if (activeSector !== s.id) { e.currentTarget.style.backgroundColor = "#1a1a24"; e.currentTarget.style.color = "#ccc"; } }}
                    onMouseLeave={e => { if (activeSector !== s.id) { e.currentTarget.style.backgroundColor = "none"; e.currentTarget.style.color = "#888"; } }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tab Row */}
        <div style={{ display: "flex", gap: "0" }}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  background: "none",
                  border: "none",
                  borderBottom: isActive ? "2px solid #C9A84C" : "2px solid transparent",
                  color: isActive ? "#C9A84C" : "#555",
                  fontSize: "12.5px",
                  fontWeight: isActive ? 600 : 400,
                  padding: "8px 18px",
                  cursor: "pointer",
                  letterSpacing: "0.03em",
                  transition: "all 0.15s",
                  marginBottom: "-1px",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.color = "#888";
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.color = "#555";
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <InputPanel onSensitivityClick={handleSensitivityClick} />
        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
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
