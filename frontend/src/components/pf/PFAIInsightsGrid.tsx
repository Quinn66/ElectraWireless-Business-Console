import {
  Heart,
  FileText,
  AlertOctagon,
  AlertTriangle,
  Lightbulb,
  ListChecks,
  Activity,
  Target,
} from "lucide-react";
import type { ReactNode } from "react";
import type { PFReportResponse } from "@/services/personalFinanceApi";
import {
  C_PRIMARY,
  C_SUCCESS,
  C_WARNING,
  C_ERROR,
  C_VIOLET,
} from "@/lib/colors";
import { HealthCircle, stripBulletPrefix } from "@/components/pf/aiReportHelpers";

interface InsightCardProps {
  title: string;
  accent: string;
  icon: ReactNode;
  /** Number of grid columns (1-6) the card spans on wide viewports. */
  span: number;
  children: ReactNode;
}

function InsightCard({ title, accent, icon, span, children }: InsightCardProps) {
  return (
    <div
      className="pf-insight-card"
      style={{
        gridColumn: `span ${span}`,
        background: "rgba(255,255,255,0.55)",
        border: "1.5px solid hsl(244 25% 82%)",
        borderLeft: `3px solid ${accent}`,
        borderRadius: 12,
        padding: "16px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div className="flex items-center gap-2">
        <span style={{ color: accent, display: "inline-flex" }}>{icon}</span>
        <span
          className="text-[9.5px] font-bold tracking-[0.11em] uppercase"
          style={{ color: accent }}
        >
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

interface BulletListProps {
  items: string[];
  numbered?: boolean;
  accent: string;
}

function BulletList({ items, numbered, accent }: BulletListProps) {
  if (!items || items.length === 0) {
    return (
      <p className="m-0 text-[11px] text-[hsl(245_16%_55%)] italic">
        Nothing to flag here.
      </p>
    );
  }
  return (
    <ul className="m-0 p-0 list-none flex flex-col gap-1.5">
      {items.map((s, i) => (
        <li
          key={i}
          className="text-[11.5px] text-[hsl(245_16%_40%)] leading-[1.55] flex gap-2"
        >
          <span className="flex-shrink-0 font-semibold" style={{ color: accent }}>
            {numbered ? `${i + 1}.` : "→"}
          </span>
          <span className="flex-1">{stripBulletPrefix(s)}</span>
        </li>
      ))}
    </ul>
  );
}

function Paragraph({ body }: { body: string }) {
  if (!body || !body.trim()) {
    return (
      <p className="m-0 text-[11px] text-[hsl(245_16%_55%)] italic">
        No narrative provided.
      </p>
    );
  }
  return (
    <p
      className="m-0 text-[12px] text-[hsl(242_44%_35%)] leading-[1.65] whitespace-pre-line"
    >
      {body}
    </p>
  );
}

interface PFAIInsightsGridProps {
  report: PFReportResponse;
  /** Number of goals the user has set in the Goals tab. Used so the Goals card always
   *  surfaces if the user is tracking goals locally, even when the LLM didn't echo them back. */
  userGoalCount: number;
}

export function PFAIInsightsGrid({ report, userGoalCount }: PFAIInsightsGridProps) {
  const score   = report.health_score?.score ?? null;
  const rawNote = report.health_score?.raw ?? "";
  const aiGoals = report.goals ?? [];
  const showGoalsCard = aiGoals.length > 0 || userGoalCount > 0;

  return (
    <div
      className="pf-ai-insights-grid"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(6, 1fr)",
        gap: 12,
      }}
    >
      <InsightCard
        title="Health Score"
        accent={C_PRIMARY}
        icon={<Heart size={13} />}
        span={2}
      >
        <div className="flex items-center gap-3">
          <HealthCircle score={score} size={64} />
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[10px] font-semibold tracking-[0.08em] uppercase text-[hsl(245_16%_55%)]">
              Score / 100
            </span>
            <span
              className="text-[11.5px] leading-[1.5] text-[hsl(245_16%_40%)]"
            >
              {rawNote || "No assessment provided for this period."}
            </span>
          </div>
        </div>
      </InsightCard>

      <InsightCard
        title="Summary"
        accent={C_PRIMARY}
        icon={<FileText size={13} />}
        span={4}
      >
        <Paragraph body={report.summary} />
      </InsightCard>

      <InsightCard
        title="Alerts"
        accent={C_ERROR}
        icon={<AlertOctagon size={13} />}
        span={2}
      >
        <BulletList items={report.alerts} accent={C_ERROR} />
      </InsightCard>

      <InsightCard
        title="Risks"
        accent={C_WARNING}
        icon={<AlertTriangle size={13} />}
        span={2}
      >
        <BulletList items={report.risks} accent={C_WARNING} />
      </InsightCard>

      <InsightCard
        title="Opportunities"
        accent={C_SUCCESS}
        icon={<Lightbulb size={13} />}
        span={2}
      >
        <BulletList items={report.opportunities} accent={C_SUCCESS} />
      </InsightCard>

      <InsightCard
        title="Recommended Actions"
        accent={C_PRIMARY}
        icon={<ListChecks size={13} />}
        span={3}
      >
        <BulletList items={report.recommended_actions} numbered accent={C_PRIMARY} />
      </InsightCard>

      <InsightCard
        title="Spending Patterns"
        accent={C_VIOLET}
        icon={<Activity size={13} />}
        span={3}
      >
        <Paragraph body={report.spending_patterns} />
      </InsightCard>

      {showGoalsCard && (
        <InsightCard
          title="Goals"
          accent={C_VIOLET}
          icon={<Target size={13} />}
          span={6}
        >
          {aiGoals.length > 0 ? (
            <BulletList items={aiGoals} accent={C_VIOLET} />
          ) : (
            <p className="m-0 text-[11px] text-[hsl(245_16%_55%)] italic leading-[1.55]">
              No AI suggestions for your goals this run — visit the Goals tab to track them.
            </p>
          )}
        </InsightCard>
      )}

      <style>{`
        @media (max-width: 900px) {
          .pf-ai-insights-grid > .pf-insight-card {
            grid-column: span 6 !important;
          }
        }
        @media (min-width: 901px) and (max-width: 1200px) {
          .pf-ai-insights-grid > .pf-insight-card {
            grid-column: span 3 !important;
          }
        }
      `}</style>
    </div>
  );
}
