import type { TransactionType } from "@/lib/constants";
import { formatAmount } from "@/lib/money";
import { cn } from "@/lib/utils";

interface AmountTextProps {
  type: TransactionType;
  amount: number;
  className?: string;
}

/** 金额展示：支出前置 −，收入前置 + 并使用绿色；等宽数字便于扫读。 */
export function AmountText({ type, amount, className }: AmountTextProps) {
  const sign = type === "income" ? "+" : "−";
  return (
    <span
      className={cn(
        "tnum font-medium whitespace-nowrap",
        type === "income" ? "text-success" : "text-foreground",
        className,
      )}
    >
      {sign}
      {formatAmount(amount)}
    </span>
  );
}
