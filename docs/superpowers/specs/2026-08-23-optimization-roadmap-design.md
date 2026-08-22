# 智课工坊优化路线设计

> 日期：2026-08-23 ｜ 状态：已获用户批准（口头），待审阅本文档
> 输入：`docs/OPTIMIZATION_REPORT.md`（2026-08-22 全量静态评估）
> 终点：经 to-tickets 拆分为 GitHub 工单（tracker 见 `docs/agents/issue-tracker.md`）

## 1. 背景与目标

优化评估报告发现两个关键缺陷（P0）与四类技术债（P1）：CI 流水线损坏、项目数据无持久化、49% 死代码、巨型组件、零测试。本设计将报告的建议路线转化为可执行方案。

**目标**：让"智课工坊"从"可演示的原型"升级为"数据真实、工程可信、可渐进产品化的应用"。

## 2. 已确认决策（grilling 记录）

| # | 决策点 | 结论 |
|---|--------|------|
| Q1 | 主题范围 | 完整优化路线（P0→P1），最终拆 GitHub 工单 |
| Q2 | 项目定位 | 演示优先、渐进产品化 |
| Q3 | 持久化范围 | 完整持久化：项目列表 + ADDIE 各阶段成果 + 自定义提示词模板 |
| Q4' | 部署策略 | Docker 为主 + CI 检查门禁；Vercel Git 集成保留为可选；删除坏的 deploy.yml 部署 job 与死文件 package-deploy.json |
| Q5 | 测试投入 | 轻量：Vitest 覆盖 lib 纯函数 + storage 层 + API 路由冒烟 |
| Q6 | 死依赖处理 | 全部删除（7 个零引用重型依赖 + 33 个未用组件 + recharts 等连带依赖），需要时 `pnpm add` 装回 |

## 3. 执行架构：依赖排序的垂直切片

在"严格串行 / 依赖排序垂直切片 / 单一大分支"三方案中选**垂直切片**：

- 每个切片穿透所有相关层（配置、代码、测试、验证），完成后独立可演示
- 无依赖关系的切片（①②）可并行
- 与 to-tickets 的 tracer-bullet 工单形状天然对齐

## 4. 核心新架构：持久化层

```
src/lib/storage/
├── types.ts          # Project / StageOutput / PromptTemplate 领域类型
├── storage.ts        # Storage 接口：load / save / list / delete
├── local-storage.ts  # 接口的 localStorage 实现（版本号 + 迁移函数位）
└── index.ts          # 对外单例导出
```

设计要点：

- **接口抽象**：页面只依赖 `Storage` 接口，不直接触碰 localStorage。将来产品化时新增 `supabase-storage.ts` 实现即可，页面代码零改动（Q2"渐进产品化"的兑现点，详见 ADR-0001）
- **版本化存储键**：`zhike.v1.projects` / `zhike.v1.prompts`，版本留在键名中，未来数据结构变更走迁移函数
- **消费方式**：自定义 hooks（`useProjects` / `usePromptTemplates`）包装读写，组件不感知存储细节

## 5. 五个优化项设计

### ① Docker / CI 修复（安全网，无前置依赖）

现状三处致命伤：`node:18-alpine` 低于 Next.js 16 要求（≥ 20.9）；`COPY package*.json` 漏 `pnpm-lock.yaml` 导致 `--frozen-lockfile` 必败；`next.config.ts` 缺 `output: 'standalone'` 导致无 standalone 产物可复制。

- Dockerfile：基础镜像改 `node:20-alpine`；显式 `COPY package.json pnpm-lock.yaml ./`
- `next.config.ts`：增加 `output: 'standalone'`
- `deploy.yml`：重写为纯检查门禁（`pnpm/action-setup` + Node 20 + `pnpm install --frozen-lockfile` + lint + ts-check），删除 Vercel 部署 job
- 删除 `package-deploy.json`（过时死文件：next ^15、coze CLI 脚本、引用不存在的脚本）
- 保留：`src/server.ts` + tsup 的 coze 平台路线、`deploy-docker.sh`、Vercel Git 集成可用性

**验收**：`docker build` 成功；容器启动后 `localhost:5000` 可访问；Actions 门禁全绿。

### ② 死代码清理（无前置依赖，与 ① 并行）

- 删除 33 个未引用的 `components/ui/*` 组件（保留清单：badge button card dialog dropdown-menu input label progress select separator sheet skeleton sonner tabs textarea toggle tooltip）
- `pnpm remove` 零引用依赖：`@aws-sdk/client-s3` `@aws-sdk/lib-storage` `@supabase/supabase-js` `drizzle-orm` `drizzle-kit` `drizzle-zod` `pg`
- 连带删除仅被未用组件引用的：`recharts` `react-day-picker` `embla-carousel-react` `input-otp` `vaul` `cmdk` `react-resizable-panels` 等（以清理后 `pnpm build` 通过为准）

**验收**：`pnpm install && pnpm build && pnpm ts-check` 全绿；页面功能不回归（四个页面人工冒烟）。

### ③ 持久化层 + 页面接入（依赖 ① 的 CI 门禁）

- 新建 `src/lib/storage/`（见第 4 节）
- `projects/page.tsx`：删除 `mockProjects`，接入 `useProjects()`；创建、编辑、删除、收藏真实生效并落盘
- `prep/page.tsx`：ADDIE 各阶段产出的内容自动保存到所属备课项目；无项目时自动创建草稿项目（课程信息留占位，教师可稍后编辑）
- `prompt/page.tsx`：自定义提示词模板接入 `usePromptTemplates()`

**验收**：创建项目 → 完成至少一个阶段 → 刷新浏览器 → 项目、阶段成果、自定义模板全部找回。

### ④ 测试体系（依赖 ③）

- Vitest + jsdom 环境；`package.json` 增加 `test` 脚本并纳入 CI 门禁（与 ① 的 workflow 衔接）
- 覆盖：`lib/utils` 纯函数；`storage` 层读写/删除/版本键（mock localStorage）；`api/chat` 与 `api/prep` 冒烟测试（mock `coze-coding-dev-sdk` 的 LLMClient）

**验收**：`pnpm test` 全绿；CI 中作为必过检查。

### ⑤ 组件拆分（依赖 ③④，拆的是接入持久化后的新代码）

- `prep/page.tsx`（897 行）→ `page.tsx`（编排，< 300 行）+ `components/`（步骤向导、对话区、成果预览）+ `hooks/`（`use-prep-stages.ts` 五阶段状态机、流式解析）
- `prompt/page.tsx`（606 行）→ 同模式
- `projects/page.tsx` 在 ③ 中天然重写，不单独拆分

**验收**：单文件 < 300 行；逻辑位于可测试的 hooks；`pnpm build` 与 `pnpm test` 全绿；页面行为与拆分前一致。

## 6. 依赖图与执行顺序

```
① Docker/CI ──┐
              ├──→ ③ 持久化层 ──→ ④ 测试 ──→ ⑤ 组件拆分
② 死代码清理 ─┘
（① ② 互相独立，可并行）
```

## 7. 风险与回滚

| 风险 | 缓解 |
|------|------|
| 删组件/依赖造成隐性引用断裂 | 每步跑 build + ts-check；git 小步提交 |
| standalone 输出与 coze server.ts 路线冲突 | 两者独立（构建产物 vs 平台入口），互不触碰；若冲突以 coze 路线优先 |
| localStorage 容量/损坏 | 版本键 + 读写 try/catch；5-10MB 对纯文本充足 |
| 拆分引入回归 | ④ 测试先行覆盖核心逻辑；对照 SPEC 验收 |
| 数据迁移（未来换 Supabase） | Storage 接口隔离；导出 JSON 作为人工迁移通道 |

## 8. 明确不做（YAGNI）

- 不做账号体系、多用户
- 不上 Supabase / 任何数据库
- 不做导出 .docx/PDF（SPEC 规划项，另立项）
- 不重构 coze 平台脚本链路
