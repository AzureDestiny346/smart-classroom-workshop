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
  RotateCcw,
  Download
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

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface KnowledgePoint {
  id: string;
  text: string;
  level: "core" | "important" | "normal";
}

interface AnalysisResult {
  knowledgePoints: KnowledgePoint[];
  teachingPoints: string[];
  difficulties: string[];
  misconceptions: string[];
}

// ADDIE Steps
const addieSteps = [
  { id: "analysis", label: "分析", icon: BookOpen, description: "Analysis" },
  { id: "design", label: "设计", icon: Target, description: "Design" },
  { id: "development", label: "开发", icon: Palette, description: "Development" },
  { id: "implementation", label: "实施", icon: Rocket, description: "Implementation" },
  { id: "evaluation", label: "评估", icon: CheckCircle2, description: "Evaluation" },
];

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
  const [currentStep, setCurrentStep] = useState("analysis");
  const [messages, setMessages] = useState<Message[]>([]);
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
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState("wizard");
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamContent]);

  // 切换步骤
  const goToStep = (stepId: string) => {
    setCurrentStep(stepId);
  };

  // 调用AI分析API
  const callAnalysisAPI = async (mode: string) => {
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
              if (data.done && data.result) {
                // 处理完成的JSON结果
                handleAnalysisResult(data.result, mode);
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

  // 处理分析结果
  const handleAnalysisResult = (result: Record<string, unknown>, mode: string) => {
    if (mode === 'analysis' && result.knowledgePoints) {
      setAnalysisResult({
        knowledgePoints: (result.knowledgePoints as KnowledgePoint[]) || [],
        teachingPoints: (result.teachingPoints as string[]) || [],
        difficulties: (result.difficulties as string[]) || [],
        misconceptions: (result.misconceptions as string[]) || [],
      });
    }
  };

  // 发送消息到AI
  const sendMessageToAI = async () => {
    if (!inputMessage.trim() || isLoading) return;
    
    const userMessage: Message = {
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

  // 获取当前步骤索引
  const currentStepIndex = addieSteps.findIndex(s => s.id === currentStep);
  const progress = ((currentStepIndex + 1) / addieSteps.length) * 100;

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
                      const isCompleted = index < currentStepIndex;
                      
                      return (
                        <button
                          key={step.id}
                          onClick={() => {
                            if (index <= currentStepIndex || (step.id === 'analysis' && courseInfo.chapter)) {
                              goToStep(step.id);
                              if (step.id !== 'analysis' || !analysisResult) {
                                // 延迟调用，避免阻塞
                              }
                            }
                          }}
                          className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left ${
                            isActive 
                              ? "bg-indigo-50 border border-indigo-200 dark:bg-indigo-950" 
                              : "hover:bg-slate-50 dark:hover:bg-slate-800"
                          } ${index > currentStepIndex && step.id !== 'analysis' ? "opacity-50" : ""}`}
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
                            <div className="text-xs text-muted-foreground">{step.description}</div>
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
                    ) : analysisResult ? (
                      <div className="space-y-6">
                        {/* 知识点图谱 */}
                        <div>
                          <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <Lightbulb className="h-4 w-4 text-amber-500" />
                            知识点分析
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {analysisResult.knowledgePoints.map((kp) => (
                              <Badge 
                                key={kp.id}
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
                            {analysisResult.teachingPoints.map((tp, i) => (
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
                            {analysisResult.difficulties.map((d, i) => (
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
                            {analysisResult.misconceptions.map((m, i) => (
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
                    ) : streamContent ? (
                      <div className="space-y-4">
                        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                          <div className="whitespace-pre-wrap text-sm prose prose-sm max-w-none">
                            {streamContent}
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
                        <p>请先完成分析阶段</p>
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
                    ) : streamContent ? (
                      <div className="space-y-4">
                        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                          <div className="whitespace-pre-wrap text-sm prose prose-sm max-w-none">
                            {streamContent}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={() => goToStep("implementation")} className="gap-2">
                            下一步：实施
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <Palette className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>请先完成前两步</p>
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
                    ) : (
                      <div className="space-y-6">
                        <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg">
                          <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-3">
                            课堂实施建议
                          </h3>
                          <ul className="space-y-2 text-blue-700 dark:text-blue-400">
                            <li>• 开场用3分钟快速回顾上节课内容</li>
                            <li>• 新课导入控制在5分钟内</li>
                            <li>• 每个知识点讲解后留2分钟消化时间</li>
                            <li>• 巡视时关注中等生和后进生的反应</li>
                            <li>• 课堂总结不少于5分钟</li>
                          </ul>
                        </div>

                        <div className="bg-green-50 dark:bg-green-950/30 p-4 rounded-lg">
                          <h3 className="font-semibold text-green-800 dark:text-green-300 mb-3">
                            师生互动点
                          </h3>
                          <ul className="space-y-2 text-green-700 dark:text-green-400">
                            <li>• 概念讲解后提问，引导学生思考</li>
                            <li>• 图像绘制后提问，观察学生发现</li>
                            <li>• 例题完成后提问，探索其他解法</li>
                          </ul>
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
                    ) : (
                      <div className="space-y-6">
                        <div>
                          <h3 className="font-semibold mb-3">评价方式</h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 border rounded-lg">
                              <div className="font-medium text-purple-600 mb-2">形成性评价</div>
                              <ul className="text-sm space-y-1 text-muted-foreground">
                                <li>• 课堂提问</li>
                                <li>• 小组讨论</li>
                                <li>• 即时练习</li>
                                <li>• 课堂观察</li>
                              </ul>
                            </div>
                            <div className="p-4 border rounded-lg">
                              <div className="font-medium text-green-600 mb-2">总结性评价</div>
                              <ul className="text-sm space-y-1 text-muted-foreground">
                                <li>• 课后作业</li>
                                <li>• 单元测试</li>
                                <li>• 实践任务</li>
                                <li>• 档案袋评价</li>
                              </ul>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h3 className="font-semibold mb-3">教学反思</h3>
                          <ul className="space-y-2">
                            <li className="flex items-start gap-2">
                              <span className="text-indigo-600 mt-1">?</span>
                              <span>学生是否理解了核心概念？</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-indigo-600 mt-1">?</span>
                              <span>教学节奏是否合适？</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-indigo-600 mt-1">?</span>
                              <span>哪些学生需要额外关注？</span>
                            </li>
                          </ul>
                        </div>

                        <div className="flex gap-2 flex-wrap">
                          <Button className="gap-2">
                            <Save className="h-4 w-4" />
                            保存教案
                          </Button>
                          <Button variant="outline" className="gap-2">
                            <Download className="h-4 w-4" />
                            导出Word
                          </Button>
                          <Button variant="outline" className="gap-2">
                            <RotateCcw className="h-4 w-4" />
                            重新开始
                          </Button>
                        </div>
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
