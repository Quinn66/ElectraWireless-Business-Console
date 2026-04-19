import { useState } from "react";
import { Lightbulb } from "lucide-react";
import { useProjectionStore } from "@/store/projectionStore";
import type { ProfilePreset } from "@/lib/profilePresets";
import ImportFinancialDataStep from "@/components/ImportFinancialDataStep";
import type { ExtractedValues } from "@/lib/importUtils";

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

const formatDollars = (v: number) => `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatPercent = (v: number) => `${(v * 100).toFixed(2)}%`;
const formatMonths  = (v: number) => `${v} mo`;

// ─── Shared components ────────────────────────────────────────────────────────

interface ProgressBarProps { step: number; total: number; }

function ProgressBar({ step, total }: ProgressBarProps) {
  return (
    <div className="flex gap-1.5 mb-5">
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
    <div className="mb-4">
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
  parse?: (input: string) => number;
  onChange: (newValue: number) => void;
  disabled?: boolean;
  hint?: string;
}

function Slider({ label, value, min, max, step, format, parse, onChange, disabled, hint }: SliderProps) {
  const [editing, setEditing] = useState(false);
  const [inputText, setInputText] = useState("");

  function handleFocus() {
    setEditing(true);
    setInputText(format(value));
  }

  function commit() {
    setEditing(false);
    const parsed = parse
      ? parse(inputText)
      : parseFloat(inputText.replace(/[^0-9.\-]/g, ""));
    if (!isNaN(parsed)) {
      onChange(Math.min(max, Math.max(min, parsed)));
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
    if (e.key === "Escape") setEditing(false);
  }

  return (
    <div className={`mb-3 transition-opacity duration-200 ${disabled ? "opacity-30" : "opacity-100"}`}>
      {hint && <p className="text-muted-foreground text-xs mb-0.5">{hint}</p>}
      {label !== "" && (
        <div className="flex justify-between items-center mb-1">
          <label className="text-muted-foreground text-sm font-semibold">{label}</label>
          {disabled ? (
            <span className="text-sm font-bold text-muted-foreground">—</span>
          ) : (
            <input
              type="text"
              value={editing ? inputText : format(value)}
              onFocus={handleFocus}
              onChange={(e) => setInputText(e.target.value)}
              onBlur={commit}
              onKeyDown={handleKeyDown}
              className="text-sm font-bold text-primary bg-transparent border-b border-primary/30 focus:border-primary outline-none text-right w-28 transition-colors duration-150 font-sans"
            />
          )}
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
      <Lightbulb size={13} className="text-primary flex-shrink-0 mt-0.5" />
      <p className="text-muted-foreground text-xs leading-relaxed m-0">{text}</p>
    </div>
  );
}

interface NavRowProps { onBack: () => void; onNext: () => void; nextLabel: string; }

function NavRow({ onBack, onNext, nextLabel }: NavRowProps) {
  return (
    <div className="flex justify-between mt-5">
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

// ─── Step 2: Revenue ──────────────────────────────────────────────────────────

interface RevenueStepProps { state: OBState; patch: (p: Partial<OBState>) => void; }

function RevenueStep({ state, patch }: RevenueStepProps) {
  return (
    <div>
      <StepHeader
        currentStep={2}
        of={3}
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
        parse={(s) => parseFloat(s.replace(/[^0-9.\-]/g, "")) / 100}
        onChange={(v) => patch({ growthRate: v })}
      />
      <Slider
        label="Monthly Churn Rate"
        value={state.churnRate}
        min={0}
        max={20}
        step={0.5}
        format={(v) => `${v.toFixed(2)}%`}
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

// ─── Step 3: Costs ────────────────────────────────────────────────────────────

interface CostsStepProps { state: OBState; patch: (p: Partial<OBState>) => void; }

function CostsStep({ state, patch }: CostsStepProps) {
  const totalExpenses =
    (state.useCOGS ? state.revenue * state.cogsPercent : 0) +
    (state.useMarketing ? state.marketingSpend : 0) +
    (state.usePayroll ? state.payroll : 0);

  return (
    <div>
      <StepHeader
        currentStep={3}
        of={3}
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
        parse={(s) => parseFloat(s.replace(/[^0-9.\-]/g, "")) / 100}
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
  const [importedValues, setImportedValues] = useState<ExtractedValues | undefined>(undefined);

  const patch = (p: Partial<OBState>) => setState((prev) => ({ ...prev, ...p }));

  const setStartingMRR      = useProjectionStore((s) => s.setStartingMRR);
  const setGrowthRate       = useProjectionStore((s) => s.setGrowthRate);
  const setChurnRate        = useProjectionStore((s) => s.setChurnRate);
  const setCogsPercent      = useProjectionStore((s) => s.setCogsPercent);
  const setMarketingSpend   = useProjectionStore((s) => s.setMarketingSpend);
  const setPayroll          = useProjectionStore((s) => s.setPayroll);
  const setForecastMonths      = useProjectionStore((s) => s.setForecastMonths);
  const saveCustomSnapshot     = useProjectionStore((s) => s.saveCustomSnapshot);
  const fetchProphetForecast   = useProjectionStore((s) => s.fetchProphetForecast);

  function handleComplete() {
    setStartingMRR(state.revenue);
    setGrowthRate(state.growthRate * 100);
    setChurnRate(state.churnRate);
    setCogsPercent(state.useCOGS ? state.cogsPercent * 100 : 0);
    setMarketingSpend(state.useMarketing ? state.marketingSpend : 0);
    setPayroll(state.usePayroll ? state.payroll : 0);
    setForecastMonths(state.months);

    // Imported values take precedence over slider values for any detected fields
    if (importedValues) {
      if (importedValues.startingMRR    !== undefined) setStartingMRR(importedValues.startingMRR);
      if (importedValues.growthRate     !== undefined) setGrowthRate(importedValues.growthRate);
      if (importedValues.cogsPercent    !== undefined) setCogsPercent(importedValues.cogsPercent);
      if (importedValues.marketingSpend !== undefined) setMarketingSpend(importedValues.marketingSpend);
      if (importedValues.payroll        !== undefined) setPayroll(importedValues.payroll);
    }

    saveCustomSnapshot();
    fetchProphetForecast();
    onComplete();
  }

  return (
    <div className="h-full flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-lg bg-white/30 backdrop-blur-[18px] rounded-[28px] border-2 border-white/70 shadow-[0_8px_48px_rgba(120,100,180,0.10)] p-8">
        <ProgressBar step={step} total={3} />

        {step === 1 && (
          <ImportFinancialDataStep
            onBack={onBack}
            onSkip={() => setStep(2)}
            onApply={(vals) => {
              setImportedValues(vals);
              patch({
                ...(vals.startingMRR    !== undefined && { revenue:       vals.startingMRR }),
                ...(vals.growthRate     !== undefined && { growthRate:    vals.growthRate / 100 }),
                ...(vals.cogsPercent    !== undefined && { cogsPercent:   vals.cogsPercent / 100, useCOGS: true }),
                ...(vals.marketingSpend !== undefined && { marketingSpend: vals.marketingSpend, useMarketing: true }),
                ...(vals.payroll        !== undefined && { payroll:        vals.payroll, usePayroll: true }),
              });
              setStep(2);
            }}
          />
        )}
        {step === 2 && <RevenueStep state={state} patch={patch} />}
        {step === 3 && <CostsStep   state={state} patch={patch} />}

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
