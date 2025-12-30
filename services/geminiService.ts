
import { GoogleGenAI, Type } from "@google/genai";
import { RecipeFeedback } from "../types";

export const analyzeRecipe = async (text: string, imageBase64?: string): Promise<RecipeFeedback> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  const model = 'gemini-3-pro-preview';
  
  const systemInstruction = `你是一位超级温暖、有耐心的私人烹饪教练，专门指导完全没有下厨经验的新手。

**核心指令：**
1. **内容分析**：如果用户提供了图片，请结合图片内容（食材、步骤截图等）和文字进行综合分析。
2. **文字加粗（极重要）**：在返回的 precautions, textureSecrets, flavorEnhancements, platingTechniques 列表内容中，请务必对以下内容使用 Markdown 的加粗语法（用 ** 包裹）：
   - **核心操作动词**（如：**焯水**、**勾芡**、**爆香**）
   - **关键调料及分量**（如：**两勺生抽**、**少许白糖**）
   - **精确的时间或温度**（如：**中火加热3分钟**、**油温五成热**）
   - **防翻车预警**（如：**千万别加水**、**关火后再操作**）

**反馈维度要求：**
- 注意事项：提醒“防烫”、“防油溅”等细节。
- 口感关键：解释判断熟没熟的标志。
- 风味巧思：推荐超市易买的增味神器。
- 摆盘艺术：教他们用简单的盘子拍出大片感。`;

  const parts: any[] = [{ text: text || "帮我分析一下这个菜谱。" }];
  
  if (imageBase64) {
    parts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: imageBase64.split(',')[1] || imageBase64
      }
    });
  }
  
  const response = await ai.models.generateContent({
    model,
    contents: { parts },
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          recipeName: { type: Type.STRING, description: "菜名" },
          precautions: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "注意事项，记得对关键词加粗"
          },
          textureSecrets: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "让口感更好的关键点，记得对关键词加粗"
          },
          flavorEnhancements: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "简单的提鲜小妙招，记得对关键词加粗"
          },
          platingTechniques: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "摆盘美学建议，记得对关键词加粗"
          },
          encouragement: { type: Type.STRING, description: "超级暖心的鼓励语" }
        },
        required: ["recipeName", "precautions", "textureSecrets", "flavorEnhancements", "platingTechniques", "encouragement"]
      }
    }
  });

  if (!response.text) {
    throw new Error("No response from AI");
  }

  return JSON.parse(response.text) as RecipeFeedback;
};