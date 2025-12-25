
import React, { useState, useRef, useEffect } from 'react';
import { analyzeRecipe } from './services/geminiService';
import { RecipeFeedback, AnalysisStatus, HistoryItem, Category } from './types';

const CATEGORIES: Category[] = ['未分类', '家常小炒', '硬核大菜', '甜蜜烘焙', '快手餐', '其他'];

const Icons = {
  Chef: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 18h12"/><path d="M12 10V4"/><path d="m17 10-5 5-5-5"/><path d="M4 18h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2Z"/></svg>
  ),
  Camera: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
  ),
  Trash: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
  ),
  Check: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
  ),
  History: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>
  ),
  Loader: () => (
    <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="2" y2="6"/><line x1="12" x2="12" y1="18" y2="22"/><line x1="4.93" x2="7.76" y1="4.93" y2="7.76"/><line x1="16.24" x2="19.07" y1="16.24" y2="19.07"/><line x1="2" x2="6" y1="12" y2="12"/><line x1="18" x2="22" y1="12" y2="12"/><line x1="4.93" x2="7.76" y1="19.07" y2="16.24"/><line x1="16.24" x2="19.07" y1="7.76" y2="4.93"/></svg>
  )
};

const App: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [currentFeedback, setCurrentFeedback] = useState<RecipeFeedback | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<Category>('未分类');
  const [filterCategory, setFilterCategory] = useState<string>('全部');
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 初始化加载历史记录
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

  // 历史记录变动自动保存
  useEffect(() => {
    localStorage.setItem('chef_mentor_history', JSON.stringify(history));
  }, [history]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setSelectedImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!inputText && !selectedImage) return;
    setStatus(AnalysisStatus.LOADING);
    setError(null);
    try {
      const result = await analyzeRecipe(inputText, selectedImage || undefined);
      
      const newHistoryItem: HistoryItem = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        category: '未分类',
        userInputText: inputText,
        userInputImage: selectedImage,
        feedback: result
      };

      setHistory(prev => [newHistoryItem, ...prev]);
      setCurrentFeedback(result);
      setActiveCategory('未分类');
      setStatus(AnalysisStatus.SUCCESS);
    } catch (err) {
      setError('老师忙不过来了，请稍后再试试吧~');
      setStatus(AnalysisStatus.ERROR);
    }
  };

  const deleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  const updateCategory = (id: string, newCat: Category) => {
    setHistory(prev => prev.map(item => item.id === id ? { ...item, category: newCat } : item));
    setActiveCategory(newCat);
  };

  const showHistoryDetail = (item: HistoryItem) => {
    setCurrentFeedback(item.feedback);
    setInputText(item.userInputText);
    setSelectedImage(item.userInputImage);
    setActiveCategory(item.category);
    setStatus(AnalysisStatus.SUCCESS);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const reset = () => {
    setStatus(AnalysisStatus.IDLE);
    setCurrentFeedback(null);
    setInputText('');
    setSelectedImage(null);
  };

  const filteredHistory = filterCategory === '全部' 
    ? history 
    : history.filter(item => item.category === filterCategory);

  const FeedbackSection = ({ title, items, color, iconBg }: any) => (
    <div className={`mb-6 p-6 rounded-3xl bg-white shadow-md border-t-8 ${color}`}>
      <h3 className="text-lg font-bold mb-4 flex items-center text-gray-800">
        <span className={`w-2 h-6 rounded-full mr-3 ${iconBg}`}></span>
        {title}
      </h3>
      <ul className="space-y-4">
        {items.map((item: string, index: number) => (
          <li key={index} className="flex items-start text-gray-700 leading-relaxed text-sm">
            <span className="mt-1 mr-3 text-orange-400 flex-shrink-0"><Icons.Check /></span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FFFBF5] text-gray-900 pb-20">
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-orange-100 px-6 py-4 mb-8 shadow-sm">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2 cursor-pointer" onClick={reset}>
            <div className="bg-orange-500 p-2 rounded-2xl text-white shadow-lg shadow-orange-200">
              <Icons.Chef />
            </div>
            <h1 className="text-xl font-bold text-orange-950 hidden sm:block">ChefMentor <span className="text-xs font-normal text-orange-400 ml-1">厨房成长笔记</span></h1>
          </div>
          <div className="flex gap-4">
             {status === AnalysisStatus.SUCCESS && (
               <button onClick={reset} className="text-sm font-bold text-orange-600 bg-orange-50 px-4 py-2 rounded-xl transition-all">写新菜谱</button>
             )}
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* 左侧：录入与展示区 */}
        <div className="lg:col-span-8">
          {status !== AnalysisStatus.SUCCESS ? (
            <div className="space-y-10">
              <div className="space-y-4">
                <h2 className="text-4xl font-black text-gray-900">嘿，今天想尝试什么？</h2>
                <p className="text-gray-500 text-lg">把你的菜谱草稿交给我，我们一起把它变完美。</p>
              </div>

              <div className="bg-white rounded-[2rem] shadow-xl p-8 border border-orange-50 space-y-8">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="在这里输入你的菜谱步骤..."
                  className="w-full h-48 p-5 rounded-3xl border-2 border-gray-100 focus:border-orange-300 focus:ring-4 focus:ring-orange-100 outline-none transition-all resize-none text-gray-800 bg-gray-50/30"
                />

                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="cursor-pointer border-3 border-dashed border-orange-100 rounded-3xl p-6 text-center hover:bg-orange-50/50 transition-all group"
                >
                  {selectedImage ? (
                    <img src={selectedImage} alt="Preview" className="max-h-40 mx-auto rounded-xl shadow-lg" />
                  ) : (
                    <div className="flex flex-col items-center py-4">
                      <div className="p-3 bg-orange-100 text-orange-600 rounded-full mb-2"><Icons.Camera /></div>
                      <span className="text-gray-500 font-bold">点击上传菜谱照片</span>
                    </div>
                  )}
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                </div>

                <button
                  disabled={status === AnalysisStatus.LOADING || (!inputText && !selectedImage)}
                  onClick={handleAnalyze}
                  className="w-full py-5 rounded-3xl font-black text-xl bg-orange-500 text-white hover:bg-orange-600 transition-all shadow-xl shadow-orange-200 disabled:bg-gray-200 disabled:shadow-none"
                >
                  {status === AnalysisStatus.LOADING ? <span className="flex items-center justify-center gap-2"><Icons.Loader /> 正在分析中...</span> : "开始分析菜谱"}
                </button>
                {error && <p className="text-center text-red-400 font-medium">{error}</p>}
              </div>
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-500">
              <div className="bg-gradient-to-br from-orange-400 to-orange-600 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-4">
                    <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-widest">主厨建议</span>
                    <select 
                      value={activeCategory} 
                      onChange={(e) => updateCategory(history[0]?.id, e.target.value as Category)}
                      className="bg-white/20 border-none rounded-lg text-xs font-bold p-1 outline-none text-white cursor-pointer"
                    >
                      {CATEGORIES.map(c => <option key={c} value={c} className="text-gray-900">{c}</option>)}
                    </select>
                  </div>
                  <h2 className="text-3xl font-black mb-4 tracking-tight">关于《{currentFeedback?.recipeName}》</h2>
                  <p className="text-lg font-medium opacity-90 italic leading-relaxed">“{currentFeedback?.encouragement}”</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FeedbackSection title="避坑指南" items={currentFeedback?.precautions || []} color="border-amber-400" iconBg="bg-amber-400" />
                <FeedbackSection title="美味关键" items={currentFeedback?.textureSecrets || []} color="border-blue-400" iconBg="bg-blue-400" />
                <FeedbackSection title="提鲜妙招" items={currentFeedback?.flavorEnhancements || []} color="border-purple-400" iconBg="bg-purple-400" />
                <FeedbackSection title="摆盘美学" items={currentFeedback?.platingTechniques || []} color="border-rose-400" iconBg="bg-rose-400" />
              </div>
            </div>
          )}
        </div>

        {/* 右侧：历史档案区 */}
        <div className="lg:col-span-4 space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold flex items-center gap-2 text-gray-800">
              <Icons.History /> 我的厨房档案
            </h3>
            <span className="text-xs font-bold text-gray-400">{history.length} 篇</span>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {['全部', ...CATEGORIES].map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  filterCategory === cat ? 'bg-orange-500 text-white' : 'bg-white text-gray-400 hover:bg-orange-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-2 custom-scrollbar">
            {filteredHistory.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 italic text-gray-300">
                暂无记录，快去开启你的第一道菜吧！
              </div>
            ) : (
              filteredHistory.map(item => (
                <div 
                  key={item.id}
                  onClick={() => showHistoryDetail(item)}
                  className="group bg-white p-4 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-orange-200 transition-all cursor-pointer relative"
                >
                  <div className="flex gap-3">
                    {item.userInputImage && (
                      <img src={item.userInputImage} className="w-16 h-16 object-cover rounded-xl flex-shrink-0" />
                    )}
                    <div className="flex-1 overflow-hidden">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-orange-400 uppercase tracking-tighter">{item.category}</span>
                        <button 
                          onClick={(e) => deleteHistoryItem(item.id, e)}
                          className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all p-1"
                        >
                          <Icons.Trash />
                        </button>
                      </div>
                      <h4 className="font-bold text-gray-800 truncate">{item.feedback.recipeName}</h4>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {new Date(item.timestamp).toLocaleDateString()} · 小白进度+1
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      <footer className="mt-20 py-10 text-center border-t border-orange-50">
        <p className="text-gray-300 text-xs font-medium">ChefMentor · 让下厨像呼吸一样自然</p>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #fee2e2; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default App;
