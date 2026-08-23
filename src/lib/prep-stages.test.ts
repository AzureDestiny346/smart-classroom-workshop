import { describe, expect, it } from "vitest";
import {
  ADDIE_STAGES,
  buildStagePrompt,
  extractJsonBlock,
  isPrepStage,
  parseAnalysisSummary,
  stripJsonBlock,
  type CourseInfo,
  type StageOutputs,
} from "./prep-stages";

const course: CourseInfo = {
  subject: "代数",
  grade: "九年级",
  chapter: "二次函数",
  knowledgePoints: ["图像与性质", "顶点坐标"],
};

describe("ADDIE_STAGES 契约", () => {
  it("五阶段有序且标识唯一", () => {
    expect(ADDIE_STAGES.map((s) => s.id)).toEqual([
      "analysis",
      "design",
      "development",
      "implementation",
      "evaluation",
    ]);
    expect(new Set(ADDIE_STAGES.map((s) => s.id)).size).toBe(5);
  });

  it("isPrepStage 守卫非法值", () => {
    expect(isPrepStage("design")).toBe(true);
    expect(isPrepStage("deploy")).toBe(false);
    expect(isPrepStage(42)).toBe(false);
    expect(isPrepStage(undefined)).toBe(false);
  });
});

describe("buildStagePrompt 五模式组装", () => {
  it.each(ADDIE_STAGES.map((s) => [s.id, s.label] as const))(
    "%s 模式：system 含角色/阶段指令/JSON 摘要要求，user 含课程信息",
    (stage, label) => {
      const [system, user] = buildStagePrompt(stage, course);
      expect(system.role).toBe("system");
      expect(system.content).toContain("数学教育专家");
      expect(system.content).toContain("```json");
      expect(user.content).toContain("二次函数");
      expect(user.content).toContain("九年级");
      expect(user.content).toContain("图像与性质、顶点坐标");
      // 未传 priorOutputs 时不应出现上下文段落
      expect(user.content).not.toContain("已完成阶段成果");
      void label;
    }
  );

  it("各阶段 system 提示互不相同（指令差异化）", () => {
    const systems = ADDIE_STAGES.map((s) => buildStagePrompt(s.id, course)[0].content);
    expect(new Set(systems).size).toBe(5);
  });
});

describe("priorOutputs 阶段间信息传递", () => {
  const prior: StageOutputs = {
    analysis: {
      raw: "# 分析\n学生易混淆开口方向与系数 a 的关系。",
      structured: { knowledgePoints: [{ text: "图像与性质", level: "core" }] },
    },
  };

  it("设计阶段 prompt 注入分析成果（structured 与 raw）", () => {
    const [, user] = buildStagePrompt("design", course, prior);
    expect(user.content).toContain("已完成阶段成果");
    expect(user.content).toContain("分析阶段成果");
    expect(user.content).toContain("学生易混淆开口方向");
    expect(user.content).toContain('"level":"core"');
  });

  it("raw 超长时截断到 1500 字符并标注", () => {
    const long: StageOutputs = {
      analysis: { raw: "x".repeat(3000) },
    };
    const [, user] = buildStagePrompt("design", course, long);
    expect(user.content).toContain("（截断）");
    expect(user.content.length).toBeLessThan(2600);
  });
});

describe("extractJsonBlock / stripJsonBlock / parseAnalysisSummary", () => {
  const body = "## 教学要点\n- 要点一";
  const summary = '{"knowledgePoints":[{"text":"顶点坐标","level":"core"}],"teachingPoints":["要点一"]}';

  it("提取最后一个 json 围栏块", () => {
    const raw = `${body}\n\`\`\`json\n${summary}\n\`\`\`\n`;
    const parsed = extractJsonBlock(raw);
    expect(parsed).not.toBeNull();
    expect(parsed?.teachingPoints).toEqual(["要点一"]);
  });

  it("多个围栏块时取最后一个；无围栏/损坏 JSON 返回 null", () => {
    expect(extractJsonBlock('```json\n{"a":1}\n```\n文字\n```json\n{"b":2}\n```')).toEqual({ b: 2 });
    expect(extractJsonBlock(body)).toBeNull();
    expect(extractJsonBlock("```json\n{损坏}\n```")).toBeNull();
    expect(extractJsonBlock('```json\n[1,2]\n```')).toBeNull(); // 数组不是摘要对象
  });

  it("stripJsonBlock 剥离围栏块保留正文", () => {
    const raw = `${body}\n\`\`\`json\n${summary}\n\`\`\`\n`;
    expect(stripJsonBlock(raw)).toBe(body);
  });

  it("parseAnalysisSummary 守卫式解析：字段异常回退而非抛错", () => {
    const ok = parseAnalysisSummary({
      knowledgePoints: [{ text: "顶点坐标", level: "core" }, { text: 42 }, null],
      teachingPoints: ["要点一", 7],
    });
    expect(ok).toEqual({
      knowledgePoints: [{ text: "顶点坐标", level: "core" }],
      teachingPoints: ["要点一"],
      difficulties: [],
      misconceptions: [],
    });
    expect(parseAnalysisSummary(undefined)).toBeNull();
    expect(parseAnalysisSummary({})).not.toBeNull(); // 空对象也给出安全空摘要
  });
});
