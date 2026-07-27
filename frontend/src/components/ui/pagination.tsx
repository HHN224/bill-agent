import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getPageItemRange, getTotalPages } from "@/lib/query-params";
import { cn } from "@/lib/utils";

interface PaginationProps {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
}

/** 生成带省略号的页码序列，如 [1, "…", 4, 5, 6, "…", 12]。 */
export function getPageItems(
  page: number,
  totalPages: number,
): (number | "ellipsis")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }
  const window = new Set<number>([
    1,
    2,
    page - 1,
    page,
    page + 1,
    totalPages - 1,
    totalPages,
  ]);
  const pages = [...window]
    .filter((item) => item >= 1 && item <= totalPages)
    .sort((a, b) => a - b);
  const items: (number | "ellipsis")[] = [];
  let previous = 0;
  for (const current of pages) {
    if (previous && current - previous > 1) {
      items.push("ellipsis");
    }
    items.push(current);
    previous = current;
  }
  return items;
}

export function Pagination({
  page,
  limit,
  total,
  onPageChange,
  className,
}: PaginationProps) {
  const totalPages = getTotalPages(total, limit);
  const { start, end } = getPageItemRange(page, limit, total);
  const items = getPageItems(page, totalPages);

  return (
    <nav
      aria-label="分页"
      className={cn(
        "flex flex-col items-center justify-between gap-3 sm:flex-row",
        className,
      )}
    >
      <p className="text-muted-foreground tnum text-sm" aria-live="polite">
        {total > 0 ? (
          <>
            第 {start}–{end} 条 / 共 {total} 条
          </>
        ) : (
          "共 0 条"
        )}
      </p>
      {totalPages > 1 ? (
        <div className="flex items-center gap-1">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="上一页"
          >
            <ChevronLeft aria-hidden />
            <span className="sr-only sm:not-sr-only">上一页</span>
          </Button>
          {items.map((item, index) =>
            item === "ellipsis" ? (
              <span
                key={`ellipsis-${index}`}
                aria-hidden
                className="text-muted-foreground px-1.5"
              >
                …
              </span>
            ) : (
              <Button
                key={item}
                variant={item === page ? "default" : "secondary"}
                size="sm"
                onClick={() => onPageChange(item)}
                aria-label={`第 ${item} 页`}
                aria-current={item === page ? "page" : undefined}
                className="tnum min-w-8"
              >
                {item}
              </Button>
            ),
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            aria-label="下一页"
          >
            <span className="sr-only sm:not-sr-only">下一页</span>
            <ChevronRight aria-hidden />
          </Button>
        </div>
      ) : null}
    </nav>
  );
}
