import React, { useState, useMemo, useEffect } from 'react';
import { X, ArrowDownLeft, ArrowUpRight, Barcode, Search, Edit3, Image as ImageIcon, Wrench, Package, ChevronDown, ChevronUp } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Product, Invoice, ImportOrder, ReturnImportOrder, ReturnSalesOrder } from '../types';
import { formatNumber } from '../lib/utils';
import { useMobileBackModal } from '../hooks/useMobileBackModal';

interface ProductDetailModalProps {
  product: Product;
  onClose: () => void;
  onEdit?: (product: Product) => void;
  onRefClick?: (refId: string) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ 
  product, 
  onClose, 
  onEdit,
  onRefClick 
}) => {
  const { stockCards, invoices, importOrders, returnImportOrders, returnSalesOrders, serials } = useAppContext();
  
  const [stockFilter, setStockFilter] = useState<'ALL' | 'IN' | 'OUT'>('ALL');
  const [serialSearchTerm, setSerialSearchTerm] = useState('');
  const [serialStatusTab, setSerialStatusTab] = useState<'ALL' | 'IN_STOCK' | 'SOLD'>('IN_STOCK');
  const [isStockHistoryExpanded, setIsStockHistoryExpanded] = useState(true);
  const [isSerialListExpanded, setIsSerialListExpanded] = useState(true);

  useMobileBackModal(!!product, onClose);

  const productStockHistory = useMemo(() => {
    const importHistory = importOrders.flatMap(order => 
      (order.items || []).filter(item => item.id === product.id).map(item => ({
        prodId: item.id,
        type: 'NHAP' as const,
        qty: Number(item.qty) || 0,
        partner: order.supplier,
        date: order.date,
        price: item.price,
        refId: order.id,
        sn: item.sn || []
      }))
    );
    
    const invoiceHistory = invoices.flatMap(inv => 
      (inv.items || []).filter(item => item.id === product.id).map(item => ({
        prodId: item.id,
        type: 'XUAT' as const,
        qty: Number(item.qty) || 0,
        partner: inv.customer,
        date: inv.date,
        price: item.price,
        refId: inv.id,
        sn: Array.isArray(item.sn) ? item.sn : (item.sn ? item.sn.split(',').map(s => s.trim()) : [])
      }))
    );

    const returnImportHistory = returnImportOrders.flatMap(order => 
      (order.items || []).filter(item => item.id === product.id).map(item => ({
        prodId: item.id,
        type: 'TRA_NHAP' as const,
        qty: Number(item.qty) || 0,
        partner: order.supplier,
        date: order.date,
        price: item.price,
        refId: order.id,
        sn: item.sn || []
      }))
    );

    const returnSalesHistory = returnSalesOrders.flatMap(order => 
      (order.items || []).filter(item => item.id === product.id).map(item => ({
        prodId: item.id,
        type: 'TRA_BAN' as const,
        qty: Number(item.qty) || 0,
        partner: order.customer,
        date: order.date,
        price: item.price,
        refId: order.id,
        sn: item.sn ? (typeof item.sn === 'string' ? item.sn.split(',') : item.sn) : []
      }))
    );
    
    // De-duplicate by refId if they exist in stockCards
    const manualRefIds = new Set([
      ...importHistory.map(h => h.refId),
      ...invoiceHistory.map(h => h.refId),
      ...returnImportHistory.map(h => h.refId),
      ...returnSalesHistory.map(h => h.refId)
    ]);

    const adjustments = stockCards.filter(card => 
      card.prodId === product.id && !manualRefIds.has(card.refId)
    ).map(card => ({
      prodId: card.prodId,
      type: card.type,
      qty: card.qty,
      partner: card.partner,
      date: card.date,
      price: card.price,
      refId: card.refId,
      sn: card.sn
    }));

    const history = [...importHistory, ...invoiceHistory, ...returnImportHistory, ...returnSalesHistory, ...adjustments];
    
    return history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [product, stockCards, importOrders, invoices, returnImportOrders, returnSalesOrders]);

  const stockStats = useMemo(() => {
    return productStockHistory.reduce((acc, curr) => {
      if (curr.type === 'NHAP' || curr.type === 'TRA_BAN') {
        acc.totalIn += curr.qty;
      } else if (curr.type === 'XUAT' || curr.type === 'TRA_NHAP') {
        acc.totalOut += curr.qty;
      }
      return acc;
    }, { totalIn: 0, totalOut: 0 });
  }, [productStockHistory]);

  const initialStock = useMemo(() => {
    if (product.isService) return 0;
    return (product.stock || 0) - (stockStats.totalIn - stockStats.totalOut);
  }, [product.stock, product.isService, stockStats.totalIn, stockStats.totalOut]);

  const filteredHistory = useMemo(() => {
    if (stockFilter === 'ALL') return productStockHistory;
    if (stockFilter === 'IN') return productStockHistory.filter(h => h.type === 'NHAP' || h.type === 'TRA_BAN');
    if (stockFilter === 'OUT') return productStockHistory.filter(h => h.type === 'XUAT' || h.type === 'TRA_NHAP');
    return productStockHistory;
  }, [productStockHistory, stockFilter]);

  const filteredSerials = useMemo(() => {
    return (serials || [])
      .filter(s => s.prodId === product.id)
      .filter(s => {
        if (serialStatusTab === 'IN_STOCK') return s.status !== 'SOLD';
        if (serialStatusTab === 'SOLD') return s.status === 'SOLD';
        return true;
      })
      .filter(s => (s.sn || '').toLowerCase().includes(serialSearchTerm.toLowerCase()));
  }, [product, serials, serialStatusTab, serialSearchTerm]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center md:p-4 p-0 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-6xl md:rounded-2xl rounded-none shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col h-full md:h-auto md:max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center shrink-0">
          <div className="min-w-0 pr-4">
            <h3 className="md:text-xl text-lg font-bold text-slate-800 leading-tight truncate">{product.name}</h3>
            <p className="text-sm font-medium text-blue-600 mt-0.5">Mã: {product.id}</p>
          </div>
          <div className="flex items-center gap-3">
            {onEdit && (
              <button
                onClick={() => onEdit(product)}
                className="px-3 py-1.5 bg-blue-600 text-white font-bold rounded-lg uppercase text-[10px] tracking-widest hover:bg-blue-700 transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
              >
                <Edit3 size={14} /> Sửa
              </button>
            )}
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors flex items-center justify-center">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="p-4 md:p-6 overflow-y-auto flex-1 h-full">
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 flex flex-col md:flex-row gap-6">
            
            {/* LEFT COLUMN: Image + Info */}
            <div className="w-full md:w-[320px] shrink-0 space-y-6 md:sticky md:top-0 self-start">
              {/* Image section */}
              <div className="flex justify-center md:block">
                <div className="w-48 h-48 md:w-full md:h-64 rounded-2xl overflow-hidden border border-slate-100 shadow-sm bg-slate-50 flex items-center justify-center">
                  {product.image ? (
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <ImageIcon className="text-slate-300" size={48} />
                  )}
                </div>
              </div>

              {/* Basic Info Grid */}
              <div className="grid grid-cols-2 gap-1.5">
                <div className="bg-[#f0fff4] px-2.5 py-2 rounded-lg border border-[#dcfce7] flex flex-col justify-center">
                  <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider mb-0.5">Tồn kho</span>
                  <p className="text-lg font-black text-emerald-700 leading-none truncate">
                    {product.isService ? '---' : product.stock}
                  </p>
                </div>
                
                <div className="bg-[#f0f7ff] px-2.5 py-2 rounded-lg border border-[#dbeafe] flex flex-col justify-center">
                  <span className="text-[9px] font-bold text-blue-600 uppercase tracking-wider mb-0.5">Giá bán</span>
                  <p className="text-lg font-black text-blue-700 leading-none truncate">
                    {formatNumber(product.price)}<span className="text-[9px] ml-0.5 font-bold">đ</span>
                  </p>
                </div>

                <div className="bg-[#fffaf0] px-2.5 py-2 rounded-lg border border-[#ffedd5] flex flex-col justify-center">
                  <span className="text-[9px] font-bold text-orange-600 uppercase tracking-wider mb-0.5">Bảo hành</span>
                  <p className="text-sm font-black text-orange-700 leading-none truncate mt-0.5">
                    {product.warrantyMonths ? `${product.warrantyMonths} Tháng` : '---'}
                  </p>
                </div>

                <div className="bg-slate-50 px-2.5 py-2 rounded-lg border border-slate-100 flex flex-col justify-center">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Đơn vị tính</span>
                  <p className="text-sm font-black text-slate-700 leading-none truncate mt-0.5">
                    {product.unit || '---'}
                  </p>
                </div>

                <div className="bg-slate-50 px-2.5 py-2 rounded-lg border border-slate-100 flex flex-col justify-center">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Thương hiệu</span>
                  <p className="text-sm font-black text-slate-700 leading-none truncate mt-0.5">
                    {product.brand || '---'}
                  </p>
                </div>

                <div className="bg-slate-50 px-2.5 py-2 rounded-lg border border-slate-100 flex flex-col justify-center">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Nhóm hàng</span>
                  <p className="text-sm font-black text-slate-700 leading-none truncate mt-0.5">
                    {product.category || '---'}
                  </p>
                </div>

                <div className={`px-2.5 py-2 rounded-lg border flex flex-col justify-center col-span-2 ${
                  (product.status || 'Đang kinh doanh') === 'Đang kinh doanh' ? 'bg-[#f0fdfa] border-[#ccfbf1]' : 'bg-[#fff5f5] border-[#fee2e2]'
                }`}>
                  <span className={`text-[9px] font-bold uppercase tracking-wider mb-0.5 ${
                    (product.status || 'Đang kinh doanh') === 'Đang kinh doanh' ? 'text-teal-600' : 'text-rose-600'
                  }`}>Trạng thái</span>
                  <p className={`text-sm font-black leading-none truncate mt-0.5 ${
                    (product.status || 'Đang kinh doanh') === 'Đang kinh doanh' ? 'text-teal-700' : 'text-rose-700'
                  }`}>
                    {product.status || 'Đang kinh doanh'}
                  </p>
                </div>

                <div className="bg-[#f0fdfa] px-2.5 py-2 rounded-lg border border-[#ccfbf1] flex flex-col justify-center">
                  <span className="text-[9px] font-bold text-teal-600 uppercase tracking-wider mb-0.5">Tổng nhập</span>
                  <p className="text-sm font-black text-teal-700 leading-none truncate mt-0.5">
                    {stockStats.totalIn}
                  </p>
                </div>

                <div className="bg-[#fff5f5] px-2.5 py-2 rounded-lg border border-[#fee2e2] flex flex-col justify-center">
                  <span className="text-[9px] font-bold text-rose-600 uppercase tracking-wider mb-0.5">Tổng bán</span>
                  <p className="text-sm font-black text-rose-700 leading-none truncate mt-0.5">
                    {stockStats.totalOut}
                  </p>
                </div>

                {/* Stock calculation formula breakdown */}
                {!product.isService && (
                  <div className="col-span-2 bg-[#f8fafc] p-3 rounded-xl border border-slate-100 flex flex-col gap-1.5 mt-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tính toán tồn kho thực tế</span>
                    <div className="flex items-center justify-between text-xs text-slate-600 font-semibold bg-white p-2.5 rounded-lg border border-slate-100/80 shadow-sm gap-1">
                      <div className="text-center flex-1">
                        <div className="text-[9px] text-slate-400 font-bold uppercase leading-tight">Tồn ban đầu</div>
                        <div className="text-[13px] font-black text-slate-700">{initialStock}</div>
                      </div>
                      <div className="text-slate-300 font-light text-[13px] shrink-0">+</div>
                      <div className="text-center flex-1">
                        <div className="text-[9px] text-teal-500 font-bold uppercase leading-tight">Tổng nhập</div>
                        <div className="text-[13px] font-black text-teal-600">+{stockStats.totalIn}</div>
                      </div>
                      <div className="text-slate-300 font-light text-[13px] shrink-0">-</div>
                      <div className="text-center flex-1">
                        <div className="text-[9px] text-rose-500 font-bold uppercase leading-tight">Tổng bán</div>
                        <div className="text-[13px] font-black text-rose-600">-{stockStats.totalOut}</div>
                      </div>
                      <div className="text-slate-300 font-light text-[13px] shrink-0">=</div>
                      <div className="text-center flex-1 bg-emerald-50 py-1 rounded-md border border-emerald-100 shrink-0 min-w-[50px]">
                        <div className="text-[9px] text-emerald-600 font-bold uppercase leading-none">Tồn kho</div>
                        <div className="text-[14px] font-black text-emerald-700 mt-0.5 leading-none">{product.stock}</div>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-tight">
                      * <span className="font-bold">Tồn ban đầu</span> là số lượng bạn đã nhập trực tiếp khi tạo mới thẻ sản phẩm này trong hệ thống.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: Thẻ kho + Danh sách Serial */}
            <div className="flex-1 min-w-0 space-y-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between group cursor-pointer" onClick={() => setIsStockHistoryExpanded(!isStockHistoryExpanded)}>
                  <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest">Thẻ kho</h4>
                  <button className="p-1 px-2 hover:bg-slate-100 rounded-lg text-slate-400 flex items-center gap-1 text-[10px] font-bold uppercase transition-all">
                    {isStockHistoryExpanded ? (
                      <>Thu gọn <ChevronUp size={14} /></>
                    ) : (
                      <>Mở rộng <ChevronDown size={14} /></>
                    )}
                  </button>
                </div>

                {isStockHistoryExpanded && (
                  <>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="bg-white p-1 rounded-lg border border-slate-200 w-full md:w-auto flex">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setStockFilter('ALL'); }}
                          className={`flex-1 md:flex-none px-4 py-1.5 text-[11px] font-semibold rounded-md transition-all ${stockFilter === 'ALL' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                          Tất cả
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setStockFilter('IN'); }}
                          className={`flex-1 md:flex-none px-4 py-1.5 text-[11px] font-semibold rounded-md transition-all ${stockFilter === 'IN' ? 'bg-green-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                          Nhập hàng
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setStockFilter('OUT'); }}
                          className={`flex-1 md:flex-none px-4 py-1.5 text-[11px] font-semibold rounded-md transition-all ${stockFilter === 'OUT' ? 'bg-red-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                          Đã bán
                        </button>
                      </div>
                    </div>

                    {filteredHistory.length === 0 ? (
                      <p className="text-center py-12 text-slate-400 italic text-sm">
                        {product.isService ? 'Dịch vụ không quản lý thẻ kho' : 'Sản phẩm chưa có giao dịch phù hợp'}
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {filteredHistory.map((h, idx) => (
                          <div 
                            key={`hist-${h.refId}-${h.type}-${idx}`} 
                            onClick={(e) => { e.stopPropagation(); onRefClick?.(h.refId); }}
                            className={`flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors group ${onRefClick ? 'cursor-pointer' : ''}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${h.type === 'NHAP' || h.type === 'TRA_BAN' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                {h.type === 'NHAP' || h.type === 'TRA_BAN' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-800">{h.partner}</p>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                  {h.date} | Mã: <span className="text-blue-600 font-bold hover:underline group-hover:underline">{h.refId}</span>
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold">
                                <span className={h.type === 'NHAP' || h.type === 'TRA_BAN' ? 'text-green-600' : 'text-red-600'}>
                                  {h.type === 'NHAP' || h.type === 'TRA_BAN' ? '+' : '-'}{h.qty}
                                </span>
                                <span className="text-slate-400 font-normal ml-1 text-xs">x {formatNumber(h.price || 0)}</span>
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {product.hasSerial && (
                <div className="space-y-4 pt-6 mt-6 border-t border-slate-100">
                  <div className="flex items-center justify-between group cursor-pointer" onClick={() => setIsSerialListExpanded(!isSerialListExpanded)}>
                    <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest">Danh sách Serial</h4>
                    <button className="p-1 px-2 hover:bg-slate-100 rounded-lg text-slate-400 flex items-center gap-1 text-[10px] font-bold uppercase transition-all">
                      {isSerialListExpanded ? (
                        <>Thu gọn <ChevronUp size={14} /></>
                      ) : (
                        <>Mở rộng <ChevronDown size={14} /></>
                      )}
                    </button>
                  </div>

                  {isSerialListExpanded && (
                    <>
                      <div className="flex flex-col md:flex-row gap-3">
                        <div className="flex-1 relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                          <input 
                            type="text" 
                            value={serialSearchTerm}
                            onChange={(e) => setSerialSearchTerm(e.target.value)}
                            placeholder="Tìm IMEI/Serial..." 
                            className="w-full pl-9 pr-4 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400 transition-all text-sm"
                          />
                        </div>
                        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                          <button 
                            onClick={() => setSerialStatusTab('ALL')}
                            className={`px-3 py-1 text-[11px] font-semibold rounded-md transition-all ${serialStatusTab === 'ALL' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                          >
                            Tất cả
                          </button>
                          <button 
                            onClick={() => setSerialStatusTab('IN_STOCK')}
                            className={`px-3 py-1 text-[11px] font-semibold rounded-md transition-all ${serialStatusTab === 'IN_STOCK' ? 'bg-white text-green-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                          >
                            Tồn kho
                          </button>
                          <button 
                            onClick={() => setSerialStatusTab('SOLD')}
                            className={`px-3 py-1 text-[11px] font-semibold rounded-md transition-all ${serialStatusTab === 'SOLD' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                          >
                            Đã bán
                          </button>
                        </div>
                      </div>

                      {filteredSerials.length === 0 ? (
                        <p className="text-center py-12 text-slate-400 italic text-sm">Không tìm thấy serial nào</p>
                      ) : (
                        <div className="space-y-1">
                          {filteredSerials.map((s, idx) => (
                            <div 
                              key={`${s.sn}-${idx}`} 
                              className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors group border border-slate-50 hover:border-slate-100"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                                  <Barcode size={16} />
                                </div>
                                <div>
                                  <p className="text-sm font-mono font-bold text-slate-700 flex items-center gap-2">
                                    {s.sn}
                                    {s.status === 'SOLD' ? (
                                      <span className="bg-red-100 text-red-600 text-[9px] px-1.5 py-0.5 rounded font-medium">Đã bán</span>
                                    ) : (
                                      <span className="bg-green-100 text-green-600 text-[9px] px-1.5 py-0.5 rounded font-medium">Tồn kho</span>
                                    )}
                                  </p>
                                  <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                                    {s.supplier} - {s.date}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-[11px] font-bold text-slate-600">Vốn: {formatNumber(product.importPrice || 0)}đ</p>
                                <div className="flex flex-col items-end gap-0.5 mt-0.5">
                                  <div className="flex items-center gap-1 text-[9px] text-slate-400 uppercase">
                                    <span>Nhập:</span>
                                    <button 
                                      onClick={() => s.refId && onRefClick?.(s.refId)}
                                      className="text-blue-600 font-bold hover:underline"
                                    >
                                      {s.refId}
                                    </button>
                                  </div>
                                  {s.status === 'SOLD' && (
                                    <div className="flex items-center gap-1 text-[9px] text-slate-400 uppercase">
                                      <span>Xuất:</span>
                                      {(() => {
                                        const sale = (invoices || []).find(inv => 
                                          Array.isArray(inv.items) && inv.items.some((item: any) => 
                                            item.id === product.id && (
                                              Array.isArray(item.sn) 
                                                ? item.sn.includes(s.sn)
                                                : String(item.sn || '').split(',').map(s => s.trim()).includes(s.sn)
                                            )
                                          )
                                        );
                                        return sale ? (
                                          <button 
                                            onClick={() => onRefClick?.(sale.id)}
                                            className="text-emerald-600 font-bold hover:underline"
                                          >
                                            {sale.id}
                                          </button>
                                        ) : (
                                          <span className="text-slate-400">N/A</span>
                                        );
                                      })()}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="p-4 md:p-6 border-t border-slate-100 bg-slate-50/50 shrink-0 flex gap-4 md:hidden">
          <button 
            onClick={onClose}
            className="flex-1 py-3 bg-red-600 text-white font-black rounded-xl uppercase text-xs tracking-widest hover:bg-red-700 transition-colors shadow-lg shadow-red-100 md:hidden"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
