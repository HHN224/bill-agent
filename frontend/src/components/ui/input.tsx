import { forwardRef, type InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, ...props }, ref) => (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        "border-input bg-card text-foreground placeholder:text-muted-foreground focus-visible:border-ring flex h-9 w-full rounded-md border px-3 text-sm shadow-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        invalid && "border-destructive",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input };
