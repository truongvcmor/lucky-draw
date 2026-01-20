import React, { useState, useRef } from 'react';

interface SlidePanelProps {
  onBack: () => void;
}

const SlidePanel: React.FC<SlidePanelProps> = ({ onBack }) => {
  // State lưu source của slide: có thể là URL (Canva) hoặc Blob URL (File PDF/Ảnh)
  const [slideSrc, setSlideSrc] = useState<string | null>(localStorage.getItem('mor_slide_src'));
  const [inputType, setInputType] = useState<'URL' | 'FILE'>('URL');
  const [urlInput, setUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Xử lý lưu URL Canva/Google Slide
  const handleSaveUrl = () => {
    let finalUrl = urlInput.trim();
    if (!finalUrl) return;
    
    // 1. Nếu người dùng copy cả thẻ <iframe src="...">
    const srcMatch = finalUrl.match(/src="([^"]+)"/);
    if (srcMatch && srcMatch[1]) {
      finalUrl = srcMatch[1];
    }

    // 2. Xử lý Link Canva (Tự động chuyển Link View -> Link Embed)
    // Ví dụ: .../view -> .../view?embed
    if (finalUrl.includes('canva.com')) {
      // BƯỚC QUAN TRỌNG: Nếu là link /watch, đổi ngay thành /view
      if (finalUrl.includes('/watch')) {
        finalUrl = finalUrl.replace('/watch', '/view');
      }
    }


    if (finalUrl.includes('canva.com') && finalUrl.includes('/view')) {
      if (!finalUrl.includes('embed')) {
        // Kiểm tra xem URL đã có tham số chưa (?)
        finalUrl = finalUrl.includes('?') 
          ? `${finalUrl}&embed` 
          : `${finalUrl}?embed`;
      }
    }

    setSlideSrc(finalUrl);
    localStorage.setItem('mor_slide_src', finalUrl);
  };

  // Xử lý Upload File (PDF/Image)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setSlideSrc(objectUrl);
      // Lưu ý: Blob URL không lưu được vào localStorage lâu dài, 
      // nhưng với app chạy sự kiện 1 lần thì ổn.
    }
  };

  const handleClear = () => {
    setSlideSrc(null);
    localStorage.removeItem('mor_slide_src');
    setUrlInput('');
  };

  return (
    <div className="flex flex-col h-full w-full relative animate-fade-in">
      {/* Header Controls */}
      <div className="absolute top-4 left-4 z-50 flex gap-2">
        <button 
          onClick={onBack}
          className="bg-black/40 hover:bg-black/60 text-white px-4 py-2 rounded-full backdrop-blur-md border border-white/10 transition-all flex items-center gap-2"
        >
          <span>⬅️</span> Quay lại
        </button>

        {slideSrc && (
          <button 
            onClick={handleClear}
            className="bg-mor-orange/80 hover:bg-mor-orange text-white px-4 py-2 rounded-full backdrop-blur-md border border-white/10 transition-all shadow-lg"
          >
            ⚙️ Cấu hình lại
          </button>
        )}
      </div>

      {/* VIEW MODE */}
      {slideSrc ? (
        <div className="w-full h-full bg-black flex items-center justify-center">
          <iframe 
            src={slideSrc} 
            className="w-full h-full border-0"
            allowFullScreen
            allow="autoplay; fullscreen"
            title="Presentation Slide"
          />
        </div>
      ) : (
        /* CONFIG MODE */
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="bg-[#0B1E33]/90 backdrop-blur-xl p-8 rounded-2xl border border-white/10 shadow-2xl max-w-lg w-full text-center">
            <div className="text-5xl mb-4">📊</div>
            <h2 className="text-2xl font-bold text-white mb-2 uppercase tracking-widest">Trình Chiếu Slide</h2>
            <p className="text-gray-400 mb-6 text-sm">Hỗ trợ Canva, Google Slides hoặc file PDF</p>

            {/* Tabs */}
            <div className="flex bg-black/20 p-1 rounded-lg mb-6">
              <button 
                onClick={() => setInputType('URL')}
                className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${inputType === 'URL' ? 'bg-mor-blue text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
              >
                🔗 Link Online (Canva)
              </button>
              <button 
                onClick={() => setInputType('FILE')}
                className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${inputType === 'FILE' ? 'bg-mor-blue text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
              >
                📂 File Offline (PDF)
              </button>
            </div>

            {/* Input Area */}
            {inputType === 'URL' ? (
              <div className="space-y-4">
                <input 
                  type="text" 
                  placeholder="Dán Embed Link Canva hoặc URL tại đây..."
                  className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-mor-gold focus:ring-1 focus:ring-mor-gold transition-all"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                />
                <div className="text-xs text-left text-gray-500 bg-white/5 p-3 rounded-lg border border-white/5">
                  <strong>Mẹo Canva:</strong> Chọn Share &rarr; Embed &rarr; Copy Smart Embed Link.
                </div>
                <button 
                  onClick={handleSaveUrl}
                  disabled={!urlInput}
                  className="w-full py-3 bg-gradient-to-r from-mor-gold to-mor-orange text-white font-bold rounded-xl shadow-lg hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  BẮT ĐẦU TRÌNH CHIẾU
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                 <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-white/20 hover:border-mor-gold rounded-xl p-8 cursor-pointer transition-all bg-white/5 hover:bg-white/10 group"
                 >
                    <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">📄</div>
                    <div className="text-sm text-gray-300">Nhấn để chọn file PDF</div>
                    <div className="text-xs text-gray-500 mt-1">(Khuyên dùng PDF thay vì PPTX để không lỗi font)</div>
                 </div>
                 <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="application/pdf,image/*"
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

export default SlidePanel;