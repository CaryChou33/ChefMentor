
export interface RecipeFeedback {
  recipeName: string;
  precautions: string[];
  textureSecrets: string[];
  flavorEnhancements: string[];
  platingTechniques: string[];
  encouragement: string;
}

export type Category = '未分类' | '家常小炒' | '硬核大菜' | '甜蜜烘焙' | '快手餐' | '其他';

export interface HistoryItem {
  id: string;
  timestamp: number;
  category: Category;
  userInputText: string;
  userInputImage: string | null;
  feedback: RecipeFeedback;
}

export enum AnalysisStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}
