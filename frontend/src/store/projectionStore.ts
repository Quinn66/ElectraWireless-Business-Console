import { create } from "zustand";

export type ScenarioPreset = "bear" | "base" | "bull" | "custom";

export interface SavedScenario {
  id: string;
  name: string;
  growthRate: number;
  startingMRR: number;
  churnRate: number;
  cogsPercent: number;
  marketingSpend: number;
  payroll: number;
  forecastMonths: number;
}

export interface HistoricalPoint {
  ds: string;
  revenue: number;
  expenses: number;
  profit: number;
}

export interface ProphetPoint {
  ds: string;
  revenue: number;
  yhat_lower: number;
  yhat_upper: number;
}

export interface SliderForecastPoint {
  ds: string;
  revenue: number;
  expenses: number;
  gross_margin: number;
  net_profit: number;
}

export interface ProphetApiData {
  historical: HistoricalPoint[];
  prophet_forecast: ProphetPoint[];
  slider_forecast: SliderForecastPoint[];
}

export interface ProjectionState {
  growthRate: number;
  startingMRR: number;
  churnRate: number;
  cogsPercent: number;
  marketingSpend: number;
  payroll: number;
  forecastMonths: number;
  activeScenario: ScenarioPreset;
  activeTab: string;
  scenarioCounts: Record<string, number>;
  totalScenarioRuns: number;
  recordScenarioRun: (scenario: string) => void;
  savedScenarios: SavedScenario[];

  // API state
  apiData: ProphetApiData | null;
  apiLoading: boolean;
  apiError: string | null;

  setGrowthRate: (v: number) => void;
  setStartingMRR: (v: number) => void;
  setChurnRate: (v: number) => void;
  setCogsPercent: (v: number) => void;
  setMarketingSpend: (v: number) => void;
  setPayroll: (v: number) => void;
  setForecastMonths: (v: number) => void;
  setActiveScenario: (preset: ScenarioPreset) => void;
  setActiveTab: (tab: string) => void;
  saveCustomScenario: (name: string) => void;
  deleteCustomScenario: (id: string) => void;
  loadCustomScenario: (id: string) => void;
  fetchProphetForecast: () => Promise<void>;
}

const SCENARIO_PRESETS = {
  bear: { growthRate: 3, startingMRR: 18000, churnRate: 7, cogsPercent: 30, marketingSpend: 2000, payroll: 35000 },
  base: { growthRate: 8, startingMRR: 18000, churnRate: 3, cogsPercent: 22, marketingSpend: 4000, payroll: 35000 },
  bull: { growthRate: 18, startingMRR: 18000, churnRate: 1.5, cogsPercent: 18, marketingSpend: 8000, payroll: 35000 },
};

const API_BASE = "http://localhost:8000";

export const useProjectionStore = create<ProjectionState>((set, get) => ({
  growthRate: 8,
  startingMRR: 18000,
  churnRate: 3,
  cogsPercent: 22,
  marketingSpend: 4000,
  payroll: 35000,
  forecastMonths: 12,
  activeScenario: "base",
  activeTab: "projection",
  scenarioCounts: {},
  totalScenarioRuns: 0,
  savedScenarios: [],
  apiData: null,
  apiLoading: false,
  apiError: null,

  setGrowthRate: (v) => set({ growthRate: v, activeScenario: "custom" }),
  setStartingMRR: (v) => set({ startingMRR: v, activeScenario: "custom" }),
  setChurnRate: (v) => set({ churnRate: v, activeScenario: "custom" }),
  setCogsPercent: (v) => set({ cogsPercent: v, activeScenario: "custom" }),
  setMarketingSpend: (v) => set({ marketingSpend: v, activeScenario: "custom" }),
  setPayroll: (v) => set({ payroll: v, activeScenario: "custom" }),
  setForecastMonths: (v) => set({ forecastMonths: v, activeScenario: "custom" }),

  recordScenarioRun: (scenario: string) => {
    set((s) => ({
      scenarioCounts: { ...s.scenarioCounts, [scenario]: (s.scenarioCounts[scenario] ?? 0) + 1 },
      totalScenarioRuns: s.totalScenarioRuns + 1,
    }));
  },

  setActiveScenario: (preset) => {
    if (preset === "custom") {
      set({ activeScenario: "custom" });
      return;
    }
    set({ ...SCENARIO_PRESETS[preset], activeScenario: preset });
    get().recordScenarioRun(preset);
  },

  setActiveTab: (tab) => set({ activeTab: tab }),

  saveCustomScenario: (name) => {
    const s = get();
    const entry: SavedScenario = {
      id: `custom-${Date.now()}`,
      name,
      growthRate: s.growthRate,
      startingMRR: s.startingMRR,
      churnRate: s.churnRate,
      cogsPercent: s.cogsPercent,
      marketingSpend: s.marketingSpend,
      payroll: s.payroll,
      forecastMonths: s.forecastMonths,
    };
    set({ savedScenarios: [...s.savedScenarios, entry] });
  },

  deleteCustomScenario: (id) => {
    set((s) => ({ savedScenarios: s.savedScenarios.filter((sc) => sc.id !== id) }));
  },

  loadCustomScenario: (id) => {
    const sc = get().savedScenarios.find((s) => s.id === id);
    if (!sc) return;
    const { id: _id, name: _name, ...values } = sc;
    set({ ...values, activeScenario: "custom" });
    get().recordScenarioRun(sc.name);
  },

  fetchProphetForecast: async () => {
    const s = get();
    set({ apiLoading: true, apiError: null });
    try {
      const res = await fetch(`${API_BASE}/prophet-forecast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          starting_mrr: s.startingMRR,
          growth_rate: s.growthRate,
          churn_rate: s.churnRate,
          cogs_percent: s.cogsPercent,
          marketing_spend: s.marketingSpend,
          payroll: s.payroll,
          months: s.forecastMonths,
        }),
      });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data: ProphetApiData = await res.json();
      set({ apiData: data, apiLoading: false });
    } catch (err) {
      set({ apiLoading: false, apiError: (err as Error).message });
    }
  },
}));
