/**
 * storage 层契约测试（ADR-0004）
 *
 * 覆盖：旧数据迁移解析、宽容 normalize、displayCourseInfo 派生、
 * saveProjectProgress 的 steps/status 派生与覆盖语义。
 * node 环境下自装内存 localStorage 桩，键为 ADR-0001 契约键。
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  displayCourseInfo,
  getAllProjects,
  getProject,
  saveProject,
  saveProjectProgress,
} from "./storage";
import { STAGE_IDS } from "./prep-stages";

const STORAGE_KEY = "zhike.v1.projects";

/** 内存 localStorage 桩：node 环境无 window，storage 层探测 window.localStorage */
class MemoryStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
}

function installStorage(): void {
  (globalThis as unknown as { window: unknown }).window = {
    localStorage: new MemoryStorage(),
  };
}

function seed(projects: unknown[]): void {
  const win = (globalThis as unknown as { window: { localStorage: MemoryStorage } })
    .window;
  win.localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

beforeEach(() => {
  installStorage();
});

describe("旧数据迁移：subject 展示名拆分", () => {
  it.each([
    ["九年级数学", "九年级", "数学"],
    ["高一数学", "高一", "数学"],
    ["七年级数学", "七年级", "数学"],
  ])("legacy subject %j → grade %j + subjectArea %j", (subject, grade, area) => {
    seed([{ id: "p1", title: "二次函数", subject, chapter: "二次函数" }]);
    const project = getProject("p1");
    expect(project?.grade).toBe(grade);
    expect(project?.subjectArea).toBe(area);
  });

  it("无法解析学段前缀时 grade 留空、subjectArea 保留原串", () => {
    seed([{ id: "p1", title: "专题", subject: "高等数学专题", chapter: "极限" }]);
    const project = getProject("p1");
    expect(project?.grade).toBe("");
    expect(project?.subjectArea).toBe("高等数学专题");
  });
});

describe("宽容 normalize：新增字段缺失回退默认值", () => {
  it("knowledgePoints 缺失 → 空数组，stageOutputs 缺失 → 空对象", () => {
    seed([{ id: "p1", title: "二次函数", subject: "九年级数学", chapter: "二次函数" }]);
    const project = getProject("p1");
    expect(project?.knowledgePoints).toEqual([]);
    expect(project?.stageOutputs).toEqual({});
  });

  it("stageOutputs 非法条目被剔除、合法条目保留（structured 可缺席）", () => {
    seed([
      {
        id: "p1",
        title: "二次函数",
        subject: "九年级数学",
        chapter: "二次函数",
        stageOutputs: {
          analysis: { raw: "# 分析成果" },
          design: "not-an-object",
          development: { raw: 42 },
        },
      },
    ]);
    const outputs = getProject("p1")?.stageOutputs ?? {};
    expect(Object.keys(outputs)).toEqual(["analysis"]);
    expect(outputs.analysis?.raw).toBe("# 分析成果");
  });
});

describe("displayCourseInfo：展示名派生", () => {
  it("grade 与 subjectArea 齐全时以 · 连接", () => {
    expect(displayCourseInfo({ grade: "九年级", subjectArea: "数学" })).toBe(
      "九年级·数学"
    );
  });

  it("grade 缺失时仅返回 subjectArea", () => {
    expect(displayCourseInfo({ grade: "", subjectArea: "代数" })).toBe("代数");
  });

  it("两者皆空返回空串", () => {
    expect(displayCourseInfo({ grade: "", subjectArea: "" })).toBe("");
  });
});

describe("saveProjectProgress：写回派生与覆盖语义", () => {
  /** 种子一个全空 v2 项目 */
  function seedV2Project(): void {
    seed([
      {
        id: "p1",
        title: "二次函数",
        grade: "九年级",
        subjectArea: "数学",
        chapter: "二次函数",
        description: "",
        knowledgePoints: ["图像", "性质"],
        status: "进行中",
        steps: [],
        favorite: false,
        stageOutputs: {},
        createdAt: "2026-08-28T08:00:00.000Z",
        updatedAt: "2026-08-28T08:00:00.000Z",
      },
    ]);
  }

  it("写入单阶段成果：steps 派生、status 保持进行中、updatedAt 前移", () => {
    seedV2Project();
    const ok = saveProjectProgress("p1", {
      stageOutputs: { analysis: { raw: "# 分析成果" } },
    });
    expect(ok).toBe(true);
    const project = getProject("p1");
    expect(project?.steps).toEqual(["analysis"]);
    expect(project?.status).toBe("进行中");
    expect(project?.updatedAt && project.updatedAt > "2026-08-28T08:00:00.000Z").toBe(true);
  });

  it("五阶段齐备：steps 按 ADDIE 序齐全、status 自动转已完成", () => {
    seedV2Project();
    const outputs = Object.fromEntries(
      STAGE_IDS.map((stage) => [stage, { raw: `# ${stage}` }])
    );
    saveProjectProgress("p1", { stageOutputs: outputs });
    const project = getProject("p1");
    expect(project?.steps).toEqual([...STAGE_IDS]);
    expect(project?.status).toBe("已完成");
  });

  it("重跑覆盖旧成果而非追加", () => {
    seedV2Project();
    saveProjectProgress("p1", {
      stageOutputs: { analysis: { raw: "旧版本" } },
    });
    saveProjectProgress("p1", {
      stageOutputs: { analysis: { raw: "新版本" } },
    });
    const project = getProject("p1");
    expect(project?.stageOutputs.analysis?.raw).toBe("新版本");
    expect(project?.steps).toEqual(["analysis"]);
  });

  it("重新开始：stageOutputs 置空后 steps 与 status 同步归零", () => {
    seedV2Project();
    saveProjectProgress("p1", {
      stageOutputs: { analysis: { raw: "# 分析成果" } },
    });
    saveProjectProgress("p1", { stageOutputs: {} });
    const project = getProject("p1");
    expect(project?.steps).toEqual([]);
    expect(project?.status).toBe("进行中");
  });

  it("课程信息修改写回：学段/领域/知识点", () => {
    seedV2Project();
    saveProjectProgress("p1", {
      grade: "高三",
      subjectArea: "函数",
      knowledgePoints: ["导数"],
    });
    const project = getProject("p1");
    expect(project?.grade).toBe("高三");
    expect(project?.subjectArea).toBe("函数");
    expect(project?.knowledgePoints).toEqual(["导数"]);
  });

  it("项目不存在时返回 false", () => {
    seedV2Project();
    expect(saveProjectProgress("ghost", { stageOutputs: {} })).toBe(false);
  });

  it("落盘失败（setItem 抛错）时返回 false 而不是抛出", () => {
    seedV2Project();
    const win = (
      globalThis as unknown as { window: { localStorage: MemoryStorage } }
    ).window;
    win.localStorage.setItem = () => {
      throw new Error("QuotaExceededError");
    };
    expect(saveProjectProgress("p1", { stageOutputs: {} })).toBe(false);
  });
});

describe("saveProject：v2 新建路径", () => {
  it("以 v2 字段创建项目，steps/status 由成果派生（空成果 → 空步骤、进行中）", () => {
    const saved = saveProject({
      title: "二次函数图像",
      grade: "九年级",
      subjectArea: "数学",
      chapter: "二次函数",
      description: "",
      knowledgePoints: ["图像"],
      favorite: false,
      stageOutputs: {},
    });
    expect(saved).not.toBeNull();
    expect(saved?.grade).toBe("九年级");
    expect(saved?.steps).toEqual([]);
    expect(saved?.status).toBe("进行中");
    expect(getAllProjects()).toHaveLength(1);
  });

  it("创建时携带成果：入参不收 steps/status，派生值生效", () => {
    const saved = saveProject({
      title: "带成果新建",
      grade: "高三",
      subjectArea: "函数",
      chapter: "导数",
      description: "",
      knowledgePoints: [],
      favorite: false,
      stageOutputs: { analysis: { raw: "# 分析" } },
    });
    expect(saved?.steps).toEqual(["analysis"]);
    expect(saved?.status).toBe("进行中");
  });
});
