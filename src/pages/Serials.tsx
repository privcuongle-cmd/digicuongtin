import React, { useState, useMemo, useEffect } from 'react';
import { Search, Package, Database, Trash2, Hash, Calendar, ShoppingCart, User, ArrowLeftRight, Clock, CheckCircle2, XCircle, RefreshCw, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAppContext } from '../context/AppContext';
import { Serial, Product } from '../types';
import { formatNumber, parseDateString } from '../lib/utils';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { useMobileBackModal } from '../hooks/useMobileBackModal';

const ITEMS_PER_PAGE = 50;

export const Serials: React.FC = () => {
  const { serials, products, removeSerial, invoices, importOrders, returnImportOrders, returnSalesOrders } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AVAILABLE' | 'SOLD'>('ALL');
  const [selectedSerial, setSelectedSerial] = useState<Serial | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Handle Escape key
  useEscapeKey(() => setSelectedSerial(null), !!selectedSerial);

  const getProductName = (prodId: string) => {
    return products.find(p => p.id === prodId)?.name || prodId;
  };

  const filteredSerials = useMemo(() => {
    let result = serials || [];

    // Filter by status if not ALL
    if (statusFilter !== 'ALL') {
      result = result.filter(s => (s.status || 'AVAILABLE') === statusFilter);
    }

    const term = searchTerm.toLowerCase();
    const filtered = !searchTerm.trim() ? result : result.filter(s => 
      (s.sn || '').toLowerCase().includes(term) ||
      (s.prodId || '').toLowerCase().includes(term) ||
      getProductName(s.prodId).toLowerCase().includes(term) ||
      (s.supplier || '').toLowerCase().includes(term) ||
      (s.refId || '').toLowerCase().includes(term)
    );
    
    return [...filtered].sort((a, b) => parseDateString(b.date) - parseDateString(a.date));
  }, [serials, searchTerm, statusFilter, products]);

  // Reset page on search or filter
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const totalPages = Math.ceil(filteredSerials.length / ITEMS_PER_PAGE);
  const paginatedSerials = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredSerials.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredSerials, currentPage]);

  const handleDelete = (sn: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa Serial ${sn}?`)) {
      removeSerial(sn);
    }
  };

  const getSerialHistory = (sn: string) => {
    const history: any[] = [];

    // Import history
    const importOrder = importOrders.find(order => 
      order.items.some(item => item.sn?.includes(sn))
    );
    if (importOrder) {
      history.push({
        type: 'NHAP',
        date: importOrder.date,
        partner: importOrder.supplier,
        refId: importOrder.id,
        priceBySer: serials.find(s => s.sn === sn)?.importPrice || 0
      });
    }

    // Invoice history
    const invoice = invoices.find(inv => 
      inv.items.some(item => {
        if (Array.isArray(item.sn)) return item.sn.includes(sn);
        if (typeof item.sn === 'string') return item.sn.split(',').map(s => s.trim()).includes(sn);
        return false;
      })
    );
    if (invoice) {
      const item = invoice.items.find(item => {
        if (Array.isArray(item.sn)) return item.sn.includes(sn);
        if (typeof item.sn === 'string') return item.sn.split(',').map(s => s.trim()).includes(sn);
        return false;
      });
      history.push({
        type: 'XUAT',
        date: invoice.date,
        partner: invoice.customer,
        refId: invoice.id,
        price: item?.price || 0
      });
    }

    // Return Import history
    const returnImport = returnImportOrders.find(order => 
      order.items.some(item => item.sn?.includes(sn))
    );
    if (returnImport) {
      history.push({
        type: 'TRA_NHAP',
        date: returnImport.date,
        partner: returnImport.supplier,
        refId: returnImport.id
      });
    }

    // Return Sales history
    const returnSales = returnSalesOrders.find(order => 
      order.items.some(item => {
        if (Array.isArray(item.sn)) return item.sn.includes(sn);
        if (typeof item.sn === 'string') return item.sn.split(',').map(s => s.trim()).includes(sn);
        return false;
      })
    );
    if (returnSales) {
      history.push({
        type: 'TRA_BAN',
        date: returnSales.date,
        partner: returnSales.customer,
        refId: returnSales.id
      });
    }

    return history.sort((a, b) => parseDateString(b.date) - parseDateString(a.date));
  };

  useMobileBackModal(!!selectedSerial, () => setSelectedSerial(null));

  return (
    <div className="flex flex-col h-[calc(100vh-[96px])] bg-white md:rounded-xl shadow-sm border border-slate-200 md:m-6 overflow-hidden">
      {/* Toolbar */}
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-slate-50 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-md shrink-0">
            <Hash size={20} />
          </div>
          <div>
            <h1 className="text-lg font-normal text-slate-800 tracking-tight">Quản lý Serial</h1>
            <p className="text-xs text-slate-500 font-normal">Theo dõi chi tiết số serial sản phẩm</p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex bg-white rounded-lg border border-slate-200 p-1 shadow-sm">
            <button 
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${statusFilter === 'ALL' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              Tất cả
            </button>
            <button 
              onClick={() => setStatusFilter('AVAILABLE')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${statusFilter === 'AVAILABLE' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              Còn kho
            </button>
            <button 
              onClick={() => setStatusFilter('SOLD')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${statusFilter === 'SOLD' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              Đã bán
            </button>
          </div>

          <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 flex items-center gap-2 focus-within:border-indigo-500 transition-colors w-full sm:w-80 shadow-sm relative">
            <Search size={18} className="text-slate-400 shrink-0" />
            <input 
              type="text"
              placeholder="Tìm theo serial, mã SP, tên SP..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent text-sm outline-none font-medium"
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto bg-slate-50 md:bg-white">
        {/* Desktop View */}
        <table className="w-full text-left border-collapse hidden md:table">
          <thead className="sticky top-0 bg-white z-10 shadow-sm">
            <tr className="text-slate-500 text-[11px] font-black uppercase tracking-widest border-b border-slate-100">
              <th className="p-4 w-12 text-center">#</th>
              <th className="p-4">Serial Number</th>
              <th className="p-4">Sản phẩm</th>
              <th className="p-4 text-center">Trạng thái</th>
              <th className="p-4">Ngày nhập</th>
              <th className="p-4">Nguồn nhập</th>
              <th className="p-4 text-right">Giá nhập</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-sm">
            {paginatedSerials.length > 0 ? (
              paginatedSerials.map((s, idx) => (
                <tr 
                  key={`desktop-ser-${s.sn}-${s.prodId}`} 
                  onClick={() => setSelectedSerial(s)}
                  className="hover:bg-indigo-50/30 transition-colors group cursor-pointer border-l-4 border-l-transparent hover:border-l-indigo-600"
                >
                  <td className="p-4 text-center text-slate-400 font-medium">{(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}</td>
                  <td className="p-4 font-mono font-normal text-indigo-700 tracking-tight flex items-center gap-2">
                    {s.sn}
                    <div className="relative group/qr-sn">
                      <QrCode 
                        size={14} 
                        className="text-slate-300 hover:text-blue-500 cursor-pointer" 
                      />
                      <div className="hidden group-hover/qr-sn:block absolute z-[60] left-0 top-full mt-1 p-3 bg-white rounded-xl shadow-2xl border border-slate-100 min-w-[180px] text-center">
                        <div className="text-[10px] font-normal text-slate-400 uppercase tracking-wider mb-2">QR Serial</div>
                        <div className="bg-white p-2 rounded-lg border border-slate-100 shadow-inner inline-block">
                          <QRCodeSVG value={s.sn} size={140} />
                        </div>
                        <div className="mt-2 text-[11px] font-mono font-normal text-slate-600 bg-slate-50 py-1 rounded">{s.sn}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <p className="font-normal text-slate-800 line-clamp-1">{getProductName(s.prodId)}</p>
                    <p className="text-[10px] text-slate-400 font-normal uppercase tracking-tight">{s.prodId}</p>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter border ${
                      s.status !== 'SOLD' 
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                        : 'bg-rose-50 text-rose-600 border-rose-100'
                    }`}>
                      {s.status !== 'SOLD' ? 'Còn kho' : 'Đã bán'}
                    </span>
                  </td>
                  <td className="p-4 text-slate-500 font-medium">
                    {s.date}
                    {s.refId && <p className="text-[10px] font-bold text-indigo-400">{s.refId}</p>}
                  </td>
                  <td className="p-4 text-slate-600 font-normal truncate max-w-[150px]">{s.supplier}</td>
                  <td className="p-4 text-right font-normal text-slate-700">{formatNumber(s.importPrice)}đ</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="p-16 text-center text-slate-400">
                  <Database size={48} className="mx-auto mb-4 opacity-10" />
                  <p className="font-bold text-lg text-slate-300 uppercase tracking-widest">Không có dữ liệu</p>
                  <p className="text-sm mt-1">Sử dụng bộ lọc hoặc nhập hàng để tạo Serial.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Mobile View */}
        <div className="md:hidden grid grid-cols-1 gap-3 p-3 pb-20">
          {paginatedSerials.length > 0 ? (
            paginatedSerials.map((s) => (
              <div 
                key={`mobile-ser-${s.sn}-${s.prodId}`}
                onClick={() => setSelectedSerial(s)}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm active:bg-slate-50 transition-colors"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="min-w-0">
                    <span className="inline-block bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-mono text-xs font-black border border-indigo-100 mb-1">
                      {s.sn}
                    </span>
                    <h3 className="font-bold text-slate-800 text-sm line-clamp-1">{getProductName(s.prodId)}</h3>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter border shrink-0 ${
                    s.status !== 'SOLD' 
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                      : 'bg-rose-50 text-rose-600 border-rose-100'
                  }`}>
                    {s.status !== 'SOLD' ? 'Còn kho' : 'Đã bán'}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-y-2 text-[11px] font-bold border-t border-slate-50 pt-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-slate-400 uppercase tracking-tighter">Ngày nhập:</span>
                    <span className="text-slate-600">{s.date}</span>
                  </div>
                  <div className="flex flex-col gap-0.5 text-right">
                    <span className="text-slate-400 uppercase tracking-tighter">Giá nhập:</span>
                    <span className="text-rose-600">{formatNumber(s.importPrice)}đ</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-slate-400 uppercase tracking-tighter">Mã nhập:</span>
                    <span className="text-indigo-600">{s.refId}</span>
                  </div>
                  <div className="flex flex-col gap-0.5 text-right">
                    <span className="text-slate-400 uppercase tracking-tighter">Thanh toán:</span>
                    <span className="text-slate-600 truncate">{s.supplier}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
             <div className="p-16 text-center text-slate-400">
              <Database size={48} className="mx-auto mb-4 opacity-10" />
              <p className="font-bold uppercase tracking-widest">Không có dữ liệu</p>
            </div>
          )}
        </div>
      </div>

      {/* Pagination Footer */}
      {filteredSerials.length > 0 && (
        <div className="p-4 border-t border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
            Hiển thị <span className="text-slate-800">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> - <span className="text-slate-800">{Math.min(currentPage * ITEMS_PER_PAGE, filteredSerials.length)}</span> trong <span className="text-indigo-600">{filteredSerials.length}</span> kết quả
          </div>
          
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
              <ChevronsLeft size={16} />
            </button>
            <button 
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            
            <div className="flex items-center px-4 h-8 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black text-indigo-600">
              {currentPage} / {totalPages}
            </div>

            <button 
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
              <ChevronRight size={16} />
            </button>
            <button 
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
              <ChevronsRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedSerial && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md md:p-4">
          <div className="bg-slate-50 w-full max-w-2xl h-full md:h-auto md:max-h-[85vh] md:rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            {/* Modal headers and content remains same... */}
            <div className="bg-white p-5 border-b border-slate-200 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                  <Hash size={20} />
                </div>
                <div>
                  <h3 className="md:text-xl text-lg font-black text-slate-800 tracking-tighter uppercase">{selectedSerial.sn}</h3>
                  <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">{getProductName(selectedSerial.prodId)}</p>
                </div>
              </div>
              <button onClick={() => setSelectedSerial(null)} className="w-9 h-9 bg-slate-100 text-slate-400 rounded-full hover:bg-slate-200 transition-colors flex items-center justify-center">
                <Database size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Thông tin Serial</p>
                  <div className="space-y-2">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-slate-400 uppercase font-black tracking-tighter">Ngày nhập</span>
                      <span className="text-sm font-bold text-slate-800">{selectedSerial.date}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] text-slate-400 uppercase font-black tracking-tighter">Mã tham chiếu</span>
                      <span className="text-sm font-bold text-indigo-600">{selectedSerial.refId}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] text-slate-400 uppercase font-black tracking-tighter">Giá nhập</span>
                      <span className="text-sm font-black text-rose-600">{formatNumber(selectedSerial.importPrice)}đ</span>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Sản phẩm & Đối tác</p>
                  <div className="space-y-2">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-slate-400 uppercase font-black tracking-tighter">Mã sản phẩm</span>
                      <span className="text-sm font-bold text-slate-800">{selectedSerial.prodId}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] text-slate-400 uppercase font-black tracking-tighter">Trạng thái</span>
                      <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full w-fit ${
                        selectedSerial.status !== 'SOLD' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                      }`}>
                        {selectedSerial.status !== 'SOLD' ? 'Còn kho' : 'Đã bán'}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] text-slate-400 uppercase font-black tracking-tighter">Nhà cung cấp</span>
                      <span className="text-sm font-bold text-slate-800 line-clamp-1">{selectedSerial.supplier}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Clock size={12} /> Lịch sử luân chuyển
                </h4>
                <div className="space-y-3">
                  {getSerialHistory(selectedSerial.sn).length === 0 ? (
                    <div className="p-8 text-center bg-white rounded-xl border border-dashed border-slate-200">
                      <p className="text-xs text-slate-400 font-bold italic">Không có dữ liệu lịch sử</p>
                    </div>
                  ) : (
                    getSerialHistory(selectedSerial.sn).map((h, i) => (
                      <div key={`history-${h.id}-${i}`} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 hover:border-indigo-200 transition-colors">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          h.type === 'NHAP' ? 'bg-emerald-50 text-emerald-600' :
                          h.type === 'XUAT' ? 'bg-rose-50 text-rose-600' :
                          'bg-indigo-50 text-indigo-600'
                        }`}>
                          {h.type === 'NHAP' ? <CheckCircle2 size={18} /> : 
                           h.type === 'XUAT' ? <ShoppingCart size={18} /> : 
                           <RefreshCw size={18}/>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                                {h.type === 'NHAP' ? 'Nhập hàng' : 
                                 h.type === 'XUAT' ? 'Xuất bán' : 
                                 h.type === 'TRA_NHAP' ? 'Trả hàng nhập' : 'Trả hàng bán'}
                              </p>
                              <p className="text-sm font-bold text-slate-800">{h.partner}</p>
                            </div>
                            <p className="text-[10px] font-bold text-slate-400">{h.date}</p>
                          </div>
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-tighter">
                              {h.refId}
                            </span>
                            {h.price && <span className="text-xs font-black text-indigo-700">{formatNumber(h.price)}đ</span>}
                            {h.priceBySer && <span className="text-xs font-black text-emerald-600">{formatNumber(h.priceBySer)}đ</span>}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 bg-white flex justify-end shrink-0">
              <button 
                onClick={() => setSelectedSerial(null)}
                className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 text-white font-black rounded-xl uppercase text-[11px] tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-[0.98]"
              >
                <XCircle size={14} /> Đóng cửa sổ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
