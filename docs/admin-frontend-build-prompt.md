# 后台管理系统构建 Prompt（最终版）

把下面整段内容连同本仓库交给负责前端界面的 AI。它以当前后端 API 为唯一事实来源；开始编码前应阅读 `README.md`、`docs/admin-api.md`、`docs/admin-backlog.md`、`CONTEXT.md` 和 FastAPI `/openapi.json`。

```text
你是一名资深前端与产品设计工程师。请在这个“个人自然语言记账”仓库的现有 FastAPI 后端之上，使用以下技术栈实现一个精致、克制、响应式的单用户后台管理系统。

## 技术栈（必须严格遵守）

- 构建工具：Vite 6+
- 框架：React 19 + TypeScript（严格模式）
- 样式：Tailwind CSS 4
- UI 组件：shadcn/ui（组件代码置入项目，按需定制，避免模板化 AI 仪表盘风格）
- 路由：React Router v7（或 v6 稳定版）
- 服务端状态：TanStack Query v5
- 表单：React Hook Form + Zod
- 图表：Recharts
- 测试：Vitest + React Testing Library + MSW；Playwright E2E（MVP 必做）
- 代码质量：ESLint + Prettier + tsc --noEmit

## 目录与工程结构

在仓库根目录创建 `frontend/`，与后端的 `app/` 平级：

```
frontend/
├── src/
│   ├── api/               # 集中 API client、TanStack Query hooks
│   ├── components/        # 通用组件 + shadcn/ui 组件
│   ├── pages/             # 页面级组件
│   ├── hooks/             # 自定义 hooks
│   ├── lib/               # 工具函数、常量、校验 schema
│   ├── routes/            # 路由配置与守卫
│   ├── styles/            # Tailwind 入口与全局样式
│   └── main.tsx
├── tests/
│   ├── unit/              # Vitest 测试
│   └── e2e/               # Playwright 测试
├── public/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.ts
└── playwright.config.ts
```

## 必须遵守的后端契约

1. 后台所有请求使用 `Authorization: Bearer <ADMIN_API_TOKEN>`。
2. 不要在后台使用 `APP_API_TOKEN`；它只属于 iPhone 快捷指令。
3. 手工新增必须调用 `POST /api/transactions/manual`，绝不能调用 `/parse-and-create`，因此不会消耗大模型额度。
4. 列表 `GET /api/transactions` 返回 `{items: Transaction[], total: number}`，不是数组。分页参数为 `limit`、`offset`；总页数为 `Math.ceil(total / limit)`。筛选变化后回到第 1 页。
5. 列表支持 `start_date`、`end_date`、`category`、`type`、`keyword`；日期边界由后端默认时区处理。
6. 详情、修改、删除分别使用 `GET/PATCH/DELETE /api/transactions/{id}`。`PATCH` 可修改 `type`、`amount`、`category`、`subcategory`、`occurred_at`、`merchant`、`note`、`payment_method`、`tags`；`subcategory` 可用 `null` 清空，`currency` 不可修改。
7. 今日和月度统计分别使用 `/api/summaries/daily` 与 `/api/summaries/monthly?year=...&month=...`。
8. `occurred_at` 提交时必须包含明确时区偏移，例如 `2026-07-27T12:20:00+08:00`。
9. 一级分类固定为：餐饮、交通、购物、娱乐、学习、生活缴费、医疗、社交、住房、收入、其他。
10. 统一处理后端错误结构 `{success, error_code, message, details}`；401 时清除内存中的凭证并回到登录界面，422 时把字段错误显示在对应控件附近。

## 页面与核心交互

### A. 登录页 `/login`
- 简洁的后台凭证输入，不暗示这是多用户账号登录。
- 提交后调用一个轻量只读后台接口（如 `GET /api/transactions?limit=1`）验证 Token。
- 验证中、失败、成功状态完整；Token 只保存在内存中，刷新页面后重新登录。

### B. 总览页 `/dashboard`
- 显示今日支出/收入、本月支出/收入/净额/笔数。
- 月度支出趋势图使用 `daily_totals` 画折线图或柱状图。
- 分类分布使用 `categories` 画环形图，中心可放本月总支出。
- 处理空数据、加载骨架、请求失败和重试。

### C. 交易列表页 `/transactions`
- 表格列建议：发生时间、类型、金额、分类、商户/备注、支付方式、标签、操作。
- 提供关键词、日期范围、类型、分类筛选和一键清空。
- 使用后端 `total` 做分页，展示“第 x–y 条 / 共 total 条”。
- 请求期间保留旧数据或显示稳定骨架，避免布局跳动。
- URL 查询参数同步筛选和页码，刷新后可恢复视图，但绝不把 Token 放入 URL。
- 移动端改为可扫读的卡片列表，不强行横向塞入整张表。

### D. 新增交易 `/transactions/new` 与编辑 `/transactions/:id/edit`
- 新增调用 `/manual`；编辑调用 `PATCH /{id}`。
- 金额输入避免浮点展示问题；新增时类型默认为支出，收入时可预选“收入”分类但允许修改；编辑时允许纠正收入/支出类型和清空子分类。
- 日期时间控件以用户本地时间编辑，提交时转换成带偏移的 ISO 8601。
- 标签支持输入、回车确认与删除；可选字段可留空。
- 保存中禁用重复提交；成功后提示并刷新相关列表和统计缓存。

### E. 删除
- 使用危险操作样式，但不要到处使用红色。
- 二次确认成功后处理当前页最后一条被删除的分页边界，并刷新统计。

## API Client 要求

- 建立单一 `api.ts`，集中注入 `Authorization`、解析错误和处理 401。
- 不要在组件里散落 `fetch`。
- TanStack Query 的 query key 设计要能支持缓存失效：新增/编辑/删除成功后，让列表和统计 query 失效。

## 安全红线

- 不得把 Token 硬编码进前端源码、构建产物、Git、URL 查询参数或 localStorage。
- 本地开发通过 Vite dev server proxy 代理 `/api` 到 `http://127.0.0.1:8000`；不要为此给 FastAPI 增加 CORS。
- 生产构建产物由 Caddy 同源托管。
- 删除操作必须二次确认，并明确展示金额、分类、日期和备注。

## npm Scripts 要求

至少提供：

- `npm run dev` —— 启动 dev server，代理 `/api` 到 `http://127.0.0.1:8000`
- `npm run build` —— 生产构建，输出到 `frontend/dist`
- `npm run preview` —— 本地预览生产构建
- `npm run test` —— 运行 Vitest
- `npm run test:e2e` —— 运行 Playwright
- `npm run lint` —— ESLint
- `npm run typecheck` —— `tsc --noEmit`
- `npm run format` —— Prettier

## 测试要求

- Vitest + React Testing Library + MSW 覆盖：API client 错误解析、分页计算、筛选序列化、Zod 表单校验、通用组件。
- Playwright 必须覆盖核心 happy path：登录 → 新增交易 → 列表可见 → 编辑交易 → 删除交易。
- E2E 使用环境变量 `E2E_ADMIN_TOKEN` 注入 Token，不要写死。
- 不要生成假数据冒充真实接口结果；开发 mock 必须与生产构建隔离。

## 可访问性与体验

- 保证键盘操作、可见焦点、语义标签、颜色对比度和 reduced-motion。
- 视觉上像成熟的个人财务产品：清晰的信息层级、舒服的留白、可靠的表格与表单状态，不要做成模板化“渐变色 + 巨型卡片”的 AI 仪表盘。

## 部署集成（必须完成）

1. 修改 `Dockerfile`：新增 Node 阶段，在构建时安装依赖并生成 `frontend/dist`。
2. 修改 `Caddyfile`：
   - 静态资源根目录指向 `/srv/frontend`；
   - SPA 路由回退到 `index.html`；
   - `/api`、`/health`、`/docs*`、`/redoc`、`/openapi.json` 继续反向代理到 FastAPI。
3. 修改 `docker-compose.yml`（如有需要）确保构建上下文包含 `frontend/`。
4. 更新 `README.md` 和 `docs/deployment.md` 的后台开发、测试与部署说明。

## 服务器更新流程（方案 A）

采用**前端源码与后端同仓库、服务器构建时由 Docker 多阶段构建生成产物**的策略。

这意味着：
- `frontend/` 目录保留在本仓库中，服务器 `git pull` 时会一并拉取前端源码。
- 前端源码在服务器上只占用少量磁盘空间，不会影响后端运行时；生产容器只包含 `frontend/dist` 构建产物。
- 不需要在服务器上单独安装 Node.js 或配置前端构建环境，所有前端构建都在 Docker 镜像构建阶段完成。

标准更新命令：

```bash
cd /path/to/bill-agent
git pull
docker compose up -d --build
```

此命令会重新构建应用镜像，Node 阶段会自动执行 `npm install` 和 `npm run build`，最终 Caddy 阶段拿到 `frontend/dist` 并启动服务。不需要手动上传构建产物，也不需要把 `node_modules` 提交到 Git。

## 本地开发流程

1. 后端：`python run.py`（监听 `127.0.0.1:8000`）。
2. 前端：`cd frontend && npm run dev`。
3. 浏览器访问前端地址，输入 `.env` 中的 `ADMIN_API_TOKEN` 登录。
4. 修改前端代码时通过 HMR 即时生效。

## 交付时请明确列出

- 新增/修改的文件；
- 技术选型和关键设计决定；
- 本地启动、测试、构建和部署命令；
- `ADMIN_API_TOKEN` 的安全使用方式；
- 已验证的 API 流程与尚未完成的限制。
```
