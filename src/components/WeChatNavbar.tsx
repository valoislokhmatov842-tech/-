/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Wifi, Battery, Signal, Sparkles, Smartphone, Monitor } from "lucide-react";

interface WeChatNavbarProps {
  title?: string;
  isMobileView: boolean;
  onToggleViewMode: () => void;
  onOpenInfoModal?: () => void;
}

export const WeChatNavbar: React.FC<WeChatNavbarProps> = ({
  title = "智学宝",
  isMobileView,
  onToggleViewMode,
  onOpenInfoModal,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 select-none">
      {/* 模拟手机系统状态栏 (Signal, Time, Wifi, Battery) */}
      <div className="flex items-center justify-between px-5 pt-2 pb-1 text-[11px] font-medium text-slate-700 tracking-tight">
        <div className="flex items-center gap-1.5">
          <span>09:41</span>
          <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded-full">
            5G
          </span>
        </div>
        <div className="flex items-center gap-2 text-slate-600">
          <Signal className="w-3 h-3" />
          <Wifi className="w-3 h-3" />
          <div className="flex items-center gap-0.5">
            <span className="text-[10px] font-mono">100%</span>
            <Battery className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {/* 微信小程序风格标题栏与胶囊按钮 */}
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-sm shadow-emerald-500/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-bold text-slate-900 tracking-tight">{title}</h1>
              <span className="text-[10px] font-medium bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">
                AI伴学版
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-normal">高效听写 · 艾宾浩斯 · 智能答疑</p>
          </div>
        </div>

        {/* 视窗切换与小程序胶囊 */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleViewMode}
            title={isMobileView ? "切换为宽屏视图" : "切换为手机模拟视图"}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors hidden sm:flex items-center gap-1 text-xs"
          >
            {isMobileView ? (
              <>
                <Monitor className="w-3.5 h-3.5" />
                <span className="text-[11px]">宽屏</span>
              </>
            ) : (
              <>
                <Smartphone className="w-3.5 h-3.5" />
                <span className="text-[11px]">手机</span>
              </>
            )}
          </button>

          {/* 小程序胶囊按钮 [ ••• | ⊙ ] */}
          <div
            id="wechat-capsule"
            className="flex items-center bg-white/90 border border-slate-200/90 rounded-full px-2.5 py-1 shadow-xs"
          >
            <button
              type="button"
              onClick={onOpenInfoModal}
              className="px-1 text-slate-700 hover:text-emerald-600 transition-colors flex items-center justify-center"
              title="功能指南与关于"
            >
              <span className="text-xs font-bold tracking-widest leading-none">•••</span>
            </button>
            <span className="w-px h-3 bg-slate-200 mx-1.5 block" />
            <button
              type="button"
              onClick={onOpenInfoModal}
              className="px-0.5 text-slate-700 hover:text-emerald-600 transition-colors flex items-center justify-center"
              title="使用指南"
            >
              <div className="w-3 h-3 rounded-full border border-slate-700 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
              </div>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
