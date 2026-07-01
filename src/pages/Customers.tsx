import React, { useState, useEffect } from 'react';
import { Search, UserPlus, User, X, FileText, Calendar, Wallet, ChevronRight, CreditCard, Hash, Printer, Settings, HelpCircle, List, MoreHorizontal, Send, Download, SlidersHorizontal, Plus, Edit3, ChevronLeft, History, Wrench, ShieldCheck, ClipboardList, Map, MapPin, Loader2, Wifi, Camera as CameraIcon, Phone, Image as ImageIcon, Settings2, Quote, Navigation, Cpu, Key, Bell, Lock, Copy, MessageSquare, QrCode, Calculator, FileUp, LogOut, Trash2, ZoomIn, ZoomOut } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { Customer, Invoice, CashTransaction, MaintenanceRecord, Task, WifiRecord, CameraAccountRecord, CameraInstallation } from '../types';
import { formatNumber, parseFormattedNumber, formatDateTime, parseDateString, handlePhoneCall, formatDate } from '../lib/utils';
import { generateId } from '../lib/idUtils';
import { PrintTemplate } from '../components/PrintTemplate';
import { ImageLibraryModal } from '../components/ImageLibraryModal';
import { AddCustomerModal } from '../components/AddCustomerModal';
import { QRCodeSVG } from 'qrcode.react';
import { CustomerQuickAddModal } from '../components/CustomerQuickAddModal';
import { useScrollLock } from '../hooks/useScrollLock';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { useMobileBackModal } from '../hooks/useMobileBackModal';

export const Customers: React.FC = () => {
  const { 
    customers, addCustomer, updateCustomer, invoices, updateInvoice, 
    addCashTransaction, returnSalesOrders, currentUser, cashTransactions, 
    maintenanceRecords, tasks, wifiRecords, cameraAccounts, cameraInstallations, wallets, images,
    uploadImage, addWifiRecord, addCameraAccount, addCameraInstallation, addMaintenanceRecord, addTask 
  } = useAppContext();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedCameraInstall, setSelectedCameraInstall] = useState<CameraInstallation | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<'info' | 'history' | 'warranty' | 'tasks' | 'camera_installations'>('info');
  const [isLocating, setIsLocating] = useState(false);
  const [viewImage, setViewImage] = useState<string | null>(null);
  
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const history = localStorage.getItem('customerSearchHistory');
    if (history) {
      try {
        setSearchHistory(JSON.parse(history));
      } catch(e) {}
    }
  }, []);

  useEffect(() => {
    if (!searchTerm || searchTerm.trim().length === 0) return;
    const timeoutId = setTimeout(() => {
      const term = searchTerm.trim();
      setSearchHistory(prev => {
        let newHistory = [term, ...prev.filter(t => t !== term)].slice(0, 5);
        localStorage.setItem('customerSearchHistory', JSON.stringify(newHistory));
        return newHistory;
      });
    }, 2000);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const captureInputRef = React.useRef<HTMLInputElement>(null);

  const handleQuickCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedCustomer) return;

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        const filename = `${selectedCustomer.name}_${Date.now()}.jpg`;
        const res = await uploadImage(base64, filename, 'KhachHang');
        if (res && selectedCustomer.id) {
          updateCustomer(selectedCustomer.id, { image: res.url });
          setSelectedCustomer({ ...selectedCustomer, image: res.url });
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Lỗi khi tải ảnh:', error);
    }
  };

  const [zoomLevel, setZoomLevel] = useState(1);
  const [addModalType, setAddModalType] = useState<'WIFI' | 'CAMERA' | 'CAMERA_INSTALL' | 'MAINTENANCE' | 'TASK' | null>(null);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);

  // Reset tab when selecting a new customer
  React.useEffect(() => {
    if (selectedCustomer) {
      setActiveDetailTab('info');
    }
  }, [selectedCustomer]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  // Reset page when search term changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Print State
  const [printData, setPrintData] = useState<any>(null);

  const handlePrint = (data: any) => {
    setPrintData(data);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentType, setPaymentType] = useState<'ALL' | 'SINGLE'>('ALL');
  const [targetInvoiceId, setTargetInvoiceId] = useState<string | null>(null);
  const [paymentWalletId, setPaymentWalletId] = useState<string>('');

  // Lock scroll when modals are open
  useScrollLock(isModalOpen || !!selectedCustomer || !!selectedInvoice || isPaymentModalOpen);

  // Handle Escape key to close modals in layers
  useEscapeKey(() => setIsPaymentModalOpen(false), isPaymentModalOpen);
  useEscapeKey(() => setSelectedInvoice(null), !!selectedInvoice);
  useEscapeKey(() => setSelectedCustomer(null), !!selectedCustomer);
  useEscapeKey(() => { setIsModalOpen(false); resetForm(); }, isModalOpen);
  useEscapeKey(() => setAddModalType(null), !!addModalType);

  const filteredCustomers = (customers || [])
    .filter(c => 
      (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
      (c.phone || '').includes(searchTerm) ||
      (c.phone2 || '').includes(searchTerm) ||
      (c.address || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.location || '').toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => String(b.id || '').localeCompare(String(a.id || '')));

  const totalItems = filteredCustomers.length;
  const totalPages = Math.ceil(totalItems / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, totalItems);
  const paginatedCustomers = filteredCustomers.slice(startIndex, endIndex);

  const resetForm = () => {
    setEditingCustomerId(null);
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomerId(customer.id || null);
    setIsModalOpen(true);
  };

  const getCustomerStats = (customer: Customer) => {
    const customerInvoices = invoices.filter(inv => 
      (inv.customerId && inv.customerId === customer.id) || 
      (!inv.customerId && (
        (inv.phone && inv.phone !== '---' && inv.phone === customer.phone) || 
        (inv.customer === customer.name)
      ))
    );
    
    const customerReturns = returnSalesOrders.filter(ret => 
      (ret.customerId && ret.customerId === customer.id) ||
      (!ret.customerId && ret.customer === customer.name)
    );

    const totalSpent = customerInvoices.reduce((sum, inv) => sum + inv.total, 0);
    const totalReturned = customerReturns.reduce((sum, ret) => sum + ret.total, 0);
    const totalDebt = customerInvoices.reduce((sum, inv) => sum + (inv.debt || 0), 0);
    const totalPaid = customerInvoices.reduce((sum, inv) => sum + (inv.paid || 0), 0);
    const avgPerOrder = customerInvoices.length > 0 ? totalSpent / customerInvoices.length : 0;
    const paymentRate = totalSpent > 0 ? (totalPaid / totalSpent) * 100 : 0;
    
    const sortedInvoices = [...customerInvoices].sort((a, b) => parseDateString(b.date) - parseDateString(a.date));
    const lastInvoiceDate = sortedInvoices[0]?.date;
    const lastReturnDate = [...customerReturns].sort((a, b) => parseDateString(b.date) - parseDateString(a.date))[0]?.date;
    
    let lastTransaction = lastInvoiceDate;
    if (lastReturnDate && (!lastTransaction || parseDateString(lastReturnDate) > parseDateString(lastTransaction))) {
      lastTransaction = lastReturnDate;
    }

    const unpaidInvoices = customerInvoices.filter(inv => inv.debt > 0).sort((a, b) => parseDateString(a.date) - parseDateString(b.date));
    let debtDays = 0;
    if (unpaidInvoices.length > 0) {
      const oldestUnpaidDate = parseDateString(unpaidInvoices[0].date);
      const today = new Date().getTime();
      const diffTime = Math.abs(today - oldestUnpaidDate);
      debtDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    return {
      count: customerInvoices.length,
      total: totalSpent,
      netTotal: totalSpent - totalReturned,
      debt: totalDebt,
      avgPerOrder,
      paymentRate,
      debtDays,
      lastTransaction,
      invoices: sortedInvoices
    };
  };

  const handleOpenPaymentModal = (type: 'ALL' | 'SINGLE', invoiceId: string | null = null, defaultAmount: number = 0) => {
    setPaymentType(type);
    setTargetInvoiceId(invoiceId);
    setPaymentAmount(formatNumber(defaultAmount));
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setIsPaymentModalOpen(true);
  };

  const executePayment = () => {
    if (!paymentWalletId) {
      alert('Vui lòng chọn ví thanh toán!');
      return;
    }
    const payValue = parseFormattedNumber(paymentAmount);
    if (isNaN(payValue) || payValue <= 0) return alert('Số tiền không hợp lệ');

    const transactionId = generateId('PT', cashTransactions);
    const newTransaction: CashTransaction = {
      id: transactionId,
      date: `${paymentDate} ${new Date().toLocaleTimeString()}`,
      type: 'RECEIPT',
      amount: payValue,
      category: 'DEBT_COLLECTION',
      partner: selectedCustomer?.name || '',
      note: paymentType === 'SINGLE' ? `Thu nợ hóa đơn ${targetInvoiceId}` : `Thu nợ tổng KH ${selectedCustomer?.name}`,
      refId: targetInvoiceId || undefined,
      walletId: paymentWalletId
    };

    if (paymentType === 'SINGLE' && targetInvoiceId) {
      const invoice = invoices.find(inv => inv.id === targetInvoiceId);
      if (!invoice) return;
      if (payValue > invoice.debt) return alert('Số tiền thanh toán không được lớn hơn số nợ của hóa đơn');

      updateInvoice(invoice.id, {
        paid: invoice.paid + payValue,
        debt: invoice.debt - payValue
      });
    } else if (paymentType === 'ALL' && selectedCustomer) {
      const stats = getCustomerStats(selectedCustomer);
      if (payValue > stats.debt) return alert('Số tiền thanh toán không được lớn hơn tổng nợ');

      let remainingPayment = payValue;
      // FIFO: Sort by date ascending (oldest first)
      const invoicesWithDebt = [...stats.invoices]
        .filter(inv => inv.debt > 0)
        .sort((a, b) => parseDateString(a.date) - parseDateString(b.date));
      
      invoicesWithDebt.forEach(invoice => {
        if (remainingPayment <= 0) return;
        const paymentForThisInvoice = Math.min(invoice.debt, remainingPayment);
        updateInvoice(invoice.id, {
          paid: invoice.paid + paymentForThisInvoice,
          debt: invoice.debt - paymentForThisInvoice
        });
        remainingPayment -= paymentForThisInvoice;
      });
    }

    addCashTransaction(newTransaction);
    setIsPaymentModalOpen(false);
    
    if (confirm('Thu nợ thành công! Bạn có muốn in phiếu thu không?')) {
      handlePrint({
        title: 'PHIẾU THU TIỀN',
        id: transactionId,
        date: newTransaction.date,
        partner: newTransaction.partner,
        total: newTransaction.amount,
        paid: newTransaction.amount,
        debt: 0,
        note: newTransaction.note,
        type: 'THU'
      });
    }
  };


  useMobileBackModal(isModalOpen, () => setIsModalOpen(false));
  useMobileBackModal(isPaymentModalOpen, () => setIsPaymentModalOpen(false));
  useMobileBackModal(!!selectedCustomer, () => setSelectedCustomer(null));
  useMobileBackModal(!!selectedInvoice, () => setSelectedInvoice(null));
  useMobileBackModal(!!addModalType, () => setAddModalType(null));

return (
    <div className="flex flex-col h-full bg-slate-50 md:bg-white">
      {/* Print Template Container */}
      {printData && <PrintTemplate {...printData} />}

      <div className="bg-white md:rounded-xl md:shadow-sm md:border md:border-slate-200 flex flex-col mx-auto w-full h-full overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center bg-white md:bg-slate-50/50 shrink-0">
          <div className="relative w-full md:max-w-md z-20">
            <div className="relative flex items-center w-full z-50">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setShowHistory(false);
              }}
              placeholder="Theo mã, tên, số điện thoại" 
              className="w-full bg-slate-50 md:bg-white border border-slate-200 rounded-lg pl-9 pr-20 py-2 text-sm outline-none focus:border-blue-500 shadow-sm font-medium transition-all"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {searchTerm && (
                <X 
                  className="text-slate-400 cursor-pointer hover:text-slate-600 shrink-0" 
                  size={16} 
                  onClick={() => setSearchTerm('')} 
                />
              )}
              <History 
                className={`cursor-pointer transition-colors shrink-0 ${showHistory ? 'text-blue-500' : 'text-slate-400 hover:text-slate-600'}`} 
                size={16} 
                onClick={() => setShowHistory(!showHistory)}
                title="Lịch sử tìm kiếm"
              />
            </div>
          </div>
          {showHistory && searchHistory.length > 0 && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowHistory(false)}></div>
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
                {searchHistory.map((item, idx) => (
                <div 
                  key={`history-${item}-${idx}`}
                  className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer flex items-center justify-between group border-b border-slate-50 last:border-0"
                  onClick={() => {
                    setSearchTerm(item);
                    setShowHistory(false);
                  }}
                >
                  <div className="flex items-center gap-2.5 text-sm text-slate-700 font-medium">
                    <History size={14} className="text-slate-400" />
                    <span>{item}</span>
                  </div>
                  <button 
                    className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-red-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      const newHistory = searchHistory.filter(t => t !== item);
                      setSearchHistory(newHistory);
                      localStorage.setItem('customerSearchHistory', JSON.stringify(newHistory));
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
            </>
          )}
        </div>
        
        <div className="hidden md:flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
          <button 
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm items-center gap-2 hover:bg-blue-700 transition-all shadow-md shadow-blue-100 flex"
          >
            <Plus size={16} /> Khách hàng
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
        {/* Desktop Table */}
        <table className="w-full text-left border-collapse whitespace-nowrap hidden md:table">
          <thead className="sticky top-0 z-10 bg-white border-b border-slate-200">
            <tr className="text-slate-700 text-sm font-bold">
              <th className="p-3 w-12 text-center">
                <input type="checkbox" className="w-4 h-4 rounded border-slate-300" />
              </th>
              <th className="p-3 text-left">Mã KH</th>
              <th className="p-3 text-left">Tên khách hàng</th>
              <th className="p-3 text-left">Điện thoại</th>
              <th className="p-3 text-left">Địa chỉ</th>
              <th className="p-3 text-right">Số ngày nợ</th>
              <th className="p-3 text-right">Nợ hiện tại</th>
            </tr>
            <tr className="bg-slate-50/50 text-slate-800 text-[13px] font-bold border-b border-slate-100">
              <td colSpan={6} className="p-3"></td>
              <td className="p-3 text-right">
                {formatNumber(filteredCustomers.reduce((sum, c) => sum + getCustomerStats(c).debt, 0))}
              </td>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {paginatedCustomers.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-10 text-center text-slate-400 italic text-sm">Chưa có khách hàng.</td>
              </tr>
            ) : (
              paginatedCustomers.map((c, idx) => {
                const stats = getCustomerStats(c);
                return (
                    <tr 
                      key={`desktop-cust-${idx}`} 
                      onClick={() => setSelectedCustomer(c)}
                      className="hover:bg-blue-50/30 transition-colors cursor-pointer text-sm text-slate-600 group"
                    >
                      <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" className="w-4 h-4 rounded border-slate-300" />
                      </td>
                      <td className="p-3 font-medium text-blue-600">{c.id}</td>
                      <td className="p-3">
                        <span className="font-bold text-base text-slate-800">{c.name}</span>
                      </td>
                      <td className="p-3">
                        <p className="font-medium text-[15px] text-slate-700">{c.phone}</p>
                        {c.phone2 && <p className="text-xs text-slate-500 mt-0.5">{c.phone2}</p>}
                      </td>
                      <td className="p-3 text-slate-500">{c.address || '---'}</td>
                      <td className="p-3 text-slate-500 text-right">{stats.debtDays > 0 ? `${stats.debtDays} ngày` : '---'}</td>
                      <td className={`p-3 text-right text-base font-bold ${stats.debt > 0 ? 'text-red-500' : 'text-slate-800'}`}>{formatNumber(stats.debt)}</td>
                    </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Mobile Card List */}
        <div className="md:hidden space-y-4 p-4 bg-slate-50 flex-1">
          {paginatedCustomers.length === 0 ? (
            <div className="p-10 text-center text-slate-400 italic text-sm bg-white rounded-2xl border border-slate-100">Chưa có khách hàng.</div>
          ) : (
            paginatedCustomers.map((c, idx) => {
              const stats = getCustomerStats(c);
              return (
                <div 
                  key={`mobile-cust-${idx}`} 
                  onClick={() => setSelectedCustomer(c)}
                  className="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-slate-200 active:scale-[0.98] transition-all cursor-pointer relative overflow-hidden flex flex-col gap-2 hover:shadow-md hover:border-blue-300"
                >
                  <div className="flex gap-3 items-start">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-blue-50 shrink-0 border border-slate-100 flex items-center justify-center text-blue-600 font-bold text-lg">
                        {c.image ? <img src={c.image} alt={c.name} className="w-full h-full object-cover" /> : c.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0 pr-3">
                          <h4 className="font-bold text-base text-slate-800 break-words leading-tight">{c.name}</h4>
                          {c.phone && (
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="text-[12px] text-blue-600 font-bold tracking-wide flex items-center gap-1">
                                <Phone size={12} className="fill-blue-600 text-transparent" />
                                {c.phone}
                              </span>
                            </div>
                          )}
                      </div>
                  </div>

                  <div className="flex items-end justify-between border-t border-slate-100 pt-2 mt-1">
                    <div className="flex-1 min-w-0">
                      {c.address && (
                        <div className="flex items-start gap-1 text-slate-500 pr-2">
                          <MapPin size={12} className="shrink-0 mt-0.5" />
                          <p className="text-xs font-medium break-words italic line-clamp-2 leading-tight">"{c.address}"</p>
                        </div>
                      )}
                    </div>
                    <div className="text-right pl-3 border-l border-slate-100 shrink-0 min-w-[65px]">
                      <p className="text-[9px] text-slate-400 font-bold tracking-widest mb-1">Nợ hiện tại</p>
                      <p className={`font-bold ${stats.debt > 0 ? 'text-red-500' : 'text-slate-800'} text-lg sm:text-xl leading-none`}>
                        {formatNumber(stats.debt)}<span className="text-sm ml-[1px]">đ</span>
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Pagination UI */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border border-t-0 border-slate-200 rounded-b-sm shrink-0">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <span>Hiển thị</span>
          <select 
            value={rowsPerPage} 
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="border border-slate-300 rounded px-2 py-1 outline-none focus:border-blue-500 bg-white cursor-pointer hover:bg-slate-50"
          >
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span>dòng / trang</span>
          <span className="ml-4 border-l border-slate-300 pl-4 hidden md:inline">
            Hiển thị {totalItems === 0 ? 0 : startIndex + 1} - {endIndex} trên tổng số {totalItems} khách hàng
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm px-3 font-medium">Trang {currentPage} / {totalPages || 1}</span>
          <button 
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
            className="p-1.5 rounded border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Customer Detail Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center md:p-4 p-0 bg-slate-900/50 backdrop-blur-sm print:hidden">
          <div className="bg-slate-50 w-full h-full md:h-[90vh] md:max-w-6xl md:rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-300">
            {/* --- MOBILE VIEW --- */}
            <div className="md:hidden flex flex-col h-full bg-[#f4f5f7]">
              {activeDetailTab === 'history' ? (
                <>
                  <div className="flex items-center justify-between bg-white px-4 py-3 sticky top-0 z-20 shadow-sm border-b border-slate-100">
                    <button onClick={() => setActiveDetailTab('info')} className="flex items-center gap-2 text-slate-800">
                      <ChevronLeft size={24} />
                      <span className="text-lg font-normal">Lịch sử giao dịch</span>
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto pb-8 p-3 space-y-3">
                     {(() => {
                        const stats = getCustomerStats(selectedCustomer);
                        if (stats.invoices.length === 0) {
                          return (
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center text-slate-400 italic text-sm font-medium">
                              Chưa có giao dịch mua hàng nào.
                            </div>
                          );
                        }
                        return stats.invoices.map(invoice => (
                          <div 
                            key={invoice.id} 
                            className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-pink-300 transition-all cursor-pointer"
                            onClick={() => setSelectedInvoice(invoice)}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 shrink-0">
                                  <FileText size={20} />
                                </div>
                                <div>
                                  <p className="font-normal text-sm text-slate-800 tracking-tight">{invoice.id}</p>
                                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-normal mt-0.5">
                                    <Calendar size={12} />
                                    {invoice.date}
                                  </div>
                                </div>
                              </div>
                              <div className={`px-2.5 py-1 rounded-full text-[9px] font-normal uppercase tracking-widest ${invoice.debt === 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                                {invoice.debt === 0 ? 'HOÀN TẤT' : 'CÒN NỢ'}
                              </div>
                            </div>
                            <div className="flex justify-between items-center border-t border-slate-50 pt-3">
                              <div>
                                <p className="text-[10px] font-normal text-slate-400 uppercase tracking-widest mb-0.5">Tổng tiền</p>
                                <p className="font-normal text-slate-900 text-[13px]">{formatNumber(invoice.total)}đ</p>
                              </div>
                              <div className="text-right">
                                <p className="text-[10px] font-normal text-slate-400 uppercase tracking-widest mb-0.5">Còn nợ</p>
                                <p className={`font-normal text-[13px] ${invoice.debt > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                  {formatNumber(invoice.debt)}đ
                                </p>
                              </div>
                              {invoice.debt > 0 && (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenPaymentModal('SINGLE', invoice.id, invoice.debt);
                                  }}
                                  className="w-8 h-8 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-lg shrink-0 hover:bg-emerald-600 hover:text-white transition-colors"
                                >
                                  <CreditCard size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                        ));
                     })()}
                  </div>
                </>
              ) : activeDetailTab === 'camera_installations' ? (
                <>
                  <div className="flex items-center justify-between bg-white px-4 py-3 sticky top-0 z-20 shadow-sm border-b border-slate-100">
                    <button onClick={() => setActiveDetailTab('info')} className="flex items-center gap-2 text-slate-800">
                      <ChevronLeft size={24} />
                      <span className="text-lg font-normal">Lắp đặt Camera</span>
                    </button>
                    <button 
                      onClick={() => setAddModalType('CAMERA_INSTALL')}
                      className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center hover:bg-blue-100"
                    >
                      <Plus size={24} />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto pb-8 p-3 space-y-3">
                     {(() => {
                        const customerInstallations = cameraInstallations.filter(r => 
                          (r.customerId && r.customerId === selectedCustomer?.id) ||
                          (!r.customerId && (
                            r.customerPhone === selectedCustomer?.phone || 
                            (selectedCustomer?.phone2 && r.customerPhone === selectedCustomer?.phone2)
                          ))
                        ).sort((a, b) => parseDateString(b.installationDate) - parseDateString(a.installationDate));

                        if (customerInstallations.length === 0) {
                          return (
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center text-slate-400 italic text-sm font-medium">
                              Chưa có bản ghi lắp đặt nào.
                            </div>
                          );
                        }
                        return customerInstallations.map(inst => (
                          <div 
                            key={inst.id} 
                            className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-blue-300 transition-all cursor-pointer"
                            onClick={() => setSelectedCameraInstall(inst)}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                                  <CameraIcon size={20} />
                                </div>
                                <div>
                                  <p className="font-bold text-sm text-slate-800 leading-tight">{inst.installationType}</p>
                                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-normal mt-0.5">
                                    <Calendar size={12} />
                                    {inst.installationDate}
                                  </div>
                                </div>
                              </div>
                              <div className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-mono">
                                #{inst.id}
                              </div>
                            </div>
                            
                            {inst.productName && (
                              <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 mb-2">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Thiết bị:</div>
                                <p className="text-[13px] text-blue-600 font-bold leading-tight">{inst.productName}</p>
                              </div>
                            )}

                            <div className="text-[13px] text-slate-600 line-clamp-2 leading-relaxed mb-3">
                              {inst.details || inst.note || '---'}
                            </div>

                            <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-50">
                               {inst.wifiName && (
                                 <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">
                                   <Wifi size={12} className="text-blue-400" /> {inst.wifiName}
                                 </div>
                               )}
                               {inst.accountName && (
                                 <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">
                                   <ShieldCheck size={12} className="text-indigo-400" /> {inst.accountName}
                                 </div>
                               )}
                               {inst.qrCode && (
                                 <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">
                                   <QrCode size={12} /> {inst.qrCode}
                                 </div>
                               )}
                            </div>
                          </div>
                        ));
                     })()}
                  </div>
                </>
              ) : activeDetailTab === 'info' ? (
                <>
                  {/* Header */}
                  <div className="flex items-center justify-between bg-white px-4 py-3 sticky top-0 z-20 shadow-sm border-b border-slate-100">
                    <button onClick={() => setSelectedCustomer(null)} className="flex items-center gap-2 text-slate-800">
                      <ChevronLeft size={24} />
                      <span className="text-lg font-normal">Chi tiết khách hàng</span>
                    </button>
                    <button className="text-slate-500">
                      <MoreHorizontal size={24} />
                    </button>
                  </div>

                  {/* Scrollable Content */}
                  <div className="flex-1 overflow-y-auto pb-8">
                {/* Info Card */}
                <div className="bg-white m-3 rounded-2xl shadow-sm border border-slate-100 p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-slate-500 uppercase">THÔNG TIN CƠ BẢN</h3>
                    <button onClick={() => handleEdit(selectedCustomer)} className="text-blue-600 text-sm font-bold">Sửa</button>
                  </div>
                  
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-2xl overflow-hidden shrink-0">
                      {selectedCustomer.image ? <img src={selectedCustomer.image} className="w-full h-full object-cover"/> : selectedCustomer.name.charAt(0)}
                    </div>
                    <span className="text-lg font-normal text-slate-900 leading-tight">{selectedCustomer.name}</span>
                  </div>
                  
                  <div className="space-y-4">
                    {/* Phone 1 */}
                    <div className="flex justify-between items-center border-b border-slate-50 pb-4">
                      <div>
                        <div className="text-[13px] text-slate-500 mb-1">Số điện thoại</div>
                        <div 
                           className="text-base font-normal text-slate-900 flex items-center gap-2 active:opacity-50"
                           onClick={() => navigator.clipboard.writeText(selectedCustomer.phone)}
                        >
                          {selectedCustomer.phone}
                          <Copy size={16} className="text-slate-400" />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <a href={`sms:${selectedCustomer.phone}`} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 border border-slate-100"><MessageSquare size={18} /></a>
                        <a href="#" onClick={(e) => handlePhoneCall(e, selectedCustomer.phone)} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 border border-slate-100"><Phone size={18} /></a>
                      </div>
                    </div>
                    
                    {/* Phone 2 */}
                    {selectedCustomer.phone2 && (
                      <div className="flex justify-between items-center border-b border-slate-50 pb-4">
                        <div>
                          <div className="text-[13px] text-slate-500 mb-1">Số điện thoại 2</div>
                          <div 
                             className="text-base font-bold text-slate-900 flex items-center gap-2 active:opacity-50"
                             onClick={() => navigator.clipboard.writeText(selectedCustomer.phone2!)}
                          >
                            {selectedCustomer.phone2}
                            <Copy size={16} className="text-slate-400" />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <a href={`sms:${selectedCustomer.phone2}`} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 border border-slate-100"><MessageSquare size={18} /></a>
                          <a href="#" onClick={(e) => handlePhoneCall(e, selectedCustomer.phone2)} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 border border-slate-100"><Phone size={18} /></a>
                        </div>
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="grid grid-cols-2 gap-4 pb-2">
                      <div>
                        <div className="text-[13px] text-slate-500 mb-1">Mã khách hàng</div>
                        <div className="text-sm font-bold text-slate-900">{selectedCustomer.id}</div>
                      </div>
                      <div>
                        <div className="text-[13px] text-slate-500 mb-1">Chi nhánh</div>
                        <div className="text-sm font-bold text-slate-900">{selectedCustomer.createdBy || 'Hệ thống'}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stats Links */}
                {(() => {
                  const stats = getCustomerStats(selectedCustomer);
                  return (
                    <div className="bg-white m-3 rounded-2xl shadow-sm border border-slate-100 overflow-hidden text-[15px]">
                      <button onClick={() => setActiveDetailTab('history')} className="w-full flex justify-between items-center p-4 border-b border-slate-50">
                        <span className="text-slate-800">Lịch sử giao dịch</span>
                        <div className="flex items-center gap-2 text-slate-500">
                          <span className="font-bold text-slate-900">{formatNumber(stats.total)}</span>
                          <ChevronRight size={18} />
                        </div>
                      </button>
                      <button onClick={() => setActiveDetailTab('camera_installations')} className="w-full flex justify-between items-center p-4 border-b border-slate-50">
                        <span className="text-slate-800">Lắp đặt Camera</span>
                        <div className="flex items-center gap-2 text-slate-500">
                          <span className="font-bold text-slate-900">Xem ngay</span>
                          <ChevronRight size={18} />
                        </div>
                      </button>
                      <button onClick={() => {
                        if (stats.debt > 0) {
                          handleOpenPaymentModal('ALL', null, stats.debt);
                        }
                      }} className="w-full flex justify-between items-center p-4 border-b border-slate-50">
                        <span className="text-slate-800">Công nợ</span>
                        <div className="flex items-center gap-2 text-slate-500">
                          <span className={`font-bold ${stats.debt > 0 ? 'text-red-500' : 'text-slate-900'}`}>{formatNumber(stats.debt)}</span>
                          <ChevronRight size={18} />
                        </div>
                      </button>
                      <button className="w-full flex justify-between items-center p-4 disabled">
                        <span className="text-slate-800">Tổng đơn</span>
                        <div className="flex items-center gap-2 text-slate-500">
                          <span className="font-bold text-slate-900">{stats.count}</span>
                          <ChevronRight size={18} />
                        </div>
                      </button>
                    </div>
                  );
                })()}

                {/* 1. Address block */}
                <div className="bg-white mx-3 mb-3 rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="p-4 border-b border-slate-50 font-bold text-blue-600 text-[15px]">
                    Địa chỉ
                  </div>
                  <div className="p-4">
                    <p className="text-[14px] text-slate-800 mb-3">{selectedCustomer.address || 'Chưa cập nhật'}</p>
                    {selectedCustomer.location && (
                      <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-100 h-[140px]">
                        <iframe
                          title="Customer Location Mobile"
                          width="100%"
                          height="100%"
                          frameBorder="0"
                          scrolling="no"
                          src={`https://maps.google.com/maps?q=${encodeURIComponent(selectedCustomer.location)}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Mobile Extra Blocks (Always Rendered with Add Button) */}
                
                {/* 2. Image Library Block */}
                <div className="bg-white mx-3 mb-3 rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="p-4 border-b border-slate-50 flex items-center justify-between">
                    <span className="font-bold text-blue-600 text-[15px] flex items-center gap-2">
                      <ImageIcon size={18} /> Hình ảnh
                    </span>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => captureInputRef.current?.click()}
                        className="text-[11px] font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1"
                      >
                        <CameraIcon size={14} /> Chụp
                      </button>
                      <button 
                        onClick={() => setIsLibraryOpen(true)}
                        className="text-[11px] font-bold text-purple-600 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1"
                      >
                        Kho ảnh
                      </button>
                    </div>
                  </div>
                  <div className="p-4">
                    {/* Main Image Preview */}
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-100 border border-slate-200 mb-3 group">
                      {selectedCustomer.image ? (
                        <>
                          <img 
                            src={selectedCustomer.image} 
                            alt="Main Customer" 
                            className="w-full h-full object-cover cursor-pointer"
                            onClick={() => setViewImage(selectedCustomer.image!)}
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <button 
                              onClick={() => setViewImage(selectedCustomer.image!)}
                              className="w-10 h-10 bg-white/90 backdrop-blur-sm text-slate-800 rounded-full flex items-center justify-center shadow-lg"
                            >
                              <ZoomIn size={20} />
                            </button>
                            <button 
                              onClick={() => setIsLibraryOpen(true)}
                              className="w-10 h-10 bg-white/90 backdrop-blur-sm text-blue-600 rounded-full flex items-center justify-center shadow-lg"
                            >
                              <Edit3 size={20} />
                            </button>
                          </div>
                        </>
                      ) : (
                        <div 
                          className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors"
                          onClick={() => setIsLibraryOpen(true)}
                        >
                          <ImageIcon size={40} className="opacity-20" />
                          <span className="text-xs font-bold uppercase tracking-widest">Chưa có hình ảnh</span>
                        </div>
                      )}
                    </div>

                    {/* Quick Related Images Gallery */}
                    {(() => {
                      const relatedImages = images.filter(img => 
                        img.category === 'KhachHang' && 
                        (img.name.toLowerCase().includes(selectedCustomer.name.toLowerCase()) || 
                         img.name.includes(selectedCustomer.phone))
                      ).slice(0, 4);

                      if (relatedImages.length > 0) {
                        return (
                          <div className="grid grid-cols-4 gap-2">
                            {relatedImages.map(img => (
                              <div 
                                key={img.id}
                                className="aspect-square rounded-lg overflow-hidden border border-slate-200 cursor-pointer active:scale-95 transition-transform"
                                onClick={() => setViewImage(img.url)}
                              >
                                <img src={img.url} alt="" className="w-full h-full object-cover" />
                              </div>
                            ))}
                            {relatedImages.length >= 4 && (
                              <div 
                                onClick={() => setIsLibraryOpen(true)}
                                className="aspect-square rounded-lg bg-slate-50 border border-slate-200 flex flex-col items-center justify-center text-slate-400 cursor-pointer"
                              >
                                <Plus size={16} />
                                <span className="text-[10px] font-bold">Thêm</span>
                              </div>
                            )}
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>

                {/* 3. Wifi Block */}
                {(() => {
                   const customerWifi = wifiRecords.filter(r => 
                     (r.customerId && r.customerId === selectedCustomer?.id) ||
                     (!r.customerId && (
                       r.customerPhone === selectedCustomer?.phone ||
                       (selectedCustomer?.phone2 && r.customerPhone === selectedCustomer?.phone2)
                     ))
                   );
                   return (
                     <div className="bg-white mx-3 mb-3 rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                       <div className="p-4 border-b border-slate-50 flex items-center justify-between">
                         <span className="font-bold text-blue-600 text-[15px] flex items-center gap-2">
                           Wifi
                           {customerWifi.length > 0 && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{customerWifi.length}</span>}
                         </span>
                         <button 
                           onClick={() => setAddModalType('WIFI')}
                           className="text-[11px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1 shadow-sm"
                         >
                           <Plus size={14} /> Thêm Wifi
                         </button>
                       </div>
                       <div className="p-4 space-y-3">
                         {customerWifi.length === 0 ? (
                           <div className="text-center py-4 bg-slate-50 rounded-xl border border-slate-100">
                             <p className="text-slate-400 text-[13px] font-medium">Chưa có thông tin Wifi</p>
                           </div>
                         ) : customerWifi.map(wifi => (
                           <div key={wifi.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                             <div className="flex justify-between items-center mb-2">
                               <span className="font-bold text-slate-800 text-[14px]">{wifi.wifiName}</span>
                               <span className="text-[11px] text-slate-500">{formatDateTime(wifi.createdAt)}</span>
                             </div>
                             <div className="flex items-center gap-2 p-2 bg-white rounded border border-slate-200">
                               <Key size={14} className="text-blue-500" />
                                <span className="font-mono text-xs font-bold text-slate-700">W: {wifi.wifiName}</span>
                             </div>
                           </div>
                         ))}
                       </div>
                     </div>
                   );
                })()}

                {/* 4. Camera Block */}
                {(() => {
                   const customerCameras = cameraAccounts.filter(r => 
                     (r.customerId && r.customerId === selectedCustomer?.id) ||
                     (!r.customerId && (
                       r.customerPhone === selectedCustomer?.phone ||
                       (selectedCustomer?.phone2 && r.customerPhone === selectedCustomer?.phone2)
                     ))
                   );
                   return (
                     <div className="bg-white mx-3 mb-3 rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                       <div className="p-4 border-b border-slate-50 flex items-center justify-between">
                         <span className="font-bold text-blue-600 text-[15px] flex items-center gap-2">
                           Tài khoản Camera
                           {customerCameras.length > 0 && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{customerCameras.length}</span>}
                         </span>
                         <button 
                           onClick={() => setAddModalType('CAMERA')}
                           className="text-[11px] font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1 shadow-sm"
                         >
                           <Plus size={14} /> T.Khoản
                         </button>
                       </div>
                       <div className="p-4 space-y-3">
                         {customerCameras.length === 0 ? (
                           <div className="text-center py-4 bg-slate-50 rounded-xl border border-slate-100">
                             <p className="text-slate-400 text-[13px] font-medium">Chưa có tài khoản Camera</p>
                           </div>
                         ) : customerCameras.map(cam => (
                           <div key={cam.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                             <div className="flex justify-between items-center mb-2">
                               <span className="font-bold text-slate-800 text-[14px]">{cam.accountName}</span>
                               <span className="text-[11px] text-slate-500">{formatDateTime(cam.createdAt)}</span>
                             </div>
                             <div className="flex items-center gap-2 p-2 bg-white rounded border border-slate-200">
                               <Lock size={14} className="text-blue-500" />
                                <span className="font-mono text-xs font-bold text-slate-700">A: {cam.accountName}</span>
                             </div>
                           </div>
                         ))}
                       </div>
                     </div>
                   );
                })()}

                {/* 4.5. Camera Installation Block */}
                {(() => {
                   const customerInstallations = cameraInstallations.filter(r => 
                     (r.customerId && r.customerId === selectedCustomer?.id) ||
                     (!r.customerId && (
                       r.customerPhone === selectedCustomer?.phone || 
                       (selectedCustomer?.phone2 && r.customerPhone === selectedCustomer?.phone2)
                     ))
                   ).sort((a, b) => parseDateString(b.installationDate) - parseDateString(a.installationDate));
                   return (
                     <div className="bg-white mx-3 mb-3 rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                       <div className="p-4 border-b border-slate-50 flex items-center justify-between">
                         <span className="font-bold text-blue-600 text-[15px] flex items-center gap-2">
                           Lắp đặt Camera
                           {customerInstallations.length > 0 && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{customerInstallations.length}</span>}
                         </span>
                         <button 
                           onClick={() => setAddModalType('CAMERA_INSTALL')}
                           className="text-[11px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1 shadow-sm"
                         >
                           <Plus size={14} /> Thêm Lắp
                         </button>
                       </div>
                       <div className="p-4 space-y-3">
                         {customerInstallations.length === 0 ? (
                           <div className="text-center py-4 bg-slate-50 rounded-xl border border-slate-100">
                             <p className="text-slate-400 text-[13px] font-medium">Chưa có lịch sử lắp camera</p>
                           </div>
                         ) : customerInstallations.map(inst => (
                           <div key={inst.id} onClick={() => setSelectedCameraInstall(inst)} className="p-3 bg-slate-50 rounded-lg border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors">
                             <div className="flex justify-between items-center mb-1">
                               <span className="font-normal text-slate-800 text-[12px]">{inst.installationType}</span>
                               <span className="text-[10px] text-slate-500">{inst.installationDate}</span>
                             </div>
                             <div className="text-[11px] text-slate-600 mb-2">{inst.details || inst.note || '---'}</div>
                             <div className="flex flex-wrap gap-2">
                               {inst.wifiName && (
                                 <span className="text-[9px] bg-white border border-slate-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                                    <Wifi size={10} /> {inst.wifiName}
                                 </span>
                               )}
                               {inst.accountName && (
                                 <span className="text-[9px] bg-white border border-slate-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                                    <CameraIcon size={10} /> {inst.accountName}
                                 </span>
                               )}
                             </div>
                           </div>
                         ))}
                       </div>
                     </div>
                   );
                })()}

                {/* 5. Maintenance Block */}
                {(() => {
                   const customerMaintenances = maintenanceRecords.filter(m => 
                     (m.customerId && m.customerId === selectedCustomer?.id) ||
                     (!m.customerId && (
                       m.customerPhone === selectedCustomer?.phone || 
                       (selectedCustomer?.phone2 && m.customerPhone === selectedCustomer?.phone2)
                     ))
                   ).sort((a, b) => parseDateString(b.date) - parseDateString(a.date));
                   
                   return (
                     <div className="bg-white mx-3 mb-3 rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                       <div className="p-4 border-b border-slate-50 flex items-center justify-between">
                         <span className="font-normal text-blue-600 text-[15px] flex items-center gap-2">
                           Bảo hành
                           {customerMaintenances.length > 0 && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{customerMaintenances.length}</span>}
                         </span>
                         <button 
                           onClick={() => setAddModalType('MAINTENANCE')}
                           className="text-[11px] font-normal text-pink-600 bg-pink-50 hover:bg-pink-100 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1 shadow-sm"
                         >
                           <Plus size={14} /> Tiếp nhận
                         </button>
                       </div>
                       <div className="p-4 space-y-3">
                         {customerMaintenances.length === 0 ? (
                           <div className="text-center py-4 bg-slate-50 rounded-xl border border-slate-100">
                             <p className="text-slate-400 text-[13px] font-normal">Chưa có phiếu bảo hành/sửa chữa</p>
                           </div>
                         ) : customerMaintenances.map(record => (
                           <div key={record.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                             <div className="flex justify-between items-center mb-1">
                               <span className="font-normal text-slate-800 text-[13px]">{record.productName}</span>
                               <span className="text-[11px] text-slate-500">{record.date}</span>
                             </div>
                             <div className="flex justify-between items-center">
                               <span className="text-xs text-slate-500">#{record.id} • {record.status}</span>
                               <span className="text-sm font-normal text-red-500">{formatNumber(record.cost)}đ</span>
                             </div>
                           </div>
                         ))}
                       </div>
                     </div>
                   );
                })()}

                {/* 6. Tasks Block */}
                {(() => {
                   const customerTasks = tasks.filter(t => t.customerId === selectedCustomer?.id).sort((a, b) => parseDateString(b.createdAt) - parseDateString(a.createdAt));
                   
                   return (
                     <div className="bg-white mx-3 mb-6 rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                       <div className="p-4 border-b border-slate-50 flex items-center justify-between">
                         <span className="font-normal text-blue-600 text-[15px] flex items-center gap-2">
                           Công việc
                           {customerTasks.length > 0 && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{customerTasks.length}</span>}
                         </span>
                         <button 
                           onClick={() => setAddModalType('TASK')}
                           className="text-[11px] font-normal text-[#1890ff] bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1 shadow-sm"
                         >
                           <Plus size={14} /> Tạo việc
                         </button>
                       </div>
                       <div className="p-4 space-y-3">
                         {customerTasks.length === 0 ? (
                           <div className="text-center py-4 bg-slate-50 rounded-xl border border-slate-100">
                             <p className="text-slate-400 text-[13px] font-normal">Chưa có công việc nào</p>
                           </div>
                         ) : customerTasks.map(task => (
                           <div key={task.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                             <div className="flex justify-between items-center mb-1">
                               <span className={`font-normal text-[13px] ${task.status !== 'COMPLETED' ? 'text-red-600' : 'text-slate-800'}`}>{task.title}</span>
                             </div>
                             <div className="flex justify-between items-center gap-2 flex-wrap mt-2">
                               <span className="flex items-center gap-1 text-[11px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                                  {task.status} • {task.priority}
                               </span>
                               {task.dueDate && <span className="text-[11px] font-normal text-red-400 whitespace-nowrap">{formatDateTime(task.dueDate)}</span>}
                             </div>
                           </div>
                         ))}
                       </div>
                     </div>
                   );
                })()}

              </div>
              </>
              ) : null}
            </div>

            {/* --- DESKTOP VIEW --- */}
            <div className="hidden md:flex flex-col h-full bg-white relative">
              <div className="bg-[#1890ff] px-6 py-4 flex justify-between items-center shrink-0 text-white">
                <h3 className="text-[16px] font-medium tracking-wide">Chi tiết khách hàng</h3>
                <button onClick={() => setSelectedCustomer(null)} className="text-white hover:text-blue-100 transition-colors items-center justify-center">
                  <X size={20} />
                </button>
              </div>

            {/* Tabs Navigation */}
            <div className="bg-white border-b border-slate-200 flex items-center px-2 overflow-x-auto no-scrollbar shrink-0">
              <button 
                onClick={() => setActiveDetailTab('info')}
                className={`py-3.5 px-6 text-[14px] flex items-center justify-center transition-all whitespace-nowrap relative ${activeDetailTab === 'info' ? 'text-[#1890ff] font-medium' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Thông tin
                {activeDetailTab === 'info' && <span className="absolute bottom-0 left-0 right-0 border-b-2 border-[#1890ff]"></span>}
              </button>
              <button 
                onClick={() => setActiveDetailTab('history')}
                className={`py-3.5 px-6 text-[14px] flex items-center justify-center transition-all whitespace-nowrap relative ${activeDetailTab === 'history' ? 'text-[#1890ff] font-medium' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Lịch sử bán/trả hàng
                {activeDetailTab === 'history' && <span className="absolute bottom-0 left-0 right-0 border-b-2 border-[#1890ff]"></span>}
              </button>
              <button 
                onClick={() => setActiveDetailTab('camera_installations')}
                className={`py-3.5 px-6 text-[14px] flex items-center justify-center transition-all whitespace-nowrap relative ${activeDetailTab === 'camera_installations' ? 'text-[#1890ff] font-medium' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Lắp đặt Camera
                {activeDetailTab === 'camera_installations' && <span className="absolute bottom-0 left-0 right-0 border-b-2 border-[#1890ff]"></span>}
              </button>
              <button 
                onClick={() => setActiveDetailTab('warranty')}
                className={`py-3.5 px-6 text-[14px] flex items-center justify-center transition-all whitespace-nowrap relative ${activeDetailTab === 'warranty' ? 'text-[#1890ff] font-medium' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Bảo hành
                {activeDetailTab === 'warranty' && <span className="absolute bottom-0 left-0 right-0 border-b-2 border-[#1890ff]"></span>}
              </button>
              <button 
                onClick={() => setActiveDetailTab('tasks')}
                className={`py-3.5 px-6 text-[14px] flex items-center justify-center transition-all whitespace-nowrap relative ${activeDetailTab === 'tasks' ? 'text-[#1890ff] font-medium' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Công việc
                {activeDetailTab === 'tasks' && <span className="absolute bottom-0 left-0 right-0 border-b-2 border-[#1890ff]"></span>}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-50">
              {(() => {
                const stats = getCustomerStats(selectedCustomer);
                const customerTasks = tasks.filter(t => t.customerId === selectedCustomer?.id).sort((a, b) => parseDateString(b.createdAt) - parseDateString(a.createdAt));
                const customerWifi = wifiRecords.filter(r => 
                  (r.customerId && r.customerId === selectedCustomer?.id) ||
                  (!r.customerId && (
                    r.customerPhone === selectedCustomer?.phone ||
                    (selectedCustomer?.phone2 && r.customerPhone === selectedCustomer?.phone2)
                  ))
                );
                const customerCameras = cameraAccounts.filter(r => 
                  (r.customerId && r.customerId === selectedCustomer?.id) ||
                  (!r.customerId && (
                    r.customerPhone === selectedCustomer?.phone ||
                    (selectedCustomer?.phone2 && r.customerPhone === selectedCustomer?.phone2)
                  ))
                );
                const customerMaintenances = maintenanceRecords.filter(m => 
                  (m.customerId && m.customerId === selectedCustomer?.id) ||
                  (!m.customerId && (
                    m.customerPhone === selectedCustomer?.phone || 
                    (selectedCustomer?.phone2 && m.customerPhone === selectedCustomer?.phone2)
                  ))
                ).sort((a, b) => parseDateString(b.date) - parseDateString(a.date));

                const getTaskStatusStyle = (status: string) => {
                  switch (status) {
                    case 'TODO':
                    case 'OPEN': return 'bg-slate-50 text-slate-600 border-slate-200';
                    case 'ACCEPTED':
                    case 'IN_PROGRESS': return 'bg-blue-50 text-blue-600 border-blue-200';
                    case 'COMPLETED': return 'bg-emerald-50 text-emerald-600 border-emerald-200';
                    case 'CANCELLED': return 'bg-rose-50 text-rose-600 border-rose-200';
                    default: return 'bg-slate-50 text-slate-600 border-slate-200';
                  }
                };

                const getTaskStatusText = (status: string) => {
                  switch (status) {
                    case 'TODO':
                    case 'OPEN': return 'MỚI TẠO';
                    case 'ACCEPTED': return 'ĐÃ NHẬN';
                    case 'IN_PROGRESS': return 'ĐANG XỬ LÝ';
                    case 'COMPLETED': return 'HOÀN THÀNH';
                    case 'CANCELLED': return 'ĐÃ HỦY';
                    default: return status;
                  }
                };

                const getPriorityStyle = (priority: string) => {
                  switch (priority) {
                    case 'LOW': return 'text-slate-500 bg-slate-100';
                    case 'MEDIUM': return 'text-blue-600 bg-blue-100';
                    case 'HIGH': return 'text-orange-600 bg-orange-100';
                    case 'CRITICAL': return 'text-rose-600 bg-rose-100';
                    default: return 'text-slate-500 bg-slate-100';
                  }
                };

                const getPriorityText = (priority: string) => {
                  switch (priority) {
                    case 'LOW': return 'Thấp';
                    case 'MEDIUM': return 'TB';
                    case 'HIGH': return 'Cao';
                    case 'CRITICAL': return 'Khẩn cấp';
                    default: return priority;
                  }
                };

                const getWarrantyStatusStyle = (status: string) => {
                  switch (status) {
                    case 'RECEIVING': return 'bg-blue-50 text-blue-600 border-blue-100';
                    case 'REPAIRING': return 'bg-orange-50 text-orange-600 border-orange-100';
                    case 'COMPLETED': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
                    case 'RETURNED': return 'bg-slate-50 text-slate-600 border-slate-100';
                    default: return 'bg-slate-50 text-slate-600 border-slate-100';
                  }
                };

                const getWarrantyStatusText = (status: string) => {
                  switch (status) {
                    case 'RECEIVING': return 'MỚI TIẾP NHẬN';
                    case 'REPAIRING': return 'ĐANG XỬ LÝ';
                    case 'COMPLETED': return 'ĐÃ XỬ LÝ XONG';
                    case 'RETURNED': return 'ĐÃ TRẢ KHÁCH';
                    default: return status;
                  }
                };

                const tasksContent = (
                  <div className="animate-in fade-in slide-in-from-right-2 duration-300 w-full">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-xs font-normal text-slate-400 uppercase tracking-[0.2em]">Công việc ({customerTasks.length})</h4>
                    </div>
                    <div className="space-y-3">
                      {customerTasks.length === 0 ? (
                        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
                          <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-300">
                            <ClipboardList size={24} />
                          </div>
                          <p className="text-slate-400 italic text-sm font-medium">Khách hàng chưa có công việc nào.</p>
                        </div>
                      ) : (
                        customerTasks.map(task => (
                          <div 
                            key={task.id} 
                            className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-blue-300 transition-all group/task block"
                          >
                            <div className="flex flex-col md:flex-row justify-between gap-4">
                              <div className="flex gap-4">
                                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover/task:bg-blue-50 group-hover/task:text-blue-500 transition-all shrink-0">
                                  <ClipboardList size={20} />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] font-normal bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded italic">#{task.id}</span>
                                    <span className={`text-[9px] font-normal px-2 py-0.5 rounded-full border ${getTaskStatusStyle(task.status)} tracking-widest`}>
                                      {getTaskStatusText(task.status)}
                                    </span>
                                    <span className={`text-[9px] font-normal px-2 py-0.5 rounded-full ${getPriorityStyle(task.priority)} tracking-widest`}>
                                      {getPriorityText(task.priority)}
                                    </span>
                                  </div>
                                  <p className={`font-bold text-sm mb-1 ${task.status !== 'COMPLETED' ? 'text-red-600' : 'text-slate-800'}`}>{task.title}</p>
                                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                                      <Calendar size={12} />
                                      {formatDateTime(task.createdAt)}
                                    </div>
                                    {task.assignedTo && (
                                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                                        <User size={12} />
                                        {task.assignedTo}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex flex-col justify-between md:items-end gap-2 shrink-0 md:pl-4 md:border-l border-slate-50">
                                {task.description && (
                                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 w-full md:w-[250px] md:max-w-xs">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 italic">Chi tiết:</p>
                                    <p className="text-xs text-slate-700 font-medium leading-relaxed truncate whitespace-break-spaces">{task.description}</p>
                                  </div>
                                )}
                                <div className="flex items-center justify-between md:justify-end gap-4 mt-auto w-full text-right">
                                   {task.dueDate && (
                                     <div>
                                       <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1 italic">Hạn chót</p>
                                       <p className={`text-xs font-normal ${new Date(task.dueDate) < new Date() && task.status !== 'COMPLETED' ? 'text-rose-600' : 'text-slate-600'}`}>
                                          {formatDateTime(task.dueDate)}
                                       </p>
                                     </div>
                                   )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );

                const warrantyContent = (
                  <div className="animate-in fade-in slide-in-from-right-2 duration-300 w-full">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-xs font-normal text-slate-400 uppercase tracking-[0.2em]">Lịch sử bảo hành ({customerMaintenances.length})</h4>
                    </div>
                    <div className="space-y-3">
                      {customerMaintenances.length === 0 ? (
                        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
                          <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-300">
                            <Wrench size={24} />
                          </div>
                          <p className="text-slate-400 italic text-sm font-medium">Khách hàng chưa có phiếu bảo hành nào.</p>
                        </div>
                      ) : (
                        customerMaintenances.map(record => (
                          <div 
                            key={record.id} 
                            className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-blue-300 transition-all group/warranty"
                          >
                            <div className="flex flex-col md:flex-row justify-between gap-4">
                              <div className="flex gap-4">
                                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover/warranty:bg-blue-50 group-hover/warranty:text-blue-500 transition-all shrink-0">
                                  <Wrench size={20} />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] font-normal bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded italic">#{record.id}</span>
                                    <span className={`text-[9px] font-normal px-2 py-0.5 rounded-full border ${getWarrantyStatusStyle(record.status)} tracking-widest`}>
                                      {getWarrantyStatusText(record.status)}
                                    </span>
                                  </div>
                                  <p className="font-bold text-sm text-slate-800 mb-1">{record.productName}</p>
                                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                                      <Calendar size={12} />
                                      {record.date}
                                    </div>
                                    {record.serialNumber && (
                                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono font-bold">
                                        <Hash size={12} />
                                        SN: {record.serialNumber}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex flex-col justify-between md:items-end gap-2 shrink-0 md:pl-4 md:border-l border-slate-50">
                                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 italic">Tình trạng lỗi:</p>
                                  <p className="text-xs text-slate-700 font-bold leading-relaxed">{record.issue}</p>
                                </div>
                                <div className="flex items-center justify-between md:justify-end gap-4 mt-auto">
                                  <div className="text-right">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1 italic">Chi phí</p>
                                    <p className="text-xs font-normal text-rose-600">{formatNumber(record.cost)}đ</p>
                                  </div>
                                  {record.transferId && (
                                    <div className="flex items-center gap-1 text-[9px] font-normal text-blue-600 bg-blue-50 px-2 py-1 rounded-full uppercase italic tracking-tighter">
                                      <Send size={10} /> Đã gửi tuyến
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            {record.note && (
                              <div className="mt-3 pt-3 border-t border-slate-50 flex items-start gap-2">
                                <div className="text-[10px] font-bold text-slate-400 uppercase shrink-0 mt-0.5">Ghi chú:</div>
                                <p className="text-[11px] text-slate-500 italic leading-relaxed">{record.note}</p>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
                
                if (activeDetailTab === 'info') {
                  const createdDate = selectedCustomer.createdAt ? formatDateTime(selectedCustomer.createdAt) : 'Chưa có';
                  return (
                    <div className="animate-in fade-in bg-white h-full overflow-y-auto p-6 flex flex-col custom-scrollbar">
                      {/* Header Info */}
                      <div className="flex justify-between items-start mb-8 relative">
                        <div className="flex gap-6 items-center">
                          <div className="w-24 h-24 bg-[#e6f4ff] text-[#1890ff] rounded-full flex items-center justify-center shrink-0 border border-blue-50">
                            <User size={48} strokeWidth={1.5} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <h2 className="text-xl font-normal text-slate-800">{selectedCustomer.name}</h2>
                              <span className="text-[13px] font-medium text-slate-500 uppercase tracking-wide">{selectedCustomer.id || '---'}</span>
                            </div>
                            <div className="flex items-center text-[13px] text-slate-600 divide-x divide-slate-300">
                              <span className="pr-3">Người tạo:  <span className="font-semibold text-slate-800">{selectedCustomer.createdBy || 'Hệ thống'}</span></span>
                              <span className="px-3">Ngày tạo:  <span className="font-semibold text-slate-800">{createdDate}</span></span>
                              <span className="pl-3">Tổng nợ:  <span className="font-semibold text-red-600">{formatNumber(stats.debt)}</span></span>
                            </div>
                          </div>
                        </div>
                        <div className="text-[14px] text-slate-600">
                          Vinba
                        </div>
                      </div>

                      {/* Grid Info */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6 mb-8">
                        <div className="border-b border-slate-100 pb-2">
                          <p className="text-[13px] text-slate-600 mb-1">Điện thoại</p>
                          <p className="text-[15px] text-slate-800 font-medium">{selectedCustomer.phone}</p>
                        </div>
                        <div className="border-b border-slate-100 pb-2">
                          <p className="text-[13px] text-slate-600 mb-1">Sinh nhật</p>
                          <p className="text-[15px] text-slate-400 font-medium">Chưa có</p>
                        </div>
                        <div className="border-b border-slate-100 pb-2">
                          <p className="text-[13px] text-slate-600 mb-1">Giới tính</p>
                          <p className="text-[15px] text-slate-400 font-medium">Chưa có</p>
                        </div>
                        <div className="border-b border-slate-100 pb-2">
                          <p className="text-[13px] text-slate-600 mb-1">Tổng đơn</p>
                          <p className="text-[15px] text-slate-800 font-medium">{formatNumber(stats.count)}</p>
                        </div>
                        <div className="border-b border-slate-100 pb-2">
                          <p className="text-[13px] text-slate-600 mb-1">Tổng chi tiêu</p>
                          <p className="text-[15px] text-slate-800 font-medium">{formatNumber(stats.total)}</p>
                        </div>
                        <div className="border-b border-slate-100 pb-2">
                          <p className="text-[13px] text-slate-600 mb-1">Địa chỉ</p>
                          <p className="text-[15px] text-slate-800 font-medium">{selectedCustomer.address || <span className="text-slate-400">Chưa có</span>}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-3 gap-6 mb-6">
                        {/* Map Box */}
                        <div className="bg-[#fafafa] border border-slate-200 rounded-lg p-4 flex flex-col h-[220px]">
                          <h3 className="text-[14px] font-normal text-slate-800 mb-3 flex items-center gap-2">
                            <MapPin size={16} className="text-red-500" /> Vị trí (Map)
                          </h3>
                          <div className="flex-1 min-h-0 relative rounded border border-slate-200 overflow-hidden bg-slate-100">
                            {selectedCustomer.location ? (
                              <>
                                <iframe
                                  title="Customer Location"
                                  width="100%"
                                  height="100%"
                                  frameBorder="0"
                                  scrolling="no"
                                  src={`https://maps.google.com/maps?q=${encodeURIComponent(selectedCustomer.location)}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                                  className="grayscale hover:grayscale-0 transition-all duration-1000"
                                />
                                <div className="absolute bottom-2 right-2 flex items-center gap-2">
                                  <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(selectedCustomer.location)}`} target="_blank" rel="no-referrer" className="px-2 py-1 bg-blue-500 shadow-md rounded text-[10px] font-medium text-white hover:bg-blue-600 transition-colors flex items-center gap-1">
                                    <MapPin size={12} className="text-white" /> Chỉ đường
                                  </a>
                                  <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedCustomer.location)}`} target="_blank" rel="no-referrer" className="px-2 py-1 bg-white shadow-md rounded text-[10px] font-medium text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-1">
                                    <Navigation size={12} className="text-blue-500" /> Mở Map
                                  </a>
                                </div>
                              </>
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[13px] text-slate-400 italic">
                                Chưa có vị trí
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Image Box */}
                        <div className="bg-[#fafafa] border border-slate-200 rounded-lg p-4 flex flex-col h-[220px]">
                          <div className="flex justify-between items-center mb-3">
                            <h3 className="text-[14px] font-normal text-slate-800 flex items-center gap-2">
                              <ImageIcon size={16} className="text-indigo-500" /> Hình ảnh
                            </h3>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => captureInputRef.current?.click()}
                                title="Chụp ảnh bằng Camera (cho điện thoại / iPad / Tablet)"
                                className="text-[10px] font-bold text-emerald-600 bg-white border border-emerald-200 hover:bg-emerald-50 px-2 py-1 rounded transition-colors flex items-center gap-1 shadow-sm"
                              >
                                <CameraIcon size={12} /> Chụp
                              </button>
                              <button 
                                onClick={() => setIsLibraryOpen(true)}
                                className="text-[10px] font-bold text-purple-600 bg-white border border-purple-200 hover:bg-purple-50 px-2 py-1 rounded transition-colors flex items-center gap-1 shadow-sm"
                              >
                                <ImageIcon size={12} /> Kho ảnh
                              </button>
                            </div>
                          </div>
                          <div className="flex-1 min-h-0 relative rounded border border-slate-200 overflow-hidden bg-slate-100 group">
                            {selectedCustomer.image ? (
                              <img 
                                src={selectedCustomer.image} 
                                alt="Customer Site" 
                                className="w-full h-full object-cover cursor-pointer"
                                onClick={() => setViewImage(selectedCustomer.image)}
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[13px] text-slate-400 italic">
                                Chưa có hình ảnh
                              </div>
                            )}
                          </div>
                        </div>

                         {/* Wifi Info Box */}
                        <div className="bg-[#fafafa] border border-slate-200 rounded-lg p-4 flex flex-col h-[220px]">
                          <div className="flex items-center justify-between mb-3 border-b border-slate-200/60 pb-2">
                            <h3 className="text-[14px] font-normal text-slate-800 flex items-center gap-2">
                              <Wifi size={16} className="text-blue-500" /> Thông tin Wifi
                            </h3>
                            <button onClick={() => setAddModalType('WIFI')} className="text-[11px] font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 flex items-center gap-1 px-2 py-1 rounded transition-colors shadow-sm">
                              <Plus size={12} /> Thêm
                            </button>
                          </div>
                          <div className="overflow-y-auto flex-1 custom-scrollbar pr-2 space-y-3">
                            {customerWifi.length === 0 ? (
                              <p className="text-[13px] text-slate-400 italic text-center mt-4">Chưa có thông tin</p>
                            ) : (
                              customerWifi.map(wifi => (
                                <div key={wifi.id} className="bg-white border text-[13px] border-slate-100 rounded p-2.5 shadow-sm">
                                  <div className="font-normal text-slate-700 mb-1">{wifi.wifiName}</div>
                                  <div className="text-slate-500 flex items-center gap-2"><Key size={12} /> {wifi.wifiName}</div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Account Info Box */}
                        <div className="bg-[#fafafa] border border-slate-200 rounded-lg p-4 flex flex-col h-[220px]">
                          <div className="flex items-center justify-between mb-3 border-b border-slate-200/60 pb-2">
                            <h3 className="text-[14px] font-normal text-slate-800 flex items-center gap-2">
                              <CameraIcon size={16} className="text-emerald-500" /> Tài khoản (Camera)
                            </h3>
                            <button onClick={() => setAddModalType('CAMERA')} className="text-[11px] font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 flex items-center gap-1 px-2 py-1 rounded transition-colors shadow-sm">
                              <Plus size={12} /> Thêm
                            </button>
                          </div>
                          <div className="overflow-y-auto flex-1 custom-scrollbar pr-2 space-y-3">
                            {customerCameras.length === 0 ? (
                              <p className="text-[13px] text-slate-400 italic text-center mt-4">Chưa có thông tin</p>
                            ) : (
                              customerCameras.map(cam => (
                                <div key={cam.id} className="bg-white border text-[13px] border-slate-100 rounded p-2.5 shadow-sm">
                                  <div className="font-normal text-slate-700 mb-1">{cam.accountName}</div>
                                  <div className="text-slate-500 flex items-center gap-2 text-[12px]">
                                    <ShieldCheck size={12}/> {cam.accountName} {cam.cameraBrand && `- ${cam.cameraBrand}`}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Camera Installation Box */}
                        <div className="bg-[#fafafa] border border-slate-200 rounded-lg p-4 flex flex-col h-[220px] lg:row-span-2 lg:h-auto">
                          <div className="flex items-center justify-between mb-3 border-b border-slate-200/60 pb-2">
                            <h3 className="text-[14px] font-normal text-slate-800 flex items-center gap-2">
                              <CameraIcon size={16} className="text-blue-500" /> Bản ghi Lắp Camera
                            </h3>
                            <button onClick={() => setAddModalType('CAMERA_INSTALL')} className="text-[11px] font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 flex items-center gap-1 px-2 py-1 rounded transition-colors shadow-sm">
                              <Plus size={12} /> Thêm
                            </button>
                          </div>
                          <div className="overflow-y-auto flex-1 custom-scrollbar pr-2 space-y-3">
                            {(() => {
                              const customerInstallations = cameraInstallations.filter(r => 
                                (r.customerId && r.customerId === selectedCustomer?.id) ||
                                (!r.customerId && (
                                  r.customerPhone === selectedCustomer?.phone || 
                                  (selectedCustomer?.phone2 && r.customerPhone === selectedCustomer?.phone2)
                                ))
                              ).sort((a, b) => parseDateString(b.installationDate) - parseDateString(a.installationDate));
                              return customerInstallations.length === 0 ? (
                                <p className="text-[13px] text-slate-400 italic text-center mt-4">Chưa có thông tin</p>
                              ) : (
                                customerInstallations.map(inst => {
                                  const formattedDate = inst.installationDate 
                                    ? formatDate(inst.installationDate) 
                                    : '---';
                                  return (
                                    <div key={inst.id} onClick={() => setSelectedCameraInstall(inst)} className="bg-white border text-[12px] border-slate-100 rounded p-2.5 shadow-sm cursor-pointer hover:bg-slate-50 hover:border-blue-200 transition-colors">
                                      <div className="flex justify-between items-center mb-1">
                                        <span className="font-normal text-slate-700">{inst.installationType}</span>
                                        <span className="text-[10px] text-slate-400">{formattedDate}</span>
                                      </div>
                                      {inst.productName && (
                                        <div className="text-blue-600 font-normal text-[11px] mb-1">Thiết bị: {inst.productName}</div>
                                      )}
                                      <div className="text-slate-500 line-clamp-1">{inst.details || inst.note || '---'}</div>
                                    </div>
                                  );
                                })
                              );
                            })()}
                          </div>
                        </div>

                        {/* Maintenance History */}
                        <div className="bg-[#fafafa] border border-slate-200 rounded-lg p-4 flex flex-col h-[220px] lg:row-span-2 lg:h-auto">
                          <div className="flex items-center justify-between mb-3 border-b border-slate-200/60 pb-2">
                            <h3 className="text-[14px] font-normal text-slate-800 flex items-center gap-2">
                              <Wrench size={16} className="text-pink-500" /> Sửa chữa / Bảo hành
                            </h3>
                            <button onClick={() => setAddModalType('MAINTENANCE')} className="text-[11px] font-medium text-pink-600 hover:text-pink-700 bg-pink-50 hover:bg-pink-100 flex items-center gap-1 px-2 py-1 rounded transition-colors shadow-sm">
                              <Plus size={12} /> Thêm
                            </button>
                          </div>
                          <div className="overflow-y-auto flex-1 custom-scrollbar pr-2 space-y-3">
                            {customerMaintenances.length === 0 ? (
                              <p className="text-[13px] text-slate-400 italic text-center mt-4">Chưa có lịch sử</p>
                            ) : (
                              customerMaintenances.map(m => (
                                <div key={m.id} className="bg-white border border-slate-100 rounded p-3 shadow-sm text-[13px]">
                                  <div className="flex justify-between items-start mb-1">
                                    <div className="font-normal text-slate-700">{m.productName}</div>
                                    <div className="text-[11px] bg-slate-100 px-2 py-0.5 rounded text-slate-600">{m.date}</div>
                                  </div>
                                  <div className="text-slate-500 mb-1 line-clamp-2">{m.issue}</div>
                                  <div className="flex justify-between items-center mt-2">
                                    <span className="text-pink-600 font-normal">{formatNumber(m.cost)}đ</span>
                                    <span className="text-[10px] uppercase text-slate-400 font-normal">{getWarrantyStatusText(m.status)}</span>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Tasks Box */}
                        <div className="bg-[#fafafa] border border-slate-200 rounded-lg p-4 flex flex-col h-[220px] lg:row-span-2 lg:h-auto">
                          <div className="flex items-center justify-between mb-3 border-b border-slate-200/60 pb-2">
                            <h3 className="text-[14px] font-normal text-slate-800 flex items-center gap-2">
                              <ClipboardList size={16} className="text-[#1890ff]" /> Việc cần làm
                            </h3>
                            <button onClick={() => setAddModalType('TASK')} className="text-[11px] font-medium text-[#1890ff] hover:text-blue-600 bg-blue-50 hover:bg-blue-100 flex items-center gap-1 px-2 py-1 rounded transition-colors shadow-sm">
                              <Plus size={12} /> Thêm
                            </button>
                          </div>
                          <div className="overflow-y-auto flex-1 custom-scrollbar pr-2 space-y-3">
                            {customerTasks.length === 0 ? (
                              <p className="text-[13px] text-slate-400 italic text-center mt-4">Không có công việc</p>
                            ) : (
                              customerTasks.map(t => (
                                <div key={t.id} className="bg-white border border-slate-100 rounded p-3 shadow-sm text-[13px]">
                                  <div className="flex justify-between items-start mb-1.5">
                                    <div className="font-normal text-slate-800 line-clamp-1 flex-1 pr-2">{t.title}</div>
                                    <div className={`text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap ${t.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{getTaskStatusText(t.status)}</div>
                                  </div>
                                  {t.dueDate && (
                                    <div className="text-slate-500 text-[11px] flex items-center gap-1.5 mt-1">
                                      <Calendar size={12} /> Hạn chót: {formatDateTime(t.dueDate)}
                                    </div>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Note */}
                      <div className="flex items-center gap-2 text-[14px] text-slate-700 mb-auto pb-6">
                        <Edit3 size={16} className="text-slate-500 shrink-0" />
                        <span className="whitespace-pre-wrap">{selectedCustomer.note || 'Chưa có ghi chú'}</span>
                      </div>

                      {/* Footer Buttons */}
                      <div className="border-t border-slate-200 pt-4 flex justify-between items-center mt-4 min-h-[50px] shrink-0">
                        <button 
                          className="flex items-center gap-1.5 text-[14px] font-medium text-slate-700 hover:text-red-500 px-3 py-1.5 rounded transition-colors"
                        >
                          <Trash2 size={16} /> Xóa
                        </button>
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => handleEdit(selectedCustomer)}
                            className="flex items-center gap-2 text-[14px] font-medium text-white bg-[#1890ff] hover:bg-blue-600 px-5 py-1.5 rounded-[4px] transition-colors shadow-sm"
                          >
                            <Edit3 size={15} /> Chỉnh sửa
                          </button>
                          <button 
                            className="flex items-center gap-2 text-[14px] font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 px-5 py-1.5 rounded-[4px] transition-colors shadow-sm"
                          >
                            <Lock size={15} className="text-slate-500" /> Ngừng hoạt động
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }

                if (activeDetailTab === 'history') {
                  return (
                    <div className="animate-in fade-in h-full flex flex-col bg-white">
                      <div className="py-3 px-5 flex justify-end bg-white shrink-0">
                        <select className="border border-slate-300 rounded-[4px] text-[13px] px-3 py-1.5 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:outline-none bg-white min-w-[200px] text-slate-700">
                          <option value="all">Tất cả giao dịch</option>
                          <option value="sales">Bán hàng</option>
                          <option value="returns">Trả hàng</option>
                        </select>
                      </div>
                      
                      <div className="overflow-x-auto overflow-y-auto flex-1 h-0 min-h-[300px]">
                        <table className="w-full text-left relative min-w-max">
                          <thead className="bg-[#f2f4f7] text-slate-800 text-[13px] font-normal sticky top-0 z-10 shadow-[0_1px_0_0_#e2e8f0]">
                            <tr>
                              <th className="px-5 py-3.5 font-normal w-40 bg-[#f4f5f7]">Mã phiếu</th>
                              <th className="px-5 py-3.5 font-normal w-48 bg-[#f4f5f7]">Thời gian</th>
                              <th className="px-5 py-3.5 font-normal bg-[#f4f5f7]">Loại</th>
                              <th className="px-5 py-3.5 text-right font-normal bg-[#f4f5f7] w-40">Giá trị</th>
                              <th className="px-5 py-3.5 text-right font-normal w-48 bg-[#f4f5f7]">Dư nợ khách hàng</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100/50">
                            {stats.invoices.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="py-8 text-center text-slate-500 text-[13px] italic bg-white">Không có dữ liệu</td>
                              </tr>
                            ) : (
                              stats.invoices.map(inv => (
                                <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors group bg-white">
                                  <td className="px-5 py-4 text-[#1890ff] cursor-pointer hover:underline text-[13px]" onClick={() => setSelectedInvoice(inv)}>
                                    {inv.id}
                                  </td>
                                  <td className="px-5 py-4 text-[13px] text-slate-700">{formatDateTime(inv.createdAt)}</td>
                                  <td className="px-5 py-4 text-[13px] text-slate-700">Bán hàng</td>
                                  <td className="px-5 py-4 text-[13px] text-right text-slate-700">{formatNumber(inv.total - (inv.discount || 0))}</td>
                                  <td className="px-5 py-4 text-[13px] text-right text-slate-700">{formatNumber(inv.debt)}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>

                      <div className="py-4 px-5 border-t border-slate-200 flex justify-between items-center bg-white shrink-0 shadow-[0_-1px_3px_rgba(0,0,0,0.02)]">
                        <div className="flex items-center gap-6 text-slate-600 font-normal text-[13px]">
                          <button className="flex items-center gap-2 hover:text-[#1890ff] transition-colors group text-slate-700">
                            <LogOut size={16} className="text-slate-500 group-hover:text-[#1890ff]" /> Xuất file công nợ
                          </button>
                          <button className="flex items-center gap-2 hover:text-[#1890ff] transition-colors group text-slate-700">
                            <FileUp size={16} className="text-slate-500 group-hover:text-[#1890ff]" /> Xuất file
                          </button>
                        </div>
                        
                        <div className="flex items-center gap-2.5">
                          <button 
                            onClick={() => handleOpenPaymentModal('ALL', null, stats.debt)}
                            className="px-4 py-1.5 bg-[#007aff] text-white rounded-[4px] font-normal text-[13px] flex items-center gap-1.5 hover:bg-[#005bb5] transition-colors shadow-sm cursor-pointer"
                          >
                            <span className="border-[1.5px] border-white/90 rounded-full w-[14px] h-[14px] flex items-center justify-center text-[9px] font-normal">$</span> Thanh toán
                          </button>
                          <button className="px-4 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-[4px] font-normal text-[13px] flex items-center gap-2 hover:bg-slate-50 hover:border-slate-400 transition-colors cursor-pointer">
                            <Edit3 size={14} className="text-slate-600" /> Điều chỉnh
                          </button>
                          <button className="px-4 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-[4px] font-normal text-[13px] flex items-center gap-2 hover:bg-slate-50 hover:border-slate-400 transition-colors cursor-pointer">
                            <Calculator size={14} className="text-slate-600" /> Chiết khấu thanh toán
                          </button>
                          <button className="px-4 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-[4px] font-normal text-[13px] flex items-center gap-2 hover:bg-slate-50 hover:border-slate-400 transition-colors cursor-pointer">
                            <QrCode size={14} className="text-slate-600" /> Tạo QR
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }

                if (activeDetailTab === 'warranty') {
                  return warrantyContent;
                }
                
                if (activeDetailTab === 'tasks') {
                  return tasksContent;
                }

                if (activeDetailTab === 'camera_installations') {
                  const customerInstallations = cameraInstallations.filter(r => 
                    (r.customerId && r.customerId === selectedCustomer?.id) ||
                    (!r.customerId && (
                      r.customerPhone === selectedCustomer?.phone || 
                      (selectedCustomer?.phone2 && r.customerPhone === selectedCustomer?.phone2)
                    ))
                  ).sort((a, b) => parseDateString(b.installationDate) - parseDateString(a.installationDate));

                  return (
                    <div className="animate-in fade-in slide-in-from-right-2 duration-300 w-full p-6">
                      <div className="flex items-center justify-between mb-6">
                        <h4 className="text-xs font-normal text-slate-400 uppercase tracking-[0.2em]">Danh sách lắp đặt ({customerInstallations.length})</h4>
                        <button 
                          onClick={() => setAddModalType('CAMERA_INSTALL')}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-blue-700 transition-all shadow-md shadow-blue-100"
                        >
                          <Plus size={16} /> Thêm bản ghi
                        </button>
                      </div>
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        {customerInstallations.length === 0 ? (
                          <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center col-span-full">
                            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-300">
                              <CameraIcon size={24} />
                            </div>
                            <p className="text-slate-400 italic text-sm font-medium">Chưa có bản ghi lắp đặt nào cho khách hàng này.</p>
                          </div>
                        ) : (
                          customerInstallations.map(inst => (
                            <div 
                              key={inst.id} 
                              onClick={() => setSelectedCameraInstall(inst)}
                              className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-blue-300 transition-all cursor-pointer group"
                            >
                              <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
                                    <CameraIcon size={20} />
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-800 text-sm leading-tight">{inst.installationType}</p>
                                    <p className="text-[11px] text-slate-400 font-medium uppercase tracking-tighter mt-1">Ref: {inst.id}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs font-bold text-slate-700">{inst.installationDate}</p>
                                  <p className="text-[10px] text-slate-400 font-normal mt-0.5">{inst.createdBy || 'Admin'}</p>
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                {inst.productName && (
                                  <div className="flex items-center gap-2 text-[13px] text-blue-600 font-bold bg-blue-50/50 p-2 rounded-lg border border-blue-100">
                                    <ImageIcon size={14} className="shrink-0" />
                                    <span className="truncate">{inst.productName}</span>
                                  </div>
                                )}
                                <p className="text-[13px] text-slate-600 line-clamp-2 leading-relaxed">
                                  {inst.details || inst.note || '---'}
                                </p>
                                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-50 mt-2">
                                  {inst.wifiName && (
                                    <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                                      <Wifi size={12} className="text-blue-400" /> {inst.wifiName}
                                    </div>
                                  )}
                                  {inst.accountName && (
                                    <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                                      <ShieldCheck size={12} className="text-indigo-400" /> {inst.accountName}
                                    </div>
                                  )}
                                  {inst.qrCode && (
                                    <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                                      <QrCode size={12} /> {inst.qrCode}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
            
            {/* Footer Actions */}
            <div className="p-4 md:p-6 border-t border-slate-100 bg-slate-50/50 shrink-0 hidden uppercase">
              <button 
                onClick={() => setSelectedCustomer(null)}
                className="w-full py-3 bg-[#991b1b] text-white font-black rounded-lg uppercase text-[10px] tracking-widest hover:bg-[#7f1d1d] transition-colors"
              >
                Đóng
              </button>
            </div>
            </div>{/* End Desktop View */}
          </div>
        </div>
      )}

      {/* Camera Installation Detail Modal */}
      {selectedCameraInstall && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center md:p-4 p-0 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl md:rounded-xl rounded-none shadow-2xl overflow-hidden flex flex-col h-full md:max-h-[85vh] md:h-auto animate-in slide-in-from-bottom-4 duration-300">
            <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <div className="flex items-center gap-3">
                <CameraIcon className="text-blue-600" size={20} />
                <h3 className="text-[16px] md:text-lg font-normal text-slate-800 uppercase tracking-tighter">Bản ghi lắp đặt</h3>
              </div>
              <button 
                onClick={() => setSelectedCameraInstall(null)} 
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 text-slate-600 hover:bg-slate-300 transition-colors"
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4 md:p-6 flex-1 overflow-y-auto space-y-4">
              <div className="space-y-4">
                {selectedCameraInstall.productName && (
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                     <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tên thiết bị</div>
                     <div className="font-bold text-slate-800 text-[14px]">{selectedCameraInstall.productName}</div>
                  </div>
                )}

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                   <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Loại lắp đặt</div>
                   <div className="font-bold text-slate-800 text-[14px]">{selectedCameraInstall.installationType}</div>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                   <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Ngày lắp đặt</div>
                   <div className="font-bold text-slate-800 text-[14px]">{selectedCameraInstall.installationDate ? formatDate(selectedCameraInstall.installationDate) : '---'}</div>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                   <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Wifi kết nối</div>
                   <div className="font-bold text-slate-800 text-[14px]">{selectedCameraInstall.wifiName || '---'}</div>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                   <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tài khoản</div>
                   <div className="font-bold text-slate-800 text-[14px]">{selectedCameraInstall.accountName || '---'}</div>
                </div>
              </div>

              {(selectedCameraInstall.note || selectedCameraInstall.details) && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                   <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Ghi chú</div>
                   <div className="text-slate-600 text-[13px]">{selectedCameraInstall.note || selectedCameraInstall.details}</div>
                </div>
              )}

              {selectedCameraInstall.installationImages && selectedCameraInstall.installationImages.length > 0 && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-2">
                   <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Hình ảnh ({selectedCameraInstall.installationImages.length})</div>
                   <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                     {selectedCameraInstall.installationImages.map((img, idx) => (
                        <div key={`inst-img-${idx}`} className="aspect-square relative rounded-lg border border-slate-200 overflow-hidden cursor-pointer hover:border-blue-300 transition-colors" onClick={() => setViewImage(img)}>
                           <img src={img} className="w-full h-full object-cover" />
                        </div>
                     ))}
                   </div>
                </div>
              )}

              {selectedCameraInstall.qrCode && (
                 <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 flex flex-col items-center">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Mã QR truy cập</div>
                    {selectedCameraInstall.qrCode.startsWith('http') ? (
                      <img src={selectedCameraInstall.qrCode} className="w-40 h-40 rounded-lg border border-slate-200 shadow-md bg-white p-2" />
                    ) : (
                      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-lg group/qr relative cursor-pointer" onClick={() => {
                        // Option to download or expand? For now just visual.
                      }}>
                        <QRCodeSVG value={selectedCameraInstall.qrCode} size={160} />
                        <div className="mt-3 text-center text-[13px] font-mono font-bold text-slate-600 bg-slate-50 py-1 px-3 rounded-full border border-slate-100">
                          {selectedCameraInstall.qrCode}
                        </div>
                      </div>
                    )}
                 </div>
              )}
            </div>
            <div className="p-4 md:p-6 border-t border-slate-100 bg-white shrink-0">
               <button onClick={() => setSelectedCameraInstall(null)} className="w-full py-3 bg-slate-900 text-white font-bold rounded-lg uppercase text-[12px] tracking-widest hover:bg-slate-800 transition-colors">Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center md:p-4 p-0 bg-slate-900/60 backdrop-blur-sm print:hidden">
          <div className="bg-white w-full max-w-5xl md:rounded-xl rounded-none shadow-2xl overflow-hidden flex flex-col h-full md:max-h-[85vh] animate-in slide-in-from-bottom-4 duration-300">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <div className="flex items-center gap-3">
                <FileText className="text-pink-600" size={20} />
                <h3 className="text-lg font-normal text-slate-800 uppercase tracking-tighter">Chi tiết hóa đơn {selectedInvoice.id}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handlePrint({
                    title: 'HÓA ĐƠN BÁN HÀNG',
                    id: selectedInvoice.id,
                    date: selectedInvoice.date,
                    partner: selectedInvoice.customer,
                    phone: selectedInvoice.phone,
                    items: selectedInvoice.items.map(i => ({ ...i, total: i.qty * i.price })),
                    total: selectedInvoice.total,
                    paid: selectedInvoice.paid,
                    debt: selectedInvoice.debt,
                    type: 'HOA_DON'
                  })}
                  className="w-10 h-10 bg-white border border-slate-200 text-slate-400 rounded-full hover:bg-slate-50 transition-colors flex items-center justify-center"
                >
                  <Printer size={20} />
                </button>
                <button onClick={() => setSelectedInvoice(null)} className="text-slate-400 hover:text-slate-600">
                  <X size={24} />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              <div className="grid grid-cols-2 gap-4 md:gap-8 mb-4 md:mb-8">
                <div>
                  <p className="md:text-xs text-[10px] font-normal text-slate-400 uppercase tracking-widest mb-1 italic">Khách hàng</p>
                  <p className="font-normal text-slate-800 md:text-base text-xs md:text-sm">{selectedInvoice.customer}</p>
                </div>
                <div>
                  <p className="md:text-xs text-[10px] font-normal text-slate-400 uppercase tracking-widest mb-1 italic">Ngày bán</p>
                  <p className="font-normal text-slate-800 md:text-base text-xs md:text-sm">{selectedInvoice.date}</p>
                </div>
              </div>

              <div className="mb-4 md:mb-6 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-y border-slate-200">
                      <th className="p-2 md:p-3 md:text-sm text-[10px] font-normal text-slate-700 w-12 text-center">STT</th>
                      <th className="p-2 md:p-3 md:text-sm text-[10px] font-normal text-slate-700">Tên Sản Phẩm</th>
                      <th className="p-2 md:p-3 md:text-sm text-[10px] font-normal text-slate-700 text-center">Số Lượng</th>
                      <th className="p-2 md:p-3 md:text-sm text-[10px] font-normal text-slate-700 text-right">Đơn Giá</th>
                      <th className="p-2 md:p-3 md:text-sm text-[10px] font-normal text-slate-700 text-right">Thành Tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoice.items.map((item, idx) => (
                      <React.Fragment key={`invoice-item-${item.id}-${idx}`}>
                        <tr className="border-b border-slate-50">
                          <td className="p-2 md:p-3 text-center md:text-sm text-[10px] text-slate-600 font-medium">{idx + 1}</td>
                          <td className="p-2 md:p-3">
                            <p className="font-normal md:text-base text-[10px] md:text-sm text-slate-800">{item.name}</p>
                          </td>
                          <td className="p-2 md:p-3 text-center md:text-sm text-[10px] text-slate-600 font-normal">{item.qty}</td>
                          <td className="p-2 md:p-3 text-right md:text-sm text-[10px] text-slate-600 font-normal">{formatNumber(item.price)} <span className="underline">đ</span></td>
                          <td className="p-2 md:p-3 text-right md:text-sm text-[10px] text-slate-800 font-normal">{formatNumber(item.qty * item.price)} <span className="underline">đ</span></td>
                        </tr>
                        {item.sn && (
                          <tr className="bg-slate-50/30">
                            <td colSpan={5} className="p-1 px-12">
                              <div className="flex items-center gap-1.5 opacity-60">
                                <span className="text-[9px] font-mono text-slate-500">
                                  SN: {Array.isArray(item.sn) ? item.sn.join(', ') : item.sn}
                                </span>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-slate-200">
                      <td colSpan={3}></td>
                      <td className="p-2 md:p-3 text-right text-[10px] md:text-sm font-normal text-slate-700">Tổng:</td>
                      <td className="p-2 md:p-3 text-right text-[10px] md:text-sm font-normal text-slate-800">{formatNumber(selectedInvoice.total)} <span className="underline">đ</span></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="space-y-1.5 md:space-y-2 py-4 border-t border-slate-200">
                <div className="flex justify-between items-center px-2">
                  <span className="text-[11px] md:text-sm text-slate-600 font-medium">Tạm tính (chưa VAT):</span>
                  <span className="font-medium text-[11px] md:text-sm text-slate-800">{formatNumber(selectedInvoice.total)} <span className="underline">đ</span></span>
                </div>
                <div className="flex justify-between items-center px-2">
                  <span className="text-[11px] md:text-sm text-slate-600 font-medium">Tổng tiền hàng:</span>
                  <span className="font-medium text-[11px] md:text-sm text-slate-800">{formatNumber(selectedInvoice.total)} <span className="underline">đ</span></span>
                </div>
                
                <div className="flex justify-between items-center pt-3 mt-2 px-2 border-t border-slate-100 italic font-normal">
                  <span className="text-sm md:text-2xl font-normal text-slate-800 uppercase tracking-tight">TỔNG TIỀN:</span>
                  <span className="text-sm md:text-2xl font-normal text-blue-600 tracking-tighter">{formatNumber(selectedInvoice.total)} <span className="underline">đ</span></span>
                </div>

                <div className="flex justify-between items-center px-2">
                  <span className="text-[11px] md:text-sm text-slate-600 font-medium">Đã thanh toán:</span>
                  <span className="font-medium text-[11px] md:text-sm text-emerald-600">{formatNumber(selectedInvoice.paid)} <span className="underline">đ</span></span>
                </div>

                <div className="flex justify-between items-center px-2">
                  <span className="text-[11px] md:text-sm text-slate-600 font-medium">Còn nợ:</span>
                  <span className="font-medium text-[11px] md:text-sm text-red-600">{formatNumber(selectedInvoice.debt)} <span className="underline">đ</span></span>
                </div>
              </div>
            </div>

            <div className="p-4 md:p-6 border-t border-slate-100 flex justify-end gap-2 md:gap-3 bg-slate-50 shrink-0 md:hidden">
              {selectedInvoice.debt > 0 && (
                <button 
                  onClick={() => handleOpenPaymentModal('SINGLE', selectedInvoice.id, selectedInvoice.debt)}
                  className="flex-1 md:flex-none px-4 md:px-6 py-2.5 md:py-3 bg-emerald-600 text-white rounded-lg font-normal uppercase text-[10px] md:text-xs tracking-widest shadow-md shadow-emerald-100 flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all active:scale-95"
                >
                  <CreditCard size={14} className="md:w-4 md:h-4" /> Thu nợ
                </button>
              )}
              <button 
                onClick={() => setSelectedInvoice(null)}
                className="flex-1 md:flex-none px-4 md:px-6 py-2.5 md:py-3 bg-[#991b1b] text-white rounded-lg font-normal uppercase text-[10px] md:text-xs tracking-widest hover:bg-[#7f1d1d] transition-all text-center"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md print:hidden">
          <div className="bg-white w-full max-w-sm rounded-xl shadow-2xl overflow-hidden p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-normal text-slate-800 tracking-tighter uppercase">Thu nợ khách hàng</h3>
              <button onClick={() => setIsPaymentModalOpen(false)} className="w-8 h-8 bg-slate-50 text-slate-400 rounded-full hover:bg-slate-200 transition-colors flex items-center justify-center">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-5">
              <div>
                <label className="md:text-sm text-[10px] font-normal text-slate-400 uppercase tracking-widest mb-1.5 block">Số tiền thu</label>
                <input 
                  type="text" 
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(formatNumber(parseFormattedNumber(e.target.value)))}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg md:text-2xl text-lg font-normal outline-none focus:border-emerald-400 text-emerald-600 shadow-inner" 
                  placeholder="0" 
                />
              </div>
              <div>
                <label className="md:text-sm text-[10px] font-normal text-slate-400 uppercase tracking-widest mb-1.5 block">Ngày thu</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="date" 
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full p-3 pl-10 bg-slate-50 border border-slate-200 rounded-lg md:text-base text-sm font-normal outline-none focus:border-blue-400 text-slate-700 shadow-inner" 
                  />
                </div>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                <p className="md:text-xs text-[9px] text-blue-600 font-bold leading-relaxed">
                  {paymentType === 'ALL' 
                    ? "Hệ thống sẽ tự động trừ nợ cho các hóa đơn cũ nhất trước (FIFO)."
                    : "Số tiền sẽ được trừ trực tiếp vào hóa đơn đang chọn."}
                </p>
              </div>
              <div>
                <label className="block md:text-sm text-[10px] font-normal text-slate-400 uppercase tracking-widest mb-1.5">Ví thanh toán</label>
                <select
                  value={paymentWalletId || ''}
                  onChange={e => setPaymentWalletId(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg md:text-base text-sm font-normal outline-none focus:border-blue-400 text-slate-700 shadow-inner appearance-none relative"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: `right 0.5rem center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.5em 1.5em`, paddingRight: `2.5rem` }}
                >
                  <option value="" disabled>Chọn ví</option>
                  {wallets.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
              <button 
                onClick={executePayment}
                className="w-full bg-emerald-600 text-white py-4 rounded-lg font-normal shadow-lg shadow-emerald-100 uppercase text-xs tracking-widest mt-2 active:scale-95 transition-all hover:bg-emerald-700"
              >
                XÁC NHẬN THU NỢ
              </button>
            </div>
          </div>
        </div>
      )}

      <AddCustomerModal 
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingCustomerId(null); }}
        customerToEdit={editingCustomerId ? customers.find(c => c.id === editingCustomerId) : null}
      />

      {/* Mobile Floating Action Button */}
      <button 
        onClick={() => { setEditingCustomerId(null); setIsModalOpen(true); }}
        className="md:hidden fixed bottom-24 right-4 w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-blue-200 z-40 active:scale-95 transition-transform"
      >
        <Plus size={24} />
      </button>

      {/* Hidden input for quick camera capture */}
      <input 
        type="file" 
        ref={captureInputRef} 
        onChange={handleQuickCapture} 
        className="hidden" 
        accept="image/*"
        capture="environment"
      />

      {/* Image Library Modal */}
      {isLibraryOpen && (
        <ImageLibraryModal 
          isOpen={true}
          onClose={() => setIsLibraryOpen(false)}
          defaultFilename={selectedCustomer?.name ? `${selectedCustomer.name}_${Date.now()}` : `KhachHang_${Date.now()}`}
          initialCategory="KhachHang"
          onSelect={(url) => {
            if (selectedCustomer && selectedCustomer.id) {
              updateCustomer(selectedCustomer.id, { image: url });
              setSelectedCustomer({ ...selectedCustomer, image: url });
            }
            setIsLibraryOpen(false);
          }}
        />
      )}

      {/* Image Viewer Modal */}
      {viewImage && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm" onClick={() => { setViewImage(null); setZoomLevel(1); }}>
          <div className="relative w-full h-full flex flex-col items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <div className="absolute top-4 right-4 flex items-center gap-4 bg-slate-800/50 p-2 rounded-xl backdrop-blur-md z-10">
              <button 
                onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.25))}
                className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                title="Thu nhỏ"
              >
                <ZoomOut size={24} />
              </button>
              <div className="w-px h-6 bg-slate-600"></div>
              <button 
                onClick={() => setZoomLevel(Math.min(3, zoomLevel + 0.25))}
                className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                title="Phóng to"
              >
                <ZoomIn size={24} />
              </button>
              <div className="w-px h-6 bg-slate-600"></div>
              <button 
                onClick={() => { setViewImage(null); setZoomLevel(1); }}
                className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
                title="Đóng"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 w-full relative overflow-auto custom-scrollbar flex items-center justify-center cursor-move">
              <img 
                src={viewImage} 
                alt="Zoomed image" 
                className="max-w-none transition-transform duration-200 ease-out"
                style={{ transform: `scale(${zoomLevel})` }}
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Modal */}
      <CustomerQuickAddModal 
        type={addModalType} 
        customer={selectedCustomer} 
        onClose={() => setAddModalType(null)} 
      />
    </div>
    </div>
  );
};

