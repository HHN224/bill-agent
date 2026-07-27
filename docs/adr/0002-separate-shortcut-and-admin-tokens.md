---
status: accepted
---

# 0002：手机快捷指令与后台管理使用独立 Token

## Context

早期版本使用一枚 `APP_API_TOKEN` 保护自然语言记账、查询、修改、删除和统计。后台 Web 页面接入后，如果沿用同一枚凭证，手机 Token 泄露会同时暴露整个账本及删除权限；浏览器侧凭证也会获得调用大模型的能力。两类调用方的权限和风险明显不同。

## Decision

服务改为两枚相互独立的静态 Bearer Token：

- `APP_API_TOKEN` 只允许调用 `POST /api/transactions/parse-and-create`。
- `ADMIN_API_TOKEN` 允许手工创建、交易查询、修改、删除和统计，不允许调用自然语言解析入口。

两者均从环境变量读取，以 `secrets.compare_digest` 做常量时间比较；缺失配置时对应权限默认拒绝。部署时必须生成不同的高强度随机值。后台优先与 API 同源部署；纯 SPA 不得持久化 Token 到 `localStorage`，更成熟的登录需求应改用服务端会话与 `HttpOnly` Cookie。

## Consequences

- 手机 Token 泄露不再暴露账本读写和删除权限，也不能访问统计。
- 后台 Token 泄露仍会暴露全部管理权限，因此必须单独保管、轮换，并避免进入前端构建产物。
- 早期部署升级后必须新增 `ADMIN_API_TOKEN` 并重新创建 app 容器；只重启容器不会加载新环境变量。
- 原有列表、CRUD 和统计调用方必须改用后台 Token。
- 方案仍是单用户静态凭证，不提供多用户、权限角色、撤销会话或审计日志；需要这些能力时应引入真正的登录与服务端会话体系。
