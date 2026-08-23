# 智课工坊技术文档

## 系统架构

### 整体层级

智课工坊采用 Next.js 16 全栈架构，前后端在同一仓库中协同开发。

```
┌──────────────────────────────────────────────────┐
│  前端表现层                                       │
│  ┌────────────┬─────────────┬────────────────┐  │
│  │  首页      │  智能备课中心 │  提示词工坊    │  │
│  └────────────┴─────────────┴────────────────┘  │
──────────────────────────────────────────────────┤
│  API 路由层（Next.js App Router）                 │
│  ┌────────────┬─────────────┬────────────────┐  │
│  │  /api/prep │  /api/chat  │  /api/template│  │
│  └────────────┴─────────────┴────────────────┘  │
├──────────────────────────────────────────────────┤
│  AI 服务层                                        │
│  ┌──────────────────────────────────────────── │
│  │  coze-coding-dev-sdk（流式大模型调用）       │ │
│  └────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────┤
│  数据持久层                                       │
│  ┌────────────────────────────────────────────┐ │
│  │  localStorage（项目、配置、缓存）            │ │
│  └────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

---

## 技术栈详情

### 前端

| 技术 | 版本 | 用途 |
|------|------|------|
| Next.js | 16.1.1 | 全栈框架、App Router、API 路由 |
| React | 19.2.3 | 组件化 UI 与状态管理 |
| TypeScript | 5.x | 类型安全 |
| Tailwind CSS | 4.x | 原子化样式 |
| shadcn/ui | 最新版 | 基础 UI 组件库 |
| lucide-react | 0.468 | 图标库 |

### AI 与流式交互

| 技术 | 用途 |
|------|------|
| coze-coding-dev-sdk | 大模型流式调用 SDK |
| Server-Sent Events (SSE) | 实时推送 AI 响应 |
| Markdown / LaTeX | 教案与公式渲染 |

### 工程化

| 工具 | 用途 |
|------|------|
| pnpm | 包管理 |
| ESLint | 代码质量 |
| TypeScript 类型检查 | 静态检查 |
| GitHub Actions | CI/CD |

---

## 数据使用

> 对应大赛作品要求第三部分：数据清单 + 算法模型与技术方案。

### 数据清单

本项目是提示工程驱动的应用，**不使用开放数据集做训练或微调**，数据构成如下：

**自带业务数据**（内置）：

| 数据 | 位置 | 字段/结构 | 核心支撑作用 |
|------|------|-----------|--------------|
| 数学教学提示词模板（7 个） | 前端内置（提示词工坊） | 分类、标题、提示词正文、变量占位符 | 提示词工坊的模板库与变量填充功能 |
| ADDIE 五阶段指令定义 | `src/app/api/prep/route.ts` 系统提示词 | 阶段标识、模式指令、输出要求 | 五阶段各自的 AI 行为约束 |
| 学科年级选项 | 前端内置 | 七年级至高三数学 | 项目创建的学段覆盖 |

**用户运行时数据**（浏览器 localStorage，键 `zhike.v1.projects`）：

| 字段 | 类型 | 说明 |
|------|------|------|
| id / title / subject / chapter / description | string | 项目标识与课程信息 |
| status | "进行中" \| "已完成" | 项目状态 |
| steps | PrepStage[] | 已完成的 ADDIE 阶段 |
| favorite | boolean | 收藏标记 |
| createdAt / updatedAt | ISO 8601 | 时间戳 |

**理论框架**（作为提示词设计依据，非数据集）：ADDIE 教学设计模型（五阶段流程结构）、Bloom 认知目标分类（设计阶段指令中要求按认知层次分层）。

### 算法模型与技术方案

不训练自有模型，技术路线为**大模型底座 + 提示工程 + 流程编排**：

1. **提示工程（核心工作）**：系统提示词采用结构化四段式——【角色设定】（数学教育专家）→【职责】→【模式指令】（ADDIE 五阶段各自附加阶段专属约束，如分析阶段要求输出知识点结构/重点难点/常见误解）→【输出要求】（Markdown、数学学科特点、符合中学教学实际）。用户消息由课程信息（学科/年级/章节/知识点）模板化组装。输入输出：输入为结构化课程信息 JSON，输出为流式 Markdown 阶段成果。
2. **流程编排**：前端 ADDIE 状态机管理阶段推进；对话模式保留完整消息列表作为多轮上下文。
3. **流式交互**：服务端经 coze-coding-dev-sdk 调用大模型，以 SSE（`data: {content}` / `data: {done, result}`）逐块推送，前端打字机渲染。

数据加工与融合方式：不涉及数据集清洗与特征工程；用户课程信息 + 内置提示词框架在服务端组装为提示词 → 大模型生成 → 流式返回 → 前端渲染并本地持久化。

---

## 核心模块设计

### 1. 智能备课模块

文件：`src/app/prep/page.tsx`、`src/app/api/prep/route.ts`

核心数据结构：

```typescript
interface PrepFlow {
  currentStep: 'analysis' | 'design' | 'development' | 'implementation' | 'evaluation';
  courseInfo: {
    subject: string;
    grade: string;
    chapter: string;
    knowledgePoints: string[];
    objectives?: string[];
  };
  messages: Message[];
  outputs: {
    analysis?: AnalysisResult;
    design?: DesignResult;
    development?: DevelopmentResult;
    implementation?: ImplementationPlan;
    evaluation?: EvaluationPlan;
  };
}
```

### 2. 提示词工坊模块

文件：`src/app/prompt/page.tsx`、`src/lib/prompt-templates.ts`

核心数据结构：

```typescript
interface PromptTemplate {
  id: string;
  category: 'knowledge' | 'exercise' | 'teaching' | 'assessment' | 'reflection';
  title: string;
  description: string;
  prompt: string;
  variables: string[];
  examples?: string[];
}
```

### 3. 数据持久化模块

文件：`src/lib/storage.ts`（待实现）、`src/app/projects/page.tsx`

提供项目 CRUD 能力，当前基于 `localStorage`，未来可平滑迁移到云端数据库。

---

## API 设计

### 备课分析 API

```http
POST /api/prep
Content-Type: application/json
```

请求体：

```json
{
  "subject": "数学",
  "grade": "高一",
  "chapter": "函数",
  "knowledgePoints": ["一次函数", "二次函数"],
  "objectives": ["理解函数概念", "掌握函数表示方法"],
  "mode": "analysis"
}
```

响应（SSE）：

```text
data: {"content": "### 知识点分析\n..."}
data: {"content": "学生常见误解：..."}
data: {"done": true, "result": "完整分析结果"}
```

### 对话交互 API

```http
POST /api/chat
Content-Type: application/json
```

请求体：

```json
{
  "messages": [
    { "role": "user", "content": "如何讲解函数单调性？" }
  ]
}
```

响应（SSE）：

```text
data: {"content": "函数单调性可以从生活实例引入..."}
data: {"done": true, "result": "函数单调性可以从生活实例引入..."}
```

---

## 性能优化

### 前端

- **流式响应分块传输**：SSE 实时推送 AI 内容，用户无需等待完整响应。
- **组件按需加载**：页面级别使用 Next.js 动态导入，减少首屏体积。
- **状态局部化**：减少不必要的全局重渲染。

### AI 层

- **提示词精简**：去除冗余上下文，降低 Token 消耗。
- **结果缓存**：相同课程信息的分析结果可缓存复用。
- **错误降级**：AI 服务异常时返回预设的友好提示。

---

## 安全考虑

### 输入安全

- 后端对所有 `request.json()` 输入进行校验。
- 禁止在提示词中直接拼接用户输入，使用结构化的消息列表。

### 内容安全

- 提示词模板内置内容约束，避免 AI 输出不符合教学规范的内容。
- 对教育场景下的敏感话题进行过滤。

### 部署安全

- API 路由在公网部署前需增加限流与鉴权（如 Vercel 边缘配置或中间件）。
- 当前阶段不采集用户隐私数据，数据仅存于浏览器本地。

---

## 部署方案

### 开发环境

```bash
pnpm install
pnpm dev
```

### 生产构建

```bash
pnpm build
pnpm start
```

### 平台部署

- 推荐 Vercel 平台一键部署。
- CI/CD 使用 GitHub Actions，执行类型检查和构建。

### 容器化示例

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
EXPOSE 3000
CMD ["pnpm", "start"]
```

---

## 测试策略

### 单元测试

- 覆盖 `src/lib` 下的纯函数与工具类（如提示词变量替换、存储序列化）。
- 推荐工具：Vitest + Testing Library。

### 集成测试

- 对 `/api/prep`、`/api/chat` 进行 SSE 响应测试。
- 验证请求参数校验、流式输出解析、异常处理。

### E2E 测试

- 覆盖核心用户流程：创建备课项目、运行 ADDIE 流程、使用提示词模板。
- 推荐工具：Playwright。

### 测试目标

- 核心功能测试覆盖率不低于 80%。
- 每次提交前执行 `pnpm ts-check` 和构建验证。
