# 自然语言记账后端

这是个人自然语言记账系统的 FastAPI 后端。目前完成到阶段 2：在阶段 1 的项目骨架、SQLite 和鉴权基础上，加入了兼容 OpenAI Chat Completions 风格的大模型客户端与自然语言账单解析服务。

当前解析服务只作为内部 Python 模块存在。账单保存、交易 API、统计 API 和 iPhone 快捷指令的实际连接将在后续阶段实现。

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

打开 `.env`，把 `APP_API_TOKEN` 改成一个足够长的随机值。若要在后续代码中真实调用解析服务，还需要填写大模型配置：

| 变量 | 当前用途 |
| --- | --- |
| `APP_API_TOKEN` | 后续业务 API 的 Bearer Token |
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

## 运行测试

```powershell
python -m pytest
```

测试覆盖配置、SQLite 初始化、健康检查、Token 鉴权、模型请求格式、超时与异常转换、JSON 清理、结构校验、金额和分类解析，以及非法输出的一次重试。所有模型调用均使用 Mock，不会消耗 API。

## 阶段 2 已实现

- `app/services/llm_client.py`：兼容 Chat Completions 的 HTTP 客户端、超时和响应异常处理。
- `app/services/transaction_parser.py`：中文账单提示词、Pydantic 结果模型、预设分类、金额 Decimal 校验、时区上下文、Markdown 代码块清理和一次重试。
- 模型返回金额缺失时保留 `amount: null`，供阶段 3 返回“需要补充金额”的确认响应。

## 当前边界

当前没有 `/api/transactions` 或 `/api/summaries` 接口，解析结果也不会写入数据库。启动 FastAPI 后仍只暴露阶段 1 的 `/health`；这是为了不提前实现阶段 3。

iPhone 快捷指令应在阶段 3 的 `parse-and-create` 接口完成后再连接；届时它会发送 `Authorization: Bearer <APP_API_TOKEN>` 请求头。
