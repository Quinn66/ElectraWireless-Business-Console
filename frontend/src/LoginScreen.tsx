import { useState } from "react";
import { AccountType } from "@/store/projectionStore";

interface Props {
  onSelect: (type: AccountType) => void;
}


function IconUser() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}

function IconIndustry() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="1" />
      <path d="M9 22V12h6v10" />
      <rect x="7" y="6" width="3" height="3" />
      <rect x="14" y="6" width="3" height="3" />
    </svg>
  );
}

function IconGovernment() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18" />
      <path d="M12 3l9 6H3l9-6z" />
      <line x1="6" y1="9" x2="6" y2="18" />
      <line x1="12" y1="9" x2="12" y2="18" />
      <line x1="18" y1="9" x2="18" y2="18" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

const ACCOUNT_TYPES: { type: AccountType; label: string; description: string; Icon: () => React.ReactElement }[] = [
  { type: "user",       label: "User",       description: "Personal wellness, daily insights & lifestyle.",      Icon: IconUser       },
  { type: "industry",   label: "Industry",   description: "Analytics, operations & enterprise tools.",            Icon: IconIndustry   },
  { type: "government", label: "Government", description: "Policy, monitoring & public intelligence.",            Icon: IconGovernment },
];

export default function LoginScreen({ onSelect }: Props) {
  const [selected, setSelected] = useState<AccountType | null>(null);

  function handleConfirm() {
    if (selected) onSelect(selected);
  }

  return (
    <div className="min-h-screen flex items-center justify-center font-sans">
      {/* Main card */}
      <div className="bg-white/40 backdrop-blur-[18px] rounded-[28px] border border-white/70 shadow-[0_8px_48px_rgba(120,100,180,0.15)] px-10 py-10 w-[380px] max-w-[calc(100vw-48px)] flex flex-col items-center gap-0">

        {/* Logo */}
        <div className="mb-4">
          <img src="/ElectraWireless Logo2.png" alt="ElectraWireless" className="w-24 h-24 object-contain" />
        </div>

        {/* Title */}
        <h1 className="text-[26px] font-extrabold text-foreground text-center leading-tight mb-1">
          ElectraWireless
        </h1>

        {/* Subtitle */}
        <p className="text-sm text-muted-foreground text-center mb-7">
          Choose your intelligent pathway
        </p>

        {/* Account type list */}
        <div className="flex flex-col gap-3 w-full mb-7">
          {ACCOUNT_TYPES.map(({ type, label, description, Icon }) => {
            const isSelected = selected === type;
            return (
              <button
                key={type}
                onClick={() => setSelected(type)}
                className={[
                  "flex items-center gap-3 w-full rounded-full px-4 py-3 border-2 cursor-pointer",
                  "transition-all duration-150 outline-none text-left",
                  isSelected
                    ? "border-primary bg-white/50 shadow-[0_0_0_3px_rgba(100,80,200,0.12)]"
                    : "border-white/60 bg-white/25 hover:border-primary/40 hover:bg-white/40",
                ].join(" ")}
              >
                {/* Icon circle */}
                <span className={[
                  "flex items-center justify-center rounded-full w-9 h-9 shrink-0 transition-colors duration-150",
                  isSelected ? "bg-primary/20 text-primary" : "bg-white/50 text-[#5a5878]",
                ].join(" ")}>
                  <Icon />
                </span>

                {/* Text */}
                <span className="flex flex-col flex-1 min-w-0">
                  <span className="text-sm font-bold text-foreground leading-tight">{label}</span>
                  <span className="text-xs text-muted-foreground leading-snug mt-0.5">{description}</span>
                </span>

                {/* Checkmark */}
                <span className={[
                  "flex items-center justify-center rounded-full w-5 h-5 shrink-0 transition-all duration-150",
                  isSelected ? "bg-primary opacity-100" : "opacity-0",
                ].join(" ")}>
                  <IconCheck />
                </span>
              </button>
            );
          })}
        </div>

        {/* Confirm button */}
        <button
          onClick={handleConfirm}
          disabled={!selected}
          className={[
            "w-full rounded-full py-3 text-sm font-bold tracking-wide transition-all duration-150",
            selected
              ? "bg-primary text-white shadow-[0_4px_16px_rgba(80,60,180,0.30)] hover:opacity-90 cursor-pointer"
              : "bg-primary/30 text-white/60 cursor-not-allowed",
          ].join(" ")}
        >
          Confirm
        </button>
      </div>
    </div>
  );
}
