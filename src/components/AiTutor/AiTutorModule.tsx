/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Send,
  History,
  Bot,
  User,
  GraduationCap,
  Lightbulb,
  Trash2,
  Loader2,
} from "lucide-react";
import { TutorMessage, QuestionHistoryItem } from "../../types";

interface AiTutorModuleProps {
  historyItems: QuestionHistoryItem[];
  onSaveHistoryItem: (item: QuestionHistoryItem) => void;
  onClearHistory: () => void;
}

export const AiTutorModule: React.FC<AiTutorModuleProps> = ({
  historyItems,
  onSaveHistoryItem,
  onClearHistory,
}) => {
  const [messages, setMessages] = useState<TutorMessage[]>([
    {
      id: "welcome-msg",
      sender: "ai",
      text: `你好！我是你的 **AI 智能学习辅导老师** 🎓\n\n无论遇到数学几何、应用题、语文阅读理解、英语语法还是理化实验题，我都会用**启发式**方式，一步步引导你发现规律、理清解题思路，而不是直接甩答案。\n\n请在下方输入你感到困惑的题目或概念，我们一起来攻克它！`,
      timestamp: "刚刚",
    },
  ]);

  const [inputQuery, setInputQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("数学");
  const [selectedGrade, setSelectedGrade] = useState("初中 (七至九年级)");
  const [isLoading, setIsLoading] = useState(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // 预设高频典型问题
  const presetQuestions = [
    {
      subject: "数学",
      title: "相遇应用题",
      text: "甲乙两地相距 360km，客车速度 40km/h，货车速度 50km/h，两车同时相对开出，几小时后相遇？请用方程与算术两种思路引导我。",
    },
    {
      subject: "数学",
      title: "勾股定理应用",
      text: "直角梯形 ABCD 中，AB=8, BC=10, AD垂直于AB。如何求未知腰长与面积？",
    },
    {
      subject: "语文",
      title: "修辞手法分析",
      text: "“油蛉在这里低唱，蟋蟀们在这里弹琴。” 这句话运用了什么修辞手法？在表达效果上有什么妙处？",
    },
    {
      subject: "英语",
      title: "时态与易混动词辨析",
      text: "“I have been to Beijing” 与 “I went to Beijing” 有什么本质区别？buy 与 have had 的用法差异是什么？",
    },
    {
      subject: "物理",
      title: "二力平衡与摩擦力",
      text: "木块在水平拉力 5N 作用下沿水平桌面做匀速直线运动，受到的滑动摩擦力是多大？如果拉力增大到 8N，摩擦力会改变吗？",
    },
  ];

  // 发送问题
  const handleSendMessage = async (textToSend?: string) => {
    const questionText = textToSend || inputQuery.trim();
    if (!questionText || isLoading) return;

    const userMessageId = `user-${Date.now()}`;
    const userMsg: TutorMessage = {
      id: userMessageId,
      sender: "user",
      text: questionText,
      timestamp: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
      subject: selectedSubject,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai-tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: questionText,
          subject: selectedSubject,
          gradeLevel: selectedGrade,
          history: messages.slice(-4).map((m) => ({
            role: m.sender === "user" ? "user" : "model",
            text: m.text,
          })),
        }),
      });

      const data = await response.json();
      const aiReplyText = data.content || "很抱歉，生成解析时遇到了短暂网络波动，请稍后再试。";

      const aiMsg: TutorMessage = {
        id: `ai-${Date.now()}`,
        sender: "ai",
        text: aiReplyText,
        timestamp: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
        subject: selectedSubject,
        isFallback: data.isFallback,
      };

      const updatedMessages = [...messages, userMsg, aiMsg];
      setMessages(updatedMessages);

      // 归档至答疑历史
      const historyItem: QuestionHistoryItem = {
        id: `history-${Date.now()}`,
        question: questionText,
        subject: selectedSubject,
        gradeLevel: selectedGrade,
        summary: questionText.slice(0, 24) + "...",
        messages: [userMsg, aiMsg],
        createdAt: new Date().toLocaleDateString("zh-CN") + " " + aiMsg.timestamp,
      };
      onSaveHistoryItem(historyItem);
    } catch (err) {
      console.error("AI Tutor request error:", err);
      const errorMsg: TutorMessage = {
        id: `ai-err-${Date.now()}`,
        sender: "ai",
        text: "网络连接异常，请检查本地网络或稍后重试。",
        timestamp: "出错了",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // 格式化渲染 AI 输出文本（强化分段与重点）
  const renderFormattedText = (content: string) => {
    const lines = content.split("\n");
    return lines.map((line, idx) => {
      // 步骤高亮块
      if (
        line.includes("【审题与关键信息】") ||
        line.includes("【核心思路启发】") ||
        line.includes("【分步引导解题】") ||
        line.includes("【思维小结与易错避坑】") ||
        line.includes("【举一反三巩固练习】")
      ) {
        return (
          <div
            key={idx}
            className="my-3 p-2 bg-emerald-50/80 border-l-4 border-emerald-500 rounded-r-lg font-bold text-emerald-950 text-xs tracking-wide"
          >
            {line.replace(/###/g, "").trim()}
          </div>
        );
      }
      if (line.startsWith("###")) {
        return (
          <div key={idx} className="font-bold text-slate-900 text-xs mt-2 mb-1">
            {line.replace(/###/g, "").trim()}
          </div>
        );
      }
      if (line.startsWith("- ") || line.startsWith("* ")) {
        return (
          <div key={idx} className="flex items-start gap-1.5 my-1 text-xs text-slate-700">
            <span className="text-emerald-500 font-bold leading-none mt-1">•</span>
            <span>{line.substring(2)}</span>
          </div>
        );
      }
      if (line.trim() === "---") {
        return <hr key={idx} className="my-2 border-slate-100" />;
      }
      if (!line.trim()) {
        return <div key={idx} className="h-1.5" />;
      }
      return (
        <p key={idx} className="text-xs text-slate-800 leading-relaxed my-0.5">
          {line}
        </p>
      );
    });
  };

  return (
    <div className="flex flex-col gap-3 pb-12">
      {/* 模块顶部头部 */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center shadow-xs">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <span>AI 启发式答疑辅导</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-medium px-1.5 py-0.2 rounded-full">
                Gemini 3.8
              </span>
            </h2>
            <p className="text-[11px] text-slate-500">拆解题意 · 启发思考 · 绝不直接报答案</p>
          </div>
        </div>

        {/* 历史提问抽屉按钮 */}
        <button
          id="btn-open-tutor-history"
          type="button"
          onClick={() => setShowHistoryDrawer(true)}
          className="flex items-center gap-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
        >
          <History className="w-3.5 h-3.5" />
          <span>问答记录</span>
          {historyItems.length > 0 && (
            <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center font-bold">
              {historyItems.length}
            </span>
          )}
        </button>
      </div>

      {/* 学科与学段选择栏 */}
      <div className="bg-white rounded-2xl px-4 py-2.5 shadow-xs border border-slate-100 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1 overflow-x-auto py-0.5 scrollbar-none">
          <span className="text-slate-400 text-[11px] whitespace-nowrap">学科:</span>
          {["数学", "语文", "英语", "物理", "化学", "生物"].map((sub) => (
            <button
              key={sub}
              type="button"
              onClick={() => setSelectedSubject(sub)}
              className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-all text-xs cursor-pointer ${
                selectedSubject === sub
                  ? "bg-emerald-600 text-white shadow-2xs font-semibold"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {sub}
            </button>
          ))}
        </div>

        <select
          value={selectedGrade}
          onChange={(e) => setSelectedGrade(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 ml-2"
        >
          <option value="小学低段 (1-3年级)">小学低段 (1-3年级)</option>
          <option value="小学高段 (4-6年级)">小学高段 (4-6年级)</option>
          <option value="初中 (七至九年级)">初中 (七至九年级)</option>
          <option value="高中 (高一至高三)">高中 (高一至高三)</option>
        </select>
      </div>

      {/* 对话消息展示区 */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-100 min-h-[380px] max-h-[500px] overflow-y-auto flex flex-col gap-3">
        {messages.map((msg) => {
          const isAi = msg.sender === "ai";
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 ${isAi ? "justify-start" : "justify-end"}`}
            >
              {isAi && (
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <Bot className="w-4 h-4" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-2xs ${
                  isAi
                    ? "bg-slate-50/90 text-slate-800 border border-slate-200/70 rounded-tl-xs"
                    : "bg-emerald-600 text-white rounded-tr-xs"
                }`}
              >
                {isAi ? (
                  <div>{renderFormattedText(msg.text)}</div>
                ) : (
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                )}
                <div
                  className={`mt-1.5 flex items-center justify-between text-[10px] ${
                    isAi ? "text-slate-400" : "text-emerald-200"
                  }`}
                >
                  <span>{msg.timestamp}</span>
                  {msg.isFallback && (
                    <span className="text-amber-600 font-medium">备用启发引擎</span>
                  )}
                </div>
              </div>
              {!isAi && (
                <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-start gap-2.5 justify-start">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 shadow-2xs animate-pulse">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl rounded-tl-xs px-4 py-3 text-xs text-slate-500 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              <span>AI 老师正在认真拆解题目考点...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 快捷示例问题条 */}
      <div className="bg-white rounded-2xl p-3 shadow-xs border border-slate-100 space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <span className="font-semibold text-slate-700 flex items-center gap-1">
            <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
            <span>点选典型题目体验启发辅导</span>
          </span>
          <span className="text-[10px] text-slate-400">点击自动填充并发送</span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {presetQuestions
            .filter((q) => q.subject === selectedSubject || selectedSubject === "综合")
            .concat(presetQuestions.filter((q) => q.subject !== selectedSubject))
            .slice(0, 4)
            .map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(item.text)}
                className="shrink-0 max-w-[220px] text-left p-2 rounded-xl bg-slate-50 hover:bg-emerald-50/70 border border-slate-100 hover:border-emerald-200 transition-all group cursor-pointer"
              >
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded block w-fit mb-1">
                  {item.subject} · {item.title}
                </span>
                <p className="text-[11px] text-slate-600 line-clamp-2 leading-tight">
                  {item.text}
                </p>
              </button>
            ))}
        </div>
      </div>

      {/* 输入提问栏 */}
      <div className="bg-white rounded-2xl p-3 shadow-xs border border-slate-100 flex items-center gap-2">
        <textarea
          id="input-tutor-query"
          rows={2}
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          placeholder={`向 AI 老师请教 ${selectedSubject} 题目...`}
          className="flex-1 text-xs font-normal p-2 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none transition-all"
        />
        <button
          id="btn-send-tutor-message"
          type="button"
          disabled={!inputQuery.trim() || isLoading}
          onClick={() => handleSendMessage()}
          className="w-11 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white flex items-center justify-center transition-all shadow-xs shrink-0 cursor-pointer"
          title="发送提问"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      {/* 历史记录抽屉 */}
      {showHistoryDrawer && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-sm bg-white h-full shadow-2xl flex flex-col p-4 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">答疑历史记录</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryDrawer(false)}
                className="text-xs text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                关闭
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              {historyItems.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-slate-400 text-xs">
                  <p>暂无历史问答记录</p>
                  <span className="text-[10px] mt-1 text-slate-400">向老师提问后将自动留存</span>
                </div>
              ) : (
                historyItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setMessages(item.messages);
                      setShowHistoryDrawer(false);
                    }}
                    className="p-3 rounded-xl bg-slate-50 hover:bg-emerald-50 border border-slate-100 hover:border-emerald-200 cursor-pointer transition-all space-y-1"
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                        {item.subject}
                      </span>
                      <span className="text-slate-400">{item.createdAt}</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-800 line-clamp-2">
                      {item.question}
                    </p>
                  </div>
                ))
              )}
            </div>

            {historyItems.length > 0 && (
              <div className="pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("确定清空全部答疑历史吗？")) {
                      onClearHistory();
                    }
                  }}
                  className="w-full py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>清空历史记录</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
