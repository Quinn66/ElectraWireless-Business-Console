import { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { usePersonalFinanceStore, useFilteredTransactions } from "@/store/personalFinanceStore";
import { fetchInsights } from "@/services/personalFinanceApi";
import type { PFInsight } from "@/services/personalFinanceApi";
import { C_ERROR, C_WARNING, C_PRIMARY } from "@/lib/colors";
import { PFAIInsightsGrid } from "@/components/pf/PFAIInsightsGrid";
import { AIErrorBlock } from "@/components/pf/AIErrorBlock";
import { Spinner } from "@/components/Spinner";
import { refetchPFAIReport } from "@/hooks/usePFAIReport";

function severityColor(s: PFInsight["severity"]) {
  if (s === "danger")  return C_ERROR;
  if (s === "warning") return C_WARNING;
  return C_PRIMARY;
}

function severityIcon(s: PFInsight["severity"]) {
  if (s === "danger")  return "⛔";
  if (s === "warning") return "⚠️";
  return "💡";
}

function typeLabel(t: PFInsight["type"]) {
  if (t === "overspending") return "Overspending";
  if (t === "risk")         return "Risk Zone";
  return "Opportunity";
}

export function PFInsightsPanel() {
  const transactions = useFilteredTransactions();
  const budgets      = usePersonalFinanceStore((s) => s.budgets);
  const userGoalCount = usePersonalFinanceStore((s) => s.goals.length);

  const aiReport        = usePersonalFinanceStore((s) => s.aiReport);
  const aiReportLoading = usePersonalFinanceStore((s) => s.aiReportLoading);
  const aiReportError   = usePersonalFinanceStore((s) => s.aiReportError);

  const [insights,  setInsights]  = useState<PFInsight[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [rulesLoading, setRulesLoading] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(true);

  useEffect(() => {
    if (transactions.length === 0) return;
    setRulesLoading(true);
    fetchInsights(transactions, budgets)
      .then(setInsights)
      .finally(() => setRulesLoading(false));
  }, [transactions, budgets]);

  const visible = insights.filter((i) => !dismissed.has(i.id));
  const dismiss = (id: string) => setDismissed((p) => new Set([...p, id]));

  const showAIGrid    = transactions.length > 0 && !!aiReport && !aiReportError;
  const showAILoading = transactions.length > 0 && aiReportLoading && !aiReport;
  const showAIError   = transactions.length > 0 && !!aiReportError;
  const showEmpty     = transactions.length === 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Panel header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          background: "rgba(255,255,255,0.55)",
          border: `1.5px solid hsl(244 25% 82%)`,
          borderLeft: `3px solid ${C_PRIMARY}`,
          borderRadius: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "10px", fontWeight: 700, color: C_PRIMARY, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            ELLY Insights
          </span>
          {visible.length > 0 && (
            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "20px",
                backgroundColor: `${severityColor(visible[0].severity)}1a`,
                color: severityColor(visible[0].severity),
                border: `1px solid ${severityColor(visible[0].severity)}40`,
              }}
            >
              {visible.length} active
            </span>
          )}
        </div>

        <button
          onClick={refetchPFAIReport}
          disabled={aiReportLoading || transactions.length === 0}
          title="Refresh AI insights"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "transparent",
            border: "none",
            color: C_PRIMARY,
            cursor: aiReportLoading || transactions.length === 0 ? "not-allowed" : "pointer",
            opacity: aiReportLoading || transactions.length === 0 ? 0.45 : 1,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            padding: "4px 6px",
          }}
        >
          <RefreshCw
            size={11}
            style={{
              animation: aiReportLoading ? "spin 0.7s linear infinite" : undefined,
            }}
          />
          Refresh
        </button>
      </div>

      {/* AI insights grid (primary) */}
      {showEmpty && (
        <div
          style={{
            background: "rgba(255,255,255,0.55)",
            border: "1.5px dashed hsl(244 25% 82%)",
            borderRadius: 12,
            padding: "24px 28px",
            textAlign: "center",
            color: "hsl(245 16% 49%)",
            fontSize: 12.5,
            lineHeight: 1.55,
          }}
        >
          Import a bank statement or load demo data to see your AI insights.
        </div>
      )}

      {showAILoading && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "rgba(255,255,255,0.55)",
            border: "1.5px solid hsl(244 25% 82%)",
            borderRadius: 12,
            padding: "16px 20px",
            color: "hsl(245 16% 49%)",
            fontSize: 12.5,
          }}
        >
          <Spinner />
          Analysing your finances…
        </div>
      )}

      {showAIError && (
        <AIErrorBlock message={aiReportError ?? ""} onRetry={refetchPFAIReport} />
      )}

      {showAIGrid && <PFAIInsightsGrid report={aiReport!} userGoalCount={userGoalCount} />}

      {/* Rule-based local alerts (secondary) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          background: "rgba(255,255,255,0.40)",
          border: `1px solid hsl(244 25% 85%)`,
          borderRadius: 10,
          cursor: "pointer",
        }}
        onClick={() => setRulesOpen((o) => !o)}
      >
        <span style={{ fontSize: 9.5, fontWeight: 700, color: "hsl(245 16% 49%)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Rule-based alerts
        </span>
        <span style={{ fontSize: 10, color: "hsl(245 16% 55%)" }}>{rulesOpen ? "▲" : "▼"}</span>
      </div>

      {rulesOpen && (
        <>
          {rulesLoading && (
            <div style={{ fontSize: 13, color: "hsl(245 16% 55%)", padding: "8px 4px" }}>
              Analysing transactions…
            </div>
          )}

          {!rulesLoading && visible.length === 0 && transactions.length > 0 && (
            <div
              style={{
                background: "rgba(29,158,117,0.08)",
                border: "1.5px solid rgba(29,158,117,0.25)",
                borderRadius: 10,
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <span style={{ fontSize: 18 }}>✅</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1D9E75", marginBottom: 2 }}>
                  Everything looks healthy
                </div>
                <div style={{ fontSize: 12, color: "hsl(245 16% 49%)" }}>
                  No overspending or risk alerts this period. Keep it up!
                </div>
              </div>
            </div>
          )}

          {!rulesLoading && visible.map((insight) => {
            const color = severityColor(insight.severity);
            return (
              <div
                key={insight.id}
                style={{
                  background: `${color}0d`,
                  border: `1px solid ${color}2a`,
                  borderLeft: `3px solid ${color}`,
                  borderRadius: 10,
                  padding: "14px 16px",
                  display: "flex",
                  gap: 12,
                  alignItems: "flex-start",
                }}
              >
                <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1 }}>{severityIcon(insight.severity)}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color }}>{insight.title}</span>
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        padding: "2px 6px",
                        borderRadius: 4,
                        backgroundColor: `${color}15`,
                        color,
                      }}
                    >
                      {typeLabel(insight.type)}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "hsl(245 16% 40%)", lineHeight: 1.5 }}>
                    {insight.message}
                  </div>
                </div>
                <button
                  onClick={() => dismiss(insight.id)}
                  title="Dismiss"
                  style={{
                    background: "none",
                    border: "none",
                    color: "hsl(245 16% 60%)",
                    cursor: "pointer",
                    fontSize: 14,
                    lineHeight: 1,
                    padding: 2,
                    flexShrink: 0,
                  }}
                >
                  ✕
                </button>
              </div>
            );
          })}

          {dismissed.size > 0 && (
            <button
              onClick={() => setDismissed(new Set())}
              style={{
                background: "none",
                border: "none",
                fontSize: 11,
                color: "hsl(245 16% 55%)",
                cursor: "pointer",
                textDecoration: "underline",
                textAlign: "left",
                padding: 0,
              }}
            >
              Show {dismissed.size} dismissed alert{dismissed.size > 1 ? "s" : ""}
            </button>
          )}

          {/* Active rules reference */}
          <div
            style={{
              padding: "12px 16px",
              background: "rgba(255,255,255,0.40)",
              border: `1px solid hsl(244 25% 85%)`,
              borderRadius: 8,
            }}
          >
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "hsl(245 16% 55%)", marginBottom: 8 }}>
              Active Rules
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {[
                { icon: "⛔", text: "Overspending — category exceeds monthly budget" },
                { icon: "⛔", text: "Risk Zone — total expenses exceed total income" },
                { icon: "⚠️", text: "Spending Spike — category up >30% vs prior month" },
              ].map(({ icon, text }) => (
                <div key={text} style={{ fontSize: 11, color: "hsl(245 16% 49%)", display: "flex", gap: 6 }}>
                  <span>{icon}</span>
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
