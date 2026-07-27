const cnyFormatter = new Intl.NumberFormat("zh-CN", {
  style: "currency",
  currency: "CNY",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 金额展示：统一两位小数的人民币格式，如 `¥18.50`。 */
export function formatAmount(amount: number): string {
  return cnyFormatter.format(amount);
}

/** 金额展示（不带币种符号），如 `18.50`。 */
export function formatAmountPlain(amount: number): string {
  return amount.toFixed(2);
}

/**
 * 把表单输入的金额字符串安全转换为数字。
 * 以“分”为中间单位取整，避免浮点误差（如 18.5 → 18.5 而非 18.4999…）。
 */
export function parseAmountInput(value: string): number {
  const trimmed = value.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    throw new Error(`Invalid amount: ${value}`);
  }
  return Math.round(Number(trimmed) * 100) / 100;
}
