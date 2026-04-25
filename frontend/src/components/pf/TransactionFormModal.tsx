import { useState } from "react";
import { createPortal } from "react-dom";
import { usePersonalFinanceStore } from "@/store/personalFinanceStore";
import type { Transaction } from "@/store/personalFinanceStore";
import { CATEGORIES } from "@/lib/categories";
import { autoCategory, inferType } from "@/lib/categories";
import { C_PRIMARY, C_BORDER, C_ERROR } from "@/lib/colors";

interface Props {
  onClose: () => void;
  initial?: Transaction; // pre-fill when editing
}

const BG = "rgba(255,255,255,0.55)";

const btnPrimary: React.CSSProperties = {
  backgroundColor: C_PRIMARY,
  color: "#fff",
  border: "none",
  borderRadius: "8px",
  padding: "9px 20px",
  fontSize: "13px",
  fontWeight: 600,
  cursor: "pointer",
};

const btnGhost: React.CSSProperties = {
  backgroundColor: "transparent",
  color: "hsl(245 16% 55%)",
  border: `1px solid ${C_BORDER}`,
  borderRadius: "8px",
  padding: "9px 18px",
  fontSize: "12.5px",
  cursor: "pointer",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  border: `1px solid ${C_BORDER}`,
  borderRadius: "8px",
  backgroundColor: "rgba(255,255,255,0.70)",
  color: "hsl(242 44% 30%)",
  fontSize: "13px",
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 600,
  color: "hsl(245 16% 49%)",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  marginBottom: "6px",
  display: "block",
};

export function TransactionFormModal({ onClose, initial }: Props) {
  const addTransaction       = usePersonalFinanceStore((s) => s.addTransaction);
  const updateTransactionCategory = usePersonalFinanceStore((s) => s.updateTransactionCategory);

  const today = new Date().toISOString().slice(0, 10);

  const [date,        setDate]        = useState(initial?.date ?? today);
  const [description, setDescription] = useState(initial?.description ?? "");
  const [rawAmount,   setRawAmount]   = useState(initial ? String(Math.abs(initial.amount)) : "");
  const [amountType,  setAmountType]  = useState<"expense" | "income">(initial?.type === "income" ? "income" : "expense");
  const [category,    setCategory]    = useState(initial?.category ?? "");
  const [errors,      setErrors]      = useState<Record<string, string>>({});

  // Auto-fill category when description changes (only if user hasn't manually set it)
  const handleDescriptionChange = (val: string) => {
    setDescription(val);
    if (!category || category === autoCategory(description)) {
      setCategory(autoCategory(val));
    }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!date) e.date = "Required";
    if (!description.trim()) e.description = "Required";
    const n = parseFloat(rawAmount);
    if (isNaN(n) || n <= 0) e.amount = "Enter a positive number";
    if (!category) e.category = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const amount = parseFloat(rawAmount) * (amountType === "expense" ? -1 : 1);
    const cat    = category || autoCategory(description);
    const tx: Transaction = {
      id:          initial?.id ?? `manual-${Date.now()}`,
      date,
      description: description.trim(),
      amount,
      type:        inferType(cat, amount),
      category:    cat,
      source:      "manual",
    };

    if (initial) {
      // Editing — update category (extend store if full edit needed)
      updateTransactionCategory(initial.id, cat);
    } else {
      addTransaction(tx);
    }
    onClose();
  };

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(47,36,133,0.20)",
        backdropFilter: "blur(6px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          backgroundColor: BG,
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          border: "2px solid rgba(255,255,255,0.70)",
          borderRadius: "20px",
          width: "100%",
          maxWidth: "440px",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 8px 48px rgba(120,100,180,0.15)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px 16px",
            borderBottom: "1px solid rgba(255,255,255,0.50)",
            backgroundColor: "rgba(255,255,255,0.30)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: "14px", fontWeight: 700, color: "hsl(242 44% 30%)" }}>
            {initial ? "Edit Transaction" : "Add Transaction"}
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "hsl(245 16% 60%)", fontSize: "18px", cursor: "pointer", lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* Date */}
          <div>
            <label style={labelStyle}>Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{ ...inputStyle, borderColor: errors.date ? C_ERROR : C_BORDER }}
            />
            {errors.date && <div style={{ fontSize: "11px", color: C_ERROR, marginTop: "4px" }}>{errors.date}</div>}
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>Description / Merchant</label>
            <input
              type="text"
              placeholder="e.g. Woolworths, Salary, Netflix…"
              value={description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              style={{ ...inputStyle, borderColor: errors.description ? C_ERROR : C_BORDER }}
            />
            {errors.description && <div style={{ fontSize: "11px", color: C_ERROR, marginTop: "4px" }}>{errors.description}</div>}
          </div>

          {/* Amount + type toggle */}
          <div>
            <label style={labelStyle}>Amount</label>
            <div style={{ display: "flex", gap: "8px" }}>
              {/* Income / Expense toggle */}
              <div
                style={{
                  display: "flex",
                  border: `1px solid ${C_BORDER}`,
                  borderRadius: "8px",
                  overflow: "hidden",
                  flexShrink: 0,
                }}
              >
                {(["expense", "income"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setAmountType(t)}
                    style={{
                      padding: "9px 14px",
                      fontSize: "12px",
                      fontWeight: 600,
                      border: "none",
                      cursor: "pointer",
                      backgroundColor: amountType === t
                        ? t === "expense" ? "#E24B4A" : "#1D9E75"
                        : "rgba(255,255,255,0.70)",
                      color: amountType === t ? "#fff" : "hsl(245 16% 55%)",
                      transition: "all 0.15s",
                    }}
                  >
                    {t === "expense" ? "− Expense" : "+ Income"}
                  </button>
                ))}
              </div>
              <div style={{ flex: 1 }}>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={rawAmount}
                  onChange={(e) => setRawAmount(e.target.value)}
                  style={{ ...inputStyle, borderColor: errors.amount ? C_ERROR : C_BORDER }}
                />
              </div>
            </div>
            {errors.amount && <div style={{ fontSize: "11px", color: C_ERROR, marginTop: "4px" }}>{errors.amount}</div>}
          </div>

          {/* Category */}
          <div>
            <label style={labelStyle}>Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{ ...inputStyle, borderColor: errors.category ? C_ERROR : C_BORDER, cursor: "pointer" }}
            >
              <option value="">— Select category —</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            {errors.category && <div style={{ fontSize: "11px", color: C_ERROR, marginTop: "4px" }}>{errors.category}</div>}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid rgba(255,255,255,0.50)",
            backgroundColor: "rgba(255,255,255,0.30)",
            display: "flex",
            justifyContent: "flex-end",
            gap: "8px",
          }}
        >
          <button style={btnGhost} onClick={onClose}>Cancel</button>
          <button style={btnPrimary} onClick={handleSubmit}>
            {initial ? "Save Changes" : "Add Transaction"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
