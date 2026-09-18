/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// 延迟初始化 Gemini 客户端
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// 健康检查端点
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    hasApiKey: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

// AI Tutor 启发式答疑辅导接口
app.post("/api/ai-tutor", async (req, res) => {
  try {
    const { question, subject = "数学", gradeLevel = "初中", history = [] } = req.body;

    if (!question || typeof question !== "string") {
      res.status(400).json({ error: "问题内容不能为空" });
      return;
    }

    const client = getGeminiClient();

    const systemInstruction = `你是一位专业且富有耐心的中小学全科金牌辅导老师，精通中国教育部统编教材体系。
当前答疑辅导对象年级：${gradeLevel}，提问科目：${subject}。

【核心辅导准则——苏格拉底式启发教学】：
1. 绝对不要直接给出最终算式答案或答案选项！你的目标是教会学生解题思路与逻辑思考方式。
2. 采用清晰结构化格式输出：
   ### 【审题与关键信息】
   - 提取题目中的已知条件、未知量以及隐蔽陷阱。
   ### 【核心思路启发】
   - 引导学生联想相关公式、定理、修辞或语法规则（如：勾股定理、相遇行程方程、定语从句用法等）。
   ### 【分步引导解题】
   - 拆解为步骤 1、步骤 2、步骤 3，每步提出一个思考问题或留下关键推导空白，邀请学生继续推导。
   ### 【思维小结与易错避坑】
   - 总结同类型题目的破题关键招式与容易丢分的地方。
   ### 【举一反三巩固练习】
   - 出一道同一知识点但数据或情景微调的小练习题。
3. 语气亲切、积极鼓励，多用“想一想”、“我们来看”、“尝试观察”，语言符合中小学生认知水平。`;

    if (!client) {
      // 当尚未配置 API Key 时的优质启发式离线降级方案
      const fallbackAnalysis = generateFallbackResponse(question, subject, gradeLevel);
      res.json({
        content: fallbackAnalysis,
        isFallback: true,
      });
      return;
    }

    // 组织对话上下文
    const prompt = `学生年级：${gradeLevel}\n科目：${subject}\n学生提出的问题/题目：\n${question}\n\n请严格按照苏格拉底启发式辅导结构进行拆解引导。`;

    const response = await client.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    const reply = response.text || "思考引导已生成，请看上方步骤。";
    res.json({
      content: reply,
      isFallback: false,
    });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    // 降级兜底，确保学生学习流程不中断
    const fallbackAnalysis = generateFallbackResponse(
      req.body?.question || "",
      req.body?.subject || "综合",
      req.body?.gradeLevel || "初中"
    );
    res.json({
      content: fallbackAnalysis,
      isFallback: true,
      notice: "当前网络请求异常，已自动切换为启发式备用解析。",
    });
  }
});

// 离线/降级启发式内容生成器
function generateFallbackResponse(question: string, subject: string, gradeLevel: string): string {
  return `### 【审题与关键信息】
- **题目分析**：针对你提出的这道${subject}题目：“*${question.slice(0, 30)}${question.length > 30 ? "..." : ""}*”
- **学段考点**：本题对应${gradeLevel}核心考纲能力要求，重点考查对基础概念的理解与综合转换能力。

### 【核心思路启发】
1. **已知与未知**：观察题干中给出的确定量与设问目标，寻找它们之间的桥梁。
2. **知识关联**：思考最近在${subject}课堂上学过的相关定理、性质或解题方法，看能否直接或间接套用。
3. **数形结合/语境推理**：如果涉及几何或物理，一定要在草稿纸上动手画出草图；如果涉及语文英语，联系上下文语境和词性搭配。

### 【分步引导解题】
- **第 1 步**：先把题目给出的已知条件在草稿纸上列出，标明单位和关键限制（如正数、整数或时态）。
- **第 2 步**：尝试列出基本关系式或推导逻辑。问问自己：如果知道 X，能不能顺势求出 Y？
- **第 3 步**：代入已知数据进行推算，留意符号变号与单位统一。

### 【思维小结与易错避坑】
- 仔细核对计算步骤与题目限制条件，做完后将结果代回原题检验是否合乎生活常理。
- 欢迎把你的第 1 步推导结果发给老师，我们一起看下一步！`;
}

// Vite 开发中间件与生产静态服务
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`智学宝服务已在端口启动: http://localhost:${PORT}`);
  });
}

startServer();
