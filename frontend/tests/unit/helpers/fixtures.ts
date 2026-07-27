import type { Transaction } from "@/api/types";

export const ORIGIN = "http://localhost:3000";

export function makeTransaction(
  overrides: Partial<Transaction> = {},
): Transaction {
  return {
    id: 1,
    type: "expense",
    amount: 18.5,
    currency: "CNY",
    category: "餐饮",
    subcategory: "午餐",
    merchant: "学校食堂",
    payment_method: "微信",
    occurred_at: "2026-07-27T04:20:00Z",
    note: "牛肉饭",
    tags: ["食堂"],
    raw_text: "",
    confidence: null,
    created_at: "2026-07-27T04:21:00Z",
    updated_at: "2026-07-27T04:21:00Z",
    ...overrides,
  };
}
