import React, { useState, useEffect } from 'react';
import { Search, Plus, Truck, CheckCircle, X, Trash2, Barcode, Printer, ArrowLeft, LayoutGrid, Eye, Info, ChevronDown, Edit2, ArrowRight, UserCircle, RotateCcw } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Product, ImportItem, Supplier, CashTransaction, ReturnImportOrder, ImportOrder } from '../types';
import { formatNumber, parseFormattedNumber, formatDateTime } from '../lib/utils';
import { generateId } from '../lib/idUtils';
import { useMobileBackModal } from '../hooks/useMobileBackModal';
import { useNavigate, useLocation } from 'react-router-dom';

export const CreateReturnImport: React.FC = () => {
  const { products, suppliers, importOrders, addReturnImportOrder, updateImportOrder, updateProduct, addStockCard, addCashTransaction, returnImportOrders, serials, wallets } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  
  const [cart, setCart] = useState<(ImportItem & { hasSerial?: boolean; serials?: string[]; unit?: string; discount?: number; note?: string; selected?: boolean })[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<ImportOrder | null>(null);
  const [returnCode, setReturnCode] = useState('Mã phiếu tự động');
  const [overallDiscount, setOverallDiscount] = useState(0);
  const [receivedAmount, setReceivedAmount] = useState<number>(0);
  const [note, setNote] = useState('');
  const [walletId, setWalletId] = useState<string>('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Handle pre-fill from location state
  useEffect(() => {
    if (location.state?.preFillOrder) {
      const order = location.state.preFillOrder;
      const supplier = suppliers.find(s => s.name === order.supplier);
      setSelectedSupplier(supplier || { id: '', name: order.supplier, phone: '' });
      setSelectedOrder(order);
      setCart(order.items.map((item: any) => ({
        ...item,
        hasSerial: !!(item.sn && item.sn.length > 0),
        serials: item.sn || [],
        discount: 0,
        note: '',
        selected: true
      })));
      setNote(`Trả hàng cho phiếu nhập ${order.id}`);
    }
  }, [location.state, suppliers]);
  
  // Search results
  const [orderSuggestions, setOrderSuggestions] = useState<ImportOrder[]>([]);

  const selectedItems = cart.filter(item => item.selected);
  const totalGoods = selectedItems.reduce((sum, item) => sum + (item.price * item.qty) - (item.discount || 0), 0);
  const finalTotal = totalGoods - overallDiscount;

  useEffect(() => {
    setReceivedAmount(finalTotal);
  }, [finalTotal]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchTerm.trim()) {
        const filtered = (importOrders || []).filter(o => 
          !o.returned && (
            (o.id || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
            (o.supplier || '').toLowerCase().includes(searchTerm.toLowerCase())
          )
        );
        setOrderSuggestions(filtered.slice(0, 30));
      } else {
        setOrderSuggestions([]);
      }
    }, 300);


return () => clearTimeout(handler);
  }, [searchTerm, importOrders]);

  const handleSelectOrder = (order: ImportOrder) => {
    setSelectedOrder(order);
    const supplier = suppliers.find(s => s.name === order.supplier);
    setSelectedSupplier(supplier || { id: '', name: order.supplier, phone: '' });
    setCart(order.items.map(item => ({
      ...item,
      hasSerial: !!(item.sn && item.sn.length > 0),
      serials: item.sn || [],
      discount: 0,
      note: '',
      selected: true
    })));
    setSearchTerm('');
    setOrderSuggestions([]);
    setNote(`Trả hàng cho phiếu nhập ${order.id}`);
  };

  const toggleItemSelection = (id: string) => {
    setCart(prev => prev.map(item => item.id === id ? { ...item, selected: !item.selected } : item));
  };

  const toggleSelectAll = () => {
    const allSelected = cart.every(item => item.selected);
    setCart(prev => prev.map(item => ({ ...item, selected: !allSelected })));
  };

  const updateQty = (id: string, qty: number) => {
    const product = products.find(p => p.id === id);
    if (product?.hasSerial) return;
    if (qty < 0) return;
    setCart(prev => prev.map(item => item.id === id ? { ...item, qty } : item));
  };

  const updatePrice = (id: string, price: number) => {
    if (price < 0) return;
    setCart(prev => prev.map(item => item.id === id ? { ...item, price } : item));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const addSerialToItem = (prodId: string, sn: string) => {
    if (!sn.trim()) return;
    setCart(prev => prev.map(item => {
      if (item.id === prodId) {
        if (item.serials?.includes(sn.toUpperCase())) {
          alert("Mã này đã quét!");
          return item;
        }
        const newSerials = [...(item.serials || []), sn.toUpperCase()];
        return { ...item, qty: newSerials.length, serials: newSerials };
      }
      return item;
    }));
  };

  const removeSerialFromItem = (prodId: string, sn: string) => {
    setCart(prev => prev.map(item => {
      if (item.id === prodId) {
        const newSerials = item.serials?.filter(s => s !== sn) || [];
        return { ...item, qty: newSerials.length, serials: newSerials };
      }
      return item;
    }));
  };

  const handleCreateReturn = () => {
    if (selectedItems.length === 0) return alert('Vui lòng chọn ít nhất một sản phẩm để trả!');
    if (!selectedSupplier) return alert('Vui lòng chọn nhà cung cấp!');
    if (receivedAmount > 0 && !walletId) return alert('Vui lòng chọn nguồn tiền chi trả!');
    
    for (let item of selectedItems) {
      if (item.hasSerial && item.qty === 0) {
        return alert(`Sản phẩm ${item.name} chưa quét mã Serial!`);
      }
      if (item.hasSerial && item.serials) {
        for (let sn of item.serials) {
          const serialRecord = serials.find(s => s.sn === sn && s.prodId === item.id);
          if (serialRecord && serialRecord.status === 'SOLD') {
            return alert(`Hàng đã bán không thể hoàn hàng (Serial: ${sn} của sản phẩm ${item.name})`);
          }
        }
      }
    }

    // Check stock
    for (const item of selectedItems) {
      const p = products.find(x => x.id === item.id);
      if (p) {
        if ((p.stock || 0) < item.qty) {
          return alert(`Hàng đã bán không thể hoàn hàng (Sản phẩm ${item.name} chỉ còn ${p.stock} trong kho)!`);
        }
      } else {
        return alert(`Sản phẩm ${item.name} không tồn tại trong hệ thống!`);
      }
    }

    setShowConfirmModal(true);
  };

  const executeReturn = async () => {
    const now = new Date();
    const returnId = returnCode === 'Mã phiếu tự động' ? generateId('THN', returnImportOrders) : returnCode;
    const dateStr = formatDateTime(now);

    const order: ReturnImportOrder = {
      id: returnId,
      date: dateStr,
      supplier: selectedSupplier!.name,
      items: selectedItems.map(item => ({
        id: item.id,
        name: item.name,
        qty: item.qty,
        price: item.price,
        sn: item.serials,
        unit: item.unit
      })),
      totalGoods,
      discount: overallDiscount,
      total: finalTotal,
      received: receivedAmount,
      status: 'DONE',
      note
    };

    // Update stock and remove serials
    for (const item of selectedItems) {
      const p = products.find(x => x.id === item.id);
      if (p) {
        updateProduct(item.id, { 
          stock: (p.stock || 0) - item.qty
        }, true);
      }
    }

    // Record Cash Transaction if receivedAmount > 0 (Thu tiền từ NCC)
    if (receivedAmount > 0) {
      const transactionId = `PT${Date.now().toString().slice(-6)}`;
      const newTransaction: CashTransaction = {
        id: transactionId,
        date: dateStr,
        type: 'RECEIPT',
        amount: receivedAmount,
        category: 'OTHER',
        partner: selectedSupplier!.name,
        note: `Thu tiền trả hàng nhập ${returnId}`,
        refId: returnId,
        walletId: walletId
      };
      addCashTransaction(newTransaction);
    }

    // Mark import order as returned
    if (selectedOrder) {
      updateImportOrder(selectedOrder.id, { returned: true });
    }

    addReturnImportOrder(order);
    setShowConfirmModal(false);
    navigate('/return-import');
  };

  useMobileBackModal(orderSuggestions.length > 0, () => setOrderSuggestions([]));
  useMobileBackModal(showConfirmModal, () => setShowConfirmModal(false)); // auto-injected

  return (
    <div className="flex flex-col lg:flex-row bg-slate-50 relative">
      {/* Left Column: Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <div className="h-14 flex items-center px-4 bg-white border-b border-slate-200 shrink-0 gap-2">
          <button onClick={() => navigate('/return-import')} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="hidden sm:block text-lg font-bold text-slate-800 whitespace-nowrap">Trả hàng nhập</h1>
          
          <div className="flex-1 max-w-xl relative">
            <div className="flex items-center gap-2 md:gap-3 bg-slate-50 px-3 md:px-4 py-2 rounded-lg border border-slate-200 focus-within:border-blue-400 focus-within:bg-white transition-all">
              <Search className="text-slate-400" size={18} />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm mã đơn hàng nhập để trả (F3)" 
                className="flex-1 bg-transparent text-sm outline-none font-medium"
              />
            </div>
            {orderSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-[60] bg-white border border-slate-200 rounded-lg shadow-2xl mt-1 max-h-[400px] overflow-y-auto">
                {orderSuggestions.map(o => (
                  <div 
                    key={o.id} 
                    onClick={() => handleSelectOrder(o)}
                    className="p-4 border-b border-slate-50 hover:bg-blue-50 flex justify-between items-center cursor-pointer transition-colors"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{o.id}</p>
                      <p className="text-xs text-slate-400 font-medium mt-1">NCC: {o.supplier} | Ngày: {o.date}</p>
                    </div>
                    <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded font-bold">{formatNumber(o.total)}đ</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Table Area */}
        <div className="flex-1 overflow-auto bg-white">
          <table className="w-full border-collapse hidden md:table">
            <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="w-12 p-3 text-center">
                  <input 
                    type="checkbox" 
                    checked={cart.length > 0 && cart.every(item => item.selected)}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="w-12 p-3 text-xs font-bold text-slate-500 text-left">STT</th>
                <th className="w-32 p-3 text-xs font-bold text-slate-500 text-left">Mã hàng</th>
                <th className="p-3 text-xs font-bold text-slate-500 text-left">Tên hàng</th>
                <th className="w-24 p-3 text-xs font-bold text-slate-500 text-center">ĐVT</th>
                <th className="w-32 p-3 text-xs font-bold text-slate-500 text-center">Số lượng</th>
                <th className="w-32 p-3 text-xs font-bold text-slate-500 text-center">Giá trả</th>
                <th className="w-32 p-3 text-xs font-bold text-slate-500 text-right">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {cart.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-20 text-center text-slate-400 italic text-sm">Vui lòng tìm và chọn mã đơn hàng nhập để trả.</td>
                </tr>
              ) : (
                cart.map((item, index) => (
                  <React.Fragment key={item.id}>
                    <tr className={`border-b border-slate-100 hover:bg-slate-50/50 group ${!item.selected ? 'opacity-50' : ''}`}>
                      <td className="p-3 text-center">
                        <input 
                          type="checkbox" 
                          checked={item.selected}
                          onChange={() => toggleItemSelection(item.id)}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                      <td className="p-3 text-sm text-slate-600 font-medium">{index + 1}</td>
                      <td className="p-3 text-sm text-blue-600 font-semibold">{item.id}</td>
                      <td className="p-3">
                        <p className="text-sm font-semibold text-slate-800">{item.name}</p>
                      </td>
                      <td className="p-3 text-center text-sm text-blue-600 font-medium">{item.unit}</td>
                      <td className="p-3">
                        <input 
                          type="text" 
                          value={item.qty}
                          disabled={item.hasSerial || !item.selected}
                          onChange={(e) => updateQty(item.id, Number(e.target.value) || 0)}
                          className={`w-full text-center border border-slate-200 rounded-lg px-2 py-1.5 text-sm font-semibold outline-none focus:border-blue-500 ${item.hasSerial || !item.selected ? 'bg-slate-50 text-slate-400' : 'bg-white'}`}
                        />
                      </td>
                      <td className="p-3">
                        <input 
                          type="text" 
                          value={formatNumber(item.price)}
                          disabled={!item.selected}
                          onChange={(e) => updatePrice(item.id, parseFormattedNumber(e.target.value))}
                          className={`w-full text-center border border-slate-200 rounded-lg px-2 py-1.5 text-sm font-semibold outline-none focus:border-blue-500 ${!item.selected ? 'bg-slate-50 text-slate-400' : 'bg-white'}`}
                        />
                      </td>
                      <td className="p-3 text-right text-sm font-bold text-slate-800">
                        {formatNumber(item.price * item.qty)}
                      </td>
                    </tr>
                    {item.hasSerial && item.selected && (
                      <tr className="border-b border-slate-100 bg-slate-50/30">
                        <td className="p-0"></td>
                        <td className="p-0"></td>
                        <td className="p-0"></td>
                        <td colSpan={5} className="p-3">
                          <div className="flex flex-col gap-2">
                            <div className="relative max-w-md">
                              <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                              <input 
                                type="text" 
                                placeholder="Quét Serial/Imei để trả" 
                                className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs outline-none focus:border-blue-400 font-medium"
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    addSerialToItem(item.id, (e.target as HTMLInputElement).value);
                                    (e.target as HTMLInputElement).value = '';
                                  }
                                }}
                              />
                            </div>
                            {item.serials && item.serials.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {(item.serials || []).map((sn, sIdx) => (
                                  <span key={`${sn}-${sIdx}`} className="bg-orange-50 text-orange-600 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1.5 border border-orange-100">
                                    {sn} <X size={10} className="cursor-pointer hover:text-red-500" onClick={() => removeSerialFromItem(item.id, sn)} />
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right Column: Summary Panel */}
      <div className="w-full lg:w-[380px] bg-white border-l border-slate-200 flex flex-col shrink-0">
        <div className="p-4 flex justify-between items-center border-b border-slate-100">
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <UserCircle size={20} className="text-slate-400" />
            <span className="text-sm font-semibold text-slate-700">Admin Cường Tín</span>
          </div>
          <div className="text-xs font-medium text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            {formatDateTime(new Date())}
          </div>
        </div>

        {/* Supplier Info (Read Only from Order) */}
        <div className="p-4 border-b border-slate-100">
          {!selectedOrder ? (
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex items-center gap-3 text-blue-700">
              <Info size={20} />
              <p className="text-sm font-medium">Vui lòng tìm mã đơn hàng nhập để bắt đầu trả hàng.</p>
            </div>
          ) : (
            <div className="p-4 bg-orange-50 rounded-xl border border-orange-100">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">Nhà cung cấp</p>
                  <p className="text-base font-black text-orange-800 mt-0.5">{selectedSupplier?.name}</p>
                  <p className="text-xs text-orange-500 font-medium mt-1">{selectedSupplier?.phone}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">Đơn nhập gốc</p>
                  <p className="text-sm font-black text-orange-700 mt-0.5">{selectedOrder.id}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Summary Fields */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-slate-600">Mã phiếu trả</span>
            <input 
              type="text" 
              value={returnCode}
              onChange={(e) => setReturnCode(e.target.value)}
              className="w-48 text-right border-b border-slate-200 bg-transparent px-1 py-1 text-sm font-semibold outline-none focus:border-blue-500" 
            />
          </div>
          
          <div className="pt-4 border-t border-slate-100 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-slate-600">Tổng tiền hàng trả</span>
              <span className="text-sm font-bold text-slate-800">{formatNumber(totalGoods)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-slate-600">Giảm giá</span>
              <input 
                type="text" 
                value={formatNumber(overallDiscount)}
                onChange={(e) => setOverallDiscount(parseFormattedNumber(e.target.value))}
                className="w-32 text-right border border-slate-200 rounded-lg bg-white px-3 py-1.5 text-sm font-semibold outline-none focus:border-blue-500" 
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-slate-800">NCC cần trả</span>
              <span className="text-base font-bold text-orange-600">{formatNumber(finalTotal)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-slate-600">NCC đã trả</span>
              <input 
                type="text" 
                value={formatNumber(receivedAmount)}
                onChange={(e) => setReceivedAmount(parseFormattedNumber(e.target.value))}
                className="w-32 text-right border border-slate-200 rounded-lg bg-white px-3 py-1.5 text-sm font-semibold outline-none focus:border-blue-500 text-emerald-600" 
              />
            </div>
            {receivedAmount > 0 && (
              <div className="flex justify-between items-center bg-emerald-50 p-2 rounded-lg border border-emerald-100 mt-2">
                <span className="text-sm font-medium text-emerald-700">Ví nhận tiền</span>
                <select
                  value={walletId || ''}
                  onChange={e => setWalletId(e.target.value)}
                  className="w-32 text-right border border-emerald-200 rounded-lg bg-white px-2 py-1.5 text-xs font-semibold outline-none focus:border-emerald-500 text-emerald-700 appearance-none bg-no-repeat"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23047857' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: `right 0.2rem center`, backgroundSize: `1.2em 1.2em`, paddingRight: `1.5rem` }}
                >
                  <option value="" disabled>Chọn ví</option>
                  {wallets.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
              <span className="text-sm font-bold text-red-600">NCC còn nợ</span>
              <span className="text-base font-bold text-red-600">{formatNumber(finalTotal - receivedAmount)}</span>
            </div>
          </div>

          <div className="pt-4">
            <textarea 
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ghi chú"
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-blue-400 focus:bg-white transition-all h-24 resize-none"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-slate-50">
          <button 
            onClick={handleCreateReturn}
            className="w-full py-4 rounded-xl font-bold text-sm text-white bg-orange-600 hover:bg-orange-700 transition-all active:scale-95 shadow-md shadow-orange-200 flex items-center justify-center gap-2"
          >
            <RotateCcw size={20} /> Hoàn thành trả hàng
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-xl font-black text-slate-800">Xác nhận trả hàng</h3>
              <p className="text-sm text-slate-500 mt-1">Vui lòng kiểm tra lại thông tin trước khi hoàn thành.</p>
            </div>
            
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-1">Nhà cung cấp</p>
                <p className="font-bold text-orange-800">{selectedSupplier?.name}</p>
              </div>
              
              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1">Số tiền hoàn (NCC cần trả)</p>
                <p className="text-xl font-black text-emerald-700">{formatNumber(finalTotal)}đ</p>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Danh sách hàng trả</p>
                <div className="space-y-3">
                  {selectedItems.map((item, idx) => (
                    <div key={`${item.id}-${idx}`} className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <div className="flex justify-between items-start mb-1">
                        <p className="font-bold text-sm text-slate-800">{item.name}</p>
                        <span className="text-xs font-bold text-slate-600">SL: {item.qty}</span>
                      </div>
                      <p className="text-xs text-slate-500">Mã: {item.id}</p>
                      {item.hasSerial && item.serials && item.serials.length > 0 && (
                        <div className="mt-2">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Serial/IMEI:</p>
                          <div className="flex flex-wrap gap-1">
                            {item.serials.map((sn, sIdx) => (
                              <span key={`${sn}-${sIdx}`} className="text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded font-mono text-slate-600">
                                {sn}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button 
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-3 rounded-xl font-bold text-sm text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-all"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={executeReturn}
                className="flex-1 py-3 rounded-xl font-bold text-sm text-white bg-orange-600 hover:bg-orange-700 transition-all shadow-md shadow-orange-200"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
