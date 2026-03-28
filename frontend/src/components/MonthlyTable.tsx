import { MonthRow, formatCurrency } from "@/lib/projection";

interface MonthlyTableProps {
  data: MonthRow[];
  forecastMonths: number;
}

export function MonthlyTable({ data, forecastMonths }: MonthlyTableProps) {
  const visible = data.slice(0, 6);
  const remaining = forecastMonths - 6;

  const thStyle: React.CSSProperties = {
    fontSize: "11px",
    color: "#555",
    fontWeight: 500,
    textAlign: "left",
    padding: "8px 10px",
    borderBottom: "1px solid #1a1a24",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  };
  const tdStyle: React.CSSProperties = {
    fontSize: "12.5px",
    padding: "9px 10px",
    borderBottom: "1px solid #131320",
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={thStyle}>Month</th>
            <th style={thStyle}>Revenue</th>
            <th style={thStyle}>Expenses</th>
            <th style={thStyle}>Gross Margin</th>
            <th style={thStyle}>Net Profit</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((row) => (
            <tr key={row.month} style={{ transition: "background 0.1s" }}>
              <td style={{ ...tdStyle, color: "#888" }}>M{row.month}</td>
              <td style={{ ...tdStyle, color: "#C9A84C" }}>{formatCurrency(row.revenue)}</td>
              <td style={{ ...tdStyle, color: "#E24B4A" }}>{formatCurrency(row.expenses)}</td>
              <td style={{ ...tdStyle, color: "#aaa" }}>{row.grossMargin.toFixed(1)}%</td>
              <td
                style={{
                  ...tdStyle,
                  color: row.netProfit >= 0 ? "#1D9E75" : "#E24B4A",
                  fontWeight: 600,
                }}
              >
                {formatCurrency(row.netProfit)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {forecastMonths > 6 && remaining > 0 && (
        <div
          style={{
            textAlign: "center",
            fontSize: "11px",
            color: "#444",
            padding: "10px",
            borderTop: "1px solid #131320",
          }}
        >
          … {remaining} more months — export to see full table
        </div>
      )}
    </div>
  );
}
