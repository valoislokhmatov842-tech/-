/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { X, Sparkles, BookOpen, BrainCircuit } from "lucide-react";

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-5 max-w-md w-full shadow-2xl border border-slate-100 max-h-[85vh] overflow-y-auto animate-in zoom-in-95 text-xs text-slate-700">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">智学宝 使用指南</h3>
              <p className="text-[10px] text-slate-400">中小学全场景 AI 学习伴侣</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 pt-3">
          {/* 听写功能 */}
          <div className="bg-emerald-50/70 p-3 rounded-2xl border border-emerald-100">
            <div className="flex items-center gap-1.5 font-bold text-emerald-950 mb-1">
              <BookOpen className="w-4 h-4 text-emerald-600" />
              <span>AI 智能生词听写</span>
            </div>
            <ul className="space-y-1 text-[11px] text-emerald-900 list-disc list-inside">
              <li>
                <strong>中英文真人发音：</strong>内置标准中英文双语 TTS 朗读，支持自定义语速与单词重复播报次数。
              </li>
              <li>
                <strong>米字格手写画板：</strong>支持拼音汉字手写轨迹绘制、橡皮擦与一键清空，还原纸笔练习手感。
              </li>
              <li>
                <strong>错题自动归集：</strong>听写错误的词汇自动归档至“学习账本-错题本”，随时发起针对性错词攻坚。
              </li>
            </ul>
          </div>

          {/* AI 导师 */}
          <div className="bg-teal-50/70 p-3 rounded-2xl border border-teal-100">
            <div className="flex items-center gap-1.5 font-bold text-teal-950 mb-1">
              <Sparkles className="w-4 h-4 text-teal-600" />
              <span>启发式 AI 智能导师</span>
            </div>
            <ul className="space-y-1 text-[11px] text-teal-900 list-disc list-inside">
              <li>
                <strong>苏格拉底式引导：</strong>依托 Gemini 3.8 Flash 模型，绝不直接甩答案，通过拆解关键考点、启发思考步骤引导自主解题。
              </li>
              <li>
                <strong>全科支持：</strong>涵盖数学、语文、英语、物理、化学、生物，匹配小学各年级及初高中教材难易度。
              </li>
            </ul>
          </div>

          {/* 艾宾浩斯与作业 */}
          <div className="bg-amber-50/70 p-3 rounded-2xl border border-amber-100">
            <div className="flex items-center gap-1.5 font-bold text-amber-950 mb-1">
              <BrainCircuit className="w-4 h-4 text-amber-700" />
              <span>艾宾浩斯记忆与作业规划</span>
            </div>
            <ul className="space-y-1 text-[11px] text-amber-900 list-disc list-inside">
              <li>
                <strong>四节点短期循环：</strong>在遗忘高峰期（10分钟、15分钟、30分钟、1小时）准时触发复习提醒。
              </li>
              <li>
                <strong>掌握度标定：</strong>通过“牢固掌握/有些模糊/完全遗忘”记录复习成效，对抗遗忘曲线。
              </li>
              <li>
                <strong>作业番茄闹钟：</strong>规划每日作业清单、优先级与截止时间，内置柔和蜂鸣与定时提醒。
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 text-center">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors shadow-xs"
          >
            开始高效学习
          </button>
        </div>
      </div>
    </div>
  );
};
