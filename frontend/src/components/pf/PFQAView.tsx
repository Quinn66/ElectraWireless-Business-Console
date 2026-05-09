import type { PFQAResponse } from "@/services/personalFinanceApi";
import { usePersonalFinanceStore } from "@/store/personalFinanceStore";
import { stripBulletPrefix } from "@/components/pf/aiReportHelpers";

export function PFQAView({ qa }: { qa: PFQAResponse }) {
  const clearAIQAResult = usePersonalFinanceStore((s) => s.clearAIQAResult);

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[9.5px] font-bold tracking-[0.11em] uppercase text-primary">
          Elly's Answer
        </span>
        <button
          onClick={clearAIQAResult}
          className="text-[10px] text-muted-foreground hover:text-primary cursor-pointer bg-transparent border-none p-0 transition-colors"
          title="Back to report"
        >
          × Back to report
        </button>
      </div>

      {qa.answer && (
        <p className="m-0 mb-3 text-xs text-[hsl(242_44%_35%)] leading-[1.65]">
          {qa.answer}
        </p>
      )}

      {qa.supporting_insights && qa.supporting_insights.length > 0 && (
        <div className="mb-3">
          <div className="text-[9.5px] font-bold tracking-[0.08em] uppercase text-[hsl(245_16%_56%)] mb-1.5">
            Key Insights
          </div>
          <div className="flex flex-col gap-1">
            {qa.supporting_insights.map((s, i) => (
              <p
                key={i}
                className="m-0 text-[11px] text-[hsl(245_16%_45%)] leading-[1.55] flex gap-1.5"
              >
                <span className="text-primary flex-shrink-0">→</span>
                <span className="flex-1">{stripBulletPrefix(s)}</span>
              </p>
            ))}
          </div>
        </div>
      )}

      {qa.goals && qa.goals.length > 0 && (
        <div>
          <div className="text-[9.5px] font-bold tracking-[0.08em] uppercase text-[hsl(245_16%_56%)] mb-1.5">
            Goals
          </div>
          <div className="flex flex-col gap-1">
            {qa.goals.map((s, i) => (
              <p
                key={i}
                className="m-0 text-[11px] text-[hsl(245_16%_45%)] leading-[1.55] flex gap-1.5"
              >
                <span className="text-primary flex-shrink-0">→</span>
                <span className="flex-1">{stripBulletPrefix(s)}</span>
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
