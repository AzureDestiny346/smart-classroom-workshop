"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { 
  FolderKanban, 
  Plus,
  Search,
  MoreHorizontal,
  Clock,
  FileText,
  Trash2,
  Copy,
  Download,
  Star,
  Sparkles
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteProject,
  duplicateProject,
  exportProject,
  formatDateTime,
  getAllProjects,
  saveProject,
  toggleFavorite,
  type PrepProject,
} from "@/lib/storage";

// 学科分类
const subjects = [
  { value: "math-g7", label: "七年级数学" },
  { value: "math-g8", label: "八年级数学" },
  { value: "math-g9", label: "九年级数学" },
  { value: "math-g10", label: "高一数学" },
  { value: "math-g11", label: "高二数学" },
  { value: "math-g12", label: "高三数学" },
];

/** 学科下拉值 → 展示名 */
const subjectLabel = (value: string) =>
  subjects.find((s) => s.value === value)?.label ?? value;

export default function ProjectsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [projects, setProjects] = useState<PrepProject[]>([]);
  // 待确认删除的项目（null = 确认对话框关闭）
  const [deleteTarget, setDeleteTarget] = useState<PrepProject | null>(null);

  // 客户端挂载后从 localStorage 加载，避免 SSR 阶段访问浏览器 API
  useEffect(() => {
    setProjects(getAllProjects());
  }, []);

  const refresh = () => setProjects(getAllProjects());
  
  // 新建项目表单
  const [newProject, setNewProject] = useState({
    title: "",
    subject: "",
    chapter: "",
    description: "",
  });

  // 创建项目并跳转备课中心
  const handleCreateProject = () => {
    if (!newProject.title.trim()) {
      toast.error("请填写项目名称");
      return;
    }
    if (!newProject.subject) {
      toast.error("请选择学科和年级");
      return;
    }
    if (!newProject.chapter.trim()) {
      toast.error("请填写章节/主题");
      return;
    }
    const saved = saveProject({
      title: newProject.title.trim(),
      subject: subjectLabel(newProject.subject),
      chapter: newProject.chapter.trim(),
      description: newProject.description.trim(),
      status: "进行中",
      steps: [],
      favorite: false,
    });
    if (!saved) {
      toast.error("项目保存失败：本地存储不可用或已满");
      return;
    }
    toast.success("项目创建成功，开始智能备课！");
    setShowNewDialog(false);
    setNewProject({ title: "", subject: "", chapter: "", description: "" });
    // 携带项目 id，备课中心阶段二接线后即可回读课程信息
    router.push(`/prep?project=${saved.id}`);
  };

  const handleToggleFavorite = (id: string) => {
    const favored = toggleFavorite(id);
    refresh();
    if (favored === null) {
      toast.error("操作失败：项目不存在或本地存储不可用");
    } else {
      toast.success(favored ? "已收藏" : "已取消收藏");
    }
  };

  const handleDuplicate = (id: string) => {
    const copy = duplicateProject(id);
    if (copy) {
      refresh();
      toast.success("项目已复制");
    } else {
      toast.error("复制失败");
    }
  };

  // 确认后真正执行删除
  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    if (deleteProject(deleteTarget.id)) {
      refresh();
      toast.success("项目已删除");
    } else {
      toast.error("删除失败：本地存储不可用");
    }
    setDeleteTarget(null);
  };

  // 导出为 JSON 文件下载
  const handleExport = (project: PrepProject) => {
    const blob = new Blob([exportProject(project)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    // 清洗 Windows 文件名非法字符，避免下载名异常
    const safeName = project.title.replace(/[\\/:*?"<>|]/g, "_");
    link.download = `${safeName}.json`;
    link.click();
    // Safari 下同步 revoke 会截断下载，延迟到下一轮事件循环
    setTimeout(() => URL.revokeObjectURL(url), 0);
    toast.success("项目已导出");
  };

  // 过滤项目
  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.title.includes(searchQuery) || project.subject.includes(searchQuery);
    const matchesStatus = filterStatus === "all" || project.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // 获取收藏项目
  const favoriteProjects = projects.filter(p => p.favorite);

  // 最近编辑：按更新时间倒序取前 6
  const recentProjects = [...projects]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 6);

  // 格式化时间
  const formatTime = (time: string) => {
    const date = new Date(time);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) return "刚刚";
    if (hours < 24) return `${hours}小时前`;
    if (hours < 48) return "昨天";
    return formatDateTime(time);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        {/* 页面标题 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
              <FolderKanban className="h-7 w-7 text-indigo-600" />
              我的项目
            </h1>
            <p className="text-muted-foreground">
              管理您的备课项目，支持版本历史和导出分享
            </p>
          </div>
          <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                新建项目
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>创建新备课项目</DialogTitle>
                <DialogDescription>
                  填写基本信息开始智能备课之旅
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">项目名称</label>
                  <Input 
                    placeholder="例如：二次函数图像与性质"
                    value={newProject.title}
                    onChange={(e) => setNewProject({...newProject, title: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">学科年级</label>
                  <Select 
                    value={newProject.subject}
                    onValueChange={(v) => setNewProject({...newProject, subject: v})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择学科和年级" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">章节/主题</label>
                  <Input 
                    placeholder="例如：二次函数"
                    value={newProject.chapter}
                    onChange={(e) => setNewProject({...newProject, chapter: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">项目描述（可选）</label>
                  <Textarea 
                    placeholder="简要描述本节课的教学重点..."
                    rows={3}
                    value={newProject.description}
                    onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                  />
                </div>
                <Button 
                  className="w-full gap-2"
                  onClick={handleCreateProject}
                >
                  <Sparkles className="h-4 w-4" />
                  开始智能备课
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* 搜索和筛选 */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索项目..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="筛选状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部项目</SelectItem>
              <SelectItem value="进行中">进行中</SelectItem>
              <SelectItem value="已完成">已完成</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="all">
          <TabsList className="mb-6">
            <TabsTrigger value="all">全部项目</TabsTrigger>
            <TabsTrigger value="favorite">收藏</TabsTrigger>
            <TabsTrigger value="recent">最近编辑</TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            {filteredProjects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProjects.map(project => (
                  <Card key={project.id} className="card-hover cursor-pointer group">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg mb-1 flex items-center gap-2">
                            {project.favorite && <Star className="h-4 w-4 text-amber-500 fill-amber-500" />}
                            {project.title}
                          </CardTitle>
                          <CardDescription>{project.subject} · {project.chapter}</CardDescription>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/prep?project=${project.id}`)}>
                              <FileText className="h-4 w-4 mr-2" />
                              打开
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleFavorite(project.id)}>
                              <Star className="h-4 w-4 mr-2" />
                              {project.favorite ? "取消收藏" : "收藏"}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicate(project.id)}>
                              <Copy className="h-4 w-4 mr-2" />
                              复制项目
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleExport(project)}>
                              <Download className="h-4 w-4 mr-2" />
                              导出
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(project)}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              删除
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <Badge 
                          variant={project.status === "进行中" ? "default" : "secondary"}
                          className={project.status === "进行中" ? "bg-amber-500" : ""}
                        >
                          {project.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(project.updatedAt)}
                        </span>
                      </div>
                      
                      {/* ADDIE进度 */}
                      <div className="mt-4">
                        <div className="flex gap-1">
                          {(["analysis", "design", "development", "implementation", "evaluation"] as const).map((step) => (
                            <div
                              key={step}
                              className={`h-1.5 flex-1 rounded-full ${
                                project.steps.includes(step) 
                                  ? "bg-indigo-500" 
                                  : "bg-slate-200 dark:bg-slate-700"
                              }`}
                            />
                          ))}
                        </div>
                        <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                          <span>A</span>
                          <span>D</span>
                          <span>D</span>
                          <span>I</span>
                          <span>E</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <FolderKanban className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>没有找到匹配的项目</p>
                <Button variant="link" onClick={() => setShowNewDialog(true)}>
                  创建新项目
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="favorite">
            {favoriteProjects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {favoriteProjects.map(project => (
                  <Card key={project.id} className="card-hover cursor-pointer">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg mb-1 flex items-center gap-2">
                        <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                        {project.title}
                      </CardTitle>
                      <CardDescription>{project.subject} · {project.chapter}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary">{project.status}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatTime(project.updatedAt)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Star className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>暂无收藏项目</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="recent">
            {recentProjects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentProjects
                .map(project => (
                  <Card key={project.id} className="card-hover cursor-pointer">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg mb-1">{project.title}</CardTitle>
                      <CardDescription>{project.subject} · {project.chapter}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <Badge variant={project.status === "进行中" ? "default" : "secondary"}>
                          {project.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(project.updatedAt)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>暂无项目记录，先创建一个备课项目吧</p>
                <Button variant="link" onClick={() => setShowNewDialog(true)}>
                  创建新项目
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* 删除确认对话框：本地数据无回收站，误删不可恢复 */}
        <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>删除项目</DialogTitle>
              <DialogDescription>
                确定要删除“{deleteTarget?.title}”吗？本地保存的该项目数据将无法恢复。
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                取消
              </Button>
              <Button variant="destructive" onClick={handleConfirmDelete}>
                确认删除
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
