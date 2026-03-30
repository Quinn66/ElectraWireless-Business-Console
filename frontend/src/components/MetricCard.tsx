interface MetricCardProps {
  label: string;
  value: string;
  subtext?: string;
  valueColor?: string;
}

export function MetricCard({ label, value, subtext, valueColor }: MetricCardProps) {
  return (
    <div
      style={{
        backgroundColor: "#12121A",
        border: "1px solid #1e1e2a",
        borderRadius: "10px",
        padding: "16px 18px",
        flex: 1,
        minWidth: 0,
      }}
    >
      <div style={{ fontSize: "11px", color: "#666", fontWeight: 500, letterSpacing: "0.06em", marginBottom: "6px", textTransform: "uppercase" }}>
        {label}
      </div>
      <div
        style={{
          fontSize: "22px",
          fontWeight: 600,
          color: valueColor ?? "#f0f0f0",
          lineHeight: 1.2,
          marginBottom: "4px",
        }}
      >
        {value}
      </div>
      {subtext && (
        <div style={{ fontSize: "11px", color: "#555" }}>{subtext}</div>
      )}
    </div>
  );
}
