import type { ApiErrorBody } from "@/api/types";

/**
 * 唯一的 API 入口：集中注入 Authorization、解析统一错误结构、处理 401。
 * Token 只保存在模块内存中，绝不落地 localStorage / URL / 源码。
 */

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

/** 注册 401 回调（由 AuthProvider 用来清空凭证并回到登录页）。 */
export function setOnUnauthorized(callback: (() => void) | null): void {
  onUnauthorized = callback;
}

export class ApiError extends Error {
  readonly status: number;
  readonly errorCode: string;
  readonly details: unknown;

  constructor(
    status: number,
    errorCode: string,
    message: string,
    details: unknown,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errorCode = errorCode;
    this.details = details;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isValidation(): boolean {
    return this.status === 422;
  }
}

export class NetworkError extends Error {
  constructor(message = "无法连接到服务器，请确认后端已启动后重试。") {
    super(message);
    this.name = "NetworkError";
  }
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  return (
    typeof value === "object" &&
    value !== null &&
    "error_code" in value &&
    "message" in value
  );
}

interface ApiFetchOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  /** 显式指定 token（登录验证时使用，此时全局 token 尚未设置）。 */
  token?: string;
  signal?: AbortSignal;
}

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { method = "GET", body, token, signal } = options;
  const effectiveToken = token ?? authToken;

  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (effectiveToken) {
    headers.Authorization = `Bearer ${effectiveToken}`;
  }
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  // 统一补全为绝对地址：浏览器与测试环境（jsdom）下
  // Node fetch 不接受相对路径。
  const url = path.startsWith("http")
    ? path
    : `${globalThis.location?.origin ?? ""}${path}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    throw new NetworkError();
  }

  if (response.status === 401) {
    // 先解析错误体（若可读），再通知上层清除凭证。
    let parsed: ApiErrorBody | null = null;
    try {
      const data: unknown = await response.json();
      if (isApiErrorBody(data)) {
        parsed = data;
      }
    } catch {
      // 忽略无法解析的 401 响应体。
    }
    if (effectiveToken && effectiveToken === authToken) {
      onUnauthorized?.();
    }
    throw new ApiError(
      401,
      parsed?.error_code ?? "UNAUTHORIZED",
      parsed?.message ?? "后台凭证无效或已过期。",
      parsed?.details ?? null,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  let data: unknown = null;
  const text = await response.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new ApiError(
        response.status,
        "INVALID_RESPONSE",
        "服务器返回了无法解析的响应。",
        null,
      );
    }
  }

  if (!response.ok) {
    if (isApiErrorBody(data)) {
      throw new ApiError(
        response.status,
        data.error_code,
        data.message,
        data.details ?? null,
      );
    }
    throw new ApiError(
      response.status,
      "HTTP_ERROR",
      `请求失败（${response.status}）。`,
      null,
    );
  }

  return data as T;
}

function toQueryString(
  params: Record<string, string | number | undefined>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export const api = {
  get<T>(
    path: string,
    params?: Record<string, string | number | undefined>,
  ): Promise<T> {
    return apiFetch<T>(`${path}${params ? toQueryString(params) : ""}`);
  },
  post<T>(path: string, body: unknown): Promise<T> {
    return apiFetch<T>(path, { method: "POST", body });
  },
  patch<T>(path: string, body: unknown): Promise<T> {
    return apiFetch<T>(path, { method: "PATCH", body });
  },
  delete<T>(path: string): Promise<T> {
    return apiFetch<T>(path, { method: "DELETE" });
  },
};

/** 登录页验证凭证：调用轻量只读接口，不消耗大模型额度。 */
export async function verifyAdminToken(token: string): Promise<void> {
  await apiFetch("/api/transactions?limit=1", { token });
}
