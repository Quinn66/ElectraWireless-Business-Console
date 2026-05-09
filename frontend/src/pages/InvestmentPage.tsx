import { useState, useEffect, useRef } from "react";
import {
  TrendingUp, TrendingDown, PieChart as PieIcon, BarChart2,
  Lightbulb, Sparkles, Upload, Plus, AlertTriangle, Trash2,
  X, Loader2, Bell,
} from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip as RechartTooltip, Legend, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  ScatterChart, Scatter, ZAxis,
} from "recharts";
import { C_PRIMARY, C_BORDER, C_SUCCESS, C_ERROR, C_WARNING } from "@/lib/colors";
import {
  fetchHoldings, addHolding, deleteHolding, clearAllHoldings, uploadHoldingsCsv,
  fetchInsights, ASSET_TYPE_LABELS,
} from "@/services/investmentApi";
import type { InvestmentHolding, InvestmentInsight, NewHolding, AssetType } from "@/services/investmentApi";

// ── Constants ─────────────────────────────────────────────────────────────────

const TABS = [
  { key: "overview",  label: "Overview" },
  { key: "holdings",  label: "Holdings" },
  { key: "analytics", label: "Analytics" },
  { key: "insights",  label: "Insights" },
  { key: "ai",        label: "AI Scenarios" },
];

const PIE_PALETTE = [
  "#6366f1","#f59e0b","#10b981","#ec4899",
  "#3b82f6","#f97316","#8b5cf6","#14b8a6","#ef4444","#84cc16",
];

const ASSET_TYPE_COLORS: Record<string, string> = {
  Stock: "#6366f1", Crypto: "#f59e0b", ETF: "#10b981",
  Fund: "#3b82f6", "Real Estate": "#f97316",
};

// Dummy data so teammates can see chart shapes before Phase 3/4 data arrives
const MOCK_GROWTH = [
  { month: "Dec", value: 8200 },
  { month: "Jan", value: 9100 },
  { month: "Feb", value: 8800 },
  { month: "Mar", value: 10400 },
  { month: "Apr", value: 11200 },
  { month: "May", value: 13800 },
];

const MOCK_MARKOWITZ = [
  { risk: 4.2,  ret: 6.1,  z: 12000, label: "ETF blend" },
  { risk: 8.5,  ret: 11.3, z: 8000,  label: "Large-cap stocks" },
  { risk: 14.0, ret: 18.7, z: 4000,  label: "Crypto" },
  { risk: 2.1,  ret: 3.4,  z: 6000,  label: "Bond fund" },
  { risk: 6.7,  ret: 9.2,  z: 9000,  label: "Your portfolio" },
];

const MOCK_GAINERS = [
  { symbol: "NVDA", pct: "+18.4%", change: "+$420" },
  { symbol: "AAPL", pct: "+7.2%",  change: "+$180" },
  { symbol: "ETH",  pct: "+5.8%",  change: "+$290" },
];

const MOCK_LOSERS = [
  { symbol: "TSLA", pct: "−11.2%", change: "−$330" },
  { symbol: "META", pct: "−4.7%",  change: "−$95"  },
  { symbol: "BTC",  pct: "−3.1%",  change: "−$140" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt$(n: number) {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function groupHoldings(holdings: InvestmentHolding[], by: "type" | "symbol") {
  const map: Record<string, number> = {};
  for (const h of holdings) {
    const key = by === "type"
      ? (ASSET_TYPE_LABELS[h.asset_type] ?? h.asset_type)
      : h.symbol;
    map[key] = (map[key] ?? 0) + h.quantity * h.buy_price;
  }
  return Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

// ── Shared UI ─────────────────────────────────────────────────────────────────

function PlaceholderCard({
  icon, title, description, owner, phase,
}: {
  icon: React.ReactNode; title: string; description: string;
  owner: "Frontend" | "Backend" | "AI / Insights" | "Shared"; phase: string;
}) {
  const ownerColor: Record<string, string> = {
    Frontend: "#6366f1", Backend: "#0ea5e9", "AI / Insights": "#8b5cf6", Shared: "#f59e0b",
  };
  return (
    <div style={{
      background: "rgba(255,255,255,0.55)", backdropFilter: "blur(14px)",
      border: `1.5px dashed ${C_BORDER}`, borderRadius: 12, padding: "18px 20px",
      display: "flex", flexDirection: "column", gap: 8,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: C_PRIMARY }}>
          {icon}
          <span style={{ fontWeight: 600, fontSize: 13 }}>{title}</span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
            background: ownerColor[owner] + "18", color: ownerColor[owner], padding: "2px 7px", borderRadius: 4,
          }}>{owner}</span>
          <span style={{
            fontSize: 9, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase",
            background: "rgba(0,0,0,0.06)", color: "#888", padding: "2px 7px", borderRadius: 4,
          }}>{phase}</span>
        </div>
      </div>
      <p style={{ fontSize: 12, color: "#666", lineHeight: 1.5, margin: 0 }}>{description}</p>
    </div>
  );
}

function TabBar({ active, onChange }: { active: string; onChange: (k: string) => void }) {
  return (
    <div style={{ display: "flex", gap: 4, borderBottom: `1.5px solid ${C_BORDER}`, marginBottom: 24 }}>
      {TABS.map((t) => (
        <button key={t.key} onClick={() => onChange(t.key)} style={{
          background: "none", border: "none", cursor: "pointer", padding: "8px 14px",
          fontSize: 12.5, fontWeight: active === t.key ? 700 : 500,
          color: active === t.key ? C_PRIMARY : "#888",
          borderBottom: active === t.key ? `2px solid ${C_PRIMARY}` : "2px solid transparent",
          marginBottom: -1.5, transition: "all 0.15s",
        }}>{t.label}</button>
      ))}
    </div>
  );
}

function PhaseBadge({ label }: { label: string }) {
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
      background: C_WARNING + "20", color: C_WARNING, padding: "2px 7px", borderRadius: 4,
    }}>{label}</span>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, accent, stub,
}: {
  label: string; value: string; sub?: string; accent?: string; stub?: boolean;
}) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.6)", backdropFilter: "blur(16px)",
      border: `1.5px solid ${C_BORDER}`,
      borderTop: `3px solid ${accent ?? C_PRIMARY}`,
      borderRadius: 12, padding: "16px 20px", flex: 1, minWidth: 140,
    }}>
      <div style={{ fontSize: 11, color: "#888", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 8 }}>{label}</div>
      <div style={{
        fontSize: 24, fontWeight: 800, color: stub ? "#bbb" : (accent ?? C_PRIMARY),
        letterSpacing: "-0.5px", display: "flex", alignItems: "center", gap: 8,
      }}>
        {value}
        {stub && <PhaseBadge label="Phase 3" />}
      </div>
      {sub && <div style={{ fontSize: 11, color: "#999", marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

// ── Market alert banner ───────────────────────────────────────────────────────

function AlertBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "10px 16px", borderRadius: 10, marginBottom: 16,
      background: C_WARNING + "12", border: `1.5px solid ${C_WARNING}40`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Bell size={14} color={C_WARNING} />
        <span style={{ fontSize: 12.5, fontWeight: 600, color: C_WARNING }}>Market Alerts</span>
        <span style={{ fontSize: 12, color: "#888" }}>
          Connect Phase 3 market data to show live alerts (e.g. "AAPL dropped 10% today")
        </span>
        <PhaseBadge label="Needs Phase 3" />
      </div>
      <button onClick={() => setDismissed(true)} style={{
        background: "none", border: "none", cursor: "pointer", color: "#bbb", padding: 4,
      }}><X size={14} /></button>
    </div>
  );
}

// ── Allocation pie chart ──────────────────────────────────────────────────────

function PieTooltipContent({
  active, payload, total,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number }>;
  total: number;
}) {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  const pct = total > 0 ? ((value / total) * 100).toFixed(1) : "0";
  return (
    <div style={{
      background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)",
      border: `1.5px solid ${C_BORDER}`, borderRadius: 8, padding: "10px 14px",
      fontSize: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
    }}>
      <div style={{ fontWeight: 700, color: C_PRIMARY, marginBottom: 4 }}>{name}</div>
      <div style={{ color: "#555" }}>{fmt$(value)}</div>
      <div style={{ color: "#999", fontSize: 11 }}>{pct}% of portfolio</div>
    </div>
  );
}

function AllocationPieChart({ holdings }: { holdings: InvestmentHolding[] }) {
  const [view, setView] = useState<"type" | "symbol">("type");
  const data = groupHoldings(holdings, view);
  const total = data.reduce((s, d) => s + d.value, 0);

  if (holdings.length === 0) {
    return (
      <div style={{
        height: 260, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 8,
        background: "rgba(255,255,255,0.4)", borderRadius: 12,
        border: `1.5px solid ${C_BORDER}`,
      }}>
        <PieIcon size={32} color="#ddd" />
        <span style={{ fontSize: 13, color: "#bbb" }}>Add holdings to see allocation</span>
      </div>
    );
  }

  const colorFor = (name: string, i: number) =>
    view === "type" ? (ASSET_TYPE_COLORS[name] ?? PIE_PALETTE[i % PIE_PALETTE.length]) : PIE_PALETTE[i % PIE_PALETTE.length];

  return (
    <div style={{
      background: "rgba(255,255,255,0.55)", backdropFilter: "blur(14px)",
      border: `1.5px solid ${C_BORDER}`, borderRadius: 12, padding: "18px 20px",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: C_PRIMARY }}>Asset Allocation</span>
        <div style={{ display: "flex", gap: 4 }}>
          {(["type", "symbol"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} style={{
              fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 6,
              border: `1.5px solid ${view === v ? C_PRIMARY : C_BORDER}`,
              background: view === v ? C_PRIMARY : "transparent",
              color: view === v ? "#fff" : "#888", cursor: "pointer",
            }}>
              {v === "type" ? "By Type" : "By Symbol"}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <div style={{ flex: "0 0 200px", height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                dataKey="value" paddingAngle={2}>
                {data.map((entry, i) => (
                  <Cell key={entry.name} fill={colorFor(entry.name, i)} />
                ))}
              </Pie>
              <RechartTooltip content={<PieTooltipContent total={total} />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
          {data.map((entry, i) => {
            const pct = total > 0 ? (entry.value / total) * 100 : 0;
            const color = colorFor(entry.name, i);
            return (
              <div key={entry.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: "#444", flex: 1 }}>{entry.name}</span>
                <span style={{ fontSize: 11, color: "#777", minWidth: 80, textAlign: "right" }}>{fmt$(entry.value)}</span>
                <span style={{ fontSize: 11, color, fontWeight: 700, minWidth: 42, textAlign: "right" }}>{pct.toFixed(1)}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Portfolio growth line chart ───────────────────────────────────────────────

function GrowthLineChart() {
  return (
    <div style={{
      background: "rgba(255,255,255,0.55)", backdropFilter: "blur(14px)",
      border: `1.5px solid ${C_BORDER}`, borderRadius: 12, padding: "18px 20px", position: "relative",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: C_PRIMARY }}>Portfolio Growth</span>
        <PhaseBadge label="Needs Phase 4 snapshots" />
      </div>
      <div style={{ height: 180, opacity: 0.18, pointerEvents: "none" }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={MOCK_GROWTH}>
            <CartesianGrid strokeDasharray="3 3" stroke={C_BORDER} />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
            <Line type="monotone" dataKey="value" stroke={C_PRIMARY} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div style={{
        position: "absolute", inset: 0, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 6,
      }}>
        <BarChart2 size={28} color="#ccc" />
        <span style={{ fontSize: 12.5, fontWeight: 600, color: "#aaa" }}>
          Awaiting Phase 4 — <code style={{ fontSize: 11 }}>GET /investments/snapshots</code>
        </span>
        <span style={{ fontSize: 11, color: "#bbb" }}>
          Backend saves a PortfolioSnapshot on each summary call
        </span>
      </div>
    </div>
  );
}

// ── Top gainers / losers ──────────────────────────────────────────────────────

function GainersLosersList({ holdings }: { holdings: InvestmentHolding[] }) {
  const itemStyle = (positive: boolean): React.CSSProperties => ({
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "8px 0", borderBottom: `1px solid ${C_BORDER}`,
  });

  // Use real symbols from holdings if available, fall back to mock data
  const hasHoldings = holdings.length > 0;

  return (
    <div style={{
      display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12,
    }}>
      {/* Gainers */}
      <div style={{
        background: "rgba(255,255,255,0.55)", backdropFilter: "blur(14px)",
        border: `1.5px solid ${C_BORDER}`, borderRadius: 12, padding: "18px 20px", position: "relative",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <TrendingUp size={14} color={C_SUCCESS} />
            <span style={{ fontSize: 13, fontWeight: 700, color: C_PRIMARY }}>Top Gainers</span>
          </div>
          <PhaseBadge label="Needs Phase 3" />
        </div>
        {MOCK_GAINERS.map((g) => (
          <div key={g.symbol} style={itemStyle(true)}>
            <span style={{ fontWeight: 700, fontSize: 13, color: C_PRIMARY }}>{g.symbol}</span>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: C_SUCCESS }}>{g.pct}</div>
              <div style={{ fontSize: 11, color: "#aaa" }}>— live price pending</div>
            </div>
          </div>
        ))}
        <div style={{
          position: "absolute", bottom: 12, left: 0, right: 0, textAlign: "center",
          fontSize: 10.5, color: "#bbb",
        }}>
          Mock data — replace with live prices from Phase 3
        </div>
      </div>

      {/* Losers */}
      <div style={{
        background: "rgba(255,255,255,0.55)", backdropFilter: "blur(14px)",
        border: `1.5px solid ${C_BORDER}`, borderRadius: 12, padding: "18px 20px", position: "relative",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <TrendingDown size={14} color={C_ERROR} />
            <span style={{ fontSize: 13, fontWeight: 700, color: C_PRIMARY }}>Top Losers</span>
          </div>
          <PhaseBadge label="Needs Phase 3" />
        </div>
        {MOCK_LOSERS.map((l) => (
          <div key={l.symbol} style={itemStyle(false)}>
            <span style={{ fontWeight: 700, fontSize: 13, color: C_PRIMARY }}>{l.symbol}</span>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: C_ERROR }}>{l.pct}</div>
              <div style={{ fontSize: 11, color: "#aaa" }}>— live price pending</div>
            </div>
          </div>
        ))}
        <div style={{
          position: "absolute", bottom: 12, left: 0, right: 0, textAlign: "center",
          fontSize: 10.5, color: "#bbb",
        }}>
          Mock data — replace with live prices from Phase 3
        </div>
      </div>
    </div>
  );
}

// ── Markowitz risk-return scatter plot ────────────────────────────────────────

function MarkowitzScatterPlot() {
  return (
    <div style={{
      background: "rgba(255,255,255,0.55)", backdropFilter: "blur(14px)",
      border: `1.5px solid ${C_BORDER}`, borderRadius: 12, padding: "20px",
      position: "relative",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <span style={{ fontSize: 13, fontWeight: 700, color: C_PRIMARY }}>
            Markowitz Risk-Return Plot
          </span>
          <p style={{ margin: "2px 0 0", fontSize: 11, color: "#999" }}>
            Risk (volatility %) vs Expected Return (%) — bubble size = position value
          </p>
        </div>
        <PhaseBadge label="Needs Phase 4 PyPortfolioOpt" />
      </div>
      <div style={{ height: 260, opacity: 0.22, pointerEvents: "none" }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={C_BORDER} />
            <XAxis type="number" dataKey="risk" name="Risk %" unit="%" tick={{ fontSize: 10 }} label={{ value: "Risk %", position: "insideBottom", offset: -10, fontSize: 10 }} />
            <YAxis type="number" dataKey="ret" name="Return %" unit="%" tick={{ fontSize: 10 }} label={{ value: "Return %", angle: -90, position: "insideLeft", fontSize: 10 }} />
            <ZAxis type="number" dataKey="z" range={[60, 400]} />
            <Scatter data={MOCK_MARKOWITZ} fill={C_PRIMARY} opacity={0.7} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <div style={{
        position: "absolute", inset: 0, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 6,
      }}>
        <BarChart2 size={28} color="#ccc" />
        <span style={{ fontSize: 12.5, fontWeight: 600, color: "#aaa" }}>
          Awaiting Phase 4 — <code style={{ fontSize: 11 }}>GET /investments/markowitz</code>
        </span>
        <span style={{ fontSize: 11, color: "#bbb" }}>
          Backend uses PyPortfolioOpt to compute efficient frontier weights
        </span>
      </div>
    </div>
  );
}

// ── Overview tab ──────────────────────────────────────────────────────────────

function OverviewTab({ holdings }: { holdings: InvestmentHolding[] }) {
  const costBasis = holdings.reduce((s, h) => s + h.quantity * h.buy_price, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <AlertBanner />

      {/* KPI stat cards */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <StatCard
          label="Portfolio Value"
          value={costBasis > 0 ? fmt$(costBasis) : "$0.00"}
          sub="At cost basis — updates to market value in Phase 3"
          accent={C_PRIMARY}
        />
        <StatCard
          label="Total Cost Basis"
          value={costBasis > 0 ? fmt$(costBasis) : "$0.00"}
          accent="#6366f1"
        />
        <StatCard label="Profit / Loss" value="—" sub="Live prices required" accent={C_SUCCESS} stub />
        <StatCard label="Return %" value="—" sub="Live prices required" accent={C_SUCCESS} stub />
      </div>

      {/* Allocation pie + growth chart */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <AllocationPieChart holdings={holdings} />
        <GrowthLineChart />
      </div>

      {/* Gainers / losers */}
      <GainersLosersList holdings={holdings} />
    </div>
  );
}

// ── Holdings tab ──────────────────────────────────────────────────────────────

const ASSET_TYPES: AssetType[] = ["stock", "crypto", "etf", "fund", "real_estate"];
const TODAY = new Date().toISOString().slice(0, 10);

function AddHoldingModal({ onClose, onSave }: {
  onClose: () => void;
  onSave: (data: NewHolding) => Promise<void>;
}) {
  const [form, setForm] = useState<NewHolding>({
    symbol: "", asset_type: "stock", quantity: 0, buy_price: 0, purchase_date: TODAY,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof NewHolding, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.symbol.trim()) { setError("Symbol is required"); return; }
    if (form.quantity <= 0)  { setError("Quantity must be > 0"); return; }
    if (form.buy_price <= 0) { setError("Buy price must be > 0"); return; }
    setSaving(true); setError(null);
    try {
      await onSave({ ...form, symbol: form.symbol.toUpperCase().trim() });
      onClose();
    } catch {
      setError("Failed to save — is the backend running on port 8000?");
    } finally { setSaving(false); }
  }

  const inp: React.CSSProperties = {
    width: "100%", padding: "8px 10px", fontSize: 13,
    border: `1.5px solid ${C_BORDER}`, borderRadius: 7,
    background: "rgba(255,255,255,0.8)", outline: "none", boxSizing: "border-box",
  };
  const lbl: React.CSSProperties = { fontSize: 11.5, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
    }}>
      <div style={{
        background: "rgba(255,255,255,0.96)", backdropFilter: "blur(20px)",
        borderRadius: 14, padding: 28, width: 420, maxWidth: "90vw",
        border: `1.5px solid ${C_BORDER}`, boxShadow: "0 8px 40px rgba(0,0,0,0.15)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C_PRIMARY }}>Add Holding</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#888" }}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={lbl}>Symbol</label>
            <input style={inp} placeholder="e.g. AAPL, BTC, VOO"
              value={form.symbol} onChange={(e) => set("symbol", e.target.value.toUpperCase())} />
          </div>
          <div>
            <label style={lbl}>Asset Type</label>
            <select style={{ ...inp, appearance: "auto" }} value={form.asset_type}
              onChange={(e) => set("asset_type", e.target.value as AssetType)}>
              {ASSET_TYPES.map((t) => <option key={t} value={t}>{ASSET_TYPE_LABELS[t]}</option>)}
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={lbl}>Quantity</label>
              <input style={inp} type="number" min="0" step="0.000001" placeholder="0"
                value={form.quantity || ""} onChange={(e) => set("quantity", parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <label style={lbl}>Buy Price ($)</label>
              <input style={inp} type="number" min="0" step="0.01" placeholder="0.00"
                value={form.buy_price || ""} onChange={(e) => set("buy_price", parseFloat(e.target.value) || 0)} />
            </div>
          </div>
          <div>
            <label style={lbl}>Purchase Date</label>
            <input style={inp} type="date" value={form.purchase_date}
              onChange={(e) => set("purchase_date", e.target.value)} />
          </div>
          {error && <p style={{ margin: 0, fontSize: 12, color: C_ERROR, fontWeight: 500 }}>{error}</p>}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
            <button type="button" onClick={onClose} style={{
              padding: "9px 18px", fontSize: 13, fontWeight: 600, borderRadius: 8,
              border: `1.5px solid ${C_BORDER}`, background: "transparent", cursor: "pointer", color: "#555",
            }}>Cancel</button>
            <button type="submit" disabled={saving} style={{
              padding: "9px 18px", fontSize: 13, fontWeight: 600, borderRadius: 8,
              border: "none", background: C_PRIMARY, color: "#fff",
              cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1,
              display: "flex", alignItems: "center", gap: 6,
            }}>
              {saving && <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />}
              {saving ? "Saving…" : "Add Holding"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CsvUploadZone({ onUpload }: {
  onUpload: (file: File) => Promise<{ imported: number; symbols: string[]; errors: string[] }>;
}) {
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<
    null | { type: "loading" }
       | { type: "success"; imported: number; symbols: string[]; errors: string[] }
       | { type: "error"; message: string }
  >(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setStatus({ type: "loading" });
    try {
      setStatus({ type: "success", ...(await onUpload(file)) });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        ?? "Upload failed — is the backend running?";
      setStatus({ type: "error", message: msg });
    }
  }

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? C_PRIMARY : C_BORDER}`, borderRadius: 12,
          padding: "28px 20px", display: "flex", flexDirection: "column",
          alignItems: "center", gap: 8, cursor: "pointer",
          background: dragging ? C_PRIMARY + "08" : "rgba(255,255,255,0.4)", transition: "all 0.15s",
        }}
      >
        <Upload size={22} color={dragging ? C_PRIMARY : "#aaa"} />
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: dragging ? C_PRIMARY : "#777" }}>
          Drop CSV here, or click to browse
        </p>
        <p style={{ margin: 0, fontSize: 11, color: "#aaa" }}>
          Required: <code>symbol, asset_type, quantity, buy_price</code> — optional: <code>purchase_date</code>
        </p>
        <input ref={inputRef} type="file" accept=".csv" style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
      </div>
      {status?.type === "loading" && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontSize: 12, color: "#666" }}>
          <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Parsing…
        </div>
      )}
      {status?.type === "success" && (
        <div style={{
          marginTop: 10, padding: "10px 14px", borderRadius: 8,
          background: C_SUCCESS + "10", border: `1px solid ${C_SUCCESS}40`,
          fontSize: 12, color: C_SUCCESS, fontWeight: 500,
        }}>
          Imported {status.imported} holding{status.imported !== 1 ? "s" : ""}
          {status.symbols.length > 0 && `: ${status.symbols.join(", ")}`}
          {status.errors.length > 0 && (
            <ul style={{ margin: "6px 0 0", paddingLeft: 16, color: C_ERROR }}>
              {status.errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
        </div>
      )}
      {status?.type === "error" && (
        <div style={{
          marginTop: 10, padding: "10px 14px", borderRadius: 8,
          background: C_ERROR + "10", border: `1px solid ${C_ERROR}40`,
          fontSize: 12, color: C_ERROR, fontWeight: 500,
        }}>{status.message}</div>
      )}
    </div>
  );
}

function HoldingsTab({ holdings, loading, fetchError, onAdd, onDelete, onClearAll, onCsvUpload }: {
  holdings: InvestmentHolding[]; loading: boolean; fetchError: string | null;
  onAdd: (data: NewHolding) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClearAll: () => Promise<void>;
  onCsvUpload: (file: File) => Promise<{ imported: number; symbols: string[]; errors: string[] }>;
}) {
  const [showAdd, setShowAdd]     = useState(false);
  const [showCsv, setShowCsv]     = useState(false);
  const [deletingId, setDeleting] = useState<string | null>(null);
  const [clearing, setClearing]   = useState(false);

  async function handleClearAll() {
    if (!confirm("Clear all holdings? This cannot be undone.")) return;
    setClearing(true);
    try { await onClearAll(); } finally { setClearing(false); }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    try { await onDelete(id); } finally { setDeleting(null); }
  }

  const th: React.CSSProperties = {
    padding: "10px 14px", textAlign: "left", fontWeight: 700, fontSize: 10.5,
    color: "#777", letterSpacing: "0.04em", textTransform: "uppercase",
  };
  const td: React.CSSProperties = { padding: "11px 14px", fontSize: 12.5, color: "#333", borderTop: `1px solid ${C_BORDER}` };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={() => setShowAdd(true)} style={{
          display: "flex", alignItems: "center", gap: 6, background: C_PRIMARY,
          color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer",
        }}><Plus size={13} /> Add Holding</button>
        <button onClick={() => setShowCsv((v) => !v)} style={{
          display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.7)",
          color: C_PRIMARY, border: `1.5px solid ${C_BORDER}`, borderRadius: 8,
          padding: "9px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer",
        }}><Upload size={13} /> {showCsv ? "Hide CSV" : "Import CSV"}</button>
        {holdings.length > 0 && (
          <button onClick={handleClearAll} disabled={clearing} style={{
            display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.7)",
            color: C_ERROR, border: `1.5px solid ${C_ERROR}40`, borderRadius: 8,
            padding: "9px 16px", fontSize: 12, fontWeight: 600,
            cursor: clearing ? "not-allowed" : "pointer", opacity: clearing ? 0.6 : 1, marginLeft: "auto",
          }}>
            {clearing ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Trash2 size={13} />}
            {clearing ? "Clearing…" : "Clear All"}
          </button>
        )}
      </div>

      {showCsv && <CsvUploadZone onUpload={async (f) => { const r = await onCsvUpload(f); return r; }} />}

      {fetchError && (
        <div style={{
          padding: "10px 14px", borderRadius: 8,
          background: C_ERROR + "10", border: `1px solid ${C_ERROR}40`, fontSize: 12, color: C_ERROR, fontWeight: 500,
        }}>{fetchError}</div>
      )}

      <div style={{
        background: "rgba(255,255,255,0.55)", backdropFilter: "blur(14px)",
        border: `1.5px solid ${C_BORDER}`, borderRadius: 12, overflow: "hidden",
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "rgba(255,255,255,0.3)" }}>
              {["Symbol","Asset Type","Quantity","Buy Price","Current Price","P / L","Return %",""].map((h) => (
                <th key={h} style={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ ...td, textAlign: "center", color: "#aaa" }}>
                <Loader2 size={16} style={{ animation: "spin 1s linear infinite", display: "inline" }} /> Loading…
              </td></tr>
            ) : holdings.length === 0 ? (
              <tr><td colSpan={8} style={{ ...td, textAlign: "center", color: "#aaa" }}>
                No holdings yet — add manually or import a CSV
              </td></tr>
            ) : holdings.map((h) => (
              <tr key={h.id}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.4)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <td style={{ ...td, fontWeight: 700, color: C_PRIMARY }}>{h.symbol}</td>
                <td style={td}>{ASSET_TYPE_LABELS[h.asset_type] ?? h.asset_type}</td>
                <td style={td}>{h.quantity.toLocaleString(undefined, { maximumFractionDigits: 6 })}</td>
                <td style={td}>{fmt$(h.buy_price)}</td>
                <td style={{ ...td, color: "#bbb" }}>— <span style={{ fontSize: 10 }}>(Phase 3)</span></td>
                <td style={{ ...td, color: "#bbb" }}>—</td>
                <td style={{ ...td, color: "#bbb" }}>—</td>
                <td style={td}>
                  <button onClick={() => handleDelete(h.id)} disabled={deletingId === h.id}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#ccc", padding: 4, borderRadius: 4, display: "flex", alignItems: "center" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = C_ERROR)}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "#ccc")}
                  >
                    {deletingId === h.id
                      ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />
                      : <Trash2 size={13} />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          {holdings.length > 0 && (
            <tfoot>
              <tr style={{ background: "rgba(255,255,255,0.2)", borderTop: `1.5px solid ${C_BORDER}` }}>
                <td colSpan={3} style={{ ...td, fontWeight: 700, fontSize: 11, color: "#777" }}>
                  {holdings.length} holding{holdings.length !== 1 ? "s" : ""}
                </td>
                <td style={{ ...td, fontWeight: 700 }}>
                  {fmt$(holdings.reduce((s, h) => s + h.quantity * h.buy_price, 0))}
                  <span style={{ fontSize: 10, fontWeight: 400, color: "#aaa", marginLeft: 4 }}>cost basis</span>
                </td>
                <td colSpan={4} style={{ ...td, fontSize: 11, color: "#aaa" }}>
                  Market value, P/L &amp; return available after Phase 3
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {showAdd && <AddHoldingModal onClose={() => setShowAdd(false)} onSave={onAdd} />}
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ── Analytics tab ─────────────────────────────────────────────────────────────

function AnalyticsTab() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <MarkowitzScatterPlot />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <PlaceholderCard icon={<BarChart2 size={15} />} title="GET /investments/summary"
          description="Total value, cost basis, P/L, return %. Server-side calculation from holdings + live prices." owner="Backend" phase="Phase 4" />
        <PlaceholderCard icon={<PieIcon size={15} />} title="GET /investments/allocation"
          description="Breakdown by asset type and symbol. Feeds overexposure detection logic." owner="Backend" phase="Phase 4" />
        <PlaceholderCard icon={<TrendingUp size={15} />} title="CAGR & Volatility"
          description="Compound Annual Growth Rate and standard deviation using NumPy, per asset and portfolio-wide." owner="Backend" phase="Phase 4" />
        <PlaceholderCard icon={<AlertTriangle size={15} />} title="Diversification Score"
          description="0–100 score combining overexposure, crypto concentration, and low-diversification signals." owner="Backend" phase="Phase 4" />
        <PlaceholderCard icon={<TrendingUp size={15} />} title="Market Data — yfinance + CoinGecko"
          description="Live price refresh every 15 min. Manual fallback when API calls fail." owner="Backend" phase="Phase 3" />
        <PlaceholderCard icon={<BarChart2 size={15} />} title="GET /investments/snapshots"
          description="PortfolioSnapshot history for the growth line chart. Written on each summary call." owner="Backend" phase="Phase 4" />
      </div>
    </div>
  );
}

// ── Insights tab ──────────────────────────────────────────────────────────────

const SEVERITY_COLOR: Record<string, string> = {
  high: C_ERROR, medium: C_WARNING, low: C_SUCCESS, info: C_PRIMARY,
};

function InsightsTab({ holdings }: { holdings: InvestmentHolding[] }) {
  const [insights, setInsights] = useState<InvestmentInsight[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    if (holdings.length === 0) { setInsights([]); return; }
    setLoading(true); setError(null);
    fetchInsights()
      .then(setInsights)
      .catch(() => setError("Could not load insights — is the backend running on port 8000?"))
      .finally(() => setLoading(false));
  }, [holdings]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p style={{ fontSize: 12.5, color: "#666", margin: 0 }}>
        Rule-based alerts from <code style={{ fontSize: 11 }}>GET /investments/insights</code> — live from your holdings, no market data required.
      </p>

      {loading && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#888" }}>
          <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Analysing portfolio…
        </div>
      )}

      {error && (
        <div style={{
          padding: "10px 14px", borderRadius: 8, fontSize: 12, fontWeight: 500,
          background: C_ERROR + "10", border: `1px solid ${C_ERROR}40`, color: C_ERROR,
        }}>{error}</div>
      )}

      {!loading && holdings.length === 0 && (
        <div style={{
          padding: "18px 20px", borderRadius: 10, fontSize: 12.5, color: "#aaa",
          background: "rgba(255,255,255,0.4)", border: `1.5px dashed ${C_BORDER}`, textAlign: "center",
        }}>
          Add holdings first — insights will appear automatically.
        </div>
      )}

      {!loading && insights.map((ins, i) => {
        const color = SEVERITY_COLOR[ins.severity] ?? C_PRIMARY;
        return (
          <div key={i} style={{
            background: color + "0f", border: `1.5px solid ${color}40`,
            borderLeft: `4px solid ${color}`, borderRadius: 10, padding: "14px 16px",
            display: "flex", flexDirection: "column", gap: 6,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <AlertTriangle size={13} color={color} />
              <span style={{ fontWeight: 700, fontSize: 12.5, color }}>{ins.type}</span>
              <span style={{
                fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em",
                background: color + "20", color, padding: "1px 6px", borderRadius: 4,
              }}>{ins.severity}</span>
              {ins.affected.length > 0 && ins.affected.map((sym) => (
                <span key={sym} style={{
                  fontSize: 10, fontWeight: 700, background: "rgba(0,0,0,0.06)",
                  color: "#555", padding: "1px 6px", borderRadius: 4,
                }}>{sym}</span>
              ))}
            </div>
            <p style={{ margin: 0, fontSize: 12, color: "#555", lineHeight: 1.5 }}>{ins.message}</p>
          </div>
        );
      })}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 4 }}>
        <PlaceholderCard icon={<Lightbulb size={15} />} title="Personalised Insight Language"
          description="Tone adapts to onboarding experience level — simple for beginners, technical for advanced." owner="AI / Insights" phase="Phase 6" />
        <PlaceholderCard icon={<Sparkles size={15} />} title="Live Price Signals"
          description="Insight severity updates in real-time as market prices shift your effective allocation." owner="Backend" phase="Phase 3" />
      </div>
    </div>
  );
}

// ── AI Scenarios tab ──────────────────────────────────────────────────────────

function AITab() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p style={{ fontSize: 12.5, color: "#666", margin: 0 }}>
        AI-powered scenario planning. Connects onboarding context (age, horizon, experience) into prompts.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <PlaceholderCard icon={<Sparkles size={15} />} title="Hypothetical Scenario"
          description="'What if I invested $X in Y today?' — simulates outcome using current market data." owner="AI / Insights" phase="Phase 7" />
        <PlaceholderCard icon={<Sparkles size={15} />} title="Historical Scenario"
          description="'How would my portfolio have performed if I bought in 2020?' — replays real price data." owner="AI / Insights" phase="Phase 7" />
        <PlaceholderCard icon={<Sparkles size={15} />} title="Future Projection"
          description="'Where could this be in 5 years?' — uses CAGR + volatility from Phase 4." owner="AI / Insights" phase="Phase 7" />
        <PlaceholderCard icon={<Sparkles size={15} />} title="AI Rebalancing"
          description="Recommends allocation shifts based on goals, risk tolerance, and current holdings." owner="AI / Insights" phase="Phase 7" />
        <PlaceholderCard icon={<BarChart2 size={15} />} title="Industry & Sector Research"
          description="Macro signals and sector trends to provide market context alongside portfolio insights." owner="AI / Insights" phase="Phase 7" />
        <PlaceholderCard icon={<TrendingUp size={15} />} title="Cross-Feature: Cashflow → Investments"
          description="Links Feature 2 cashflow health to investment decisions (e.g. 'Low savings → avoid high risk')." owner="Shared" phase="Phase 7" />
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function InvestmentPage() {
  const [activeTab, setActiveTab]     = useState("overview");
  const [holdings, setHoldings]       = useState<InvestmentHolding[]>([]);
  const [loading, setLoading]         = useState(false);
  const [fetchError, setFetchError]   = useState<string | null>(null);

  async function loadHoldings() {
    setLoading(true); setFetchError(null);
    try { setHoldings(await fetchHoldings()); }
    catch { setFetchError("Could not load holdings — is the backend running on port 8000?"); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadHoldings(); }, []);

  async function handleAdd(data: NewHolding) {
    await addHolding(data);
    await loadHoldings();
  }
  async function handleDelete(id: string) {
    await deleteHolding(id);
    setHoldings((prev) => prev.filter((h) => h.id !== id));
  }
  async function handleCsvUpload(file: File) {
    const result = await uploadHoldingsCsv(file);
    await loadHoldings();
    return result;
  }
  async function handleClearAll() {
    await clearAllHoldings();
    setHoldings([]);
  }

  const tabContent: Record<string, React.ReactNode> = {
    overview:  <OverviewTab holdings={holdings} />,
    holdings:  <HoldingsTab holdings={holdings} loading={loading} fetchError={fetchError}
                 onAdd={handleAdd} onDelete={handleDelete} onClearAll={handleClearAll} onCsvUpload={handleCsvUpload} />,
    analytics: <AnalyticsTab />,
    insights:  <InsightsTab holdings={holdings} />,
    ai:        <AITab />,
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{
        padding: "20px 28px 16px", borderBottom: `1.5px solid ${C_BORDER}`,
        background: "rgba(255,255,255,0.35)", backdropFilter: "blur(12px)", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <TrendingUp size={18} color={C_PRIMARY} />
          <h1 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: C_PRIMARY }}>Investment Intelligence</h1>
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase",
            background: C_PRIMARY + "15", color: C_PRIMARY, padding: "2px 8px", borderRadius: 4,
          }}>Feature 3 — In Development</span>
        </div>
        <p style={{ margin: 0, fontSize: 12, color: "#777" }}>
          Portfolio tracking, market data, analytics, and AI-powered scenario planning.
        </p>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
        <TabBar active={activeTab} onChange={setActiveTab} />
        {tabContent[activeTab]}
      </div>
    </div>
  );
}
