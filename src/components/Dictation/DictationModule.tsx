/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Volume2,
  Play,
  Pause,
  RotateCcw,
  Check,
  ChevronRight,
  Calendar,
  BookOpen,
  Award,
  AlertCircle,
  Plus,
  Shuffle,
  Keyboard,
  PenLine,
} from "lucide-react";
import confetti from "canvas-confetti";
import { DictationWord, WeeklyCheckinDay, DictationSession, DictationAnswerRecord } from "../../types";
import { speechService } from "../../utils/speech";
import { HandwritingCanvas } from "./HandwritingCanvas";

interface DictationModuleProps {
  words: DictationWord[];
  weeklyCheckin: WeeklyCheckinDay[];
  onAddCustomWord: (word: Partial<DictationWord>) => void;
  onSaveSession: (session: DictationSession) => void;
  onUpdateWeeklyCheckin: (dayIndex: number, score: number, errorCount: number) => void;
  onRecordWrongWord: (word: DictationWord) => void;
}

export const DictationModule: React.FC<DictationModuleProps> = ({
  words,
  weeklyCheckin,
  onAddCustomWord,
  onSaveSession,
  onUpdateWeeklyCheckin,
  onRecordWrongWord,
}) => {
  // 子标签模式: 'textbook' (同步教材), 'custom' (自选抽测), 'calendar' (打卡日历)
  const [activeTab, setActiveTab] = useState<"textbook" | "custom" | "calendar">("textbook");

  // 教材筛选
  const [selectedSubject, setSelectedSubject] = useState<"chinese" | "english">("chinese");
  const [selectedGrade, setSelectedGrade] = useState<string>("全部年级");

  // 自选听写
  const [selectedCustomWordIds, setSelectedCustomWordIds] = useState<string[]>([]);
  const [randomCount, setRandomCount] = useState<number>(5);

  // 添加词语弹窗
  const [isAddWordModalOpen, setIsAddWordModalOpen] = useState(false);
  const [newWordText, setNewWordText] = useState("");
  const [newWordPinyin, setNewWordPinyin] = useState("");
  const [newWordDef, setNewWordDef] = useState("");
  const [newWordGrade, setNewWordGrade] = useState("小学四年级");
  const [newWordSubject, setNewWordSubject] = useState<"chinese" | "english">("chinese");

  // 听写会话状态
  const [isPlayingSession, setIsPlayingSession] = useState(false);
  const [currentQueue, setCurrentQueue] = useState<DictationWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [inputMode, setInputMode] = useState<"type" | "handwriting">("type");
  const [currentInput, setCurrentInput] = useState("");
  const [answers, setAnswers] = useState<DictationAnswerRecord[]>([]);
  const [isWordSpeaking, setIsWordSpeaking] = useState(false);
  const [speechRepeatCount, setSpeechRepeatCount] = useState<number>(2); // 默认报两遍
  const [speechRate, setSpeechRate] = useState<number>(0.9); // 语速
  const [isPaused, setIsPaused] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number>(0);
  const [showAnswerPreview, setShowAnswerPreview] = useState(false);
  const [completedSessionResult, setCompletedSessionResult] = useState<DictationSession | null>(null);
  const [isWeeklyPractice, setIsWeeklyPractice] = useState(false);
  const [weeklyDayIndex, setWeeklyDayIndex] = useState<number>(-1);

  // 可选年级列表
  const availableGrades = useMemo(() => {
    const list = new Set<string>();
    words.forEach((w) => list.add(w.grade));
    return ["全部年级", ...Array.from(list)];
  }, [words]);

  // 根据当前条件筛选出的词库
  const filteredWords = useMemo(() => {
    return words.filter((w) => {
      const matchSubject = w.subject === selectedSubject;
      const matchGrade = selectedGrade === "全部年级" || w.grade === selectedGrade;
      return matchSubject && matchGrade;
    });
  }, [words, selectedSubject, selectedGrade]);

  const currentWord = currentQueue[currentIndex] || null;

  // 播放当前词语发音
  const playCurrentWordAudio = useCallback(() => {
    if (!currentWord) return;
    setIsWordSpeaking(true);
    let count = 0;

    const playOnce = () => {
      speechService.speak(currentWord.word, {
        lang: currentWord.subject === "chinese" ? "zh-CN" : "en-US",
        rate: speechRate,
        onEnd: () => {
          count++;
          if (count < speechRepeatCount && !isPaused) {
            setTimeout(() => {
              playOnce();
            }, 1200);
          } else {
            setIsWordSpeaking(false);
          }
        },
      });
    };

    playOnce();
  }, [currentWord, speechRate, speechRepeatCount, isPaused]);

  // 单词切换时自动播放发音
  useEffect(() => {
    if (isPlayingSession && currentWord && !isPaused) {
      const timer = setTimeout(() => {
        playCurrentWordAudio();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, isPlayingSession, isPaused, currentWord, playCurrentWordAudio]);

  // 开启听写
  const startSession = (wordList: DictationWord[], title: string, isWeekly = false, dayIdx = -1) => {
    if (wordList.length === 0) {
      alert("请先选择或添加要听写的词汇！");
      return;
    }
    speechService.playBeepTone(587, 0.1);
    setCurrentQueue(wordList);
    setCurrentIndex(0);
    setCurrentInput("");
    setAnswers([]);
    setIsPaused(false);
    setIsPlayingSession(true);
    setSessionStartTime(Date.now());
    setShowAnswerPreview(false);
    setCompletedSessionResult(null);
    setIsWeeklyPractice(isWeekly);
    setWeeklyDayIndex(dayIdx);
  };

  // 判定并结算听写会话
  const finishSession = (finalAnswers: DictationAnswerRecord[]) => {
    setIsPlayingSession(false);
    speechService.stop();

    const correctCount = finalAnswers.filter((a) => a.isCorrect).length;
    const total = finalAnswers.length;
    const score = Math.round((correctCount / (total || 1)) * 100);
    const durationSeconds = Math.round((Date.now() - sessionStartTime) / 1000);

    const sessionResult: DictationSession = {
      id: `session-${Date.now()}`,
      mode: isWeeklyPractice ? "weekly_checkin" : activeTab === "custom" ? "custom" : "textbook",
      title: isWeeklyPractice
        ? `每周打卡听写 (${weeklyCheckin[weeklyDayIndex]?.dayName || "今日"})`
        : activeTab === "custom"
        ? "自选随机抽测"
        : `${selectedSubject === "chinese" ? "语文" : "英语"}同步听写`,
      subject: selectedSubject,
      totalCount: total,
      correctCount,
      score,
      date: new Date().toLocaleDateString("zh-CN"),
      durationSeconds,
      records: finalAnswers,
    };

    onSaveSession(sessionResult);
    setCompletedSessionResult(sessionResult);

    // 如果是每周打卡任务
    if (isWeeklyPractice && weeklyDayIndex >= 0) {
      const errorCount = total - correctCount;
      onUpdateWeeklyCheckin(weeklyDayIndex, score, errorCount);
    }

    // 庆祝音效与彩带
    if (score >= 80) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
      speechService.playSuccessChime();
    } else {
      speechService.playBeepTone(660, 0.2);
    }
  };

  // 提交当前词语并进入下一词
  const handleNextWord = (overrideInput?: string) => {
    if (!currentWord) return;
    const value = overrideInput !== undefined ? overrideInput : currentInput.trim();

    // 宽松比对（忽略大小写及多余标点空格）
    const normalize = (s: string) => s.toLowerCase().replace(/[\s.,/#!$%^&*;:{}=\-_`~()]/g, "");
    const isCorrect = normalize(value) === normalize(currentWord.word);

    const record: DictationAnswerRecord = {
      wordId: currentWord.id,
      word: currentWord.word,
      userInput: value,
      isCorrect,
      timeSpentSeconds: 5,
    };

    if (!isCorrect) {
      onRecordWrongWord(currentWord);
    }

    const updatedAnswers = [...answers, record];
    setAnswers(updatedAnswers);
    setCurrentInput("");
    setShowAnswerPreview(false);

    if (currentIndex + 1 < currentQueue.length) {
      setCurrentIndex((prev) => prev + 1);
      speechService.playBeepTone(isCorrect ? 880 : 440, 0.1);
    } else {
      // 听写完成
      finishSession(updatedAnswers);
    }
  };

  // 提交新建自定义生词
  const handleAddNewWordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWordText.trim()) return;

    onAddCustomWord({
      word: newWordText.trim(),
      pinyinOrPhonetic: newWordPinyin.trim() || undefined,
      definition: newWordDef.trim() || undefined,
      grade: newWordGrade,
      subject: newWordSubject,
      isCustom: true,
      lesson: "自定义生词本",
      tags: ["自定义"],
    });

    setNewWordText("");
    setNewWordPinyin("");
    setNewWordDef("");
    setIsAddWordModalOpen(false);
  };

  // 全选/取消全选
  const handleToggleSelectAllCustom = () => {
    if (selectedCustomWordIds.length === filteredWords.length) {
      setSelectedCustomWordIds([]);
    } else {
      setSelectedCustomWordIds(filteredWords.map((w) => w.id));
    }
  };

  // 开始自选随机抽测
  const handleStartCustomRandomSession = () => {
    let pool = filteredWords;
    if (selectedCustomWordIds.length > 0) {
      pool = filteredWords.filter((w) => selectedCustomWordIds.includes(w.id));
    }
    if (pool.length === 0) {
      alert("词库中没有符合条件的词汇，请先添加！");
      return;
    }
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    const countToPick = Math.min(randomCount, shuffled.length);
    const selected = shuffled.slice(0, countToPick);
    startSession(selected, "自选词库随机抽测");
  };

  // 每周统计计算
  const weeklyStats = useMemo(() => {
    const totalDays = weeklyCheckin.length;
    const completedDays = weeklyCheckin.filter((d) => d.status === "completed").length;
    const totalErrors = weeklyCheckin.reduce((acc, cur) => acc + (cur.errorCount || 0), 0);
    const avgScore =
      completedDays > 0
        ? Math.round(
            weeklyCheckin
              .filter((d) => d.score !== undefined)
              .reduce((acc, cur) => acc + (cur.score || 0), 0) / completedDays
          )
        : 0;

    return {
      totalDays,
      completedDays,
      totalErrors,
      avgScore,
      rate: Math.round((completedDays / totalDays) * 100),
    };
  }, [weeklyCheckin]);

  return (
    <div className="flex flex-col gap-4 pb-12">
      {/* 模块顶部导航栏 */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              听
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">AI 智能中英文听写</h2>
              <p className="text-[11px] text-slate-500">双语标准朗读 · 米字格书写 · 错题归集</p>
            </div>
          </div>
          <span className="text-[10px] font-medium bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200/50">
            真人标准音
          </span>
        </div>

        {/* 听写模式切换 */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-medium text-slate-600">
          <button
            id="tab-mode-textbook"
            type="button"
            onClick={() => {
              setActiveTab("textbook");
              setIsPlayingSession(false);
            }}
            className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "textbook"
                ? "bg-white text-emerald-700 shadow-xs font-semibold"
                : "hover:text-slate-900"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>同步教材</span>
          </button>
          <button
            id="tab-mode-custom"
            type="button"
            onClick={() => {
              setActiveTab("custom");
              setIsPlayingSession(false);
            }}
            className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "custom"
                ? "bg-white text-emerald-700 shadow-xs font-semibold"
                : "hover:text-slate-900"
            }`}
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span>自选抽测</span>
          </button>
          <button
            id="tab-mode-calendar"
            type="button"
            onClick={() => {
              setActiveTab("calendar");
              setIsPlayingSession(false);
            }}
            className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "calendar"
                ? "bg-white text-emerald-700 shadow-xs font-semibold"
                : "hover:text-slate-900"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>打卡日历</span>
          </button>
        </div>
      </div>

      {/* 正在进行听写界面 */}
      {isPlayingSession && currentWord ? (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-emerald-100 flex flex-col gap-4 animate-in fade-in duration-200">
          {/* 会话进度栏 */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/60">
                第 {currentIndex + 1} / {currentQueue.length} 词
              </span>
              <span className="text-xs text-slate-500 font-medium">
                {currentWord.lesson || currentWord.grade}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsPaused(!isPaused)}
                className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 text-xs flex items-center gap-1 cursor-pointer"
                title={isPaused ? "继续播报" : "暂停"}
              >
                {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                <span className="text-[11px]">{isPaused ? "继续" : "暂停"}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirm("确定要提前结束本次听写吗？已完成的词语将计入成绩。")) {
                    finishSession(answers);
                  }
                }}
                className="text-[11px] text-rose-500 hover:bg-rose-50 px-2 py-1 rounded-lg transition-colors cursor-pointer"
              >
                交卷结算
              </button>
            </div>
          </div>

          {/* 核心听音播放区 */}
          <div className="bg-gradient-to-b from-emerald-50/70 to-teal-50/40 rounded-2xl p-5 flex flex-col items-center justify-center text-center border border-emerald-100/80">
            <div className="relative mb-3">
              <button
                id="btn-play-speech"
                type="button"
                onClick={playCurrentWordAudio}
                disabled={isWordSpeaking}
                className={`w-16 h-16 rounded-full flex items-center justify-center shadow-md transition-all cursor-pointer ${
                  isWordSpeaking
                    ? "bg-emerald-500 text-white scale-105 ring-4 ring-emerald-200 animate-pulse"
                    : "bg-white text-emerald-600 hover:bg-emerald-600 hover:text-white"
                }`}
                title="点击重听发音"
              >
                <Volume2 className="w-8 h-8" />
              </button>
              {isWordSpeaking && (
                <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-medium bg-emerald-600 text-white px-2 py-0.2 rounded-full whitespace-nowrap shadow-xs">
                  AI 正在朗读...
                </span>
              )}
            </div>

            <div className="space-y-1">
              <div className="text-xs font-semibold text-emerald-800">
                点击上方喇叭重听（已自动播报 {speechRepeatCount} 遍）
              </div>
              <div className="text-xs text-slate-500">
                {currentWord.pinyinOrPhonetic && (
                  <span className="font-mono text-emerald-600 font-medium">
                    {currentWord.pinyinOrPhonetic}
                  </span>
                )}
                {currentWord.definition && (
                  <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                    释义提示：{currentWord.definition}
                  </p>
                )}
              </div>
            </div>

            {/* 播报设置控制 */}
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-emerald-100/60 text-[11px] text-slate-500">
              <div className="flex items-center gap-1">
                <span>循环：</span>
                {[1, 2, 3].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setSpeechRepeatCount(cnt)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                      speechRepeatCount === cnt
                        ? "bg-emerald-600 text-white"
                        : "bg-white text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {cnt}遍
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1">
                <span>语速：</span>
                {[0.8, 1.0].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setSpeechRate(r)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                      speechRate === r
                        ? "bg-emerald-600 text-white"
                        : "bg-white text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {r}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 输入模式切换 (打字 vs 米字格手写) */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-800">作答模式</span>
              <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setInputMode("type")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    inputMode === "type" ? "bg-white text-slate-900 shadow-xs font-medium" : "text-slate-500"
                  }`}
                >
                  <Keyboard className="w-3 h-3" />
                  <span>键盘输入</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode("handwriting")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    inputMode === "handwriting" ? "bg-white text-slate-900 shadow-xs font-medium" : "text-slate-500"
                  }`}
                >
                  <PenLine className="w-3 h-3" />
                  <span>米字格手写</span>
                </button>
              </div>
            </div>

            {/* 看答案提示 */}
            <button
              type="button"
              onClick={() => setShowAnswerPreview(!showAnswerPreview)}
              className="text-xs text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer"
            >
              {showAnswerPreview ? "隐藏答案" : "偷看答案"}
            </button>
          </div>

          {/* 偷看答案卡片 */}
          {showAnswerPreview && (
            <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3 text-xs text-amber-900 animate-in fade-in">
              <div className="font-bold mb-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>词语参考答案</span>
              </div>
              <div className="text-base font-bold text-amber-700 tracking-wide font-mono">
                {currentWord.word}
              </div>
              <div className="text-[11px] text-amber-800/80 mt-1">
                {currentWord.pinyinOrPhonetic} · {currentWord.definition}
              </div>
            </div>
          )}

          {/* 用户书写/输入区 */}
          {inputMode === "type" ? (
            <div className="space-y-2">
              <input
                id="input-dictation-text"
                type="text"
                autoFocus
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleNextWord();
                  }
                }}
                placeholder="请输入听到的生词或单词并回车确认..."
                className="w-full text-base font-medium px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <HandwritingCanvas height={160} />
              <input
                type="text"
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                placeholder="手写练习后，可在此快速敲入文本以核对正误..."
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white"
              />
            </div>
          )}

          {/* 底部确认操作 */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={playCurrentWordAudio}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>重听</span>
            </button>
            <button
              id="btn-submit-dictation-word"
              type="button"
              onClick={() => handleNextWord()}
              className="flex-[2] py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <span>{currentIndex + 1 === currentQueue.length ? "完成并交卷" : "下一个词"}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : null}

      {/* 听写完成结果卡片 */}
      {completedSessionResult && !isPlayingSession && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-emerald-100 flex flex-col gap-4 animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">听写成绩单</h3>
                <p className="text-[11px] text-slate-500">{completedSessionResult.title}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-emerald-600">{completedSessionResult.score}</span>
              <span className="text-xs text-emerald-600 font-bold"> 分</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-slate-50 p-2.5 rounded-xl">
              <span className="text-slate-400 text-[10px] block">总词数</span>
              <span className="font-bold text-slate-700 text-sm">{completedSessionResult.totalCount} 词</span>
            </div>
            <div className="bg-emerald-50 p-2.5 rounded-xl">
              <span className="text-emerald-600 text-[10px] block">正确率</span>
              <span className="font-bold text-emerald-700 text-sm">
                {Math.round((completedSessionResult.correctCount / completedSessionResult.totalCount) * 100)}%
              </span>
            </div>
            <div className="bg-rose-50 p-2.5 rounded-xl">
              <span className="text-rose-500 text-[10px] block">错词数</span>
              <span className="font-bold text-rose-600 text-sm">
                {completedSessionResult.totalCount - completedSessionResult.correctCount} 词
              </span>
            </div>
          </div>

          {/* 明细清单 */}
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            <div className="text-[11px] font-semibold text-slate-600 px-1">本轮词语正误明细</div>
            {completedSessionResult.records.map((r, idx) => (
              <div
                key={idx}
                className={`flex items-center justify-between p-2 rounded-xl text-xs border ${
                  r.isCorrect ? "bg-emerald-50/40 border-emerald-100" : "bg-rose-50/40 border-rose-100"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      r.isCorrect ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
                    }`}
                  >
                    {r.isCorrect ? "✓" : "✗"}
                  </span>
                  <span className="font-semibold text-slate-800">{r.word}</span>
                </div>
                <div className="text-right text-[11px]">
                  {r.isCorrect ? (
                    <span className="text-emerald-700 font-medium">回答正确</span>
                  ) : (
                    <div className="flex items-center gap-1 text-rose-600">
                      <span>你的输入:</span>
                      <span className="line-through font-mono">{r.userInput || "(未填写)"}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => setCompletedSessionResult(null)}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium text-xs hover:bg-slate-50 transition-colors cursor-pointer"
            >
              返回生词列表
            </button>
            <button
              type="button"
              onClick={() => {
                const wrongWords = currentQueue.filter((w) =>
                  completedSessionResult.records.some((r) => r.wordId === w.id && !r.isCorrect)
                );
                if (wrongWords.length > 0) {
                  startSession(wrongWords, "错题强化听写");
                } else {
                  startSession(currentQueue, "再测一遍");
                }
              }}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer"
            >
              {completedSessionResult.totalCount === completedSessionResult.correctCount
                ? "再测一遍"
                : "复练错词"}
            </button>
          </div>
        </div>
      )}

      {/* Tab 1: 同步教材词库列表 */}
      {activeTab === "textbook" && !isPlayingSession && (
        <div className="flex flex-col gap-3">
          {/* 科目与年级筛选 */}
          <div className="bg-white rounded-2xl p-3.5 shadow-xs border border-slate-100 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                <button
                  id="filter-subject-chinese"
                  type="button"
                  onClick={() => setSelectedSubject("chinese")}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    selectedSubject === "chinese"
                      ? "bg-white text-emerald-700 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  语文词汇
                </button>
                <button
                  id="filter-subject-english"
                  type="button"
                  onClick={() => setSelectedSubject("english")}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    selectedSubject === "english"
                      ? "bg-white text-emerald-700 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  英语单词
                </button>
              </div>

              <select
                id="select-grade"
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {availableGrades.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            {/* 开始听写按钮 */}
            <div className="flex items-center justify-between pt-1">
              <div className="text-xs text-slate-500">
                当前筛选生词：{" "}
                <span className="font-bold text-emerald-700">{filteredWords.length}</span> 个
              </div>
              <button
                id="btn-start-textbook-dictation"
                type="button"
                onClick={() =>
                  startSession(
                    filteredWords,
                    `${selectedSubject === "chinese" ? "语文" : "英语"}同步听写`
                  )
                }
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>开始听写 ({filteredWords.length} 词)</span>
              </button>
            </div>
          </div>

          {/* 生词卡片列表展示 */}
          <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-100 space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs font-semibold text-slate-700">
              <span>教材词汇预览 ({filteredWords.length})</span>
              <span className="text-[11px] text-slate-400 font-normal">点击喇叭可单词试听</span>
            </div>

            <div className="grid grid-cols-1 gap-2 max-h-72 overflow-y-auto pr-1">
              {filteredWords.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/80 hover:bg-emerald-50/50 border border-slate-100 transition-colors group"
                >
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() =>
                        speechService.speak(item.word, {
                          lang: item.subject === "chinese" ? "zh-CN" : "en-US",
                        })
                      }
                      className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 group-hover:text-emerald-600 group-hover:border-emerald-300 transition-colors shadow-2xs cursor-pointer"
                      title="试听发音"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs tracking-wide">
                          {item.word}
                        </span>
                        {item.pinyinOrPhonetic && (
                          <span className="text-[10px] font-mono text-emerald-600 font-medium">
                            {item.pinyinOrPhonetic}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 line-clamp-1">
                        {item.definition || item.exampleSentence}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-100 font-medium whitespace-nowrap">
                    {item.lesson ? item.lesson.slice(0, 10) : item.grade}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: 自选抽测模式 */}
      {activeTab === "custom" && !isPlayingSession && (
        <div className="flex flex-col gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-900">自主词库与抽测</h3>
                <p className="text-[10px] text-slate-400">勾选复习或点击右上角录入家庭自定义生词</p>
              </div>
              <button
                id="btn-open-add-word-modal"
                type="button"
                onClick={() => setIsAddWordModalOpen(true)}
                className="flex items-center gap-1 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200/60 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>录入新词</span>
              </button>
            </div>

            {/* 抽测数量控制 */}
            <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl text-xs">
              <div className="flex items-center gap-2 text-slate-600">
                <span>抽取题量:</span>
                {[5, 10, 15].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setRandomCount(cnt)}
                    className={`px-2 py-0.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      randomCount === cnt
                        ? "bg-emerald-600 text-white shadow-2xs"
                        : "bg-white text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {cnt}题
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={handleToggleSelectAllCustom}
                className="text-[11px] text-emerald-600 hover:underline cursor-pointer"
              >
                {selectedCustomWordIds.length === filteredWords.length ? "取消全选" : "全选当前词库"}
              </button>
            </div>

            {/* 可选词汇列表 */}
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {filteredWords.map((w) => {
                const isChecked = selectedCustomWordIds.includes(w.id);
                return (
                  <label
                    key={w.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                      isChecked
                        ? "bg-emerald-50/50 border-emerald-200 text-emerald-900"
                        : "bg-white border-slate-100 hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            setSelectedCustomWordIds(selectedCustomWordIds.filter((id) => id !== w.id));
                          } else {
                            setSelectedCustomWordIds([...selectedCustomWordIds, w.id]);
                          }
                        }}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="font-bold">{w.word}</span>
                      {w.pinyinOrPhonetic && (
                        <span className="text-[10px] font-mono text-emerald-600">
                          {w.pinyinOrPhonetic}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                      <span>{w.definition ? w.definition.slice(0, 12) : w.grade}</span>
                      {w.isCustom && (
                        <span className="bg-amber-100 text-amber-800 px-1 rounded text-[9px]">
                          自录
                        </span>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>

            {/* 启动随机听写 */}
            <button
              id="btn-start-custom-dictation"
              type="button"
              onClick={handleStartCustomRandomSession}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Shuffle className="w-4 h-4" />
              <span>
                随机抽取已选词汇 (已选 {selectedCustomWordIds.length || filteredWords.length} 词，测{" "}
                {Math.min(randomCount, selectedCustomWordIds.length || filteredWords.length)} 词)
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 3: 每周打卡日历 */}
      {activeTab === "calendar" && !isPlayingSession && (
        <div className="flex flex-col gap-3">
          {/* 打卡进度看板 */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-4 text-white shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-200">
                  Weekly Check-in Calendar
                </span>
                <h3 className="text-base font-bold">每周听写打卡计划</h3>
              </div>
              <div className="bg-white/20 backdrop-blur-xs px-2.5 py-1 rounded-xl text-xs font-semibold">
                打卡达成率 {weeklyStats.rate}%
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-white/10 backdrop-blur-xs p-2 rounded-xl">
                <span className="text-emerald-100 text-[10px] block">已连续完成</span>
                <span className="text-lg font-black">{weeklyStats.completedDays} / 7 天</span>
              </div>
              <div className="bg-white/10 backdrop-blur-xs p-2 rounded-xl">
                <span className="text-emerald-100 text-[10px] block">平均得分</span>
                <span className="text-lg font-black">{weeklyStats.avgScore} 分</span>
              </div>
              <div className="bg-white/10 backdrop-blur-xs p-2 rounded-xl">
                <span className="text-emerald-100 text-[10px] block">累计错题</span>
                <span className="text-lg font-black">{weeklyStats.totalErrors} 个</span>
              </div>
            </div>
          </div>

          {/* 7日打卡格子 */}
          <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-100 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-700">
              <div className="font-bold flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                <span>本周学习日程 (周一至周日)</span>
              </div>
              <span className="text-[10px] text-slate-400">每日 5~8 词</span>
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {weeklyCheckin.map((item) => {
                const isDone = item.status === "completed";
                const isToday = item.isToday;

                return (
                  <div
                    key={item.dayOfWeek}
                    className={`flex flex-col items-center justify-between p-2 rounded-xl border text-center transition-all min-h-[96px] ${
                      isToday
                        ? "ring-2 ring-emerald-500 bg-emerald-50/40 border-emerald-300"
                        : isDone
                        ? "bg-slate-50/70 border-slate-200"
                        : "bg-white border-slate-100"
                    }`}
                  >
                    <div>
                      <span className="text-[10px] font-semibold text-slate-500 block">
                        {item.dayName}
                      </span>
                      <span className="text-[9px] text-slate-400 block">{item.dateStr}</span>
                    </div>

                    <div className="my-1">
                      {isDone ? (
                        <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs shadow-xs mx-auto">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      ) : isToday ? (
                        <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold mx-auto animate-bounce">
                          今
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-[10px] mx-auto">
                          待
                        </div>
                      )}
                    </div>

                    <div>
                      {isDone ? (
                        <span className="text-[10px] font-bold text-emerald-600 block">
                          {item.score}分
                        </span>
                      ) : (
                        <span className="text-[9px] text-slate-400 block">
                          {item.assignedWordIds.length}词
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 今日打卡快捷入口 */}
            {(() => {
              const todayTask = weeklyCheckin.find((d) => d.isToday);
              const todayIdx = weeklyCheckin.findIndex((d) => d.isToday);
              if (!todayTask) return null;
              const isDone = todayTask.status === "completed";
              const taskWords = words.filter((w) => todayTask.assignedWordIds.includes(w.id));

              return (
                <div className="mt-3 p-3.5 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-emerald-950">今日听写打卡任务</span>
                      {isDone ? (
                        <span className="text-[10px] font-semibold bg-emerald-600 text-white px-1.5 py-0.2 rounded-full">
                          已完成 {todayTask.score}分
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold bg-amber-500 text-white px-1.5 py-0.2 rounded-full">
                          待打卡
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      今日推荐巩固词汇 {taskWords.length} 个（点击立即开始）
                    </p>
                  </div>
                  <button
                    id="btn-today-checkin-practice"
                    type="button"
                    onClick={() => startSession(taskWords, "今日打卡听写", true, todayIdx)}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <span>{isDone ? "再次挑战" : "立即打卡"}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* 录入新词弹窗 */}
      {isAddWordModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-xl border border-slate-100 animate-in zoom-in-95">
            <h3 className="text-sm font-bold text-slate-900 mb-1">录入生词 / 单词</h3>
            <p className="text-[11px] text-slate-400 mb-3">支持添加自选字词，方便针对性听写练习</p>

            <form onSubmit={handleAddNewWordSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">生词或单词文本 *</label>
                <input
                  type="text"
                  required
                  value={newWordText}
                  onChange={(e) => setNewWordText(e.target.value)}
                  placeholder="例如：绚烂 或 extraordinary"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">所属学科</label>
                  <select
                    value={newWordSubject}
                    onChange={(e) => setNewWordSubject(e.target.value as any)}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="chinese">语文</option>
                    <option value="english">英语</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">年级标签</label>
                  <input
                    type="text"
                    value={newWordGrade}
                    onChange={(e) => setNewWordGrade(e.target.value)}
                    placeholder="如：小学四年级"
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">拼音或音标 (选填)</label>
                <input
                  type="text"
                  value={newWordPinyin}
                  onChange={(e) => setNewWordPinyin(e.target.value)}
                  placeholder="如：xuàn làn 或 /ˈɔːdnri/"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">释义 (选填)</label>
                <input
                  type="text"
                  value={newWordDef}
                  onChange={(e) => setNewWordDef(e.target.value)}
                  placeholder="如：灿烂美丽 / adj. 非凡的"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddWordModalOpen(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 font-medium cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 cursor-pointer"
                >
                  保存词语
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
