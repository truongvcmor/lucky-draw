import React, { useState, useEffect, useMemo, useRef } from 'react';
import Wheel from './components/Wheel';
import AdminPanel from './components/AdminPanel';
import PrizePanel from './components/PrizePanel';
import WinnerList from './components/WinnerList';
import HomePage from './components/HomePage';
import ControlBar from './components/ControlBar';
import { Participant, Prize, UserType, WheelSegment, WinRecord } from './types';
import { audioManager } from './utils/audio';
import { drawFireworks } from './utils/fireworks';
import SlidePanel from './components/SlidePanel';

// Default Data Seed
const SEED_PARTICIPANTS: Participant[] = Array.from({ length: 60 }, (_, i) => ({
  id: `emp-${i + 1}`,
  name: `Nhân viên ${i + 1}`,
  type: UserType.EMPLOYEE,
  seniorityYears: Math.random() > 0.7 ? 4 : 1, 
  assignedNumber: i + 1
})).concat(
  Array.from({ length: 20 }, (_, i) => ({
    id: `guest-${i + 1}`,
    name: `Khách mời ${i + 1}`,
    type: UserType.GUEST,
    seniorityYears: 0,
    assignedNumber: 61 + i
  }))
);

const SEED_PRIZES: Prize[] = [
  { id: 'p1', name: 'Giải Đặc Biệt', quantity: 1, initialQuantity: 1, color: '#FFD700', info: 'Giải thưởng đặc biệt nhất' },
  { id: 'p2', name: 'Giải Nhất', quantity: 1, initialQuantity: 1, color: '#F37021', info: 'Giải thưởng lớn nhất' },
  { id: 'p3', name: 'Giải Nhì', quantity: 2, initialQuantity: 2, color: '#0054A6', info: 'Giải thưởng cao cấp' },
  { id: 'p4', name: 'Giải Ba', quantity: 3, initialQuantity: 3, color: '#FFFFFF', info: 'Giải thưởng trung bình' },
  { id: 'p5', name: 'Giải Khuyến Khích', quantity: 5, initialQuantity: 5, color: '#333333', info: 'Giải thưởng khuyến khích' },
];

// MOR Brand Palette for Wheel
const WHEEL_COLORS = [
  { bg: '#1756a5', text: '#FFFFFF' }, 
  { bg: '#dea842', text: '#FFFFFF' },
  { bg: '#e68740', text: '#FFFFFF' },
  { bg: '#ed5836', text: '#FFFFFF' },
];

// Local Storage Keys
const STORAGE_KEY = {
  PARTICIPANTS: 'mor_data_participants',
  PRIZES: 'mor_data_prizes',
  WINNERS: 'mor_data_winners',
  HISTORY: 'mor_data_history',
  BLACKLIST: 'mor_data_blacklist',
  LOGO: 'mor_data_custom_logo'
};

type ViewState = 'HOME' | 'GAME' | 'RECAP' | 'SLIDE';

interface HistoryState {
  winners: number[];
  winHistory: WinRecord[];
  prizes: Prize[];
}

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('HOME');
  
  // const [participants, setParticipants] = useState<Participant[]>(SEED_PARTICIPANTS);
  // const [blacklistedNumbers, setBlacklistedNumbers] = useState<number[]>([13, 44, 49, 53, 7, 21, 66, 77]); 
  
  // // Game State
  // const [winners, setWinners] = useState<number[]>([]);
  // const [winHistory, setWinHistory] = useState<WinRecord[]>([]);
  // const [prizes, setPrizes] = useState<Prize[]>(SEED_PRIZES);
  
  // // Custom Logo State
  // const [customLogo, setCustomLogo] = useState<string | null>(null);

  // 1. Participants (Nhân viên & Khách mời)
  const [participants, setParticipants] = useState<Participant[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY.PARTICIPANTS);
    return saved ? JSON.parse(saved) : SEED_PARTICIPANTS;
  });

  // 2. Blacklist (Danh sách số loại trừ)
  const [blacklistedNumbers, setBlacklistedNumbers] = useState<number[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY.BLACKLIST);
    return saved ? JSON.parse(saved) : [13, 44, 49, 53, 7, 21, 66, 77];
  });
  
  // 3. Game State (Winners - Các số đã trúng)
  const [winners, setWinners] = useState<number[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY.WINNERS);
    return saved ? JSON.parse(saved) : [];
  });

  // 4. Win History (Lịch sử chi tiết)
  const [winHistory, setWinHistory] = useState<WinRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY.HISTORY);
    return saved ? JSON.parse(saved) : [];
  });

  // 5. Prizes (Giải thưởng & Số lượng còn lại)
  const [prizes, setPrizes] = useState<Prize[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY.PRIZES);
    return saved ? JSON.parse(saved) : SEED_PRIZES;
  });
  
  // 6. Custom Logo
  const [customLogo, setCustomLogo] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEY.LOGO) || null;
  });
  
  // Undo/Redo Stacks
  const [undoStack, setUndoStack] = useState<HistoryState[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryState[]>([]);

  const [selectedPrizeId, setSelectedPrizeId] = useState<string | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentWinner, setCurrentWinner] = useState<number | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [showRules, setShowRules] = useState(false); // Rules Popup State
  const [isMuted, setIsMuted] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  // Logo Error State
  const [logoError, setLogoError] = useState(false);

  
  // Stable Wheel Segments State
  const [wheelSegments, setWheelSegments] = useState<WheelSegment[]>([]);
  
  const confettiCanvasRef = useRef<HTMLCanvasElement>(null);

  const selectedPrize = useMemo(() => prizes.find(p => p.id === selectedPrizeId), [prizes, selectedPrizeId]);
  
  const getWinnerInfo = (num: number) => participants.find(p => p.assignedNumber === num);

  // Lưu Participants
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY.PARTICIPANTS, JSON.stringify(participants));
  }, [participants]);

  // Lưu Prizes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY.PRIZES, JSON.stringify(prizes));
  }, [prizes]);

  // Lưu Winners
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY.WINNERS, JSON.stringify(winners));
  }, [winners]);

  // Lưu History
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY.HISTORY, JSON.stringify(winHistory));
  }, [winHistory]);

  // Lưu Blacklist
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY.BLACKLIST, JSON.stringify(blacklistedNumbers));
  }, [blacklistedNumbers]);

  // Lưu Logo
  useEffect(() => {
    if (customLogo) {
      localStorage.setItem(STORAGE_KEY.LOGO, customLogo);
    } else {
      localStorage.removeItem(STORAGE_KEY.LOGO);
    }
  }, [customLogo]);
  
  // Wheel Segment Logic
  useEffect(() => {
    let rawSegments: Partial<WheelSegment>[] = [];
    
    participants.forEach((p) => {
      if (winners.includes(p.assignedNumber)) return;

      const isBlacklisted = blacklistedNumbers.includes(p.assignedNumber);
      
      const baseSegment = {
        text: p.assignedNumber.toString(),
        value: p.assignedNumber,
        isBlacklisted,
      };

      rawSegments.push(baseSegment);

      if (p.seniorityYears >= 3 && p.type === UserType.EMPLOYEE) {
        rawSegments.push({
          ...baseSegment,
          text: `${p.assignedNumber}`, 
        });
      }
    });

    for (let i = rawSegments.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rawSegments[i], rawSegments[j]] = [rawSegments[j], rawSegments[i]];
    }

    const len = rawSegments.length;
    if (len > 2) {
      for (let i = 0; i < len; i++) {
        const current = rawSegments[i];
        const nextIndex = (i + 1) % len;
        const next = rawSegments[nextIndex];

        if (current && next && current.value === next.value) {
           for (let k = 2; k < len - 1; k++) {
             const candidateIndex = (nextIndex + k) % len;
             const candidate = rawSegments[candidateIndex];
             if (candidate && candidate.value !== current.value) {
                [rawSegments[nextIndex], rawSegments[candidateIndex]] = [rawSegments[candidateIndex], rawSegments[nextIndex]];
                break; 
             }
           }
        }
      }
    }

    const finalSegments = rawSegments.map((seg, index) => ({
      ...seg,
      color: WHEEL_COLORS[index % WHEEL_COLORS.length].bg,
      textColor: WHEEL_COLORS[index % WHEEL_COLORS.length].text,
    })) as WheelSegment[];

    setWheelSegments(finalSegments);

  }, [participants, blacklistedNumbers, winners]);

  // Audio Logic
  const handleToggleMute = () => {
    const newState = !isMuted;
    setIsMuted(newState);
    audioManager.toggleMute(newState);
  };

  // Undo/Redo Logic
  const saveStateForUndo = () => {
    const currentState: HistoryState = {
      winners: [...winners],
      winHistory: [...winHistory],
      prizes: JSON.parse(JSON.stringify(prizes)) // Deep copy
    };
    setUndoStack(prev => [...prev, currentState]);
    setRedoStack([]); // Clear redo stack on new action
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    
    const previousState = undoStack[undoStack.length - 1];
    
    // Save current state to Redo Stack
    const currentState: HistoryState = {
       winners: [...winners],
       winHistory: [...winHistory],
       prizes: JSON.parse(JSON.stringify(prizes))
    };
    setRedoStack(prev => [...prev, currentState]);

    // Apply previous state
    setWinners(previousState.winners);
    setWinHistory(previousState.winHistory);
    setPrizes(previousState.prizes);

    // Pop from undo stack
    setUndoStack(prev => prev.slice(0, -1));
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;

    const nextState = redoStack[redoStack.length - 1];

    // Save current state to Undo Stack
    const currentState: HistoryState = {
      winners: [...winners],
      winHistory: [...winHistory],
      prizes: JSON.parse(JSON.stringify(prizes))
    };
    setUndoStack(prev => [...prev, currentState]);

    // Apply next state
    setWinners(nextState.winners);
    setWinHistory(nextState.winHistory);
    setPrizes(nextState.prizes);

    // Pop from redo stack
    setRedoStack(prev => prev.slice(0, -1));
  };

  // Fireworks Effect Trigger
  useEffect(() => {
    if (showPopup && confettiCanvasRef.current) {
        // Start fireworks when popup is shown and canvas is mounted
        const cleanup = drawFireworks(confettiCanvasRef.current);
        return cleanup;
    }
  }, [showPopup]);


  const spinLogic = () => {
    if (isSpinning) return;
    
    if (!selectedPrizeId) {
      // alert("Vui lòng chọn Giải Thưởng trước khi quay!");
      return;
    }

    if (selectedPrize && selectedPrize.quantity <= 0) {
      // alert("Giải thưởng này đã hết số lượng!");
      return;
    }

    const potentialWinners = participants.filter(p => 
      !blacklistedNumbers.includes(p.assignedNumber) &&
      !winners.includes(p.assignedNumber)
    );

    if (potentialWinners.length === 0) {
      alert("Hết người trúng giải hoặc danh sách trống!");
      return;
    }

    const weightedPool: number[] = [];
    potentialWinners.forEach(p => {
      weightedPool.push(p.assignedNumber);
      if (p.seniorityYears >= 3 && p.type === UserType.EMPLOYEE) {
         weightedPool.push(p.assignedNumber);
      }
    });

    const randomIndex = Math.floor(Math.random() * weightedPool.length);
    const winningNumber = weightedPool[randomIndex];
    
    setCurrentWinner(winningNumber);
    setIsSpinning(true);
  };

  const handleSpinFinish = (visualWinner: number) => {
    if (visualWinner) {
      setCurrentWinner(visualWinner);
      audioManager.playWin();
      setShowPopup(true);
      // NOTE: Fireworks triggered by useEffect
    }
    setIsSpinning(false);
  };

  const handleClosePopup = () => {
    if (currentWinner !== null) {
      saveStateForUndo(); // Save state before modifying it

      setWinners(prev => [...prev, currentWinner]);
      
      if (selectedPrize) {
        setPrizes(prev => prev.map(p => 
          p.id === selectedPrizeId ? { ...p, quantity: Math.max(0, p.quantity - 1) } : p
        ));

        const winnerInfo = getWinnerInfo(currentWinner);
        const newRecord: WinRecord = {
          id: Date.now().toString(),
          participantName: winnerInfo ? winnerInfo.name : 'Unknown',
          participantNumber: currentWinner,
          prizeName: selectedPrize.name,
          prizeColor: selectedPrize.color,
          timestamp: Date.now()
        };
        setWinHistory(prev => [newRecord, ...prev]);
      }
    }
    setShowPopup(false);
    setCurrentWinner(null);
  };

  const targetIndexForWheel = useMemo(() => {
    if (currentWinner === null) return null;
    
    const indices = wheelSegments
      .map((seg, idx) => seg.value === currentWinner ? idx : -1)
      .filter(idx => idx !== -1);
      
    return indices.length > 0 ? indices[Math.floor(Math.random() * indices.length)] : 0;
  }, [currentWinner, wheelSegments]);

  // Admin Handlers
  const handleUpdateParticipant = (updated: Participant) => {
    setParticipants(prev => prev.map(p => p.id === updated.id ? updated : p));
  };

  const handleDeleteParticipant = (id: string) => {
    setParticipants(prev => prev.filter(p => p.id !== id));
  };

  const handleClearAllParticipants = () => {
    setParticipants([]);
    setWinners([]);
    setWinHistory([]); 
    setCurrentWinner(null);
    setUndoStack([]);
    setRedoStack([]);
  };

  const handleFactoryReset = () => {
    setParticipants(SEED_PARTICIPANTS);
    setPrizes(SEED_PRIZES);
    setBlacklistedNumbers([13, 44, 49, 53, 7, 21, 66, 77]); // Blacklist mặc định
    
    // Xóa lịch sử chơi
    setWinners([]);
    setWinHistory([]);
    setCurrentWinner(null);
    
    // Xóa các stack undo/redo
    setUndoStack([]);
    setRedoStack([]);

    // Xóa logo tùy chỉnh
    setCustomLogo(null);
  };

  const handleAddPrize = (p: Omit<Prize, 'id'>) => {
    setPrizes(prev => [...prev, { ...p, id: Math.random().toString() }]);
  };
  const handleUpdatePrize = (updated: Prize) => {
    setPrizes(prev => prev.map(p => p.id === updated.id ? updated : p));
  };
  const handleDeletePrize = (id: string) => {
     setPrizes(prev => prev.filter(p => p.id !== id));
     if (selectedPrizeId === id) setSelectedPrizeId(null);
  };

  // --- RENDER ---
  return (
    <div className="h-screen bg-[#05101c] flex flex-col relative font-sans text-white overflow-hidden selection:bg-mor-orange selection:text-white">
      
      {/* Global Background */}
      {/* <div className="absolute inset-0 bg-gradient-to-br from-[#0054A6] via-[#1A3A5E] to-[#F37021] opacity-90 pointer-events-none"></div> */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat pointer-events-none"
        style={{ 
          backgroundImage: `url('/bg-event.png')`, // Thay 'bg-event.jpg' bằng tên file của bạn
          filter: 'brightness(0.6)' // Làm tối ảnh một chút để nổi bật vòng quay (tùy chỉnh từ 0.1 - 1.0)
        }}
      >
        {/* Lớp phủ màu nhẹ để giữ vibe của brand MOR (tùy chọn) */}
        <div className="absolute inset-0 bg-[#05101c]/40"></div>
      </div>
      {/* VIEW: HOME */}
      {currentView === 'HOME' && (
        <HomePage onNavigate={(view) => setCurrentView(view as ViewState)} />
      )}

      {/* VIEW: GAME */}
      {currentView === 'GAME' && (
        <>
            {/* Rules Button - Top Left */}
            <button
                onClick={() => setShowRules(true)}
                className="absolute top-4 left-4 md:top-6 md:left-6 z-40 flex items-center gap-3 px-4 py-2 bg-[#0B1E33]/60 hover:bg-[#0B1E33] border border-white/10 hover:border-mor-gold text-white hover:text-mor-gold font-bold text-xs md:text-sm uppercase tracking-widest rounded-full transition-all duration-300 hover:scale-105 shadow-lg backdrop-blur-md group cursor-pointer"
            >
                <span className="text-lg group-hover:rotate-12 transition-transform">📜</span>
                <span>Thể lệ</span>
            </button>

            {/* <div className="absolute top-4 right-4 md:top-6 md:right-6 z-40 text-right animate-fade-in-down">
              <p className="font-extrabold text-sm md:text-xl tracking-[0.2em] uppercase filter drop-shadow-md">
                  <span className="text-[#F37021]">MOR</span>
                  <span className="text-[#F37021] mx-2">SOFTWARE</span>
                  <span className="text-white">HCM</span>
              </p>
          </div> */}

            {/* --- GÓC PHẢI TRÊN: TEXT + LOGO (Xếp dọc - Căn giữa nhau) --- */}
            <div className="absolute top-4 right-4 md:top-6 md:right-6 z-40 flex flex-col items-center gap-0 animate-fade-in-down">
                
                {/* 2. Phần Logo */}
                <div 
                    className="cursor-pointer hover:opacity-80 transition-opacity -mt-10" 
                    onClick={() => setIsAdminOpen(true)}
                    title="Nhấn để mở Admin"
                >
                    {!logoError ? (
                        <img
                            src="/logo-mor.png"
                            alt="MOR"
                            onError={() => setLogoError(true)}
                            // Sửa lại kích thước: h-16 (64px) cho mobile, h-24 (96px) cho desktop
                            // Đây là kích thước rất to và rõ ràng
                            className="w-auto h-16 md:h-32 object-contain drop-shadow-lg"
                        />
                    ) : customLogo ? (
                        <img
                            src={customLogo}
                            alt="MOR"
                            className="w-auto h-16 md:h-24 object-contain drop-shadow-lg"
                        />
                    ) : (
                        <span className="font-black text-white text-2xl tracking-widest drop-shadow-md">MOR</span>
                    )}
                </div>

                {/* 1. Phần Text MOR SOFTWARE HCM */}
                {/* Thêm text-center để nếu chữ có xuống dòng thì vẫn giữa */}
                <div className="text-center -mt-8"> 
                    <p className="font-extrabold text-sm md:text-xl tracking-[0.2em] uppercase filter drop-shadow-md leading-tight">
                        <span className="text-[#F37021]">MOR</span>
                        <span className="text-[#F37021] mx-1.5">SOFTWARE</span>
                        <span className="text-white">HCM</span>
                    </p>
                </div>

            </div>
            {/* Header */}
            <header className="relative z-10 pt-4 pb-1 flex flex-col items-center justify-center shrink-0">
                <div className="flex items-center space-x-6 mb-1 animate-fade-in-down transform scale-75 md:scale-100 origin-top">
                {/* Logo Box */}
                {/* <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-mor-blue to-mor-orange rounded-lg blur opacity-50 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                    <div className="relative w-16 h-16 md:w-20 md:h-20 bg-white rounded-xl flex items-center justify-center text-mor-blue font-black text-3xl md:text-4xl shadow-2xl border-2 border-white/50"> */}
                    {/* Display Logo in Header if available */}
                    {/* {customLogo ? (
                        <img src={customLogo} alt="MOR" className="w-12 h-12 md:w-16 md:h-16 object-contain" />
                    ) : (
                        <span>M</span>
                    )} */}
                    {/* Display Logo in Header with priority: logo.png -> customLogo -> M */}
                    {/* {!logoError ? (
                      <img
                        src="/logo.png"
                        alt="MOR"
                        onError={() => setLogoError(true)}
                        className="w-12 h-12 md:w-16 md:h-16 object-contain"
                      />
                    ) : customLogo ? (
                      <img
                        src={customLogo}
                        alt="MOR"
                        className="w-12 h-12 md:w-16 md:h-16 object-contain"
                      />
                    ) : (
                      <span>M</span>
                    )}
                    </div>
                </div> */}
                
                <div className="text-left">
                    {/* === PHẦN TEXT CHROME HIỆU ỨNG LẤP LÁNH === */}
                    <div className="relative mb-2 mt-1">
                        {/* 1. Lớp chữ chính (Base Chrome Text) */}
                        <h2 
                            className="relative z-10 text-2xl md:text-4xl font-black tracking-[0.15em] uppercase text-transparent bg-clip-text select-none"
                            style={{
                                // Gradient tạo hiệu ứng kim loại có đường chân trời cắt ngang
                                backgroundImage: 'linear-gradient(to bottom, #ffffff 0%, #d1d5db 48%, #475569 50%, #cbd5e1 52%, #ffffff 100%)',
                                // Viền chữ để tăng độ sắc nét
                                WebkitTextStroke: '1px rgba(255, 255, 255, 0.7)',
                                // Bóng đổ phát sáng
                                filter: 'drop-shadow(0 0 5px rgba(255, 255, 255, 0.5))'
                            }}
                        >
                            DREAM OF HORIZON
                        </h2>

                        {/* 2. Các ngôi sao lấp lánh (Sparkles) */}
                        {/* Sao 1: Góc trên trái */}
                        <div className="absolute -top-2 -left-2 text-white text-lg animate-twinkle" style={{ animationDelay: '0s' }}>
                            ✦
                        </div>
                        
                        {/* Sao 2: Góc dưới phải */}
                        <div className="absolute -bottom-1 right-0 text-[#FFD700] text-xl animate-twinkle" style={{ animationDelay: '0.7s' }}>
                            ✦
                        </div>
                        
                        {/* Sao 3: Giữa chữ (nhỏ hơn) */}
                        <div className="absolute top-1 left-1/2 text-white text-xs animate-twinkle" style={{ animationDelay: '1.2s' }}>
                            ✦
                        </div>

                        {/* Sao 4: Góc trên phải (màu xanh nhẹ theo tone MOR) */}
                        <div className="absolute -top-3 right-4 text-mor-blue text-sm animate-twinkle" style={{ animationDelay: '0.4s' }}>
                            ✦
                        </div>
                    </div>
                    {/* =========================================== */}
                    <h1 className="text-4xl md:text-6xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-b from-[#fff9c4] via-[#FFD700] to-[#b47d15] drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] uppercase pb-1">
                    LUCKY DRAW
                    </h1>
                    {/* <p className="font-extrabold text-lg md:text-2xl tracking-[0.2em] uppercase mt-0 filter drop-shadow-md">
                    <span className="text-[#F37021]">MOR</span>
                    <span className="text-[#F37021] mx-2">SOFTWARE</span>
                    <span className="text-white">HCM</span>
                    </p> */}
                </div>
                </div>
            </header>

            {/* Main Game Area - Flex container to manage vertical space */}
            <main className="relative z-10 flex-1 min-h-0 flex items-center justify-center p-2 gap-4 animate-fade-in w-full max-w-[1920px] mx-auto">
                
                {/* LEFT: Prize Panel */}
                <div className="hidden md:flex flex-col w-64 lg:w-80 h-[50vh] max-h-[600px] bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-4 shadow-2xl flex-shrink-0">
                  <PrizePanel 
                      prizes={prizes} 
                      selectedPrizeId={selectedPrizeId} 
                      onSelectPrize={setSelectedPrizeId}
                      isSpinning={isSpinning}
                  />
                </div>

                {/* CENTER: Wheel and Controls - Vertical Flex Column */}
                <div className="flex-1 flex flex-col items-center h-full min-w-0">
                  
                  {/* Wheel Container - Takes available space but respects aspect ratio */}
                  <div className="flex-1 min-h-0 w-full flex items-center justify-center relative py-2">
                      <div className="relative h-full aspect-square max-h-[75vh]">
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full bg-white/20 rounded-full blur-3xl animate-pulse"></div>
                        <Wheel 
                          segments={wheelSegments} 
                          isSpinning={isSpinning}
                          winnerSegmentIndex={targetIndexForWheel}
                          onSpinFinish={handleSpinFinish}
                          customLogo={customLogo}
                        />
                      </div>
                  </div>

                  {/* Controls - Fixed size, won't shrink */}
                  <div className="flex flex-col items-center w-full max-w-md space-y-3 shrink-0 pb-4 md:pb-8">
                      <button 
                      onClick={spinLogic}
                      disabled={isSpinning || wheelSegments.length === 0}
                      className={`
                          group relative w-64 h-16 md:w-72 md:h-20 rounded-full transition-all duration-200 transform
                          ${isSpinning || wheelSegments.length === 0 || !selectedPrizeId
                          ? 'opacity-50 cursor-not-allowed scale-95 grayscale' 
                          : 'hover:scale-105 active:scale-95 hover:shadow-[0_0_40px_rgba(255,255,255,0.8)]'}
                      `}
                      >
                      <div className="absolute inset-0 bg-white rounded-full translate-y-2 translate-x-0 blur-sm opacity-50"></div>
                      <div className="absolute inset-0 bg-gradient-to-b from-[#FF9800] to-[#F57C00] rounded-full border-t border-white/50 shadow-[inset_0_2px_10px_rgba(255,255,255,0.5)] flex items-center justify-center overflow-hidden">
                          <div className="absolute -inset-full top-0 block h-full w-1/2 -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-40 group-hover:animate-shine" />
                          <div className="flex flex-col items-center leading-none">
                              <span className="text-xl md:text-2xl font-black text-white uppercase tracking-widest drop-shadow-md">
                              {isSpinning ? '...' : (selectedPrize ? 'QUAY SỐ' : 'CHỌN GIẢI')}
                              </span>
                              {selectedPrize && !isSpinning && (
                              <span className="text-[10px] font-bold text-white/80 uppercase tracking-widest mt-1">
                                  {selectedPrize.name}
                              </span>
                              )}
                          </div>
                      </div>
                      </button>
                      
                      <div className="flex space-x-8 text-xs font-semibold tracking-wider text-white/80 uppercase">
                      <div>Tổng: <span className="text-white text-base font-bold shadow-black drop-shadow-sm">{participants.length}</span></div>
                      <div>Khả dụng: <span className="text-mor-gold text-base font-bold shadow-black drop-shadow-sm">{wheelSegments.length}</span></div>
                      </div>
                  </div>
                </div>

                {/* RIGHT: Winner List */}
                <div className="hidden lg:flex flex-col w-64 lg:w-80 h-[50vh] max-h-[600px] bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-4 shadow-2xl flex-shrink-0">
                   <WinnerList history={winHistory} />
                </div>
            </main>

            {/* Rules Modal */}
            {showRules && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in" onClick={() => setShowRules(false)}>
                    <div 
                        className="bg-[#0B1E33] border border-white/20 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col relative transform transition-all scale-100 overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/20">
                            <h2 className="text-2xl font-black text-mor-gold uppercase tracking-widest flex items-center gap-3">
                                <span className="text-3xl">📜</span> Thể Lệ Chương Trình
                            </h2>
                            <button onClick={() => setShowRules(false)} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/20 flex items-center justify-center text-gray-400 hover:text-white transition-colors cursor-pointer">
                                ✕
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto space-y-6 text-gray-300 scrollbar-thin scrollbar-thumb-mor-gold/30">
                            <section>
                                <h3 className="text-white font-bold text-lg uppercase mb-3 flex items-center gap-2">
                                    <span className="w-1.5 h-6 bg-mor-orange rounded-full"></span>
                                    1. Đối tượng tham gia
                                </h3>
                                <div className="bg-white/5 p-4 rounded-lg border border-white/5 text-sm leading-relaxed">
                                    <p>Toàn bộ nhân viên chính thức (Staff) và khách mời (Guest) có tên trong danh sách tham dự sự kiện <strong>Year End Party 2025</strong> của MOR Software HCM.</p>
                                </div>
                            </section>

                            <section>
                                <h3 className="text-white font-bold text-lg uppercase mb-3 flex items-center gap-2">
                                    <span className="w-1.5 h-6 bg-mor-blue rounded-full"></span>
                                    2. Quy định quay số
                                </h3>
                                <div className="bg-white/5 p-4 rounded-lg border border-white/5 text-sm leading-relaxed space-y-2">
                                    <p>• Mỗi người tham gia sở hữu <strong>01 mã số định danh</strong> duy nhất.</p>
                                    <p>• Hệ thống quay số ngẫu nhiên. Kết quả được hiển thị công khai trên màn hình.</p>
                                    <p>• <strong>Cơ chế ưu tiên:</strong> Nhân viên có thâm niên trên 3 năm sẽ được hệ thống tính <strong>x2 tỷ lệ xuất hiện</strong> trong vòng quay.</p>
                                </div>
                            </section>

                            <section>
                                <h3 className="text-white font-bold text-lg uppercase mb-3 flex items-center gap-2">
                                    <span className="w-1.5 h-6 bg-mor-gold rounded-full"></span>
                                    3. Điều kiện nhận giải
                                </h3>
                                <div className="bg-white/5 p-4 rounded-lg border border-white/5 text-sm leading-relaxed space-y-2">
                                    <p>• Người trúng thưởng phải <strong>có mặt tại hội trường</strong> vào thời điểm công bố kết quả.</p>
                                    <p>• Nếu MC gọi tên 03 lần mà người trúng thưởng không có mặt, giải thưởng sẽ bị hủy bỏ và tiến hành quay lại cho người khác.</p>
                                    <p>• Quyết định của Ban Tổ Chức là quyết định cuối cùng.</p>
                                </div>
                            </section>
                        </div>
                        
                        {/* Footer */}
                        <div className="p-4 border-t border-white/10 bg-black/20 text-center">
                            <button 
                                onClick={() => setShowRules(false)}
                                className="px-8 py-2 bg-mor-gold hover:bg-yellow-500 text-black font-bold rounded-full uppercase tracking-wider shadow-lg transition-transform active:scale-95 cursor-pointer"
                            >
                                Đã Hiểu
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Winner Popup - NEW DESIGN */}
            {showPopup && currentWinner && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
                  <canvas ref={confettiCanvasRef} className="absolute inset-0 pointer-events-none w-full h-full z-0"></canvas>
                  
                  {/* Container with bounce animation */}
                  <div className="relative z-10 max-w-3xl w-full mx-4 transform transition-all animate-bounce-slow">
                    
                    {/* Layer 1: Outer Glow Pulse */}
                    <div className="absolute -inset-1 bg-gradient-to-r from-mor-gold via-white to-mor-orange rounded-3xl blur-md opacity-60 animate-pulse"></div>

                    {/* Layer 2: Main metallic Border & Frame */}
                    <div className="relative bg-[#05101c] p-[2px] rounded-3xl overflow-hidden shadow-2xl">
                         {/* Metallic Gradient Border Background */}
                         <div className="absolute inset-0 bg-gradient-to-br from-[#B45309] via-[#FFD700] to-[#0054A6]"></div>
                         
                         {/* Content Inner Container */}
                         <div className="relative bg-[#0B1E33] rounded-[22px] overflow-hidden">
                             
                             {/* Inner Texture/Background */}
                             <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-mor-blue/20 to-[#05101c] opacity-90"></div>
                             <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>

                             {/* Corner Decorations */}
                             <div className="absolute top-4 left-4 w-12 h-12 border-t-4 border-l-4 border-mor-gold rounded-tl-xl shadow-[0_0_10px_rgba(255,215,0,0.5)]"></div>
                             <div className="absolute top-4 right-4 w-12 h-12 border-t-4 border-r-4 border-mor-gold rounded-tr-xl shadow-[0_0_10px_rgba(255,215,0,0.5)]"></div>
                             <div className="absolute bottom-4 left-4 w-12 h-12 border-b-4 border-l-4 border-mor-gold rounded-bl-xl shadow-[0_0_10px_rgba(255,215,0,0.5)]"></div>
                             <div className="absolute bottom-4 right-4 w-12 h-12 border-b-4 border-r-4 border-mor-gold rounded-br-xl shadow-[0_0_10px_rgba(255,215,0,0.5)]"></div>

                             {/* Main Content Area */}
                             <div className="relative z-10 p-10 md:p-14 text-center flex flex-col items-center">
                                
                                <h2 className="text-transparent bg-clip-text bg-gradient-to-b from-[#FFF] to-[#FFD700] text-2xl md:text-4xl font-black uppercase tracking-[0.3em] mb-6 drop-shadow-sm">
                                    Xin chúc mừng
                                </h2>

                                {/* {selectedPrize && (
                                    <div className="mb-8 inline-flex items-center gap-2 bg-gradient-to-r from-mor-blue/80 to-[#003d7a]/80 px-8 py-2 rounded-full border border-mor-gold/50 shadow-[0_0_15px_rgba(0,84,166,0.5)]">
                                      <span className="text-xl">🏆</span>
                                      <span className="text-white font-bold tracking-widest uppercase text-base md:text-lg">
                                        {selectedPrize.name}
                                      </span>
                                      <span className="text-xl">🏆</span>
                                    </div>
                                )} */}
                                {selectedPrize && (
                                  <div className="mb-8 flex flex-col items-center gap-2">
                                      {/* Tên giải */}
                                      <div className="inline-flex items-center gap-2 bg-gradient-to-r from-mor-blue/80 to-[#003d7a]/80 px-8 py-2 rounded-full border border-mor-gold/50 shadow-[0_0_15px_rgba(0,84,166,0.5)]">
                                          <span className="text-xl">🏆</span>
                                          <span className="text-white font-bold tracking-widest uppercase text-base md:text-lg">
                                          {selectedPrize.name}
                                          </span>
                                          <span className="text-xl">🏆</span>
                                      </div>
                                      
                                      {/* --- THÊM: Hiển thị chi tiết giải thưởng --- */}
                                      {selectedPrize.info && (
                                          <div className="text-mor-gold font-bold text-xl uppercase tracking-wider drop-shadow-md mt-2 animate-pulse">
                                              {selectedPrize.info}
                                          </div>
                                      )}
                                  </div>
                              )}
                                
                                <div className="relative inline-block mb-10 py-4">
                                    {/* Number Glow */}
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-mor-gold/20 rounded-full blur-3xl animate-pulse"></div>
                                    
                                    <span className="relative text-[140px] leading-none font-black text-white drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)]" 
                                          style={{ textShadow: '0 0 20px rgba(255,215,0,0.6), 4px 4px 0px #B45309' }}>
                                    {currentWinner}
                                    </span>
                                </div>
                                
                                <div className="space-y-4 mb-10 w-full">
                                    {getWinnerInfo(currentWinner) ? (
                                    <div className="animate-fade-in-up">
                                        <div className="text-4xl md:text-5xl font-black text-white uppercase tracking-wide drop-shadow-lg mb-4">
                                          {getWinnerInfo(currentWinner)?.name}
                                        </div>
                                        
                                        <div className="flex justify-center items-center gap-4">
                                            <div className="h-px w-16 bg-gradient-to-r from-transparent to-white/50"></div>
                                            <span className={`px-6 py-2 rounded-lg text-sm font-bold border shadow-lg uppercase tracking-wider flex items-center gap-2
                                              ${getWinnerInfo(currentWinner)?.type === UserType.EMPLOYEE 
                                                ? 'bg-mor-orange/20 border-mor-orange text-mor-orange' 
                                                : 'bg-purple-500/20 border-purple-400 text-purple-300'}`}>
                                                {getWinnerInfo(currentWinner)?.type === UserType.EMPLOYEE 
                                                    ? (
                                                      <>
                                                        <span>🏢</span>
                                                        <span>Thâm niên: <span className="text-white text-lg ml-1">{getWinnerInfo(currentWinner)?.seniorityYears}</span> Năm</span>
                                                      </>
                                                    ) 
                                                    : '🌟 Khách Mời Đặc Biệt'}
                                            </span>
                                            <div className="h-px w-16 bg-gradient-to-l from-transparent to-white/50"></div>
                                        </div>
                                    </div>
                                    ) : (
                                    <div className="text-2xl text-gray-400 italic">Số may mắn chưa có chủ nhân</div>
                                    )}
                                </div>

                                <button 
                                    onClick={handleClosePopup}
                                    className="group relative px-12 py-4 bg-gradient-to-b from-white to-gray-200 text-mor-dark font-black text-lg rounded-full overflow-hidden shadow-[0_0_25px_rgba(255,255,255,0.4)] hover:shadow-[0_0_35px_rgba(255,215,0,0.6)] hover:-translate-y-1 transition-all duration-300 cursor-pointer"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/80 to-transparent -translate-x-full group-hover:animate-shimmer w-full"></div>
                                    <span className="relative z-10 flex items-center gap-2">
                                      TIẾP TỤC <span className="text-xl">👉</span>
                                    </span>
                                </button>

                             </div>
                         </div>
                    </div>
                  </div>
                </div>
            )}
        </>
      )}

      {/* Placeholders for other views */}
      {currentView === 'RECAP' && (
        <div className="flex-grow flex items-center justify-center relative z-10">
            <div className="text-center animate-fade-in-up">
                <h2 className="text-4xl font-bold mb-4">Recap 2025</h2>
                <p className="text-gray-300 mb-8">Nội dung đang được cập nhật...</p>
                <button onClick={() => setCurrentView('HOME')} className="px-6 py-2 bg-white/10 rounded-full hover:bg-white/20 transition">Quay lại</button>
            </div>
        </div>
      )}
      
      
      {/* VIEW: SLIDE */}
      {/* {currentView === 'SLIDE' && (
        <div className="absolute inset-0 z-20 bg-[#05101c]">
           <SlidePanel onBack={() => setCurrentView('HOME')} />
        </div>
      )} */}

      <div 
        className="absolute inset-0 z-20 bg-[#05101c]"
        style={{ 
          // Kỹ thuật Keep-Alive:
          // Nếu đang là SLIDE -> Hiện (block)
          // Nếu không phải -> Ẩn (none) nhưng vẫn giữ nguyên trong DOM
          display: currentView === 'SLIDE' ? 'block' : 'none' 
        }}
      >
         {/* SlidePanel sẽ chỉ được mount 1 lần duy nhất khi vào app, iframe sẽ không bị reload */}
         <SlidePanel onBack={() => setCurrentView('HOME')} />
      </div>

      {/* --- GLOBAL CONTROL BAR --- */}
      {currentView !== 'HOME' && (
        <ControlBar 
            currentView={currentView}
            onNavigate={(view) => setCurrentView(view)}
            onHome={() => setCurrentView('HOME')}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onToggleMute={handleToggleMute}
            onOpenSettings={() => setIsAdminOpen(true)}
            isMuted={isMuted}
            canUndo={undoStack.length > 0}
            canRedo={redoStack.length > 0}
        />
      )}

      {/* --- ADMIN MODAL --- */}
      <AdminPanel 
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        participants={participants}
        onAddParticipant={(p) => setParticipants(prev => [...prev, { ...p, id: Math.random().toString() }])}
        onUpdateParticipant={handleUpdateParticipant}
        onDeleteParticipant={handleDeleteParticipant}
        onClearAllParticipants={handleClearAllParticipants}
        blacklistedNumbers={blacklistedNumbers}
        onUpdateBlacklist={setBlacklistedNumbers}
        history={winners}
        
        // Prize Props
        prizes={prizes}
        onAddPrize={handleAddPrize}
        onUpdatePrize={handleUpdatePrize}
        onDeletePrize={handleDeletePrize}

        // Factory Reset
        onFactoryReset={handleFactoryReset} 

        // Logo upload
        onUploadLogo={setCustomLogo}

        onReset={() => {
          setWinners([]);
          setWinHistory([]); 
          setCurrentWinner(null);
          setUndoStack([]);
          setRedoStack([]);
          setIsAdminOpen(false);
        }}
      />
    </div>
  );
};

export default App;