import { useState, useRef } from "react";
import {
  ProgressBar,
  StepHeader,
  Tip,
  Slider,
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
import { submitInvestmentOnboarding, uploadHoldingsCsv } from "@/services/investmentApi";

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
        of={4}
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
        of={4}
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
        of={4}
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

// ─── Step 4: CSV Import ───────────────────────────────────────────────────────

type UploadStatus = "idle" | "loading" | "success" | "error";

interface CsvImportStepProps {
  onUploaded: () => void;
}

function CsvImportStep({ onUploaded }: CsvImportStepProps) {
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [result, setResult] = useState<{ imported: number; symbols: string[]; errors: string[] } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file.name.endsWith(".csv")) {
      setStatus("error");
      setResult({ imported: 0, symbols: [], errors: ["File must be a .csv"] });
      return;
    }
    setStatus("loading");
    try {
      const data = await uploadHoldingsCsv(file);
      setResult(data);
      setStatus(data.imported > 0 ? "success" : "error");
      if (data.imported > 0) onUploaded();
    } catch {
      setStatus("error");
      setResult({ imported: 0, symbols: [], errors: ["Upload failed — check the server is running."] });
    }
  }

  return (
    <div>
      <StepHeader
        currentStep={4}
        of={4}
        title="Import Your Portfolio"
        sub="Upload a CSV to populate your dashboard instantly. You can also skip and add holdings manually."
      />

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        onClick={() => inputRef.current?.click()}
        className={`mt-3 mb-4 rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-all duration-150 ${
          dragOver ? "border-primary bg-primary/10" :
          status === "success" ? "border-green-400 bg-green-50" :
          status === "error" ? "border-red-400 bg-red-50" :
          "border-border hover:border-primary/50 bg-white/30"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />

        {status === "idle" && (
          <>
            <div className="text-2xl mb-1">📂</div>
            <div className="text-sm font-semibold text-foreground">Drag & drop a CSV or click to browse</div>
            <div className="text-xs text-muted-foreground mt-1">Columns: symbol, asset_type, quantity, buy_price (+ optional purchase_date)</div>
          </>
        )}
        {status === "loading" && (
          <div className="text-sm text-muted-foreground animate-pulse">Uploading…</div>
        )}
        {status === "success" && result && (
          <>
            <div className="text-sm font-bold text-green-700">✓ Imported {result.imported} holding{result.imported !== 1 ? "s" : ""}</div>
            <div className="text-xs text-green-600 mt-1">{result.symbols.join(", ")}</div>
            {result.errors.length > 0 && (
              <div className="text-xs text-amber-600 mt-2">{result.errors.length} row{result.errors.length !== 1 ? "s" : ""} skipped</div>
            )}
          </>
        )}
        {status === "error" && result && (
          <>
            <div className="text-sm font-bold text-red-600">Import failed</div>
            {result.errors.slice(0, 3).map((e, i) => (
              <div key={i} className="text-xs text-red-500 mt-1">{e}</div>
            ))}
            <div className="text-xs text-muted-foreground mt-2">Click to try again</div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

interface InvestmentOnboardingFlowProps { onComplete: () => void; onBack: () => void; }

export default function InvestmentOnboardingFlow({ onComplete, onBack }: InvestmentOnboardingFlowProps) {
  const [step, setStep] = useState(1);
  const [state, setState] = useState<OBState>(DEFAULT);
  const [csvUploaded, setCsvUploaded] = useState(false);

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
        <ProgressBar step={step} total={4} />

        {step === 1 && <PersonalContextStep state={state} patch={patch} />}
        {step === 2 && <CommunicationStep   state={state} patch={patch} />}
        {step === 3 && <GoalsStep           state={state} patch={patch} />}
        {step === 4 && <CsvImportStep onUploaded={() => setCsvUploaded(true)} />}

        {step === 1 && (
          <NavRow onBack={onBack} onNext={() => setStep(2)} nextLabel="Next →" />
        )}
        {step === 2 && (
          <NavRow onBack={() => setStep(1)} onNext={() => setStep(3)} nextLabel="Next →" />
        )}
        {step === 3 && (
          <NavRow onBack={() => setStep(2)} onNext={() => setStep(4)} nextLabel="Next →" />
        )}
        {step === 4 && (
          <NavRow
            onBack={() => setStep(3)}
            onNext={handleComplete}
            nextLabel={csvUploaded ? "Finish →" : "Skip →"}
          />
        )}
      </div>
    </div>
  );
}
