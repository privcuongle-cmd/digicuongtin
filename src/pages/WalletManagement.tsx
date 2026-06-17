import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Wallet } from '../types';
import { Plus, ArrowLeftRight, Activity, X, Wallet as WalletIcon, Landmark, CreditCard, Smartphone, Coins, PiggyBank, Briefcase, Pencil, History, Image as ImageIcon } from 'lucide-react';
import { formatNumber, formatDateTime, parseDateString } from '../lib/utils';
import { generateId } from '../lib/idUtils';
import { ImageLibraryModal } from '../components/ImageLibraryModal';
import { useMobileBackModal } from '../hooks/useMobileBackModal';

const AVAILABLE_ICONS: Record<string, React.FC<any>> = {
  Wallet: WalletIcon,
  Landmark: Landmark,
  CreditCard: CreditCard,
  Smartphone: Smartphone,
  Coins: Coins,
  PiggyBank: PiggyBank,
  Briefcase: Briefcase,
};

const AVAILABLE_COLORS = [
  { id: 'emerald', bg: 'bg-emerald-500', light: 'bg-emerald-50', text: 'text-emerald-500' },
  { id: 'blue', bg: 'bg-blue-500', light: 'bg-blue-50', text: 'text-blue-500' },
  { id: 'indigo', bg: 'bg-indigo-500', light: 'bg-indigo-50', text: 'text-indigo-500' },
  { id: 'purple', bg: 'bg-purple-500', light: 'bg-purple-50', text: 'text-purple-500' },
  { id: 'rose', bg: 'bg-rose-500', light: 'bg-rose-50', text: 'text-rose-500' },
  { id: 'amber', bg: 'bg-amber-500', light: 'bg-amber-50', text: 'text-amber-500' },
  { id: 'teal', bg: 'bg-teal-500', light: 'bg-teal-50', text: 'text-teal-500' },
  { id: 'cyan', bg: 'bg-cyan-500', light: 'bg-cyan-50', text: 'text-cyan-500' },
];

const WALLET_CATEGORY_LABELS: Record<string, string> = {
  'DEPOSIT': 'Nạp tiền vào ví',
  'SALES_REVENUE': 'Doanh thu bán/sửa chữa',
  'DEBT_COLLECTION': 'Thu nợ khách hàng',
  'WITHDRAW': 'Rút tiền',
  'IMPORT_PAYMENT': 'Chi phí nhập hàng',
  'DEBT_PAYMENT': 'Trả nợ NCC',
  'EXPENSE': 'Chi phí khác',
  'OTHER': 'Khác'
};

export const WalletManagement: React.FC = () => {
  const { currentUser, wallets, cashTransactions, addWallet, updateWallet, addCashTransaction } = useAppContext();

  const [activeTab, setActiveTab] = useState<'wallets' | 'transactions'>('wallets');
  const [selectedWalletFilter, setSelectedWalletFilter] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImageLibraryOpen, setIsImageLibraryOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null);

  // Form states
  const [walletName, setWalletName] = useState('');
  const [walletType, setWalletType] = useState<'CASH' | 'BANK' | 'EWALLET'>('CASH');
  const [initialBalance, setInitialBalance] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('Wallet');
  const [selectedColor, setSelectedColor] = useState('emerald');
  const [backgroundImage, setBackgroundImage] = useState('');

  // Transaction form states
  const [txType, setTxType] = useState<'IN' | 'OUT'>('IN');
  const [txCategory, setTxCategory] = useState('OTHER');
  const [txAmount, setTxAmount] = useState('');
  const [txDescription, setTxDescription] = useState('');

  useMobileBackModal(isModalOpen, () => setIsModalOpen(false));
  useMobileBackModal(isImageLibraryOpen, () => setIsImageLibraryOpen(false));
  useMobileBackModal(isTransactionModalOpen, () => setIsTransactionModalOpen(false));
  useMobileBackModal(!!editingWallet, () => setEditingWallet(null));

  if (currentUser?.role !== 'ADMIN') {
    return (
      <div className="p-8 text-center text-rose-500 font-bold bg-white rounded-2xl shadow-sm m-4">
        Bạn không có quyền truy cập chức năng này.
      </div>
    );
  }

  const handleSaveWallet = () => {
    if (!walletName) return;

    if (editingWallet) {
      updateWallet(editingWallet.id, {
        name: walletName,
        type: walletType,
        accountNumber,
        bankName,
        ownerName,
        icon: selectedIcon,
        color: selectedColor,
        backgroundImage
      });
    } else {
      addWallet({
        id: generateId('W', wallets),
        name: walletName,
        type: walletType,
        balance: parseFloat(initialBalance.replace(/[^0-9-]/g, '')) || 0,
        accountNumber,
        bankName,
        ownerName,
        isActive: true,
        icon: selectedIcon,
        color: selectedColor,
        backgroundImage
      });
    }

    closeModal();
  };

  const handleSaveTransaction = () => {
    if (!editingWallet || !txAmount) return;
    const amount = parseFloat(txAmount.replace(/[^0-9-]/g, '')) || 0;
    if (amount <= 0) return;

    addCashTransaction({
      id: generateId('CT', cashTransactions),
      date: formatDateTime(new Date()),
      type: txType === 'IN' ? 'RECEIPT' : 'PAYMENT',
      category: txCategory,
      amount,
      note: txDescription || (txType === 'IN' ? 'Nạp tiền vào ví' : 'Rút tiền khỏi ví'),
      walletId: editingWallet.id
    });

    closeTransactionModal();
  };

  const openModal = (wallet?: Wallet) => {
    if (wallet) {
      setEditingWallet(wallet);
      setWalletName(wallet.name);
      setWalletType(wallet.type);
      setAccountNumber(wallet.accountNumber || '');
      setBankName(wallet.bankName || '');
      setOwnerName(wallet.ownerName || '');
      setInitialBalance(wallet.balance.toString());
      setSelectedIcon(wallet.icon || (wallet.type === 'BANK' ? 'Landmark' : wallet.type === 'EWALLET' ? 'Smartphone' : 'Wallet'));
      setSelectedColor(wallet.color || (wallet.type === 'CASH' ? 'emerald' : wallet.type === 'BANK' ? 'blue' : 'purple'));
      setBackgroundImage(wallet.backgroundImage || '');
    } else {
      setEditingWallet(null);
      setWalletName('');
      setWalletType('CASH');
      setAccountNumber('');
      setBankName('');
      setOwnerName('');
      setInitialBalance('');
      setSelectedIcon('Wallet');
      setSelectedColor('emerald');
      setBackgroundImage('');
    }
    setIsModalOpen(true);
  };

  const openTransactionModal = (wallet: Wallet) => {
    setEditingWallet(wallet);
    setTxType('IN');
    setTxCategory('OTHER');
    setTxAmount('');
    setTxDescription('');
    setIsTransactionModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingWallet(null);
  };

  const closeTransactionModal = () => {
    setIsTransactionModalOpen(false);
    setEditingWallet(null);
  };

  const handleWalletTypeChange = (type: 'CASH' | 'BANK' | 'EWALLET') => {
    setWalletType(type);
    if (!editingWallet) {
      if (type === 'CASH') { setSelectedIcon('Wallet'); setSelectedColor('emerald'); }
      if (type === 'BANK') { setSelectedIcon('Landmark'); setSelectedColor('blue'); }
      if (type === 'EWALLET') { setSelectedIcon('Smartphone'); setSelectedColor('purple'); }
    }
  };

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-3xl shadow-sm border border-slate-200">
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <WalletIcon className="text-blue-500" />
          Quản Lý Ví / Ngân Hàng
        </h1>
        <button
          onClick={() => openModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold text-sm tracking-wide transition-colors flex items-center gap-2 shadow-sm shadow-blue-200"
        >
          <Plus size={18} />
          Thêm Ví Mới
        </button>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('wallets')}
          className={`flex-1 py-3 font-bold text-sm rounded-2xl transition-all ${
            activeTab === 'wallets' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          Danh sách Ví
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          className={`flex-1 py-3 font-bold text-sm rounded-2xl transition-all ${
            activeTab === 'transactions' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          Lịch sử giao dịch
        </button>
      </div>

      {activeTab === 'wallets' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {wallets.map((wallet, idx) => (
            <div key={`${wallet.id}-${idx}`} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col h-full">
              {wallet.backgroundImage && (
                <div 
                  className="absolute inset-0 z-0 opacity-[0.06] bg-cover bg-center pointer-events-none"
                  style={{ backgroundImage: `url(${wallet.backgroundImage})` }}
                />
              )}

              <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-sm ${
                  AVAILABLE_COLORS.find(c => c.id === wallet.color)?.bg || (wallet.type === 'CASH' ? 'bg-emerald-500' : wallet.type === 'BANK' ? 'bg-blue-500' : 'bg-purple-500')
                }`}>
                  {React.createElement(AVAILABLE_ICONS[wallet.icon || 'Wallet'] || WalletIcon, { size: 24 })}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 leading-tight">{wallet.name}</h3>
                  <p className="text-xs text-slate-400 font-medium">{wallet.type === 'CASH' ? 'Tiền mặt' : wallet.type === 'BANK' ? 'Ngân hàng' : 'Ví điện tử'}</p>
                </div>
              </div>

              <div className="space-y-4 relative z-10 flex-grow">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Số dư hiện tại</p>
                  <p className="text-2xl font-black text-slate-800">{formatNumber(wallet.balance)} đ</p>
                </div>

                {wallet.type !== 'CASH' && (
                  <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-4 flex-grow content-start">
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Ngân hàng</p>
                      <p className="text-xs font-bold text-slate-700">{wallet.bankName || '---'}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Số tài khoản</p>
                      <p className="text-xs font-mono font-bold text-blue-600">{wallet.accountNumber || '---'}</p>
                    </div>
                    <div className="col-span-2 text-xs font-bold text-slate-600 uppercase">
                      {wallet.ownerName || '---'}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 mt-6 border-t border-slate-100 flex gap-2 relative z-10">
                <button onClick={() => openTransactionModal(wallet)} className="flex-1 py-2.5 bg-emerald-50 text-emerald-600 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 hover:bg-emerald-100 transition-colors" title="Tạo giao dịch">
                  <ArrowLeftRight size={14} />
                  GD
                </button>
                <button onClick={() => {
                  setSelectedWalletFilter(wallet.id);
                  setActiveTab('transactions');
                }} className="flex-1 py-2.5 bg-indigo-50 text-indigo-600 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 hover:bg-indigo-100 transition-colors" title="Lịch sử giao dịch">
                  <History size={14} />
                  Lịch sử
                </button>
                <button onClick={() => openModal(wallet)} className="flex-1 py-2.5 bg-blue-50 text-blue-600 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 hover:bg-blue-100 transition-colors" title="Sửa thông tin">
                  <Pencil size={14} />
                  Sửa
                </button>
              </div>
            </div>
          ))}

          {wallets.length === 0 && (
             <div className="col-span-full bg-white p-12 rounded-3xl border-2 border-dashed border-slate-200 text-center">
               <WalletIcon className="text-slate-300 mx-auto mb-4" size={48} />
               <p className="text-slate-500 font-bold">Chưa có ví/ngân hàng nào</p>
             </div>
          )}
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="space-y-4">
          <div className="flex gap-4 lg:w-1/3">
            <select
              value={selectedWalletFilter}
              onChange={(e) => setSelectedWalletFilter(e.target.value)}
              className="w-full p-3 bg-white border border-slate-200 rounded-2xl text-sm font-semibold outline-none focus:border-blue-400"
            >
              <option value="ALL">Tất cả ví & ngân hàng</option>
              {wallets.map((w, idx) => (
                <option key={`${w.id}-${idx}`} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4">Thời gian</th>
                    <th className="px-6 py-4">Ví giao dịch</th>
                    <th className="px-6 py-4">Loại GD</th>
                    <th className="px-6 py-4">Danh mục</th>
                    <th className="px-6 py-4 text-right">Số tiền</th>
                    <th className="px-6 py-4 max-w-[250px]">Ghi chú</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cashTransactions
                    .filter(t => t.walletId && (selectedWalletFilter === 'ALL' || t.walletId === selectedWalletFilter))
                    .sort((a, b) => parseDateString(b.date) - parseDateString(a.date))
                    .map((t, idx) => {
                    const wallet = wallets.find(w => w.id === t.walletId);
                  return (
                    <tr key={`${t.id}-${idx}`} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 font-medium">
                        {t.date}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-bold text-slate-800">{wallet?.name || '---'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded inline-flex text-[10px] font-black uppercase ${t.type === 'RECEIPT' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                          {t.type === 'RECEIPT' ? 'THU VÀO' : 'CHI RA'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-bold text-slate-600 text-xs">
                          {t.category ? WALLET_CATEGORY_LABELS[t.category] || 'Khác' : 'Khác'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className={`font-black ${t.type === 'RECEIPT' ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {t.type === 'RECEIPT' ? '+' : '-'}{formatNumber(t.amount)} đ
                        </span>
                      </td>
                      <td className="px-6 py-4 max-w-[250px] truncate text-xs text-slate-500 italic">
                        {t.note || t.description}
                      </td>
                    </tr>
                  )
                })}
                {cashTransactions.filter(t => t.walletId && (selectedWalletFilter === 'ALL' || t.walletId === selectedWalletFilter)).length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium italic">
                      Chưa có giao dịch nào
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        </div>
      )}

      {/* Wallets Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center md:p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full h-full md:h-auto md:max-h-[90vh] max-w-md md:rounded-3xl overflow-hidden shadow-2xl flex flex-col">
            <div className="px-6 py-4 pt-12 md:pt-4 flex justify-between items-center border-b border-slate-100 bg-slate-50 shrink-0">
              <h3 className="font-bold text-slate-800 text-lg">
                {editingWallet ? 'Cập Nhật Ví' : 'Thêm Ví Mới'}
              </h3>
              <button onClick={closeModal} className="text-slate-400 hover:bg-slate-200 p-2 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4 flex-1 overflow-y-auto">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Loại Ví</label>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setWalletType('CASH')}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition-colors border ${walletType === 'CASH' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}
                  >Tiền Mặt</button>
                  <button 
                    onClick={() => setWalletType('BANK')}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition-colors border ${walletType === 'BANK' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}
                  >Ngân Hàng</button>
                  <button 
                    onClick={() => setWalletType('EWALLET')}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition-colors border ${walletType === 'EWALLET' ? 'bg-purple-50 text-purple-600 border-purple-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}
                  >Ví Điện Tử</button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Tên Gọi Ví</label>
                <input 
                  type="text" 
                  value={walletName}
                  onChange={e => setWalletName(e.target.value)}
                  placeholder="Ví dụ: Két tiền mặt 1, Techcombank Cường..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-400 text-sm font-medium"
                />
              </div>

              {/* Icon Picker */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Biểu tượng</label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(AVAILABLE_ICONS).map(([key, Icon]) => (
                    <button
                      key={key}
                      onClick={() => setSelectedIcon(key)}
                      className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all border ${
                        selectedIcon === key ? 'bg-blue-50 border-blue-400 text-blue-600 shadow-sm' : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      <Icon size={18} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Picker */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Màu sắc</label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_COLORS.map(color => (
                    <button
                      key={color.id}
                      onClick={() => setSelectedColor(color.id)}
                      className={`w-8 h-8 rounded-full transition-all border-2 flex items-center justify-center ${
                        selectedColor === color.id ? 'border-slate-800 scale-110 shadow-sm' : 'border-transparent hover:scale-110'
                      } ${color.bg}`}
                    >
                    </button>
                  ))}
                </div>
              </div>

              {/* Background Image Picker */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Hình nền (Tùy chọn)</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsImageLibraryOpen(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    <ImageIcon size={16} />
                    {backgroundImage ? 'Thay đổi hình ảnh' : 'Chọn hình ảnh'}
                  </button>
                  {backgroundImage && (
                    <button
                      onClick={() => setBackgroundImage('')}
                      className="p-2.5 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                      title="Xóa hình nền"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                {backgroundImage && (
                   <div className="mt-2 w-32 h-20 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden relative">
                     <div 
                       className="absolute inset-0 bg-cover bg-center"
                       style={{ backgroundImage: `url(${backgroundImage})` }}
                     />
                   </div>
                )}
              </div>

              {walletType !== 'CASH' && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Tên Ngân Hàng / App</label>
                    <input 
                      type="text" 
                      value={bankName}
                      onChange={e => setBankName(e.target.value)}
                      placeholder="MB Bank, Vietcombank, Momo..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-400 text-sm font-medium"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Số Tài Khoản</label>
                      <input 
                        type="text" 
                        value={accountNumber}
                        onChange={e => setAccountNumber(e.target.value)}
                        placeholder="N/A"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-400 font-mono text-sm font-bold"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Tên Chủ Thẻ</label>
                      <input 
                        type="text" 
                        value={ownerName}
                        onChange={e => setOwnerName(e.target.value)}
                        placeholder="LE NGOC CUONG"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-400 text-sm font-medium uppercase"
                      />
                    </div>
                  </div>
                </>
              )}

              {!editingWallet && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider ml-1">Số dư khởi tạo</label>
                  <input 
                    type="text" 
                    value={initialBalance}
                    onChange={e => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setInitialBalance(val ? parseInt(val).toLocaleString('vi-VN') : '');
                    }}
                    placeholder="0"
                    className="w-full bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 outline-none focus:border-emerald-400 text-base font-black text-emerald-700"
                  />
                </div>
              )}
            </div>
            
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3 shrink-0">
              <button 
                onClick={closeModal}
                className="flex-1 py-3 rounded-xl font-bold text-sm bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
              >Hủy</button>
              <button 
                onClick={handleSaveWallet}
                className="flex-[2] py-3 rounded-xl font-bold text-sm bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-200 transition-colors"
              >Lưu Thay Đổi</button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Modal */}
      {isTransactionModalOpen && editingWallet && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center md:p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full h-full md:h-auto md:max-h-[90vh] max-w-md md:rounded-3xl overflow-hidden shadow-2xl flex flex-col">
            <div className="px-6 py-4 pt-12 md:pt-4 flex justify-between items-center border-b border-slate-100 bg-slate-50 shrink-0">
              <h3 className="font-bold text-slate-800 text-lg">
                Tạo Giao Dịch
              </h3>
              <button onClick={closeTransactionModal} className="text-slate-400 hover:bg-slate-200 p-2 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4 flex-1 overflow-y-auto">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Loại giao dịch</label>
                <div className="flex gap-2">
                  <button 
                    onClick={() => { setTxType('IN'); setTxCategory('OTHER'); }}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition-colors border ${txType === 'IN' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}
                  >THU VÀO</button>
                  <button 
                    onClick={() => { setTxType('OUT'); setTxCategory('OTHER'); }}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition-colors border ${txType === 'OUT' ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}
                  >CHI RA</button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Danh mục</label>
                <select
                  value={txCategory}
                  onChange={(e) => setTxCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-400 text-sm font-semibold"
                >
                  {txType === 'IN' ? (
                    <>
                      <option value="DEPOSIT">Nạp tiền vào ví</option>
                      <option value="SALES_REVENUE">Doanh thu bán/sửa chữa</option>
                      <option value="DEBT_COLLECTION">Thu nợ khách hàng</option>
                      <option value="OTHER">Thêm mới / Khác</option>
                    </>
                  ) : (
                    <>
                      <option value="WITHDRAW">Rút tiền</option>
                      <option value="IMPORT_PAYMENT">Chi phí nhập hàng</option>
                      <option value="DEBT_PAYMENT">Trả nợ NCC</option>
                      <option value="EXPENSE">Chi phí khác</option>
                      <option value="OTHER">Thêm mới / Khác</option>
                    </>
                  )}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Số tiền (đ)</label>
                <input 
                  type="text" 
                  value={txAmount}
                  onChange={e => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    setTxAmount(val ? parseInt(val).toLocaleString('vi-VN') : '');
                  }}
                  placeholder="0"
                  className={`w-full border rounded-xl px-4 py-3 outline-none text-xl font-black ${
                    txType === 'IN' 
                      ? 'bg-emerald-50 border-emerald-200 focus:border-emerald-400 text-emerald-700' 
                      : 'bg-rose-50 border-rose-200 focus:border-rose-400 text-rose-700'
                  }`}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Ghi chú</label>
                <textarea 
                  value={txDescription}
                  onChange={e => setTxDescription(e.target.value)}
                  placeholder="Nội dung giao dịch..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-400 text-sm font-medium resize-none min-h-[80px]"
                ></textarea>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-500">Ví thao tác:</span>
                <span className="text-sm font-black text-slate-800">{editingWallet.name}</span>
              </div>
            </div>
            
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3 shrink-0">
              <button 
                onClick={closeTransactionModal}
                className="flex-1 py-3 rounded-xl font-bold text-sm bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
              >Hủy</button>
              <button 
                onClick={handleSaveTransaction}
                className={`flex-[2] py-3 rounded-xl font-bold text-sm text-white shadow-md transition-colors ${
                  txType === 'IN' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200' : 'bg-rose-500 hover:bg-rose-600 shadow-rose-200'
                }`}
              >Xác Nhận</button>
            </div>
          </div>
        </div>
      )}

      {/* Image Library Modal */}
      {isImageLibraryOpen && (
        <ImageLibraryModal 
          isOpen={true}
          onClose={() => setIsImageLibraryOpen(false)}
          onSelect={(url) => {
            setBackgroundImage(url);
            setIsImageLibraryOpen(false);
          }}
        />
      )}

    </div>
  );
};
