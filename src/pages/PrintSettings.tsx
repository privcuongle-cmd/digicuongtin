import React, { useState } from 'react';
import { Printer, Save, ArrowLeft, Store, MapPin, Phone, Mail, CreditCard, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { useMobileBackModal } from '../hooks/useMobileBackModal';

export const PrintSettings: React.FC = () => {
  const { printSettings, updatePrintSettings } = useAppContext();
  const navigate = useNavigate();
  const [settings, setSettings] = useState(printSettings);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    updatePrintSettings(settings);
    
    // Simulate a brief local "saving" state for visual feedback
    setTimeout(() => {
      setIsSaving(false);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    }, 300);
  };

  return (
    <div className="min-h-full bg-slate-50 flex flex-col">
      <div className="bg-white border-b border-slate-200 p-4 flex items-center gap-4 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
            <Printer size={20} />
          </div>
          <h1 className="text-lg font-bold text-slate-800">Cài đặt bản in</h1>
        </div>
      </div>

      <div className="flex-1 p-4 md:p-8 max-w-2xl mx-auto w-full space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 space-y-6">
            <div className="space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">Thông tin cửa hàng hiển thị trên bản in</h3>
              
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tight ml-1 flex items-center gap-2">
                  <Store size={12} /> Tên cửa hàng
                </label>
                <input 
                  type="text" 
                  value={settings.storeName || ''}
                  onChange={e => setSettings({ ...settings, storeName: e.target.value })}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:border-blue-500 outline-none transition-all"
                  placeholder="Nhập tên cửa hàng..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tight ml-1 flex items-center gap-2">
                  <MapPin size={12} /> Địa chỉ
                </label>
                <input 
                  type="text" 
                  value={settings.address || ''}
                  onChange={e => setSettings({ ...settings, address: e.target.value })}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:border-blue-500 outline-none transition-all"
                  placeholder="Nhập địa chỉ..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tight ml-1 flex items-center gap-2">
                    <Phone size={12} /> Số điện thoại
                  </label>
                  <input 
                    type="text" 
                    value={settings.phone || ''}
                    onChange={e => {
                      let val = e.target.value.replace(/[^0-9\s+]/g, '').trim();
                      if (val && !val.startsWith('0') && !val.startsWith('+')) val = '0' + val;
                      setSettings({ ...settings, phone: val });
                    }}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:border-blue-500 outline-none transition-all"
                    placeholder="Nhập số điện thoại..."
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tight ml-1 flex items-center gap-2">
                    <Mail size={12} /> Email
                  </label>
                  <input 
                    type="text" 
                    value={settings.email || ''}
                    onChange={e => setSettings({ ...settings, email: e.target.value })}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:border-blue-500 outline-none transition-all"
                    placeholder="Nhập email..."
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tight ml-1 flex items-center gap-2">
                  <CreditCard size={12} /> Thông tin tài khoản ngân hàng
                </label>
                <textarea 
                  rows={2}
                  value={settings.bankInfo || ''}
                  onChange={e => setSettings({ ...settings, bankInfo: e.target.value })}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:border-blue-500 outline-none transition-all resize-none"
                  placeholder="Ví dụ: Vietcombank - STK: 123456789 - Chủ TK: NGUYEN VAN A"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tight ml-1 flex items-center gap-2">
                  <MessageSquare size={12} /> Lời chúc / Chân trang
                </label>
                <input 
                  type="text" 
                  value={settings.footNote || ''}
                  onChange={e => setSettings({ ...settings, footNote: e.target.value })}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:border-blue-500 outline-none transition-all"
                  placeholder="Lời cảm ơn khách hàng..."
                />
              </div>
            </div>

            <button 
              onClick={handleSave}
              disabled={isSaving}
              className={`w-full py-4 rounded-xl font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-3 transition-all shadow-lg active:scale-95 disabled:opacity-70 ${isSaved ? 'bg-emerald-500 text-white shadow-emerald-200' : 'bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700'}`}
            >
              <Save size={20} className={isSaving ? 'animate-spin' : ''} />
              {isSaving ? 'Đang lưu...' : isSaved ? 'Đã lưu cài đặt' : 'Lưu cài đặt bản in'}
            </button>
          </div>
        </div>

        {/* Print Preview Card Placeholder */}
        <div className="bg-blue-50/50 p-6 rounded-2xl border-2 border-dotted border-blue-200 flex flex-col items-center justify-center text-center space-y-2">
          <Printer size={32} className="text-blue-300" />
          <p className="text-blue-800 font-bold text-sm tracking-tight">Cài đặt này sẽ được áp dụng trực tiếp lên mẫu hóa đơn và phiếu nhập hàng.</p>
          <p className="text-[10px] text-blue-500 font-medium uppercase tracking-widest">Bạn có thể kiểm tra bằng cách mở một hóa đơn bất kỳ và bấm 'In'</p>
        </div>
      </div>
    </div>
  );
};
