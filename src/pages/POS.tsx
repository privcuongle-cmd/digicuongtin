import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Plus, UserPlus, UserCircle, CheckCircle, Check, X, Trash2, Printer, Barcode, ChevronDown, Edit3, PieChart, ShoppingCart, Tag, Image as ImageIcon, ArrowLeft, Info, FileText, Wallet } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Product, InvoiceItem, Customer, CashTransaction } from '../types';
import { formatNumber, parseFormattedNumber, formatDateTime, parseDateString } from '../lib/utils';
import { generateId } from '../lib/idUtils';
import { NumericFormat } from 'react-number-format';
import { PrintTemplate } from '../components/PrintTemplate';
import { ProductDetailModal } from '../components/ProductDetailModal';
import { AddCustomerModal } from '../components/AddCustomerModal';
import { useScrollLock } from '../hooks/useScrollLock';
import { useMobileBackModal } from '../hooks/useMobileBackModal';
import { useEscapeKey } from '../hooks/useEscapeKey';

export const POS: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { products, customers, invoices, cashTransactions, addInvoice, updateInvoice, deleteInvoice, addCustomer, updateProduct, serials, addStockCard, addCashTransaction, posDraft, setPOSDraft, returnSalesOrders, tasks, updateTask, wallets } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  
  useMobileBackModal(!!viewingProduct, () => setViewingProduct(null));
  
  // Initialize from draft or defaults
  const [tabs, setTabs] = useState(() => {
    // Check if we are editing an invoice passed via location state
    const editInvoice = location.state?.editInvoice;
    const now = new Date();
    const defaultDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    if (editInvoice) {
      // ... same mapping ...
      const cartItems = editInvoice.items.map((item: any) => {
        const prod = products.find(p => p.id === item.id);
        return {
          ...prod,
          id: item.id,
          name: item.name,
          price: item.price,
          qty: item.qty,
          sn: item.sn || '',
          serials: item.sn ? (typeof item.sn === 'string' ? item.sn.split(',').map((s: string) => s.trim()) : item.sn) : []
        };
      });

      const customer = customers.find(c => c.name === editInvoice.customer);

      // Parse invoice date to datetime-local format if possible
      let invoiceDate = defaultDate;
      try {
        // format is "12:32:02 22/4/2026" or similar
        const [time, datePart] = editInvoice.date.split(' ');
        const [d, m, y] = datePart.split('/');
        invoiceDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T${time.substring(0, 5)}`;
      } catch (e) {}

      return [{
        id: Date.now(),
        name: `Sửa ${editInvoice.id}`,
        cart: cartItems,
        discount: editInvoice.discount || 0,
        paid: editInvoice.paid.toString(),
        selectedCustomer: customer || { id: 'temp', name: editInvoice.customer, phone: editInvoice.phone || '' },
        note: editInvoice.note || '',
        paymentMethod: 'CASH',
        date: invoiceDate,
        editingInvoiceId: editInvoice.id // Track that we are editing this invoice
      }];
    }

    if (posDraft?.tabs && posDraft.tabs.length > 0) {
      // Refresh date for empty new tabs from draft to keep them current
      const nowAtMount = new Date();
      const freshDateAtMount = `${nowAtMount.getFullYear()}-${String(nowAtMount.getMonth() + 1).padStart(2, '0')}-${String(nowAtMount.getDate()).padStart(2, '0')}T${String(nowAtMount.getHours()).padStart(2, '0')}:${String(nowAtMount.getMinutes()).padStart(2, '0')}`;
      
      return posDraft.tabs.map(t => {
        if (!t.editingInvoiceId && t.cart.length === 0) {
          return { ...t, date: freshDateAtMount };
        }
        return t;
      });
    }
    const nextInvoiceId = generateId('HDN', invoices);
    return [{ 
      id: 1, 
      name: nextInvoiceId,
      cart: [],
      discount: 0,
      paid: '' as string,
      selectedCustomer: null as Customer | null,
      note: '',
      paymentMethod: 'CASH' as 'CASH' | 'TRANSFER' | 'CARD' | 'WALLET',
      date: defaultDate,
      taskId: undefined as string | undefined
    }];
  });
  const [activeTab, setActiveTab] = useState(posDraft?.activeTab || 0);

  // Sync to draft
  useEffect(() => {
    setPOSDraft({ activeTab, tabs });
  }, [activeTab, tabs]);

  // Current tab helper
  const currentTab = tabs[activeTab] || tabs[0];
  const { cart, discount, paid, selectedCustomer, note, paymentMethod, walletId, editingInvoiceId, date, taskId: tabTaskId } = currentTab;

  // Setters for current tab
  const updateCurrentTab = (updates: Partial<typeof currentTab>) => {
    setTabs(prev => prev.map((t, i) => i === activeTab ? { ...t, ...updates } : t));
  };

  // Handle URL params for pre-filling customer
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const customerId = params.get('customerId');
    const taskId = params.get('taskId');
    if (customerId && customers.length > 0) {
      const customer = customers.find(c => c.id === customerId);
      if (customer) {
        updateCurrentTab({ 
          selectedCustomer: customer, 
          note: taskId ? `Thực hiện cho CV #${taskId}` : note,
          taskId: taskId || undefined 
        });
        // Clear param from URL without reloading
        window.history.replaceState(null, '', '/pos');
      }
    }
  }, [location.search, customers, note]);

  // Refresh date for empty new tabs when switching to them or clearing cart
  useEffect(() => {
    if (!editingInvoiceId && cart.length === 0) {
      const now = new Date();
      const freshDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      if (date !== freshDate) {
        updateCurrentTab({ date: freshDate });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, editingInvoiceId, cart.length]); 

  const setCart = (newCart: any) => {
    const nextCart = typeof newCart === 'function' ? newCart(cart) : newCart;
    updateCurrentTab({ cart: nextCart });
  };

  const setDiscount = (val: number) => updateCurrentTab({ discount: val });
  const setPaid = (val: string) => updateCurrentTab({ paid: val });
  const setSelectedCustomer = (val: Customer | null) => updateCurrentTab({ selectedCustomer: val });
  const setNote = (val: string) => updateCurrentTab({ note: val });
  const setPaymentMethod = (val: 'CASH' | 'TRANSFER' | 'CARD' | 'WALLET') => updateCurrentTab({ paymentMethod: val });
  const setWalletId = (val: string) => updateCurrentTab({ walletId: val });
  const setTransactionDate = (val: string) => updateCurrentTab({ date: val });

  // Modals
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isSerialModalOpen, setIsSerialModalOpen] = useState(false);
  const [isQuickAddModalOpen, setIsQuickAddModalOpen] = useState(false);
  const [isMobileCustomerSearchOpen, setIsMobileCustomerSearchOpen] = useState(false);
  const [isMobileProductSearchOpen, setIsMobileProductSearchOpen] = useState(false);
  const [isMobileCheckoutOpen, setIsMobileCheckoutOpen] = useState(false);
  const [mobileCustomerSearchTerm, setMobileCustomerSearchTerm] = useState('');
  const [activeSerialProduct, setActiveSerialProduct] = useState<Product | null>(null);
  
  // Quick Add Form State
  const [quickAddName, setQuickAddName] = useState('');
  const [quickAddPrice, setQuickAddPrice] = useState('');
  const [quickAddId, setQuickAddId] = useState('');
  const [quickAddCost, setQuickAddCost] = useState('');
  const [quickAddStock, setQuickAddStock] = useState('');
  const [quickAddIsService, setQuickAddIsService] = useState(false);
  const [quickAddHasSerial, setQuickAddHasSerial] = useState(false);

  const { addProduct } = useAppContext();

  const hasQuickAddChanges = () => {

return (
      quickAddName !== '' ||
      quickAddPrice !== '' ||
      quickAddId !== '' ||
      quickAddCost !== '' ||
      quickAddStock !== '0' ||
      quickAddIsService !== false ||
      quickAddHasSerial !== false
    );
  };

  const handleCloseQuickAddModal = () => {
    if (hasQuickAddChanges()) {
      if (window.confirm('Bạn có thay đổi chưa lưu. Bạn có chắc chắn muốn đóng mà không lưu không?')) {
        setIsQuickAddModalOpen(false);
        resetQuickAddForm();
      }
    } else {
      setIsQuickAddModalOpen(false);
      resetQuickAddForm();
    }
  };

  const resetQuickAddForm = () => {
    setQuickAddName('');
    setQuickAddPrice('');
    setQuickAddId('');
    setQuickAddCost('');
    setQuickAddStock('');
    setQuickAddIsService(false);
    setQuickAddHasSerial(false);
  };

  const handleQuickAdd = () => {
    if (!quickAddName || !quickAddPrice) return alert('Vui lòng nhập tên và giá bán!');
    if (!quickAddIsService && !quickAddHasSerial && !quickAddStock) return alert('Vui lòng nhập số lượng tồn kho!');
    
    const id = quickAddId.trim() || ('P' + Date.now().toString().slice(-4));
    const newProduct: Product = {
      id,
      name: quickAddName,
      price: parseFormattedNumber(quickAddPrice),
      importPrice: parseFormattedNumber(quickAddCost) || 0,
      stock: quickAddIsService ? null : (Number(quickAddStock) || 0),
      hasSerial: quickAddIsService ? false : quickAddHasSerial,
      isService: quickAddIsService,
      color: 'bg-blue-600',
      status: 'Đang kinh doanh'
    };
    
    addProduct(newProduct);
    addToCart(newProduct);
    setIsQuickAddModalOpen(false);
    resetQuickAddForm();
  };
  
  // Print State
  const [printData, setPrintData] = useState<any>(null);
  const [showSuccessModal, setShowSuccessModal] = useState<{id: string, total: number} | null>(null);
  const [showDraftPrompt, setShowDraftPrompt] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutConfirmModal, setCheckoutConfirmModal] = useState<{isOpen: boolean, type: 'EDIT' | 'NORMAL'} | null>(null);

  // Lock scroll for modals
  useScrollLock(!!viewingProduct || isCustomerModalOpen || isSerialModalOpen || isQuickAddModalOpen || !!showSuccessModal || !!checkoutConfirmModal || isMobileCheckoutOpen);

  // Handle Escape key to close modals in layers
  useEscapeKey(() => setShowSuccessModal(null), !!showSuccessModal);
  useEscapeKey(() => setCheckoutConfirmModal(null), !!checkoutConfirmModal);
  useEscapeKey(() => setIsMobileCheckoutOpen(false), isMobileCheckoutOpen);
  useEscapeKey(handleCloseQuickAddModal, isQuickAddModalOpen);
  useEscapeKey(() => setIsSerialModalOpen(false), isSerialModalOpen);
  useEscapeKey(() => setIsCustomerModalOpen(false), isCustomerModalOpen);
  useEscapeKey(() => setViewingProduct(null), !!viewingProduct);
  useEscapeKey(() => setIsMobileCustomerSearchOpen(false), isMobileCustomerSearchOpen);
  useEscapeKey(() => setIsMobileProductSearchOpen(false), isMobileProductSearchOpen);

  useEffect(() => {
    if (posDraft?.tabs && posDraft.tabs.some(t => t.cart.length > 0)) {
      setShowDraftPrompt(true);
    }
  }, []);

  const addTab = () => {
    const newId = tabs.length > 0 ? Math.max(...tabs.map(t => t.id)) + 1 : 1;
    const now = new Date();
    const defaultDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    // Combine invoices and current tabs to find the next unique ID
    const allExistingItems = [
      ...invoices.map(inv => ({ id: inv.id })),
      ...tabs.map(tab => ({ id: tab.editingInvoiceId || tab.name }))
    ];
    const nextInvoiceId = generateId('HDN', allExistingItems);

    const newTab = { 
      id: newId, 
      name: nextInvoiceId,
      cart: [],
      discount: 0,
      paid: '' as string,
      selectedCustomer: null,
      note: '',
      paymentMethod: 'CASH' as 'CASH' | 'TRANSFER' | 'CARD' | 'WALLET',
      date: defaultDate
    };
    setTabs([...tabs, newTab]);
    setActiveTab(tabs.length);
  };

  const removeTab = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // If it's the last tab, reset it instead of removing
    if (tabs.length === 1) {
      const now = new Date();
      const defaultDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      
      // Even if resetting the last tab, we should generate based on current invoices
      const nextInvoiceId = generateId('HDN', invoices);
      
      const freshTab = { 
        id: Date.now(), 
        name: nextInvoiceId,
        cart: [],
        discount: 0,
        paid: '',
        selectedCustomer: null,
        note: '',
        paymentMethod: 'CASH' as any,
        date: defaultDate,
        editingInvoiceId: undefined
      };
      setTabs([freshTab]);
      setActiveTab(0);
      return;
    }

    const removedIdx = tabs.findIndex(t => t.id === id);
    const newTabs = tabs.filter(t => t.id !== id);
    setTabs(newTabs);
    
    if (activeTab === removedIdx) {
      setActiveTab(Math.max(0, removedIdx - 1));
    } else if (activeTab > removedIdx) {
      setActiveTab(activeTab - 1);
    }
  };

  const handlePrint = (data: any) => {
    setPrintData(data);
    setTimeout(() => {
      window.print();
      setTimeout(() => setPrintData(null), 2000);
    }, 50);
  };

  // Search results
  const [productSuggestions, setProductSuggestions] = useState<Product[]>([]);
  const [customerSuggestions, setCustomerSuggestions] = useState<Customer[]>([]);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchTerm.trim()) {
        const filtered = (products || [])
          .filter(p => 
            (p.status || 'Đang kinh doanh') === 'Đang kinh doanh' && (
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

  const handleCustomerSearch = (val: string) => {
    setCustomerSearchTerm(val);
    if (val.trim()) {
      const filtered = (customers || []).filter(c => 
        (c.name || '').toLowerCase().includes(val.toLowerCase()) || 
        (c.phone || '').includes(val)
      );
      setCustomerSuggestions(filtered);
    } else {
      setCustomerSuggestions([]);
    }
  };

  const addToCart = (product: Product, sn?: string) => {
    if (!product.isService && product.stock !== null && product.stock <= 0 && !sn) {
      alert("Sản phẩm tạm hết hàng trong kho!");
      return;
    }

    setCart(prev => {
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
          return prev.map(item => item.id === product.id ? { 
            ...item, 
            qty: item.qty + 1, 
            serials: [...(item.serials || []), sn] 
          } : item);
        }

        return [...prev, { 
          id: product.id, 
          name: product.name, 
          price: product.price, 
          qty: 1, 
          hasSerial: true,
          serials: [sn],
          importPriceTotal: product.importPrice 
        }];
      }

      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      }

      return [...prev, { 
        id: product.id, 
        name: product.name, 
        price: product.price, 
        qty: 1, 
        importPriceTotal: product.importPrice 
      }];
    });
    
    setSearchTerm('');
    setProductSuggestions([]);
  };

  const updateQty = (id: string, qty: number) => {
    const product = products.find(p => p.id === id);
    if (product?.hasSerial) return;
    if (qty < 1) return;
    setCart(prev => prev.map(item => item.id === id ? { ...item, qty } : item));
  };

  const updatePrice = (id: string, price: number) => {
    if (price < 0) return;
    setCart(prev => prev.map(item => item.id === id ? { ...item, price } : item));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const removeSerialFromItem = (prodId: string, sn: string) => {
    setCart(prev => prev.map(item => {
      if (item.id === prodId) {
        const newSerials = item.serials?.filter(s => s !== sn) || [];
        if (newSerials.length === 0) return null as any;
        return { ...item, qty: newSerials.length, serials: newSerials };
      }
      return item;
    }).filter(Boolean));
  };

  const totalGoods = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const finalTotal = Math.max(0, totalGoods - discount);
  const paidAmount = parseFormattedNumber(paid);
  const debt = paidAmount - finalTotal;

  const handleCheckout = async (autoPrint: boolean = false) => {
    if (cart.length === 0) return alert('Giỏ hàng trống!');
    if (isCheckingOut) return;

    const finalWalletId = currentTab.walletId;
    
    if (paidAmount > 0 && !finalWalletId && wallets.length > 0) {
      alert('Vui lòng chọn nguồn tiền nhận thanh toán!');
      return;
    }

    // Handle Edit Mode Confirmation
    if (currentTab.editingInvoiceId && !checkoutConfirmModal?.isOpen) {
      setCheckoutConfirmModal({ isOpen: true, type: 'EDIT' });
      return;
    }

    try {
      setIsCheckingOut(true);
      // Handle Edit Mode: We no longer need to delete the invoice first.
      // addInvoice now handles Upsert logic internally.
      
      const now = new Date();
      const invoiceId = currentTab.editingInvoiceId || currentTab.name;
      
      // Convert datetime-local value to visual format "dd/mm/yyyy HH:mm:ss"
      const [y, m, d, hh, min] = date.split(/[-T:]/);
      const dateStr = `${d}/${m}/${y} ${hh}:${min}:00`;
      
      const customerName = selectedCustomer ? selectedCustomer.name : 'Khách lẻ';

      const invoice = {
        id: invoiceId,
        date: dateStr,
        customerId: selectedCustomer?.id,
        customer: customerName,
        phone: selectedCustomer ? selectedCustomer.phone : '---',
        address: selectedCustomer?.address || '',
        total: finalTotal,
        paid: paidAmount,
        debt: debt < 0 ? Math.abs(debt) : 0,
        discount: discount,
        note: note,
        taskId: tabTaskId || undefined,
        paymentMethod: currentTab.paymentMethod,
        walletId: paidAmount > 0 ? finalWalletId : undefined,
        items: cart.map(item => {
          const p = products.find(prod => prod.id === item.id);
          let warrantyExpiry = undefined;
          if (p?.warrantyMonths) {
            const expiryDate = new Date();
            expiryDate.setMonth(expiryDate.getMonth() + p.warrantyMonths);
            warrantyExpiry = expiryDate.toLocaleDateString('vi-VN');
          }
          return {
            id: item.id,
            name: item.name,
            price: item.price,
            qty: item.qty,
            sn: item.serials?.join(', '),
            importPriceTotal: item.importPriceTotal ? item.importPriceTotal * item.qty : 0,
            warrantyExpiry
          };
        })
      };

      // Handle Cash Transaction Delta
      const isEdit = !!currentTab.editingInvoiceId;
      
      if (!isEdit && invoice.paid > 0) {
        // New invoice cash transaction
        const transactionId = generateId('PT', cashTransactions);
        const newTransaction: CashTransaction = {
          id: transactionId,
          date: dateStr,
          type: 'RECEIPT',
          amount: invoice.paid,
          category: 'SALES_REVENUE',
          partner: customerName,
          note: `Thu tiền hóa đơn ${invoiceId}`,
          refId: invoiceId,
          walletId: finalWalletId
        };
        addCashTransaction(newTransaction);
      }

      const savedInvoice = await addInvoice(invoice as any);
      
      if (autoPrint && savedInvoice) {
        handlePrint({
          title: 'HÓA ĐƠN BÁN HÀNG',
          id: savedInvoice.id,
          date: savedInvoice.date,
          partner: savedInvoice.customer,
          phone: savedInvoice.phone,
          address: savedInvoice.address || selectedCustomer?.address || '',
          items: savedInvoice.items.map(i => ({ ...i, total: i.qty * i.price })),
          total: savedInvoice.total,
          paid: savedInvoice.paid,
          debt: savedInvoice.debt || 0,
          oldDebt: savedInvoice.oldDebt || 0,
          discount: savedInvoice.discount || 0,
          type: 'HOA_DON'
        });
      }

      updateCurrentTab({
        cart: [],
        discount: 0,
        paid: '',
        selectedCustomer: null,
        note: '',
        paymentMethod: 'CASH',
        editingInvoiceId: undefined,
        taskId: undefined
      });
      setIsMobileCheckoutOpen(false);
      setCheckoutConfirmModal(null);
      
      setShowSuccessModal({ id: invoiceId, total: invoice.total });

      // Cập nhật trạng thái công việc nếu có
      const taskIdFromUrl = new URLSearchParams(window.location.search).get('taskId');
      const finalTaskId = taskIdFromUrl || (note.startsWith('Thực hiện cho CV #') ? note.replace('Thực hiện cho CV #', '').split(' ')[0] : null);

      if (finalTaskId) {
        const task = tasks.find(t => t.id === finalTaskId);
        if (task) {
          updateTask(finalTaskId, { 
            ...task, 
            status: 'COMPLETED', 
            completedAt: formatDateTime(new Date()),
            purchaseId: invoiceId
          });
        }
      }
    } catch (error) {
      console.error("Checkout failed:", error);
      alert("Thanh toán thất bại. Vui lòng thử lại.");
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleSaveDraft = () => {
    setPOSDraft({ activeTab, tabs });
    alert("Đã lưu tạm đơn hàng!");
  };

  useMobileBackModal(isCustomerModalOpen, () => setIsCustomerModalOpen(false)); // auto-injected
  useMobileBackModal(isSerialModalOpen, () => setIsSerialModalOpen(false)); // auto-injected
  useMobileBackModal(isQuickAddModalOpen, handleCloseQuickAddModal);
  useMobileBackModal(isMobileCustomerSearchOpen, () => setIsMobileCustomerSearchOpen(false)); // auto-injected
  useMobileBackModal(isMobileProductSearchOpen, () => setIsMobileProductSearchOpen(false)); // auto-injected
  useMobileBackModal(isMobileCheckoutOpen, () => setIsMobileCheckoutOpen(false)); // auto-injected
  useMobileBackModal(showDraftPrompt, () => setShowDraftPrompt(false)); // auto-injected
  useMobileBackModal(!!showSuccessModal, () => setShowSuccessModal(null));
  useMobileBackModal(!!checkoutConfirmModal, () => setCheckoutConfirmModal(null));

  return (
    <div className="flex flex-col bg-slate-100 font-sans">
      {/* Print Template Container */}
      {printData && <PrintTemplate {...printData} />}

      {/* Draft Prompt Modal */}
      {showDraftPrompt && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 text-center">
            <h3 className="md:text-xl text-lg font-bold text-slate-800 mb-2">Đơn hàng chưa hoàn thành</h3>
            <p className="text-slate-500 mb-6 md:text-base text-sm">Có một đơn hàng chưa hoàn thành, bạn có muốn tiếp tục không?</p>
            <div className="flex gap-3">
              <button 
                onClick={() => {
                  const now = new Date();
                  const defaultDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                  setTabs([{ 
                    id: 1, 
                    name: 'Hóa đơn 1',
                    cart: [],
                    discount: 0,
                    paid: '',
                    selectedCustomer: null,
                    note: '',
                    paymentMethod: 'CASH',
                    date: defaultDate
                  }]);
                  setActiveTab(0);
                  setPOSDraft(null);
                  setShowDraftPrompt(false);
                }}
                className="flex-1 py-2.5 border border-slate-200 rounded-lg text-slate-600 font-bold md:text-base text-sm hover:bg-slate-50 transition-colors"
              >
                Bỏ qua
              </button>
              <button 
                onClick={() => setShowDraftPrompt(false)}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-bold md:text-base text-sm hover:bg-blue-700 transition-colors"
              >
                Tiếp tục
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Header Bar */}
      <div className="hidden md:flex bg-blue-600 h-14 md:h-12 items-center px-4 gap-2 md:gap-4 shrink-0 shadow-md z-20">
        <div className="flex-1 md:w-[400px] md:flex-none relative">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded border border-blue-400 shadow-inner">
            <Search className="text-slate-400" size={16} />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm hàng (F3)" 
              className="flex-1 bg-transparent text-sm outline-none font-medium"
            />
            <Barcode className="text-blue-500 hidden sm:block" size={18} />
          </div>
          {productSuggestions.length > 0 ? (
            <div className="absolute top-full left-0 right-0 z-[100] bg-white border border-slate-200 rounded-lg shadow-2xl mt-1 max-h-[400px] overflow-y-auto">
              {productSuggestions.map((p, idx) => (
                <div 
                  key={`desktop-prod-sugg-${p.id}-${idx}`} 
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
                    <p className="text-xs font-bold text-slate-800">{p.name}</p>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">Mã: {p.id} | Tồn: {p.stock}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-blue-600">{formatNumber(p.price)}đ</p>
                  </div>
                </div>
              ))}
            </div>
          ) : searchTerm.trim() && (
            <div className="absolute top-full left-0 right-0 z-[100] bg-white border border-slate-200 rounded-lg shadow-2xl mt-1 p-4 text-center">
              <p className="text-xs text-slate-500 mb-3">Không tìm thấy sản phẩm "{searchTerm}"</p>
              <button 
                onClick={() => {
                  resetQuickAddForm();
                  setIsQuickAddModalOpen(true);
                  setSearchTerm('');
                }}
                className="w-full py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={14} /> Thêm nhanh sản phẩm này
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 flex items-center h-full overflow-x-auto no-scrollbar gap-0.5">
          <div className="flex items-center h-full gap-0.5">
            <div className="h-full flex items-center px-3 text-white/80 hover:bg-white/10 cursor-pointer">
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 flex flex-col gap-0.5">
                  <div className="h-0.5 bg-current w-full"></div>
                  <div className="h-0.5 bg-current w-full"></div>
                </div>
              </div>
            </div>
            {tabs.map((tab, idx) => (
              <div 
                key={`tab-${tab.id}-${idx}`}
                onClick={() => setActiveTab(idx)}
                className={`h-9 px-4 flex items-center gap-2 rounded-t-lg transition-all cursor-pointer text-xs font-bold relative group ${activeTab === idx ? 'bg-slate-100 text-blue-700' : 'text-white hover:bg-white/10'}`}
              >
                {tab.name}
                <X 
                  size={12} 
                  className={`opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity ${activeTab === idx ? 'opacity-100' : ''}`} 
                  onClick={(e) => removeTab(tab.id, e)}
                />
              </div>
            ))}
            <button onClick={addTab} className="w-8 h-8 flex items-center justify-center text-white hover:bg-white/10 rounded-full transition-colors">
              <Plus size={18} />
            </button>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-4 text-white">
          <div className="flex items-center gap-3">
            <div className="relative cursor-pointer hover:bg-white/10 p-1.5 rounded">
              <ShoppingCart size={20} />
              <span className="absolute -top-1 -right-1 bg-red-500 text-[9px] font-bold px-1 rounded-full">{cart.length}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="hidden md:flex flex-1 flex-col lg:flex-row overflow-hidden relative">
        {/* Main Cart Area */}
        <div className="flex-1 flex flex-col bg-slate-100 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-2 md:p-4">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full text-left border-collapse hidden md:table">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="px-4 py-3 w-10">#</th>
                    <th className="px-2 py-3 w-10"></th>
                    <th className="px-4 py-3">Mã hàng</th>
                    <th className="px-4 py-3">Tên hàng</th>
                    <th className="px-4 py-3 w-20 text-center">ĐVT</th>
                    <th className="px-4 py-3 w-32 text-center">Số lượng</th>
                    <th className="px-4 py-3 text-right">Đơn giá</th>
                    <th className="px-4 py-3 text-right">Thành tiền</th>
                    <th className="px-4 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {cart.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-20 text-center text-slate-400 italic text-sm">
                        Chưa có sản phẩm nào trong giỏ hàng
                      </td>
                    </tr>
                  ) : (
                    cart.map((item, idx) => (
                      <React.Fragment key={`desktop-cart-${item.id}-${idx}`}>
                        <tr className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors group">
                          <td className="px-4 py-4 text-xs font-bold text-slate-400">{idx + 1}</td>
                          <td className="px-2 py-4">
                            <button onClick={() => removeFromCart(item.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                              <Trash2 size={16} />
                            </button>
                          </td>
                          <td className="px-4 py-4 text-xs font-bold text-blue-600 cursor-pointer hover:underline" onClick={() => {
                            const p = products.find(x => x.id === item.id);
                            if (p) setViewingProduct(p);
                          }}>{item.id}</td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded border border-slate-100 bg-slate-50 flex-shrink-0 flex items-center justify-center overflow-hidden">
                                {products.find(p => p.id === item.id)?.image ? (
                                  <img src={products.find(p => p.id === item.id)?.image} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  <ImageIcon size={14} className="text-slate-300" />
                                )}
                              </div>
                              <p className="text-xs font-bold text-slate-800">{item.name}</p>
                            </div>
                            {item.hasSerial && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {item.serials?.map((sn, sIdx) => (
                                  <span key={`desktop-cart-sn-${sn}-${sIdx}`} className="bg-blue-600 text-white text-[9px] font-bold px-2 py-0.5 rounded flex items-center gap-1 shadow-sm">
                                    {sn} <X size={10} className="cursor-pointer hover:text-red-200" onClick={() => removeSerialFromItem(item.id, sn)} />
                                  </span>
                                ))}
                                <button 
                                  onClick={() => {
                                    const p = products.find(x => x.id === item.id);
                                    if (p) {
                                      setActiveSerialProduct(p);
                                      setIsSerialModalOpen(true);
                                    }
                                  }}
                                  className="text-[9px] font-bold text-blue-600 hover:underline"
                                >
                                  Chọn IMEI
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-4 text-center text-xs text-slate-500">Cái</td>
                          <td className="px-4 py-4">
                            <div className="flex items-center justify-center gap-2">
                              {!item.hasSerial ? (
                                <div className="flex items-center border border-slate-200 rounded overflow-hidden">
                                  <button onClick={() => updateQty(item.id, item.qty - 1)} className="w-7 h-7 bg-slate-50 flex items-center justify-center hover:bg-slate-100">-</button>
                                  <input 
                                    type="number" 
                                    value={item.qty} 
                                    onChange={(e) => updateQty(item.id, parseInt(e.target.value) || 1)}
                                    className="w-10 text-center text-xs font-bold outline-none"
                                  />
                                  <button onClick={() => updateQty(item.id, item.qty + 1)} className="w-7 h-7 bg-slate-50 flex items-center justify-center hover:bg-slate-100">+</button>
                                </div>
                              ) : (
                                <span className="font-bold text-xs">{item.qty}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-right text-xs font-bold text-slate-600">
                            <NumericFormat 
                              value={item.price}
                              onValueChange={(values) => updatePrice(item.id, values.floatValue || 0)}
                              thousandSeparator="."
                              decimalSeparator=","
                              className="w-24 text-right bg-transparent outline-none border-b border-dashed border-slate-300 focus:border-blue-500"
                            />
                          </td>
                          <td className="px-4 py-4 text-right text-sm font-bold text-slate-800">{formatNumber(item.price * item.qty)}</td>
                          <td className="px-4 py-4">
                            <button className="text-slate-300 hover:text-blue-500">
                              <Plus size={16} />
                            </button>
                          </td>
                        </tr>
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom Note Bar */}
          <div className="h-12 bg-white border-t border-slate-200 flex items-center px-4 gap-2 shrink-0">
            <div className="flex items-center gap-2 text-slate-400 w-full">
              <Edit3 size={16} />
              <input 
                type="text" 
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ghi chú đơn hàng" 
                className="flex-1 bg-transparent text-xs outline-none italic"
              />
            </div>
          </div>
        </div>

        {/* Right Sidebar: Checkout Panel */}
        <div className="w-full lg:w-[380px] bg-white border-l border-slate-200 flex flex-col shrink-0 shadow-xl z-10 lg:static fixed inset-y-0 right-0 transform lg:translate-x-0 translate-x-full transition-transform duration-300 ease-in-out" id="checkout-panel">
          <div className="lg:hidden flex items-center p-4 border-b border-slate-100 bg-blue-600 text-white gap-3">
            <button onClick={() => document.getElementById('checkout-panel')?.classList.add('translate-x-full')}>
              <ArrowLeft size={24} />
            </button>
            <h3 className="font-bold flex-1">Thanh toán</h3>
          </div>
          <div className="p-4 flex flex-col gap-4 overflow-y-auto flex-1">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
               <h3 className="text-sm font-bold text-slate-800">Mã Chứng Từ</h3>
               <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
                 {currentTab.editingInvoiceId || currentTab.name}
               </span>
            </div>

            {/* Customer Selection */}
            <div className="flex flex-col gap-2">
              {!selectedCustomer ? (
                <div className="relative">
                  <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded border border-slate-200 focus-within:border-blue-400 transition-all">
                    <Search className="text-slate-400" size={16} />
                    <input 
                      type="text" 
                      placeholder="Tìm khách hàng (F4)" 
                      className="flex-1 bg-transparent text-xs outline-none font-medium" 
                      onChange={(e) => handleCustomerSearch(e.target.value)}
                    />
                    <Plus className="text-blue-500 cursor-pointer" size={18} onClick={() => setIsCustomerModalOpen(true)} />
                  </div>
                  {customerSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-[110] bg-white border border-slate-200 rounded-lg shadow-2xl mt-1 max-h-[200px] overflow-y-auto">
                      {customerSuggestions.map((c, idx) => (
                        <div 
                          key={`${c.id || c.phone}-${idx}`} 
                          onClick={() => {
                            setSelectedCustomer(c);
                            setCustomerSuggestions([]);
                            setCustomerSearchTerm('');
                          }}
                          className="p-3 border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors flex justify-between items-center"
                        >
                          <span className="text-xs font-bold text-slate-800">{c.name}</span>
                          <span className="text-[10px] text-slate-500 font-bold">{c.phone}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {customerSuggestions.length === 0 && customerSearchTerm.trim() !== '' && (
                    <div className="absolute top-full left-0 right-0 z-[110] bg-white border border-slate-200 rounded-lg shadow-2xl mt-1 p-2">
                       <button 
                         className="w-full py-2 px-3 flex items-center justify-center gap-2 text-blue-600 bg-blue-50 border border-blue-100 rounded-lg hover:bg-blue-100 transition-colors text-xs font-bold"
                         onClick={() => {
                           setIsCustomerModalOpen(true);
                           setTimeout(() => {
                             const nameInput = document.getElementById('new-cust-name') as HTMLInputElement;
                             const phoneInput = document.getElementById('new-cust-phone') as HTMLInputElement;
                             if (nameInput && !/[\d]/.test(customerSearchTerm)) nameInput.value = customerSearchTerm;
                             if (phoneInput && /[\d]/.test(customerSearchTerm)) phoneInput.value = customerSearchTerm;
                           }, 50);
                         }}
                       >
                         <Plus size={16} />
                         Thêm mới "{customerSearchTerm}"
                       </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-blue-50 rounded-xl flex justify-between items-center border border-blue-100 animate-in fade-in slide-in-from-top-1">
                  <div>
                    <p className="text-sm font-bold text-blue-800">{selectedCustomer.name}</p>
                    <p className="text-xs text-blue-500 font-medium mt-0.5">{selectedCustomer.phone}</p>
                  </div>
                  <button onClick={() => setSelectedCustomer(null)} className="text-red-400 hover:text-red-600 p-1 bg-white rounded-full shadow-sm">
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>

            {/* Pricing Details */}
            <div className="space-y-4 py-4 border-t border-slate-100">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600 font-medium">Thời gian</span>
                <input 
                  type="datetime-local"
                  value={date}
                  onChange={(e) => setTransactionDate(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-bold outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600 font-medium">Tổng tiền hàng</span>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-slate-400">{cart.length}</span>
                  <span className="text-sm font-bold text-slate-800">{formatNumber(totalGoods)}</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600 font-medium">Giảm giá</span>
                <NumericFormat 
                  value={discount} 
                  onValueChange={(values) => setDiscount(values.floatValue || 0)}
                  thousandSeparator="."
                  decimalSeparator=","
                  className="w-24 text-right border-b border-slate-200 bg-transparent px-1 py-0.5 text-sm font-semibold outline-none focus:border-blue-500" 
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600 font-medium">Mã coupon</span>
                <input 
                  type="text" 
                  placeholder="Nhập mã"
                  className="w-24 text-right border-b border-slate-200 bg-transparent px-1 py-0.5 text-sm font-semibold outline-none focus:border-blue-500 placeholder:font-normal placeholder:text-slate-300" 
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600 font-medium">Thu khác</span>
                <span className="text-sm font-semibold text-slate-800">0</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                <span className="text-sm font-bold text-slate-800">Khách cần trả</span>
                <span className="text-lg font-bold text-blue-600">{formatNumber(finalTotal)}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-800">Khách thanh toán</span>
                  <div className="w-5 h-5 bg-slate-100 rounded flex items-center justify-center text-slate-400 cursor-pointer hover:bg-slate-200">
                    <PieChart size={12} />
                  </div>
                </div>
                <NumericFormat 
                  value={paid}
                  onValueChange={(values) => setPaid(values.value)}
                  thousandSeparator="."
                  decimalSeparator=","
                  className="w-32 text-right border-b border-blue-500 bg-transparent px-1 py-0.5 text-lg font-bold text-blue-600 outline-none" 
                />
              </div>
            </div>

            {/* Wallets */}
            {paidAmount > 0 && (
              <div className="flex flex-wrap gap-2 py-2">
                <span className="text-xs font-bold text-slate-500 block w-full">Ví / Ngân hàng nhận tiền:</span>
                {wallets.length === 0 && (
                  <span className="text-xs text-rose-500 italic">Vui lòng thiết lập ví trong Cài đặt</span>
                )}
                {wallets.map((w, idx) => (
                  <label key={`${w.id}-${idx}`} className="flex items-center gap-2 cursor-pointer group px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50">
                    <input 
                      type="radio" 
                      name="walletId" 
                      checked={walletId === w.id} 
                      onChange={() => {
                        setWalletId(w.id);
                        setPaymentMethod(w.type === 'CASH' ? 'CASH' : 'TRANSFER');
                      }}
                      className="w-3.5 h-3.5 text-blue-600 accent-blue-600"
                    />
                    <span className={`text-xs font-bold ${walletId === w.id ? 'text-blue-700' : 'text-slate-600'}`}>
                      {w.name}
                    </span>
                  </label>
                ))}
              </div>
            )}

            {/* Quick Payment Buttons */}
            <div className="grid grid-cols-3 gap-2">
              {[500000, 1000000, 2000000, 5000000].map(val => (
                <button 
                  key={val}
                  onClick={() => setPaid(formatNumber(val))}
                  className="py-1.5 border border-slate-200 rounded text-[11px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  {formatNumber(val)}
                </button>
              ))}
              <button onClick={() => setPaid(formatNumber(finalTotal))} className="py-1.5 border border-blue-200 bg-blue-50 rounded text-[11px] font-semibold text-blue-600 hover:bg-blue-100 transition-colors">
                Đúng số tiền
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-auto p-4 flex gap-2 bg-slate-50 border-t border-slate-200">
            <button 
              onClick={() => handleCheckout(true)}
              disabled={isCheckingOut}
              className={`flex-1 h-12 text-white font-semibold rounded shadow-md transition-all flex items-center justify-center gap-2 ${isCheckingOut ? 'bg-slate-400 cursor-not-allowed' : 'bg-slate-500 hover:bg-slate-600'}`}
            >
              <Printer size={18} /> <span className="hidden sm:inline">{isCheckingOut ? '...' : 'In'}</span>
            </button>
            <button 
              onClick={() => handleCheckout(false)} 
              disabled={isCheckingOut}
              className={`flex-[3] h-12 text-white font-semibold rounded shadow-md transition-all flex items-center justify-center gap-2 text-lg ${isCheckingOut ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {isCheckingOut ? 'Đang lưu...' : 'Thanh toán'}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden flex flex-col h-full bg-slate-50 relative">
        {/* Mobile Header */}
        <div className="flex items-center p-4 bg-white border-b border-slate-100 gap-3">
          <button onClick={() => navigate(-1)} className="text-slate-500">
            <X size={24} />
          </button>
          <h1 className="flex-1 text-lg font-bold text-slate-800">Bán hàng</h1>
          <button className="text-slate-500">
            <Info size={24} />
          </button>
        </div>

        {/* Header: Search, Add, Barcode */}
        <div className="p-3 bg-white flex items-center gap-2 shadow-sm z-10">
          <div 
            className="flex-1 flex items-center bg-slate-100 rounded-lg px-3 py-2"
            onClick={() => setIsMobileProductSearchOpen(true)}
          >
            <Search size={18} className="text-slate-400" />
            <span className="text-slate-400 ml-2 text-sm font-medium">Tên, mã hàng, mã vạch...</span>
          </div>
          <button onClick={() => setIsQuickAddModalOpen(true)} className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600 shrink-0">
            <Plus size={20} />
          </button>
          <button className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600 shrink-0">
            <Barcode size={20} />
          </button>
        </div>

        {/* Customer List */}
        <div className="bg-white px-4 py-1 shadow-sm z-10">
          <div className="flex items-center justify-between py-3" onClick={() => setIsMobileCustomerSearchOpen(true)}>
            <div className="flex items-center gap-3">
              <UserCircle size={20} className="text-slate-400" />
              {selectedCustomer ? (
                <span className="text-sm font-medium text-slate-800">{selectedCustomer.name} - {selectedCustomer.phone}</span>
              ) : (
                <span className="text-sm font-medium text-red-500">Khách lẻ</span>
              )}
            </div>
            <ChevronDown size={18} className="text-slate-400" />
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 pb-64">
          {cart.length === 0 ? (
            <div className="py-20 text-center text-slate-400 italic text-sm">
              Chưa có sản phẩm nào trong giỏ hàng
            </div>
          ) : (
            cart.map((item, idx) => (
              <div key={`${item.id}-${idx}`} className="bg-white p-3 rounded-xl shadow-sm flex gap-3 relative">
                <button onClick={() => removeFromCart(item.id)} className="absolute top-2 right-2 text-slate-300 hover:text-red-500 p-1">
                  <X size={16} />
                </button>
                <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center text-blue-200 shrink-0 overflow-hidden">
                  {products.find(x => x.id === item.id)?.image ? (
                    <img src={products.find(x => x.id === item.id)?.image} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <ImageIcon size={24} className="text-slate-300" />
                  )}
                </div>
                <div className="flex-1 flex flex-col justify-between pr-6">
                  <div className="text-sm font-medium text-slate-800 leading-tight">{item.name}</div>
                  
                  {item.hasSerial && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {item.serials?.map((sn, sIdx) => (
                        <span key={`${sn}-${sIdx}`} className="bg-slate-100 text-slate-600 text-[10px] font-medium px-1.5 py-0.5 rounded flex items-center gap-1">
                          IMEI {sn} <X size={10} onClick={() => removeSerialFromItem(item.id, sn)} className="cursor-pointer" />
                        </span>
                      ))}
                      <button 
                        onClick={() => {
                          const p = products.find(x => x.id === item.id);
                          if (p) {
                            setActiveSerialProduct(p);
                            setIsSerialModalOpen(true);
                          }
                        }}
                        className="text-[10px] font-bold text-blue-600 hover:underline"
                      >
                        + Chọn IMEI
                      </button>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-2">
                    <div className="text-sm font-bold text-blue-600">
                      <NumericFormat 
                        value={item.price}
                        onValueChange={(values) => updatePrice(item.id, values.floatValue || 0)}
                        thousandSeparator="."
                        decimalSeparator=","
                        className="w-24 bg-transparent outline-none border-b border-dashed border-blue-300 focus:border-blue-600 text-blue-600"
                      />
                    </div>
                    <div className="flex items-center border border-slate-200 rounded-lg">
                      <button className="w-8 h-8 flex items-center justify-center text-slate-500" onClick={() => updateQty(item.id, item.qty - 1)}>-</button>
                      <span className="w-8 text-center text-sm font-medium">{item.qty}</span>
                      <button className="w-8 h-8 flex items-center justify-center text-slate-500" onClick={() => updateQty(item.id, item.qty + 1)}>+</button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bottom Bar */}
        <div className="absolute bottom-0 left-0 right-0 bg-slate-50/95 backdrop-blur-md p-4 flex flex-col gap-3 z-40 border-t border-slate-200">
          {cart.length > 0 && (
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-800">Tổng tiền hàng</span>
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-black">{cart.length}</span>
                </div>
                <span className="text-xl font-black text-slate-800">{formatNumber(totalGoods)}</span>
              </div>
              <div className="flex gap-3">
                <button className="flex-1 py-3 px-2 rounded-xl border-2 border-blue-600 text-blue-600 font-bold text-sm bg-white active:scale-95 transition-all" onClick={handleSaveDraft}>Lưu tạm</button>
                <button className="flex-1 py-3 px-2 rounded-xl bg-blue-600 text-white font-bold text-sm shadow-lg shadow-blue-200 active:scale-95 transition-all" onClick={() => setIsMobileCheckoutOpen(true)}>Thanh toán</button>
              </div>
            </div>
          )}
          <button 
            onClick={() => navigate(-1)} 
            className="w-full py-3 bg-[#991b1b] text-white font-black rounded-lg uppercase text-[10px] tracking-widest hover:bg-[#7f1d1d] transition-colors active:scale-95 shadow-lg shadow-red-100 shrink-0 md:hidden"
          >
            Đóng
          </button>
        </div>
      </div>

      {showSuccessModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-8 text-center animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <CheckCircle size={48} />
            </div>
            <h3 className="md:text-3xl text-2xl font-bold text-slate-800 mb-2">Thành công!</h3>
            <p className="text-slate-500 mb-8 md:text-lg font-medium">Hóa đơn <span className="font-bold text-blue-600">{showSuccessModal.id}</span> đã được lưu vào hệ thống.</p>
            
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => {
                  const inv = invoices.find(i => i.id === showSuccessModal.id);
                  if (inv) {
                    const customer = customers.find(c => (c.name === inv.customer && c.phone === inv.phone) || c.phone === inv.phone);
                    
                    // Old debt calculation
                    const customerInvoices = invoices.filter(i => 
                      i.customer === inv.customer && 
                      (parseDateString(i.date) < parseDateString(inv.date) || (i.date === inv.date && i.id < inv.id))
                    );
                    const customerReturns = (returnSalesOrders || []).filter(r => 
                      r.customer === inv.customer && 
                      parseDateString(r.date) < parseDateString(inv.date)
                    );
                    const calculatedOldDebt = customerInvoices.reduce((sum, i) => sum + i.debt, 0) - 
                                    customerReturns.reduce((sum, r) => sum + (r.total - r.paid), 0);
                    const oldDebt = inv.oldDebt !== undefined ? inv.oldDebt : calculatedOldDebt;

                    handlePrint({
                      title: 'HÓA ĐƠN BÁN HÀNG',
                      id: inv.id,
                      date: inv.date,
                      partner: inv.customer,
                      phone: inv.phone,
                      address: inv.address || customer?.address || '',
                      items: inv.items.map(i => ({ ...i, total: i.qty * i.price })),
                      total: inv.total,
                      paid: inv.paid,
                      debt: inv.debt || 0,
                      oldDebt: oldDebt,
                      discount: inv.discount || 0,
                      type: 'HOA_DON'
                    });
                  }
                  setShowSuccessModal(null);
                }}
                className="w-full py-4 bg-blue-600 text-white font-bold md:text-lg rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
              >
                <Printer size={20} /> In hóa đơn
              </button>
              <button 
                onClick={() => setShowSuccessModal(null)}
                className="w-full py-4 bg-slate-100 text-slate-600 font-bold md:text-lg rounded-xl hover:bg-slate-200 transition-all"
              >
                Tiếp tục bán hàng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {checkoutConfirmModal?.isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText size={32} />
              </div>
              <h3 className="md:text-2xl text-xl font-bold text-slate-800 mb-2">Xác nhận cập nhật</h3>
              <p className="md:text-base text-sm text-slate-500 mb-6 font-medium">
                Bạn đang sửa hóa đơn <span className="font-bold text-blue-600">{currentTab.editingInvoiceId}</span>. 
                Hệ thống sẽ cập nhật lại tồn kho, số serial và công nợ khách hàng. Tiếp tục?
              </p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setCheckoutConfirmModal(null)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold md:text-lg rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button 
                  onClick={() => handleCheckout(false)}
                  disabled={isCheckingOut}
                  className="flex-1 py-3 bg-blue-600 text-white font-bold md:text-lg rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  {isCheckingOut ? 'Đang lưu...' : 'Đồng ý'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Serial Selection Modal */}
      {isSerialModalOpen && activeSerialProduct && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm print:hidden">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50">
              <h3 className="md:text-xl text-lg font-bold text-slate-800 tracking-tighter">Chọn IMEI/Serial</h3>
              <button onClick={() => setIsSerialModalOpen(false)} className="w-8 h-8 bg-white shadow-sm border border-slate-100 text-slate-400 rounded-full hover:bg-slate-200 flex items-center justify-center transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-6">
              <p className="md:text-sm text-xs font-bold text-blue-600 mb-4 tracking-tighter">{activeSerialProduct.name}</p>
              <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-1">
                {serials
                  .filter(s => s.prodId === activeSerialProduct.id && s.status !== 'SOLD' && !cart.find(item => item.id === activeSerialProduct.id)?.serials?.includes(s.sn))
                  .map((s, sIdx) => (
                    <button 
                      key={`${s.sn}-${sIdx}`}
                      onClick={() => {
                        addToCart(activeSerialProduct, s.sn);
                        setIsSerialModalOpen(false);
                      }}
                      className="p-4 border border-slate-200 rounded-lg hover:border-blue-400 hover:bg-blue-50/30 text-left transition-all flex justify-between items-center group"
                    >
                      <span className="font-mono font-bold text-slate-800 md:text-base text-xs">{s.sn}</span>
                      <Plus size={16} className="text-blue-600 group-hover:scale-110 transition-transform" />
                    </button>
                  ))
                }
                {serials.filter(s => s.prodId === activeSerialProduct.id && s.status !== 'SOLD' && !cart.find(item => item.id === activeSerialProduct.id)?.serials?.includes(s.sn)).length === 0 && (
                  <p className="text-center text-slate-400 md:text-sm text-xs py-10 font-bold uppercase tracking-widest italic opacity-60">Hết IMEI khả dụng trong kho</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Customer Search Fullscreen */}
      {isMobileCustomerSearchOpen && (
        <div className="fixed inset-0 z-[400] bg-white flex flex-col md:hidden">
          <div className="flex items-center p-4 border-b border-slate-100 gap-3">
            <button onClick={() => setIsMobileCustomerSearchOpen(false)} className="text-slate-500">
              <X size={24} />
            </button>
            <div className="flex-1 flex items-center bg-slate-100 rounded-lg px-3 py-2">
              <Search size={18} className="text-slate-400" />
              <input 
                type="text" 
                autoFocus
                value={mobileCustomerSearchTerm}
                placeholder="Tìm khách hàng..." 
                className="bg-transparent border-none outline-none flex-1 ml-2 text-sm font-medium" 
                onChange={(e) => setMobileCustomerSearchTerm(e.target.value)}
              />
            </div>
            <button onClick={() => {
              setIsMobileCustomerSearchOpen(false);
              setIsCustomerModalOpen(true);
            }} className="text-blue-600">
              <Plus size={24} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div 
              onClick={() => {
                setSelectedCustomer(null);
                setIsMobileCustomerSearchOpen(false);
              }}
              className="p-4 border-b border-slate-50 flex items-center gap-3 cursor-pointer"
            >
              <UserCircle size={24} className="text-red-500" />
              <span className="text-sm font-bold text-red-500">Khách lẻ</span>
            </div>
            {(mobileCustomerSearchTerm.trim() 
              ? customers.filter(c => c.name.toLowerCase().includes(mobileCustomerSearchTerm.toLowerCase()) || c.phone.includes(mobileCustomerSearchTerm))
              : customers
            ).map((c, idx) => (
              <div 
                key={`${c.id || c.phone}-${idx}`} 
                onClick={() => {
                  setSelectedCustomer(c);
                  setIsMobileCustomerSearchOpen(false);
                  setMobileCustomerSearchTerm('');
                }}
                className="p-4 border-b border-slate-50 flex flex-col gap-1 cursor-pointer"
              >
                <span className="text-sm font-bold text-slate-800">{c.name}</span>
                <span className="text-xs text-slate-500">{c.phone}</span>
              </div>
            ))}
            
            {mobileCustomerSearchTerm.trim() && customers.filter(c => c.name.toLowerCase().includes(mobileCustomerSearchTerm.toLowerCase()) || c.phone.includes(mobileCustomerSearchTerm)).length === 0 && (
              <div className="p-4 flex justify-center">
                <button 
                  className="w-full py-3 px-4 flex items-center justify-center gap-2 text-blue-600 bg-blue-50 border border-blue-100 rounded-lg hover:bg-blue-100 transition-colors text-sm font-bold"
                  onClick={() => {
                    setIsMobileCustomerSearchOpen(false);
                    setIsCustomerModalOpen(true);
                    setTimeout(() => {
                      const nameInput = document.getElementById('new-cust-name') as HTMLInputElement;
                      const phoneInput = document.getElementById('new-cust-phone') as HTMLInputElement;
                      if (nameInput && !/[\d]/.test(mobileCustomerSearchTerm)) nameInput.value = mobileCustomerSearchTerm;
                      if (phoneInput && /[\d]/.test(mobileCustomerSearchTerm)) phoneInput.value = mobileCustomerSearchTerm;
                    }, 50);
                  }}
                >
                  <Plus size={18} />
                  Thêm mới "{mobileCustomerSearchTerm}"
                </button>
              </div>
            )}
          </div>
        </div>
      )}

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
                placeholder="Tên, mã hàng, mã vạch..." 
                className="bg-transparent border-none outline-none flex-1 ml-2 text-sm font-medium" 
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {(searchTerm.trim() ? productSuggestions : [...(products || [])].reverse()).map((p, idx) => (
                <div 
                  key={`${p.id}-${idx}`} 
                  onClick={() => {
                    addToCart(p);
                    setIsMobileProductSearchOpen(false);
                  }}
                  className="p-3 border-b border-slate-50 flex gap-3 items-center cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-lg border border-slate-100 bg-slate-50 flex-shrink-0 flex items-center justify-center overflow-hidden">
                    {p.image ? (
                      <img src={p.image} alt={p.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <ImageIcon size={20} className="text-slate-300" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800">{p.name}</p>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">Mã: {p.id} | Tồn: {p.stock}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-blue-600">{formatNumber(p.price)}đ</p>
                  </div>
                </div>
            ))}
            {searchTerm && productSuggestions.length === 0 && (
              <div className="p-8 text-center">
                <p className="text-sm text-slate-500 mb-4">Không tìm thấy sản phẩm "{searchTerm}"</p>
                <button 
                  onClick={() => {
                    resetQuickAddForm();
                    setIsQuickAddModalOpen(true);
                    setIsMobileProductSearchOpen(false);
                    setSearchTerm('');
                  }}
                  className="w-full py-3 bg-blue-600 text-white text-sm font-bold rounded-lg flex items-center justify-center gap-2"
                >
                  <Plus size={18} /> Thêm nhanh sản phẩm này
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    {/* Add Customer Modal */}
    <AddCustomerModal 
      isOpen={isCustomerModalOpen}
      onClose={() => setIsCustomerModalOpen(false)}
      initialName={customerSearchTerm}
      onSuccess={(customer) => {
        setSelectedCustomer(customer);
        setCustomerSearchTerm(customer.name);
        setCustomerSuggestions([]);
        setIsCustomerModalOpen(false);
      }}
    />

      {/* Quick Add Product Modal */}
      {isQuickAddModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="md:text-xl text-lg font-bold text-slate-800 tracking-tight">Thêm nhanh sản phẩm</h3>
              <button onClick={handleCloseQuickAddModal} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 bg-slate-50 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="md:text-xs text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Tên sản phẩm</label>
                <input 
                  type="text" 
                  value={quickAddName}
                  onChange={(e) => setQuickAddName(e.target.value)}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-lg md:text-base text-sm font-semibold outline-none focus:border-blue-400 transition-colors" 
                  placeholder="Tên sản phẩm..." 
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="md:text-xs text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Mã hàng hóa</label>
                  <input 
                    type="text" 
                    value={quickAddId}
                    onChange={(e) => setQuickAddId(e.target.value)}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-lg md:text-base text-sm font-semibold outline-none focus:border-blue-400 transition-colors" 
                    placeholder="Tự động" 
                  />
                </div>
                <div className="flex-1">
                  <label className="md:text-xs text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Loại hàng</label>
                  <select 
                    value={quickAddIsService ? 'service' : 'product'}
                    onChange={(e) => setQuickAddIsService(e.target.value === 'service')}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-lg md:text-base text-sm font-semibold outline-none focus:border-blue-400 transition-colors appearance-none cursor-pointer"
                  >
                    <option value="product">Hàng hóa</option>
                    <option value="service">Dịch vụ</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="md:text-xs text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Giá bán</label>
                  <NumericFormat 
                    value={quickAddPrice}
                    onValueChange={(values) => setQuickAddPrice(values.formattedValue)}
                    thousandSeparator="."
                    decimalSeparator=","
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-lg md:text-base text-sm font-semibold outline-none focus:border-blue-400 transition-colors" 
                    placeholder="0" 
                  />
                </div>
                <div className="flex-1">
                  <label className="md:text-xs text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Giá vốn</label>
                  <NumericFormat 
                    value={quickAddCost}
                    onValueChange={(values) => setQuickAddCost(values.formattedValue)}
                    thousandSeparator="."
                    decimalSeparator=","
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-lg md:text-base text-sm font-semibold outline-none focus:border-blue-400 transition-colors" 
                    placeholder="0" 
                  />
                </div>
              </div>
              
              {!quickAddIsService && (
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="md:text-xs text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Tồn kho ban đầu</label>
                    <NumericFormat 
                      value={quickAddStock}
                      onValueChange={(values) => setQuickAddStock(values.formattedValue)}
                      thousandSeparator="."
                      decimalSeparator=","
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-lg md:text-base text-sm font-semibold outline-none focus:border-blue-400 transition-colors" 
                      placeholder="0" 
                      disabled={quickAddHasSerial}
                    />
                  </div>
                  <div className="flex-1 flex flex-col justify-end pb-3">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${quickAddHasSerial ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 group-hover:border-blue-400'}`}>
                        {quickAddHasSerial && <Check size={14} />}
                      </div>
                      <input 
                        type="checkbox" 
                        className="hidden" 
                        checked={quickAddHasSerial}
                        onChange={(e) => {
                          setQuickAddHasSerial(e.target.checked);
                          if (e.target.checked) setQuickAddStock('0');
                        }}
                      />
                      <span className="md:text-sm text-xs font-bold text-slate-700">Quản lý Serial/IMEI</span>
                    </label>
                  </div>
                </div>
              )}
              <button 
                onClick={handleQuickAdd}
                className="w-full bg-blue-600 text-white py-4 rounded-lg font-bold md:text-lg text-sm shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 mt-2 uppercase tracking-wide"
              >
                Lưu và Thêm vào giỏ
              </button>
            </div>
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
            <h2 className="text-lg font-bold text-slate-800 flex-1">Thanh toán</h2>
            <div className="flex gap-4 text-slate-500">
              <Printer size={20} />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {/* Customer Info */}
            <div className="bg-white p-4 mb-2 flex items-center gap-3 shadow-sm" onClick={() => {
              setIsMobileCheckoutOpen(false);
              setIsMobileCustomerSearchOpen(true);
            }}>
              <UserCircle size={24} className="text-slate-400" />
              <div className="flex-1">
                {selectedCustomer ? (
                  <span className="text-sm font-bold text-slate-800">{selectedCustomer.name} - {selectedCustomer.phone}</span>
                ) : (
                  <span className="text-sm font-bold text-red-500">Khách lẻ</span>
                )}
              </div>
            </div>

            {/* Cart summary */}
            <div className="bg-white p-4 mb-2 flex justify-between items-center shadow-sm" onClick={() => setIsMobileCheckoutOpen(false)}>
              <span className="text-sm font-bold text-slate-800">Xem hàng trong đơn</span>
              <ChevronDown size={20} className="-rotate-90 text-slate-400" />
            </div>

            {/* Payment Details */}
            <div className="bg-white p-4 space-y-4 shadow-sm">
              <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                <span className="text-sm font-bold text-slate-800">Thời gian</span>
                <input 
                  type="datetime-local"
                  value={date}
                  onChange={(e) => setTransactionDate(e.target.value)}
                  className="bg-white border border-slate-200 rounded px-2 py-1 text-xs font-bold outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-800">Tổng tiền hàng</span>
                  <span className="w-5 h-5 rounded-full border border-blue-500 text-blue-600 flex items-center justify-center text-[10px] font-bold">{cart.length}</span>
                </div>
                <span className="text-sm font-bold text-slate-800">{formatNumber(totalGoods)}</span>
              </div>
              
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <span className="text-sm font-bold text-slate-800">Giảm giá (%)</span>
                <NumericFormat 
                  value={discount} 
                  onValueChange={(values) => setDiscount(values.floatValue || 0)}
                  thousandSeparator="."
                  decimalSeparator=","
                  className="w-24 text-right bg-transparent text-sm font-bold outline-none text-slate-800" 
                  placeholder="0"
                />
              </div>

              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <span className="text-sm font-bold text-slate-800">Thu khác</span>
                <span className="text-sm font-bold text-slate-800">0</span>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-sm font-bold text-slate-800">Khách cần trả</span>
                <span className="text-lg font-bold text-blue-600">{formatNumber(finalTotal)}</span>
              </div>

              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <span className="text-sm font-bold text-slate-800">Khách thanh toán</span>
                <NumericFormat 
                  value={paid}
                  onValueChange={(values) => setPaid(values.value)}
                  thousandSeparator="."
                  decimalSeparator=","
                  className="w-32 text-right bg-transparent text-lg font-bold text-slate-800 outline-none" 
                  placeholder="0"
                />
              </div>

              {/* Wallets */}
              {paidAmount > 0 && (
                <div className="flex gap-2 overflow-x-auto no-scrollbar py-2">
                   {wallets.length === 0 && (
                     <span className="text-xs text-rose-500 italic px-2">Vui lòng thiết lập ví trong Cài đặt</span>
                   )}
                {wallets.map((w, idx) => {
                  const isSelected = walletId === w.id;
                  return (
                    <button 
                      key={`${w.id}-${idx}`}
                         onClick={() => {
                           setWalletId(w.id);
                           setPaymentMethod(w.type === 'CASH' ? 'CASH' : 'TRANSFER');
                         }}
                         className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors border ${isSelected ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-slate-100 text-slate-600 border-transparent'}`}
                       >
                         {w.name}
                       </button>
                     );
                   })}
                </div>
              )}
            </div>
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col gap-3">
            <button 
              onClick={() => handleCheckout(false)}
              disabled={isCheckingOut}
              className={`w-full py-4 text-white font-bold rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center justify-center ${isCheckingOut ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600'}`}
            >
              {isCheckingOut ? 'Đang xử lý...' : 'Hoàn thành thanh toán'}
            </button>
            <button 
              onClick={() => setIsMobileCheckoutOpen(false)}
              className="w-full py-3 bg-[#991b1b] text-white font-black rounded-lg uppercase text-[10px] tracking-widest hover:bg-[#7f1d1d] transition-colors active:scale-95 shadow-lg shadow-red-100 md:hidden"
            >
              Đóng
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
            if (refId.startsWith('HD')) {
              navigate('/invoices');
            } else if (refId.startsWith('NH')) {
              navigate('/import-history');
            }
          }}
        />
      )}
    </div>
  );
};

