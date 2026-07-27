import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it } from "vitest";

import { setAuthToken } from "@/api/client";
import { TransactionNewPage } from "@/pages/transaction-new-page";

import { makeTransaction, ORIGIN } from "../helpers/fixtures";
import { renderWithProviders } from "../helpers/render";
import { server } from "../helpers/server";

describe("新增交易表单", () => {
  beforeEach(() => {
    setAuthToken("test-token");
  });

  it("提交调用 /manual，金额与时区偏移符合契约", async () => {
    const user = userEvent.setup();
    let capturedBody: Record<string, unknown> | null = null;
    server.use(
      http.post(`${ORIGIN}/api/transactions/manual`, async ({ request }) => {
        capturedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(makeTransaction({ id: 100 }), {
          status: 201,
        });
      }),
    );

    renderWithProviders(<TransactionNewPage />);

    await user.type(screen.getByLabelText(/^金额/), "23.5");
    await user.selectOptions(screen.getByLabelText(/^分类/), "餐饮");
    await user.type(screen.getByLabelText(/^备注/), "测试午餐");
    await user.type(screen.getByLabelText(/^标签/), "食堂{Enter}");
    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => expect(capturedBody).not.toBeNull());
    expect(capturedBody).toMatchObject({
      type: "expense",
      amount: 23.5,
      currency: "CNY",
      category: "餐饮",
      note: "测试午餐",
      tags: ["食堂"],
      subcategory: null,
      merchant: null,
      payment_method: null,
    });
    expect(String(capturedBody!.occurred_at)).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/,
    );
  });

  it("金额为空的本地校验阻止提交并显示错误", async () => {
    const user = userEvent.setup();
    let requestCount = 0;
    server.use(
      http.post(`${ORIGIN}/api/transactions/manual`, () => {
        requestCount += 1;
        return HttpResponse.json(makeTransaction(), { status: 201 });
      }),
    );

    renderWithProviders(<TransactionNewPage />);

    const amountInput = screen.getByLabelText(/^金额/);
    await user.click(amountInput);
    await user.tab();
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(await screen.findByText("请输入金额")).toBeInTheDocument();
    expect(requestCount).toBe(0);
  });

  it("非法金额格式显示校验错误", async () => {
    const user = userEvent.setup();
    renderWithProviders(<TransactionNewPage />);

    await user.type(screen.getByLabelText(/^金额/), "12.345");
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(await screen.findByText(/最多两位小数/)).toBeInTheDocument();
  });

  it("422 字段错误显示在对应控件附近", async () => {
    const user = userEvent.setup();
    server.use(
      http.post(`${ORIGIN}/api/transactions/manual`, () =>
        HttpResponse.json(
          {
            success: false,
            error_code: "VALIDATION_ERROR",
            message: "The request data is invalid.",
            details: [
              {
                location: ["body", "amount"],
                message: "Input should be greater than 0",
                type: "greater_than",
              },
            ],
          },
          { status: 422 },
        ),
      ),
    );

    renderWithProviders(<TransactionNewPage />);

    await user.type(screen.getByLabelText(/^金额/), "1");
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(
      await screen.findByText("Input should be greater than 0"),
    ).toBeInTheDocument();
  });

  it("切换为收入时预选“收入”分类，且仍允许修改", async () => {
    const user = userEvent.setup();
    renderWithProviders(<TransactionNewPage />);

    const categorySelect = screen.getByLabelText<HTMLSelectElement>(/^分类/);
    expect(categorySelect.value).toBe("餐饮");

    await user.click(screen.getByRole("radio", { name: "收入" }));
    expect(categorySelect.value).toBe("收入");

    // 用户仍可手动改选其他分类。
    await user.selectOptions(categorySelect, "其他");
    expect(categorySelect.value).toBe("其他");

    // 切回支出且分类仍为“收入”时回到默认支出分类。
    await user.selectOptions(categorySelect, "收入");
    await user.click(screen.getByRole("radio", { name: "支出" }));
    expect(categorySelect.value).toBe("餐饮");
  });
});
