/**
 * 日期时间工具：表单以用户本地时间编辑，提交时转换为
 * 带明确时区偏移的 ISO 8601（后端契约要求）。
 */

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** `2026-07-27T12:20` → `2026-07-27T12:20:00+08:00`（按本地时区）。 */
export function localInputToIsoWithOffset(value: string): string {
  const [datePart, timePart] = value.split("T");
  if (!datePart || !timePart) {
    throw new Error(`Invalid datetime-local value: ${value}`);
  }
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  const date = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid datetime value: ${value}`);
  }
  const offsetMinutesEast = -date.getTimezoneOffset();
  const sign = offsetMinutesEast >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMinutesEast);
  const offset = `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:00${offset}`
  );
}

/** 后端 ISO（UTC）→ datetime-local 控件值（本地时间）。 */
export function isoToLocalInput(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

/** 当前本地时间的 datetime-local 控件值，用于新增表单默认值。 */
export function nowLocalInput(): string {
  return isoToLocalInput(new Date().toISOString());
}

/** 表格/卡片中的紧凑展示：`2026-07-27 12:20`（本地时间）。 */
export function formatLocalDateTime(iso: string): string {
  const value = isoToLocalInput(iso);
  return value ? value.replace("T", " ") : iso;
}

/** `2026-07-27` 样式的本地日期。 */
export function formatLocalDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
