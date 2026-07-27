import type { Config } from "tailwindcss";

/**
 * Tailwind CSS 4 采用 CSS 优先配置（见 src/styles/globals.css 中的
 * `@theme` 令牌）。此文件仅声明内容扫描范围，供 `@config` 显式加载，
 * 避免依赖目录自动探测在 CI / Docker 构建中的不确定性。
 */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
} satisfies Config;
