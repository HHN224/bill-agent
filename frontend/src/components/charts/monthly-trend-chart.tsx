import { BarChart3 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
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
}

/** 月度每日支出柱状图；无支出日期不补零，保持数据诚实。 */
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

  const data: TrendDatum[] = dailyTotals.map((item) => {
    const day = Number(item.date.slice(8, 10));
    return {
      day,
      label: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      amount: item.amount,
    };
  });

  return (
    <div className="h-64 w-full" role="img" aria-label="本月每日支出柱状图">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid
            vertical={false}
            stroke="var(--color-border)"
            strokeDasharray="3 3"
          />
          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
            tickMargin={6}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={48}
            tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
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
              const datum = payload[0].payload as TrendDatum;
              return (
                <div className="border-border bg-card rounded-md border px-3 py-2 text-sm shadow-md">
                  <p className="text-muted-foreground">{datum.label}</p>
                  <p className="tnum font-medium">
                    支出 {formatAmount(datum.amount)}
                  </p>
                </div>
              );
            }}
          />
          <Bar
            dataKey="amount"
            fill="var(--color-primary)"
            radius={[3, 3, 0, 0]}
            maxBarSize={28}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
