import { C_ERROR } from "@/lib/colors";

interface BreakevenBarProps {
  breakevenMonth: number | null;
  forecastMonths: number;
}

export function BreakevenBar({ breakevenMonth, forecastMonths }: BreakevenBarProps) {
  const pct = breakevenMonth !== null
    ? Math.min((breakevenMonth / forecastMonths) * 100, 100)
    : 100;

  const label = breakevenMonth !== null
    ? `Estimated break-even: Month ${breakevenMonth}`
    : "Not reached within forecast";

  return (
    <div>
      <div className="text-[11px] text-muted-foreground mb-1.5 font-medium tracking-[0.05em] uppercase">
        Cash runway to break-even
      </div>
      <div className="h-1.5 rounded-full bg-border overflow-hidden">
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{
            width: `${pct}%`,
            backgroundColor: breakevenMonth !== null ? "hsl(var(--primary))" : C_ERROR,
          }}
        />
      </div>
      <div className="text-[11px] text-muted-foreground mt-1.5">{label}</div>
    </div>
  );
}
