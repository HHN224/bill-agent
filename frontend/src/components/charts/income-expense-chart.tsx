import { TrendingUp } from "lucide-react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { EmptyState } from "@/components/empty-state";
import { formatAmount } from "@/lib/money";

export interface IncomeExpensePoint {
  label: string;
  fullLabel: string;
  expense: number;
  income: number;
  net: number;
}

interface IncomeExpenseChartProps {
  points: IncomeExpensePoint[];
}

const SERIES = [
  { key: "expense", name: "支出", color: "var(--color-pop-coral)" },
  { key: "income", name: "收入", color: "var(--color-pop-green)" },
  { key: "net", name: "净额", color: "var(--color-pop-mustard)" },
] as const;

/** 近六个月收支对比：支出/收入分组柱状 + 净额折线。 */
export function IncomeExpenseChart({ points }: IncomeExpenseChartProps) {
  const hasData = points.some(
    (point) => point.expense !== 0 || point.income !== 0,
  );
  if (points.length === 0 || !hasData) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="暂无收支数据"
        description="记录交易后，这里会展示近六个月的收支对比。"
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="h-64 w-full" role="img" aria-label="近六个月收支对比图">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={points}
            margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
            barCategoryGap="28%"
          >
            <CartesianGrid
              vertical={false}
              stroke="var(--color-border)"
              strokeDasharray="3 3"
            />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{
                fontSize: 12,
                fill: "var(--color-muted-foreground)",
                fontFamily: "var(--font-mono)",
              }}
              tickMargin={6}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={48}
              tick={{
                fontSize: 12,
                fill: "var(--color-muted-foreground)",
                fontFamily: "var(--font-mono)",
              }}
              tickFormatter={(value: number) =>
                value >= 10000 ? `${(value / 10000).toFixed(1)}万` : String(value)
              }
            />
            <Tooltip
              cursor={{ fill: "var(--color-muted)", opacity: 0.5 }}
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) {
                  return null;
                }
                const datum = payload[0].payload as IncomeExpensePoint;
                return (
                  <div className="border-border bg-card rounded-md border-2 px-3 py-2 text-sm shadow-pop-sm">
                    <p className="text-muted-foreground tnum">
                      {datum.fullLabel}
                    </p>
                    {SERIES.map((series) => (
                      <p
                        key={series.key}
                        className="mt-0.5 flex items-center gap-1.5"
                      >
                        <span
                          aria-hidden
                          className="size-2 rounded-full"
                          style={{ backgroundColor: series.color }}
                        />
                        <span className="text-muted-foreground">
                          {series.name}
                        </span>
                        <span className="tnum ml-auto pl-3 font-medium">
                          {formatAmount(datum[series.key])}
                        </span>
                      </p>
                    ))}
                  </div>
                );
              }}
            />
            <Bar
              dataKey="expense"
              fill="var(--color-pop-coral)"
              radius={[3, 3, 0, 0]}
              maxBarSize={20}
            />
            <Bar
              dataKey="income"
              fill="var(--color-pop-green)"
              radius={[3, 3, 0, 0]}
              maxBarSize={20}
            />
            <Line
              type="monotone"
              dataKey="net"
              stroke="var(--color-pop-mustard)"
              strokeWidth={2}
              dot={{
                r: 2.5,
                fill: "var(--color-pop-mustard)",
                strokeWidth: 0,
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <ul className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {SERIES.map((series) => (
          <li key={series.key} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="size-2 rounded-full"
              style={{ backgroundColor: series.color }}
            />
            {series.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
