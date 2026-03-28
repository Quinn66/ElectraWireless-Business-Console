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
      <div style={{ fontSize: "11px", color: "#666", marginBottom: "6px", fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase" }}>
        Cash runway to break-even
      </div>
      <div
        style={{
          height: "6px",
          borderRadius: "3px",
          backgroundColor: "#1e1e2a",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            backgroundColor: breakevenMonth !== null ? "#C9A84C" : "#E24B4A",
            borderRadius: "3px",
            transition: "width 0.3s ease",
          }}
        />
      </div>
      <div style={{ fontSize: "11px", color: "#666", marginTop: "5px" }}>{label}</div>
    </div>
  );
}
