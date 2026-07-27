import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="border-border bg-card/50 flex flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-12 text-center">
      <Icon aria-hidden className="text-muted-foreground size-6" />
      <div>
        <p className="font-medium">{title}</p>
        {description ? (
          <p className="text-muted-foreground mt-1 text-sm">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
