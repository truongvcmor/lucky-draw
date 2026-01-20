// components/RecapPanel.tsx
import React, { useState, useRef, useEffect } from 'react';

interface RecapPanelProps {
  onBack: () => void;
}

type VideoSourceType = 'FILE' | 'YOUTUBE' | 'URL';

const RecapPanel: React.FC<RecapPanelProps> = ({ onBack }) => {
  // State
  const [videoSrc, setVideoSrc] = useState<string | null>(localStorage.getItem('mor_recap_src'));
  const [sourceType, setSourceType] = useState<VideoSourceType>(
    (localStorage.getItem('mor_recap_type') as VideoSourceType) || 'URL'
  );
  
  const [inputType, setInputType] = useState<'URL' | 'FILE'>('URL');
  const [urlInput, setUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper: Chuyển link YouTube thường thành link Embed
  const getYouTubeEmbedUrl = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) 
      ? `https://www.youtube.com/embed/${match[2]}?autoplay=1` 
      : url;
  };

  // Xử lý lưu URL
  const handleSaveUrl = () => {
    let finalUrl = urlInput.trim();
    if (!finalUrl) return;

    let type: VideoSourceType = 'URL';

    // Kiểm tra nếu là YouTube
    if (finalUrl.includes('youtube.com') || finalUrl.includes('youtu.be')) {
      finalUrl = getYouTubeEmbedUrl(finalUrl);
      type = 'YOUTUBE';
    }

    setVideoSrc(finalUrl);
    setSourceType(type);
    
    // Lưu vào localStorage
    localStorage.setItem('mor_recap_src', finalUrl);
    localStorage.setItem('mor_recap_type', type);
  };

  // Xử lý Upload File Video
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setVideoSrc(objectUrl);
      setSourceType('FILE');
      // Lưu ý: Blob URL không lưu vào localStorage được vì nó chỉ tồn tại trong phiên làm việc
      // Ta chỉ lưu trạng thái type để biết
      localStorage.setItem('mor_recap_type', 'FILE');
    }
  };

  const handleClear = () => {
    setVideoSrc(null);
    localStorage.removeItem('mor_recap_src');
    localStorage.removeItem('mor_recap_type');
    setUrlInput('');
  };

  return (
    <div className="flex flex-col h-full w-full relative animate-fade-in bg-black">
      {/* Header Controls */}
      <div className="absolute top-4 left-4 z-50 flex gap-2 group">
        <button 
          onClick={onBack}
          className="bg-black/40 hover:bg-black/60 text-white px-4 py-2 rounded-full backdrop-blur-md border border-white/10 transition-all flex items-center gap-2"
        >
          <span>⬅️</span> Quay lại
        </button>

        {videoSrc && (
          <button 
            onClick={handleClear}
            className="bg-mor-orange/80 hover:bg-mor-orange text-white px-4 py-2 rounded-full backdrop-blur-md border border-white/10 transition-all shadow-lg opacity-0 group-hover:opacity-100"
          >
            ⚙️ Đổi Video
          </button>
        )}
      </div>

      {/* VIEW MODE */}
      {videoSrc ? (
        <div className="w-full h-full flex items-center justify-center overflow-hidden">
          {sourceType === 'YOUTUBE' ? (
            <iframe 
              src={videoSrc} 
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title="Recap Video"
            />
          ) : (
            <video 
              src={videoSrc} 
              controls 
              autoPlay 
              className="w-full h-full object-contain"
              // Loop nếu muốn video tự chạy lại
              // loop 
            />
          )}
        </div>
      ) : (
        /* CONFIG MODE */
        <div className="flex-1 flex flex-col items-center justify-center p-4 bg-[#05101c]">
          <div className="bg-[#0B1E33]/90 backdrop-blur-xl p-8 rounded-2xl border border-white/10 shadow-2xl max-w-lg w-full text-center">
            <div className="text-5xl mb-4">🎬</div>
            <h2 className="text-2xl font-bold text-white mb-2 uppercase tracking-widest">Recap Video 2025</h2>
            <p className="text-gray-400 mb-6 text-sm">Upload file video hoặc dán link YouTube</p>

            {/* Tabs */}
            <div className="flex bg-black/20 p-1 rounded-lg mb-6">
              <button 
                onClick={() => setInputType('FILE')}
                className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${inputType === 'FILE' ? 'bg-mor-blue text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
              >
                📂 File Video (MP4)
              </button>
              <button 
                onClick={() => setInputType('URL')}
                className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${inputType === 'URL' ? 'bg-mor-blue text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
              >
                🔗 YouTube / Link
              </button>
            </div>

            {/* Input Area */}
            {inputType === 'URL' ? (
              <div className="space-y-4">
                <input 
                  type="text" 
                  placeholder="Dán link YouTube hoặc URL video..."
                  className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-mor-gold focus:ring-1 focus:ring-mor-gold transition-all"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                />
                <button 
                  onClick={handleSaveUrl}
                  disabled={!urlInput}
                  className="w-full py-3 bg-gradient-to-r from-mor-gold to-mor-orange text-white font-bold rounded-xl shadow-lg hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  PHÁT VIDEO
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                 <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-white/20 hover:border-mor-gold rounded-xl p-8 cursor-pointer transition-all bg-white/5 hover:bg-white/10 group h-40 flex flex-col items-center justify-center"
                 >
                    <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">🎞️</div>
                    <div className="text-sm text-gray-300">Nhấn để chọn file Video</div>
                    <div className="text-xs text-gray-500 mt-1">Hỗ trợ MP4, MOV, WebM</div>
                 </div>
                 <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="video/*"
                    onChange={handleFileUpload}
                 />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RecapPanel;