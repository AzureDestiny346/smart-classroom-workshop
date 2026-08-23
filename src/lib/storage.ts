/**
 * 备课项目本地持久化层
 *
 * 基于 localStorage 的单机持久化方案（ADR-0001 阶段一）。
 * 后续迁移云端时只需保持本模块接口不变、替换实现。
 */

/** ADDIE 教学设计五阶段标识 */
export type PrepStage =
  | "analysis"
  | "design"
  | "development"
  | "implementation"
  | "evaluation";

/** 备课项目实体：教师围绕一个课程章节开展的完整备课工作 */
export interface PrepProject {
  id: string;
  title: string;
  /** 学科年级展示名，如"九年级数学" */
  subject: string;
  /** 章节 / 主题 */
  chapter: string;
  /** 项目描述（可选） */
  description: string;
  status: "进行中" | "已完成";
  /** 已完成的 ADDIE 阶段 */
  steps: PrepStage[];
  favorite: boolean;
  /** ISO 8601 时间戳 */
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "zhike.v1.projects";

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

/** ADDIE 全部合法阶段，用于归一化时过滤非法值 */
const VALID_STAGES: PrepStage[] = [
  "analysis",
  "design",
  "development",
  "implementation",
  "evaluation",
];

/**
 * 宽容归一化：字段缺失或类型异常时回退默认值。
 * 历史数据/异常数据不会让列表页在 steps.includes 等调用处抛错白屏。
 */
function normalizeProject(raw: Record<string, unknown>): PrepProject {
  const str = (v: unknown, fallback = "") =>
    typeof v === "string" ? v : fallback;
  return {
    id: str(raw.id),
    title: str(raw.title),
    subject: str(raw.subject),
    chapter: str(raw.chapter),
    description: str(raw.description),
    status: raw.status === "已完成" ? "已完成" : "进行中",
    steps: Array.isArray(raw.steps)
      ? raw.steps.filter((s): s is PrepStage =>
          VALID_STAGES.includes(s as PrepStage)
        )
      : [],
    favorite: raw.favorite === true,
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

/** 复制项目为新项目（标题加"副本"后缀），返回新项目 */
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
