import { create } from "zustand";

export type ExperienceLevel     = "beginner" | "intermediate" | "advanced";
export type FinancialBackground = "low" | "moderate" | "high";
export type CommunicationStyle  = "simple" | "technical";
export type InvestmentGoal      = "growth" | "income" | "preservation" | "balanced";
export type TimeHorizon         = "short" | "medium" | "long";

export interface InvestmentContextState {
  age: number;
  experienceLevel: ExperienceLevel;
  financialBackground: FinancialBackground;
  communicationStyle: CommunicationStyle;
  investmentGoal: InvestmentGoal;
  timeHorizon: TimeHorizon;

  setAge: (v: number) => void;
  setExperienceLevel: (v: ExperienceLevel) => void;
  setFinancialBackground: (v: FinancialBackground) => void;
  setCommunicationStyle: (v: CommunicationStyle) => void;
  setInvestmentGoal: (v: InvestmentGoal) => void;
  setTimeHorizon: (v: TimeHorizon) => void;

  setAll: (partial: Partial<Pick<InvestmentContextState,
    "age" | "experienceLevel" | "financialBackground" |
    "communicationStyle" | "investmentGoal" | "timeHorizon"
  >>) => void;
  reset: () => void;
}

const DEFAULTS = {
  age: 30,
  experienceLevel:     "beginner" as ExperienceLevel,
  financialBackground: "moderate" as FinancialBackground,
  communicationStyle:  "simple"   as CommunicationStyle,
  investmentGoal:      "balanced" as InvestmentGoal,
  timeHorizon:         "medium"   as TimeHorizon,
};

export const useInvestmentContextStore = create<InvestmentContextState>((set) => ({
  ...DEFAULTS,
  setAge:                 (v) => set({ age: v }),
  setExperienceLevel:     (v) => set({ experienceLevel: v }),
  setFinancialBackground: (v) => set({ financialBackground: v }),
  setCommunicationStyle:  (v) => set({ communicationStyle: v }),
  setInvestmentGoal:      (v) => set({ investmentGoal: v }),
  setTimeHorizon:         (v) => set({ timeHorizon: v }),
  setAll:                 (partial) => set(partial),
  reset:                  () => set(DEFAULTS),
}));
