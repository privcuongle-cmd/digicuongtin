import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  Plus,
  FileDown,
  Star,
  X,
  Calendar,
  Truck,
  CreditCard,
  Package,
  FileText,
  Printer,
  ExternalLink,
  RotateCcw,
  Wallet,
  Hash,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAppContext } from "../context/AppContext";
import { Link, useNavigate } from "react-router-dom";
import { ImportOrder } from "../types";
import { formatNumber, formatDateTime, parseDateString } from "../lib/utils";
import { PrintTemplate } from "../components/PrintTemplate";
import { useScrollLock } from "../hooks/useScrollLock";
import { useMobileBackModal } from "../hooks/useMobileBackModal";

const getDateRange = (filterType: string, customStart?: string, customEnd?: string) => {
  const now = new Date();
  let start = new Date();
  let end = new Date();

  switch (filterType) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'yesterday':
      start.setDate(now.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(now.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      break;
    case 'this_week': {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    }
    case 'last_week': {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1) - 7;
      start.setDate(diff);
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      break;
    }
    case 'this_month':
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'last_month':
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      break;
    case 'this_quarter': {
      const quarter = Math.floor(now.getMonth() / 3);
      start = new Date(now.getFullYear(), quarter * 3, 1, 0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    }
    case 'last_quarter': {
      const quarter = Math.floor(now.getMonth() / 3) - 1;
      const yr = quarter < 0 ? now.getFullYear() - 1 : now.getFullYear();
      const q = quarter < 0 ? 3 : quarter;
      start = new Date(yr, q * 3, 1, 0, 0, 0, 0);
      end = new Date(yr, (q + 1) * 3, 0, 23, 59, 59, 999);
      break;
    }
    case 'this_year':
      start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'last_year':
      start = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
      break;
    case 'custom':
      if (customStart) {
        start = new Date(customStart);
        start.setHours(0, 0, 0, 0);
      } else {
        start = new Date(0);
      }
      if (customEnd) {
        end = new Date(customEnd);
        end.setHours(23, 59, 59, 999);
      } else {
        end = new Date();
      }
      break;
    default:
      return null;
  }
  return { start, end };
};

const filterNames: Record<string, string> = {
  all: 'Toàn thời gian',
  today: 'Hôm nay',
  yesterday: 'Hôm qua',
  this_week: 'Tuần này',
  last_week: 'Tuần trước',
  this_month: 'Tháng này',
  last_month: 'Tháng trước',
  this_quarter: 'Quý này',
  last_quarter: 'Quý trước',
  this_year: 'Năm này',
  last_year: 'Năm trước',
  custom: 'Tùy chỉnh'
};

export const ImportHistory: React.FC = () => {
  const {
    importOrders,
    suppliers,
    setImportDraft,
    updateImportOrder,
    addCashTransaction,
    cashTransactions,
    wallets,
    products,
  } = useAppContext();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [showDebtOnly, setShowDebtOnly] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ImportOrder | null>(null);
  const [printData, setPrintData] = useState<any>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentWalletId, setPaymentWalletId] = useState<string>("");

  // Time range filtering states
  const [timeFilter, setTimeFilter] = useState<string>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [isTimeDropdownOpen, setIsTimeDropdownOpen] = useState(false);
  const [radioOption, setRadioOption] = useState<'preset' | 'custom'>('preset');

  // Use scroll lock for modals
  useScrollLock(!!selectedOrder || isPaymentModalOpen);

  const handlePayment = () => {
    if (!selectedOrder) return;
    const amount = Number(paymentAmount.replace(/[^0-9]/g, ""));
    if (amount <= 0) return;
    if (amount > selectedOrder.debt) {
      alert("Số tiền thanh toán không được lớn hơn số tiền còn nợ!"); // We should use a custom alert, but for simplicity we'll just return or cap it. Let's cap it.
    }
    if (!paymentWalletId) {
      alert("Vui lòng chọn ví thanh toán!");
      return;
    }

    const finalAmount = Math.min(amount, selectedOrder.debt);

    const transactionId = `PC${Date.now().toString().slice(-6)}`;
    addCashTransaction({
      id: transactionId,
      date: formatDateTime(new Date()),
      type: "PAYMENT",
      amount: finalAmount,
      category: "IMPORT_PAYMENT",
      partner: selectedOrder.supplier,
      note: `Thanh toán thêm cho phiếu nhập ${selectedOrder.id}`,
      refId: selectedOrder.id,
      walletId: paymentWalletId,
    });

    updateImportOrder(selectedOrder.id, {
      paid: selectedOrder.paid + finalAmount,
      walletId: paymentWalletId
    });

    setIsPaymentModalOpen(false);
    setPaymentAmount("");
    const newPaid = selectedOrder.paid + finalAmount;
    const newDebt = selectedOrder.debt - finalAmount;
    setSelectedOrder({
      ...selectedOrder,
      paid: newPaid,
      debt: newDebt,
      status: newDebt > 0 ? "Còn nợ" : "Hoàn tất",
      walletId: paymentWalletId
    });
  };

  const handlePrint = (order: ImportOrder) => {
    const supplier = (suppliers || []).find((s) => s.name === order.supplier);
    setPrintData({
      title: "PHIẾU NHẬP HÀNG",
      id: order.id,
      date: order.date,
      partner: order.supplier,
      phone: supplier?.phone || "",
      address: "", // Suppliers sheet usually has address? Let's check Supplier type.
      items: order.items.map((i) => ({ ...i, total: i.qty * i.price })),
      total: order.total,
      paid: order.paid,
      debt: order.debt,
      discount: order.discount || 0,
      type: "PHIEU_NHAP",
    });
    setTimeout(() => {
      window.print();
      setTimeout(() => setPrintData(null), 2000);
    }, 50);
  };

  const handleOpenOrder = (order: ImportOrder) => {
    const supplier = (suppliers || []).find((s) => s.name === order.supplier);

    // Parse order.date back to YYYY-MM-DDThh:mm
    let parsedDate = "";
    if (order.date) {
      try {
        const [timePart, datePart] = order.date.split(" ");
        if (timePart && datePart) {
          const [hh, mm] = timePart.split(":");
          const [DD, MM, YYYY] = datePart.split("/");
          parsedDate = `${YYYY}-${MM.padStart(2, "0")}-${DD.padStart(2, "0")}T${hh.padStart(2, "0")}:${mm.padStart(2, "0")}`;
        }
      } catch (e) {
        console.warn("Could not parse date", order.date);
      }
    }

    const relatedTx = cashTransactions.find(
      (t) => t.refId === order.id && t.category === "IMPORT_PAYMENT",
    );
    const draftWalletId = relatedTx?.walletId || order.walletId || undefined;

    setImportDraft({
      editingId: order.id,
      cart: order.items.map((item) => ({
        ...item,
        hasSerial: !!(item.sn && item.sn.length > 0),
        serials: item.sn || [],
        unit: item.unit || "Cái",
        discount: 0,
        note: "",
      })),
      selectedSupplier: supplier || { id: "", name: order.supplier, phone: "" },
      paid: order.paid,
      transactionDate: parsedDate,
      walletId: draftWalletId,
      overallDiscount: order.discount || 0,
      returnCost: order.returnCost || 0,
      shippingFee: order.shippingFee || 0,
      otherCost: order.otherCost || 0,
      note: order.note || "",
      isExplicitIntent: true,
    });
    navigate("/import");
  };

  const handleReturnOrder = (order: ImportOrder) => {
    navigate("/create-return-import", { state: { preFillOrder: order } });
  };

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  const filteredOrders = (importOrders || []).filter((order) => {
    const matchesSearch =
      (order.id || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.supplier || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDebt = showDebtOnly ? order.debt > 0 : true;
    
    let matchesTime = true;
    if (timeFilter !== 'all') {
      const range = getDateRange(timeFilter, customStartDate, customEndDate);
      if (range) {
        const orderTime = parseDateString(order.date);
        matchesTime = orderTime >= range.start.getTime() && orderTime <= range.end.getTime();
      }
    }

    return matchesSearch && matchesDebt && matchesTime;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, rowsPerPage, showDebtOnly, timeFilter, customStartDate, customEndDate]);

  const totalPages = Math.ceil(filteredOrders.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedOrders = useMemo(() => {
    return filteredOrders
      .sort((a, b) => parseDateString(b.date) - parseDateString(a.date))
      .slice(startIndex, endIndex);
  }, [filteredOrders, startIndex, endIndex]);

  useMobileBackModal(isPaymentModalOpen, () => setIsPaymentModalOpen(false)); // auto-injected
  useMobileBackModal(!!selectedOrder, () => setSelectedOrder(null));
  return (
    <div className="flex flex-col h-full bg-slate-50 md:bg-white">
      <div className="bg-white md:rounded-xl md:shadow-sm md:border md:border-slate-200 flex flex-col mx-auto w-full h-full overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center bg-white md:bg-slate-50/50 shrink-0">
          <div className="relative w-full md:max-w-2xl flex flex-wrap md:flex-nowrap gap-2 items-center">
            <div className="relative flex-1 min-w-[180px]">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={16}
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm mã phiếu, NCC..."
                className="w-full bg-slate-50 md:bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-blue-500 shadow-sm font-medium transition-all"
              />
            </div>
            <button
              onClick={() => setShowDebtOnly(!showDebtOnly)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-xs font-bold whitespace-nowrap ${
                showDebtOnly 
                ? 'bg-orange-600 border-orange-600 text-white shadow-md shadow-orange-100' 
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm'
              }`}
            >
              <CreditCard size={14} />
              <span className={showDebtOnly ? 'inline' : 'hidden sm:inline'}>Đơn nợ</span>
              {showDebtOnly && (
                <span className="bg-white text-orange-600 px-1.5 py-0.5 rounded-full text-[10px]">
                  {importOrders.filter(i => i.debt > 0).length}
                </span>
              )}
            </button>

            {/* Thời gian Filter Button and Popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsTimeDropdownOpen(!isTimeDropdownOpen)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-xs font-bold whitespace-nowrap ${
                  timeFilter !== 'all'
                    ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm'
                }`}
              >
                <Calendar size={14} />
                <span>{timeFilter === 'all' ? 'Thời gian' : filterNames[timeFilter]}</span>
                {timeFilter === 'custom' && customStartDate && customEndDate && (
                  <span className="text-[10px] opacity-90 font-medium">
                    ({customStartDate.split('-').reverse().join('/')} - {customEndDate.split('-').reverse().join('/')})
                  </span>
                )}
              </button>

              {isTimeDropdownOpen && (
                <>
                  {/* Backdrop overlay to close when clicking outside */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsTimeDropdownOpen(false)}
                  />

                  {/* Dropdown Card */}
                  <div className="absolute left-0 sm:left-auto md:left-0 mt-2 z-50 bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col md:flex-row p-4 gap-6 w-[280px] md:w-[780px] max-w-[95vw] animate-in fade-in slide-in-from-top-2 duration-150">
                    
                    {/* Left Sidebar Selection */}
                    <div className="flex flex-col gap-4 md:w-[220px] shrink-0 border-b md:border-b-0 md:border-r border-slate-100 pb-4 md:pb-0 md:pr-4">
                      <div className="text-slate-500 font-bold text-xs uppercase tracking-wider">
                        Thời gian
                      </div>
                      
                      {/* Presets option */}
                      <label 
                        className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${
                          radioOption === 'preset'
                            ? 'border-blue-500 bg-blue-50/50 text-blue-700'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                        }`}
                        onClick={() => {
                          setRadioOption('preset');
                          if (timeFilter === 'custom') {
                            setTimeFilter('this_month');
                          }
                        }}
                      >
                        <input
                          type="radio"
                          name="timeSelectionMode"
                          checked={radioOption === 'preset'}
                          onChange={() => {}}
                          className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold">Theo thời gian</p>
                          <p className="text-[11px] opacity-80 font-medium truncate">
                            {timeFilter === 'custom' ? 'Tháng này' : filterNames[timeFilter]}
                          </p>
                        </div>
                        <ChevronRight size={14} className="text-slate-400 shrink-0" />
                      </label>

                      {/* Custom option */}
                      <div 
                        className={`flex flex-col gap-2 p-2.5 rounded-xl border transition-all ${
                          radioOption === 'custom'
                            ? 'border-blue-500 bg-blue-50/50 text-blue-700'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                        onClick={() => {
                          setRadioOption('custom');
                          setTimeFilter('custom');
                        }}
                      >
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="radio"
                            name="timeSelectionMode"
                            checked={radioOption === 'custom'}
                            onChange={() => {}}
                            className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <p className="text-xs font-bold">Tùy chỉnh</p>
                          </div>
                          <Calendar size={14} className="text-slate-400 shrink-0" />
                        </label>
                        
                        {radioOption === 'custom' && (
                          <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-blue-100" onClick={(e) => e.stopPropagation()}>
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] font-bold text-slate-400 uppercase">Từ ngày</span>
                              <input
                                type="date"
                                value={customStartDate}
                                onChange={(e) => setCustomStartDate(e.target.value)}
                                className="w-full px-2 py-1 border border-slate-200 rounded text-xs outline-none focus:border-blue-500 font-medium"
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] font-bold text-slate-400 uppercase">Đến ngày</span>
                              <input
                                type="date"
                                value={customEndDate}
                                onChange={(e) => setCustomEndDate(e.target.value)}
                                className="w-full px-2 py-1 border border-slate-200 rounded text-xs outline-none focus:border-blue-500 font-medium"
                              />
                            </div>
                            {/* Clear option */}
                            <button
                              type="button"
                              onClick={() => {
                                setTimeFilter('all');
                                setRadioOption('preset');
                                setCustomStartDate('');
                                setCustomEndDate('');
                                setIsTimeDropdownOpen(false);
                              }}
                              className="text-center text-[10px] text-red-500 hover:text-red-700 font-bold uppercase mt-1 tracking-wider"
                            >
                              Xóa bộ lọc
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Grid presets */}
                    <div className={`flex-1 grid grid-cols-2 md:grid-cols-5 gap-3 ${radioOption !== 'preset' ? 'opacity-40 pointer-events-none' : ''}`}>
                      
                      {/* Theo ngày */}
                      <div className="flex flex-col gap-2">
                        <span className="text-slate-400 font-bold text-[11px] uppercase tracking-wider whitespace-nowrap">Theo ngày</span>
                        <button
                          type="button"
                          onClick={() => {
                            setTimeFilter('today');
                            setIsTimeDropdownOpen(false);
                          }}
                          className={`${
                            timeFilter === 'today'
                              ? 'bg-blue-600 text-white font-bold border-blue-600 shadow-sm shadow-blue-100'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          } text-xs px-2.5 py-2 border rounded-full text-center transition-all whitespace-nowrap w-full`}
                        >
                          Hôm nay
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setTimeFilter('yesterday');
                            setIsTimeDropdownOpen(false);
                          }}
                          className={`${
                            timeFilter === 'yesterday'
                              ? 'bg-blue-600 text-white font-bold border-blue-600 shadow-sm shadow-blue-100'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          } text-xs px-2.5 py-2 border rounded-full text-center transition-all whitespace-nowrap w-full`}
                        >
                          Hôm qua
                        </button>
                      </div>

                      {/* Theo tuần */}
                      <div className="flex flex-col gap-2">
                        <span className="text-slate-400 font-bold text-[11px] uppercase tracking-wider whitespace-nowrap">Theo tuần</span>
                        <button
                          type="button"
                          onClick={() => {
                            setTimeFilter('this_week');
                            setIsTimeDropdownOpen(false);
                          }}
                          className={`${
                            timeFilter === 'this_week'
                              ? 'bg-blue-600 text-white font-bold border-blue-600 shadow-sm shadow-blue-100'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          } text-xs px-2.5 py-2 border rounded-full text-center transition-all whitespace-nowrap w-full`}
                        >
                          Tuần này
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setTimeFilter('last_week');
                            setIsTimeDropdownOpen(false);
                          }}
                          className={`${
                            timeFilter === 'last_week'
                              ? 'bg-blue-600 text-white font-bold border-blue-600 shadow-sm shadow-blue-100'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          } text-xs px-2.5 py-2 border rounded-full text-center transition-all whitespace-nowrap w-full`}
                        >
                          Tuần trước
                        </button>
                      </div>

                      {/* Theo tháng */}
                      <div className="flex flex-col gap-2">
                        <span className="text-slate-400 font-bold text-[11px] uppercase tracking-wider whitespace-nowrap">Theo tháng</span>
                        <button
                          type="button"
                          onClick={() => {
                            setTimeFilter('this_month');
                            setIsTimeDropdownOpen(false);
                          }}
                          className={`${
                            timeFilter === 'this_month'
                              ? 'bg-blue-600 text-white font-bold border-blue-600 shadow-sm shadow-blue-100'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          } text-xs px-2.5 py-2 border rounded-full text-center transition-all whitespace-nowrap w-full`}
                        >
                          Tháng này
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setTimeFilter('last_month');
                            setIsTimeDropdownOpen(false);
                          }}
                          className={`${
                            timeFilter === 'last_month'
                              ? 'bg-blue-600 text-white font-bold border-blue-600 shadow-sm shadow-blue-100'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          } text-xs px-2.5 py-2 border rounded-full text-center transition-all whitespace-nowrap w-full`}
                        >
                          Tháng trước
                        </button>
                      </div>

                      {/* Theo quý */}
                      <div className="flex flex-col gap-2">
                        <span className="text-slate-400 font-bold text-[11px] uppercase tracking-wider whitespace-nowrap">Theo quý</span>
                        <button
                          type="button"
                          onClick={() => {
                            setTimeFilter('this_quarter');
                            setIsTimeDropdownOpen(false);
                          }}
                          className={`${
                            timeFilter === 'this_quarter'
                              ? 'bg-blue-600 text-white font-bold border-blue-600 shadow-sm shadow-blue-100'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          } text-xs px-2.5 py-2 border rounded-full text-center transition-all whitespace-nowrap w-full`}
                        >
                          Quý này
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setTimeFilter('last_quarter');
                            setIsTimeDropdownOpen(false);
                          }}
                          className={`${
                            timeFilter === 'last_quarter'
                              ? 'bg-blue-600 text-white font-bold border-blue-600 shadow-sm shadow-blue-100'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          } text-xs px-2.5 py-2 border rounded-full text-center transition-all whitespace-nowrap w-full`}
                        >
                          Quý trước
                        </button>
                      </div>

                      {/* Theo năm */}
                      <div className="flex flex-col gap-2">
                        <span className="text-slate-400 font-bold text-[11px] uppercase tracking-wider whitespace-nowrap">Theo năm</span>
                        <button
                          type="button"
                          onClick={() => {
                            setTimeFilter('this_year');
                            setIsTimeDropdownOpen(false);
                          }}
                          className={`${
                            timeFilter === 'this_year'
                              ? 'bg-blue-600 text-white font-bold border-blue-600 shadow-sm shadow-blue-100'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          } text-xs px-2.5 py-2 border rounded-full text-center transition-all whitespace-nowrap w-full`}
                        >
                          Năm này
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setTimeFilter('last_year');
                            setIsTimeDropdownOpen(false);
                          }}
                          className={`${
                            timeFilter === 'last_year'
                              ? 'bg-blue-600 text-white font-bold border-blue-600 shadow-sm shadow-blue-100'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          } text-xs px-2.5 py-2 border rounded-full text-center transition-all whitespace-nowrap w-full`}
                        >
                          Năm trước
                        </button>
                      </div>

                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="hidden md:flex gap-2">
            <Link
              to="/import"
              className="bg-indigo-50 text-indigo-600 border border-indigo-200 px-4 py-2 rounded-lg font-bold text-xs hover:bg-indigo-100 transition-colors shadow-sm flex items-center gap-2"
            >
              <Plus size={14} /> Nhập hàng
            </Link>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          <table className="w-full text-left border-collapse whitespace-nowrap hidden md:table">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 sticky top-0 z-10">
              <tr>
                <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-widest">
                  Mã phiếu
                </th>
                <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-widest">
                  Thời gian
                </th>
                <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-widest">
                  Nhà cung cấp
                </th>
                <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-widest">
                  Trạng thái
                </th>
                <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-widest text-right">
                  Tổng cộng
                </th>
                <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-widest text-right">
                  Thanh toán
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-24 italic text-slate-300 font-black uppercase tracking-widest text-xs opacity-50"
                  >
                    Danh sách phiếu nhập trống
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((order) => (
                  <tr
                    key={`desktop-order-${order.id}`} 
                    onClick={() => setSelectedOrder(order)}
                    className="hover:bg-blue-50/50 cursor-pointer transition-colors group"
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${order.total < 0 ? 'text-red-600' : 'text-blue-600'}`}>
                          {order.id}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-xs text-slate-500">
                      {order.date}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-800 text-sm">
                          {order.supplier}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      {order.returned ? (
                        <span className="bg-slate-50 text-slate-600 text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wider">
                          Đã trả
                        </span>
                      ) : order.debt > 0 ? (
                        <span className="bg-orange-50 text-orange-600 text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wider">
                          Còn nợ
                        </span>
                      ) : (
                        <span className="bg-emerald-50 text-emerald-600 text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wider">
                          Hoàn tất
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right font-black text-slate-800">
                      {formatNumber(order.total)}đ
                    </td>
                    <td className="py-4 px-4 text-right">
                      {order.paid > 0 ? (
                        order.walletId ? (
                        <div className="flex flex-col items-end">
                          <span className="text-xs font-bold text-blue-600">{wallets.find(w => w.id === order.walletId)?.name || 'Ví đã xóa'}</span>
                        </div>
                        ) : (
                          <span className="text-xs font-medium text-slate-400">Chưa ĐK</span>
                        )
                      ) : (
                        <span className="text-xs font-medium text-slate-400">Chưa TT</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Mobile Card View */}
          <div className="md:hidden bg-slate-50 p-4 space-y-4 flex-1 overflow-y-auto">
            {filteredOrders.length === 0 ? (
              <div className="text-center py-24 italic text-slate-300 font-black uppercase tracking-widest text-xs opacity-50">
                Danh sách phiếu nhập trống
              </div>
            ) : (
              paginatedOrders.map((order) => (
                <div
                  key={`mobile-order-${order.id}`} 
                  onClick={() => setSelectedOrder(order)}
                  className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6 active:border-blue-300 transition-colors cursor-pointer"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 pr-3">
                      <p className="font-bold text-slate-800 text-base leading-tight">{order.supplier}</p>
                      <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
                        <span className={`font-bold text-[10px] px-1.5 py-0.5 rounded border ${order.returned ? 'text-slate-600 border-slate-200 bg-slate-50' : 'text-slate-600 border-slate-200 bg-slate-50'} tracking-wider`}>
                          {order.id}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">· {order.date}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div>
                      {order.returned ? (
                        <span className="bg-slate-50 text-slate-600 text-[9px] px-2.5 py-1 rounded font-bold uppercase tracking-wider inline-block border border-slate-200">
                          Đã trả
                        </span>
                      ) : order.debt > 0 ? (
                        <span className="bg-orange-50 text-orange-600 text-[9px] px-2.5 py-1 rounded font-bold uppercase tracking-wider inline-block border border-orange-100">
                          Còn Nợ
                        </span>
                      ) : (
                        <span className="bg-emerald-50 text-emerald-600 text-[9px] px-2.5 py-1 rounded font-bold uppercase tracking-wider inline-block border border-emerald-100">
                          Hoàn Tất
                        </span>
                      )}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-end border-t border-slate-100 pt-3">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                         <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-[10px] font-bold">
                           {order.items.length}
                         </span>
                         <span className="text-xs font-semibold text-slate-500">Mặt hàng</span>
                      </div>
                      {order.paid > 0 && order.walletId && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <Wallet size={12} className="text-blue-500" />
                          <span className="text-[10px] font-bold text-slate-600">{wallets.find(w => w.id === order.walletId)?.name || 'Ví đã xóa'}</span>
                        </div>
                      )}
                    </div>
                    <p className={`font-black ${order.returned ? 'text-slate-800' : 'text-blue-600'} text-lg leading-none`}>
                      {formatNumber(order.total)}đ
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pagination */}
        {filteredOrders.length > 0 && (
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
                {startIndex + 1} - {Math.min(endIndex, filteredOrders.length)}{" "}
                trên tổng {filteredOrders.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed bg-white transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="px-3 font-medium text-slate-700">
                  {currentPage} / {totalPages || 1}
                </span>
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
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

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center md:p-4 p-0 bg-slate-900/60 backdrop-blur-sm print:hidden">
          <div className="bg-white w-full max-w-5xl md:rounded-2xl rounded-none shadow-2xl overflow-hidden flex flex-col h-full md:h-auto md:max-h-[90vh] animate-in fade-in zoom-in duration-300">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg">
                  <Truck size={20} />
                </div>
                <div>
                  <h3 className="md:text-xl text-lg font-bold text-slate-800 tracking-tighter">
                    Chi tiết phiếu nhập
                  </h3>
                  <p className="md:text-sm text-[10px] font-bold text-blue-600 uppercase tracking-widest">
                    Mã: {selectedOrder.id}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePrint(selectedOrder)}
                  className="w-8 h-8 bg-white text-slate-400 rounded-full hover:bg-slate-200 transition-colors flex items-center justify-center shadow-sm border border-slate-100"
                >
                  <Printer size={16} />
                </button>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="w-8 h-8 bg-white text-slate-400 rounded-full hover:bg-slate-200 transition-colors flex items-center justify-center shadow-sm border border-slate-100"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-4 md:p-6 overflow-y-auto flex-1 space-y-4 md:space-y-6">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                <div className="flex items-start gap-2.5">
                  <Truck className="text-blue-500 shrink-0 mt-0.5" size={14} />
                  <div className="min-w-0">
                    <p className="md:text-xs text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">
                      Nhà cung cấp
                    </p>
                    <p className="md:text-base text-xs font-black text-slate-800 leading-tight truncate">
                      {selectedOrder.supplier}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Calendar
                    className="text-slate-400 shrink-0 mt-0.5"
                    size={14}
                  />
                  <div className="min-w-0 flex-1 flex items-center gap-2">
                    <p className="md:text-xs text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
                      Ngày nhập:
                    </p>
                    <p className="md:text-base text-xs font-bold text-slate-700 leading-none">
                      {selectedOrder.date}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border border-slate-100 rounded-lg overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 flex items-center gap-2">
                  <Package className="text-slate-400" size={14} />
                  <span className="md:text-sm text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    Danh sách mặt hàng
                  </span>
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-50">
                        <th className="px-4 py-3 md:text-sm text-[9px] font-bold text-slate-400 uppercase">
                          Sản phẩm
                        </th>
                        <th className="px-4 py-3 md:text-sm text-[9px] font-bold text-slate-400 uppercase text-center">
                          SL
                        </th>
                        <th className="px-4 py-3 md:text-sm text-[9px] font-bold text-slate-400 uppercase text-right">
                          Giá nhập
                        </th>
                        <th className="px-4 py-3 md:text-sm text-[9px] font-bold text-slate-400 uppercase text-right">
                          Thành tiền
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {selectedOrder.items.map((item, idx) => {
                        const product = products?.find((p) => p.id === item.id);
                        return (
                          <tr key={`imp-item-${item.id}-${idx}`}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center shrink-0 border border-blue-100 overflow-hidden">
                                  {product?.image ? (
                                    <img
                                      src={product.image}
                                      alt={item.name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <Package size={20} className="text-blue-400" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="md:text-base text-xs font-bold text-slate-800 tracking-tighter truncate">
                                    {item.name}
                                  </p>
                                  <div className="flex flex-wrap gap-2 mt-1">
                                    {item.sn && (
                                      <div className="flex flex-wrap gap-1">
                                        {(typeof item.sn === "string"
                                          ? item.sn.split(",")
                                          : item.sn
                                        ).map((sn: string, sIdx: number) => (
                                          <span
                                            key={`sn-${sn}-${sIdx}`}
                                            className="md:text-sm text-[13px] bg-orange-50 text-orange-600 px-2 py-0.5 rounded font-mono font-bold border border-orange-100 uppercase"
                                          >
                                            {sn.trim()}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center md:text-sm text-xs font-bold text-slate-600">
                              {item.qty} {item.unit}
                            </td>
                            <td className="px-4 py-3 text-right md:text-sm text-xs font-bold text-slate-600">
                              {formatNumber(item.price)}đ
                            </td>
                            <td className="px-4 py-3 text-right md:text-sm text-xs font-bold text-slate-800">
                              {formatNumber(item.qty * item.price)}đ
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card List View */}
                <div className="md:hidden divide-y divide-slate-100 bg-white">
                  {selectedOrder.items.map((item, idx) => {
                    const product = products?.find((p) => p.id === item.id);
                    return (
                      <div key={`mobile-imp-item-${item.id}-${idx}`} className="p-4 flex gap-4">
                        <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center shrink-0 border border-blue-100 overflow-hidden mt-1">
                          {product?.image ? (
                            <img
                              src={product.image}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Package size={24} className="text-blue-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-slate-800 leading-snug break-words">
                            {item.name}
                          </p>
                          <p className="text-[11px] text-slate-400 font-medium mb-1.5 uppercase tracking-wide">
                            {item.id}
                          </p>

                          {item.sn && (
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mb-2 border-l-2 border-slate-200 pl-2">
                              <div className="flex flex-wrap items-center gap-1">
                                <span className="text-[10px] text-slate-400 font-bold uppercase">
                                  IMEI/SN:
                                </span>
                                <div className="flex flex-wrap gap-x-1">
                                  {(typeof item.sn === "string"
                                    ? item.sn.split(",")
                                    : item.sn
                                  ).map(
                                    (sn: string, sIdx: number, arr: any[]) => (
                                      <span
                                        key={`mobile-sn-${sn}-${sIdx}`}
                                        className="text-[11px] text-slate-600 font-mono font-bold"
                                      >
                                        {sn.trim()}
                                        {sIdx < arr.length - 1 ? "," : ""}
                                      </span>
                                    ),
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="flex justify-between items-end mt-1">
                            <p className="text-sm text-slate-600 font-medium">
                              {formatNumber(item.price)}{" "}
                              <span className="text-slate-400 text-xs mx-1">
                                x
                              </span>{" "}
                              {item.qty} {item.unit}
                            </p>
                            <p className="font-black text-slate-800 text-base">
                              {formatNumber(item.qty * item.price)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-blue-50/50 p-6 rounded-xl border border-blue-100 space-y-3">
                <div className="flex justify-between items-center text-slate-600">
                  <span className="md:text-sm text-[11px] font-bold">Tổng tiền hàng</span>
                  <span className="md:text-base text-sm font-bold">
                    {formatNumber(
                      selectedOrder.total - (selectedOrder.shippingFee || 0),
                    )}
                    đ
                  </span>
                </div>

                {selectedOrder.shippingFee && (
                  <div className="flex justify-between items-center text-orange-500">
                    <span className="md:text-sm text-[11px] font-bold">
                      Phí vận chuyển
                    </span>
                    <span className="md:text-base text-sm font-bold">
                      +{formatNumber(selectedOrder.shippingFee)}đ
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-3 border-t border-blue-200">
                  <div className="flex items-center gap-2">
                    <Wallet className="text-blue-600" size={18} />
                    <span className="md:text-base text-[13px] font-bold text-blue-800">
                      Tổng thanh toán
                    </span>
                  </div>
                  <span className="md:text-3xl text-2xl font-bold text-blue-600 tracking-tighter">
                    {formatNumber(selectedOrder.total)}đ
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-4 border-t border-blue-200">
                  <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 flex justify-between items-center">
                    <div className="flex flex-col">
                      <p className="md:text-xs text-[9px] font-bold text-emerald-600">
                        Đã thanh toán
                      </p>
                      {selectedOrder.paid > 0 && selectedOrder.walletId && (
                        <span className="md:text-xs block text-[8px] font-medium text-emerald-500 mt-0.5">
                          ({wallets.find(w => w.id === selectedOrder.walletId)?.name || 'Ví đã xóa'})
                        </span>
                      )}
                    </div>
                    <p className="md:text-lg text-sm font-bold text-emerald-700">
                      {formatNumber(selectedOrder.paid)}đ
                    </p>
                  </div>
                  <div className="bg-red-50/50 p-3 rounded-xl border border-red-100 flex justify-between items-center">
                    <p className="md:text-xs text-[9px] font-bold text-red-600">Còn nợ</p>
                    <p className="md:text-lg text-sm font-bold text-red-700">
                      {formatNumber(selectedOrder.debt)}đ
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons Section */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                {selectedOrder.debt > 0 && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setPaymentAmount(selectedOrder.debt.toString());
                      setIsPaymentModalOpen(true);
                    }}
                    className="flex items-center justify-center gap-2 py-3 bg-emerald-600 text-white font-bold rounded-xl md:text-base text-[13px] shadow-lg shadow-emerald-100 active:scale-95"
                  >
                    <Wallet size={16} /> Thanh toán
                  </button>
                )}
                <button
                  onClick={() => handleReturnOrder(selectedOrder)}
                  className="flex items-center justify-center gap-2 py-3 bg-orange-50 border border-orange-200 text-orange-600 font-bold rounded-xl md:text-base text-[13px] active:scale-95 hover:bg-orange-100"
                >
                  <RotateCcw size={16} /> Trả hàng
                </button>
                <button
                  onClick={() => handleOpenOrder(selectedOrder)}
                  className="col-span-2 md:col-auto flex items-center justify-center gap-2 py-3 bg-blue-50 border border-blue-200 text-blue-600 font-bold rounded-xl md:text-base text-[13px] active:scale-95 hover:bg-blue-100 shadow-sm"
                >
                  <ExternalLink size={16} /> Sửa phiếu
                </button>
              </div>
            </div>

            <div className="p-4 md:p-6 border-t border-slate-100 bg-slate-50 space-y-3 shrink-0 md:hidden">
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-full py-3 bg-[#991b1b] text-white font-bold rounded-xl md:text-base text-[13px] hover:bg-[#7f1d1d] transition-colors shadow-lg shadow-red-100 active:scale-95"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {isPaymentModalOpen && selectedOrder && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4"
          style={{ zIndex: 120 }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                  <Wallet size={20} />
                </div>
                <div>
                  <h2 className="md:text-xl text-lg font-bold text-slate-800">
                    Thanh toán phiếu nhập
                  </h2>
                  <p className="md:text-sm text-xs font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                    {selectedOrder.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-500 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block md:text-sm text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                  Số tiền còn nợ
                </label>
                <div className="md:text-3xl text-2xl font-bold text-red-600">
                  {formatNumber(selectedOrder.debt)}đ
                </div>
              </div>
              <div>
                <label className="block md:text-sm text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                  Số tiền thanh toán
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formatNumber(
                      Number(paymentAmount.replace(/[^0-9]/g, "")),
                    )}
                    onChange={(e) =>
                      setPaymentAmount(e.target.value.replace(/[^0-9]/g, ""))
                    }
                    className="w-full pl-4 pr-12 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:ring-0 focus:border-emerald-500 font-bold text-slate-800 md:text-2xl text-lg transition-colors"
                    placeholder="0"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                    đ
                  </span>
                </div>
              </div>
              <div>
                <label className="block md:text-sm text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                  Ví thanh toán
                </label>
                <select
                  value={paymentWalletId || ""}
                  onChange={(e) => setPaymentWalletId(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:ring-0 focus:border-emerald-500 font-bold text-slate-800 md:text-base text-sm transition-colors cursor-pointer appearance-none"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: `right 0.5rem center`,
                    backgroundRepeat: `no-repeat`,
                    backgroundSize: `1.5em 1.5em`,
                    paddingRight: `2.5rem`,
                  }}
                >
                  <option value="" disabled>
                    Chọn ví
                  </option>
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex gap-3 bg-slate-50/50">
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="flex-1 py-3 bg-white border-2 border-slate-200 text-slate-600 rounded-xl font-bold uppercase md:text-base text-sm tracking-widest hover:bg-slate-50 transition-all active:scale-95"
              >
                Hủy
              </button>
              <button
                onClick={handlePayment}
                disabled={
                  !paymentAmount ||
                  Number(paymentAmount.replace(/[^0-9]/g, "")) <= 0
                }
                className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold uppercase md:text-base text-sm tracking-widest shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {printData && <PrintTemplate {...printData} />}

      {/* Mobile Floating Action Button */}
      <Link
        to="/import"
        className="md:hidden fixed bottom-24 right-4 w-14 h-14 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-indigo-200 z-40 active:scale-95 transition-transform"
      >
        <Plus size={24} />
      </Link>
    </div>
  );
};
