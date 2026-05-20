import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Filter, ChevronDown, FileText, Star, RotateCcw, X, Calendar, User, Package, Printer, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { ReturnSalesOrder } from '../types';
import { formatNumber, parseDateString } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { useScrollLock } from '../hooks/useScrollLock';
import { useMobileBackModal } from '../hooks/useMobileBackModal';

export const ReturnSales: React.FC = () => {
  const { returnSalesOrders } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const [selectedOrder, setSelectedOrder] = useState<ReturnSalesOrder | null>(null);
  
  useMobileBackModal(!!selectedOrder, () => setSelectedOrder(null));

  // Use scroll lock for modal
  useScrollLock(!!selectedOrder);

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  const filteredOrders = (returnSalesOrders || []).filter(o => 
    o.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
    o.customer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, rowsPerPage]);

  const totalPages = Math.ceil(filteredOrders.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedOrders = useMemo(() => {
    return filteredOrders
      .sort((a, b) => parseDateString(b.date) - parseDateString(a.date))
      .slice(startIndex, endIndex);
  }, [filteredOrders, startIndex, endIndex]);

  const totalGoods = filteredOrders.reduce((sum, o) => sum + o.totalGoods, 0);
  const totalDiscount = filteredOrders.reduce((sum, o) => sum + o.discount, 0);
  const totalDue = filteredOrders.reduce((sum, o) => sum + o.total, 0);
  const totalPaid = filteredOrders.reduce((sum, o) => sum + o.paid, 0);

  return (
    <div className="flex flex-col bg-slate-50 md:bg-white">
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 shrink-0 bg-white border-b border-slate-200">
        <div className="flex-1 max-w-md bg-slate-100 px-4 py-2 rounded-lg border border-transparent focus-within:border-blue-400 focus-within:bg-white transition-all flex items-center gap-3">
          <Search className="text-slate-400" size={18} />
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Theo mã phiếu trả / khách hàng" 
            className="flex-1 bg-transparent text-sm font-medium outline-none"
          />
          <Filter className="text-slate-400 cursor-pointer hover:text-blue-600" size={18} />
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => navigate('/create-return-sales')}
            className="px-4 py-2 bg-white border border-blue-600 text-blue-600 rounded-lg shadow-sm flex items-center gap-2 font-bold text-sm hover:bg-blue-50 transition-all"
          >
            <Plus size={18} /> Trả hàng bán
          </button>
          
          <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg shadow-sm flex items-center gap-2 font-bold text-sm hover:bg-slate-50 transition-all">
            <FileText size={18} /> Xuất file <ChevronDown size={16} />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col">
        <div className="hidden md:block flex-1">
          <table className="w-full border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-white border-b border-slate-200">
              <tr className="text-slate-700 text-[13px] font-bold">
                <th className="p-3 w-10"></th>
                <th className="p-3">Mã trả hàng</th>
                <th className="p-3">Thời gian</th>
                <th className="p-3">Khách hàng</th>
                <th className="p-3 text-right">Tổng tiền hàng</th>
                <th className="p-3 text-right">Giảm giá</th>
                <th className="p-3 text-right">Cần trả khách</th>
                <th className="p-3 text-right">Đã trả khách</th>
                <th className="p-3 text-right">Trạng thái</th>
              </tr>
              <tr className="bg-slate-50/50 text-slate-800 text-[13px] font-bold border-b border-slate-100">
                <td colSpan={4}></td>
                <td className="p-3 text-right">{formatNumber(totalGoods)}</td>
                <td className="p-3 text-right">{formatNumber(totalDiscount)}</td>
                <td className="p-3 text-right">{formatNumber(totalDue)}</td>
                <td className="p-3 text-right">{formatNumber(totalPaid)}</td>
                <td></td>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedOrders.map(o => (
                <tr 
                  key={`desktop-ret-${o.id}`} 
                  onClick={() => setSelectedOrder(o)}
                  className="hover:bg-blue-50/30 transition-colors cursor-pointer text-[13px] text-slate-600 group"
                >
                  <td className="p-3"><Star size={16} className="text-slate-300 group-hover:text-amber-400 transition-colors" /></td>
                  <td className="p-3 font-medium text-blue-600">{o.id}</td>
                  <td className="p-3">{o.date}</td>
                  <td className="p-3 font-medium text-slate-800">{o.customer}</td>
                  <td className="p-3 text-right font-normal">{formatNumber(o.totalGoods)}</td>
                  <td className="p-3 text-right">{formatNumber(o.discount)}</td>
                  <td className="p-3 text-right font-normal text-slate-800">{formatNumber(o.total)}</td>
                  <td className="p-3 text-right font-normal text-slate-800">{formatNumber(o.paid)}</td>
                  <td className="p-3 text-right">
                    <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded">
                      Đã nhận hàng
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredOrders.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <RotateCcw size={48} className="mb-4 opacity-20" />
              <p className="italic">Chưa có phiếu trả hàng bán nào</p>
            </div>
          )}
        </div>

        {/* Mobile View */}
        <div className="md:hidden flex-1 overflow-y-auto p-4 space-y-4">
          {filteredOrders.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-10 text-slate-400">
               <RotateCcw size={48} className="mb-4 opacity-20" />
               <p className="italic text-sm">Chưa có phiếu trả hàng bán nào</p>
             </div>
          ) : (
            paginatedOrders.map(o => (
              <div 
              key={`mobile-ret-${o.id}`} 
              onClick={() => setSelectedOrder(o)}
              className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-blue-600 font-bold text-sm">{o.id}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{o.date}</p>
                </div>
                <span className="bg-emerald-100 text-emerald-700 text-[8px] font-bold px-2 py-0.5 rounded uppercase">Đã nhận hàng</span>
              </div>
                <div className="flex justify-between items-center">
                  <p className="text-sm font-normal text-slate-700">{o.customer}</p>
                <p className="text-sm font-black text-slate-800">{formatNumber(o.total)}đ</p>
              </div>
            </div>
          )))}
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
                {startIndex + 1} - {Math.min(endIndex, filteredOrders.length)} trên tổng {filteredOrders.length}
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

      {/* Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center md:p-4 p-0 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-5xl md:rounded-xl rounded-none shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col h-full md:h-auto md:max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg">
                  <RotateCcw size={20} />
                </div>
                <div>
                  <h3 className="md:text-xl text-lg font-black text-slate-800 tracking-tighter uppercase">Chi tiết trả hàng bán</h3>
                  <p className="md:text-xs text-[10px] font-bold text-blue-600 uppercase tracking-widest">Mã: {selectedOrder.id}</p>
                </div>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="w-8 h-8 bg-white text-slate-400 rounded-full hover:bg-slate-200 transition-colors flex items-center justify-center shadow-sm border border-slate-100">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 flex items-center gap-3">
                  <Calendar className="text-slate-400" size={18} />
                  <div>
                    <p className="md:text-xs text-[9px] font-bold text-slate-400 uppercase tracking-widest">Ngày trả hàng</p>
                    <p className="md:text-sm text-xs font-black text-slate-800">{selectedOrder.date}</p>
                  </div>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 flex items-center gap-3">
                  <User className="text-slate-400" size={18} />
                  <div>
                    <p className="md:text-xs text-[9px] font-bold text-slate-400 uppercase tracking-widest">Khách hàng</p>
                    <p className="md:text-sm text-xs font-black text-slate-800 uppercase">{selectedOrder.customer}</p>
                  </div>
                </div>
              </div>
              <div className="border border-slate-100 rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 md:text-sm text-[9px] font-black text-slate-400 uppercase">Sản phẩm</th>
                      <th className="px-4 py-3 md:text-sm text-[9px] font-black text-slate-400 uppercase text-center">SL</th>
                      <th className="px-4 py-3 md:text-sm text-[9px] font-black text-slate-400 uppercase text-right">Giá trả</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {selectedOrder.items.map((item, idx) => (
                      <tr key={`ret-sales-item-${item.id}-${idx}`}>
                        <td className="px-4 py-3">
                          <p className="md:text-base text-xs font-black text-slate-800 uppercase tracking-tighter">{item.name}</p>
                          {item.sn && <p className="md:text-xs text-[8px] text-orange-500 font-bold mt-0.5 font-mono uppercase">SN: {Array.isArray(item.sn) ? item.sn.join(', ') : item.sn}</p>}
                        </td>
                        <td className="px-4 py-3 text-center md:text-base text-xs font-black text-slate-600">{item.qty}</td>
                        <td className="px-4 py-3 text-right md:text-base text-xs font-black text-slate-800">{formatNumber(item.price)}đ</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="bg-blue-50/50 p-6 rounded-xl border border-blue-100 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="md:text-base text-xs font-bold text-slate-500 uppercase tracking-widest">Tổng tiền hàng</span>
                  <span className="md:text-lg text-sm font-bold text-slate-800">{formatNumber(selectedOrder.totalGoods)}đ</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="md:text-base text-xs font-bold text-slate-500 uppercase tracking-widest">Giảm giá</span>
                  <span className="md:text-lg text-sm font-bold text-slate-800">{formatNumber(selectedOrder.discount)}đ</span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-blue-200">
                  <span className="md:text-lg text-sm font-black text-blue-800 uppercase tracking-widest">Cần trả khách</span>
                  <span className="md:text-3xl text-2xl font-black text-blue-600 tracking-tighter">{formatNumber(selectedOrder.total)}đ</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="md:text-lg text-sm font-black text-emerald-800 uppercase tracking-widest">Đã trả khách</span>
                  <span className="md:text-2xl text-xl font-black text-emerald-600 tracking-tighter">{formatNumber(selectedOrder.paid)}đ</span>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex gap-3 md:hidden">
              <button className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 font-black rounded-lg uppercase text-[10px] tracking-widest shadow-sm hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
                <Printer size={16} /> In phiếu
              </button>
              <button onClick={() => setSelectedOrder(null)} className="flex-1 py-3 bg-[#991b1b] text-white font-black rounded-lg uppercase text-[10px] tracking-widest hover:bg-[#7f1d1d] transition-colors">Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
