import React, { useState, useEffect } from 'react';
import { Search, Plus, ArrowLeft, X, Barcode, UserCircle, RotateCcw, Info } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Product, InvoiceItem, Customer, CashTransaction, ReturnSalesOrder, Invoice } from '../types';
import { formatNumber, parseFormattedNumber, formatDateTime } from '../lib/utils';
import { generateId } from '../lib/idUtils';
import { useMobileBackModal } from '../hooks/useMobileBackModal';
import { useNavigate, useLocation } from 'react-router-dom';

export const CreateReturnSales: React.FC = () => {
  const { products, customers, invoices, addReturnSalesOrder, updateProduct, addStockCard, addCashTransaction, returnSalesOrders, wallets } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  
  const [cart, setCart] = useState<(InvoiceItem & { hasSerial?: boolean; selected?: boolean })[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [returnCode, setReturnCode] = useState('Mã phiếu tự động');
  const [overallDiscount, setOverallDiscount] = useState(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [note, setNote] = useState('');
  const [walletId, setWalletId] = useState<string>('');

  // Handle pre-fill from location state
  useEffect(() => {
    if (location.state?.preFillInvoice) {
      const invoice = location.state.preFillInvoice;
      const customer = customers.find(c => c.name === invoice.customer);
      setSelectedCustomer(customer || { name: invoice.customer, phone: invoice.phone });
      setSelectedInvoice(invoice);
      setCart(invoice.items.map((item: any) => ({
        ...item,
        selected: true
      })));
      setNote(`Trả hàng cho hóa đơn ${invoice.id}`);
    }
  }, [location.state, customers]);
  
  const [invoiceSuggestions, setInvoiceSuggestions] = useState<Invoice[]>([]);

  useMobileBackModal(invoiceSuggestions.length > 0, () => setInvoiceSuggestions([]));

  const selectedItems = cart.filter(item => item.selected);
  const totalGoods = selectedItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const finalTotal = totalGoods - overallDiscount;

  useEffect(() => {
    setPaidAmount(finalTotal);
  }, [finalTotal]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchTerm.trim()) {
        const filtered = (invoices || []).filter(o => 
          (o.id || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
          (o.customer || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
        setInvoiceSuggestions(filtered.slice(0, 30));
      } else {
        setInvoiceSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [searchTerm, invoices]);

  const handleSelectInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    const customer = customers.find(c => c.name === invoice.customer);
    setSelectedCustomer(customer || { name: invoice.customer, phone: invoice.phone });
    setCart(invoice.items.map(item => ({
      ...item,
      selected: true
    })));
    setSearchTerm('');
    setInvoiceSuggestions([]);
    setNote(`Trả hàng cho hóa đơn ${invoice.id}`);
  };

  const toggleItemSelection = (id: string, sn?: string) => {
    setCart(prev => prev.map(item => (item.id === id && item.sn === sn) ? { ...item, selected: !item.selected } : item));
  };

  const toggleSelectAll = () => {
    const allSelected = cart.every(item => item.selected);
    setCart(prev => prev.map(item => ({ ...item, selected: !allSelected })));
  };

  const updateQty = (id: string, sn: string | undefined, qty: number) => {
    const product = products.find(p => p.id === id);
    if (product?.hasSerial) return;
    if (qty < 0) return;
    setCart(prev => prev.map(item => (item.id === id && item.sn === sn) ? { ...item, qty } : item));
  };

  const handleCreateReturn = async () => {
    if (selectedItems.length === 0) return alert('Vui lòng chọn ít nhất một sản phẩm để trả!');
    if (!selectedCustomer) return alert('Vui lòng chọn khách hàng!');
    if (paidAmount > 0 && !walletId) return alert('Vui lòng chọn nguồn tiền chi trả!');
    
    const now = new Date();
    const returnId = returnCode === 'Mã phiếu tự động' ? generateId('THB', returnSalesOrders) : returnCode;
    const dateStr = formatDateTime(now);

    const order: ReturnSalesOrder = {
      id: returnId,
      date: dateStr,
      customer: selectedCustomer.name,
      items: selectedItems.map(item => ({
        id: item.id,
        name: item.name,
        qty: item.qty,
        price: item.price,
        sn: item.sn
      })),
      totalGoods,
      discount: overallDiscount,
      total: finalTotal,
      paid: paidAmount,
      status: 'DONE',
      note
    };

    // Update stock and add serials back
    for (const item of selectedItems) {
      const p = products.find(x => x.id === item.id);
      if (p) {
        updateProduct(item.id, { 
          stock: (p.stock || 0) + item.qty
        }, true);
      }
    }

    // Record Cash Transaction if paidAmount > 0 (Trả tiền cho khách)
    if (paidAmount > 0) {
      const transactionId = `PC${Date.now().toString().slice(-6)}`;
      const newTransaction: CashTransaction = {
        id: transactionId,
        date: dateStr,
        type: 'PAYMENT',
        amount: paidAmount,
        category: 'OTHER',
        partner: selectedCustomer.name,
        note: `Trả tiền cho khách trả hàng ${returnId}`,
        refId: returnId,
        walletId: walletId
      };
      addCashTransaction(newTransaction);
    }

    addReturnSalesOrder(order);
    navigate('/return-sales');
  };

  return (
    <div className="flex flex-col lg:flex-row bg-slate-50 relative">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-14 flex items-center px-4 bg-white border-b border-slate-200 shrink-0 gap-2">
          <button onClick={() => navigate('/return-sales')} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="hidden sm:block text-lg font-bold text-slate-800 whitespace-nowrap">Trả hàng bán</h1>
          
          <div className="flex-1 max-w-xl relative">
            <div className="flex items-center gap-2 md:gap-3 bg-slate-50 px-3 md:px-4 py-2 rounded-lg border border-slate-200 focus-within:border-blue-400 focus-within:bg-white transition-all">
              <Search className="text-slate-400" size={18} />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm mã hóa đơn để trả" 
                className="flex-1 bg-transparent text-sm outline-none font-medium"
              />
            </div>
            {invoiceSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-[60] bg-white border border-slate-200 rounded-lg shadow-2xl mt-1 max-h-[400px] overflow-y-auto">
                {invoiceSuggestions.map(o => (
                  <div 
                    key={o.id} 
                    onClick={() => handleSelectInvoice(o)}
                    className="p-4 border-b border-slate-50 hover:bg-blue-50 flex justify-between items-center cursor-pointer transition-colors"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{o.id}</p>
                      <p className="text-xs text-slate-400 font-medium mt-1">KH: {o.customer} | Ngày: {o.date}</p>
                    </div>
                    <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded font-bold">{formatNumber(o.total)}đ</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-white">
          <table className="w-full border-collapse">
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
                <th className="p-3 text-xs font-bold text-slate-500 text-left">Tên hàng</th>
                <th className="w-32 p-3 text-xs font-bold text-slate-500 text-center">Số lượng</th>
                <th className="w-32 p-3 text-xs font-bold text-slate-500 text-center">Giá trả</th>
                <th className="w-32 p-3 text-xs font-bold text-slate-500 text-right">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {cart.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-20 text-center text-slate-400 italic text-sm">Vui lòng tìm và chọn mã hóa đơn để trả.</td>
                </tr>
              ) : (
                cart.map((item, index) => (
                  <tr key={`${item.id}-${item.sn}`} className={`border-b border-slate-100 hover:bg-slate-50/50 group ${!item.selected ? 'opacity-50' : ''}`}>
                    <td className="p-3 text-center">
                      <input 
                        type="checkbox" 
                        checked={item.selected}
                        onChange={() => toggleItemSelection(item.id, item.sn)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </td>
                    <td className="p-3 text-sm text-slate-600 font-medium">{index + 1}</td>
                    <td className="p-3">
                      <p className="text-sm font-semibold text-slate-800">{item.name}</p>
                      {item.sn && <p className="text-[10px] text-orange-500 font-bold font-mono">SN: {item.sn}</p>}
                    </td>
                    <td className="p-3">
                      <input 
                        type="text" 
                        value={item.qty}
                        disabled={!!item.sn || !item.selected}
                        onChange={(e) => updateQty(item.id, item.sn, Number(e.target.value) || 0)}
                        className={`w-full text-center border border-slate-200 rounded-lg px-2 py-1.5 text-sm font-semibold outline-none focus:border-blue-500 ${item.sn || !item.selected ? 'bg-slate-50 text-slate-400' : 'bg-white'}`}
                      />
                    </td>
                    <td className="p-3 text-center text-sm font-semibold text-slate-800">
                      {formatNumber(item.price)}
                    </td>
                    <td className="p-3 text-right text-sm font-bold text-slate-800">
                      {formatNumber(item.price * item.qty)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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

        <div className="p-4 border-b border-slate-100">
          {!selectedInvoice ? (
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex items-center gap-3 text-blue-700">
              <Info size={20} />
              <p className="text-sm font-medium">Vui lòng tìm mã hóa đơn để bắt đầu trả hàng.</p>
            </div>
          ) : (
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Khách hàng</p>
                  <p className="text-base font-black text-blue-800 mt-0.5">{selectedCustomer?.name}</p>
                  <p className="text-xs text-blue-500 font-medium mt-1">{selectedCustomer?.phone}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Hóa đơn gốc</p>
                  <p className="text-sm font-black text-blue-700 mt-0.5">{selectedInvoice.id}</p>
                </div>
              </div>
            </div>
          )}
        </div>

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
              <span className="text-sm font-bold text-slate-800">Cần trả khách</span>
              <span className="text-base font-bold text-blue-600">{formatNumber(finalTotal)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-slate-600">Đã trả khách</span>
              <input 
                type="text" 
                value={formatNumber(paidAmount)}
                onChange={(e) => setPaidAmount(parseFormattedNumber(e.target.value))}
                className="w-32 text-right border border-slate-200 rounded-lg bg-white px-3 py-1.5 text-sm font-semibold outline-none focus:border-blue-500 text-emerald-600" 
              />
            </div>
            {paidAmount > 0 && (
              <div className="flex justify-between items-center bg-emerald-50 p-2 rounded-lg border border-emerald-100 mt-2">
                <span className="text-sm font-medium text-emerald-700">Ví chi trả</span>
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

        <div className="p-4 bg-slate-50">
          <button 
            onClick={handleCreateReturn}
            className="w-full py-4 rounded-xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-700 transition-all active:scale-95 shadow-md shadow-blue-200 flex items-center justify-center gap-2"
          >
            <RotateCcw size={20} /> Hoàn thành trả hàng
          </button>
        </div>
      </div>
    </div>
  );
};
