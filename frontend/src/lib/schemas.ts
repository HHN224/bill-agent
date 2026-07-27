import { z } from "zod";

import type {
  ManualTransactionPayload,
  TransactionUpdatePayload,
} from "@/api/types";
import { CATEGORIES, DEFAULT_CURRENCY } from "@/lib/constants";
import { localInputToIsoWithOffset } from "@/lib/datetime";
import { parseAmountInput } from "@/lib/money";

const optionalText = (max: number, label: string) =>
  z.string().trim().max(max, `${label}不能超过 ${max} 个字符`);

export const transactionFormSchema = z.object({
  type: z.enum(["expense", "income"]),
  amount: z
    .string({ required_error: "请输入金额" })
    .trim()
    .min(1, "请输入金额")
    .regex(/^(\d+)(\.\d{1,2})?$/, "金额需为数字，最多两位小数")
    .refine((value) => Number(value) > 0, "金额必须大于 0"),
  category: z.enum(CATEGORIES, {
    errorMap: () => ({ message: "请选择分类" }),
  }),
  subcategory: optionalText(64, "子分类"),
  occurredAt: z
    .string({ required_error: "请选择发生时间" })
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "请选择有效的发生时间"),
  merchant: optionalText(128, "商户"),
  paymentMethod: optionalText(64, "支付方式"),
  note: optionalText(255, "备注"),
  tags: z.array(z.string().trim().min(1)).max(20, "标签最多 20 个"),
});

export type TransactionFormValues = z.infer<typeof transactionFormSchema>;

function emptyToNull(value: string): string | null {
  return value === "" ? null : value;
}

/** 表单值 → 手工创建请求体（新增）。occurred_at 带本地时区偏移。 */
export function formValuesToCreatePayload(
  values: TransactionFormValues,
): ManualTransactionPayload {
  return {
    type: values.type,
    amount: parseAmountInput(values.amount),
    currency: DEFAULT_CURRENCY,
    category: values.category,
    subcategory: emptyToNull(values.subcategory),
    merchant: emptyToNull(values.merchant),
    payment_method: emptyToNull(values.paymentMethod),
    occurred_at: localInputToIsoWithOffset(values.occurredAt),
    note: emptyToNull(values.note),
    tags: values.tags,
  };
}

/** 表单值 → 修改请求体（编辑）。不含 currency（契约规定不可修改）。 */
export function formValuesToUpdatePayload(
  values: TransactionFormValues,
): TransactionUpdatePayload {
  const payload = formValuesToCreatePayload(values);
  return {
    type: payload.type,
    amount: payload.amount,
    category: payload.category,
    subcategory: payload.subcategory,
    merchant: payload.merchant,
    payment_method: payload.payment_method,
    occurred_at: payload.occurred_at,
    note: payload.note,
    tags: payload.tags,
  };
}
