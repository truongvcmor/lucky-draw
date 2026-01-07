import React from 'react';

interface ControlBarProps {
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
  onHome, 
  onUndo, 
  onRedo, 
  onToggleMute, 
  onOpenSettings, 
  isMuted,
  canUndo,
  canRedo
}) => {
  return (
    <div className="fixed bottom-4 left-4 z-[50] flex items-center space-x-2 p-1.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
      
      {/* Home */}
      <button 
        onClick={onHome}
        className="w-10 h-10 flex items-center justify-center rounded-full bg-mor-blue hover:bg-blue-500 text-white transition-all duration-200 hover:scale-110 shadow-lg cursor-pointer"
        title="Trang chủ"
      >
        🏠
      </button>

      {/* Divider */}
      <div className="w-px h-6 bg-white/20 mx-1"></div>

      {/* Undo */}
      <button 
        onClick={onUndo}
        disabled={!canUndo}
        className={`w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 shadow-lg cursor-pointer
          ${canUndo ? 'bg-gray-700 hover:bg-gray-600 text-white hover:scale-110' : 'bg-gray-800/50 text-gray-500 cursor-not-allowed'}
        `}
        title="Hoàn tác (Undo)"
      >
        ↩️
      </button>

      {/* Redo */}
      <button 
        onClick={onRedo}
        disabled={!canRedo}
        className={`w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 shadow-lg cursor-pointer
          ${canRedo ? 'bg-gray-700 hover:bg-gray-600 text-white hover:scale-110' : 'bg-gray-800/50 text-gray-500 cursor-not-allowed'}
        `}
        title="Làm lại (Redo)"
      >
        ↪️
      </button>

      {/* Divider */}
      <div className="w-px h-6 bg-white/20 mx-1"></div>

      {/* Mute */}
      <button 
        onClick={onToggleMute}
        className={`w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 hover:scale-110 shadow-lg cursor-pointer
          ${isMuted ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-white'}
        `}
        title={isMuted ? "Bật âm thanh" : "Tắt âm thanh"}
      >
        {isMuted ? '🔇' : '🔊'}
      </button>

      {/* Settings */}
      <button 
        onClick={onOpenSettings}
        className="w-10 h-10 flex items-center justify-center rounded-full bg-mor-orange hover:bg-orange-500 text-white transition-all duration-200 hover:scale-110 hover:rotate-90 shadow-lg cursor-pointer"
        title="Cấu hình"
      >
        ⚙️
      </button>

    </div>
  );
};

export default ControlBar;