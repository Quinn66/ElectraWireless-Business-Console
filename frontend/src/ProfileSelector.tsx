import { useState } from "react";
import type { AccountType } from "@/store/projectionStore";
import { cn } from "@/lib/utils";

// ─── Profile definitions ──────────────────────────────────────────────────────

interface Profile {
  id: string;
  label: string;
  description: string;
  highlights?: string[];
  Icon: () => React.ReactElement;
}

type ProfileMap = Record<AccountType, Profile[]>;

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconPersonalFinance() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 6v2m0 8v2" />
      <path d="M9 10h4.5a1.5 1.5 0 0 1 0 3H10a1.5 1.5 0 0 0 0 3H15" />
    </svg>
  );
}

function IconSmallBusiness() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-6 9 6v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9z" />
      <path d="M9 22V12h6v10" />
    </svg>
  );
}

function IconFreelancer() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="12" y2="17" />
    </svg>
  );
}

function IconStartup() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10" />
      <path d="M22 2L11 13" />
      <path d="M22 2l-7 0 0 7" />
    </svg>
  );
}

function IconEnterprise() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8m-4-4v4" />
      <path d="M7 8h2m4 0h2M7 11h2m4 0h2" />
    </svg>
  );
}

function IconSupplyChain() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5" cy="17" r="2" />
      <circle cx="12" cy="7" r="2" />
      <circle cx="19" cy="17" r="2" />
      <path d="M7 17h5m2 0h3" />
      <path d="M12 9v6" />
      <path d="M5.5 15.5l5-7" />
      <path d="M18.5 15.5l-5-7" />
    </svg>
  );
}

function IconManufacturing() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 20v-8l5-5 5 5V20H2z" />
      <path d="M12 20V10l5-5 5 5v10H12z" />
      <line x1="2" y1="20" x2="22" y2="20" />
    </svg>
  );
}

function IconRetail() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

function IconMunicipal() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18" />
      <path d="M12 3l9 6H3l9-6z" />
      <line x1="5" y1="9" x2="5" y2="21" />
      <line x1="19" y1="9" x2="19" y2="21" />
      <rect x="9" y="13" width="6" height="8" />
    </svg>
  );
}

function IconInfrastructure() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="14" width="4" height="6" />
      <rect x="10" y="8" width="4" height="12" />
      <rect x="18" y="4" width="4" height="16" />
      <path d="M2 20h20" />
    </svg>
  );
}

function IconPolicyResearch() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="11" y1="8" x2="11" y2="14" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  );
}

function IconDefense() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.35C16.5 22.15 20 17.25 20 12V6l-8-4z" />
    </svg>
  );
}

// ─── Profile data ─────────────────────────────────────────────────────────────

const PROFILES: ProfileMap = {
  user: [
    {
      id: "personal-finance",
      label: "Personal Finance",
      description: "For individuals who want to forecast personal income, savings, and living expenses to project their financial future.",
      highlights: [
        "Monthly Income: $6,000.00",
        "Monthly Growth Rate: 1.50%",
        "Forecast Period: 12 months",
      ],
      Icon: IconPersonalFinance,
    },
    {
      id: "small-business",
      label: "Small Business",
      description: "For local or established businesses to model your cash flow, operating costs, and profit margins over time.",
      highlights: [
        "Monthly Revenue: $20,000.00",
        "Monthly Growth Rate: 4.00%",
        "Monthly Payroll: $8,000.00",
      ],
      Icon: IconSmallBusiness,
    },
    {
      id: "freelancer",
      label: "Freelancer",
      description: "For handling project-based income to forecast future finance decisions, great for planning payment gaps and annual earning potential.",
      highlights: [
        "Monthly Revenue: $3,500.00",
        "Monthly Growth Rate: 5.00%",
        "Forecast Period: 12 months",
      ],
      Icon: IconFreelancer,
    },
    {
      id: "startup-founder",
      label: "Not Sure? Start Here",
      description: "Not sure which profile fits you – or want to explore how financial forecasting works?\nStart with a blank profile and set your own figures.",
      Icon: IconStartup,
    },
  ],
  industry: [
    {
      id: "enterprise-analytics",
      label: "Enterprise Analytics",
      description: "Large-scale revenue modelling and operational KPI tracking.",
      Icon: IconEnterprise,
    },
    {
      id: "supply-chain",
      label: "Supply Chain",
      description: "Cost, logistics, and supplier forecasting across the chain.",
      Icon: IconSupplyChain,
    },
    {
      id: "manufacturing",
      label: "Manufacturing",
      description: "Production capacity, COGS, and throughput optimisation.",
      Icon: IconManufacturing,
    },
    {
      id: "retail-operations",
      label: "Retail Operations",
      description: "Sales, inventory, and margin analysis for retail channels.",
      Icon: IconRetail,
    },
  ],
  government: [
    {
      id: "municipal-budget",
      label: "Municipal Budget",
      description: "Plan and monitor council revenues, grants, and expenditure.",
      Icon: IconMunicipal,
    },
    {
      id: "public-infrastructure",
      label: "Public Infrastructure",
      description: "Capital project cost modelling and lifecycle forecasting.",
      Icon: IconInfrastructure,
    },
    {
      id: "policy-research",
      label: "Policy Research",
      description: "Scenario analysis to assess the financial impact of policy.",
      Icon: IconPolicyResearch,
    },
    {
      id: "defense-spending",
      label: "Defense & Security",
      description: "Budget allocation and spend projection for defence programs.",
      Icon: IconDefense,
    },
  ],
};

const ACCOUNT_LABELS: Record<AccountType, string> = {
  user: "User",
  industry: "Industry",
  government: "Government",
};

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  accountType: AccountType;
  onSelect: (profileId: string) => void;
  onBack: () => void;
}

export default function ProfileSelector({ accountType, onSelect, onBack }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const profiles = PROFILES[accountType];

  function handleSelect(id: string) {
    setSelected(id);
    setTimeout(() => onSelect(id), 180);
  }

  return (
    <div className="h-full flex items-center justify-center font-sans">
      <div className="bg-white/30 backdrop-blur-[18px] rounded-[28px] border-2 border-white/70 shadow-[0_8px_48px_rgba(120,100,180,0.10)] py-8 px-[52px] w-fit max-w-[calc(100vw-48px)] flex flex-col items-center">

        {/* Badge */}
        <div className="bg-primary/20 border border-primary/40 rounded-[6px] px-3.5 py-1 text-[12px] font-bold tracking-[0.1em] text-primary uppercase mb-4">
          ElectraWireless — Business Console
        </div>

        {/* Heading */}
        <h1 className="text-[26px] font-extrabold text-foreground text-center leading-tight mb-1.5">
          Select a Profile
        </h1>

        {/* Subtitle */}
        <p className="text-sm text-muted-foreground text-center mb-6">
          Choose a profile that best describes your{" "}
          <span className="text-primary font-semibold">{ACCOUNT_LABELS[accountType]}</span>{" "}
          use case.
        </p>

        {/* Profile cards */}
        <div className="grid grid-cols-2 gap-4 w-full max-w-[640px]">
          {profiles.map(({ id, label, description, highlights, Icon }) => {
            const isSelected = selected === id;
            return (
              <button
                key={id}
                onClick={() => handleSelect(id)}
                className={cn(
                  "group border-2 rounded-2xl p-5 cursor-pointer flex flex-col items-start gap-3 text-left",
                  "transition-all duration-200 outline-none",
                  "hover:border-primary/85 hover:-translate-y-[2px] hover:shadow-[0_0_24px_rgba(47,36,133,0.18)]",
                  isSelected
                    ? "bg-[rgba(200,195,235,0.30)] border-primary/85 -translate-y-[2px] shadow-[0_0_24px_rgba(47,36,133,0.18)]"
                    : "bg-white/30 border-white/80 hover:bg-[rgba(230,225,250,0.30)]"
                )}
              >
                {/* Icon + Label */}
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "transition-[color,opacity] duration-200 flex-shrink-0",
                      isSelected
                        ? "text-primary opacity-100"
                        : "text-[#5a5878] opacity-60 group-hover:text-primary group-hover:opacity-100"
                    )}
                  >
                    <Icon />
                  </span>
                  <span className="text-[17px] font-bold text-foreground leading-snug">
                    {label}
                  </span>
                </div>

                {/* Description */}
                <span className="text-[13px] text-muted-foreground leading-relaxed whitespace-pre-line">
                  {description}
                </span>

                {/* Highlights */}
                {highlights && (
                  <ul className="mt-1 flex flex-col gap-1">
                    {highlights.map((point) => (
                      <li key={point} className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                        <span className="w-1 h-1 rounded-full bg-primary/50 flex-shrink-0" />
                        {point}
                      </li>
                    ))}
                  </ul>
                )}
              </button>
            );
          })}
        </div>

        {/* Back link */}
        <button
          onClick={onBack}
          className="mt-5 text-sm text-muted-foreground hover:text-primary transition-colors duration-150 underline underline-offset-2 cursor-pointer"
        >
          ← Back to account selection
        </button>
      </div>
    </div>
  );
}
