# ADR-0004 - 阶段成果入库与自动写回

**日期**: 2026-08-28
**状态**: 已批准 · 待实现
**相关**: [ADR-0001](./0001-local-storage-first.md) · [ADR-0003](./0003-ai-addie-implementation.md)

## 背景

ADR-0003 修复了阶段成果的生产管道，但成果只存在于备课页组件状态中：`PrepProject` 仅有 `steps: PrepStage[]` 阶段标识而无内容字段，且 `steps` 建后无人写入。项目页早已推送 `/prep?project=<id>`（新建后跳转与"打开"菜单），备课页却完全不读该参数——接缝半建，`CONTEXT.md` 对"阶段成果：隶属于一个备课项目"的承诺在代码中不成立。

另一个建模缺陷：`PrepProject.subject` 持久化展示名"九年级数学"，混淆了**学段**与**学科**两个领域概念，与备课页需要的（学科领域，学段）二元结构无法对接。

本决策于 2026-08-28 经 grilling 三轮共识定稿，设计全文见
[2026-08-28-stage-output-persistence-design.md](../superpowers/specs/2026-08-28-stage-output-persistence-design.md)。

## 决策

1. **Schema v2**：`subject` 拆分为 `grade`（学段）+ `subjectArea`（学科领域），展示名派生不持久化；新增 `knowledgePoints: string[]` 与 `stageOutputs: StageOutputs`（复用 `prep-stages.ts` 契约）。旧数据经 `normalizeProject` 宽容迁移（学段前缀解析）。
2. **自动增量写回**：阶段完成、课程信息修改、重新开始三个写回点统一走 storage 层窄接口 `saveProjectProgress(id, patch)`，内部单点派生 `steps`（按 ADDIE 序自成果重算）与 `status`（五阶段齐转"已完成"）；写失败显式 toast，不静默。
3. **覆盖语义，无版本快照**：重跑即覆盖；"复制项目"承担版本角色；项目模式"重新开始"确认后内存与项目双清；同步修正 `AGENTS.md` 与项目页对"版本管理/版本历史"的失实措辞。
4. **续备载入**：`?project=<id>` 有效则预填课程信息与全部成果、跳第一个未完成阶段；无效 id 降级为游离备课并清参。

## 理由

1. localStorage 场景下"以为存了其实没存"是最高伤害的失败模式，自动写回消灭它，同时让项目页进度条真实点亮。
2. 学段与学科是不同领域概念，字符串解析续借只会累积技术债；`normalizeProject` 的宽容设计本就为 schema 演进而备。
3. 快照/历史在演示定位下属 YAGNI，副本即版本；诚实地修文档比保留失实宣称更符合项目"诚实降级"的一贯原则。

## 替代方案比较

- **显式"保存到项目"按钮（否）**：依赖用户记得保存，与"成果可沉淀"目标相悖；去抖自动写回的实现成本并不更高。
- **保持展示名 + 字符串解析（否）**：零迁移成本，但每次对接都要解析"九年级数学"，错位永久化。
- **版本快照（否，后续候选）**：存储与 UI 复杂度对演示价值不成比例；确需回溯时"复制项目"已覆盖。

## 影响范围

- `src/lib/storage.ts`：schema v2、迁移解析、`saveProjectProgress`、`displayCourseInfo`
- `src/app/prep/page.tsx`：载入预填（`useSearchParams` + Suspense）、写回接线、双清确认
- `src/app/projects/page.tsx`：新建表单（学段 + 知识点）、卡片显示改派生、措辞修正
- `AGENTS.md`：功能描述措辞修正

## 相关资源

- [设计文档：阶段成果入库与续备](../superpowers/specs/2026-08-28-stage-output-persistence-design.md)
- [ADR-0001 - localStorage 优先](./0001-local-storage-first.md)
- [ADR-0003 - AI-ADDIE 阶段契约](./0003-ai-addie-implementation.md)
