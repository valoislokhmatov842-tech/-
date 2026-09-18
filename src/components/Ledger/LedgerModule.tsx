/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  TrendingUp,
  BookMarked,
  CheckCircle2,
  Play,
  RotateCcw,
  History,
  BrainCircuit,
} from "lucide-react";
import {
  DictationSession,
  WeeklyCheckinDay,
  HomeworkItem,
  EbbinghausTask,
  WrongWordItem,
  DictationWord,
} from "../../types";
import { speechService } from "../../utils/speech";

interface LedgerModuleProps {
  sessions: DictationSession[];
  weeklyCheckin: WeeklyCheckinDay[];
  homeworkList: HomeworkItem[];
  ebbinghausTasks: EbbinghausTask[];
  wrongWords: WrongWordItem[];
  onStartWrongPractice: (words: DictationWord[]) => void;
  allWords: DictationWord[];
}

export const LedgerModule: React.FC<LedgerModuleProps> = ({
  sessions,
  weeklyCheckin,
  homeworkList,
  ebbinghausTasks,
  wrongWords,
  onStartWrongPractice,
  allWords,
}) => {
  const [activeLedgerTab, setActiveLedgerTab] = useState<"overview" | "wrongbook" | "history">(
    "overview"
  );

  // 核心数据汇总
  const totalDictatedWords = sessions.reduce((acc, s) => acc + s.totalCount, 0);
  const totalHomeworkDone = homeworkList.filter((h) => h.completed).length;
  const completedCheckins = weeklyCheckin.filter((d) => d.status === "completed").length;
  const totalEbbinghausReviews = ebbinghausTasks.reduce((acc, t) => acc + t.totalReviewsDone, 0);

  // 错题重练触发
  const handleStartReviewingWrongWords = () => {
    const wrongDictationWords = allWords.filter((w) =>
      wrongWords.some((ww) => ww.word.toLowerCase() === w.word.toLowerCase())
    );
    if (wrongDictationWords.length === 0) {
      alert("太棒了！当前错题集已全部清空，暂无需要复练的词汇。");
      return;
    }
    onStartWrongPractice(wrongDictationWords);
  };

  return (
    <div className="flex flex-col gap-4 pb-12">
      {/* 模块顶部导航 */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              账
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">学情账本与错题集</h2>
              <p className="text-[11px] text-slate-500">成长轨迹 · 易错字词归集 · 记忆留存率</p>
            </div>
          </div>
          <span className="text-[10px] font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200/60">
            多维统计
          </span>
        </div>

        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-medium text-slate-600">
          <button
            id="tab-ledger-overview"
            type="button"
            onClick={() => setActiveLedgerTab("overview")}
            className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeLedgerTab === "overview"
                ? "bg-white text-blue-700 shadow-xs font-semibold"
                : "hover:text-slate-900"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>学情总览</span>
          </button>
          <button
            id="tab-ledger-wrongbook"
            type="button"
            onClick={() => setActiveLedgerTab("wrongbook")}
            className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeLedgerTab === "wrongbook"
                ? "bg-white text-blue-700 shadow-xs font-semibold"
                : "hover:text-slate-900"
            }`}
          >
            <BookMarked className="w-3.5 h-3.5" />
            <span>生词错题本</span>
            {wrongWords.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] flex items-center justify-center font-bold">
                {wrongWords.length}
              </span>
            )}
          </button>
          <button
            id="tab-ledger-history"
            type="button"
            onClick={() => setActiveLedgerTab("history")}
            className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeLedgerTab === "history"
                ? "bg-white text-blue-700 shadow-xs font-semibold"
                : "hover:text-slate-900"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>听写历程</span>
          </button>
        </div>
      </div>

      {/* Tab 1: 学情总览 */}
      {activeLedgerTab === "overview" && (
        <div className="flex flex-col gap-3">
          {/* 四大关键指标网格 */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm font-bold">
                听
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">累计听写生词</span>
                <span className="text-xl font-black text-slate-800">{totalDictatedWords}</span>
                <span className="text-[11px] text-slate-500 ml-1">词</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center text-sm font-bold">
                忆
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">艾宾浩斯复习</span>
                <span className="text-xl font-black text-slate-800">{totalEbbinghausReviews}</span>
                <span className="text-[11px] text-slate-500 ml-1">次</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-sm font-bold">
                卡
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">本周听写打卡</span>
                <span className="text-xl font-black text-slate-800">{completedCheckins}</span>
                <span className="text-[11px] text-slate-500 ml-1">/ 7 天</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-sm font-bold">
                毕
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">已完成家庭作业</span>
                <span className="text-xl font-black text-slate-800">{totalHomeworkDone}</span>
                <span className="text-[11px] text-slate-500 ml-1">项</span>
              </div>
            </div>
          </div>

          {/* 艾宾浩斯记忆留存率对比 */}
          <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                <BrainCircuit className="w-4 h-4 text-emerald-600" />
                <span>艾宾浩斯记忆曲线强化留存</span>
              </div>
              <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">
                留存率提升 +68%
              </span>
            </div>

            <div className="space-y-2 pt-1 text-xs">
              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-slate-500">不复习 (自然遗忘)：</span>
                  <span className="font-bold text-slate-400">仅存 21%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-400 rounded-full" style={{ width: "21%" }} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-emerald-700 font-medium">
                    按智学宝四节点复习 (10m, 15m, 30m, 1h)：
                  </span>
                  <span className="font-bold text-emerald-600">留存达 89%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full"
                    style={{ width: "89%" }}
                  />
                </div>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 bg-slate-50 p-2 rounded-xl">
              💡 科学依据：根据德国心理学家艾宾浩斯实验，在初次背诵后 10~60
              分钟内立即进行规律唤醒，能将短期记忆转化为稳定长时记忆。
            </p>
          </div>
        </div>
      )}

      {/* Tab 2: 生词错题本 */}
      {activeLedgerTab === "wrongbook" && (
        <div className="flex flex-col gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-900">听写错题收录</h3>
              <p className="text-[10px] text-slate-400">听写错误的字词自动归档，方便专项逐个突破</p>
            </div>
            {wrongWords.length > 0 && (
              <button
                id="btn-practice-all-wrongs"
                type="button"
                onClick={handleStartReviewingWrongWords}
                className="flex items-center gap-1 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>一键攻克错词 ({wrongWords.length})</span>
              </button>
            )}
          </div>

          <div className="space-y-2">
            {wrongWords.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center text-slate-400 text-xs border border-slate-100">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                <p className="font-bold text-slate-700">错题本干干净净！</p>
                <span className="text-[10px] mt-1 block">保持全对好战绩，继续加油！</span>
              </div>
            ) : (
              wrongWords.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl p-3.5 shadow-xs border border-slate-100 hover:border-rose-200 transition-all flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        speechService.speak(item.word, {
                          lang: item.subject === "chinese" ? "zh-CN" : "en-US",
                        })
                      }
                      className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-100 transition-colors cursor-pointer"
                      title="朗读发音"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs">{item.word}</span>
                        {item.pinyinOrPhonetic && (
                          <span className="text-[10px] font-mono text-emerald-600">
                            {item.pinyinOrPhonetic}
                          </span>
                        )}
                        <span className="text-[9px] bg-rose-50 text-rose-600 px-1.5 py-0.2 rounded font-medium">
                          错误 {item.wrongCount} 次
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">{item.definition || "暂无释义"}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">{item.lastWrongDate}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 3: 听写历程 */}
      {activeLedgerTab === "history" && (
        <div className="flex flex-col gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-100">
            <h3 className="text-xs font-bold text-slate-900 mb-2">历史听写成绩单</h3>
            <div className="space-y-2">
              {sessions.length === 0 ? (
                <div className="text-center text-slate-400 text-xs py-6">
                  暂无完成的听写记录，去听写一轮测试看看吧！
                </div>
              ) : (
                sessions.map((s) => (
                  <div
                    key={s.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-800">{s.title}</span>
                        <span className="text-[10px] bg-slate-200 text-slate-600 px-1 rounded">
                          {s.subject === "chinese" ? "语文" : "英语"}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        {s.date} · 总 {s.totalCount} 词 · 对 {s.correctCount} 词
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-base font-black text-emerald-600">{s.score}</span>
                      <span className="text-[10px] font-bold text-emerald-600"> 分</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
