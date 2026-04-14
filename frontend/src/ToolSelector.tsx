export type ToolKey = "projection" | "personal";

interface Props {
  onSelect: (tool: ToolKey) => void;
  onBack: () => void;
}

function IconProjection() {
  return (
    <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

function IconPersonalFinance() {
  return (
    <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

function IconInvestment() {
  return (
    <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

const TOOLS = [
  {
    key: "projection",
    label: "Financial Projection Engine",
    description: "Model revenue, costs, and growth scenarios with AI-powered forecasting.",
    Icon: IconProjection,
    available: true,
  },
  {
    key: "personal",
    label: "Personal Financial Intelligence",
    description: "Track, analyse, and optimise your personal finances with ELLY.",
    Icon: IconPersonalFinance,
    available: true,
  },
  {
    key: "investment",
    label: "Investment Intelligence",
    description: "Research markets, screen assets, and build smarter portfolios.",
    Icon: IconInvestment,
    available: false,
  },
] as const;

export default function ToolSelector({ onSelect, onBack }: Props) {
  return (
    <div className="min-h-screen flex items-center justify-center font-sans">
      <div className="bg-white/30 backdrop-blur-[18px] rounded-[28px] border-2 border-white/70 shadow-[0_8px_48px_rgba(120,100,180,0.10)] p-[52px] w-fit max-w-[calc(100vw-48px)] flex flex-col items-center">

        {/* Badge */}
        <div className="bg-primary/20 border border-primary/40 rounded-[6px] px-3.5 py-1 text-[12px] font-bold tracking-[0.1em] text-primary uppercase mb-6">
          ElectraWireless — Business Console
        </div>

        {/* Heading */}
        <h1 className="text-[36px] font-extrabold text-foreground text-center leading-tight mb-2">
          Choose Your Tool
        </h1>
        <p className="text-base text-muted-foreground text-center mb-12">
          Select a product to get started. More coming soon.
        </p>

        {/* Tool cards */}
        <div className="flex gap-5 justify-center flex-wrap">
          {TOOLS.map(({ key, label, description, Icon, available }) => (
            <button
              key={key}
              onClick={available ? () => onSelect(key as ToolKey) : undefined}
              disabled={!available}
              className={[
                "group border-2 rounded-2xl p-7 flex flex-col items-center text-center gap-4",
                "w-56 transition-all duration-200 outline-none relative",
                available
                  ? "cursor-pointer hover:border-primary/85 hover:-translate-y-[3px] hover:shadow-[0_0_24px_rgba(47,36,133,0.20)] bg-white/30 border-white/80 hover:bg-[rgba(230,225,250,0.30)]"
                  : "cursor-not-allowed bg-white/15 border-white/40 opacity-60",
              ].join(" ")}
            >
              {/* Coming soon badge */}
              {!available && (
                <div
                  className="absolute top-3 right-3 text-[9px] font-bold tracking-[0.1em] uppercase px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: "rgba(47,36,133,0.10)", color: "hsl(247 57% 45%)", border: "1px solid rgba(47,36,133,0.20)" }}
                >
                  Soon
                </div>
              )}

              {/* Icon */}
              <span
                className={[
                  "transition-[color,opacity] duration-200",
                  available
                    ? "text-[#5a5878] opacity-60 group-hover:text-primary group-hover:opacity-100"
                    : "text-[#5a5878] opacity-30",
                ].join(" ")}
              >
                <Icon />
              </span>

              {/* Label */}
              <span className={["text-[15px] font-bold leading-snug", available ? "text-foreground" : "text-muted-foreground"].join(" ")}>
                {label}
              </span>

              {/* Description */}
              <span className="text-[12px] text-muted-foreground leading-relaxed">
                {description}
              </span>
            </button>
          ))}
        </div>

        {/* Back link */}
        <button
          onClick={onBack}
          className="mt-10 text-sm text-muted-foreground hover:text-foreground transition-colors duration-150 underline underline-offset-4"
        >
          ← Back
        </button>
      </div>
    </div>
  );
}
