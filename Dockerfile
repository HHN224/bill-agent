# ---------- 前端构建阶段 ----------
# 服务器无需安装 Node.js；前端产物在镜像构建期间生成。
FROM node:22-alpine AS frontend-build

WORKDIR /build

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY frontend ./
RUN npm run build

# ---------- 后端运行时 ----------
FROM python:3.11-slim AS app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

COPY requirements.txt ./
RUN python -m pip install --no-cache-dir -r requirements.txt

RUN groupadd --gid 10001 app \
    && useradd --uid 10001 --gid app --home-dir /app --no-create-home app \
    && mkdir -p /app/data \
    && chown -R app:app /app

COPY --chown=app:app app ./app
COPY --chown=app:app alembic.ini ./
COPY --chown=app:app migrations ./migrations

USER app

EXPOSE 8000

CMD ["sh", "-c", "python -m alembic upgrade head && exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --no-access-log"]

# ---------- Web 入口（Caddy 同源托管前端产物） ----------
FROM caddy:2-alpine AS web

COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=frontend-build /build/dist /srv/frontend

EXPOSE 80 443
