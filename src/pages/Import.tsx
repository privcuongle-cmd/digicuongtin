import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Plus, Truck, CheckCircle, X, Trash2, Barcode, Printer, ArrowLeft, LayoutGrid, Eye, Info, ChevronDown, Edit2, ArrowRight, UserCircle, PieChart, FileText, Package, Image as ImageIcon } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Product, ImportItem, Supplier, CashTransaction, ImportOrder } from '../types';
import { formatNumber, parseFormattedNumber, formatDate, formatDateTime12h } from '../lib/utils';
import { NumericFormat } from 'react-number-format';
import { generateId } from '../lib/idUtils';
import { PrintTemplate } from '../components/PrintTemplate';
import { ProductDetailModal } from '../components/ProductDetailModal';
import { DateTimePicker } from '../components/DateTimePicker';
import { useScrollLock } from '../hooks/useScrollLock';
import { useMobileBackModal } from '../hooks/useMobileBackModal';
import { useEscapeKey } from '../hooks/useEscapeKey';

export const Import: React.FC = () => {
  const navigate = useNavigate();
  const { products, suppliers, importOrders, cashTransactions, addImportOrder, addSupplier, updateProduct, addProduct, addSerial, addCashTransaction, importDraft, setImportDraft, serials, wallets } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  
  useMobileBackModal(!!viewingProduct, () => setViewingProduct(null));
  
  const [cart, setCart] = useState<(ImportItem & { hasSerial?: boolean; serials?: string[]; unit?: string; discount?: number; note?: string })[]>(
    (Array.isArray(importDraft?.cart) ? importDraft.cart : []).map(item => ({
      ...item,
      serials: Array.isArray(item?.serials) ? item.serials : []
    }))
  );
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(importDraft?.selectedSupplier || null);
  const [importCode, setImportCode] = useState(importDraft?.editingId || importDraft?.orderCode || 'Mã phiếu tự động');
  const [orderCode, setOrderCode] = useState('');
  const [overallDiscount, setOverallDiscount] = useState(importDraft?.overallDiscount || 0);
  const [returnCost, setReturnCost] = useState(importDraft?.returnCost || 0);
  const [shippingFee, setShippingFee] = useState(importDraft?.shippingFee || 0);
  const [otherCost, setOtherCost] = useState(importDraft?.otherCost || 0);
  const [note, setNote] = useState(importDraft?.note || '');

  const [transactionDate, setTransactionDate] = useState(() => {
    if (importDraft?.transactionDate) {
      return importDraft.transactionDate;
    }
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  
  // Modals
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isMobileProductSearchOpen, setIsMobileProductSearchOpen] = useState(false);
  const [isMobileSupplierSearchOpen, setIsMobileSupplierSearchOpen] = useState(false);
  const [isMobileCheckoutOpen, setIsMobileCheckoutOpen] = useState(false);
  const [mobileSupplierSearchTerm, setMobileSupplierSearchTerm] = useState('');
  
  // Print State
  const [printData, setPrintData] = useState<any>(null);
  const [showSuccessModal, setShowSuccessModal] = useState<{id: string, total: number} | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const location = useLocation();
  const [showDraftPrompt, setShowDraftPrompt] = useState(() => {
    const isExplicitIntent = location.state?.isExplicitIntent || importDraft?.isExplicitIntent;
    if (importDraft?.cart && importDraft.cart.length > 0 && !isExplicitIntent) {
      return true;
    }
    return false;
  });

  // Lock scroll when modals are open
  useScrollLock(!!viewingProduct || isSupplierModalOpen || isProductModalOpen || isMobileProductSearchOpen || isMobileSupplierSearchOpen || isMobileCheckoutOpen || !!showSuccessModal || showConfirmModal || showDraftPrompt);

  // New Product Form State
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newCost, setNewCost] = useState('');
  const [newUnit, setNewUnit] = useState('Cái');
  const [newCategory, setNewCategory] = useState('');
  const [newHasSerial, setNewHasSerial] = useState(false);

  const hasProductModalChanges = () => {
    return (
      newName !== '' ||
      newPrice !== '' ||
      newCost !== '' ||
      newUnit !== 'Cái' ||
      newCategory !== '' ||
      newHasSerial !== false
    );
  };

  const handleCloseProductModal = () => {
    if (hasProductModalChanges()) {
      if (window.confirm('Bạn có thay đổi chưa lưu. Bạn có chắc chắn muốn đóng mà không lưu không?')) {
        setIsProductModalOpen(false);
        resetProductForm();
      }
    } else {
      setIsProductModalOpen(false);
      resetProductForm();
    }
  };

  const resetProductForm = () => {
    setNewName('');
    setNewPrice('');
    setNewCost('');
    setNewUnit('');
    setNewCategory('');
    setNewHasSerial(false);
  };

  // Handle Escape key
  useEscapeKey(() => setShowSuccessModal(null), !!showSuccessModal);
  useEscapeKey(() => setShowConfirmModal(false), showConfirmModal);
  useEscapeKey(() => setIsMobileCheckoutOpen(false), isMobileCheckoutOpen);
  useEscapeKey(handleCloseProductModal, isProductModalOpen);
  useEscapeKey(() => setIsSupplierModalOpen(false), isSupplierModalOpen);
  useEscapeKey(() => setViewingProduct(null), !!viewingProduct);

  const [paidAmount, setPaidAmount] = useState<number>(importDraft?.paid as number || 0);
  const [walletId, setWalletId] = useState<string>(importDraft?.walletId || '');

  useEffect(() => {
    if (showDraftPrompt) return; // Don't sync draft while prompt is open

    // Only update draft if values actually changed or if we need to clear isExplicitIntent
    if (
      importDraft?.cart !== cart || 
      importDraft?.selectedSupplier !== selectedSupplier || 
      importDraft?.paid !== paidAmount ||
      importDraft?.walletId !== walletId ||
      importDraft?.isExplicitIntent !== undefined
    ) {
      setImportDraft({ 
        ...importDraft, 
        cart, 
        selectedSupplier, 
        paid: paidAmount, 
        walletId,
        isExplicitIntent: undefined // Always clear it so prompt shows next time
      });
    }
  }, [cart, selectedSupplier, paidAmount, walletId, setImportDraft, importDraft, showDraftPrompt]);

  const totalGoods = cart.reduce((sum, item) => sum + (item.price * item.qty) - (item.discount || 0), 0);
  const finalTotal = totalGoods - overallDiscount + returnCost + otherCost + shippingFee;

  const handlePrint = (data: any) => {
    setPrintData(data);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  // Search results
  const [productSuggestions, setProductSuggestions] = useState<Product[]>([]);
  const [supplierSuggestions, setSupplierSuggestions] = useState<Supplier[]>([]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchTerm.trim()) {
        const filtered = (products || [])
          .filter(p => 
            !p.isService && (p.status || 'Đang kinh doanh') === 'Đang kinh doanh' && (
              (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
              (p.id || '').toLowerCase().includes(searchTerm.toLowerCase())
            )
          )
          .reverse();
        setProductSuggestions(filtered.slice(0, 30));
      } else {
        setProductSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [searchTerm, products]);

  const handleSupplierSearch = (val: string) => {
    if (val.trim()) {
      const filtered = (suppliers || []).filter(s => 
        (s.name || '').toLowerCase().includes(val.toLowerCase()) || 
        (s.phone || '').includes(val)
      );
      setSupplierSuggestions(filtered);
    } else {
      setSupplierSuggestions([]);
    }
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing && !product.hasSerial) {
        return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      }
      if (existing && product.hasSerial) return prev;

      return [...prev, { 
        id: product.id, 
        name: product.name, 
        price: product.importPrice || Math.round(product.price * 0.7), 
        qty: product.hasSerial ? 0 : 1,
        hasSerial: product.hasSerial,
        serials: [],
        unit: product.unit || 'Cái',
        discount: 0,
        note: ''
      }];
    });
    setSearchTerm('');
    setProductSuggestions([]);
  };

  const updateQty = (id: string, qty: number) => {
    const product = (products || []).find(p => p.id === id);
    if (product?.hasSerial) return;
    if (qty < 0) return;
    setCart(prev => prev.map(item => item.id === id ? { ...item, qty } : item));
  };

  const updatePrice = (id: string, price: number) => {
    if (price < 0) return;
    setCart(prev => prev.map(item => item.id === id ? { ...item, price } : item));
  };

  const updateItemDiscount = (id: string, discount: number) => {
    setCart(prev => prev.map(item => item.id === id ? { ...item, discount } : item));
  };

  const updateItemNote = (id: string, note: string) => {
    setCart(prev => prev.map(item => item.id === id ? { ...item, note } : item));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const addSerialToItem = (prodId: string, sn: string) => {
    if (!sn.trim()) return;
    const upperSn = sn.toUpperCase();
    
    // Check if serial already exists in the system
    const isEditMode = !!importDraft?.editingId;
    const existingSerial = serials?.find(s => 
      (s.sn || '').toUpperCase() === upperSn && 
      (!isEditMode || s.refId !== importDraft?.editingId)
    );
    if (existingSerial) {
      alert(`Mã serial ${upperSn} đã tồn tại trong hệ thống!`);
      return;
    }

    setCart(prev => prev.map(item => {
      if (item.id === prodId) {
        if (item.serials?.includes(upperSn)) {
          alert("Mã này đã quét trong phiếu này!");
          return item;
        }
        const newSerials = [...(item.serials || []), upperSn];
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

  useEffect(() => {
    if (importDraft?.paid === undefined && finalTotal !== paidAmount) {
      setPaidAmount(finalTotal);
    }
  }, [finalTotal, importDraft?.paid]);

  const handleImportClick = () => {
    if (cart.length === 0) return alert('Phiếu nhập trống!');
    if (!selectedSupplier) return alert('Vui lòng chọn nhà cung cấp!');
    if (paidAmount > 0 && !walletId) {
      return alert('Vui lòng chọn ví thanh toán!');
    }
    
    for (let item of cart) {
      if (item.hasSerial && item.qty === 0) {
        return alert(`Sản phẩm ${item.name} chưa quét mã Serial!`);
      }
    }
    setShowConfirmModal(true);
  };

  const handleImport = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setShowConfirmModal(false);

    try {
      const [y, m, d, hh, min] = transactionDate.split(/[-T:]/);
      const dateStr = `${d}/${m}/${y} ${hh}:${min}:00`;
      const now = new Date(`${y}-${m}-${d}T${hh}:${min}:00`);

      const isEdit = !!importDraft?.editingId;
      const importId = isEdit ? importDraft.editingId as string : (importCode === 'Mã phiếu tự động' ? generateId('NHN', importOrders) : importCode);

      const isActuallyUpdate = isEdit || importOrders.some(o => o.id === importId);

      const order: ImportOrder = {
        id: importId,
        date: dateStr,
        supplier: selectedSupplier.name,
        status: (finalTotal - paidAmount > 0) ? 'Còn nợ' : 'Hoàn tất',
        items: cart.map(item => ({
          id: item.id,
          name: item.name,
          qty: item.qty,
          price: item.price,
          sn: item.serials,
          unit: item.unit
        })),
        total: finalTotal,
        paid: paidAmount,
        debt: finalTotal - paidAmount,
        discount: overallDiscount,
        returnCost: returnCost,
        shippingFee: shippingFee,
        otherCost: otherCost,
        note: note,
        walletId: paidAmount > 0 ? (walletId || undefined) : undefined
      };

      if (isActuallyUpdate) {
        // Update existing order
        await addImportOrder(order);
        
        // Also check if they added a payment amount but no previous cash transaction existed
        const existingTx = cashTransactions.find(t => t.refId === importId && t.category === 'IMPORT_PAYMENT');
        if (!existingTx && order.paid > 0) {
          const transactionId = generateId('PC', cashTransactions);
          addCashTransaction({
            id: transactionId,
            date: dateStr,
            type: 'PAYMENT',
            amount: order.paid,
            category: 'IMPORT_PAYMENT',
            partner: selectedSupplier.name,
            note: `Thanh toán phiếu nhập ${importId}`,
            refId: importId,
            walletId: walletId || undefined
          });
        }
      } else {
        await addImportOrder(order);

        // Record Cash Transaction if paidAmount > 0
        if (order.paid > 0) {
          const transactionId = generateId('PC', cashTransactions);
          const newTransaction: CashTransaction = {
            id: transactionId,
            date: dateStr,
            type: 'PAYMENT',
            amount: order.paid,
            category: 'IMPORT_PAYMENT',
            partner: selectedSupplier.name,
            note: `Thanh toán phiếu nhập ${importId}`,
            refId: importId,
            walletId: walletId || undefined
          };
          addCashTransaction(newTransaction);
          
          if (shippingFee > 0) {
            const shipTransactionId = generateId('PC', [...cashTransactions, newTransaction]);
            const shipTransaction: CashTransaction = {
              id: shipTransactionId,
              date: dateStr,
              type: 'PAYMENT',
              amount: shippingFee,
              category: 'OTHER',
              partner: selectedSupplier.name,
              note: `Phí vận chuyển phiếu nhập ${importId}`,
              refId: importId,
              walletId: walletId || undefined
            };
            addCashTransaction(shipTransaction);
          }
        } else if (shippingFee > 0) {
          const shipTransactionId = generateId('PC', cashTransactions);
          const shipTransaction: CashTransaction = {
            id: shipTransactionId,
            date: dateStr,
            type: 'PAYMENT',
            amount: shippingFee,
            category: 'OTHER',
            partner: selectedSupplier.name,
            note: `Phí vận chuyển phiếu nhập ${importId}`,
            refId: importId,
            walletId: walletId || undefined
          };
          addCashTransaction(shipTransaction);
        }
      }

      // Add missing serials regardless of create or edit
      for (const item of cart) {
        if (item.hasSerial && item.serials) {
          for (const sn of item.serials) {
            const exists = (serials || []).find(s => s.sn === sn);
            if (!exists) {
              addSerial({
                prodId: item.id,
                sn,
                supplier: selectedSupplier.name,
                importPrice: item.price,
                date: formatDate(now),
                refId: importId,
                status: 'AVAILABLE'
              });
            }
          }
        }
      }

      setCart([]);
      setSelectedSupplier(null);
      setPaidAmount(0);
      setNote('');
      setOverallDiscount(0);
      setReturnCost(0);
      setShippingFee(0);
      setOtherCost(0);
      setImportCode('Mã phiếu tự động');
      setOrderCode('');
      setImportDraft(null);
      
      // Navigate to import history after successful import
      navigate('/import-history');
    } catch (error) {
      console.error("Error creating import:", error);
      alert("Có lỗi xảy ra khi tạo phiếu nhập!");
    } finally {
      setIsSubmitting(false);
    }
  };

  useMobileBackModal(isSupplierModalOpen, () => setIsSupplierModalOpen(false)); // auto-injected
  useMobileBackModal(isProductModalOpen, () => setIsProductModalOpen(false)); // auto-injected
  useMobileBackModal(isMobileProductSearchOpen, () => setIsMobileProductSearchOpen(false)); // auto-injected
  useMobileBackModal(isMobileSupplierSearchOpen, () => setIsMobileSupplierSearchOpen(false)); // auto-injected
  useMobileBackModal(isMobileCheckoutOpen, () => setIsMobileCheckoutOpen(false)); // auto-injected
  useMobileBackModal(showConfirmModal, () => setShowConfirmModal(false)); // auto-injected
  useMobileBackModal(!!showSuccessModal, () => setShowSuccessModal(false));
  useMobileBackModal(!!viewingProduct, () => setViewingProduct(null));

  return (
    <>
      <div className="flex flex-col lg:flex-row bg-slate-50 print:bg-white relative">
      {/* Print Template Container */}
      {printData && <PrintTemplate {...printData} />}

      {showSuccessModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-8 text-center animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <CheckCircle size={48} />
            </div>
            <h3 className="md:text-3xl text-2xl font-bold text-slate-800 mb-2">Nhập kho thành công!</h3>
            <p className="md:text-base text-sm text-slate-500 mb-8 font-medium">Phiếu nhập <span className="font-bold text-indigo-600">{showSuccessModal.id}</span> đã được lưu vào hệ thống.</p>
            
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => {
                  const order = (importOrders || []).find(o => o.id === showSuccessModal.id);
                  if (order) {
                    handlePrint({
                      title: 'PHIẾU NHẬP HÀNG',
                      id: order.id,
                      date: order.date,
                      partner: order.supplier,
                      items: order.items.map(i => ({ ...i, total: i.qty * i.price })),
                      total: order.total,
                      paid: order.total,
                      debt: 0,
                      type: 'PHIEU_NHAP'
                    });
                  }
                  setShowSuccessModal(null);
                }}
                className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl md:text-lg text-base shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
              >
                <Printer size={20} /> In phiếu nhập
              </button>
              <button 
                onClick={() => setShowSuccessModal(null)}
                className="w-full py-4 bg-slate-100 text-slate-600 font-bold rounded-xl md:text-lg text-base hover:bg-slate-200 transition-all"
              >
                Tiếp tục nhập hàng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Left Column: Main Content */}
      <div className="flex-1 flex flex-col min-w-0 print:hidden">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center p-4 bg-white border-b border-slate-100 gap-3">
          <button onClick={() => navigate(-1)} className="text-slate-500">
            <X size={24} />
          </button>
          <h1 className="flex-1 text-lg font-bold text-slate-800">Phiếu nhập hàng mới</h1>
          <button className="text-slate-500">
            <Info size={24} />
          </button>
        </div>

        {/* Desktop Top Header */}
        <div className="hidden md:flex h-14 items-center px-4 bg-white border-b border-slate-200 shrink-0 gap-2">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-bold text-slate-800 whitespace-nowrap">Nhập hàng</h1>
          
          <div className="flex-1 max-w-xl relative">
            <div className="flex items-center gap-2 md:gap-3 bg-slate-50 px-3 md:px-4 py-2 rounded-lg border border-slate-200 focus-within:border-blue-400 focus-within:bg-white transition-all">
              <Search className="text-slate-400" size={18} />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchTerm.trim() !== '' && productSuggestions.length === 0) {
                    resetProductForm();
                    setIsProductModalOpen(true);
                    setProductSuggestions([]);
                  } else if (e.key === 'Enter' && productSuggestions.length === 1) {
                    addToCart(productSuggestions[0]);
                    setSearchTerm('');
                    setProductSuggestions([]);
                  }
                }}
                placeholder="Tìm hàng (F3)" 
                className="flex-1 bg-transparent text-sm outline-none font-medium"
              />
              <div className="flex items-center gap-1 md:gap-2">
                <LayoutGrid size={18} className="text-slate-400 cursor-pointer hover:text-slate-600 hidden sm:block" />
                <Plus onClick={() => {
                  resetProductForm();
                  setIsProductModalOpen(true);
                }} size={18} className="text-slate-400 cursor-pointer hover:text-slate-600" />
              </div>
            </div>
            {(productSuggestions.length > 0 || (searchTerm.trim() !== '' && productSuggestions.length === 0)) && (
              <div className="absolute top-full left-0 right-0 z-[60] bg-white border border-slate-200 rounded-lg shadow-2xl mt-1 max-h-[400px] overflow-y-auto">
                {productSuggestions.map((p, idx) => (
                  <div 
                    key={`${p.id}-${idx}`} 
                    onClick={() => addToCart(p)}
                    className="p-3 border-b border-slate-50 hover:bg-blue-50 flex gap-3 items-center cursor-pointer transition-colors"
                  >
                    <div className="w-10 h-10 rounded border border-slate-100 bg-slate-50 flex-shrink-0 flex items-center justify-center overflow-hidden">
                      {p.image ? (
                        <img src={p.image} alt={p.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <ImageIcon size={18} className="text-slate-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{p.name}</p>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">Mã: {p.id} | Tồn: {p.stock}</p>
                    </div>
                    {p.hasSerial && <span className="text-[10px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded font-bold">Serial</span>}
                  </div>
                ))}
                {searchTerm.trim() !== '' && (
                  <div className="p-3 bg-slate-50 border-t border-slate-100">
                    <button 
                      onClick={() => {
                        resetProductForm();
                        setIsProductModalOpen(true);
                        setProductSuggestions([]);
                      }}
                      className="w-full py-3 px-3 flex items-center justify-center gap-2 text-blue-600 bg-white border border-blue-200 rounded-xl hover:bg-blue-50 transition-all text-sm font-bold shadow-sm active:scale-[0.98]"
                    >
                      <Plus size={18} /> Thêm sản phẩm mới "{searchTerm}"
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="ml-auto flex items-center gap-1">
            <button className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg hidden sm:block"><Barcode size={20} /></button>
            <button className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg hidden sm:block"><Printer size={20} /></button>
            <button className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg"><Eye size={20} /></button>
            <button className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg hidden sm:block"><Info size={20} /></button>
          </div>
        </div>

        {/* Mobile Search & Supplier */}
        <div className="md:hidden bg-white p-4 shadow-sm z-10">
          <div className="flex gap-2 mb-3">
            <div 
              className="flex-1 flex items-center bg-slate-100 rounded-xl px-3 py-2.5"
              onClick={() => setIsMobileProductSearchOpen(true)}
            >
              <Search size={18} className="text-slate-400" />
              <span className="text-slate-400 ml-2 text-sm font-medium flex-1">Tên, mã hàng, mã ...</span>
              <Plus size={18} className="text-slate-400 mr-2" />
              <Barcode size={18} className="text-slate-400" />
            </div>
            <button className="bg-slate-100 rounded-xl px-4 py-2.5 flex flex-col items-center justify-center">
              <LayoutGrid size={18} className="text-slate-600 mb-0.5" />
              <span className="text-[10px] font-medium text-slate-600">Nhóm hàng</span>
            </button>
          </div>
          <div 
            className="flex items-center gap-2 py-2"
            onClick={() => setIsMobileSupplierSearchOpen(true)}
          >
            <Truck size={20} className="text-slate-500" />
            <span className={`text-sm font-bold ${selectedSupplier ? 'text-slate-800' : 'text-slate-800'}`}>
              {selectedSupplier ? selectedSupplier.name : 'Chọn nhà cung cấp'}
            </span>
            <ChevronDown size={16} className="text-slate-400" />
          </div>
        </div>

        {/* Table Area */}
        <div className="flex-1 overflow-auto bg-white">
          <table className="w-full border-collapse hidden md:table">
            <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="w-12 p-3"></th>
                <th className="w-12 p-3 text-xs font-bold text-slate-500 text-left">STT</th>
                <th className="w-32 p-3 text-xs font-bold text-slate-500 text-left">Mã hàng</th>
                <th className="p-3 text-xs font-bold text-slate-500 text-left">Tên hàng</th>
                <th className="w-24 p-3 text-xs font-bold text-slate-500 text-center">ĐVT</th>
                <th className="w-32 p-3 text-xs font-bold text-slate-500 text-center">Số lượng</th>
                <th className="w-32 p-3 text-xs font-bold text-slate-500 text-center">Đơn giá</th>
                <th className="w-32 p-3 text-xs font-bold text-slate-500 text-center">Giảm giá</th>
                <th className="w-32 p-3 text-xs font-bold text-slate-500 text-right">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {cart.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-20 text-center text-slate-400 italic text-sm">Chưa có sản phẩm nào trong phiếu nhập.</td>
                </tr>
              ) : (
                cart.map((item, index) => (
                  <React.Fragment key={`${item.id}-${index}`}>
                    <tr className="border-b border-slate-100 hover:bg-slate-50/50 group">
                      <td className="p-3 text-center">
                        <button onClick={() => removeFromCart(item.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </td>
                      <td className="p-3 text-sm text-slate-600 font-medium">{index + 1}</td>
                      <td className="p-3 text-sm text-blue-600 font-semibold cursor-pointer hover:underline" onClick={() => {
                        const p = (products || []).find(prod => prod.id === item.id);
                        if (p) setViewingProduct(p);
                      }}>{item.id}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded border border-slate-100 bg-slate-50 flex-shrink-0 flex items-center justify-center overflow-hidden">
                            {(products || []).find(p => p.id === item.id)?.image ? (
                              <img src={(products || []).find(p => p.id === item.id)?.image} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <ImageIcon size={14} className="text-slate-300" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{item.name}</p>
                            <div className="flex items-center gap-1 mt-1">
                              <span className="text-[10px] text-slate-400 italic">Ghi chú...</span>
                              <Edit2 size={10} className="text-slate-300 cursor-pointer hover:text-slate-500" />
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-center text-sm text-blue-600 font-medium">{item.unit}</td>
                      <td className="p-3">
                        <input 
                          type="text" 
                          value={item.qty}
                          disabled={item.hasSerial}
                          onChange={(e) => updateQty(item.id, Number(e.target.value) || 0)}
                          className={`w-full text-center border border-slate-200 rounded-lg px-2 py-1.5 text-sm font-semibold outline-none focus:border-blue-500 ${item.hasSerial ? 'bg-slate-50 text-slate-400' : 'bg-white'}`}
                        />
                      </td>
                      <td className="p-3">
                        <NumericFormat 
                          value={item.price}
                          onValueChange={(values) => updatePrice(item.id, values.floatValue || 0)}
                          thousandSeparator="."
                          decimalSeparator=","
                          className="w-full text-center border border-slate-200 rounded-lg px-2 py-1.5 text-sm font-semibold outline-none focus:border-blue-500"
                        />
                      </td>
                      <td className="p-3">
                        <NumericFormat 
                          value={item.discount}
                          onValueChange={(values) => updateItemDiscount(item.id, values.floatValue || 0)}
                          thousandSeparator="."
                          decimalSeparator=","
                          className="w-full text-center border border-slate-200 rounded-lg px-2 py-1.5 text-sm font-semibold outline-none focus:border-blue-500"
                        />
                      </td>
                      <td className="p-3 text-right text-sm font-bold text-slate-800">
                        {formatNumber((item.price * item.qty) - (item.discount || 0))}
                      </td>
                    </tr>
                    {/* Serial Input Row */}
                    {item.hasSerial && (
                      <tr className="border-b border-slate-100 bg-slate-50/30 font-bold">
                        <td className="p-0"></td>
                        <td className="p-0"></td>
                        <td className="p-0"></td>
                        <td colSpan={6} className="p-3">
                          <div className="flex flex-col gap-2">
                            <div className="relative max-w-sm">
                              <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                              <input 
                                type="text" 
                                placeholder="Nhập số Serial/Imei" 
                                className="w-full bg-white border border-indigo-200 rounded-lg pl-9 pr-3 py-1.5 text-xs outline-none focus:border-indigo-400 font-medium shadow-sm transition-all"
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
                                  <span key={`${sn}-${sIdx}`} className="bg-indigo-50 text-indigo-600 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1.5 border border-indigo-100 animate-in zoom-in duration-200">
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

          {/* Mobile Card View */}
          <div className="md:hidden bg-slate-50 p-3 space-y-3 pb-40">
            {cart.length === 0 ? (
              <div className="p-20 flex flex-col items-center justify-center text-center">
                <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-4 relative shadow-inner">
                  <FileText size={40} className="text-blue-400" />
                  <div className="absolute top-4 right-4 w-2 h-2 bg-blue-300 rounded-full"></div>
                  <div className="absolute bottom-4 left-4 w-1.5 h-1.5 bg-blue-300 rounded-full"></div>
                  <div className="absolute top-1/2 -left-2 w-1 h-1 bg-blue-300 rounded-full"></div>
                  <div className="absolute top-1/2 -right-2 w-1 h-1 bg-blue-300 rounded-full"></div>
                </div>
                <p className="text-slate-500 font-medium text-sm">Chưa có hàng trong phiếu</p>
              </div>
            ) : (
              cart.map((item, index) => {
                const product = (products || []).find(p => p.id === item.id);
                return (
                  <div key={`${item.id}-${index}`} className="bg-white rounded-xl shadow-[0_1px_3px_0_rgba(0,0,0,0.05)] border border-slate-200 p-3 flex gap-3 relative">
                    <button 
                      onClick={() => removeFromCart(item.id)} 
                      className="absolute top-2.5 right-2 text-slate-400 hover:text-red-500 bg-white rounded-full p-1 active:bg-slate-100 transition-colors z-10"
                    >
                      <X size={16} />
                    </button>
                    
                    <div className="w-16 h-16 bg-slate-100 rounded-lg shrink-0 flex items-center justify-center overflow-hidden border border-slate-200/60 mt-0.5">
                      {product?.image ? (
                        <img src={product.image} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <Package size={20} className="text-slate-300" />
                      )}
                    </div>
                    
                    <div className="flex-1 pr-7">
                      <h3 className="text-[13px] font-bold text-slate-800 leading-tight mb-1">{item.name}</h3>
                      <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                        <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">{item.id}</span>
                        <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-1.5 py-0.5 rounded">{item.unit || 'Cái'}</span>
                        <span className="text-[11px] text-slate-500">Tồn: {product?.stock || 0}</span>
                      </div>
                      
                      {item.hasSerial && (
                        <div className="flex items-center gap-1.5 mb-2.5">
                          <span className="bg-blue-50 border border-blue-200 text-blue-600 text-[9px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">IMEI</span>
                          {item.serials && item.serials.length > 0 ? (
                            <span className="text-[11px] text-blue-600 font-bold">{item.serials.length} IMEI</span>
                          ) : (
                            <span className="text-[11px] text-yellow-600 font-bold">Chưa quét</span>
                          )}
                        </div>
                      )}
                      
                      <div className="flex justify-between items-center bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                        <div className="flex items-center border border-slate-200 bg-white rounded flex-shrink-0">
                          <button 
                            className="w-7 h-7 flex items-center justify-center text-slate-600 active:bg-slate-100 disabled:opacity-50" 
                            onClick={() => updateQty(item.id, item.qty - 1)}
                            disabled={item.hasSerial}
                          >
                            -
                          </button>
                          <input 
                            type="text" 
                            value={item.qty}
                            disabled={item.hasSerial}
                            onChange={(e) => updateQty(item.id, Number(e.target.value) || 0)}
                            className="w-8 text-center text-xs font-bold outline-none bg-white disabled:bg-slate-50"
                          />
                          <button 
                            className="w-7 h-7 flex items-center justify-center text-slate-600 active:bg-slate-100 disabled:opacity-50" 
                            onClick={() => updateQty(item.id, item.qty + 1)}
                            disabled={item.hasSerial}
                          >
                            +
                          </button>
                        </div>
                        <div className="text-right min-w-[70px]">
                          <div className="text-[10px] text-slate-500 mb-0.5">{formatNumber(item.price)}/sp</div>
                          <div className="text-sm font-black text-rose-600">{formatNumber((item.price * item.qty) - (item.discount || 0))}</div>
                        </div>
                      </div>

                      {/* Serial input for mobile */}
                      {item.hasSerial && (
                        <div className="mt-2.5 space-y-2 pt-2 border-t border-slate-100">
                          <div className="relative">
                            <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            <input 
                              type="text" 
                              placeholder="Quét IMEI / Serial" 
                              className="w-full bg-slate-50 border border-slate-200 rounded-md pl-9 pr-3 py-1.5 text-xs outline-none focus:border-blue-400 font-medium"
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  addSerialToItem(item.id, (e.target as HTMLInputElement).value);
                                  (e.target as HTMLInputElement).value = '';
                                }
                              }}
                            />
                          </div>
                          {item.serials && item.serials.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {(item.serials || []).map((sn, sIdx) => (
                                <span key={`${sn}-${sIdx}`} className="bg-blue-50 text-blue-600 text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 border border-blue-100">
                                  {sn} <X size={10} className="cursor-pointer active:scale-90" onClick={() => removeSerialFromItem(item.id, sn)} />
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Mobile Bottom Bar */}
          {cart.length > 0 && (
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-20">
              <div className="p-4 flex justify-between items-center border-b border-slate-100">
                <div>
                  <span className="text-base font-bold text-slate-800 block">Tổng tiền hàng</span>
                  <span className="text-sm text-slate-500">{cart.length} mặt hàng</span>
                </div>
                <span className="text-lg font-bold text-slate-800">{formatNumber(totalGoods)}</span>
              </div>
              <div className="p-4 flex gap-3">
                <button 
                  onClick={() => alert('Đã lưu tạm')}
                  className="flex-1 py-3.5 rounded-xl border border-blue-600 text-blue-600 font-bold text-sm bg-white active:scale-95 transition-all"
                >
                  Lưu tạm
                </button>
                <button 
                  onClick={() => setIsMobileCheckoutOpen(true)}
                  className="flex-1 py-3.5 rounded-xl bg-blue-600 text-white font-bold text-sm active:scale-95 transition-all"
                >
                  Thanh toán
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Summary Panel */}
      <div className="w-full lg:w-[380px] bg-white border-l border-slate-200 flex flex-col shrink-0 print:hidden lg:static fixed inset-y-0 right-0 transform lg:translate-x-0 translate-x-full transition-transform duration-300 ease-in-out z-[100]" id="import-summary">
        <div className="lg:hidden flex items-center p-4 border-b border-slate-100 bg-indigo-600 text-white gap-3">
          <button onClick={() => document.getElementById('import-summary')?.classList.add('translate-x-full')}>
            <ArrowLeft size={24} />
          </button>
          <h3 className="font-bold flex-1">Tổng kết nhập hàng</h3>
        </div>
        {/* Supplier Search */}
        <div className="p-4 border-b border-slate-100">
          {!selectedSupplier ? (
            <div className="relative">
              <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-lg border border-slate-200 focus-within:border-blue-400 focus-within:bg-white transition-all">
                <input 
                  type="text" 
                  placeholder="Tìm nhà cung cấp" 
                  className="flex-1 bg-transparent text-sm outline-none font-medium" 
                  onChange={(e) => handleSupplierSearch(e.target.value)}
                />
                <Plus 
                  className="text-blue-600 cursor-pointer hover:scale-110 transition-transform" 
                  size={20} 
                  onClick={() => setIsSupplierModalOpen(true)}
                />
              </div>
              {supplierSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-[60] bg-white border border-slate-200 rounded-lg shadow-2xl mt-1 max-h-[200px] overflow-y-auto">
                  {supplierSuggestions.map((s, idx) => (
                    <div 
                      key={`${s.phone}-${s.id || idx}`} 
                      onClick={() => {
                        setSelectedSupplier(s);
                        setSupplierSuggestions([]);
                      }}
                      className="p-4 border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors flex justify-between items-center"
                    >
                      <span className="text-sm font-semibold text-slate-800">{s.name}</span>
                      <span className="text-xs text-slate-500 font-medium">{s.phone}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-3 bg-blue-50 rounded-xl flex justify-between items-center border border-blue-100 animate-in fade-in slide-in-from-top-1">
              <div>
                <p className="text-sm font-bold text-blue-800">{selectedSupplier.name}</p>
                <p className="text-xs text-blue-500 font-medium mt-0.5">{selectedSupplier.phone}</p>
              </div>
              <button onClick={() => setSelectedSupplier(null)} className="text-red-400 hover:text-red-600 p-1 bg-white rounded-full shadow-sm">
                <X size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Summary Fields */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-slate-600">Thời gian</span>
            <DateTimePicker value={transactionDate} onChange={setTransactionDate} />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-slate-600">Mã phiếu nhập</span>
            <input 
              type="text" 
              value={importCode}
              onChange={(e) => setImportCode(e.target.value)}
              className="w-48 text-right border-b border-slate-200 bg-transparent px-1 py-1 text-sm font-semibold outline-none focus:border-blue-500 placeholder:text-slate-300" 
              placeholder="Mã phiếu tự động"
            />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-slate-600">Mã đặt hàng nhập</span>
            <span className="text-sm font-semibold text-slate-400 italic">Chưa chọn</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-slate-600">Trạng thái</span>
            <span className="text-sm font-bold text-slate-800">Phiếu tạm</span>
          </div>
          
          <div className="pt-4 border-t border-slate-100 space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-slate-600">Tổng tiền hàng</span>
                <Info size={14} className="text-slate-300 cursor-help" />
              </div>
              <span className="text-sm font-bold text-slate-800">{formatNumber(totalGoods)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-slate-600">Giảm giá</span>
              <NumericFormat 
                value={overallDiscount}
                onValueChange={(values) => setOverallDiscount(values.floatValue || 0)}
                thousandSeparator="."
                decimalSeparator=","
                className="w-32 text-right border border-slate-200 rounded-lg bg-white px-3 py-1.5 text-sm font-semibold outline-none focus:border-blue-500" 
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-slate-600">Chi phí nhập trả NCC</span>
              <NumericFormat 
                value={returnCost}
                onValueChange={(values) => setReturnCost(values.floatValue || 0)}
                thousandSeparator="."
                decimalSeparator=","
                className="w-32 text-right border border-slate-200 rounded-lg bg-white px-3 py-1.5 text-sm font-semibold outline-none focus:border-blue-500 text-blue-600" 
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-slate-600">Phí vận chuyển</span>
              <NumericFormat 
                value={shippingFee}
                onValueChange={(values) => setShippingFee(values.floatValue || 0)}
                thousandSeparator="."
                decimalSeparator=","
                className="w-32 text-right border border-slate-200 rounded-lg bg-white px-3 py-1.5 text-sm font-semibold outline-none focus:border-blue-500 text-orange-600" 
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-slate-800">Cần trả nhà cung cấp</span>
              <span className="text-base font-bold text-blue-600">{formatNumber(finalTotal)}</span>
            </div>
            {/* Wallets */}
            <div className="flex flex-wrap gap-2 py-2">
              <span className="text-xs font-bold text-slate-500 block w-full">Ví / Ngân hàng thanh toán:</span>
              {wallets.length === 0 && (
                <span className="text-xs text-rose-500 italic">Vui lòng thiết lập ví trong Cài đặt</span>
              )}
              {wallets.map((w, idx) => (
                <label key={`${w.id}-${idx}`} className="flex items-center gap-2 cursor-pointer group px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50">
                  <input 
                    type="radio" 
                    name="walletId" 
                    checked={walletId === w.id} 
                    onChange={() => setWalletId(w.id)}
                    className="w-3.5 h-3.5 text-blue-600 accent-blue-600"
                  />
                  <span className={`text-xs font-bold ${walletId === w.id ? 'text-blue-700' : 'text-slate-600'}`}>
                    {w.name}
                  </span>
                </label>
              ))}
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-slate-600">Đã thanh toán</span>
              {walletId ? (
                <NumericFormat 
                  value={paidAmount}
                  onValueChange={(values) => setPaidAmount(values.floatValue || 0)}
                  thousandSeparator="."
                  decimalSeparator=","
                  className="w-32 text-right border border-slate-200 rounded-lg bg-white px-3 py-1.5 text-sm font-semibold outline-none focus:border-blue-500" 
                  placeholder="0"
                />
              ) : (
                <span className="text-xs font-medium text-rose-500 italic">Vui lòng chọn ví</span>
              )}
            </div>
            
            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
              <span className="text-sm font-bold text-red-600">Còn nợ NCC</span>
              <span className="text-base font-bold text-red-600">{formatNumber(finalTotal - paidAmount)}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-slate-600">Chi phí nhập khác</span>
                <ArrowRight size={14} className="text-blue-500 cursor-pointer" />
              </div>
              <span className="text-sm font-bold text-blue-600">0</span>
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
        <div className="p-4 grid grid-cols-2 gap-3 bg-slate-50">
          <button className="py-3 px-4 rounded-xl font-bold text-sm text-blue-600 bg-white border border-blue-200 hover:bg-blue-50 transition-all active:scale-95 shadow-sm">
            Lưu tạm
          </button>
          <button 
            onClick={handleImportClick}
            disabled={isSubmitting}
            className={`py-3 px-4 rounded-xl font-bold text-sm text-white transition-all shadow-md flex items-center justify-center gap-2 ${isSubmitting ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-blue-200'}`}
          >
            {isSubmitting ? 'Đang xử lý...' : 'Hoàn thành'}
          </button>
        </div>
      </div>
    </div>

      {/* Mobile Summary Toggle */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-3 flex justify-between items-center z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tổng nhập ({cart.length})</span>
          <span className="text-lg font-bold text-indigo-600">{formatNumber(finalTotal)}đ</span>
        </div>
        <button 
          onClick={() => document.getElementById('import-summary')?.classList.remove('translate-x-full')}
          className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-md active:scale-95 transition-all"
        >
          Tổng kết <ChevronDown size={18} className="-rotate-90" />
        </button>
      </div>

      {/* Mobile Product Search Fullscreen */}
      {isMobileProductSearchOpen && (
        <div className="fixed inset-0 z-[400] bg-white flex flex-col md:hidden">
          <div className="flex items-center p-4 border-b border-slate-100 gap-3">
            <button onClick={() => setIsMobileProductSearchOpen(false)} className="text-slate-500">
              <X size={24} />
            </button>
            <div className="flex-1 flex items-center bg-slate-100 rounded-lg px-3 py-2">
              <Search size={18} className="text-slate-400" />
              <input 
                type="text" 
                autoFocus
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchTerm.trim() !== '' && productSuggestions.length === 0) {
                    resetProductForm();
                    setIsProductModalOpen(true);
                    setIsMobileProductSearchOpen(false);
                    setProductSuggestions([]);
                  } else if (e.key === 'Enter' && productSuggestions.length === 1) {
                    addToCart(productSuggestions[0]);
                    setIsMobileProductSearchOpen(false);
                    setSearchTerm('');
                    setProductSuggestions([]);
                  }
                }}
                placeholder="Tên, mã hàng, mã vạch..." 
                className="bg-transparent border-none outline-none flex-1 ml-2 text-sm font-medium" 
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {searchTerm.trim() !== '' && productSuggestions.length === 0 && (
              <div className="p-8 text-center bg-blue-50/30">
                <p className="text-sm text-slate-500 mb-6 font-medium">Không tìm thấy sản phẩm "{searchTerm}"</p>
                <button 
                  onClick={() => {
                    resetProductForm();
                    setIsProductModalOpen(true);
                    setIsMobileProductSearchOpen(false);
                  }}
                  className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-100 active:scale-95 transition-all text-sm uppercase tracking-widest"
                >
                  <Plus size={20} /> Tạo mới hàng hóa này
                </button>
              </div>
            )}
            {(searchTerm.trim() ? productSuggestions : [...(products || [])].filter(p => !p.isService).reverse()).map((p, idx) => (
              <div 
                key={`${p.id}-${idx}`} 
                onClick={() => {
                  addToCart(p);
                  setIsMobileProductSearchOpen(false);
                }}
                className="p-4 border-b border-slate-50 flex justify-between items-center cursor-pointer"
              >
                <div>
                  <p className="text-sm font-bold text-slate-800">{p.name}</p>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">Mã: {p.id} | Tồn: {p.stock}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-blue-600">{formatNumber(p.price)}đ</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mobile Supplier Search Fullscreen */}
      {isMobileSupplierSearchOpen && (
        <div className="fixed inset-0 z-[400] bg-white flex flex-col md:hidden">
          <div className="flex items-center p-4 border-b border-slate-100 gap-3">
            <button onClick={() => setIsMobileSupplierSearchOpen(false)} className="text-slate-500">
              <X size={24} />
            </button>
            <div className="flex-1 flex items-center bg-slate-100 rounded-lg px-3 py-2">
              <Search size={18} className="text-slate-400" />
              <input 
                type="text" 
                autoFocus
                placeholder="Tìm nhà cung cấp..." 
                className="bg-transparent border-none outline-none flex-1 ml-2 text-sm font-medium" 
                onChange={(e) => setMobileSupplierSearchTerm(e.target.value)}
              />
            </div>
            <button onClick={() => {
              setIsMobileSupplierSearchOpen(false);
              setIsSupplierModalOpen(true);
            }} className="text-blue-600">
              <Plus size={24} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {(mobileSupplierSearchTerm.trim() 
              ? (suppliers || []).filter(s => (s.name || '').toLowerCase().includes(mobileSupplierSearchTerm.toLowerCase()) || (s.phone || '').includes(mobileSupplierSearchTerm))
              : (suppliers || [])
            ).map((s, idx) => (
              <div 
                key={`${s.phone}-${s.id || idx}`} 
                onClick={() => {
                  setSelectedSupplier(s);
                  setIsMobileSupplierSearchOpen(false);
                }}
                className="p-4 border-b border-slate-50 flex flex-col gap-1 cursor-pointer"
              >
                <span className="text-sm font-bold text-slate-800">{s.name}</span>
                <span className="text-xs text-slate-500">{s.phone}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mobile Checkout Modal */}
      {isMobileCheckoutOpen && (
        <div className="fixed inset-0 z-[500] bg-slate-50 flex flex-col md:hidden">
          <div className="flex items-center p-4 border-b border-slate-200 bg-white shadow-sm gap-3">
            <button onClick={() => setIsMobileCheckoutOpen(false)} className="text-slate-500">
              <ChevronDown size={24} className="rotate-90" />
            </button>
            <h2 className="text-lg font-bold text-slate-800 flex-1">Thanh toán nhập hàng</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            <div className="bg-white p-4 mb-2 flex items-center gap-3 shadow-sm" onClick={() => {
              setIsMobileCheckoutOpen(false);
              setIsMobileSupplierSearchOpen(true);
            }}>
              <Truck size={24} className="text-slate-400" />
              <div className="flex-1">
                {selectedSupplier ? (
                  <span className="text-sm font-bold text-slate-800">{selectedSupplier.name} - {selectedSupplier.phone}</span>
                ) : (
                  <span className="text-sm font-bold text-red-500">Chọn nhà cung cấp</span>
                )}
              </div>
            </div>

            <div className="bg-white p-4 space-y-4 shadow-sm">
              <div className="flex justify-between items-center sm:hidden">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Thời gian</span>
                <DateTimePicker value={transactionDate} onChange={setTransactionDate} />
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-800">Tổng tiền hàng</span>
                  <span className="w-5 h-5 rounded-full border border-blue-500 text-blue-600 flex items-center justify-center text-[10px] font-bold">{cart.length}</span>
                </div>
                <span className="text-sm font-bold text-slate-800">{formatNumber(totalGoods)}</span>
              </div>
              
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <span className="text-sm font-bold text-slate-800">Giảm giá</span>
                <NumericFormat 
                  value={overallDiscount}
                  onValueChange={(values) => setOverallDiscount(values.floatValue || 0)}
                  thousandSeparator="."
                  decimalSeparator=","
                  className="w-24 text-right bg-transparent text-sm font-bold outline-none text-slate-800" 
                  placeholder="0"
                />
              </div>

              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <span className="text-sm font-bold text-slate-800">Cần trả NCC</span>
                <span className="text-lg font-bold text-blue-600">{formatNumber(finalTotal)}</span>
              </div>

              {/* Wallets */}
              <div>
                <span className="text-xs font-bold text-slate-500 mb-2 block">Ví thanh toán:</span>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                   {wallets.length === 0 && (
                     <span className="text-xs text-rose-500 italic px-2">Vui lòng thiết lập ví trong Cài đặt</span>
                   )}
                   {wallets.map((w, idx) => {
                     const isSelected = walletId === w.id;
                     return (
                       <button 
                         key={`${w.id}-${idx}`}
                         onClick={() => setWalletId(w.id)}
                         className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors border ${isSelected ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-slate-100 text-slate-600 border-transparent'}`}
                       >
                         {w.name}
                       </button>
                     );
                   })}
                </div>
              </div>

              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <span className="text-sm font-bold text-slate-800">Tiền trả NCC</span>
                {walletId ? (
                  <NumericFormat 
                    value={paidAmount}
                    onValueChange={(values) => setPaidAmount(values.floatValue || 0)}
                    thousandSeparator="."
                    decimalSeparator=","
                    className="w-32 text-right bg-transparent text-lg font-bold text-slate-800 outline-none" 
                    placeholder="0"
                  />
                ) : (
                  <span className="text-xs font-medium text-rose-500 italic">Chọn ví</span>
                )}
              </div>
            </div>
          </div>

          <div className="p-4 bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
            <button 
              onClick={() => {
                setIsMobileCheckoutOpen(false);
                handleImportClick();
              }}
              className="w-full py-3.5 bg-blue-600 text-white font-bold rounded-xl shadow-md active:scale-95 transition-all"
            >
              Hoàn thành
            </button>
          </div>
        </div>
      )}

      {/* Product Detail Modal */}
      {viewingProduct && (
        <ProductDetailModal 
          product={viewingProduct} 
          onClose={() => setViewingProduct(null)} 
          onRefClick={(refId) => {
            setViewingProduct(null);
            if (refId.startsWith('NH')) {
              navigate('/import-history');
            } else if (refId.startsWith('HD')) {
              navigate('/invoices');
            }
          }}
        />
      )}

      {/* New Product Modal */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in duration-200 relative">
            <div className="p-6 border-b border-slate-100 bg-slate-50">
              <h3 className="md:text-2xl text-xl font-bold text-slate-800 leading-tight">Thêm sản phẩm mới</h3>
              <p className="md:text-sm text-xs text-slate-500 font-medium mt-1">Tạo nhanh sản phẩm khi nhập hàng</p>
              <button 
                onClick={handleCloseProductModal}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-white rounded-full text-slate-400 hover:text-slate-600 border border-slate-100 shadow-sm transition-all"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              <div>
                <label className="md:text-xs text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Tên sản phẩm *</label>
                <input 
                  type="text" 
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Nhập tên sản phẩm..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl md:text-base text-sm font-bold outline-none focus:border-blue-500 focus:bg-white transition-all mt-1 shadow-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="md:text-xs text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Giá nhập (vốn)</label>
                  <NumericFormat 
                    value={newCost}
                    onValueChange={(v) => setNewCost(v.value)}
                    thousandSeparator="."
                    decimalSeparator=","
                    placeholder="0"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl md:text-base text-sm font-bold outline-none focus:border-blue-500 focus:bg-white transition-all mt-1 shadow-sm"
                  />
                </div>
                <div>
                  <label className="md:text-xs text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Giá bán ra *</label>
                  <NumericFormat 
                    value={newPrice}
                    onValueChange={(v) => setNewPrice(v.value)}
                    thousandSeparator="."
                    decimalSeparator=","
                    placeholder="0"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl md:text-base text-sm font-bold outline-none focus:border-blue-500 focus:bg-white transition-all mt-1 shadow-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="md:text-xs text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Đơn vị tính</label>
                  <input 
                    type="text" 
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    placeholder="Cái, Bộ, Mét..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl md:text-base text-sm font-bold outline-none focus:border-blue-500 focus:bg-white transition-all mt-1 shadow-sm"
                  />
                </div>
                <div>
                  <label className="md:text-xs text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Danh mục</label>
                  <input 
                    type="text" 
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="Nhóm sản phẩm..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl md:text-base text-sm font-bold outline-none focus:border-blue-500 focus:bg-white transition-all mt-1 shadow-sm"
                  />
                </div>
              </div>
              <div className="pt-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={newHasSerial}
                      onChange={(e) => setNewHasSerial(e.target.checked)}
                    />
                    <div className="w-12 h-6 bg-slate-200 rounded-full peer peer-checked:bg-blue-600 transition-all"></div>
                    <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-all peer-checked:translate-x-6 shadow-sm"></div>
                  </div>
                  <span className="md:text-base text-sm font-bold text-slate-700 group-hover:text-blue-600 transition-colors">Quản lý theo mã Serial / Imei</span>
                </label>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3">
              <button 
                onClick={handleCloseProductModal}
                className="flex-1 py-3 bg-white text-slate-600 border border-slate-200 rounded-xl md:text-base text-sm font-bold hover:bg-slate-50 transition-all shadow-sm"
              >
                Hủy
              </button>
              <button 
                onClick={() => {
                  if (!newName || !newPrice) return alert('Vui lòng nhập đủ tên và giá bán!');
                  
                  const colors = ['bg-blue-600', 'bg-indigo-600', 'bg-purple-600', 'bg-emerald-500', 'bg-rose-500'];
                  const id = generateId('SP', products);
                  const newProd: Product = {
                    id,
                    name: newName,
                    price: parseFormattedNumber(newPrice),
                    importPrice: parseFormattedNumber(newCost) || 0,
                    stock: 0,
                    hasSerial: newHasSerial,
                    color: colors[products.length % colors.length],
                    unit: newUnit,
                    category: newCategory,
                    isService: false,
                    status: 'Đang kinh doanh'
                  };
                  
                  addProduct(newProd);
                  addToCart(newProd);
                  setIsProductModalOpen(false);
                  resetProductForm();
                  setSearchTerm('');
                }}
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl md:text-base text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
              >
                Lưu & Thêm vào phiếu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Supplier Modal */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm print:hidden">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden p-8 animate-in zoom-in duration-200 relative">
            <button 
              onClick={() => setIsSupplierModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={24} />
            </button>
            <h3 className="md:text-2xl text-lg font-bold text-slate-800 mb-6 tracking-tight">Thêm nhà cung cấp</h3>
            <div className="space-y-4">
              <div>
                <label className="md:text-xs text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Tên nhà cung cấp</label>
                <input 
                  id="new-sup-name"
                  type="text" 
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl md:text-base text-sm font-semibold outline-none focus:border-blue-400 focus:bg-white transition-all mt-1" 
                  placeholder="Nhập tên..." 
                />
              </div>
              <div>
                <label className="md:text-xs text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Số điện thoại</label>
                <input 
                  id="new-sup-phone"
                  type="text" 
                  onChange={(e) => {
                    let val = e.target.value.replace(/[^0-9\s+]/g, '').trim();
                    if (val && !val.startsWith('0') && !val.startsWith('+')) val = '0' + val;
                    e.target.value = val;
                  }}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl md:text-base text-sm font-semibold outline-none focus:border-blue-400 focus:bg-white transition-all mt-1" 
                  placeholder="Nhập số điện thoại..." 
                />
              </div>
              <div>
                <label className="md:text-xs text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Địa chỉ</label>
                <input 
                  id="new-sup-address"
                  type="text" 
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl md:text-base text-sm font-semibold outline-none focus:border-blue-400 focus:bg-white transition-all mt-1" 
                  placeholder="Nhập địa chỉ..." 
                />
              </div>
              <div className="flex flex-col gap-2 pt-4">
                <button 
                  onClick={() => {
                    const name = (document.getElementById('new-sup-name') as HTMLInputElement).value;
                    let phone = (document.getElementById('new-sup-phone') as HTMLInputElement).value;
                    const address = (document.getElementById('new-sup-address') as HTMLInputElement)?.value || '';
                    if (name && phone) {
                      phone = phone.startsWith('0') ? phone : '0' + phone;
                      addSupplier({ name, phone, address });
                      setSelectedSupplier({ name, phone, address, id: 'temp', totalBuy: 0, totalDebt: 0 });
                      setIsSupplierModalOpen(false);
                    }
                  }}
                  className="w-full bg-emerald-600 text-white py-3.5 rounded-xl font-bold shadow-md shadow-emerald-200 md:text-base text-sm active:scale-95 transition-all hover:bg-emerald-700"
                >
                  Lưu
                </button>
                <button 
                  onClick={() => setIsSupplierModalOpen(false)}
                  className="w-full bg-[#991b1b] text-white py-3.5 rounded-xl font-bold md:text-base text-sm hover:bg-[#7f1d1d] transition-all shadow-md shadow-red-100 md:hidden"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Confirm Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Info size={32} />
              </div>
              <h3 className="md:text-2xl text-xl font-black text-slate-800 mb-2">Xác nhận nhập hàng</h3>
              <p className="md:text-base text-sm text-slate-500 mb-6">Bạn có chắc chắn muốn hoàn thành phiếu nhập hàng này không?</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl md:text-lg text-base hover:bg-slate-200 transition-colors"
                >
                  Hủy
                </button>
                <button 
                  onClick={handleImport}
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl md:text-lg text-base hover:bg-blue-700 transition-colors shadow-md shadow-blue-200"
                >
                  {isSubmitting ? 'Đang xử lý...' : 'Đồng ý'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Draft Prompt Modal */}
      {showDraftPrompt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText size={32} />
              </div>
              <h3 className="md:text-2xl text-xl font-black text-slate-800 mb-2">Đơn nhập chưa hoàn thành</h3>
              <p className="md:text-base text-sm text-slate-500 mb-6">Bạn có đơn nhập hàng đang tạo dở. Bạn có muốn tiếp tục hay tạo một đơn mới?</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    setCart([]);
                    setSelectedSupplier(null);
                    setPaidAmount(0);
                    setImportDraft(undefined);
                    setShowDraftPrompt(false);
                  }}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl md:text-lg text-base hover:bg-slate-200 transition-colors"
                >
                  Tạo mới
                </button>
                <button 
                  onClick={() => {
                    setShowDraftPrompt(false);
                  }}
                  className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl md:text-lg text-base hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-200"
                >
                  Tiếp tục
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

