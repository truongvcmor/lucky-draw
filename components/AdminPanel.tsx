import React, { useState, useMemo } from 'react';
import { Participant, Prize, UserType } from '../types';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;

  // Participant Props
  participants: Participant[];
  onAddParticipant: (p: Omit<Participant, 'id'>) => void;
  onUpdateParticipant: (p: Participant) => void;
  onDeleteParticipant: (id: string) => void;
  onClearAllParticipants: () => void;
  blacklistedNumbers: number[];
  onUpdateBlacklist: (nums: number[]) => void;
  history: any[];
  
  // Prize Props
  prizes: Prize[];
  onAddPrize: (p: Omit<Prize, 'id'>) => void;
  onUpdatePrize: (p: Prize) => void;
  onDeletePrize: (id: string) => void;
  
  // Logo Props
  onUploadLogo: (base64: string) => void;

  // Global
  onReset: () => void;
}

// Internal Confirm Modal State Interface
interface ConfirmState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  confirmColor: string; // Tailwind class part e.g. 'red-500'
  onConfirm: () => void;
}

type Tab = 'PARTICIPANTS' | 'PRIZES' | 'SETTINGS';

const AdminPanel: React.FC<AdminPanelProps> = ({ 
  isOpen,
  onClose,
  participants, 
  onAddParticipant, 
  onUpdateParticipant,
  onDeleteParticipant,
  onClearAllParticipants,
  blacklistedNumbers, 
  onUpdateBlacklist,
  history,
  prizes,
  onAddPrize,
  onUpdatePrize,
  onDeletePrize,
  onUploadLogo,
  onReset
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('PARTICIPANTS');
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  // --- Participant Form States ---
  const [name, setName] = useState('');
  const [assignedNum, setAssignedNum] = useState('');
  const [seniority, setSeniority] = useState('');
  const [type, setType] = useState<UserType>(UserType.EMPLOYEE);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  // --- Prize Form States ---
  const [prizeName, setPrizeName] = useState('');
  const [prizeQty, setPrizeQty] = useState('');
  const [editingPrizeId, setEditingPrizeId] = useState<string | null>(null);

  // --- PARTICIPANT HANDLERS ---
  const handleSubmitParticipant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !assignedNum) return;
    
    const participantData = {
      name,
      assignedNumber: parseInt(assignedNum),
      seniorityYears: parseInt(seniority) || 0,
      type
    };

    if (editingId) {
      onUpdateParticipant({ ...participantData, id: editingId });
      setEditingId(null);
    } else {
      onAddParticipant(participantData);
    }
    
    // Reset form
    setName('');
    setAssignedNum('');
    setSeniority('');
    setType(UserType.EMPLOYEE);
  };

  const handleEditParticipant = (p: Participant) => {
    setName(p.name);
    setAssignedNum(p.assignedNumber.toString());
    setSeniority(p.seniorityYears.toString());
    setType(p.type);
    setEditingId(p.id);
  };

  const handleCancelEditParticipant = () => {
    setName('');
    setAssignedNum('');
    setSeniority('');
    setType(UserType.EMPLOYEE);
    setEditingId(null);
  }

  // --- PRIZE HANDLERS ---
  const handleSubmitPrize = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prizeName || !prizeQty) return;

    const qty = parseInt(prizeQty);
    
    if (editingPrizeId) {
      const existing = prizes.find(p => p.id === editingPrizeId);
      if (existing) {
        onUpdatePrize({
          ...existing,
          name: prizeName,
          quantity: qty,
          initialQuantity: Math.max(qty, existing.initialQuantity) // Ensure initial is at least current
        });
      }
      setEditingPrizeId(null);
    } else {
      onAddPrize({
        name: prizeName,
        quantity: qty,
        initialQuantity: qty,
        color: '#FFD700'
      });
    }

    setPrizeName('');
    setPrizeQty('');
  };

  const handleEditPrize = (p: Prize) => {
    setPrizeName(p.name);
    setPrizeQty(p.quantity.toString());
    setEditingPrizeId(p.id);
  };

  const handleCancelEditPrize = () => {
    setPrizeName('');
    setPrizeQty('');
    setEditingPrizeId(null);
  };

  // --- SETTINGS HANDLERS ---
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUploadLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // --- GLOBAL ACTIONS ---
  const triggerDelete = (id: string) => {
    setConfirmState({
      isOpen: true,
      title: "Xóa thành viên",
      message: "Bạn có chắc chắn muốn xóa người này khỏi danh sách quay thưởng?",
      confirmLabel: "Xóa ngay",
      confirmColor: "red",
      onConfirm: () => {
        onDeleteParticipant(id);
        setConfirmState(null);
      }
    });
  };

  const triggerDeletePrize = (id: string) => {
    setConfirmState({
      isOpen: true,
      title: "Xóa giải thưởng",
      message: "Bạn có chắc chắn muốn xóa giải thưởng này không?",
      confirmLabel: "Xóa ngay",
      confirmColor: "red",
      onConfirm: () => {
        onDeletePrize(id);
        setConfirmState(null);
      }
    });
  };

  const triggerClearAll = () => {
    setConfirmState({
      isOpen: true,
      title: "CẢNH BÁO: XÓA TẤT CẢ",
      message: "Hành động này sẽ xóa sạch danh sách 80 người hiện tại. Bạn sẽ phải nhập lại từ đầu. Bạn có chắc không?",
      confirmLabel: "Xóa Sạch",
      confirmColor: "red",
      onConfirm: () => {
        onClearAllParticipants();
        setConfirmState(null);
      }
    });
  };

  const triggerResetGame = () => {
    setConfirmState({
      isOpen: true,
      title: "Reset Game",
      message: "Bạn muốn xóa lịch sử trúng thưởng để quay lại từ đầu? Danh sách người tham gia sẽ được giữ nguyên.",
      confirmLabel: "Reset",
      confirmColor: "orange",
      onConfirm: () => {
        onReset();
        setConfirmState(null);
      }
    });
  };

  const toggleBlacklist = (num: number) => {
    if (blacklistedNumbers.includes(num)) {
      onUpdateBlacklist(blacklistedNumbers.filter(n => n !== num));
    } else {
      onUpdateBlacklist([...blacklistedNumbers, num]);
    }
  };

  // --- Filters ---
  const filteredParticipants = useMemo(() => {
    return participants
      .filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.assignedNumber.toString().includes(searchTerm)
      )
      .sort((a, b) => a.assignedNumber - b.assignedNumber);
  }, [participants, searchTerm]);

  // --- RENDER ---

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex justify-end animate-fade-in" onClick={onClose}>
        <div 
          className="w-full max-w-2xl bg-[#0B1E33] h-full flex flex-col shadow-2xl border-l border-white/10"
          onClick={(e) => e.stopPropagation()} 
        >
          
          {/* Header & Tabs */}
          <div className="flex flex-col border-b border-gray-700 bg-[#05101c] shrink-0">
            <div className="flex justify-between items-center p-6 pb-2">
              <div>
                 <h2 className="text-2xl font-black text-white uppercase tracking-wider">Cấu hình</h2>
                 <p className="text-xs text-mor-orange font-semibold">MOR Software HCM</p>
              </div>
              <button 
                type="button"
                onClick={onClose} 
                className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-800 hover:bg-red-500 text-white transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            {/* Tab Navigation */}
            <div className="flex px-6 space-x-6 overflow-x-auto no-scrollbar">
              <button 
                onClick={() => setActiveTab('PARTICIPANTS')}
                className={`pb-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors whitespace-nowrap ${activeTab === 'PARTICIPANTS' ? 'text-mor-blue border-mor-blue' : 'text-gray-500 border-transparent hover:text-white'}`}
              >
                Người chơi ({participants.length})
              </button>
              <button 
                onClick={() => setActiveTab('PRIZES')}
                className={`pb-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors whitespace-nowrap ${activeTab === 'PRIZES' ? 'text-mor-gold border-mor-gold' : 'text-gray-500 border-transparent hover:text-white'}`}
              >
                Giải thưởng ({prizes.length})
              </button>
              <button 
                onClick={() => setActiveTab('SETTINGS')}
                className={`pb-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors whitespace-nowrap ${activeTab === 'SETTINGS' ? 'text-mor-orange border-mor-orange' : 'text-gray-500 border-transparent hover:text-white'}`}
              >
                Cài đặt chung
              </button>
            </div>
          </div>

          {/* TAB CONTENT: PARTICIPANTS */}
          {activeTab === 'PARTICIPANTS' && (
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-800/50 p-4 rounded-xl border border-white/5 text-center">
                  <div className="text-gray-400 text-xs uppercase font-bold mb-1">Tổng số</div>
                  <div className="text-2xl font-black text-white">{participants.length}</div>
                </div>
                <div className="bg-gray-800/50 p-4 rounded-xl border border-white/5 text-center">
                  <div className="text-gray-400 text-xs uppercase font-bold mb-1">Đã trúng</div>
                  <div className="text-2xl font-black text-mor-gold">{history.length}</div>
                </div>
                 <div className="bg-gray-800/50 p-4 rounded-xl border border-white/5 text-center">
                  <div className="text-gray-400 text-xs uppercase font-bold mb-1">Còn lại</div>
                  <div className="text-2xl font-black text-mor-blue">{participants.length - history.length}</div>
                </div>
              </div>

              {/* Input Form */}
              <div className={`bg-gray-800/50 rounded-xl border p-5 transition-colors ${editingId ? 'border-mor-orange bg-mor-orange/5' : 'border-white/5'}`}>
                <h3 className="text-sm font-bold text-mor-blue uppercase tracking-widest mb-4 flex items-center justify-between">
                  <span className="flex items-center">
                    <span className={`w-2 h-2 rounded-full mr-2 ${editingId ? 'bg-mor-orange' : 'bg-mor-blue'}`}></span>
                    {editingId ? 'Chỉnh sửa thông tin' : 'Thêm người mới'}
                  </span>
                  {editingId && (
                    <button type="button" onClick={handleCancelEditParticipant} className="text-xs text-gray-400 hover:text-white underline cursor-pointer">Hủy bỏ</button>
                  )}
                </h3>
                <form onSubmit={handleSubmitParticipant} className="flex flex-col gap-3">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <input 
                      type="text" 
                      value={name} 
                      onChange={e => setName(e.target.value)} 
                      className="md:col-span-2 bg-gray-900/50 text-white px-4 py-2 rounded-lg border border-gray-700 focus:border-mor-blue focus:outline-none"
                      placeholder="Họ và tên..."
                      required
                    />
                    <input 
                      type="number" 
                      value={assignedNum} 
                      onChange={e => setAssignedNum(e.target.value)} 
                      className="bg-gray-900/50 text-white px-4 py-2 rounded-lg border border-gray-700 focus:border-mor-blue focus:outline-none"
                      placeholder="Số (1-80)"
                      required
                    />
                     <input 
                      type="number" 
                      value={seniority} 
                      onChange={e => setSeniority(e.target.value)} 
                      className="bg-gray-900/50 text-white px-4 py-2 rounded-lg border border-gray-700 focus:border-mor-blue focus:outline-none"
                      placeholder="Năm KN"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <select 
                      value={type}
                      onChange={e => setType(e.target.value as UserType)}
                      className="bg-gray-900/50 text-white px-4 py-2 rounded-lg border border-gray-700 focus:border-mor-blue focus:outline-none"
                    >
                      <option value={UserType.EMPLOYEE}>Nhân viên (Employee)</option>
                      <option value={UserType.GUEST}>Khách mời (Guest)</option>
                    </select>
                    <button 
                      type="submit" 
                      className={`font-bold py-2 rounded-lg shadow-lg transition-transform active:scale-95 text-white cursor-pointer
                        ${editingId ? 'bg-mor-orange hover:bg-orange-600' : 'bg-mor-blue hover:bg-blue-600'}
                      `}
                    >
                      {editingId ? '💾 Cập Nhật' : '+ Thêm Ngay'}
                    </button>
                  </div>
                </form>
              </div>

              {/* List */}
              <div className="bg-gray-800/50 rounded-xl border border-white/5 flex flex-col flex-1 min-h-[400px]">
                 <div className="p-4 border-b border-gray-700 flex flex-wrap justify-between items-center bg-gray-800 rounded-t-xl gap-2">
                   <div className="flex items-center gap-4">
                     <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center">
                       <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                       Danh sách
                     </h3>
                     <button type="button" onClick={triggerClearAll} className="px-3 py-1.5 bg-red-500/10 hover:bg-red-600 text-red-400 hover:text-white rounded border border-red-500/20 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer">
                       🗑️ Xóa tất cả
                     </button>
                   </div>
                   <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="🔍 Tìm kiếm..." className="bg-gray-900 text-xs text-white px-3 py-1.5 rounded-full border border-gray-600 w-32 focus:w-48 transition-all focus:border-mor-blue focus:outline-none" />
                 </div>
                 
                 <div className="flex-1 overflow-y-auto relative scrollbar-thin scrollbar-thumb-gray-600">
                   <table className="w-full text-left border-collapse">
                     <thead className="text-xs text-gray-400 uppercase bg-gray-900/95 sticky top-0 z-10">
                       <tr>
                         <th className="p-3 w-16 text-center font-bold">Số</th>
                         <th className="p-3 font-bold">Thông tin</th>
                         <th className="p-3 text-center w-24 font-bold">Trạng thái</th>
                         <th className="p-3 text-right w-36 font-bold">Hành động</th>
                       </tr>
                     </thead>
                     <tbody className="text-sm divide-y divide-gray-700/50">
                       {filteredParticipants.map(p => {
                         const isBlacklisted = blacklistedNumbers.includes(p.assignedNumber);
                         const isWinner = history.includes(p.assignedNumber);
                         const isSenior = p.seniorityYears > 3 && p.type === UserType.EMPLOYEE;
                         const isEditing = editingId === p.id;
                         return (
                           <tr key={p.id} className={`hover:bg-white/5 transition-colors group ${isEditing ? 'bg-mor-orange/10' : ''}`}>
                             <td className="p-3 text-center">
                               <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center font-bold text-sm shadow-inner ${isWinner ? 'bg-mor-gold text-black' : 'bg-gray-700 text-white'}`}>{p.assignedNumber}</div>
                             </td>
                             <td className="p-3">
                               <div className="font-bold text-white group-hover:text-mor-blue transition-colors">{p.name}</div>
                               <div className="text-xs text-gray-400 flex items-center gap-2 mt-0.5">
                                 <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${p.type === UserType.GUEST ? 'bg-purple-900 text-purple-200' : 'bg-blue-900 text-blue-200'}`}>{p.type === UserType.GUEST ? 'GUEST' : 'STAFF'}</span>
                                 {p.seniorityYears > 0 && <span>{p.seniorityYears} năm</span>}
                                 {isSenior && <span className="text-mor-orange font-bold text-[10px]">★ x2</span>}
                               </div>
                             </td>
                             <td className="p-3 text-center">
                               {isWinner ? <span className="text-[10px] font-bold text-mor-gold border border-mor-gold px-2 py-0.5 rounded-full bg-mor-gold/10">TRÚNG</span> : <span className="text-gray-600 text-xs">-</span>}
                             </td>
                             <td className="p-3 text-right">
                               <div className="flex items-center justify-end space-x-2">
                                 <button type="button" onClick={() => toggleBlacklist(p.assignedNumber)} disabled={isWinner} className={`w-8 h-6 rounded-full relative transition-colors focus:outline-none cursor-pointer border border-transparent hover:border-white/20 ${isWinner ? 'opacity-30 cursor-not-allowed bg-gray-600' : (isBlacklisted ? 'bg-gray-600' : 'bg-green-600')}`}>
                                   <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${isBlacklisted ? '' : 'translate-x-2'}`} />
                                 </button>
                                 <button type="button" onClick={() => handleEditParticipant(p)} disabled={isWinner} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 rounded transition disabled:opacity-30 cursor-pointer">✏️</button>
                                 <button type="button" onClick={() => triggerDelete(p.id)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded transition cursor-pointer">🗑️</button>
                               </div>
                             </td>
                           </tr>
                         );
                       })}
                     </tbody>
                   </table>
                 </div>
              </div>
            </div>
          )}

          {/* TAB CONTENT: PRIZES */}
          {activeTab === 'PRIZES' && (
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Prize Input */}
              <div className={`bg-gray-800/50 rounded-xl border p-5 transition-colors ${editingPrizeId ? 'border-mor-orange bg-mor-orange/5' : 'border-white/5'}`}>
                 <h3 className="text-sm font-bold text-mor-gold uppercase tracking-widest mb-4 flex items-center justify-between">
                    <span className="flex items-center">
                      <span className={`w-2 h-2 rounded-full mr-2 ${editingPrizeId ? 'bg-mor-orange' : 'bg-mor-gold'}`}></span>
                      {editingPrizeId ? 'Sửa giải thưởng' : 'Thêm giải thưởng mới'}
                    </span>
                    {editingPrizeId && (
                      <button type="button" onClick={handleCancelEditPrize} className="text-xs text-gray-400 hover:text-white underline cursor-pointer">Hủy bỏ</button>
                    )}
                 </h3>
                 <form onSubmit={handleSubmitPrize} className="flex flex-col md:flex-row gap-3">
                    <input 
                      type="text" 
                      value={prizeName} 
                      onChange={e => setPrizeName(e.target.value)} 
                      className="flex-1 bg-gray-900/50 text-white px-4 py-2 rounded-lg border border-gray-700 focus:border-mor-gold focus:outline-none"
                      placeholder="Tên giải (VD: Giải Nhất)"
                      required
                    />
                    <input 
                      type="number" 
                      value={prizeQty} 
                      onChange={e => setPrizeQty(e.target.value)} 
                      className="w-full md:w-32 bg-gray-900/50 text-white px-4 py-2 rounded-lg border border-gray-700 focus:border-mor-gold focus:outline-none"
                      placeholder="SL"
                      min="1"
                      required
                    />
                    <button 
                      type="submit" 
                      className={`font-bold py-2 px-6 rounded-lg shadow-lg transition-transform active:scale-95 text-white cursor-pointer
                        ${editingPrizeId ? 'bg-mor-orange hover:bg-orange-600' : 'bg-mor-gold hover:bg-yellow-500 text-black'}
                      `}
                    >
                      {editingPrizeId ? 'Lưu' : 'Thêm'}
                    </button>
                 </form>
              </div>

              {/* Prize List */}
              <div className="bg-gray-800/50 rounded-xl border border-white/5 flex flex-col min-h-[400px]">
                 <div className="p-4 border-b border-gray-700 bg-gray-800 rounded-t-xl">
                   <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center">
                     <span className="w-2 h-2 rounded-full bg-mor-gold mr-2"></span>
                     Danh sách giải thưởng
                   </h3>
                 </div>
                 
                 <div className="flex-1 overflow-y-auto p-4 space-y-3">
                   {prizes.length === 0 && (
                     <div className="text-center text-gray-500 italic py-12">Chưa có giải thưởng nào.</div>
                   )}
                   {prizes.map((p, idx) => (
                     <div key={p.id} className="flex items-center justify-between bg-white/5 p-4 rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
                        <div className="flex items-center gap-4">
                           <div className="w-8 h-8 rounded-full bg-mor-gold flex items-center justify-center text-black font-black text-xs">
                             #{idx + 1}
                           </div>
                           <div>
                              <div className="font-bold text-lg text-white">{p.name}</div>
                              <div className="text-xs text-gray-400">Số lượng: <span className="text-mor-gold font-bold">{p.quantity}</span> / {p.initialQuantity}</div>
                           </div>
                        </div>
                        <div className="flex items-center gap-2">
                           <button 
                             onClick={() => handleEditPrize(p)}
                             className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white bg-gray-700/50 hover:bg-gray-700 rounded transition cursor-pointer"
                           >✏️</button>
                           <button 
                             onClick={() => triggerDeletePrize(p.id)}
                             className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 bg-gray-700/50 hover:bg-red-500/10 rounded transition cursor-pointer"
                           >🗑️</button>
                        </div>
                     </div>
                   ))}
                 </div>
              </div>
            </div>
          )}

          {/* TAB CONTENT: SETTINGS */}
          {activeTab === 'SETTINGS' && (
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Logo Upload */}
              <div className="bg-gray-800/50 rounded-xl border border-white/5 p-5">
                <h3 className="text-sm font-bold text-mor-gold uppercase tracking-widest mb-4">Logo Thương Hiệu</h3>
                <div className="flex flex-col md:flex-row items-center gap-4">
                  <label className="cursor-pointer bg-mor-blue hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-bold shadow-lg transition-transform active:scale-95 flex items-center gap-2">
                    <span className="text-xl">📤</span> 
                    <span>Tải ảnh lên (Thay thế Mặc định)</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  </label>
                  <div className="text-xs text-gray-400 leading-relaxed max-w-sm">
                    Tải lên file PNG hoặc JPG. Khuyên dùng ảnh nền trong suốt (Transparent). Ảnh này sẽ hiển thị ở tâm vòng quay và tiêu đề chính.
                  </div>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="bg-red-500/5 rounded-xl border border-red-500/20 p-5 mt-8">
                 <h3 className="text-sm font-bold text-red-500 uppercase tracking-widest mb-4">Vùng Nguy Hiểm</h3>
                 <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between border-b border-red-500/10 pb-4">
                        <div>
                          <div className="font-bold text-white">Reset Dữ Liệu Game</div>
                          <div className="text-xs text-gray-400">Xóa lịch sử trúng thưởng và trả lại số lượng giải. Danh sách người chơi giữ nguyên.</div>
                        </div>
                        <button 
                          type="button"
                          onClick={triggerResetGame}
                          className="border border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white px-4 py-2 rounded-lg transition text-xs font-bold uppercase tracking-wider cursor-pointer"
                        >
                          Reset
                        </button>
                    </div>
                 </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* --- CUSTOM CONFIRMATION MODAL --- */}
      {confirmState && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0B1E33] border border-white/20 rounded-2xl shadow-2xl max-w-sm w-full p-6 transform transition-all scale-100">
            <h3 className="text-xl font-black text-white uppercase mb-2">
              {confirmState.title}
            </h3>
            <p className="text-gray-300 mb-6 text-sm leading-relaxed">
              {confirmState.message}
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setConfirmState(null)}
                className="px-4 py-2 text-gray-400 hover:text-white font-bold text-sm transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={confirmState.onConfirm}
                className={`px-5 py-2 rounded-lg text-white font-bold text-sm shadow-lg transition-transform active:scale-95 cursor-pointer
                  ${confirmState.confirmColor === 'red' ? 'bg-red-600 hover:bg-red-700' : 'bg-mor-orange hover:bg-orange-600'}
                `}
              >
                {confirmState.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminPanel;