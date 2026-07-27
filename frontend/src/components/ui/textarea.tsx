import { forwardRef, type TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, invalid, ...props }, ref) => (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        "border-input bg-card text-foreground placeholder:text-muted-foreground focus-visible:border-ring flex min-h-20 w-full rounded-md border px-3 py-2 text-sm shadow-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        invalid && "border-destructive",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";

export { Textarea };
