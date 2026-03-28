// React is required for JSX. useState allows storing and updating values inside
// a component (e.g. which step the user is currently on).
import React, { useState } from "react";

// useProjectionStore connects the onboarding output directly to the dashboard's
// state store, so the dashboard opens pre-filled with the user's onboarding answers.
import { useProjectionStore } from "@/store/projectionStore";

// ─── Types & defaults ─────────────────────────────────────────────────────────

// OBState describes the shape of all collected data during the user onboarding process.
// TypeScript error catching.
interface OBState {
  userType: "individual" | "business" | null;
  revenue: number;
  growthRate: number;
  months: number;
  useCOGS: boolean;
  cogsPercent: number;
  useMarketing: boolean;
  marketingSpend: number;
  usePayroll: boolean;
  payroll: number;
}

// BIZ is the default state when the user selects "Business".
const BIZ: OBState = {
  userType: "business",
  revenue: 40100,
  growthRate: 0.05,
  months: 12,
  useCOGS: true,
  cogsPercent: 0.22,
  useMarketing: true,
  marketingSpend: 4000,
  usePayroll: true,
  payroll: 22000,
};

// IND is the default state when the user selects "Individual".
// All toggles are off and values are zero.
const IND: OBState = {
  userType: "individual",
  revenue: 8000,
  growthRate: 0.03,
  months: 12,
  useCOGS: false,
  cogsPercent: 0,
  useMarketing: false,
  marketingSpend: 0,
  usePayroll: false,
  payroll: 0,
};

// ─── Formatters ───────────────────────────────────────────────────────────────

// formatDollars formats number to dollar amount.
// Numbers >= 1000 are shown as "$40k". Numbers below 1000 are shown as "$500".
const formatDollars = (v: number) => (v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`);

// formatPercent formats decimal as a percentage string e.g. 0.05 → "5%"
const formatPercent = (v: number) => `${(v * 100).toFixed(0)}%`;

// formatMonths formats a number as a month string e.g. 12 → "12 mo"
const formatMonths = (v: number) => `${v} mo`;

// ─── Shared components ────────────────────────────────────────────────────────

// ProgressBar renders a thin bar at the top of the onboarding process, indicating how
// far the user is into the process. Lights up gold as a step is completed.
interface ProgressBarProps { step: number; total: number; }

function ProgressBar({ step, total }: ProgressBarProps) {
  return (
      <div className = "flex gap-1.5 mb-8">
          {Array.from({ length: total }).map((_, i) => (
              // One segment div per step. Gold if completed, border colour if not.
              <div
                  key = {i}
                  className = {`flex-1 h-0.5 rounded-full transition-colors duration-300 ${
                      i < step ? "bg-primary" : "bg-border"
                  }`}
              />
          ))}
      </div>
  );
}

// StepHeader renders the numbered step badge, "STEP 1 OF 2" label, title and subtitle.
interface StepHeaderProps { currentStep: number; of: number; title: string; sub: string; }

function StepHeader({ currentStep: n, of: total, title, sub }: StepHeaderProps) {
  return (
      <div className = "mb-6">
          <div className = "flex items-center gap-2 mb-1.5">
              <div className = "w-6 h-6 rounded-full bg-primary text-primary-foreground font-extrabold text-xs flex items-center justify-center flex-shrink-0">
                {n}
              </div>
              <span className = "text-muted-foreground text-xs tracking-widest uppercase">
                Step {n} of {total}
              </span>
          </div>
          <h2 className = "text-foreground text-2xl font-extrabold tracking-tight mb-1">{title}</h2>
          <p className = "text-muted-foreground text-sm">{sub}</p>
      </div>
  );
}

// Slider renders a single labelled range slider with its current value displayed.
// Used for all input parameters. Fades to 30% opacity when disabled.
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

function Slider({ label, value, min, max, step, format, onChange, disabled, hint, }: SliderProps) {
    return (
        <div className = {`mb-4 transition-opacity duration-200 ${disabled ? "opacity-30" : "opacity-100"}`}>
            {hint && <p className = "text-muted-foreground text-xs mb-0.5">{hint}</p>}
            {label !== "" && (
                <div className = "flex justify-between mb-1">
                    <label className = "text-muted-foreground text-sm font-semibold">{label}</label>
                    <span className = {`text-sm font-bold ${disabled ? "text-muted-foreground" : "text-primary"}`}>
                        {disabled ? "—" : format(value)}
                    </span>
                </div>
            )}
            <input
                type = "range"
                min = {min}
                max = {max}
                step = {step}
                value = {value}
                disabled = {disabled}
                onChange = {(e) => onChange(Number(e.target.value))}
                className = {`w-full block ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
            />
        </div>
    );
}

// Toggle renders a small toggleable button to enable or disable a cost category.
interface ToggleProps { label: string; on: boolean; toggle: () => void; }

function Toggle({ label, on, toggle }: ToggleProps) {
    return (
        <button
            onClick = {toggle}
            className = {`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-150 font-sans ${
                on ? "bg-primary/10 border-primary text-primary" : "bg-transparent border-border text-muted-foreground"
            }`}
          >
            <span
                className = {`w-2 h-2 rounded-full flex-shrink-0 transition-colors duration-150 ${
                  on ? "bg-primary" : "bg-border"
                }`}
            />
            {label}
        </button>
    );
}

// Tip renders the hint box at the bottom of each step.
// Displays contextual advice based on the current slider values.
// Note: currently not AI generated — uses hardcoded conditionals.
interface TipProps { text: string; }

function Tip({ text }: TipProps) {
    return (
        <div className = "mt-5 bg-primary/[0.07] border border-primary/20 rounded-xl px-3.5 py-3 flex gap-2">
            <span className = "text-primary text-xs flex-shrink-0 mt-0.5">💡 Tip</span>
            <p className = "text-muted-foreground text-xs leading-relaxed m-0">{text}</p>
        </div>
    );
}

// NavRow renders the Back and Next/Finish buttons at the bottom of each step.
interface NavRowProps { onBack: () => void; onNext: () => void; nextLabel: string; }

function NavRow({ onBack, onNext, nextLabel }: NavRowProps) {
    return (
        <div className = "flex justify-between mt-7">
            <button
                onClick = {onBack}
                className = "bg-transparent border border-border text-muted-foreground rounded-lg px-5 py-2.5 text-sm font-medium hover:border-muted-foreground hover:text-foreground transition-colors duration-150 font-sans"
            >
              ← Back
            </button>
            <button
                onClick = {onNext}
                className = "bg-primary text-primary-foreground rounded-lg px-6 py-2.5 text-sm font-semibold hover:opacity-85 transition-opacity duration-150 font-sans"
            >
                {nextLabel}
            </button>
        </div>
    );
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────
// Both icons use stroke="currentColor" so Tailwind text colour classes control
// the icon colour automatically — no JavaScript needed for hover states.

// Person silhouette icon used on the Individual card.
function IconIndividual() {
    return (
        <svg
            width = "36"
            height = "36"
            viewBox = "0 0 24 24"
            fill = "none"
            stroke = "currentColor"
            strokeWidth = "1.8"
            strokeLinecap = "round"
            strokeLinejoin = "round"
          >
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
        </svg>
    );
}

// Briefcase icon used on the Business card.
function IconBusiness() {
    return (
        <svg
            width = "36"
            height = "36"
            viewBox = "0 0 24 24"
            fill = "none"
            stroke = "currentColor"
            strokeWidth = "1.8"
            strokeLinecap = "round"
            strokeLinejoin = "round"
          >
            <rect x="3" y="7" width="18" height="14" rx="1" />
            <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <line x1="3" y1="12" x2="21" y2="12" />
        </svg>
    );
}

// ─── Step 0: Purpose ──────────────────────────────────────────────────────────

// The initial onboarding screen. User selects Individual or Business.
// Card selection calls pick() which sets the default state and advances to step 1.
interface PurposeScreenProps { pick: (userType: "individual" | "business") => void; }

function PurposeScreen({ pick }: PurposeScreenProps) {
    const cards = [
        { key: "individual" as const, label: "Individual", Icon: IconIndividual },
        { key: "business"   as const, label: "Business",   Icon: IconBusiness   },
    ];

    return (
        <div className = "text-center py-4">
            {/* Badge */}
            <div className = "inline-block bg-primary/10 border border-primary/25 rounded-md px-3.5 py-1 text-primary text-xs font-bold tracking-widest uppercase mb-6">
              ElectraWireless — Financial Projection Engine
            </div>

            {/* Title */}
            <h1 className = "text-foreground text-4xl font-extrabold tracking-tight mb-2">
              Tell Us About Yourself
            </h1>
            <p className = "text-muted-foreground text-sm mb-12">
              We'll cater specifically to your needs.
            </p>

            {/* Type cards */}
            <div className = "flex gap-5 justify-center">
                {cards.map(({ key: key, label, Icon }) => (
                    <div
                        key = {key}
                        onClick = {() => pick(key)}
                        className = "w-48 h-44 bg-card border-2 border-border rounded-2xl cursor-pointer flex flex-col items-center justify-center gap-3 text-muted-foreground transition-all duration-200 hover:border-primary hover:text-primary hover:shadow-[0_0_24px_rgba(201,168,76,0.15)]"
                    >
                        <Icon />
                        <span className = "text-xl font-bold text-foreground transition-colors duration-200">
                           {label}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Step 1: Revenue ──────────────────────────────────────────────────────────

// Collects the user's revenue and growth inputs.
// Labels and slider ranges adapt based on Individual vs Business selection.
interface RevenueStepProps { state: OBState; patch: (p: Partial<OBState>) => void; }

function RevenueStep({ state, patch }: RevenueStepProps) {
    // individual is true if user picked Individual — used to show different labels and ranges.
    const individual = state.userType === "individual";

    return (
        <div>
            <StepHeader
                currentStep = {1}
                of = {2}
                title = "Revenue & Growth"
                sub = "Set your starting income and growth expectations."
            />
            <Slider
                label = {individual ? "Monthly Income" : "Starting Monthly Revenue"}
                value = {state.revenue}
                min = {500}
                max = {individual ? 30000 : 150000}
                step = {500}
                format = {formatDollars}
                onChange = {(newValue) => patch({ revenue: newValue })}
            />
            <Slider
                label = "Monthly Growth Rate"
                value = {state.growthRate}
                min = {0}
                max = {0.3}
                step = {0.005}
                format = {formatPercent}
                onChange = {(newValue) => patch({ growthRate: newValue })}
            />
            <Slider
                label = "Forecast Period"
                value = {state.months}
                min = {3}
                max = {36}
                step = {3}
                format = {formatMonths}
                onChange = {(newValue) => patch({ months: newValue })}
            />
            <Tip
                text = {
                    state.growthRate >= 0.08
                      ? `${formatPercent(state.growthRate)}/mo is strong growth — great for early-stage. Ensure your cost base scales slower than revenue.`
                      : `Conservative ${formatPercent(state.growthRate)}/mo — solid for a stable base. Ensure costs don't outpace revenue.`
                }
            />
        </div>
    );
}

// ─── Step 2: Costs ────────────────────────────────────────────────────────────

// Collects user cost inputs. Each cost category can be toggled on or off.
// If toggled off, the slider is greyed out and excluded from the expense total.
interface CostsStepProps { state: OBState; patch: (partialState: Partial<OBState>) => void; }

function CostsStep({ state, patch }: CostsStepProps) {
    const ind = state.userType === "individual";

    // Calculate total estimated monthly expenses from all toggled-on costs.
    // If a category is toggled off its value contributes zero.
    const totalExpenses =
        (state.useCOGS ? state.revenue * state.cogsPercent : 0) +
        (state.useMarketing ? state.marketingSpend : 0) +
        (state.usePayroll ? state.payroll : 0);

    return (
        <div>
            <StepHeader
                currentStep = {2}
                of = {2}
                title = "Costs & Expenses"
                sub = "Toggle anything that doesn't apply — it'll be excluded."
            />

          {/* Toggle chips — clicking each flips its boolean in state */}
          <div className = "flex gap-2 flex-wrap mb-5">
              <Toggle
                  label = "COGS %"
                  on = {state.useCOGS}
                  toggle = {() => patch({ useCOGS: !state.useCOGS })}
              />
              <Toggle
                  label = "Marketing"
                  on = {state.useMarketing}
                  toggle = {() => patch({ useMarketing: !state.useMarketing })}
              />
              <Toggle
                  label = {ind ? "Fixed Costs" : "Payroll"}
                  on = {state.usePayroll}
                  toggle = {() => patch({ usePayroll: !state.usePayroll })}
              />
          </div>

          <Slider
              label = "COGS %"
              hint = {ind ? "Delivery / product costs as % of income" : "Cost of Goods Sold as % of revenue"}
              value = {state.cogsPercent}
              min = {0}
              max = {0.8}
              step = {0.01}
              format = {formatPercent}
              onChange = {(newValue) => patch({ cogsPercent: newValue })}
              disabled = {!state.useCOGS}
          />
          <Slider
              label = "Marketing Spend"
              hint = {ind ? "Promotion and tools budget per month" : "Ads, tools and events per month"}
              value = {state.marketingSpend}
              min = {0}
              max = {50000}
              step = {500}
              format = {formatDollars}
              onChange = {(newValue) => patch({ marketingSpend: newValue })}
              disabled = {!state.useMarketing}
          />
          <Slider
              label = {ind ? "Fixed Costs" : "Payroll"}
              hint = {ind ? "Subscriptions, rent, recurring bills" : "Total salary costs per month"}
              value = {state.payroll}
              min = {0}
              max = {200000}
              step = {1000}
              format = {formatDollars}
              onChange = {(newValue) => patch({ payroll: newValue })}
              disabled = {!state.usePayroll}
          />

          {/* Live expense summary — turns red if expenses exceed starting revenue */}
          <div className = "mt-2 bg-secondary border border-border rounded-xl px-4 py-2.5 flex justify-between items-center">
              <span className = "text-muted-foreground text-sm">Estimated monthly expenses</span>
              <span className = {`text-sm font-bold ${totalExpenses > state.revenue ? "text-destructive" : "text-green-400"}`}>
                  {formatDollars(Math.round(totalExpenses))}
              </span>
          </div>

          <Tip
              text = {
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

// Main exported component. Manages which step is visible and holds shared state
// for all steps. Props: onComplete = callback fired when the user clicks
// "View Dashboard →". Seeds the projection store with the user's onboarding answers.
interface OnboardingFlowProps { onComplete: () => void; }

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
    // Tracks which screen is shown: 0 = purpose, 1 = revenue, 2 = costs.
    const [step, setStep] = useState(0);

    // state holds all user input values. Defaults to business preset.
    const [state, setState] = useState<OBState>(BIZ);

    // patch updates part of state without overwriting the rest.
    // e.g. patch({ revenue: 5000 }) only changes revenue.
    const patch = (partialState: Partial<OBState>) => setState((previousState) => ({ ...previousState, ...partialState }));

    // Pull individual setters from the projection store.
    // Each setter updates one field in the shared dashboard state.
    const setStartingMRR    = useProjectionStore((s) => s.setStartingMRR);
    const setGrowthRate     = useProjectionStore((s) => s.setGrowthRate);
    const setCogsPercent    = useProjectionStore((s) => s.setCogsPercent);
    const setMarketingSpend = useProjectionStore((s) => s.setMarketingSpend);
    const setPayroll        = useProjectionStore((s) => s.setPayroll);
    const setForecastMonths = useProjectionStore((s) => s.setForecastMonths);

    // Seeds the projection store with the user's onboarding answers, then
    // calls onComplete() to reveal the dashboard.
    function handleComplete() {
        setStartingMRR(state.revenue);
        setGrowthRate(state.growthRate * 100);                              // Store uses % e.g. 8, not 0.08.
        setCogsPercent(state.useCOGS ? state.cogsPercent * 100 : 0);       // Store uses % e.g. 22, not 0.22.
        setMarketingSpend(state.useMarketing ? state.marketingSpend : 0);   // Zero if toggled off.
        setPayroll(state.usePayroll ? state.payroll : 0);                   // Zero if toggled off.
        setForecastMonths(state.months);
        onComplete();
    }

    return (
        <div className = "min-h-screen bg-background flex items-center justify-center p-8 font-sans">
            {/* Decorative grid background — pointer-events-none so it does not block clicks.
                Kept as a style prop as Tailwind cannot generate arbitrary backgroundImage values. */}
            <div
                className = "fixed inset-0 pointer-events-none opacity-30"
                style = {{
                    backgroundImage: "linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)",
                    backgroundSize: "40px 40px",
                }}
            />

            {/* Main card — z-10 keeps it above the grid overlay */}
            <div className = "relative z-10 w-full max-w-lg bg-card border border-border rounded-2xl p-9 shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
                {/* Progress bar only shown on steps 1 and 2 */}
                {step > 0 && <ProgressBar step = {step} total = {2} />}

                {step === 0 && (
                    <PurposeScreen
                        pick = {(userType) => {
                            setState(userType === "individual" ? IND : BIZ);
                            setStep(1);
                        }}
                    />
                )}
                {step === 1 && <RevenueStep state = {state} patch = {patch} />}
                {step === 2 && <CostsStep state = {state} patch = {patch} />}

                {step === 1 && (
                    <NavRow
                        onBack = {() => setStep(0)}
                        onNext = {() => setStep(2)}
                        nextLabel = "Next →"
                    />
                )}
                {step === 2 && (
                    <NavRow
                        onBack = {() => setStep(1)}
                        onNext = {handleComplete}
                        nextLabel = "View Dashboard →"
                    />
                )}
            </div>
        </div>
    );
}
