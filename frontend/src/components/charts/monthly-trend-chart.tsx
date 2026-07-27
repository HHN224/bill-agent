import { BarChart3 } from "lucide-react";
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

import type { DailyAmount } from "@/api/types";
import { EmptyState } from "@/components/empty-state";
import { formatAmount } from "@/lib/money";

interface MonthlyTrendChartProps {
  dailyTotals: DailyAmount[];
  year: number;
  month: number;
}

interface TrendDatum {
  day: number;
  label: string;
  amount: number;
  cumulative: number;
}

/** 月度每日支出柱状图 + 累计支出折线；无支出日期不补零，保持数据诚实。 */
export function MonthlyTrendChart({
  dailyTotals,
  year,
  month,
}: MonthlyTrendChartProps) {
  if (dailyTotals.length === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title="本月还没有支出"
        description="记录第一笔支出后，这里会展示每日支出趋势。"
      />
    );
  }

  let runningTotal = 0;
  const data: TrendDatum[] = dailyTotals.map((item) => {
    const day = Number(item.date.slice(8, 10));
    runningTotal += item.amount;
    return {
      day,
      label: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      amount: item.amount,
      cumulative: Math.round(runningTotal * 100) / 100,
    };
  });

  return (
    <div className="flex flex-col gap-3">
      <div
        className="h-64 w-full"
        role="img"
        aria-label="本月每日支出与累计支出图"
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
          >
            <CartesianGrid
              vertical={false}
              stroke="var(--color-border)"
              strokeDasharray="3 3"
            />
            <XAxis
              dataKey="day"
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
              yAxisId="left"
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
            {/* 累计折线使用独立的隐藏右轴，避免压缩每日柱形。 */}
            <YAxis yAxisId="right" orientation="right" hide />
            <Tooltip
              cursor={{ fill: "var(--color-muted)", opacity: 0.5 }}
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) {
                  return null;
                }
                const datum = payload[0].payload as TrendDatum;
                return (
                  <div className="border-border bg-card rounded-md border-2 px-3 py-2 text-sm shadow-pop-sm">
                    <p className="text-muted-foreground tnum">{datum.label}</p>
                    <p className="tnum mt-0.5 font-medium">
                      支出 {formatAmount(datum.amount)}
                    </p>
                    <p className="tnum text-muted-foreground">
                      累计 {formatAmount(datum.cumulative)}
                    </p>
                  </div>
                );
              }}
            />
            <Bar
              yAxisId="left"
              dataKey="amount"
              fill="var(--color-pop-mustard)"
              radius={[3, 3, 0, 0]}
              maxBarSize={28}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="cumulative"
              stroke="var(--color-pop-teal)"
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <ul className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <li className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="size-2 rounded-full bg-pop-mustard"
          />
          每日支出
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="size-2 rounded-full bg-pop-teal" />
          累计支出
        </li>
      </ul>
    </div>
  );
}
