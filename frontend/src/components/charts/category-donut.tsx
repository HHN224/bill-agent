import { ChartPie } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import type { CategoryAmount } from "@/api/types";
import { EmptyState } from "@/components/empty-state";
import { CATEGORY_COLORS } from "@/lib/constants";
import { formatAmount } from "@/lib/money";

interface CategoryDonutProps {
  categories: CategoryAmount[];
  total: number;
}

/** 支出分类环形图，中心显示总支出，右侧为分类明细。 */
export function CategoryDonut({ categories, total }: CategoryDonutProps) {
  if (categories.length === 0 || total <= 0) {
    return (
      <EmptyState
        icon={ChartPie}
        title="暂无分类数据"
        description="本月还没有支出分类可展示。"
      />
    );
  }

  const data = categories.map((item) => ({
    name: item.category,
    value: item.amount,
  }));

  return (
    <div className="flex flex-col items-center gap-6">
      <div
        className="relative h-52 w-52 shrink-0"
        role="img"
        aria-label="本月支出分类环形图"
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) {
                  return null;
                }
                const item = payload[0];
                return (
                  <div className="border-border bg-card rounded-md border-2 px-3 py-2 text-sm shadow-pop-sm">
                    <p className="text-muted-foreground">{item.name}</p>
                    <p className="tnum font-medium">
                      {formatAmount(Number(item.value))}
                    </p>
                  </div>
                );
              }}
            />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="68%"
              outerRadius="100%"
              paddingAngle={2}
              strokeWidth={0}
            >
              {data.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={
                    CATEGORY_COLORS[entry.name as keyof typeof CATEGORY_COLORS]
                  }
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-muted-foreground text-xs">本月支出</span>
          <span className="tnum text-lg font-semibold">
            {formatAmount(total)}
          </span>
        </div>
      </div>
      <ul className="w-full min-w-0 flex-1 space-y-1.5">
        {categories.map((item) => {
          const percent = Math.round((item.amount / total) * 100);
          return (
            <li
              key={item.category}
              className="flex items-center gap-2.5 text-sm"
            >
              <span
                aria-hidden
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: CATEGORY_COLORS[item.category] }}
              />
              <span className="min-w-0 flex-1 truncate">{item.category}</span>
              <span className="tnum text-muted-foreground">{percent}%</span>
              <span className="tnum w-24 text-right font-medium">
                {formatAmount(item.amount)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
