import type { Category, TransactionType } from "@/lib/constants";

/** 与后端 TransactionResponse 对齐。 */
export interface Transaction {
  id: number;
  type: TransactionType;
  amount: number;
  currency: string;
  category: Category;
  subcategory: string | null;
  merchant: string | null;
  payment_method: string | null;
  occurred_at: string;
  note: string | null;
  tags: string[];
  raw_text: string;
  confidence: number | null;
  created_at: string;
  updated_at: string;
}

export interface TransactionListResponse {
  items: Transaction[];
  total: number;
}

export interface ManualTransactionPayload {
  type: TransactionType;
  amount: number;
  currency: string;
  category: Category;
  subcategory: string | null;
  merchant: string | null;
  payment_method: string | null;
  occurred_at: string;
  note: string | null;
  tags: string[];
}

export type TransactionUpdatePayload = Partial<
  Omit<ManualTransactionPayload, "currency">
>;

export interface TransactionListQuery {
  limit: number;
  offset: number;
  start_date?: string;
  end_date?: string;
  category?: Category;
  type?: TransactionType;
  keyword?: string;
}

export interface CategoryAmount {
  category: Category;
  amount: number;
}

export interface DailySummary {
  date: string;
  expense_total: number;
  income_total: number;
  transaction_count: number;
  categories: CategoryAmount[];
}

export interface DailyAmount {
  date: string;
  amount: number;
}

export interface MonthlySummary {
  year: number;
  month: number;
  expense_total: number;
  income_total: number;
  net_amount: number;
  transaction_count: number;
  categories: CategoryAmount[];
  daily_totals: DailyAmount[];
}

export interface DeleteTransactionResponse {
  success: true;
  message: string;
}

/** 后端统一错误响应 {success, error_code, message, details}。 */
export interface ApiErrorBody {
  success: false;
  error_code: string;
  message: string;
  details: unknown;
}

export interface ValidationErrorDetail {
  location: (string | number)[];
  message: string;
  type: string;
}
