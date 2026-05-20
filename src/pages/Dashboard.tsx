import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, 
  ShoppingCart, 
  Truck, 
  Box, 
  PieChart, 
  Users, 
  Eye, 
  EyeOff, 
  ChevronDown, 
  RotateCcw,
  BarChart3,
  Calendar,
  Wallet,
  ArrowUpRight,
  ChevronRight,
  Check,
  Wrench,
  Plus,
  Star,
  Filter,
  DollarSign,
  Clock,
  ArrowUp,
  ArrowDown,
  Undo2,
  FileSearch,
  X,
  ClipboardList,
  Wifi,
  Shield,
  Camera,
  QrCode,
  Layers
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { formatNumber, formatDateTime, smartParseDate } from '../lib/utils';
import { useScrollLock } from '../hooks/useScrollLock';
import { useMobileBackModal } from '../hooks/useMobileBackModal';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

export const Dashboard: React.FC = () => {
  const { 
    invoices, 
    returnSalesOrders, 
    cashTransactions, 
    importOrders, 
    returnImportOrders, 
    maintenanceRecords,
    customers,
    suppliers,
    products
  } = useAppContext();
  const [showProfit, setShowProfit] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [dateRange, setDateRange] = useState<'today' | 'yesterday' | 'last_7_days' | 'this_month' | 'last_month' | 'this_year'>('this_month');
  const [topProductTab, setTopProductTab] = useState<'revenue' | 'quantity' | 'profit'>('quantity');
  const [topCustomerRange, setTopCustomerRange] = useState<'this_month' | 'this_quarter' | 'this_year'>('this_month');
  const [activityLimit, setActivityLimit] = useState<number>(5);
  const [topProductLimit, setTopProductLimit] = useState<number>(10);
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [showActivityModal, setShowActivityModal] = useState(false);
  
  // Debt & Low Stock pagination
  const [customerDebtPage, setCustomerDebtPage] = useState(1);
  const [supplierDebtPage, setSupplierDebtPage] = useState(1);
  const [lowStockPage, setLowStockPage] = useState(1);
  const DEBT_ITEMS_PER_PAGE = 3;
  const LOW_STOCK_ITEMS_PER_PAGE = 5;

  useScrollLock(showDateModal || showActivityModal);

  const lowStockProducts = useMemo(() => {
    return (products || [])
      .filter(p => (p.status || 'Đang kinh doanh') === 'Đang kinh doanh' && !p.isService && p.stock !== null && p.stock < (p.lowStockThreshold ?? 5))
      .sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0));
  }, [products]);

  const parseDate = (dateStr: any) => {
    const date = smartParseDate(dateStr);
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  };

  const getRangeLabel = () => {
    const today = new Date();
    const formatDate = (date: Date) => date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    
    switch (dateRange) {
      case 'today': 
        return `Hôm nay, ${formatDate(today)}`;
      case 'yesterday': 
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return `Hôm qua, ${formatDate(yesterday)}`;
      case 'last_7_days': 
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        return `7 ngày qua (${formatDate(sevenDaysAgo)} - ${formatDate(today)})`;
      case 'this_month': 
        return `Tháng này, T${today.getMonth() + 1}/${today.getFullYear()}`;
      case 'last_month': 
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        return `Tháng trước, T${lastMonth.getMonth() + 1}/${lastMonth.getFullYear()}`;
      case 'this_year': 
        return `Năm nay, ${today.getFullYear()}`;
      default: return 'Chọn thời gian';
    }
  };

  const filteredData = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const filterByRange = (items: any[]) => {
      return items.filter(item => {
        const itemDate = parseDate(item.date);
        const itemTime = itemDate.getTime();
        
        if (dateRange === 'today') {
          return itemTime === startOfToday.getTime();
        }
        if (dateRange === 'yesterday') {
          const yesterday = new Date(startOfToday);
          yesterday.setDate(yesterday.getDate() - 1);
          return itemTime === yesterday.getTime();
        }
        if (dateRange === 'last_7_days') {
          const sevenDaysAgo = new Date(startOfToday);
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); // 7 days including today
          return itemTime >= sevenDaysAgo.getTime() && itemTime <= startOfToday.getTime();
        }
        if (dateRange === 'this_month') {
          return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
        }
        if (dateRange === 'last_month') {
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          return itemDate.getMonth() === lastMonth.getMonth() && itemDate.getFullYear() === lastMonth.getFullYear();
        }
        if (dateRange === 'this_year') {
          return itemDate.getFullYear() === now.getFullYear();
        }
        return true;
      });
    };

    return {
      invoices: filterByRange(invoices),
      returns: filterByRange(returnSalesOrders),
      cashTransactions: filterByRange(cashTransactions)
    };
  }, [invoices, returnSalesOrders, cashTransactions, dateRange]);

  const topProductsFiltered = useMemo(() => {
    const productSalesMap: Record<string, { name: string; qty: number; revenue: number; profit: number }> = {};
    
    filteredData.invoices.forEach(inv => {
      if (!inv.items) return;
      
      const invoiceTotalGoods = inv.items.reduce((sum: number, it: any) => sum + ((it.qty || 0) * (it.price || 0)), 0);
      const invoiceDiscount = inv.discount || 0;
      
      inv.items.forEach((item: any) => {
        if (!item.id || !item.name) return;
        if (!productSalesMap[item.id]) {
          productSalesMap[item.id] = { name: item.name, qty: 0, revenue: 0, profit: 0 };
        }
        productSalesMap[item.id].qty += item.qty || 0;
        
        const baseRevenue = (item.qty * item.price) || 0;
        let currentItemDiscount = 0;
        if (invoiceTotalGoods > 0 && invoiceDiscount > 0) {
          currentItemDiscount = (baseRevenue / invoiceTotalGoods) * invoiceDiscount;
        }
        const finalRevenue = baseRevenue - currentItemDiscount;
        const cost = (item.importPriceTotal || (item.qty * (item.importPrice || 0))) || 0;
        
        productSalesMap[item.id].revenue += finalRevenue;
        productSalesMap[item.id].profit += (finalRevenue - cost);
      });
    });

    return Object.values(productSalesMap)
      .sort((a, b) => {
        if (topProductTab === 'revenue') return b.revenue - a.revenue;
        if (topProductTab === 'profit') return b.profit - a.profit;
        return b.qty - a.qty;
      })
      .slice(0, 10);
  }, [filteredData.invoices, topProductTab]);

  const salesRecords = useMemo(() => {
    const dailyRecords: Record<string, number> = {};
    const monthlyRecords: Record<string, number> = {};

    invoices.forEach(inv => {
      if (!inv.date || !inv.total) return;
      const d = parseDate(inv.date);
      const dayKey = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
      const monthKey = `${d.getMonth() + 1}/${d.getFullYear()}`;

      dailyRecords[dayKey] = (dailyRecords[dayKey] || 0) + inv.total;
      monthlyRecords[monthKey] = (monthlyRecords[monthKey] || 0) + inv.total;
    });

    let maxDay = { date: 'N/A', amount: 0 };
    let maxMonth = { date: 'N/A', amount: 0 };

    Object.entries(dailyRecords).forEach(([date, amount]) => {
      if (amount > maxDay.amount) maxDay = { date, amount };
    });

    Object.entries(monthlyRecords).forEach(([date, amount]) => {
      if (amount > maxMonth.amount) maxMonth = { date, amount };
    });

    return { maxDay, maxMonth };
  }, [invoices]);

  const recentActivities = useMemo(() => {
    const activities: any[] = [];

    // Add Invoices
    invoices.forEach(inv => {
      activities.push({
        type: 'SALE',
        title: 'Bán hàng',
        subtitle: inv.customer || 'Khách lẻ',
        amount: inv.total || 0,
        date: parseDate(inv.date),
        dateStr: inv.date,
        icon: <ShoppingCart size={16} />,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50'
      });
    });

    // Add Import Orders
    importOrders.forEach(imp => {
      activities.push({
        type: 'IMPORT',
        title: 'Nhập hàng',
        subtitle: imp.supplier || 'NPP/NCC',
        amount: imp.total || 0,
        date: parseDate(imp.date),
        dateStr: imp.date,
        icon: <Box size={16} />,
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50'
      });
    });

    // Add Return Sales
    returnSalesOrders.forEach(ret => {
      activities.push({
        type: 'RETURN_SALE',
        title: 'Khách trả hàng',
        subtitle: ret.customer || 'Khách lẻ',
        amount: ret.total || 0,
        date: parseDate(ret.date),
        dateStr: ret.date,
        icon: <RotateCcw size={16} />,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50'
      });
    });

    // Add Return Imports
    returnImportOrders.forEach(ret => {
      activities.push({
        type: 'RETURN_IMPORT',
        title: 'Trả hàng nhập',
        subtitle: ret.supplier || 'NPP/NCC',
        amount: ret.total || 0,
        date: parseDate(ret.date),
        dateStr: ret.date,
        icon: <Undo2 size={16} />,
        color: 'text-red-600',
        bgColor: 'bg-red-50'
      });
    });

    // Add Cash Transactions
    cashTransactions.forEach(tx => {
      activities.push({
        type: 'CASH',
        title: tx.type === 'RECEIPT' ? 'Phiếu thu' : 'Phiếu chi',
        subtitle: tx.category || tx.note || 'Thu chi khác',
        amount: tx.amount || 0,
        date: parseDate(tx.date),
        dateStr: tx.date,
        icon: tx.type === 'RECEIPT' ? <ArrowDown size={16} /> : <ArrowUp size={16} />,
        color: tx.type === 'RECEIPT' ? 'text-amber-600' : 'text-rose-600',
        bgColor: tx.type === 'RECEIPT' ? 'bg-amber-50' : 'bg-rose-50'
      });
    });

    // Add Maintenance
    maintenanceRecords.forEach(rec => {
      activities.push({
        type: 'MAINTENANCE',
        title: 'Bảo hành/Sửa chữa',
        subtitle: rec.customerName || 'Khách hàng',
        amount: rec.totalFee || 0,
        date: parseDate(rec.createdAt),
        dateStr: rec.createdAt,
        icon: <Wrench size={16} />,
        color: 'text-violet-600',
        bgColor: 'bg-violet-50'
      });
    });

    return activities
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [invoices, importOrders, returnSalesOrders, returnImportOrders, cashTransactions, maintenanceRecords]);

  const topCustomers = useMemo(() => {
    const customerMap: Record<string, { name: string; total: number; count: number }> = {};
    const now = new Date();
    
    const filterByCustomerRange = (items: any[]) => {
      return items.filter(item => {
        const itemDate = parseDate(item.date);
        
        if (topCustomerRange === 'this_month') {
          return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
        }
        if (topCustomerRange === 'this_quarter') {
          const currentQuarter = Math.floor(now.getMonth() / 3);
          const itemQuarter = Math.floor(itemDate.getMonth() / 3);
          return currentQuarter === itemQuarter && itemDate.getFullYear() === now.getFullYear();
        }
        if (topCustomerRange === 'this_year') {
          return itemDate.getFullYear() === now.getFullYear();
        }
        return true;
      });
    };

    const periodInvoices = filterByCustomerRange(invoices);

    periodInvoices.forEach(inv => {
      const customerId = inv.customer || 'Khách lẻ';
      if (!customerMap[customerId]) {
        customerMap[customerId] = { name: customerId, total: 0, count: 0 };
      }
      customerMap[customerId].total += (inv.total || 0);
      customerMap[customerId].count += 1;
    });

    return Object.values(customerMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [invoices, topCustomerRange]);

  const customerDebts = useMemo(() => {
    if (!customers || !invoices) return [];
    
    return customers
      .filter((c: any) => {
        const name = (c.name || '').toLowerCase();
        return name !== 'khách lẻ' && name !== 'khách vãng lai' && c.debt > 0;
      })
      .map((c: any) => {
        let daysInDebt = 0;
        const customerInvoicesWithDebt = invoices.filter(inv => 
          (inv.customer === c.name || inv.phone === c.phone) && inv.debt > 0 && inv.status !== 'DRAFT'
        );
        
        if (customerInvoicesWithDebt.length > 0) {
           let oldest = parseDate(customerInvoicesWithDebt[0].date).getTime();
           for (let i = 1; i < customerInvoicesWithDebt.length; i++) {
             const t = parseDate(customerInvoicesWithDebt[i].date).getTime();
             if (t < oldest) oldest = t;
           }
           const diffTime = Math.abs(new Date().getTime() - oldest);
           daysInDebt = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }

        return {
          name: c.name,
          phone: c.phone,
          debt: c.debt,
          days: daysInDebt
        };
      })
      .sort((a, b) => b.debt - a.debt);
  }, [customers, invoices]);

  const supplierDebts = useMemo(() => {
    if (!suppliers || !importOrders) return [];
    
    return suppliers
      .filter((s: any) => s.totalDebt > 0)
      .map((s: any) => {
        let daysInDebt = 0;
        const supOrdersWithDebt = importOrders.filter(ord => 
          ord.supplier === s.name && ord.debt > 0 && ord.status !== 'DRAFT'
        );
        
        if (supOrdersWithDebt.length > 0) {
           let oldest = parseDate(supOrdersWithDebt[0].date).getTime();
           for (let i = 1; i < supOrdersWithDebt.length; i++) {
             const t = parseDate(supOrdersWithDebt[i].date).getTime();
             if (t < oldest) oldest = t;
           }
           const diffTime = Math.abs(new Date().getTime() - oldest);
           daysInDebt = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }

        return {
          name: s.name,
          phone: s.phone,
          debt: s.totalDebt,
          days: daysInDebt
        };
      })
      .sort((a, b) => b.debt - a.debt);
  }, [suppliers, importOrders]);

  const stats = useMemo(() => {
    const grossRevenue = filteredData.invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const totalOrders = filteredData.invoices.length;
    
    const grossCost = filteredData.invoices.reduce((sum, inv) => {
      const items = inv.items || [];
      return sum + items.reduce((iSum: number, item: any) => iSum + (item.importPriceTotal || ((item.qty || 0) * (item.importPrice || 0))), 0);
    }, 0);

    const totalReturns = filteredData.returns.reduce((sum, ret) => sum + (ret.total || 0), 0);
    const returnCount = filteredData.returns.length;

    const returnCost = filteredData.returns.reduce((sum, ret) => {
      const items = ret.items || [];
      return sum + items.reduce((iSum: number, item: any) => iSum + (item.importPriceTotal || ((item.qty || 0) * (item.importPrice || 0))), 0);
    }, 0);

    const totalRevenue = grossRevenue - totalReturns;
    const totalCost = grossCost - returnCost;
    const totalProfit = totalRevenue - totalCost;

    const totalCashIn = filteredData.cashTransactions
      .filter(tx => tx.type === 'RECEIPT')
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);

    const totalCashOut = filteredData.cashTransactions
      .filter(tx => tx.type === 'PAYMENT')
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);

    return {
      totalRevenue,
      totalOrders,
      totalProfit,
      totalReturns,
      returnCount,
      totalCashIn,
      totalCashOut
    };
  }, [filteredData]);

  // Chart data - group by day (always show last 7 days for visual context, or adjust to range)
  const chartData = useMemo(() => {
    if (dateRange === 'this_year') {
      const months = [...Array(12)].map((_, i) => `T${i + 1}`);
      const dataMap: Record<string, number> = {};
      months.forEach(m => dataMap[m] = 0);

      filteredData.invoices.forEach(inv => {
        if (!inv.date) return;
        const itemDate = parseDate(inv.date);
        const monthStr = `T${itemDate.getMonth() + 1}`;
        if (dataMap[monthStr] !== undefined) {
          dataMap[monthStr] += (inv.total || 0);
        }
      });

      return months.map(m => ({
        name: m,
        revenue: dataMap[m]
      }));
    }

    const daysToShow = dateRange === 'this_month' || dateRange === 'last_month' ? 30 : 7;
    const lastDays = [...Array(daysToShow)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (daysToShow - 1 - i));
      return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    });

    const dataMap: Record<string, number> = {};
    lastDays.forEach(day => dataMap[day] = 0);

    filteredData.invoices.forEach(inv => {
      if (!inv.date) return;
      const itemDate = parseDate(inv.date);
      const dayMonth = itemDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
      if (dataMap[dayMonth] !== undefined) {
        dataMap[dayMonth] += (inv.total || 0);
      }
    });

    return lastDays.map(day => ({
      name: day,
      revenue: dataMap[day]
    }));
  }, [filteredData, dateRange]);

  const formatKilo = (val: number) => {
    return formatNumber(val);
  };


  useMobileBackModal(showProfit, () => setShowProfit(false)); // auto-injected
  useMobileBackModal(showDateModal, () => setShowDateModal(false)); // auto-injected
  useMobileBackModal(showActivityModal, () => setShowActivityModal(false)); // auto-injected
  useMobileBackModal(!!selectedActivity, () => setSelectedActivity(null));
return (
    <div className="bg-slate-50 md:bg-transparent px-0 md:px-0 py-0 md:py-0">
      {/* Desktop View */}
      <div className="hidden md:block p-6">
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="md:col-span-2 bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-800 p-8 rounded-xl text-white shadow-lg relative overflow-hidden group border border-blue-500/20">
            <div className="relative z-10">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-blue-100 text-xs font-medium opacity-90">Kỳ xem</p>
                    <div className="flex items-center gap-2">
                      <select
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value as any)}
                        className="bg-white/20 text-white border-none rounded-md text-sm font-bold pl-2 pr-8 py-1 focus:ring-0 outline-none appearance-none cursor-pointer"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%></path>%3C/svg%3E")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.2em 1.2em' }}
                      >
                        <option value="today" className="text-slate-800">Hôm nay</option>
                        <option value="yesterday" className="text-slate-800">Hôm qua</option>
                        <option value="last_7_days" className="text-slate-800">7 ngày qua</option>
                        <option value="this_month" className="text-slate-800">Tháng này</option>
                        <option value="last_month" className="text-slate-800">Tháng trước</option>
                        <option value="this_year" className="text-slate-800">Năm nay</option>
                      </select>
                      <span className="text-blue-200 text-xs font-medium">({getRangeLabel().split(', ')[1] || getRangeLabel()})</span>
                    </div>
                  </div>
                  <p className="text-blue-100 text-[11px] font-normal tracking-widest mb-2 opacity-90">Doanh thu hệ thống</p>
                  <h2 className="text-4xl md:text-5xl font-medium mb-10 tracking-tight drop-shadow-md">{formatNumber(stats.totalRevenue)}đ</h2>
                </div>
                <div className="text-right">
                  <p className="text-blue-100 text-[11px] font-normal tracking-widest mb-2 opacity-90">Lợi nhuận</p>
                  <h2 className="text-3xl md:text-4xl font-medium mb-10 tracking-tight drop-shadow-md text-emerald-300">{formatNumber(stats.totalProfit)}đ</h2>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-lg border border-white/20 shadow-xl flex-1">
                  <p className="text-[10px] font-normal opacity-70 mb-1 tracking-widest">Đơn bán</p>
                  <p className="font-medium text-3xl tracking-tight">{stats.totalOrders}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-lg border border-white/20 shadow-xl flex-1">
                  <p className="text-[10px] font-normal opacity-70 mb-1 tracking-widest text-emerald-200">Tiền vào</p>
                  <p className="font-medium text-3xl tracking-tight text-emerald-300">+{formatNumber(stats.totalCashIn)}đ</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-lg border border-white/20 shadow-xl flex-1">
                  <p className="text-[10px] font-normal opacity-70 mb-1 tracking-widest text-rose-200">Tiền ra</p>
                  <p className="font-medium text-3xl tracking-tight text-rose-300">-{formatNumber(stats.totalCashOut)}đ</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-2">
              <Link to="/pos" className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-4 hover:border-blue-400 hover:shadow-md transition-all active:scale-95 group shadow-sm">
                <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center group-hover:rotate-3 transition-transform shadow-sm border border-orange-100 shrink-0">
                  <ShoppingCart size={20} />
                </div>
                <div className="text-left">
                  <p className="font-bold text-slate-800 text-sm tracking-tight truncate">Bán hàng (POS)</p>
                </div>
              </Link>
              <Link to="/import-history" className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-4 hover:border-indigo-400 hover:shadow-md transition-all active:scale-95 group shadow-sm">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center group-hover:rotate-3 transition-transform shadow-sm border border-indigo-100 shrink-0">
                  <Truck size={20} />
                </div>
                <div className="text-left">
                  <p className="font-bold text-slate-800 text-sm tracking-tight truncate">Nhập hàng</p>
                </div>
              </Link>
              <Link to="/reports" className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-4 hover:border-emerald-400 hover:shadow-md transition-all active:scale-95 group shadow-sm">
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center group-hover:rotate-3 transition-transform shadow-sm border border-emerald-100 shrink-0">
                  <PieChart size={20} />
                </div>
                <div className="text-left">
                  <p className="font-bold text-slate-800 text-sm tracking-tight truncate">Báo cáo</p>
                </div>
              </Link>
            </div>
            
            {/* Technical Shortcuts Dashboard Desktop Row 2 */}
            <div className="grid grid-cols-5 gap-2">
              <Link to="/wifi" title="Quản lý Wifi" className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col items-center justify-center hover:border-sky-400 hover:shadow-md transition-all active:scale-95 group shadow-sm">
                <div className="w-8 h-8 bg-sky-50 text-sky-500 rounded-full flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                  <Wifi size={16} />
                </div>
                <span className="text-[10px] font-bold text-slate-600 text-center leading-tight">Wifi</span>
              </Link>
              <Link to="/camera" title="Quản lý tài khoản" className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col items-center justify-center hover:border-indigo-400 hover:shadow-md transition-all active:scale-95 group shadow-sm">
                <div className="w-8 h-8 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                  <Shield size={16} />
                </div>
                <span className="text-[10px] font-bold text-slate-600 text-center leading-tight">Camera</span>
              </Link>
              <Link to="/camera-installations" title="Quản lý lắp đặt" className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col items-center justify-center hover:border-blue-400 hover:shadow-md transition-all active:scale-95 group shadow-sm">
                <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                  <Camera size={16} />
                </div>
                <span className="text-[10px] font-bold text-slate-600 text-center leading-tight">Lắp đặt</span>
              </Link>
              <Link to="/serials" title="Quản lý Serial" className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col items-center justify-center hover:border-slate-400 hover:shadow-md transition-all active:scale-95 group shadow-sm">
                <div className="w-8 h-8 bg-slate-50 text-slate-500 rounded-full flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                  <QrCode size={16} />
                </div>
                <span className="text-[10px] font-bold text-slate-600 text-center leading-tight">Serial</span>
              </Link>
              <Link to="/external-serials" title="Serial mở rộng" className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col items-center justify-center hover:border-teal-400 hover:shadow-md transition-all active:scale-95 group shadow-sm">
                <div className="w-8 h-8 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                  <Layers size={16} />
                </div>
                <span className="text-[10px] font-bold text-slate-600 text-center leading-tight">Mở rộng</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Desktop Top Products and Chart Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Desktop Revenue Chart & Customer Debts */}
          <div className="flex flex-col gap-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg text-slate-800 tracking-tight flex items-center gap-2">
                  <BarChart3 size={20} className="text-blue-500" /> Thống kê doanh thu
                </h3>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                      tickFormatter={(value) => value >= 1000000 ? `${(value / 1000000).toFixed(0)}Tr` : value}
                    />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: number) => [formatNumber(value) + 'đ', 'Doanh thu']}
                    />
                    <Bar dataKey="revenue" radius={[4, 4, 0, 0]} barSize={32}>
                      {chartData.map((entry, index) => (
                        <Cell key={`desktop-cell-${index}`} fill={index === chartData.length - 1 ? '#2563eb' : '#3b82f6'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Thống kê khách nợ */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex-1">
              <h3 className="font-bold text-lg text-slate-800 tracking-tight flex items-center gap-2 mb-6">
                <Wallet size={20} className="text-rose-500" /> Khách hàng đang nợ
              </h3>
              {customerDebts.length > 0 ? (
                <>
                  <div className="space-y-3">
                    {customerDebts.slice((customerDebtPage - 1) * DEBT_ITEMS_PER_PAGE, customerDebtPage * DEBT_ITEMS_PER_PAGE).map((c, i) => (
                      <div key={`desktop-cust-debt-${i}`} className="flex justify-between items-center p-3 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors border border-slate-100">
                        <div>
                          <p className="font-normal text-sm text-slate-800">{c.name}</p>
                          <p className="text-[11px] text-slate-500">{c.phone || 'Không có sđt'}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-rose-600 text-sm tracking-tight">{formatNumber(c.debt)}đ</p>
                          <p className="text-[11px] font-medium text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200 inline-block mt-1">
                            {c.days > 0 ? `Nợ ${c.days} ngày` : 'Mới nợ gần đây'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {customerDebts.length > DEBT_ITEMS_PER_PAGE && (
                    <div className="flex justify-center items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                      <button 
                        onClick={() => setCustomerDebtPage(p => Math.max(1, p - 1))}
                        disabled={customerDebtPage === 1}
                        className="p-1 rounded-md hover:bg-slate-100 disabled:opacity-50 text-slate-600"
                      >
                        <ChevronRight size={16} className="rotate-180" />
                      </button>
                      <span className="text-xs font-semibold text-slate-500">
                        {customerDebtPage} / {Math.ceil(customerDebts.length / DEBT_ITEMS_PER_PAGE)}
                      </span>
                      <button 
                        onClick={() => setCustomerDebtPage(p => Math.min(Math.ceil(customerDebts.length / DEBT_ITEMS_PER_PAGE), p + 1))}
                        disabled={customerDebtPage >= Math.ceil(customerDebts.length / DEBT_ITEMS_PER_PAGE)}
                        className="p-1 rounded-md hover:bg-slate-100 disabled:opacity-50 text-slate-600"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-6 text-slate-400 italic text-sm">Không có khách hàng nợ.</div>
              )}
            </div>

            {/* Thống kê nhà cung cấp nợ */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex-1">
              <h3 className="font-bold text-lg text-slate-800 tracking-tight flex items-center gap-2 mb-6">
                <Users size={20} className="text-orange-500" /> Nợ nhà cung cấp
              </h3>
              {supplierDebts.length > 0 ? (
                <>
                  <div className="space-y-3">
                    {supplierDebts.slice((supplierDebtPage - 1) * DEBT_ITEMS_PER_PAGE, supplierDebtPage * DEBT_ITEMS_PER_PAGE).map((s, i) => (
                      <div key={`desktop-supp-debt-${i}`} className="flex justify-between items-center p-3 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors border border-slate-100">
                        <div>
                          <p className="font-normal text-sm text-slate-800">{s.name}</p>
                          <p className="text-[11px] text-slate-500">{s.phone || 'Không có sđt'}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-orange-600 text-sm tracking-tight">{formatNumber(s.debt)}đ</p>
                          <p className="text-[11px] font-medium text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200 inline-block mt-1">
                            {s.days > 0 ? `Nợ ${s.days} ngày` : 'Mới nợ gần đây'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {supplierDebts.length > DEBT_ITEMS_PER_PAGE && (
                    <div className="flex justify-center items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                      <button 
                        onClick={() => setSupplierDebtPage(p => Math.max(1, p - 1))}
                        disabled={supplierDebtPage === 1}
                        className="p-1 rounded-md hover:bg-slate-100 disabled:opacity-50 text-slate-600"
                      >
                        <ChevronRight size={16} className="rotate-180" />
                      </button>
                      <span className="text-xs font-semibold text-slate-500">
                        {supplierDebtPage} / {Math.ceil(supplierDebts.length / DEBT_ITEMS_PER_PAGE)}
                      </span>
                      <button 
                        onClick={() => setSupplierDebtPage(p => Math.min(Math.ceil(supplierDebts.length / DEBT_ITEMS_PER_PAGE), p + 1))}
                        disabled={supplierDebtPage >= Math.ceil(supplierDebts.length / DEBT_ITEMS_PER_PAGE)}
                        className="p-1 rounded-md hover:bg-slate-100 disabled:opacity-50 text-slate-600"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-6 text-slate-400 italic text-sm">Không nợ nhà cung cấp.</div>
              )}
            </div>
          </div>
          
          {/* Desktop Top Products & Low Stock */}
          <div className="flex flex-col gap-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg text-slate-800 tracking-tight flex items-center gap-2">
                  <TrendingUp size={20} className="text-blue-500" /> Sản phẩm bán chạy
                </h3>
                <div className="flex items-center gap-3">
                  <select 
                    value={topProductLimit}
                    onChange={(e) => setTopProductLimit(parseInt(e.target.value))}
                    className="bg-slate-50 border border-slate-200 text-[10px] font-bold text-slate-500 rounded-lg px-2 py-1.5 outline-none"
                  >
                    <option value={6}>Hiện 6</option>
                    <option value={10}>Hiện 10</option>
                    <option value={20}>Hiện 20</option>
                  </select>
                  <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button 
                      onClick={() => setTopProductTab('quantity')}
                      className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${topProductTab === 'quantity' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Số lượng
                    </button>
                    <button 
                      onClick={() => setTopProductTab('revenue')}
                      className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${topProductTab === 'revenue' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Doanh thu
                    </button>
                    <button 
                      onClick={() => setTopProductTab('profit')}
                      className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${topProductTab === 'profit' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Lợi nhuận
                    </button>
                  </div>
                </div>
              </div>
              {topProductsFiltered.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
                  {topProductsFiltered.slice(0, topProductLimit).map((p, i) => (
                    <div key={`desktop-top-prod-${i}`} className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold shrink-0">#{i + 1}</span>
                          <p className="text-xs font-bold text-slate-600 text-right">{p.qty} sl</p>
                        </div>
                        <p className="font-normal text-sm text-slate-800 line-clamp-2 leading-snug">{p.name}</p>
                      </div>
                      <div className="mt-3 pt-3 border-t border-slate-200">
                        <div className="flex justify-between items-end">
                          <div>
                            <p className="text-[10px] text-slate-400 mb-0.5">Doanh thu:</p>
                            <p className="font-bold text-slate-700 text-xs tracking-tight">{formatNumber(p.revenue)}đ</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-emerald-500 font-bold mb-0.5">Lợi nhuận:</p>
                            <p className="font-bold text-emerald-600 text-sm tracking-tight">{formatNumber(p.profit)}đ</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400 italic text-sm">Chưa có dữ liệu bán hàng.</div>
              )}
            </div>

            {/* Desktop Low Stock */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <h3 className="font-bold text-lg text-slate-800 tracking-tight flex items-center gap-2 mb-6">
                <Box size={20} className="text-red-500" /> Sản phẩm sắp hết hàng
              </h3>
              {lowStockProducts.length > 0 ? (
                <>
                  <div className="space-y-3">
                    {lowStockProducts.slice((lowStockPage - 1) * LOW_STOCK_ITEMS_PER_PAGE, lowStockPage * LOW_STOCK_ITEMS_PER_PAGE).map((p, i) => (
                      <div key={`desktop-low-stock-${i}`} className="flex justify-between items-center p-3 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors border border-slate-100">
                        <div className="flex-1 min-w-0 pr-4">
                          <p className="font-bold text-sm text-slate-800 truncate">{p.name}</p>
                          <p className="text-[11px] text-slate-500">{p.id}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-black text-red-600 text-sm tracking-tight">{p.stock} <span className="text-xs font-normal">sl</span></p>
                          <p className="text-[11px] font-medium text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200 inline-block mt-1">
                            Tối thiểu: {p.lowStockThreshold ?? 5}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {lowStockProducts.length > LOW_STOCK_ITEMS_PER_PAGE && (
                    <div className="flex justify-center items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                      <button 
                        onClick={() => setLowStockPage(p => Math.max(1, p - 1))}
                        disabled={lowStockPage === 1}
                        className="p-1 rounded-md hover:bg-slate-100 disabled:opacity-50 text-slate-600"
                      >
                        <ChevronRight size={16} className="rotate-180" />
                      </button>
                      <span className="text-xs font-semibold text-slate-500">
                        {lowStockPage} / {Math.ceil(lowStockProducts.length / LOW_STOCK_ITEMS_PER_PAGE)}
                      </span>
                      <button 
                        onClick={() => setLowStockPage(p => Math.min(Math.ceil(lowStockProducts.length / LOW_STOCK_ITEMS_PER_PAGE), p + 1))}
                        disabled={lowStockPage >= Math.ceil(lowStockProducts.length / LOW_STOCK_ITEMS_PER_PAGE)}
                        className="p-1 rounded-md hover:bg-slate-100 disabled:opacity-50 text-slate-600"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-6 text-slate-400 italic text-sm">Không có sản phẩm nào sắp hết hàng.</div>
              )}
            </div>
          </div>
        </div>

        {/* Desktop Sales Records */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
           <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg shadow-orange-100 relative overflow-hidden group">
              <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform">
                <Star size={120} />
              </div>
              <div className="relative z-10">
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1">Kỷ lục doanh thu ngày</p>
                <h4 className="text-3xl font-black tracking-tighter mb-4">{formatNumber(salesRecords.maxDay.amount)}đ</h4>
                <div className="flex items-center gap-2 bg-white/20 w-fit px-3 py-1 rounded-full border border-white/30 backdrop-blur-sm">
                  <Calendar size={14} />
                  <span className="text-xs font-bold">{salesRecords.maxDay.date}</span>
                </div>
              </div>
           </div>
           
           <div className="bg-gradient-to-br from-indigo-500 to-blue-700 rounded-2xl p-6 text-white shadow-lg shadow-blue-100 relative overflow-hidden group">
              <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform">
                <TrendingUp size={120} />
              </div>
              <div className="relative z-10">
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1">Kỷ lục doanh thu tháng</p>
                <h4 className="text-3xl font-black tracking-tighter mb-4">{formatNumber(salesRecords.maxMonth.amount)}đ</h4>
                <div className="flex items-center gap-2 bg-white/20 w-fit px-3 py-1 rounded-full border border-white/30 backdrop-blur-sm">
                  <Calendar size={14} />
                  <span className="text-xs font-bold">Tháng {salesRecords.maxMonth.date}</span>
                </div>
              </div>
           </div>
        </div>

        {/* Desktop Top Customers Section */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg text-slate-800 tracking-tight flex items-center gap-2">
              <Users size={20} className="text-indigo-500" /> Khách hàng mua nhiều
            </h3>
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button 
                onClick={() => setTopCustomerRange('this_month')}
                className={`px-4 py-1.5 text-[11px] font-bold rounded-md transition-all ${topCustomerRange === 'this_month' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Tháng này
              </button>
              <button 
                onClick={() => setTopCustomerRange('this_quarter')}
                className={`px-4 py-1.5 text-[11px] font-bold rounded-md transition-all ${topCustomerRange === 'this_quarter' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Quý này
              </button>
              <button 
                onClick={() => setTopCustomerRange('this_year')}
                className={`px-4 py-1.5 text-[11px] font-bold rounded-md transition-all ${topCustomerRange === 'this_year' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Năm nay
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {topCustomers.length > 0 ? (
              topCustomers.slice(0, 9).map((c, i) => (
                <div key={`desktop-top-cust-${i}`} className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 group hover:border-indigo-300 transition-all">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 shadow-sm ${i === 0 ? 'bg-yellow-100 text-yellow-700 shadow-yellow-100' : i === 1 ? 'bg-slate-200 text-slate-700' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-white text-indigo-600 border border-indigo-100'}`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-normal text-slate-800 text-sm truncate group-hover:text-indigo-600 transition-colors">{c.name}</p>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-xs font-bold text-indigo-600 font-mono tracking-tighter">{formatNumber(c.total)}đ</span>
                      <span className="text-[10px] text-slate-400 font-medium">({c.count} hóa đơn)</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-12 text-slate-400 italic">Chưa có dữ liệu khách hàng trong kỳ này.</div>
            )}
          </div>
        </div>

        {/* Desktop Recent Activities Section (Bottom) */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 mb-8 overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg text-slate-800 tracking-tight flex items-center gap-2">
              <Clock size={20} className="text-slate-400" /> Hoạt động gần đây
            </h3>
            <div className="flex items-center gap-3">
              <select 
                value={activityLimit}
                onChange={(e) => setActivityLimit(parseInt(e.target.value))}
                className="bg-slate-50 border border-slate-200 text-[11px] font-bold text-slate-500 rounded-md px-2 py-1 outline-none"
              >
                <option value={5}>Hiện 5</option>
                <option value={10}>Hiện 10</option>
                <option value={20}>Hiện 20</option>
                <option value={30}>Hiện 30</option>
              </select>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-md uppercase tracking-wider block sm:inline-block">Thời gian thực</span>
            </div>
          </div>
          
          <div className="space-y-1">
            {recentActivities.length > 0 ? (
              <div className="grid grid-cols-1 divide-y divide-slate-100">
                {recentActivities.slice(0, activityLimit).map((act, i) => (
                  <div key={`desktop-activity-${i}`} className="flex items-center justify-between py-4 group hover:bg-slate-50 px-2 rounded-xl transition-all">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl ${act.bgColor} ${act.color} flex items-center justify-center shadow-sm`}>
                        {act.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-800 text-sm">{act.title}</p>
                          <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                          <p className="text-[10px] text-slate-400 font-bold">{act.dateStr}</p>
                        </div>
                        <p className="text-xs text-slate-500 font-medium truncate max-w-[200px]">{act.subtitle}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-black text-sm tracking-tight ${act.type === 'IMPORT' || (act.type === 'CASH' && (act.title === 'Phiếu chi' || act.title === 'Trả hàng nhập')) || act.type === 'RETURN_IMPORT' ? 'text-slate-700' : 'text-blue-600'}`}>
                        {act.type === 'IMPORT' || (act.type === 'CASH' && act.title === 'Phiếu chi') || act.type === 'RETURN_IMPORT' ? '-' : '+'}{formatNumber(act.amount)}đ
                      </p>
                      <button 
                        onClick={() => {
                          setSelectedActivity(act);
                          setShowActivityModal(true);
                        }}
                        className="text-[10px] font-bold text-slate-400 hover:text-blue-600 transition-colors opacity-0 group-hover:opacity-100 flex items-center gap-1 ml-auto mt-1"
                      >
                        Chi tiết <ChevronRight size={10} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400 italic">Chưa có hoạt động nào được ghi lại.</div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile View */}
      <div className="md:hidden flex flex-col gap-3 p-3 pb-24">
        {/* Simplified Date Selector */}
        <div className="flex items-center justify-between mb-1 pb-1">
          <h2 className="text-xl font-bold text-slate-800 tracking-tight shrink-0">Tổng quan</h2>
          <div className="relative max-w-[65%]">
            <div className="bg-blue-50 text-blue-600 rounded-lg text-[13px] font-bold px-3 py-2 flex items-center justify-end gap-1 shadow-sm border border-blue-100">
              <span className="truncate">{getRangeLabel()}</span>
              <ChevronDown size={14} className="shrink-0" />
            </div>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer text-right appearance-none"
            >
              <option value="today">Hôm nay</option>
              <option value="yesterday">Hôm qua</option>
              <option value="last_7_days">7 ngày qua</option>
              <option value="this_month">Tháng này</option>
              <option value="last_month">Tháng trước</option>
              <option value="this_year">Năm nay</option>
            </select>
          </div>
        </div>

        {/* Summary Card */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
          <div className="flex justify-between items-start gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-slate-400 text-[11px] font-normal tracking-wider mb-1 truncate">Doanh thu ({stats.totalOrders} đơn)</p>
              <div className="flex items-baseline gap-1 overflow-hidden">
                <span className="text-2xl sm:text-3xl font-bold text-blue-600 tracking-tight truncate">{formatKilo(stats.totalRevenue)}</span>
                <span className="text-[10px] font-medium text-slate-500 shrink-0">đ</span>
              </div>
            </div>
            <div className="text-right shrink-0 max-w-[50%]">
              <div className="flex items-center justify-end gap-2 mb-1">
                <p className="text-slate-400 text-[11px] font-normal tracking-wider">Lợi nhuận</p>
                <button onClick={() => setShowProfit(!showProfit)} className="text-slate-400 shrink-0">
                  {showProfit ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div className="flex items-baseline justify-end gap-1 overflow-hidden">
                {showProfit ? (
                  <>
                    <span className="text-xl sm:text-2xl font-bold text-emerald-500 tracking-tight truncate">{formatKilo(stats.totalProfit)}</span>
                    <span className="text-[10px] font-medium text-slate-500 shrink-0">đ</span>
                  </>
                ) : (
                  <span className="text-xl sm:text-2xl font-bold text-emerald-500 tracking-widest shrink-0">*** ***</span>
                )}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
            <div className="min-w-0">
              <p className="text-slate-400 text-[11px] font-normal tracking-wider mb-1 truncate">Tiền vào</p>
              <div className="flex items-baseline gap-1 overflow-hidden">
                <span className="text-lg sm:text-xl font-bold text-emerald-600 tracking-tight truncate">+{formatKilo(stats.totalCashIn)}</span>
                <span className="text-[10px] font-medium text-slate-500 shrink-0">đ</span>
              </div>
            </div>
            <div className="text-right min-w-0">
              <p className="text-slate-400 text-[11px] font-normal tracking-wider mb-1 truncate">Tiền ra</p>
              <div className="flex items-baseline justify-end gap-1 overflow-hidden">
                <span className="text-lg sm:text-xl font-bold text-rose-600 tracking-tight truncate">-{formatKilo(stats.totalCashOut)}</span>
                <span className="text-[10px] font-medium text-slate-500 shrink-0">đ</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-50 flex items-center gap-2 text-slate-500 overflow-hidden">
            <RotateCcw size={16} className="text-orange-400 shrink-0" />
            <span className="text-xs font-normal truncate">{stats.returnCount} đơn trả hàng - </span>
            <span className="text-sm font-medium text-slate-800 tracking-tight truncate">{formatKilo(stats.totalReturns)} đ</span>
          </div>
        </div>

        {/* Quick Menu */}
        <div className="flex flex-col gap-4 py-2">
          <div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1 flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div> Nghiệp vụ cửa hàng
            </div>
            <div className="grid grid-cols-5 gap-2">
              <Link to="/import-history" className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-md shadow-blue-100">
                  <Truck size={22} />
                </div>
                <span className="text-[11px] sm:text-xs font-bold text-slate-600 text-center leading-tight">Nhập<br />hàng hóa</span>
              </Link>
              <Link to="/return-import" className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 bg-orange-400 rounded-full flex items-center justify-center text-white shadow-md shadow-orange-100">
                  <RotateCcw size={22} />
                </div>
                <span className="text-[11px] sm:text-xs font-bold text-slate-600 text-center leading-tight">Hoàn hàng<br />nhập</span>
              </Link>
              <Link to="/maintenance" className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 bg-violet-400 rounded-full flex items-center justify-center text-white shadow-md shadow-violet-100">
                  <Wrench size={22} />
                </div>
                <span className="text-[11px] sm:text-xs font-bold text-slate-600 text-center leading-tight">Bảo hành<br />sửa chữa</span>
              </Link>
              <Link to="/cash-ledger" className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 bg-emerald-400 rounded-full flex items-center justify-center text-white shadow-md shadow-emerald-100">
                  <Wallet size={22} />
                </div>
                <span className="text-[11px] sm:text-xs font-bold text-slate-600 text-center leading-tight px-1 text-nowrap">Sổ quỹ</span>
              </Link>
              <Link to="/tasks" className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 bg-indigo-400 rounded-full flex items-center justify-center text-white shadow-md shadow-indigo-100">
                  <ClipboardList size={22} />
                </div>
                <span className="text-[11px] sm:text-xs font-bold text-slate-600 text-center leading-tight px-1 text-nowrap">Công việc</span>
              </Link>
            </div>
          </div>

          <div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1 flex items-center gap-2 mt-2">
              <div className="w-1.5 h-1.5 bg-sky-500 rounded-full"></div> Tiện ích kỹ thuật
            </div>
            <div className="grid grid-cols-5 gap-2">
              <Link to="/wifi" className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 bg-sky-400 rounded-full flex items-center justify-center text-white shadow-md shadow-sky-100">
                  <Wifi size={22} />
                </div>
                <span className="text-[11px] sm:text-xs font-bold text-slate-600 text-center leading-tight">Quản lý<br />Wifi</span>
              </Link>
              <Link to="/camera" className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center text-white shadow-md shadow-indigo-100">
                  <Shield size={22} />
                </div>
                <span className="text-[11px] sm:text-xs font-bold text-slate-600 text-center leading-tight">Quản lý<br />tài khoản</span>
              </Link>
              <Link to="/camera-installations" className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-md shadow-blue-100">
                  <Camera size={22} />
                </div>
                <span className="text-[11px] sm:text-xs font-bold text-slate-600 text-center leading-tight">Quản lý<br />lắp đặt</span>
              </Link>
              <Link to="/serials" className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 bg-slate-500 rounded-full flex items-center justify-center text-white shadow-md shadow-slate-100">
                  <QrCode size={22} />
                </div>
                <span className="text-[11px] sm:text-xs font-bold text-slate-600 text-center leading-tight">Quản lý<br />Serial</span>
              </Link>
              <Link to="/external-serials" className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 bg-teal-500 rounded-full flex items-center justify-center text-white shadow-md shadow-teal-100">
                  <Layers size={22} />
                </div>
                <span className="text-[11px] sm:text-xs font-bold text-slate-600 text-center leading-tight">Serial<br />mở rộng</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Top Selling Products - Mobile */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg text-slate-800 tracking-tight flex items-center gap-2">
              <TrendingUp size={18} className="text-blue-500" /> Sản phẩm bán chạy
            </h3>
            <div className="flex bg-slate-100 p-0.5 rounded-lg scale-90">
              <button 
                onClick={() => setTopProductTab('quantity')}
                className={`px-1.5 py-1 text-[9px] font-bold rounded-md transition-all ${topProductTab === 'quantity' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
              >
                SL
              </button>
              <button 
                onClick={() => setTopProductTab('revenue')}
                className={`px-1.5 py-1 text-[9px] font-bold rounded-md transition-all ${topProductTab === 'revenue' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
              >
                DT
              </button>
              <button 
                onClick={() => setTopProductTab('profit')}
                className={`px-1.5 py-1 text-[9px] font-bold rounded-md transition-all ${topProductTab === 'profit' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
              >
                LN
              </button>
            </div>
          </div>
          
          {topProductsFiltered.length > 0 ? (
            <div className="flex flex-col gap-3">
              {topProductsFiltered.slice(0, 5).map((p, i) => (
                <div key={`top-prod-${p.id}-${i}`} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-slate-200 text-slate-700' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-blue-50 text-blue-600'}`}>
                    #{i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-slate-800 truncate">{p.name}</p>
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-blue-600">{formatNumber(p.revenue)}đ</span>
                        <span className="text-[9px] text-slate-400 font-medium">({p.qty} sl)</span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-600 ml-auto">{formatNumber(p.profit)}đ LN</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
             <div className="text-center py-6 text-slate-400 italic text-sm">Chưa có dữ liệu bán hàng.</div>
          )}
        </div>

        {/* Sales Records - Mobile */}
        <div className="grid grid-cols-2 gap-2 mb-2">
           <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden h-28 flex flex-col justify-center">
              <Star className="absolute -right-2 -bottom-2 text-amber-500 opacity-10" size={60} />
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">Kỷ lục ngày</p>
              <h4 className="text-sm font-black text-slate-800 tracking-tighter mb-2">{formatNumber(salesRecords.maxDay.amount)}đ</h4>
              <p className="text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-full w-fit border border-amber-100">{salesRecords.maxDay.date}</p>
           </div>
           
           <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden h-28 flex flex-col justify-center">
              <TrendingUp className="absolute -right-2 -bottom-2 text-indigo-500 opacity-10" size={60} />
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">Kỷ lục tháng</p>
              <h4 className="text-sm font-black text-slate-800 tracking-tighter mb-2">{formatNumber(salesRecords.maxMonth.amount)}đ</h4>
              <p className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-full w-fit border border-indigo-100">{salesRecords.maxMonth.date}</p>
           </div>
        </div>

        {/* Top Customers - Mobile */}

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg text-slate-800 tracking-tight flex items-center gap-2">
              <Users size={18} className="text-indigo-500" /> Khách ưu tú
            </h3>
            <select 
              value={topCustomerRange}
              onChange={(e) => setTopCustomerRange(e.target.value as any)}
              className="bg-slate-100 text-[10px] font-bold text-indigo-600 px-2 py-1.5 rounded-lg border-none outline-none"
            >
              <option value="this_month">Tháng này</option>
              <option value="this_quarter">Quý này</option>
              <option value="this_year">Năm nay</option>
            </select>
          </div>
          
          {topCustomers.length > 0 ? (
            <div className="flex flex-col gap-3">
              {topCustomers.slice(0, 5).map((c, i) => (
                <div key={`top-cust-${c.name}-${i}`} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${i === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-indigo-500 border border-indigo-100'}`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-slate-800 truncate">{c.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-bold text-indigo-600">{formatNumber(c.total)}đ</span>
                      <span className="text-[10px] text-slate-400 font-medium">({c.count} hb)</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-slate-400 italic text-sm">Chưa có dữ liệu khách hàng.</div>
          )}
        </div>

        {/* Revenue Chart Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-4">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg text-slate-800 tracking-tight">Doanh thu</h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-blue-50 p-1.5 rounded-lg">
                <BarChart3 size={18} className="text-blue-600" />
              </div>
              <ArrowUpRight size={20} className="text-slate-300" />
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                  tickFormatter={(value) => value >= 1000000 ? `${(value / 1000000).toFixed(0)}Tr` : value}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [formatNumber(value) + 'đ', 'Doanh thu']}
                />
                <Bar dataKey="revenue" radius={[4, 4, 0, 0]} barSize={24}>
                  {chartData.map((entry, index) => (
                    <Cell key={`mobile-cell-${index}`} fill={index === chartData.length - 1 ? '#2563eb' : '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Mobile Customer Debts */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg text-slate-800 tracking-tight flex items-center gap-2">
              <Wallet size={18} className="text-rose-500" /> Khách hàng đang nợ
            </h3>
          </div>
          {customerDebts.length > 0 ? (
            <>
              <div className="space-y-3">
                {customerDebts.slice((customerDebtPage - 1) * DEBT_ITEMS_PER_PAGE, customerDebtPage * DEBT_ITEMS_PER_PAGE).map((c, i) => (
                  <div key={`mobile-cust-debt-${i}`} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div>
                      <p className="font-bold text-sm text-slate-800">{c.name}</p>
                      <p className="text-[11px] text-slate-500">{c.phone || 'Không có sđt'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-rose-600 text-sm tracking-tight">{formatNumber(c.debt)}đ</p>
                      <p className="text-[10px] font-medium text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200 inline-block mt-1">
                        {c.days > 0 ? `Nợ ${c.days} ngày` : 'Mới nợ gần đây'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {customerDebts.length > DEBT_ITEMS_PER_PAGE && (
                <div className="flex justify-center items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                  <button 
                    onClick={() => setCustomerDebtPage(p => Math.max(1, p - 1))}
                    disabled={customerDebtPage === 1}
                    className="p-1 rounded-md hover:bg-slate-100 disabled:opacity-50 text-slate-600"
                  >
                    <ChevronRight size={16} className="rotate-180" />
                  </button>
                  <span className="text-xs font-semibold text-slate-500">
                    {customerDebtPage} / {Math.ceil(customerDebts.length / DEBT_ITEMS_PER_PAGE)}
                  </span>
                  <button 
                    onClick={() => setCustomerDebtPage(p => Math.min(Math.ceil(customerDebts.length / DEBT_ITEMS_PER_PAGE), p + 1))}
                    disabled={customerDebtPage >= Math.ceil(customerDebts.length / DEBT_ITEMS_PER_PAGE)}
                    className="p-1 rounded-md hover:bg-slate-100 disabled:opacity-50 text-slate-600"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-6 text-slate-400 italic text-sm">Không có khách hàng nợ.</div>
          )}
        </div>

        {/* Mobile Supplier Debts */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg text-slate-800 tracking-tight flex items-center gap-2">
              <Users size={18} className="text-orange-500" /> Nợ nhà cung cấp
            </h3>
          </div>
          {supplierDebts.length > 0 ? (
            <>
              <div className="space-y-3">
                {supplierDebts.slice((supplierDebtPage - 1) * DEBT_ITEMS_PER_PAGE, supplierDebtPage * DEBT_ITEMS_PER_PAGE).map((s, i) => (
                  <div key={`mobile-supp-debt-${i}`} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div>
                      <p className="font-bold text-sm text-slate-800">{s.name}</p>
                      <p className="text-[11px] text-slate-500">{s.phone || 'Không có sđt'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-orange-600 text-sm tracking-tight">{formatNumber(s.debt)}đ</p>
                      <p className="text-[10px] font-medium text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200 inline-block mt-1">
                        {s.days > 0 ? `Nợ ${s.days} ngày` : 'Mới nợ gần đây'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {supplierDebts.length > DEBT_ITEMS_PER_PAGE && (
                <div className="flex justify-center items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                  <button 
                    onClick={() => setSupplierDebtPage(p => Math.max(1, p - 1))}
                    disabled={supplierDebtPage === 1}
                    className="p-1 rounded-md hover:bg-slate-100 disabled:opacity-50 text-slate-600"
                  >
                    <ChevronRight size={16} className="rotate-180" />
                  </button>
                  <span className="text-xs font-semibold text-slate-500">
                    {supplierDebtPage} / {Math.ceil(supplierDebts.length / DEBT_ITEMS_PER_PAGE)}
                  </span>
                  <button 
                    onClick={() => setSupplierDebtPage(p => Math.min(Math.ceil(supplierDebts.length / DEBT_ITEMS_PER_PAGE), p + 1))}
                    disabled={supplierDebtPage >= Math.ceil(supplierDebts.length / DEBT_ITEMS_PER_PAGE)}
                    className="p-1 rounded-md hover:bg-slate-100 disabled:opacity-50 text-slate-600"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-6 text-slate-400 italic text-sm">Không nợ nhà cung cấp.</div>
          )}
        </div>

        {/* Mobile Low Stock */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg text-slate-800 tracking-tight flex items-center gap-2">
              <Box size={18} className="text-red-500" /> Sắp hết hàng
            </h3>
          </div>
          {lowStockProducts.length > 0 ? (
            <>
              <div className="space-y-3">
                {lowStockProducts.slice((lowStockPage - 1) * LOW_STOCK_ITEMS_PER_PAGE, lowStockPage * LOW_STOCK_ITEMS_PER_PAGE).map((p, i) => (
                  <div key={`mobile-low-stock-${i}`} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex-1 min-w-0 pr-4">
                      <p className="font-bold text-sm text-slate-800 truncate">{p.name}</p>
                      <p className="text-[11px] text-slate-500">{p.id}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-black text-red-600 text-sm tracking-tight">{p.stock} <span className="text-xs font-normal">sl</span></p>
                      <p className="text-[10px] font-medium text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200 inline-block mt-1">
                        Tối thiểu: {p.lowStockThreshold ?? 5}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {lowStockProducts.length > LOW_STOCK_ITEMS_PER_PAGE && (
                <div className="flex justify-center items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                  <button 
                    onClick={() => setLowStockPage(p => Math.max(1, p - 1))}
                    disabled={lowStockPage === 1}
                    className="p-1 rounded-md hover:bg-slate-100 disabled:opacity-50 text-slate-600"
                  >
                    <ChevronRight size={16} className="rotate-180" />
                  </button>
                  <span className="text-xs font-semibold text-slate-500">
                    {lowStockPage} / {Math.ceil(lowStockProducts.length / LOW_STOCK_ITEMS_PER_PAGE)}
                  </span>
                  <button 
                    onClick={() => setLowStockPage(p => Math.min(Math.ceil(lowStockProducts.length / LOW_STOCK_ITEMS_PER_PAGE), p + 1))}
                    disabled={lowStockPage >= Math.ceil(lowStockProducts.length / LOW_STOCK_ITEMS_PER_PAGE)}
                    className="p-1 rounded-md hover:bg-slate-100 disabled:opacity-50 text-slate-600"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-6 text-slate-400 italic text-sm">Không có sản phẩm nào sắp hết hàng.</div>
          )}
        </div>

        {/* Recent Activities - Mobile (Bottom) */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg text-slate-800 tracking-tight flex items-center gap-2">
              <Clock size={18} className="text-slate-400" /> Hoạt động gần đây
            </h3>
            <select 
              value={activityLimit}
              onChange={(e) => setActivityLimit(parseInt(e.target.value))}
              className="bg-slate-50 border border-slate-200 text-[10px] font-bold text-slate-500 rounded-lg px-2 py-1.5 outline-none"
            >
              <option value={5}>Hiện 5</option>
              <option value={10}>Hiện 10</option>
              <option value={20}>Hiện 20</option>
              <option value={30}>Hiện 30</option>
            </select>
          </div>
          
          <div className="space-y-4">
            {recentActivities.length > 0 ? (
              recentActivities.slice(0, activityLimit).map((act, i) => (
                <div 
                  key={`activity-${act.id || i}`} 
                  className="flex items-center justify-between group active:bg-slate-50 transition-colors p-1 -mx-1 rounded-lg"
                  onClick={() => {
                    setSelectedActivity(act);
                    setShowActivityModal(true);
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl ${act.bgColor} ${act.color} flex items-center justify-center shadow-sm`}>
                      {act.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-xs text-slate-800 truncate">{act.title}</p>
                      <p className="text-[10px] text-slate-400 font-medium truncate max-w-[120px]">{act.subtitle}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold text-xs tracking-tight ${act.type === 'IMPORT' || (act.type === 'CASH' && (act.title === 'Phiếu chi' || act.title === 'Trả hàng nhập')) || act.type === 'RETURN_IMPORT' ? 'text-slate-700' : 'text-blue-600'}`}>
                      {act.type === 'IMPORT' || (act.type === 'CASH' && act.title === 'Phiếu chi') || act.type === 'RETURN_IMPORT' ? '-' : '+'}{formatNumber(act.amount)}đ
                    </p>
                    <p className="text-[9px] text-slate-300 font-bold mt-0.5">{formatDateTime(act.dateStr)}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-400 italic text-sm">Chưa có hoạt động nào.</div>
            )}
          </div>
        </div>

      </div>
      {/* Activity Details Modal */}
      {showActivityModal && selectedActivity && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-in fade-in transition-all backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in slide-in-from-bottom-4 duration-300">
            <div className={`p-6 ${selectedActivity.bgColor} flex flex-col items-center gap-4 relative`}>
              <button 
                onClick={() => setShowActivityModal(false)}
                className="absolute right-4 top-4 w-8 h-8 rounded-full bg-white/50 flex items-center justify-center text-slate-600 hover:bg-white hover:text-slate-900 transition-all border border-white/50"
              >
                ✕
              </button>
              <div className={`w-16 h-16 rounded-2xl ${selectedActivity.bgColor} ${selectedActivity.color} flex items-center justify-center shadow-lg border border-white/50`}>
                {React.cloneElement(selectedActivity.icon as React.ReactElement, { size: 32 })}
              </div>
              <div className="text-center">
                <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight">{selectedActivity.title}</h4>
                <p className="text-xs font-bold text-slate-500 opacity-70 italic">{formatDateTime(selectedActivity.dateStr)}</p>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Số tiền giao dịch</p>
                  <p className={`text-2xl font-black ${selectedActivity.type === 'IMPORT' || (selectedActivity.type === 'CASH' && (selectedActivity.title === 'Phiếu chi' || selectedActivity.title === 'Trả hàng nhập')) || selectedActivity.type === 'RETURN_IMPORT' ? 'text-slate-700' : 'text-blue-600'}`}>
                    {selectedActivity.type === 'IMPORT' || (selectedActivity.type === 'CASH' && (selectedActivity.title === 'Phiếu chi' || selectedActivity.title === 'Trả hàng nhập')) || selectedActivity.type === 'RETURN_IMPORT' ? '-' : '+'}{formatNumber(selectedActivity.amount)}đ
                  </p>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center px-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Đối tác</span>
                    <span className="text-sm font-bold text-slate-800">{selectedActivity.subtitle}</span>
                  </div>
                  <div className="flex justify-between items-center px-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Thời gian</span>
                    <span className="text-sm font-bold text-slate-800">{formatDateTime(selectedActivity.dateStr)}</span>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => setShowActivityModal(false)}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm tracking-wide active:scale-95 transition-all shadow-lg shadow-slate-200"
              >
                ĐÓNG CỬA SỔ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
