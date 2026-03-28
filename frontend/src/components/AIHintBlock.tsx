import { useProjectionStore } from "@/store/projectionStore";

function getHintMessage(growthRate: number, churnRate: number): string {
  if (growthRate > 15) {
    return `Your growth rate of ${growthRate}% is ambitious — validate with at least 2 months of historical data before sharing with investors.`;
  }
  if (churnRate > 5) {
    return `Churn at ${churnRate}% is significantly offsetting your growth. Consider reviewing retention strategies before scaling acquisition spend.`;
  }
  if (churnRate <= 3 && growthRate >= 6 && growthRate <= 12) {
    return `Growth rate of ${growthRate}%/mo looks reasonable for early-stage SaaS. Churn at ${churnRate}% is well controlled.`;
  }
  return "Consider reviewing your acquisition channels to improve growth rate.";
}

export function AIHintBlock() {
  const { growthRate, churnRate } = useProjectionStore();
  const message = getHintMessage(growthRate, churnRate);

  return (
    <div
      style={{
        borderLeft: "2px solid #C9A84C",
        backgroundColor: "#12121A",
        padding: "10px 14px",
        borderRadius: "0 6px 6px 0",
      }}
    >
      <div style={{ fontSize: "10px", fontWeight: 600, color: "#C9A84C", letterSpacing: "0.08em", marginBottom: "4px" }}>
        AI INSIGHT
      </div>
      <p style={{ fontSize: "11.5px", color: "#aaa", lineHeight: 1.55, margin: 0 }}>
        {message}
      </p>
    </div>
  );
}
