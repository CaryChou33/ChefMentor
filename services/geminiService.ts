
import { GoogleGenAI, Type } from "@google/genai";
import { RecipeFeedback } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const analyzeRecipe = async (text: string, imageData?: string): Promise<RecipeFeedback> => {
  const model = 'gemini-3-pro-preview';
  
  const systemInstruction = `你是一位超级温暖、有耐心的私人烹饪教练，专门指导完全没有下厨经验的新手。
你的目标是让用户觉得“我也能行”，并且通过你的建议真正提升食物口感。

**语言准则：**
1. 语气：像对待朋友一样亲切，多用“咱们”、“建议你”、“别怕”等词汇。
2. 解释：遇到专业术语（如：焯水、勾芡、爆香）一定要用大白话解释它的操作方法和目的。
3. 容错性：给新手一些容错方案（例如：如果火开大了，可以赶紧关火降温）。
4. 鼓励：在结尾给出一句非常具体且走心的鼓励。

**反馈维度要求：**
- 注意事项：重点提醒“防烫”、“防油溅”、“提前备菜”等实操细节。
- 口感关键：告诉他们如何判断熟没熟，以及保持嫩滑、脆爽的小窍门。
- 风味巧思：推荐一两种超市就能买到的常用增味神器（如：蚝油、蒸鱼豉油）。
- 摆盘艺术：教他们用最简单的白色盘子和家里现有的餐具拍出大片感。`;

  const contents: any[] = [{ text: text || "帮我分析一下这个菜谱，我是个厨房小白，请讲得通俗易懂一些。" }];
  
  if (imageData) {
    contents.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: imageData.split(',')[1]
      }
    });
  }

  const response = await ai.models.generateContent({
    model,
    contents: { parts: contents },
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
            description: "注意事项列表，用新手能听懂的话写"
          },
          textureSecrets: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "让口感更好的关键点（包含原理解释）"
          },
          flavorEnhancements: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "简单的提鲜小妙招"
          },
          platingTechniques: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "小白也能做到的美观摆盘法"
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
