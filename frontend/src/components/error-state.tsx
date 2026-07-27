import { CircleAlert } from "lucide-react";

import { ApiError, NetworkError } from "@/api/client";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  title?: string;
}

export function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof NetworkError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "发生未知错误。";
}

/** 请求失败展示：错误摘要 + 重试。 */
export function ErrorState({
  error,
  onRetry,
  title = "加载失败",
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="border-border bg-card flex flex-col items-center gap-3 rounded-lg border px-6 py-10 text-center"
    >
      <CircleAlert aria-hidden className="text-muted-foreground size-6" />
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-muted-foreground mt-1 text-sm">
          {describeError(error)}
        </p>
      </div>
      {onRetry ? (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          重试
        </Button>
      ) : null}
    </div>
  );
}
