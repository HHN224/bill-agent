import { useId, type ReactNode } from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: (props: { id: string; describedBy?: string }) => ReactNode;
  className?: string;
}

/**
 * 表单字段包装：关联 label / 控件 / 错误描述，
 * 错误通过 aria-describedby 暴露给读屏。
 */
export function Field({
  label,
  error,
  hint,
  required,
  children,
  className,
}: FieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={id}>
        {label}
        {required ? (
          <span className="text-destructive ml-0.5" aria-hidden>
            *
          </span>
        ) : null}
      </Label>
      {children({ id, describedBy })}
      {error ? (
        <p id={errorId} role="alert" className="text-destructive text-xs">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-muted-foreground text-xs">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
