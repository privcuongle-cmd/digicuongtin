import React, { useState, useEffect } from 'react';
import { X, Wifi, Camera as CameraIcon, Wrench, ClipboardList, User, Phone, MapPin, Clock, Edit3, Plus, Shield, Search, ShoppingBag, Globe, Calendar, CheckCircle2, ChevronRight, Save, QrCode, Image as ImageIcon, Loader2, Trash2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Customer } from '../types';
import { formatDateTime } from '../lib/utils';
import { generateId } from '../lib/idUtils';

interface CustomerQuickAddModalProps {
  type: 'WIFI' | 'CAMERA' | 'CAMERA_INSTALL' | 'MAINTENANCE' | 'TASK' | null;
  customer: Customer | null;
  onClose: () => void;
}

export const CustomerQuickAddModal: React.FC<CustomerQuickAddModalProps> = ({ type, customer, onClose }) => {
  const { addWifiRecord, addCameraAccount, addCameraInstallation, addMaintenanceRecord, addTask, currentUser, maintenanceRecords, tasks, wifiRecords, cameraAccounts, cameraInstallations, products, invoices, uploadImage } = useAppContext();
  
  // Generic states
  const [note, setNote] = useState('');
  
  // Wifi
  const [wifiName, setWifiName] = useState('');

  // Camera
  const [accountName, setAccountName] = useState('');
  const [cameraBrand, setCameraBrand] = useState('');

  // Camera Installation
  const [qrCode, setQrCode] = useState('');
  const [installationDate, setInstallationDate] = useState(new Date().toISOString().split('T')[0]);
  const [wifiId, setWifiId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [installationType, setInstallationType] = useState<'Cường Tín Lắp'| 'Lắp Lấy công'| 'Khách mua tự lắp'>('Cường Tín Lắp');
  const [details, setDetails] = useState('');
  const [installationImages, setInstallationImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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

  // Maintenance
  const [deviceSource, setDeviceSource] = useState<'STORE' | 'EXTERNAL'>('STORE');
  const [productName, setProductName] = useState('');
  const [issue, setIssue] = useState('');
  const [cost, setCost] = useState('0');
  const [serialNumber, setSerialNumber] = useState('');

  // Task
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    if (!type) {
      setWifiName('');
      setAccountName('');
      setCameraBrand('');
      setProductName('');
      setIssue('');
      setCost('0');
      setSerialNumber('');
      setTitle('');
      setDescription('');
      setPriority('MEDIUM');
      setDueDate('');
      setNote('');
      setDeviceSource('STORE');
      setQrCode('');
      setInstallationDate(new Date().toISOString().split('T')[0]);
      setWifiId('');
      setAccountId('');
      setInstallationType('Cường Tín Lắp');
      setDetails('');
    }
  }, [type]);

  const customerPurchasedProducts = React.useMemo(() => {
    if (!customer?.phone || !invoices) return [];
    
    const customerInvoices = invoices.filter(inv => inv.phone === customer.phone);
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
  }, [invoices, customer?.phone]);

  if (!type || !customer) return null;

  const handleSaveWifi = () => {
    if (!wifiName) return alert('Vui lòng nhập tên Wifi');
    addWifiRecord({
      id: generateId('WF', wifiRecords),
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerAddress: customer.address || customer.location || '',
      wifiName,
      note,
      createdAt: formatDateTime(new Date()),
      createdBy: currentUser?.name || 'Admin',
    });
    onClose();
  };

  const handleSaveCamera = () => {
    if (!accountName) return alert('Vui lòng nhập tên tài khoản');
    addCameraAccount({
      id: generateId('CA', cameraAccounts),
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerAddress: customer.address || customer.location || '',
      accountName,
      cameraBrand,
      note,
      createdAt: formatDateTime(new Date()),
      createdBy: currentUser?.name || 'Admin',
    });
    onClose();
  };

  const handleSaveMaintenance = () => {
    if (!productName || !issue) return alert('Vui lòng nhập tên sản phẩm và tình trạng');
    addMaintenanceRecord({
      id: generateId('BH', maintenanceRecords),
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      productName,
      serialNumber,
      issue,
      status: 'RECEIVING',
      cost: Number(cost.replace(/[^0-9]/g, '')) || 0,
      paidAmount: 0,
      date: new Date().toISOString().split('T')[0],
    });
    onClose();
  };

  const handleSaveTask = () => {
    if (!title) return alert('Vui lòng nhập tiêu đề');
    addTask({
      id: generateId('CV', tasks),
      title,
      description,
      status: 'TODO',
      priority,
      dueDate: dueDate || undefined,
      assignedTo: '',
      createdBy: currentUser?.name || 'Admin',
      createdAt: new Date().toISOString(),
      customerId: customer.id,
    });
    onClose();
  };

  const handleSaveInstallation = () => {
    if (!customer) return;
    const selectedWifi = wifiRecords.find(w => w.id === wifiId);
    const selectedAccount = cameraAccounts.find(a => a.id === accountId);

    addCameraInstallation({
      id: generateId('CAMINST', cameraInstallations || []),
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      installationDate,
      productName,
      installationImages,
      qrCode,
      wifiId,
      wifiName: selectedWifi?.wifiName,
      accountId,
      accountName: selectedAccount?.accountName,
      installationType,
      details,
      note,
      createdAt: formatDateTime(new Date()),
      createdBy: currentUser?.name || 'Admin'
    });
    onClose();
  };

  // ---------------------------------------------
  // RENDER WIFI MODAL (Exact match to WifiManagement)
  // ---------------------------------------------
  if (type === 'WIFI') {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Plus size={24} className="text-blue-500" />
              Thêm Wifi mới
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Customer Search (Disabled/Fixed) */}
            <div className="space-y-1.5 relative">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Tên khách hàng</label>
              <div className="relative">
                <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text"
                  className="w-full pl-10 pr-4 py-3 bg-slate-100/50 border border-slate-200 rounded-2xl text-[15px] font-bold text-slate-600 outline-none"
                  value={customer.name}
                  readOnly
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Số điện thoại</label>
                <div className="relative">
                  <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text"
                    className="w-full pl-10 pr-4 py-3 bg-slate-100/50 border border-slate-200 rounded-2xl text-[15px] font-bold text-slate-600 outline-none"
                    value={customer.phone}
                    readOnly
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Tên Wifi (SSID)</label>
                <div className="relative">
                  <Wifi size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:border-blue-400 outline-none text-[15px] font-medium transition-all"
                    placeholder="SSID / Pass..."
                    value={wifiName}
                    onChange={(e) => setWifiName(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Địa chỉ</label>
              <div className="relative">
                <MapPin size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text"
                  className="w-full pl-10 pr-4 py-3 bg-slate-100/50 border border-slate-200 rounded-2xl text-[15px] font-bold text-slate-600 outline-none"
                  value={customer.address || customer.location || ''}
                  readOnly
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Ghi chú (Tùy chọn)</label>
              <textarea 
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:border-blue-400 outline-none text-[15px] transition-all min-h-[100px]"
                placeholder="Thông tin thêm..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>

          <div className="p-6 border-t border-slate-100 bg-slate-50">
            <button 
              onClick={handleSaveWifi}
              disabled={!wifiName}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-lg shadow-lg shadow-blue-200 transition-all disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
            >
              <Plus size={20} /> Thêm Wifi
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------
  // RENDER CAMERA MODAL (Exact match to CameraManagement)
  // ---------------------------------------------
  if (type === 'CAMERA') {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <CameraIcon size={24} className="text-emerald-500" />
              Thêm tài khoản Camera mới
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Customer Search (Fixed) */}
            <div className="space-y-1.5 relative">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Tên khách hàng</label>
              <div className="relative">
                <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text"
                  className="w-full pl-10 pr-4 py-3 bg-slate-100/50 border border-slate-200 rounded-2xl text-[15px] font-bold text-slate-600 outline-none"
                  value={customer.name}
                  readOnly
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Số điện thoại</label>
                <div className="relative">
                  <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text"
                    className="w-full pl-10 pr-4 py-3 bg-slate-100/50 border border-slate-200 rounded-2xl text-[15px] font-bold text-slate-600 outline-none"
                    value={customer.phone}
                    readOnly
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Hãng Camera</label>
                <div className="relative">
                  <CameraIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:border-emerald-400 outline-none text-[15px] font-medium transition-all"
                    placeholder="Hikvision, Ezviz..."
                    value={cameraBrand}
                    onChange={(e) => setCameraBrand(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Tên tài khoản (user/pass)</label>
              <div className="relative">
                <Shield size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:border-emerald-400 outline-none text-[15px] font-medium transition-all"
                  placeholder="admin / user / pass..."
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Địa chỉ</label>
              <div className="relative">
                <MapPin size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text"
                  className="w-full pl-10 pr-4 py-3 bg-slate-100/50 border border-slate-200 rounded-2xl text-[15px] font-bold text-slate-600 outline-none"
                  value={customer.address || customer.location || ''}
                  readOnly
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Ghi chú (Tùy chọn)</label>
              <textarea 
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:border-emerald-400 outline-none text-[15px] transition-all min-h-[100px]"
                placeholder="Thông tin thêm..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>

          <div className="p-6 border-t border-slate-100 bg-slate-50">
            <button 
              onClick={handleSaveCamera}
              disabled={!accountName}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-lg shadow-lg shadow-emerald-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Save size={20} /> Lưu thông tin
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------
  // RENDER MAINTENANCE MODAL (Exact match to Maintenance)
  // ---------------------------------------------
  if (type === 'MAINTENANCE') {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
        <div className="bg-white w-full max-w-lg max-h-[90vh] flex flex-col rounded-xl shadow-2xl animate-in fade-in zoom-in duration-200 overflow-hidden">
          <div className="flex justify-between items-center p-6 border-b border-slate-100 shrink-0">
            <h3 className="text-lg font-bold text-slate-800 tracking-tight">Tiếp nhận bảo hành / sửa chữa</h3>
            <button onClick={onClose} className="w-8 h-8 bg-slate-50 text-slate-400 rounded-full hover:bg-slate-200 transition-colors flex items-center justify-center">
              <X size={18} />
            </button>
          </div>
          
          <div className="p-6 space-y-4 flex-1 overflow-y-auto no-scrollbar">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 relative group">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 shrink-0 bg-white shadow-sm">
                  <User size={14} />
                </div>
                <div className="flex-1 overflow-hidden flex items-center justify-between gap-4">
                  <div className="truncate">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest leading-none mb-1">Khách hàng</p>
                    <p className="text-sm font-bold text-slate-800 truncate">{customer.name}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex items-center justify-end text-[12px]">
                      <span className="text-slate-400 font-bold mr-1">ĐT:</span>
                      <span className="text-slate-600 font-medium">{customer.phone || '---'}</span>
                    </div>
                    <div className="flex items-center justify-end text-[11px] mt-0.5">
                      <span className="text-slate-400 font-bold mr-1">Đ/C:</span>
                      <span className="text-slate-500 font-medium truncate max-w-[150px]">{customer.address || customer.location || '---'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl">
              <div className="flex flex-wrap items-center gap-4 mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    checked={deviceSource === 'STORE'}
                    onChange={() => setDeviceSource('STORE')}
                    className="text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span className="text-sm font-bold text-slate-700 flex items-center gap-1.5"><ShoppingBag size={14} className="text-slate-400" /> Đã mua tại shop (Hệ thống mới)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    checked={deviceSource === 'EXTERNAL'}
                    onChange={() => setDeviceSource('EXTERNAL')}
                    className="text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span className="text-sm font-bold text-slate-700 flex items-center gap-1.5"><Globe size={14} className="text-slate-400" /> Máy ngoài / Serial mở rộng</span>
                </label>
              </div>

              <div className="space-y-3">
                {deviceSource === 'STORE' ? (
                  <div className="p-3 text-center text-xs text-slate-500 italic bg-white border border-slate-200 rounded-lg">
                    Tính năng chọn từ hoá đơn chỉ có trong màn Bảo Hành chi tiết. <br/>Vui lòng chọn <b>"Máy ngoài"</b> hoặc vào trang Bảo Hành để tìm kiếm.
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <label className="text-[10px] font-semibold text-slate-400 tracking-wider ml-1 mb-1 block uppercase">Tên Sản Phẩm / Model</label>
                      <input 
                        type="text" 
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                        className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm font-medium outline-none focus:border-blue-400 shadow-sm transition-colors" 
                        placeholder="Nhập tên thiết bị (Vd: Camera Imou, Laptop Dell...)" 
                      />
                    </div>
                    <div className="relative">
                      <label className="text-[10px] font-semibold text-slate-400 tracking-wider ml-1 mb-1 block uppercase">Số Serial / IMEI / MAC (Nếu có)</label>
                      <input 
                        type="text" 
                        value={serialNumber}
                        onChange={(e) => setSerialNumber(e.target.value)}
                        className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm font-mono font-bold text-indigo-700 outline-none focus:border-indigo-400 shadow-sm transition-colors uppercase" 
                        placeholder="Nhập số Serial..." 
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 tracking-wider ml-1 mb-1 block uppercase">
                  Tình trạng lỗi / Yêu cầu xử lý <span className="text-red-500">*</span>
                </label>
                <textarea 
                  value={issue}
                  onChange={(e) => setIssue(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-pink-400 min-h-[100px] transition-colors resize-none placeholder-slate-400"
                  placeholder="Mô tả chi tiết tình trạng máy khi nhận..."
                ></textarea>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-400 tracking-wider ml-1 mb-1 block uppercase">Dự kiến chi phí (VND)</label>
                <input 
                  type="text" 
                  value={cost}
                  onChange={(e) => {
                    const val = parseInt(e.target.value.replace(/\D/g, '')) || 0;
                    setCost(val === 0 ? '0' : val.toLocaleString());
                  }}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-base font-bold text-slate-800 outline-none focus:border-pink-400 transition-colors"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-slate-100 flex gap-3 shrink-0 bg-slate-50">
            <button onClick={onClose} className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 rounded-lg font-bold hover:bg-slate-50 transition-colors shadow-sm">
              Hủy bỏ
            </button>
            <button 
              onClick={handleSaveMaintenance}
              disabled={(!productName && deviceSource === 'EXTERNAL') || !issue}
              className="flex-[2] py-3 bg-slate-800 text-white rounded-lg font-bold hover:bg-slate-900 transition-all shadow-md disabled:bg-slate-300 disabled:cursor-not-allowed flex justify-center items-center gap-2"
            >
              <CheckCircle2 size={18} />
              Tiếp nhận thiết bị
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------
  // RENDER TASK MODAL (Exact match to Tasks)
  // ---------------------------------------------
  if (type === 'TASK') {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-0 md:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white w-full max-w-5xl rounded-none md:rounded-3xl overflow-hidden shadow-2xl h-full md:h-auto md:max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-4 duration-300">
          <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 text-white rounded-2xl shadow-lg flex items-center justify-center">
                <Edit3 size={20} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800 tracking-tighter">
                  Tạo công việc mới
                </h3>
                <p className="text-[10px] text-slate-400 font-bold italic leading-none mt-0.5">Điền thông tin chi tiết nhiệm vụ</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-full text-slate-400 hover:bg-slate-100 transition-all"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-6 flex-1 md:max-h-[70vh] overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
              {/* Left Column */}
              <div className="md:col-span-7 space-y-5">
                <div className="space-y-1.5 pt-2">
                  <label className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-wider">Gắn với khách hàng <span className="text-red-500">*</span></label>
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between group h-fit">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm">
                        <User size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-800 leading-none">
                          {customer.name}
                        </p>
                        <p className="text-[10px] text-slate-500 font-bold mt-1 italic">
                          {customer.phone}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-wider">Nội dung công việc</label>
                  <textarea 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-[15px] shadow-sm outline-none focus:border-blue-500 focus:bg-white transition-all font-bold text-slate-800 min-h-[120px] resize-none"
                    placeholder="VD: Cập nhật phần mềm camera, sửa lỗi mạng..."
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-wider">Mô tả thêm (Tùy chọn)</label>
                  <textarea 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm shadow-sm outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-600 min-h-[100px] resize-none leading-relaxed"
                    placeholder="Các ghi chú hoặc yêu cầu chi tiết..."
                  />
                </div>
              </div>

              {/* Right Column */}
              <div className="md:col-span-5 space-y-6">
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-wider flex items-center gap-2">
                      <Calendar size={12} /> Hạn chót
                    </label>
                    <input 
                      type="datetime-local" 
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-bold shadow-sm outline-none focus:border-blue-500 transition-all text-slate-700"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-wider">Mức độ ưu tiên</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { val: 'LOW', label: 'Bình thường', color: 'slate' },
                        { val: 'MEDIUM', label: 'Quan trọng', color: 'blue' },
                        { val: 'HIGH', label: 'Cao', color: 'orange' },
                        { val: 'CRITICAL', label: 'Khẩn cấp', color: 'red' },
                      ].map(p => (
                        <button
                          key={p.val}
                          type="button"
                          onClick={() => setPriority(p.val as any)}
                          className={`p-3 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                            priority === p.val 
                              ? `bg-${p.color}-100 border-${p.color}-300 text-${p.color}-700 shadow-inner` 
                              : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                          }`}
                        >
                          <div className={`w-2 h-2 rounded-full bg-${p.color}-500`}></div>
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 mt-auto md:mt-0 pb-12 md:pb-6">
            <button 
              onClick={onClose}
              className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-black hover:bg-slate-100 transition-all"
            >
              Hủy
            </button>
            <button 
              onClick={handleSaveTask}
              disabled={!title}
              className="px-8 py-3 bg-blue-600 text-white rounded-xl font-black hover:bg-blue-700 transition-all shadow-lg flex items-center gap-2 active:scale-95 disabled:opacity-50 disabled:active:scale-100"
            >
              <Save size={18} /> Lưu công việc
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------
  // RENDER CAMERA INSTALL MODAL
  // ---------------------------------------------
  if (type === 'CAMERA_INSTALL') {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <CameraIcon size={24} className="text-blue-500" />
              Ghi bản lắp Camera mới
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto no-scrollbar">
            <div className="space-y-1.5 relative">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Khách hàng (Cố định)</label>
              <div className="flex flex-col p-3 bg-blue-50 border border-blue-100 rounded-2xl">
                <span className="font-bold text-slate-800">{customer.name}</span>
                <span className="text-xs text-slate-500">{customer.phone}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Ngày lắp đặt</label>
                <div className="relative">
                  <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="date"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:border-blue-400 outline-none text-[15px] font-medium transition-all"
                    value={installationDate}
                    onChange={(e) => setInstallationDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Mã QR Record</label>
                <div className="relative">
                  <QrCode size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:border-blue-400 outline-none text-[15px] font-medium transition-all"
                    placeholder="Quét hoặc nhập mã QR..."
                    value={qrCode}
                    onChange={(e) => setQrCode(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Wifi (Tại nhà khách)</label>
                <div className="relative">
                  <Wifi size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select 
                    className="w-full pl-10 pr-6 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:border-blue-400 outline-none text-[15px] font-medium transition-all appearance-none"
                    value={wifiId}
                    onChange={(e) => setWifiId(e.target.value)}
                  >
                    <option value="">-- Chọn Wifi --</option>
                    {wifiRecords.filter(w => w.customerPhone === customer.phone).map(w => (
                      <option key={w.id} value={w.id}>{w.wifiName}</option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <ChevronRight size={16} className="text-slate-400 rotate-90" />
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Tài khoản Camera</label>
                <div className="relative">
                  <CameraIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select 
                    className="w-full pl-10 pr-6 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:border-blue-400 outline-none text-[15px] font-medium transition-all appearance-none"
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                  >
                    <option value="">-- Chọn TK --</option>
                    {cameraAccounts.filter(a => a.customerPhone === customer.phone).map(a => (
                      <option key={a.id} value={a.id}>{a.accountName} - {a.cameraBrand}</option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <ChevronRight size={16} className="text-slate-400 rotate-90" />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Tên thiết bị (Sản phẩm)</label>
              <div className="relative">
                <ShoppingBag size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text"
                  list="camera-inventory-list"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:border-blue-400 outline-none text-[15px] font-medium transition-all"
                  placeholder="Nhập hoặc chọn tên thiết bị..."
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                />
                <datalist id="camera-inventory-list">
                  {customerPurchasedProducts.map((name, idx) => (
                    <option key={`purchased-opt-${name}-${idx}`} value={name} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Kiểu lắp đặt</label>
              <div className="grid grid-cols-3 gap-2">
                {(['Cường Tín Lắp', 'Lắp Lấy công', 'Khách mua tự lắp'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setInstallationType(t)}
                    className={`py-2 rounded-xl text-[12px] font-bold border transition-all ${
                      installationType === t 
                      ? 'bg-blue-600 border-blue-600 text-white shadow-md' 
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Chi tiết lắp đặt</label>
              <textarea 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:border-blue-400 outline-none text-[15px] transition-all resize-none h-20"
                placeholder="Vị trí lắp, phụ kiện..."
                value={details}
                onChange={(e) => setDetails(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Hình ảnh thiết bị đã lắp</label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-blue-600 text-[11px] font-bold flex items-center gap-1 hover:text-blue-700 transition-colors"
                >
                  <CameraIcon size={14} /> THÊM ẢNH
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleCaptureImage}
                />
              </div>
              
              {installationImages.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {installationImages.map((img, idx) => (
                    <div key={`inst-img-${idx}`} className="relative aspect-video bg-slate-100 rounded-xl overflow-hidden border border-slate-200 group">
                      <img src={img} alt={`Installation ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setInstallationImages(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 w-6 h-6 bg-white/80 text-rose-600 rounded-md items-center justify-center hidden group-hover:flex shadow-sm hover:bg-white"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {isUploading && (
                    <div className="aspect-video bg-slate-100 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center">
                      <Loader2 size={20} className="animate-spin text-blue-500 mb-1" />
                      <span className="text-[10px] font-medium text-slate-500">Đang tải...</span>
                    </div>
                  )}
                </div>
              ) : (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-6 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-500 transition-colors cursor-pointer"
                >
                  {isUploading ? (
                    <Loader2 size={24} className="animate-spin mb-2" />
                  ) : (
                    <ImageIcon size={24} className="mb-2" />
                  )}
                  <span className="text-[13px] font-medium">{isUploading ? 'Đang tải ảnh...' : 'Nhấn để thêm ảnh'}</span>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Ghi chú thêm</label>
              <input 
                type="text"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:border-blue-400 outline-none text-[15px] transition-all"
                placeholder="Ghi chú khác..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>

          <div className="p-6 bg-slate-50 border-t border-slate-100">
            <button 
              onClick={handleSaveInstallation}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-lg shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Save size={20} /> Lưu bản lắp
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
