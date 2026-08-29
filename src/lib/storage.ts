/**
 * 备课项目本地持久化层
 *
 * 基于 localStorage 的单机持久化方案（ADR-0001 阶段一）。
 * Schema v2（ADR-0004）：subject 展示名拆分为 grade + subjectArea，
 * 阶段成果（stageOutputs）与知识点（knowledgePoints）入库，
 * steps/status 由成果派生，经 saveProjectProgress 单点写回。
 * 后续迁移云端时只需保持本模块接口不变、替换实现。
 */

import {
  ADDIE_STAGES,
  STAGE_IDS,
  type PrepStage,
  type StageOutputs,
} from "./prep-stages";

/** 备课项目实体：教师围绕一个课程章节开展的完整备课工作 */
export interface PrepProject {
  id: string;
  title: string;
  /** 学段，如"九年级" */
  grade: string;
  /** 学科领域，如"代数"；新建项目为"数学"（未细分） */
  subjectArea: string;
  /** 章节 / 主题 */
  chapter: string;
  /** 项目描述（可选） */
  description: string;
  /** 课程核心知识点（备课输入上下文的组成部分） */
  knowledgePoints: string[];
  status: "进行中" | "已完成";
  /** 已完成的 ADDIE 阶段 —— 由 stageOutputs 派生，勿手工维护 */
  steps: PrepStage[];
  favorite: boolean;
  /** 五阶段成果全量内容（按阶段索引） */
  stageOutputs: StageOutputs;
  /** ISO 8601 时间戳 */
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "zhike.v1.projects";

/** 已知学段前缀（旧数据 subject 展示名解析依据） */
const GRADE_PREFIXES = ["七年级", "八年级", "九年级", "高一", "高二", "高三"] as const;

/** 判断 localStorage 是否可用（SSR 预渲染与隐私模式下不可用） */
function isStorageAvailable(): boolean {
  return typeof window !== "undefined" && !!window.localStorage;
}

/** 生成项目 id：时间戳 + 随机后缀，避免同毫秒冲突 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** 格式化 ISO 时间为本地展示格式 "YYYY-MM-DD HH:mm" */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * 拆分旧版 subject 展示名（如"九年级数学"）为学段 + 学科领域。
 * 无已知学段前缀时 grade 留空、原串归入 subjectArea，宁可不拆不误拆。
 */
function splitLegacySubject(subject: string): { grade: string; subjectArea: string } {
  const prefix = GRADE_PREFIXES.find((g) => subject.startsWith(g));
  if (!prefix) return { grade: "", subjectArea: subject };
  return { grade: prefix, subjectArea: subject.slice(prefix.length) };
}

/** 阶段成果是否有实际内容（raw 非空白） */
function hasOutput(outputs: StageOutputs, stage: PrepStage): boolean {
  return !!outputs[stage]?.raw.trim();
}

/** 由阶段成果按 ADDIE 顺序派生已完成阶段列表（覆盖语义下不会错序） */
function deriveSteps(outputs: StageOutputs): PrepStage[] {
  return ADDIE_STAGES.filter((s) => hasOutput(outputs, s.id)).map((s) => s.id);
}

/** 由阶段成果派生项目状态：五阶段齐备即完成 */
function deriveStatus(outputs: StageOutputs): "进行中" | "已完成" {
  return ADDIE_STAGES.every((s) => hasOutput(outputs, s.id)) ? "已完成" : "进行中";
}

/**
 * 宽容解析阶段成果：仅保留合法阶段键且 raw 为字符串的条目，
 * structured 必须是普通对象才保留。历史/异常数据不会让调用方崩溃。
 */
function normalizeStageOutputs(raw: unknown): StageOutputs {
  if (typeof raw !== "object" || raw === null) return {};
  const source = raw as Record<string, unknown>;
  const outputs: StageOutputs = {};
  for (const stage of STAGE_IDS) {
    const entry = source[stage];
    if (typeof entry !== "object" || entry === null) continue;
    const { raw: text, structured } = entry as Record<string, unknown>;
    if (typeof text !== "string") continue;
    outputs[stage] =
      typeof structured === "object" && structured !== null && !Array.isArray(structured)
        ? { raw: text, structured: structured as Record<string, unknown> }
        : { raw: text };
  }
  return outputs;
}

/** 展示名派生：学段与学科领域以 · 连接，缺项自动跳过 */
export function displayCourseInfo(
  project: Pick<PrepProject, "grade" | "subjectArea">
): string {
  return [project.grade, project.subjectArea].filter(Boolean).join("·");
}

/**
 * 宽容归一化：字段缺失或类型异常时回退默认值。
 * v2 数据直接读取；v1 旧数据经 splitLegacySubject 迁移 subject 字段。
 * 历史数据/异常数据不会让列表页在 steps.includes 等调用处抛错白屏。
 */
function normalizeProject(raw: Record<string, unknown>): PrepProject {
  const str = (v: unknown, fallback = "") =>
    typeof v === "string" ? v : fallback;
  const legacy = splitLegacySubject(str(raw.subject));
  return {
    id: str(raw.id),
    title: str(raw.title),
    grade: str(raw.grade, legacy.grade),
    subjectArea: str(raw.subjectArea, legacy.subjectArea),
    chapter: str(raw.chapter),
    description: str(raw.description),
    knowledgePoints: Array.isArray(raw.knowledgePoints)
      ? raw.knowledgePoints.filter((k): k is string => typeof k === "string")
      : [],
    status: raw.status === "已完成" ? "已完成" : "进行中",
    steps: Array.isArray(raw.steps)
      ? raw.steps.filter((s): s is PrepStage =>
          (STAGE_IDS as readonly string[]).includes(s as PrepStage)
        )
      : [],
    favorite: raw.favorite === true,
    stageOutputs: normalizeStageOutputs(raw.stageOutputs),
    createdAt: str(raw.createdAt, new Date(0).toISOString()),
    updatedAt: str(raw.updatedAt, new Date(0).toISOString()),
  };
}

/** 从 localStorage 读取全部项目；数据损坏时重置为空列表而不是抛错 */
export function getAllProjects(): PrepProject[] {
  if (!isStorageAvailable()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is Record<string, unknown> =>
          typeof item === "object" &&
          item !== null &&
          typeof (item as Record<string, unknown>).id === "string" &&
          typeof (item as Record<string, unknown>).title === "string"
      )
      .map(normalizeProject);
  } catch {
    // JSON 解析失败说明存储损坏，清空重来
    window.localStorage.removeItem(STORAGE_KEY);
    return [];
  }
}

/** 按 id 查找单个项目 */
export function getProject(id: string): PrepProject | null {
  return getAllProjects().find((p) => p.id === id) ?? null;
}

/** 新建或更新项目（存在同 id 则覆盖）；返回保存后的项目，写入失败返回 null */
export function saveProject(
  project: Omit<PrepProject, "id" | "createdAt" | "updatedAt"> &
    Partial<Pick<PrepProject, "id" | "createdAt" | "updatedAt">>
): PrepProject | null {
  const now = new Date().toISOString();
  const full: PrepProject = {
    ...project,
    id: project.id ?? generateId(),
    createdAt: project.createdAt ?? now,
    updatedAt: now,
  };
  const projects = getAllProjects();
  const index = projects.findIndex((p) => p.id === full.id);
  if (index >= 0) {
    projects[index] = full;
  } else {
    projects.unshift(full);
  }
  return persist(projects) ? full : null;
}

/** 备课进度写回补丁：stageOutputs 为全量替换（调用方持有合并），课程字段按需覆盖 */
export interface ProjectProgressPatch {
  stageOutputs?: StageOutputs;
  grade?: string;
  subjectArea?: string;
  chapter?: string;
  knowledgePoints?: string[];
}

/**
 * 备课进度写回窄接口（ADR-0004 自动增量写回的唯一入口）。
 * 合并补丁后单点派生 steps 与 status，项目不存在返回 false，
 * 落盘失败返回 false（调用方需提示，不得静默）。
 */
export function saveProjectProgress(
  id: string,
  patch: ProjectProgressPatch
): boolean {
  const projects = getAllProjects();
  const target = projects.find((p) => p.id === id);
  if (!target) return false;
  if (patch.stageOutputs !== undefined) target.stageOutputs = patch.stageOutputs;
  if (patch.grade !== undefined) target.grade = patch.grade;
  if (patch.subjectArea !== undefined) target.subjectArea = patch.subjectArea;
  if (patch.chapter !== undefined) target.chapter = patch.chapter;
  if (patch.knowledgePoints !== undefined) target.knowledgePoints = patch.knowledgePoints;
  target.steps = deriveSteps(target.stageOutputs);
  target.status = deriveStatus(target.stageOutputs);
  target.updatedAt = new Date().toISOString();
  return persist(projects);
}

/** 删除项目，返回是否成功落盘 */
export function deleteProject(id: string): boolean {
  return persist(getAllProjects().filter((p) => p.id !== id));
}

/** 切换收藏状态：返回切换后的状态；null 表示项目不存在或写入失败 */
export function toggleFavorite(id: string): boolean | null {
  const projects = getAllProjects();
  const target = projects.find((p) => p.id === id);
  if (!target) return null;
  target.favorite = !target.favorite;
  target.updatedAt = new Date().toISOString();
  return persist(projects) ? target.favorite : null;
}

/** 复制项目为新项目（标题加"副本"后缀），返回新项目；阶段成果随副本保留（副本即版本） */
export function duplicateProject(id: string): PrepProject | null {
  const source = getProject(id);
  if (!source) return null;
  return saveProject({
    ...source,
    id: undefined,
    title: `${source.title}（副本）`,
    createdAt: undefined,
    updatedAt: undefined,
    favorite: false,
  });
}

/** 导出项目为可下载的 JSON 内容 */
export function exportProject(project: PrepProject): string {
  return JSON.stringify(project, null, 2);
}

/** 写入存储；返回是否成功（配额满/隐私模式等场景会失败，调用方需感知） */
function persist(projects: PrepProject[]): boolean {
  if (!isStorageAvailable()) {
    console.warn("[storage] localStorage 不可用，本次修改未保存");
    return false;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    return true;
  } catch (error) {
    // 配额满或被禁用时明确警告，避免"以为存了其实没存"
    console.warn("[storage] 写入失败（可能配额已满或被禁用）:", error);
    return false;
  }
}
