/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import {
  ListTodo,
  Bell,
  Clock,
  Plus,
  CheckCircle2,
  BrainCircuit,
  Trash2,
  Flame,
  Check,
} from "lucide-react";
import confetti from "canvas-confetti";
import { HomeworkItem, StudyAlarm, EbbinghausTask, EbbinghausNode } from "../../types";
import { speechService } from "../../utils/speech";

interface HomeworkModuleProps {
  homeworkList: HomeworkItem[];
  alarms: StudyAlarm[];
  ebbinghausTasks: EbbinghausTask[];
  onAddHomework: (item: Partial<HomeworkItem>) => void;
  onToggleHomework: (id: string) => void;
  onDeleteHomework: (id: string) => void;
  onAddAlarm: (alarm: Partial<StudyAlarm>) => void;
  onToggleAlarm: (id: string) => void;
  onDeleteAlarm: (id: string) => void;
  onAddEbbinghausTask: (task: Partial<EbbinghausTask>) => void;
  onCompleteEbbinghausNode: (
    taskId: string,
    nodeIndex: number,
    mastery: "mastered" | "vague" | "unmastered"
  ) => void;
  onTriggerAlarmTest?: (alarm: StudyAlarm) => void;
}

export const HomeworkModule: React.FC<HomeworkModuleProps> = ({
  homeworkList,
  alarms,
  ebbinghausTasks,
  onAddHomework,
  onToggleHomework,
  onDeleteHomework,
  onAddAlarm,
  onToggleAlarm,
  onDeleteAlarm,
  onAddEbbinghausTask,
  onCompleteEbbinghausNode,
  onTriggerAlarmTest,
}) => {
  // 子标签模式: 'homework' (作业清单), 'alarms' (定时闹钟), 'ebbinghaus' (艾宾浩斯复习)
  const [subTab, setSubTab] = useState<"homework" | "alarms" | "ebbinghaus">("homework");

  // 作业筛选
  const [homeworkFilter, setHomeworkFilter] = useState<"all" | "pending" | "completed">("all");

  // 新增作业表单
  const [isAddHwModalOpen, setIsAddHwModalOpen] = useState(false);
  const [hwSubject, setHwSubject] = useState<HomeworkItem["subject"]>("数学");
  const [hwContent, setHwContent] = useState("");
  const [hwDeadline, setHwDeadline] = useState("21:00");
  const [hwMinutes, setHwMinutes] = useState(30);
  const [hwPriority, setHwPriority] = useState<"high" | "medium" | "low">("high");
  const [hwNotes, setHwNotes] = useState("");

  // 新增闹钟表单
  const [isAddAlarmModalOpen, setIsAddAlarmModalOpen] = useState(false);
  const [alarmTitle, setAlarmTitle] = useState("");
  const [alarmTime, setAlarmTime] = useState("19:30");
  const [alarmCategory, setAlarmCategory] = useState<StudyAlarm["category"]>("homework");

  // 新增艾宾浩斯复习任务
  const [isAddEbModalOpen, setIsAddEbModalOpen] = useState(false);
  const [ebTitle, setEbTitle] = useState("");
  const [ebCategory, setEbCategory] = useState<EbbinghausTask["category"]>("英语单词");
  const [ebContent, setEbContent] = useState("");

  // 复习打卡弹窗
  const [activeReviewingTask, setActiveReviewingTask] = useState<{
    task: EbbinghausTask;
    nodeIndex: number;
  } | null>(null);

  // 排序作业：未完成优先，高优先级优先，截止时间升序
  const sortedHomework = useMemo(() => {
    return [...homeworkList].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      if (priorityWeight[a.priority] !== priorityWeight[b.priority]) {
        return priorityWeight[b.priority] - priorityWeight[a.priority];
      }
      return a.deadline.localeCompare(b.deadline);
    });
  }, [homeworkList]);

  const filteredHomework = useMemo(() => {
    return sortedHomework.filter((item) => {
      if (homeworkFilter === "pending") return !item.completed;
      if (homeworkFilter === "completed") return item.completed;
      return true;
    });
  }, [sortedHomework, homeworkFilter]);

  // 作业进度统计
  const hwStats = useMemo(() => {
    const total = homeworkList.length;
    const completed = homeworkList.filter((h) => h.completed).length;
    const pending = total - completed;
    const totalMinutes = homeworkList
      .filter((h) => !h.completed)
      .reduce((acc, h) => acc + h.estimatedMinutes, 0);
    const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, pending, totalMinutes, progressPercent };
  }, [homeworkList]);

  // 提交添加作业
  const handleAddHomeworkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hwContent.trim()) return;

    onAddHomework({
      subject: hwSubject,
      content: hwContent.trim(),
      deadline: hwDeadline,
      estimatedMinutes: Number(hwMinutes) || 20,
      priority: hwPriority,
      completed: false,
      notes: hwNotes.trim() || undefined,
      createdAt: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
    });

    setHwContent("");
    setHwNotes("");
    setIsAddHwModalOpen(false);
  };

  // 提交添加闹钟
  const handleAddAlarmSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!alarmTitle.trim()) return;

    onAddAlarm({
      title: alarmTitle.trim(),
      time: alarmTime,
      enabled: true,
      repeatDays: [1, 2, 3, 4, 5, 6, 7],
      soundType: "chime",
      category: alarmCategory,
    });

    setAlarmTitle("");
    setIsAddAlarmModalOpen(false);
  };

  // 提交添加艾宾浩斯复习任务
  const handleAddEbSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ebTitle.trim()) return;

    const now = Date.now();
    const formatTime = (ts: number) => {
      const d = new Date(ts);
      return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
    };

    // 艾宾浩斯关键节点 (10分、15分、30分、60分)
    const nodes: EbbinghausNode[] = [
      {
        nodeIndex: 0,
        stageName: "初次记忆 (10分)",
        delayMinutes: 10,
        targetTime: formatTime(now + 10 * 60 * 1000),
        status: "pending",
      },
      {
        nodeIndex: 1,
        stageName: "再次强化 (15分)",
        delayMinutes: 15,
        targetTime: formatTime(now + 15 * 60 * 1000),
        status: "pending",
      },
      {
        nodeIndex: 2,
        stageName: "深度固化 (30分)",
        delayMinutes: 30,
        targetTime: formatTime(now + 30 * 60 * 1000),
        status: "pending",
      },
      {
        nodeIndex: 3,
        stageName: "小时自测 (1小时)",
        delayMinutes: 60,
        targetTime: formatTime(now + 60 * 60 * 1000),
        status: "pending",
      },
    ];

    onAddEbbinghausTask({
      title: ebTitle.trim(),
      category: ebCategory,
      contentDetails: ebContent.trim() || "背诵核心知识点",
      startTime: formatTime(now),
      nodes,
      overallStatus: "in_progress",
      totalReviewsDone: 0,
    });

    setEbTitle("");
    setEbContent("");
    setIsAddEbModalOpen(false);
    speechService.playBeepTone(784, 0.15);
  };

  // 确认完成艾宾浩斯复习节点
  const handleConfirmReview = (mastery: "mastered" | "vague" | "unmastered") => {
    if (!activeReviewingTask) return;
    onCompleteEbbinghausNode(
      activeReviewingTask.task.id,
      activeReviewingTask.nodeIndex,
      mastery
    );
    setActiveReviewingTask(null);

    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 },
    });
    speechService.playSuccessChime();
  };

  return (
    <div className="flex flex-col gap-4 pb-12">
      {/* 顶部标签切换 */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
              务
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">作业规划与艾宾浩斯</h2>
              <p className="text-[11px] text-slate-500">家庭作业清单 · 定时闹钟 · 四节点复习曲线</p>
            </div>
          </div>
          <span className="text-[10px] font-semibold bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full border border-teal-200/60">
            抗遗忘神器
          </span>
        </div>

        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-medium text-slate-600">
          <button
            id="tab-homework-planner"
            type="button"
            onClick={() => setSubTab("homework")}
            className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              subTab === "homework" ? "bg-white text-teal-700 shadow-xs font-semibold" : "hover:text-slate-900"
            }`}
          >
            <ListTodo className="w-3.5 h-3.5" />
            <span>作业清单</span>
          </button>
          <button
            id="tab-study-alarms"
            type="button"
            onClick={() => setSubTab("alarms")}
            className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              subTab === "alarms" ? "bg-white text-teal-700 shadow-xs font-semibold" : "hover:text-slate-900"
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>学习闹钟</span>
          </button>
          <button
            id="tab-ebbinghaus-review"
            type="button"
            onClick={() => setSubTab("ebbinghaus")}
            className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              subTab === "ebbinghaus" ? "bg-white text-teal-700 shadow-xs font-semibold" : "hover:text-slate-900"
            }`}
          >
            <BrainCircuit className="w-3.5 h-3.5 text-teal-600" />
            <span>艾宾浩斯复习</span>
          </button>
        </div>
      </div>

      {/* Tab 1: 家庭作业清单 */}
      {subTab === "homework" && (
        <div className="flex flex-col gap-3">
          {/* 今日作业进度看板 */}
          <div className="bg-gradient-to-r from-teal-600 to-emerald-600 rounded-2xl p-4 text-white shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-300 fill-current" />
                <span className="text-xs font-bold">今日作业完成率</span>
              </div>
              <span className="text-xs font-semibold bg-white/20 px-2 py-0.5 rounded-full">
                进度 {hwStats.progressPercent}%
              </span>
            </div>

            <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden mb-3">
              <div
                className="h-full bg-amber-300 rounded-full transition-all duration-300"
                style={{ width: `${hwStats.progressPercent}%` }}
              />
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-white/10 p-2 rounded-xl">
                <span className="text-teal-100 text-[10px] block">总作业项</span>
                <span className="text-base font-bold">{hwStats.total} 项</span>
              </div>
              <div className="bg-white/10 p-2 rounded-xl">
                <span className="text-teal-100 text-[10px] block">剩余未完</span>
                <span className="text-base font-bold">{hwStats.pending} 项</span>
              </div>
              <div className="bg-white/10 p-2 rounded-xl">
                <span className="text-teal-100 text-[10px] block">预估剩余耗时</span>
                <span className="text-base font-bold">{hwStats.totalMinutes} 分钟</span>
              </div>
            </div>
          </div>

          {/* 状态筛选与新建按钮 */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl text-xs">
              {(["all", "pending", "completed"] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setHomeworkFilter(filter)}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    homeworkFilter === filter
                      ? "bg-white text-teal-800 font-semibold shadow-2xs"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {filter === "all" ? "全部" : filter === "pending" ? "进行中" : "已完成"}
                </button>
              ))}
            </div>

            <button
              id="btn-open-add-homework"
              type="button"
              onClick={() => setIsAddHwModalOpen(true)}
              className="flex items-center gap-1 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>新建作业</span>
            </button>
          </div>

          {/* 作业条目列表 */}
          <div className="space-y-2">
            {filteredHomework.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center text-slate-400 text-xs border border-slate-100">
                <CheckCircle2 className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p>当前分类下暂无作业</p>
                <span className="text-[10px]">可点击上方“新建作业”规划今晚的学习任务</span>
              </div>
            ) : (
              filteredHomework.map((item) => {
                const isHigh = item.priority === "high";
                const isMedium = item.priority === "medium";

                return (
                  <div
                    key={item.id}
                    className={`bg-white rounded-2xl p-3.5 shadow-xs border transition-all flex items-start gap-3 ${
                      item.completed
                        ? "border-slate-100 opacity-70 bg-slate-50/50"
                        : "border-slate-100 hover:border-teal-200"
                    }`}
                  >
                    {/* 完成复选勾选框 */}
                    <button
                      type="button"
                      onClick={() => onToggleHomework(item.id)}
                      className={`w-5 h-5 rounded-lg border mt-0.5 flex items-center justify-center transition-all cursor-pointer ${
                        item.completed
                          ? "bg-teal-600 border-teal-600 text-white shadow-2xs"
                          : "border-slate-300 hover:border-teal-500 bg-white"
                      }`}
                    >
                      {item.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </button>

                    {/* 作业主要内容 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                            item.subject === "数学"
                              ? "bg-blue-50 text-blue-700 border border-blue-200/60"
                              : item.subject === "语文"
                              ? "bg-rose-50 text-rose-700 border border-rose-200/60"
                              : item.subject === "英语"
                              ? "bg-amber-50 text-amber-800 border border-amber-200/60"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                          }`}
                        >
                          {item.subject}
                        </span>

                        <span
                          className={`text-[9px] font-medium px-1.5 py-0.2 rounded ${
                            isHigh
                              ? "bg-rose-100 text-rose-800"
                              : isMedium
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {isHigh ? "高优先级" : isMedium ? "中优先级" : "普通"}
                        </span>

                        <span className="text-[10px] text-slate-400 ml-auto flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>截止 {item.deadline}</span>
                        </span>
                      </div>

                      <p
                        className={`text-xs font-semibold leading-snug ${
                          item.completed ? "line-through text-slate-400" : "text-slate-800"
                        }`}
                      >
                        {item.content}
                      </p>

                      {item.notes && (
                        <p className="text-[10px] text-slate-500 bg-slate-50 p-1.5 rounded-lg mt-1.5 border border-slate-100">
                          备注：{item.notes}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2">
                        <span>预估用时 {item.estimatedMinutes} 分钟</span>
                        <button
                          type="button"
                          onClick={() => onDeleteHomework(item.id)}
                          className="hover:text-rose-500 text-slate-300 p-1 transition-colors cursor-pointer"
                          title="删除该作业"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab 2: 学习闹钟与定时提醒 */}
      {subTab === "alarms" && (
        <div className="flex flex-col gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-900">定时学习提醒</h3>
              <p className="text-[10px] text-slate-400">规律作息定时播报，培养孩子自律习惯</p>
            </div>
            <button
              id="btn-open-add-alarm"
              type="button"
              onClick={() => setIsAddAlarmModalOpen(true)}
              className="flex items-center gap-1 text-xs font-semibold bg-teal-50 text-teal-700 hover:bg-teal-100 px-3 py-1.5 rounded-xl border border-teal-200/60 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>添加闹钟</span>
            </button>
          </div>

          <div className="space-y-2">
            {alarms.map((alarm) => (
              <div
                key={alarm.id}
                className="bg-white rounded-2xl p-4 shadow-xs border border-slate-100 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs ${
                      alarm.enabled ? "bg-teal-50 text-teal-700" : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-black tracking-tight text-slate-900 font-mono">
                        {alarm.time}
                      </span>
                      <span className="text-[10px] font-medium bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded">
                        {alarm.category === "homework"
                          ? "作业起跑"
                          : alarm.category === "review"
                          ? "听写复习"
                          : "护眼休息"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 font-medium">{alarm.title}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      speechService.playAlarmAlert();
                      onTriggerAlarmTest?.(alarm);
                    }}
                    className="text-[10px] text-teal-600 hover:bg-teal-50 px-2 py-1 rounded-lg border border-teal-200 transition-colors cursor-pointer"
                    title="测试铃声与提示条"
                  >
                    响铃试听
                  </button>

                  {/* 开关 Toggle */}
                  <button
                    type="button"
                    onClick={() => onToggleAlarm(alarm.id)}
                    className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                      alarm.enabled ? "bg-teal-600" : "bg-slate-200"
                    }`}
                  >
                    <span
                      className={`block w-5 h-5 rounded-full bg-white shadow-xs transition-transform duration-200 ${
                        alarm.enabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() => onDeleteAlarm(alarm.id)}
                    className="text-slate-300 hover:text-rose-500 p-1 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: 艾宾浩斯短期强化复习 */}
      {subTab === "ebbinghaus" && (
        <div className="flex flex-col gap-3">
          {/* 艾宾浩斯记忆曲线介绍 */}
          <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-800 rounded-2xl p-4 text-white shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <BrainCircuit className="w-4 h-4 text-emerald-300" />
                <h3 className="text-xs font-bold">艾宾浩斯即时记忆曲线</h3>
              </div>
              <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">
                4次黄金复习点
              </span>
            </div>
            <p className="text-[11px] text-emerald-100 leading-relaxed mb-3">
              记忆新知识后 1 小时内遗忘率高达 56%。抓住{" "}
              <strong className="text-white">10分、15分、30分、1小时</strong>{" "}
              黄金节点复习，长久留存记忆！
            </p>

            <div className="grid grid-cols-4 gap-1 text-center text-[10px]">
              <div className="bg-white/10 p-1.5 rounded-lg border border-white/10">
                <span className="text-emerald-200 block font-bold">10分钟</span>
                <span className="text-[9px] opacity-80">初次强化</span>
              </div>
              <div className="bg-white/10 p-1.5 rounded-lg border border-white/10">
                <span className="text-emerald-200 block font-bold">15分钟</span>
                <span className="text-[9px] opacity-80">再次唤醒</span>
              </div>
              <div className="bg-white/10 p-1.5 rounded-lg border border-white/10">
                <span className="text-emerald-200 block font-bold">30分钟</span>
                <span className="text-[9px] opacity-80">深度固化</span>
              </div>
              <div className="bg-white/10 p-1.5 rounded-lg border border-white/10">
                <span className="text-emerald-200 block font-bold">1小时</span>
                <span className="text-[9px] opacity-80">成效自测</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between px-1">
            <div className="text-xs text-slate-600 font-bold">
              当前进行中的复习任务 ({ebbinghausTasks.length})
            </div>
            <button
              id="btn-open-add-ebbinghaus"
              type="button"
              onClick={() => setIsAddEbModalOpen(true)}
              className="flex items-center gap-1 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>新建复习内容</span>
            </button>
          </div>

          {/* 任务列表 */}
          <div className="space-y-3">
            {ebbinghausTasks.map((task) => (
              <div
                key={task.id}
                className="bg-white rounded-2xl p-4 shadow-xs border border-slate-100 flex flex-col gap-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900">{task.title}</span>
                      <span className="text-[10px] font-medium bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded border border-emerald-200/50">
                        {task.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                      {task.contentDetails}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block font-mono">
                      起点 {task.startTime}
                    </span>
                    <span className="text-[10px] font-bold text-teal-700">
                      已复习 {task.totalReviewsDone} / 4 节点
                    </span>
                  </div>
                </div>

                {/* 4个复习节点横排 */}
                <div className="grid grid-cols-4 gap-1.5 pt-1">
                  {task.nodes.map((node) => {
                    const isDone = node.status === "completed";
                    const isReady = node.status === "ready";

                    return (
                      <button
                        key={node.nodeIndex}
                        type="button"
                        onClick={() => {
                          setActiveReviewingTask({ task, nodeIndex: node.nodeIndex });
                        }}
                        className={`p-2 rounded-xl text-left border transition-all flex flex-col justify-between min-h-[72px] cursor-pointer ${
                          isDone
                            ? "bg-emerald-50/60 border-emerald-200 text-emerald-900"
                            : isReady
                            ? "bg-amber-50/80 border-amber-300 text-amber-900 ring-2 ring-amber-400/50 animate-pulse"
                            : "bg-slate-50/70 border-slate-200/70 text-slate-500 hover:bg-slate-100"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-bold">
                            {node.delayMinutes < 60 ? `${node.delayMinutes}m` : "1h"}
                          </span>
                          {isDone ? (
                            <span className="w-3.5 h-3.5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[9px] font-bold">
                              ✓
                            </span>
                          ) : isReady ? (
                            <span className="w-2 h-2 rounded-full bg-amber-500 block" />
                          ) : null}
                        </div>

                        <div>
                          <span className="text-[9px] block text-slate-400 font-mono">
                            {node.targetTime}
                          </span>
                          <span className="text-[10px] font-semibold block leading-tight mt-0.5">
                            {isDone
                              ? node.masteryLevel === "mastered"
                                ? "已牢记"
                                : "已复习"
                              : isReady
                              ? "待复习"
                              : "未到期"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 新建作业弹窗 */}
      {isAddHwModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-xl border border-slate-100 animate-in zoom-in-95">
            <h3 className="text-sm font-bold text-slate-900 mb-1">新建作业计划</h3>
            <p className="text-[11px] text-slate-400 mb-3">记录学科作业、预估耗时与完成节点</p>

            <form onSubmit={handleAddHomeworkSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">学科 *</label>
                  <select
                    value={hwSubject}
                    onChange={(e) => setHwSubject(e.target.value as any)}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-white"
                  >
                    {["语文", "数学", "英语", "物理", "化学", "生物", "历史", "地理", "道法", "综合"].map(
                      (s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      )
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">优先级</label>
                  <select
                    value={hwPriority}
                    onChange={(e) => setHwPriority(e.target.value as any)}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="high">高 (核心必做)</option>
                    <option value="medium">中 (常规巩固)</option>
                    <option value="low">低 (拓展自选)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">作业内容 *</label>
                <textarea
                  rows={2}
                  required
                  value={hwContent}
                  onChange={(e) => setHwContent(e.target.value)}
                  placeholder="例如：练习册第 45 页 1~5 题并订正..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">截止完成时间</label>
                  <input
                    type="time"
                    value={hwDeadline}
                    onChange={(e) => setHwDeadline(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">预估用时 (分)</label>
                  <input
                    type="number"
                    min={5}
                    max={180}
                    value={hwMinutes}
                    onChange={(e) => setHwMinutes(Number(e.target.value))}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">备注说明 (选填)</label>
                <input
                  type="text"
                  value={hwNotes}
                  onChange={(e) => setHwNotes(e.target.value)}
                  placeholder="如：注意订正上周错题"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddHwModalOpen(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 font-medium cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 cursor-pointer"
                >
                  添加作业
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 新建闹钟弹窗 */}
      {isAddAlarmModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-xl border border-slate-100 animate-in zoom-in-95">
            <h3 className="text-sm font-bold text-slate-900 mb-1">添加定时闹钟</h3>
            <p className="text-[11px] text-slate-400 mb-3">为孩子的每日学习作息定格规律闹钟</p>

            <form onSubmit={handleAddAlarmSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">提醒名称 *</label>
                <input
                  type="text"
                  required
                  value={alarmTitle}
                  onChange={(e) => setAlarmTitle(e.target.value)}
                  placeholder="例如：准备语文默写复习"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">响铃时间</label>
                  <input
                    type="time"
                    required
                    value={alarmTime}
                    onChange={(e) => setAlarmTime(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-200 font-mono text-base"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">分类标签</label>
                  <select
                    value={alarmCategory}
                    onChange={(e) => setAlarmCategory(e.target.value as any)}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="homework">作业起跑</option>
                    <option value="review">生词复习</option>
                    <option value="rest">休息与护眼</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddAlarmModalOpen(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 font-medium cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 cursor-pointer"
                >
                  确认添加
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 新建艾宾浩斯任务弹窗 */}
      {isAddEbModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-xl border border-slate-100 animate-in zoom-in-95">
            <h3 className="text-sm font-bold text-slate-900 mb-1">新建艾宾浩斯复习任务</h3>
            <p className="text-[11px] text-slate-400 mb-3">
              输入记忆内容，系统将自动规划 10m、15m、30m、1h 黄金复习时刻
            </p>

            <form onSubmit={handleAddEbSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">类别</label>
                  <select
                    value={ebCategory}
                    onChange={(e) => setEbCategory(e.target.value as any)}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="英语单词">英语单词</option>
                    <option value="古诗文言">古诗文言</option>
                    <option value="公式定理">公式定理</option>
                    <option value="考点概念">考点概念</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">任务名称 *</label>
                  <input
                    type="text"
                    required
                    value={ebTitle}
                    onChange={(e) => setEbTitle(e.target.value)}
                    placeholder="如：Unit 3 核心句型"
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">记忆要点内容</label>
                <textarea
                  rows={3}
                  value={ebContent}
                  onChange={(e) => setEbContent(e.target.value)}
                  placeholder="输入需要反复背诵的词句或考点..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500 resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddEbModalOpen(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 font-medium cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 cursor-pointer"
                >
                  创建并计时
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 艾宾浩斯单次节点复习确认弹窗 */}
      {activeReviewingTask && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-xl border border-slate-100 animate-in zoom-in-95 space-y-3 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded">
                  艾宾浩斯复习打卡
                </span>
                <h3 className="text-sm font-bold text-slate-900 mt-1">
                  {activeReviewingTask.task.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveReviewingTask(null)}
                className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
              >
                关闭
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1">
              <span className="text-[10px] text-slate-400 block">需要记忆的内容：</span>
              <p className="text-xs font-medium text-slate-700 leading-relaxed">
                {activeReviewingTask.task.contentDetails}
              </p>
            </div>

            <div className="space-y-1.5 pt-1">
              <span className="text-slate-600 font-semibold block">
                请闭眼回想，当前阶段记忆掌握度如何？
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleConfirmReview("mastered")}
                  className="py-2.5 px-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold text-xs flex flex-col items-center gap-1 cursor-pointer"
                >
                  <span className="text-base">🟢</span>
                  <span>牢固掌握</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmReview("vague")}
                  className="py-2.5 px-1 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-semibold text-xs flex flex-col items-center gap-1 cursor-pointer"
                >
                  <span className="text-base">🟡</span>
                  <span>有些模糊</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmReview("unmastered")}
                  className="py-2.5 px-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-semibold text-xs flex flex-col items-center gap-1 cursor-pointer"
                >
                  <span className="text-base">🔴</span>
                  <span>基本遗忘</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
