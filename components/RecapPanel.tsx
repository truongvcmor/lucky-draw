import React, { useState, useRef, useEffect } from 'react';
import { saveVideoToDB, getAllVideosFromDB, deleteVideoFromDB, StoredVideo } from '../utils/videoStorage';

interface RecapPanelProps {
  onBack: () => void;
}

type VideoSourceType = 'FILE' | 'YOUTUBE';

interface VideoItem {
  id: string;
  type: VideoSourceType;
  src: string; // URL Blob (tạm thời) hoặc Link Youtube
  title: string;
  thumbnail?: string;
}

const STORAGE_KEY_PLAYLIST_YT = 'mor_recap_playlist_yt_only';
const STORAGE_KEY_CURRENT = 'mor_recap_current_id';

const RecapPanel: React.FC<RecapPanelProps> = ({ onBack }) => {
  
  // --- STATE ---
  const [playlist, setPlaylist] = useState<VideoItem[]>([]);
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [showAddModal, setShowAddModal] = useState(false);
  const [inputType, setInputType] = useState<'URL' | 'FILE'>('URL');
  const [urlInput, setUrlInput] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- 1. INITIAL LOAD (Chạy 1 lần khi mount) ---
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      
      // A. Load YouTube Links từ LocalStorage
      let youtubeItems: VideoItem[] = [];
      try {
        const savedYT = localStorage.getItem(STORAGE_KEY_PLAYLIST_YT);
        if (savedYT) youtubeItems = JSON.parse(savedYT);
      } catch (e) { console.error(e); }

      // B. Load File Videos từ IndexedDB
      let fileItems: VideoItem[] = [];
      try {
        const storedFiles = await getAllVideosFromDB();
        // Chuyển Blob thành URL để thẻ <video> đọc được
        fileItems = storedFiles.map((file) => ({
          id: file.id,
          type: 'FILE',
          src: URL.createObjectURL(file.blob), // Tạo URL tạm từ Blob
          title: file.name,
          thumbnail: ''
        }));
      } catch (e) { console.error("Lỗi load IndexedDB", e); }

      // C. Gộp và Set State
      // Sắp xếp theo ID (thời gian) để danh sách đúng thứ tự cũ
      const mergedList = [...youtubeItems, ...fileItems].sort((a, b) => Number(a.id) - Number(b.id));
      setPlaylist(mergedList);

      // D. Khôi phục video đang xem dở
      const lastPlayedId = localStorage.getItem(STORAGE_KEY_CURRENT);
      if (lastPlayedId && mergedList.some(v => v.id === lastPlayedId)) {
        setCurrentVideoId(lastPlayedId);
      } else if (mergedList.length > 0) {
        setCurrentVideoId(mergedList[0].id);
      }

      setLoading(false);
    };

    loadData();

    // Cleanup: Xóa các Blob URL khi component unmount để tránh rò rỉ bộ nhớ
    return () => {
      playlist.forEach(item => {
        if (item.type === 'FILE') URL.revokeObjectURL(item.src);
      });
    };
  }, []);

  // --- 2. EFFECT LƯU TRẠNG THÁI ---
  
  // Chỉ lưu YouTube link vào LocalStorage (File đã được lưu vào IndexedDB lúc add)
  useEffect(() => {
    if (!loading) {
      const youtubeOnly = playlist.filter(p => p.type === 'YOUTUBE');
      localStorage.setItem(STORAGE_KEY_PLAYLIST_YT, JSON.stringify(youtubeOnly));
    }
  }, [playlist, loading]);

  // Lưu ID video đang xem
  useEffect(() => {
    if (currentVideoId) {
      localStorage.setItem(STORAGE_KEY_CURRENT, currentVideoId);
    }
  }, [currentVideoId]);


  // --- HELPERS ---
  const getYouTubeID = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const getYouTubeEmbedUrl = (videoId: string) => {
    return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
  };

  // --- HANDLERS ---

  // Thêm YouTube
  const handleAddUrl = () => {
    const finalUrl = urlInput.trim();
    if (!finalUrl) return;
    const ytId = getYouTubeID(finalUrl);
    
    if (ytId) {
      const newItem: VideoItem = {
        id: Date.now().toString(),
        type: 'YOUTUBE',
        src: ytId,
        title: `YouTube Video ${playlist.filter(p=>p.type==='YOUTUBE').length + 1}`, 
        thumbnail: `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`
      };
      setPlaylist(prev => [...prev, newItem]);
      setUrlInput('');
      setShowAddModal(false);
      if (!currentVideoId) setCurrentVideoId(newItem.id);
    } else {
      alert("Link không hợp lệ!");
    }
  };

  // Thêm File (Lưu vào IndexedDB)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const newId = Date.now().toString();

      // 1. Tạo object hiển thị ngay lập tức
      const objectUrl = URL.createObjectURL(file);
      const newItem: VideoItem = {
        id: newId,
        type: 'FILE',
        src: objectUrl,
        title: file.name
      };

      // 2. Cập nhật UI trước cho mượt
      setPlaylist(prev => [...prev, newItem]);
      setShowAddModal(false);
      if (!currentVideoId) setCurrentVideoId(newId);

      // 3. Lưu ngầm vào IndexedDB
      try {
        await saveVideoToDB({
          id: newId,
          blob: file, // Lưu cả file blob
          name: file.name,
          type: 'FILE',
          timestamp: Date.now()
        });
        console.log("Đã lưu file vào IndexedDB");
      } catch (err) {
        console.error("Không thể lưu file (có thể do dung lượng quá lớn):", err);
        alert("Lỗi: File quá lớn hoặc trình duyệt chặn lưu trữ.");
      }
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string, type: VideoSourceType) => {
    e.stopPropagation();
    
    // Xóa khỏi UI
    setPlaylist(prev => prev.filter(p => p.id !== id));
    if (currentVideoId === id) {
       setCurrentVideoId(null);
       localStorage.removeItem(STORAGE_KEY_CURRENT);
    }

    // Xóa khỏi DB nếu là File
    if (type === 'FILE') {
       try {
         await deleteVideoFromDB(id);
       } catch (err) {
         console.error("Lỗi xóa DB", err);
       }
    }
  };

  const currentVideo = playlist.find(p => p.id === currentVideoId);

  return (
    <div className="flex h-full w-full relative bg-[#05101c] animate-fade-in overflow-hidden">
      
      {/* --- LEFT: MAIN PLAYER --- */}
      <div className="flex-1 relative flex items-center justify-center bg-black">
        <div className="absolute top-4 left-4 z-50">
           <button 
            onClick={onBack}
            className="bg-black/40 hover:bg-black/80 text-white px-4 py-2 rounded-full backdrop-blur-md border border-white/10 transition-all flex items-center gap-2 group"
          >
            <span className="group-hover:-translate-x-1 transition-transform">⬅️</span> Quay lại
          </button>
        </div>

        {loading ? (
          <div className="text-white animate-pulse">Đang khôi phục dữ liệu...</div>
        ) : currentVideo ? (
          <div key={currentVideo.id} className="w-full h-full animate-fade-in">
             {currentVideo.type === 'YOUTUBE' ? (
               <iframe 
                 src={getYouTubeEmbedUrl(currentVideo.src)} 
                 className="w-full h-full border-0"
                 allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                 allowFullScreen
                 title={currentVideo.title}
               />
             ) : (
               <video 
                 src={currentVideo.src} 
                 controls 
                 autoPlay 
                 className="w-full h-full object-contain"
                 onEnded={() => {
                    const idx = playlist.findIndex(p => p.id === currentVideoId);
                    if (idx !== -1 && idx < playlist.length - 1) {
                        setCurrentVideoId(playlist[idx + 1].id);
                    }
                 }}
               />
             )}
          </div>
        ) : (
          <div className="text-center text-gray-500">
             <div className="text-6xl mb-4 opacity-20">🎬</div>
             <p>Chưa chọn video nào</p>
          </div>
        )}
      </div>

      {/* --- RIGHT: PLAYLIST --- */}
      <div className="w-80 md:w-96 flex flex-col bg-[#0B1E33]/95 backdrop-blur-xl border-l border-white/10 relative z-40 shadow-2xl">
        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20">
           <h3 className="text-mor-gold font-bold uppercase tracking-widest flex items-center gap-2">
             <span>📑</span> Playlist ({playlist.length})
           </h3>
           <button 
             onClick={() => setShowAddModal(true)}
             className="w-8 h-8 rounded-full bg-mor-blue hover:bg-blue-500 text-white flex items-center justify-center transition-all shadow-lg hover:rotate-90"
           >
             +
           </button>
        </div>
        
        {/* Info Note: Đã bỏ cảnh báo mất file */}
        <div className="px-4 py-2 bg-green-900/20 text-[10px] text-green-400 border-b border-white/5 text-center">
           ✅ Đã bật chế độ lưu trữ vĩnh viễn (File & YouTube).
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-thin scrollbar-thumb-gray-600">
           {playlist.length === 0 && !loading && (
             <div className="text-gray-400 text-center text-sm italic mt-10 px-4">
                Danh sách trống.
             </div>
           )}

           {playlist.map((item) => {
             const isActive = item.id === currentVideoId;
             return (
               <div 
                 key={item.id}
                 onClick={() => setCurrentVideoId(item.id)}
                 className={`
                    group relative flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-all duration-300 border
                    ${isActive 
                      ? 'bg-white/10 border-mor-gold/50 shadow-[0_0_15px_rgba(255,215,0,0.1)] translate-x-1' 
                      : 'bg-transparent border-transparent hover:bg-white/5 hover:border-white/5'
                    }
                 `}
               >
                 {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-1 h-2/3 bg-mor-gold rounded-r-full shadow-[0_0_10px_#FFD700]"></div>
                 )}

                 <div className="relative w-24 h-14 rounded-lg bg-black flex-shrink-0 overflow-hidden border border-white/10">
                    {item.type === 'YOUTUBE' ? (
                      <img src={item.thumbnail} alt="" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl text-mor-blue bg-gray-900">
                        🎞️
                      </div>
                    )}
                    {/* Play Overlay */}
                    <div className={`absolute inset-0 flex items-center justify-center bg-black/40 ${isActive ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                       <span className="text-white text-xs">▶️</span>
                    </div>
                    {isActive && (
                      <div className="absolute bottom-1 right-1 flex gap-0.5 items-end h-3">
                         <div className="w-0.5 bg-mor-gold animate-[bounce_0.8s_infinite] h-2"></div>
                         <div className="w-0.5 bg-mor-gold animate-[bounce_1s_infinite] h-3"></div>
                         <div className="w-0.5 bg-mor-gold animate-[bounce_0.6s_infinite] h-1.5"></div>
                      </div>
                    )}
                 </div>

                 <div className="flex-1 min-w-0">
                    <div className={`text-sm font-bold truncate ${isActive ? 'text-mor-gold' : 'text-gray-200'}`}>
                      {item.title}
                    </div>
                    <div className="text-[10px] text-gray-500 uppercase font-bold mt-0.5 flex items-center gap-1">
                      {item.type === 'YOUTUBE' ? (
                          <span className="text-red-500 flex items-center gap-1">YouTube</span>
                      ) : (
                          <span className="text-blue-400 flex items-center gap-1">Upload Local</span>
                      )}
                    </div>
                 </div>

                 <button 
                   onClick={(e) => handleDelete(e, item.id, item.type)}
                   className="p-1.5 rounded-full hover:bg-red-500/20 text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                   title="Xóa"
                 >
                   ✕
                 </button>
               </div>
             );
           })}
        </div>
      </div>

      {/* --- MODAL ADD --- */}
      {showAddModal && (
        <div className="absolute inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
           <div className="bg-[#152a42] border border-white/20 rounded-2xl w-full max-w-md shadow-2xl transform scale-100 animate-in zoom-in-95 duration-200">
              <div className="p-4 border-b border-white/10 flex justify-between items-center">
                 <h3 className="text-white font-bold text-lg">Thêm Video</h3>
                 <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-white">✕</button>
              </div>
              <div className="p-6">
                 <div className="flex bg-black/40 p-1 rounded-lg mb-6">
                    <button onClick={() => setInputType('URL')} className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${inputType === 'URL' ? 'bg-mor-blue text-white' : 'text-gray-400 hover:text-white'}`}>Link YouTube</button>
                    <button onClick={() => setInputType('FILE')} className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${inputType === 'FILE' ? 'bg-mor-blue text-white' : 'text-gray-400 hover:text-white'}`}>File Upload</button>
                 </div>
                 {inputType === 'URL' ? (
                   <div className="space-y-4">
                      <input type="text" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="Dán link YouTube..." className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white outline-none focus:border-mor-gold" autoFocus />
                      <button onClick={handleAddUrl} className="w-full py-3 bg-gradient-to-r from-mor-gold to-mor-orange text-white font-bold rounded-xl shadow-lg hover:opacity-90">Lưu YouTube</button>
                   </div>
                 ) : (
                   <div className="space-y-4">
                      <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-white/20 hover:border-mor-gold rounded-xl h-32 flex flex-col items-center justify-center cursor-pointer bg-white/5 hover:bg-white/10 group">
                         <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">📂</span>
                         <span className="text-sm text-gray-300">Chọn file từ máy</span>
                         <span className="text-[10px] text-green-400 mt-1">Sẽ được lưu vĩnh viễn</span>
                      </div>
                      <input type="file" ref={fileInputRef} className="hidden" accept="video/*" onChange={handleFileUpload} />
                   </div>
                 )}
              </div>
           </div>
        </div>
      )}

    </div>
  );
};

export default RecapPanel;