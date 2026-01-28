import React, { useState, useRef, useEffect, useCallback } from 'react';
import { saveVideoToDB, getAllVideosFromDB, deleteVideoFromDB } from '../utils/videoStorage';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

interface RecapPanelProps {
  onBack: () => void;
}

type VideoSourceType = 'FILE' | 'YOUTUBE';

interface VideoItem {
  id: string;
  type: VideoSourceType;
  src: string;
  title: string;
  thumbnail?: string; // Bây giờ thumbnail sẽ chứa base64 image cho Local Video
}

enum LoopMode {
  OFF = 'OFF',
  ALL = 'ALL',
  ONE = 'ONE',
}

const STORAGE_KEY_PLAYLIST_YT = 'mor_recap_playlist_yt_only';
const STORAGE_KEY_CURRENT = 'mor_recap_current_id';
const STORAGE_KEY_LOOP_MODE = 'mor_recap_loop_mode';

// --- HELPER: Tạo thumbnail từ File Video ---
const generateVideoThumbnail = (file: File | Blob): Promise<string> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const video = document.createElement('video');
    
    // Tối ưu hiệu năng
    video.autoplay = false;
    video.muted = true;
    video.playsInline = true; 
    
    // Tạo URL tạm
    const url = URL.createObjectURL(file);
    video.src = url;

    // Khi video load xong meta data, tua đến giây thứ 1 (để tránh màn hình đen ở giây 0)
    video.onloadeddata = () => {
      video.currentTime = 1; 
    };

    // Khi đã tua xong, chụp ảnh
    video.onseeked = () => {
      // Set kích thước canvas (nhỏ thôi để nhẹ)
      canvas.width = 320;
      canvas.height = 180;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7); // Chất lượng 70%
        resolve(dataUrl);
      } else {
        resolve('');
      }
      // Dọn dẹp
      URL.revokeObjectURL(url);
    };

    // Xử lý lỗi (nếu file không phải video chuẩn)
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve('');
    };
  });
};

const RecapPanel: React.FC<RecapPanelProps> = ({ onBack }) => {
  
  // --- STATE ---
  const [playlist, setPlaylist] = useState<VideoItem[]>([]);
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // --- CONTROLS ---
  const [isPlaying, setIsPlaying] = useState(false);
  const [loopMode, setLoopMode] = useState<LoopMode>(LoopMode.OFF);
  
  // --- UI ---
  const [showAddModal, setShowAddModal] = useState(false);
  const [inputType, setInputType] = useState<'URL' | 'FILE'>('URL');
  const [urlInput, setUrlInput] = useState('');
  
  // --- REFS ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // --- 1. INITIAL LOAD ---
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      
      // A. Load YouTube Links
      let youtubeItems: VideoItem[] = [];
      try {
        const savedYT = localStorage.getItem(STORAGE_KEY_PLAYLIST_YT);
        if (savedYT) youtubeItems = JSON.parse(savedYT);
      } catch (e) { console.error(e); }

      // B. Load File Videos từ IndexedDB & Tạo Thumbnail
      let fileItems: VideoItem[] = [];
      try {
        const storedFiles = await getAllVideosFromDB();
        
        // Dùng Promise.all để tạo thumbnail song song cho nhanh
        fileItems = await Promise.all(storedFiles.map(async (file) => {
          const thumb = await generateVideoThumbnail(file.blob); // Tạo thumbnail
          return {
            id: file.id,
            type: 'FILE',
            src: URL.createObjectURL(file.blob),
            title: file.name,
            thumbnail: thumb // Lưu thumbnail vào item
          };
        }));
      } catch (e) { console.error("Lỗi load IndexedDB", e); }

      // C. Merge & Sort
      const mergedList = [...youtubeItems, ...fileItems].sort((a, b) => Number(a.id) - Number(b.id));
      setPlaylist(mergedList);

      // D. Restore State
      const lastPlayedId = localStorage.getItem(STORAGE_KEY_CURRENT);
      if (lastPlayedId && mergedList.some(v => v.id === lastPlayedId)) {
        setCurrentVideoId(lastPlayedId);
      } else if (mergedList.length > 0) {
        setCurrentVideoId(mergedList[0].id);
      }

      const savedLoopMode = localStorage.getItem(STORAGE_KEY_LOOP_MODE) as LoopMode;
      setLoopMode(savedLoopMode || LoopMode.OFF);

      setLoading(false);
    };

    loadData();

    return () => {
      playlist.forEach(item => {
        if (item.type === 'FILE') URL.revokeObjectURL(item.src);
      });
    };
  }, []);

  // --- SAVING EFFECTS ---
  useEffect(() => {
    if (!loading) {
      const youtubeOnly = playlist.filter(p => p.type === 'YOUTUBE');
      localStorage.setItem(STORAGE_KEY_PLAYLIST_YT, JSON.stringify(youtubeOnly));
    }
  }, [playlist, loading]);

  useEffect(() => {
    if (currentVideoId) {
      localStorage.setItem(STORAGE_KEY_CURRENT, currentVideoId);
      setIsPlaying(false);
    }
  }, [currentVideoId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_LOOP_MODE, loopMode);
  }, [loopMode]);

  // --- HELPERS ---
  const getYouTubeID = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const getYouTubeEmbedUrl = (videoId: string) => {
    return `https://www.youtube.com/embed/${videoId}?autoplay=0&enablejsapi=1&rel=0&controls=0`;
  };

  const sendYoutubeCommand = (func: string, args: any[] = []) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage(JSON.stringify({
          'event': 'command', 'func': func, 'args': args
        }), '*');
      } catch (e) { console.error(e); }
    }
  };

  // --- PLAYER ACTIONS ---
  const handlePlayPause = () => {
    const currentVideo = playlist.find(p => p.id === currentVideoId);
    if (!currentVideo) return;
    const v = videoRef.current;
    const i = iframeRef.current?.contentWindow;

    if (isPlaying) {
      if (currentVideo.type === 'FILE' && v) v.pause();
      else if (currentVideo.type === 'YOUTUBE' && i) sendYoutubeCommand('pauseVideo');
    } else {
      if (currentVideo.type === 'FILE' && v) v.play();
      else if (currentVideo.type === 'YOUTUBE' && i) sendYoutubeCommand('playVideo');
    }
    setIsPlaying(!isPlaying);
  };

  const handleStop = () => {
    const currentVideo = playlist.find(p => p.id === currentVideoId);
    if (!currentVideo) return;
    const v = videoRef.current;
    if (currentVideo.type === 'FILE' && v) {
      v.pause();
      v.currentTime = 0;
    } else if (currentVideo.type === 'YOUTUBE') {
      sendYoutubeCommand('stopVideo');
    }
    setIsPlaying(false);
  };

  const handleSeek = (seconds: number) => {
    const v = videoRef.current;
    if (v && playlist.find(p => p.id === currentVideoId)?.type === 'FILE') {
      v.currentTime = Math.max(0, Math.min(v.currentTime + seconds, v.duration));
    }
  };

  const handleToggleLoop = () => {
    const nextMode = (loopMode === LoopMode.OFF) ? LoopMode.ONE : (loopMode === LoopMode.ONE ? LoopMode.ALL : LoopMode.OFF);
    setLoopMode(nextMode);
  };

  const handleFullscreen = () => {
    videoRef.current?.requestFullscreen().catch(e => alert(e.message));
  };

  const handleVideoEnded = useCallback(() => {
    setIsPlaying(false);
    const currentVideo = playlist.find(p => p.id === currentVideoId);
    if (!currentVideo) return;

    if (currentVideo.type === 'FILE' && videoRef.current) {
       if (loopMode === LoopMode.ONE) {
          videoRef.current.currentTime = 0;
          videoRef.current.play();
          setIsPlaying(true);
       } else if (loopMode === LoopMode.ALL) {
          const idx = playlist.findIndex(p => p.id === currentVideoId);
          const nextId = (idx !== -1 && idx < playlist.length - 1) ? playlist[idx + 1].id : playlist[0].id;
          setCurrentVideoId(nextId);
       }
    } else if (currentVideo.type === 'YOUTUBE' && loopMode === LoopMode.ONE) {
       sendYoutubeCommand('playVideo');
       setIsPlaying(true);
    }
  }, [currentVideoId, playlist, loopMode]);

  // Sync isPlaying state
  useEffect(() => {
    const v = videoRef.current;
    const i = iframeRef.current?.contentWindow;
    const currentVideo = playlist.find(p => p.id === currentVideoId);

    if (!currentVideo) return;
    if (currentVideo.type === 'FILE' && v) {
      isPlaying ? v.play().catch(console.error) : v.pause();
    } else if (currentVideo.type === 'YOUTUBE' && i) {
      isPlaying ? sendYoutubeCommand('playVideo') : sendYoutubeCommand('pauseVideo');
    }
  }, [isPlaying, currentVideoId]);


  // --- HANDLERS: ADD/REMOVE ---
  const handleAddUrl = () => {
    const url = urlInput.trim();
    if (!url) return;
    const ytId = getYouTubeID(url);
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
    } else alert("Link lỗi!");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const newId = Date.now().toString();
      
      // 1. Tạo thumbnail ngay lập tức
      const thumb = await generateVideoThumbnail(file);

      const newItem: VideoItem = {
        id: newId,
        type: 'FILE',
        src: URL.createObjectURL(file),
        title: file.name,
        thumbnail: thumb // Lưu thumbnail
      };

      setPlaylist(prev => [...prev, newItem]);
      setShowAddModal(false);
      if (!currentVideoId) setCurrentVideoId(newId);

      try {
        await saveVideoToDB({
          id: newId, blob: file, name: file.name, type: 'FILE', timestamp: Date.now()
        });
      } catch (err) { alert("Lỗi lưu file (quá lớn)."); }
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string, type: VideoSourceType) => {
    e.stopPropagation();
    setPlaylist(prev => prev.filter(p => p.id !== id));
    if (currentVideoId === id) {
      setCurrentVideoId(null);
      setIsPlaying(false);
    }
    if (type === 'FILE') try { await deleteVideoFromDB(id); } catch(e) {}
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination || result.source.index === result.destination.index) return;
    setPlaylist(prev => {
      const list = [...prev];
      const [moved] = list.splice(result.source.index, 1);
      list.splice(result.destination.index, 0, moved);
      return list;
    });
  };

  const currentVideo = playlist.find(p => p.id === currentVideoId);

  // --- RENDER ---
  return (
    <div className="flex h-full w-full relative bg-[#05101c] animate-fade-in overflow-hidden">
      
      {/* LEFT: PLAYER */}
      <div className="flex-1 relative flex flex-col bg-black">
        <div className="absolute top-4 left-4 z-50">
           <button onClick={onBack} className="bg-black/40 hover:bg-black/80 text-white px-4 py-2 rounded-full backdrop-blur-md border border-white/10 flex items-center gap-2 group transition-all">
             <span className="group-hover:-translate-x-1 transition-transform">⬅️</span> Quay lại
           </button>
        </div>

        <div className="flex-1 flex items-center justify-center overflow-hidden bg-black">
          {loading ? (
            <div className="text-white animate-pulse">Loading...</div>
          ) : currentVideo ? (
            currentVideo.type === 'YOUTUBE' ? (
              <iframe ref={iframeRef} src={getYouTubeEmbedUrl(currentVideo.src)} className="w-full h-full border-0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title={currentVideo.title} />
            ) : (
              <video ref={videoRef} src={currentVideo.src} className="w-full h-full object-contain" onEnded={handleVideoEnded} onPlay={()=>setIsPlaying(true)} onPause={()=>setIsPlaying(false)} controls={false} />
            )
          ) : (
            <div className="text-center text-gray-500"><div className="text-6xl mb-4 opacity-20">🎬</div><p>Chọn video để phát</p></div>
          )}
        </div>

        {/* CONTROLS */}
        <div className="h-20 bg-[#0B1E33] border-t border-white/10 flex items-center justify-center gap-6 px-4 shrink-0 shadow-[0_-5px_20px_rgba(0,0,0,0.5)] z-40 relative">
             <div className="absolute left-6 text-sm text-gray-400 font-medium truncate max-w-[200px] hidden md:block">{currentVideo?.title || '...'}</div>
             
             <button onClick={() => handleSeek(-10)} disabled={!currentVideo || currentVideo.type === 'YOUTUBE'} className="control-btn w-10 h-10 rounded-full bg-white/5 hover:bg-white/20 flex items-center justify-center text-white disabled:opacity-20">⏪</button>
             <button onClick={handleStop} disabled={!currentVideo} className="control-btn w-12 h-12 rounded-full bg-red-900/50 hover:bg-red-600 text-white flex items-center justify-center border border-red-500/30 disabled:opacity-50">⏹</button>
             <button onClick={handlePlayPause} disabled={!currentVideo} className="control-btn w-16 h-16 rounded-full bg-mor-gold hover:bg-yellow-400 text-black text-2xl pl-1 flex items-center justify-center shadow-[0_0_15px_rgba(255,215,0,0.4)] hover:scale-110 active:scale-95 disabled:opacity-50">{isPlaying ? '⏸' : '▶'}</button>
             <button onClick={() => handleSeek(10)} disabled={!currentVideo || currentVideo.type === 'YOUTUBE'} className="control-btn w-10 h-10 rounded-full bg-white/5 hover:bg-white/20 flex items-center justify-center text-white disabled:opacity-20">⏩</button>
             
             {currentVideo?.type === 'FILE' && <button onClick={handleFullscreen} className="control-btn w-10 h-10 rounded-full bg-white/5 hover:bg-white/20 flex items-center justify-center text-white">🎦</button>}
             
             <button onClick={handleToggleLoop} disabled={!currentVideo || currentVideo.type === 'YOUTUBE'} className="control-btn w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-20 relative" title={`Loop: ${loopMode}`}>
                {loopMode === LoopMode.OFF ? '🔂' : loopMode === LoopMode.ONE ? '1️⃣' : '🔂↩️'}
                <div className={`absolute inset-0 rounded-full transition-all duration-200 ${loopMode !== LoopMode.OFF ? 'bg-mor-blue/20 shadow-[0_0_10px_#0054A6]' : ''}`}></div>
             </button>
        </div>
      </div>

      {/* RIGHT: PLAYLIST */}
      <div className="w-80 md:w-96 flex flex-col bg-[#0B1E33]/95 backdrop-blur-xl border-l border-white/10 relative z-40 shadow-2xl">
        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20 h-14">
           <h3 className="text-mor-gold font-bold uppercase tracking-widest flex items-center gap-2"><span>📑</span> Playlist ({playlist.length})</h3>
           <button onClick={() => setShowAddModal(true)} className="w-8 h-8 rounded-full bg-mor-blue hover:bg-blue-500 text-white flex items-center justify-center shadow-lg hover:rotate-90 transition-transform">+</button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-gray-600">
           {playlist.length === 0 && !loading && <div className="text-gray-400 text-center text-sm italic mt-10">Danh sách trống.</div>}
           <DragDropContext onDragEnd={onDragEnd}>
             <Droppable droppableId="playlist">
               {(provided) => (
                 <div ref={provided.innerRef} {...provided.droppableProps}>
                   {playlist.map((item, index) => {
                     const isActive = item.id === currentVideoId;
                     return (
                       <Draggable key={item.id} draggableId={item.id} index={index}>
                         {(provided, snapshot) => (
                           <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} onClick={() => setCurrentVideoId(item.id)}
                             className={`group relative flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-all duration-300 border mb-2 ${isActive ? 'bg-white/10 border-mor-gold/50 shadow-[0_0_15px_rgba(255,215,0,0.1)] translate-x-1' : 'bg-transparent border-transparent hover:bg-white/5'} ${snapshot.isDragging ? 'bg-mor-blue/50 scale-105' : ''}`}>
                             
                             {isActive && <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-1 h-2/3 bg-mor-gold rounded-r-full shadow-[0_0_10px_#FFD700]"></div>}
                             
                             <div className="relative w-24 h-14 rounded-lg bg-black flex-shrink-0 overflow-hidden border border-white/10">
                                {/* HIỂN THỊ THUMBNAIL */}
                                {item.thumbnail ? (
                                  <img src={item.thumbnail} alt="" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-2xl text-mor-blue bg-gray-900">🎞️</div>
                                )}
                                
                                {isActive && isPlaying && <div className="absolute inset-0 flex items-center justify-center bg-black/40"><div className="flex gap-0.5 items-end h-3"><div className="w-0.5 bg-mor-gold animate-bounce h-2"></div><div className="w-0.5 bg-mor-gold animate-bounce h-3 delay-75"></div><div className="w-0.5 bg-mor-gold animate-bounce h-1.5 delay-150"></div></div></div>}
                             </div>
                             
                             <div className="flex-1 min-w-0">
                                <div className={`text-sm font-bold truncate ${isActive ? 'text-mor-gold' : 'text-gray-200'}`}>{item.title}</div>
                                <div className="text-[10px] text-gray-500 uppercase font-bold mt-0.5">{item.type === 'YOUTUBE' ? <span className="text-red-500">YouTube</span> : <span className="text-blue-400">Local Video</span>}</div>
                             </div>
                             <button onClick={(e) => handleDelete(e, item.id, item.type)} className="p-1.5 rounded-full hover:bg-red-500/20 text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">✕</button>
                           </div>
                         )}
                       </Draggable>
                     );
                   })}
                   {provided.placeholder}
                 </div>
               )}
             </Droppable>
           </DragDropContext>
        </div>
      </div>

      {/* MODAL ADD */}
      {showAddModal && (
        <div className="absolute inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
           <div className="bg-[#152a42] border border-white/20 rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95">
              <div className="p-4 border-b border-white/10 flex justify-between items-center"><h3 className="text-white font-bold text-lg">Thêm Video</h3><button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-white">✕</button></div>
              <div className="p-6">
                 <div className="flex bg-black/40 p-1 rounded-lg mb-6">
                    <button onClick={() => setInputType('URL')} className={`flex-1 py-2 rounded-md text-sm font-bold ${inputType === 'URL' ? 'bg-mor-blue text-white' : 'text-gray-400 hover:text-white'}`}>Link YouTube</button>
                    <button onClick={() => setInputType('FILE')} className={`flex-1 py-2 rounded-md text-sm font-bold ${inputType === 'FILE' ? 'bg-mor-blue text-white' : 'text-gray-400 hover:text-white'}`}>File Upload</button>
                 </div>
                 {inputType === 'URL' ? (
                   <div className="space-y-4">
                      <input type="text" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="Link YouTube..." className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white focus:border-mor-gold outline-none" autoFocus />
                      <button onClick={handleAddUrl} className="w-full py-3 bg-gradient-to-r from-mor-gold to-mor-orange text-white font-bold rounded-xl shadow-lg hover:opacity-90">Lưu YouTube</button>
                   </div>
                 ) : (
                   <div className="space-y-4">
                      <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-white/20 hover:border-mor-gold rounded-xl h-32 flex flex-col items-center justify-center cursor-pointer bg-white/5 hover:bg-white/10 group">
                         <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">📂</span><span className="text-sm text-gray-300">Chọn file từ máy</span>
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