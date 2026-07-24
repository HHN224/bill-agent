# 自然语言记账后端

这是个人自然语言记账系统的 FastAPI 后端。目前只完成了阶段 1：项目骨架、环境配置、SQLite 初始化、账单数据模型、健康检查和 Bearer Token 鉴权基础设施。

模型解析、账单 API、统计 API 和 iPhone 快捷指令的实际连接将在后续阶段实现。

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

打开 `.env`，至少把 `APP_API_TOKEN` 改成一个足够长的随机值。环境变量用途如下：

| 变量 | 当前用途 |
| --- | --- |
| `APP_API_TOKEN` | 后续业务 API 的 Bearer Token |
| `DEFAULT_TIMEZONE` | 默认时区 |
| `DATABASE_URL` | SQLAlchemy 数据库地址 |
| `LLM_API_KEY` | 阶段 2 使用的大模型密钥，目前未使用 |
| `LLM_BASE_URL` | 阶段 2 使用的大模型 API 地址，目前未使用 |
| `LLM_MODEL` | 阶段 2 使用的模型名，目前未使用 |

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

阶段 1 的健康检查不需要 Token：

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

测试覆盖配置默认值、SQLite 表初始化、公开健康检查，以及正确、错误、缺失 Token 的鉴权行为。

## 阶段 1 边界

当前没有 `/api/transactions` 或 `/api/summaries` 接口，也不会调用大模型。iPhone 快捷指令应在阶段 3 的记账接口完成后再连接；届时它会发送 `Authorization: Bearer <APP_API_TOKEN>` 请求头。
