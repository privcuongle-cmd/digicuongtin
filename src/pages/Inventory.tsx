import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Plus, Box, Wrench, Barcode, X, ArrowDownLeft, ArrowUpRight, FileText, Calendar, User, Package, CreditCard, Truck, Star, Settings, HelpCircle, LayoutGrid, Download, Upload, ChevronDown, Filter, Edit3, Image as ImageIcon, RotateCcw, ExternalLink, Printer, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Product, Invoice, ImportOrder, ReturnImportOrder, ReturnSalesOrder } from '../types';
import { formatNumber, parseFormattedNumber, formatDateTime, parseDateString } from '../lib/utils';
import { generateId } from '../lib/idUtils';
import { useScrollLock } from '../hooks/useScrollLock';
import { useMobileBackModal } from '../hooks/useMobileBackModal';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { GoogleGenAI } from "@google/genai";

import { NumericFormat } from 'react-number-format';
import { ProductDetailModal } from '../components/ProductDetailModal';
import { ImageLibraryModal } from '../components/ImageLibraryModal';
import { AnimatePresence, motion } from 'motion/react';

export const Inventory: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { products, addProduct, stockCards, invoices, importOrders, serials, updateProduct, suppliers, setImportDraft, returnImportOrders, returnSalesOrders, brands, categories, addCategory, addBrand } = useAppContext();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');

  useEffect(() => {
    const q = searchParams.get('search');
    if (q) {
      setSearchTerm(q);
    }
  }, [searchParams]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  
  useMobileBackModal(isModalOpen, () => setIsModalOpen(false));
  
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  useMobileBackModal(!!selectedProduct, () => setSelectedProduct(null));
  
  const [detailTab, setDetailTab] = useState<'stock' | 'serial'>('stock');
  
  // Detail modals for transactions
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [viewingImport, setViewingImport] = useState<ImportOrder | null>(null);
  const [viewingReturnImport, setViewingReturnImport] = useState<ReturnImportOrder | null>(null);
  const [viewingReturnSales, setViewingReturnSales] = useState<ReturnSalesOrder | null>(null);
  
  useMobileBackModal(!!viewingInvoice, () => setViewingInvoice(null));
  useMobileBackModal(!!viewingImport, () => setViewingImport(null));
  useMobileBackModal(!!viewingReturnImport, () => setViewingReturnImport(null));
  useMobileBackModal(!!viewingReturnSales, () => setViewingReturnSales(null));
  
  // Use scroll lock for all modals in Inventory
  useScrollLock(isModalOpen || !!selectedProduct || !!viewingInvoice || !!viewingInvoice || !!viewingReturnImport || !!viewingReturnSales);

  const hasChanges = () => {
    if (selectedProduct) {

return (
        name !== selectedProduct.name ||
        pType !== (selectedProduct.isService ? 'service' : 'product') ||
        parseFormattedNumber(price) !== selectedProduct.price ||
        parseFormattedNumber(cost) !== (selectedProduct.importPrice || 0) ||
        stock !== (selectedProduct.stock?.toString() || '') ||
        hasSerial !== (selectedProduct.hasSerial || false) ||
        warrantyMonths !== (selectedProduct.warrantyMonths?.toString() || '') ||
        unit !== (selectedProduct.unit || '') ||
        category !== (selectedProduct.category || '') ||
        brand !== (selectedProduct.brand || '') ||
        expectedOutOfStock !== (selectedProduct.expectedOutOfStock || '') ||
        lowStockThreshold !== (selectedProduct.lowStockThreshold?.toString() || '') ||
        pStatus !== (selectedProduct.status || 'Đang kinh doanh') ||
        image !== selectedProduct.image ||
        description !== (selectedProduct.description || '')
      );
    }
    return (
      name !== '' ||
      price !== '' ||
      cost !== '' ||
      stock !== '' ||
      unit !== '' ||
      category !== '' ||
      brand !== '' ||
      image !== undefined ||
      description !== ''
    );
  };

  const handleCloseModal = () => {
    if (hasChanges()) {
      if (window.confirm('Bạn có thay đổi chưa lưu. Bạn có chắc chắn muốn đóng mà không lưu không?')) {
        setIsModalOpen(false);
      }
    } else {
      setIsModalOpen(false);
    }
  };

  // Handle Escape key to close modals in layers
  useEscapeKey(() => setViewingReturnSales(null), !!viewingReturnSales);
  useEscapeKey(() => setViewingReturnImport(null), !!viewingReturnImport);
  useEscapeKey(() => setViewingImport(null), !!viewingImport);
  useEscapeKey(() => setViewingInvoice(null), !!viewingInvoice);
  useEscapeKey(() => setSelectedProduct(null), !!selectedProduct);
  useEscapeKey(handleCloseModal, isModalOpen);

  // Serial filtering state
  const [serialSearchTerm, setSerialSearchTerm] = useState('');
  const [serialStatusTab, setSerialStatusTab] = useState<'ALL' | 'IN_STOCK' | 'SOLD'>('IN_STOCK');

  // Form state
  const [pType, setPType] = useState<'product' | 'service'>('product');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [cost, setCost] = useState('');
  const [stock, setStock] = useState('');
  const [hasSerial, setHasSerial] = useState(false);
  const [warrantyMonths, setWarrantyMonths] = useState('');
  const [unit, setUnit] = useState('');
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [expectedOutOfStock, setExpectedOutOfStock] = useState('');
  const [lowStockThreshold, setLowStockThreshold] = useState('');
  const [pStatus, setPStatus] = useState<'Đang kinh doanh' | 'Ngừng kinh doanh'>('Đang kinh doanh');
  const [image, setImage] = useState<string | undefined>(undefined);
  const [description, setDescription] = useState('');
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);

  // Searchable dropdown states
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isBrandDropdownOpen, setIsBrandDropdownOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [brandSearch, setBrandSearch] = useState('');

  const [statusFilter, setStatusFilter] = useState<'Đang kinh doanh' | 'Ngừng kinh doanh' | 'ALL'>('Đang kinh doanh');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  const filteredProducts = useMemo(() => {
    let result = products || [];
    
    if (statusFilter !== 'ALL') {
      result = result.filter(p => (p.status || 'Đang kinh doanh') === statusFilter);
    }

    if (categoryFilter !== 'ALL') {
      result = result.filter(p => (p.category || 'Chưa phân loại') === categoryFilter);
    }

    if (activeFilter === 'LOW_STOCK') {
      result = result.filter(p => !p.isService && p.stock !== null && p.stock < (p.lowStockThreshold ?? 5));
    }

    if (!searchTerm.trim()) {
      return [...result].reverse();
    }
    
    return result
      .filter(p => 
        (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
        (p.id || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
      .reverse();
  }, [products, searchTerm, activeFilter, statusFilter, categoryFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeFilter, statusFilter, categoryFilter, rowsPerPage]);

  const totalPages = Math.ceil(filteredProducts.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  const resetForm = () => {
    setPType('product');
    setName('');
    setPrice('');
    setCost('');
    setStock('');
    setHasSerial(false);
    setWarrantyMonths('');
    setUnit('');
    setCategory('');
    setBrand('');
    setCategorySearch('');
    setBrandSearch('');
    setExpectedOutOfStock('');
    setLowStockThreshold('');
    setPStatus('Đang kinh doanh');
    setImage(undefined);
    setDescription('');
  };

  const filteredCategories = useMemo(() => {
    const search = categorySearch.toLowerCase().trim();
    if (!search && !isCategoryDropdownOpen) return categories;
    return categories.filter(c => c.name.toLowerCase().includes(search));
  }, [categories, categorySearch, isCategoryDropdownOpen]);

  const filteredBrands = useMemo(() => {
    const search = brandSearch.toLowerCase().trim();
    if (!search && !isBrandDropdownOpen) return brands;
    return brands.filter(b => b.name.toLowerCase().includes(search));
  }, [brands, brandSearch, isBrandDropdownOpen]);

  const handleSave = () => {
    if (!name || !price) {
      alert('Vui lòng nhập đủ tên và giá bán');
      return;
    }

    const colors = ['bg-blue-600', 'bg-indigo-600', 'bg-purple-600', 'bg-emerald-500', 'bg-rose-500'];
    
    // Auto-save new category if not exists
    if (category && !categories.find(c => c.name.toLowerCase() === category.toLowerCase())) {
      addCategory({ name: category });
    }
    
    // Auto-save new brand if not exists
    if (brand && !brands.find(b => b.name.toLowerCase() === brand.toLowerCase())) {
      addBrand({ name: brand });
    }

    if (selectedProduct) {
      // Update existing product - background API call
      updateProduct(selectedProduct.id, {
        name,
        price: parseFormattedNumber(price),
        importPrice: parseFormattedNumber(cost) || 0,
        stock: pType === 'service' ? null : Number(stock) || 0,
        hasSerial: pType === 'service' ? false : hasSerial,
        isService: pType === 'service',
        warrantyMonths: Number(warrantyMonths) || 0,
        unit,
        category,
        brand,
        expectedOutOfStock,
        lowStockThreshold: Number(lowStockThreshold) || 0,
        status: pStatus,
        image,
        description
      });
    } else {
      // Add new product - background API call
      const prefix = pType === 'service' ? 'SV' : 'SP';
      const id = generateId(prefix, products);
      addProduct({
        id,
        name,
        price: parseFormattedNumber(price),
        importPrice: parseFormattedNumber(cost) || 0,
        stock: pType === 'service' ? null : Number(stock) || 0,
        hasSerial: pType === 'service' ? false : hasSerial,
        isService: pType === 'service',
        color: pType === 'service' ? 'bg-emerald-600' : colors[products.length % colors.length],
        warrantyMonths: Number(warrantyMonths) || 0,
        unit,
        category,
        brand,
        expectedOutOfStock,
        lowStockThreshold: Number(lowStockThreshold) || 0,
        status: pStatus,
        image,
        description,
        createdAt: formatDateTime(new Date())
      });
    }

    // Close Edit Modal
    setIsModalOpen(false);

    // If we're editing, update the selectedProduct state so the detail modal stays open with updated info
    if (selectedProduct) {
      setSelectedProduct({
        ...selectedProduct,
        name,
        price: parseFormattedNumber(price),
        importPrice: parseFormattedNumber(cost) || 0,
        stock: pType === 'service' ? null : Number(stock) || 0,
        hasSerial: pType === 'service' ? false : hasSerial,
        isService: pType === 'service',
        warrantyMonths: Number(warrantyMonths) || 0,
        unit,
        category,
        brand,
        expectedOutOfStock,
        lowStockThreshold: Number(lowStockThreshold) || 0,
        status: pStatus,
        image
      });
    } else {
      setSelectedProduct(null);
    }

    // Reset form
    resetForm();
  };

  const productStockHistory = useMemo(() => {
    if (!selectedProduct) return [];
    
    // Derived from sources of truth
    const importHistory = importOrders.flatMap(order => 
      (Array.isArray(order.items) ? order.items : []).filter(item => item.id === selectedProduct.id).map(item => ({
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
      (Array.isArray(inv.items) ? inv.items : []).filter(item => item.id === selectedProduct.id).map(item => ({
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
      (Array.isArray(order.items) ? order.items : []).filter(item => item.id === selectedProduct.id).map(item => ({
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
      (Array.isArray(order.items) ? order.items : []).filter(item => item.id === selectedProduct.id).map(item => ({
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
    
    // De-duplicate by refId
    const manualRefIds = new Set([
      ...importHistory.map(h => h.refId),
      ...invoiceHistory.map(h => h.refId),
      ...returnImportHistory.map(h => h.refId),
      ...returnSalesHistory.map(h => h.refId)
    ]);

    const adjustments = stockCards.filter(card => 
      card.prodId === selectedProduct.id && !manualRefIds.has(card.refId)
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
    
    return history.sort((a, b) => parseDateString(b.date) - parseDateString(a.date));
  }, [selectedProduct, stockCards, importOrders, invoices, returnImportOrders, returnSalesOrders]);

  const handleRefClick = (refId: string) => {
    if (refId.startsWith('HD')) {
      const inv = invoices.find(i => i.id === refId);
      if (inv) setViewingInvoice(inv);
    } else if (refId.startsWith('NH')) {
      const imp = importOrders.find(i => i.id === refId);
      if (imp) setViewingImport(imp);
    } else if (refId.startsWith('THN')) {
      const ret = returnImportOrders.find(r => r.id === refId);
      if (ret) setViewingReturnImport(ret);
    } else if (refId.startsWith('THB')) {
      const ret = returnSalesOrders.find(r => r.id === refId);
      if (ret) setViewingReturnSales(ret);
    }
  };

  const handleOpenImport = (order: ImportOrder) => {
    const supplier = suppliers.find(s => s.name === order.supplier) || null;
    setImportDraft({
      cart: order.items.map(item => {
        const product = products.find(p => p.id === item.id);
        const snArray = typeof (item as any).sn === 'string' 
          ? (item as any).sn.split(',').map((s: string) => s.trim()).filter(Boolean) 
          : (Array.isArray(item.sn) ? item.sn : []);
        return {
          ...item,
          serials: snArray,
          hasSerial: product?.hasSerial || false
        };
      }) as any,
      selectedSupplier: supplier,
      paid: order.paid,
      isExplicitIntent: true
    });
    navigate('/import');
  };

  const totalStock = filteredProducts.reduce((sum, p) => sum + (p.stock || 0), 0);

  useMobileBackModal(isLibraryOpen, () => setIsLibraryOpen(false)); // auto-injected

  return (
    <div className="flex flex-col h-full bg-slate-50 md:bg-white">
      <div className="bg-white md:rounded-xl md:shadow-sm md:border md:border-slate-200 flex flex-col mx-auto w-full h-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 shrink-0 bg-white md:bg-slate-50/50 border-b border-slate-100">
        {/* Left: Search */}
        <div className="relative w-full md:max-w-md flex gap-2">
          <div className="relative flex-1 z-20">
            <div className="relative flex items-center w-full z-50">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Theo mã, tên hàng" 
                className="w-full bg-slate-50 md:bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-blue-500 shadow-sm font-medium transition-all"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 outline-none focus:border-blue-400"
          >
            <option value="Đang kinh doanh">⚡ Đang kinh doanh</option>
            <option value="Ngừng kinh doanh">🚫 Ngừng kinh doanh</option>
            <option value="ALL">📦 Tất cả Trạng thái</option>
          </select>

          <select 
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 outline-none focus:border-blue-400 min-w-[140px]"
          >
            <option value="ALL">📂 Tất cả Nhóm hàng</option>
            {Array.from(new Set(categories.map(c => c.name))).map((name, i) => (
              <option key={`cat-${i}`} value={name}>{name}</option>
            ))}
            <option value="Chưa phân loại">❓ Chưa phân loại</option>
          </select>

          <button 
            onClick={() => setActiveFilter(activeFilter === 'ALL' ? 'LOW_STOCK' : 'ALL')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all border shrink-0 ${activeFilter === 'LOW_STOCK' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
          >
            <AlertTriangle size={16} />
            Sắp hết hàng
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 hidden md:flex">
          <div className="flex items-center gap-2 mr-2">
            <button 
              onClick={() => {
                setSelectedProduct(null);
                resetForm();
                setIsModalOpen(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow-sm flex items-center gap-2 font-bold text-sm hover:bg-blue-700 transition-all"
            >
              <Plus size={18} /> Tạo mới
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col bg-slate-50 md:bg-white">
        {/* Desktop Table View */}
        <div className="hidden md:block flex-1 overflow-y-auto custom-scrollbar">
          <table className="w-full border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-white border-b border-slate-200">
              <tr className="text-slate-700 text-sm font-bold">
                <th className="p-3 w-12"></th>
                <th className="p-3">Mã hàng</th>
                <th className="p-3">Tên hàng</th>
                <th className="p-3">ĐVT</th>
                <th className="p-3">Nhóm hàng</th>
                <th className="p-3">Thương hiệu</th>
                <th className="p-3">Trạng thái</th>
                <th className="p-3 text-right">Giá bán</th>
                <th className="p-3 text-right">Giá vốn</th>
                <th className="p-3 text-right">Tồn kho</th>
              </tr>
              {/* Summary Row */}
              <tr className="bg-slate-50/50 text-slate-800 text-[13px] font-bold border-b border-slate-100">
                <td colSpan={9}></td>
                <td className="p-3 text-right">{formatNumber(totalStock)}</td>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedProducts.map((p, idx) => (
                <tr 
                  key={`desktop-prod-${p.id}-${idx}`} 
                  onClick={() => { setSelectedProduct(p); setSerialStatusTab('IN_STOCK'); }}
                  className="hover:bg-blue-50/30 transition-colors cursor-pointer text-sm text-slate-600 group"
                >
                  <td className="p-3">
                    <div className={`w-8 h-8 ${p.color} rounded flex items-center justify-center text-white shadow-sm overflow-hidden`}>
                      {p.image ? (
                        <img src={p.image} alt={p.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        p.hasSerial ? <Barcode size={14} /> : (p.isService ? <Wrench size={14} /> : <ImageIcon size={14} />)
                      )}
                    </div>
                  </td>
                  <td className="p-3 font-medium text-blue-600">{p.id}</td>
                  <td className="p-3 font-bold text-base text-slate-800 max-w-xs">{p.name}</td>
                  <td className="p-3 text-slate-500">{p.unit || '---'}</td>
                  <td className="p-3 text-slate-500">{p.category || '---'}</td>
                  <td className="p-3 text-slate-500">{p.brand || '---'}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      (p.status || 'Đang kinh doanh') === 'Đang kinh doanh' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {p.status || 'Đang kinh doanh'}
                    </span>
                  </td>
                  <td className="p-3 text-right font-bold md:text-base">{formatNumber(p.price)}</td>
                  <td className="p-3 text-right md:text-base">{formatNumber(p.importPrice || 0)}</td>
                  <td className={`p-3 text-right md:text-base font-bold ${p.stock !== null && p.stock < (p.lowStockThreshold ?? 5) && !p.isService ? 'text-red-500' : 'text-slate-800'}`}>
                    {p.stock ?? '---'}
                    {p.stock !== null && p.stock < (p.lowStockThreshold ?? 5) && !p.isService && (
                      <span className="ml-1 inline-flex w-2 h-2 rounded-full bg-red-500" title="Tồn kho thấp"></span>
                     )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredProducts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Package size={48} className="mb-4 opacity-20" />
              <p className="italic">Không tìm thấy hàng hóa nào</p>
            </div>
          )}
        </div>

        {/* Mobile Grid View */}
        <div className="md:hidden flex-1 overflow-y-auto p-4 space-y-4">
          {filteredProducts.length === 0 ? (
            <p className="text-center py-20 text-slate-400 italic text-sm">Chưa có sản phẩm trong kho.</p>
          ) : (
            paginatedProducts.map((p, idx) => (
              <div 
                key={`mobile-prod-${p.id}-${idx}`} 
                onClick={() => { setSelectedProduct(p); setSerialStatusTab('IN_STOCK'); }}
                className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm flex items-start gap-4 sm:gap-6 hover:shadow-md transition-all cursor-pointer hover:border-blue-300"
              >
                <div className={`w-12 h-12 sm:w-16 sm:h-16 ${p.color} rounded-lg flex items-center justify-center text-white shadow-lg overflow-hidden shrink-0`}>
                  {p.image ? (
                    <img src={p.image} alt={p.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    p.hasSerial ? <Barcode size={24} /> : (p.isService ? <Wrench size={24} /> : <Box size={24} />)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {p.isService && <span className="bg-emerald-100 text-emerald-700 text-[9px] font-bold px-2 py-0.5 rounded">Dịch vụ</span>}
                  </div>
                  <p className="font-bold text-base text-slate-800 break-words leading-tight">{p.name}</p>
                  
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1.5 text-xs sm:text-[13px]">
                    <span className="text-blue-600 font-bold tracking-wide">{formatNumber(p.price)}đ</span>
                    <span className="text-slate-300 font-light">|</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{p.isService ? 'Trạng thái:' : 'Tồn:'}</span>
                      <span className={`font-bold ${p.isService ? 'text-emerald-500' : (p.stock !== null && p.stock < (p.lowStockThreshold ?? 5) ? 'text-red-500' : 'text-slate-800')}`}>
                        {p.isService ? 'Sẵn sàng' : p.stock}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {filteredProducts.length > 0 && (
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

      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onEdit={(p) => {
            setPType(p.isService ? 'service' : 'product');
            setName(p.name);
            setPrice(p.price.toString());
            setCost((p.importPrice || 0).toString());
            setStock(p.stock?.toString() || '');
            setHasSerial(p.hasSerial || false);
            setWarrantyMonths(p.warrantyMonths?.toString() || '');
            setUnit(p.unit || '');
            setCategory(p.category || '');
            setBrand(p.brand || '');
            setCategorySearch(p.category || '');
            setBrandSearch(p.brand || '');
            setExpectedOutOfStock(p.expectedOutOfStock || '');
            setLowStockThreshold(p.lowStockThreshold?.toString() || '');
            setPStatus((p.status as any) || 'Đang kinh doanh');
            setImage(p.image);
            setDescription(p.description || '');
            setIsModalOpen(true);
          }}
          onRefClick={handleRefClick}
        />
      )}

      {/* Invoice Detail Modal (Shared) */}
      {viewingInvoice && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center md:p-4 p-0 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-5xl md:rounded-xl rounded-none shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col h-full md:h-auto md:max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="md:text-2xl text-lg font-black text-slate-800 tracking-tighter uppercase">Chi tiết hóa đơn</h3>
                  <p className="md:text-sm text-[10px] font-bold text-blue-600 uppercase tracking-widest">Mã: {viewingInvoice.id}</p>
                </div>
              </div>
              <button 
                onClick={() => setViewingInvoice(null)} 
                className="w-8 h-8 bg-white text-slate-400 rounded-full hover:bg-slate-200 transition-colors flex items-center justify-center shadow-sm border border-slate-100"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 flex items-center gap-3">
                  <Calendar className="text-slate-400" size={18} />
                  <div>
                    <p className="md:text-sm text-[9px] font-bold text-slate-400 uppercase tracking-widest">Ngày lập phiếu</p>
                    <p className="md:text-lg text-xs font-black text-slate-800">{viewingInvoice.date}</p>
                  </div>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 flex items-center gap-3">
                  <User className="text-slate-400" size={18} />
                  <div>
                    <p className="md:text-sm text-[9px] font-bold text-slate-400 uppercase tracking-widest">Khách hàng</p>
                    <p className="md:text-lg text-xs font-black text-slate-800 uppercase">{viewingInvoice.customer}</p>
                  </div>
                </div>
              </div>
              <div className="border border-slate-100 rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 md:text-sm text-[9px] font-black text-slate-400 uppercase">Sản phẩm</th>
                      <th className="px-4 py-3 md:text-sm text-[9px] font-black text-slate-400 uppercase text-center">SL</th>
                      <th className="px-4 py-3 md:text-sm text-[9px] font-black text-slate-400 uppercase text-right">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {viewingInvoice.items.map((item, idx) => (
                      <tr key={`view-inv-item-${item.id}-${idx}`}>
                        <td className="px-4 py-3">
                          <p className="md:text-lg text-xs font-black text-slate-800 uppercase tracking-tighter">{item.name}</p>
                          {item.sn && <p className="md:text-xs text-[8px] text-orange-500 font-bold mt-0.5 font-mono uppercase">SN: {item.sn}</p>}
                        </td>
                        <td className="px-4 py-3 text-center md:text-lg text-xs font-black text-slate-600">{item.qty}</td>
                        <td className="px-4 py-3 text-right md:text-lg text-xs font-black text-slate-800">{formatNumber(item.qty * (item.price || 0))}đ</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="bg-blue-50/50 p-6 rounded-xl border border-blue-100">
                <div className="flex justify-between items-center pt-3 border-t border-blue-200">
                  <span className="md:text-lg text-sm font-black text-blue-800 uppercase tracking-widest">Tổng thanh toán</span>
                  <span className="md:text-4xl text-2xl font-black text-blue-600 tracking-tighter">{formatNumber(viewingInvoice.total || 0)}đ</span>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 bg-slate-50/50">
              <button 
                onClick={() => setViewingInvoice(null)} 
                className="w-full py-3 bg-[#991b1b] text-white font-black rounded-lg uppercase md:text-sm text-[10px] tracking-widest hover:bg-[#7f1d1d] transition-colors md:hidden"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Detail Modal (Shared) */}
      {viewingImport && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center md:p-4 p-0 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-5xl md:rounded-xl rounded-none shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col h-full md:h-auto md:max-h-[90vh]">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-start shrink-0">
              <div>
                <h3 className="md:text-3xl text-xl font-bold text-slate-800">Chi Tiết Nhập Kho</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="md:text-lg text-sm font-medium text-slate-500">{viewingImport.id}</span>
                  <span className={`md:text-sm text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                    viewingImport.status === 'DONE' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {viewingImport.status === 'DONE' ? 'Hoàn thành' : 'Phiếu tạm'}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setViewingImport(null)} 
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {/* Supplier & Date Box */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 flex justify-between items-center">
                <span className="md:text-xl font-bold text-slate-700 uppercase">{viewingImport.supplier}</span>
                <span className="md:text-base text-xs text-slate-500">{viewingImport.date}</span>
              </div>

              {/* Items List */}
              <div className="space-y-3">
                {viewingImport.items.map((item, idx) => (
                  <div key={`imp-item-${item.id}-${idx}`} className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 relative">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="md:text-lg text-sm font-bold text-slate-800 uppercase">{item.name}</h4>
                      <span className="md:text-xl text-blue-600 font-bold">{formatNumber(item.price * item.qty)}đ</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="md:text-base text-xs text-slate-500 font-medium">SL: {item.qty}</span>
                      <span className="md:text-base text-xs text-slate-400">Giá: {formatNumber(item.price)}đ</span>
                    </div>
                    {item.sn && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(typeof item.sn === 'string' ? item.sn.split(',') : item.sn).map((sn: string, sIdx: number) => (
                          <span key={`${sn}-${sIdx}`} className="bg-orange-50 text-orange-600 md:text-sm text-[10px] font-bold px-2 py-1 rounded border border-orange-100">
                            {sn.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Summary Section */}
              <div className="pt-4 border-t border-slate-100">
                <div className="flex justify-between items-end">
                  <span className="md:text-lg text-sm font-bold text-slate-500 mb-1">Vốn nhập:</span>
                  <div className="text-right">
                    <p className="md:text-4xl text-2xl font-bold text-blue-600">{formatNumber(viewingImport.total || 0)}đ</p>
                    {viewingImport.debt > 0 && (
                      <p className="md:text-lg text-xs font-bold text-red-500 mt-1">Nợ NCC: {formatNumber(viewingImport.debt)}đ</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t border-slate-100 grid grid-cols-3 md:grid-cols-4 gap-3 bg-slate-50/50 shrink-0">
              <button className="flex items-center justify-center gap-2 py-3 border border-slate-200 rounded-lg text-slate-600 font-bold md:text-base text-sm hover:bg-slate-50 transition-colors">
                <RotateCcw size={18} /> Trả hàng
              </button>
              <button 
                onClick={() => handleOpenImport(viewingImport)}
                className="flex items-center justify-center gap-2 py-3 border border-slate-200 rounded-lg text-slate-600 font-bold md:text-base text-sm hover:bg-slate-50 transition-colors"
              >
                <ExternalLink size={18} /> Mở phiếu
              </button>
              <button className="flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-lg font-bold md:text-base text-sm hover:bg-blue-700 transition-colors shadow-md">
                <Printer size={18} /> In phiếu
              </button>
              <button 
                onClick={() => setViewingImport(null)}
                className="col-span-3 md:col-span-1 py-3 bg-[#991b1b] text-white font-black rounded-lg uppercase md:text-sm text-[10px] tracking-widest hover:bg-[#7f1d1d] shadow-lg shadow-red-100 md:hidden"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Import Detail Modal */}
      {viewingReturnImport && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center md:p-4 p-0 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-5xl md:rounded-xl rounded-none shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col h-full md:h-auto md:max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-start shrink-0">
              <div>
                <h3 className="md:text-3xl text-xl font-bold text-slate-800">Chi Tiết Trả Hàng Nhập</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="md:text-lg text-sm font-medium text-slate-500">{viewingReturnImport.id}</span>
                  <span className="md:text-sm text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-red-100 text-red-700">
                    {viewingReturnImport.status === 'DONE' ? 'Hoàn thành' : 'Phiếu tạm'}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setViewingReturnImport(null)} 
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 flex justify-between items-center">
                <span className="md:text-xl font-bold text-slate-700 uppercase">{viewingReturnImport.supplier}</span>
                <span className="md:text-base text-xs text-slate-500">{viewingReturnImport.date}</span>
              </div>

              <div className="space-y-3">
                {viewingReturnImport.items.map((item, idx) => (
                  <div key={`ret-imp-item-${item.id}-${idx}`} className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="md:text-lg text-sm font-bold text-slate-800 uppercase">{item.name}</h4>
                      <span className="md:text-xl text-red-600 font-bold">{formatNumber(item.price * item.qty)}đ</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="md:text-base text-xs text-slate-500 font-medium">SL: {item.qty}</span>
                      <span className="md:text-base text-xs text-slate-400">Giá: {formatNumber(item.price)}đ</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-100">
                <div className="flex justify-between items-end">
                  <span className="md:text-lg text-sm font-bold text-slate-500 mb-1">Tổng tiền trả:</span>
                  <div className="text-right">
                    <p className="md:text-4xl text-2xl font-bold text-red-600">{formatNumber(viewingReturnImport.total)}đ</p>
                    <p className="md:text-lg text-xs font-bold text-slate-500 mt-1">Đã nhận: {formatNumber(viewingReturnImport.received)}đ</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 md:p-6 border-t border-slate-100 bg-slate-50/50 shrink-0">
              <button 
                onClick={() => setViewingReturnImport(null)}
                className="w-full py-3 bg-[#991b1b] text-white font-black rounded-lg uppercase md:text-sm text-[10px] tracking-widest hover:bg-[#7f1d1d] transition-colors shadow-lg shadow-red-100 md:hidden"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Sales Detail Modal */}
      {viewingReturnSales && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center md:p-4 p-0 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-5xl md:rounded-xl rounded-none shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col h-full md:h-auto md:max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-start shrink-0">
              <div>
                <h3 className="md:text-3xl text-xl font-bold text-slate-800">Chi Tiết Khách Trả Hàng</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="md:text-lg text-sm font-medium text-slate-500">{viewingReturnSales.id}</span>
                  <span className="md:text-sm text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-orange-100 text-orange-700">
                    {viewingReturnSales.status === 'DONE' ? 'Hoàn thành' : 'Phiếu tạm'}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setViewingReturnSales(null)} 
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 flex justify-between items-center">
                <span className="md:text-xl font-bold text-slate-700 uppercase">{viewingReturnSales.customer}</span>
                <span className="md:text-base text-xs text-slate-500">{viewingReturnSales.date}</span>
              </div>

              <div className="space-y-3">
                {viewingReturnSales.items.map((item, idx) => (
                  <div key={`ret-sales-item-${item.id}-${idx}`} className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="md:text-lg text-sm font-bold text-slate-800 uppercase">{item.name}</h4>
                      <span className="md:text-xl text-orange-600 font-bold">{formatNumber(item.price * item.qty)}đ</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="md:text-base text-xs text-slate-500 font-medium">SL: {item.qty}</span>
                      <span className="md:text-base text-xs text-slate-400">Giá: {formatNumber(item.price)}đ</span>
                    </div>
                    {item.sn && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {(typeof item.sn === 'string' ? item.sn.split(',') : item.sn).map((sn: string, sIdx: number) => (
                          <span key={`sn-${sn}-${sIdx}`} className="md:text-sm text-[8px] bg-white border border-slate-200 px-1 rounded text-slate-500 font-mono">
                            {sn.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-100">
                <div className="flex justify-between items-end">
                  <span className="md:text-lg text-sm font-bold text-slate-500 mb-1">Tổng tiền trả khách:</span>
                  <div className="text-right">
                    <p className="md:text-4xl text-2xl font-bold text-orange-600">{formatNumber(viewingReturnSales.total)}đ</p>
                    <p className="md:text-lg text-xs font-bold text-slate-500 mt-1">Đã trả: {formatNumber(viewingReturnSales.paid)}đ</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 md:p-6 border-t border-slate-100 bg-slate-50/50 shrink-0">
              <button 
                onClick={() => setViewingReturnSales(null)}
                className="w-full py-3 bg-[#991b1b] text-white font-black rounded-lg uppercase md:text-sm text-[10px] tracking-widest hover:bg-[#7f1d1d] transition-colors shadow-lg shadow-red-100 md:hidden"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-0 md:p-4 bg-slate-900/50 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white w-full max-w-6xl md:rounded-3xl rounded-none shadow-2xl overflow-hidden flex flex-col h-full md:max-h-[92vh] relative"
          >
            <div className="flex justify-between items-center p-3 border-b border-slate-100 shrink-0 bg-white">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <Box className="text-blue-600" size={24} />
                {selectedProduct ? 'Cập nhật mặt hàng' : 'Thêm mặt hàng mới'}
              </h3>
              <button 
                onClick={handleCloseModal} 
                className="w-10 h-10 hover:bg-slate-50 text-slate-400 rounded-full transition-colors flex items-center justify-center"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-50/30">
              <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6">
                
                {/* Right Column: Detailed Info - order-1 on mobile, lg:order-2 on desktop */}
                <div className="lg:col-span-8 space-y-5 lg:pl-2 order-1 lg:order-2">
                  <div className="space-y-4">
                    {/* Main Name Input */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1 block mb-1.5">Tên hàng / dịch vụ</label>
                      <input 
                        type="text" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-lg outline-none focus:border-blue-400 transition-all shadow-sm font-black text-slate-800" 
                        placeholder="VD: SSD SAMSUNG 1TB..." 
                      />
                    </div>

                    {/* Price Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
                      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                        <label className="text-[11px] font-bold text-blue-500 uppercase tracking-widest block mb-1">Giá bán lẻ (đ)</label>
                        <NumericFormat 
                          value={price}
                          onValueChange={(values) => setPrice(values.value)}
                          thousandSeparator="."
                          decimalSeparator=","
                          className="w-full bg-transparent text-xl md:text-2xl font-black text-blue-600 outline-none placeholder:text-blue-200" 
                          placeholder="0" 
                        />
                      </div>
                      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Giá vốn (đ)</label>
                        <NumericFormat 
                          value={cost}
                          onValueChange={(values) => setCost(values.value)}
                          thousandSeparator="."
                          decimalSeparator=","
                          className="w-full bg-transparent text-xl md:text-2xl font-black text-slate-600 outline-none placeholder:text-slate-200" 
                          placeholder="0" 
                        />
                      </div>
                    </div>

                    {/* Secondary Info Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {pType === 'product' && (
                        <div>
                          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1 block mb-1.5">Tồn đầu kỳ</label>
                          <input 
                            type="number" 
                            value={stock}
                            onChange={(e) => setStock(e.target.value)}
                            className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-400 transition-all shadow-sm font-bold" 
                            placeholder="0" 
                          />
                        </div>
                      )}
                      <div>
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1 block mb-1.5">Đơn vị tính</label>
                        <input 
                          type="text" 
                          value={unit}
                          onChange={(e) => setUnit(e.target.value)}
                          className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-400 transition-all shadow-sm font-bold" 
                          placeholder="Cái, Bộ, Mét..." 
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1 block mb-1.5">Bảo hành (tháng)</label>
                        <input 
                          type="number" 
                          value={warrantyMonths}
                          onChange={(e) => setWarrantyMonths(e.target.value)}
                          className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-400 transition-all shadow-sm font-bold" 
                          placeholder="0" 
                        />
                      </div>
                    </div>

                    {/* Dropdowns Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Category */}
                      <div className="relative">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1 block mb-1.5">Nhóm hàng</label>
                        <div className="relative">
                          <input 
                            type="text" 
                            value={categorySearch}
                            onChange={(e) => {
                              setCategorySearch(e.target.value);
                              setCategory(e.target.value);
                              setIsCategoryDropdownOpen(true);
                            }}
                            onFocus={() => setIsCategoryDropdownOpen(true)}
                            className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-400 transition-all shadow-sm font-bold pr-10" 
                            placeholder="Chọn hoặc nhập mới..." 
                          />
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                          
                          {isCategoryDropdownOpen && (
                            <>
                              <div className="fixed inset-0 z-[400]" onClick={() => setIsCategoryDropdownOpen(false)} />
                              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-[410] overflow-hidden overflow-y-auto max-h-[200px] animate-in fade-in slide-in-from-top-1 duration-200">
                                {filteredCategories.map((c, i) => (
                                  <button
                                    key={`${c.id}-${i}`}
                                    type="button"
                                    onClick={() => {
                                      setCategory(c.name);
                                      setCategorySearch(c.name);
                                      setIsCategoryDropdownOpen(false);
                                    }}
                                    className="w-full text-left p-3 hover:bg-slate-50 transition-all font-bold text-slate-700 text-xs border-b border-slate-50 last:border-0"
                                  >
                                    {c.name}
                                  </button>
                                ))}
                                {categorySearch && !filteredCategories.find(c => c.name.toLowerCase() === categorySearch.toLowerCase()) && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCategory(categorySearch);
                                      setIsCategoryDropdownOpen(false);
                                    }}
                                    className="w-full text-left p-3 hover:bg-blue-50 text-blue-600 transition-all font-black text-xs flex items-center gap-2"
                                  >
                                    <Plus size={14} className="text-blue-500" /> Thêm mới: {categorySearch}
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Brand */}
                      <div className="relative">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1 block mb-1.5">Thương hiệu</label>
                        <div className="relative">
                          <input 
                            type="text" 
                            value={brandSearch}
                            onChange={(e) => {
                              setBrandSearch(e.target.value);
                              setBrand(e.target.value);
                              setIsBrandDropdownOpen(true);
                            }}
                            onFocus={() => setIsBrandDropdownOpen(true)}
                            className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-400 transition-all shadow-sm font-bold pr-10" 
                            placeholder="Samsung, Dell, HP..." 
                          />
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                          
                          {isBrandDropdownOpen && (
                            <>
                              <div className="fixed inset-0 z-[400]" onClick={() => setIsBrandDropdownOpen(false)} />
                              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-[410] overflow-hidden overflow-y-auto max-h-[200px] animate-in fade-in slide-in-from-top-1 duration-200">
                                {filteredBrands.map((b, i) => (
                                  <button
                                    key={`${b.id}-${i}`}
                                    type="button"
                                    onClick={() => {
                                      setBrand(b.name);
                                      setBrandSearch(b.name);
                                      setIsBrandDropdownOpen(false);
                                    }}
                                    className="w-full text-left p-3 hover:bg-slate-50 transition-all font-bold text-slate-700 text-xs border-b border-slate-50 last:border-0"
                                  >
                                    {b.name}
                                  </button>
                                ))}
                                {brandSearch && !filteredBrands.find(b => b.name.toLowerCase() === brandSearch.toLowerCase()) && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setBrand(brandSearch);
                                      setIsBrandDropdownOpen(false);
                                    }}
                                    className="w-full text-left p-3 hover:bg-blue-50 text-blue-600 transition-all font-black text-xs flex items-center gap-2"
                                  >
                                    <Plus size={14} className="text-blue-500" /> Thêm mới: {brandSearch}
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Stock Alert Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1 block mb-1.5">Ngày dự kiến hết hàng</label>
                        <input 
                          type="date" 
                          value={expectedOutOfStock}
                          onChange={(e) => setExpectedOutOfStock(e.target.value)}
                          className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-400 transition-all shadow-sm font-bold" 
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1 block mb-1.5">Ngưỡng báo tồn thấp</label>
                        <input 
                          type="number" 
                          value={lowStockThreshold}
                          onChange={(e) => setLowStockThreshold(e.target.value)}
                          className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-400 transition-all shadow-sm font-bold" 
                          placeholder="Báo khi < số lượng này..." 
                        />
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1 block mb-1.5">Mô tả / Thông số chi tiết</label>
                      <textarea 
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full p-3 bg-white border border-slate-200 rounded-2xl text-sm outline-none focus:border-blue-400 transition-all shadow-sm font-medium h-24 resize-none" 
                        placeholder="Thông tin thêm về sản phẩm..." 
                      />
                    </div>
                  </div>
                </div>

                {/* Left Column: Image & Settings - order-2 on mobile, lg:order-1 on desktop */}
                <div className="lg:col-span-4 space-y-4 order-2 lg:order-1">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 block ml-1">Hình ảnh & Media</label>
                    
                    <div className="space-y-4">
                      {/* Image Preview Area */}
                      <div 
                        className="w-full aspect-square bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all group relative"
                        onClick={() => setIsLibraryOpen(true)}
                      >
                        {image && !image.startsWith('data:') ? (
                          <>
                            <img src={image} alt="Product" className="w-full h-full object-contain p-2" referrerPolicy="no-referrer" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-xs uppercase tracking-widest backdrop-blur-[2px]">
                              Thay đổi ảnh
                            </div>
                          </>
                        ) : (
                          <div className="text-center">
                            <ImageIcon size={48} className="mx-auto text-slate-300 group-hover:text-blue-400 mb-2 transition-colors" />
                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest group-hover:text-blue-500">Chọn ảnh thư viện</span>
                          </div>
                        )}
                      </div>

                      {/* URL Input */}
                      <div className="relative">
                        <input 
                          type="text"
                          value={image || ''}
                          onChange={(e) => setImage(e.target.value)}
                          placeholder="Dán link ảnh tại đây..."
                          className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-400 focus:bg-white transition-all shadow-inner font-medium"
                        />
                        <ExternalLink size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      </div>

                      {/* Action Buttons */}
                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          type="button"
                          onClick={() => window.open(`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(name || 'mặt hàng')}`, '_blank')}
                          className="py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-2 shadow-sm"
                        >
                          <Search size={14} /> Tìm ảnh
                        </button>
                        <button 
                          type="button"
                          onClick={() => setIsLibraryOpen(true)}
                          className="py-2.5 bg-slate-900 text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-sm"
                        >
                          <ImageIcon size={14} /> Thư viện
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Type Selector */}
                  <div className="bg-slate-100 p-1 rounded-2xl flex gap-1 shadow-inner">
                    <button 
                      onClick={() => setPType('product')}
                      className={`flex-1 py-3 rounded-xl transition-all font-black text-[11px] uppercase tracking-widest ${pType === 'product' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Hàng hóa
                    </button>
                    <button 
                      onClick={() => setPType('service')}
                      className={`flex-1 py-3 rounded-xl transition-all font-black text-[11px] uppercase tracking-widest ${pType === 'service' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Dịch vụ
                    </button>
                  </div>

                  {/* Quick Settings */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
                    <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Trạng thái</label>
                      <select
                        value={pStatus}
                        onChange={(e) => setPStatus(e.target.value as any)}
                        className={`text-[11px] font-black p-1.5 rounded-lg outline-none border-none transition-all cursor-pointer ${pStatus === 'Đang kinh doanh' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}
                      >
                        <option value="Đang kinh doanh">Đang kinh doanh</option>
                        <option value="Ngừng kinh doanh">Ngừng kinh doanh</option>
                      </select>
                    </div>

                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-[11px] font-black text-slate-700 uppercase tracking-widest">Serial / IMEI</p>
                        <p className="text-[9px] text-slate-400 font-medium italic">QL sản phẩm có mã riêng</p>
                      </div>
                      <button 
                        onClick={() => setHasSerial(!hasSerial)}
                        className={`w-10 h-5 rounded-full transition-all relative ${hasSerial ? 'bg-blue-600' : 'bg-slate-300'}`}
                      >
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all shadow-sm ${hasSerial ? 'right-1' : 'left-1'}`} />
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            </div>
            
            <div className="p-4 bg-white border-t border-slate-100 shrink-0 flex gap-3 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.05)]">
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 bg-emerald-600 text-white p-4 rounded-2xl font-black text-xl shadow-lg shadow-emerald-100 active:scale-95 transition-all hover:bg-emerald-700 disabled:bg-slate-300 disabled:shadow-none flex items-center justify-center gap-3 uppercase tracking-widest"
              >
                {isSaving ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {saveStatus || 'Đang lưu bản ghi...'}
                  </>
                ) : (
                  'Lưu sản phẩm'
                )}
              </button>
              <button 
                onClick={handleCloseModal}
                className="px-6 py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl hover:bg-slate-200 transition-all md:hidden"
              >
                Hủy
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Mobile FAB for Add */}
      <button 
        onClick={() => {
          setSelectedProduct(null);
          resetForm();
          setIsModalOpen(true);
        }}
        className="md:hidden fixed bottom-24 right-4 w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-blue-200 z-40 active:scale-95 transition-transform"
      >
        <Plus size={24} />
      </button>

      <AnimatePresence>
        {isLibraryOpen && (
          <ImageLibraryModal 
            isOpen={true}
            onClose={() => setIsLibraryOpen(false)}
            defaultFilename={name || 'SanPham'}
            initialCategory="SanPham"
            onSelect={(url) => {
              setImage(url);
              setIsLibraryOpen(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
    </div>
  );
};


