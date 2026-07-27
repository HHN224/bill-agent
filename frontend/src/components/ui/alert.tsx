import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const alertVariants = cva("rounded-md border px-4 py-3 text-sm", {
  variants: {
    variant: {
      default: "border-border bg-card text-foreground",
      destructive: "border-destructive/40 bg-destructive/5 text-foreground",
      info: "border-border bg-muted/60 text-foreground",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export interface AlertProps
  extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof alertVariants> {}

function Alert({ className, variant, role = "alert", ...props }: AlertProps) {
  return (
    <div
      role={role}
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

function AlertTitle({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("mb-1 font-medium", className)} {...props} />;
}

function AlertDescription({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-muted-foreground", className)} {...props} />;
}

export { Alert, AlertDescription, AlertTitle };
