import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { ApiError } from "@/api/client";
import { useCreateTransaction } from "@/api/hooks";
import { describeError } from "@/components/error-state";
import { PageHeader } from "@/components/layout/page-header";
import {
  applyServerFieldErrors,
  TransactionForm,
  type TransactionFormSubmitContext,
} from "@/components/transaction-form";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toaster";
import {
  formValuesToCreatePayload,
  type TransactionFormValues,
} from "@/lib/schemas";

/**
 * 手工新增：调用 POST /api/transactions/manual，
 * 不经过大模型，不消耗模型额度。
 */
export function TransactionNewPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const createMutation = useCreateTransaction();
  const [serverError, setServerError] = useState<string | null>(null);

  function handleSubmit(
    values: TransactionFormValues,
    { setError }: TransactionFormSubmitContext,
  ) {
    setServerError(null);
    createMutation.mutate(formValuesToCreatePayload(values), {
      onSuccess: (created) => {
        toast({
          variant: "success",
          title: "已保存",
          description: `${created.category} ${created.amount.toFixed(2)} 元`,
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
        title="新增交易"
        description="手工记账直接写库，不调用大模型。"
      />
      <Card>
        <CardContent className="p-4 sm:p-6">
          <TransactionForm
            pending={createMutation.isPending}
            submitLabel="保存"
            serverError={serverError}
            onSubmit={handleSubmit}
            onCancel={() => navigate(-1)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
