import { defineConfig, devices } from "@playwright/test";

/**
 * E2E 前置条件：
 * 1. 后端可用（默认期望 http://127.0.0.1:8000，可提前 `python run.py` 启动；
 *    未启动时 Playwright 会尝试用 `python run.py` 拉起）。
 * 2. 通过环境变量注入后台凭证：`E2E_ADMIN_TOKEN=... npm run test:e2e`。
 *    凭证绝不写入源码或测试文件。
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:5173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 7"] },
    },
  ],
  webServer: [
    {
      command: "python run.py",
      cwd: "..",
      url: "http://127.0.0.1:8000/health",
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: "npm run dev",
      url: "http://127.0.0.1:5173",
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
});
