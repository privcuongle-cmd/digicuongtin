import React, { useState, useEffect } from 'react';
import { 
  Store, Search, Shield, Save, Edit3, Image as ImageIcon, ExternalLink,
  Box, ClipboardList, Users, Wallet, FileText, Truck, CreditCard, Send, Percent, Landmark
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const ShopSettings: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Shop information state loaded from localStorage with default mock values matching screenshots
  const [shopLogo, setShopLogo] = useState(() => 
    localStorage.getItem('digikiot_shop_logo') || 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEi6auaPmOx44Q9OW7UvYxDFynRdaFpGI3z4k1UdchG_WNFIxvxs1_CLIysGsUAlGwtYbyV_QfAvJZ5-56Rpw3B00n7uFcJmTorBIQTFDzibjMeu7CHf-D4rBW4VgOLCCfc5F7ve3mLwVjImG2tbYo3ge_180NTz1evh8WECho9-vbegny4ROtZKxieR/s1600/Logo-cuong-tin.png'
  );
  const [shopUrl, setShopUrl] = useState(() => 
    localStorage.getItem('digikiot_shop_url') || 'https://vinba.kiotviet.vn'
  );
  const [expiryDate, setExpiryDate] = useState(() => 
    localStorage.getItem('digikiot_shop_expiry') || '17/03/2027 23:59'
  );
  const [shopName, setShopName] = useState(() => 
    localStorage.getItem('digikiot_shop_name') || 'Tin học Vinba'
  );
  const [phone, setPhone] = useState(() => 
    localStorage.getItem('digikiot_shop_phone') || '0707075370'
  );
  const [country, setCountry] = useState(() => 
    localStorage.getItem('digikiot_shop_country') || 'Việt Nam'
  );
  const [address, setAddress] = useState(() => 
    localStorage.getItem('digikiot_shop_address') || 'Số 22, Tân Bình, Xã Đắk Song, Tỉnh Lâm Đồng'
  );

  // States for Camera account display settings
  const [hideAdmin, setHideAdmin] = useState<boolean>(() => {
    const stored = localStorage.getItem('digikiot_hide_camera_acc_admin');
    return stored === null ? true : stored === 'true';
  });
  const [hideStaff, setHideStaff] = useState<boolean>(() => {
    const stored = localStorage.getItem('digikiot_hide_camera_acc_staff');
    return stored === null ? true : stored === 'true';
  });

  const [isEditingShop, setIsEditingShop] = useState(false);
  const [isSavingShop, setIsSavingShop] = useState(false);
  const [isSavedShop, setIsSavedShop] = useState(false);

  const [isSavingCamera, setIsSavingCamera] = useState(false);
  const [isCameraSaved, setIsCameraSaved] = useState(false);

  const handleSaveShop = () => {
    setIsSavingShop(true);
    localStorage.setItem('digikiot_shop_logo', shopLogo);
    localStorage.setItem('digikiot_shop_url', shopUrl);
    localStorage.setItem('digikiot_shop_expiry', expiryDate);
    localStorage.setItem('digikiot_shop_name', shopName);
    localStorage.setItem('digikiot_shop_phone', phone);
    localStorage.setItem('digikiot_shop_country', country);
    localStorage.setItem('digikiot_shop_address', address);

    setTimeout(() => {
      setIsSavingShop(false);
      setIsSavedShop(true);
      setIsEditingShop(false);
      setTimeout(() => setIsSavedShop(false), 2000);
    }, 400);
  };

  const handleSaveCameraSettings = () => {
    setIsSavingCamera(true);
    localStorage.setItem('digikiot_hide_camera_acc_admin', String(hideAdmin));
    localStorage.setItem('digikiot_hide_camera_acc_staff', String(hideStaff));

    setTimeout(() => {
      setIsSavingCamera(false);
      setIsCameraSaved(true);
      setTimeout(() => setIsCameraSaved(false), 2000);
    }, 400);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Ảnh không được vượt quá 2MB!');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setShopLogo(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  interface SidebarItem {
    label: string;
    icon: React.ReactNode;
    path: string;
    active?: boolean;
    external?: boolean;
  }

  interface SidebarSection {
    title: string;
    items: SidebarItem[];
  }

  // Sidebar Menu configuration exactly matching screenshots
  const sidebarSections: SidebarSection[] = [
    {
      title: 'Quản lý',
      items: [
        { label: 'Hàng hóa', icon: <Box size={16} />, path: '/inventory' },
        { label: 'Mua hàng', icon: <Box size={16} />, path: '/import-history' },
        { label: 'Đơn hàng', icon: <ClipboardList size={16} />, path: '#' },
        { label: 'Khách hàng', icon: <Users size={16} />, path: '/customers' },
        { label: 'Sổ quỹ', icon: <Wallet size={16} />, path: '/cash-ledger' },
        { label: 'Thuế & Kế toán', icon: <Percent size={16} />, path: '#' },
        { label: 'Hóa đơn điện tử', icon: <FileText size={16} />, path: '/invoices' },
        { label: 'Mẫu in', icon: <FileText size={16} />, path: '/print-settings', external: true },
      ]
    },
    {
      title: 'Tiện ích',
      items: [
        { label: 'Giao hàng', icon: <Truck size={16} />, path: '#' },
        { label: 'Thanh toán', icon: <CreditCard size={16} />, path: '/wallets', external: true },
        { label: 'Gửi SMS, Email, Zalo', icon: <Send size={16} />, path: '#' },
      ]
    },
    {
      title: 'Cửa hàng',
      items: [
        { label: 'Thông tin cửa hàng', icon: <Store size={16} />, path: '/shop-settings', active: true },
      ]
    }
  ];

  // Filter sidebar items for searching setting names
  const filteredSections = sidebarSections.map(section => {
    const items = section.items.filter(item => 
      item.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return { ...section, items };
  }).filter(section => section.items.length > 0);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Search bar style with search input */}
      <div className="bg-white border-b border-slate-200 p-4 sticky top-0 z-10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Store className="text-blue-600" size={24} />
          Thiết lập
        </h1>
        <div className="relative w-full max-w-sm">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Tìm kiếm thiết lập" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-[13px] font-semibold text-slate-700 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all shadow-inner"
          />
        </div>
      </div>

      {/* Main Two-Column Panel */}
      <div className="flex-1 max-w-[1600px] w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* Left Column: Sidebar Settings Navigation */}
        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-6">
          {filteredSections.map((section, idx) => (
            <div key={`section-${idx}`} className="space-y-2">
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-2.5">
                {section.title}
              </h3>
              <div className="space-y-0.5">
                {section.items.map((item, itemIdx) => (
                  <button
                    key={`item-${itemIdx}`}
                    onClick={() => item.path !== '#' && navigate(item.path)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-[13px] font-bold transition-all ${item.active ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600 pl-2' : 'text-slate-600 hover:bg-slate-55 hover:text-slate-900'}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={item.active ? 'text-blue-600' : 'text-slate-400'}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </div>
                    {item.external && (
                      <ExternalLink size={13} className="text-slate-400" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {filteredSections.length === 0 && (
            <div className="p-4 text-center text-xs text-slate-400">
              Không tìm thấy mục thiết lập nào
            </div>
          )}
        </div>

        {/* Right Column: Setting Content Panel */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Shop Information Card */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 p-5 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-800">Thông tin cửa hàng</h2>
              {isEditingShop ? (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setIsEditingShop(false)} 
                    className="px-4 py-1.5 border border-slate-200 text-slate-500 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors"
                  >
                    Hủy
                  </button>
                  <button 
                    onClick={handleSaveShop} 
                    disabled={isSavingShop}
                    className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors flex items-center gap-1.5"
                  >
                    <Save size={14} className={isSavingShop ? 'animate-spin' : ''} />
                    {isSavingShop ? 'Đang lưu...' : 'Lưu lại'}
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setIsEditingShop(true)} 
                  className="px-4 py-1.5 border border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-100 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 bg-slate-50/50 hover:bg-blue-50/30"
                >
                  <Edit3 size={14} />
                  Chỉnh sửa
                </button>
              )}
            </div>

            <div className="p-6 space-y-8">
              {/* Photo Upload area */}
              <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-slate-100">
                <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-slate-100 shadow-md">
                  <img 
                    src={shopLogo} 
                    alt="Logo" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjdQP0PicQxdVjonWLo_k6WbJVjn2y3OVvrBw3JYpe6pIlbJStebP6OB3QBG9BVvcTWfoFj4g26FZBvUN-GefJXgjQrUA3LWRpYe2xvA3TijfQi0Llm9gQKj-eHSEfj2FFft65XBgGIWTZ9WQGnx0rVZz5PJ95PYsI6jBiKqtcTd145uKYZG5Vu_d53jWA/s1600/logo.png';
                    }}
                  />
                  {isEditingShop && (
                    <label className="absolute inset-0 bg-black/45 flex items-center justify-center cursor-pointer text-white">
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleLogoUpload} 
                        className="sr-only" 
                      />
                      <ImageIcon size={18} />
                    </label>
                  )}
                </div>
                <div className="text-center sm:text-left space-y-1.5">
                  <label className="relative inline-flex items-center px-4 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 bg-slate-50/50 hover:bg-slate-100 transition-colors cursor-pointer active:scale-95">
                    Chọn ảnh đại diện
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleLogoUpload} 
                      className="sr-only" 
                      disabled={!isEditingShop}
                    />
                  </label>
                  <p className="text-[11px] text-slate-400 font-medium">Lưu ý: Ảnh không quá {isSavedShop ? '2MB (Đã lưu)' : '2MB'}</p>
                </div>
              </div>

              {/* Data Grid with 3 Columns exactly */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-y-6 gap-x-8">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Địa chỉ truy cập</label>
                  {isEditingShop ? (
                    <input 
                      type="text" 
                      value={shopUrl} 
                      onChange={(e) => setShopUrl(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-[13px] font-semibold text-slate-700 bg-slate-50 focus:outline-none focus:border-blue-500"
                    />
                  ) : (
                    <p className="text-[14px] font-bold text-blue-600 hover:underline cursor-pointer">{shopUrl}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Hạn sử dụng</label>
                  {isEditingShop ? (
                    <input 
                      type="text" 
                      value={expiryDate} 
                      onChange={(e) => setExpiryDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-[13px] font-semibold text-slate-700 bg-slate-50 focus:outline-none focus:border-blue-500"
                    />
                  ) : (
                    <p className="text-[14px] font-bold text-slate-700">{expiryDate}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Tên cửa hàng</label>
                  {isEditingShop ? (
                    <input 
                      type="text" 
                      value={shopName} 
                      onChange={(e) => setShopName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-[13px] font-semibold text-slate-700 bg-slate-50 focus:outline-none focus:border-blue-500"
                    />
                  ) : (
                    <p className="text-[14px] font-bold text-slate-700">{shopName}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Điện thoại</label>
                  {isEditingShop ? (
                    <input 
                      type="text" 
                      value={phone} 
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-[13px] font-semibold text-slate-700 bg-slate-50 focus:outline-none focus:border-blue-500"
                    />
                  ) : (
                    <p className="text-[14px] font-bold text-slate-700">{phone}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Quốc gia</label>
                  {isEditingShop ? (
                    <input 
                      type="text" 
                      value={country} 
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-[13px] font-semibold text-slate-700 bg-slate-50 focus:outline-none focus:border-blue-500"
                    />
                  ) : (
                    <p className="text-[14px] font-bold text-slate-700">{country}</p>
                  )}
                </div>

                <div className="space-y-1.5 md:col-span-3">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Địa chỉ</label>
                  {isEditingShop ? (
                    <input 
                      type="text" 
                      value={address} 
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-[13px] font-semibold text-slate-700 bg-slate-50 focus:outline-none focus:border-blue-500"
                    />
                  ) : (
                    <p className="text-[14px] font-semibold text-slate-600 leading-relaxed">{address}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Camera account display security settings card precisely as requested */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2 flex items-center gap-1.5">
                  <Shield size={14} className="text-blue-500" /> Cấu hình bảo mật thông tin Camera
                </h3>
                
                <p className="text-xs text-slate-500 leading-relaxed">
                  Tự động ẩn thông tin tài khoản Camera bằng ký tự <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px] text-slate-600 font-bold">******</code> trong danh sách quản lý. Khi cần xem, người dùng có thể nhấp vào biểu tượng con mắt để xem từng tài khoản.
                </p>

                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100 hover:border-blue-100 transition-colors">
                    <div>
                      <div className="text-[13px] font-bold text-slate-700">Tự động ẩn đối với Admin</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">Ẩn tài khoản camera đối với tài khoản Quản trị viên</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={hideAdmin}
                        onChange={(e) => setHideAdmin(e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 shadow-inner"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100 hover:border-blue-100 transition-colors">
                    <div>
                      <div className="text-[13px] font-bold text-slate-700">Tự động ẩn đối với Nhân viên</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">Ẩn tài khoản camera đối với tài khoản Thu ngân và Nhân viên</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={hideStaff}
                        onChange={(e) => setHideStaff(e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 shadow-inner"></div>
                    </label>
                  </div>
                </div>
              </div>

              <button 
                onClick={handleSaveCameraSettings}
                disabled={isSavingCamera}
                className={`w-full py-4 rounded-xl font-bold uppercase tracking-widest text-[12px] flex items-center justify-center gap-3 transition-all shadow-md active:scale-95 disabled:opacity-70 ${isCameraSaved ? 'bg-emerald-500 text-white shadow-emerald-250' : 'bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700'}`}
              >
                <Save size={18} className={isSavingCamera ? 'animate-spin' : ''} />
                {isSavingCamera ? 'Đang lưu...' : isCameraSaved ? 'Đã lưu cấu hình!' : 'Lưu cấu hình Camera'}
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
