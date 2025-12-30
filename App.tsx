
import React, { useState, useRef, useEffect } from 'react';
import { analyzeRecipe } from './services/geminiService';
import { RecipeFeedback, AnalysisStatus, HistoryItem, Category } from './types';
import { toPng } from 'html-to-image';

const CATEGORIES: Category[] = ['未分类', '家常小炒', '硬核大菜', '甜蜜烘焙', '快手餐', '其他'];

const Icons = {
  Chef: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 18h12"/><path d="M12 10V4"/><path d="m17 10-5 5-5-5"/><path d="M4 18h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2Z"/></svg>
  ),
  Trash: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
  ),
  Check: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
  ),
  History: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>
  ),
  Download: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
  ),
  Camera: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
  ),
  X: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
  ),
  Loader: () => (
    <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="2" y2="6"/><line x1="12" x2="12" y1="18" y2="22"/><line x1="4.93" x2="7.76" y1="4.93" y2="7.76"/><line x1="16.24" x2="19.07" y1="16.24" y2="19.07"/><line x1="2" x2="6" y1="12" y2="12"/><line x1="18" x2="22" y1="12" y2="12"/><line x1="4.93" x2="7.76" y1="19.07" y2="16.24"/><line x1="16.24" x2="19.07" y1="7.76" y2="4.93"/></svg>
  )
};

const App: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [inputImage, setInputImage] = useState<string | null>(null);
  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [currentFeedback, setCurrentFeedback] = useState<RecipeFeedback | null>(null);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<Category>('未分类');
  const [filterCategory, setFilterCategory] = useState<string>('全部');
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const exportRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('chef_mentor_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('chef_mentor_history', JSON.stringify(history));
  }, [history]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setInputImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!inputText && !inputImage) return;
    setStatus(AnalysisStatus.LOADING);
    setError(null);
    try {
      const result = await analyzeRecipe(inputText, inputImage || undefined);
      const newHistoryItem: HistoryItem = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        category: '未分类',
        userInputText: inputText,
        userInputImage: inputImage,
        feedback: result
      };
      setHistory(prev => [newHistoryItem, ...prev]);
      setCurrentFeedback(result);
      setActiveHistoryId(newHistoryItem.id);
      setActiveCategory('未分类');
      setStatus(AnalysisStatus.SUCCESS);
    } catch (err) {
      setError('老师忙不过来了，请稍后再试试吧~');
      setStatus(AnalysisStatus.ERROR);
    }
  };

  const handleExportImage = async () => {
    if (!exportRef.current) return;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(exportRef.current, {
        cacheBust: true,
        backgroundColor: '#FDFCF8',
        style: { padding: '20px' }
      });
      const link = document.createElement('a');
      link.download = `ChefMentor-${currentFeedback?.recipeName || '菜谱笔记'}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Export failed', err);
      alert('导出图片失败，请重试');
    } finally {
      setIsExporting(false);
    }
  };

  const deleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHistory(prev => prev.filter(item => item.id !== id));
    if (activeHistoryId === id) reset();
  };

  const updateCategory = (id: string, newCat: Category) => {
    setHistory(prev => prev.map(item => item.id === id ? { ...item, category: newCat } : item));
    setActiveCategory(newCat);
  };

  const showHistoryDetail = (item: HistoryItem) => {
    setCurrentFeedback(item.feedback);
    setInputText(item.userInputText);
    setInputImage(item.userInputImage);
    setActiveCategory(item.category);
    setActiveHistoryId(item.id);
    setStatus(AnalysisStatus.SUCCESS);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const reset = () => {
    setStatus(AnalysisStatus.IDLE);
    setCurrentFeedback(null);
    setActiveHistoryId(null);
    setInputText('');
    setInputImage(null);
  };

  // 文字加粗渲染组件
  const BoldText = ({ text }: { text: string }) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return (
      <>
        {parts.map((part, i) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return (
              <strong key={i} className="font-extrabold text-orange-900 bg-orange-100/50 px-0.5 rounded">
                {part.slice(2, -2)}
              </strong>
            );
          }
          return part;
        })}
      </>
    );
  };

  const FeedbackSection = ({ title, items, color, iconBg, subtitle }: any) => (
    <div className={`p-6 rounded-3xl bg-white shadow-sm border-l-4 ${color} hover:shadow-md transition-all h-full flex flex-col`}>
      <div className="mb-4">
        <h3 className="text-base font-bold flex items-center text-gray-800">
          <span className={`w-1.5 h-4 rounded-full mr-2 ${iconBg}`}></span>
          {title}
        </h3>
        {subtitle && <p className="text-[10px] text-gray-400 mt-0.5 ml-3.5 font-medium leading-tight">{subtitle}</p>}
      </div>
      <ul className="space-y-3 flex-1">
        {items.map((item: string, index: number) => (
          <li key={index} className="flex items-start text-gray-700 leading-snug text-sm">
            <span className="mt-0.5 mr-2 text-orange-400 flex-shrink-0">
              <Icons.Check />
            </span>
            <span className="flex-1"><BoldText text={item} /></span>
          </li>
        ))}
      </ul>
    </div>
  );

  const filteredHistory = filterCategory === '全部' 
    ? history 
    : history.filter(item => item.category === filterCategory);

  return (
    <div className="min-h-screen bg-[#FDFCF8] text-gray-900 pb-20">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-orange-100 px-6 py-3 mb-6 shadow-sm">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2 cursor-pointer" onClick={reset}>
            <div className="bg-orange-500 p-1.5 rounded-xl text-white">
              <Icons.Chef />
            </div>
            <h1 className="text-lg font-bold text-orange-950">ChefMentor</h1>
          </div>
          <div className="flex gap-4">
             {status === AnalysisStatus.SUCCESS && (
               <div className="flex gap-2">
                 <button 
                   onClick={handleExportImage}
                   disabled={isExporting}
                   className="flex items-center gap-2 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors disabled:opacity-50"
                 >
                   {isExporting ? <Icons.Loader /> : <Icons.Download />}
                   {isExporting ? '生成中...' : '保存为图片'}
                 </button>
                 <button onClick={reset} className="text-xs font-bold text-orange-600 bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-100 hover:bg-orange-100 transition-colors">写新菜谱</button>
               </div>
             )}
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* 左侧：录入与展示区 */}
        <div className="lg:col-span-8">
          {status !== AnalysisStatus.SUCCESS ? (
            <div className="space-y-8">
              <div className="space-y-2">
                <h2 className="text-3xl font-black text-gray-900 tracking-tight">嘿，今天想尝试什么？</h2>
                <p className="text-gray-500">把你的菜谱草稿或截图交给我，我们一起把它变完美。</p>
              </div>

              <div className="bg-white rounded-[2rem] shadow-sm p-8 border border-orange-100 space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-widest ml-1">菜谱内容 / 图片上传</label>
                    <textarea
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="在这里输入你的菜谱步骤，或者直接点击下方按钮上传菜谱截图..."
                      className="w-full h-48 p-5 rounded-2xl border border-gray-100 focus:border-orange-200 focus:ring-4 focus:ring-orange-50 outline-none transition-all resize-none text-gray-800 bg-gray-50/20 text-sm"
                    />
                  </div>

                  <div className="flex items-center gap-4">
                    <input 
                      type="file" 
                      accept="image/*" 
                      ref={fileInputRef} 
                      className="hidden" 
                      onChange={handleImageUpload} 
                    />
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-dashed border-orange-200 text-orange-600 rounded-xl text-xs font-bold hover:bg-orange-50 transition-colors"
                    >
                      <Icons.Camera /> 上传菜谱截图/照片
                    </button>
                    {inputImage && (
                      <div className="relative group">
                        <img src={inputImage} alt="preview" className="w-12 h-12 object-cover rounded-lg border border-orange-100 shadow-sm" />
                        <button 
                          onClick={() => setInputImage(null)}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Icons.X />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  disabled={status === AnalysisStatus.LOADING || (!inputText && !inputImage)}
                  onClick={handleAnalyze}
                  className="w-full py-4 rounded-2xl font-bold text-lg bg-orange-500 text-white hover:bg-orange-600 transition-all shadow-lg shadow-orange-100 disabled:bg-gray-200 disabled:shadow-none active:scale-[0.98]"
                >
                  {status === AnalysisStatus.LOADING ? <span className="flex items-center justify-center gap-3"><Icons.Loader /> 思考中...</span> : "解析菜谱"}
                </button>
                {error && <p className="text-center text-red-400 text-sm font-medium">{error}</p>}
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500" ref={exportRef}>
              <div className="bg-white rounded-[2rem] p-8 border border-orange-100 shadow-sm relative overflow-hidden">
                <div className="relative z-10">
                  <div className="flex justify-between items-center mb-4">
                    <span className="px-3 py-1 bg-orange-50 text-orange-600 rounded-full text-[10px] font-black uppercase tracking-widest">主厨指点</span>
                    <div className="flex items-center gap-2" data-html2canvas-ignore="true">
                       <span className="text-[10px] font-bold text-gray-400 uppercase">分类:</span>
                       <select 
                        value={activeCategory} 
                        onChange={(e) => activeHistoryId && updateCategory(activeHistoryId, e.target.value as Category)}
                        className="bg-gray-50 border border-gray-100 rounded-lg text-[10px] font-bold p-1 px-2 outline-none text-gray-700 cursor-pointer hover:bg-orange-50 transition-colors"
                      >
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  <h2 className="text-3xl font-black text-gray-900 mb-4 tracking-tight leading-tight">《{currentFeedback?.recipeName}》</h2>
                  <div className="bg-orange-50/50 p-5 rounded-2xl italic border border-orange-100/50">
                    <p className="text-sm font-medium text-orange-950/80 leading-relaxed text-center">“{currentFeedback?.encouragement}”</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                <FeedbackSection 
                  title="避坑指南" 
                  subtitle="小白防翻车核心提醒"
                  items={currentFeedback?.precautions || []} 
                  color="border-amber-400" 
                  iconBg="bg-amber-400" 
                />
                <FeedbackSection 
                  title="美味关键" 
                  subtitle="控制口感的精髓"
                  items={currentFeedback?.textureSecrets || []} 
                  color="border-blue-400" 
                  iconBg="bg-blue-400" 
                />
                <FeedbackSection 
                  title="提鲜妙招" 
                  subtitle="口感升级的神奇魔法"
                  items={currentFeedback?.flavorEnhancements || []} 
                  color="border-purple-400" 
                  iconBg="bg-purple-400" 
                />
                <FeedbackSection 
                  title="摆盘美学" 
                  subtitle="赋予料理视觉生命力"
                  items={currentFeedback?.platingTechniques || []} 
                  color="border-rose-400" 
                  iconBg="bg-rose-400" 
                />
              </div>

              <div className="pt-4 flex justify-center" data-html2canvas-ignore="true">
                <button onClick={reset} className="px-6 py-3 bg-white border border-orange-100 text-orange-600 rounded-xl font-bold text-xs hover:bg-orange-50 transition-all shadow-sm">
                  继续解析下一个菜谱
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 右侧：档案库 */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-[2rem] border border-orange-100 shadow-sm sticky top-20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold flex items-center gap-2 text-gray-800">
                <Icons.History /> 我的档案
              </h3>
              <span className="text-[10px] font-black text-gray-400">{history.length} 篇</span>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-6">
              {['全部', ...CATEGORIES].map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`px-3 py-1 rounded-full text-[9px] font-bold transition-all border ${
                    filterCategory === cat ? 'bg-gray-800 text-white border-gray-800 shadow-sm' : 'bg-gray-50 text-gray-400 border-gray-100 hover:border-orange-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
              {filteredHistory.length === 0 ? (
                <div className="text-center py-8 italic text-gray-300 text-[10px]">
                  还没有保存过笔记
                </div>
              ) : (
                filteredHistory.map(item => (
                  <div 
                    key={item.id}
                    onClick={() => showHistoryDetail(item)}
                    className={`group p-3 rounded-xl transition-all cursor-pointer border ${
                      activeHistoryId === item.id 
                        ? 'bg-orange-50 border-orange-200 ring-1 ring-orange-100' 
                        : 'bg-white border-gray-50 hover:border-orange-100 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex flex-col">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[8px] font-black text-orange-400 uppercase tracking-tighter">{item.category}</span>
                        <button 
                          onClick={(e) => deleteHistoryItem(item.id, e)}
                          className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all p-1"
                        >
                          <Icons.Trash />
                        </button>
                      </div>
                      <h4 className="font-bold text-gray-800 text-xs truncate">{item.feedback.recipeName}</h4>
                      <p className="text-[8px] text-gray-400 mt-0.5">{new Date(item.timestamp).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-20 py-10 text-center border-t border-orange-50">
        <p className="text-gray-300 text-[9px] font-bold uppercase tracking-widest">ChefMentor · 支持图文识别 & 关键步骤加粗</p>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #fee2e2; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default App;