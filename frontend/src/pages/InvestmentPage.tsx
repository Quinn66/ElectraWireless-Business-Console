import { useState } from "react";
import {
  TrendingUp,
  PieChart,
  BarChart2,
  Lightbulb,
  Sparkles,
  Upload,
  Plus,
  AlertTriangle,
} from "lucide-react";
import { C_PRIMARY, C_BORDER, C_SUCCESS, C_ERROR, C_WARNING } from "@/lib/colors";

// ── Tab definitions ──────────────────────────────────────────────────────────

const TABS = [
  { key: "overview",   label: "Overview" },
  { key: "holdings",   label: "Holdings" },
  { key: "analytics",  label: "Analytics" },
  { key: "insights",   label: "Insights" },
  { key: "ai",         label: "AI Scenarios" },
];

// ── Shared placeholder card ──────────────────────────────────────────────────

function PlaceholderCard({
  icon,
  title,
  description,
  owner,
  phase,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  owner: "Frontend" | "Backend" | "AI / Insights" | "Shared";
  phase: string;
}) {
  const ownerColor: Record<string, string> = {
    Frontend:      "#6366f1",
    Backend:       "#0ea5e9",
    "AI / Insights": "#8b5cf6",
    Shared:        "#f59e0b",
  };

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.55)",
        backdropFilter: "blur(14px)",
        border: `1.5px dashed ${C_BORDER}`,
        borderRadius: 12,
        padding: "18px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: C_PRIMARY }}>
          {icon}
          <span style={{ fontWeight: 600, fontSize: 13 }}>{title}</span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              background: ownerColor[owner] + "18",
              color: ownerColor[owner],
              padding: "2px 7px",
              borderRadius: 4,
            }}
          >
            {owner}
          </span>
          <span
            style={{
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              background: "rgba(0,0,0,0.06)",
              color: "#888",
              padding: "2px 7px",
              borderRadius: 4,
            }}
          >
            {phase}
          </span>
        </div>
      </div>
      <p style={{ fontSize: 12, color: "#666", lineHeight: 1.5, margin: 0 }}>{description}</p>
    </div>
  );
}

// ── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  change,
  positive,
}: {
  label: string;
  value: string;
  change?: string;
  positive?: boolean;
}) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.6)",
        backdropFilter: "blur(16px)",
        border: `1.5px solid ${C_BORDER}`,
        borderRadius: 12,
        padding: "16px 20px",
        flex: 1,
        minWidth: 140,
      }}
    >
      <div style={{ fontSize: 11, color: "#888", fontWeight: 500, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: C_PRIMARY, letterSpacing: "-0.5px" }}>{value}</div>
      {change && (
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            marginTop: 4,
            color: positive ? C_SUCCESS : C_ERROR,
          }}
        >
          {change}
        </div>
      )}
    </div>
  );
}

// ── Tabs ─────────────────────────────────────────────────────────────────────

function TabBar({
  active,
  onChange,
}: {
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 4,
        borderBottom: `1.5px solid ${C_BORDER}`,
        paddingBottom: 0,
        marginBottom: 24,
      }}
    >
      {TABS.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "8px 14px",
            fontSize: 12.5,
            fontWeight: active === t.key ? 700 : 500,
            color: active === t.key ? C_PRIMARY : "#888",
            borderBottom: active === t.key ? `2px solid ${C_PRIMARY}` : "2px solid transparent",
            marginBottom: -1.5,
            transition: "all 0.15s",
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ── Tab content ───────────────────────────────────────────────────────────────

function OverviewTab() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Stat cards row */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <StatCard label="Total Portfolio Value" value="$0.00" change="Add holdings to begin" />
        <StatCard label="Total Cost Basis"       value="$0.00" />
        <StatCard label="Profit / Loss"          value="$0.00" positive />
        <StatCard label="Return %"               value="0.00%" positive />
      </div>

      {/* Placeholder sections */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <PlaceholderCard
          icon={<PieChart size={15} />}
          title="Asset Allocation Chart"
          description="Pie chart showing allocation by asset type (stocks, crypto, ETFs, funds, real estate) and by symbol."
          owner="Frontend"
          phase="Phase 5"
        />
        <PlaceholderCard
          icon={<TrendingUp size={15} />}
          title="Portfolio Growth Line Chart"
          description="Historic snapshot line chart showing portfolio value over time."
          owner="Frontend"
          phase="Phase 5"
        />
        <PlaceholderCard
          icon={<BarChart2 size={15} />}
          title="Top Gainers / Losers"
          description="Ranked list of best and worst performing holdings in the current period."
          owner="Frontend"
          phase="Phase 5"
        />
        <PlaceholderCard
          icon={<AlertTriangle size={15} />}
          title="Market Alerts Banner"
          description="Live banner showing significant price moves (e.g. 'AAPL dropped 10% today')."
          owner="Frontend"
          phase="Phase 5"
        />
      </div>
    </div>
  );
}

function HoldingsTab() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Action buttons row */}
      <div style={{ display: "flex", gap: 10 }}>
        <button
          disabled
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: C_PRIMARY,
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "9px 16px",
            fontSize: 12,
            fontWeight: 600,
            cursor: "not-allowed",
            opacity: 0.5,
          }}
        >
          <Plus size={13} /> Add Holding
        </button>
        <button
          disabled
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "rgba(255,255,255,0.7)",
            color: C_PRIMARY,
            border: `1.5px solid ${C_BORDER}`,
            borderRadius: 8,
            padding: "9px 16px",
            fontSize: 12,
            fontWeight: 600,
            cursor: "not-allowed",
            opacity: 0.5,
          }}
        >
          <Upload size={13} /> Import CSV
        </button>
      </div>

      {/* Holdings table placeholder */}
      <div
        style={{
          background: "rgba(255,255,255,0.55)",
          backdropFilter: "blur(14px)",
          border: `1.5px solid ${C_BORDER}`,
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C_BORDER}`, background: "rgba(255,255,255,0.3)" }}>
              {["Symbol", "Asset Type", "Quantity", "Buy Price", "Current Price", "P/L", "Return %"].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "10px 14px",
                    textAlign: "left",
                    fontWeight: 700,
                    fontSize: 10.5,
                    color: "#777",
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={7} style={{ padding: "40px 14px", textAlign: "center", color: "#aaa", fontSize: 13 }}>
                No holdings yet — add manually or import a CSV
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <PlaceholderCard
          icon={<Plus size={15} />}
          title="Manual Holding Entry Form"
          description="Form to add a holding: symbol, asset type, quantity, buy price, purchase date."
          owner="Frontend"
          phase="Phase 2"
        />
        <PlaceholderCard
          icon={<Upload size={15} />}
          title="CSV Import — POST /investments/holdings/upload"
          description="Drag-and-drop CSV uploader with Pandas parser on the backend. Validates and returns error feedback per row."
          owner="Backend"
          phase="Phase 2"
        />
      </div>
    </div>
  );
}

function AnalyticsTab() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      <PlaceholderCard
        icon={<BarChart2 size={15} />}
        title="Portfolio Summary — GET /investments/summary"
        description="Total value, cost basis, P/L, and return %. Calculated server-side from holdings + live prices."
        owner="Backend"
        phase="Phase 4"
      />
      <PlaceholderCard
        icon={<PieChart size={15} />}
        title="Allocation — GET /investments/allocation"
        description="Breakdown by asset type and by symbol. Feeds both the pie chart and the overexposure detection logic."
        owner="Backend"
        phase="Phase 4"
      />
      <PlaceholderCard
        icon={<TrendingUp size={15} />}
        title="CAGR & Volatility"
        description="Calculated using NumPy. Compound Annual Growth Rate and standard deviation of returns per asset and portfolio-wide."
        owner="Backend"
        phase="Phase 4"
      />
      <PlaceholderCard
        icon={<BarChart2 size={15} />}
        title="Markowitz Risk-Return Plot"
        description="Bullet plot of risk vs return for each asset using PyPortfolioOpt output. Shared frontend + backend task."
        owner="Shared"
        phase="Phase 5"
      />
      <PlaceholderCard
        icon={<AlertTriangle size={15} />}
        title="Diversification Score"
        description="Single 0–100 score combining overexposure detection, crypto concentration, and low-diversification signals."
        owner="Backend"
        phase="Phase 4"
      />
      <PlaceholderCard
        icon={<TrendingUp size={15} />}
        title="Market Data — yfinance + CoinGecko"
        description="Live price refresh every 15 min during market hours. Fallback to manual price entry when API calls fail."
        owner="Backend"
        phase="Phase 3"
      />
    </div>
  );
}

function InsightsTab() {
  const mockInsights = [
    {
      type: "Overexposure",
      message: "Over 70% in a single asset or asset type detected.",
      severity: "high",
    },
    {
      type: "Crypto Concentration",
      message: "High crypto allocation — consider diversifying into other asset classes.",
      severity: "medium",
    },
    {
      type: "Low Diversification",
      message: "Portfolio holds fewer than 5 distinct assets.",
      severity: "low",
    },
  ];

  const severityColor: Record<string, string> = {
    high:   C_ERROR,
    medium: C_WARNING,
    low:    C_SUCCESS,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p style={{ fontSize: 12.5, color: "#666", margin: 0 }}>
        Rule-based alerts from <code style={{ fontSize: 11 }}>GET /investments/insights</code>. These are mock entries — wire up the backend endpoint to populate them.
      </p>

      {/* Mock insight cards */}
      {mockInsights.map((ins) => (
        <div
          key={ins.type}
          style={{
            background: severityColor[ins.severity] + "0f",
            border: `1.5px solid ${severityColor[ins.severity]}40`,
            borderLeft: `4px solid ${severityColor[ins.severity]}`,
            borderRadius: 10,
            padding: "14px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <AlertTriangle size={13} color={severityColor[ins.severity]} />
            <span style={{ fontWeight: 700, fontSize: 12.5, color: severityColor[ins.severity] }}>
              {ins.type}
            </span>
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                background: severityColor[ins.severity] + "20",
                color: severityColor[ins.severity],
                padding: "1px 6px",
                borderRadius: 4,
              }}
            >
              {ins.severity}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: "#555", lineHeight: 1.5 }}>{ins.message}</p>
        </div>
      ))}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 4 }}>
        <PlaceholderCard
          icon={<Lightbulb size={15} />}
          title="GET /investments/insights endpoint"
          description="Returns categorised rule-based alerts with severity (high / medium / low). Each alert has type, message, and created_at."
          owner="Backend"
          phase="Phase 6"
        />
        <PlaceholderCard
          icon={<Lightbulb size={15} />}
          title="Personalised Insight Language"
          description="Tone adapts to onboarding experience level: simple language for beginners, technical breakdowns for advanced users."
          owner="AI / Insights"
          phase="Phase 6"
        />
      </div>
    </div>
  );
}

function AITab() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p style={{ fontSize: 12.5, color: "#666", margin: 0 }}>
        AI-powered scenario planning and rebalancing recommendations. Connects user onboarding context (age, horizon, experience) into prompts.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <PlaceholderCard
          icon={<Sparkles size={15} />}
          title="Hypothetical Scenario Tool"
          description="'What if I invested $X in Y asset today?' — simulates outcome using current market data and growth assumptions."
          owner="AI / Insights"
          phase="Phase 7"
        />
        <PlaceholderCard
          icon={<Sparkles size={15} />}
          title="Historical Scenario"
          description="'How would my portfolio have performed if I bought in 2020?' — replays real historical price data."
          owner="AI / Insights"
          phase="Phase 7"
        />
        <PlaceholderCard
          icon={<Sparkles size={15} />}
          title="Future Projection"
          description="'Where could this portfolio be in 5 years at current growth?' — uses CAGR and volatility from Phase 4."
          owner="AI / Insights"
          phase="Phase 7"
        />
        <PlaceholderCard
          icon={<Sparkles size={15} />}
          title="AI Rebalancing Suggestions"
          description="Recommends optimal asset allocation shifts based on user goals, risk tolerance, and current holdings."
          owner="AI / Insights"
          phase="Phase 7"
        />
        <PlaceholderCard
          icon={<BarChart2 size={15} />}
          title="Industry & Sector Research"
          description="Macro-level signals and sector trend summaries to provide market context alongside portfolio insights."
          owner="AI / Insights"
          phase="Phase 7"
        />
        <PlaceholderCard
          icon={<TrendingUp size={15} />}
          title="Cross-Feature: Cashflow → Investments"
          description="Links Feature 2 cashflow health to investment decisions (e.g. 'Low savings buffer → avoid high-risk assets')."
          owner="Shared"
          phase="Phase 7"
        />
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function InvestmentPage() {
  const [activeTab, setActiveTab] = useState("overview");

  const tabContent: Record<string, React.ReactNode> = {
    overview:  <OverviewTab />,
    holdings:  <HoldingsTab />,
    analytics: <AnalyticsTab />,
    insights:  <InsightsTab />,
    ai:        <AITab />,
  };

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Page header */}
      <div
        style={{
          padding: "20px 28px 16px",
          borderBottom: `1.5px solid ${C_BORDER}`,
          background: "rgba(255,255,255,0.35)",
          backdropFilter: "blur(12px)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <TrendingUp size={18} color={C_PRIMARY} />
          <h1 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: C_PRIMARY }}>
            Investment Intelligence
          </h1>
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              background: C_PRIMARY + "15",
              color: C_PRIMARY,
              padding: "2px 8px",
              borderRadius: 4,
            }}
          >
            Feature 3 — In Development
          </span>
        </div>
        <p style={{ margin: 0, fontSize: 12, color: "#777" }}>
          Portfolio tracking, market data, analytics, and AI-powered scenario planning.
        </p>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
        <TabBar active={activeTab} onChange={setActiveTab} />
        {tabContent[activeTab]}
      </div>
    </div>
  );
}
