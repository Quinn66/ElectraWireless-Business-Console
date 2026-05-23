import { useState } from "react";
import { Loader2, Sparkles, TrendingUp, TrendingDown, ListChecks, MessageCircle } from "lucide-react";
import { useInvestmentContextStore } from "@/store/investmentContextStore";
import { buildInvestmentAIPayload, fetchInvestmentAIInsights } from "@/services/investmentApi";
import type { InvestmentHolding, InvestmentAIResponse, PortfolioSummary } from "@/services/investmentApi";
import { C_PRIMARY, C_SUCCESS, C_ERROR, C_WARNING, C_BORDER } from "@/lib/colors";

type SectionAccent = "primary" | "success" | "error" | "warning";

const ACCENT_COLOR: Record<SectionAccent, string> = {
  primary: C_PRIMARY,
  success: C_SUCCESS,
  error:   C_ERROR,
  warning: C_WARNING,
};

function SectionCard({
  accent, icon, title, children,
}: {
  accent: SectionAccent;
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  const color = ACCENT_COLOR[accent];
  return (
    <div style={{
      background: `${color}0d`,
      border: `1px solid ${color}2a`,
      borderLeft: `3px solid ${color}`,
      borderRadius: 10,
      padding: "14px 16px",
      display: "flex",
      flexDirection: "column",
      gap: 8,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color, display: "flex" }}>{icon}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color }}>{title}</span>
      </div>
      <div style={{ fontSize: 12, color: "hsl(245 16% 40%)", lineHeight: 1.55 }}>
        {children}
      </div>
    </div>
  );
}

function BulletList({ items, color }: { items: string[]; color: string }) {
  if (items.length === 0) {
    return <span style={{ color: "#aaa", fontStyle: "italic" }}>None reported.</span>;
  }
  return (
    <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 5 }}>
      {items.map((item, i) => (
        <li key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <span style={{ color, flexShrink: 0, fontWeight: 700, lineHeight: 1.55 }}>•</span>
          <span style={{ flex: 1 }}>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function InvestmentAIPanel({ holdings, summary }: { holdings: InvestmentHolding[]; summary: PortfolioSummary | null }) {
  const onboarding = useInvestmentContextStore();

  const [open,    setOpen]    = useState(true);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [result,  setResult]  = useState<InvestmentAIResponse | null>(null);

  const hasHoldings = holdings.length > 0;
  const sectionsAvailable = result
    ? [result.summary, ...result.pros, ...result.cons, ...result.next_steps].filter(Boolean).length
    : 0;

  async function generate() {
    if (!hasHoldings || loading) return;
    setLoading(true);
    setError(null);
    try {
      const payload = buildInvestmentAIPayload("", holdings, {
        age:                  onboarding.age,
        experienceLevel:      onboarding.experienceLevel,
        financialBackground:  onboarding.financialBackground,
        communicationStyle:   onboarding.communicationStyle,
        investmentStrategies: onboarding.investmentStrategies,
        timeHorizon:          onboarding.timeHorizon,
        assetInterests:       onboarding.assetInterests,
        completedAt:          onboarding.completedAt,
      }, "", "Current portfolio", summary);
      setResult(await fetchInvestmentAIInsights(payload));
    } catch {
      setError("Could not generate analysis — is the backend running on port 8000?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Panel header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          background: "rgba(255,255,255,0.55)",
          border: `1.5px solid ${C_BORDER}`,
          borderLeft: `3px solid ${C_PRIMARY}`,
          borderRadius: 10,
          cursor: "pointer",
        }}
        onClick={() => setOpen((o) => !o)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            color: C_PRIMARY,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}>
            AI Portfolio Analysis
          </span>
          {result && sectionsAvailable > 0 && (
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: 20,
              background: `${C_PRIMARY}1a`,
              color: C_PRIMARY,
              border: `1px solid ${C_PRIMARY}40`,
            }}>
              {sectionsAvailable} insights
            </span>
          )}
        </div>
        <span style={{ fontSize: 10, color: "hsl(245 16% 55%)" }}>{open ? "▲" : "▼"}</span>
      </div>

      {open && (
        <>
          {/* Generate / Refresh trigger */}
          <div style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            padding: "12px 16px",
            background: "rgba(255,255,255,0.4)",
            border: `1px solid ${C_BORDER}`,
            borderRadius: 10,
          }}>
            <button
              onClick={generate}
              disabled={!hasHoldings || loading}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: !hasHoldings || loading ? "#bbb" : C_PRIMARY,
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "9px 16px",
                fontSize: 12,
                fontWeight: 600,
                cursor: !hasHoldings || loading ? "not-allowed" : "pointer",
                opacity: !hasHoldings ? 0.6 : 1,
              }}
            >
              {loading
                ? <><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Generating…</>
                : <><Sparkles size={13} /> {result ? "Regenerate Analysis" : "Generate AI Analysis"}</>}
            </button>
            <span style={{ fontSize: 11.5, color: "#888" }}>
              Uses your holdings + onboarding context. Powered by Llama via{" "}
              <code style={{ fontSize: 11 }}>POST /pf/portfolio-analysis</code>.
            </span>
          </div>

          {/* Empty state — no holdings */}
          {!hasHoldings && !result && (
            <div style={{
              padding: "18px 20px",
              borderRadius: 10,
              fontSize: 12.5,
              color: "#aaa",
              background: "rgba(255,255,255,0.4)",
              border: `1.5px dashed ${C_BORDER}`,
              textAlign: "center",
            }}>
              Add holdings first — AI analysis will be available once your portfolio has data.
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              padding: "10px 14px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 500,
              background: `${C_ERROR}10`,
              border: `1px solid ${C_ERROR}40`,
              color: C_ERROR,
            }}>
              {error}
            </div>
          )}

          {/* Result */}
          {result && (
            <>
              {result.summary && (
                <SectionCard accent="primary" icon={<Sparkles size={13} />} title="Summary">
                  {result.summary}
                </SectionCard>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <SectionCard accent="success" icon={<TrendingUp size={13} />} title="Strengths">
                  <BulletList items={result.pros} color={C_SUCCESS} />
                </SectionCard>
                <SectionCard accent="error" icon={<TrendingDown size={13} />} title="Weaknesses">
                  <BulletList items={result.cons} color={C_ERROR} />
                </SectionCard>
              </div>

              <SectionCard accent="warning" icon={<ListChecks size={13} />} title="Next Steps">
                <BulletList items={result.next_steps} color={C_WARNING} />
              </SectionCard>

              {result.question_response &&
                result.question_response.toLowerCase().trim() !== "no question provided." && (
                <SectionCard accent="primary" icon={<MessageCircle size={13} />} title="Question Response">
                  {result.question_response}
                </SectionCard>
              )}
            </>
          )}
        </>
      )}

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
