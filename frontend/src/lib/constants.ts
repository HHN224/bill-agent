/**
 * 与后端契约保持一致的业务常量。
 * 一级分类是固定预设集合，见 docs/admin-api.md。
 */
export const CATEGORIES = [
  "餐饮",
  "交通",
  "购物",
  "娱乐",
  "学习",
  "生活缴费",
  "医疗",
  "社交",
  "住房",
  "收入",
  "其他",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const TRANSACTION_TYPES = ["expense", "income"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const TYPE_LABELS: Record<TransactionType, string> = {
  expense: "支出",
  income: "收入",
};

export const DEFAULT_CURRENCY = "CNY";

export const PAGE_SIZE = 20;
export const KEYWORD_DEBOUNCE_MS = 350;

/** 环形图使用的克制配色，按分类在 CATEGORIES 中的顺序取色。 */
export const CATEGORY_COLORS: Record<Category, string> = {
  餐饮: "#c2613b",
  交通: "#3d6f9e",
  购物: "#a86fa8",
  娱乐: "#d0a44a",
  学习: "#4f8a6d",
  生活缴费: "#5b7fa6",
  医疗: "#b05757",
  社交: "#7c7fc0",
  住房: "#8a7a5c",
  收入: "#3f8f5f",
  其他: "#8a8f98",
};

export const PAYMENT_METHOD_SUGGESTIONS = [
  "微信",
  "支付宝",
  "现金",
  "信用卡",
  "储蓄卡",
  "Apple Pay",
] as const;
