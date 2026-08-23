"use client";

import { useState, useRef, useEffect } from "react";
import { 
  BookOpen, 
  Target, 
  Palette, 
  Rocket, 
  CheckCircle2,
  Send,
  Sparkles,
  ChevronRight,
  Lightbulb,
  FileText,
  MessageSquare,
  Loader2,
  Save,
  RotateCcw
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  ADDIE_STAGES,
  parseAnalysisSummary,
  stripJsonBlock,
  type AnalysisSummary,
  type PrepStage,
  type StageOutputs,
} from "@/lib/prep-stages";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

// 阶段图标映射（视图层关注点，与 lib 的阶段元数据解耦）
const STAGE_ICONS: Record<PrepStage, typeof BookOpen> = {
  analysis: BookOpen,
  design: Target,
  development: Palette,
  implementation: Rocket,
  evaluation: CheckCircle2,
};

// 从契约模块派生步骤列表（阶段定义唯一点）
const addieSteps = ADDIE_STAGES.map((s) => ({
  ...s,
  icon: STAGE_ICONS[s.id],
}));

// 数学学科分类
const mathCategories = [
  { value: "代数", label: "代数" },
  { value: "几何", label: "几何" },
  { value: "微积分", label: "微积分" },
  { value: "统计与概率", label: "统计与概率" },
  { value: "函数", label: "函数" },
  { value: "三角函数", label: "三角函数" },
];

// 年级选项
const grades = [
  { value: "七年级", label: "七年级" },
  { value: "八年级", label: "八年级" },
  { value: "九年级", label: "九年级" },
  { value: "高一", label: "高一" },
  { value: "高二", label: "高二" },
  { value: "高三", label: "高三" },
];

export default function PrepPage() {
  // 状态管理
  const [currentStep, setCurrentStep] = useState<PrepStage>("analysis");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamContent, setStreamContent] = useState("");
  const [courseInfo, setCourseInfo] = useState({
    subject: "代数",
    grade: "九年级",
    chapter: "",
    knowledgePoints: "",
    objectives: "",
  });
  // 各阶段成果（阶段间信息传递的载体，随请求回传服务端）
  const [stageOutputs, setStageOutputs] = useState<StageOutputs>({});
  const [activeTab, setActiveTab] = useState("wizard");
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamContent]);

  // 切换步骤
  const goToStep = (stepId: PrepStage) => {
    setCurrentStep(stepId);
  };

  // 调用AI分析API（携带已完成阶段成果，实现阶段间信息传递）
  const callAnalysisAPI = async (mode: PrepStage) => {
    setIsLoading(true);
    setStreamContent("");

    try {
      const response = await fetch('/api/prep', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: courseInfo.subject,
          grade: courseInfo.grade,
          chapter: courseInfo.chapter,
          knowledgePoints: courseInfo.knowledgePoints.split(/[，,、]/).filter(Boolean),
          mode: mode,
          priorOutputs: stageOutputs,
        }),
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                setStreamContent(prev => prev + data.content);
              }
              if (data.done && typeof data.result === 'string') {
                // 阶段成果落位：raw 完整保存，structured 由服务端提取（可能缺席）
                const output = {
                  raw: data.result as string,
                  structured: (data.structured ?? undefined) as Record<string, unknown> | undefined,
                };
                setStageOutputs(prev => ({ ...prev, [mode]: output }));
              }
            } catch {
              // 忽略解析错误
            }
          }
        }
      }
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('分析失败，请重试');
    } finally {
      setIsLoading(false);
      setStreamContent("");
    }
  };

  // 发送消息到AI
  const sendMessageToAI = async () => {
    if (!inputMessage.trim() || isLoading) return;
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: inputMessage,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    const userInput = inputMessage;
    setInputMessage("");
    setIsLoading(true);
    setStreamContent("");

    // 添加上下文信息
    const contextInfo = courseInfo.chapter 
      ? `当前备课内容：${courseInfo.subject} - ${courseInfo.grade} - ${courseInfo.chapter}`
      : '';

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            ...messages.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: contextInfo ? `${contextInfo}\n\n${userInput}` : userInput }
          ],
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let fullContent = '';
      const assistantMessageId = (Date.now() + 1).toString();

      // 先添加一条空的助手消息
      setMessages(prev => [...prev, {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
      }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                fullContent += data.content;
                // 更新最后一条消息
                setMessages(prev => prev.map((m, i) => 
                  i === prev.length - 1 
                    ? { ...m, content: fullContent }
                    : m
                ));
              }
            } catch {
              // 忽略解析错误
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      toast.error('发送失败，请重试');
      // 移除失败的消息
      setMessages(prev => prev.filter(m => m.id !== userMessage.id));
    } finally {
      setIsLoading(false);
      setStreamContent("");
    }
  };

  // 获取当前步骤索引（以是否已有阶段成果判定完成度——真实进度）
  const currentStepIndex = addieSteps.findIndex(s => s.id === currentStep);
  const progress = ((currentStepIndex + 1) / addieSteps.length) * 100;
  const completedCount = addieSteps.filter(s => stageOutputs[s.id]).length;

  // 各阶段渲染数据
  const analysisSummary: AnalysisSummary | null = parseAnalysisSummary(
    stageOutputs.analysis?.structured
  );
  const analysisRaw = stageOutputs.analysis ? stripJsonBlock(stageOutputs.analysis.raw) : "";

  // 保存教案：将五阶段成果拼接下载为 Markdown
  const handleSaveLessonPlan = () => {
    const parts = addieSteps
      .filter(s => stageOutputs[s.id])
      .map(s => `# ${s.label}阶段（${s.en}）\n\n${stripJsonBlock(stageOutputs[s.id]!.raw)}`);
    if (parts.length === 0) {
      toast.error("还没有任何阶段成果，请先完成备课流程");
      return;
    }
    const md = `# ${courseInfo.chapter || "备课教案"}（${courseInfo.grade}${courseInfo.subject}）\n\n${parts.join("\n\n---\n\n")}`;
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeName = (courseInfo.chapter || "教案").replace(/[\\/:*?"<>|]/g, "_");
    link.href = url;
    link.download = `${safeName}.md`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    toast.success("教案已保存为 Markdown 文件");
  };

  // 重新开始：清空五阶段成果
  const handleRestart = () => {
    setStageOutputs({});
    setCurrentStep("analysis");
    setStreamContent("");
    toast.success("已重置，可重新开始备课");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Sparkles className="h-7 w-7 text-indigo-600" />
            智能备课中心
          </h1>
          <p className="text-muted-foreground">
            基于ADDIE模型，遵循标准教学设计流程，AI全程辅助您的备课工作
          </p>
        </div>

        {/* 功能切换 */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList>
            <TabsTrigger value="wizard">向导模式</TabsTrigger>
            <TabsTrigger value="chat">对话模式</TabsTrigger>
          </TabsList>
        </Tabs>

        {activeTab === "wizard" ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* 左侧：课程信息 + 流程 */}
            <div className="lg:col-span-1 space-y-6">
              {/* 课程信息卡片 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">课程信息</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">学科分类</label>
                    <select 
                      className="w-full h-10 px-3 rounded-md border border-input bg-background"
                      value={courseInfo.subject}
                      onChange={(e) => setCourseInfo({...courseInfo, subject: e.target.value})}
                    >
                      {mathCategories.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">年级</label>
                    <select 
                      className="w-full h-10 px-3 rounded-md border border-input bg-background"
                      value={courseInfo.grade}
                      onChange={(e) => setCourseInfo({...courseInfo, grade: e.target.value})}
                    >
                      {grades.map(grade => (
                        <option key={grade.value} value={grade.value}>{grade.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">章节/主题</label>
                    <Input 
                      placeholder="如：二次函数"
                      value={courseInfo.chapter}
                      onChange={(e) => setCourseInfo({...courseInfo, chapter: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">核心知识点</label>
                    <Textarea 
                      placeholder="输入本节课的关键知识点，用逗号分隔"
                      rows={3}
                      value={courseInfo.knowledgePoints}
                      onChange={(e) => setCourseInfo({...courseInfo, knowledgePoints: e.target.value})}
                    />
                  </div>
                  <Button 
                    className="w-full gap-2" 
                    onClick={() => {
                      if (!courseInfo.chapter || !courseInfo.knowledgePoints) {
                        toast.error('请填写章节和知识点');
                        return;
                      }
                      goToStep('analysis');
                      callAnalysisAPI('analysis');
                    }}
                    disabled={!courseInfo.chapter || !courseInfo.knowledgePoints || isLoading}
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    开始AI分析
                  </Button>
                </CardContent>
              </Card>

              {/* ADDIE流程 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">ADDIE教学设计流程</CardTitle>
                  <CardDescription>点击步骤查看详情</CardDescription>
                </CardHeader>
                <CardContent>
                  <Progress value={progress} className="mb-4" />
                  <div className="space-y-2">
                    {addieSteps.map((step, index) => {
                      const Icon = step.icon;
                      const isActive = currentStep === step.id;
                      const isCompleted = !!stageOutputs[step.id];

                      return (
                        <button
                          key={step.id}
                          onClick={() => {
                            if (index <= completedCount || step.id === 'analysis') {
                              goToStep(step.id);
                            }
                          }}
                          className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left ${
                            isActive 
                              ? "bg-indigo-50 border border-indigo-200 dark:bg-indigo-950" 
                              : "hover:bg-slate-50 dark:hover:bg-slate-800"
                          } ${index > completedCount && step.id !== 'analysis' ? "opacity-50" : ""}`}
                        >
                          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                            isCompleted 
                              ? "bg-green-500 text-white"
                              : isActive 
                                ? "bg-indigo-500 text-white"
                                : "bg-slate-200 dark:bg-slate-700"
                          }`}>
                            {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                          </div>
                          <div>
                            <div className={`font-medium ${isActive ? "text-indigo-700 dark:text-indigo-300" : ""}`}>
                              {step.label}
                            </div>
                            <div className="text-xs text-muted-foreground">{step.en}</div>
                          </div>
                          {isActive && <ChevronRight className="ml-auto h-4 w-4 text-indigo-500" />}
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 右侧：内容展示 */}
            <div className="lg:col-span-3">
              {currentStep === "analysis" && (
                <Card className="h-full">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-indigo-600" />
                      <CardTitle>分析阶段 (Analysis)</CardTitle>
                    </div>
                    <CardDescription>
                      AI自动分析教学内容，识别关键知识点、重难点和常见错误
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-indigo-600 mb-4">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>AI正在分析...</span>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg min-h-[200px]">
                          <div className="whitespace-pre-wrap text-sm">
                            {streamContent}
                            <span className="inline-block w-2 h-4 bg-indigo-600 animate-pulse ml-1" />
                          </div>
                        </div>
                      </div>
                    ) : analysisSummary ? (
                      <div className="space-y-6">
                        {/* 知识点图谱 */}
                        <div>
                          <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <Lightbulb className="h-4 w-4 text-amber-500" />
                            知识点分析
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {analysisSummary.knowledgePoints.map((kp, i) => (
                              <Badge
                                key={i}
                                variant={kp.level === "core" ? "default" : "secondary"}
                                className={`${
                                  kp.level === "core"
                                    ? "bg-indigo-600"
                                    : kp.level === "important"
                                      ? "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
                                      : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                }`}
                              >
                                {kp.text}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {/* 教学要点 */}
                        <div>
                          <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <Target className="h-4 w-4 text-green-500" />
                            教学要点
                          </h3>
                          <ul className="space-y-2">
                            {analysisSummary.teachingPoints.map((tp, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="text-indigo-600 mt-1">•</span>
                                <span>{tp}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* 教学难点 */}
                        <div>
                          <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <FileText className="h-4 w-4 text-orange-500" />
                            教学难点
                          </h3>
                          <ul className="space-y-2">
                            {analysisSummary.difficulties.map((d, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="text-orange-600 mt-1">•</span>
                                <span>{d}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* 常见错误 */}
                        <div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-lg">
                          <h3 className="font-semibold mb-3 text-amber-700 dark:text-amber-400">
                            学生常见误解
                          </h3>
                          <ul className="space-y-2 text-amber-800 dark:text-amber-300">
                            {analysisSummary.misconceptions.map((m, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span>!</span>
                                <span>{m}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            onClick={() => {
                              goToStep("design");
                              callAnalysisAPI('design');
                            }}
                            className="gap-2"
                          >
                            下一步：设计
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : analysisRaw ? (
                      <div className="space-y-4">
                        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                          <div className="whitespace-pre-wrap text-sm prose prose-sm max-w-none">
                            {analysisRaw}
                          </div>
                        </div>
                        <Button
                          onClick={() => {
                            goToStep("design");
                            callAnalysisAPI('design');
                          }}
                          className="gap-2"
                        >
                          下一步：设计
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>填写左侧课程信息后，点击「开始AI分析」</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {currentStep === "design" && (
                <Card className="h-full">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-purple-600" />
                      <CardTitle>设计阶段 (Design)</CardTitle>
                    </div>
                    <CardDescription>
                      设计教学目标、教学策略和评估方案
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-indigo-600 mb-4">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>AI正在设计...</span>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg min-h-[200px]">
                          <div className="whitespace-pre-wrap text-sm">
                            {streamContent}
                            <span className="inline-block w-2 h-4 bg-indigo-600 animate-pulse ml-1" />
                          </div>
                        </div>
                      </div>
                    ) : stageOutputs.design ? (
                      <div className="space-y-4">
                        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                          <div className="whitespace-pre-wrap text-sm prose prose-sm max-w-none">
                            {stripJsonBlock(stageOutputs.design.raw)}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => {
                              goToStep("development");
                              callAnalysisAPI('development');
                            }}
                            className="gap-2"
                          >
                            下一步：开发
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="mb-4">基于分析成果生成教学设计</p>
                        <Button
                          className="gap-2"
                          onClick={() => callAnalysisAPI('design')}
                          disabled={isLoading || !courseInfo.chapter}
                        >
                          <Sparkles className="h-4 w-4" />
                          生成设计方案
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {currentStep === "development" && (
                <Card className="h-full">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Palette className="h-5 w-5 text-pink-600" />
                      <CardTitle>开发阶段 (Development)</CardTitle>
                    </div>
                    <CardDescription>
                      生成教案、课件大纲和配套习题
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-indigo-600 mb-4">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>AI正在生成教案...</span>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg min-h-[200px]">
                          <div className="whitespace-pre-wrap text-sm">
                            {streamContent}
                            <span className="inline-block w-2 h-4 bg-indigo-600 animate-pulse ml-1" />
                          </div>
                        </div>
                      </div>
                    ) : stageOutputs.development ? (
                      <div className="space-y-4">
                        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                          <div className="whitespace-pre-wrap text-sm prose prose-sm max-w-none">
                            {stripJsonBlock(stageOutputs.development.raw)}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={() => { goToStep("implementation"); }} className="gap-2">
                            下一步：实施
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <Palette className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="mb-4">基于设计方案生成教案与习题</p>
                        <Button
                          className="gap-2"
                          onClick={() => callAnalysisAPI('development')}
                          disabled={isLoading || !courseInfo.chapter}
                        >
                          <Sparkles className="h-4 w-4" />
                          生成教学资源
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {currentStep === "implementation" && (
                <Card className="h-full">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Rocket className="h-5 w-5 text-orange-600" />
                      <CardTitle>实施阶段 (Implementation)</CardTitle>
                    </div>
                    <CardDescription>
                      课堂实施建议和师生互动点提示
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-indigo-600 mb-4">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>AI正在生成建议...</span>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg min-h-[200px]">
                          <div className="whitespace-pre-wrap text-sm">
                            {streamContent}
                            <span className="inline-block w-2 h-4 bg-indigo-600 animate-pulse ml-1" />
                          </div>
                        </div>
                      </div>
                    ) : stageOutputs.implementation ? (
                      <div className="space-y-4">
                        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                          <div className="whitespace-pre-wrap text-sm prose prose-sm max-w-none">
                            {stripJsonBlock(stageOutputs.implementation.raw)}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => {
                              goToStep("evaluation");
                              callAnalysisAPI('evaluation');
                            }}
                            className="gap-2"
                          >
                            下一步：评估
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <Rocket className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="mb-4">基于教案生成课堂实施建议</p>
                        <Button
                          className="gap-2"
                          onClick={() => callAnalysisAPI('implementation')}
                          disabled={isLoading || !courseInfo.chapter}
                        >
                          <Sparkles className="h-4 w-4" />
                          生成实施建议
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {currentStep === "evaluation" && (
                <Card className="h-full">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <CardTitle>评估阶段 (Evaluation)</CardTitle>
                    </div>
                    <CardDescription>
                      形成性评价与总结性评价建议
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-indigo-600 mb-4">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>AI正在生成评估方案...</span>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg min-h-[200px]">
                          <div className="whitespace-pre-wrap text-sm">
                            {streamContent}
                            <span className="inline-block w-2 h-4 bg-indigo-600 animate-pulse ml-1" />
                          </div>
                        </div>
                      </div>
                    ) : stageOutputs.evaluation ? (
                      <div className="space-y-4">
                        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                          <div className="whitespace-pre-wrap text-sm prose prose-sm max-w-none">
                            {stripJsonBlock(stageOutputs.evaluation.raw)}
                          </div>
                        </div>

                        <div className="flex gap-2 flex-wrap">
                          <Button className="gap-2" onClick={handleSaveLessonPlan}>
                            <Save className="h-4 w-4" />
                            保存教案（Markdown）
                          </Button>
                          <Button variant="outline" className="gap-2" onClick={handleRestart}>
                            <RotateCcw className="h-4 w-4" />
                            重新开始
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="mb-4">生成评估方案与教学反思建议</p>
                        <Button
                          className="gap-2"
                          onClick={() => callAnalysisAPI('evaluation')}
                          disabled={isLoading || !courseInfo.chapter}
                        >
                          <Sparkles className="h-4 w-4" />
                          生成评估方案
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        ) : (
          /* 对话模式 */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="h-[600px] flex flex-col">
                <CardHeader className="flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-indigo-600" />
                    <CardTitle>AI备课助手</CardTitle>
                  </div>
                  <CardDescription>
                    基于数学GAI提示词框架，随时解答您的备课问题
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col overflow-hidden">
                  {/* 消息列表 */}
                  <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                    {messages.length === 0 && (
                      <div className="text-center py-12 text-muted-foreground">
                        <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>开始与AI助手对话吧！</p>
                        <p className="text-sm mt-2">
                          可以问：“帮我设计这节课的导入环节”
                        </p>
                      </div>
                    )}
                    {messages.map((msg) => (
                      <div 
                        key={msg.id}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div 
                          className={`max-w-[80%] p-4 rounded-2xl ${
                            msg.role === "user"
                              ? "bg-indigo-600 text-white rounded-br-md"
                              : "bg-slate-100 dark:bg-slate-800 rounded-bl-md"
                          }`}
                        >
                          <div className="text-sm whitespace-pre-wrap prose prose-sm max-w-none">
                            {msg.content}
                          </div>
                        </div>
                      </div>
                    ))}
                    {isLoading && streamContent && (
                      <div className="flex justify-start">
                        <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl rounded-bl-md">
                          <div className="text-sm whitespace-pre-wrap">
                            {streamContent}
                            <span className="inline-block w-2 h-4 bg-indigo-600 animate-pulse ml-1" />
                          </div>
                        </div>
                      </div>
                    )}
                    {isLoading && !streamContent && (
                      <div className="flex justify-start">
                        <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl rounded-bl-md">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>AI正在思考...</span>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                  
                  {/* 输入框 */}
                  <div className="flex gap-2 flex-shrink-0">
                    <Input
                      placeholder="输入您的问题..."
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendMessageToAI()}
                      disabled={isLoading}
                    />
                    <Button onClick={sendMessageToAI} disabled={!inputMessage.trim() || isLoading}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 右侧：快捷提示 */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">快捷问题</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[
                    "帮我设计导入环节",
                    "这节课的重难点是什么？",
                    "生成配套练习题",
                    "如何处理学生的常见错误？",
                    "给出教学反思建议",
                  ].map((q, i) => (
                    <button
                      key={i}
                      onClick={() => setInputMessage(q)}
                      className="w-full text-left p-3 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm"
                    >
                      {q}
                    </button>
                  ))}
                </CardContent>
              </Card>

              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-lg">数学GAI提示词技巧</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p>1. 明确指定知识点，如“一元二次方程的求根公式”</p>
                  <p>2. 说明学生年级，便于AI调整难度</p>
                  <p>3. 询问具体环节，如“课堂导入”而非泛泛的“教学方法”</p>
                  <p>4. 可以要求AI给出多个方案选择</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
