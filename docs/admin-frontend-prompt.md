# 后台管理系统构建 Prompt

把下面整段内容连同本仓库交给负责前端界面的 AI。它以当前后端 API 为唯一事实来源；开始编码前应阅读 `README.md`、`docs/admin-api.md` 和 FastAPI `/openapi.json`。

```text
你是一名资深前端与产品设计工程师。请在这个“个人自然语言记账”仓库的现有 FastAPI 后端之上，设计并实现一个精致、克制、响应式的单用户后台管理系统。不要改写现有后端业务语义，也不要虚构 API；先阅读 README.md、docs/admin-api.md，并在开发环境核对 /openapi.json。

产品目标：
- 让我快速查看本月财务状态、筛选和分页浏览交易、手工新增交易、编辑或删除错误交易。
- 界面适合桌面管理，也要在手机和平板上可用。
- 视觉上像成熟的个人财务产品：清晰的信息层级、舒服的留白、可靠的表格与表单状态，不要做成模板化“渐变色 + 巨型卡片”的 AI 仪表盘。

必须遵守的后端契约：
1. 后台所有请求使用 Authorization: Bearer <ADMIN_API_TOKEN>。
2. 不要在后台使用 APP_API_TOKEN；它只属于 iPhone 快捷指令。
3. 手工新增必须调用 POST /api/transactions/manual，绝不能调用 /parse-and-create，因此不会消耗大模型额度。
4. 列表 GET /api/transactions 返回 {items: Transaction[], total: number}，不是数组。分页参数为 limit、offset；总页数为 Math.ceil(total / limit)。筛选变化后回到第 1 页。
5. 列表支持 start_date、end_date、category、type、keyword；日期边界由后端默认时区处理。
6. 详情、修改、删除分别使用 GET/PATCH/DELETE /api/transactions/{id}。
7. 今日和月度统计分别使用 /api/summaries/daily 与 /api/summaries/monthly?year=...&month=...。
8. occurred_at 提交时必须包含明确时区偏移，例如 2026-07-27T12:20:00+08:00。
9. 一级分类固定为：餐饮、交通、购物、娱乐、学习、生活缴费、医疗、社交、住房、收入、其他。
10. 统一处理后端错误结构 success/error_code/message/details；401 时清除内存中的凭证并回到登录界面，422 时把字段错误显示在对应控件附近。

安全与部署约束：
- 当前后端使用独立的静态 ADMIN_API_TOKEN，不是多用户账号系统。
- 不得把 Token 硬编码进前端源码、构建产物、Git、URL 查询参数或 localStorage。
- 首选把后台与 API 同源部署。当前后端没有开放 CORS；本地开发通过 dev server proxy 代理 /api。
- 如果实现纯 SPA 登录页，让用户输入 ADMIN_API_TOKEN，只保存在内存中；刷新页面重新登录是可接受的安全取舍。
- 如果引入服务端/BFF，则把 Token 保存在服务端，并用 Secure、HttpOnly、SameSite Cookie 管理浏览器会话；不要把 Token 下发给浏览器。
- 删除操作必须二次确认，并明确展示金额、分类、日期和备注。

页面与核心交互：
A. 登录页
- 简洁的后台凭证输入，不暗示这是多用户账号登录。
- 提交后通过一个轻量只读后台接口验证 Token；验证中、失败、成功状态完整。

B. 总览页
- 显示今日支出/收入、本月支出/收入/净额/笔数。
- 月度支出趋势图使用 daily_totals，分类分布使用 categories。
- 处理空数据、加载骨架、请求失败和重试。

C. 交易列表页
- 表格列建议：发生时间、类型、金额、分类、商户/备注、支付方式、标签、操作。
- 提供关键词、日期范围、类型、分类筛选和一键清空。
- 使用后端 total 做分页，展示“第 x–y 条 / 共 total 条”；请求期间保留旧数据或显示稳定骨架，避免布局跳动。
- URL 查询参数同步筛选和页码，刷新后可恢复视图，但绝不把 Token 放入 URL。
- 移动端改为可扫读的卡片列表，不强行横向塞入整张表。

D. 新增/编辑交易
- 新增调用 /manual；编辑调用 PATCH /{id}。
- 金额输入避免浮点展示问题；类型默认为支出，收入时可合理预选“收入”分类但允许修改。
- 日期时间控件以用户本地时间编辑，提交时转换成带偏移的 ISO 8601。
- 标签支持输入、回车确认与删除；可选字段可留空。
- 保存中禁用重复提交；成功后提示并刷新相关列表和统计缓存。

E. 删除
- 使用危险操作样式，但不要到处使用红色。
- 二次确认成功后处理当前页最后一条被删除的分页边界，并刷新统计。

工程质量要求：
- 使用仓库当前技术栈；若尚无前端目录，请选择主流、轻量、易维护的 TypeScript 方案，并解释目录与构建集成方式。
- 建立单一 API client，集中注入 Authorization、解析错误和处理 401；不要在组件里散落 fetch。
- 为 API 类型、分页计算、筛选序列化、表单校验和关键交互写测试。
- 保证键盘操作、可见焦点、语义标签、颜色对比度和 reduced-motion。
- 不要生成假数据冒充真实接口结果；开发 mock 必须与生产构建隔离。
- 完成后运行 lint、typecheck、test 和 production build，更新 README 的后台开发与部署说明。

交付时请明确列出：
- 新增/修改的文件；
- 技术选型和关键设计决定；
- 本地启动、测试、构建和部署命令；
- ADMIN_API_TOKEN 的安全使用方式；
- 已验证的 API 流程与尚未完成的限制。
```
