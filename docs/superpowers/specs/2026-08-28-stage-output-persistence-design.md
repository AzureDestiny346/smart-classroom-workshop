# 设计文档：阶段成果入库与续备（`?project=` 接线）

**日期**: 2026-08-28
**状态**: 共识定稿（grilling 三轮完成），待实现
**相关**: [ADR-0004](../../adr/0004-stage-output-persistence.md) · [ADR-0003](../../adr/0003-ai-addie-implementation.md) · [ADR-0001](../../adr/0001-local-storage-first.md)

## 背景与目标

ADR-0003"未来扩展 #3"承诺阶段成果写回复课项目，但当前接缝只建了一半：

- **生产者已就位**：项目页新建项目后与卡片"打开"菜单都已推送 `/prep?project=<id>`（`src/app/projects/page.tsx:129`、`:344`）。
- **消费者缺失**：备课页完全不读 URL 参数（无 `searchParams` 引用），成果只活在组件状态里，刷新/跳转即丢。
- **存储缺口**：`PrepProject` 只有 `steps: PrepStage[]`（已完成阶段标识），没有成果内容字段；`steps` 建后无人写入，项目页 ADDIE 进度条恒为 0/5。

**目标**：备课项目真正"持有"五阶段成果（兑现 `CONTEXT.md` 对"阶段成果"的定义），支持载入项目续备，进度与状态真实反映数据。

## 领域模型变化（ADR-0004）

### 术语（已入 CONTEXT.md）

- **学段（Grade）** / **学科领域（Subject Area）**：终结 `subject` 展示名"九年级数学"对两个概念的混用。
- **续备（Resume）**：载入项目继续备课。
- **游离备课（Ad-hoc Prep）**：无项目归属的备课会话。

### PrepProject schema v2

```typescript
export interface PrepProject {
  id: string;
  title: string;
  /** 学段，如"九年级"（原 subject 展示名拆分而来） */
  grade: string;
  /** 学科领域，如"代数"；新建项目为"数学"（未细分） */
  subjectArea: string;
  chapter: string;
  description: string;
  /** 课程核心知识点（备课输入上下文的组成部分） */
  knowledgePoints: string[];
  status: "进行中" | "已完成";
  /** 已完成的 ADDIE 阶段 —— 由 stageOutputs 派生，不再独立维护 */
  steps: PrepStage[];
  favorite: boolean;
  /** 五阶段成果全量内容（本次新增的核心字段） */
  stageOutputs: StageOutputs;
  createdAt: string;
  updatedAt: string;
}
```

变更要点：

1. **`subject` 拆分为 `grade` + `subjectArea`**。展示名由 `displayCourseInfo(project)` 派生（如 `九年级·数学`），不再持久化。
2. **新增 `knowledgePoints: string[]`**。新建项目表单增加输入；备课页载入时预填。
3. **新增 `stageOutputs: StageOutputs`**（复用 `prep-stages.ts` 既有类型，契约不变）。

### 旧数据迁移（normalizeProject 宽容解析，已收口默认）

- 旧 `subject`（如"九年级数学"）：按已知学段前缀（七年级/八年级/九年级/高一/高二/高三）匹配拆出 `grade`，余串落入 `subjectArea`；匹配失败则 `grade` 留空、`subjectArea` 取原串。
- `knowledgePoints` 缺失 → 空数组；`stageOutputs` 缺失 → `{}`。
- `steps`：旧数据照读，首次写回后即被派生值取代。

## 数据流设计

### 载入（续备）

1. 挂载后 `useSearchParams` 读取 `project` 参数（**必须包 `<Suspense>`**：Next.js App Router 对客户端页面使用 `useSearchParams` 的静态预渲染要求）。
2. **id 有效**：`getProject` → 预填 `courseInfo`（subjectArea/grade/chapter/knowledgePoints）、`stageOutputs = project.stageOutputs`、`currentStep` 跳到第一个无成果阶段（全部完成则停在 evaluation）。
3. **id 无效**（项目被删/换设备/手输 URL）：`toast.warning("项目不存在或已删除，已切换为自由备课")` + `router.replace("/prep")` 清参 + 进入游离备课。
4. **无参**：游离备课，行为与现状完全一致。

### 写回（自动增量，决策 Q4）

写回点共三个，全部经 storage 层窄接口 `saveProjectProgress(id, patch)`：

| 写回点 | 触发 | patch 内容 |
|--------|------|-----------|
| 阶段完成 | SSE done 帧落位 `stageOutputs` 后 | 该阶段 `StageOutput` |
| 课程信息修改 | 表单变更（去抖 300ms） | subjectArea/grade/chapter/knowledgePoints |
| 重新开始 | 确认框通过后 | `stageOutputs = {}` |

`saveProjectProgress` 内部单点执行派生与落盘（页面不手工拼装）：

1. 读取 → 合并 patch → **`steps` = 按 ADDIE 顺序派生自 `stageOutputs`**（非累积 append，重跑不产生错序）。
2. **`status`**：五阶段齐 → `"已完成"`，否则 `"进行中"`。
3. `updatedAt = now`，落盘；失败返回 `false` → 页面 `toast.warn("本地存储写入失败，成果可能未保存")`（诚实降级，与 ADR-0001 原则一致）。

### 覆盖与版本语义（决策 Q5）

- 重跑某阶段 = 写回点自然覆盖该项目旧成果，**不做版本快照**；"复制项目"承担版本角色（`duplicateProject` 的 spread 会自动带上 `stageOutputs`）。
- 项目模式"重新开始"：确认框文案明确"将同时清空项目《X》中的全部阶段成果"，确认后内存与项目**双清**。
- 文档同步修正：`AGENTS.md`"版本管理：记录项目历史版本"→ 改为"副本与导出"；项目页副标题"支持版本历史"同步改。

### 游离备课（决策 Q6）

MVP 维持现状：不落库，靠"保存教案"下载 Markdown 兜底。"保存为项目"一键入库列入后续增强（见不做清单旁）。

## 边界与已知限制

- **多标签页并发写**：localStorage last-writer-wins，后写覆盖先写。单机演示定位下接受，不做冲突合并。
- **LLM 未按约定输出 JSON**：`structured` 缺席，`raw` 照存（既有诚实降级，不变）。
- **存储配额**：五阶段 raw 全文为 KB 级，5MB 配额充裕。
- **SSR/Hydration**：载入与写回只发生在客户端 effect/事件中，避免水合不匹配。
- **服务端知识点校验**：`/api/prep` 对空 `knowledgePoints` 的校验行为在实现 T4 时确认，若强制非空则项目模式沿用备课页既有"补填后开跑"约束。

## 不做清单（YAGNI）

- 版本快照 / 历史记录
- 云端持久化（ADR-0001 阶段三）
- 多标签页冲突合并
- 游离备课自动入库（后续增强候选）

## 实现切分（供 executing-plans / TDD）

| # | 任务 | 文件 | 验证 |
|---|------|------|------|
| T1 | schema v2：类型改造 + normalize 迁移解析 + `displayCourseInfo` | `src/lib/storage.ts` | 新增 `storage.test.ts`：legacy 解析、宽容 normalize |
| T2 | `saveProjectProgress`：读取-合并-派生-落盘窄接口 | `src/lib/storage.ts` | 单测：steps 派生、status 翻转、覆盖语义、写失败返回 false |
| T3 | 新建表单改学段选择 + 知识点输入；卡片显示改派生 | `src/app/projects/page.tsx` | ts-check + 手动建项目 |
| T4 | 载入接线：useSearchParams + Suspense + 预填 + 无效 id 降级清参 | `src/app/prep/page.tsx` | 手测三路径（有效/无效/无参） |
| T5 | 写回接线：done 帧、课程信息去抖、双清确认 | `src/app/prep/page.tsx` | 手测：刷新成果仍在、项目页进度条点亮 |
| T6 | 文档同步：AGENTS.md 与项目页"版本"措辞修正 | `AGENTS.md`、`src/app/projects/page.tsx` | grep 无"版本管理/版本历史"残留 |
| T7 | 质量门禁 | — | `pnpm lint` + `pnpm ts-check` + `vitest` + `pnpm build` 全绿 |

依赖关系：T1 → T2 →（T3、T4）→ T5 → T6 → T7。
