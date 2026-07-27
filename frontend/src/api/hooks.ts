import {
  keepPreviousData,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { api } from "@/api/client";
import type {
  DeleteTransactionResponse,
  DailySummary,
  ManualTransactionPayload,
  MonthlySummary,
  Transaction,
  TransactionListQuery,
  TransactionListResponse,
  TransactionUpdatePayload,
} from "@/api/types";

/**
 * query key 约定：
 * - ["transactions", "list", query]   分页列表
 * - ["transactions", "detail", id]    单笔详情
 * - ["summaries", "daily"]            今日统计
 * - ["summaries", "monthly", y, m]    月度统计
 * 新增/编辑/删除成功后按前缀失效 ["transactions"] 与 ["summaries"]。
 */

export function useTransactions(query: TransactionListQuery) {
  return useQuery({
    queryKey: ["transactions", "list", query] as const,
    queryFn: () =>
      api.get<TransactionListResponse>("/api/transactions", { ...query }),
    placeholderData: keepPreviousData,
  });
}

export function useTransaction(id: number | null) {
  return useQuery({
    queryKey: ["transactions", "detail", id] as const,
    queryFn: () => api.get<Transaction>(`/api/transactions/${id}`),
    enabled: id !== null,
  });
}

export function useDailySummary() {
  return useQuery({
    queryKey: ["summaries", "daily"] as const,
    queryFn: () => api.get<DailySummary>("/api/summaries/daily"),
  });
}

export function useMonthlySummary(year: number, month: number) {
  return useQuery({
    queryKey: ["summaries", "monthly", year, month] as const,
    queryFn: () =>
      api.get<MonthlySummary>("/api/summaries/monthly", { year, month }),
  });
}

/**
 * 近 count 个月（含本月）的月度统计，按时间升序返回查询结果数组。
 * 复用现有月度统计接口并行拉取，query key 与单月查询共享缓存。
 */
export function useRecentMonthlySummaries(count: number) {
  const base = new Date();
  const months: { year: number; month: number }[] = [];
  for (let index = count - 1; index >= 0; index -= 1) {
    const cursor = new Date(base.getFullYear(), base.getMonth() - index, 1);
    months.push({ year: cursor.getFullYear(), month: cursor.getMonth() + 1 });
  }
  return useQueries({
    queries: months.map(({ year, month }) => ({
      queryKey: ["summaries", "monthly", year, month] as const,
      queryFn: () =>
        api.get<MonthlySummary>("/api/summaries/monthly", { year, month }),
    })),
  });
}

function useInvalidateAfterChange() {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["transactions"] }),
      queryClient.invalidateQueries({ queryKey: ["summaries"] }),
    ]);
  };
}

export function useCreateTransaction() {
  const invalidate = useInvalidateAfterChange();
  return useMutation({
    mutationFn: (payload: ManualTransactionPayload) =>
      api.post<Transaction>("/api/transactions/manual", payload),
    onSuccess: invalidate,
  });
}

export function useUpdateTransaction(id: number) {
  const invalidate = useInvalidateAfterChange();
  return useMutation({
    mutationFn: (payload: TransactionUpdatePayload) =>
      api.patch<Transaction>(`/api/transactions/${id}`, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteTransaction() {
  const invalidate = useInvalidateAfterChange();
  return useMutation({
    mutationFn: (id: number) =>
      api.delete<DeleteTransactionResponse>(`/api/transactions/${id}`),
    onSuccess: invalidate,
  });
}
