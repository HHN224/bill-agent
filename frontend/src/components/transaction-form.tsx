import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Controller, useForm, type UseFormSetError } from "react-hook-form";

import { ApiError } from "@/api/client";
import type { Transaction, ValidationErrorDetail } from "@/api/types";
import { TagInput } from "@/components/tag-input";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  CATEGORIES,
  PAYMENT_METHOD_SUGGESTIONS,
  TYPE_LABELS,
  type TransactionType,
} from "@/lib/constants";
import { isoToLocalInput, nowLocalInput } from "@/lib/datetime";
import {
  transactionFormSchema,
  type TransactionFormValues,
} from "@/lib/schemas";
import { cn } from "@/lib/utils";

/** 后端 422 字段名 → 表单字段名。 */
const SERVER_FIELD_MAP: Record<string, keyof TransactionFormValues> = {
  type: "type",
  amount: "amount",
  category: "category",
  subcategory: "subcategory",
  occurred_at: "occurredAt",
  merchant: "merchant",
  payment_method: "paymentMethod",
  note: "note",
  tags: "tags",
};

/** 把 422 details 中的字段错误映射到对应控件附近（契约要求）。 */
export function applyServerFieldErrors(
  error: ApiError,
  setError: UseFormSetError<TransactionFormValues>,
): boolean {
  if (!error.isValidation || !Array.isArray(error.details)) {
    return false;
  }
  let applied = false;
  for (const detail of error.details as ValidationErrorDetail[]) {
    const location = detail?.location;
    if (!Array.isArray(location) || location.length === 0) {
      continue;
    }
    const fieldName = SERVER_FIELD_MAP[String(location[location.length - 1])];
    if (fieldName) {
      setError(fieldName, { type: "server", message: detail.message });
      applied = true;
    }
  }
  return applied;
}

export function transactionToFormValues(
  transaction: Transaction,
): TransactionFormValues {
  return {
    type: transaction.type,
    amount: transaction.amount.toFixed(2),
    category: transaction.category,
    subcategory: transaction.subcategory ?? "",
    occurredAt: isoToLocalInput(transaction.occurred_at),
    merchant: transaction.merchant ?? "",
    paymentMethod: transaction.payment_method ?? "",
    note: transaction.note ?? "",
    tags: transaction.tags,
  };
}

export function defaultFormValues(): TransactionFormValues {
  return {
    type: "expense",
    amount: "",
    category: "餐饮",
    subcategory: "",
    occurredAt: nowLocalInput(),
    merchant: "",
    paymentMethod: "",
    note: "",
    tags: [],
  };
}

export interface TransactionFormSubmitContext {
  setError: UseFormSetError<TransactionFormValues>;
}

interface TransactionFormProps {
  initialValues?: TransactionFormValues;
  pending: boolean;
  submitLabel: string;
  serverError?: string | null;
  onSubmit: (
    values: TransactionFormValues,
    context: TransactionFormSubmitContext,
  ) => void;
  onCancel: () => void;
}

export function TransactionForm({
  initialValues,
  pending,
  submitLabel,
  serverError,
  onSubmit,
  onCancel,
}: TransactionFormProps) {
  const {
    register,
    control,
    handleSubmit,
    setValue,
    setError,
    watch,
    formState: { errors },
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: initialValues ?? defaultFormValues(),
    mode: "onBlur",
  });

  const watchedType = watch("type");

  // 收入时预选“收入”分类（仍允许修改）；切回支出且仍是“收入”时回到“餐饮”。
  useEffect(() => {
    const currentCategory = watch("category");
    if (watchedType === "income" && currentCategory !== "收入") {
      setValue("category", "收入", { shouldValidate: false });
    } else if (watchedType === "expense" && currentCategory === "收入") {
      setValue("category", "餐饮", { shouldValidate: false });
    }
    // 仅在类型变化时联动分类。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedType, setValue]);

  return (
    <form
      onSubmit={handleSubmit((values) => onSubmit(values, { setError }))}
      noValidate
      className="flex flex-col gap-5"
    >
      {serverError ? (
        <div
          role="alert"
          className="border-destructive/40 bg-destructive/5 rounded-md border px-4 py-3 text-sm"
        >
          {serverError}
        </div>
      ) : null}

      <Controller
        control={control}
        name="type"
        render={({ field }) => (
          <div className="flex flex-col gap-1.5">
            <span id="type-label" className="text-sm font-medium">
              类型
            </span>
            <div
              role="radiogroup"
              aria-labelledby="type-label"
              className="border-border bg-muted grid w-full max-w-56 grid-cols-2 rounded-md border p-0.5"
            >
              {(["expense", "income"] as TransactionType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  role="radio"
                  aria-checked={field.value === type}
                  onClick={() => field.onChange(type)}
                  className={cn(
                    "h-8 rounded-[5px] text-sm transition-colors",
                    field.value === type
                      ? "bg-card font-medium shadow-xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {TYPE_LABELS[type]}
                </button>
              ))}
            </div>
          </div>
        )}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="金额" required error={errors.amount?.message}>
          {({ id, describedBy }) => (
            <div className="relative">
              <span
                aria-hidden
                className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 text-sm"
              >
                ¥
              </span>
              <Input
                id={id}
                inputMode="decimal"
                placeholder="0.00"
                autoComplete="off"
                aria-describedby={describedBy}
                invalid={!!errors.amount}
                className="tnum pl-7"
                {...register("amount")}
              />
            </div>
          )}
        </Field>

        <Field label="分类" required error={errors.category?.message}>
          {({ id, describedBy }) => (
            <Select
              id={id}
              aria-describedby={describedBy}
              invalid={!!errors.category}
              {...register("category")}
            >
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field
          label="发生时间"
          required
          error={errors.occurredAt?.message}
          hint="以本地时间填写"
        >
          {({ id, describedBy }) => (
            <Input
              id={id}
              type="datetime-local"
              aria-describedby={describedBy}
              invalid={!!errors.occurredAt}
              className="tnum"
              {...register("occurredAt")}
            />
          )}
        </Field>

        <Field
          label="子分类"
          error={errors.subcategory?.message}
          hint="可选，留空则不设置"
        >
          {({ id, describedBy }) => (
            <Input
              id={id}
              placeholder="如：午餐"
              autoComplete="off"
              aria-describedby={describedBy}
              invalid={!!errors.subcategory}
              {...register("subcategory")}
            />
          )}
        </Field>

        <Field label="商户" error={errors.merchant?.message}>
          {({ id, describedBy }) => (
            <Input
              id={id}
              placeholder="可选"
              autoComplete="off"
              aria-describedby={describedBy}
              invalid={!!errors.merchant}
              {...register("merchant")}
            />
          )}
        </Field>

        <Field label="支付方式" error={errors.paymentMethod?.message}>
          {({ id, describedBy }) => (
            <>
              <Input
                id={id}
                placeholder="可选"
                autoComplete="off"
                list="payment-method-suggestions"
                aria-describedby={describedBy}
                invalid={!!errors.paymentMethod}
                {...register("paymentMethod")}
              />
              <datalist id="payment-method-suggestions">
                {PAYMENT_METHOD_SUGGESTIONS.map((method) => (
                  <option key={method} value={method} />
                ))}
              </datalist>
            </>
          )}
        </Field>
      </div>

      <Field label="备注" error={errors.note?.message}>
        {({ id, describedBy }) => (
          <Textarea
            id={id}
            placeholder="可选，如：牛肉饭"
            rows={2}
            aria-describedby={describedBy}
            invalid={!!errors.note}
            {...register("note")}
          />
        )}
      </Field>

      <Field
        label="标签"
        error={errors.tags?.message}
        hint="回车确认，可添加多个"
      >
        {({ id, describedBy }) => (
          <Controller
            control={control}
            name="tags"
            render={({ field }) => (
              <TagInput
                id={id}
                value={field.value}
                onChange={field.onChange}
                describedBy={describedBy}
              />
            )}
          />
        )}
      </Field>

      <div className="border-border flex justify-end gap-2 border-t pt-4">
        <Button variant="secondary" onClick={onCancel} disabled={pending}>
          取消
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "保存中…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
