import { Coins } from "lucide-react";

import type { CategoryAmount } from "@/api/types";
import { EmptyState } from "@/components/empty-state";
import { CATEGORY_COLORS } from "@/lib/constants";
import { formatAmount } from "@/lib/money";

interface DailyCategoryBarsProps {
  categories: CategoryAmount[];
  total: number;
}

/** 今日支出分类横向条形图：与月度环形图互补，聚焦当天。 */
export function DailyCategoryBars({ categories, total }: DailyCategoryBarsProps) {
  if (categories.length === 0 || total <= 0) {
    return (
      <EmptyState
        icon={Coins}
        title="今日还没有支出"
        description="记录今天的支出后，这里会展示分类构成。"
      />
    );
  }

  const maxAmount = Math.max(...categories.map((item) => item.amount));

  return (
    <ul className="flex flex-col gap-3.5">
      {categories.map((item) => {
        const widthPercent = Math.max((item.amount / maxAmount) * 100, 2);
        return (
          <li key={item.category} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate">{item.category}</span>
              <span className="tnum text-muted-foreground shrink-0">
                {formatAmount(item.amount)}
              </span>
            </div>
            <div
              role="img"
              aria-label={`${item.category} ${formatAmount(item.amount)}`}
              className="bg-muted h-2.5 overflow-hidden rounded-full"
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${widthPercent}%`,
                  backgroundColor: CATEGORY_COLORS[item.category],
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
