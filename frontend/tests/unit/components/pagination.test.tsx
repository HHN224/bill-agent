import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { getPageItems, Pagination } from "@/components/ui/pagination";

describe("Pagination 组件", () => {
  it("展示条目区间与总数", () => {
    render(
      <Pagination page={2} limit={20} total={57} onPageChange={() => {}} />,
    );
    expect(screen.getByText(/第 21–40 条/)).toBeInTheDocument();
    expect(screen.getByText(/共 57 条/)).toBeInTheDocument();
  });

  it("空结果只显示共 0 条，不渲染页码", () => {
    render(
      <Pagination page={1} limit={20} total={0} onPageChange={() => {}} />,
    );
    expect(screen.getByText("共 0 条")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "上一页" }),
    ).not.toBeInTheDocument();
  });

  it("单页结果不渲染翻页按钮", () => {
    render(
      <Pagination page={1} limit={20} total={15} onPageChange={() => {}} />,
    );
    expect(
      screen.queryByRole("button", { name: "第 1 页" }),
    ).not.toBeInTheDocument();
  });

  it("第一页时上一页禁用", () => {
    render(
      <Pagination page={1} limit={20} total={57} onPageChange={() => {}} />,
    );
    expect(screen.getByRole("button", { name: "上一页" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "下一页" })).toBeEnabled();
  });

  it("最后一页时下一页禁用", () => {
    render(
      <Pagination page={3} limit={20} total={57} onPageChange={() => {}} />,
    );
    expect(screen.getByRole("button", { name: "下一页" })).toBeDisabled();
  });

  it("点击页码与翻页触发回调", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <Pagination page={2} limit={20} total={57} onPageChange={onPageChange} />,
    );

    await user.click(screen.getByRole("button", { name: "下一页" }));
    expect(onPageChange).toHaveBeenCalledWith(3);

    await user.click(screen.getByRole("button", { name: "上一页" }));
    expect(onPageChange).toHaveBeenCalledWith(1);

    await user.click(screen.getByRole("button", { name: "第 1 页" }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it("当前页有 aria-current 标注", () => {
    render(
      <Pagination page={2} limit={20} total={57} onPageChange={() => {}} />,
    );
    expect(screen.getByRole("button", { name: "第 2 页" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});

describe("getPageItems", () => {
  it("页数较少时全部展示", () => {
    expect(getPageItems(1, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it("页数较多时插入省略号", () => {
    expect(getPageItems(6, 12)).toEqual([
      1,
      2,
      "ellipsis",
      5,
      6,
      7,
      "ellipsis",
      11,
      12,
    ]);
    expect(getPageItems(1, 12)).toEqual([1, 2, "ellipsis", 11, 12]);
  });
});
