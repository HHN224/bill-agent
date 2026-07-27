import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { ApiError } from "@/api/client";
import { useTransaction, useUpdateTransaction } from "@/api/hooks";
import { describeError, ErrorState } from "@/components/error-state";
import { PageHeader } from "@/components/layout/page-header";
import {
  applyServerFieldErrors,
  TransactionForm,
  transactionToFormValues,
  type TransactionFormSubmitContext,
} from "@/components/transaction-form";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toaster";
import {
  formValuesToUpdatePayload,
  type TransactionFormValues,
} from "@/lib/schemas";

export function TransactionEditPage() {
  const { id: rawId } = useParams<{ id: string }>();
  const id = Number(rawId);
  const validId = Number.isInteger(id) && id > 0 ? id : null;

  const navigate = useNavigate();
  const { toast } = useToast();
  const detail = useTransaction(validId);
  const updateMutation = useUpdateTransaction(validId ?? 0);
  const [serverError, setServerError] = useState<string | null>(null);

  function handleSubmit(
    values: TransactionFormValues,
    { setError }: TransactionFormSubmitContext,
  ) {
    setServerError(null);
    updateMutation.mutate(formValuesToUpdatePayload(values), {
      onSuccess: (updated) => {
        toast({
          variant: "success",
          title: "已保存修改",
          description: `${updated.category} ${updated.amount.toFixed(2)} 元`,
        });
        navigate("/transactions");
      },
      onError: (error) => {
        if (
          error instanceof ApiError &&
          applyServerFieldErrors(error, setError)
        ) {
          return;
        }
        setServerError(describeError(error));
      },
    });
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="编辑交易"
        description="可修改类型、金额、分类、时间与备注等；币种不可修改。"
      />
      <Card>
        <CardContent className="p-4 sm:p-6">
          {detail.isPending ? (
            <div className="flex flex-col gap-4" aria-label="加载中">
              <Skeleton className="h-9 w-56" />
              <div className="grid gap-4 sm:grid-cols-2">
                {Array.from({ length: 6 }, (_, index) => (
                  <Skeleton key={index} className="h-9 w-full" />
                ))}
              </div>
              <Skeleton className="h-20 w-full" />
            </div>
          ) : detail.isError ? (
            <ErrorState
              error={detail.error}
              title="无法加载交易"
              onRetry={() => void detail.refetch()}
            />
          ) : detail.data ? (
            <TransactionForm
              initialValues={transactionToFormValues(detail.data)}
              pending={updateMutation.isPending}
              submitLabel="保存修改"
              serverError={serverError}
              onSubmit={handleSubmit}
              onCancel={() => navigate(-1)}
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
