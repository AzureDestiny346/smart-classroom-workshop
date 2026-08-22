# 智课工坊 · 项目优化评估报告

> 评估日期：2026-08-22 ｜ 评估对象：smart-classroom-workshop @ `0411031` (master)
> 评估方式：全量静态分析（目录结构 / 代码统计 / 依赖引用扫描 / CI 配置审查）

---

## 一、执行摘要

| 维度 | 结论 |
|------|------|
| 整体健康度 | ⚠️ **中等**——核心功能可跑，但存在 2 个关键缺陷 |
| 最严重问题 | ① 项目管理功能无持久化（mock 数据硬编码）② CI 流水线配置损坏 |
| 代码规模 | src 67 文件 / 8,151 行 TS，其中约 **49% 为死代码**（未使用组件） |
| 技术栈 | Next.js 16.1.1 + React 19.2.3 + TS 5，版本前沿，无升级压力 |
| 文档 | README / SPEC / AGENTS 齐全且质量良好 ✅ |
| 测试 | **零测试**，无测试框架 |
| 建议优先级 | 先修 CI（30min）→ 删死代码（45min）→ 补数据持久化（0.5~3d）→ 拆组件 + 补测试 |

---

## 二、本次已完成的整理（仓库结构修复）

### 问题
项目曾被错误嵌套在 `Smart-Classroom-Workshop\.git\smart-classroom-workshop\` 内，
外层 `.git` 是无效空壳（疑似解压/拷贝事故），导致：

- 外层目录看起来"没有项目"
- git 无法识别仓库
- IDE / 构建工具全部失效

### 修复动作
```
robocopy ".git\smart-classroom-workshop" "." /E /MOVE   → 128 文件全部迁移，0 失败
```

### 修复后验证
- ✅ 项目 24 个根条目（package.json / src / public / scripts 等）就位
- ✅ git 仓库恢复：4 commits，master 与 `origin/master` 同步，工作区干净
- ✅ remote：`https://github.com/AzureDestiny346/smart-classroom-workshop.git`
- ✅ `.git` 内无残留

---

## 三、项目概况

**智课工坊**：面向数学教师/师范生的 AI 辅助备课云平台。

```
业务代码（实际）：4 页面 + 2 API 路由 + 1 导航组件 + 1 工具函数
├── app/page.tsx            首页            238 行
├── app/prep/page.tsx       智能备课中心    897 行  ⚠ 巨型组件
├── app/prompt/page.tsx     提示词工坊      606 行  ⚠ 巨型组件
├── app/projects/page.tsx   我的项目        408 行  ⚠ mock 数据
├── api/chat/route.ts       AI 对话（SSE）   96 行  ✅ 质量合格
├── api/prep/route.ts       备课分析（SSE） 185 行  ✅ 质量合格
└── components/layout/navbar.tsx
```

---

## 四、发现的问题与优化建议

### 🔴 P0-1 项目数据无持久化（产品级缺陷）

**证据**：`src/app/projects/page.tsx:48` 起为硬编码 `mockProjects`；
全 src 无 `localStorage` / `supabase` / `drizzle` 任何引用（findstr 零匹配）。

README/SPEC 宣称的"项目管理、版本管理、导出分享"实际不存在——刷新即丢，仅可演示。

**方案对比**：

| 方案 | 工作量 | 能力 | 适用 |
|------|--------|------|------|
| A. localStorage | ~0.5 天 | 单机持久化，无账号 | 快速让功能"真实化" |
| B. Supabase（依赖已装） | 2~3 天 | 跨设备、多用户、版本管理完整实现 | 正式产品方向 |

**建议**：竞赛/演示场景选 A；正式演进选 B（`@supabase/supabase-js`、`pg`、`drizzle-orm` 均已在依赖中，只差写代码）。

### 🔴 P0-2 CI/CD 流水线损坏（工程级缺陷）

**证据**：`.github/workflows/deploy.yml:22` 用 `npm install`，但 `package.json:8` 的
`preinstall: npx only-allow pnpm` 会在 npm 下直接报错退出；且 `npm run build` →
`scripts/build.sh` 内部又调用 `pnpm`（CI 未安装）；`node-version: 18` 低于
Next.js 16 要求的 Node ≥ 20.9。

**建议**（三选一，推荐 C）：
- A. 改用 `pnpm/action-setup` + `setup-node@v4` (node 20) + `pnpm install --frozen-lockfile`
- B. 直接用 Vercel Git 集成（vercel.json 已存在），删除该 workflow
- C. GitHub Actions 只做 lint + ts-check 的 PR 检查，部署交给 Vercel Git 集成

### 🟡 P1-1 死代码：33 个未使用的 UI 组件

**证据**：`components/ui/` 共 50 个 shadcn 组件，业务代码仅引用 **17 个**：

```
badge button card dialog dropdown-menu input label progress
select separator sheet skeleton sonner tabs textarea toggle tooltip
```

未使用的 33 个（含 `chart.tsx` 10.2KB、`calendar`、`carousel`、`form`、`command`、
`drawer`、`menubar`、`navigation-menu` 等大组件）占 src 文件数 49%。

**建议**：直接删除。shadcn 组件随可用 `pnpm dlx shadcn@latest add <name>` 找回，风险极低。
同时移除 `recharts`、`react-day-picker`、`embla-carousel-react`、`input-otp`、
`vaul`、`cmdk`、`react-resizable-panels` 等仅被未用组件引用的依赖。

### 🟡 P1-2 死依赖：7 个重型 SDK 零引用

**证据**：`@aws-sdk/client-s3`、`@aws-sdk/lib-storage`、`@supabase/supabase-js`、
`drizzle-orm`、`drizzle-kit`、`drizzle-zod`、`pg` 在 src 中零引用。

**建议**：若走 P0-1 方案 A，全部移除（`pnpm remove`）；若走方案 B，仅移除两个 AWS SDK。
预期 `pnpm install` 提速明显（AWS SDK 单包即数十 MB）。

### 🟡 P1-3 巨型页面组件

**证据**：prep 897 行 / prompt 606 行 / projects 408 行，单文件承担状态管理、
流式解析、UI 渲染全部职责。

**建议**：按职责拆分——
```
app/prep/
├── page.tsx                 编排（目标 < 300 行）
├── components/              步骤向导、对话区、成果预览
└── hooks/
    ├── use-chat-stream.ts   SSE 解析 + 打字机状态
    └── use-prep-stages.ts   ADDIE 五阶段状态机
```
拆分先于测试：不拆则无法对逻辑单元做单测。

### 🟡 P1-4 零测试

**建议**：引入 Vitest + Testing Library，优先级：`lib/` 纯函数 → 自定义 hooks →
API 路由集成测试（SSE 流式断言）。API 路由是纯函数式 `POST(request)`，易测。

### 🟢 P2 改进项

| # | 问题 | 建议 |
|---|------|------|
| 1 | 系统提示词硬编码在 `api/*/route.ts` 内 | 提取到 `lib/prompts/`，与提示词工坊模板体系统一复用 |
| 2 | `request.json()` 手写校验 | 启用已安装的 `zod` 定义 schema（zod 已在依赖中未被使用） |
| 3 | `chat/route.ts:21-50` 取末条消息 + slice 拼接写法绕 | 重构为直接映射完整消息列表 |
| 4 | `build.sh:9` `--loglevel debug` | CI 日志噪音，改 `--reporter=github` 或默认级 |
| 5 | API 无鉴权/限流 | 公网部署前需加（Vercel 平台层或中间件） |
| 6 | `lucide-react 0.468` 偏旧 | 可升，非紧急 |

---

## 五、优化指标（现状 → 目标）

| 指标 | 现状 | 目标 | 变化 |
|------|------|------|------|
| src 文件数 | 67 | ~34 | **-49%** |
| TS/TSX 总行数 | 8,151 | ~5,500 | **-32%** |
| 未使用 UI 组件 | 33 | 0 | 清零 |
| 零引用重型依赖 | 7 | 0（或 1 套数据库栈） | 清零 |
| 最大页面行数 | 897 | < 300 | -67% |
| 测试用例数 | 0 | lib/hooks/API 全覆盖 | 0 → 覆盖 |
| CI 状态 | ❌ 必失败 | ✅ 通过 | 修复 |
| 数据持久化 | ❌ mock | localStorage / Supabase | 补齐 |

### 组件使用率可视化

```
components/ui 使用率:  17/50 = 34%

使用 ████░░░░░░░░░░░░░░░░  17
闲置 ██████████████████░░  33   ← 建议删除（可随时 shadcn add 找回）
```

### 页面行数可视化

```
prep/page.tsx     ████████████████████████████████████  897 行 ⚠
prompt/page.tsx   ██████████████████████                606 行 ⚠
projects/page.tsx ███████████████                       408 行
app/page.tsx      █████████                              238 行 ✓
                  ├──────┬──────┬──────┬──────┬──────┤
                  0     225    450    675    900
```

---

## 六、成本效益分析

| 措施 | 成本 | 收益 | 风险 |
|------|------|------|------|
| 修 CI（P0-2） | 30 min | 部署恢复可信 | 极低 |
| 删 33 组件 + 死依赖（P1-1/2） | 45 min | 仓库体积 -49% 文件、安装提速 | 低（git 可回滚 + shadcn 可找回） |
| localStorage 持久化（P0-1A） | 0.5 天 | "我的项目"功能真实可用 | 低 |
| Supabase 持久化（P0-1B） | 2~3 天 | 完整产品能力（跨设备/版本） | 中（需账号与 schema 设计） |
| 拆分 3 个巨型页面（P1-3） | 1~2 天 | 可维护性/可测试性质变 | 中（回归风险，需配测试） |
| Vitest 测试体系（P1-4） | 持续 | 重构安全网 | 低 |

**推荐路线**：修 CI → 删死代码 → 持久化方案 A → 补测试 → 拆组件 →（视产品化进度）迁移方案 B。

---

## 七、风险评估

| 风险 | 等级 | 缓解措施 |
|------|------|----------|
| 拆分巨型组件引入回归 | 中 | 拆分前先补测试；小步提交；对照 SPEC 验收 |
| 删除组件/依赖导致隐性引用 | 低 | 每步跑 `pnpm build && pnpm ts-check` 验证 |
| localStorage 方案日后迁移成本 | 中 | 抽象 `storage` 接口层，方案 B 时只换实现 |
| API 公网滥用（无鉴权/限流） | 中 | 部署公开前在 Vercel 层加防护 |
| Next.js 16 / React 19 生态变动 | 低 | 锁定 minor 版本，`pnpm-lock.yaml` 已提交 ✅ |

---

## 八、优点（值得保持）

- **文档文化**：README（快速上手）、SPEC（完整产品/设计规范）、AGENTS（开发规范）、DEPLOY（部署手册）四位一体，远超同规模项目平均水平
- **API 路由质量**：输入校验、流式 SSE、错误处理、`runtime`/`dynamic` 显式声明齐全
- **工程约束**：`only-allow pnpm` 强制包管理器一致性、`ts-check` 独立脚本、frozen-lockfile 构建
- **提交纪律**：4 个提交信息语义清晰（feat / Fix / Refactor / Remove）
- **设计系统**：SPEC 中的色彩/间距/动效规范可直接指导后续组件拆分

---

*报告由静态分析生成；行数/引用数均为实测值。执行 P1 优化前建议先落库当前干净状态（`git status` 为 clean，随时可开始）。*
