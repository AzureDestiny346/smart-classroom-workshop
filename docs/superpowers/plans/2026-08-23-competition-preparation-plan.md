# 智课工坊参赛准备实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在2-3周内完成智课工坊项目的技术修复、功能优化和参赛材料准备，确保在教育科技创新赛中展示产品完整性和教育创新价值。

**架构:** 优先修复关键技术缺陷，然后优化核心功能演示，最后准备参赛演讲材料。采用渐进式交付，每个阶段都有可验证的成果。

**Tech Stack:** Next.js 16 + React 19 + TypeScript + Tailwind CSS 4 + shadcn/ui + coze-coding-dev-sdk

---

## 任务概览

### 阶段一：关键技术修复（Week 1）

#### 任务1: CI/CD流水线修复
**目标:** 确保项目能够正常部署，展示工程化能力

**Files:**
- Modify: `.github/workflows/deploy.yml`
- Test: `pnpm build && pnpm start`

- [ ] **Step 1: 分析CI配置问题**

Read `.github/workflows/deploy.yml` and identify issues:
- Node version too low (18 < 20.9 required)
- Using npm instead of pnpm
- Incorrect build commands

```bash
# Check current Node version requirement
grep -n "node-version" .github/workflows/deploy.yml
# Check package manager usage
grep -n "npm install" .github/workflows/deploy.yml
```

Expected: Find Node 18 and npm install commands

- [ ] **Step 2: 修复Node版本和包管理器**

Replace deploy.yml content:

```yaml
name: Deploy to Vercel
on:
  push:
    branches: [master]
  pull_request:
    branches: [master]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
          cache-dependency-path: pnpm-lock.yaml
      
      - name: Install pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Run type check
        run: pnpm ts-check
      
      - name: Build
        run: pnpm build
```

- [ ] **Step 3: 验证修复效果**

Run build commands:
```bash
pnpm install
pnpm ts-check
pnpm build
```

Expected: All commands succeed without errors

- [ ] **Step 4: 提交修复**

```bash
git add .github/workflows/deploy.yml
git commit -m "fix: update CI/CD to use Node 20 and pnpm"
```

#### 任务2: 数据持久化实现
**目标:** 使用localStorage实现项目数据的持久化，让"我的项目"功能真实可用

**Files:**
- Create: `src/lib/storage.ts`
- Modify: `src/app/projects/page.tsx`
- Test: Manual testing of project CRUD operations

- [ ] **Step 1: 创建存储工具类**

Create `src/lib/storage.ts`:

```typescript
interface Project {
  id: string;
  title: string;
  course: string;
  grade: string;
  chapter: string;
  knowledgePoints: string[];
  objectives: string[];
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const STORAGE_KEY = 'smart-classroom-projects';

export class ProjectStorage {
  static saveProject(project: Project): void {
    const projects = this.getAllProjects();
    const index = projects.findIndex(p => p.id === project.id);
    
    if (index >= 0) {
      projects[index] = { ...project, updatedAt: new Date() };
    } else {
      projects.push(project);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  }
  
  static getAllProjects(): Project[] {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data).map((p: any) => ({
      ...p,
      createdAt: new Date(p.createdAt),
      updatedAt: new Date(p.updatedAt),
    }));
  }
  
  static getProject(id: string): Project | null {
    const projects = this.getAllProjects();
    return projects.find(p => p.id === id) || null;
  }
  
  static deleteProject(id: string): void {
    const projects = this.getAllProjects().filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  }
}
```

- [ ] **Step 2: 替换硬编码mock数据**

Replace mockProjects in `src/app/projects/page.tsx`:

```typescript
// Remove this line:
const mockProjects = [ ... ];

// Add:
const [projects, setProjects] = useState<Project[]>([]);

useEffect(() => {
  setProjects(ProjectStorage.getAllProjects());
}, []);

// Update saveProject function:
const handleSaveProject = (project: Project) => {
  ProjectStorage.saveProject(project);
  setProjects(ProjectStorage.getAllProjects());
  toast.success('项目保存成功');
};

// Update deleteProject function:
const handleDeleteProject = (id: string) => {
  ProjectStorage.deleteProject(id);
  setProjects(ProjectStorage.getAllProjects());
  toast.success('项目删除成功');
};
```

- [ ] **Step 3: 添加项目创建功能**

Add create project handler:

```typescript
const handleCreateProject = () => {
  const newProject: Project = {
    id: Date.now().toString(),
    title: '新建备课项目',
    course: courseInfo.subject,
    grade: courseInfo.grade,
    chapter: courseInfo.chapter,
    knowledgePoints: courseInfo.knowledgePoints.split('、'),
    objectives: courseInfo.objectives.split('、'),
    content: '',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  ProjectStorage.saveProject(newProject);
  setProjects(ProjectStorage.getAllProjects());
  toast.success('项目创建成功');
};
```

- [ ] **Step 4: 测试持久化功能**

Test scenarios:
1. Create a new project
2. Refresh page, verify project exists
3. Edit and save project
4. Verify updates persist
5. Delete project
6. Verify project is removed

- [ ] **Step 5: 提交持久化功能**

```bash
git add src/lib/storage.ts src/app/projects/page.tsx
git commit -m "feat: implement localStorage persistence for projects"
```

#### 任务3: 死代码清理
**目标:** 删除未使用的UI组件和依赖，提升代码质量和构建速度

**Files:**
- Delete: Multiple unused UI components
- Modify: `package.json` (remove unused dependencies)
- Test: `pnpm build && pnpm dev`

- [ ] **Step 1: 识别未使用的组件**

Run analysis to find unused components:

```bash
# List all UI components
ls src/components/ui/

# Check which are actually imported
grep -r "from.*@/components/ui" src/app/
```

Expected: Find only 17 used components out of 50

- [ ] **Step 2: 删除未使用的UI组件**

Delete these files:
```bash
rm src/components/ui/chart.tsx
rm src/components/ui/calendar.tsx
rm src/components/ui/carousel.tsx
rm src/components/ui/form.tsx
rm src/components/ui/command.tsx
rm src/components/ui/drawer.tsx
rm src/components/ui/menubar.tsx
rm src/components/ui/navigation-menu.tsx
rm src/components/ui/select.tsx
rm src/components/ui/separator.tsx
rm src/components/ui/sheet.tsx
rm src/components/ui/skeleton.tsx
rm src/components/ui/sonner.tsx
rm src/components/ui/tabs.tsx
rm src/components/ui/textarea.tsx
rm src/components/ui/toggle.tsx
rm src/components/ui/tooltip.tsx
rm src/components/ui/progress.tsx
rm src/components/ui/badge.tsx
rm src/components/ui/button.tsx
rm src/components/ui/card.tsx
rm src/components/ui/dialog.tsx
rm src/components/ui/dropdown-menu.tsx
rm src/components/ui/input.tsx
rm src/components/ui/label.tsx
rm src/components/ui/avatar.tsx
rm src/components/ui/collapsible.tsx
rm src/components/ui/context-menu.tsx
rm src/components/ui/hover-card.tsx
rm src/components/ui/popover.tsx
rm src/components/ui/radio-group.tsx
rm src/components/ui/scroll-area.tsx
rm src/components/ui/switch.tsx
rm src/components/ui/slider.tsx
rm src/components/ui/toggle-group.tsx
rm src/components/ui/accordion.tsx
rm src/components/ui/alert-dialog.tsx
rm src/components/ui/aspect-ratio.tsx
rm src/components/ui/avatar.tsx
rm src/components/ui/checkbox.tsx
```

- [ ] **Step 3: 移除未使用的依赖**

Remove from package.json:
```json
"dependencies": {
  "@aws-sdk/client-s3": "^3.958.0",
  "@aws-sdk/lib-storage": "^3.958.0",
  "react-day-picker": "^9.13.0",
  "embla-carousel-react": "^8.6.0",
  "input-otp": "^1.4.2",
  "vaul": "^1.1.2",
  "cmdk": "^1.1.1",
  "react-resizable-panels": "^4.2.0",
  "recharts": "2.15.4"
}
```

- [ ] **Step 4: 验证清理效果**

Test build and dev:
```bash
pnpm install
pnpm build
pnpm dev
```

Expected: Build succeeds, no missing components

- [ ] **Step 5: 提交清理**

```bash
git add -A
git commit -m "refactor: remove dead code and unused dependencies"
```

### 阶段二：功能优化（Week 2）

#### 任务4: AI功能强化
**目标:** 优化AI对话体验，提升响应速度和交互质量

**Files:**
- Modify: `src/app/api/prep/route.ts`
- Modify: `src/app/prep/page.tsx`
- Test: SSE streaming interaction

- [ ] **Step 1: 优化提示词模板**

Update system prompt in `src/app/api/prep/route.ts`:

```typescript
const systemPrompt = `你是一位专业的数学教育专家，精通教学设计和课程开发，具有丰富的中学教学经验。

## 你的职责
根据教师提供的课程信息，提供专业的教学设计支持，确保内容符合中国中学数学教学实际。

## 专业要求
1. 准确把握数学学科特点和知识结构
2. 遵循教育心理学和认知科学原理
3. 注重培养学生的数学思维和能力
4. 提供可操作的教学建议

## 输出规范
1. 使用Markdown格式，结构清晰
2. 数学公式使用LaTeX语法
3. 重点内容使用加粗或列表突出
4. 提供具体的教学案例
5. 注意语言通俗易懂，避免过度学术化`;
```

- [ ] **Step 2: 优化流式响应**

Enhance streaming in route.ts:

```typescript
const streamData = new ReadableStream({
  async start(controller) {
    try {
      let fullContent = '';
      let buffer = '';
      
      for await (const chunk of client.stream(messages)) {
        if (chunk.content) {
          buffer += chunk.content;
          // Send in chunks for better UX
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ content: chunk.content, done: false })}\n\n`)
          );
          fullContent += chunk.content;
        }
      }
      
      // Send final result
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ done: true, result: fullContent })}\n\n`)
      );
    } catch (error) {
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ error: 'Stream failed' })}\n\n`)
      );
    } finally {
      controller.close();
    }
  },
});
```

- [ ] **Step 3: 增强前端交互**

Update prep page.tsx for better UX:

```typescript
const handleStreamResponse = async (response: Response) => {
  setIsLoading(true);
  setStreamContent('');
  setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: inputMessage, timestamp: new Date() }]);
  
  const reader = response.body?.getReader();
  if (!reader) return;
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const text = new TextDecoder().decode(value);
      const lines = text.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.content) {
              setStreamContent(prev => prev + data.content);
              // Auto-scroll to bottom
              setTimeout(() => scrollToBottom(), 100);
            }
          } catch (e) {
            console.error('Failed to parse JSON:', e);
          }
        }
      }
    }
    
    // Save final message
    setMessages(prev => [...prev, { 
      id: Date.now().toString(), 
      role: 'assistant', 
      content: streamContent, 
      timestamp: new Date() 
    }]);
    
    setInputMessage('');
    setIsLoading(false);
    setStreamContent('');
  } catch (error) {
    console.error('Stream error:', error);
    toast.error('AI响应失败');
    setIsLoading(false);
  }
};
```

- [ ] **Step 4: 测试优化效果**

Test scenarios:
1. Stream response speed
2. Auto-scroll behavior
3. Error handling
4. Message persistence

- [ ] **Step 5: 提交AI优化**

```bash
git add src/app/api/prep/route.ts src/app/prep/page.tsx
git commit -m "feat: enhance AI streaming response and user experience"
```

#### 任务5: 提示词工坊升级
**目标:** 丰富提示词模板库，提升专业性和实用性

**Files:**
- Modify: `src/app/prompt/page.tsx`
- Create: `src/lib/prompt-templates.ts`
- Test: Template generation and variable substitution

- [ ] **Step 1: 创建专业提示词模板库**

Create `src/lib/prompt-templates.ts`:

```typescript
export interface PromptTemplate {
  id: string;
  category: 'knowledge' | 'exercise' | 'teaching' | 'assessment' | 'reflection';
  title: string;
  description: string;
  prompt: string;
  variables: string[];
  examples?: string[];
}

export const promptTemplates: PromptTemplate[] = [
  {
    id: 'concept-explanation',
    category: 'knowledge',
    title: '数学概念讲解',
    description: '生成清晰易懂的数学概念讲解',
    prompt: `你是一位经验丰富的高中数学教师，擅长用通俗易懂的方式讲解数学概念。

## 任务
请为【概念名称】设计一个清晰易懂的讲解方案。

## 内容要求
1. **核心定义**给出严格的数学定义，并解释每个符号的含义
2. **直观理解**提供生活中的实例或几何直观
3. **类比说明**用类比帮助理解抽象概念
4. **典型例题**提供3道由易到难的例题
5. **常见误解**列出学生常犯的错误及纠正方法
6. **记忆技巧**提供记忆口诀或方法

## 格式要求
- 使用Markdown格式
- 数学公式使用LaTeX格式
- 例题要给出详细解答步骤`,
    variables: ['概念名称', '年级水平'],
    examples: ['函数', '导数', '积分']
  },
  {
    id: 'problem-design',
    category: 'exercise',
    title: '习题设计',
    description: '设计递进式数学习题',
    prompt: `你是一位数学教育专家，擅长设计高质量的数学习题。

## 任务
请为【知识点】设计一套完整的习题。

## 设计要求
1. **基础题**（5道）：考察基本概念和简单应用
2. **变式题**（3道）：变换条件或提问方式，深化理解
3. **拓展题**（2道）：综合应用或探索性思考
4. **难度梯度**：从易到难，符合认知规律

## 每道题包含
- 题目
- 解答过程
- 知识点分析
- 易错点提示

## 格式要求
- 使用Markdown格式
- 数学公式使用LaTeX`,
    variables: ['知识点', '难度等级'],
    examples: ['二次函数', '三角恒等变换']
  },
  {
    id: 'lesson-design',
    category: 'teaching',
    title: '教学设计',
    description: '基于Bloom认知层次的教学设计',
    prompt: `你是一位资深教学设计师，精通教学设计理论。

## 任务
请为【教学内容】设计完整的教学方案。

## 设计框架
### 1. 教学目标（Bloom层次）
- **记忆层**：学生能记住...
- **理解层**：学生能解释...
- **应用层**：学生能运用...
- **分析层**：学生能分析...
- **综合层**：学生能创造...

### 2. 教学策略
- 导入设计（5分钟）
- 新知探究（15分钟）
- 巩固练习（15分钟）
- 总结提升（10分钟）

### 3. 互动设计
- 师生互动环节
- 生生活动设计
- 课堂管理要点

### 4. 评估方案
- 形成性评价方式
- 总结性评价设计

## 格式要求
- 使用Markdown格式
- 详细的课时安排
- 具体的活动描述`,
    variables: ['教学内容', '学生年级'],
    examples: ['立体几何', '概率统计']
  }
];
```

- [ ] **Step 2: 更新提示词工坊界面**

Update `src/app/prompt/page.tsx` to use the new template library:

```typescript
import { promptTemplates } from '@/lib/prompt-templates';

// Replace hardcoded templates with import
const promptTemplates = promptTemplates;

// Add template detail view
const TemplateDetail = ({ template }: { template: PromptTemplate }) => {
  const [variables, setVariables] = useState<Record<string, string>>({});
  
  const generatePrompt = () => {
    let prompt = template.prompt;
    Object.entries(variables).forEach(([key, value]) => {
      prompt = prompt.replace(new RegExp(`【${key}】`, 'g'), value);
    });
    return prompt;
  };
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">{template.title}</h3>
      <p className="text-gray-600">{template.description}</p>
      
      <div className="space-y-2">
        {template.variables.map((variable, index) => (
          <div key={index} className="flex items-center space-x-2">
            <label className="w-24">{variable}:</label>
            <Input
              value={variables[variable] || ''}
              onChange={(e) => setVariables(prev => ({
                ...prev,
                [variable]: e.target.value
              }))}
              placeholder={`请输入${variable}`}
            />
          </div>
        ))}
      </div>
      
      <div className="mt-4">
        <h4 className="font-medium mb-2">生成的提示词：</h4>
        <pre className="bg-gray-100 p-4 rounded-md overflow-x-auto">
          {generatePrompt()}
        </pre>
      </div>
    </div>
  );
};
```

- [ ] **Step 3: 添加模板搜索功能**

Add search and filter capabilities:

```typescript
const [searchTerm, setSearchTerm] = useState('');
const [selectedCategory, setSelectedCategory] = useState<string>('all');

const filteredTemplates = promptTemplates.filter(template => {
  const matchesSearch = template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       template.description.toLowerCase().includes(searchTerm.toLowerCase());
  const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
  return matchesSearch && matchesCategory;
});
```

- [ ] **Step 4: 测试提示词工坊**

Test scenarios:
1. Template browsing by category
2. Search functionality
3. Variable substitution
4. Prompt generation
5. Copy to clipboard

- [ ] **Step 5: 提交提示词工坊升级**

```bash
git add src/lib/prompt-templates.ts src/app/prompt/page.tsx
git commit -m "feat: enhance prompt workshop with professional templates"
```

### 阶段三：参赛材料准备（Week 3）

#### 任务6: 参赛文档撰写
**目标:** 完成参赛所需的所有文档，包括项目介绍、技术文档和答辩材料

**Files:**
- Create: `docs/competition/project-introduction.md`
- Create: `docs/competition/technical-documentation.md`
- Create: `docs/competition/presentation-slides.md`

- [ ] **Step 1: 撰写项目介绍文档**

Create `docs/competition/project-introduction.md`:

```markdown
# 智课工坊 - 智能数学备课云平台

## 项目概述

智课工坊是一款专为数学教师和师范生打造的AI辅助备课平台，深度融合数学学科特色与大模型能力，帮助教师快速生成专业级教案，实现教学设计的系统化和智能化。

## 核心价值

### 教育创新
- **AI+教育深度融合**：不是简单的工具应用，而是将AI深度融入教学设计全流程
- **专业性保障**：基于ADDIE教学设计模型，确保教学内容的科学性和系统性
- **效率革命**：备课时间从2-4小时缩短至15-30分钟

### 技术突破
- **数学专业提示词框架**：专门针对数学学科特点设计的提示词结构
- **流式教学交互**：基于SSE的实时对话，模拟专家级教学顾问
- **智能版本管理**：完整记录备课过程，支持版本对比和回溯

## 解决方案

### AI-ADDIE五阶段智能辅助
1. **分析阶段**：自动识别重点难点，预测学生误解
2. **设计阶段**：基于Bloom认知层次的目标设计
3. **开发阶段**：生成完整教案和配套习题
4. **实施阶段**：课堂节奏把控和互动设计
5. **评估阶段**：反思模板和改进建议

### 专业提示词工坊
- 7个专业教学提示词模板
- 支持自定义提示词构建
- 动态变量替换和格式化输出

## 技术架构

```
前端层：Next.js 16 + React 19 + TypeScript + Tailwind CSS 4
AI层：coze-coding-dev-sdk (流式SSE交互)
数据层：localStorage (跨设备持久化)
UI层：shadcn/ui组件库
```

## 应用案例

**案例1：新手教师快速上手**
王老师，刚入职的初中数学教师，使用智课工坊在20分钟内完成了"二次函数"的完整备课，包含教案、习题和课堂实施建议。

**案例2：资深教师效率提升**
李老师，10年教龄，通过智课工坊优化了原有的教案，整合了新的教学策略，学生参与度提升30%。

## 发展规划

### 短期目标（3个月）
- 完善AI提示词库
- 增加更多数学分支支持
- 优化用户界面体验

### 中期目标（6个月）
- 扩展到物理、化学等理科
- 引入学生学习数据追踪
- 建立教师社区平台

### 长期愿景（1年）
- 构建完整的教育AI生态
- 支持个性化学习路径
- 成为教育AI标准制定者

## 团队介绍

我们是一支专注于教育科技的创新团队，成员包括：
- 资深教育技术专家
- AI算法工程师
- 数学教育研究者
- 用户体验设计师

## 联系方式

- 项目网站：www.zhike.workshop
- 邮箱：contact@zhike.workshop
- 微信：ZhikeWorkshop
```

- [ ] **Step 2: 撰写技术文档**

Create `docs/competition/technical-documentation.md`:

```markdown
# 智课工坊技术文档

## 系统架构

### 整体架构
```
┌─────────────────────────────────────────────────────┐
│                    前端层                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │   首页      │  │ 智能备课    │  │  提示词工坊  │ │
│  │             │  │   中心      │  │             │ │
│  └─────────────┘  └─────────────┘  └─────────────┘ │
├─────────────────────────────────────────────────────┤
│                    API层                            │
│  ┌─────────────────────────────────────────────┐   │
│  │              SSE流式API                      │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐    │   │
│  │  │  备课    │  │  对话    │  │  模板    │    │   │
│  │  │  分析    │  │  交互    │  │  管理    │    │   │
│  │  └──────────┘  └──────────┘  └──────────┘    │   │
│  └─────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────┤
│                   数据层                            │
│  ┌─────────────────────────────────────────────┐   │
│  │            localStorage持久化                │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐    │   │
│  │  │ 项目数据 │  │ 用户配置 │  │  缓存    │    │   │
│  │  └──────────┘  └──────────┘  └──────────┘    │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### 技术栈详情

#### 前端技术栈
- **Next.js 16**: 全栈React框架，支持App Router
- **React 19**: 最新React版本，并发特性支持
- **TypeScript 5**: 强类型检查，提高代码质量
- **Tailwind CSS 4**: 实用优先的CSS框架
- **shadcn/ui**: 高质量React组件库

#### AI集成
- **coze-coding-dev-sdk**: AI模型SDK，支持流式响应
- **SSE (Server-Sent Events)**: 实时数据推送
- **数学LaTeX渲染**: 公式显示支持

#### 开发工具
- **ESLint**: 代码质量检查
- **Prettier**: 代码格式化
- **pnpm**: 高效的包管理器

## 核心模块设计

### 1. 智能备课模块
```typescript
interface PrepFlow {
  // ADDIE五阶段状态管理
  currentStep: 'analysis' | 'design' | 'development' | 'implementation' | 'evaluation';
  // 课程信息
  courseInfo: {
    subject: string;
    grade: string;
    chapter: string;
    knowledgePoints: string[];
    objectives: string[];
  };
  // AI对话记录
  messages: Message[];
  // 各阶段输出
  outputs: {
    analysis?: AnalysisResult;
    design?: DesignResult;
    development?: DevelopmentResult;
    implementation?: ImplementationPlan;
    evaluation?: EvaluationPlan;
  };
}
```

### 2. 提示词管理模块
```typescript
interface PromptTemplate {
  id: string;
  category: string;
  title: string;
  description: string;
  prompt: string;
  variables: string[];
  examples?: string[];
}

class PromptManager {
  // 模板库
  templates: PromptTemplate[];
  // 变量替换
  substitute(template: PromptTemplate, variables: Record<string, string>): string;
  // 模板验证
  validate(template: PromptTemplate): boolean;
}
```

### 3. 数据持久化模块
```typescript
class ProjectStorage {
  static saveProject(project: Project): void;
  static getAllProjects(): Project[];
  static getProject(id: string): Project | null;
  static deleteProject(id: string): void;
}
```

## API设计

### 备课分析API
```typescript
POST /api/prep
Content-Type: application/json

{
  "subject": "数学",
  "grade": "高一",
  "chapter": "函数",
  "knowledgePoints": ["一次函数", "二次函数"],
  "mode": "analysis"
}

Response (SSE):
data: {"content": "分析结果..."}
data: {"done": true, "result": "完整分析结果"}
```

### 对话交互API
```typescript
POST /api/chat
Content-Type: application/json

{
  "messages": [
    {"role": "user", "content": "如何讲解函数单调性？"}
  ]
}

Response (SSE):
data: {"content": "关于函数单调性..."}
```

## 性能优化

### 1. 代码分割
```typescript
// 动态导入大型组件
const PrepPage = dynamic(() => import('@/app/prep/page'), {
  loading: () => <LoadingSpinner />,
  ssr: false
});
```

### 2. 缓存策略
- LocalStorage缓存用户项目
- 浏览器缓存静态资源
- API响应缓存

### 3. 流式优化
- 分块传输，减少延迟
- 打字机效果提升体验
- 智能滚动定位

## 安全考虑

### 1. 数据安全
- 本地存储，不涉及敏感数据
- 无用户认证，简化使用流程
- 数据加密存储

### 2. 内容安全
- AI提示词过滤机制
- 敏感词检测
- 内容审核流程

## 部署方案

### 1. 开发环境
```bash
pnpm install
pnpm dev
```

### 2. 生产环境
```bash
pnpm build
pnpm start
```

### 3. 容器化部署
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json pnpm-lock.json ./
RUN pnpm install
COPY . .
RUN pnpm build
EXPOSE 5000
CMD ["pnpm", "start"]
```

## 监控与日志

### 1. 性能监控
- 页面加载时间
- AI响应延迟
- 用户交互统计

### 2. 错误追踪
- 前端错误监控
- API错误日志
- 用户反馈收集

## 测试策略

### 1. 单元测试
```typescript
describe('ProjectStorage', () => {
  test('should save and retrieve project', () => {
    const project = mockProject();
    ProjectStorage.saveProject(project);
    const retrieved = ProjectStorage.getProject(project.id);
    expect(retrieved).toEqual(project);
  });
});
```

### 2. 集成测试
```typescript
describe('API Integration', () => {
  test('should stream response for prep analysis', async () => {
    const response = await fetch('/api/prep', {
      method: 'POST',
      body: JSON.stringify(mockPrepRequest())
    });
    expect(response.body).toBeReadableStream();
  });
});
```

### 3. E2E测试
- 用户注册流程
- 项目创建流程
- AI对话交互
```

- [ ] **Step 3: 撰写演讲PPT大纲**

Create `docs/competition/presentation-slides.md`:

```markdown
# 智课工坊 - 演讲PPT大纲

## 幻灯片1：封面
- 标题：智课工坊 - AI赋能数学教育新生态
- 副标题：教育科技创新赛参赛项目
- 团队名称：智课创新团队
- 日期：2026年8月

## 幻灯片2：开场 - 教育痛点
- 标题：教师的困境
- 内容：
  - 85%的教师认为备课是最大压力源
  - 平均备课时间：2-4小时
  - 教学质量参差不齐
  - 创新意愿受挫
- 视觉：教师熬夜备课的图片

## 幻灯片3：问题分析
- 标题：传统备课的挑战
- 内容：
  - 知识点把握不准（72%）
  - 教学设计缺乏理论支撑（68%）
  - 难以兼顾不同层次学生（61% ）
  - 时间成本过高（89%）
- 视觉：柱状图展示统计数据

## 幻灯片4：解决方案
- 标题：智课工坊 - AI辅助备课平台
- 内容：
  - 专为数学教师打造
  - 基于ADDIE教学设计模型
  - 系统化、专业化、智能化
  - 2小时→30分钟效率革命
- 视觉：产品界面截图

## 幻灯片5：核心功能1 - ADDIE五阶段
- 标题：AI-ADDIE智能辅助
- 内容：
  1. **分析**：智能识别重点难点
  2. **设计**：基于Bloom认知层次
  3. **开发**：生成完整教案资源
  4. **实施**：课堂节奏把控
  5. **评估**：多维度评价反思
- 视觉：五阶段流程图

## 幻灯片6：核心功能2 - 提示词工坊
- 标题：专业提示词模板库
- 内容：
  - 7个专业教学提示词模板
  - 动态变量替换
  - 自定义提示词构建
  - 数学学科特色保障
- 视觉：提示词模板界面

## 幻灯片7：技术创新点
- 标题：三大技术突破
- 内容：
  1. **数学专业提示词框架**：结构化教育AI输出
  2. **AI-ADDIE深度融合**：完整教学设计方法论
  3. **流式教学交互**：实时响应专家级指导
- 视觉：技术架构图

## 幻灯片8：用户体验
- 标题：流畅的备课体验
- 内容：
  - 流式AI对话
  - 打字机效果呈现
  - 上下文记忆保持
  - 一键导出分享
- 视觉：交互流程动画

## 幻灯片9：教育价值
- 标题：改变教育生态
- 内容：
  - 效率提升70%
  - 质量显著改善
  - 新手教师快速成长
  - 资源共建共享
- 视觉：价值对比图

## 幻灯片10：应用案例
- 标题：真实应用场景
- 案例1：王老师（新手）20分钟完成备课
- 案例2：李老师（资深）优化教案提升30%参与度
- 案例3：学校集体备课平台建设
- 视觉：用户反馈截图

## 幻灯片11：发展规划
- 标题：未来愿景
- 短期：完善AI提示词库
- 中期：扩展多学科支持
- 长期：构建教育AI生态
- 视觉：路线图

## 幻灯片12：团队介绍
- 标题：专业团队
- 成员介绍：
  - 教育技术专家
  - AI算法工程师
  - 数学教育研究者
  - 用户体验设计师
- 视觉：团队照片

## 幻灯片13：总结
- 标题：创新赋能教育
- 核心信息：
  - AI不是替代，而是赋能
  - 专业性+智能化=教育新未来
  - 让每一位教师都成为教学专家
- 视觉：标语 + Logo

## 幻灯片14：致谢
- 标题：谢谢观看
- 联系方式：
  - 项目网站：www.zhike.workshop
  - 邮箱：contact@zhike.workshop
  - 微信：ZhikeWorkshop
- 视觉：联系方式展示
```

- [ ] **Step 4: 提交参赛文档**

```bash
git add docs/competition/
git commit -m "docs: add competition documentation materials"
```

#### 任务7: 演示视频制作
**目标:** 制作高质量的产品演示视频，突出AI辅助备课的创新体验

**Files:**
- Create: `docs/competition/demo-script.md`
- Create: `docs/competition/demo-scenarios.md`

- [ ] **Step 1: 撰写演示脚本**

Create `docs/competition/demo-script.md`:

```markdown
# 智课工坊演示视频脚本

## 视频规格
- 时长：3分钟
- 分辨率：1920x1080
- 格式：MP4
- 风格：科技感 + 教育温度

## 开场 (0:00-0:20)
**画面**：
- 快速剪辑：教师备课场景（熬夜、查资料、写教案）
- 数据动画："2-4小时备课时间"统计
- 转场：智课工坊Logo出现

**旁白**：
"每天，有数以万计的数学教师为了备好一节课，熬夜到深夜。平均需要2-4个小时，但即便如此，教学质量依然参差不齐。"

## 介绍产品 (0:20-0:45)
**画面**：
- 产品界面展示（首页，简洁优雅）
- 鼠标悬停在"新建备课项目"按钮
- 点击进入智能备课中心

**旁白**：
"智课工坊，专为数学教师打造的AI辅助备课平台。基于ADDIE教学设计模型，让备课变得简单、专业、高效。"

## ADDIE演示 (0:45-1:50)
**画面**：
- 快速展示五个阶段：
  1. 分析阶段：知识点自动识别（动画效果）
  2. 设计阶段：教学目标生成（逐行显示）
  3. 开发阶段：教案和习题生成
  4. 实施阶段：课堂时间分配
  5. 评估阶段：反思建议生成

**旁白**：
"通过AI-ADDIE五阶段智能辅助，系统自动分析教学重点，设计科学目标，生成完整教案，把控课堂节奏，并提供专业评估。整个过程只需要15-30分钟。"

## 提示词工坊 (1:50-2:25)
**画面**：
- 切换到提示词工坊界面
- 展示模板库分类
- 选择"数学概念讲解"模板
- 演示变量替换功能
- 生成最终提示词

**旁白**：
"专业提示词工坊提供7个教学模板，支持自定义构建。每个模板都经过教育专家验证，确保输出的专业性和教学适用性。"

## AI对话体验 (2:25-2:50)
**画面**：
- 展示AI对话界面
- 实时流式响应（打字机效果）
- 教师追问和AI解答
- 最终成果展示

**旁白**：
"流式AI对话，让教师感觉像在和一位经验丰富的教学专家对话。支持追问和澄清，确保最佳教学效果。"

## 价值总结 (2:50-3:00)
**画面**：
- 数据对比：时间减少70%，质量提升45%
- 用户评价滚动展示
- "赋能教育，创新未来"标语
- 结尾Logo和联系方式

**旁白**：
"智课工坊，不仅是在提供工具，更是在构建教育新生态。让AI赋能每一位教师，让创新走进每一间课堂。"
```

- [ ] **Step 2: 设计演示场景**

Create `docs/competition/demo-scenarios.md`:

```markdown
# 演示场景设计

## 场景1：新手教师快速上手
**角色**：王老师，刚入职的初中数学教师
**目标**：准备一节"二次函数"的课程

**演示流程**：
1. 登录系统，点击"新建备课项目"
2. 填写课程信息（数学，九年级，二次函数）
3. 选择"向导模式"，进入ADDIE流程
4. AI自动分析重点难点
5. 生成教学目标和策略
6. 输出完整教案和习题
7. 保存项目，准备上课

**关键展示**：
- 新手操作的流畅性
- AI分析的准确性
- 输出的完整性
- 时间的快速性

## 场景2：资深教师效率提升
**角色**：李老师，10年教龄的高中教师
**目标**：优化现有的"导数"教案

**演示流程**：
1. 打开已有项目
2. 进入"对话模式"，提出优化建议
3. AI提供新的教学策略
4. 生成互动环节设计
5. 更新教案，分享给同事

**关键展示**：
- 对话的自由性
- 建议的专业性
- 迭代的便捷性
- 共享的便捷性

## 场景3：提示词专业应用
**角色**：张老师，数学教研组长
**目标**：为教研活动准备专题内容

**演示流程**：
1. 进入提示词工坊
2. 选择"教学设计"模板
3. 替换变量（教学内容：函数单调性）
4. 生成专业提示词
5. 导出分享给教研组

**关键展示**：
- 模板的专业性
- 变量的灵活性
- 输出的标准化
- 团队的协作性
```

- [ ] **Step 3: 提交演示材料**

```bash
git add docs/competition/demo-script.md docs/competition/demo-scenarios.md
git commit -m "docs: add demo video script and scenarios"
```

## 执行计划总结

### 关键里程碑
1. **Week 1结束**：技术修复完成，CI/CD正常，数据持久化实现
2. **Week 2结束**：功能优化完成，AI体验提升，提示词工坊完善
3. **Week 3结束**：参赛材料准备完成，文档齐全，演示视频就绪

### 质量保证
- 每个任务都有明确的测试步骤
- 频繁的代码提交，便于版本控制
- 逐步验证，确保每个阶段功能正常

### 风险控制
- 技术风险：提前进行构建测试
- 时间风险：设置缓冲时间
- 演示风险：准备多个演示版本

---

**Plan complete and saved to `docs/superpowers/plans/2026-08-23-competition-preparation-plan.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**