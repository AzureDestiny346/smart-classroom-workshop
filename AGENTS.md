# 智课工坊 - 项目开发规范

## 项目概述

**智课工坊**是一款专为数学教师和师范生打造的AI辅助备课云平台，深度融合数学学科特色与大模型能力，帮助新手教师快速掌握AI辅助教学的专业方法论。

## 技术栈

- **框架**: Next.js 16 (App Router)
- **核心**: React 19
- **语言**: TypeScript 5
- **UI组件**: shadcn/ui
- **样式**: Tailwind CSS 4
- **AI集成**: coze-coding-dev-sdk (LLMClient)

## 目录结构

```
src/
├── app/
│   ├── page.tsx              # 首页
│   ├── prep/page.tsx         # 智能备课中心
│   ├── prompt/page.tsx       # 提示词工坊
│   ├── projects/page.tsx      # 我的项目
│   └── api/
│       ├── chat/route.ts     # AI对话API (流式)
│       └── prep/route.ts     # 备课分析API (流式)
├── components/
│   └── layout/
│       └── navbar.tsx        # 导航栏
└── lib/
    └── utils.ts              # 工具函数
```

## 核心功能

### 1. 智能备课中心 (prep/page.tsx)
- **ADDIE教学设计流程**: 分析-设计-开发-实施-评估
- **向导模式**: 引导式备课流程
- **对话模式**: 自由问答AI助手
- **流式输出**: SSE协议，打字机效果

### 2. 提示词工坊 (prompt/page.tsx)
- **模板库**: 7个预设数学教学提示词模板
- **提示词构建器**: 可视化自定义提示词
- **变量填充**: 动态替换模板占位符

### 3. 我的项目 (projects/page.tsx)
- **项目管理**: 创建、编辑、删除项目
- **副本与导出**: 复制项目生成副本（副本即版本）、导出 JSON 分享
- **收藏功能**: 收藏重要项目
- **状态跟踪**: ADDIE五阶段进度可视化（由已入库的阶段成果派生）

## 开发命令

```bash
pnpm install          # 安装依赖
pnpm dev              # 开发模式 (端口5000)
pnpm build            # 生产构建
pnpm start            # 生产运行
pnpm ts-check         # TypeScript检查
pnpm lint             # ESLint检查
```

## API设计

### POST /api/chat
AI对话接口，支持流式输出

```typescript
// 请求
{
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  stream?: boolean
}

// 流式响应
data: {"content": "..."}
data: {"done": true}
```

### POST /api/prep
备课分析接口

```typescript
// 请求
{
  subject: string,
  grade: string,
  chapter: string,
  knowledgePoints: string[],
  mode: "analysis" | "design" | "development" | "implementation" | "evaluation"
}
```

## 数学GAI提示词框架

### 模板结构
```
【角色设定】
你是一位具有X年经验的数学教师...

【任务描述】
请帮我完成XXX...

【约束条件】
1. ...
2. ...

【输出要求】
格式：...
风格：...
```

### 预设模板
1. **数学概念讲解** - 定义、例子、常见误解
2. **定理证明讲解** - 证明思路、步骤、应用
3. **分层习题设计** - 基础题、变式题、拓展题
4. **教学目标设计** - Bloom认知层次
5. **课堂导入设计** - 多种导入方式
6. **学情分析诊断** - 知识基础、认知障碍
7. **教学反思生成** - 反思框架、改进计划

## 设计规范

### 颜色系统
- **主色**: #6366F1 (Indigo)
- **强调色**: #8B5CF6 (Purple)
- **成功**: #10B981 (Green)
- **警告**: #F59E0B (Amber)
- **错误**: #EF4444 (Red)

### 组件使用
- 使用shadcn/ui组件库
- 遵循组件的默认样式规范
- 使用Tailwind CSS进行自定义样式

## 注意事项

1. **流式输出**: AI响应必须使用SSE协议
2. **类型安全**: 禁止使用`any`，必须标注类型
3. **Hydration**: 避免在SSR中使用动态数据
4. **性能**: 避免不必要的重新渲染

## Agent skills

### Issue tracker

Issues 在 GitHub Issues（`AzureDestiny346/smart-classroom-workshop`）中跟踪，通过 `gh` CLI 读写。见 `docs/agents/issue-tracker.md`。

### Triage labels

使用默认的五个规范 triage 标签（`needs-triage` / `needs-info` / `ready-for-agent` / `ready-for-human` / `wontfix`）。见 `docs/agents/triage-labels.md`。

### Domain docs

Single-context 布局：根目录 `CONTEXT.md` + `docs/adr/`。见 `docs/agents/domain.md`。
