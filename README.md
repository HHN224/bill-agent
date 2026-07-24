# 自然语言记账后端

这是个人自然语言记账系统的 FastAPI 后端。目前完成到阶段 4：除自然语言记账和交易管理外，还提供今日与月度收支、分类和每日支出统计。

统计完全由 SQLite 聚合计算，不会调用大模型。阶段 5 的完整测试文档与 iPhone 快捷指令配置说明尚未实现。

## 环境要求

- Python 3.11 或更高版本
- Windows、macOS 或 Linux

## 本机安装

Windows PowerShell：

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

macOS / Linux：

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
cp .env.example .env
```

打开 `.env`，把 `APP_API_TOKEN` 改成一个足够长的随机值，并填写要使用的大模型配置：

| 变量 | 当前用途 |
| --- | --- |
| `APP_API_TOKEN` | 所有交易与统计 API 使用的 Bearer Token |
| `DEFAULT_TIMEZONE` | 默认时区 |
| `DATABASE_URL` | SQLAlchemy 数据库地址 |
| `LLM_API_KEY` | 大模型 API 密钥 |
| `LLM_BASE_URL` | 兼容 Chat Completions 的 API 基础地址；留空时使用 OpenAI 默认地址 |
| `LLM_MODEL` | 厂商提供的模型名称 |
| `LLM_TIMEOUT_SECONDS` | 单次模型请求超时秒数，默认 8 秒 |

## 启动

激活虚拟环境后运行：

```powershell
python run.py
```

也可以直接使用 Uvicorn：

```powershell
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

首次启动会自动创建 `data/bookkeeping.db` 和 `transactions` 表。

可访问：

- 健康检查：<http://127.0.0.1:8000/health>
- Swagger 文档：<http://127.0.0.1:8000/docs>

健康检查不需要 Token：

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
```

预期结果：

```json
{"status": "ok"}
```

## 交易 API

除 `/health` 和文档外，交易 API 都需要请求头：

```text
Authorization: Bearer 你的APP_API_TOKEN
```

使用 PowerShell 解析并记录一笔账：

```powershell
$headers = @{ Authorization = "Bearer 你的APP_API_TOKEN" }
$body = @{
    text = "中午食堂牛肉饭18块5，微信支付"
    timezone = "Asia/Taipei"
} | ConvertTo-Json

Invoke-RestMethod `
    -Method Post `
    -Uri http://127.0.0.1:8000/api/transactions/parse-and-create `
    -Headers $headers `
    -ContentType "application/json" `
    -Body $body
```

查询最近账单：

```powershell
Invoke-RestMethod `
    -Uri "http://127.0.0.1:8000/api/transactions?limit=20" `
    -Headers $headers
```

当前提供：

- `POST /api/transactions/parse-and-create`
- `GET /api/transactions`
- `GET /api/transactions/{id}`
- `PATCH /api/transactions/{id}`
- `DELETE /api/transactions/{id}`

列表接口支持 `limit`、`offset`、`start_date`、`end_date`、`category`、`type` 和 `keyword`。

## 统计 API

查询默认时区中的今日统计：

```powershell
Invoke-RestMethod `
    -Uri http://127.0.0.1:8000/api/summaries/daily `
    -Headers $headers
```

查询指定月份：

```powershell
Invoke-RestMethod `
    -Uri "http://127.0.0.1:8000/api/summaries/monthly?year=2026&month=7" `
    -Headers $headers
```

当前提供：

- `GET /api/summaries/daily`
- `GET /api/summaries/monthly?year=YYYY&month=M`

统计口径：

- `expense_total`：区间内全部支出。
- `income_total`：区间内全部收入。
- `net_amount`：收入减支出，仅月度响应提供。
- `transaction_count`：区间内收入与支出的总笔数。
- `categories`：按一级分类汇总的支出，按金额倒序排列。
- `daily_totals`：按默认时区日期汇总的每日支出，仅包含有支出的日期。

日期边界按照 `DEFAULT_TIMEZONE` 计算，数据库中仍使用 UTC 时间查询。

## 运行测试

```powershell
python -m pytest
```

测试覆盖阶段 1～4 的配置、数据库、鉴权、模型客户端、解析器、交易管理、今日统计、月度统计、分类汇总、每日支出和统一错误响应。所有模型调用均使用 Mock，不会消耗 API。

## 阶段 4 已实现

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

## 当前边界

当前没有阶段 5 的快捷指令完整配置文档、补充 curl 示例集合和最终验收说明。

iPhone 快捷指令现在可以调用 `parse-and-create`；详细快捷指令配置文档仍按计划留到阶段 5。
