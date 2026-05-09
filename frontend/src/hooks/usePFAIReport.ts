import { useEffect } from "react";
import axios from "axios";
import { usePersonalFinanceStore } from "@/store/personalFinanceStore";
import { filterByPeriod } from "@/lib/periodFilter";
import {
  fetchSummary,
  fetchInsights,
  fetchPFAIInsights,
  buildPFAIPayload,
  isPFQAResponse,
} from "@/services/personalFinanceApi";
import { extractErrorMessage } from "@/lib/aiErrors";

interface UsePFAIReportOptions {
  /**
   * When this transitions from false→true (or `period` changes while enabled),
   * the hook auto-fetches a fresh AI report. Pass `false` if you only need
   * `refetch` / `submitQuestion` and want to opt out of auto-fetching.
   */
  enabled: boolean;
}

interface UsePFAIReportResult {
  refetch: () => void;
  submitQuestion: (question: string) => Promise<void>;
}

// Module-level controller so concurrent triggers from any surface (sidebar
// auto-fetch, panel refresh, sidebar Q&A) share one in-flight slot rather
// than racing — whichever fires last wins.
let activeController: AbortController | null = null;

async function runPFAIFetch(question: string): Promise<void> {
  activeController?.abort();
  const controller = new AbortController();
  activeController = controller;

  const state = usePersonalFinanceStore.getState();
  const txs = filterByPeriod(state.transactions, state.activePeriod);
  if (txs.length === 0) return;

  const isQA = question.length > 0;

  // Always clear any prior Q&A result so a new fetch starts from a clean slate.
  state.setAIQAResult(null);
  state.setAIReportLoading(true);
  state.setAIReportError(null);

  try {
    const summary  = await fetchSummary(txs);
    const insights = await fetchInsights(txs, state.budgets);
    const payload  = buildPFAIPayload(question, state.activePeriod, summary, insights, state.goals);
    const res      = await fetchPFAIInsights(payload, controller.signal);
    if (controller.signal.aborted) return;

    if (isQA) {
      if (isPFQAResponse(res)) {
        state.setAIQAResult(res);
      } else {
        state.setAIReportError("Backend returned a report instead of an answer. Try rephrasing.");
      }
    } else {
      if (isPFQAResponse(res)) {
        state.setAIReportError("Unexpected Q&A response in report mode.");
        state.setAIReport(null);
      } else {
        state.setAIReport(res);
      }
    }
  } catch (err) {
    if (controller.signal.aborted || axios.isCancel(err)) return;
    state.setAIReportError(
      extractErrorMessage(err, isQA ? "Failed to get an answer." : "Failed to load AI report."),
    );
    if (!isQA) state.setAIReport(null);
  } finally {
    if (!controller.signal.aborted) state.setAIReportLoading(false);
  }
}

/** Re-fetch the AI report using the current store snapshot. Safe to call from any component. */
export function refetchPFAIReport(): void {
  void runPFAIFetch("");
}

/** Send a Q&A question through the same AI pipeline as the report. */
export function submitPFAIQuestion(question: string): Promise<void> {
  return runPFAIFetch(question.trim());
}

/**
 * Auto-fetches the Personal-Finance AI report when `enabled` is true. Refires
 * when the user changes period. Returns shared `refetch` / `submitQuestion`
 * helpers; both delegate to the same module-level pipeline so calls from
 * different surfaces don't race.
 */
export function usePFAIReport({ enabled }: UsePFAIReportOptions): UsePFAIReportResult {
  // Subscribing to period here lets the effect re-fire when the user switches
  // periods so the report doesn't go stale.
  const period = usePersonalFinanceStore((s) => s.activePeriod);

  useEffect(() => {
    if (!enabled) return;
    void runPFAIFetch("");
    return () => {
      activeController?.abort();
    };
  }, [enabled, period]);

  return { refetch: refetchPFAIReport, submitQuestion: submitPFAIQuestion };
}
