/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Bell, X, ChevronRight, BrainCircuit } from "lucide-react";

interface AlarmNotificationBannerProps {
  notification: {
    id: string;
    type: "alarm" | "ebbinghaus";
    title: string;
    message: string;
    targetTab: "dictation" | "tutor" | "homework" | "ledger";
  } | null;
  onDismiss: () => void;
  onAction: (targetTab: "dictation" | "tutor" | "homework" | "ledger") => void;
}

export const AlarmNotificationBanner: React.FC<AlarmNotificationBannerProps> = ({
  notification,
  onDismiss,
  onAction,
}) => {
  if (!notification) return null;

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-sm animate-in slide-in-from-top duration-300">
      <div className="bg-slate-900/95 backdrop-blur-md text-white rounded-2xl p-3.5 shadow-2xl border border-slate-700/60 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
              notification.type === "ebbinghaus" ? "bg-teal-500 text-white" : "bg-amber-500 text-slate-950"
            }`}
          >
            {notification.type === "ebbinghaus" ? (
              <BrainCircuit className="w-5 h-5" />
            ) : (
              <Bell className="w-5 h-5 animate-bounce" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                {notification.type === "ebbinghaus" ? "艾宾浩斯复习提醒" : "学习定时闹钟"}
              </span>
              <span className="text-[9px] text-slate-400">刚刚</span>
            </div>
            <h4 className="text-xs font-bold text-white truncate">{notification.title}</h4>
            <p className="text-[11px] text-slate-300 truncate">{notification.message}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onAction(notification.targetTab)}
            className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition-colors flex items-center gap-0.5 cursor-pointer"
          >
            <span>立即查看</span>
            <ChevronRight className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            aria-label="关闭提醒"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
