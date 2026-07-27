import { useEffect } from "react";

import type { Transaction } from "@/api/types";
import { AmountText } from "@/components/amount-text";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { formatLocalDateTime } from "@/lib/datetime";

interface ConfirmDeleteDialogProps {
  transaction: Transaction | null;
  open: boolean;
  pending: boolean;
  error?: string | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

/** 删除二次确认：明确展示金额、分类、日期和备注（安全红线）。 */
export function ConfirmDeleteDialog({
  transaction,
  open,
  pending,
  error,
  onOpenChange,
  onConfirm,
}: ConfirmDeleteDialogProps) {
  useEffect(() => {
    if (!open) {
      return;
    }
  }, [open]);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="删除这笔交易？"
      description="删除后不可恢复，请确认以下信息无误。"
    >
      {transaction ? (
        <dl className="border-border bg-muted/40 space-y-2 rounded-md border px-4 py-3 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">金额</dt>
            <dd>
              <AmountText type={transaction.type} amount={transaction.amount} />
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">分类</dt>
            <dd>
              {transaction.category}
              {transaction.subcategory ? ` / ${transaction.subcategory}` : ""}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">日期</dt>
            <dd className="tnum">
              {formatLocalDateTime(transaction.occurred_at)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground shrink-0">备注</dt>
            <dd className="max-w-60 truncate text-right">
              {transaction.note || transaction.merchant || "—"}
            </dd>
          </div>
        </dl>
      ) : null}
      {error ? (
        <p role="alert" className="text-destructive mt-3 text-sm">
          {error}
        </p>
      ) : null}
      <div className="mt-5 flex justify-end gap-2">
        <Button
          variant="secondary"
          onClick={() => onOpenChange(false)}
          disabled={pending}
        >
          取消
        </Button>
        <Button variant="destructive" onClick={onConfirm} disabled={pending}>
          {pending ? "删除中…" : "确认删除"}
        </Button>
      </div>
    </Dialog>
  );
}
