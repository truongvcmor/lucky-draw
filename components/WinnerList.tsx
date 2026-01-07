import React from 'react';
import { WinRecord } from '../types';

interface WinnerListProps {
  history: WinRecord[];
}

const WinnerList: React.FC<WinnerListProps> = ({ history }) => {
  return (
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <div className="flex-shrink-0 mb-4 px-1">
        <h3 className="text-mor-gold font-black text-xl uppercase tracking-widest drop-shadow-md border-b border-white/10 pb-2 flex items-center gap-2 justify-end">
          Danh sách trúng thưởng <span className="text-2xl">🏆</span> 
        </h3>
      </div>

      {/* List Area */}
      <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 pb-2 px-1">
        {history.length === 0 ? (
          <div className="text-white italic text-sm text-center p-8 border-2 border-dashed border-gray-700 rounded-xl bg-white/5">
            <div className="text-2xl mb-2">⏳</div>
            Chưa có người trúng giải.<br/>Hãy quay số ngay!
          </div>
        ) : (
          history.map((record, index) => (
            <div 
              key={record.id}
              className="relative group bg-[#152a42] border border-white/5 p-3 rounded-xl flex items-center gap-3 animate-fade-in-left hover:bg-white/10 transition-colors"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Number Badge */}
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#05101c] border border-white/10 flex items-center justify-center relative overflow-hidden group-hover:scale-110 transition-transform">
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent"></div>
                <span className="text-mor-gold font-black text-lg relative z-10">{record.participantNumber}</span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                   <div 
                     className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full text-black shadow-sm truncate max-w-[120px]"
                     style={{ backgroundColor: record.prizeColor }}
                   >
                     {record.prizeName}
                   </div>
                   <div className="text-[9px] text-gray-500 font-mono">
                     {new Date(record.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                   </div>
                </div>
                <div className="font-bold text-white text-sm truncate pr-2 text-glow-gold">
                  {record.participantName}
                </div>
              </div>

              {/* Decorative Glow on Hover */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity"></div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default WinnerList;