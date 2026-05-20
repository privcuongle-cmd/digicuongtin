import React, { useState, useMemo, useEffect } from 'react';
import { PieChart, ChevronRight, BarChart3, Calendar, Tag, ArrowUpRight, ArrowDownRight, Package, Users } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useSearchParams } from 'react-router-dom';

type ReportCategory = 'END_OF_DAY' | 'SALES' | 'ORDERS' | 'INVENTORY' | 'CUSTOMERS' | 'SUPPLIERS' | 'EMPLOYEES' | 'CHANNELS' | 'FINANCE';

export const Reports: React.FC = () => {
  const { invoices, cashTransactions } = useAppContext();
  const [searchParams] = useSearchParams();
  const [activeCategory, setActiveCategory] = useState<ReportCategory>('END_OF_DAY');
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      const tabMap: Record<string, ReportCategory> = {
        'end_of_day': 'END_OF_DAY',
        'sales': 'SALES',
        'orders': 'ORDERS',
        'inventory': 'INVENTORY',
        'customers': 'CUSTOMERS',
        'suppliers': 'SUPPLIERS',
        'staff': 'EMPLOYEES',
        'channels': 'CHANNELS',
        'finance': 'FINANCE',
      };
      if (tabMap[tab]) setActiveCategory(tabMap[tab]);
    }
  }, [searchParams]);

  const categories = [
    { id: 'END_OF_DAY', label: 'Cuối ngày' },
    { id: 'SALES', label: 'Bán hàng' },
    { id: 'ORDERS', label: 'Đặt hàng' },
    { id: 'INVENTORY', label: 'Hàng hóa' },
    { id: 'CUSTOMERS', label: 'Khách hàng' },
    { id: 'SUPPLIERS', label: 'Nhà cung cấp' },
    { id: 'EMPLOYEES', label: 'Nhân viên' },
    { id: 'CHANNELS', label: 'Kênh bán hàng' },
    { id: 'FINANCE', label: 'Tài chính' },
  ];

  const formattedDate = useMemo(() => {
    const d = new Date(reportDate);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  }, [reportDate]);

  // --- END OF DAY REPORT LOGIC ---
  const renderEndOfDayReport = () => {
    // 1. Tiền vào (RECEIPT from CashTransactions)
    const totalIn = (cashTransactions || [])
      .filter(tx => tx.type === 'RECEIPT' && tx.date.includes(formattedDate))
      .reduce((sum, tx) => sum + tx.amount, 0);

    // 2. Tiền ra (PAYMENT from CashTransactions)
    const totalOut = (cashTransactions || [])
      .filter(tx => tx.type === 'PAYMENT' && tx.date.includes(formattedDate))
      .reduce((sum, tx) => sum + tx.amount, 0);
      
    // 3. Doanh thu & Lợi nhuận (from Invoices)
    const todayInvoices = (invoices || []).filter(inv => inv.date.includes(formattedDate));
    const revenueToday = todayInvoices.reduce((sum, inv) => sum + inv.total, 0);
    
    // Cost of goods sold for today's invoices
    let costOfGoods = 0;
    todayInvoices.forEach(inv => {
      inv.items.forEach(it => {
        const itemImportCost = it.importPriceTotal ?? ((it.qty || 0) * ((it as any).importPrice || 0));
        costOfGoods += itemImportCost;
      });
    });
    const profitToday = revenueToday - costOfGoods;

    return (
      <div className="space-y-6 pb-6">
        <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
          <span className="font-bold text-slate-700">Ngày báo cáo</span>
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-slate-400" />
            <input 
              type="date" 
              value={reportDate} 
              onChange={e => setReportDate(e.target.value)} 
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 outline-none focus:border-blue-400"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 border-l-4 border-l-emerald-500">
            <div className="flex items-center gap-2 text-emerald-600 mb-2">
              <ArrowUpRight size={20} />
              <h3 className="font-bold text-sm tracking-wider uppercase">Tổng tiền vào</h3>
            </div>
            <p className="text-3xl font-black text-slate-800 tracking-tighter">{totalIn.toLocaleString()}đ</p>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 border-l-4 border-l-rose-500">
            <div className="flex items-center gap-2 text-rose-600 mb-2">
              <ArrowDownRight size={20} />
              <h3 className="font-bold text-sm tracking-wider uppercase">Tổng tiền ra</h3>
            </div>
            <p className="text-3xl font-black text-slate-800 tracking-tighter">{totalOut.toLocaleString()}đ</p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 border-l-4 border-l-blue-500">
            <div className="flex items-center gap-2 text-blue-600 mb-2">
              <Tag size={20} />
              <h3 className="font-bold text-sm tracking-wider uppercase">Doanh thu bán hàng</h3>
            </div>
            <p className="text-3xl font-black text-slate-800 tracking-tighter">{revenueToday.toLocaleString()}đ</p>
            <p className="text-xs text-slate-500 mt-2 font-medium">{todayInvoices.length} đơn hàng</p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 border-l-4 border-l-amber-500">
            <div className="flex items-center gap-2 text-amber-600 mb-2">
              <BarChart3 size={20} />
              <h3 className="font-bold text-sm tracking-wider uppercase">Lợi nhuận gộp</h3>
            </div>
            <p className="text-3xl font-black text-slate-800 tracking-tighter">{profitToday.toLocaleString()}đ</p>
          </div>
        </div>
      </div>
    );
  };

  // --- SALES REPORT LOGIC ---
  const renderSalesReport = () => {
    const todayInvoices = (invoices || []).filter(inv => inv.date.includes(formattedDate));
    
    // Aggregate items
    const itemsMap: Record<string, { name: string, qty: number, total: number }> = {};
    const customersMap: Record<string, { name: string, count: number, total: number }> = {};

    todayInvoices.forEach(inv => {
      // Customers
      const custName = inv.customer || 'Khách lẻ';
      if (!customersMap[custName]) customersMap[custName] = { name: custName, count: 0, total: 0 };
      customersMap[custName].count += 1;
      customersMap[custName].total += inv.total;

      // Items
      inv.items.forEach(it => {
        if (!itemsMap[it.id]) itemsMap[it.id] = { name: it.name, qty: 0, total: 0 };
        itemsMap[it.id].qty += it.qty;
        itemsMap[it.id].total += (it.price * it.qty);
      });
    });

    const itemsSold = Object.values(itemsMap).sort((a, b) => b.total - a.total);
    const customersPurchased = Object.values(customersMap).sort((a, b) => b.total - a.total);

    return (
      <div className="space-y-6 pb-6">
        <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
          <span className="font-bold text-slate-700">Ngày báo cáo</span>
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-slate-400" />
            <input 
              type="date" 
              value={reportDate} 
              onChange={e => setReportDate(e.target.value)} 
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 outline-none focus:border-blue-400"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Items Sold */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-2 text-indigo-600 mb-6">
              <Package size={20} />
              <h3 className="font-bold text-sm tracking-wider uppercase">Mặt hàng đã bán</h3>
            </div>
            {itemsSold.length === 0 ? (
              <p className="text-center py-10 text-slate-400 text-sm italic">Chưa có giao dịch</p>
            ) : (
              <div className="space-y-4">
                {itemsSold.map((it, idx) => (
                  <div key={`sold-${it.name}-${idx}`} className="flex justify-between items-center py-2 border-b border-dashed border-slate-100 last:border-0">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800 text-sm">{it.name}</span>
                      <span className="text-xs text-slate-500 font-medium">SL: {it.qty}</span>
                    </div>
                    <span className="font-bold text-indigo-600">{it.total.toLocaleString()}đ</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Customers */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-2 text-teal-600 mb-6">
              <Users size={20} />
              <h3 className="font-bold text-sm tracking-wider uppercase">Khách hàng mua</h3>
            </div>
            {customersPurchased.length === 0 ? (
              <p className="text-center py-10 text-slate-400 text-sm italic">Chưa có giao dịch</p>
            ) : (
              <div className="space-y-4">
                {customersPurchased.map((c, idx) => (
                  <div key={`purchased-${c.name}-${idx}`} className="flex justify-between items-center py-2 border-b border-dashed border-slate-100 last:border-0">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800 text-sm">{c.name}</span>
                      <span className="text-xs text-slate-500 font-medium">{c.count} Hóa đơn</span>
                    </div>
                    <span className="font-bold text-teal-600">{c.total.toLocaleString()}đ</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Logic for FINANCE report (existing logic)
  const months: Record<string, { rev: number; cost: number; profit: number; orders: number }> = {};
  (invoices || []).forEach(inv => {
    let dateStr = inv.date || '';
    const datePart = dateStr.split(/[\s,]+/).find(part => part.includes('/'));
    if (!datePart) return;
    const parts = datePart.split('/');
    if (parts.length < 3) return;
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    const monthKey = `${month}/${year}`; // MM/YYYY
    if (!months[monthKey]) months[monthKey] = { rev: 0, cost: 0, profit: 0, orders: 0 };
    if (inv.total > 0) {
      months[monthKey].rev += inv.total;
      months[monthKey].orders += 1;
      let invCost = inv.items.reduce((s, it) => s + (it.importPriceTotal ?? ((it.qty || 0) * ((it as any).importPrice || 0))), 0); 
      months[monthKey].cost += invCost;
    } else {
      months[monthKey].rev += inv.total;
      let refundCost = inv.items.reduce((s, it) => s + (it.importPriceTotal ?? ((it.qty || 0) * ((it as any).importPrice || 0))), 0);
      months[monthKey].cost -= refundCost;
    }
    months[monthKey].profit = months[monthKey].rev - months[monthKey].cost;
  });

  const sortedMonths = Object.keys(months).sort((a, b) => b.localeCompare(a));
  const totalProfit = Object.values(months).reduce((s, m) => s + m.profit, 0);

  const renderFinanceReport = () => (
    <div className="space-y-6 pb-6">
      <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200 text-center relative overflow-hidden">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Lợi nhuận gộp hệ thống</p>
        <h2 className="text-4xl font-black text-emerald-600 tracking-tighter">{totalProfit.toLocaleString()}đ</h2>
        <div className="absolute top-0 right-0 p-6 opacity-5 text-8xl">
          <PieChart size={120} />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {sortedMonths.length === 0 ? (
          <p className="col-span-full text-center py-24 italic text-slate-300 font-black uppercase tracking-widest text-xs opacity-50">
            Hệ thống chưa ghi nhận đơn
          </p>
        ) : (
          sortedMonths.map(m => (
            <div key={m} className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm transition-all hover:shadow-md">
              <div className="flex justify-between items-center border-b border-dashed border-slate-200 pb-4 mb-5">
                <span className="font-black text-slate-800 tracking-tighter text-base uppercase">Tháng {m}</span>
                <span className="text-[10px] bg-blue-50 text-blue-600 px-4 py-1.5 rounded-xl font-black uppercase tracking-widest border border-blue-100">
                  {months[m].orders} Giao dịch
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tổng doanh thu</p>
                  <p className="font-black text-slate-800 text-2xl tracking-tighter">{months[m].rev.toLocaleString()}đ</p>
                </div>
                <div className="border-l border-slate-100 pl-4">
                  <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest mb-1">Lợi nhuận gộp</p>
                  <p className="font-black text-emerald-600 text-2xl tracking-tighter">{months[m].profit.toLocaleString()}đ</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderPlaceholderReport = (title: string) => (
    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-200 border-dashed text-center">
      <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-4">
        <BarChart3 size={32} />
      </div>
      <h3 className="text-lg font-bold text-slate-800 mb-2">Báo cáo {title}</h3>
      <p className="text-sm text-slate-500 max-w-sm">
        Tính năng đang được phát triển. Vui lòng quay lại sau.
      </p>
    </div>
  );

  return (
    <div className="px-4 md:px-6 py-4 md:py-6 max-w-7xl mx-auto h-full flex flex-col md:flex-row gap-6">
      {/* Sidebar Navigation */}
      <div className="w-full md:w-64 shrink-0 bg-white rounded-[2rem] border border-slate-200 shadow-sm p-4 h-fit md:sticky top-[100px]">
        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 px-3">Danh mục báo cáo</h2>
        <div className="flex flex-col gap-1">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.id as ReportCategory)}
              className={`flex items-center justify-between px-3 py-3 rounded-xl transition-all ${
                activeCategory === c.id 
                  ? 'bg-blue-50 text-blue-700 font-bold' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
              }`}
            >
              <span className="text-sm">{c.label}</span>
              {activeCategory === c.id && <ChevronRight size={16} className="text-blue-500" />}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">
            Báo cáo {categories.find(c => c.id === activeCategory)?.label.toLowerCase()}
          </h1>
        </div>

        {activeCategory === 'END_OF_DAY' && renderEndOfDayReport()}
        {activeCategory === 'SALES' && renderSalesReport()}
        {activeCategory === 'FINANCE' && renderFinanceReport()}
        {['ORDERS', 'INVENTORY', 'CUSTOMERS', 'SUPPLIERS', 'EMPLOYEES', 'CHANNELS'].includes(activeCategory) && renderPlaceholderReport(categories.find(c => c.id === activeCategory)?.label || '')}
      </div>
    </div>
  );
};
