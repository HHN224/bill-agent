# 自然语言记账后端

这是个人自然语言记账系统的 FastAPI 后端。目前完成到阶段 3：自然语言可以通过受 Token 保护的 API 解析并保存到 SQLite，也可以查询、修改和删除账单。

当前没有统计 API；今日与月度汇总属于阶段 4，不在本阶段范围内。

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
| `APP_API_TOKEN` | 所有交易 API 使用的 Bearer Token |
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

## 运行测试

```powershell
python -m pytest
```

测试覆盖阶段 1～3 的配置、数据库、鉴权、模型客户端、解析器、创建、待确认、查询过滤、修改、删除和统一错误响应。所有模型调用均使用 Mock，不会消耗 API。

## 阶段 3 已实现

- `app/services/llm_client.py`：兼容 Chat Completions 的 HTTP 客户端、超时和响应异常处理。
- `app/services/transaction_parser.py`：中文账单提示词、Pydantic 结果模型、预设分类、金额 Decimal 校验、时区上下文、Markdown 代码块清理和一次重试。
- `app/routers/transactions.py`：解析创建、列表、单条读取、修改和删除接口。
- 金额缺失时返回待确认结果，不写入数据库。
- 原始输入与全部结构化字段写入 SQLite。
- 金额在数据库中使用 `Numeric/Decimal`，标签使用 JSON，时间以带时区的 UTC ISO 8601 字符串保存。
- 统一处理验证错误、Token 错误、模型超时、非法模型响应、数据库错误和账单不存在。

## 当前边界

当前没有 `/api/summaries`，也不会计算今日、月度或分类统计。

iPhone 快捷指令现在可以调用 `parse-and-create`；详细快捷指令配置文档仍按计划留到阶段 5。
