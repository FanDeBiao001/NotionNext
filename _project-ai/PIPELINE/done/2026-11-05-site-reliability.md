# Task: Site reliability and reader tools

id: 2026-11-05-site-reliability
type: development
goal: Resolve the reviewed defects and complete the local-first reader and owner workflows.
priority: high
inputs: repository review and user authorization to fix all listed items
deliverables: application source, regression tests, operations documentation
acceptance:
  - OAuth secrets remain server-side; cache and proxy endpoints fail closed.
  - Protected article bodies are absent from public HTML, JSON, feeds, indexes and backups.
  - Cache refresh handles all configured stores; subscribe and summary failures are explicit.
  - Reader search, series, library and translation links work without paid services.
  - Owner status, backups, restore verification and health checks have usable entry points.
  - Installed dependencies match lockfile; lint, types, tests and production build are checked.
limits: no production changes, publishing, real-account mutations or payment connection
blocked_format: reason, required_input, retry_scope

result:
  status: accepted-local
  completed: 2026-11-06
  review: _project-ai/REVIEWS/2026-11-05-site-reliability.md
  documentation: docs/developer/operations/site-reliability.md
  verification: 49 Jest suites / 252 tests; 6 Playwright flows; production build, types and dependency integrity passed; lint 0 errors / 206 existing warnings.
  deployment: not published or committed
  remaining_setup: real OAuth, newsletter, Clerk, Redis and scheduled backup need service configuration; payment/orders remain unavailable; search index payload remains about 150 kB.

后续变更（2026-11-06）：按用户要求移除了全部 49 个单元测试文件、Jest 配置与专用依赖，以及单元测试执行入口；保留浏览器端到端测试。上面的 Jest 结果为移除前的历史验收结果。
