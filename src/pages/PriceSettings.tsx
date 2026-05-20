import React, { useState } from 'react';
import { Search, Save, Edit3, Tag, DollarSign, ArrowUpDown, CheckCircle, ChevronLeft, ChevronRight, ShoppingCart } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { formatNumber, parseFormattedNumber } from '../lib/utils';
import { useMobileBackModal } from '../hooks/useMobileBackModal';

export const PriceSettings: React.FC = () => {
  const { products, updateProduct } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingPrices, setEditingPrices] = useState<{[key: string]: {price: string, cost: string}}>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const filteredProducts = (products || []).filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  const handlePriceChange = (id: string, field: 'price' | 'cost', rawValue: string) => {
    const numericValue = parseFormattedNumber(rawValue);
    const formattedValue = formatNumber(numericValue);
    
    const current = editingPrices[id] || { 
      price: formatNumber(products.find(p => p.id === id)?.price || 0),
      cost: formatNumber(products.find(p => p.id === id)?.importPrice || 0)
    };
    setEditingPrices({
      ...editingPrices,
      [id]: { ...current, [field]: formattedValue }
    });
  };

  const handleSaveAll = () => {
    Object.keys(editingPrices).forEach(id => {
      const values = editingPrices[id];
      updateProduct(id, {
        price: parseFormattedNumber(values.price),
        importPrice: parseFormattedNumber(values.cost)
      });
    });
    setEditingPrices({});
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };


  useMobileBackModal(showSuccess, () => setShowSuccess(false)); // auto-injected
  useMobileBackModal(!!editingPrices, () => setEditingPrices(false)); // auto-injected
return (
    <div className="flex flex-col px-4 md:px-0 py-4 md:py-0">
      <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6 shrink-0">
        <div className="flex-1 bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3 focus-within:border-blue-400 transition-all">
          <Search className="text-slate-400" size={18} />
          <input 
            type="text" 
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Tìm sản phẩm để thiết lập giá..." 
            className="flex-1 bg-transparent text-sm font-medium outline-none"
          />
        </div>
        <button 
          onClick={handleSaveAll}
          disabled={Object.keys(editingPrices).length === 0}
          className={`w-full md:w-auto px-6 py-3 rounded-xl shadow-md flex items-center justify-center gap-2 font-semibold text-xs tracking-wide transition-all ${Object.keys(editingPrices).length > 0 ? 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
        >
          <Save size={16} /> Lưu tất cả thay đổi
        </button>
      </div>

      {showSuccess && (
        <div className="mb-4 p-3 bg-emerald-100 text-emerald-700 rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
          <CheckCircle size={18} />
          <span className="text-xs font-semibold tracking-wide">Đã cập nhật bảng giá thành công!</span>
        </div>
      )}

      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col mb-6">
        <div className="flex-1">
          <table className="w-full text-left border-collapse hidden md:table">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 text-[10px] font-bold text-slate-500 tracking-wider w-1/3">Sản phẩm</th>
                <th className="p-4 text-[10px] font-bold text-slate-500 tracking-wider">Giá vốn hiện tại</th>
                <th className="p-4 text-[10px] font-bold text-slate-500 tracking-wider">Giá bán hiện tại</th>
                <th className="p-4 text-[10px] font-bold text-slate-500 tracking-wider">Giá vốn mới</th>
                <th className="p-4 text-[10px] font-bold text-slate-500 tracking-wider">Giá bán mới</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-slate-400 italic text-sm">Không tìm thấy sản phẩm nào.</td>
                </tr>
              ) : (
                paginatedProducts.map(p => {
                  const draft = editingPrices[p.id];
                  return (
                    <tr key={`desktop-price-${p.id}`} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <td className="p-4">
                        <p className="font-semibold text-xs text-slate-800 tracking-tight">{p.name}</p>
                        <p className="text-[9px] text-slate-400 font-medium tracking-wide mt-1">ID: {p.id}</p>
                      </td>
                      <td className="p-4">
                        <span className="text-xs font-medium text-slate-400">{formatNumber(p.importPrice)}đ</span>
                      </td>
                      <td className="p-4">
                        <span className="text-xs font-medium text-slate-800">{formatNumber(p.price)}đ</span>
                      </td>
                      <td className="p-4">
                        <div className="relative max-w-[150px]">
                          <ShoppingCart className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                          <input 
                            type="text" 
                            value={draft?.cost ?? formatNumber(p.importPrice)}
                            onChange={(e) => handlePriceChange(p.id, 'cost', e.target.value)}
                            className={`w-full pl-8 pr-3 py-2 bg-slate-50 border rounded-lg text-xs font-semibold outline-none transition-all ${draft?.cost !== undefined ? 'border-blue-400 bg-blue-50/30' : 'border-slate-200 focus:border-blue-400'}`}
                          />
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="relative max-w-[150px]">
                          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                          <input 
                            type="text" 
                            value={draft?.price ?? formatNumber(p.price)}
                            onChange={(e) => handlePriceChange(p.id, 'price', e.target.value)}
                            className={`w-full pl-8 pr-3 py-2 bg-slate-50 border rounded-lg text-xs font-semibold outline-none transition-all ${draft?.price !== undefined ? 'border-blue-400 bg-blue-50/30' : 'border-slate-200 focus:border-blue-400'}`}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-slate-100">
            {paginatedProducts.length === 0 ? (
              <div className="text-center py-24 italic text-slate-300 font-black uppercase tracking-widest text-xs opacity-50">
                Không tìm thấy sản phẩm nào
              </div>
            ) : (
              paginatedProducts.map(p => {
                const draft = editingPrices[p.id];
                return (
                  <div key={`mobile-price-${p.id}`} className="p-4 space-y-4">
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{p.name}</p>
                      <p className="text-[10px] text-slate-400 font-medium tracking-wide">ID: {p.id}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Giá vốn mới</label>
                        <div className="relative">
                          <ShoppingCart className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                          <input 
                            type="text" 
                            value={draft?.cost ?? formatNumber(p.importPrice)}
                            onChange={(e) => handlePriceChange(p.id, 'cost', e.target.value)}
                            className={`w-full pl-8 pr-3 py-2 bg-slate-50 border rounded-lg text-xs font-semibold outline-none transition-all ${draft?.cost !== undefined ? 'border-blue-400 bg-blue-50/30' : 'border-slate-200 focus:border-blue-400'}`}
                          />
                        </div>
                        <p className="text-[9px] text-slate-400 font-medium italic">Hiện tại: {formatNumber(p.importPrice)}đ</p>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Giá bán mới</label>
                        <div className="relative">
                          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                          <input 
                            type="text" 
                            value={draft?.price ?? formatNumber(p.price)}
                            onChange={(e) => handlePriceChange(p.id, 'price', e.target.value)}
                            className={`w-full pl-8 pr-3 py-2 bg-slate-50 border rounded-lg text-xs font-semibold outline-none transition-all ${draft?.price !== undefined ? 'border-blue-400 bg-blue-50/30' : 'border-slate-200 focus:border-blue-400'}`}
                          />
                        </div>
                        <p className="text-[9px] text-slate-400 font-medium italic">Hiện tại: {formatNumber(p.price)}đ</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Pagination Controls */}
      {filteredProducts.length > 0 && (
        <div className="px-4 py-3 border border-slate-200 bg-white rounded-xl shadow-sm flex items-center justify-between text-sm mb-8 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Hiển thị</span>
            <select 
              value={itemsPerPage} 
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="border border-slate-300 rounded px-2 py-1 bg-white focus:outline-none focus:border-blue-500 text-xs font-bold"
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-slate-500 font-medium">dòng / trang</span>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-slate-500 font-medium hidden sm:inline">
              {startIndex + 1} - {Math.min(endIndex, filteredProducts.length)} trên tổng {filteredProducts.length}
            </span>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed bg-white transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="px-3 font-bold text-slate-700">{currentPage} / {totalPages || 1}</span>
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
  );
};
