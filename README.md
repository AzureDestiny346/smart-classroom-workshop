# 智课工坊（Smart-Classroom-Workshop）

> 专为数学教师和师范生打造的 AI 辅助备课云平台——用 AI-ADDIE 五阶段流程，把一节课的备课变成一次教学设计方法论的实操训练。

## 功能特性

- **智能备课中心**：ADDIE 教学设计模型（分析-设计-开发-实施-评估）全流程 AI 辅助，SSE 流式打字机输出，阶段间成果自动传递
- **成果入库与续备**：阶段成果自动写回复课项目，支持 `/prep?project=<id>` 载入既有项目继续备课，项目卡 ADDIE 进度条由成果派生点亮
- **提示词工坊**：7 个预设数学教学提示词模板，变量占位符可视化填充
- **我的项目**：备课项目管理、收藏、副本（副本即版本）、导出 JSON 分享

## 快速开始

前置要求：Node.js 20+、pnpm 9（`corepack enable` 即可）。

```bash
# 安装依赖
pnpm install

# 启动开发服务器（端口 5000）
pnpm dev

# 运行测试（Vitest）
pnpm test
```

复制 `.env.example` 为 `.env.local` 并填写 LLM 配置（API Key、兼容端点、模型名），AI 对话与分析功能才可用。

## Docker 部署

仓库内置多阶段 `Dockerfile`（node:20-alpine，runner 仅装生产依赖，镜像约 824MB）：

```bash
docker build -t zhike-workshop .
docker run -d --name zhike-app -p 5000:5000 --env-file .env.local zhike-workshop
```

更多部署方式（Vercel / 传统服务器 / PM2）见 [DEPLOY.md](./DEPLOY.md)。

## 技术栈

- **框架**：Next.js 16（App Router）· React 19 · TypeScript 5
- **UI**：shadcn/ui · Tailwind CSS 4
- **AI**：coze-coding-dev-sdk（LLMClient，OpenAI 兼容端点）
- **测试**：Vitest
- **持久化**：localStorage 优先（接口抽象保留云端升级路径，见 ADR-0001）

## 项目结构

```
├── src/
│   ├── app/                  # 页面与 API 路由
│   │   ├── prep/             #   智能备课中心（支持 ?project= 续备）
│   │   ├── projects/         #   我的项目
│   │   ├── prompt/           #   提示词工坊
│   │   └── api/              #   chat / prep 流式接口
│   ├── components/           # navbar 与 shadcn/ui 组件
│   └── lib/
│       ├── prep-stages.ts    # AI-ADDIE 阶段契约（唯一阶段定义点）
│       ├── storage.ts        # 备课项目持久化（schema v2）
│       └── *.test.ts         # Vitest 契约测试
├── docs/
│   ├── adr/                  # 架构决策记录（ADR-0001~0004）
│   ├── superpowers/          # 设计文档与执行计划
│   └── PRODUCT.md / SPEC.md  # 产品与设计规范
├── scripts/                  # build / dev / start / deploy 脚本
├── Dockerfile                # 多阶段生产镜像
├── CONTEXT.md                # 领域术语表（单一事实来源）
├── AGENTS.md                 # agent 协作规范
└── DEPLOY.md                 # 部署指南
```

## 文档索引

| 文档 | 内容 |
|------|------|
| [CONTEXT.md](./CONTEXT.md) | 领域术语表（备课项目、阶段成果、续备……） |
| [docs/adr/](./docs/adr/) | 架构决策记录（持久化选型、提示词框架、阶段契约、成果入库） |
| [DEPLOY.md](./DEPLOY.md) | 部署指南（Vercel / Docker / 服务器 / PM2）与环境变量说明 |
| [docs/PRODUCT.md](./docs/PRODUCT.md) | 产品定位与用户叙事 |
| [AGENTS.md](./AGENTS.md) | AI agent 协作规范 |

## License

MIT
