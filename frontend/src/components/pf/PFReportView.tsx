import type { PFReportResponse } from "@/services/personalFinanceApi";
import { C_SUCCESS, C_WARNING, C_ERROR, C_PRIMARY } from "@/lib/colors";
import { HealthCircle, stripBulletPrefix } from "@/components/pf/aiReportHelpers";

interface BulletSectionProps {
  title: string;
  items: string[];
  numbered?: boolean;
  defaultOpen?: boolean;
  accent?: string;
}

function BulletSection({ title, items, numbered, defaultOpen, accent }: BulletSectionProps) {
  if (!items || items.length === 0) return null;
  return (
    <details
      open={defaultOpen}
      className="group border-t border-primary/[0.08] py-2.5 [&_summary::-webkit-details-marker]:hidden"
    >
      <summary className="flex items-center justify-between cursor-pointer list-none select-none">
        <span
          className="text-[9.5px] font-bold tracking-[0.11em] uppercase"
          style={{ color: accent ?? C_PRIMARY }}
        >
          {title}
        </span>
        <span className="text-[10px] text-muted-foreground transition-transform duration-150 group-open:rotate-90">
          ›
        </span>
      </summary>
      <div className="mt-2 flex flex-col gap-1">
        {items.map((s, i) => (
          <p
            key={i}
            className="m-0 text-[11px] text-[hsl(245_16%_45%)] leading-[1.55] flex gap-1.5"
          >
            <span className="text-primary flex-shrink-0">
              {numbered ? `${i + 1}.` : "→"}
            </span>
            <span className="flex-1">{stripBulletPrefix(s)}</span>
          </p>
        ))}
      </div>
    </details>
  );
}

function TextSection({
  title,
  body,
  defaultOpen,
}: {
  title: string;
  body: string;
  defaultOpen?: boolean;
}) {
  if (!body || !body.trim()) return null;
  return (
    <details
      open={defaultOpen}
      className="group border-t border-primary/[0.08] py-2.5 [&_summary::-webkit-details-marker]:hidden"
    >
      <summary className="flex items-center justify-between cursor-pointer list-none select-none">
        <span className="text-[9.5px] font-bold tracking-[0.11em] uppercase text-primary">
          {title}
        </span>
        <span className="text-[10px] text-muted-foreground transition-transform duration-150 group-open:rotate-90">
          ›
        </span>
      </summary>
      <p className="mt-2 m-0 text-[11px] text-[hsl(245_16%_45%)] leading-[1.6] whitespace-pre-line">
        {body}
      </p>
    </details>
  );
}

interface PFReportViewProps {
  report: PFReportResponse;
  /** When the user has tracked goals locally, the Goals section always renders so they
   *  see a signal even if the LLM didn't echo their goals back. */
  userGoalCount?: number;
}

export function PFReportView({ report, userGoalCount = 0 }: PFReportViewProps) {
  const score = report.health_score?.score ?? null;
  const raw   = report.health_score?.raw ?? "";
  const aiGoals = report.goals ?? [];
  const showGoals = aiGoals.length > 0 || userGoalCount > 0;

  return (
    <div className="flex flex-col">
      <div className="flex items-start justify-between gap-2.5 mb-2.5">
        <div className="text-[9.5px] font-bold tracking-[0.11em] uppercase text-primary pt-1">
          Elly's Report
        </div>
        <HealthCircle score={score} />
      </div>

      {raw && (
        <div className="mb-3">
          <div className="text-[9.5px] font-bold tracking-[0.11em] uppercase text-primary mb-1">
            Health Score
          </div>
          <div className="text-[10.5px] text-muted-foreground leading-[1.5]">
            {raw}
          </div>
        </div>
      )}

      {report.summary && (
        <p className="m-0 mb-2 text-xs text-[hsl(242_44%_35%)] leading-[1.65]">
          {report.summary}
        </p>
      )}

      <BulletSection title="Alerts" items={report.alerts} accent={C_ERROR} defaultOpen />
      <BulletSection title="Risks" items={report.risks} accent={C_WARNING} defaultOpen />
      <BulletSection title="Opportunities" items={report.opportunities} accent={C_SUCCESS} defaultOpen />
      <BulletSection title="Recommended Actions" items={report.recommended_actions} numbered defaultOpen />
      <TextSection title="Spending Patterns" body={report.spending_patterns} />
      {showGoals && (aiGoals.length > 0 ? (
        <BulletSection title="Goals" items={aiGoals} />
      ) : (
        <details className="group border-t border-primary/[0.08] py-2.5 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex items-center justify-between cursor-pointer list-none select-none">
            <span className="text-[9.5px] font-bold tracking-[0.11em] uppercase text-primary">Goals</span>
            <span className="text-[10px] text-muted-foreground transition-transform duration-150 group-open:rotate-90">›</span>
          </summary>
          <p className="mt-2 m-0 text-[11px] text-[hsl(245_16%_55%)] italic leading-[1.55]">
            No AI suggestions for your goals this run — visit the Goals tab to track them.
          </p>
        </details>
      ))}
    </div>
  );
}
