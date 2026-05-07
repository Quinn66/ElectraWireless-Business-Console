import { useState, useEffect, useRef } from "react";
import {
  TrendingUp, PieChart, BarChart2, Lightbulb, Sparkles,
  Upload, Plus, AlertTriangle, Trash2, X, Loader2,
} from "lucide-react";
import { C_PRIMARY, C_BORDER, C_SUCCESS, C_ERROR, C_WARNING } from "@/lib/colors";
import {
  fetchHoldings, addHolding, deleteHolding, uploadHoldingsCsv,
  ASSET_TYPE_LABELS,
} from "@/services/investmentApi";
import type { InvestmentHolding, NewHolding, AssetType } from "@/services/investmentApi";

// ── Shared helpers ────────────────────────────────────────────────────────────

const TABS = [
  { key: "overview",  label: "Overview" },
  { key: "holdings",  label: "Holdings" },
  { key: "analytics", label: "Analytics" },
  { key: "insights",  label: "Insights" },
  { key: "ai",        label: "AI Scenarios" },
];

function PlaceholderCard({
  icon, title, description, owner, phase,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  owner: "Frontend" | "Backend" | "AI / Insights" | "Shared";
  phase: string;
}) {
  const ownerColor: Record<string, string> = {
    Frontend:        "#6366f1",
    Backend:         "#0ea5e9",
    "AI / Insights": "#8b5cf6",
    Shared:          "#f59e0b",
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
            background: ownerColor[owner] + "18", color: ownerColor[owner],
            padding: "2px 7px", borderRadius: 4,
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

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.6)", backdropFilter: "blur(16px)",
      border: `1.5px solid ${C_BORDER}`, borderRadius: 12, padding: "16px 20px",
      flex: 1, minWidth: 140,
    }}>
      <div style={{ fontSize: 11, color: "#888", fontWeight: 500, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: C_PRIMARY, letterSpacing: "-0.5px" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>{sub}</div>}
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

// ── Add Holding Modal ─────────────────────────────────────────────────────────

const ASSET_TYPES: AssetType[] = ["stock", "crypto", "etf", "fund", "real_estate"];
const TODAY = new Date().toISOString().slice(0, 10);

function AddHoldingModal({
  onClose, onSave,
}: {
  onClose: () => void;
  onSave: (data: NewHolding) => Promise<void>;
}) {
  const [form, setForm] = useState<NewHolding>({
    symbol: "", asset_type: "stock", quantity: 0, buy_price: 0, purchase_date: TODAY,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof NewHolding, v: unknown) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.symbol.trim()) { setError("Symbol is required"); return; }
    if (form.quantity <= 0)  { setError("Quantity must be greater than 0"); return; }
    if (form.buy_price <= 0) { setError("Buy price must be greater than 0"); return; }
    setSaving(true);
    setError(null);
    try {
      await onSave({ ...form, symbol: form.symbol.toUpperCase().trim() });
      onClose();
    } catch {
      setError("Failed to save — check the server is running.");
    } finally {
      setSaving(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "8px 10px", fontSize: 13,
    border: `1.5px solid ${C_BORDER}`, borderRadius: 7,
    background: "rgba(255,255,255,0.8)", outline: "none", boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 11.5, fontWeight: 600, color: "#555", display: "block", marginBottom: 4,
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
    }}>
      <div style={{
        background: "rgba(255,255,255,0.95)", backdropFilter: "blur(20px)",
        borderRadius: 14, padding: 28, width: 420, maxWidth: "90vw",
        border: `1.5px solid ${C_BORDER}`,
        boxShadow: "0 8px 40px rgba(0,0,0,0.15)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C_PRIMARY }}>Add Holding</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#888" }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={labelStyle}>Symbol</label>
            <input
              style={inputStyle} placeholder="e.g. AAPL, BTC, VOO"
              value={form.symbol}
              onChange={(e) => set("symbol", e.target.value.toUpperCase())}
            />
          </div>

          <div>
            <label style={labelStyle}>Asset Type</label>
            <select
              style={{ ...inputStyle, appearance: "auto" }}
              value={form.asset_type}
              onChange={(e) => set("asset_type", e.target.value as AssetType)}
            >
              {ASSET_TYPES.map((t) => (
                <option key={t} value={t}>{ASSET_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Quantity</label>
              <input
                style={inputStyle} type="number" min="0" step="0.000001" placeholder="0"
                value={form.quantity || ""}
                onChange={(e) => set("quantity", parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <label style={labelStyle}>Buy Price ($)</label>
              <input
                style={inputStyle} type="number" min="0" step="0.01" placeholder="0.00"
                value={form.buy_price || ""}
                onChange={(e) => set("buy_price", parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Purchase Date</label>
            <input
              style={inputStyle} type="date"
              value={form.purchase_date}
              onChange={(e) => set("purchase_date", e.target.value)}
            />
          </div>

          {error && (
            <p style={{ margin: 0, fontSize: 12, color: C_ERROR, fontWeight: 500 }}>{error}</p>
          )}

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

// ── CSV Upload Zone ───────────────────────────────────────────────────────────

function CsvUploadZone({
  onUpload,
}: {
  onUpload: (file: File) => Promise<{ imported: number; symbols: string[]; errors: string[] }>;
}) {
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<
    null | { type: "loading" } | { type: "success"; imported: number; symbols: string[]; errors: string[] } | { type: "error"; message: string }
  >(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setStatus({ type: "loading" });
    try {
      const result = await onUpload(file);
      setStatus({ type: "success", ...result });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        ?? "Upload failed — check the server is running.";
      setStatus({ type: "error", message: msg });
    }
  }

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? C_PRIMARY : C_BORDER}`,
          borderRadius: 12, padding: "28px 20px",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
          cursor: "pointer", transition: "border-color 0.15s",
          background: dragging ? C_PRIMARY + "08" : "rgba(255,255,255,0.4)",
        }}
      >
        <Upload size={22} color={dragging ? C_PRIMARY : "#aaa"} />
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: dragging ? C_PRIMARY : "#777" }}>
          Drop your CSV here, or click to browse
        </p>
        <p style={{ margin: 0, fontSize: 11, color: "#aaa" }}>
          Required columns: <code>symbol, asset_type, quantity, buy_price</code> — optional: <code>purchase_date</code>
        </p>
        <input
          ref={inputRef} type="file" accept=".csv" style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
        />
      </div>

      {status?.type === "loading" && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontSize: 12, color: "#666" }}>
          <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Parsing CSV…
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
        }}>
          {status.message}
        </div>
      )}
    </div>
  );
}

// ── Holdings Tab ──────────────────────────────────────────────────────────────

function HoldingsTab({
  holdings, loading, fetchError, onAdd, onDelete, onCsvUpload,
}: {
  holdings:     InvestmentHolding[];
  loading:      boolean;
  fetchError:   string | null;
  onAdd:        (data: NewHolding) => Promise<void>;
  onDelete:     (id: string) => Promise<void>;
  onCsvUpload:  (file: File) => Promise<{ imported: number; symbols: string[]; errors: string[] }>;
}) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCsvZone, setShowCsvZone]   = useState(false);
  const [deletingId, setDeletingId]     = useState<string | null>(null);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try { await onDelete(id); } finally { setDeletingId(null); }
  }

  async function handleCsvUpload(file: File) {
    const result = await onCsvUpload(file);
    return result;
  }

  const thStyle: React.CSSProperties = {
    padding: "10px 14px", textAlign: "left", fontWeight: 700, fontSize: 10.5,
    color: "#777", letterSpacing: "0.04em", textTransform: "uppercase",
  };
  const tdStyle: React.CSSProperties = {
    padding: "11px 14px", fontSize: 12.5, color: "#333",
    borderTop: `1px solid ${C_BORDER}`,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Action bar */}
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={() => setShowAddModal(true)} style={{
          display: "flex", alignItems: "center", gap: 6, background: C_PRIMARY,
          color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px",
          fontSize: 12, fontWeight: 600, cursor: "pointer",
        }}>
          <Plus size={13} /> Add Holding
        </button>
        <button onClick={() => setShowCsvZone((v) => !v)} style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "rgba(255,255,255,0.7)", color: C_PRIMARY,
          border: `1.5px solid ${C_BORDER}`, borderRadius: 8, padding: "9px 16px",
          fontSize: 12, fontWeight: 600, cursor: "pointer",
        }}>
          <Upload size={13} /> {showCsvZone ? "Hide CSV Upload" : "Import CSV"}
        </button>
      </div>

      {/* CSV upload zone */}
      {showCsvZone && (
        <CsvUploadZone onUpload={handleCsvUpload} />
      )}

      {/* Error banner */}
      {fetchError && (
        <div style={{
          padding: "10px 14px", borderRadius: 8,
          background: C_ERROR + "10", border: `1px solid ${C_ERROR}40`,
          fontSize: 12, color: C_ERROR, fontWeight: 500,
        }}>
          {fetchError}
        </div>
      )}

      {/* Holdings table */}
      <div style={{
        background: "rgba(255,255,255,0.55)", backdropFilter: "blur(14px)",
        border: `1.5px solid ${C_BORDER}`, borderRadius: 12, overflow: "hidden",
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "rgba(255,255,255,0.3)" }}>
              {["Symbol", "Asset Type", "Quantity", "Buy Price", "Current Price", "P / L", "Return %", ""].map((h) => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ ...tdStyle, textAlign: "center", color: "#aaa" }}>
                  <Loader2 size={16} style={{ animation: "spin 1s linear infinite", display: "inline" }} /> Loading…
                </td>
              </tr>
            ) : holdings.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ ...tdStyle, textAlign: "center", color: "#aaa" }}>
                  No holdings yet — add one manually or import a CSV
                </td>
              </tr>
            ) : (
              holdings.map((h) => {
                const costBasis = h.quantity * h.buy_price;
                return (
                  <tr key={h.id} style={{ transition: "background 0.1s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.4)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ ...tdStyle, fontWeight: 700, color: C_PRIMARY }}>{h.symbol}</td>
                    <td style={tdStyle}>{ASSET_TYPE_LABELS[h.asset_type] ?? h.asset_type}</td>
                    <td style={tdStyle}>{h.quantity.toLocaleString(undefined, { maximumFractionDigits: 6 })}</td>
                    <td style={tdStyle}>${h.buy_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td style={{ ...tdStyle, color: "#bbb" }}>— <span style={{ fontSize: 10 }}>(Phase 3)</span></td>
                    <td style={{ ...tdStyle, color: "#bbb" }}>—</td>
                    <td style={{ ...tdStyle, color: "#bbb" }}>—</td>
                    <td style={tdStyle}>
                      <button
                        onClick={() => handleDelete(h.id)}
                        disabled={deletingId === h.id}
                        title="Delete holding"
                        style={{
                          background: "none", border: "none", cursor: deletingId === h.id ? "not-allowed" : "pointer",
                          color: "#ccc", padding: 4, borderRadius: 4, display: "flex", alignItems: "center",
                          transition: "color 0.15s",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = C_ERROR)}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "#ccc")}
                      >
                        {deletingId === h.id
                          ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />
                          : <Trash2 size={13} />}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {holdings.length > 0 && (
            <tfoot>
              <tr style={{ background: "rgba(255,255,255,0.2)", borderTop: `1.5px solid ${C_BORDER}` }}>
                <td colSpan={3} style={{ ...tdStyle, fontWeight: 700, fontSize: 11, color: "#777" }}>
                  {holdings.length} holding{holdings.length !== 1 ? "s" : ""}
                </td>
                <td style={{ ...tdStyle, fontWeight: 700, fontSize: 12 }}>
                  ${holdings.reduce((s, h) => s + h.quantity * h.buy_price, 0)
                    .toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  <span style={{ fontSize: 10, fontWeight: 400, color: "#aaa", marginLeft: 4 }}>cost basis</span>
                </td>
                <td colSpan={4} style={{ ...tdStyle, fontSize: 11, color: "#aaa" }}>
                  Market value & P/L available after Phase 3
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Add modal */}
      {showAddModal && (
        <AddHoldingModal
          onClose={() => setShowAddModal(false)}
          onSave={onAdd}
        />
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab({ holdings }: { holdings: InvestmentHolding[] }) {
  const costBasis = holdings.reduce((s, h) => s + h.quantity * h.buy_price, 0);
  const fmt = (n: number) =>
    n === 0 ? "$0.00" : `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <StatCard label="Total Portfolio Value"  value={fmt(costBasis)} sub="At cost basis — Phase 3 for live prices" />
        <StatCard label="Total Cost Basis"       value={fmt(costBasis)} />
        <StatCard label="Profit / Loss"          value="—" sub="Available after Phase 3" />
        <StatCard label="Return %"               value="—" sub="Available after Phase 3" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <PlaceholderCard icon={<PieChart size={15} />} title="Asset Allocation Chart"
          description="Pie chart showing allocation by asset type and by symbol. Feeds from holdings data." owner="Frontend" phase="Phase 5" />
        <PlaceholderCard icon={<TrendingUp size={15} />} title="Portfolio Growth Line Chart"
          description="Historic snapshot line chart showing portfolio value over time." owner="Frontend" phase="Phase 5" />
        <PlaceholderCard icon={<BarChart2 size={15} />} title="Top Gainers / Losers"
          description="Ranked list of best and worst performing holdings in the current period." owner="Frontend" phase="Phase 5" />
        <PlaceholderCard icon={<AlertTriangle size={15} />} title="Market Alerts Banner"
          description="Live banner for significant price moves — e.g. 'AAPL dropped 10% today'." owner="Frontend" phase="Phase 5" />
      </div>
    </div>
  );
}

// ── Analytics Tab ─────────────────────────────────────────────────────────────

function AnalyticsTab() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      <PlaceholderCard icon={<BarChart2 size={15} />} title="Portfolio Summary — GET /investments/summary"
        description="Total value, cost basis, P/L, and return %. Calculated server-side from holdings + live prices." owner="Backend" phase="Phase 4" />
      <PlaceholderCard icon={<PieChart size={15} />} title="Allocation — GET /investments/allocation"
        description="Breakdown by asset type and by symbol. Feeds pie chart and overexposure detection." owner="Backend" phase="Phase 4" />
      <PlaceholderCard icon={<TrendingUp size={15} />} title="CAGR & Volatility"
        description="Compound Annual Growth Rate and standard deviation of returns using NumPy, per asset and portfolio-wide." owner="Backend" phase="Phase 4" />
      <PlaceholderCard icon={<BarChart2 size={15} />} title="Markowitz Risk-Return Plot"
        description="Bullet plot of risk vs return using PyPortfolioOpt output. Shared frontend + backend task." owner="Shared" phase="Phase 5" />
      <PlaceholderCard icon={<AlertTriangle size={15} />} title="Diversification Score"
        description="Single 0–100 score combining overexposure detection, crypto concentration, and low-diversification signals." owner="Backend" phase="Phase 4" />
      <PlaceholderCard icon={<TrendingUp size={15} />} title="Market Data — yfinance + CoinGecko"
        description="Live price refresh every 15 min during market hours. Manual fallback when API calls fail." owner="Backend" phase="Phase 3" />
    </div>
  );
}

// ── Insights Tab ──────────────────────────────────────────────────────────────

function InsightsTab() {
  const mockInsights = [
    { type: "Overexposure",       message: "Over 70% in a single asset or asset type detected.", severity: "high" },
    { type: "Crypto Concentration", message: "High crypto allocation — consider diversifying into other asset classes.", severity: "medium" },
    { type: "Low Diversification", message: "Portfolio holds fewer than 5 distinct assets.", severity: "low" },
  ];
  const severityColor: Record<string, string> = { high: C_ERROR, medium: C_WARNING, low: C_SUCCESS };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p style={{ fontSize: 12.5, color: "#666", margin: 0 }}>
        Rule-based alerts from <code style={{ fontSize: 11 }}>GET /investments/insights</code>. These are mock entries — wire up the backend endpoint to populate them.
      </p>
      {mockInsights.map((ins) => (
        <div key={ins.type} style={{
          background: severityColor[ins.severity] + "0f",
          border: `1.5px solid ${severityColor[ins.severity]}40`,
          borderLeft: `4px solid ${severityColor[ins.severity]}`,
          borderRadius: 10, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 4,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <AlertTriangle size={13} color={severityColor[ins.severity]} />
            <span style={{ fontWeight: 700, fontSize: 12.5, color: severityColor[ins.severity] }}>{ins.type}</span>
            <span style={{
              fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em",
              background: severityColor[ins.severity] + "20", color: severityColor[ins.severity],
              padding: "1px 6px", borderRadius: 4,
            }}>{ins.severity}</span>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: "#555", lineHeight: 1.5 }}>{ins.message}</p>
        </div>
      ))}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 4 }}>
        <PlaceholderCard icon={<Lightbulb size={15} />} title="GET /investments/insights endpoint"
          description="Returns categorised rule-based alerts with severity (high / medium / low). Each alert has type, message, and created_at." owner="Backend" phase="Phase 6" />
        <PlaceholderCard icon={<Lightbulb size={15} />} title="Personalised Insight Language"
          description="Tone adapts to onboarding experience level: simple for beginners, technical for advanced users." owner="AI / Insights" phase="Phase 6" />
      </div>
    </div>
  );
}

// ── AI Scenarios Tab ──────────────────────────────────────────────────────────

function AITab() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p style={{ fontSize: 12.5, color: "#666", margin: 0 }}>
        AI-powered scenario planning and rebalancing recommendations. Connects user onboarding context (age, horizon, experience) into prompts.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <PlaceholderCard icon={<Sparkles size={15} />} title="Hypothetical Scenario Tool"
          description="'What if I invested $X in Y today?' — simulates outcome using current market data and growth assumptions." owner="AI / Insights" phase="Phase 7" />
        <PlaceholderCard icon={<Sparkles size={15} />} title="Historical Scenario"
          description="'How would my portfolio have performed if I bought in 2020?' — replays real historical price data." owner="AI / Insights" phase="Phase 7" />
        <PlaceholderCard icon={<Sparkles size={15} />} title="Future Projection"
          description="'Where could this portfolio be in 5 years at current growth?' — uses CAGR and volatility from Phase 4." owner="AI / Insights" phase="Phase 7" />
        <PlaceholderCard icon={<Sparkles size={15} />} title="AI Rebalancing Suggestions"
          description="Recommends optimal allocation shifts based on goals, risk tolerance, and current holdings." owner="AI / Insights" phase="Phase 7" />
        <PlaceholderCard icon={<BarChart2 size={15} />} title="Industry & Sector Research"
          description="Macro-level signals and sector trend summaries to provide market context alongside portfolio insights." owner="AI / Insights" phase="Phase 7" />
        <PlaceholderCard icon={<TrendingUp size={15} />} title="Cross-Feature: Cashflow → Investments"
          description="Links Feature 2 cashflow health to investment decisions (e.g. 'Low savings → avoid high-risk assets')." owner="Shared" phase="Phase 7" />
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function InvestmentPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [holdings, setHoldings]   = useState<InvestmentHolding[]>([]);
  const [loading, setLoading]     = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  async function loadHoldings() {
    setLoading(true);
    setFetchError(null);
    try {
      setHoldings(await fetchHoldings());
    } catch {
      setFetchError("Could not load holdings — check the backend server is running on port 8000.");
    } finally {
      setLoading(false);
    }
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

  const tabContent: Record<string, React.ReactNode> = {
    overview:  <OverviewTab holdings={holdings} />,
    holdings:  (
      <HoldingsTab
        holdings={holdings} loading={loading} fetchError={fetchError}
        onAdd={handleAdd} onDelete={handleDelete} onCsvUpload={handleCsvUpload}
      />
    ),
    analytics: <AnalyticsTab />,
    insights:  <InsightsTab />,
    ai:        <AITab />,
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header */}
      <div style={{
        padding: "20px 28px 16px", borderBottom: `1.5px solid ${C_BORDER}`,
        background: "rgba(255,255,255,0.35)", backdropFilter: "blur(12px)", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <TrendingUp size={18} color={C_PRIMARY} />
          <h1 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: C_PRIMARY }}>
            Investment Intelligence
          </h1>
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase",
            background: C_PRIMARY + "15", color: C_PRIMARY, padding: "2px 8px", borderRadius: 4,
          }}>Feature 3 — In Development</span>
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
