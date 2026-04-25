import { useEffect, useRef } from "react";
import { useProjectionStore } from "@/store/projectionStore";

/**
 * Watches all slider inputs and fires a debounced API call to /prophet-forecast
 * whenever any value changes. The 400ms debounce prevents hammering the backend
 * while the user is still dragging a slider.
 *
 * On first mount the fetch fires immediately (no debounce) so the chart is
 * populated as soon as the dashboard renders — this is important when the user
 * arrives from the onboarding flow with freshly-set store values.
 */
export function useProphetSync() {
  const {
    growthRate,
    startingMRR,
    churnRate,
    cogsPercent,
    marketingSpend,
    payroll,
    forecastMonths,
    fetchProphetForecast,
  } = useProjectionStore();

  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMounted  = useRef(false);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    const delay = isMounted.current ? 400 : 0;
    isMounted.current = true;

    timerRef.current = setTimeout(() => {
      fetchProphetForecast();
    }, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [growthRate, startingMRR, churnRate, cogsPercent, marketingSpend, payroll, forecastMonths]);
}
