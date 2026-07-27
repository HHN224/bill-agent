import {
  keepPreviousData,
  useMutation,
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
