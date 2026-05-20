import React, { useState } from 'react';
import { Send, Save, ArrowLeft, Bell, Info, ExternalLink, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { useMobileBackModal } from '../hooks/useMobileBackModal';

export const TelegramSettings: React.FC = () => {
  const { telegramSettings, updateTelegramSettings } = useAppContext();
  const navigate = useNavigate();
  
  const [botToken, setBotToken] = useState(telegramSettings.botToken);
  const [chatId, setChatId] = useState(telegramSettings.chatId);
  const [enabled, setEnabled] = useState(telegramSettings.enabled);
  
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await updateTelegramSettings({
      botToken,
      chatId,
      enabled
    });
    
    setIsSaving(false);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleTestTelegram = async () => {
    if (!botToken || !chatId) return alert('Vui lòng nhập Token và Chat ID');
    setIsTesting(true);
    try {
      const { sendTelegramMessage } = await import('../lib/notification');
      const result = await sendTelegramMessage(botToken, chatId, '🔔 <b>TEST KẾT NỐI</b>\nHệ thống POS DigiKiot đã kết nối thành công với Telegram của bạn!');
      if (result.ok) {
        alert('Gửi tin nhắn thử nghiệm thành công! Vui lòng kiểm tra Telegram.');
      } else {
        alert('Gửi thất bại: ' + (result.description || 'Không xác định'));
      }
    } catch (e) {
      alert('Lỗi: ' + String(e));
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="min-h-full bg-slate-50 flex flex-col">
      <div className="bg-white border-b border-slate-200 p-4 flex items-center gap-4 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
            <Send size={20} />
          </div>
          <h1 className="text-lg font-bold text-slate-800 uppercase tracking-tighter">Cấu hình Telegram</h1>
        </div>
      </div>

      <div className="flex-1 p-4 md:p-8 max-w-2xl mx-auto w-full space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${enabled ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                  <Bell size={20} />
                </div>
                <div>
                  <p className="text-xs font-black text-slate-800 uppercase tracking-tight">Kích hoạt thông báo</p>
                  <p className="text-[10px] text-slate-400 font-bold italic">Tự động gửi khi có công việc mới</p>
                </div>
              </div>
              <button 
                onClick={() => setEnabled(!enabled)}
                className={`w-12 h-6 rounded-full transition-all relative ${enabled ? 'bg-blue-600' : 'bg-slate-300'}`}
              >
                <div className={`absolute top-1 bg-white w-4 h-4 rounded-full transition-all ${enabled ? 'right-1' : 'left-1'}`}></div>
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Bot Token</label>
                <input 
                  type="password" 
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  placeholder="Nhập Bot Token từ @BotFather..." 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold shadow-sm outline-none focus:border-blue-500 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Chat ID</label>
                <input 
                  type="text" 
                  value={chatId}
                  onChange={(e) => setChatId(e.target.value)}
                  placeholder="Nhập Chat ID người dùng hoặc nhóm..." 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold shadow-sm outline-none focus:border-blue-500 transition-all font-mono"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={handleTestTelegram}
                disabled={isTesting}
                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black text-[11px] uppercase tracking-wider hover:bg-slate-200 transition-all active:scale-95 disabled:opacity-50"
              >
                {isTesting ? 'Đang thử...' : 'Test kết nối'}
              </button>
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className={`flex-[2] py-3 rounded-2xl font-black text-[11px] uppercase tracking-wider shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${isSaved ? 'bg-emerald-500 text-white shadow-emerald-100' : 'bg-blue-600 text-white shadow-blue-100 hover:bg-blue-700'}`}
              >
                <Save size={16} />
                {isSaving ? 'Đang lưu...' : isSaved ? 'Đã lưu cấu hình' : 'Lưu cấu hình'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={async () => {
                  try {
                    const res = await fetch('/api/telegram/test-report');
                    const data = await res.json();
                    if (data.success) alert(data.message || 'Đã gửi thử báo cáo doanh thu!');
                    else alert('Lỗi: ' + data.error);
                  } catch (e) {
                    alert('Không thể kết nối đến server');
                  }
                }}
                className="bg-white border border-blue-200 text-blue-600 font-black text-[10px] uppercase py-3 rounded-2xl hover:bg-blue-50 transition-all active:scale-95 flex flex-col items-center gap-1 shadow-sm"
              >
                <Send size={16} />
                <span>Thử Báo Cáo</span>
              </button>
              
              <button
                onClick={async () => {
                  try {
                    const res = await fetch('/api/telegram/test-stock');
                    const data = await res.json();
                    if (data.success) alert(data.message || 'Đã gửi thử cảnh báo tồn kho!');
                    else alert('Lỗi: ' + data.error);
                  } catch (e) {
                    alert('Không thể kết nối đến server');
                  }
                }}
                className="bg-white border border-orange-200 text-orange-600 font-black text-[10px] uppercase py-3 rounded-2xl hover:bg-orange-50 transition-all active:scale-95 flex flex-col items-center gap-1 shadow-sm"
              >
                <AlertTriangle size={16} />
                <span>Thử Tồn Kho</span>
              </button>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 text-blue-800 p-6 rounded-2xl border border-blue-100 space-y-4 shadow-sm shadow-blue-50">
          <div className="flex items-center gap-3">
            <Info size={24} className="text-blue-500" />
            <h4 className="font-black text-sm uppercase tracking-tighter">Hướng dẫn lấy thông tin</h4>
          </div>
          <div className="space-y-3">
            <div className="flex items-start gap-4">
              <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center shrink-0 font-bold text-xs">1</div>
              <p className="text-xs font-medium leading-relaxed">Chat với <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="font-black underline flex items-center gap-1 inline-flex">@BotFather <ExternalLink size={10} /></a> để tạo Bot mới và lấy <b>API Token</b>.</p>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center shrink-0 font-bold text-xs">2</div>
              <p className="text-xs font-medium leading-relaxed">Chat với <a href="https://t.me/userinfobot" target="_blank" rel="noopener noreferrer" className="font-black underline flex items-center gap-1 inline-flex">@userinfobot <ExternalLink size={10} /></a> để lấy <b>Chat ID</b> cá nhân của bạn.</p>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center shrink-0 font-bold text-xs">3</div>
              <p className="text-xs font-medium leading-relaxed">Bấm <b>START</b> cho bot vừa tạo trước khi bấm "Test kết nối" trên hệ thống.</p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl">
           <p className="text-[11px] font-bold text-orange-800 leading-relaxed italic">
             <strong>* Lưu ý kỹ thuật:</strong> Bạn cần thêm cột <strong>id</strong> vào tab <strong>TelegramSettings</strong> trong Google Sheets và điền dòng đầu tiên là <code>tg_settings</code> để hệ thống có thể ghi đè cấu hình.
           </p>
        </div>
      </div>
    </div>
  );
};
