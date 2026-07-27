import {
  CATEGORIES,
  TRANSACTION_TYPES,
  type Category,
  type TransactionType,
} from "@/lib/constants";
import type { TransactionListQuery } from "@/api/types";

/** 交易列表的筛选与分页状态，与 URL 查询参数一一对应。 */
export interface TransactionFilters {
  page: number;
  keyword: string;
  startDate: string;
  endDate: string;
  category: Category | "";
  type: TransactionType | "";
}

export const DEFAULT_FILTERS: TransactionFilters = {
  page: 1,
  keyword: "",
  startDate: "",
  endDate: "",
  category: "",
  type: "",
};

function clampPage(value: number): number {
  if (!Number.isFinite(value) || value < 1) {
    return 1;
  }
  return Math.floor(value);
}

/** URL 查询参数 → 筛选状态（容错：非法值回落到默认值）。 */
export function filtersFromSearchParams(
  params: URLSearchParams,
): TransactionFilters {
  const rawCategory = params.get("category") ?? "";
  const rawType = params.get("type") ?? "";
  return {
    page: clampPage(Number(params.get("page") ?? "1")),
    keyword: params.get("keyword") ?? "",
    startDate: params.get("start_date") ?? "",
    endDate: params.get("end_date") ?? "",
    category: (CATEGORIES as readonly string[]).includes(rawCategory)
      ? (rawCategory as Category)
      : "",
    type: (TRANSACTION_TYPES as readonly string[]).includes(rawType)
      ? (rawType as TransactionType)
      : "",
  };
}

/** 筛选状态 → URL 查询参数（默认值不写入，保持 URL 干净）。 */
export function filtersToSearchParams(
  filters: TransactionFilters,
): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.page > 1) {
    params.set("page", String(filters.page));
  }
  if (filters.keyword.trim()) {
    params.set("keyword", filters.keyword.trim());
  }
  if (filters.startDate) {
    params.set("start_date", filters.startDate);
  }
  if (filters.endDate) {
    params.set("end_date", filters.endDate);
  }
  if (filters.category) {
    params.set("category", filters.category);
  }
  if (filters.type) {
    params.set("type", filters.type);
  }
  return params;
}

/** 修改筛选条件时回到第 1 页（契约要求）。 */
export function withResetPage(
  patch: Partial<TransactionFilters>,
): Partial<TransactionFilters> {
  return { ...patch, page: 1 };
}

/** 筛选状态 → 后端列表查询参数（页码转 offset）。 */
export function filtersToApiQuery(
  filters: TransactionFilters,
  limit: number,
): TransactionListQuery {
  const query: TransactionListQuery = {
    limit,
    offset: (clampPage(filters.page) - 1) * limit,
  };
  if (filters.startDate) query.start_date = filters.startDate;
  if (filters.endDate) query.end_date = filters.endDate;
  if (filters.category) query.category = filters.category;
  if (filters.type) query.type = filters.type;
  if (filters.keyword.trim()) query.keyword = filters.keyword.trim();
  return query;
}

/** 总页数：`Math.ceil(total / limit)`，至少 1 页。 */
export function getTotalPages(total: number, limit: number): number {
  if (total <= 0 || limit <= 0) {
    return 1;
  }
  return Math.ceil(total / limit);
}

/** 当前页展示区间：`第 start–end 条 / 共 total 条`。 */
export function getPageItemRange(
  page: number,
  limit: number,
  total: number,
): { start: number; end: number } {
  if (total <= 0) {
    return { start: 0, end: 0 };
  }
  const start = (clampPage(page) - 1) * limit + 1;
  const end = Math.min(start + limit - 1, total);
  return { start, end };
}

/** 删除当前页最后一条后的目标页码（处理分页边界）。 */
export function pageAfterDelete(
  currentPage: number,
  itemsOnPage: number,
): number {
  if (itemsOnPage <= 1 && currentPage > 1) {
    return currentPage - 1;
  }
  return currentPage;
}

/** 筛选状态是否带有任意非默认筛选条件。 */
export function hasActiveFilters(filters: TransactionFilters): boolean {
  return Boolean(
    filters.keyword.trim() ||
    filters.startDate ||
    filters.endDate ||
    filters.category ||
    filters.type,
  );
}
