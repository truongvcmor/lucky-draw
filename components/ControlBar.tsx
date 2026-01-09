import React from 'react';

type ViewState = 'HOME' | 'GAME' | 'RECAP' | 'SLIDE';

interface ControlBarProps {
  currentView: string;
  onNavigate: (view: ViewState) => void;
  
  onHome: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onToggleMute: () => void;
  onOpenSettings: () => void;
  isMuted: boolean;
  canUndo: boolean;
  canRedo: boolean;
}

const ControlBar: React.FC<ControlBarProps> = ({ 
  currentView,
  onNavigate,
  onHome, 
  onUndo, 
  onRedo, 
  onToggleMute, 
  onOpenSettings, 
  isMuted,
  canUndo,
  canRedo
}) => {

  // Helper để style nút active
  const getNavClass = (view: string) => `
    w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 shadow-lg cursor-pointer
    ${currentView === view 
      ? 'bg-gradient-to-br from-mor-gold to-orange-500 text-black scale-110 shadow-orange-500/50' 
      : 'bg-gray-700/50 hover:bg-gray-600 text-gray-300 hover:text-white hover:scale-105'
    }
  `;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 md:translate-x-0 md:left-4 z-[50] flex items-center gap-2 p-2 bg-[#0B1E33]/80 backdrop-blur-xl border border-white/20 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.5)] animate-fade-in-up">
      
      {/* 1. Nhóm Điều Hướng (Navigation) */}
      <div className="flex items-center gap-1.5 pr-2 border-r border-white/20">
        <button 
          onClick={onHome}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-mor-blue hover:bg-blue-500 text-white transition-all duration-200 hover:scale-110 shadow-lg cursor-pointer"
          title="Về Trang Chủ"
        >
          🏠
        </button>

        {/* Lucky Draw */}
        <button 
          onClick={() => onNavigate('GAME')}
          className={getNavClass('GAME')}
          title="Vòng Quay May Mắn"
        >
          🎡
        </button>

        {/* Slide */}
        <button 
          onClick={() => onNavigate('SLIDE')}
          className={getNavClass('SLIDE')}
          title="Trình Chiếu Slide"
        >
          📊
        </button>

        {/* Recap */}
        <button 
          onClick={() => onNavigate('RECAP')}
          className={getNavClass('RECAP')}
          title="Video Recap 2025"
        >
          🎬
        </button>
      </div>

      {/* 2. Nhóm Tác Vụ Game (Undo/Redo) - Chỉ hiện khi ở màn hình GAME */}
      {currentView === 'GAME' && (
        <div className="flex items-center gap-1.5 px-2 border-r border-white/20">
          <button 
            onClick={onUndo}
            disabled={!canUndo}
            className={`w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 shadow-lg cursor-pointer
              ${canUndo ? 'bg-gray-700 hover:bg-gray-600 text-white hover:scale-110' : 'bg-gray-800/30 text-gray-600 cursor-not-allowed'}
            `}
            title="Hoàn tác (Undo)"
          >
            ↩️
          </button>

          <button 
            onClick={onRedo}
            disabled={!canRedo}
            className={`w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 shadow-lg cursor-pointer
              ${canRedo ? 'bg-gray-700 hover:bg-gray-600 text-white hover:scale-110' : 'bg-gray-800/30 text-gray-600 cursor-not-allowed'}
            `}
            title="Làm lại (Redo)"
          >
            ↪️
          </button>
        </div>
      )}

      {/* 3. Nhóm Cài Đặt (Sound/Admin) */}
      <div className="flex items-center gap-1.5 pl-1">
        <button 
          onClick={onToggleMute}
          className={`w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 hover:scale-110 shadow-lg cursor-pointer
            ${isMuted ? 'bg-red-500/80 hover:bg-red-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-white'}
          `}
          title={isMuted ? "Bật âm thanh" : "Tắt âm thanh"}
        >
          {isMuted ? '🔇' : '🔊'}
        </button>

        {/* Chỉ hiện nút Admin ở màn hình GAME (hoặc hiện luôn tùy bạn) */}
        {currentView === 'GAME' && (
          <button 
            onClick={onOpenSettings}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-mor-orange hover:bg-orange-500 text-white transition-all duration-200 hover:scale-110 hover:rotate-90 shadow-lg cursor-pointer"
            title="Cấu hình Admin"
          >
            ⚙️
          </button>
        )}
      </div>

    </div>
  );
};

export default ControlBar;