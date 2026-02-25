import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, onSnapshot, addDoc, deleteDoc, query, writeBatch } from 'firebase/firestore';
import { 
  Calendar, Wallet, CloudSun, MapPin, Languages, RefreshCw, Plus, Trash2, 
  Play, Navigation, Info, Car, FileCheck, ExternalLink, Fish, ShoppingBag, Utensils, Plane, ChevronRight, RotateCcw
} from 'lucide-react';

// --- Firebase 配置 ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'seoul-travel-2026-v7';

const API_KEY = ""; // Gemini API Key

const App = () => {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('itinerary');
  const [itinerary, setItinerary] = useState([]);
  const [weatherAdvice, setWeatherAdvice] = useState("");
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);

  // --- 初始化與監聽 ---
  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubItinerary = onSnapshot(
      query(collection(db, 'artifacts', appId, 'public', 'data', 'itinerary')), 
      (snapshot) => {
        setItinerary(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => a.time.localeCompare(b.time)));
      }
    );
    return () => unsubItinerary();
  }, [user]);

  // --- 天氣獲取 ---
  useEffect(() => {
    const fetchWeather = async () => {
      setIsLoadingWeather(true);
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: "請針對 2026 年 3/18 到 3/22 前往韓國首爾旅遊提供天氣概況及穿著建議（繁體中文）。" }] }] })
        });
        const data = await response.json();
        setWeatherAdvice(data.candidates?.[0]?.content?.parts?.[0]?.text || "氣候資料載入中...");
      } catch (e) { setWeatherAdvice("天氣分析獲取失敗"); }
      setIsLoadingWeather(false);
    };
    fetchWeather();
  }, []);

  const openNaverMap = (query) => {
    window.open(`https://map.naver.com/v5/search/${encodeURIComponent(query)}`, '_blank');
  };

  const MY_SCHEDULE_TEMPLATE = [
    { day: '03-18', time: '14:40', content: '🛬 抵達首爾機場 (LJ736)' },
    { day: '03-18', time: '15:00', content: '🏨 民宿 Check in (弘大 2 號出口附近)' },
    { day: '03-18', time: '17:00', content: '💰 弘大換錢 & 逛弘大商圈' },
    { day: '03-18', time: '19:00', content: '🍲 晚餐：弘大一隻雞' },
    { day: '03-19', time: '09:30', content: '🏯 景福宮巡禮' },
    { day: '03-19', time: '12:00', content: '🥯 倫敦貝果安國站 (青蔥乳酪貝果)' },
    { day: '03-19', time: '14:00', content: '🏘️ 北村韓屋村散步' },
    { day: '03-19', time: '16:00', content: '🧸 昌信洞玩具街 (東大門4號出口右轉黃布條)' },
    { day: '03-19', time: '18:30', content: '🛒 樂天超市首爾站 (10:00-00:00)' },
    { day: '03-19', time: '20:30', content: '🍗 晚餐：豬腳小姐 或 蒜辣雞湯' },
    { day: '03-20', time: '10:00', content: '🥞 廣藏市場 (在地小吃)' },
    { day: '03-20', time: '13:00', content: '🦈 COEX 水族館 (10:00-20:00)' },
    { day: '03-20', time: '15:30', content: '📚 星空圖書館 (10:30-22:00)' },
    { day: '03-20', time: '18:00', content: '🛍️ 明洞逛街 (辣炒年糕 Aha / Line Friend / 龍鬚糖)' },
    { day: '03-20', time: '21:00', content: '🥩 晚餐：明洞餃子 或 烤肉' },
    { day: '03-21', time: '08:00', content: '🚗 包車春川出發 (08:00-21:00)' },
    { day: '03-21', time: '10:30', content: '🧱 樂高樂園 (必玩：LEGO CASTLE / 避雷：Factory)' },
    { day: '03-21', time: '14:30', content: '🥔 春川馬鈴薯烘焙坊' },
    { day: '03-21', time: '16:00', content: '☕ 春川 E 沿湖星巴克 (九峰山)' },
    { day: '03-21', time: '18:30', content: '🥘 晚餐：馬鈴薯雞骨湯' },
    { day: '03-22', time: '11:00', content: '🔑 退房 Check out' },
    { day: '03-22', time: '14:25', content: '🛫 仁川機場 T2 起飛 (TW669)' }
  ];

  const handleLoadTemplate = async () => {
    if (itinerary.length > 0) {
      if (!confirm('這將會重置所有行程並載入您的原始排程，確定嗎？')) return;
      const batchDelete = writeBatch(db);
      itinerary.forEach(item => {
        batchDelete.delete(doc(db, 'artifacts', appId, 'public', 'data', 'itinerary', item.id));
      });
      await batchDelete.commit();
    }
    const batchAdd = writeBatch(db);
    MY_SCHEDULE_TEMPLATE.forEach(item => {
      const newRef = doc(collection(db, 'artifacts', appId, 'public', 'data', 'itinerary'));
      batchAdd.set(newRef, item);
    });
    await batchAdd.commit();
  };

  const handleDelete = async (itemId) => {
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'itinerary', itemId));
  };

  const ItineraryTab = () => {
    const [newNote, setNewNote] = useState('');
    const [newTime, setNewTime] = useState('10:00');
    const [newDay, setNewDay] = useState('03-18');

    const days = [
      { date: '03-18', label: 'Day 1 抵達' },
      { date: '03-19', label: 'Day 2 景福宮/玩具街' },
      { date: '03-20', label: 'Day 3 江南/明洞' },
      { date: '03-21', label: 'Day 4 春川包車' },
      { date: '03-22', label: 'Day 5 賦歸' }
    ];

    return (
      <div className="p-4 pb-[380px] space-y-6"> {/* 大幅增加底部 Padding 以防遮擋 */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-black flex items-center gap-2 text-gray-800">
            <Calendar className="text-blue-500" /> 行程表
          </h2>
          <button 
            onClick={handleLoadTemplate}
            className="text-[10px] font-bold bg-blue-50 text-blue-600 px-3 py-2 rounded-xl border border-blue-100 active:scale-95 transition-all"
          >
            <RotateCcw size={12} /> 載入原始排程
          </button>
        </div>

        {itinerary.length === 0 && (
          <div className="bg-white p-8 rounded-3xl border-2 border-dashed border-gray-200 text-center space-y-4">
            <p className="text-sm text-gray-400">目前沒有行程，請載入原始排程。</p>
            <button onClick={handleLoadTemplate} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold">載入行程</button>
          </div>
        )}

        {days.map(d => {
          const dayItems = itinerary.filter(i => i.day === d.date);
          if (dayItems.length === 0 && itinerary.length > 0) return null;

          return (
            <div key={d.date} className="relative">
              <div className="flex items-center gap-3 mb-3">
                <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 shadow-sm">{d.date}</span>
                <h3 className="font-bold text-gray-700">{d.label}</h3>
              </div>
              
              <div className="ml-4 border-l-2 border-dashed border-gray-200 pl-6 space-y-3">
                {dayItems.map(item => (
                  <div key={item.id} className="bg-white p-4 rounded-2xl border border-gray-100 flex justify-between items-center shadow-sm">
                    <div className="flex items-start gap-4">
                      <span className="text-[10px] font-mono font-black text-blue-500 mt-1">{item.time}</span>
                      <p className="text-sm text-gray-800 font-bold leading-relaxed">{item.content}</p>
                    </div>
                    <button 
                      onClick={() => handleDelete(item.id)}
                      className="ml-2 p-2 bg-red-50 text-red-500 rounded-xl active:bg-red-100"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* 新增面版 - 改為半透明玻璃質感且高度略縮 */}
        <div className="bg-white/95 backdrop-blur-md p-5 rounded-t-[2rem] shadow-[0_-10px_30px_rgba(0,0,0,0.08)] border-t border-gray-100 fixed bottom-[76px] left-0 right-0 max-w-md mx-auto z-40 px-6">
          <div className="flex items-center gap-2 mb-3">
            <Plus className="text-blue-500" size={16} />
            <p className="text-xs font-black text-gray-800 tracking-tight">新增或修改行程</p>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <select value={newDay} onChange={e => setNewDay(e.target.value)} className="w-full text-xs border-0 bg-gray-100 rounded-xl p-3 outline-none appearance-none">
              {days.map(d => <option key={d.date} value={d.date}>{d.date}</option>)}
            </select>
            <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} className="w-full text-xs border-0 bg-gray-100 rounded-xl p-3 outline-none" />
          </div>
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="要去哪裡？" 
              value={newNote} 
              onChange={e => setNewNote(e.target.value)} 
              className="flex-grow text-xs border-0 bg-gray-100 rounded-xl p-3 outline-none"
            />
            <button 
              onClick={async () => { if(newNote) { await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'itinerary'), { day: newDay, time: newTime, content: newNote }); setNewNote(''); } }} 
              className="bg-blue-600 text-white px-4 rounded-xl shadow-lg active:scale-95 transition-all"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const TransportTab = () => (
    <div className="p-4 pb-32 space-y-4">
      <h2 className="text-xl font-black flex items-center gap-2 text-gray-800"><MapPin className="text-red-500" /> Naver Maps 導航</h2>
      <div className="grid grid-cols-1 gap-3">
        {[
          "弘大 2 號出口", "景福宮", "倫敦貝果博物館 安國店", "昌信洞玩具街", 
          "樂天超市 首爾站", "廣藏市場", "COEX 水族館", "樂高樂園", "春川星巴克 九峰山"
        ].map(name => (
          <button key={name} onClick={() => openNaverMap(name)} className="bg-white p-5 rounded-3xl border border-gray-100 flex items-center justify-between shadow-sm active:bg-blue-50 transition-all">
            <div className="flex items-center gap-4">
              <div className="bg-blue-50 p-2 rounded-xl text-blue-500"><Navigation size={20} /></div>
              <span className="font-bold text-gray-800 text-sm">{name}</span>
            </div>
            <ChevronRight size={18} className="text-gray-300" />
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 max-w-md mx-auto shadow-2xl relative font-sans overflow-x-hidden">
      <header className="bg-white/90 backdrop-blur-lg px-6 pt-10 pb-4 border-b sticky top-0 z-50 flex justify-between items-end shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-gray-900">SEOUL <span className="text-blue-600">APP</span></h1>
          <p className="text-[10px] text-gray-400 font-black tracking-widest mt-1 uppercase">3/18 - 3/22 ｜ 全家旅遊</p>
        </div>
        <div className="bg-green-100 text-green-700 text-[9px] px-2 py-0.5 rounded-full font-black">同步中</div>
      </header>

      <main className="animate-in fade-in duration-500">
        {activeTab === 'itinerary' && <ItineraryTab />}
        {activeTab === 'transport' && <TransportTab />}
        {activeTab === 'weather' && (
          <div className="p-4 pb-32">
            <div className="bg-white p-8 rounded-[2rem] shadow-sm border text-sm text-gray-700 leading-relaxed">
              {isLoadingWeather ? "AI 氣候分析中..." : weatherAdvice}
            </div>
          </div>
        )}
        {activeTab === 'tools' && (
          <div className="p-4 space-y-4 pb-32">
             <div className="bg-red-50 border-2 border-red-100 p-6 rounded-[2rem] shadow-sm">
                <h3 className="text-red-700 font-black flex items-center gap-2 mb-2"><FileCheck size={20}/> 2026 入境新制</h3>
                <p className="text-xs text-red-800 mb-4 font-bold">自 2026/1/1 起，抵達前 72 小時須完成 e-Arrival Card。</p>
                <button onClick={() => window.open('https://www.e-arrivalcard.go.kr/portal/main/index.do?locale=CH', '_blank')} className="w-full bg-red-600 text-white p-4 rounded-2xl font-black shadow-lg">前往官方網站</button>
             </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-4 left-4 right-4 bg-gray-900 rounded-[2rem] p-3 z-50 flex justify-around shadow-2xl">
        {[
          { id: 'itinerary', icon: Calendar, label: '行程' },
          { id: 'transport', icon: MapPin, label: '導航' },
          { id: 'weather', icon: CloudSun, label: '天氣' },
          { id: 'tools', icon: Languages, label: '工具' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex flex-col items-center gap-1 flex-1 transition-all ${activeTab === tab.id ? 'text-blue-400 scale-110' : 'text-gray-500'}`}>
            <tab.icon size={22} strokeWidth={activeTab === tab.id ? 3 : 2} />
            <span className="text-[9px] font-bold uppercase tracking-tighter">{tab.label}</span>
          </button>
        ))}
      </nav>

      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;700;900&display=swap');
        body { font-family: 'Noto Sans TC', sans-serif; -webkit-tap-highlight-color: transparent; }
        ::-webkit-scrollbar { display: none; }
      `}} />
    </div>
  );
};

export default App;