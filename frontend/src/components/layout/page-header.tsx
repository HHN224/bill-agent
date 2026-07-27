import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="flex items-center gap-2.5 text-2xl font-extrabold tracking-tight">
          <span
            aria-hidden
            className="bg-primary shadow-pop-sm inline-block size-3 rotate-45 rounded-[2px]"
          />
          {title}
        </h1>
        {description ? (
          <p className="text-muted-foreground mt-1.5 text-sm">{description}</p>
        ) : null}
      </div>
      {actions}
    </div>
  );
}
