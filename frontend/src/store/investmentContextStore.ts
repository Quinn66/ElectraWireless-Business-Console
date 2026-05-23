import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ExperienceLevel     = "beginner" | "intermediate" | "advanced";
export type FinancialBackground = "low" | "moderate" | "high";
export type CommunicationStyle  = "simple" | "technical";
export type InvestmentStrategy  = "day_trading" | "index" | "growth" | "income" | "buy_and_hold" | "dollar_cost_average";
export type TimeHorizon         = "daily" | "weekly" | "monthly" | "annually" | "indefinitely";
export type AssetInterest       = "stock" | "crypto" | "etf";

export interface InvestmentOnboardingValues {
  age: number;
  experienceLevel: ExperienceLevel;
  financialBackground: FinancialBackground;
  communicationStyle: CommunicationStyle;
  investmentStrategies: InvestmentStrategy[];
  timeHorizon: TimeHorizon;
  assetInterests: AssetInterest[];
}

export interface InvestmentContextState extends InvestmentOnboardingValues {
  // ISO timestamp written when the user successfully completes onboarding.
  // Null means onboarding has not been completed in this browser.
  completedAt: string | null;

  setAge: (v: number) => void;
  setExperienceLevel: (v: ExperienceLevel) => void;
  setFinancialBackground: (v: FinancialBackground) => void;
  setCommunicationStyle: (v: CommunicationStyle) => void;
  setInvestmentStrategies: (v: InvestmentStrategy[]) => void;
  setTimeHorizon: (v: TimeHorizon) => void;
  setAssetInterests: (v: AssetInterest[]) => void;
  setCompletedAt: (v: string | null) => void;

  setAll: (partial: Partial<InvestmentOnboardingValues & { completedAt: string | null }>) => void;
  reset: () => void;
}

export const INVESTMENT_ONBOARDING_DEFAULTS: InvestmentOnboardingValues = {
  age: 30,
  experienceLevel:      "beginner",
  financialBackground:  "moderate",
  communicationStyle:   "simple",
  investmentStrategies: ["buy_and_hold"],
  timeHorizon:          "monthly",
  assetInterests:       ["stock", "crypto", "etf"],
};

const INITIAL_STATE = { ...INVESTMENT_ONBOARDING_DEFAULTS, completedAt: null as string | null };

export const useInvestmentContextStore = create<InvestmentContextState>()(
  persist(
    (set) => ({
      ...INITIAL_STATE,
      setAge:                  (v) => set({ age: v }),
      setExperienceLevel:      (v) => set({ experienceLevel: v }),
      setFinancialBackground:  (v) => set({ financialBackground: v }),
      setCommunicationStyle:   (v) => set({ communicationStyle: v }),
      setInvestmentStrategies: (v) => set({ investmentStrategies: v }),
      setTimeHorizon:          (v) => set({ timeHorizon: v }),
      setAssetInterests:       (v) => set({ assetInterests: v }),
      setCompletedAt:          (v) => set({ completedAt: v }),
      setAll:                  (partial) => set(partial),
      reset:                   () => set(INITIAL_STATE),
    }),
    {
      name: "elly-investment-onboarding-v1",
      partialize: (state) => ({
        age:                  state.age,
        experienceLevel:      state.experienceLevel,
        financialBackground:  state.financialBackground,
        communicationStyle:   state.communicationStyle,
        investmentStrategies: state.investmentStrategies,
        timeHorizon:          state.timeHorizon,
        assetInterests:       state.assetInterests,
        completedAt:          state.completedAt,
      }),
    },
  ),
);
