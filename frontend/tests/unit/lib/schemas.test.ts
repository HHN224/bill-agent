import { describe, expect, it } from "vitest";

import {
  formValuesToCreatePayload,
  formValuesToUpdatePayload,
  transactionFormSchema,
  type TransactionFormValues,
} from "@/lib/schemas";

function validValues(
  overrides: Partial<TransactionFormValues> = {},
): TransactionFormValues {
  return {
    type: "expense",
    amount: "18.50",
    category: "餐饮",
    subcategory: "",
    occurredAt: "2026-07-27T12:20",
    merchant: "",
    paymentMethod: "",
    note: "",
    tags: [],
    ...overrides,
  };
}

describe("transactionFormSchema", () => {
  it("接受合法输入", () => {
    const result = transactionFormSchema.safeParse(validValues());
    expect(result.success).toBe(true);
  });

  it.each([
    ["", "请输入金额"],
    ["0", "金额必须大于 0"],
    ["0.00", "金额必须大于 0"],
    ["abc", "金额需为数字"],
    ["18.555", "最多两位小数"],
    ["-5", "金额需为数字"],
    ["1.2.3", "金额需为数字"],
  ])("拒绝非法金额 %s", (amount) => {
    const result = transactionFormSchema.safeParse(validValues({ amount }));
    expect(result.success).toBe(false);
  });

  it.each([["18"], ["18.5"], ["18.50"], ["0.01"], ["10000"]])(
    "接受合法金额 %s",
    (amount) => {
      const result = transactionFormSchema.safeParse(validValues({ amount }));
      expect(result.success).toBe(true);
    },
  );

  it("拒绝非法日期格式", () => {
    expect(
      transactionFormSchema.safeParse(validValues({ occurredAt: "2026-07-27" }))
        .success,
    ).toBe(false);
    expect(
      transactionFormSchema.safeParse(validValues({ occurredAt: "" })).success,
    ).toBe(false);
  });

  it("拒绝预设集合之外的分类", () => {
    expect(
      transactionFormSchema.safeParse(
        validValues({ category: "不存在" as never }),
      ).success,
    ).toBe(false);
  });

  it("备注超长被拒绝", () => {
    const result = transactionFormSchema.safeParse(
      validValues({ note: "x".repeat(256) }),
    );
    expect(result.success).toBe(false);
  });
});

describe("formValuesToCreatePayload", () => {
  it("金额为数字且避免浮点误差", () => {
    const payload = formValuesToCreatePayload(validValues({ amount: "18.5" }));
    expect(payload.amount).toBe(18.5);
    expect(typeof payload.amount).toBe("number");
  });

  it("occurred_at 带明确时区偏移", () => {
    const payload = formValuesToCreatePayload(validValues());
    expect(payload.occurred_at).toMatch(/[+-]\d{2}:\d{2}$/);
  });

  it("空可选字段转为 null，currency 默认 CNY", () => {
    const payload = formValuesToCreatePayload(validValues());
    expect(payload).toMatchObject({
      currency: "CNY",
      subcategory: null,
      merchant: null,
      payment_method: null,
      note: null,
      tags: [],
    });
  });

  it("保留已填写的可选字段与标签", () => {
    const payload = formValuesToCreatePayload(
      validValues({
        subcategory: "午餐",
        merchant: "学校食堂",
        paymentMethod: "微信",
        note: "牛肉饭",
        tags: ["食堂", "午餐"],
      }),
    );
    expect(payload).toMatchObject({
      subcategory: "午餐",
      merchant: "学校食堂",
      payment_method: "微信",
      note: "牛肉饭",
      tags: ["食堂", "午餐"],
    });
  });
});

describe("formValuesToUpdatePayload", () => {
  it("不包含 currency（契约规定不可修改）", () => {
    const payload = formValuesToUpdatePayload(validValues());
    expect("currency" in payload).toBe(false);
  });

  it("清空子分类时提交 null", () => {
    const payload = formValuesToUpdatePayload(validValues({ subcategory: "" }));
    expect(payload.subcategory).toBeNull();
  });
});
