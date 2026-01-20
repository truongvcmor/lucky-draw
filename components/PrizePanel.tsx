import React from 'react';
import { Prize } from '../types';

interface PrizePanelProps {
  prizes: Prize[];
  selectedPrizeId: string | null;
  onSelectPrize: (id: string) => void;
  isSpinning: boolean;
}

const PrizePanel: React.FC<PrizePanelProps> = ({ prizes, selectedPrizeId, onSelectPrize, isSpinning }) => {
  return (
    <div className="flex flex-col h-full w-full">
      {/* Header - Fixed at top */}
      <div className="flex-shrink-0 mb-4 px-1">
        <h3 className="text-mor-orange font-black text-xl uppercase tracking-widest drop-shadow-md border-b border-white/10 pb-2 flex items-center gap-2">
          <span className="text-2xl">🎟️</span> Giải thưởng
        </h3>
      </div>
      
      {/* List - Scrollable */}
      <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 pb-2 px-1">
        {prizes.map((prize) => {
          const isSelected = selectedPrizeId === prize.id;
          const isSoldOut = prize.quantity === 0;
          const percentage = Math.round((prize.quantity / prize.initialQuantity) * 100) || 0;

          // --- LOGIC SIZE CHỮ ĐỘNG ---
          const getTitleSizeClass = (text: string) => {
            const len = text.length;
            if (len > 25) return 'text-[10px] leading-3'; 
            if (len > 18) return 'text-xs leading-3';      
            if (len > 10) return 'text-sm leading-4';      
            return 'text-lg leading-tight';                
          };

          return (
            <div 
              key={prize.id}
              onClick={() => !isSpinning && !isSoldOut && onSelectPrize(prize.id)}
              className={`
                group relative w-full flex items-stretch h-24 cursor-pointer transition-all duration-300
                ${isSoldOut ? 'opacity-40 grayscale pointer-events-none' : 'hover:-translate-y-1'}
                ${isSelected ? 'scale-[1.02] z-10' : ''}
              `}
            >
              {/* --- BACKGROUND GLOW for Selected --- */}
              {isSelected && (
                <div className="absolute -inset-0.5 bg-gradient-to-r from-mor-gold to-mor-orange rounded-xl blur opacity-75 animate-pulse"></div>
              )}

              {/* --- TICKET BODY (Left) --- */}
              <div className={`
                relative flex-1 rounded-l-xl border-r-2 border-dashed border-[#05101c] p-3 flex flex-col justify-center overflow-hidden
                ${isSelected 
                  ? 'bg-gradient-to-br from-mor-blue to-[#003d7a] text-white' 
                  : 'bg-[#152a42] border border-white/5'
                }
              `}>
                {/* --- SHIMMER & SPARKLE EFFECTS for Selected --- */}
                {isSelected && (
                  <div className="absolute inset-0 pointer-events-none overflow-hidden">
                     {/* Moving Shine Bar */}
                     <div className="absolute top-0 bottom-0 left-0 w-2/3 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 animate-shimmer"></div>
                     
                     {/* Sparkles */}
                     <div className="absolute top-1 right-2 text-mor-gold text-[10px] animate-pulse">✦</div>
                     <div className="absolute top-1/2 left-1/4 text-white/40 text-[6px] animate-bounce-slow" style={{ animationDelay: '0.5s' }}>✨</div>
                     <div className="absolute bottom-1 right-1/3 text-mor-gold/60 text-[8px] animate-pulse" style={{ animationDelay: '1s' }}>✦</div>
                  </div>
                )}

                {/* Decorative Shine (Static) */}
                <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full blur-xl -translate-y-1/2 translate-x-1/2"></div>

                <div className="relative z-10">
                  {/* --- TÊN GIẢI THƯỞNG (ĐÃ SỬA: Áp dụng size chữ động) --- */}
                  <div className={`
                    font-black uppercase tracking-wide transition-all duration-300
                    ${getTitleSizeClass(prize.name)}
                    ${isSelected ? 'text-mor-gold drop-shadow-sm' : 'text-gray-200 group-hover:text-white'}
                  `}>
                    {prize.name}
                  </div>

                  {prize.info && (
                    <div className={`text-xs font-semibold mt-1 truncate ${isSelected ? 'text-white/90' : 'text-gray-400'}`}>
                      {prize.info}
                    </div>
                  )}
                  
                  {/* Progress Line */}
                  <div className="w-full h-1.5 mt-3 bg-black/40 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 rounded-full ${isSoldOut ? 'bg-gray-500' : (isSelected ? 'bg-mor-gold shadow-[0_0_8px_rgba(255,215,0,0.6)]' : 'bg-mor-orange')}`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <div className="text-[10px] mt-1 text-gray-400 font-medium">
                    {percentage > 0 ? `Còn ${percentage}%` : 'Đã hết'}
                  </div>
                </div>

                {/* Top Notch Cover (Simulates hole) */}
                <div className="absolute -top-3 -right-[9px] w-4 h-4 rounded-full bg-[#05101c] z-20"></div>
                {/* Bottom Notch Cover */}
                <div className="absolute -bottom-3 -right-[9px] w-4 h-4 rounded-full bg-[#05101c] z-20"></div>
              </div>

              {/* --- TICKET STUB (Right) --- */}
              <div className={`
                relative w-24 rounded-r-xl flex flex-col items-center justify-center p-2
                ${isSelected 
                  ? 'bg-mor-gold text-mor-dark' 
                  : 'bg-[#0f2033] border-y border-r border-white/5'
                }
              `}>
                {/* Left notches on the stub side to match visually */}
                <div className="absolute -top-3 -left-[9px] w-4 h-4 rounded-full bg-[#05101c] z-20"></div>
                <div className="absolute -bottom-3 -left-[9px] w-4 h-4 rounded-full bg-[#05101c] z-20"></div>

                <span className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-1">
                  SL
                </span>
                <span className={`text-3xl font-black ${isSelected ? 'text-mor-blue' : 'text-white'}`}>
                  {prize.quantity}
                </span>
              </div>
            </div>
          );
        })}

        {prizes.length === 0 && (
          <div className="text-gray-500 italic text-sm text-center p-8 border-2 border-dashed border-gray-700 rounded-xl bg-white/5">
            <div className="text-2xl mb-2">🎫</div>
            Chưa có giải thưởng nào.<br/>Vui lòng thêm trong Admin.
          </div>
        )}
      </div>
    </div>
  );
};

export default PrizePanel;