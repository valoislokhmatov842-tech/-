/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface DictationWord {
  id: string;
  word: string; // 词语/单词
  pinyinOrPhonetic?: string; // 拼音或国际音标
  definition?: string; // 释义
  subject: "chinese" | "english"; // 科目
  grade: string; // 年级，如 "小学三年级", "初中一年级"
  lesson?: string; // 课文单元，如 "第1课", "Unit 1"
  exampleSentence?: string; // 例句
  isCustom?: boolean; // 是否用户自定义
  tags?: string[]; // 标签
  errorCount?: number; // 错误次数
  lastPracticed?: string; // 最近练习时间
}

export interface DictationAnswerRecord {
  wordId: string;
  word: string;
  userInput: string;
  isCorrect: boolean;
  handwritingImage?: string; // 手写笔迹图像
  timeSpentSeconds: number;
}

export interface DictationSession {
  id: string;
  mode: "textbook" | "custom" | "weekly_checkin";
  title: string;
  subject: "chinese" | "english";
  totalCount: number;
  correctCount: number;
  score: number;
  date: string;
  durationSeconds: number;
  records: DictationAnswerRecord[];
}

export interface WeeklyCheckinDay {
  dayOfWeek: number; // 1:周一 ... 7:周日
  dayName: string; // "周一", "周二"...
  dateStr: string; // "09-08"
  isToday: boolean;
  status: "completed" | "pending" | "missed";
  assignedWordIds: string[]; // 当天推荐或分配的听写词汇ID
  score?: number; // 完成得分
  completedAt?: string;
  errorCount?: number;
}

// AI 智能导师答疑消息
export interface TutorMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  subject?: string;
  isFallback?: boolean;
}

// 答疑历史记录
export interface QuestionHistoryItem {
  id: string;
  question: string;
  subject: string;
  gradeLevel: string;
  summary: string;
  messages: TutorMessage[];
  createdAt: string;
}

export interface HomeworkItem {
  id: string;
  subject: "语文" | "数学" | "英语" | "物理" | "化学" | "生物" | "历史" | "地理" | "道法" | "综合";
  content: string; // 作业具体内容
  deadline: string; // 截止时间，如 "21:00"
  estimatedMinutes: number; // 预估耗时（分钟）
  priority: "high" | "medium" | "low"; // 优先级
  completed: boolean;
  completedAt?: string;
  createdAt: string;
  notes?: string;
}

export interface StudyAlarm {
  id: string;
  title: string; // 提醒标题
  time: string; // "20:00"
  enabled: boolean;
  repeatDays: number[]; // [1,2,3,4,5] 重复星期
  soundType: "chime" | "bell" | "gentle";
  category: "homework" | "review" | "rest";
}

// 艾宾浩斯短期即时复习节点 (10m, 15m, 30m, 1h)
export interface EbbinghausNode {
  nodeIndex: number; // 0, 1, 2, 3
  stageName: string; // "初次记忆 (10分)", "再次强化 (15分)", "深度固化 (30分)", "小时自测 (1小时)"
  delayMinutes: number; // 10, 15, 30, 60
  targetTime: string; // 目标时间 "19:40"
  status: "pending" | "ready" | "completed" | "overdue";
  masteryLevel?: "mastered" | "vague" | "unmastered"; // 掌握/模糊/生疏
  completedAt?: string;
}

export interface EbbinghausTask {
  id: string;
  title: string; // 复习内容标题，如 "英语 Unit 3 核心句型"
  category: "英语单词" | "古诗文言" | "公式定理" | "考点概念";
  contentDetails: string; // 详细背诵或复习内容
  startTime: string; // 开始时间 "19:30"
  nodes: EbbinghausNode[];
  overallStatus: "in_progress" | "completed";
  totalReviewsDone: number;
}

export interface WrongWordItem {
  id: string;
  word: string;
  pinyinOrPhonetic?: string;
  definition?: string;
  subject: "chinese" | "english";
  wrongCount: number;
  lastWrongDate: string;
  resolved: boolean;
}
