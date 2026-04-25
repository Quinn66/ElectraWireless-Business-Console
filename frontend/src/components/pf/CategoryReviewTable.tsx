import { useState } from "react";
import { usePersonalFinanceStore } from "@/store/personalFinanceStore";
import { CATEGORIES, getCategoryColor } from "@/lib/categories";
import { C_PRIMARY, C_BORDER, C_SUCCESS } from "@/lib/colors";

const fmtDate = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "2-digit" });

const fmtAmt = (n: number) => {
  const abs = Math.abs(n).toLocaleString("en-AU", { style: "currency", currency: "AUD" });
  return n >= 0 ? `+${abs}` : abs;
};

export function CategoryReviewTable() {
  const pendingTransactions    = usePersonalFinanceStore((s) => s.pendingTransactions);
  const updatePendingCategory  = usePersonalFinanceStore((s) => s.updatePendingCategory);
  const confirmPendingTransactions = usePersonalFinanceStore((s) => s.confirmPendingTransactions);

  const [filter, setFilter] = useState("");

  const visible = pendingTransactions.filter((t) =>
    t.description.toLowerCase().includes(filter.toLowerCase()) ||
    t.category.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
        background: "rgba(255,255,255,0.20)",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          padding: "16px 28px",
          borderBottom: `1px solid ${C_BORDER}`,
          background: "rgba(255,255,255,0.40)",
          backdropFilter: "blur(10px)",
          display: "flex",
          alignItems: "center",
          gap: "16px",
          flexShrink: 0,
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "15px", fontWeight: 700, color: "hsl(242 44% 30%)", marginBottom: "2px" }}>
            Review Transactions
          </div>
          <div style={{ fontSize: "12px", color: "hsl(245 16% 49%)" }}>
            {pendingTransactions.length} transactions parsed — correct any categories before confirming.
          </div>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Filter by merchant or category…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{
            padding: "8px 12px",
            border: `1px solid ${C_BORDER}`,
            borderRadius: "8px",
            backgroundColor: "rgba(255,255,255,0.70)",
            color: "hsl(242 44% 30%)",
            fontSize: "12px",
            outline: "none",
            width: "240px",
          }}
        />

        <button
          onClick={confirmPendingTransactions}
          style={{
            backgroundColor: C_PRIMARY,
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            padding: "10px 22px",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
            letterSpacing: "0.03em",
            flexShrink: 0,
          }}
        >
          Confirm & View Dashboard →
        </button>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead>
            <tr style={{ position: "sticky", top: 0, background: "rgba(255,255,255,0.85)", backdropFilter: "blur(8px)", zIndex: 10 }}>
              {["Date", "Description", "Amount", "Category"].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "10px 16px",
                    textAlign: h === "Amount" ? "right" : "left",
                    fontSize: "10px",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "hsl(245 16% 49%)",
                    borderBottom: `1px solid ${C_BORDER}`,
                    whiteSpace: "nowrap",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((tx, i) => (
              <tr
                key={tx.id}
                style={{
                  backgroundColor: i % 2 === 0 ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.20)",
                  transition: "background 0.1s",
                }}
              >
                {/* Date */}
                <td style={{ padding: "10px 16px", color: "hsl(245 16% 50%)", whiteSpace: "nowrap" }}>
                  {fmtDate(tx.date)}
                </td>

                {/* Description */}
                <td style={{ padding: "10px 16px", color: "hsl(242 44% 30%)", maxWidth: "260px" }}>
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {tx.description}
                  </div>
                </td>

                {/* Amount */}
                <td
                  style={{
                    padding: "10px 16px",
                    textAlign: "right",
                    fontWeight: 600,
                    fontVariantNumeric: "tabular-nums",
                    color: tx.amount >= 0 ? C_SUCCESS : "#E24B4A",
                    whiteSpace: "nowrap",
                  }}
                >
                  {fmtAmt(tx.amount)}
                </td>

                {/* Category dropdown */}
                <td style={{ padding: "8px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {/* Color dot */}
                    <div
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        backgroundColor: getCategoryColor(tx.category),
                        flexShrink: 0,
                      }}
                    />
                    <select
                      value={tx.category}
                      onChange={(e) => updatePendingCategory(tx.id, e.target.value)}
                      style={{
                        backgroundColor: "rgba(255,255,255,0.70)",
                        border: `1px solid ${C_BORDER}`,
                        borderRadius: "6px",
                        color: "hsl(242 44% 30%)",
                        fontSize: "12px",
                        padding: "5px 8px",
                        cursor: "pointer",
                        outline: "none",
                        minWidth: "130px",
                      }}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </td>
              </tr>
            ))}

            {visible.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: "40px", textAlign: "center", color: "hsl(245 16% 55%)", fontSize: "13px" }}>
                  No transactions match your filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer summary */}
      <div
        style={{
          padding: "12px 28px",
          borderTop: `1px solid ${C_BORDER}`,
          background: "rgba(255,255,255,0.40)",
          display: "flex",
          gap: "24px",
          fontSize: "12px",
          color: "hsl(245 16% 49%)",
          flexShrink: 0,
        }}
      >
        <span>
          Total income:{" "}
          <strong style={{ color: C_SUCCESS }}>
            {pendingTransactions
              .filter((t) => t.amount > 0)
              .reduce((s, t) => s + t.amount, 0)
              .toLocaleString("en-AU", { style: "currency", currency: "AUD" })}
          </strong>
        </span>
        <span>
          Total expenses:{" "}
          <strong style={{ color: "#E24B4A" }}>
            {pendingTransactions
              .filter((t) => t.amount < 0)
              .reduce((s, t) => s + Math.abs(t.amount), 0)
              .toLocaleString("en-AU", { style: "currency", currency: "AUD" })}
          </strong>
        </span>
        <span style={{ marginLeft: "auto" }}>
          Showing {visible.length} of {pendingTransactions.length}
        </span>
      </div>
    </div>
  );
}
