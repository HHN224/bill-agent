import { ChevronDown } from "lucide-react";
import { forwardRef, type SelectHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

/**
 * 原生 select 的样式封装：保留完整键盘与读屏语义，
 * 不引入重型弹出层依赖。
 */
const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, invalid, children, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          "border-input bg-card text-foreground focus-visible:border-ring flex h-9 w-full appearance-none items-center rounded-md border py-0 pr-8 pl-3 text-sm shadow-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50",
          invalid && "border-destructive",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="text-muted-foreground pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2"
      />
    </div>
  ),
);
Select.displayName = "Select";

export { Select };
