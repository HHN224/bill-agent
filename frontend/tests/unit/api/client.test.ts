import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ApiError,
  apiFetch,
  NetworkError,
  setAuthToken,
  setOnUnauthorized,
  verifyAdminToken,
} from "@/api/client";

import { makeTransaction, ORIGIN } from "../helpers/fixtures";
import { server } from "../helpers/server";

/** 捕获拒绝值并断言为 ApiError，返回收窄后的实例。 */
async function expectApiError(promise: Promise<unknown>): Promise<ApiError> {
  const error: unknown = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(ApiError);
  return error as ApiError;
}

describe("apiFetch 成功路径", () => {
  it("解析 JSON 响应并注入 Authorization", async () => {
    setAuthToken("test-token");
    let seenAuth: string | null = null;
    server.use(
      http.get(`${ORIGIN}/api/transactions`, ({ request }) => {
        seenAuth = request.headers.get("Authorization");
        return HttpResponse.json({ items: [makeTransaction()], total: 1 });
      }),
    );

    const data = await apiFetch<{ items: unknown[]; total: number }>(
      "/api/transactions?limit=1",
    );
    expect(data.total).toBe(1);
    expect(seenAuth).toBe("Bearer test-token");
  });

  it("未设置 token 时不发送 Authorization", async () => {
    let seenAuth: string | null = "placeholder";
    server.use(
      http.get(`${ORIGIN}/api/transactions`, ({ request }) => {
        seenAuth = request.headers.get("Authorization");
        return HttpResponse.json({ items: [], total: 0 });
      }),
    );

    await apiFetch("/api/transactions");
    expect(seenAuth).toBeNull();
  });
});

describe("apiFetch 错误解析", () => {
  it("401：抛出 ApiError 并触发 onUnauthorized 回调", async () => {
    setAuthToken("bad-token");
    const onUnauthorized = vi.fn();
    setOnUnauthorized(onUnauthorized);
    server.use(
      http.get(`${ORIGIN}/api/transactions`, () =>
        HttpResponse.json(
          {
            success: false,
            error_code: "UNAUTHORIZED",
            message: "Missing or invalid admin token.",
            details: null,
          },
          { status: 401 },
        ),
      ),
    );

    const error = await expectApiError(apiFetch("/api/transactions"));
    expect(error.status).toBe(401);
    expect(error.errorCode).toBe("UNAUTHORIZED");
    expect(error.isUnauthorized).toBe(true);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it("422：保留统一错误结构与字段 details", async () => {
    setAuthToken("test-token");
    const details = [
      {
        location: ["body", "amount"],
        message: "Input should be greater than 0",
        type: "greater_than",
      },
    ];
    server.use(
      http.post(`${ORIGIN}/api/transactions/manual`, () =>
        HttpResponse.json(
          {
            success: false,
            error_code: "VALIDATION_ERROR",
            message: "The request data is invalid.",
            details,
          },
          { status: 422 },
        ),
      ),
    );

    const error = await expectApiError(
      apiFetch("/api/transactions/manual", {
        method: "POST",
        body: { amount: -1 },
      }),
    );
    expect(error.status).toBe(422);
    expect(error.isValidation).toBe(true);
    expect(error.errorCode).toBe("VALIDATION_ERROR");
    expect(error.details).toEqual(details);
  });

  it("404：返回后端 message", async () => {
    setAuthToken("test-token");
    server.use(
      http.get(`${ORIGIN}/api/transactions/12345`, () =>
        HttpResponse.json(
          {
            success: false,
            error_code: "TRANSACTION_NOT_FOUND",
            message: "The transaction was not found.",
            details: null,
          },
          { status: 404 },
        ),
      ),
    );

    const error = await expectApiError(apiFetch("/api/transactions/12345"));
    expect(error.errorCode).toBe("TRANSACTION_NOT_FOUND");
    expect(error.message).toBe("The transaction was not found.");
  });

  it("非 JSON 错误响应：抛出带状态码的 ApiError", async () => {
    setAuthToken("test-token");
    server.use(
      http.get(
        `${ORIGIN}/api/transactions`,
        () => new HttpResponse("Internal Server Error", { status: 500 }),
      ),
    );

    const error = await expectApiError(apiFetch("/api/transactions"));
    expect(error.status).toBe(500);
  });

  it("网络失败：抛出 NetworkError", async () => {
    setAuthToken("test-token");
    server.use(
      http.get(`${ORIGIN}/api/transactions`, () => HttpResponse.error()),
    );

    const error: unknown = await apiFetch("/api/transactions").catch(
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(NetworkError);
  });
});

describe("verifyAdminToken", () => {
  it("凭证有效时不抛出", async () => {
    server.use(
      http.get(`${ORIGIN}/api/transactions`, () =>
        HttpResponse.json({ items: [], total: 0 }),
      ),
    );
    await expect(verifyAdminToken("any-token")).resolves.toBeUndefined();
  });

  it("凭证无效时抛出 401 ApiError，且不触发全局登出", async () => {
    const onUnauthorized = vi.fn();
    setOnUnauthorized(onUnauthorized);
    server.use(
      http.get(`${ORIGIN}/api/transactions`, () =>
        HttpResponse.json(
          {
            success: false,
            error_code: "UNAUTHORIZED",
            message: "Missing or invalid admin token.",
            details: null,
          },
          { status: 401 },
        ),
      ),
    );

    // 登录验证时全局 token 尚未设置，不应误触发清空逻辑。
    const error = await expectApiError(verifyAdminToken("candidate-token"));
    expect(error.status).toBe(401);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});
