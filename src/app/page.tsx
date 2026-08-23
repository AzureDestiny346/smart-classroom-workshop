"use client";

import Link from "next/link";
import { 
  Sparkles, 
  BookOpen, 
  Lightbulb, 
  ArrowRight,
  Clock,
  FileText,
  Users,
  Target,
  Layers,
  Wand2
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const quickActions = [
  {
    title: "新建备课项目",
    description: "开始一节新课的智能备课",
    icon: Sparkles,
    href: "/prep",
    color: "from-indigo-500 to-purple-600",
  },
  {
    title: "使用提示词模板",
    description: "从预设模板快速生成",
    icon: Wand2,
    href: "/prompt",
    color: "from-purple-500 to-pink-600",
  },
  {
    title: "查看教学案例",
    description: "学习优秀教师的备课经验",
    icon: BookOpen,
    href: "/prompt#cases",
    color: "from-cyan-500 to-blue-600",
  },
  {
    title: "继续上次项目",
    description: "打开最近编辑的项目",
    icon: Clock,
    href: "/projects",
    color: "from-amber-500 to-orange-600",
  },
];

const features = [
  {
    title: "数学GAI提示词框架",
    description: "专为数学学科设计的提示词模板，覆盖知识点讲解、习题设计、学情分析等场景",
    icon: Lightbulb,
  },
  {
    title: "ADDIE教学设计流程",
    description: "遵循分析-设计-开发-实施-评估标准流程，帮助新手教师规范备课",
    icon: Layers,
  },
  {
    title: "智能教案生成",
    description: "基于AI自动生成完整教案，支持一键导出Word/PDF格式",
    icon: FileText,
  },
  {
    title: "个性化学习路径",
    description: "根据学生学情智能推荐教学内容和方法，实现精准教学",
    icon: Target,
  },
];

const recentProjects = [
  { title: "二次函数图像与性质", subject: "初三数学", updatedAt: "2小时前", status: "进行中" },
  { title: "三角函数诱导公式", subject: "高一数学", updatedAt: "昨天", status: "已完成" },
  { title: "立体几何初步", subject: "高二数学", updatedAt: "3天前", status: "已完成" },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-[var(--hero-gradient)] text-white">
        <div className="absolute inset-0 math-pattern opacity-20" />
        <div className="container mx-auto px-4 py-20 relative">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-sm mb-6">
              <Sparkles className="h-4 w-4" />
              AI赋能数学教学
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
              智课工坊
              <br />
              <span className="text-3xl md:text-4xl text-indigo-300">让备课更智能</span>
            </h1>
            <p className="text-lg text-slate-300 mb-8 max-w-xl">
              专为数学教师和师范生打造的一站式智能备课平台，深度融合数学学科特色与大模型能力，让AI成为您的备课助手。
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/prep">
                <Button size="lg" className="bg-white text-indigo-700 hover:bg-slate-100 gap-2">
                  <Sparkles className="h-4 w-4" />
                  开始智能备课
                </Button>
              </Link>
              <Link href="/prompt">
                <Button size="lg" variant="outline" className="text-white border-white/30 hover:bg-white/10 gap-2">
                  探索提示词模板
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
        
        {/* Decorative Elements */}
        <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl" />
        <div className="absolute -top-10 -left-10 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl" />
      </section>

      {/* Quick Actions */}
      <section className="container mx-auto px-4 -mt-10 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.href} href={action.href}>
                <Card className="card-hover cursor-pointer border-0 shadow-lg">
                  <CardHeader className="pb-2">
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center mb-3`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <CardTitle className="text-lg">{action.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{action.description}</CardDescription>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">为什么选择智课工坊？</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            我们不仅提供工具，更提供经过验证的方法论，帮助您从“会用AI”到“善用AI”
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title} className="card-hover">
                <CardHeader>
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center mb-4">
                    <Icon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Recent Projects */}
      <section className="container mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">最近项目</h2>
          <Link href="/projects">
            <Button variant="ghost" className="gap-2">
              查看全部
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {recentProjects.map((project) => (
            <Card key={project.title} className="card-hover cursor-pointer">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{project.title}</CardTitle>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    project.status === "进行中" 
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
                      : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                  }`}>
                    {project.status}
                  </span>
                </div>
                <CardDescription className="flex items-center gap-2">
                  <Users className="h-3 w-3" />
                  {project.subject}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {project.updatedAt}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-10">
        <Card className="bg-gradient-to-r from-indigo-600 to-purple-600 border-0 text-white">
          <CardContent className="py-12 text-center">
            <h2 className="text-2xl font-bold mb-4">准备好提升您的备课效率了吗？</h2>
            <p className="text-indigo-100 mb-6 max-w-xl mx-auto">
              加入智课工坊，让AI成为您的智能备课助手，轻松应对每一堂数学课
            </p>
            <Link href="/prep">
              <Button size="lg" className="bg-white text-indigo-700 hover:bg-slate-100 gap-2">
                立即开始
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 mt-10">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>智课工坊 - 智能数学备课云平台</p>
          <p className="mt-1">基于教育大模型的AI辅助教学工具</p>
        </div>
      </footer>
    </div>
  );
}
