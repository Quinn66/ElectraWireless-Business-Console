import { useState } from "react";
import {
  TrendingDown,
  BarChart2,
  TrendingUp,
  Database,
  RotateCcw,
} from "lucide-react";
import { useProjectionStore } from "@/store/projectionStore";
import { usePersonalFinanceStore, useFilteredTransactions } from "@/store/personalFinanceStore";
import { AIHintBlock } from "@/components/AIHintBlock";
import { Spinner } from "@/components/Spinner";
import { API_BASE, type AnalysisResult } from "@/lib/api";
import type { ConsoleTool } from "@/components/ConsoleSidebar";
import { cn } from "@/lib/utils";
import { extractErrorMessage } from "@/lib/aiErrors";
import { PFReportView } from "@/components/pf/PFReportView";
import { PFQAView } from "@/components/pf/PFQAView";
import { AIErrorBlock } from "@/components/pf/AIErrorBlock";
import { refetchPFAIReport, usePFAIReport } from "@/hooks/usePFAIReport";

const TOOL_TIPS: Partial<Record<ConsoleTool, string[]>> = {
  home: [
    "Use the Financial Projection Engine to model revenue and run scenario analysis.",
    "Import bank statements in Personal Finance to track spending automatically.",
    "Explore scenarios to stress-test your financial plans.",
  ],
  personal: [
    "Import your bank statement to get AI-powered category insights.",
    "Set budgets for each category to track overspending in real time.",
    "Review the Cash Flow tab to spot monthly income & expense trends.",
  ],
};

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[9.5px] font-bold tracking-[0.11em] uppercase text-primary mb-2.5">
      {children}
    </div>
  );
}

interface QuickActionBtnProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

function QuickActionBtn({ icon, label, onClick }: QuickActionBtnProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 bg-white/55 border-[1.5px] border-primary/[0.14] rounded-[7px] px-3 py-[7px] text-[11.5px] font-semibold text-foreground cursor-pointer text-left w-full transition-all duration-150 tracking-[0.01em] hover:bg-primary/[0.08] hover:text-primary hover:border-primary/[0.26]"
    >
      <span className="flex flex-shrink-0">{icon}</span>
      {label}
    </button>
  );
}

interface ConsoleAISidebarProps {
  activeTool: ConsoleTool;
}

export function ConsoleAISidebar({ activeTool }: ConsoleAISidebarProps) {
  const [input, setInput]     = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<AnalysisResult | null>(null);
  const [error, setError]     = useState<string | null>(null);

  const setActiveScenario = useProjectionStore((s) => s.setActiveScenario);
  const loadDemoData   = usePersonalFinanceStore((s) => s.loadDemoData);
  const reset          = usePersonalFinanceStore((s) => s.reset);
  const pfTransactions = useFilteredTransactions();
  const flowStep       = usePersonalFinanceStore((s) => s.flowStep);
  const userGoalCount  = usePersonalFinanceStore((s) => s.goals.length);

  const aiReport         = usePersonalFinanceStore((s) => s.aiReport);
  const aiReportLoading  = usePersonalFinanceStore((s) => s.aiReportLoading);
  const aiReportError    = usePersonalFinanceStore((s) => s.aiReportError);
  const aiQAResult       = usePersonalFinanceStore((s) => s.aiQAResult);

  // Auto-fetch the AI report whenever the user lands on the PF dashboard
  // with confirmed transactions; the hook also refetches on period change.
  const { submitQuestion } = usePFAIReport({
    enabled: activeTool === "personal" && flowStep === "dashboard" && pfTransactions.length > 0,
  });

  async function handleAsk() {
    const q = input.trim();
    if (!q || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      if (activeTool === "personal") {
        // submitQuestion writes result/error to the store; nothing to do here on success.
        await submitQuestion(q);
      } else {
        const res = await fetch(`${API_BASE}/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: q }),
        });
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        setResult(await res.json() as AnalysisResult);
      }
    } catch (err) {
      setError(extractErrorMessage(err, "Something went wrong."));
    } finally {
      setLoading(false);
    }
  }

  const noPFData = activeTool === "personal" && pfTransactions.length === 0;
  const isDisabled = loading || !input.trim() || noPFData;

  const showError       = !!error || (activeTool === "personal" && !!aiReportError);
  const errorMessage    = error ?? aiReportError;
  const showQA          = activeTool === "personal" && !showError && !!aiQAResult;
  const showReport      = activeTool === "personal" && !showError && !showQA && !!aiReport;
  const showReportLoad  = activeTool === "personal" && !showError && !showQA && !showReport && aiReportLoading;
  const showProjection  = activeTool !== "personal" && !showError && !!result;
  const showSuggestions = !showError && !showQA && !showReport && !showReportLoad && !showProjection;

  return (
    <div className="w-[240px] flex-shrink-0 h-full flex flex-col border-l-[1.5px] border-border bg-white/[0.28] backdrop-blur-[20px] overflow-y-auto overflow-x-hidden">

      {/* Ask Elly */}
      <section className="px-3.5 py-4 border-b border-primary/[0.08] flex-shrink-0">
        <SectionHeader>Ask Elly</SectionHeader>

        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleAsk();
            }
          }}
          disabled={loading}
          placeholder="Ask about your financial outlook…"
          className="w-full min-h-[72px] max-h-[120px] bg-white/65 border-[1.5px] border-primary/[0.15] rounded-lg px-3 py-2.5 text-xs text-foreground font-[inherit] leading-[1.55] resize-none outline-none box-border transition-colors duration-150 disabled:opacity-60 focus:border-primary/[0.35]"
        />

        <button
          onClick={handleAsk}
          disabled={isDisabled}
          className={cn(
            "mt-2 w-full rounded-[7px] px-3.5 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors duration-150",
            isDisabled
              ? "bg-[hsl(245_16%_85%)] text-[hsl(245_16%_55%)] cursor-not-allowed"
              : "bg-primary text-white cursor-pointer"
          )}
        >
          {loading ? <><Spinner size={10} /> Thinking…</> : "Ask Elly"}
        </button>

        {noPFData && !loading && (
          <p className="mt-2 m-0 text-[10.5px] text-muted-foreground leading-[1.55]">
            Import transactions or load demo data to ask Elly about your finances.
          </p>
        )}
      </section>

      {/* Response / Report / Suggestions */}
      <section className="p-3.5 border-b border-primary/[0.08] flex-1 min-h-0 overflow-y-auto">
        {showError && (
          <AIErrorBlock
            message={errorMessage ?? ""}
            onRetry={activeTool === "personal" ? refetchPFAIReport : undefined}
          />
        )}

        {showQA && aiQAResult && <PFQAView qa={aiQAResult} />}

        {showReport && aiReport && <PFReportView report={aiReport} userGoalCount={userGoalCount} />}

        {showReportLoad && (
          <>
            <SectionHeader>Generating Report</SectionHeader>
            <div className="flex items-center gap-2 text-[11.5px] text-muted-foreground">
              <Spinner size={10} />
              Analysing your finances…
            </div>
          </>
        )}

        {showProjection && result && (
          <>
            <SectionHeader>Elly's Response</SectionHeader>
            <div className="flex flex-col gap-3">
              <p className="m-0 text-xs text-[hsl(242_44%_35%)] leading-[1.65]">
                {result.analysis_short}
              </p>
              {result.next_steps.length > 0 && (
                <div>
                  <div className="text-[9.5px] font-bold tracking-[0.08em] uppercase text-[hsl(245_16%_56%)] mb-1.5">
                    Next Steps
                  </div>
                  {result.next_steps.slice(0, 2).map((s, i) => (
                    <p key={i} className="m-0 mb-1 text-[11px] text-[hsl(245_16%_45%)] leading-[1.55]">
                      → {s}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {showSuggestions && (
          <>
            <SectionHeader>Elly Suggestions</SectionHeader>
            {activeTool === "projection" ? (
              <AIHintBlock />
            ) : (
              <div className="flex flex-col gap-2">
                {(TOOL_TIPS[activeTool] ?? []).map((tip, i) => (
                  <p key={i} className="m-0 text-[11.5px] text-muted-foreground leading-[1.65]">
                    <span className="text-primary mr-[5px]">→</span>
                    {tip}
                  </p>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {/* Quick Actions */}
      <section className="p-3.5 flex-shrink-0">
        <SectionHeader>Quick Actions</SectionHeader>

        <div className="flex flex-col gap-1.5">
          {activeTool === "projection" && (
            <>
              <QuickActionBtn
                icon={<TrendingDown size={13} />}
                label="Apply Bear Scenario"
                onClick={() => setActiveScenario("bear")}
              />
              <QuickActionBtn
                icon={<BarChart2 size={13} />}
                label="Apply Base Scenario"
                onClick={() => setActiveScenario("base")}
              />
              <QuickActionBtn
                icon={<TrendingUp size={13} />}
                label="Apply Bull Scenario"
                onClick={() => setActiveScenario("bull")}
              />
            </>
          )}
          {activeTool === "personal" && (
            <>
              <QuickActionBtn
                icon={<Database size={13} />}
                label="Load Demo Data"
                onClick={loadDemoData}
              />
              <QuickActionBtn
                icon={<RotateCcw size={13} />}
                label="Reset All Data"
                onClick={reset}
              />
            </>
          )}
          {activeTool === "home" && (
            <p className="m-0 text-[11.5px] text-muted-foreground leading-[1.65]">
              Select a tool to see quick actions.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
