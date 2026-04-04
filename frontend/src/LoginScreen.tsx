import { useState } from "react";
import { AccountType } from "@/store/projectionStore";

interface Props {
  onSelect: (type: AccountType) => void;
}

function IconUser() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}

function IconIndustry() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="1" />
      <path d="M9 22V12h6v10" />
      <rect x="7" y="6" width="3" height="3" />
      <rect x="14" y="6" width="3" height="3" />
    </svg>
  );
}

function IconGovernment() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18" />
      <path d="M12 3l9 6H3l9-6z" />
      <line x1="6" y1="9" x2="6" y2="18" />
      <line x1="12" y1="9" x2="12" y2="18" />
      <line x1="18" y1="9" x2="18" y2="18" />
    </svg>
  );
}

const ACCOUNT_TYPES: { type: AccountType; label: string; Icon: () => React.ReactElement }[] = [
  { type: "user",       label: "User",       Icon: IconUser       },
  { type: "industry",   label: "Industry",   Icon: IconIndustry   },
  { type: "government", label: "Government", Icon: IconGovernment },
];

export default function LoginScreen({ onSelect }: Props) {
  const [selected, setSelected] = useState<AccountType | null>(null);

  function handleSelect(type: AccountType) {
    setSelected(type);
    setTimeout(() => onSelect(type), 180);
  }

  return (
    <div className="min-h-screen flex items-center justify-center font-sans">
      {/* Main card */}
      <div className="bg-white/30 backdrop-blur-[18px] rounded-[28px] border-2 border-white/70 shadow-[0_8px_48px_rgba(120,100,180,0.10)] p-[52px] w-fit max-w-[calc(100vw-48px)] flex flex-col items-center">

        {/* Badge */}
        <div className="bg-primary/20 border border-primary/40 rounded-[6px] px-3.5 py-1 text-[12px] font-bold tracking-[0.1em] text-primary uppercase mb-6">
          ElectraWireless — Business Console
        </div>

        {/* Heading */}
        <h1 className="text-[36px] font-extrabold text-foreground text-center leading-tight mb-2">
          Enter Your Account Details
        </h1>

        {/* Subtitle */}
        <p className="text-base text-muted-foreground text-center mb-12">
          Select your account type to continue.
        </p>

        {/* Account type cards */}
        <div className="flex gap-5 justify-center">
          {ACCOUNT_TYPES.map(({ type, label, Icon }) => {
            const isSelected = selected === type;
            return (
              <button
                key={type}
                onClick={() => handleSelect(type)}
                className={[
                  "group border-2 rounded-2xl p-0 cursor-pointer flex flex-col items-center justify-center gap-3",
                  "w-48 h-44 transition-all duration-200 outline-none",
                  "hover:border-primary/85 hover:-translate-y-[3px] hover:shadow-[0_0_24px_rgba(47,36,133,0.20)]",
                  isSelected
                    ? "bg-[rgba(200,195,235,0.30)] border-primary/85 -translate-y-[3px] shadow-[0_0_24px_rgba(47,36,133,0.20)]"
                    : "bg-white/30 border-white/80 hover:bg-[rgba(230,225,250,0.30)]",
                ].join(" ")}
              >
                <span
                  className={[
                    "transition-[color,opacity] duration-200",
                    isSelected
                      ? "text-primary opacity-100"
                      : "text-[#5a5878] opacity-60 group-hover:text-primary group-hover:opacity-100",
                  ].join(" ")}
                >
                  <Icon />
                </span>
                <span className="text-xl font-bold text-foreground">
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
