/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// 语音播放与音效工具类 - 支持中英文标准 TTS 朗读与 Web Audio 交互提示音
class SpeechService {
  private synth: SpeechSynthesis | null = null;
  private audioCtx: AudioContext | null = null;

  constructor() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      this.synth = window.speechSynthesis;
    }
  }

  // 朗读单词或句子
  public speak(
    text: string,
    options: {
      lang?: "zh-CN" | "en-US";
      rate?: number; // 0.7 ~ 1.2
      pitch?: number;
      volume?: number;
      onEnd?: () => void;
      onError?: (err: any) => void;
    } = {}
  ): void {
    if (!this.synth) {
      console.warn("当前浏览器不支持 Web Speech API");
      this.playBeepTone();
      options.onEnd?.();
      return;
    }

    try {
      this.synth.cancel(); // 停止当前正在播报的声音

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = options.lang || (this.isChinese(text) ? "zh-CN" : "en-US");
      utterance.rate = options.rate || 0.9; // 稍微放慢以保证学生听清
      utterance.pitch = options.pitch || 1.0;
      utterance.volume = options.volume || 1.0;

      // 智能选取更自然的声音
      const voices = this.synth.getVoices();
      if (voices.length > 0) {
        if (utterance.lang === "zh-CN") {
          const zhVoice = voices.find(
            (v) =>
              v.lang.includes("zh") ||
              v.name.includes("Chinese") ||
              v.name.includes("Xiaoxiao") ||
              v.name.includes("Yaoyao")
          );
          if (zhVoice) utterance.voice = zhVoice;
        } else {
          const enVoice = voices.find(
            (v) =>
              v.lang.startsWith("en") ||
              v.name.includes("Natural") ||
              v.name.includes("Samantha") ||
              v.name.includes("Daniel")
          );
          if (enVoice) utterance.voice = enVoice;
        }
      }

      utterance.onend = () => {
        options.onEnd?.();
      };

      utterance.onerror = (e) => {
        console.warn("Speech synthesis notice:", e);
        options.onEnd?.();
      };

      this.synth.speak(utterance);
    } catch (err) {
      console.error("Speech speak error:", err);
      options.onEnd?.();
    }
  }

  // 停止朗读
  public stop(): void {
    if (this.synth) {
      this.synth.cancel();
    }
  }

  // 暂停
  public pause(): void {
    if (this.synth) {
      this.synth.pause();
    }
  }

  // 恢复
  public resume(): void {
    if (this.synth) {
      this.synth.resume();
    }
  }

  private isChinese(str: string): boolean {
    return /[\u4e00-\u9fa5]/.test(str);
  }

  // 获取或初始化 AudioContext
  private getAudioContext(): AudioContext | null {
    if (!this.audioCtx && typeof window !== "undefined") {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  // 播放温和提示音 (短促蜂鸣)
  public playBeepTone(freq: number = 660, duration: number = 0.15): void {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // safe ignore
    }
  }

  // 播放答对/通关胜利音效
  public playSuccessChime(): void {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);

        gain.gain.setValueAtTime(0.15, ctx.currentTime + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.1 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + idx * 0.1);
        osc.stop(ctx.currentTime + idx * 0.1 + 0.35);
      });
    } catch (e) {
      // safe ignore
    }
  }

  // 播放闹钟警报声
  public playAlarmAlert(): void {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const tones = [880, 0, 880, 0, 1046.5];
      tones.forEach((freq, idx) => {
        if (freq === 0) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "square";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.15);

        gain.gain.setValueAtTime(0.1, ctx.currentTime + idx * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.15 + 0.12);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + idx * 0.15);
        osc.stop(ctx.currentTime + idx * 0.15 + 0.12);
      });
    } catch (e) {
      // safe ignore
    }
  }
}

export const speechService = new SpeechService();
