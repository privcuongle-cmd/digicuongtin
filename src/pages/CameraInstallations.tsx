import React, { useState, useMemo, useEffect } from 'react';
import { Search, Plus, Camera as CameraIcon, User, Phone, MapPin, Calendar, Trash2, Edit3, MoreHorizontal, X, Save, Wifi, CreditCard, QrCode, ArrowRight, ShoppingBag, Image as ImageIcon, Loader2, ChevronLeft, ChevronRight, Clock, Shield, MessageCircle, PhoneCall } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { CameraInstallation, WifiRecord, CameraAccountRecord } from '../types';
import { generateId } from '../lib/idUtils';
import { useMobileBackModal } from '../hooks/useMobileBackModal';
import { formatDateTime, parseDateString } from '../lib/utils';
import { QRCodeSVG } from 'qrcode.react';

export const CameraInstallations: React.FC = () => {
  const { 
    customers, 
    wifiRecords, 
    cameraAccounts, 
    cameraInstallations,
    products,
    invoices,
    addCameraInstallation,
    updateCameraInstallation,
    deleteCameraInstallation,
    uploadImage,
    currentUser 
  } = useAppContext();
  
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<CameraInstallation | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  // Form state
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [installationDate, setInstallationDate] = useState(new Date().toISOString().split('T')[0]);
  const [productName, setProductName] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [installationImages, setInstallationImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [qrCode, setQrCode] = useState('');
  const [wifiId, setWifiId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [installationType, setInstallationType] = useState<CameraInstallation['installationType']>('Cường Tín Lắp');
  const [details, setDetails] = useState('');
  const [note, setNote] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  const [customerSuggestions, setCustomerSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filteredRecords = useMemo(() => {
    return (cameraInstallations || []).filter(r => 
      r.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.customerPhone.includes(searchTerm) ||
      (r.qrCode && r.qrCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (r.productName && r.productName.toLowerCase().includes(searchTerm.toLowerCase()))
    ).sort((a, b) => {
      const dateA = parseDateString(a.installationDate);
      const dateB = parseDateString(b.installationDate);
      if (dateB !== dateA) return dateB - dateA;
      // Tiebreaker: newer ID (monotonic) first
      return String(b.id || '').localeCompare(String(a.id || ''));
    });
  }, [cameraInstallations, searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, rowsPerPage]);

  const totalPages = Math.ceil(filteredRecords.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedRecords = filteredRecords.slice(startIndex, startIndex + rowsPerPage);

  const handleCustomerSearch = (val: string) => {
    setCustomerName(val);
    if (val.length > 1) {
      const filtered = (customers || []).filter(c => 
        c.name.toLowerCase().includes(val.toLowerCase()) || 
        c.phone.includes(val)
      ).slice(0, 5);
      setCustomerSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const selectCustomer = (c: any) => {
    setCustomerName(c.name);
    setCustomerPhone(c.phone);
    setCustomerId(c.id || '');
    setShowSuggestions(false);
  };

  const customerPurchasedProducts = React.useMemo(() => {
    if (!customerPhone || !invoices) return [];
    
    const customerInvoices = invoices.filter(inv => inv.phone === customerPhone);
    const purchasedItems = new Set<string>();
    
    customerInvoices.forEach(inv => {
      if (inv.items && Array.isArray(inv.items)) {
        inv.items.forEach(item => {
          if (item && item.name) {
            purchasedItems.add(item.name);
          }
        });
      }
    });
    
    return Array.from(purchasedItems);
  }, [invoices, customerPhone]);

  const handleCaptureImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        const filename = `CamInstall_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.jpg`;
        const res = await uploadImage(base64, filename, 'LapDatCamera');
        if (res && res.url) {
          setInstallationImages(prev => [...prev, res.url]);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Lỗi khi tải ảnh:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setCustomerName('');
    setCustomerPhone('');
    setCustomerId('');
    setInstallationDate(new Date().toISOString().split('T')[0]);
    setProductName('');
    setManufacturer('');
    setInstallationImages([]);
    setQrCode('');
    setWifiId('');
    setAccountId('');
    setInstallationType('Cường Tín Lắp');
    setDetails('');
    setNote('');
    setEditingRecord(null);
    setIsEditing(false);
  };

  const [isSaving, setIsSaving] = useState(false);
  
  const handleSave = async () => {
    if (!customerName) {
      alert('Vui lòng nhập tên khách hàng');
      return;
    }

    try {
      setIsSaving(true);
      const selectedWifi = wifiRecords.find(w => w.id === wifiId);
      const selectedAccount = cameraAccounts.find(a => a.id === accountId);

      const recordData = {
        customerId,
        customerName,
        customerPhone,
        installationDate,
        productName,
        manufacturer,
        installationImages,
        qrCode,
        wifiId,
        wifiName: selectedWifi?.wifiName,
        accountId,
        accountName: selectedAccount?.accountName,
        installationType,
        details,
        note,
      };

      if (editingRecord) {
        await updateCameraInstallation(editingRecord.id, recordData);
      } else {
        const newRecord: CameraInstallation = {
          ...recordData,
          id: generateId('CAMINST', cameraInstallations || []),
          createdAt: formatDateTime(new Date()),
          createdBy: currentUser?.name || 'Admin'
        };
        await addCameraInstallation(newRecord);
      }

      setShowAddModal(false);
      resetForm();
    } catch (error) {
      console.error('Lỗi khi lưu bản ghi:', error);
      alert('Có lỗi xảy ra khi lưu bản ghi. Vui lòng thử lại.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (record: CameraInstallation, forceEdit = false) => {
    setEditingRecord(record);
    setCustomerName(record.customerName);
    setCustomerPhone(record.customerPhone);
    setCustomerId(record.customerId || '');
    setInstallationDate(record.installationDate);
    setProductName(record.productName || '');
    setManufacturer(record.manufacturer || '');
    setInstallationImages(record.installationImages || []);
    setQrCode(record.qrCode || '');
    setWifiId(record.wifiId || '');
    setAccountId(record.accountId || '');
    setInstallationType(record.installationType);
    setDetails(record.details || '');
    setNote(record.note || '');
    setIsEditing(forceEdit);
    setShowAddModal(true);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const handleMessage = (phone: string) => {
    window.location.href = `sms:${phone}`;
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa bản ghi này? Tất cả hình ảnh cũng sẽ bị xóa.')) {
      deleteCameraInstallation(id);
      setShowAddModal(false);
    }
  };

  useMobileBackModal(showAddModal, () => setShowAddModal(false));
  useMobileBackModal(showSuggestions, () => setShowSuggestions(false));
  useMobileBackModal(!!editingRecord, () => setEditingRecord(null));
  useMobileBackModal(!!previewImage, () => setPreviewImage(null));

  useEffect(() => {
    if (location.state?.openAddFromCustomer) {
      const c = location.state.openAddFromCustomer;
      setCustomerName(c.name);
      setCustomerPhone(c.phone);
      setCustomerId(c.id || '');
      setShowAddModal(true);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const formatSerial = (serial: string | undefined): string => {
    if (!serial) return '---';
    // Check if it follows the {PID:...,SN:...,SC:...} format
    const snMatch = serial.match(/SN:([^,}\s]*)/);
    if (snMatch && snMatch[1]) {
      return `SN:${snMatch[1]}`;
    }
    return serial;
  };

  return (
    <div className="flex flex-col gap-3 md:gap-6 p-3 md:p-0">
      <div className="flex items-center justify-between gap-2 md:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight leading-tight">Quản lý Lắp Camera</h1>
          <p className="text-slate-500 text-[11px] md:text-sm mt-0.5 truncate">
            Tổng cộng: <span className="text-blue-600 font-bold">{filteredRecords.length}</span> bản ghi
          </p>
        </div>
        <button 
          onClick={() => { resetForm(); setShowAddModal(true); }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1.5 md:px-4 md:py-2.5 rounded-lg md:rounded-xl font-bold flex items-center justify-center gap-1 md:gap-1.5 shadow-md shadow-blue-200 transition-all active:scale-95 text-xs md:text-sm shrink-0 whitespace-nowrap"
        >
          <Plus size={15} className="md:size-[18px] shrink-0" />
          <span className="hidden sm:inline">Thêm bản ghi mới</span>
          <span className="sm:hidden">Thêm mới</span>
        </button>
      </div>

      <div className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-3 md:p-4 border-b border-slate-50 bg-slate-50/50 flex flex-col md:flex-row gap-2 md:gap-4 justify-between items-center">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text"
              placeholder="Tìm khách hàng, SĐT, mã QR..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-[13px] md:text-sm focus:border-blue-400 outline-none transition-all shadow-inner"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-[11px] uppercase tracking-widest font-bold">
                <th className="px-6 py-4">Khách hàng / Ngày</th>
                <th className="px-6 py-4">Mã QR & Kiểu lắp</th>
                <th className="px-6 py-4">Kết nối (Wifi/TK)</th>
                <th className="px-6 py-4">Chi tiết lắp đặt</th>
                <th className="px-6 py-4 text-right">Sửa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginatedRecords.length > 0 ? paginatedRecords.map((record, idx) => (
                <React.Fragment key={`desktop-cam-inst-${record.id || idx}`}>
                  <tr 
                    className={`hover:bg-slate-50/80 transition-colors group cursor-pointer ${expandedId === record.id ? 'bg-blue-50/30' : ''}`}
                    onClick={() => setExpandedId(expandedId === record.id ? null : record.id)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <div className="font-bold text-slate-700">{record.customerName}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                          {record.customerPhone}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          {record.installationDate ? new Date(record.installationDate).toLocaleDateString('vi-VN') : '---'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5">
                        {record.productName && (
                          <div className="text-xs font-bold text-blue-600">
                            {record.productName}
                          </div>
                        )}
                        {record.qrCode && (
                          <div className="text-[10px] font-mono font-bold text-slate-400 flex items-center gap-1">
                            <QrCode size={10} /> {formatSerial(record.qrCode)}
                          </div>
                        )}
                        <div className={`text-[10px] uppercase font-black tracking-tight px-2 py-0.5 rounded-full border w-fit ${
                          record.installationType === 'Cường Tín Lắp' ? 'bg-blue-50 border-blue-200 text-blue-600' :
                          record.installationType === 'Lắp Lấy công' ? 'bg-amber-50 border-amber-200 text-amber-600' :
                          'bg-slate-50 border-slate-200 text-slate-600'
                        }`}>
                          {record.installationType}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-500">
                      <div>W: {record.wifiName || '---'}</div>
                      <div>A: {record.accountName || '---'}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      <div className="max-w-[150px] truncate">{record.details || record.note || '---'}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleEdit(record, true); }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit3 size={18} />
                      </button>
                    </td>
                  </tr>
                </React.Fragment>
              )) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                    Không tìm thấy bản ghi lắp camera nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden bg-slate-50 p-3 space-y-2">
          {paginatedRecords.length > 0 ? paginatedRecords.map((record, idx) => (
            <div 
              key={`mobile-cam-inst-${record.id || idx}`} 
              className={`bg-white rounded-xl shadow-sm border transition-all ${expandedId === record.id ? 'border-blue-300 ring-1 ring-blue-100 shadow-md' : 'border-slate-200 shadow-sm'}`}
            >
              <div 
                className={`p-3 flex justify-between items-center gap-2 cursor-pointer active:bg-slate-50 transition-colors ${expandedId === record.id ? 'bg-blue-50/20' : ''}`}
                onClick={() => setExpandedId(expandedId === record.id ? null : record.id)}
              >
                <div className="flex-1 min-w-0 flex flex-col">
                  <div className="font-bold text-slate-800 text-[15px] truncate">{record.customerName}</div>
                  <div className="text-[11px] text-blue-600 font-semibold">{record.customerPhone}</div>
                  {record.qrCode && expandedId !== record.id && (
                    <div className="text-[10px] font-mono font-bold text-slate-400 bg-slate-50 px-1 rounded border border-slate-100 flex items-center gap-0.5 mt-0.5 w-fit">
                      <QrCode size={10} />
                      {formatSerial(record.qrCode)}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {expandedId !== record.id && record.installationImages && record.installationImages.length > 0 && (
                    <img 
                      src={record.installationImages[0]} 
                      alt="" 
                      className="w-12 h-12 rounded-lg object-cover border border-slate-200 shadow-sm cursor-zoom-in hover:opacity-95 active:scale-95 transition-all"
                      referrerPolicy="no-referrer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewImage(record.installationImages[0]);
                      }}
                    />
                  )}
                  {expandedId === record.id && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleEdit(record, true); }}
                      className="text-[11px] font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-lg border border-blue-100 flex items-center gap-1 active:scale-95 transition-all"
                    >
                      <Edit3 size={12} />
                      Sửa
                    </button>
                  )}
                </div>
              </div>

              {expandedId === record.id && (
                <div className="px-3 pb-3 pt-2 border-t border-slate-50 bg-slate-50/30 animate-in slide-in-from-top-2 duration-200">
                  <div className="flex flex-col gap-2">
                    {(record.wifiName || record.accountName) && (
                      <div className="flex flex-col gap-1.5 bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm w-full">
                        {record.wifiName && (
                          <div className="flex items-center gap-2 text-[12px] text-slate-600 font-bold">
                            <Wifi size={12} className="text-blue-400 shrink-0" /> 
                            <span>{record.wifiName}</span>
                          </div>
                        )}
                        {record.accountName && (
                          <div className="flex items-center gap-2 text-[12px] text-slate-600 font-bold">
                            <Shield size={12} className="text-emerald-500 shrink-0" /> 
                            <span>{record.accountName}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {record.qrCode && (
                      <div className="flex items-center gap-2 text-[12px] text-slate-600 font-bold px-1 bg-white/50 py-1.5 rounded-lg border border-slate-100/50 w-full mb-1">
                        <QrCode size={12} className="text-indigo-500 font-bold" /> 
                        <span className="font-mono">{formatSerial(record.qrCode)}</span>
                      </div>
                    )}

                    {record.note && (
                      <div className="mt-1 text-[11px] text-slate-500 font-medium px-1 italic">
                        Lưu ý: {record.note}
                      </div>
                    )}

                    <div className="mt-2 flex items-center justify-between px-1">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Ngày lắp</div>
                          <div className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter ${
                            record.installationType === 'Cường Tín Lắp' ? 'bg-blue-100 text-blue-700' : 
                            record.installationType === 'Lắp Lấy công' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {record.installationType}
                          </div>
                        </div>
                        <div className="text-[11px] font-bold text-slate-700">
                          {record.installationDate ? new Date(record.installationDate).toLocaleDateString('vi-VN') : '---'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Người tạo</div>
                        <div className="text-[11px] font-bold text-slate-700">{record.createdBy || 'Unknown'}</div>
                      </div>
                    </div>

                    {record.installationImages && record.installationImages.length > 0 ? (
                      <div className="mt-2 flex gap-3 items-center bg-white p-2 rounded-xl border border-slate-100 shadow-sm">
                        <div className="flex gap-1.5 overflow-x-auto pb-1 shrink-0 scrollbar-hide">
                          {record.installationImages.map((img, idx) => (
                            <img 
                              key={`expanded-img-${record.id}-${idx}`} 
                              src={img} 
                              alt="" 
                              className="w-16 h-16 rounded-xl object-cover border border-slate-200 shrink-0 shadow-sm cursor-pointer hover:opacity-90 active:scale-95 transition-all" 
                              referrerPolicy="no-referrer"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewImage(img);
                              }}
                            />
                          ))}
                        </div>
                        {record.productName && (
                          <div className="flex-1 min-w-0 pr-1 py-0.5">
                            <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1 mb-0.5">
                              <CameraIcon size={10} className="text-blue-500" />
                              <span>Thiết bị lắp</span>
                            </div>
                            <div className="text-[12px] font-extrabold text-slate-700 leading-snug line-clamp-3">
                              {record.productName}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      record.productName && (
                        <div className="mt-2 flex gap-3 items-center bg-white p-2 rounded-xl border border-slate-100 shadow-sm">
                          <div className="w-16 h-16 bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center justify-center shrink-0 text-slate-400 gap-1">
                            <CameraIcon size={20} />
                            <span className="text-[8px] font-bold uppercase tracking-wider">No Photo</span>
                          </div>
                          <div className="flex-1 min-w-0 pr-1 py-0.5">
                            <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1 mb-0.5">
                              <CameraIcon size={10} className="text-blue-500" />
                              <span>Thiết bị lắp</span>
                            </div>
                            <div className="text-[12px] font-extrabold text-slate-700 leading-snug line-clamp-3">
                              {record.productName}
                            </div>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          )) : (
            <div className="p-10 text-center text-slate-400 italic text-sm bg-white rounded-2xl border border-slate-100 uppercase tracking-widest font-bold">
              Trống
            </div>
          )}
        </div>

        {/* Pagination */}
        {filteredRecords.length > 0 && (
          <div className="px-4 py-3 md:px-6 md:py-4 border-t border-slate-50 bg-white flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4 text-[12px] md:text-sm">
            <div className="flex items-center gap-3">
              <span className="text-slate-500 font-medium whitespace-nowrap">Hiển thị</span>
              <select 
                value={rowsPerPage} 
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 focus:border-blue-400 outline-none text-slate-600 font-bold shadow-sm"
                disabled
              >
                <option value={20}>20</option>
              </select>
              <span className="text-slate-500 font-medium whitespace-nowrap">bản ghi</span>
            </div>
            
            <div className="flex items-center gap-4 md:gap-6">
              <span className="text-slate-400 font-medium hidden sm:inline italic">
                {startIndex + 1} - {Math.min(startIndex + rowsPerPage, filteredRecords.length)} trên {filteredRecords.length}
              </span>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 md:p-2 border border-slate-200 rounded-lg md:rounded-xl hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed bg-white transition-all shadow-sm"
                >
                  <ChevronLeft size={16} className="text-slate-600" />
                </button>
                <div className="flex items-center px-3 md:px-4 py-1.5 bg-blue-50 text-blue-600 rounded-lg md:rounded-xl font-bold border border-blue-100">
                  {currentPage} / {totalPages || 1}
                </div>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="p-1.5 md:p-2 border border-slate-200 rounded-lg md:rounded-xl hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed bg-white transition-all shadow-sm"
                >
                  <ChevronRight size={16} className="text-slate-600" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detail/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm sm:p-4 animate-in fade-in duration-200">
          <div className="bg-[#f8f9fa] sm:bg-white w-full h-full sm:h-auto sm:max-w-md sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-300">
            {/* Header */}
            <div className="px-4 py-3 flex items-center justify-between bg-white border-b border-slate-100">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="p-1 -ml-1 text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <ChevronLeft size={24} />
                </button>
                <h2 className="text-lg font-bold text-slate-800">
                  {editingRecord ? (isEditing ? 'Sửa lắp đặt' : 'Chi tiết lắp đặt') : 'Thêm bản ghi mới'}
                </h2>
              </div>
              {editingRecord && !isEditing && (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="p-2 text-blue-600 font-bold text-sm bg-blue-50 rounded-lg px-3 mr-2"
                >
                  Sửa
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {/* Images section first in View Mode on mobile */}
              {!isEditing && editingRecord && installationImages.length > 0 && (
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                  <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-2">Hình ảnh chụp</div>
                  <div className="grid grid-cols-2 gap-2">
                    {installationImages.map((img, i) => (
                      <img 
                        key={`view-img-${i}`} 
                        src={img} 
                        alt="" 
                        className="w-full aspect-square rounded-xl object-cover border border-slate-100 cursor-pointer hover:opacity-90 active:scale-95 transition-all animate-in fade-in" 
                        referrerPolicy="no-referrer" 
                        onClick={() => setPreviewImage(img)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Basic Info Section */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Thông tin khách hàng</span>
                </div>

                <div className="mb-4 relative">
                  <div className="relative">
                    <input 
                      type="text"
                      className={`w-full bg-transparent border-none focus:ring-0 p-0 text-lg font-bold text-slate-800 placeholder:text-slate-300 ${!isEditing ? 'cursor-default' : ''}`}
                      placeholder="Tên khách hàng"
                      value={customerName}
                      onChange={(e) => isEditing && handleCustomerSearch(e.target.value)}
                      readOnly={!isEditing}
                    />
                    {isEditing && showSuggestions && customerSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
                        {customerSuggestions.map(c => (
                          <div 
                            key={`modal-cust-sugg-${c.id}`} 
                            className="px-4 py-2.5 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0"
                            onClick={() => selectCustomer(c)}
                          >
                            <div className="font-bold text-slate-700 text-sm">{c.name}</div>
                            <div className="text-[11px] text-slate-500">{c.phone}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1">
                      <div className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">Số điện thoại</div>
                      <div className="flex items-center gap-2">
                        <input 
                          type="tel"
                          className={`bg-transparent border-none focus:ring-0 p-0 text-[14px] font-bold text-slate-700 w-full ${!isEditing ? 'cursor-default' : ''}`}
                          placeholder="Số điện thoại"
                          value={customerPhone}
                          onChange={(e) => isEditing && setCustomerPhone(e.target.value)}
                          readOnly={!isEditing}
                        />
                        <button onClick={() => handleCopy(customerPhone)} className="text-slate-300 p-1 shrink-0"><Plus size={14} className="rotate-45" /></button>
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button 
                        onClick={() => handleMessage(customerPhone)}
                        className="w-9 h-9 bg-slate-50 rounded-full flex items-center justify-center text-slate-500 border border-slate-100 active:scale-95 transition-all"
                      >
                        <MessageCircle size={18} />
                      </button>
                      <button 
                        onClick={() => handleCall(customerPhone)}
                        className="w-9 h-9 bg-slate-50 rounded-full flex items-center justify-center text-slate-500 border border-slate-100 active:scale-95 transition-all"
                      >
                        <PhoneCall size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-50">
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">Mã khách hàng</div>
                      <div className="text-[12px] font-bold text-slate-700">{customerId || '--'}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">Thời gian</div>
                      <div className="text-[12px] font-bold text-slate-700">{editingRecord ? formatDateTime(editingRecord.createdAt) : 'Mới'}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Installation Details Section */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                      <CameraIcon size={16} />
                    </div>
                    <span className="text-[12px] font-bold text-slate-700 uppercase tracking-tight">Chi tiết lắp đặt</span>
                  </div>
                  <div className="relative">
                    <input 
                      type="date"
                      className={`bg-transparent border-none focus:ring-0 p-0 text-[12px] font-black text-blue-600 uppercase text-right ${!isEditing ? 'cursor-default' : 'cursor-pointer'}`}
                      value={installationDate}
                      onChange={(e) => isEditing && setInstallationDate(e.target.value)}
                      readOnly={!isEditing}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100 space-y-3">
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1 tracking-wider">Tên thiết bị (Sản phẩm)</label>
                      <input 
                        type="text"
                        list="camera-inventory-list"
                        className={`w-full bg-white border border-slate-100 rounded-xl px-3 py-2 text-[14px] font-bold text-slate-800 focus:border-blue-300 outline-none transition-all ${!isEditing ? 'cursor-default' : ''}`}
                        placeholder="Nhập tên thiết bị..."
                        value={productName}
                        onChange={(e) => isEditing && setProductName(e.target.value)}
                        readOnly={!isEditing}
                      />
                      <datalist id="camera-inventory-list">
                        {customerPurchasedProducts.map((name, idx) => (
                          <option key={`modal-prod-opt-${idx}`} value={name} />
                        ))}
                      </datalist>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1 tracking-wider">Hãng sản xuất</label>
                        <input 
                          type="text"
                          list="manufacturer-list"
                          className={`w-full bg-white border border-slate-100 rounded-xl px-3 py-2 text-[13px] font-bold text-slate-700 focus:border-blue-300 outline-none transition-all ${!isEditing ? 'cursor-default' : ''}`}
                          placeholder="Hãng (Imou, Dahua...)"
                          value={manufacturer}
                          onChange={(e) => isEditing && setManufacturer(e.target.value)}
                          readOnly={!isEditing}
                        />
                        <datalist id="manufacturer-list">
                          <option value="Imou" />
                          <option value="Ezviz" />
                          <option value="Dahua" />
                          <option value="Hikvision" />
                          <option value="KBvision" />
                          <option value="TP-Link" />
                          <option value="Xiaomi" />
                        </datalist>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1 tracking-wider">Mã QR / Serial</label>
                        <div className="relative">
                          <input 
                            type="text"
                            className={`w-full bg-white border border-slate-100 rounded-xl px-3 py-2 text-[13px] font-mono font-bold text-blue-600 focus:border-blue-300 outline-none transition-all ${!isEditing ? 'cursor-default' : ''}`}
                            placeholder="Mã vạch..."
                            value={qrCode}
                            onChange={(e) => isEditing && setQrCode(e.target.value)}
                            readOnly={!isEditing}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/50">
                      <div>
                        <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1 tracking-wider">Wifi connection</label>
                        <select 
                          className={`w-full bg-white border border-slate-100 rounded-xl px-3 py-2 text-[12px] font-bold text-slate-700 focus:border-blue-300 outline-none appearance-none ${!isEditing ? 'cursor-default' : ''}`}
                          value={wifiId}
                          onChange={(e) => isEditing && setWifiId(e.target.value)}
                          disabled={!isEditing}
                        >
                          <option value="">-- Wifi --</option>
                          {wifiRecords.filter(w => w.customerName === customerName || !customerName).map(w => (
                            <option key={`modal-wifi-opt-${w.id}`} value={w.id}>{w.wifiName}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1 tracking-wider">Tài khoản quản lý</label>
                        <select 
                          className={`w-full bg-white border border-slate-100 rounded-xl px-3 py-2 text-[12px] font-bold text-slate-700 focus:border-blue-300 outline-none appearance-none ${!isEditing ? 'cursor-default' : ''}`}
                          value={accountId}
                          onChange={(e) => isEditing && setAccountId(e.target.value)}
                          disabled={!isEditing}
                        >
                          <option value="">-- Tài khoản --</option>
                          {cameraAccounts.filter(a => a.customerName === customerName || !customerName).map(a => (
                            <option key={`modal-acc-opt-${a.id}`} value={a.id}>{a.accountName}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Images Section in Edit Mode */}
              {isEditing && (
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Hình ảnh thiết bị</span>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded-full font-bold border border-blue-100"
                    >
                      THÊM ẢNH
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleCaptureImage} />
                  </div>
                  
                  <div className="flex gap-2 overflow-x-auto pb-1 min-h-[60px]">
                    {installationImages.map((img, i) => (
                      <div key={`modal-img-${i}`} className="relative group shrink-0">
                        <img src={img} alt="" className="w-16 h-16 rounded-xl object-cover border border-slate-200" referrerPolicy="no-referrer" />
                        <button
                          onClick={() => setInstallationImages(prev => prev.filter((_, idx) => idx !== i))}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-white text-rose-500 rounded-full shadow-sm border border-slate-100 flex items-center justify-center"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    ))}
                    {isUploading && (
                      <div className="w-16 h-16 rounded-xl bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center">
                        <Loader2 size={16} className="animate-spin text-blue-400" />
                      </div>
                    )}
                    {installationImages.length === 0 && !isUploading && (
                      <div className="flex-1 flex items-center justify-center text-[11px] text-slate-300 italic py-4">Chưa có ảnh chụp</div>
                    )}
                  </div>
                </div>
              )}

              {/* Note Section */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Ghi chú & Địa chỉ</div>
                <textarea 
                  className={`w-full bg-transparent border-none focus:ring-0 p-0 text-[13px] font-medium text-slate-600 resize-none min-h-[40px] ${!isEditing ? 'cursor-default' : ''}`}
                  placeholder="Vị trí lắp, lưu ý khác..."
                  value={details || note}
                  onChange={(e) => isEditing && setDetails(e.target.value)}
                  readOnly={!isEditing}
                />
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 bg-white border-t border-slate-100 flex flex-col gap-3">
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition-all active:scale-95 text-sm"
                >
                  Đóng
                </button>
                {(!editingRecord || isEditing) && (
                  <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className={`flex-[2] bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-2xl font-bold shadow-lg shadow-blue-200 transition-all active:scale-95 text-sm flex items-center justify-center gap-2 ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Đang lưu...
                      </>
                    ) : (
                      editingRecord ? 'Lưu thay đổi' : 'Lưu bản ghi'
                    )}
                  </button>
                )}
              </div>
              
              {editingRecord && isEditing && (
                <button 
                  onClick={() => handleDelete(editingRecord.id)}
                  className="w-full py-2.5 text-rose-500 font-bold text-[13px] hover:bg-rose-50 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 size={16} />
                  Xóa bản ghi này
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Full Resolution Image Lightbox/Preview Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/95 backdrop-blur-md p-4 animate-in fade-in duration-200 cursor-zoom-out"
          onClick={() => setPreviewImage(null)}
        >
          {/* Close button */}
          <button 
            onClick={() => setPreviewImage(null)}
            className="absolute top-4 right-4 z-[110] p-2 rounded-full bg-slate-900/50 hover:bg-slate-800 text-white transition-all active:scale-90 border border-white/10"
          >
            <X size={20} />
          </button>
          
          <img 
            src={previewImage} 
            alt="Full size installation preview" 
            className="max-h-[85vh] max-w-full md:max-w-4xl object-contain rounded-xl md:rounded-2xl border border-white/10 shadow-2xl animate-in zoom-in-95 duration-300" 
            referrerPolicy="no-referrer"
            onClick={(e) => e.stopPropagation()} // stop close when click on image
          />
        </div>
      )}
    </div>
  );
};
