/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import {
  Sparkles,
  ListTodo,
  TrendingUp,
  Headphones,
} from "lucide-react";
import {
  DictationWord,
  WeeklyCheckinDay,
  DictationSession,
  HomeworkItem,
  StudyAlarm,
  EbbinghausTask,
  WrongWordItem,
  QuestionHistoryItem,
} from "./types";
import {
  INITIAL_WORDS,
  getInitialWeeklyCheckin,
  INITIAL_HOMEWORK,
  INITIAL_ALARMS,
  getInitialEbbinghausTasks,
} from "./data/defaultWords";
import { WeChatNavbar } from "./components/WeChatNavbar";
import { DictationModule } from "./components/Dictation/DictationModule";
import { AiTutorModule } from "./components/AiTutor/AiTutorModule";
import { HomeworkModule } from "./components/Homework/HomeworkModule";
import { LedgerModule } from "./components/Ledger/LedgerModule";
import { AlarmNotificationBanner } from "./components/AlarmNotificationBanner";
import { InfoModal } from "./components/InfoModal";
import { speechService } from "./utils/speech";

type TabKey = "dictation" | "tutor" | "homework" | "ledger";

export default function App() {
  // 当前激活主 Tab
  const [currentTab, setCurrentTab] = useState<TabKey>("dictation");

  // 微信小程序手机模拟视图 (true) vs 宽屏自适应 (false)
  const [isMobileView, setIsMobileView] = useState<boolean>(true);

  // 指南与说明模态框
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

  // 顶部弹出的定时/艾宾浩斯复习通知栏
  const [activeNotification, setActiveNotification] = useState<{
    id: string;
    type: "alarm" | "ebbinghaus";
    title: string;
    message: string;
    targetTab: TabKey;
  } | null>(null);

  // 1. 词汇列表（支持本地持久化）
  const [words, setWords] = useState<DictationWord[]>(() => {
    try {
      const saved = localStorage.getItem("zhixue_words");
      return saved ? JSON.parse(saved) : INITIAL_WORDS;
    } catch {
      return INITIAL_WORDS;
    }
  });

  // 2. 每周打卡日历
  const [weeklyCheckin, setWeeklyCheckin] = useState<WeeklyCheckinDay[]>(() => {
    try {
      const saved = localStorage.getItem("zhixue_weekly_checkin");
      return saved ? JSON.parse(saved) : getInitialWeeklyCheckin();
    } catch {
      return getInitialWeeklyCheckin();
    }
  });

  // 3. 听写历史结果会话
  const [sessions, setSessions] = useState<DictationSession[]>(() => {
    try {
      const saved = localStorage.getItem("zhixue_sessions");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // 4. 生词错题本
  const [wrongWords, setWrongWords] = useState<WrongWordItem[]>(() => {
    try {
      const saved = localStorage.getItem("zhixue_wrong_words");
      return saved
        ? JSON.parse(saved)
        : [
            {
              id: "ww-1",
              word: "绚丽",
              pinyinOrPhonetic: "xuàn lì",
              definition: "灿烂美丽，色彩极其丰富耀眼",
              subject: "chinese",
              wrongCount: 2,
              lastWrongDate: "09-11",
              resolved: false,
            },
            {
              id: "ww-2",
              word: "environment",
              pinyinOrPhonetic: "/ɪnˈvaɪrənmənt/",
              definition: "n. 自然环境；周围状况",
              subject: "english",
              wrongCount: 1,
              lastWrongDate: "09-10",
              resolved: false,
            },
          ];
    } catch {
      return [];
    }
  });

  // 5. 作业清单
  const [homeworkList, setHomeworkList] = useState<HomeworkItem[]>(() => {
    try {
      const saved = localStorage.getItem("zhixue_homework");
      return saved ? JSON.parse(saved) : INITIAL_HOMEWORK;
    } catch {
      return INITIAL_HOMEWORK;
    }
  });

  // 6. 学习闹钟
  const [alarms, setAlarms] = useState<StudyAlarm[]>(() => {
    try {
      const saved = localStorage.getItem("zhixue_alarms");
      return saved ? JSON.parse(saved) : INITIAL_ALARMS;
    } catch {
      return INITIAL_ALARMS;
    }
  });

  // 7. 艾宾浩斯复习任务 (10m, 15m, 30m, 1h)
  const [ebbinghausTasks, setEbbinghausTasks] = useState<EbbinghausTask[]>(() => {
    try {
      const saved = localStorage.getItem("zhixue_ebbinghaus");
      return saved ? JSON.parse(saved) : getInitialEbbinghausTasks();
    } catch {
      return getInitialEbbinghausTasks();
    }
  });

  // 8. AI 答疑问答历史
  const [historyItems, setHistoryItems] = useState<QuestionHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem("zhixue_tutor_history");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // 自动写入 LocalStorage
  useEffect(() => {
    localStorage.setItem("zhixue_words", JSON.stringify(words));
  }, [words]);

  useEffect(() => {
    localStorage.setItem("zhixue_weekly_checkin", JSON.stringify(weeklyCheckin));
  }, [weeklyCheckin]);

  useEffect(() => {
    localStorage.setItem("zhixue_sessions", JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem("zhixue_wrong_words", JSON.stringify(wrongWords));
  }, [wrongWords]);

  useEffect(() => {
    localStorage.setItem("zhixue_homework", JSON.stringify(homeworkList));
  }, [homeworkList]);

  useEffect(() => {
    localStorage.setItem("zhixue_alarms", JSON.stringify(alarms));
  }, [alarms]);

  useEffect(() => {
    localStorage.setItem("zhixue_ebbinghaus", JSON.stringify(ebbinghausTasks));
  }, [ebbinghausTasks]);

  useEffect(() => {
    localStorage.setItem("zhixue_tutor_history", JSON.stringify(historyItems));
  }, [historyItems]);

  // 后台轮询检查艾宾浩斯与闹钟节点
  useEffect(() => {
    const timer = setInterval(() => {
      // 检查是否有 ready 状态的艾宾浩斯节点
      for (const task of ebbinghausTasks) {
        const readyNode = task.nodes.find((n) => n.status === "ready");
        if (readyNode) {
          if (!activeNotification) {
            setActiveNotification({
              id: `notify-eb-${Date.now()}`,
              type: "ebbinghaus",
              title: `艾宾浩斯黄金复习时刻已到！`,
              message: `《${task.title}》需要进行 ${readyNode.stageName} 复习`,
              targetTab: "homework",
            });
            speechService.playBeepTone(880, 0.2);
          }
          break;
        }
      }
    }, 15000);

    return () => clearInterval(timer);
  }, [ebbinghausTasks, activeNotification]);

  // 添加自定义生词
  const handleAddCustomWord = (newWordData: Partial<DictationWord>) => {
    const word: DictationWord = {
      id: `custom-${Date.now()}`,
      word: newWordData.word || "",
      pinyinOrPhonetic: newWordData.pinyinOrPhonetic,
      definition: newWordData.definition,
      subject: newWordData.subject || "chinese",
      grade: newWordData.grade || "全部年级",
      lesson: newWordData.lesson || "自定义生词",
      tags: ["自选生词"],
      isCustom: true,
    };
    setWords((prev) => [word, ...prev]);
  };

  // 保存听写会话
  const handleSaveSession = (session: DictationSession) => {
    setSessions((prev) => [session, ...prev]);
  };

  // 更新每周打卡记录
  const handleUpdateWeeklyCheckin = (dayIndex: number, score: number, errorCount: number) => {
    setWeeklyCheckin((prev) =>
      prev.map((item, idx) => {
        if (idx === dayIndex) {
          return {
            ...item,
            status: "completed",
            score,
            errorCount,
            completedAt: new Date().toLocaleTimeString("zh-CN", {
              hour: "2-digit",
              minute: "2-digit",
            }),
          };
        }
        return item;
      })
    );
  };

  // 记录错题
  const handleRecordWrongWord = (word: DictationWord) => {
    setWrongWords((prev) => {
      const existing = prev.find((w) => w.word.toLowerCase() === word.word.toLowerCase());
      if (existing) {
        return prev.map((w) =>
          w.word.toLowerCase() === word.word.toLowerCase()
            ? {
                ...w,
                wrongCount: w.wrongCount + 1,
                lastWrongDate: "今日",
                resolved: false,
              }
            : w
        );
      }
      return [
        {
          id: `wrong-${Date.now()}`,
          word: word.word,
          pinyinOrPhonetic: word.pinyinOrPhonetic,
          definition: word.definition,
          subject: word.subject,
          wrongCount: 1,
          lastWrongDate: "今日",
          resolved: false,
        },
        ...prev,
      ];
    });
  };

  // 作业管理
  const handleAddHomework = (item: Partial<HomeworkItem>) => {
    const newHw: HomeworkItem = {
      id: `hw-${Date.now()}`,
      subject: item.subject || "综合",
      content: item.content || "",
      deadline: item.deadline || "21:00",
      estimatedMinutes: item.estimatedMinutes || 30,
      priority: item.priority || "medium",
      completed: false,
      createdAt: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
      notes: item.notes,
    };
    setHomeworkList((prev) => [newHw, ...prev]);
  };

  const handleToggleHomework = (id: string) => {
    setHomeworkList((prev) =>
      prev.map((h) => {
        if (h.id === id) {
          const completed = !h.completed;
          if (completed) speechService.playSuccessChime();
          return {
            ...h,
            completed,
            completedAt: completed
              ? new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
              : undefined,
          };
        }
        return h;
      })
    );
  };

  const handleDeleteHomework = (id: string) => {
    setHomeworkList((prev) => prev.filter((h) => h.id !== id));
  };

  // 闹钟管理
  const handleAddAlarm = (alarm: Partial<StudyAlarm>) => {
    const newAlarm: StudyAlarm = {
      id: `alarm-${Date.now()}`,
      title: alarm.title || "学习提醒",
      time: alarm.time || "20:00",
      enabled: true,
      repeatDays: [1, 2, 3, 4, 5, 6, 7],
      soundType: "chime",
      category: alarm.category || "homework",
    };
    setAlarms((prev) => [...prev, newAlarm]);
  };

  const handleToggleAlarm = (id: string) => {
    setAlarms((prev) =>
      prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a))
    );
  };

  const handleDeleteAlarm = (id: string) => {
    setAlarms((prev) => prev.filter((a) => a.id !== id));
  };

  // 艾宾浩斯任务管理
  const handleAddEbbinghausTask = (task: Partial<EbbinghausTask>) => {
    const newTask: EbbinghausTask = {
      id: `eb-${Date.now()}`,
      title: task.title || "重点记忆",
      category: task.category || "英语单词",
      contentDetails: task.contentDetails || "",
      startTime: task.startTime || "19:00",
      nodes: task.nodes || [],
      overallStatus: "in_progress",
      totalReviewsDone: 0,
    };
    setEbbinghausTasks((prev) => [newTask, ...prev]);
  };

  const handleCompleteEbbinghausNode = (
    taskId: string,
    nodeIndex: number,
    mastery: "mastered" | "vague" | "unmastered"
  ) => {
    setEbbinghausTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const updatedNodes = t.nodes.map((n) => {
            if (n.nodeIndex === nodeIndex) {
              return {
                ...n,
                status: "completed" as const,
                masteryLevel: mastery,
                completedAt: new Date().toLocaleTimeString("zh-CN", {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              };
            }
            return n;
          });
          const doneCount = updatedNodes.filter((n) => n.status === "completed").length;
          return {
            ...t,
            nodes: updatedNodes,
            totalReviewsDone: doneCount,
            overallStatus: doneCount === 4 ? "completed" : "in_progress",
          };
        }
        return t;
      })
    );
  };

  // 错题重测跳转
  const handleStartWrongPractice = () => {
    setCurrentTab("dictation");
  };

  // 未完成作业数
  const pendingHomeworkCount = homeworkList.filter((h) => !h.completed).length;

  return (
    <div className="min-h-screen bg-slate-900/90 text-slate-900 flex justify-center items-center font-sans antialiased py-0 sm:py-6 px-0 sm:px-4">
      {/* 顶部定时通知胶囊横幅 */}
      <AlarmNotificationBanner
        notification={activeNotification}
        onDismiss={() => setActiveNotification(null)}
        onAction={(tab) => {
          setCurrentTab(tab);
          setActiveNotification(null);
        }}
      />

      {/* 使用指南弹窗 */}
      <InfoModal isOpen={isInfoModalOpen} onClose={() => setIsInfoModalOpen(false)} />

      {/* 主界面视窗容器 */}
      <div
        className={`w-full transition-all duration-300 flex flex-col bg-slate-100 ${
          isMobileView
            ? "max-w-[440px] h-[100vh] sm:h-[90vh] sm:rounded-[38px] sm:shadow-2xl sm:ring-12 sm:ring-slate-800/80 overflow-hidden relative border-slate-700/50"
            : "max-w-4xl h-[100vh] sm:h-[92vh] sm:rounded-2xl sm:shadow-2xl overflow-hidden relative"
        }`}
      >
        {/* 小程序顶部导航栏 */}
        <WeChatNavbar
          title="智学宝"
          isMobileView={isMobileView}
          onToggleViewMode={() => setIsMobileView(!isMobileView)}
          onOpenInfoModal={() => setIsInfoModalOpen(true)}
        />

        {/* 滚动内容主体 */}
        <main className="flex-1 overflow-y-auto px-3.5 pt-3 pb-20 scrollbar-none">
          {currentTab === "dictation" && (
            <DictationModule
              words={words}
              weeklyCheckin={weeklyCheckin}
              onAddCustomWord={handleAddCustomWord}
              onSaveSession={handleSaveSession}
              onUpdateWeeklyCheckin={handleUpdateWeeklyCheckin}
              onRecordWrongWord={handleRecordWrongWord}
            />
          )}

          {currentTab === "tutor" && (
            <AiTutorModule
              historyItems={historyItems}
              onSaveHistoryItem={(item) => setHistoryItems((prev) => [item, ...prev])}
              onClearHistory={() => setHistoryItems([])}
            />
          )}

          {currentTab === "homework" && (
            <HomeworkModule
              homeworkList={homeworkList}
              alarms={alarms}
              ebbinghausTasks={ebbinghausTasks}
              onAddHomework={handleAddHomework}
              onToggleHomework={handleToggleHomework}
              onDeleteHomework={handleDeleteHomework}
              onAddAlarm={handleAddAlarm}
              onToggleAlarm={handleToggleAlarm}
              onDeleteAlarm={handleDeleteAlarm}
              onAddEbbinghausTask={handleAddEbbinghausTask}
              onCompleteEbbinghausNode={handleCompleteEbbinghausNode}
              onTriggerAlarmTest={(alarm) => {
                setActiveNotification({
                  id: `alarm-test-${Date.now()}`,
                  type: "alarm",
                  title: `定时闹钟响铃: ${alarm.time}`,
                  message: alarm.title,
                  targetTab: "homework",
                });
              }}
            />
          )}

          {currentTab === "ledger" && (
            <LedgerModule
              sessions={sessions}
              weeklyCheckin={weeklyCheckin}
              homeworkList={homeworkList}
              ebbinghausTasks={ebbinghausTasks}
              wrongWords={wrongWords}
              onStartWrongPractice={handleStartWrongPractice}
              allWords={words}
            />
          )}
        </main>

        {/* 微信小程序底部 TabBar 导航 */}
        <nav
          id="wechat-bottom-tabbar"
          className="absolute bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-2 py-1.5 flex items-center justify-around select-none z-30"
        >
          {/* Tab 1: AI 听写 */}
          <button
            id="tab-btn-dictation"
            type="button"
            onClick={() => setCurrentTab("dictation")}
            className={`flex-1 flex flex-col items-center justify-center py-1 transition-all cursor-pointer ${
              currentTab === "dictation"
                ? "text-emerald-600 font-bold"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <Headphones
              className={`w-5 h-5 mb-0.5 ${
                currentTab === "dictation" ? "stroke-[2.5]" : "stroke-[1.7]"
              }`}
            />
            <span className="text-[10px] tracking-tight">AI 听写</span>
          </button>

          {/* Tab 2: AI 导师 */}
          <button
            id="tab-btn-tutor"
            type="button"
            onClick={() => setCurrentTab("tutor")}
            className={`flex-1 flex flex-col items-center justify-center py-1 transition-all cursor-pointer ${
              currentTab === "tutor" ? "text-emerald-600 font-bold" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <Sparkles
              className={`w-5 h-5 mb-0.5 ${
                currentTab === "tutor" ? "stroke-[2.5]" : "stroke-[1.7]"
              }`}
            />
            <span className="text-[10px] tracking-tight">AI 答疑</span>
          </button>

          {/* Tab 3: 作业与复习 */}
          <button
            id="tab-btn-homework"
            type="button"
            onClick={() => setCurrentTab("homework")}
            className={`flex-1 flex flex-col items-center justify-center py-1 relative transition-all cursor-pointer ${
              currentTab === "homework"
                ? "text-emerald-600 font-bold"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <ListTodo
              className={`w-5 h-5 mb-0.5 ${
                currentTab === "homework" ? "stroke-[2.5]" : "stroke-[1.7]"
              }`}
            />
            <span className="text-[10px] tracking-tight">作业复习</span>
            {pendingHomeworkCount > 0 && (
              <span className="absolute top-0.5 right-1/4 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center shadow-xs">
                {pendingHomeworkCount}
              </span>
            )}
          </button>

          {/* Tab 4: 学习账本 */}
          <button
            id="tab-btn-ledger"
            type="button"
            onClick={() => setCurrentTab("ledger")}
            className={`flex-1 flex flex-col items-center justify-center py-1 relative transition-all cursor-pointer ${
              currentTab === "ledger"
                ? "text-emerald-600 font-bold"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <TrendingUp
              className={`w-5 h-5 mb-0.5 ${
                currentTab === "ledger" ? "stroke-[2.5]" : "stroke-[1.7]"
              }`}
            />
            <span className="text-[10px] tracking-tight">学情账本</span>
            {wrongWords.length > 0 && (
              <span className="absolute top-0.5 right-1/4 w-2 h-2 rounded-full bg-amber-500 block" />
            )}
          </button>
        </nav>
      </div>
    </div>
  );
}
