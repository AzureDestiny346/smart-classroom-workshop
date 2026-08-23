/**
 * AI-ADDIE 阶段契约 module（ADR-0003）
 *
 * 唯一定义 ADDIE 五阶段：标识、元数据、提示词组装与阶段成果解析。
 * 服务端路由与客户端页面共用本 module，跨 seam 的类型契约由此承载。
 * 本文件不依赖任何外部 SDK，保证可被 Vitest 直接测试。
 */

/** ADDIE 教学设计五阶段标识 */
export type PrepStage =
  | "analysis"
  | "design"
  | "development"
  | "implementation"
  | "evaluation";

/** 阶段元数据（有序，顺序即教学设计流程顺序） */
export interface StageMeta {
  id: PrepStage;
  /** 中文阶段名，如"分析" */
  label: string;
  /** 英文阶段名，如"Analysis" */
  en: string;
}

/** ADDIE 五阶段有序元数据 */
export const ADDIE_STAGES: readonly StageMeta[] = [
  { id: "analysis", label: "分析", en: "Analysis" },
  { id: "design", label: "设计", en: "Design" },
  { id: "development", label: "开发", en: "Development" },
  { id: "implementation", label: "实施", en: "Implementation" },
  { id: "evaluation", label: "评估", en: "Evaluation" },
];

/** 合法阶段标识集合（守卫用） */
export const STAGE_IDS: readonly PrepStage[] = ADDIE_STAGES.map((s) => s.id);

/** 判断值是否为合法阶段标识 */
export function isPrepStage(value: unknown): value is PrepStage {
  return (
    typeof value === "string" && (STAGE_IDS as readonly string[]).includes(value)
  );
}

/** 课程信息：备课的输入上下文 */
export interface CourseInfo {
  subject: string;
  grade: string;
  chapter: string;
  knowledgePoints: string[];
}

/**
 * 阶段成果：某一 ADDIE 阶段的产出。
 * raw 为完整 Markdown 文本（流式展示与持久化用）；
 * structured 为从文末 JSON 摘要块提取的结构化数据（LLM 未按约定输出时缺席）。
 */
export interface StageOutput {
  raw: string;
  structured?: Record<string, unknown>;
}

/** 各阶段成果的按阶段索引（阶段间信息传递的载体） */
export type StageOutputs = Partial<Record<PrepStage, StageOutput>>;

/** 轻量消息类型（路由层负责映射到具体 LLM SDK 的消息结构） */
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** 各阶段的模式指令与 JSON 摘要 schema 说明 */
const STAGE_INSTRUCTIONS: Record<PrepStage, { directive: string; summary: string }> = {
  analysis: {
    directive: `## 分析模式
你需要对教学内容进行全面分析：
1. 知识点结构梳理（标注 核心/重要/一般 分级）
2. 重点、难点识别
3. 学生常见误解预测
4. 与前后知识的关联
5. 教学价值分析`,
    summary: `{"knowledgePoints":[{"text":"...","level":"core|important|normal"}],
 "teachingPoints":["..."],"difficulties":["..."],"misconceptions":["..."]}`,
  },
  design: {
    directive: `## 设计模式
你需要为课程设计：
1. 基于 Bloom 认知层次（记忆/理解/应用/分析/评价/创造）的教学目标
2. 合适的教学策略推荐
3. 形成性与总结性评估方案`,
    summary: `{"objectives":["..."],"strategies":["..."],"assessment":["..."]}`,
  },
  development: {
    directive: `## 开发模式
你需要生成具体的教学资源：
1. 教案详细内容（含教学环节与时间分配）
2. 配套练习题（基础题/变式题/拓展题递进）
3. 课件大纲`,
    summary: `{"lessonPlan":"...","exercises":["..."],"materials":["..."]}`,
  },
  implementation: {
    directive: `## 实施模式
你需要提供课堂实施建议：
1. 45 分钟课堂节奏与时间分配
2. 师生互动点设计
3. 突发情况应对预案`,
    summary: `{"timeline":["..."],"interactions":["..."],"contingencies":["..."]}`,
  },
  evaluation: {
    directive: `## 评估模式
你需要帮助教师：
1. 多维度评价方式设计（形成性/总结性）
2. 教学反思问题引导
3. 持续改进建议`,
    summary: `{"formative":["..."],"summative":["..."],"reflection":["..."]}`,
  },
};

const BASE_SYSTEM_PROMPT = `你是一位专业的数学教育专家，精通教学设计和课程开发，具有丰富的中学教学经验。

## 你的职责
根据教师提供的课程信息，提供专业的教学设计支持，确保内容符合中国中学数学教学实际。

## 专业要求
1. 准确把握数学学科特点和知识结构
2. 遵循教育心理学和认知科学原理
3. 注重培养学生的数学思维和能力
4. 提供可操作的教学建议

## 输出要求
1. 使用 Markdown 格式，结构清晰，重点内容加粗或列表突出
2. 数学公式使用 LaTeX 语法（$...$ 行内，$$...$$ 独立成行）
3. 语言通俗易懂，避免过度学术化`;

const SUMMARY_RULE = (schema: string) => `

## 结构化摘要
在正文完成后，最后另起一行输出一个 json 代码块，给出本阶段成果的结构化摘要（供程序读取）：
\`\`\`json
${schema}
\`\`\`
除该代码块外，正文不要包含其他 json 代码块。`;

/** priorOutputs 注入时每阶段 raw 文本的截断长度 */
const PRIOR_RAW_LIMIT = 1500;

/**
 * 组装某一阶段的提示词消息。
 *
 * priorOutputs 中已完成阶段的成果会作为上下文注入（structured 优先、
 * raw 截断至 1500 字符），实现 ADR-0003 的阶段间信息传递。
 */
export function buildStagePrompt(
  mode: PrepStage,
  courseInfo: CourseInfo,
  priorOutputs?: StageOutputs
): ChatMessage[] {
  const instruction = STAGE_INSTRUCTIONS[mode];
  const system = BASE_SYSTEM_PROMPT + "\n\n" + instruction.directive + SUMMARY_RULE(instruction.summary);

  const sections: string[] = [
    `请完成以下备课任务的「${stageLabelOf(mode)}」阶段工作：`,
    "",
    `- **学科**: ${courseInfo.subject}`,
    `- **年级**: ${courseInfo.grade}`,
    `- **章节**: ${courseInfo.chapter}`,
    `- **知识点**: ${courseInfo.knowledgePoints.join("、")}`,
  ];

  const prior = formatPriorOutputs(priorOutputs);
  if (prior) {
    sections.push("", "# 已完成阶段成果（备课上下文，请在其基础上推进，不要重复）", prior);
  }

  return [
    { role: "system", content: system },
    { role: "user", content: sections.join("\n") },
  ];
}

/** 阶段标识 → 中文标签 */
export function stageLabelOf(stage: PrepStage): string {
  return ADDIE_STAGES.find((s) => s.id === stage)?.label ?? stage;
}

/** 将已完成阶段成果格式化为注入文本；无成果返回空串 */
function formatPriorOutputs(priorOutputs?: StageOutputs): string {
  if (!priorOutputs) return "";
  const parts: string[] = [];
  for (const meta of ADDIE_STAGES) {
    const output = priorOutputs[meta.id];
    if (!output || !output.raw.trim()) continue;
    parts.push(`## ${meta.label}阶段成果`);
    if (output.structured && Object.keys(output.structured).length > 0) {
      parts.push("结构化摘要：" + JSON.stringify(output.structured));
    }
    const raw = output.raw.trim();
    parts.push(raw.length > PRIOR_RAW_LIMIT ? raw.slice(0, PRIOR_RAW_LIMIT) + "……（截断）" : raw);
  }
  return parts.join("\n\n");
}

/**
 * 从阶段成果文本中提取最后一个 ```json 围栏块并解析。
 * 无围栏、内容非对象或解析失败时返回 null（调用方以 raw 兜底展示）。
 */
export function extractJsonBlock(raw: string): Record<string, unknown> | null {
  const matches = raw.match(/```json\s*([\s\S]*?)```/g);
  if (!matches || matches.length === 0) return null;
  const last = matches[matches.length - 1].replace(/```json\s*/, "").replace(/```$/, "").trim();
  try {
    const parsed: unknown = JSON.parse(last);
    if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

/** 渲染用：剥离文末 JSON 摘要块后的正文 */
export function stripJsonBlock(raw: string): string {
  return raw.replace(/```json\s*[\s\S]*?```/g, "").trimEnd();
}

/** 知识点条目（分析阶段结构化摘要的期望形状） */
export interface KnowledgePoint {
  text: string;
  level: "core" | "important" | "normal";
}

/** 分析阶段结构化摘要的期望形状 */
export interface AnalysisSummary {
  knowledgePoints: KnowledgePoint[];
  teachingPoints: string[];
  difficulties: string[];
  misconceptions: string[];
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string")
    : [];
}

/**
 * 守卫式解析分析阶段摘要：字段缺失或类型异常时返回 null，
 * 保证渲染层拿到即可用，无需再判空。
 */
export function parseAnalysisSummary(
  structured: Record<string, unknown> | undefined | null
): AnalysisSummary | null {
  if (!structured) return null;
  const kps = Array.isArray(structured.knowledgePoints)
    ? structured.knowledgePoints.flatMap((kp): KnowledgePoint[] => {
        if (typeof kp !== "object" || kp === null) return [];
        const { text, level } = kp as Record<string, unknown>;
        if (typeof text !== "string") return [];
        const lv =
          level === "core" || level === "important" || level === "normal"
            ? level
            : "normal";
        return [{ text, level: lv }];
      })
    : [];
  return {
    knowledgePoints: kps,
    teachingPoints: asStringArray(structured.teachingPoints),
    difficulties: asStringArray(structured.difficulties),
    misconceptions: asStringArray(structured.misconceptions),
  };
}
