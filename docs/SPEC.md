# 智课工坊 - 智能数学备课云平台

## 1. Concept & Vision

**智课工坊**是一款专为数学教师和师范生打造的AI辅助备课平台，深度融合数学学科特色与大模型能力。平台以"授人以渔"为核心理念，不仅提供备课工具，更通过内置的**数学GAI提示词框架**和**教学设计流程**，帮助新手教师快速掌握AI辅助教学的专业方法论，实现从"会用AI"到"善用AI"的跨越。

视觉上采用**学术严谨+科技感**的设计语言：深蓝主色调传递专业可信，渐变点缀增添现代活力；布局清晰留白充足，符合教育产品的稳重气质。

## 2. Design Language

### 色彩系统
```css
:root {
  /* 主色系 - 深邃学术蓝 */
  --primary-900: #0F172A;
  --primary-800: #1E293B;
  --primary-700: #334155;
  --primary-600: #475569;
  --primary-500: #64748B;

  /* 强调色 - 智慧紫 */
  --accent-500: #8B5CF6;
  --accent-400: #A78BFA;
  --accent-300: #C4B5FD;

  /* 功能色 */
  --success: #10B981;
  --warning: #F59E0B;
  --error: #EF4444;

  /* 背景与文字 */
  --bg-primary: #F8FAFC;
  --bg-card: #FFFFFF;
  --bg-dark: #0F172A;
  --text-primary: #1E293B;
  --text-secondary: #64748B;
  --text-muted: #94A3B8;

  /* 渐变 */
  --gradient-primary: linear-gradient(135deg, #667EEA 0%, #764BA2 100%);
  --gradient-accent: linear-gradient(135deg, #F093FB 0%, #F5576C 100%);
  --gradient-hero: linear-gradient(180deg, #0F172A 0%, #1E293B 100%);
}
```

### 字体系统
- **标题字体**: `"Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif`
- **正文字体**: `"Noto Sans SC", "PingFang SC", sans-serif`
- **代码/数学字体**: `"JetBrains Mono", "Fira Code", monospace`

### 间距系统
- 基础单位: 4px
- 常用间距: 8px, 12px, 16px, 24px, 32px, 48px, 64px
- 卡片圆角: 12px
- 按钮圆角: 8px

### 动效设计
- **页面过渡**: fade + slide-up, 300ms ease-out
- **卡片悬停**: translateY(-2px) + shadow增强, 200ms
- **按钮交互**: scale(0.98), 100ms
- **加载状态**: skeleton shimmer动画, 1.5s infinite
- **打字机效果**: 流式输出逐字显示

### 视觉元素
- **图标库**: Lucide React (线性风格)
- **装饰**: 几何线条、渐变光晕、数学符号作为背景纹理
- **插图风格**: 扁平科技风，与深色主题呼应

## 3. Layout & Structure

### 页面架构

```
┌─────────────────────────────────────────────────────────────┐
│  Header: Logo + 导航 + 用户信息                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [首页/仪表盘]                                               │
│  - 欢迎语 + 快速开始卡片                                     │
│  - 最近项目                                                  │
│  - 快捷工具入口                                              │
│                                                             │
│  [智能备课中心]                                               │
│  - 课程信息输入区                                            │
│  - 教学设计流程向导 (ADDIE)                                   │
│  - AI对话交互区                                              │
│  - 备课成果预览                                               │
│                                                             │
│  [提示词工坊]                                                 │
│  - 数学GAI提示词模板库                                       │
│  - 提示词构建器                                               │
│  - 自定义提示词管理                                          │
│                                                             │
│  [教学资源库]                                                 │
│  - 教案模板                                                  │
│  - 习题库                                                    │
│  - 教学案例                                                  │
│                                                             │
│  [我的项目]                                                   │
│  - 项目列表                                                  │
│  - 版本历史                                                  │
│  - 导出分享                                                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 响应式策略
- **桌面端 (>1280px)**: 完整三栏布局，AI对话侧边栏
- **平板端 (768-1280px)**: 两栏布局，功能聚合
- **移动端 (<768px)**: 单栏布局，底部Tab导航

## 4. Features & Interactions

### 4.1 智能备课中心 (核心功能)

#### 输入阶段
- **课程基本信息**: 学科、年级、章节、教学目标
- **学情分析**: 学生基础、学习风格、班级特点
- **知识点标注**: 支持上传教材或手动输入关键知识点

#### ADDIE教学设计流程
1. **Analysis (分析)**
   - AI自动分析教学内容结构
   - 识别重点、难点、易错点
   - 生成知识点图谱

2. **Design (设计)**
   - 教学目标设计建议
   - 教学策略推荐
   - 评估方案生成

3. **Development (开发)**
   - 教案自动生成
   - 课件大纲建议
   - 习题设计辅助

4. **Implementation (实施)**
   - 教学流程时间轴
   - 课堂活动设计
   - 师生互动点提示

5. **Evaluation (评估)**
   - 形成性评价建议
   - 总结性评价方案
   - 教学反思模板

#### AI对话交互
- 基于数学学科提示词框架
- 支持追问、澄清、迭代
- 流式输出，打字机效果
- 上下文记忆，保持会话连贯

### 4.2 数学GAI提示词工坊

#### 提示词模板库
- **知识点讲解类**: 概念解析、定理证明、公式推导
- **例题设计类**: 基础题、变式题、拓展题
- **教学设计类**: 导入策略、活动设计、评价设计
- **学情分析类**: 前测分析、诊断评估、个性化建议

#### 提示词构建器
- 可视化组件拼装
- 变量占位符 `{知识点}`、`{难度}`、`{学段}`
- 角色设定模板
- 输出格式控制
- 温度参数调节

### 4.3 备课成果管理

#### 版本管理
- 自动保存历史版本
- 版本对比 (diff视图)
- 一键回滚

#### 导出功能
- Word教案 (.docx)
- Markdown格式
- PDF打印版
- JSON数据备份

## 5. Component Inventory

### Navigation
- **顶部导航栏**: Logo、主导航、用户菜单
  - 默认: 透明背景，亮色文字
  - 滚动: 毛玻璃背景，阴影
  - 移动: 汉堡菜单

### Cards
- **功能卡片**: 图标 + 标题 + 描述
  - 默认: 白色背景，细边框
  - 悬停: 阴影加深，边框渐变
  - 点击: scale(0.98)

- **项目卡片**: 封面 + 标题 + 状态标签 + 更新时间
  - 默认: 白色背景
  - 悬停: 向上偏移，阴影

### Forms
- **输入框**: 标签 + 输入 + 辅助文字
  - 默认: 浅灰边框
  - 聚焦: 主色边框，光晕
  - 错误: 红色边框，错误提示
  - 禁用: 灰色背景

- **下拉选择**: 带搜索的单/多选
- **开关切换**: 主色开启状态
- **滑块**: 数值区间选择

### Buttons
- **主按钮**: 渐变背景，白色文字
  - 悬停: 亮度提升
  - 点击: scale(0.98)
  - 禁用: 灰色，无交互

- **次按钮**: 边框主色，透明背景
- **文字按钮**: 无边框，用于辅助操作
- **图标按钮**: 圆形，图标居中

### AI Components
- **对话气泡**: 用户(右对齐，主色) / AI(左对齐，灰色)
- **打字光标**: 闪烁竖线 `|`
- **加载骨架**: 渐变动画占位
- **流式文本**: 逐字显示，支持Markdown渲染

### Progress
- **步骤指示器**: 圆形节点 + 连接线
  - 完成: 主色填充 + 对勾
  - 当前: 主色边框 + 脉冲动画
  - 未完成: 灰色边框

### Modal
- **对话框**: 毛玻璃遮罩 + 居中卡片
- **抽屉**: 侧边滑入面板
- **提示**: 顶部toast通知

## 6. Technical Approach

### 框架选择
- **前端**: Next.js 16 (App Router)
- **样式**: Tailwind CSS 4 + shadcn/ui
- **状态**: React useState/useContext
- **AI对接**: 流式SSE

### API设计

#### 备课相关接口
```
POST /api/备课/分析
  - 输入: { course, chapter, objectives }
  - 输出: 流式 { analysis, knowledgeGraph }

POST /api/备课/生成教案
  - 输入: { analysis, designOptions }
  - 输出: 流式 { lessonPlan }

POST /api/备课/生成习题
  - 输入: { knowledgePoints, difficulty }
  - 输出: 流式 { exercises }

GET /api/项目列表
GET /api/项目/{id}
POST /api/项目
PUT /api/项目/{id}
DELETE /api/项目/{id}
```

#### 提示词相关接口
```
GET /api/提示词模板
GET /api/提示词模板/{category}
POST /api/提示词验证
```

### 数据模型
```typescript
// 项目
interface Project {
  id: string;
  title: string;
  course: Course;
  design: ADDIEDesign;
  versions: Version[];
  createdAt: Date;
  updatedAt: Date;
}

// 课程信息
interface Course {
  subject: string;
  grade: string;
  chapter: string;
  knowledgePoints: string[];
  objectives: string[];
}

// ADDIE设计
interface ADDIEDesign {
  analysis: AnalysisResult;
  design: DesignResult;
  development: DevelopmentResult;
  implementation: ImplementationPlan;
  evaluation: EvaluationPlan;
}

// 版本
interface Version {
  id: string;
  data: Project;
  createdAt: Date;
  note: string;
}
```

### 集成LLM
- 使用 `/skills/public/prod/llm` 技能
- 流式输出遵循SSE协议
- 数学公式使用KaTeX渲染
- 会话上下文管理

## 7. 数学GAI提示词框架

### 框架结构
```
【角色设定】
你是一位具有[年限]年经验的数学教师，擅长[领域]...

【任务描述】
请帮我[具体任务]...

【输入信息】
课程：[信息]
学生：[信息]
目标：[信息]

【约束条件】
1. [约束1]
2. [约束2]

【输出要求】
格式：[格式]
风格：[风格]
```

### 核心提示词模板

#### 知识点讲解
```markdown
作为高中数学专家，请为"[知识点]"设计一个清晰易懂的讲解方案：

1. 核心概念定义
2. 与已学知识的关联
3. 典型例题 (3道，难度递进)
4. 学生常见误解
5. 记忆技巧
```

#### 教学目标设计
```markdown
基于"[教学内容]"，请设计符合Bloom认知层次的教学目标：
- 记忆层：[具体目标]
- 理解层：[具体目标]
- 应用层：[具体目标]
```

#### 习题设计
```markdown
请为"[知识点]"设计一套习题：
- 基础题 (5道): 考察基本概念
- 变式题 (3道): 变换条件/提问方式
- 拓展题 (2道): 综合应用/探索
```

## 8. 内容示例

### 首页欢迎语
```
欢迎回来，王老师！
今天准备如何让"导数"课堂更有趣？
```

### 快速开始
```
📚 新建备课项目
💡 使用提示词模板
📂 继续上次项目
🎯 查看教学建议
```
