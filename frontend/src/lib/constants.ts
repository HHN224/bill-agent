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

/** 图表分类配色：深色底上的复古波普色板，按分类在 CATEGORIES 中的顺序取色。 */
export const CATEGORY_COLORS: Record<Category, string> = {
  餐饮: "#df6a4c",
  交通: "#5b8dc4",
  购物: "#b983c9",
  娱乐: "#f0be4f",
  学习: "#64b5a4",
  生活缴费: "#7d84c8",
  医疗: "#d96868",
  社交: "#c08b5c",
  住房: "#a8a05c",
  收入: "#82b366",
  其他: "#8f8776",
};

export const PAYMENT_METHOD_SUGGESTIONS = [
  "微信",
  "支付宝",
  "现金",
  "信用卡",
  "储蓄卡",
  "Apple Pay",
] as const;
