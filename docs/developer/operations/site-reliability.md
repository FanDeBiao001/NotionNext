# 站点维护与阅读工具

入口：`/search` 全文搜索，`/series` 系列文章，`/library` 收藏和阅读记录，`/admin` 站长管理。

## 服务端配置

- `ADMIN_API_TOKEN`：站长管理 API 的长随机令牌。未配置时接口返回 503；浏览器只在页面内存保存它。
- `REVALIDATION_TOKEN`：`POST /api/revalidate` 的 Bearer 令牌。
- `CACHE_REVALIDATION_TOKEN`：旧 `POST /api/cache` 的 Bearer 令牌。未配置不允许清缓存。
- `ARTICLE_SESSION_SECRET`：文章会话签名密钥，推荐至少 32 随机字节。可回退到 `REVALIDATION_TOKEN`。生产环境两者都没有时可以输入密码解锁，但刷新后需重新输入。
- `REDIS_URL`：多实例缓存失效和共享限流。没有 Redis 时使用本机文件/内存，各独立实例无法互相清理内存，需要依靠 TTL 或配置 Redis。
- Mailchimp 的 API key 后缀决定数据中心，不再固定 us18；新订阅必须经邮件确认。

Notion OAuth 通过 `/admin` 发起，需要 `OAUTH_CLIENT_ID`、`OAUTH_CLIENT_SECRET`、`OAUTH_REDIRECT_URI`（指向 `/api/auth/callback/notion`）、`REDIS_URL`、`OAUTH_TOKEN_ENCRYPTION_KEY`（64 个十六进制字符）。凭据以 AES-256-GCM 加密后存入 Redis，不会自动修改当前站点的数据源。Redis 应启用持久化。旧流程曾把凭据写入日志/URL，若生产环境使用过旧授权，应轮换有关凭据。

## 文章保护与发布

受保护文章在公开 HTML/页面 JSON 中只保留元信息；正文通过 `/api/article` 验证密码后返回，响应禁止缓存。密码不再保存在 localStorage，也不接受 URL 密码参数。已保存的旧 password_* 浏览器记录可手动清理。

纯静态导出不提供解锁 API，因此只能显示锁定提示，不能解锁。Notion 原页面如果公开，读者仍可能从 Notion 直接访问；站点密码不能改变 Notion 的共享权限。部署这次修复时需完整重建，清除旧部署与 CDN 中已有的正文产物。

## 搜索、专题和译文

搜索索引仅包含 Published 且未加密的文章，按语言缓存 300 秒；构建/刷新时读取正文，失败条目会在搜索页提示。旧 `/search/<keyword>` 链接继续可用。

Notion 属性可添加 `series`、`seriesOrder`，或在 `ext` 填入：

```json
{"series":"缓存教程","seriesOrder":1,"seriesDescription":"从缓存基础到失效策略"}
```

系列页按顺序展示文章。`paired_with` 填写对应语言文章的 Notion ID（现有翻译脚本会写入），已发布且未加密的译文会出现在文章语言导航和 hreflang 中。没有对应译文时不生成虚假的替代链接。

阅读历史、收藏和进度保存在本浏览器，不同步到账号；受保护内容不记录。

## 备份、校验和恢复

在 `/admin` 导出，或运行：

```sh
# ADMIN_API_TOKEN 从环境注入，避免放在命令行或提交到仓库
node scripts/content-ops.js backup https://your-site.example backup.json
node scripts/content-ops.js verify backup.json
node scripts/content-ops.js restore backup.json ./restored-content
```

备份包含公开文章属性、Notion blockMap 和图片 URL 清单，并附 SHA-256 校验。任何抓取失败会记录在 failures 中，验证命令会失败，防止把部分备份当作完整备份。恢复命令写入新的本地目录，不覆盖已有目录，也不自动发布回 Notion。图片清单不等于图片文件归档，Notion 签名 URL 有有效期，重要图片应另行保存。

GitHub Actions `Content backup` 支持每天执行与手动执行；配置仓库变量 `BACKUP_SITE_URL` 和 Secret `ADMIN_API_TOKEN` 后启用，产物保存 30 天。未配置时跳过，不创建失败的空备份。

## 验证与性能

`yarn lint`、`yarn type-check`、`yarn build`、`yarn test:e2e`。现有第三方运行库 spine-webgl.js 不参与项目代码风格检查。ESLint 保留历史 warning，不屏蔽错误。

性能组件采集 LCP、INP、CLS、FCP、TTFB；有 gtag 时上报，同时触发 `notionnext:web-vital` 事件。性能配置仅保留实际使用的图片懒加载、预取、压缩和采集开关。

管理页的“检查图片与链接”读取公开文章中的 HTTPS 地址，每次最多检查 40 个地址。404/410 标记为 broken；连接失败、禁止 HEAD 等标记为 unknown，不据此判定死链。检查固定经过验证的公网 IP，不访问内网地址、不跟随重定向、不携带站长令牌。较大站点需要分批导出检查。

## 本次变更的验收范围（2026-11-06）

- 增加 Playwright 生产模式回归：全文搜索、阅读记录保留与清空、文章收藏跳转、管理页拒绝无效令牌、代理和缓存接口鉴权、默认及 URL 指定主题的首次加载与切换。
- 主题入口由目录清单生成模块级动态导入，Next 在 hydration 前预加载对应模块；新建主题目录仍会自动被识别。不再用删除 DOM 的方式掩盖重复渲染。
- Next 配套工具统一到 15.5.21，Clerk 升级至兼容版本；`type-check` 先生成路由类型，支持全新检出后执行。
- 密码文章、OAuth state、缓存失效竞态和 Redis 故障降级在移除单元测试前已完成验证。OAuth/Mailchimp/Clerk 的真实账号流程、共享 Redis 和线上定时备份仍需配置对应服务后验证；本次没有变更线上服务。
- `/dashboard` 移除了演示充值和订单入口。会员付费与真实订单服务尚未实现，不能当作可用功能上线。
- 首次部署应先配置需要启用的服务端令牌，并按上文清理旧的受保护文章静态产物。

当前全文搜索把公开文章索引随搜索页发送到浏览器；本次实际数据约 150 kB，构建会提示超过 Next 默认 128 kB 的页面数据建议值。内容规模继续增大时，需要将索引改为按需加载或服务端检索。该提示不影响构建通过，但不能据此宣称搜索负载已经完全优化。

按用户要求，2026-11-06 已移除项目单元测试、Jest 配置和依赖，以及单元测试 CI 任务。保留 Playwright 浏览器测试；历史验收记录中的 Jest 结果是移除前的结果，不代表当前仓库仍包含这些测试。

## 桌宠与开发缓存修复（2026-11-06）

默认白面鸮的三个模型文件已放入 `public/shimeji/1038_whitw2/`，启动先显示本站资源，远程角色列表在后台加载。其他远程角色仍依赖相应网络连接。组件卸载时会取消请求并清理全局事件，避免切换主题后残留桌宠。

删除 Jest 依赖会改变 node_modules 中的依赖提升位置。若正在运行的开发服务器出现旧 `prop-types/node_modules/react-is/index.js` 路径的 ENOENT，需要重载开发服务器并清除 `.next/cache/webpack`；无需删除正确安装的 `react-is`，也不要添加旧路径软链接。本次已清除旧缓存并重载当前开发服务器。

本次浏览器实测：首页和文章详情均返回 200，无 JavaScript 运行错误；阻断所有桌宠远程代理请求时，默认桌宠仍正常显示，页面中仅有一个桌宠画布。类型检查及相关文件 ESLint 通过。
