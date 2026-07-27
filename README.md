# Pocket Ledger API

一个为个人使用设计的自然语言记账后端：iPhone 快捷指令说一句话即可记账，同时为后台管理页面提供不经过大模型的结构化 CRUD、分页查询和收支统计。

## 功能亮点

- 自然语言记账：调用大模型解析金额、分类、时间、商户和备注。
- 手工记账：后台表单直接写库，不消耗模型额度，响应更快。
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
| `PATCH` | `/api/transactions/{id}` | 修改金额、分类、时间、商户、备注、支付方式或标签 |
| `DELETE` | `/api/transactions/{id}` | 永久删除单笔交易 |
| `GET` | `/api/summaries/daily` | 默认时区的今日收支统计 |
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

## 部署与升级

生产环境使用单 VPS 的 Docker Compose：Caddy 负责 HTTPS，FastAPI 仅暴露在 Compose 内网，SQLite 绑定挂载到宿主机。

完整步骤见 [部署、更新、Token 轮换、备份与恢复手册](docs/deployment.md)。从早期单 Token 版本升级时，必须先在服务器 `.env` 增加一个与 `APP_API_TOKEN` 不同的 `ADMIN_API_TOKEN`，然后重新创建应用容器：

```bash
docker compose up -d --build --force-recreate app
```

只执行 `docker compose restart app` 不会重新读取 `.env`。不要执行 `docker compose down -v`，也不要删除 `DATA_HOST_DIR`。

## 后台开发交接

- [可直接交给前端 AI 的后台构建 Prompt](docs/admin-frontend-prompt.md)
- [后台 API 契约](docs/admin-api.md)
- [领域术语](CONTEXT.md)
- [鉴权拆分架构决策](docs/adr/0002-separate-shortcut-and-admin-tokens.md)

本项目当前是单用户个人系统。`ADMIN_API_TOKEN` 是独立静态凭证，不等同于完整的多用户账号系统；前端应同源部署，且不得把 Token 写入源码、URL 或 `localStorage`。如未来需要长期登录、多用户或更强的浏览器安全，应升级为服务端会话与 `HttpOnly` Cookie。
