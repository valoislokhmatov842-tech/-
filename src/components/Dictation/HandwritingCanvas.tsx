/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect, useCallback } from "react";
import { RotateCcw, PenTool, Eraser } from "lucide-react";

interface HandwritingCanvasProps {
  onClear?: () => void;
  onChangeHasContent?: (hasContent: boolean) => void;
  height?: number;
}

export const HandwritingCanvas: React.FC<HandwritingCanvasProps> = ({
  onClear,
  onChangeHasContent,
  height = 180,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [mode, setMode] = useState<"pen" | "eraser">("pen");
  const [lineWidth, setLineWidth] = useState(3);
  const [hasDrawn, setHasDrawn] = useState(false);

  // 绘制米字格辅助线
  const drawMiziGrid = useCallback((ctx: CanvasRenderingContext2D, width: number, h: number) => {
    ctx.save();
    ctx.clearRect(0, 0, width, h);

    // 外边框
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(8, 8, width - 16, h - 16);

    // 米字格虚线
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;

    // 水平中线
    ctx.beginPath();
    ctx.moveTo(8, h / 2);
    ctx.lineTo(width - 8, h / 2);
    ctx.stroke();

    // 垂直中线
    ctx.beginPath();
    ctx.moveTo(width / 2, 8);
    ctx.lineTo(width / 2, h - 8);
    ctx.stroke();

    // 两条对角斜线
    ctx.beginPath();
    ctx.moveTo(8, 8);
    ctx.lineTo(width - 8, h - 8);
    ctx.moveTo(width - 8, 8);
    ctx.lineTo(8, h - 8);
    ctx.stroke();

    ctx.restore();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 处理高 DPI 屏幕模糊
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    drawMiziGrid(ctx, rect.width, rect.height);
  }, [height, drawMiziGrid]);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    setIsDrawing(true);
    setHasDrawn(true);
    onChangeHasContent?.(true);

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = mode === "pen" ? "#0f172a" : "#ffffff";
    ctx.lineWidth = mode === "pen" ? lineWidth : lineWidth * 4;
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    drawMiziGrid(ctx, rect.width, rect.height);
    setHasDrawn(false);
    onChangeHasContent?.(false);
    onClear?.();
  };

  return (
    <div id="handwriting-pad" className="w-full flex flex-col bg-slate-50 rounded-2xl border border-slate-200 p-2.5 shadow-sm">
      {/* 笔刷与操作栏 */}
      <div className="flex items-center justify-between pb-2 px-1 text-xs text-slate-500 border-b border-slate-200/80 mb-2">
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-slate-700">米字格练字板</span>
          <span className="text-[10px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-full border border-emerald-200/60 font-medium">
            手写模式
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            id="btn-tool-pen"
            type="button"
            onClick={() => setMode("pen")}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all cursor-pointer ${
              mode === "pen" ? "bg-emerald-600 text-white shadow-xs" : "hover:bg-slate-200 text-slate-600"
            }`}
          >
            <PenTool className="w-3 h-3" />
            <span>铅笔</span>
          </button>
          <button
            id="btn-tool-eraser"
            type="button"
            onClick={() => setMode("eraser")}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all cursor-pointer ${
              mode === "eraser" ? "bg-amber-600 text-white shadow-xs" : "hover:bg-slate-200 text-slate-600"
            }`}
          >
            <Eraser className="w-3 h-3" />
            <span>橡皮</span>
          </button>
          <button
            id="btn-tool-clear"
            type="button"
            onClick={clearCanvas}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>重写</span>
          </button>
        </div>
      </div>

      {/* 绘图画板 */}
      <div className="relative w-full rounded-xl overflow-hidden bg-white shadow-inner touch-none cursor-crosshair">
        <canvas
          ref={canvasRef}
          className="w-full block"
          style={{ height: `${height}px` }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        {!hasDrawn && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-slate-300 text-xs font-normal select-none">
            请在米字格内书写听写汉字或英文单词
          </div>
        )}
      </div>

      {/* 底部粗细选择 */}
      <div className="flex items-center justify-between pt-2 px-1 text-[11px] text-slate-400">
        <span>笔触粗细</span>
        <div className="flex items-center gap-2">
          {[2, 3, 5].map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => setLineWidth(size)}
              className={`w-4 h-4 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                lineWidth === size ? "ring-2 ring-emerald-500 bg-slate-800" : "bg-slate-300"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white block" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
