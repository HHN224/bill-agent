---
status: accepted
---

# v1 部署：单 VPS 单 Compose 栈，单静态 Token 鉴权

MVP（阶段 1～5）完成后，项目决定以 Docker 部署到一台干净的公网 VPS：域名 + Caddy 反向代理自动 HTTPS，app 与 caddy 同处一个 Docker Compose 栈，配置全部进入 Git。app 只监听 Compose 内网，由 Caddy 对外开放 80/443；SQLite 通过绑定挂载持久化到宿主机目录，宿主机 cron 使用 `sqlite3 .backup` 每日创建在线快照并保留 30 天；Caddy 的证书与运行状态使用命名卷持久化。鉴权维持单一静态 Bearer Token，不加应用层限流；应用仅在失败路径使用 stdlib logging 输出到 stdout，关闭 Uvicorn access log，`/health` 使用 `SELECT 1` 探测数据库并在不可用时返回 503。

## Considered Options

- **裸 IP:port HTTP 暴露** —— Token 与账本内容明文过公网，否决。
- **应用层限流（slowapi 等）** —— 对防爆破无意义（长随机 Token + `compare_digest`）；只防"已泄露 Token 的滥用速度"，而厂商额度上限兜底更有效。否决。
- **Caddy Basic Auth / IP 白名单** —— iPhone 蜂窝网络 IP 不固定；多一个静态凭证不等于多一层安全。否决。
- **命名卷（named volume）存 SQLite 数据** —— 命名卷的物理路径由 Docker 管理、官方视为实现细节，宿主机不应直接访问；与"宿主机 cron 执行 `.backup`"的决策冲突。否决，改用绑定挂载。
- **直接 cp 正在使用的 SQLite 文件** —— 无法保证活动数据库快照一致性。否决，使用 SQLite Online Backup 对应的 .backup。
- **Litestream 持续复制到 S3** —— SQLite 备份的标准答案，但对 KB/MB 级个人库过重，且多一个容器要维护。否决，留作未来改进。
- **Loki / ELK 日志栈** —— 单容器个人应用不需要。否决。
- **异地备份** —— 用户当前没有异地存储落脚点，暂缓；有了之后一条 rclone 即可补上。

## Consequences

- Token 一旦泄露，持有者可读写全部账本并通过 `parse-and-create` 消耗 LLM 额度。因此两个上线前置动作是**必须**的：① LLM 厂商控制台设置消费上限/余额告警；② README 写明 Token 轮换流程（改 `.env` → `docker compose up -d --force-recreate app` → 验证新旧 Token → 更新快捷指令）。单纯执行 `docker compose restart` 不会重新读取环境变量。
- 备份仅存本机 → VPS 磁盘报废即账本全失。此风险已被明确接受。
- SQLite 数据目录和备份目录都位于宿主机。首次部署必须为 app 的非 root UID 准备数据目录写权限，并完成一次备份恢复与 `PRAGMA integrity_check` 演练。
- Caddy 必须持久化 `/data` 和 `/config`；Caddy 仅接收域名变量，不接收包含 LLM Key 和应用 Token 的完整环境文件。
- 防火墙的“只放行 80/443”仅指业务流量。VPS 必须保留 SSH 管理端口，优先使用密钥登录并在条件允许时限制来源地址；app 的 8000 端口不得发布到宿主机。
- Uvicorn access log 默认关闭，避免正常请求产生持续日志；失败日志中的模型原始返回只能记录清理、截断后的片段，禁止记录 API Key、Bearer Token、完整提示词或完整模型响应。
- README 必须警告不要执行 `docker compose down -v`，因为它会删除 Caddy 命名卷；删除宿主机数据目录同样会永久删除 SQLite 主库。
- 管理员 Web UI 开工时需补后端配套（CORS、年度/自定义区间统计、分类列表 API），届时另行决策，本阶段一律不提前做。
- "预算提醒"与"AI 月度总结"确认为未来候选需求，不在本阶段实现（见 README 当前边界）。
