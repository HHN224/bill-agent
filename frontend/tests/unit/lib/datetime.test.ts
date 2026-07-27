import { describe, expect, it } from "vitest";

import {
  formatLocalDateTime,
  isoToLocalInput,
  localInputToIsoWithOffset,
} from "@/lib/datetime";

describe("localInputToIsoWithOffset", () => {
  it("生成带明确时区偏移的 ISO 8601", () => {
    const iso = localInputToIsoWithOffset("2026-07-27T12:20");
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
    expect(iso.startsWith("2026-07-27T12:20:00")).toBe(true);
  });

  it("非法输入抛出异常", () => {
    expect(() => localInputToIsoWithOffset("not-a-date")).toThrow();
    expect(() => localInputToIsoWithOffset("")).toThrow();
  });
});

describe("isoToLocalInput / 往返一致", () => {
  it("ISO → 本地控件值 → 带偏移 ISO，指向同一时刻", () => {
    const source = "2026-07-27T04:20:00Z";
    const roundTripped = localInputToIsoWithOffset(isoToLocalInput(source));
    expect(new Date(roundTripped).getTime()).toBe(new Date(source).getTime());
  });

  it("datetime-local 值往返后保持不变", () => {
    const input = "2026-01-05T08:30";
    expect(isoToLocalInput(localInputToIsoWithOffset(input))).toBe(input);
  });

  it("非法输入返回空字符串", () => {
    expect(isoToLocalInput("bad")).toBe("");
  });
});

describe("formatLocalDateTime", () => {
  it("输出 `YYYY-MM-DD HH:mm` 格式", () => {
    expect(formatLocalDateTime("2026-07-27T04:20:00Z")).toMatch(
      /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/,
    );
  });
});
