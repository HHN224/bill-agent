# Pocket Ledger

一个为个人使用设计的自然语言记账系统：iPhone 快捷指令说一句话即可记账；自带同源部署的后台管理页面，提供不经过大模型的结构化 CRUD、分页查询和收支统计。

## 功能亮点

- 自然语言记账：调用大模型解析金额、分类、时间、商户和备注。
- 手工记账：后台表单直接写库，不消耗模型额度，响应更快。
- 后台管理页面：React 单页应用，覆盖总览统计、交易管理、手工新增与编辑，移动端自适应。
- 交易管理：按日期、分类、类型和关键词筛选，支持分页、详情、修改和删除。
- 收支统计：提供今日和月度汇总，统计完全由 SQLite 计算。
- 权限隔离：手机快捷指令和后台管理使用两枚不同的 Bearer Token。
- 生产可用：FastAPI + SQLAlchemy + Alembic + SQLite，附 Docker Compose、Caddy HTTPS、备份与恢复手册。

## 快速开始

要求 Python 3.11 或更高版本。

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

macOS / Linux 对应使用：

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
cp .env.example .env
```

编辑 `.env`，至少设置两枚不同的高强度随机 Token，并填写大模型配置：

```dotenv
APP_API_TOKEN=手机快捷指令专用随机值
ADMIN_API_TOKEN=后台管理专用的另一个随机值
DEFAULT_TIMEZONE=Asia/Hong_Kong
DATABASE_URL=sqlite:///./data/bookkeeping.db

LLM_API_KEY=你的模型密钥
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=实际使用的模型名称
LLM_TIMEOUT_SECONDS=8
```

初始化数据库并启动：

```powershell
python -m alembic upgrade head
python run.py
```

打开：

- 健康检查：<http://127.0.0.1:8000/health>
- Swagger API 文档：<http://127.0.0.1:8000/docs>

## 配置

| 变量 | 用途 |
| --- | --- |
| `APP_API_TOKEN` | 仅用于 `parse-and-create`，配置在 iPhone 快捷指令中 |
| `ADMIN_API_TOKEN` | 用于后台手工记账、查询、修改、删除和统计 |
| `DEFAULT_TIMEZONE` | 日期筛选与统计的默认 IANA 时区 |
| `DATABASE_URL` | SQLAlchemy 数据库地址 |
| `LLM_API_KEY` | 大模型 API 密钥 |
| `LLM_BASE_URL` | 兼容 Chat Completions 的 API 基础地址 |
| `LLM_MODEL` | 模型名称 |
| `LLM_TIMEOUT_SECONDS` | 单次模型调用超时秒数 |
| `DOMAIN` | Docker + Caddy 部署使用的域名 |
| `DATA_HOST_DIR` | VPS 上的 SQLite 数据目录 |
| `BACKUP_HOST_DIR` | VPS 上的一致性备份目录 |

`.env` 已被 Git 忽略。不要把真实 Token 或模型密钥写进源码、README、截图或提交记录。

## 鉴权边界

所有受保护接口使用：

```text
Authorization: Bearer 对应的Token
```

| 调用方 | Token | 允许访问 |
| --- | --- | --- |
| iPhone 快捷指令 | `APP_API_TOKEN` | 仅自然语言解析并创建交易 |
| 后台管理系统 | `ADMIN_API_TOKEN` | 手工创建、列表、详情、修改、删除、统计 |

两枚 Token 不可互换。手机 Token 泄露时，攻击者不能读取、修改或删除已有交易；后台 Token 也不能调用大模型入口。若任一 Token 未配置，对应接口会保持拒绝访问。

## API 速查

### 自然语言记账

`POST /api/transactions/parse-and-create`，使用 `APP_API_TOKEN`：

```json
{
  "text": "中午食堂牛肉饭18块5，微信支付",
  "timezone": "Asia/Hong_Kong"
}
```

解析到有效金额时写入数据库；金额缺失时返回 `requires_confirmation: true`，不会保存交易。

### 手工记账

`POST /api/transactions/manual`，使用 `ADMIN_API_TOKEN`。这个接口不调用大模型：

```json
{
  "type": "expense",
  "amount": 18.5,
  "currency": "CNY",
  "category": "餐饮",
  "subcategory": "午餐",
  "merchant": "学校食堂",
  "payment_method": "微信",
  "occurred_at": "2026-07-27T12:20:00+08:00",
  "note": "牛肉饭",
  "tags": ["食堂", "午餐"]
}
```

必填字段为 `amount`、`category` 和带时区偏移的 `occurred_at`。`type` 默认 `expense`，`currency` 默认 `CNY`，`tags` 默认空数组。成功返回 `201 Created` 和完整交易；手工创建的 `raw_text` 为 `""`，`confidence` 为 `null`。

一级分类固定为：`餐饮`、`交通`、`购物`、`娱乐`、`学习`、`生活缴费`、`医疗`、`社交`、`住房`、`收入`、`其他`。

### 分页查询

`GET /api/transactions?limit=20&offset=0`，使用 `ADMIN_API_TOKEN`：

```json
{
  "items": [
    {
      "id": 123,
      "type": "expense",
      "amount": 18.5,
      "category": "餐饮",
      "occurred_at": "2026-07-27T04:20:00Z"
    }
  ],
  "total": 57
}
```

`total` 是当前筛选条件命中的总条数，不受 `limit` 和 `offset` 影响。后台可用 `Math.ceil(total / limit)` 计算总页数。

支持的查询参数：

| 参数 | 说明 |
| --- | --- |
| `limit` | 每页条数，1～100，默认 20 |
| `offset` | 跳过条数，默认 0 |
| `start_date` / `end_date` | 按默认时区筛选，格式 `YYYY-MM-DD`，包含结束日 |
| `category` | 一级分类 |
| `type` | `expense` 或 `income` |
| `keyword` | 匹配原始文本、备注或商户 |

### 其他后台接口

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| `GET` | `/api/transactions/{id}` | 查询单笔交易 |
| `PATCH` | `/api/transactions/{id}` | 修改类型、金额、分类、子分类、时间、商户、备注、支付方式或标签 |
| `DELETE` | `/api/transactions/{id}` | 永久删除单笔交易 |
| `GET` | `/api/summaries/daily` | 默认时区的今日收支统计；支持 APP 或 ADMIN Token |
| `GET` | `/api/summaries/monthly?year=2026&month=7` | 月度收支、净额、分类和每日支出 |

完整请求与响应契约见 [后台 API 契约](docs/admin-api.md)。

## iPhone 快捷指令

快捷指令只需要调用自然语言入口：

1. “询问输入”获取记账文本。
2. 创建字典：`text` 为输入结果，`timezone` 为服务使用的 IANA 时区。
3. “获取 URL 内容”：方法 `POST`，URL 为 `https://你的域名/api/transactions/parse-and-create`。
4. 请求体选择 JSON；请求头添加 `Authorization: Bearer 你的APP_API_TOKEN`。
5. 显示响应中的 `message`。

不要把 `ADMIN_API_TOKEN` 放进快捷指令。

## 测试

```powershell
python -m pytest
python -m alembic check
```

测试覆盖解析、两枚 Token 的权限隔离、手工记账不调用模型、筛选分页总数、CRUD、统计、迁移、容器配置和完整调用链。

## 后台前端（frontend/）

`frontend/` 是与 `app/` 平级的后台管理单页应用：Vite + React 19 + TypeScript（严格模式）+ Tailwind CSS 4 + shadcn/ui 风格组件 + React Router + TanStack Query + React Hook Form/Zod + Recharts。

本地开发（前端开发服务器把 `/api` 代理到本地后端，无需 CORS）：

```powershell
python run.py                    # 终端 1：后端监听 127.0.0.1:8000
cd frontend
npm install                      # 首次
npm run dev                      # 终端 2：前端监听 127.0.0.1:5173
```

打开 <http://127.0.0.1:5173>，输入 `.env` 中的 `ADMIN_API_TOKEN` 登录。凭证只保存在页面内存中，刷新后需重新输入；它不会进入源码、构建产物、URL 或 localStorage。

常用命令（均在 `frontend/` 下）：

| 命令 | 用途 |
| --- | --- |
| `npm run dev` | 开发服务器（代理 `/api` 到 127.0.0.1:8000） |
| `npm run build` | 类型检查 + 生产构建到 `frontend/dist` |
| `npm run preview` | 本地预览生产构建 |
| `npm run test` | Vitest 单元/组件测试（MSW 拦截接口） |
| `npm run test:e2e` | Playwright 端到端测试 |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run format` | Prettier |

E2E 需要可用后端，并通过环境变量注入凭证（不要写进任何文件）：

```powershell
$env:E2E_ADMIN_TOKEN = "本地 .env 中的 ADMIN_API_TOKEN"
npm run test:e2e
```

## 部署与升级

生产环境使用单 VPS 的 Docker Compose：Caddy 负责 HTTPS 并同源托管后台前端（`/srv/frontend`，SPA 回退到 `index.html`），`/api`、`/health`、`/docs*`、`/redoc`、`/openapi.json` 反向代理到仅暴露在 Compose 内网的 FastAPI，SQLite 绑定挂载到宿主机。

前端源码随仓库一起 `git pull` 到服务器，前端产物由 Docker 多阶段构建生成（Node 阶段执行 `npm ci && npm run build`），服务器无需安装 Node.js，也无需提交 `node_modules` 或构建产物。标准更新命令：

```bash
cd /path/to/bill-agent
git pull
docker compose up -d --build
```

完整步骤见 [部署、更新、Token 轮换、备份与恢复手册](docs/deployment.md)。从早期单 Token 版本升级时，必须先在服务器 `.env` 增加一个与 `APP_API_TOKEN` 不同的 `ADMIN_API_TOKEN`，然后重新创建应用容器：

```bash
docker compose up -d --build --force-recreate app
```

只执行 `docker compose restart app` 不会重新读取 `.env`。不要执行 `docker compose down -v`，也不要删除 `DATA_HOST_DIR`。

## 后台开发交接
| 现象 | 原因与处理 |
| --- | --- |
| `401 UNAUTHORIZED` | 检查请求头是否为 `Authorization: Bearer APP_API_TOKEN的值`，注意 `Bearer` 后的空格，并确认服务已在修改 `.env` 后重启。 |
| `422 VALIDATION_ERROR` | 请求体必须是 JSON 且包含非空 `text`；日期应为 `YYYY-MM-DD`，时间应为带时区偏移的 ISO 8601。 |
| `400 INVALID_PARSER_INPUT` | `timezone` 不是有效的 IANA 时区名称，建议使用 `Asia/Taipei` 或 `.env` 中的 `DEFAULT_TIMEZONE`。 |
| `503 LLM_NOT_CONFIGURED` | 检查 `.env` 中的 `LLM_API_KEY`、`LLM_MODEL`，修改后重启服务。 |
| `502 LLM_SERVICE_ERROR` | 模型地址、模型名、密钥、余额或厂商服务可能异常；先核对厂商控制台和 `LLM_BASE_URL`。 |
| `502 INVALID_LLM_RESPONSE` | 模型连续两次没有返回符合约束的 JSON；可换用更稳定的模型后重试。 |
| `504 LLM_TIMEOUT` | 模型未在 `LLM_TIMEOUT_SECONDS` 内响应；确认网络正常，必要时适当增大超时值后重启。 |
| iPhone 无法连接 | 不要在手机中使用 `127.0.0.1`；改用电脑局域网 IP，确认同一网络、防火墙放行 8000 端口，并保持后端运行。 |
| SQLite 写入失败 | 检查 `DATABASE_URL` 指向的目录是否存在且当前用户可写；默认数据库目录为 `data/`。 |
| 中文请求乱码 | 请求头使用 `Content-Type: application/json; charset=utf-8`，并通过 JSON 请求体发送文本。 |

出现错误时可先访问 `/health` 判断服务是否运行，再访问 `/docs` 使用 Swagger 单独验证接口。日志和反馈中不要粘贴 API Key、Token 或完整 Authorization 请求头。

## 阶段 5 已实现

- `app/services/llm_client.py`：兼容 Chat Completions 的 HTTP 客户端、超时和响应异常处理。
- `app/services/transaction_parser.py`：中文账单提示词、Pydantic 结果模型、预设分类、金额 Decimal 校验、时区上下文、Markdown 代码块清理和一次重试。
- `app/routers/transactions.py`：解析创建、列表、单条读取、修改和删除接口。
- 金额缺失时返回待确认结果，不写入数据库。
- 原始输入与全部结构化字段写入 SQLite。
- 金额在数据库中使用 `Numeric/Decimal`，标签使用 JSON，时间以带时区的 UTC ISO 8601 字符串保存。
- 统一处理验证错误、Token 错误、模型超时、非法模型响应、数据库错误和账单不存在。
- `app/services/summary_service.py`：使用 SQLite 聚合计算收支、净额、分类和每日支出。
- `app/routers/summaries.py`：提供受 Token 保护的今日与月度统计接口。
- 空日期或空月份返回零金额、零笔数和空明细。
- 单元测试覆盖常见中文金额、收支类型、相对日期、非法模型返回和金额缺失。
- API 测试覆盖鉴权、交易增删改查、今日统计和月度统计。
- 完整链路测试使用 Mock 模型响应验证解析、SQLite 入库、最近账单和月度汇总。
- README 提供 iPhone 快捷指令、curl 命令、错误排查和最终验收步骤。

## MVP 验收清单

启动服务后，可按以下顺序手动验收：

1. 访问 `/health`，确认返回 `{"status":"ok"}`。
2. 使用 curl 或 Swagger 提交“午饭15”，确认返回成功消息并带有账单 ID。
3. 提交“昨天买奶茶12元”，确认日期为昨天且金额为 12。
4. 提交“收到生活费1000元”，确认类型为 `income`、分类为“收入”。
5. 查询 `/api/transactions?limit=20`，确认新账单按发生时间倒序出现。
6. 使用 `PATCH` 修正一笔账单，再查询确认修改生效。
7. 使用 `DELETE` 删除测试账单，再查询应返回 404。
8. 查看今日及月度统计，确认金额与数据库记录一致。
9. 在 iPhone 快捷指令中完成一次记账，确认手机显示返回的 `message`。
10. 运行 `python -m pytest -q`，确认自动化测试全部通过。

## 当前边界

第一版 MVP 到阶段 5 为止，不包含原生 iOS App、微信小程序、用户注册、多用户系统、邮箱登录、云同步、OCR、微信/支付宝自动读取、银行卡同步、复杂网页前端、AI 月度长篇总结、预算提醒、多币种汇率、发票管理、复杂账户体系、Docker 集群或微服务架构。其中"预算提醒"与"AI 月度总结"已确认为未来候选需求；管理员 Web UI 及其后端配套（CORS、年度/自定义区间统计、分类列表 API）在 UI 开工时另行设计，不提前实现。

## 阶段 6：Docker 部署

生产部署、更新、回滚、Token 轮换以及 SQLite 备份恢复的可执行步骤见
[`docs/deployment.md`](docs/deployment.md)。

决策已定，依据见 `docs/adr/0001-single-vps-deployment-and-token-auth.md`，领域术语见 `CONTEXT.md`。实现与上线检查清单：

1. `Dockerfile`：使用 `python:3.11-slim` 或更新版本，创建并切换到非 root 用户；生产命令使用单进程 Uvicorn，不带 `--reload`，并通过 `--no-access-log` 关闭正常请求访问日志。
2. `.dockerignore`：排除 `.venv`、`data/`、`.git`、`.env`、`__pycache__`、pytest 缓存和其他本地临时文件，真实密钥不得进入构建上下文。
3. `docker-compose.yml`：包含 `app` 与 `caddy` 两个服务。`${DATA_HOST_DIR}` 绑定挂载到 app 的 `/app/data`；Caddy 使用独立的 `/data`、`/config` 命名卷。两服务使用 `restart: unless-stopped` 和 `json-file` 日志轮转（如 `max-size: 10m`、`max-file: 3`）。
4. 网络和配置隔离：app 不发布宿主机端口，只由 Caddy 通过 Compose 内网访问 `app:8000`。app 使用 `env_file: .env`；Caddy 只显式接收 `DOMAIN`，不得获得 LLM Key 或 `APP_API_TOKEN`。
5. `Caddyfile`：使用部署域名反向代理到 `app:8000`，自动签发和续期 HTTPS 证书。Caddy 对外发布 TCP 80/443，并可发布 UDP 443 以支持 HTTP/3。
6. `app/main.py` 的 `/health` 增加数据库探活：执行 `SELECT 1`，成功返回 200 与 `{"status":"ok"}`，失败返回 503；Compose HEALTHCHECK 使用镜像已有的 Python 标准库访问该端点，无需仅为探活安装 curl。
7. 应用日志：使用 stdlib `logging` 显式输出到 stdout，仅记录 LLM 超时/服务错误、模型响应结构错误、解析重试、数据库错误等失败路径。模型原始返回只允许记录清理并截断后的片段，不记录 API Key、Bearer Token、完整提示词或完整模型响应。
8. 运维文档：补充干净 VPS 的 Docker 与宿主机 `sqlite3` 安装、目录权限准备、DNS、启动、更新、回滚、日志查看、健康检查、Token 轮换、备份与恢复步骤。必须注明修改 `.env` 后使用 `docker compose up -d --force-recreate app`；单纯 `docker compose restart` 不会加载新环境变量。
9. 备份：宿主机 cron 对 `${DATA_HOST_DIR}/bookkeeping.db` 执行 `sqlite3 .backup`，把一致性快照写入 `${BACKUP_HOST_DIR}`，删除超过 30 天的旧备份。cron 中的 `%` 必须转义；上线前必须完成一次恢复及 `PRAGMA integrity_check` 演练。备份仍位于同一 VPS，不覆盖整机或磁盘丢失风险。
10. 上线前置人工动作：LLM 厂商控制台设置消费上限/余额告警；域名 A/AAAA 记录正确指向 VPS；防火墙仅向公网开放业务所需的 80/443，同时保留 SSH 管理端口并优先使用密钥登录；确认宿主机未开放 app 的 8000 端口。

实现与验收按以下顺序完成：

1. 先完成 `/health` 数据库探活、失败日志和对应自动化测试。
2. 编写并验证 `Dockerfile`、`.dockerignore`，确认镜像以非 root 用户运行且能写入准备好的宿主机数据目录。
3. 加入 Compose 与 Caddy，验证 app 端口不外露、Caddy 自动 HTTPS 所需卷完整、两服务日志轮转生效。
4. 编写服务器部署、Token 轮换、备份与恢复文档，并在临时目录实际演练。
5. 在本机或测试 VPS 依次执行构建、启动、健康检查、API 验收、数据持久化、备份恢复和容器重建测试。

阶段 6 验收标准：

- `docker compose config` 校验通过，镜像构建成功，现有 Python 自动化测试全部通过。
- app 容器内进程不是 root；首次启动能在空的宿主机数据目录中创建数据库。
- `/health` 在数据库正常时返回 200，在数据库不可用时返回 503，Docker 能据此标记容器健康状态。
- 宿主机无法直接连接 app 的 8000 端口；HTTP 自动跳转 HTTPS，HTTPS 证书有效。
- 容器重启、重新构建和普通 `docker compose down && docker compose up -d` 后交易数据仍存在。
- Token 轮换后旧 Token 返回 401，新 Token 可正常调用，并已同步更新 iPhone 快捷指令。
- 日志包含需要排查的失败上下文，但不包含任何密钥、完整 Authorization 请求头或完整模型响应。
- 每日备份能生成且 30 天保留策略有效；从备份恢复后 `PRAGMA integrity_check` 返回 `ok`。

不要执行 `docker compose down -v`，该命令会删除 Caddy 的证书与运行状态卷；不要删除 `${DATA_HOST_DIR}`，其中保存 SQLite 主库。

- 偷偷在这里放置一个传送标记
## 数据库迁移（Alembic）

数据库结构由 Alembic 管理。Docker 容器启动时会先执行 `python -m alembic upgrade head`，迁移成功后才启动 API；迁移失败时容器会退出，不会让旧结构数据库继续提供服务。

本地常用命令：

- [可直接交给前端 AI 的后台构建 Prompt](docs/admin-frontend-prompt.md)
- [后台 API 契约](docs/admin-api.md)
- [后台 MVP 边界与后续迭代候选](docs/admin-backlog.md)
- [领域术语](CONTEXT.md)
- [鉴权拆分架构决策](docs/adr/0002-separate-shortcut-and-admin-tokens.md)

本项目当前是单用户个人系统。`ADMIN_API_TOKEN` 是独立静态凭证，不等同于完整的多用户账号系统；前端应同源部署，且不得把 Token 写入源码、URL 或 `localStorage`。如未来需要长期登录、多用户或更强的浏览器安全，应升级为服务端会话与 `HttpOnly` Cookie。
