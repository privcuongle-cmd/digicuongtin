import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, UserPlus, Truck, X, FileText, Calendar, Wallet, ChevronRight, CreditCard, Package, Hash, Printer, Download, Upload, LayoutGrid, Settings, HelpCircle, ChevronDown, Filter, RotateCcw, ExternalLink, ChevronLeft } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Supplier, ImportOrder, CashTransaction } from '../types';
import { formatNumber, parseFormattedNumber, parseDateString } from '../lib/utils';
import { generateId } from '../lib/idUtils';
import { PrintTemplate } from '../components/PrintTemplate';
import { useScrollLock } from '../hooks/useScrollLock';
import { useMobileBackModal } from '../hooks/useMobileBackModal';

export const Suppliers: React.FC = () => {
  const navigate = useNavigate();
  const { suppliers, addSupplier, importOrders, updateImportOrder, addCashTransaction, setImportDraft, cashTransactions, wallets } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<ImportOrder | null>(null);
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

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
  const [targetOrderId, setTargetOrderId] = useState<string | null>(null);

  // Lock scroll for modals
  useScrollLock(isModalOpen || !!selectedSupplier || !!selectedOrder || isPaymentModalOpen);

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  const filteredSuppliers = (suppliers || []).filter(s => 
    (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (s.phone || '').includes(searchTerm)
  ).sort((a, b) => String(b.id || '').localeCompare(String(a.id || '')));

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, rowsPerPage]);

  const totalPages = Math.ceil(filteredSuppliers.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedSuppliers = filteredSuppliers.slice(startIndex, endIndex);

  const handleSave = () => {
    if (!name || !phone) {
      alert("Vui lòng nhập đủ tên và số điện thoại");
      return;
    }
    addSupplier({ name, phone, address });
    setIsModalOpen(false);
    setName('');
    setPhone('');
    setAddress('');
  };

  const getSupplierStats = (supplierName: string) => {
    const orders = importOrders.filter(o => o.supplier === supplierName);
    const totalBuy = orders.reduce((sum, o) => sum + o.total, 0);
    const totalPaid = orders.reduce((sum, o) => sum + (o.paid || 0), 0);
    const totalDebt = orders.reduce((sum, o) => sum + (o.debt || 0), 0);
    const avgPerOrder = orders.length > 0 ? totalBuy / orders.length : 0;
    const paymentRate = totalBuy > 0 ? (totalPaid / totalBuy) * 100 : 0;
    const lastOrder = orders[0]?.date || '---';

    return {
      count: orders.length,
      total: totalBuy,
      debt: totalDebt,
      avgPerOrder,
      paymentRate,
      lastOrder,
      orders: orders.sort((a, b) => parseDateString(b.date) - parseDateString(a.date))
    };
  };

  const handleOpenPaymentModal = (type: 'ALL' | 'SINGLE', orderId: string | null = null, defaultAmount: number = 0) => {
    setPaymentType(type);
    setTargetOrderId(orderId);
    setPaymentAmount(formatNumber(defaultAmount));
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setIsPaymentModalOpen(true);
  };

  const [paymentWalletId, setPaymentWalletId] = useState<string>('');

  const executePayment = () => {
    if (!paymentWalletId) {
      alert('Vui lòng chọn ví thanh toán!');
      return;
    }
    const payValue = parseFormattedNumber(paymentAmount);
    if (isNaN(payValue) || payValue <= 0) return alert('Số tiền không hợp lệ');

    const transactionId = generateId('PC', cashTransactions);
    const newTransaction: CashTransaction = {
      id: transactionId,
      date: `${paymentDate} ${new Date().toLocaleTimeString()}`,
      type: 'PAYMENT',
      amount: payValue,
      category: 'DEBT_PAYMENT',
      partner: selectedSupplier?.name || '',
      note: paymentType === 'SINGLE' ? `Thanh toán nợ đơn ${targetOrderId}` : `Thanh toán tổng nợ NCC ${selectedSupplier?.name}`,
      refId: targetOrderId || undefined,
      walletId: paymentWalletId
    };

    if (paymentType === 'SINGLE' && targetOrderId) {
      const order = importOrders.find(o => o.id === targetOrderId);
      if (!order) return;
      if (payValue > order.debt) return alert('Số tiền thanh toán không được lớn hơn số nợ của đơn');

      updateImportOrder(order.id, {
        paid: order.paid + payValue,
        debt: order.debt - payValue
      });
    } else if (paymentType === 'ALL' && selectedSupplier) {
      const stats = getSupplierStats(selectedSupplier.name);
      if (payValue > stats.debt) return alert('Số tiền thanh toán không được lớn hơn tổng nợ');

      let remainingPayment = payValue;
      // FIFO: Sort by date ascending (oldest first)
      const ordersWithDebt = [...stats.orders]
        .filter(o => o.debt > 0)
        .sort((a, b) => parseDateString(a.date) - parseDateString(b.date));
      
      ordersWithDebt.forEach(order => {
        if (remainingPayment <= 0) return;
        const paymentForThisOrder = Math.min(order.debt, remainingPayment);
        updateImportOrder(order.id, {
          paid: order.paid + paymentForThisOrder,
          debt: order.debt - paymentForThisOrder
        });
        remainingPayment -= paymentForThisOrder;
      });
    }

    addCashTransaction(newTransaction);
    setIsPaymentModalOpen(false);
    
    if (confirm('Thanh toán thành công! Bạn có muốn in phiếu chi không?')) {
      handlePrint({
        title: 'PHIẾU CHI TIỀN',
        id: transactionId,
        date: newTransaction.date,
        partner: newTransaction.partner,
        total: newTransaction.amount,
        paid: newTransaction.amount,
        debt: 0,
        note: newTransaction.note,
        type: 'CHI'
      });
    }
  };

  const totalDebt = filteredSuppliers.reduce((sum, s) => sum + getSupplierStats(s.name).debt, 0);
  const totalBuy = filteredSuppliers.reduce((sum, s) => sum + getSupplierStats(s.name).total, 0);

  const handleOpenOrder = (order: ImportOrder) => {
    const supplier = suppliers.find(s => s.name === order.supplier);
    setImportDraft({
      cart: order.items.map(item => ({
        ...item,
        hasSerial: !!(item.sn && item.sn.length > 0),
        serials: item.sn || [],
        unit: 'Cái',
        discount: 0,
        note: ''
      })),
      selectedSupplier: supplier || { id: '', name: order.supplier, phone: '' },
      paid: order.paid,
      isExplicitIntent: true
    });
    navigate('/import');
  };

  const handleReturnOrder = (order: ImportOrder) => {
    navigate('/create-return-import', { state: { preFillOrder: order } });
  };


  useMobileBackModal(isModalOpen, () => setIsModalOpen(false)); // auto-injected
  useMobileBackModal(isPaymentModalOpen, () => setIsPaymentModalOpen(false)); // auto-injected
  useMobileBackModal(!!selectedSupplier, () => setSelectedSupplier(null));
  useMobileBackModal(!!selectedOrder, () => setSelectedOrder(null));
return (
    <div className="flex flex-col h-full bg-slate-50 md:bg-white">
      {/* Print Template Container */}
      {printData && <PrintTemplate {...printData} />}

      <div className="bg-white md:rounded-xl md:shadow-sm md:border md:border-slate-200 flex flex-col mx-auto w-full h-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 shrink-0 bg-white md:bg-slate-50/50 border-b border-slate-100">
        {/* Left: Search */}
        <div className="relative w-full md:max-w-md flex gap-2">
          <div className="relative flex-1 z-20">
            <div className="relative flex items-center w-full z-50">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Theo mã, tên, số điện thoại" 
                className="w-full bg-slate-50 md:bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-blue-500 shadow-sm font-medium transition-all"
              />
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-2 mr-2">
            <button 
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow-sm flex items-center gap-2 font-bold text-sm hover:bg-blue-700 transition-all"
            >
              <UserPlus size={18} /> Nhà cung cấp
            </button>
          </div>
          
          {/* Mobile Add Button */}
          <button 
            onClick={() => setIsModalOpen(true)}
            className="md:hidden w-full px-6 py-3 bg-indigo-600 text-white rounded-xl shadow-md flex items-center justify-center gap-2 font-black uppercase text-xs tracking-widest active:scale-95 transition-all hover:bg-indigo-700"
          >
            <UserPlus size={16} /> Thêm NCC
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col bg-slate-50 md:bg-white">
        {/* Desktop Table View */}
        <div className="hidden md:block flex-1 overflow-y-auto custom-scrollbar">
          <table className="w-full border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-white border-b border-slate-200">
              <tr className="text-slate-700 text-[13px] font-bold">
                <th className="p-3 w-10"><input type="checkbox" className="rounded border-slate-300" /></th>
                <th className="p-3">Mã nhà cung cấp</th>
                <th className="p-3">Tên nhà cung cấp</th>
                <th className="p-3">Điện thoại</th>
                <th className="p-3">Email</th>
                <th className="p-3 text-right">Nợ cần trả hiện tại</th>
                <th className="p-3 text-right">Tổng mua</th>
              </tr>
              {/* Summary Row */}
              <tr className="bg-slate-50/50 text-slate-800 text-[13px] font-bold border-b border-slate-100">
                <td colSpan={5}></td>
                <td className="p-3 text-right">{formatNumber(totalDebt)}</td>
                <td className="p-3 text-right">{formatNumber(totalBuy)}</td>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedSuppliers.map((s, idx) => {
                const stats = getSupplierStats(s.name);
                return (
                  <tr 
                    key={`desktop-supp-${idx}`} 
                    onClick={() => setSelectedSupplier(s)}
                    className="hover:bg-blue-50/30 transition-colors cursor-pointer text-[13px] text-slate-600 group"
                  >
                    <td className="p-3"><input type="checkbox" className="rounded border-slate-300" onClick={(e) => e.stopPropagation()} /></td>
                    <td className="p-3 font-medium text-blue-600">{s.id || `NCC${idx.toString().padStart(6, '0')}`}</td>
                    <td className="p-3 font-medium text-slate-800">{s.name}</td>
                    <td className="p-3">{s.phone}</td>
                    <td className="p-3 text-slate-400">{s.email || ''}</td>
                    <td className="p-3 text-right font-bold text-slate-800">{formatNumber(stats.debt)}</td>
                    <td className="p-3 text-right font-bold text-slate-800">{formatNumber(stats.total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredSuppliers.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Truck size={48} className="mb-4 opacity-20" />
              <p className="italic">Không tìm thấy nhà cung cấp nào</p>
            </div>
          )}
        </div>

        {/* Mobile Grid View */}
        <div className="md:hidden flex-1 overflow-y-auto p-4 space-y-4">
          {filteredSuppliers.length === 0 ? (
            <p className="text-center py-20 text-slate-400 italic text-sm">Chưa có nhà cung cấp.</p>
          ) : (
            paginatedSuppliers.map((s, idx) => {
              const stats = getSupplierStats(s.name);
              return (
                <div 
                  key={`mobile-supp-${idx}`} 
                  onClick={() => setSelectedSupplier(s)}
                  className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-6 hover:shadow-md transition-all cursor-pointer hover:border-indigo-300 group"
                >
                  <div className="w-16 h-16 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100 text-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all">
                    <Truck size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-slate-800 truncate tracking-tighter">{s.name}</p>
                    <p className="text-[10px] text-slate-500 font-bold tracking-widest mt-1">{s.phone}</p>
                    <div className="flex gap-3 mt-2">
                      <span className="text-[9px] font-black bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded uppercase">{stats.count} đơn</span>
                      {stats.debt > 0 && (
                        <span className="text-[9px] font-black bg-red-50 text-red-600 px-1.5 py-0.5 rounded uppercase">Nợ: {formatNumber(stats.debt)}đ</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {filteredSuppliers.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-200 bg-white flex items-center justify-between text-sm shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Hiển thị</span>
              <select 
                value={rowsPerPage} 
                onChange={(e) => setRowsPerPage(Number(e.target.value))}
                className="border border-slate-300 rounded px-2 py-1 bg-white focus:outline-none focus:border-blue-500"
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-slate-500">dòng / trang</span>
            </div>
            
            <div className="flex items-center gap-4">
              <span className="text-slate-500 font-medium hidden sm:inline">
                {startIndex + 1} - {Math.min(endIndex, filteredSuppliers.length)} trên tổng {filteredSuppliers.length}
              </span>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed bg-white transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="px-3 font-medium text-slate-700">{currentPage} / {totalPages || 1}</span>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="p-1.5 border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed bg-white transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Supplier Detail Modal */}
      {selectedSupplier && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm print:hidden">
          <div className="bg-slate-50 w-full max-w-6xl h-[90vh] rounded-xl shadow-2xl overflow-hidden flex flex-col">
            <div className="bg-white p-6 border-b border-slate-200 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg">
                  <Truck size={24} />
                </div>
                <div>
                  <h3 className="text-xl md:text-3xl font-bold text-slate-800 tracking-tighter uppercase">{selectedSupplier.name}</h3>
                  <p className="text-xs md:text-lg text-slate-500 font-bold tracking-widest">ID: {selectedSupplier.id} | {selectedSupplier.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getSupplierStats(selectedSupplier.name).debt > 0 && (
                  <button 
                    onClick={() => handleOpenPaymentModal('ALL', null, getSupplierStats(selectedSupplier.name).debt)}
                    className="px-4 py-2 md:px-6 md:py-3 bg-emerald-600 text-white rounded-lg text-[10px] md:text-sm font-black uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-700 transition-all active:scale-95 shadow-md shadow-emerald-100"
                  >
                    <CreditCard size={14} className="md:size-18" /> Thanh toán nợ
                  </button>
                )}
                <button onClick={() => setSelectedSupplier(null)} className="w-10 h-10 bg-slate-100 text-slate-400 rounded-full hover:bg-slate-200 transition-colors flex items-center justify-center">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-8">
              {/* Stats Cards */}
              {(() => {
                const stats = getSupplierStats(selectedSupplier.name);
                return (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-6 mb-8">
                      <div className="bg-[#f0f7ff] p-4 rounded-xl flex flex-col justify-between h-[90px] md:h-[120px]">
                        <span className="md:text-sm text-[10px] font-bold text-blue-600 uppercase tracking-wider">Đơn nhập</span>
                        <p className="md:text-4xl text-lg font-bold text-blue-700 leading-none">{stats.count}</p>
                      </div>
                      
                      <div className="bg-[#f0fff4] p-4 rounded-xl flex flex-col justify-between h-[90px] md:h-[120px]">
                        <span className="md:text-sm text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Tổng nhập</span>
                        <p className="md:text-3xl text-lg font-bold text-emerald-700 leading-none">
                          {formatNumber(stats.total)} <span className="text-[10px] md:text-sm">đ</span>
                        </p>
                      </div>

                      <div className="bg-[#fff5f5] p-4 rounded-xl flex flex-col justify-between h-[90px] md:h-[120px]">
                        <span className="md:text-sm text-[10px] font-bold text-red-500 uppercase tracking-wider">Nợ NCC</span>
                        <p className="md:text-3xl text-lg font-bold text-red-600 leading-none">
                          {formatNumber(stats.debt)} <span className="text-[10px] md:text-sm">đ</span>
                        </p>
                      </div>

                      <div className="bg-[#fffaf0] p-4 rounded-xl flex flex-col justify-between h-[90px] md:h-[120px]">
                        <span className="md:text-sm text-[10px] font-bold text-orange-600 uppercase tracking-wider">Lần cuối</span>
                        <p className="md:text-2xl text-lg font-bold text-orange-700 leading-none">
                          {stats.lastOrder ? (stats.lastOrder.split(' ').find(p => p.includes('/')) || stats.lastOrder.split(' ')[0]) : '---'}
                        </p>
                      </div>

                      <div className="bg-[#f0fbfa] p-4 rounded-xl flex flex-col justify-between h-[90px] md:h-[120px] sm:col-span-1 col-span-2 sm:flex hidden">
                        <span className="md:text-sm text-[10px] font-bold text-teal-600 uppercase tracking-wider">Tỷ lệ TT</span>
                        <p className="md:text-4xl text-lg font-bold text-teal-700 leading-none">
                          {Math.round(stats.paymentRate)}%
                        </p>
                      </div>

                      {/* Mobile Payment Rate */}
                      <div className="bg-[#f0fbfa] p-4 rounded-xl flex flex-col justify-between h-[90px] md:h-[120px] sm:hidden flex">
                        <span className="md:text-sm text-[10px] font-bold text-teal-600 uppercase tracking-wider">Tỷ lệ TT</span>
                        <p className="md:text-3xl text-lg font-bold text-teal-700 leading-none">
                          {Math.round(stats.paymentRate)}%
                        </p>
                      </div>
                    </div>

                    <h4 className="text-xs md:text-lg font-black text-slate-400 uppercase tracking-[0.2em] mb-6 border-l-4 border-slate-200 pl-4">Danh sách nhập hàng</h4>
                    <div className="space-y-4">
                      {stats.orders.length === 0 ? (
                        <p className="text-center py-10 text-slate-400 italic text-sm md:text-lg">Chưa có giao dịch.</p>
                      ) : (
                        stats.orders.map(order => (
                          <div 
                            key={order.id} 
                            className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-all cursor-pointer group/order"
                            onClick={() => setSelectedOrder(order)}
                          >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 group-hover/order:bg-indigo-50 group-hover/order:text-indigo-500 transition-all">
                                  <FileText size={24} />
                                </div>
                                <div>
                                  <p className="font-bold text-sm md:text-xl text-slate-800 tracking-tight">{order.id}</p>
                                  <div className="flex items-center gap-2 text-[10px] md:text-base text-slate-400 font-semibold mt-1">
                                    <Calendar size={12} className="md:size-16" />
                                    {order.date}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-6">
                                <div className="text-right">
                                  <p className="text-[10px] md:text-xs font-medium text-slate-400 tracking-tight mb-0.5 uppercase">Tổng tiền</p>
                                  <p className="font-bold text-slate-800 text-sm md:text-xl">{formatNumber(order.total)}đ</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-[10px] md:text-xs font-medium text-slate-400 tracking-tight mb-0.5 uppercase">Còn nợ</p>
                                  <p className={`font-bold text-sm md:text-xl ${order.debt > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                    {formatNumber(order.debt)}đ
                                  </p>
                                </div>
                                <div className="flex items-center gap-3">
                                  {order.debt > 0 && (
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenPaymentModal('SINGLE', order.id, order.debt);
                                      }}
                                      className="p-2 md:p-3 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                                      title="Thanh toán đơn này"
                                    >
                                      <CreditCard size={14} className="md:size-18" />
                                    </button>
                                  )}
                                  <div className={`px-4 py-1.5 rounded-full text-[9px] md:text-xs font-black uppercase tracking-widest shadow-sm ${order.status === 'DONE' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                                    {order.status}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm print:hidden">
          <div className="bg-white w-full max-w-5xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                  <Truck size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Chi tiết phiếu nhập</h3>
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mt-0.5">Mã: {selectedOrder.id}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handlePrint({
                    title: 'PHIẾU NHẬP HÀNG',
                    id: selectedOrder.id,
                    date: selectedOrder.date,
                    partner: selectedOrder.supplier,
                    items: selectedOrder.items.map(i => ({ ...i, total: i.qty * i.price })),
                    total: selectedOrder.total,
                    paid: selectedOrder.paid,
                    debt: selectedOrder.debt,
                    type: 'PHIEU_NHAP'
                  })}
                  className="w-10 h-10 bg-slate-50 text-slate-400 rounded-full hover:bg-slate-100 transition-colors flex items-center justify-center border border-slate-200"
                >
                  <Printer size={20} />
                </button>
                <button onClick={() => setSelectedOrder(null)} className="w-10 h-10 bg-slate-50 text-slate-400 rounded-full hover:bg-slate-100 transition-colors flex items-center justify-center border border-slate-200">
                  <X size={24} />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Info Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center gap-4">
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-slate-400 shadow-sm">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <p className="md:text-xs text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ngày nhập kho</p>
                    <p className="font-bold text-slate-800 md:text-base text-sm mt-0.5">{selectedOrder.date}</p>
                  </div>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center gap-4">
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-slate-400 shadow-sm">
                    <Truck size={20} />
                  </div>
                  <div>
                    <p className="md:text-xs text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nhà cung cấp</p>
                    <p className="font-bold text-slate-800 md:text-base text-sm mt-0.5">{selectedOrder.supplier}</p>
                  </div>
                </div>
              </div>

              {/* Action Bar (Requested by user) */}
              <div className="flex gap-3">
                <button 
                  onClick={() => handleOpenOrder(selectedOrder)}
                  className="flex-1 py-2.5 bg-blue-50 text-blue-600 rounded-lg font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-600 hover:text-white transition-all border border-blue-100"
                >
                  <ExternalLink size={14} /> Mở phiếu (Sửa)
                </button>
                <button 
                  onClick={() => handleReturnOrder(selectedOrder)}
                  className="flex-1 py-2.5 bg-orange-50 text-orange-600 rounded-lg font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-orange-600 hover:text-white transition-all border border-orange-100"
                >
                  <RotateCcw size={14} /> Trả hàng nhập
                </button>
              </div>

              {/* Items Table */}
              <div className="overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-y border-slate-200">
                      <th className="p-2 md:p-3 md:text-sm text-[10px] font-bold text-slate-700 w-12 text-center">STT</th>
                      <th className="p-2 md:p-3 md:text-sm text-[10px] font-bold text-slate-700">Tên Sản Phẩm</th>
                      <th className="p-2 md:p-3 md:text-sm text-[10px] font-bold text-slate-700 text-center">Số Lượng</th>
                      <th className="p-2 md:p-3 md:text-sm text-[10px] font-bold text-slate-700 text-right">Đơn Giá</th>
                      <th className="p-2 md:p-3 md:text-sm text-[10px] font-bold text-slate-700 text-right">Thành Tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items.map((item, idx) => (
                      <React.Fragment key={`supplier-item-${item.id}-${idx}`}>
                        <tr className="border-b border-slate-50">
                          <td className="p-2 md:p-3 text-center md:text-sm text-[10px] text-slate-600 font-medium">{idx + 1}</td>
                          <td className="p-2 md:p-3">
                            <p className="font-bold md:text-base text-[10px] md:text-sm text-slate-800">{item.name}</p>
                          </td>
                          <td className="p-2 md:p-3 text-center md:text-sm text-[10px] text-slate-600 font-medium">{item.qty} {item.unit}</td>
                          <td className="p-2 md:p-3 text-right md:text-sm text-[10px] text-slate-600 font-medium">{formatNumber(item.price)} <span className="underline">đ</span></td>
                          <td className="p-2 md:p-3 text-right md:text-sm text-[10px] text-slate-800 font-bold">{formatNumber(item.qty * item.price)} <span className="underline">đ</span></td>
                        </tr>
                        {item.sn && (
                          <tr className="bg-slate-50/30">
                            <td colSpan={5} className="p-1 px-12">
                              <div className="flex items-center gap-1.5 opacity-60">
                                <span className="text-[9px] font-mono text-slate-500 uppercase">
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
                      <td className="p-2 md:p-3 text-right text-[10px] md:text-sm font-bold text-slate-700">Tổng:</td>
                      <td className="p-2 md:p-3 text-right text-[10px] md:text-sm font-bold text-slate-800">{formatNumber(selectedOrder.total - (selectedOrder.shippingFee || 0))} <span className="underline">đ</span></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Summary Box */}
              <div className="space-y-1.5 md:space-y-2 py-4 border-t border-slate-200">
                <div className="flex justify-between items-center px-2">
                  <span className="text-[11px] md:text-sm text-slate-600 font-medium">Tạm tính (chưa VAT):</span>
                  <span className="font-medium text-[11px] md:text-sm text-slate-800">{formatNumber(selectedOrder.total - (selectedOrder.shippingFee || 0))} <span className="underline">đ</span></span>
                </div>
                
                {selectedOrder.shippingFee && (
                  <div className="flex justify-between items-center px-2">
                    <span className="text-[11px] md:text-sm text-slate-600 font-medium">Phí vận chuyển:</span>
                    <span className="font-medium text-[11px] md:text-sm text-orange-600">{formatNumber(selectedOrder.shippingFee)} <span className="underline">đ</span></span>
                  </div>
                )}

                <div className="flex justify-between items-center px-2">
                  <span className="text-[11px] md:text-sm text-slate-600 font-medium">Tổng tiền hàng:</span>
                  <span className="font-medium text-[11px] md:text-sm text-slate-800">{formatNumber(selectedOrder.total)} <span className="underline">đ</span></span>
                </div>
                
                <div className="flex justify-between items-center pt-3 mt-2 px-2 border-t border-slate-100 italic font-bold">
                  <span className="text-sm md:text-2xl font-black text-slate-800 uppercase tracking-tight">TỔNG TIỀN:</span>
                  <span className="text-sm md:text-2xl font-black text-blue-600 tracking-tighter">{formatNumber(selectedOrder.total)} <span className="underline">đ</span></span>
                </div>

                <div className="flex justify-between items-center px-2">
                  <span className="text-[11px] md:text-sm text-slate-600 font-medium">Đã thanh toán:</span>
                  <span className="font-bold text-[11px] md:text-sm text-emerald-600">{formatNumber(selectedOrder.paid)} <span className="underline">đ</span></span>
                </div>

                <div className="flex justify-between items-center px-2">
                  <span className="text-[11px] md:text-sm text-slate-600 font-medium">Còn nợ:</span>
                  <span className="font-bold text-[11px] md:text-sm text-red-600">{formatNumber(selectedOrder.debt)} <span className="underline">đ</span></span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-100 flex gap-4 bg-white">
              <button 
                onClick={() => handlePrint({
                  title: 'PHIẾU NHẬP HÀNG',
                  id: selectedOrder.id,
                  date: selectedOrder.date,
                  partner: selectedOrder.supplier,
                  items: selectedOrder.items.map(i => ({ ...i, total: i.qty * i.price })),
                  total: selectedOrder.total,
                  paid: selectedOrder.paid,
                  debt: selectedOrder.debt,
                  type: 'PHIEU_NHAP'
                })}
                className="flex-1 py-4 bg-white border-2 border-slate-200 text-slate-600 rounded-xl font-bold uppercase text-sm tracking-widest hover:bg-slate-50 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <Printer size={20} /> In phiếu nhập
              </button>
              <button 
                onClick={() => setSelectedOrder(null)}
                className="flex-1 py-4 bg-blue-600 text-white rounded-xl font-bold uppercase text-sm tracking-widest shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95"
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
          <div className="bg-white w-full max-w-md md:max-w-xl rounded-2xl shadow-2xl overflow-hidden p-8 md:p-10 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl md:text-3xl font-black text-slate-800 tracking-tight uppercase">Thanh toán công nợ</h3>
              <button onClick={() => setIsPaymentModalOpen(false)} className="w-10 h-10 bg-slate-50 text-slate-400 rounded-full hover:bg-slate-200 transition-colors flex items-center justify-center">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-6 md:space-y-8">
              <div>
                <label className="md:text-sm text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block ml-1">Số tiền thanh toán</label>
                <input 
                  type="text" 
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(formatNumber(parseFormattedNumber(e.target.value)))}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl md:text-4xl text-lg font-black outline-none focus:border-emerald-400 text-emerald-600 shadow-inner" 
                  placeholder="0" 
                />
              </div>
              <div>
                <label className="md:text-sm text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Ngày thanh toán</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 md:size-24" size={20} />
                  <input 
                    type="date" 
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full p-4 pl-12 bg-slate-50 border border-slate-200 rounded-xl md:text-2xl text-sm font-black outline-none focus:border-blue-400 text-slate-700 shadow-inner" 
                  />
                </div>
              </div>
              <div className="bg-blue-50 p-4 md:p-6 rounded-xl border border-blue-100">
                <p className="md:text-base text-[9px] text-blue-600 font-bold leading-relaxed">
                  {paymentType === 'ALL' 
                    ? "Hệ thống sẽ tự động trừ nợ cho các đơn hàng cũ nhất trước (FIFO)."
                    : "Số tiền sẽ được trừ trực tiếp vào đơn hàng đang chọn."}
                </p>
              </div>
              <div>
                <label className="block md:text-sm text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Ví thanh toán</label>
                <select
                  value={paymentWalletId || ''}
                  onChange={e => setPaymentWalletId(e.target.value)}
                  className="w-full p-4 md:p-5 bg-slate-50 border border-slate-200 rounded-xl md:text-2xl text-sm font-black outline-none focus:border-blue-400 text-slate-700 shadow-inner appearance-none relative"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: `right 1rem center`, backgroundRepeat: `no-repeat`, backgroundSize: `2em 2em`, paddingRight: `3rem` }}
                >
                  <option value="" disabled>Chọn ví</option>
                  {wallets.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
              <button 
                onClick={executePayment}
                className="w-full bg-emerald-600 text-white py-5 md:py-7 rounded-xl font-black shadow-xl shadow-emerald-100 uppercase text-xs md:text-xl tracking-widest mt-4 active:scale-95 transition-all hover:bg-emerald-700"
              >
                XÁC NHẬN THANH TOÁN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Supplier Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-4 bg-slate-900/50 backdrop-blur-sm print:hidden">
          <div className="bg-white w-full max-w-md md:max-w-xl md:rounded-2xl rounded-none shadow-2xl overflow-hidden p-8 md:p-12 flex flex-col h-full md:h-auto animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex justify-between items-center mb-10 shrink-0">
              <h3 className="text-xl md:text-4xl font-black text-slate-800 tracking-tight uppercase">Thêm Nhà Cung Cấp</h3>
              <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 bg-slate-50 text-slate-400 rounded-full hover:bg-slate-200 transition-colors flex items-center justify-center">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-6 md:space-y-8 flex-1 overflow-y-auto pr-1">
              <div>
                <label className="md:text-sm text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Tên nhà cung cấp</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl md:text-3xl text-sm font-black outline-none focus:border-blue-400 shadow-inner" 
                  placeholder="Tên nhà cung cấp..." 
                />
              </div>
              <div>
                <label className="md:text-sm text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Số điện thoại</label>
                <input 
                  type="text" 
                  value={phone}
                  onChange={(e) => {
                    let val = e.target.value.replace(/[^0-9\s+]/g, '').trim();
                    if (val && !val.startsWith('0') && !val.startsWith('+')) val = '0' + val;
                    setPhone(val);
                  }}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl md:text-3xl text-sm font-black outline-none focus:border-blue-400 shadow-inner" 
                  placeholder="Số điện thoại..." 
                />
              </div>
              <div>
                <label className="md:text-sm text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Địa chỉ</label>
                <input 
                  type="text" 
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl md:text-2xl text-sm font-black outline-none focus:border-blue-400 shadow-inner" 
                  placeholder="Địa chỉ..." 
                />
              </div>
            </div>
            <div className="mt-10 flex gap-4 shrink-0">
              <button 
                onClick={handleSave}
                className="flex-[2] bg-emerald-600 text-white py-5 md:py-7 rounded-xl font-black shadow-xl shadow-emerald-200 uppercase text-[11px] md:text-2xl tracking-widest active:scale-95 transition-all hover:bg-emerald-700"
              >
                LƯU THÔNG TIN
              </button>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-5 md:py-7 bg-[#991b1b] text-white font-black rounded-xl uppercase text-[10px] md:text-lg tracking-widest hover:bg-[#7f1d1d] transition-colors active:scale-95 shadow-lg shadow-red-100 md:hidden"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
};
