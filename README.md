# 自然语言记账后端

这是个人自然语言记账系统的 FastAPI 后端。目前已完成阶段 1～5 的 MVP：iPhone 快捷指令可以提交自然语言，后端调用大模型解析、写入 SQLite，并提供交易管理及今日、月度统计 API。

统计完全由 SQLite 聚合计算，不会调用大模型。项目使用简单 Bearer Token 鉴权，适合个人使用，不包含用户系统或复杂前端。

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

以兼容 OpenAI Chat Completions 的 DeepSeek 服务为例：

```env
LLM_API_KEY=替换为你的密钥
LLM_BASE_URL=https://api.deepseek.com
LLM_MODEL=替换为账户可用的模型名称
LLM_TIMEOUT_SECONDS=8
```

`.env` 已被 Git 忽略。不要把真实的 API Key 或 Token 写进代码、README、截图或提交记录。

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

`127.0.0.1` 只能由本机访问。iPhone 在同一局域网调用时，需要把地址替换为电脑的局域网 IP，例如 `http://192.168.1.20:8000`，并允许系统防火墙放行 TCP 8000 端口。

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

## curl 验收命令

以下示例适用于 Windows PowerShell；macOS 或 Linux 把 `curl.exe` 改为 `curl`。请将 `YOUR_TOKEN` 和账单 ID 替换为实际值。

健康检查：

```powershell
curl.exe http://127.0.0.1:8000/health
```

解析并创建账单：

```powershell
curl.exe -X POST "http://127.0.0.1:8000/api/transactions/parse-and-create" `
  -H "Authorization: Bearer YOUR_TOKEN" `
  -H "Content-Type: application/json; charset=utf-8" `
  --data-raw '{"text":"中午食堂牛肉饭18块5，微信支付","timezone":"Asia/Taipei"}'
```

成功响应中的关键字段如下：

```json
{
  "success": true,
  "requires_confirmation": false,
  "message": "已记录：餐饮 18.50 元，牛肉饭",
  "transaction": {
    "id": 1,
    "amount": 18.5,
    "category": "餐饮",
    "note": "牛肉饭"
  }
}
```

查询、修改和删除账单：

```powershell
curl.exe "http://127.0.0.1:8000/api/transactions?limit=20" `
  -H "Authorization: Bearer YOUR_TOKEN"

curl.exe "http://127.0.0.1:8000/api/transactions/1" `
  -H "Authorization: Bearer YOUR_TOKEN"

curl.exe -X PATCH "http://127.0.0.1:8000/api/transactions/1" `
  -H "Authorization: Bearer YOUR_TOKEN" `
  -H "Content-Type: application/json; charset=utf-8" `
  --data-raw '{"amount":20.5,"note":"修正后的午饭"}'

curl.exe -X DELETE "http://127.0.0.1:8000/api/transactions/1" `
  -H "Authorization: Bearer YOUR_TOKEN"
```

查询今日和月度统计：

```powershell
curl.exe "http://127.0.0.1:8000/api/summaries/daily" `
  -H "Authorization: Bearer YOUR_TOKEN"

curl.exe "http://127.0.0.1:8000/api/summaries/monthly?year=2026&month=7" `
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 配置 iPhone 快捷指令

开始前确认 iPhone 能访问后端地址。局域网使用时，电脑和 iPhone 应连接同一个网络；从公网访问时，应使用带 HTTPS 的可信反向代理或隧道，不建议直接暴露开发服务器。

1. 打开“快捷指令”，新建快捷指令并命名为“快速记账”。
2. 添加“询问输入”操作。
3. 将提示文字设为“这笔钱花在哪里了？”，输入类型选择“文本”。
4. 添加“字典”操作。
5. 在字典中添加文本键 `text`，值选择前一步的“询问输入”结果。
6. 再添加文本键 `timezone`，值填写 `Asia/Taipei`；如果 `.env` 使用其他时区，这里填写相同的 IANA 时区名称。
7. 添加“获取 URL 内容”操作。
8. URL 填写 `http://电脑局域网IP:8000/api/transactions/parse-and-create`；部署到公网后改成对应的 HTTPS 地址。
9. 将方法设为 `POST`，请求体设为 `JSON`。
10. 把请求体的 `text` 和 `timezone` 分别绑定到前面的字典值；部分 iOS 版本可直接把整个字典作为 JSON 请求体。
11. 在“标头”中添加 `Authorization`，值填写 `Bearer 你的APP_API_TOKEN`。`Bearer` 后必须有一个空格。
12. 在请求动作之后添加“获取字典值”，键填写 `message`。
13. 添加“显示通知”或“显示结果”，内容选择上一步取得的 `message`。
14. 保存快捷指令并测试：输入“午饭食堂18块”，手机应显示类似“已记录：餐饮 18.00 元，午饭”。

如果模型没有识别到金额，接口会返回 `requires_confirmation: true`，快捷指令仍会展示 `message`，提示补充金额后重新输入。

## 运行测试

```powershell
python -m pytest -q
```

测试覆盖阶段 1～5 的配置、数据库、鉴权、模型客户端、解析器、交易管理、统计、统一错误响应，以及“请求 → 解析 → 入库 → 查询 → 汇总”的完整链路。自动化测试中的模型调用全部使用 Mock，不会消耗 API。

若只运行完整链路测试：

```powershell
python -m pytest -q tests/test_end_to_end.py
```

## 常见错误排查

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

第一版 MVP 到阶段 5 为止，不包含原生 iOS App、微信小程序、用户注册、多用户系统、邮箱登录、云同步、OCR、微信/支付宝自动读取、银行卡同步、复杂网页前端、AI 月度长篇总结、预算提醒、多币种汇率、发票管理、复杂账户体系、Docker 集群或微服务架构。
