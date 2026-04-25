import { MonthRow, formatCurrency } from "@/lib/projection";
import { C_SUCCESS, C_ERROR } from "@/lib/colors";

interface MonthlyTableProps {
  data: MonthRow[];
  forecastMonths: number;
}

export function MonthlyTable({ data, forecastMonths }: MonthlyTableProps) {
  const visible = data.slice(0, 6);
  const remaining = forecastMonths - 6;

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {["Month", "Revenue", "Expenses", "Gross Margin", "Net Profit"].map((h) => (
              <th
                key={h}
                className="text-[10.5px] text-muted-foreground font-semibold text-left px-3 py-2 border-b border-border tracking-[0.07em] uppercase bg-[rgb(239,237,252)]"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visible.map((row) => (
            <tr key={row.month} className="transition-colors hover:bg-primary/5">
              <td className="text-[12px] px-3 py-[7px] border-b border-border/50 text-muted-foreground">
                M{row.month}
              </td>
              <td className="text-[12px] px-3 py-[7px] border-b border-border/50 text-primary font-medium">
                {formatCurrency(row.revenue)}
              </td>
              <td className="text-[12px] px-3 py-[7px] border-b border-border/50" style={{ color: C_ERROR }}>
                {formatCurrency(row.expenses)}
              </td>
              <td className="text-[12px] px-3 py-[7px] border-b border-border/50 text-foreground/70">
                {row.grossMargin.toFixed(1)}%
              </td>
              <td
                className="text-[12px] px-3 py-[7px] border-b border-border/50 font-semibold"
                style={{ color: row.netProfit >= 0 ? C_SUCCESS : C_ERROR }}
              >
                {formatCurrency(row.netProfit)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {forecastMonths > 6 && remaining > 0 && (
        <div className="text-center text-[11px] text-muted-foreground/70 py-2.5 border-t border-border/50">
          … {remaining} more months — export to see full table
        </div>
      )}
    </div>
  );
}
