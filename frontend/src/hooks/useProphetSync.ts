import { useEffect, useRef } from "react";
import { useProjectionStore } from "@/store/projectionStore";

/**
 * Watches all slider inputs and fires a debounced API call to /prophet-forecast
 * whenever any value changes. The 400ms debounce prevents hammering the backend
 * while the user is still dragging a slider.
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

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      fetchProphetForecast();
    }, 400);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [growthRate, startingMRR, churnRate, cogsPercent, marketingSpend, payroll, forecastMonths]);
}
