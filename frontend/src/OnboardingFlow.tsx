import React, { useState } from "react";
import { useProjectionStore } from "@/store/projectionStore";
import type { ProfilePreset } from "@/lib/profilePresets";

// ─── Types & defaults ─────────────────────────────────────────────────────────

interface OBState {
  revenue: number;
  growthRate: number;
  churnRate: number;
  months: number;
  useCOGS: boolean;
  cogsPercent: number;
  useMarketing: boolean;
  marketingSpend: number;
  usePayroll: boolean;
  payroll: number;
}

const DEFAULT: OBState = {
  revenue: 40100,
  growthRate: 0.05,
  churnRate: 3,
  months: 12,
  useCOGS: true,
  cogsPercent: 0.22,
  useMarketing: true,
  marketingSpend: 4000,
  usePayroll: true,
  payroll: 22000,
};

// ─── Formatters ───────────────────────────────────────────────────────────────

const formatDollars = (v: number) => (v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`);
const formatPercent = (v: number) => `${(v * 100).toFixed(0)}%`;
const formatMonths  = (v: number) => `${v} mo`;

// ─── Shared components ────────────────────────────────────────────────────────

interface ProgressBarProps { step: number; total: number; }

function ProgressBar({ step, total }: ProgressBarProps) {
  return (
    <div className="flex gap-1.5 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`flex-1 h-0.5 rounded-full transition-colors duration-300 ${
            i < step ? "bg-primary" : "bg-border"
          }`}
        />
      ))}
    </div>
  );
}

interface StepHeaderProps { currentStep: number; of: number; title: string; sub: string; }

function StepHeader({ currentStep: n, of: total, title, sub }: StepHeaderProps) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground font-extrabold text-xs flex items-center justify-center flex-shrink-0">
          {n}
        </div>
        <span className="text-muted-foreground text-xs tracking-widest uppercase">
          Step {n} of {total}
        </span>
      </div>
      <h2 className="text-foreground text-2xl font-extrabold tracking-tight mb-1">{title}</h2>
      <p className="text-muted-foreground text-sm">{sub}</p>
    </div>
  );
}

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (newValue: number) => string;
  onChange: (newValue: number) => void;
  disabled?: boolean;
  hint?: string;
}

function Slider({ label, value, min, max, step, format, onChange, disabled, hint }: SliderProps) {
  return (
    <div className={`mb-4 transition-opacity duration-200 ${disabled ? "opacity-30" : "opacity-100"}`}>
      {hint && <p className="text-muted-foreground text-xs mb-0.5">{hint}</p>}
      {label !== "" && (
        <div className="flex justify-between mb-1">
          <label className="text-muted-foreground text-sm font-semibold">{label}</label>
          <span className={`text-sm font-bold ${disabled ? "text-muted-foreground" : "text-primary"}`}>
            {disabled ? "—" : format(value)}
          </span>
        </div>
      )}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`w-full block ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
      />
    </div>
  );
}

interface ToggleProps { label: string; on: boolean; toggle: () => void; }

function Toggle({ label, on, toggle }: ToggleProps) {
  return (
    <button
      onClick={toggle}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-150 font-sans ${
        on ? "bg-primary/10 border-primary text-primary" : "bg-transparent border-border text-muted-foreground"
      }`}
    >
      <span
        className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors duration-150 ${
          on ? "bg-primary" : "bg-border"
        }`}
      />
      {label}
    </button>
  );
}

interface TipProps { text: string; }

function Tip({ text }: TipProps) {
  return (
    <div className="mt-5 bg-primary/[0.07] border border-primary/20 rounded-xl px-3.5 py-3 flex gap-2">
      <span className="text-primary text-xs flex-shrink-0 mt-0.5">💡 Tip</span>
      <p className="text-muted-foreground text-xs leading-relaxed m-0">{text}</p>
    </div>
  );
}

interface NavRowProps { onBack: () => void; onNext: () => void; nextLabel: string; }

function NavRow({ onBack, onNext, nextLabel }: NavRowProps) {
  return (
    <div className="flex justify-between mt-7">
      <button
        onClick={onBack}
        className="bg-transparent border border-border text-muted-foreground rounded-lg px-5 py-2.5 text-sm font-medium hover:border-muted-foreground hover:text-foreground transition-colors duration-150 font-sans"
      >
        ← Back
      </button>
      <button
        onClick={onNext}
        className="bg-primary text-primary-foreground rounded-lg px-6 py-2.5 text-sm font-semibold hover:opacity-85 transition-opacity duration-150 font-sans"
      >
        {nextLabel}
      </button>
    </div>
  );
}

// ─── Step 1: Revenue ──────────────────────────────────────────────────────────

interface RevenueStepProps { state: OBState; patch: (p: Partial<OBState>) => void; }

function RevenueStep({ state, patch }: RevenueStepProps) {
  return (
    <div>
      <StepHeader
        currentStep={1}
        of={2}
        title="Revenue & Growth"
        sub="Set your starting revenue and growth expectations."
      />
      <Slider
        label="Starting Monthly Revenue"
        value={state.revenue}
        min={500}
        max={150000}
        step={500}
        format={formatDollars}
        onChange={(v) => patch({ revenue: v })}
      />
      <Slider
        label="Monthly Growth Rate"
        value={state.growthRate}
        min={0}
        max={0.3}
        step={0.005}
        format={formatPercent}
        onChange={(v) => patch({ growthRate: v })}
      />
      <Slider
        label="Monthly Churn Rate"
        value={state.churnRate}
        min={0}
        max={20}
        step={0.5}
        format={(v) => `${v}%`}
        onChange={(v) => patch({ churnRate: v })}
      />
      <Slider
        label="Forecast Period"
        value={state.months}
        min={3}
        max={36}
        step={3}
        format={formatMonths}
        onChange={(v) => patch({ months: v })}
      />
      <Tip
        text={
          state.growthRate >= 0.08
            ? `${formatPercent(state.growthRate)}/mo is strong growth — great for early-stage. Ensure your cost base scales slower than revenue.`
            : `Conservative ${formatPercent(state.growthRate)}/mo — solid for a stable base. Ensure costs don't outpace revenue.`
        }
      />
    </div>
  );
}

// ─── Step 2: Costs ────────────────────────────────────────────────────────────

interface CostsStepProps { state: OBState; patch: (p: Partial<OBState>) => void; }

function CostsStep({ state, patch }: CostsStepProps) {
  const totalExpenses =
    (state.useCOGS ? state.revenue * state.cogsPercent : 0) +
    (state.useMarketing ? state.marketingSpend : 0) +
    (state.usePayroll ? state.payroll : 0);

  return (
    <div>
      <StepHeader
        currentStep={2}
        of={2}
        title="Costs & Expenses"
        sub="Toggle anything that doesn't apply — it'll be excluded."
      />

      <div className="flex gap-2 flex-wrap mb-5">
        <Toggle label="COGS %"    on={state.useCOGS}      toggle={() => patch({ useCOGS:      !state.useCOGS      })} />
        <Toggle label="Marketing" on={state.useMarketing}  toggle={() => patch({ useMarketing: !state.useMarketing })} />
        <Toggle label="Payroll"   on={state.usePayroll}    toggle={() => patch({ usePayroll:   !state.usePayroll   })} />
      </div>

      <Slider
        label="COGS %"
        hint="Cost of Goods Sold as % of revenue"
        value={state.cogsPercent}
        min={0}
        max={0.8}
        step={0.01}
        format={formatPercent}
        onChange={(v) => patch({ cogsPercent: v })}
        disabled={!state.useCOGS}
      />
      <Slider
        label="Marketing Spend"
        hint="Ads, tools and events per month"
        value={state.marketingSpend}
        min={0}
        max={50000}
        step={500}
        format={formatDollars}
        onChange={(v) => patch({ marketingSpend: v })}
        disabled={!state.useMarketing}
      />
      <Slider
        label="Payroll"
        hint="Total salary costs per month"
        value={state.payroll}
        min={0}
        max={200000}
        step={1000}
        format={formatDollars}
        onChange={(v) => patch({ payroll: v })}
        disabled={!state.usePayroll}
      />

      <div className="mt-2 bg-primary/10 border border-primary/20 rounded-xl px-4 py-2.5 flex justify-between items-center">
        <span className="text-muted-foreground text-sm">Estimated monthly expenses</span>
        <span className={`text-sm font-bold ${totalExpenses > state.revenue ? "text-destructive" : "text-[#1D9E75]"}`}>
          {formatDollars(Math.round(totalExpenses))}
        </span>
      </div>

      <Tip
        text={
          !state.useCOGS && !state.useMarketing && !state.usePayroll
            ? "No costs toggled on — add at least one for a realistic forecast."
            : totalExpenses > state.revenue
            ? `⚠️ Expenses (${formatDollars(Math.round(totalExpenses))}) exceed starting revenue (${formatDollars(state.revenue)}). Strong growth needed to break even.`
            : `Healthy starting margin. With ${formatPercent(state.growthRate)}/mo revenue growth vs fixed costs, revenue should pull ahead.`
        }
      />
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

interface OnboardingFlowProps { onComplete: () => void; onBack: () => void; initialValues?: ProfilePreset; }

export default function OnboardingFlow({ onComplete, onBack, initialValues }: OnboardingFlowProps) {
  const [step, setStep] = useState(1);
  const [state, setState] = useState<OBState>(initialValues ?? DEFAULT);

  const patch = (p: Partial<OBState>) => setState((prev) => ({ ...prev, ...p }));

  const setStartingMRR      = useProjectionStore((s) => s.setStartingMRR);
  const setGrowthRate       = useProjectionStore((s) => s.setGrowthRate);
  const setChurnRate        = useProjectionStore((s) => s.setChurnRate);
  const setCogsPercent      = useProjectionStore((s) => s.setCogsPercent);
  const setMarketingSpend   = useProjectionStore((s) => s.setMarketingSpend);
  const setPayroll          = useProjectionStore((s) => s.setPayroll);
  const setForecastMonths   = useProjectionStore((s) => s.setForecastMonths);
  const saveCustomSnapshot  = useProjectionStore((s) => s.saveCustomSnapshot);

  function handleComplete() {
    setStartingMRR(state.revenue);
    setGrowthRate(state.growthRate * 100);
    setChurnRate(state.churnRate);
    setCogsPercent(state.useCOGS ? state.cogsPercent * 100 : 0);
    setMarketingSpend(state.useMarketing ? state.marketingSpend : 0);
    setPayroll(state.usePayroll ? state.payroll : 0);
    setForecastMonths(state.months);
    saveCustomSnapshot();
    onComplete();
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8 font-sans">
      <div className="w-full max-w-lg bg-white/30 backdrop-blur-[18px] rounded-[28px] border-2 border-white/70 shadow-[0_8px_48px_rgba(120,100,180,0.10)] p-9">
        <ProgressBar step={step} total={2} />

        {step === 1 && <RevenueStep state={state} patch={patch} />}
        {step === 2 && <CostsStep  state={state} patch={patch} />}

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
            onNext={handleComplete}
            nextLabel="View Dashboard →"
          />
        )}
      </div>
    </div>
  );
}
