import { describe, expect, it } from "vitest";

import {
  DEFAULT_FILTERS,
  filtersFromSearchParams,
  filtersToApiQuery,
  filtersToSearchParams,
  hasActiveFilters,
  withResetPage,
  type TransactionFilters,
} from "@/lib/query-params";

describe("filtersFromSearchParams", () => {
  it("空参数返回默认值", () => {
    expect(filtersFromSearchParams(new URLSearchParams())).toEqual(
      DEFAULT_FILTERS,
    );
  });

  it("解析完整筛选与页码", () => {
    const params = new URLSearchParams(
      "page=3&keyword=食堂&start_date=2026-07-01&end_date=2026-07-31&category=餐饮&type=expense",
    );
    expect(filtersFromSearchParams(params)).toEqual({
      page: 3,
      keyword: "食堂",
      startDate: "2026-07-01",
      endDate: "2026-07-31",
      category: "餐饮",
      type: "expense",
    });
  });

  it("非法页码与未知枚举值回落到默认", () => {
    const params = new URLSearchParams("page=-2&category=不存在&type=transfer");
    const filters = filtersFromSearchParams(params);
    expect(filters.page).toBe(1);
    expect(filters.category).toBe("");
    expect(filters.type).toBe("");
  });
});

describe("filtersToSearchParams / 序列化往返", () => {
  it("默认值不写入 URL", () => {
    expect(filtersToSearchParams(DEFAULT_FILTERS).toString()).toBe("");
  });

  it("序列化后可完整还原", () => {
    const filters: TransactionFilters = {
      page: 4,
      keyword: "牛肉",
      startDate: "2026-07-01",
      endDate: "2026-07-27",
      category: "交通",
      type: "income",
    };
    const params = filtersToSearchParams(filters);
    expect(params.get("page")).toBe("4");
    expect(params.get("keyword")).toBe("牛肉");
    expect(params.get("start_date")).toBe("2026-07-01");
    expect(params.get("end_date")).toBe("2026-07-27");
    expect(params.get("category")).toBe("交通");
    expect(params.get("type")).toBe("income");
    expect(filtersFromSearchParams(params)).toEqual(filters);
  });

  it("关键词会去除首尾空格", () => {
    const params = filtersToSearchParams({
      ...DEFAULT_FILTERS,
      keyword: "  食堂  ",
    });
    expect(params.get("keyword")).toBe("食堂");
  });
});

describe("withResetPage", () => {
  it("筛选变化时回到第 1 页", () => {
    expect(withResetPage({ category: "餐饮" })).toEqual({
      category: "餐饮",
      page: 1,
    });
  });
});

describe("filtersToApiQuery", () => {
  it("页码转换为 offset 并透传筛选", () => {
    const query = filtersToApiQuery(
      {
        page: 3,
        keyword: "食堂",
        startDate: "2026-07-01",
        endDate: "",
        category: "餐饮",
        type: "",
      },
      20,
    );
    expect(query).toEqual({
      limit: 20,
      offset: 40,
      start_date: "2026-07-01",
      category: "餐饮",
      keyword: "食堂",
    });
  });

  it("空筛选只保留分页参数", () => {
    expect(filtersToApiQuery(DEFAULT_FILTERS, 20)).toEqual({
      limit: 20,
      offset: 0,
    });
  });
});

describe("hasActiveFilters", () => {
  it("默认状态无筛选", () => {
    expect(hasActiveFilters(DEFAULT_FILTERS)).toBe(false);
  });

  it("任一条件生效即视为有筛选", () => {
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, keyword: "x" })).toBe(true);
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, category: "餐饮" })).toBe(
      true,
    );
    expect(
      hasActiveFilters({ ...DEFAULT_FILTERS, startDate: "2026-07-01" }),
    ).toBe(true);
  });
});
