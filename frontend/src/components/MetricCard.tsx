interface MetricCardProps {
  label: string;
  value: string;
  subtext?: string;
  valueColor?: string;
}

export function MetricCard({ label, value, subtext, valueColor }: MetricCardProps) {
  return (
    <div className="bg-white/60 backdrop-blur-sm border border-border rounded-[10px] p-4 flex-1 min-w-0">
      <div className="text-[11px] text-muted-foreground font-medium tracking-[0.06em] mb-1.5 uppercase">
        {label}
      </div>
      <div
        className="text-[22px] font-semibold leading-tight mb-1"
        style={{ color: valueColor ?? "hsl(var(--foreground))" }}
      >
        {value}
      </div>
      {subtext && (
        <div className="text-[11px] text-muted-foreground">{subtext}</div>
      )}
    </div>
  );
}
