import { describe, expect, it } from "vitest";

import {
  getPageItemRange,
  getTotalPages,
  pageAfterDelete,
} from "@/lib/query-params";

describe("getTotalPages", () => {
  it("按 Math.ceil(total / limit) 计算", () => {
    expect(getTotalPages(57, 20)).toBe(3);
    expect(getTotalPages(40, 20)).toBe(2);
    expect(getTotalPages(41, 20)).toBe(3);
    expect(getTotalPages(1, 20)).toBe(1);
  });

  it("空结果至少为 1 页", () => {
    expect(getTotalPages(0, 20)).toBe(1);
    expect(getTotalPages(-5, 20)).toBe(1);
  });
});

describe("getPageItemRange", () => {
  it("返回当前页条目区间", () => {
    expect(getPageItemRange(1, 20, 57)).toEqual({ start: 1, end: 20 });
    expect(getPageItemRange(2, 20, 57)).toEqual({ start: 21, end: 40 });
    expect(getPageItemRange(3, 20, 57)).toEqual({ start: 41, end: 57 });
  });

  it("末页不足一页时收束到 total", () => {
    expect(getPageItemRange(2, 20, 25)).toEqual({ start: 21, end: 25 });
  });

  it("空结果返回 0–0", () => {
    expect(getPageItemRange(1, 20, 0)).toEqual({ start: 0, end: 0 });
  });
});

describe("pageAfterDelete", () => {
  it("删除当前页最后一条且不在第一页时回退一页", () => {
    expect(pageAfterDelete(3, 1)).toBe(2);
    expect(pageAfterDelete(2, 1)).toBe(1);
  });

  it("第一页最后一条删除后留在第一页", () => {
    expect(pageAfterDelete(1, 1)).toBe(1);
  });

  it("页面还有其他条目时保持页码", () => {
    expect(pageAfterDelete(3, 5)).toBe(3);
    expect(pageAfterDelete(1, 2)).toBe(1);
  });
});
