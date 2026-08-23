# ADR-0003 - AI-ADDIE教学设计模型实现

**日期**: 2026-08-23（2026-08-23 重构落地）  
**状态**: 已批准 · 已实现  
**相关**: ADR-0002

## 背景

传统ADDIE教学设计模型（分析、设计、开发、实施、评估）是教师备课的经典框架。然而，手动执行ADDIE流程耗时且依赖教师经验。通过AI深度融合ADDIE模型，可以显著提升备课效率和质量。

## 决策

实现**AI-ADDIE五阶段智能辅助系统**，每个阶段都有专门的AI提示词和输出结构。

**阶段契约收敛（2026-08-23 重构）**：五阶段的标识、元数据、提示词组装与成果解析统一收敛到
`src/lib/prep-stages.ts` 单一 module。此前 ADDIE 枚举散落四处（页面/storage/进度条/路由），
且阶段成果的生产者与消费者契约断裂（API 返回字符串、前端期待对象），本次重构以类型契约
跨 seam 修复。

## 阶段契约 module（src/lib/prep-stages.ts）

```typescript
export const ADDIE_STAGES: readonly StageMeta[];        // 有序五阶段元数据
export interface StageOutput {
  raw: string;                                          // 完整 Markdown 成果
  structured?: Record<string, unknown>;                 // 文末 JSON 摘要块（LLM 未按约定输出时缺席）
}
export type StageOutputs = Partial<Record<PrepStage, StageOutput>>;
export function buildStagePrompt(mode, courseInfo, priorOutputs?): ChatMessage[];
export function extractJsonBlock(raw): Record<string, unknown> | null;
export function stripJsonBlock(raw): string;            // 渲染用：剥离摘要块
```

各阶段模式指令（分析/Bloom 设计/资源开发/实施建议/评估反思）与 JSON 摘要 schema 见
`STAGE_INSTRUCTIONS`；本 module 不依赖任何 LLM SDK，Vitest 直接可测（`prep-stages.test.ts`）。

## 阶段成果流（混合契约）

1. 前端携带 `priorOutputs`（已完成阶段的 `StageOutputs`）请求 `POST /api/prep`
2. 服务端 `buildStagePrompt` 组装提示词：基础角色 + 阶段指令 + 已完成成果注入
   （structured 优先，raw 截断至 1500 字符）——**阶段间信息传递**
3. SSE 流式逐块推送 `{content}`；done 帧携带 `{done: true, result, structured?}`
4. 服务端 `extractJsonBlock` 提取文末 JSON 摘要；失败时 structured 缺席，前端以 raw 兜底
5. 前端 `stageOutputs` 按 mode 落位——**累积式成果构建**，并作为下一阶段请求的上下文

## 消费方

- `src/app/api/prep/route.ts`：校验 + `buildStagePrompt` + `extractJsonBlock`（185 → 94 行）
- `src/app/prep/page.tsx`：阶段元数据、成果渲染（结构化优先/raw 兜底）、保存教案/重新开始
- `src/lib/storage.ts`：归一化阶段标识（`STAGE_IDS`）
- `src/app/projects/page.tsx`：ADDIE 进度条

## 已实现特性

- **流式交互**：SSE 打字机效果，对话模式支持多轮上下文
- **阶段间信息传递**：priorOutputs 注入，见 `buildStagePrompt` 测试
- **累积式成果构建**：`stageOutputs` 状态 + 保存教案（Markdown 下载）
- **诚实降级**：LLM 未输出 JSON 摘要时自动回退纯文本渲染，不阻塞流程

## 教育价值

- 系统化备课：从碎片化到结构化，ADDIE 五阶段全流程 AI 辅助
- 新手教师友好：每阶段有明确输入、AI 动作与产出物
- 成果可沉淀：阶段成果 + 教案导出（Markdown）

## 与传统方案对比

| 特性 | 传统ADDIE | AI-ADDIE |
|------|------------|----------|
| 执行效率 | 低（2-4小时） | 高（目标 15-30 分钟） |
| 专业性 | 依赖经验 | 理论+AI辅助 |
| 阶段衔接 | 人工回顾 | priorOutputs 自动传递 |
| 可追溯性 | 文档记录 | 阶段成果全量保存 |

## 未来扩展

1. **多学科支持**：扩展到物理、化学等理科
2. **学段适配**：小学、大学教育的差异化
3. **成果入库**：阶段成果写回复课项目（阶段二 `?project=` 接线后）
4. **个性化推荐**：基于教师特征的定制方案

## 相关资源

- [ADR-0002 - 数学专业提示词框架](./0002-math-prompt-framework.md)
- [阶段契约 module](../../src/lib/prep-stages.ts)
- [契约测试](../../src/lib/prep-stages.test.ts)
- [API路由](../../src/app/api/prep/route.ts)
- [前端界面](../../src/app/prep/page.tsx)
