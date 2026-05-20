import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Plus, Wrench, Clock, CheckCircle, ArrowLeftRight, X, User, Phone, Tag, AlertCircle, ShoppingBag, Globe, ChevronLeft, ChevronRight, FileText, Calendar, CreditCard, Package, Printer, RotateCcw, Wallet, Edit3, History } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { MaintenanceRecord, Invoice } from '../types';
import { formatNumber, parseFormattedNumber, parseDateString } from '../lib/utils';
import { NumericFormat } from 'react-number-format';
import { generateId } from '../lib/idUtils';
import { apiService } from '../services/api';
import { useScrollLock } from '../hooks/useScrollLock';
import { useMobileBackModal } from '../hooks/useMobileBackModal';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { AddCustomerModal } from '../components/AddCustomerModal';
import { formatDateTime, handlePhoneCall } from '../lib/utils';

const toYMD = (dateStr: string | undefined | null) => {
  if (!dateStr) return '';
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  } else if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts[0].length === 4) return dateStr.substring(0, 10);
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }
  return dateStr;
};

const toDMY = (dateStr: string | undefined | null) => {
  if (!dateStr) return '---';
  if (dateStr.includes('-')) {
    const parts = dateStr.split('T')[0].split('-');
    if (parts[0].length === 4) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }
  return dateStr;
};

export const Maintenance: React.FC = () => {
  const { maintenanceRecords, addMaintenanceRecord, updateMaintenanceRecord, maintenanceTransfers, addMaintenanceTransfer, updateMaintenanceTransfer, customers, addCustomer, suppliers, addSupplier, invoices, externalSerials, addExternalSerial, currentUser, addInvoice, products, serials, updateProduct, returnSalesOrders, tasks, updateTask, wallets, addCashTransaction, cashTransactions, printSettings } = useAppContext();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<MaintenanceRecord | null>(null);
  const [selectedInvoiceForDetail, setSelectedInvoiceForDetail] = useState<Invoice | null>(null);

  // Handle Escape key to close modals in layers
  useEscapeKey(() => setSelectedInvoiceForDetail(null), !!selectedInvoiceForDetail);
  useEscapeKey(() => setSelectedRecord(null), !!selectedRecord);
  useEscapeKey(() => { setIsModalOpen(false); resetForm(); }, isModalOpen);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const taskId = params.get('taskId');
    if (params.get('type') === 'repair') {
      setIsModalOpen(true);
      
      if (taskId) {
        setNote(`Thực hiện cho CV #${taskId}`);
        setTaskIdFromUrlState(taskId);
      }
      
      const cid = params.get('customerId');
      if (cid && customers.length > 0) {
        const customer = customers.find(c => c.id === cid);
        if (customer) {
          setSelectedCustomerObj(customer);
          setCustomerName(customer.name);
          setCustomerPhone(customer.phone);
          setCustomerAddress(customer.address || '');
        }
      }
      // Clear URL params without reload
      window.history.replaceState(null, '', '/maintenance');
    }
  }, [location.search, customers]);

  // Form state
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [selectedCustomerObj, setSelectedCustomerObj] = useState<any>(null);
  const [selectedExternalDeviceObj, setSelectedExternalDeviceObj] = useState<any>(null);
  const [productName, setProductName] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [issue, setIssue] = useState('');
  const [cost, setCost] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [oldDebt, setOldDebt] = useState('');
  const [note, setNote] = useState('');
  const [feedbackText, setFeedbackText] = useState('');
  const [isEditingRecord, setIsEditingRecord] = useState(false);
  const [editRecordData, setEditRecordData] = useState<Partial<MaintenanceRecord>>({});
  const [taskIdFromUrlState, setTaskIdFromUrlState] = useState<string | null>(null);

  const [deviceSource, setDeviceSource] = useState<'STORE'|'EXTERNAL'>('STORE');
  const [customerSuggestions, setCustomerSuggestions] = useState<any[]>([]);
  const [storeDevices, setStoreDevices] = useState<any[]>([]);
  const [storeDeviceSearch, setStoreDeviceSearch] = useState('');
  const [storeDeviceSuggestions, setStoreDeviceSuggestions] = useState<any[]>([]);
  const [selectedStoreDeviceObj, setSelectedStoreDeviceObj] = useState<any>(null);
  const [externalDeviceSearch, setExternalDeviceSearch] = useState('');
  const [externalDeviceSuggestions, setExternalDeviceSuggestions] = useState<any[]>([]);
  
  const [isExternalModalOpen, setIsExternalModalOpen] = useState(false);
  const [newExtProduct, setNewExtProduct] = useState('');
  const [newExtSn, setNewExtSn] = useState('');
  const [newExtSource, setNewExtSource] = useState('');

  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  
  const [deviceWarrantyStatus, setDeviceWarrantyStatus] = useState<{isExpired: boolean, days: number, text: string} | null>(null);

  const [statusConfirmModal, setStatusConfirmModal] = useState<{isOpen: boolean, newStatus: any, recordId: string | null}>({isOpen: false, newStatus: null, recordId: null});
  
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [invoiceItems, setInvoiceItems] = useState<any[]>([]);
  const [invoiceSearchTerm, setInvoiceSearchTerm] = useState('');
  const [invoicePaid, setInvoicePaid] = useState('');
  const [invoiceDiscount, setInvoiceDiscount] = useState(0);
  const [invoiceWalletId, setInvoiceWalletId] = useState('');

  const [isSerialModalOpen, setIsSerialModalOpen] = useState(false);
  const [activeSerialProduct, setActiveSerialProduct] = useState<any>(null);

  const addInvoiceItem = (product: any, sn?: string) => {
    if (!product.isService && product.stock !== null && product.stock <= 0 && !sn) {
      alert("Sản phẩm tạm hết hàng trong kho!");
      return;
    }

    setInvoiceItems(prev => {
      const existing = prev.find(item => item.id === product.id);
      
      if (product.hasSerial) {
        if (!sn) {
          setActiveSerialProduct(product);
          setIsSerialModalOpen(true);
          return prev;
        }

        if (existing) {
          if (existing.serials?.includes(sn)) {
            alert("Serial đã chọn!");
            return prev;
          }
          return prev.map(i => i.id === product.id ? { 
            ...i, 
            qty: i.qty + 1, 
            serials: [...(i.serials || []), sn] 
          } : i);
        }

        return [...prev, { 
          id: product.id, 
          name: product.name, 
          price: product.price, 
          qty: 1, 
          hasSerial: true,
          serials: [sn],
          importPriceTotal: product.importPrice || 0
        }];
      }

      if (existing) {
        if (!product.isService && existing.qty >= (product.stock || 0)) {
          alert("Không đủ số lượng tồn kho!");
          return prev;
        }
        return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      }

      return [...prev, { 
        id: product.id, 
        name: product.name, 
        price: product.price, 
        qty: 1,
        importPriceTotal: product.importPrice || 0
      }];
    });
    
    setInvoiceSearchTerm('');
  };

  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferDest, setTransferDest] = useState('');
  const [transferAccessories, setTransferAccessories] = useState('');
  const [transferActionStatus, setTransferActionStatus] = useState<'Đóng hàng' | 'Đã chuyển' | 'Xử lý xong' | 'Hoàn thành nhận lại'>('Đóng hàng');
  const [transferCost, setTransferCost] = useState('');
  const [transferShippingCost, setTransferShippingCost] = useState('');
  const [transferDate, setTransferDate] = useState('');
  const [transferReturnDate, setTransferReturnDate] = useState('');
  const [transferNote, setTransferNote] = useState('');

  const [isTransferSupplierModalOpen, setIsTransferSupplierModalOpen] = useState(false);
  const [newTransferSupplierName, setNewTransferSupplierName] = useState('');
  const [newTransferSupplierPhone, setNewTransferSupplierPhone] = useState('');

  useEffect(() => {
    if (location.state?.openAddFromCustomer) {
      const c = location.state.openAddFromCustomer;
      setCustomerName(c.name);
      setCustomerPhone(c.phone);
      setCustomerAddress(c.address || c.location || '');
      setSelectedCustomerObj(c);
      setIsModalOpen(true);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  useMobileBackModal(isModalOpen, () => setIsModalOpen(false));
  useMobileBackModal(!!selectedRecord, () => setSelectedRecord(null));
  useMobileBackModal(!!selectedInvoiceForDetail, () => setSelectedInvoiceForDetail(null));
  useMobileBackModal(isTransferModalOpen, () => setIsTransferModalOpen(false));
  useMobileBackModal(isExternalModalOpen, () => setIsExternalModalOpen(false));
  useMobileBackModal(isCustomerModalOpen, () => setIsCustomerModalOpen(false));
  useMobileBackModal(isTransferSupplierModalOpen, () => setIsTransferSupplierModalOpen(false));
  useMobileBackModal(statusConfirmModal.isOpen, () => setStatusConfirmModal({ isOpen: false, newStatus: null, recordId: null }));
  useMobileBackModal(isInvoiceModalOpen, () => setIsInvoiceModalOpen(false));
  useMobileBackModal(isSerialModalOpen, () => setIsSerialModalOpen(false));
  useMobileBackModal(customerSuggestions.length > 0, () => setCustomerSuggestions([]));
  useMobileBackModal(externalDeviceSuggestions.length > 0, () => setExternalDeviceSuggestions([]));
  useMobileBackModal(isEditingRecord, () => setIsEditingRecord(false));

  // Lock scroll when any modal is open
  useScrollLock(
    isModalOpen || 
    !!selectedRecord || 
    !!selectedInvoiceForDetail ||
    isTransferModalOpen || 
    isExternalModalOpen || 
    isCustomerModalOpen || 
    isTransferSupplierModalOpen || 
    statusConfirmModal.isOpen ||
    isInvoiceModalOpen ||
    isSerialModalOpen
  );

  const filteredRecords = (maintenanceRecords || [])
    .filter(r => {
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
      return r.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
             r.customerPhone.includes(searchTerm) ||
             r.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
             (r.serialNumber || '').toLowerCase().includes(searchTerm.toLowerCase());
    })
    .sort((a, b) => parseDateString(b.date || '') - parseDateString(a.date || ''));

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, rowsPerPage]);

  const totalPages = Math.ceil(filteredRecords.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedRecords = filteredRecords.slice(startIndex, endIndex);

  const handleSave = async () => {
    if (!customerName || !customerPhone || !productName || !issue) {
      alert('Vui lòng nhập đủ thông tin bắt buộc');
      return;
    }

    const now = new Date();
    const id = generateId('BH', maintenanceRecords);
    const finalTaskId = taskIdFromUrlState || (note.startsWith('Thực hiện cho CV #') ? note.replace('Thực hiện cho CV #', '').split(' ')[0] : null);
    
    let warrantyInfo = 'Ngoài bảo hành';
    if (deviceWarrantyStatus && !deviceWarrantyStatus.isExpired && deviceWarrantyStatus.days > 0) {
      warrantyInfo = `Còn ${deviceWarrantyStatus.days} ngày`;
    }

    await addMaintenanceRecord({
      id,
      date: formatDateTime(now),
      customerId: selectedCustomerObj?.id,
      customerName,
      customerPhone,
      productName,
      serialNumber,
      issue,
      status: 'RECEIVING',
      cost: parseFormattedNumber(cost) || 0,
      paidAmount: parseFormattedNumber(paidAmount) || 0,
      oldDebt: parseFormattedNumber(oldDebt) || 0,
      newDebt: (parseFormattedNumber(oldDebt) || 0) + (parseFormattedNumber(cost) || 0) - (parseFormattedNumber(paidAmount) || 0),
      note,
      warrantyRemainingInfo: warrantyInfo,
      taskId: finalTaskId || undefined
    });

    if (finalTaskId) {
      const task = tasks.find(t => t.id === finalTaskId);
      if (task) {
        updateTask(finalTaskId, { 
          ...task, 
          status: 'COMPLETED',
          completedAt: formatDateTime(now),
          repairId: id
        });
      }
    }

    setIsModalOpen(false);
    resetForm();
  };

  const handleAddExternalSerial = async () => {
    if (!newExtProduct) {
      alert('Vui lòng nhập tên sản phẩm.');
      return;
    }
    const payload = {
      id: generateId('EX', externalSerials || []),
      date: formatDateTime(new Date()),
      product: newExtProduct,
      sn: newExtSn,
      source: newExtSource,
      customer: customerName, // Link to current customer
      createdBy: currentUser?.name || 'Admin',
    };
    
    // UI update right away for speed
    setProductName(payload.product);
    setSerialNumber(payload.sn);
    setSelectedExternalDeviceObj({
      product: payload.product,
      sn: payload.sn,
      source: payload.source
    });
    setExternalDeviceSearch('');
    setIsExternalModalOpen(false);
    setExternalDeviceSuggestions([]);
    
    try {
      await addExternalSerial(payload);
    } catch (err) {
      console.error(err);
      alert('Có lỗi khi thêm thiết bị.');
    }
  };

  const resetForm = () => {
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setProductName('');
    setSerialNumber('');
    setIssue('');
    setCost('');
    setPaidAmount('');
    setOldDebt('');
    setNote('');
    setDeviceSource('STORE');
    setStoreDevices([]);
    setCustomerSuggestions([]);
    setDeviceWarrantyStatus(null);
    setExternalDeviceSearch('');
    setExternalDeviceSuggestions([]);
    setCustomerSearchTerm('');
    setSelectedCustomerObj(null);
    setSelectedExternalDeviceObj(null);
    setSelectedStoreDeviceObj(null);
    setStoreDeviceSearch('');
    setStoreDeviceSuggestions([]);
  };

  const handleCustomerChange = (val: string) => {
    setCustomerSearchTerm(val);
    if (val.trim()) {
      setCustomerSuggestions(customers.filter(c => c.name.toLowerCase().includes(val.toLowerCase()) || (c.phone && c.phone.includes(val))));
    } else {
      setCustomerSuggestions([]);
    }
  };

  const handleSelectCustomer = (c: any) => {
    setSelectedCustomerObj(c);
    setCustomerName(c.name);
    setCustomerPhone(c.phone || '');
    setCustomerAddress(c.address || '');
    setOldDebt(c.debt ? c.debt.toString() : '0');
    setCustomerSuggestions([]);
    
    // Load store devices
    const custInvoices = invoices.filter(inv => inv.customer === c.name || (c.phone && inv.phone === c.phone));
    let devs: any[] = [];
    custInvoices.forEach(inv => {
      inv.items.forEach(item => {
        if (item.sn) {
           const sns = Array.isArray(item.sn) ? item.sn : item.sn.split(',').map((s:string) => s.trim());
           sns.forEach((s:string) => {
             devs.push({ name: item.name, sn: s, date: inv.date, warrantyExpiry: item.warrantyExpiry });
           });
        } else {
           devs.push({ name: item.name, sn: '', date: inv.date, warrantyExpiry: item.warrantyExpiry });
        }
      });
    });
    setStoreDevices(devs);
    setSelectedStoreDeviceObj(null);
    setStoreDeviceSearch('');
    setStoreDeviceSuggestions([]);

    // Auto-fill external devices to suggestions if they exist for this customer
    const custExternalSerials = (externalSerials || []).filter(s => s.customer === c.name);
    if (custExternalSerials.length > 0) {
      setExternalDeviceSuggestions(custExternalSerials);
      setDeviceSource('EXTERNAL');
    }
  };

  const handleStoreDeviceSearch = (val: string) => {
    setStoreDeviceSearch(val);
    if (val.trim()) {
      setStoreDeviceSuggestions(storeDevices.filter(d => 
        d.name.toLowerCase().includes(val.toLowerCase()) || 
        (d.sn && d.sn.toLowerCase().includes(val.toLowerCase()))
      ));
    } else {
      setStoreDeviceSuggestions(storeDevices);
    }
  };

  const handleSelectStoreDevice = (d: any) => {
    setSelectedStoreDeviceObj(d);
    setProductName(d.name);
    setSerialNumber(d.sn || '');
    calculateWarranty(d.warrantyExpiry);
    setStoreDeviceSearch('');
    setStoreDeviceSuggestions([]);
  };

  const handleSerialNumberChange = (val: string) => {
    setSerialNumber(val);
    
    // Auto-complete if full exact match (opt-in automatic)
    if (val.trim()) {
      const matchedExternal = (externalSerials || []).find(s => s.sn.toLowerCase() === val.toLowerCase());
      if (matchedExternal) {
        setProductName(matchedExternal.product);
        setExternalDeviceSearch(matchedExternal.product);
        setDeviceSource('EXTERNAL');
      }
    }
  };

  const getWarrantyDays = (expiryStr: string | undefined | null) => {
    if (!expiryStr) return null;
    const parts = expiryStr.split(/[\s,]+/);
    const datePart = parts.find(p => p.includes('/'));
    if (!datePart) return null;
    const [day, month, year] = datePart.split('/');
    if (!day || !month || !year) return null;
    
    const expiryDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 23, 59, 59);
    const now = new Date();
    const diffTime = expiryDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const calculateWarranty = (expiryStr: string | undefined | null) => {
    const diffDays = getWarrantyDays(expiryStr);
    
    if (diffDays === null) {
      setDeviceWarrantyStatus(null);
      return;
    }
    
    // expiryStr might have extra time info, clean it if needed for clean display
    const parts = (expiryStr || '').split(/[\s,]+/);
    const datePart = parts.find(p => p.includes('/')) || '';

    if (diffDays >= 0) {
      setDeviceWarrantyStatus({
        isExpired: false,
        days: diffDays,
        text: `Còn bảo hành ${diffDays} ngày (đến ${datePart})`
      });
    } else {
      setDeviceWarrantyStatus({
        isExpired: true,
        days: Math.abs(diffDays),
        text: `Ngoài bảo hành (hết hạn ${datePart})`
      });
    }
  };

  const handleExternalSearch = (val: string) => {
    setExternalDeviceSearch(val);
    setProductName(val);
    if (val.trim()) {
      setExternalDeviceSuggestions((externalSerials || []).filter(s => 
        s.product.toLowerCase().includes(val.toLowerCase()) || 
        (s.sn && s.sn.toLowerCase().includes(val.toLowerCase()))
      ));
    } else {
      // Show devices belonging to this customer when focused but empty search
      setExternalDeviceSuggestions((externalSerials || []).filter(s => s.customer === customerName));
    }
  };

  const handleSelectExternalDevice = (dev: any) => {
    setSelectedExternalDeviceObj(dev);
    setExternalDeviceSearch('');
    setProductName(dev.product);
    setSerialNumber(dev.sn || '');
    setExternalDeviceSuggestions([]);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RECEIVING': return 'bg-red-100 text-red-700';
      case 'REPAIRING': return 'bg-orange-100 text-orange-700';
      case 'COMPLETED': return 'bg-blue-100 text-blue-700';
      case 'RETURNED': return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getWarrantyColor = (info: string | undefined) => {
    if (!info || info.includes('Ngoài bảo hành') || info === 'Hết hạn' || info === '-') return 'text-slate-500';
    if (info.includes('Còn')) return 'text-emerald-600';
    return 'text-slate-700';
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'RECEIVING': return 'Tiếp nhận';
      case 'REPAIRING': return 'Đang sửa';
      case 'COMPLETED': return 'Đã xong';
      case 'RETURNED': return 'Đã trả khách';
      default: return status;
    }
  };


return (
    <div className="flex flex-col px-2 md:px-0 py-2 md:py-0">
      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4 shrink-0">
        <div className="flex-1 flex flex-col md:flex-row items-center gap-2">
          <div className="w-full bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2 focus-within:border-blue-400 transition-all">
            <Search className="text-slate-400" size={16} />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm phiếu bảo hành/sửa chữa..." 
              className="flex-1 bg-transparent text-sm font-medium outline-none"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full md:w-auto p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-400 shadow-sm text-slate-700"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="RECEIVING">Tiếp nhận</option>
            <option value="REPAIRING">Đang sửa</option>
            <option value="COMPLETED">Đã xong</option>
            <option value="RETURNED">Đã trả khách</option>
          </select>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="hidden md:flex px-6 py-3 bg-blue-600 text-white rounded-xl shadow-md items-center justify-center gap-2 font-semibold text-sm tracking-wide active:scale-95 transition-all hover:bg-blue-700"
        >
          <Plus size={16} /> Tiếp nhận máy
        </button>
      </div>

      <div className="flex-1 md:bg-white md:rounded-xl md:border md:border-slate-200 md:shadow-sm flex flex-col mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse hidden md:table">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 text-xs font-bold text-slate-500 tracking-wider uppercase">Mã phiếu</th>
                <th className="p-4 text-xs font-bold text-slate-500 tracking-wider uppercase">Khách hàng</th>
                <th className="p-4 text-xs font-bold text-slate-500 tracking-wider uppercase">Thiết bị</th>
                <th className="p-4 text-xs font-bold text-slate-500 tracking-wider uppercase">Tình trạng</th>
                <th className="p-4 text-xs font-bold text-slate-500 tracking-wider text-center uppercase">Trạng thái</th>
                <th className="p-4 text-xs font-bold text-slate-500 tracking-wider text-center uppercase">Bảo hành</th>
                <th className="p-4 text-xs font-bold text-slate-500 tracking-wider text-right uppercase">Chi phí</th>
                <th className="p-4 text-xs font-bold text-slate-500 tracking-wider text-right uppercase italic">Thanh toán</th>
                <th className="p-4 text-xs font-bold text-slate-500 tracking-wider text-right uppercase italic">Nợ trước đơn</th>
                <th className="p-4 text-xs font-bold text-slate-500 tracking-wider text-right uppercase italic">Nợ sau đơn</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-slate-400 italic text-sm">Chưa có phiếu bảo hành nào.</td>
                </tr>
              ) : (
                paginatedRecords.map(r => (
                  <tr 
                    key={`desktop-maint-${r.id}`} 
                    onClick={() => {
                      setSelectedRecord(r);
                      setFeedbackText(r.feedback || '');
                    }}
                    className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors cursor-pointer group"
                  >
                    <td className="p-4">
                      <span className="font-semibold text-sm text-slate-800 tracking-tight">{r.id}</span>
                      <p className="text-[10px] text-slate-400 font-medium mt-1">{r.date}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-semibold text-sm text-slate-800 tracking-tight">{r.customerName}</p>
                      <p className="text-xs text-slate-400 font-medium">{r.customerPhone}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-semibold text-sm text-slate-800 tracking-tight">{r.productName}</p>
                      {r.serialNumber && <p className="text-[10px] text-orange-500 font-medium tracking-wide font-mono">SN: {r.serialNumber}</p>}
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-slate-600 font-medium line-clamp-1">{r.issue}</p>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex flex-col items-center gap-1.5 justify-center h-full">
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold tracking-wide ${getStatusColor(r.status)}`}>
                          {getStatusText(r.status)}
                        </span>
                        {r.transferInfo && (
                          <span className="px-2 py-1 rounded text-[9px] font-bold bg-violet-100 text-violet-700 flex items-center justify-center gap-0.5 w-max">
                            <ArrowLeftRight size={10} /> Chuyển tuyến
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <p className={`text-xs font-bold ${getWarrantyColor(r.warrantyRemainingInfo || 'Ngoài bảo hành')}`}>
                        {r.warrantyRemainingInfo || 'Ngoài bảo hành'}
                      </p>
                    </td>
                    <td className="p-4 text-right">
                      <span className="font-semibold text-sm text-slate-800">{formatNumber(r.cost)}đ</span>
                    </td>
                    <td className="p-4 text-right">
                      <span className="font-semibold text-sm text-emerald-600 italic">{formatNumber(r.paidAmount || 0)}đ</span>
                    </td>
                    <td className="p-4 text-right">
                      <span className="font-semibold text-sm text-slate-500 italic">{formatNumber(r.oldDebt || 0)}đ</span>
                    </td>
                    <td className="p-4 text-right">
                      <span className="font-bold text-sm text-rose-600 italic">{formatNumber(r.newDebt || (r.oldDebt || 0) + r.cost - (r.paidAmount || 0))}đ</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Mobile Card View */}
          <div className="md:hidden bg-slate-50 p-3 space-y-2 flex-1 overflow-y-auto pb-24">
            {filteredRecords.length === 0 ? (
              <div className="p-10 text-center text-slate-400 italic text-sm bg-white rounded-2xl border border-slate-100">Chưa có phiếu bảo hành nào.</div>
            ) : (
              paginatedRecords.map(r => (
                <div 
                  key={`mobile-maint-${r.id}`} 
                  onClick={() => {
                    setSelectedRecord(r);
                    setFeedbackText(r.feedback || '');
                  }}
                  className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 space-y-2 active:border-blue-300 transition-colors cursor-pointer relative overflow-hidden"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-slate-900 tracking-tight text-sm">#{r.id}</span>
                        {r.transferInfo && (
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-violet-100 text-violet-700 uppercase tracking-tighter flex items-center gap-0.5">
                            <ArrowLeftRight size={8} /> CT
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold mt-1 flex items-center gap-1">
                        <Calendar size={10} /> {r.date}
                      </p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-widest uppercase ${getStatusColor(r.status)}`}>
                      {getStatusText(r.status)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-base text-slate-800 truncate">{r.customerName}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <p className="text-xs text-slate-500 font-bold font-mono leading-none">{r.customerPhone}</p>
                        {r.customerPhone && (
                          <div className="flex items-center gap-1.5 ml-1">
                            <a href="#" onClick={(e) => handlePhoneCall(e, r.customerPhone)} className="w-6 h-6 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center hover:bg-emerald-100 transition-colors shadow-sm">
                              <Phone size={12} className="fill-emerald-600 text-transparent" />
                            </a>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                const msg = `Chào ${r.customerName}, thiết bị ${r.productName} đã xong tại ${printSettings?.storeName || 'Cửa hàng'}.`;
                                window.open(`sms:${r.customerPhone}?body=${encodeURIComponent(msg)}`, '_self');
                              }}
                              className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded-md text-[9px] font-black uppercase tracking-tighter"
                            >
                              SMS
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                const msg = `Chào ${r.customerName}, thiết bị ${r.productName} của bạn đã được ${r.status === 'COMPLETED' ? 'kiểm tra/bảo hành xong' : 'tiếp nhận bảo hành'} tại ${printSettings?.storeName || 'Cửa hàng'}.${r.status === 'COMPLETED' ? ' Vui lòng đến cửa hàng để nhận lại thiết bị nhé.' : ''}`;
                                navigator.clipboard.writeText(msg).then(() => {
                                  window.open(`https://zalo.me/${r.customerPhone.replace(/[\s\-\.]/g, '')}`, '_blank');
                                });
                              }}
                              className="px-2 py-1 bg-blue-50 text-blue-600 rounded-md text-[9px] font-black uppercase tracking-tighter"
                            >
                              Zalo
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 py-2 px-3 rounded-lg border border-slate-100 flex flex-wrap items-center gap-2">
                    <Package size={14} className="text-slate-400 shrink-0" />
                    <span className="text-xs font-bold text-slate-800 leading-none truncate max-w-[150px]">{r.productName}</span>
                    {r.serialNumber && (
                      <span className="text-[10px] text-orange-600 font-black font-mono whitespace-nowrap border-l border-slate-200 pl-2">SN: {r.serialNumber}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pagination */}
        {filteredRecords.length > 0 && (
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
                {startIndex + 1} - {Math.min(endIndex, filteredRecords.length)} trên tổng {filteredRecords.length}
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

      {/* Add Maintenance Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg max-h-[90vh] flex flex-col rounded-xl shadow-2xl animate-in fade-in zoom-in duration-200 overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 shrink-0">
              <h3 className="text-lg font-bold text-slate-800 tracking-tight">Tiếp nhận bảo hành / sửa chữa</h3>
              <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 bg-slate-50 text-slate-400 rounded-full hover:bg-slate-200 transition-colors flex items-center justify-center">
                <X size={18} />
              </button>
            </div>
            
            <div className={`p-6 space-y-4 flex-1 overflow-y-auto no-scrollbar`}>
              {!selectedCustomerObj ? (
                <div className="relative">
                  <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg overflow-hidden shadow-inner focus-within:border-blue-400 mt-1">
                    <Search className="text-slate-400 ml-3 shrink-0" size={16} />
                    <input 
                      type="text" 
                      value={customerSearchTerm}
                      onChange={(e) => handleCustomerChange(e.target.value)}
                      className="w-full p-3 bg-transparent text-sm font-semibold outline-none" 
                      placeholder="Tìm tên hoặc số điện thoại khách hàng..." 
                    />
                  </div>
                  {(customerSuggestions.length > 0 || (customerSearchTerm.trim() && customerSuggestions.length === 0)) && (
                    <div className="bg-white border border-slate-200 rounded-lg shadow-md mt-2 max-h-[40vh] overflow-y-auto flex flex-col shrink-0">
                      <div className="overflow-y-auto flex-1">
                        {customerSuggestions.map((c, idx) => (
                          <div 
                            key={`cust-sugg-${c.id || idx}`} 
                            onClick={() => handleSelectCustomer(c)}
                            className="p-3 border-b border-slate-50 hover:bg-slate-50 cursor-pointer flex justify-between items-center transition-colors"
                          >
                            <div>
                              <p className="text-sm font-bold text-slate-800">{c.name}</p>
                              <p className="text-[10px] text-slate-500">{c.address}</p>
                            </div>
                            <span className="text-xs font-medium text-slate-600">{c.phone}</span>
                          </div>
                        ))}
                      </div>
                      
                      {customerSearchTerm.trim() && customerSuggestions.length === 0 && (
                        <div 
                          onClick={() => {
                            setIsCustomerModalOpen(true);
                            setCustomerSuggestions([]);
                          }}
                          className="p-3 bg-blue-50 text-blue-700 font-bold text-sm text-center cursor-pointer hover:bg-blue-100 transition-colors border-t border-blue-100 flex items-center justify-center gap-2"
                        >
                          <Plus size={16} /> Thêm mới khách hàng "{customerSearchTerm}"
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 relative group">
                  <button 
                    onClick={() => { setSelectedCustomerObj(null); setCustomerName(''); setCustomerPhone(''); setCustomerAddress(''); setStoreDevices([]); setDeviceSource('STORE'); setDeviceWarrantyStatus(null); setCustomerSearchTerm(''); setProductName(''); setSerialNumber(''); }} 
                    className="absolute top-2 right-2 text-slate-400 hover:text-red-500 hidden group-hover:block transition-colors"
                    title="Xóa khách hàng"
                  >
                    <X size={16} />
                  </button>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 shrink-0 bg-white shadow-sm">
                      <User size={14} />
                    </div>
                    <div className="flex-1 overflow-hidden flex items-center justify-between gap-4">
                      <div className="truncate">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest leading-none mb-1">Khách hàng</p>
                        <p className="text-sm font-bold text-slate-800 truncate">{selectedCustomerObj.name}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="flex items-center justify-end text-[12px]">
                          <span className="text-slate-400 font-bold mr-1">ĐT:</span>
                          <span className="text-slate-600 font-medium">{selectedCustomerObj.phone || '---'}</span>
                        </div>
                        <div className="flex items-center justify-end text-[11px] mt-0.5">
                          <span className="text-slate-400 font-bold mr-1">Đ/C:</span>
                          <span className="text-slate-500 font-medium truncate max-w-[150px]">{selectedCustomerObj.address || '---'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {selectedCustomerObj && (
                <>
                  <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl">
                <div className="flex flex-wrap items-center gap-4 mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="deviceSource" 
                      checked={deviceSource === 'STORE'}
                      onChange={() => setDeviceSource('STORE')}
                      className="text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <span className="text-sm font-bold text-slate-700 flex items-center gap-1.5"><ShoppingBag size={14} className="text-slate-400" /> Đã mua tại shop (Hệ thống mới)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="deviceSource" 
                      checked={deviceSource === 'EXTERNAL'}
                      onChange={() => {
                        setDeviceSource('EXTERNAL');
                        setProductName('');
                        setSerialNumber('');
                      }}
                      className="text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <span className="text-sm font-bold text-slate-700 flex items-center gap-1.5"><Globe size={14} className="text-slate-400" /> Serial mở rộng</span>
                  </label>
                </div>

                {deviceSource === 'STORE' ? (
                  <div className="space-y-3">
                    {storeDevices.length > 0 ? (
                      <div className="relative">
                        <label className="text-[9px] font-semibold text-slate-400 tracking-wider ml-1 mb-1 block">Chọn máy đã mua</label>
                        {!selectedStoreDeviceObj ? (
                          <>
                            <input 
                              type="text" 
                              value={storeDeviceSearch}
                              onFocus={() => {
                                if (!storeDeviceSearch) handleStoreDeviceSearch('');
                              }}
                              onChange={(e) => handleStoreDeviceSearch(e.target.value)}
                              className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none shadow-sm focus:border-blue-400" 
                              placeholder="Nhập tên máy hoặc serial để tìm kiếm..." 
                            />
                            {(storeDeviceSuggestions.length > 0 || (storeDeviceSearch && storeDeviceSuggestions.length === 0)) && (
                              <div className="bg-white border text-left border-slate-200 rounded-lg shadow-md mt-1 max-h-[40vh] flex flex-col overflow-hidden shrink-0 z-10 absolute w-full">
                                <div className="overflow-y-auto flex-1">
                                  {storeDeviceSuggestions.map((d, idx) => {
                                    let dateStr = d.date;
                                    if (dateStr.includes(' ')) dateStr = dateStr.split(' ')[0];
                                    else if (dateStr.includes(',')) dateStr = dateStr.split(',')[0];
                                    
                                    const daysLeft = getWarrantyDays(d.warrantyExpiry);
                                    let warrantyTag = '';
                                    if (daysLeft !== null) {
                                      if (daysLeft >= 0) warrantyTag = `Còn BH ${daysLeft} ngày`;
                                      else warrantyTag = `Hết BH`;
                                    }

                                    return (
                                      <div 
                                        key={`store-dev-${d.id || idx}`} 
                                        onClick={() => handleSelectStoreDevice(d)}
                                        className="px-3 py-2.5 border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors flex flex-col justify-center"
                                      >
                                        <div className="flex items-center justify-between gap-3">
                                          <p className="text-[13px] font-bold text-slate-800 truncate">{d.name}</p>
                                          {d.sn && (
                                            <span className="shrink-0 text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                                              {d.sn}
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex items-center justify-between mt-0.5">
                                          <p className="text-[11px] text-slate-400">Mua: <span className="font-medium text-slate-600">{dateStr}</span></p>
                                          {warrantyTag && (
                                            <span className={`text-[9px] font-bold px-1.5 rounded uppercase tracking-wider ${
                                              daysLeft !== null && daysLeft < 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                                            }`}>
                                              {warrantyTag}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                                {storeDeviceSearch && storeDeviceSuggestions.length === 0 && (
                                  <div className="p-3 text-center text-xs text-slate-500 italic bg-slate-50">
                                    Không tìm thấy thiết bị phù hợp. Bạn có thể chọn mục "Mua tại shop (Máy cũ)" để nhập tay.
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="bg-white border text-left border-slate-200 rounded-lg p-3 relative group shadow-sm flex items-center justify-between gap-3">
                            <div className="flex-1 overflow-hidden">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-bold text-slate-700 truncate">{selectedStoreDeviceObj.name}</p>
                                {selectedStoreDeviceObj.sn && (
                                  <div className="inline-flex shrink-0 items-center px-1.5 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-600 font-mono font-bold text-[10px] rounded">
                                    {selectedStoreDeviceObj.sn}
                                  </div>
                                )}
                              </div>
                            </div>
                            <button 
                              onClick={() => {
                                setSelectedStoreDeviceObj(null);
                                setProductName('');
                                setSerialNumber('');
                                setDeviceWarrantyStatus(null);
                                setStoreDeviceSearch('');
                              }} 
                              className="shrink-0 text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-full transition-colors"
                              title="Chọn thiết bị khác"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        )}
                        
                        {deviceWarrantyStatus && (
                          <div className={`mt-3 p-3 rounded-xl text-xs font-bold flex items-center justify-between border shadow-sm animate-in slide-in-from-top-2 duration-300 ${
                            deviceWarrantyStatus.isExpired 
                            ? 'bg-rose-50 text-rose-600 border-rose-200' 
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}
                          >
                            <div className="flex items-center gap-2">
                              {deviceWarrantyStatus.isExpired 
                                ? <AlertCircle size={16} className="text-rose-500 shrink-0" /> 
                                : <CheckCircle size={16} className="text-emerald-500 shrink-0" />
                              }
                              <span>{deviceWarrantyStatus.text}</span>
                            </div>
                            {!deviceWarrantyStatus.isExpired && (
                              <span className="bg-emerald-600 text-white px-2 py-0.5 rounded text-[9px] uppercase tracking-wider">Active</span>
                            )}
                            {deviceWarrantyStatus.isExpired && (
                              <span className="bg-rose-600 text-white px-2 py-0.5 rounded text-[9px] uppercase tracking-wider">Expired</span>
                            )}
                          </div>
                        )}
                        
                        {(maintenanceRecords || []).find(r => r.serialNumber === serialNumber && r.status !== 'RETURNED' && serialNumber !== '') && (
                          <div className="mt-2 p-3 bg-orange-50 border border-orange-200 text-orange-700 rounded-lg text-[11px] font-semibold flex items-start gap-2 shadow-sm animate-in zoom-in duration-200">
                            <AlertCircle size={14} className="mt-0.5 shrink-0" />
                            <span>Thiết bị này đang trong trạng thái <strong>Bảo hành / Sửa chữa</strong> (chưa trả khách). Vui lòng kiểm tra lại trước khi tạo thêm.</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-3 bg-white border border-dashed border-slate-300 rounded-lg text-center text-xs text-slate-500 italic">
                        {customerName ? 'Khách hàng này chưa có lịch sử mua máy tại cửa hàng.' : 'Vui lòng chọn khách hàng để tra cứu lịch sử mua.'}
                        <div className="mt-2 text-[11px] text-blue-600 font-medium">Bạn có thể chọn "Serial mở rộng" để tìm kiếm hoặc thêm mới nếu máy mua trước khi dùng phần mềm hoặc máy mua nơi khác.</div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {!selectedExternalDeviceObj ? (
                      <div className="relative">
                        <label className="text-[9px] font-semibold text-slate-400 tracking-wider ml-1">Số Serial / Tên thiết bị</label>
                        <input 
                          type="text" 
                          value={externalDeviceSearch}
                          onFocus={() => {
                            if (!externalDeviceSearch) handleExternalSearch('');
                          }}
                          onChange={(e) => handleExternalSearch(e.target.value)}
                          className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm font-semibold outline-none shadow-sm focus:border-blue-400" 
                          placeholder="Nhập Serial hoặc Tên máy để tìm..." 
                        />
                        {(externalDeviceSuggestions.length > 0 || (externalDeviceSearch && externalDeviceSuggestions.length === 0)) && (
                          <div className="bg-white border border-slate-200 rounded-lg shadow-md mt-2 max-h-[40vh] flex flex-col overflow-hidden shrink-0">
                            <div className="overflow-y-auto flex-1">
                              {externalDeviceSuggestions.map((dev, idx) => (
                                <div 
                                  key={`ext-dev-${dev.id || idx}`} 
                                  onClick={() => handleSelectExternalDevice(dev)}
                                  className="px-3 py-2.5 border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors flex flex-col justify-center"
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <p className="text-[13px] font-bold text-slate-800 truncate">{dev.product}</p>
                                    {dev.sn && (
                                      <span className="shrink-0 text-[10px] font-mono font-bold text-orange-600 bg-orange-50/80 px-1.5 py-0.5 rounded border border-orange-100">
                                        {dev.sn}
                                      </span>
                                    )}
                                  </div>
                                  {dev.source && <p className="text-[11px] text-slate-400 mt-0.5 truncate">Nơi bán: <span className="font-medium text-slate-500">{dev.source}</span></p>}
                                </div>
                              ))}
                            </div>
                            
                            {externalDeviceSearch && externalDeviceSuggestions.length === 0 && (
                              <div 
                                onClick={() => {
                                  setNewExtProduct('');
                                  setNewExtSn(externalDeviceSearch);
                                  setNewExtSource('');
                                  setIsExternalModalOpen(true);
                                  setExternalDeviceSuggestions([]);
                                }}
                                className="p-3 bg-blue-50 text-blue-700 font-bold text-sm text-center cursor-pointer hover:bg-blue-100 transition-colors border-t border-blue-100 flex items-center justify-center gap-2"
                              >
                                <Plus size={16} /> Thêm mới thiết bị "{externalDeviceSearch}"
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                      <div className="bg-white border text-left border-slate-200 rounded-lg p-3 py-2.5 relative group shadow-sm mt-1 flex items-center justify-between gap-3">
                        <div className="flex-1 overflow-hidden">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-slate-700 truncate">{selectedExternalDeviceObj.product}</p>
                            {selectedExternalDeviceObj.sn && (
                              <div className="inline-flex shrink-0 items-center px-1.5 py-0.5 bg-orange-50 border border-orange-200 text-orange-600 font-mono font-bold text-[10px] rounded">
                                {selectedExternalDeviceObj.sn}
                              </div>
                            )}
                          </div>
                          {selectedExternalDeviceObj.source && (
                            <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                              Nơi bán: <span className="font-medium text-slate-500">{selectedExternalDeviceObj.source}</span>
                            </div>
                          )}
                        </div>
                        <button 
                          onClick={() => {
                            setSelectedExternalDeviceObj(null);
                            setProductName('');
                            setSerialNumber('');
                            setExternalDeviceSearch('');
                          }} 
                          className="shrink-0 text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-full transition-colors"
                          title="Chọn thiết bị khác"
                        >
                          <X size={16} />
                        </button>
                      </div>
                      
                      {(maintenanceRecords || []).find(r => r.serialNumber === serialNumber && r.status !== 'RETURNED' && serialNumber !== '') && (
                        <div className="mt-2 p-3 bg-orange-50 border border-orange-200 text-orange-700 rounded-lg text-[11px] font-semibold flex items-start gap-2 shadow-sm animate-in zoom-in duration-200">
                          <AlertCircle size={14} className="mt-0.5 shrink-0" />
                          <span>Thiết bị này đang trong trạng thái <strong>Bảo hành / Sửa chữa</strong> (chưa trả khách). Vui lòng kiểm tra lại trước khi tạo thêm.</span>
                        </div>
                      )}
                    </>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="text-[9px] font-semibold text-slate-400 tracking-wider ml-1">Tình trạng / Lỗi</label>
                <textarea 
                  value={issue}
                  onChange={(e) => setIssue(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none mt-1 shadow-inner focus:border-blue-400 h-20" 
                  placeholder="Mô tả lỗi của máy..." 
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-[9px] font-semibold text-slate-400 tracking-wider ml-1">Nợ trước đơn (đ)</label>
                  <NumericFormat 
                    value={oldDebt}
                    thousandSeparator="."
                    decimalSeparator=","
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold outline-none mt-1 shadow-inner opacity-80 cursor-not-allowed text-slate-500" 
                    placeholder="0"
                    readOnly
                  />
                </div>
                <div>
                  <label className="text-[9px] font-semibold text-slate-400 tracking-wider ml-1">Dự kiến chi phí (đ)</label>
                  <NumericFormat 
                    value={cost}
                    onValueChange={(values) => setCost(values.value || '')}
                    thousandSeparator="."
                    decimalSeparator=","
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold outline-none mt-1 shadow-inner focus:border-blue-400" 
                    placeholder="0" 
                  />
                </div>
                <div>
                  <label className="text-[9px] font-semibold text-slate-400 tracking-wider ml-1 text-emerald-600">Đã thanh toán (đ)</label>
                  <NumericFormat 
                    value={paidAmount}
                    onValueChange={(values) => setPaidAmount(values.value || '')}
                    thousandSeparator="."
                    decimalSeparator=","
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold outline-none mt-1 shadow-inner focus:border-blue-400 text-emerald-600" 
                    placeholder="0" 
                  />
                </div>
              </div>
              <div className="mt-1 text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-2">Nợ sau đơn:</span>
                <span className="text-sm font-black text-rose-600">{formatNumber((parseFormattedNumber(oldDebt) || 0) + (parseFormattedNumber(cost) || 0) - (parseFormattedNumber(paidAmount) || 0))}đ</span>
              </div>

              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Ghi chú thêm</label>
                <input 
                  type="text" 
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none mt-1 shadow-inner focus:border-blue-400" 
                  placeholder="Phụ kiện đi kèm, mật khẩu máy..." 
                />
              </div>
              </>
              )}
            </div>
            
             {selectedCustomerObj && (
              <div className="p-6 border-t border-slate-100 shrink-0">
                <button 
                  onClick={handleSave}
                  className="w-full bg-blue-600 text-white py-3.5 rounded-lg font-semibold shadow-md shadow-blue-200 tracking-wide active:scale-95 transition-all hover:bg-blue-700"
                >
                  Tạo phiếu tiếp nhận
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Record Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center md:p-4 p-0 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white w-full h-full md:h-auto md:max-h-[90vh] max-w-md md:max-w-6xl flex flex-col rounded-none md:rounded-xl shadow-2xl animate-in fade-in zoom-in duration-200 overflow-hidden">
            <div className="flex justify-between items-center p-4 md:px-6 md:py-4 border-b border-slate-100 shrink-0">
              <h3 className="text-lg font-bold text-slate-800 tracking-tight">Chi tiết phiếu {selectedRecord.id}</h3>
              <div className="flex gap-2">
                {!isEditingRecord ? (
                  <button onClick={() => {
                    setEditRecordData({
                      customerName: selectedRecord.customerName,
                      customerPhone: selectedRecord.customerPhone,
                      productName: selectedRecord.productName,
                      serialNumber: selectedRecord.serialNumber,
                      issue: selectedRecord.issue
                    });
                    setIsEditingRecord(true);
                  }} className="w-8 h-8 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors flex items-center justify-center" title="Sửa thông tin">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                  </button>
                ) : (
                  <button onClick={() => {
                    updateMaintenanceRecord(selectedRecord.id, editRecordData);
                    setSelectedRecord({...selectedRecord, ...editRecordData});
                    setIsEditingRecord(false);
                  }} className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-full hover:bg-emerald-100 transition-colors flex items-center justify-center" title="Lưu thay đổi">
                    <CheckCircle size={16} />
                  </button>
                )}
                <button onClick={() => {
                  setSelectedRecord(null);
                  setIsEditingRecord(false);
                }} className="w-8 h-8 bg-slate-50 text-slate-400 rounded-full hover:bg-slate-200 transition-colors flex items-center justify-center">
                  <X size={18} />
                </button>
              </div>
            </div>
            
            <div className={`p-4 md:p-5 overflow-y-auto flex-1 no-scrollbar`}>
              {isEditingRecord ? (
                /* Editing Layout */
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0">
                      <User size={24} />
                    </div>
                    <div className="flex-1">
                      <div className="space-y-2">
                        <input type="text" className="w-full text-sm p-2 border border-slate-200 rounded focus:border-blue-400 outline-none" value={editRecordData.customerName || ''} onChange={e => setEditRecordData({...editRecordData, customerName: e.target.value})} placeholder="Tên KH" />
                        <input type="text" className="w-full text-sm p-2 border border-slate-200 rounded focus:border-blue-400 outline-none" value={editRecordData.customerPhone || ''} onChange={e => {
                          let val = e.target.value.replace(/[^0-9\s+]/g, '').trim();
                          if (val && !val.startsWith('0') && !val.startsWith('+')) val = '0' + val;
                          setEditRecordData({...editRecordData, customerPhone: val});
                        }} placeholder="SĐT KH" />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Tag className="text-slate-400 mt-0.5 shrink-0" size={16} />
                      <div className="flex-1">
                        <p className="text-[10px] font-bold text-slate-400 tracking-wider">Thiết bị</p>
                        <div className="space-y-2 mt-1">
                          <input type="text" className="w-full text-sm p-2 border border-slate-200 rounded focus:border-blue-400 outline-none" value={editRecordData.productName || ''} onChange={e => setEditRecordData({...editRecordData, productName: e.target.value})} placeholder="Tên thiết bị" />
                          <input type="text" className="w-full text-sm p-2 border border-slate-200 rounded focus:border-blue-400 outline-none font-mono" value={editRecordData.serialNumber || ''} onChange={e => setEditRecordData({...editRecordData, serialNumber: e.target.value})} placeholder="Serial Number (không bắt buộc)" />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <AlertCircle className="text-slate-400 mt-0.5 shrink-0" size={16} />
                      <div className="flex-1">
                        <p className="text-[10px] font-bold text-slate-400 tracking-wider">Tình trạng lỗi</p>
                        <textarea className="w-full text-sm p-2 border border-slate-200 rounded focus:border-blue-400 outline-none resize-none h-16 mt-1" value={editRecordData.issue || ''} onChange={e => setEditRecordData({...editRecordData, issue: e.target.value})} placeholder="Mô tả lỗi" />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Detail/Grid Layout */
                <div className="md:grid md:grid-cols-2 md:gap-6 space-y-6 md:space-y-0">
                  {/* Column 1: Identity & Process Handling */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                      <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                        <User size={20} />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-slate-800 tracking-tight leading-none mb-0.5">{selectedRecord.customerName}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-[11px] text-slate-500 font-semibold font-mono">{selectedRecord.customerPhone}</p>
                          {selectedRecord.customerPhone && (
                            <div className="flex items-center gap-1.5 ml-2">
                              <a href="#" onClick={(e) => handlePhoneCall(e, selectedRecord.customerPhone)} className="p-1 px-1.5 bg-emerald-50 text-emerald-600 rounded-full hover:bg-emerald-100 transition-colors cursor-pointer" title="Gọi điện">
                                <Phone size={10} className="fill-emerald-600 text-transparent" />
                              </a>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const msg = `Chào ${selectedRecord.customerName}, thiết bị ${selectedRecord.productName} của bạn đã được ${selectedRecord.status === 'COMPLETED' ? 'kiểm tra/bảo hành xong' : 'tiếp nhận bảo hành'} tại ${printSettings?.storeName || 'Cửa hàng'}.${selectedRecord.status === 'COMPLETED' ? ' Vui lòng đến cửa hàng để nhận lại thiết bị nhé.' : ''}`;
                                  window.open(`sms:${selectedRecord.customerPhone}?body=${encodeURIComponent(msg)}`, '_self');
                                }}
                                className="p-1 px-1.5 bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-100 transition-colors font-bold text-[9px]"
                                title="Gửi SMS"
                              >
                                SMS
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const msg = `Chào ${selectedRecord.customerName}, thiết bị ${selectedRecord.productName} của bạn đã được ${selectedRecord.status === 'COMPLETED' ? 'kiểm tra/bảo hành xong' : 'tiếp nhận bảo hành'} tại ${printSettings?.storeName || 'Cửa hàng'}.${selectedRecord.status === 'COMPLETED' ? ' Vui lòng đến cửa hàng để nhận lại thiết bị nhé.' : ''}`;
                                  navigator.clipboard.writeText(msg).then(() => {
                                    window.open(`https://zalo.me/${selectedRecord.customerPhone.replace(/[\s\-\.]/g, '')}`, '_blank');
                                  });
                                }}
                                className="p-1 px-1.5 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors font-bold text-[9px]"
                                title="Copy lời nhắn & Mở Zalo"
                              >
                                Zalo
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-100 space-y-3 shadow-sm">
                      <div className="flex items-start gap-2.5">
                        <Tag className="text-amber-500 shrink-0 mt-0.5" size={16} />
                        <div className="flex-1">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Thiết bị</p>
                          <p className="text-sm font-bold text-slate-800 leading-snug">{selectedRecord.productName}</p>
                          {selectedRecord.serialNumber && (
                            <span className="mt-0.5 inline-block px-1.5 py-0.5 bg-orange-50 text-orange-600 rounded font-mono text-[9px] font-bold border border-orange-100">
                              SN: {selectedRecord.serialNumber}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <AlertCircle className="text-rose-500 shrink-0 mt-0.5" size={16} />
                        <div className="flex-1">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Tình trạng lỗi</p>
                          <p className="text-[13px] font-medium text-slate-600 bg-slate-50/80 p-2 rounded-lg border border-slate-100/50">{selectedRecord.issue}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 px-1">
                        <Clock className="text-blue-500" size={16} />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quy trình xử lý</p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        {(['RECEIVING', 'REPAIRING', 'COMPLETED', 'RETURNED'] as const).map(s => (
                          <button 
                            key={s}
                            onClick={() => {
                              if (selectedRecord.status !== s) {
                                setStatusConfirmModal({ isOpen: true, newStatus: s, recordId: selectedRecord.id });
                              }
                            }}
                            className={`px-3 py-2.5 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all flex items-center justify-center text-center ${selectedRecord.status === s ? getStatusColor(s) + ' shadow-lg scale-105 ring-2 ring-white z-10' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                          >
                            {getStatusText(s)}
                          </button>
                        ))}
                      </div>

                      {['COMPLETED', 'RETURNED'].includes(selectedRecord.status) && (
                        <div className="mt-3 space-y-2 animate-in slide-in-from-top-2 duration-300">
                          <textarea
                            placeholder="Nhập nội dung sửa chữa, linh kiện thay thế..."
                            className="w-full text-sm p-3 border border-slate-200 rounded-2xl outline-none focus:border-blue-400 bg-white shadow-inner h-24 transition-all"
                            value={feedbackText}
                            onChange={(e) => setFeedbackText(e.target.value)}
                          />
                          <button 
                            onClick={() => {
                              updateMaintenanceRecord(selectedRecord.id, { feedback: feedbackText });
                              setSelectedRecord({...selectedRecord, feedback: feedbackText});
                              alert('Đã lưu thông tin sửa chữa!');
                            }}
                            className="w-full py-3 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95"
                          >
                            Lưu thông tin xử lý
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Column 2: Financial, Transfer & Invoice */}
                  <div className="space-y-4">
                    <div className="bg-slate-50 p-4 rounded-3xl border border-slate-200 space-y-4 shadow-sm">
                      <div className="flex flex-col gap-0.5 w-full relative">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Ước tính chi phí (Sửa chữa)</span>
                        <div className="flex items-center gap-2 relative w-full bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-inner focus-within:border-blue-400 transition-all">
                          <input 
                            type="text"
                            className="text-lg font-black text-slate-800 bg-transparent outline-none w-full"
                            value={formatNumber(selectedRecord.cost)}
                            onChange={(e) => {
                              const val = parseFormattedNumber(e.target.value) || 0;
                              updateMaintenanceRecord(selectedRecord.id, { cost: val, newDebt: (selectedRecord.oldDebt || 0) + val - (selectedRecord.paidAmount || 0) });
                              setSelectedRecord({...selectedRecord, cost: val, newDebt: (selectedRecord.oldDebt || 0) + val - (selectedRecord.paidAmount || 0)});
                            }}
                          />
                          <span className="text-base font-black text-slate-400">đ</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-0.5 w-full relative">
                          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest pl-1">Đã thanh toán</span>
                          <div className="flex items-center gap-2 relative w-full bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-inner focus-within:border-emerald-400 transition-all">
                            <input 
                              type="text"
                              className="text-base font-black text-emerald-700 bg-transparent outline-none w-full"
                              value={formatNumber(selectedRecord.paidAmount || 0)}
                              onChange={(e) => {
                                const val = parseFormattedNumber(e.target.value) || 0;
                                updateMaintenanceRecord(selectedRecord.id, { paidAmount: val, newDebt: (selectedRecord.oldDebt || 0) + (selectedRecord.cost || 0) - val });
                                setSelectedRecord({...selectedRecord, paidAmount: val, newDebt: (selectedRecord.oldDebt || 0) + (selectedRecord.cost || 0) - val});
                              }}
                            />
                            <span className="text-sm font-black text-emerald-400">đ</span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-0.5 w-full relative">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Nợ trước đơn</span>
                          <div className="flex items-center gap-2 relative w-full bg-slate-50/50 px-4 py-2.5 rounded-2xl border border-slate-200">
                            <input 
                              type="text"
                              className="text-base font-black text-slate-500 bg-transparent outline-none w-full cursor-not-allowed"
                              value={formatNumber(selectedRecord.oldDebt || 0)}
                              readOnly
                            />
                            <span className="text-sm font-black text-slate-400">đ</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center bg-slate-100 p-3 rounded-2xl shadow-inner border border-slate-200">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Nợ sau đơn</span>
                        <div className="flex items-center gap-1">
                          <span className="text-lg font-black text-rose-600">{formatNumber(selectedRecord.newDebt || ((selectedRecord.oldDebt || 0) + (selectedRecord.cost || 0) - (selectedRecord.paidAmount || 0)))}</span>
                          <span className="text-base font-black text-rose-400">đ</span>
                        </div>
                      </div>

                      {selectedRecord.invoiceId ? (() => {
                        const linkedInvoice = invoices?.find(inv => inv.id === selectedRecord.invoiceId);
                        return (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between text-emerald-800 bg-white border border-emerald-100 px-4 py-2.5 rounded-2xl shadow-sm">
                              <div className="flex items-center gap-2">
                                <CheckCircle size={16} className="text-emerald-500" />
                                <span className="text-[9px] font-black uppercase tracking-widest">Đã lập hóa đơn</span>
                              </div>
                              <span 
                                className="font-black text-[11px] tracking-widest cursor-pointer hover:underline text-blue-600"
                                onClick={() => {
                                  if (linkedInvoice) {
                                    setSelectedInvoiceForDetail(linkedInvoice);
                                  } else {
                                    navigate(`/invoices?invoiceId=${selectedRecord.invoiceId}`);
                                  }
                                }}
                              >
                                #{selectedRecord.invoiceId} &rsaquo;
                              </span>
                            </div>
                            {linkedInvoice && (
                              <div className="bg-white border border-slate-200 p-3 rounded-2xl space-y-1.5 shadow-sm">
                                {linkedInvoice.items.map((item, idxx) => (
                                  <div key={idxx} className="flex justify-between items-center text-[12px]">
                                    <span className="text-slate-600 font-bold line-clamp-1 flex-1 pr-4">{item.qty}x {item.name}</span>
                                    <span className="text-slate-900 font-black">{formatNumber(item.price * item.qty)}đ</span>
                                  </div>
                                ))}
                                <div className="flex justify-between items-center pt-2 mt-1 border-t border-dashed border-slate-200">
                                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Tổng cộng</span>
                                  <span className="text-sm font-black text-blue-600">{formatNumber(linkedInvoice.total)}đ</span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })() : (
                        ['COMPLETED', 'RETURNED'].includes(selectedRecord.status) && (
                          <div className="animate-in slide-in-from-bottom-2 duration-300">
                            <button
                              onClick={() => setIsInvoiceModalOpen(true)}
                              className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-600 text-white font-black uppercase tracking-widest rounded-2xl text-[10px] hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95"
                            >
                              <Plus size={16} /> Lập Đơn Xuất Bán
                            </button>
                          </div>
                        )
                      )}
                    </div>

                    {selectedRecord.transferId && maintenanceTransfers?.find(t => t.id === selectedRecord.transferId) ? (() => {
                      const trf = maintenanceTransfers.find(t => t.id === selectedRecord.transferId)!;
                      return (
                        <div className="bg-gradient-to-br from-violet-50 to-white p-5 rounded-3xl border border-violet-100 shadow-sm space-y-4 relative overflow-hidden">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-black text-violet-600 uppercase tracking-widest">Chuyển Tuyến Bảo Hành</span>
                            <span className="text-[9px] bg-violet-600 text-white px-2 py-1 rounded-full font-black uppercase tracking-widest">{trf.status}</span>
                          </div>
                          <div className="space-y-3">
                             <p className="text-slate-800"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter block mb-0.5">Đối tác nhận</span> <span className="font-black text-base">{trf.supplierName || '---'}</span></p>
                             <div className="grid grid-cols-2 gap-4">
                               <p><span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Ngày đi</span> <span className="font-bold text-slate-700">{toDMY(trf.transferDate)}</span></p>
                               <p><span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Hẹn về</span> <span className="font-bold text-slate-700">{toDMY(trf.returnDate)}</span></p>
                             </div>
                             {(trf.repairCost > 0 || trf.shippingCost > 0) && (
                               <div className="flex gap-4 pt-1 border-t border-violet-100/50">
                                 {trf.repairCost > 0 && <span><span className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">Phí sửa</span> <span className="text-orange-600 font-black">{formatNumber(trf.repairCost)}đ</span></span>}
                                 {trf.shippingCost > 0 && <span><span className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">Phí ship</span> <span className="text-blue-600 font-black">{formatNumber(trf.shippingCost)}đ</span></span>}
                               </div>
                             )}
                          </div>
                          <button 
                            onClick={() => {
                              setTransferDest(trf.supplierName || '');
                              setTransferAccessories(trf.accessories || '');
                              setTransferActionStatus(trf.status as any || 'Đóng hàng');
                              setTransferCost(trf.repairCost ? formatNumber(trf.repairCost) : '');
                              setTransferShippingCost(trf.shippingCost ? formatNumber(trf.shippingCost) : '');
                              setTransferDate(toYMD(trf.transferDate) || '');
                              setTransferReturnDate(toYMD(trf.returnDate) || '');
                              setTransferNote(trf.note || '');
                              setIsTransferModalOpen(true);
                            }}
                            className="w-full py-3 bg-white text-violet-700 font-black uppercase tracking-widest rounded-xl text-[10px] flex items-center justify-center gap-2 hover:bg-violet-50 transition-all border border-violet-200 shadow-sm"
                          >
                            Cập nhật chuyển tuyến
                          </button>
                        </div>
                      );
                    })() : (
                      selectedRecord.status === 'REPAIRING' && (
                        <button 
                          onClick={() => {
                            setTransferDest('');
                            setTransferAccessories('');
                            setTransferActionStatus('Đóng hàng');
                            setTransferCost('');
                            setTransferShippingCost('');
                            setTransferDate('');
                            setTransferReturnDate('');
                            setTransferNote('');
                            setIsTransferModalOpen(true);
                          }}
                          className="w-full py-4 bg-violet-50 text-violet-700 font-black uppercase tracking-widest rounded-2xl text-[11px] flex items-center justify-center gap-3 hover:bg-violet-100 transition-all border border-violet-200 border-dashed animate-in slide-in-from-bottom-2 duration-300"
                        >
                          <ArrowLeftRight size={18} />
                          Chuyển Tuyến Xử Lý
                        </button>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-4 md:p-6 border-t border-slate-100 bg-slate-50/50 shrink-0 md:hidden">
              <button 
                onClick={() => {
                  setSelectedRecord(null);
                  setIsEditingRecord(false);
                }}
                className="w-full py-3 bg-[#991b1b] text-white font-black rounded-lg uppercase text-[10px] tracking-widest hover:bg-[#7f1d1d] transition-colors shadow-lg shadow-red-100"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
      {statusConfirmModal.isOpen && selectedRecord && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-slate-200">
            <div className="p-6">
              <h3 className="text-lg font-bold text-slate-800 text-center mb-4">Xác nhận</h3>
              <p className="text-sm text-slate-600 text-center mb-6">Bạn có đồng ý đổi trạng thái sang <strong className={`${getStatusColor(statusConfirmModal.newStatus)} px-1.5 py-0.5 rounded font-bold uppercase`}>{getStatusText(statusConfirmModal.newStatus)}</strong>?</p>
              
              <div className="bg-slate-50 p-4 rounded-lg space-y-3 border border-slate-100 mb-6">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Khách hàng</p>
                  <p className="text-sm font-semibold text-slate-700 leading-none">{selectedRecord.customerName}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Thiết bị</p>
                  <p className="text-sm font-semibold text-slate-700 leading-none">{selectedRecord.productName}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Tình trạng lỗi</p>
                  <p className="text-xs text-slate-600 break-words line-clamp-2">{selectedRecord.issue}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setStatusConfirmModal({isOpen: false, newStatus: null, recordId: null})}
                  className="flex-1 py-3 bg-white text-slate-600 border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button 
                  onClick={() => {
                    updateMaintenanceRecord(selectedRecord.id, { status: statusConfirmModal.newStatus });
                    
                    if (statusConfirmModal.newStatus === 'RETURNED' && selectedRecord.transferId) {
                      const existingTransfer = maintenanceTransfers?.find(t => t.id === selectedRecord.transferId);
                      if (existingTransfer) {
                        updateMaintenanceTransfer(existingTransfer.id, { status: 'Hoàn thành nhận lại' });
                      }
                    }

                    setSelectedRecord({...selectedRecord, status: statusConfirmModal.newStatus});
                    setStatusConfirmModal({isOpen: false, newStatus: null, recordId: null});
                  }}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-lg text-sm font-semibold shadow-md shadow-blue-200 hover:bg-blue-700 transition-colors"
                >
                  Đồng ý
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Line Modal */}
      {isTransferModalOpen && selectedRecord && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm pt-[5vh]">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200 border border-slate-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 text-[15px]">
                <ArrowLeftRight size={18} className="text-violet-600" />
                Chuyển tuyến bảo hành
              </h3>
              <button 
                onClick={() => setIsTransferModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 bg-white p-1 rounded-full border border-slate-200"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto no-scrollbar space-y-4 flex-1">
              <div className="relative">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 block mb-1">Nơi chuyển đến</label>
                <div className="flex gap-2">
                  <select 
                    value={transferDest}
                    onChange={(e) => setTransferDest(e.target.value)}
                    className="flex-1 p-3 bg-white border border-slate-200 rounded-lg text-sm font-semibold outline-none focus:border-violet-400" 
                  >
                    <option value="" disabled>-- Chọn nhà cung cấp/nơi nhận --</option>
                    {suppliers?.map(s => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                  <button 
                    onClick={() => setIsTransferSupplierModalOpen(true)}
                    className="px-3 bg-violet-100 text-violet-600 rounded-lg shrink-0 hover:bg-violet-200"
                  >
                    <Plus size={20} />
                  </button>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 block mb-1">Phụ kiện kèm theo</label>
                <input 
                  type="text" 
                  value={transferAccessories}
                  onChange={(e) => setTransferAccessories(e.target.value)}
                  className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-violet-400" 
                  placeholder="Sạc, cáp, hộp..." 
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 block mb-1">Trạng thái chuyển tuyến</label>
                <select 
                  value={transferActionStatus}
                  onChange={(e) => setTransferActionStatus(e.target.value as any)}
                  className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm font-semibold outline-none focus:border-violet-400 text-slate-700" 
                >
                  <option value="Đóng hàng">Đóng hàng</option>
                  <option value="Đã chuyển">Đã chuyển</option>
                  <option value="Xử lý xong">Xử lý xong</option>
                  <option value="Hoàn thành nhận lại">Hoàn thành nhận lại</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 block mb-1">Ngày chuyển</label>
                  <input 
                    type="date" 
                    value={transferDate}
                    onChange={(e) => setTransferDate(e.target.value)}
                    className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-violet-400" 
                  />
                  <p className="text-[10px] text-slate-400 mt-1.5 ml-1 select-none">Định dạng hiển thị: <span className="font-semibold text-slate-600">{toDMY(transferDate)}</span></p>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 block mb-1">Ngày dự kiến về</label>
                  <input 
                    type="date" 
                    value={transferReturnDate}
                    onChange={(e) => setTransferReturnDate(e.target.value)}
                    className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-violet-400" 
                  />
                  <p className="text-[10px] text-slate-400 mt-1.5 ml-1 select-none">Định dạng hiển thị: <span className="font-semibold text-slate-600">{toDMY(transferReturnDate)}</span></p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 block mb-1">Chi phí sửa chữa (đ)</label>
                  <input 
                    type="text" 
                    value={transferCost}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setTransferCost(formatNumber(Number(val)));
                    }}
                    className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm font-semibold outline-none focus:border-violet-400" 
                    placeholder="0" 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 block mb-1">Chi phí vận chuyển (đ)</label>
                  <input 
                    type="text" 
                    value={transferShippingCost}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setTransferShippingCost(formatNumber(Number(val)));
                    }}
                    className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-orange-600 outline-none focus:border-violet-400" 
                    placeholder="0" 
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 block mb-1">Ghi chú thêm</label>
                <textarea 
                  value={transferNote}
                  onChange={(e) => setTransferNote(e.target.value)}
                  className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-violet-400 resize-none h-20" 
                  placeholder="Nhập ghi chú chuyển tuyến..." 
                />
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-100 flex gap-3 shrink-0">
              <button 
                onClick={() => setIsTransferModalOpen(false)}
                className="flex-1 py-3 bg-white text-slate-600 font-semibold rounded-lg text-xs border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                Hủy
              </button>
              <button 
                onClick={() => {
                  if (!transferDest) {
                    alert('Vui lòng chọn hoặc nhập Nơi chuyển đến.');
                    return;
                  }
                  if (!transferAccessories) {
                    alert('Vui lòng nhập Phụ kiện kèm theo.');
                    return;
                  }

                  const existingTransfer = maintenanceTransfers?.find(t => t.id === selectedRecord.transferId);
                  
                  if (existingTransfer) {
                    updateMaintenanceTransfer(existingTransfer.id, {
                      supplierName: transferDest,
                      accessories: transferAccessories,
                      status: transferActionStatus,
                      repairCost: parseFormattedNumber(transferCost) || 0,
                      shippingCost: parseFormattedNumber(transferShippingCost) || 0,
                      transferDate: toYMD(transferDate), // Save as safe YMD
                      returnDate: toYMD(transferReturnDate),
                      note: transferNote
                    });
                    
                    updateMaintenanceRecord(selectedRecord.id, { status: 'REPAIRING' });
                    setSelectedRecord({...selectedRecord, status: 'REPAIRING'});
                  } else {
                    const newId = generateId('TRF', maintenanceTransfers || []);
                    const newTransfer = {
                      id: newId,
                      maintenanceRecordId: selectedRecord.id,
                      supplierName: transferDest,
                      accessories: transferAccessories,
                      status: transferActionStatus,
                      repairCost: parseFormattedNumber(transferCost) || 0,
                      shippingCost: parseFormattedNumber(transferShippingCost) || 0,
                      transferDate: toYMD(transferDate), // Save safe YMD
                      returnDate: toYMD(transferReturnDate),
                      note: transferNote
                    };
                    addMaintenanceTransfer(newTransfer);
                    updateMaintenanceRecord(selectedRecord.id, { transferId: newId, status: 'REPAIRING' });
                    setSelectedRecord({...selectedRecord, transferId: newId, status: 'REPAIRING'});
                  }
                  
                  setIsTransferModalOpen(false);
                }}
                className="flex-[2] py-3 bg-violet-600 text-white font-semibold rounded-lg text-xs shadow-md shadow-violet-200 hover:bg-violet-700 transition-colors"
              >
                Lưu thông tin
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add External Serial Modal */}
      {isExternalModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-0 md:p-4">
          <div className="bg-white md:rounded-2xl shadow-xl w-full h-full md:h-auto md:max-w-sm flex flex-col md:overflow-hidden border border-slate-200">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Globe size={16} className="text-blue-600" />
                Thêm máy ngoài
              </h3>
              <button onClick={() => setIsExternalModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 flex-1 overflow-y-auto no-scrollbar space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Tên sản phẩm *</label>
                <input 
                  type="text" 
                  value={newExtProduct}
                  onChange={(e) => setNewExtProduct(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold outline-none mt-1 focus:border-blue-400" 
                  placeholder="Ex: iPhone 12 Pro..." 
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Số Serial / IMEI</label>
                <input 
                  type="text" 
                  value={newExtSn}
                  onChange={(e) => setNewExtSn(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold outline-none mt-1 focus:border-blue-400" 
                  placeholder="Nhập SN/IMEI nếu có..." 
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nơi bán / Nguồn gốc</label>
                <input 
                  type="text" 
                  value={newExtSource}
                  onChange={(e) => setNewExtSource(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none mt-1 focus:border-blue-400" 
                  placeholder="FPT Shop, TGDĐ..." 
                />
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-100 flex gap-3 shrink-0 mb-4 md:mb-0">
              <button 
                onClick={() => setIsExternalModalOpen(false)} 
                className="flex-1 py-3 bg-white text-slate-600 font-semibold rounded-lg text-xs border border-slate-200 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button 
                onClick={handleAddExternalSerial}
                className="flex-[2] py-3 bg-blue-600 text-white font-semibold rounded-lg text-xs hover:bg-blue-700 shadow shadow-blue-200"
              >
                Lưu vào danh sách
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Add Customer Modal */}
      <AddCustomerModal 
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        initialName={customerSearchTerm}
        onSuccess={(customer) => {
          setSelectedCustomerObj(customer);
          setCustomerName(customer.name);
          setCustomerPhone(customer.phone);
          setCustomerAddress(customer.address || '');
          setCustomerSearchTerm(customer.name);
          setCustomerSuggestions([]);
          setIsCustomerModalOpen(false);
        }}
      />
      {/* Add Supplier Modal from Transfer Info */}
      {isTransferSupplierModalOpen && (
        <div className="fixed inset-0 z-[300] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-0 md:p-4">
          <div className="bg-white justify-center md:rounded-2xl shadow-xl w-full h-full md:h-auto md:max-w-sm flex flex-col md:overflow-hidden border border-slate-200">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Globe size={16} className="text-violet-600" />
                Thêm nhà cung cấp mới
              </h3>
              <button onClick={() => setIsTransferSupplierModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 flex-1 overflow-y-auto no-scrollbar space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Tên nhà cung cấp *</label>
                <input 
                  type="text" 
                  value={newTransferSupplierName}
                  onChange={(e) => setNewTransferSupplierName(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold outline-none mt-1 focus:border-violet-400" 
                  placeholder="Nhập tên NCC..." 
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Số điện thoại</label>
                <input 
                  type="text" 
                  value={newTransferSupplierPhone}
                  onChange={(e) => {
                    let val = e.target.value.replace(/[^0-9\s+]/g, '').trim();
                    if (val && !val.startsWith('0') && !val.startsWith('+')) val = '0' + val;
                    setNewTransferSupplierPhone(val);
                  }}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none mt-1 focus:border-violet-400" 
                  placeholder="Nhập SĐT..." 
                />
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-100 flex gap-3 shrink-0 mb-4 md:mb-0">
              <button 
                onClick={() => setIsTransferSupplierModalOpen(false)} 
                className="flex-1 py-3 bg-white text-slate-600 font-semibold rounded-lg text-xs border border-slate-200 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button 
                onClick={() => {
                  if (!newTransferSupplierName.trim()) return;
                  const newSupp = {
                    id: generateId('SUP', suppliers || []),
                    name: newTransferSupplierName.trim(),
                    phone: newTransferSupplierPhone.trim(),
                    email: '',
                    address: '',
                    group: 'Đối tác bảo hành'
                  };
                  addSupplier(newSupp);
                  setTransferDest(newSupp.name);
                  setNewTransferSupplierName('');
                  setNewTransferSupplierPhone('');
                  setIsTransferSupplierModalOpen(false);
                }}
                className="flex-[2] py-3 bg-violet-600 text-white font-semibold rounded-lg text-xs hover:bg-violet-700 shadow shadow-violet-200"
              >
                Lưu lại
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Invoice from Maintenance Modal */}
      {isInvoiceModalOpen && selectedRecord && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm pt-[5vh]">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200 border border-slate-200">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <FileText size={18} className="text-blue-600" />
                Tạo đơn xuất bán / Thanh toán
              </h3>
              <button onClick={() => setIsInvoiceModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 bg-white rounded-full border border-slate-200">
                <X size={16} />
              </button>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto no-scrollbar space-y-4">
              {/* Product search */}
              <div className="relative">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 block mb-1">Thêm sản phẩm / Dịch vụ</label>
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-1.5 focus-within:border-blue-400">
                  <Search className="text-slate-400 ml-2 shrink-0" size={16} />
                  <input
                    type="text"
                    value={invoiceSearchTerm}
                    onChange={e => setInvoiceSearchTerm(e.target.value)}
                    className="w-full p-2 bg-transparent text-sm font-medium outline-none"
                    placeholder="Tìm sản phẩm..."
                  />
                </div>
                {invoiceSearchTerm.trim() && (
                  <div className="absolute top-full left-0 right-0 z-50 bg-white border border-slate-200 shadow-lg rounded-lg mt-1 max-h-40 flex flex-col overflow-y-auto">
                    {products?.filter(p => p.name.toLowerCase().includes(invoiceSearchTerm.toLowerCase()) || p.id.toLowerCase().includes(invoiceSearchTerm.toLowerCase())).length > 0 ? (
                      products.filter(p => p.name.toLowerCase().includes(invoiceSearchTerm.toLowerCase()) || p.id.toLowerCase().includes(invoiceSearchTerm.toLowerCase())).slice(0, 30).map(p => (
                        <div 
                          key={p.id}
                          className="p-2 border-b border-slate-50 hover:bg-slate-50 cursor-pointer flex justify-between items-center"
                          onClick={() => {
                            addInvoiceItem(p);
                          }}
                        >
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold">{p.name}</span>
                            <span className="text-[10px] text-slate-400">Mã: {p.id} | Tồn: {p.stock}</span>
                          </div>
                          <span className="text-xs text-blue-600 font-bold">{formatNumber(p.price)}đ</span>
                        </div>
                      ))
                    ) : (
                      <div 
                        className="p-3 text-center text-xs text-blue-600 font-medium cursor-pointer hover:bg-slate-50"
                        onClick={() => {
                          setInvoiceItems(prev => [...prev, { id: 'SP_KHAC', name: invoiceSearchTerm, price: 0, qty: 1, importPriceTotal: 0 }]);
                          setInvoiceSearchTerm('');
                        }}
                      >
                        + Thêm dịch vụ/tên "{invoiceSearchTerm}"
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Items List */}
              {invoiceItems.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 space-y-2">
                  {invoiceItems.map((item, idx) => (
                    <div key={`inv-item-${item.id}-${idx}`} className="flex flex-wrap items-center gap-2 bg-white p-2 rounded border border-slate-100">
                      <div className="flex-1 min-w-[120px]">
                        <p className="text-sm font-semibold text-slate-800 line-clamp-1">{item.name}</p>
                        {item.serials && item.serials.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.serials.map((s: string) => (
                              <span key={s} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono flex items-center gap-1 border border-slate-200">
                                {s}
                                <X 
                                  size={10} 
                                  className="cursor-pointer hover:text-red-500" 
                                  onClick={() => {
                                    setInvoiceItems(prev => prev.map(vi => {
                                      if (vi.id === item.id) {
                                        const newSerials = vi.serials.filter((vs: string) => vs !== s);
                                        if (newSerials.length === 0) return null;
                                        return { ...vi, qty: newSerials.length, serials: newSerials };
                                      }
                                      return vi;
                                    }).filter(Boolean));
                                  }} 
                                />
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => {
                            if (item.hasSerial) return; // Prevent manual qty decrease for serials
                            setInvoiceItems(prev => prev.map((vi, i) => i === idx ? {...vi, qty: Math.max(1, vi.qty - 1)} : vi))
                          }} 
                          className={`w-6 h-6 bg-slate-100 rounded text-slate-600 font-bold hover:bg-slate-200 ${item.hasSerial ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >-</button>
                        <input type="text" value={item.qty} readOnly className="w-8 text-center text-sm font-semibold bg-transparent outline-none" />
                        <button 
                          onClick={() => {
                            if (item.hasSerial) {
                              setActiveSerialProduct(products.find(p => p.id === item.id));
                              setIsSerialModalOpen(true);
                              return;
                            }
                            const p = products.find(prod => prod.id === item.id);
                            if (p && !p.isService && item.qty >= (p.stock || 0)) {
                              alert("Không đủ số lượng tồn kho!");
                              return;
                            }
                            setInvoiceItems(prev => prev.map((vi, i) => i === idx ? {...vi, qty: vi.qty + 1} : vi))
                          }} 
                          className="w-6 h-6 bg-slate-100 rounded text-slate-600 font-bold hover:bg-slate-200"
                        >+</button>
                      </div>
                      <div className="w-24">
                        <NumericFormat 
                          value={item.price} 
                          onValueChange={(values) => setInvoiceItems(prev => prev.map((vi, i) => i === idx ? {...vi, price: values.floatValue || 0} : vi))}
                          thousandSeparator="."
                          decimalSeparator=","
                          className="w-full text-right text-sm font-bold text-blue-600 bg-transparent border-b border-dashed border-slate-300 focus:border-blue-500 outline-none pb-0.5"
                        />
                      </div>
                      <button onClick={() => setInvoiceItems(prev => prev.filter((_, i) => i !== idx))} className="text-slate-400 hover:text-red-500 p-1">
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                  
                  <div className="flex justify-between items-center px-2 pt-2 border-t border-slate-200 mt-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Tiền hàng</span>
                    <span className="text-sm font-bold text-slate-800">
                      {formatNumber(invoiceItems.reduce((acc, item) => acc + item.price * item.qty, 0))}đ
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center px-2 py-1">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Giảm giá</span>
                    <div className="relative flex items-center">
                      <NumericFormat 
                        value={invoiceDiscount}
                        onValueChange={(values) => setInvoiceDiscount(values.floatValue || 0)}
                        thousandSeparator="."
                        decimalSeparator=","
                        className="w-24 text-right bg-transparent border-b border-dashed border-slate-300 focus:border-blue-500 outline-none text-sm font-bold text-red-500 pb-0.5"
                      />
                      <span className="text-xs font-bold text-red-500 ml-1">đ</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center px-2 py-1 bg-blue-50 rounded">
                    <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Tổng thanh toán</span>
                    <span className="text-lg font-bold text-blue-700">
                      {formatNumber(Math.max(0, invoiceItems.reduce((acc, item) => acc + item.price * item.qty, 0) - invoiceDiscount))}đ
                    </span>
                  </div>
                </div>
              )}

              {/* Payment */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 block mb-1">Khách thanh toán (đ)</label>
                <div className="relative">
                  <NumericFormat
                    value={invoicePaid}
                    onValueChange={(values) => setInvoicePaid(values.value || '')}
                    thousandSeparator="."
                    decimalSeparator=","
                    className="w-full p-3 bg-white border border-slate-200 rounded-lg text-lg font-bold outline-none focus:border-blue-400 text-right pr-8"
                    placeholder="0"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-slate-500">đ</span>
                </div>
                <div className="flex justify-end gap-2 mt-2">
                  <button onClick={() => setInvoicePaid(formatNumber(Math.max(0, invoiceItems.reduce((acc, item) => acc + item.price * item.qty, 0) - invoiceDiscount)))} className="px-2 py-1 bg-slate-100 border border-slate-200 text-slate-600 rounded text-xs font-semibold hover:bg-slate-200">Ghi nhận nhanh: Thanh toán đủ</button>
                </div>
                {parseFormattedNumber(invoicePaid) > 0 && (
                  <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 block mb-2">Chọn ví nhận tiền *</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {wallets.map((w, idx) => {
                        const isSelected = invoiceWalletId === w.id || (!invoiceWalletId && idx === 0);
                        return (
                          <button
                           key={w.id}
                           onClick={() => setInvoiceWalletId(w.id)}
                           className={`p-3 rounded-xl border text-left transition-colors flex flex-col gap-1 ${isSelected ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                          >
                            <span className={`text-[10px] font-bold ${isSelected ? 'text-blue-600' : 'text-slate-500'}`}>{w.type === 'CASH' ? 'Tiền mặt' : w.type === 'BANK' ? 'Ngân hàng' : 'Ví điện tử'}</span>
                            <span className={`font-semibold text-sm line-clamp-1 ${isSelected ? 'text-blue-900' : 'text-slate-700'}`}>{w.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3 shrink-0">
               <button onClick={() => setIsInvoiceModalOpen(false)} className="flex-1 py-3 bg-white text-slate-600 font-bold rounded-lg border border-slate-200 hover:bg-slate-50">Hủy</button>
               <button 
                onClick={async () => {
                  if (invoiceItems.length === 0) {
                    alert('Vui lòng thêm sản phẩm / dịch vụ!');
                    return;
                  }
                  
                  const paidVal = parseFormattedNumber(invoicePaid) || 0;
                  const finalWalletId = invoiceWalletId || (wallets.length > 0 ? wallets[0].id : undefined);

                  if (paidVal > 0 && !finalWalletId) {
                    alert('Vui lòng tạo ít nhất một ví/tài khoản để nhận tiền!');
                    return;
                  }

                  const invoiceTotalRaw = invoiceItems.reduce((acc, item) => acc + item.price * item.qty, 0);
                  const invoiceTotal = Math.max(0, invoiceTotalRaw - invoiceDiscount);
                  const newId = generateId('HDN', invoices || []);
                  const dateStr = formatDateTime(new Date());

                  if (paidVal > 0) {
                    const transactionId = generateId('PT', cashTransactions);
                    addCashTransaction({
                      id: transactionId,
                      date: dateStr,
                      type: 'RECEIPT',
                      amount: paidVal,
                      category: 'SALES_REVENUE',
                      partner: selectedRecord?.customerName || 'Khách lẻ',
                      note: `Thu tiền sửa chữa phiếu ${selectedRecord?.id}`,
                      refId: newId,
                      walletId: finalWalletId
                    });
                  }

                  const newInvoice = {
                    id: newId,
                    date: dateStr,
                    customer: selectedRecord?.customerName || 'Khách lẻ',
                    phone: selectedRecord?.customerPhone || '',
                    total: invoiceTotal,
                    paid: paidVal,
                    debt: Math.max(0, invoiceTotal - paidVal),
                    discount: invoiceDiscount,
                    items: invoiceItems.map(i => ({...i, sn: i.serials?.join(', ') || undefined, importPriceTotal: i.importPriceTotal * i.qty})),
                    paymentMethod: finalWalletId ? (wallets.find(w => w.id === finalWalletId)?.type === 'CASH' ? 'CASH' : 'TRANSFER') : 'CASH',
                    walletId: paidVal > 0 ? finalWalletId : undefined,
                    note: `Thanh toán sửa chữa phiếu ${selectedRecord?.id}`
                  };

                  // addInvoice will handle stock deduction automatically
                  await addInvoice(newInvoice as any);
                  await updateMaintenanceRecord(selectedRecord!.id, { invoiceId: newId });
                  setSelectedRecord({ ...selectedRecord!, invoiceId: newId });

                  setIsInvoiceModalOpen(false);
                  setInvoiceItems([]);
                  setInvoicePaid('');
                  setInvoiceSearchTerm('');
                  setInvoiceWalletId('');
                  
                  // Optional: Redirect to invoice page without confirm
                  // navigate(`/invoices?id=${newId}`);
                }}
                className="flex-[2] py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow shadow-blue-200"
               >
                 Tạo đơn ({invoiceItems.length} mục)
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Serial Selection Modal */}
      {isSerialModalOpen && activeSerialProduct && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm print:hidden">
          <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 tracking-tighter">Chọn IMEI/Serial</h3>
              <button onClick={() => setIsSerialModalOpen(false)} className="w-8 h-8 bg-slate-50 text-slate-400 rounded-full hover:bg-slate-200 flex items-center justify-center transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                  <Tag size={20} className="text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 truncate">{activeSerialProduct.name}</p>
                  <p className="text-[10px] text-slate-400 font-mono">ID: {activeSerialProduct.id}</p>
                </div>
              </div>

              {/* Manual Entry or Filter */}
              <div className="mb-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block mb-1">Tìm hoặc nhập Serial mới</label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input 
                      type="text" 
                      id="manual-serial-input"
                      placeholder="Nhập Serial..."
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:border-blue-400 transition-all font-mono"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const val = (e.currentTarget as HTMLInputElement).value.trim();
                          if (val) {
                            addInvoiceItem(activeSerialProduct, val);
                            setIsSerialModalOpen(false);
                          }
                        }
                      }}
                    />
                  </div>
                  <button 
                    onClick={() => {
                      const input = document.getElementById('manual-serial-input') as HTMLInputElement;
                      const val = input?.value.trim();
                      if (val) {
                        addInvoiceItem(activeSerialProduct, val);
                        setIsSerialModalOpen(false);
                      } else {
                        alert('Vui lòng nhập Serial!');
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-all"
                  >
                    Thêm
                  </button>
                </div>
              </div>
              
              <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar pr-2 mb-4 mt-2 border-t border-slate-50 pt-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Danh sách Serial trong kho</p>
                {serials?.filter(s => s.prodId === activeSerialProduct.id && s.status !== 'SOLD').length > 0 ? (
                  serials.filter(s => s.prodId === activeSerialProduct.id && s.status !== 'SOLD').map(s => {
                    const isSelected = invoiceItems.find(i => i.id === activeSerialProduct.id)?.serials?.includes(s.sn) || false;
                    return (
                      <div 
                        key={s.sn} 
                        className={`flex justify-between items-center p-3 rounded-lg border cursor-pointer transition-all ${isSelected ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm'}`}
                        onClick={() => {
                          if (isSelected) {
                            alert("Serial này đã được chọn!");
                            return;
                          }
                          addInvoiceItem(activeSerialProduct, s.sn);
                          setIsSerialModalOpen(false);
                        }}
                      >
                        <span className={`font-mono text-sm uppercase tracking-wider ${isSelected ? 'text-blue-700 font-bold' : 'text-slate-700 font-semibold'}`}>{s.sn}</span>
                        {isSelected && <CheckCircle size={16} className="text-blue-600" />}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-6">
                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-2">
                      <ShoppingBag size={20} className="text-slate-300" />
                    </div>
                    <p className="text-slate-400 text-[11px] font-medium">Không có Serial nào sẵn sàng trong kho</p>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setIsSerialModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-lg text-xs tracking-wide transition-all hover:bg-slate-200">Bỏ qua</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Nested Invoice Detail Modal (Opens over Maintenance Detail) */}
      {selectedInvoiceForDetail && (() => {
        const matchingCustomer = customers.find(c => c.name === selectedInvoiceForDetail.customer || (selectedInvoiceForDetail.phone && c.phone === selectedInvoiceForDetail.phone));
        const displayPhone = selectedInvoiceForDetail.phone || matchingCustomer?.phone;
        const displayAddress = matchingCustomer?.address;
        const dateOfThisInvoice = new Date(selectedInvoiceForDetail.date);
        const customerInvoices = invoices.filter(i => 
          i.customer === selectedInvoiceForDetail.customer && 
          (new Date(i.date) < dateOfThisInvoice || (i.date === selectedInvoiceForDetail.date && i.id < selectedInvoiceForDetail.id))
        );
        const customerReturns = (returnSalesOrders || []).filter(r => 
          r.customer === selectedInvoiceForDetail.customer && 
          new Date(r.date) < dateOfThisInvoice
        );
        const calculatedOldDebt = customerInvoices.reduce((sum, i) => sum + i.debt, 0) - 
                        customerReturns.reduce((sum, r) => sum + (r.total - r.paid), 0);
        const oldDebt = selectedInvoiceForDetail.oldDebt !== undefined ? selectedInvoiceForDetail.oldDebt : calculatedOldDebt;

        return (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white w-full max-w-5xl rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 tracking-tighter">Chi tiết hóa đơn</h3>
                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Mã: {selectedInvoiceForDetail.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setSelectedInvoiceForDetail(null)} className="w-8 h-8 bg-white text-slate-400 rounded-full hover:bg-slate-200 transition-colors flex items-center justify-center shadow-sm border border-slate-100">
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 flex items-center gap-3">
                    <Calendar className="text-slate-400 shrink-0" size={18} />
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Ngày lập phiếu</p>
                      <p className="text-xs font-bold text-slate-800">{selectedInvoiceForDetail.date}</p>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                      <User className="text-slate-400 shrink-0" size={18} />
                      <div className="flex-1">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Khách hàng</p>
                        <p className="text-xs font-bold text-slate-800">{selectedInvoiceForDetail.customer}</p>
                      </div>
                    </div>
                    {(displayPhone || displayAddress) && (
                      <div className="mt-2 pt-2 border-t border-slate-200/60 pl-8 space-y-1">
                        {displayPhone && (
                          <p className="text-xs text-slate-600 font-medium">
                            <span className="text-slate-400 mr-1">ĐT:</span> {displayPhone}
                          </p>
                        )}
                        {displayAddress && (
                          <p className="text-xs text-slate-600 font-medium whitespace-pre-wrap">
                            <span className="text-slate-400 mr-1">Đ/C:</span> {displayAddress}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="border border-slate-100 rounded-lg overflow-hidden">
                  <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 flex items-center gap-2">
                    <Package className="text-slate-400" size={14} />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Danh sách mặt hàng</span>
                  </div>
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-50">
                        <th className="px-4 py-3 text-[9px] font-bold text-slate-400 uppercase">Sản phẩm</th>
                        <th className="px-4 py-3 text-[9px] font-bold text-slate-400 uppercase text-center">SL</th>
                        <th className="px-4 py-3 text-[9px] font-bold text-slate-400 uppercase text-right">Đơn giá</th>
                        <th className="px-4 py-3 text-[9px] font-bold text-slate-400 uppercase text-right">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {selectedInvoiceForDetail.items.map((item, idx) => (
                        <tr key={`detail-item-${item.id}-${idx}`}>
                          <td className="px-4 py-3">
                            <p className="text-xs font-bold text-slate-800 tracking-tighter">{item.name}</p>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {item.sn && (
                                <div className="flex flex-wrap gap-1">
                                  {(Array.isArray(item.sn) ? item.sn : item.sn.split(',')).map((sn: string, sIdx: number) => (
                                    <span key={`sn-${sn}-${sIdx}`} className="text-[13px] bg-orange-50 text-orange-600 px-2 py-0.5 rounded font-mono font-bold border border-orange-100 uppercase">
                                      {sn.trim()}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center text-xs font-bold text-slate-600">{item.qty}</td>
                          <td className="px-4 py-3 text-right text-xs font-bold text-slate-600">{formatNumber(item.price)}đ</td>
                          <td className="px-4 py-3 text-right text-xs font-bold text-slate-800">{formatNumber(item.qty * item.price)}đ</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="bg-blue-50/50 p-6 rounded-xl border border-blue-100 space-y-3">
                  <div className="flex justify-between items-center text-slate-600">
                    <span className="text-xs font-bold uppercase tracking-widest">Tổng tiền hàng</span>
                    <span className="text-sm font-bold">{formatNumber(selectedInvoiceForDetail.total + (selectedInvoiceForDetail.discount || 0))}đ</span>
                  </div>
                  <div className="flex justify-between items-center text-red-500">
                    <span className="text-xs font-bold uppercase tracking-widest">Giảm giá</span>
                    <span className="text-sm font-bold">-{formatNumber(selectedInvoiceForDetail.discount || 0)}đ</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-blue-200">
                    <div className="flex items-center gap-2">
                      <CreditCard className="text-blue-600" size={18} />
                      <span className="text-sm font-bold text-blue-800 uppercase tracking-widest">Tổng thanh toán</span>
                    </div>
                    <span className="text-2xl font-bold text-blue-600 tracking-tighter">{formatNumber(selectedInvoiceForDetail.total)}đ</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-4 border-t border-blue-200">
                    <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-200 flex justify-between items-center">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nợ cũ</p>
                      <p className="text-sm font-bold text-slate-700">{formatNumber(oldDebt || 0)}đ</p>
                    </div>
                    <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 flex justify-between items-center">
                      <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Đã thanh toán</p>
                      <p className="text-sm font-bold text-emerald-700">{formatNumber(selectedInvoiceForDetail.paid)}đ</p>
                    </div>
                    <div className="bg-red-50/50 p-3 rounded-xl border border-red-100 flex justify-between items-center">
                      <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest">Nợ hiện tại</p>
                      <p className="text-sm font-bold text-red-700">{formatNumber((oldDebt || 0) + selectedInvoiceForDetail.debt)}đ</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex gap-3 md:hidden">
                <button 
                  onClick={() => navigate('/pos', { state: { editInvoice: selectedInvoiceForDetail } })}
                  className="flex-1 py-3 bg-blue-50 border border-blue-200 text-blue-600 font-bold rounded-lg uppercase text-[10px] tracking-widest shadow-sm hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
                >
                  <Edit3 size={16} /> Sửa hóa đơn
                </button>
                <button 
                  onClick={() => setSelectedInvoiceForDetail(null)}
                  className="flex-1 py-3 bg-[#991b1b] text-white font-bold rounded-lg uppercase text-[10px] tracking-widest shadow-md shadow-red-100 hover:bg-[#7f1d1d] transition-colors"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Mobile Floating Action Button */}
      <button 
        onClick={() => setIsModalOpen(true)}
        className="md:hidden fixed bottom-24 right-4 w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-blue-200 z-40 active:scale-95 transition-transform"
      >
        <Plus size={24} />
      </button>
    </div>
  );
};

