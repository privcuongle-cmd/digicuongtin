import React, { useState, useEffect } from 'react';
import { UserPlus, User, X, Map, MapPin, Loader2, Phone, Image as ImageIcon, Camera as CameraIcon, HelpCircle, UserCircle, Info, Check, Edit3 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Customer } from '../types';
import { ImageLibraryModal } from './ImageLibraryModal';
import { useScrollLock } from '../hooks/useScrollLock';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { useMobileBackModal } from '../hooks/useMobileBackModal';
import { formatDateTime } from '../lib/utils';

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialName?: string;
  customerToEdit?: Customer | null;
  onSuccess?: (customer: Customer) => void;
}

export const AddCustomerModal: React.FC<AddCustomerModalProps> = ({ isOpen, onClose, initialName = '', customerToEdit = null, onSuccess }) => {
  const { customers, addCustomer, updateCustomer, currentUser, uploadImage } = useAppContext();
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState('');
  const [phone2, setPhone2] = useState('');
  const [address, setAddress] = useState('');
  const [location, setLocation] = useState('');
  const [note, setNote] = useState('');
  const [image, setImage] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);

  const [validationError, setValidationError] = useState<string | null>(null);

  const captureInputRef = React.useRef<HTMLInputElement>(null);

  const handleQuickCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        const filename = `${name || 'KhachHang'}_${Date.now()}.jpg`;
        const res = await uploadImage(base64, filename, 'KhachHang');
        if (res) {
          setImage(res.url);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Lỗi khi tải ảnh:', error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (customerToEdit) {
        setName(customerToEdit.name || '');
        setPhone(customerToEdit.phone || '');
        setPhone2(customerToEdit.phone2 || '');
        setAddress(customerToEdit.address || '');
        setLocation(customerToEdit.location || '');
        setNote(customerToEdit.note || '');
        setImage(customerToEdit.image || '');
      } else {
        setName(initialName);
        setPhone('');
        setPhone2('');
        setAddress('');
        setLocation('');
        setNote('');
        setImage('');
      }
      setValidationError(null);
    }
  }, [isOpen, initialName, customerToEdit]);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Trình duyệt của bạn không hỗ trợ định vị.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const coords = `${latitude}, ${longitude}`;
        setLocation(coords);
        
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`, {
            headers: {
              'Accept-Language': 'vi'
            }
          });
          const data = await response.json();
          if (data && data.display_name) {
            setAddress(data.display_name);
          }
        } catch (error) {
          console.error('Error reverse geocoding:', error);
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        setIsLocating(false);
        let msg = 'Lỗi lấy vị trí.';
        if (error.code === error.PERMISSION_DENIED) msg = 'Bạn đã từ chối quyền truy cập vị trí.';
        else if (error.code === error.POSITION_UNAVAILABLE) msg = 'Thông tin vị trí không khả dụng.';
        else if (error.code === error.TIMEOUT) msg = 'Hết thời gian chờ lấy vị trí.';
        alert(msg);
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  };

  const handleSave = () => {
    setValidationError(null);
    if (!name || !phone) {
      setValidationError("Vui lòng nhập đủ tên và số điện thoại");
      return;
    }
    
    // Normalize phone (ensure starts with 0)
    let normalizedPhone = phone.trim();
    if (normalizedPhone && !normalizedPhone.startsWith('0')) {
      normalizedPhone = '0' + normalizedPhone;
    }

    // Check for duplicate phone number
    const existingCustomer = customers.find(c => 
      (c.phone === normalizedPhone || (c.phone2 && c.phone2 === normalizedPhone)) && 
      (!customerToEdit || c.id !== customerToEdit.id)
    );

    if (existingCustomer) {
      setValidationError(`SĐT ${normalizedPhone} đã tồn tại: ${existingCustomer.name} (${existingCustomer.id})`);
      return;
    }

    if (phone2) {
      let normalizedPhone2 = phone2.trim();
      if (normalizedPhone2 && !normalizedPhone2.startsWith('0')) {
        normalizedPhone2 = '0' + normalizedPhone2;
      }
      
      const existingCustomer2 = customers.find(c => 
        (c.phone === normalizedPhone2 || (c.phone2 && c.phone2 === normalizedPhone2)) && 
        (!customerToEdit || c.id !== customerToEdit.id)
      );
      if (existingCustomer2) {
        setValidationError(`SĐT phụ ${normalizedPhone2} đã tồn tại: ${existingCustomer2.name}`);
        return;
      }
    }

    if (customerToEdit && customerToEdit.id) {
      const updatedData: Customer = {
        ...customerToEdit,
        name: name.trim(),
        phone: normalizedPhone,
        phone2: phone2.trim(),
        address: address.trim(),
        location: location.trim(),
        note: note.trim(),
        image,
      };
      updateCustomer(customerToEdit.id, updatedData);
      if (onSuccess) onSuccess(updatedData);
    } else {
      const customerData: Omit<Customer, 'id'> = { 
        name: name.trim(), 
        phone: normalizedPhone, 
        phone2: phone2.trim(),
        address: address.trim(), 
        location: location.trim(), 
        note: note.trim(),
        image,
        createdBy: currentUser?.name || 'Admin',
        createdAt: formatDateTime(new Date())
      };

      const newCustomer = addCustomer(customerData);
      if (onSuccess) {
        onSuccess(newCustomer);
      }
    }
    onClose();
  };

  useScrollLock(isOpen);
  useEscapeKey(onClose, isOpen);
  useMobileBackModal(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-0 md:p-4 bg-slate-900/60 backdrop-blur-sm print:hidden animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-5xl md:rounded-3xl rounded-none shadow-2xl overflow-hidden flex flex-col h-full md:h-auto md:max-h-[90vh] animate-in zoom-in-95 duration-300">
        {/* Modal Header */}
        <div className="flex justify-between items-center p-5 md:p-8 border-b border-slate-100 shrink-0 bg-white shadow-sm relative z-10">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 ${customerToEdit ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'} rounded-2xl flex items-center justify-center shadow-inner`}>
              {customerToEdit ? <Edit3 size={24} /> : <UserPlus size={24} />}
            </div>
            <div>
              <h3 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tighter">
                {customerToEdit ? 'Cập Nhật Khách Hàng' : 'Thêm Khách Hàng Mới'}
              </h3>
              <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">
                {customerToEdit ? `Đang chỉnh sửa: ${customerToEdit.name}` : 'Nhập thông tin chi tiết khách hàng để lưu vào hệ thống'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-100 hover:text-slate-600 transition-all flex items-center justify-center group"
          >
            <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-5 md:p-10">
            <div className="flex flex-col md:flex-row gap-10">
              
              {/* Image Selection - moved to bottom on mobile via flex layout order */}
              <div className="order-last md:order-first md:w-[320px] flex flex-col items-center shrink-0">
                <div className="w-full space-y-6">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1.5 h-4 bg-blue-500 rounded-full"></div>
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Hình ảnh đại diện</span>
                  </div>
                  
                  <div className="relative group aspect-square w-full">
                    <input 
                      type="file" 
                      ref={captureInputRef} 
                      onChange={handleQuickCapture} 
                      className="hidden" 
                      accept="image/*"
                      capture="environment"
                    />
                    {image ? (
                      <div className="w-full h-full rounded-[2rem] overflow-hidden border-4 border-white shadow-2xl relative ring-1 ring-slate-100">
                        <img 
                          src={image} 
                          alt="Customer avatar" 
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                           <button 
                             type="button"
                             onClick={() => captureInputRef.current?.click()}
                             title="Chụp ảnh mới"
                             className="w-12 h-12 bg-white text-emerald-600 rounded-2xl flex items-center justify-center shadow-lg hover:scale-110 active:scale-90 transition-all"
                           >
                             <CameraIcon size={24} />
                           </button>
                           <button 
                             type="button"
                             onClick={() => setIsLibraryOpen(true)}
                             title="Chọn từ thư viện"
                             className="w-12 h-12 bg-white text-blue-600 rounded-2xl flex items-center justify-center shadow-lg hover:scale-110 active:scale-90 transition-all"
                           >
                             <ImageIcon size={24} />
                           </button>
                           <button 
                             type="button"
                             onClick={() => setImage('')}
                             className="w-12 h-12 bg-white text-rose-600 rounded-2xl flex items-center justify-center shadow-lg hover:scale-110 active:scale-90 transition-all"
                           >
                             <X size={24} />
                           </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2 h-full">
                        <button
                          type="button"
                          onClick={() => captureInputRef.current?.click()}
                          className="flex-1 h-full bg-slate-50 rounded-[2rem] border-4 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-500 transition-all group scale-100 hover:scale-[1.02] active:scale-98 shadow-inner"
                        >
                          <div className="w-14 h-14 bg-white rounded-2xl shadow-md flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                            <CameraIcon size={28} className="text-emerald-500/50" />
                          </div>
                          <span className="text-xs font-black uppercase tracking-widest text-center px-2">Chụp ảnh</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsLibraryOpen(true)}
                          className="flex-1 h-full bg-slate-50 rounded-[2rem] border-4 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-500 transition-all group scale-100 hover:scale-[1.02] active:scale-98 shadow-inner"
                        >
                          <div className="w-14 h-14 bg-white rounded-2xl shadow-md flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                            <ImageIcon size={28} className="text-blue-500/50" />
                          </div>
                          <span className="text-xs font-black uppercase tracking-widest text-center px-2">Kho ảnh</span>
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100/50 space-y-3">
                    <p className="text-[11px] font-black text-blue-600 uppercase tracking-tight flex items-center gap-2">
                      <HelpCircle size={14} /> Ghi chú hình ảnh
                    </p>
                    <p className="text-[10px] text-blue-500/70 font-bold leading-relaxed italic">
                      Hình ảnh giúp nhận diện khách hàng nhanh hơn tại quầy và khi quản lý công việc bảo trì.
                    </p>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: Form Fields (Organized for Desktop) */}
              <div className="flex-1 space-y-8">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1.5 h-4 bg-emerald-500 rounded-full"></div>
                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Thông tin chi tiết</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  {/* Name */}
                  <div className="md:col-span-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2 ml-1">
                      <UserCircle size={14} className="text-blue-500" />
                      Tên khách hàng <span className="text-rose-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-base font-bold outline-none focus:border-blue-500 focus:bg-white shadow-inner transition-all placeholder:text-slate-300" 
                      placeholder="Ví dụ: Vườn Ươm Phong Phú" 
                    />
                  </div>

                  {/* Phone 1 */}
                  <div>
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2 ml-1">
                      <Phone size={14} className="text-emerald-500" />
                      Số điện thoại chính <span className="text-rose-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      value={phone}
                      onChange={(e) => {
                        let val = e.target.value.replace(/[^0-9\s+]/g, '').trim();
                        if (val && !val.startsWith('0') && !val.startsWith('+')) val = '0' + val;
                        setPhone(val);
                        if (validationError) setValidationError(null);
                      }}
                      className={`w-full p-4 bg-slate-50 border-2 ${validationError && validationError.includes(phone) ? 'border-rose-400 shake animate-bounce-subtle' : 'border-slate-100'} rounded-2xl text-base font-bold outline-none focus:border-emerald-500 focus:bg-white shadow-inner transition-all text-emerald-700 placeholder:text-emerald-200`} 
                      placeholder="09xx xxx xxx" 
                    />
                    {validationError && (
                      <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mt-2 ml-1 animate-in slide-in-from-top-1">
                        ⚠️ {validationError}
                      </p>
                    )}
                  </div>

                  {/* Phone 2 */}
                  <div>
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2 ml-1">
                      <Phone size={14} className="text-blue-500" />
                      Số điện thoại phụ
                    </label>
                    <input 
                      type="text" 
                      value={phone2}
                      onChange={(e) => {
                        let val = e.target.value.replace(/[^0-9\s+]/g, '').trim();
                        if (val && !val.startsWith('0') && !val.startsWith('+')) val = '0' + val;
                        setPhone2(val);
                        if (validationError) setValidationError(null);
                      }}
                      className={`w-full p-4 bg-slate-50 border-2 ${validationError && validationError.includes(phone2) && phone2 ? 'border-rose-400 shake animate-bounce-subtle' : 'border-slate-100'} rounded-2xl text-base font-bold outline-none focus:border-blue-400 focus:bg-white shadow-inner transition-all text-blue-700 placeholder:text-blue-200`} 
                      placeholder="Số dự phòng" 
                    />
                    {validationError && validationError.includes(phone2) && phone2 && (
                      <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mt-2 ml-1 animate-in slide-in-from-top-1">
                        ⚠️ {validationError}
                      </p>
                    )}
                  </div>

                  {/* Address */}
                  <div className="md:col-span-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2 ml-1">
                      <Map size={14} className="text-amber-500" />
                      Địa chỉ liên hệ
                    </label>
                    <input 
                      type="text" 
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-base font-bold outline-none focus:border-amber-400 focus:bg-white shadow-inner transition-all placeholder:text-slate-300" 
                      placeholder="Số nhà, tên đường, khu vực..." 
                    />
                  </div>

                  {/* Location & GPS */}
                  <div className="md:col-span-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2 ml-1">
                      <MapPin size={14} className="text-rose-500" />
                      Vị trí thực tế (Tọa độ GPS)
                    </label>
                    <div className="relative">
                      <textarea 
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="w-full p-4 pr-16 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-rose-400 focus:bg-white shadow-inner transition-all min-h-[80px] placeholder:text-slate-300" 
                        placeholder="latitude, longitude (Lấy tự động bằng nút bên cạnh)" 
                      />
                      <button
                        type="button"
                        onClick={getCurrentLocation}
                        disabled={isLocating}
                        className="absolute right-3 top-3 w-12 h-12 flex items-center justify-center bg-white border-2 border-slate-100 text-rose-500 rounded-xl hover:bg-rose-50 hover:border-rose-200 transition-all shadow-md active:scale-95 disabled:opacity-50"
                        title="Lấy vị trí hiện tại của tôi"
                      >
                        {isLocating ? <Loader2 size={24} className="animate-spin text-rose-300" /> : <MapPin size={24} />}
                      </button>
                    </div>
                  </div>

                  {/* Note */}
                  <div className="md:col-span-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2 ml-1">
                      <Info size={14} className="text-slate-500" />
                      Ghi chú thêm
                    </label>
                    <textarea 
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-slate-400 focus:bg-white shadow-inner transition-all min-h-[80px] placeholder:text-slate-300" 
                      placeholder="Bất kỳ thông tin bổ sung nào..." 
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-6 md:p-10 border-t border-slate-100 bg-slate-50 flex flex-col md:flex-row justify-end gap-3 shrink-0">
          <button 
            type="button"
            onClick={onClose}
            className="px-8 py-4 bg-white border-2 border-slate-200 text-slate-500 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95 shadow-sm"
          >
            Hủy bỏ
          </button>
          <button 
            type="button"
            onClick={handleSave}
            className={`px-12 py-4 ${customerToEdit ? 'bg-emerald-600 shadow-emerald-100' : 'bg-blue-600 shadow-blue-100'} text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:brightness-110 transition-all active:scale-95 shadow-xl flex items-center justify-center gap-2`}
          >
            {customerToEdit ? <Check size={18} /> : <UserPlus size={18} />}
            {customerToEdit ? 'Lưu Thay Đổi' : 'Thêm Mới Khách Hàng'}
          </button>
        </div>
      </div>

      <ImageLibraryModal 
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        defaultFilename={`${name || 'KhachHang'}_${Date.now()}`}
        initialCategory="KhachHang"
        onSelect={(url) => {
          setImage(url);
          setIsLibraryOpen(false);
        }}
      />
    </div>
  );
};
