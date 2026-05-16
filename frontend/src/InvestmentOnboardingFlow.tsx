import { useState } from "react";
import {
  ProgressBar,
  StepHeader,
  Slider,
  Tip,
  NavRow,
} from "@/components/onboarding/primitives";
import {
  useInvestmentContextStore,
  type ExperienceLevel,
  type FinancialBackground,
  type CommunicationStyle,
  type InvestmentGoal,
  type TimeHorizon,
} from "@/store/investmentContextStore";
import { submitInvestmentOnboarding } from "@/services/investmentApi";

// ─── Types & defaults ─────────────────────────────────────────────────────────

interface OBState {
  age: number;
  experienceLevel: ExperienceLevel;
  financialBackground: FinancialBackground;
  communicationStyle: CommunicationStyle;
  investmentGoal: InvestmentGoal;
  timeHorizon: TimeHorizon;
}

const DEFAULT: OBState = {
  age: 30,
  experienceLevel: "beginner",
  financialBackground: "moderate",
  communicationStyle: "simple",
  investmentGoal: "balanced",
  timeHorizon: "medium",
};

// ─── ChoiceGroup ──────────────────────────────────────────────────────────────

interface ChoiceGroupProps<T extends string> {
  label: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (v: T) => void;
  columns?: 2 | 3 | 4;
}

function ChoiceGroup<T extends string>({ label, value, options, onChange, columns = 3 }: ChoiceGroupProps<T>) {
  const gridCls = columns === 4 ? "grid-cols-4" : columns === 2 ? "grid-cols-2" : "grid-cols-3";
  return (
    <div className="mb-4">
      <label className="text-muted-foreground text-sm font-semibold block mb-2">{label}</label>
      <div className={`grid ${gridCls} gap-2`}>
        {options.map((opt) => {
          const on = opt.value === value;
          return (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all duration-150 font-sans ${
                on
                  ? "bg-primary/10 border-primary text-primary"
                  : "bg-transparent border-border text-muted-foreground hover:border-muted-foreground"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 1: Personal Context ─────────────────────────────────────────────────

interface StepProps { state: OBState; patch: (p: Partial<OBState>) => void; }

function PersonalContextStep({ state, patch }: StepProps) {
  return (
    <div>
      <StepHeader
        currentStep={1}
        of={3}
        title="Personal Context"
        sub="Helps Elly tailor explanations to your situation."
      />
      <Slider
        label="Age"
        value={state.age}
        min={18}
        max={100}
        step={1}
        format={(v) => `${v} years`}
        onChange={(v) => patch({ age: v })}
      />
      <ChoiceGroup<ExperienceLevel>
        label="Experience Level"
        value={state.experienceLevel}
        columns={3}
        options={[
          { value: "beginner",     label: "Beginner" },
          { value: "intermediate", label: "Intermediate" },
          { value: "advanced",     label: "Advanced" },
        ]}
        onChange={(v) => patch({ experienceLevel: v })}
      />
      <ChoiceGroup<FinancialBackground>
        label="Financial Background"
        value={state.financialBackground}
        columns={3}
        options={[
          { value: "low",      label: "Low" },
          { value: "moderate", label: "Moderate" },
          { value: "high",     label: "High" },
        ]}
        onChange={(v) => patch({ financialBackground: v })}
      />
    </div>
  );
}

// ─── Step 2: Communication Preference ─────────────────────────────────────────

function CommunicationStep({ state, patch }: StepProps) {
  const cards: Array<{ value: CommunicationStyle; title: string; desc: string }> = [
    { value: "simple",    title: "Simple explanations",  desc: "Plain language, analogies, fewer numbers." },
    { value: "technical", title: "Technical breakdowns", desc: "Ratios, formulas, deeper data context." },
  ];
  return (
    <div>
      <StepHeader
        currentStep={2}
        of={3}
        title="Communication Preference"
        sub="How should Elly speak to you?"
      />
      <div className="grid grid-cols-2 gap-3 mt-2">
        {cards.map((c) => {
          const on = state.communicationStyle === c.value;
          return (
            <button
              key={c.value}
              onClick={() => patch({ communicationStyle: c.value })}
              className={`text-left rounded-xl border-2 p-4 transition-all duration-150 ${
                on
                  ? "bg-primary/10 border-primary"
                  : "bg-white/40 border-border hover:border-primary/40"
              }`}
            >
              <div className={`text-sm font-bold mb-1 ${on ? "text-primary" : "text-foreground"}`}>
                {c.title}
              </div>
              <div className="text-xs text-muted-foreground leading-relaxed">{c.desc}</div>
            </button>
          );
        })}
      </div>
      <Tip size="sm" text="Elly adapts the depth of her responses to match your choice — light highlights or full breakdowns, you decide." />
    </div>
  );
}

// ─── Step 3: Investment Goals ─────────────────────────────────────────────────

function GoalsStep({ state, patch }: StepProps) {
  return (
    <div>
      <StepHeader
        currentStep={3}
        of={3}
        title="Investment Goals"
        sub="What outcome are you optimizing for?"
      />
      <ChoiceGroup<InvestmentGoal>
        label="Primary Goal"
        value={state.investmentGoal}
        columns={4}
        options={[
          { value: "growth",       label: "Growth" },
          { value: "income",       label: "Income" },
          { value: "preservation", label: "Preservation" },
          { value: "balanced",     label: "Balanced" },
        ]}
        onChange={(v) => patch({ investmentGoal: v })}
      />
      <ChoiceGroup<TimeHorizon>
        label="Time Horizon"
        value={state.timeHorizon}
        columns={3}
        options={[
          { value: "short",  label: "Short term"  },
          { value: "medium", label: "Medium term" },
          { value: "long",   label: "Long term"   },
        ]}
        onChange={(v) => patch({ timeHorizon: v })}
      />
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

interface InvestmentOnboardingFlowProps { onComplete: () => void; onBack: () => void; }

export default function InvestmentOnboardingFlow({ onComplete, onBack }: InvestmentOnboardingFlowProps) {
  const [step, setStep] = useState(1);
  const [state, setState] = useState<OBState>(DEFAULT);

  const patch = (p: Partial<OBState>) => setState((prev) => ({ ...prev, ...p }));

  const setAll = useInvestmentContextStore((s) => s.setAll);

  function handleComplete() {
    setAll(state);
    submitInvestmentOnboarding(state).catch((err) => {
      console.error("Failed to persist investment onboarding:", err);
    });
    onComplete();
  }

  return (
    <div className="h-full flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-lg bg-white/30 backdrop-blur-[18px] rounded-[28px] border-2 border-white/70 shadow-[0_8px_48px_rgba(120,100,180,0.10)] p-8">
        <ProgressBar step={step} total={3} />

        {step === 1 && <PersonalContextStep state={state} patch={patch} />}
        {step === 2 && <CommunicationStep   state={state} patch={patch} />}
        {step === 3 && <GoalsStep           state={state} patch={patch} />}

        {step === 1 && (
          <NavRow
            onBack={onBack}
            onNext={() => setStep(2)}
            nextLabel="Next →"
          />
        )}
        {step === 2 && (
          <NavRow
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
            nextLabel="Next →"
          />
        )}
        {step === 3 && (
          <NavRow
            onBack={() => setStep(2)}
            onNext={handleComplete}
            nextLabel="Finish →"
          />
        )}
      </div>
    </div>
  );
}
