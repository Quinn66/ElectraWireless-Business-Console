import { useProjectionStore } from "@/store/projectionStore";
import { InputPanel } from "@/components/InputPanel";
import { OutputPanel } from "@/components/OutputPanel";
import { useProphetSync } from "@/hooks/useProphetSync";

const TABS = [
  { key: "projection", label: "Projection" },
  { key: "pl", label: "P&L Forecast" },
  { key: "scenarios", label: "Scenarios" },
  { key: "runway", label: "Cash Runway" },
  { key: "sensitivity", label: "Sensitivity" },
];

export function ProjectionPage() {
  const { activeTab, setActiveTab } = useProjectionStore();
  useProphetSync();

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
        <div style={{ fontSize: "11px", color: "#444", marginBottom: "14px", letterSpacing: "0.04em" }}>
          <span style={{ color: "#C9A84C", fontWeight: 700 }}>ELLY</span>
          <span style={{ margin: "0 6px" }}>—</span>
          <span>Business Console</span>
          <span style={{ margin: "0 6px", color: "#333" }}>›</span>
          <span>Finance</span>
          <span style={{ margin: "0 6px", color: "#333" }}>›</span>
          <span style={{ color: "#888" }}>Financial Projection Engine</span>
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
        <OutputPanel activeTab={activeTab} />
      </div>
    </div>
  );
}
