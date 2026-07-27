import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  CATEGORIES,
  TRANSACTION_TYPES,
  TYPE_LABELS,
  type Category,
  type TransactionType,
} from "@/lib/constants";
import type { TransactionFilters } from "@/lib/query-params";
import { hasActiveFilters } from "@/lib/query-params";

interface TransactionsFilterBarProps {
  filters: TransactionFilters;
  /** 筛选变化时调用；组件内部约定变化即回到第 1 页。 */
  onFiltersChange: (patch: Partial<TransactionFilters>) => void;
  onClear: () => void;
  keywordValue: string;
  onKeywordValueChange: (value: string) => void;
}

export function TransactionsFilterBar({
  filters,
  onFiltersChange,
  onClear,
  keywordValue,
  onKeywordValueChange,
}: TransactionsFilterBarProps) {
  return (
    <div
      role="search"
      aria-label="交易筛选"
      className="border-border bg-card rounded-lg border p-3 sm:p-4"
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="col-span-2 flex flex-col gap-1.5">
          <Label htmlFor="filter-keyword">关键词</Label>
          <div className="relative">
            <Search
              aria-hidden
              className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
            />
            <Input
              id="filter-keyword"
              value={keywordValue}
              onChange={(event) => onKeywordValueChange(event.target.value)}
              placeholder="备注 / 商户 / 原文"
              autoComplete="off"
              className="pl-8"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-start-date">开始日期</Label>
          <Input
            id="filter-start-date"
            type="date"
            value={filters.startDate}
            max={filters.endDate || undefined}
            onChange={(event) =>
              onFiltersChange({ startDate: event.target.value })
            }
            className="tnum"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-end-date">结束日期</Label>
          <Input
            id="filter-end-date"
            type="date"
            value={filters.endDate}
            min={filters.startDate || undefined}
            onChange={(event) =>
              onFiltersChange({ endDate: event.target.value })
            }
            className="tnum"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-type">类型</Label>
          <Select
            id="filter-type"
            value={filters.type}
            onChange={(event) =>
              onFiltersChange({
                type: event.target.value as TransactionType | "",
              })
            }
          >
            <option value="">全部</option>
            {TRANSACTION_TYPES.map((type) => (
              <option key={type} value={type}>
                {TYPE_LABELS[type]}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-category">分类</Label>
          <Select
            id="filter-category"
            value={filters.category}
            onChange={(event) =>
              onFiltersChange({
                category: event.target.value as Category | "",
              })
            }
          >
            <option value="">全部</option>
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </Select>
        </div>
        <div className="col-span-2 flex items-end sm:col-span-3 lg:col-span-1">
          {hasActiveFilters(filters) ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="text-muted-foreground h-9 gap-1"
            >
              <X aria-hidden />
              清空筛选
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
