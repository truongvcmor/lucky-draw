import React from 'react';

interface HomePageProps {
  onNavigate: (view: string) => void;
}

const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center p-4 relative overflow-hidden z-20">
      
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-mor-blue/20 via-[#05101c] to-[#05101c] z-[-1]"></div>

      {/* Main Title */}
      <div className="mb-12 animate-fade-in-down">
        <h2 className="text-mor-orange font-bold text-2xl md:text-3xl tracking-[0.5em] mb-4 uppercase">
          MOR Software HCM
        </h2>
        <h1 className="text-6xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-[#FFF] via-[#FFD700] to-[#B45309] drop-shadow-[0_0_25px_rgba(255,215,0,0.5)]">
          YEAR END<br/>PARTY 2025
        </h1>
        <div className="h-1 w-32 bg-mor-gold mx-auto mt-6 rounded-full shadow-[0_0_15px_rgba(255,215,0,0.8)]"></div>
      </div>

      {/* Menu Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl w-full px-4 animate-fade-in-up">
        
        {/* Card 1: Recap */}
        <button 
          onClick={() => onNavigate('RECAP')}
          className="group relative h-64 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden hover:border-mor-gold/50 transition-all duration-500 hover:scale-105 hover:shadow-[0_0_30px_rgba(255,215,0,0.2)]"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 to-blue-900/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
            <span className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">📅</span>
            <h3 className="text-2xl font-bold text-white uppercase tracking-wider group-hover:text-mor-gold transition-colors">Recap 2025</h3>
            <p className="text-gray-400 text-sm mt-2 opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-4 group-hover:translate-y-0">Nhìn lại chặng đường đã qua</p>
          </div>
        </button>

        {/* Card 2: Lucky Draw (Featured) */}
        <button 
          onClick={() => onNavigate('GAME')}
          className="group relative h-72 md:-mt-8 bg-gradient-to-br from-mor-blue/80 to-mor-orange/80 backdrop-blur-md rounded-2xl border-2 border-mor-gold/30 overflow-hidden hover:border-mor-gold transition-all duration-500 hover:scale-105 hover:shadow-[0_0_50px_rgba(243,112,33,0.4)]"
        >
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 animate-spin-slow"></div>
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
            <span className="text-6xl mb-4 group-hover:rotate-12 transition-transform duration-300 drop-shadow-lg">🎰</span>
            <h3 className="text-4xl font-black text-white uppercase tracking-wider drop-shadow-md">Lucky Draw</h3>
            <div className="mt-4 px-6 py-2 bg-white/20 rounded-full text-white font-bold text-sm backdrop-blur-md border border-white/20 group-hover:bg-white group-hover:text-mor-orange transition-all">
              BẮT ĐẦU NGAY
            </div>
          </div>
        </button>

        {/* Card 3: Timeline */}
        <button 
          onClick={() => onNavigate('TIMELINE')}
          className="group relative h-64 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden hover:border-mor-gold/50 transition-all duration-500 hover:scale-105 hover:shadow-[0_0_30px_rgba(255,215,0,0.2)]"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-green-900/40 to-teal-900/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
            <span className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">⏱️</span>
            <h3 className="text-2xl font-bold text-white uppercase tracking-wider group-hover:text-mor-gold transition-colors">Timeline</h3>
            <p className="text-gray-400 text-sm mt-2 opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-4 group-hover:translate-y-0">Lịch trình chương trình</p>
          </div>
        </button>

      </div>
      
      <div className="mt-16 text-gray-500 text-xs tracking-widest uppercase">
        © 2026 MOR Software. All rights reserved.
      </div>
    </div>
  );
};

export default HomePage;