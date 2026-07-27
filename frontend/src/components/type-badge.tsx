import { Badge } from "@/components/ui/badge";
import { TYPE_LABELS, type TransactionType } from "@/lib/constants";

export function TypeBadge({ type }: { type: TransactionType }) {
  return (
    <Badge variant={type === "income" ? "income" : "expense"}>
      {TYPE_LABELS[type]}
    </Badge>
  );
}
