import React, { useState, useMemo, useEffect } from 'react';
import { Search, Plus, Camera as CameraIcon, User, Phone, MapPin, Calendar, Trash2, Edit3, MoreHorizontal, X, Save, Shield, ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { CameraAccountRecord } from '../types';
import { generateId } from '../lib/idUtils';
import { useMobileBackModal } from '../hooks/useMobileBackModal';
import { formatDateTime, parseDateString } from '../lib/utils';

export const CameraManagement: React.FC = () => {
  const { customers, cameraAccounts, addCameraAccount, updateCameraAccount, deleteCameraAccount, currentUser } = useAppContext();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<CameraAccountRecord | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [revealedAccountId, setRevealedAccountId] = useState<string | null>(null);

  // Determine whether to mask camera account names by default based on roles and settings
  const shouldMaskByDefault = useMemo(() => {
    const isAdmin = currentUser?.role === 'ADMIN';
    if (isAdmin) {
      const stored = localStorage.getItem('digikiot_hide_camera_acc_admin');
      return stored === null ? true : stored === 'true';
    } else {
      const stored = localStorage.getItem('digikiot_hide_camera_acc_staff');
      return stored === null ? true : stored === 'true';
    }
  }, [currentUser]);

  // Form state
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [accountName, setAccountName] = useState('');
  const [cameraBrand, setCameraBrand] = useState('');
  const [note, setNote] = useState('');
  
  const [customerSuggestions, setCustomerSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filteredRecords = useMemo(() => {
    return cameraAccounts.filter(r => 
      r.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.customerPhone.includes(searchTerm) ||
      r.accountName.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => parseDateString(b.createdAt) - parseDateString(a.createdAt));
  }, [cameraAccounts, searchTerm]);

  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredRecords.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredRecords, currentPage]);

  const totalPages = Math.ceil(filteredRecords.length / ITEMS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleCustomerSearch = (val: string) => {
    setCustomerName(val);
    if (val.length > 1) {
      const filtered = customers.filter(c => 
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
    setCustomerAddress(c.address || '');
    setShowSuggestions(false);
  };

  const resetForm = () => {
    setCustomerName('');
    setCustomerPhone('');
    setCustomerId('');
    setCustomerAddress('');
    setAccountName('');
    setCameraBrand('');
    setNote('');
    setEditingRecord(null);
    setIsEditing(false);
  };

  const handleSave = () => {
    if (!customerName || !accountName) {
      alert('Vui lòng nhập tên khách hàng và tên tài khoản camera');
      return;
    }

    const recordData = {
      customerId,
      customerName,
      customerPhone,
      customerAddress,
      accountName,
      cameraBrand,
      note,
      updatedAt: formatDateTime(new Date())
    };

    if (editingRecord) {
      updateCameraAccount(editingRecord.id, recordData);
    } else {
      const newRecord: CameraAccountRecord = {
        ...recordData,
        id: generateId('CAM', cameraAccounts),
        createdAt: formatDateTime(new Date()),
        createdBy: currentUser?.name || 'Admin'
      };
      addCameraAccount(newRecord);
    }

    setShowAddModal(false);
    resetForm();
  };

  const handleEdit = (record: CameraAccountRecord, forceEdit = false) => {
    setEditingRecord(record);
    setCustomerName(record.customerName);
    setCustomerPhone(record.customerPhone);
    setCustomerId(record.customerId || '');
    setCustomerAddress(record.customerAddress);
    setAccountName(record.accountName);
    setCameraBrand(record.cameraBrand || '');
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

  useMobileBackModal(showAddModal, () => setShowAddModal(false));
  useMobileBackModal(showSuggestions, () => setShowSuggestions(false));
  useMobileBackModal(!!editingRecord, () => setEditingRecord(null));

  useEffect(() => {
    if (location.state?.openAddFromCustomer) {
      const c = location.state.openAddFromCustomer;
      setCustomerName(c.name);
      setCustomerPhone(c.phone);
      setCustomerId(c.id || '');
      setCustomerAddress(c.address || c.location || '');
      setShowAddModal(true);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

return (
    <div className="flex flex-col gap-3 md:gap-6 p-3 md:p-0">
      <div className="flex items-center justify-between gap-2 md:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight leading-tight">Quản lý tài khoản</h1>
          <p className="text-slate-500 text-[11px] md:text-sm mt-0.5 truncate">
            Tổng cộng: <span className="text-emerald-600 font-bold">{filteredRecords.length}</span> tài khoản
          </p>
        </div>
        <button 
          onClick={() => { resetForm(); setShowAddModal(true); }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 md:px-4 md:py-2.5 rounded-lg md:rounded-xl font-bold flex items-center justify-center gap-1 md:gap-1.5 shadow-md shadow-emerald-200 transition-all active:scale-95 text-xs md:text-sm shrink-0 whitespace-nowrap"
        >
          <Plus size={15} className="md:size-[18px] shrink-0" />
          <span className="hidden sm:inline">Thêm tài khoản mới</span>
          <span className="sm:hidden">Thêm mới</span>
        </button>
      </div>

      <div className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-3 md:p-4 border-b border-slate-50 bg-slate-50/50 flex flex-col md:flex-row gap-2 md:gap-4 justify-between items-center">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text"
              placeholder="Tìm khách hàng, SĐT, tên tài khoản..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-[13px] md:text-sm focus:border-emerald-400 outline-none transition-all shadow-inner"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-[11px] uppercase tracking-widest font-bold">
                <th className="px-6 py-4">Khách hàng</th>
                <th className="px-6 py-4">Số điện thoại</th>
                <th className="px-6 py-4">Tài khoản</th>
                <th className="px-6 py-4 text-right">Sửa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginatedRecords.length > 0 ? paginatedRecords.map((record, idx) => (
                <React.Fragment key={`desktop-cam-mgmt-${record.id || idx}`}>
                  <tr 
                    className={`hover:bg-slate-50/80 transition-colors group cursor-pointer ${expandedId === record.id ? 'bg-emerald-50/30' : ''}`} 
                    onClick={() => setExpandedId(expandedId === record.id ? null : record.id)}
                  >
                    <td className="px-6 py-4 font-bold text-slate-700">
                      {record.customerName}
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">
                      {record.customerPhone}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 justify-between max-w-[280px]">
                        <div className="flex items-center gap-2 text-slate-700 font-bold overflow-hidden">
                          <Shield size={16} className="text-emerald-500 shrink-0" />
                          <span className="truncate font-mono tracking-wider">
                            {!shouldMaskByDefault || revealedAccountId === record.id ? record.accountName : '******'}
                          </span>
                        </div>
                        {shouldMaskByDefault && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setRevealedAccountId(revealedAccountId === record.id ? null : record.id);
                            }}
                            className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors shrink-0"
                            title={revealedAccountId === record.id ? 'Ẩn tài khoản' : 'Hiện tài khoản'}
                          >
                            {revealedAccountId === record.id ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleEdit(record, true); }}
                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      >
                        <Edit3 size={18} />
                      </button>
                    </td>
                  </tr>
                </React.Fragment>
              )) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                    Không tìm thấy tài khoản camera nào
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
              key={`mobile-cam-mgmt-${record.id || idx}`} 
              className={`bg-white rounded-xl shadow-sm border transition-all ${expandedId === record.id ? 'border-emerald-300 ring-1 ring-emerald-100 shadow-md' : 'border-slate-200 shadow-sm'}`}
            >
              <div 
                className={`p-3 flex justify-between items-center cursor-pointer active:bg-slate-50 transition-colors ${expandedId === record.id ? 'bg-emerald-50/20' : ''}`}
                onClick={() => setExpandedId(expandedId === record.id ? null : record.id)}
              >
                <div className="flex flex-col">
                  <div className="font-bold text-slate-800 text-[15px]">{record.customerName}</div>
                  <div className="text-[11px] text-blue-600 font-semibold">{record.customerPhone}</div>
                </div>
                <div className="flex items-center gap-2">
                   {expandedId === record.id && (
                     <button 
                       onClick={(e) => { e.stopPropagation(); handleEdit(record, true); }}
                       className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100 flex items-center gap-1 active:scale-95 transition-all"
                     >
                       <Edit3 size={12} />
                       Sửa
                     </button>
                   )}
                </div>
              </div>

              {expandedId === record.id && (
                <div className="px-3 pb-3 pt-2 border-t border-slate-50 bg-slate-50/30 animate-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between gap-2 bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm w-full">
                    <div className="flex items-center gap-2 overflow-hidden flex-1">
                      <Shield size={14} className="text-emerald-500 shrink-0" />
                      <span className="text-[13px] font-black text-slate-700 break-all leading-tight">
                        {!shouldMaskByDefault || revealedAccountId === record.id ? record.accountName : '******'}
                      </span>
                    </div>
                    {shouldMaskByDefault && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setRevealedAccountId(revealedAccountId === record.id ? null : record.id);
                        }}
                        className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors shrink-0"
                      >
                        {revealedAccountId === record.id ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    )}
                  </div>
                  {record.note && (
                    <div className="mt-2 text-[11px] text-slate-500 font-medium px-1 italic">
                      Lưu ý: {record.note}
                    </div>
                  )}
                </div>
              )}
            </div>
          )) : (
            <div className="p-10 text-center text-slate-400 italic text-sm bg-white rounded-2xl border border-slate-100">
              Không tìm thấy tài khoản camera nào
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 md:px-6 md:py-4 border-t border-slate-50 bg-white flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4 text-[12px] md:text-sm">
            <div className="flex items-center gap-3">
              <span className="text-slate-500 font-medium whitespace-nowrap">Hiển thị</span>
              <select 
                value={ITEMS_PER_PAGE}
                disabled
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 focus:border-emerald-400 outline-none text-slate-600 font-bold shadow-sm"
              >
                <option value={20}>20</option>
              </select>
              <span className="text-slate-500 font-medium whitespace-nowrap">bản ghi</span>
            </div>
            
            <div className="flex items-center gap-4 md:gap-6">
              <span className="text-slate-400 font-medium hidden sm:inline italic">
                {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredRecords.length)} trên {filteredRecords.length}
              </span>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 md:p-2 border border-slate-200 rounded-lg md:rounded-xl hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed bg-white transition-all shadow-sm"
                >
                  <ChevronLeft size={16} className="text-slate-600" />
                </button>
                <div className="flex items-center px-3 md:px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg md:rounded-xl font-bold border border-emerald-100">
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

      {/* Add/Edit Modal */}
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
                  {editingRecord ? (isEditing ? 'Sửa tài khoản' : 'Chi tiết tài khoản') : 'Thêm tài khoản mới'}
                </h2>
              </div>
              {editingRecord && !isEditing && (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="p-2 text-emerald-600 font-bold text-sm bg-emerald-50 rounded-lg px-3 mr-2"
                >
                  Sửa
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {/* Basic Info Section */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Thông tin cơ bản</span>
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
                            key={c.id} 
                            className="px-4 py-2.5 hover:bg-emerald-50 cursor-pointer border-b border-slate-50 last:border-0"
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
                        className="w-9 h-9 bg-slate-50 rounded-full flex items-center justify-center text-slate-500 border border-slate-100 active:scale-95 transition-all"
                      >
                        <User size={18} />
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

              {/* Account Info Section */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                      <Shield size={16} />
                    </div>
                  <span className="text-[12px] font-bold text-slate-700 uppercase tracking-tight">Thông tin Tài khoản</span>
                </div>
                {!isEditing && editingRecord && (
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg"
                  >
                    Sửa
                  </button>
                )}
              </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1 tracking-wider">Tên tài khoản (user/pass)</label>
                    <input 
                      type="text"
                      className={`w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-[14px] font-black text-slate-800 focus:border-emerald-300 outline-none transition-all ${!isEditing ? 'cursor-default' : ''}`}
                      placeholder="User / Pass..."
                      value={accountName}
                      onChange={(e) => isEditing && setAccountName(e.target.value)}
                      readOnly={!isEditing}
                    />
                  </div>
                </div>
              </div>

              {/* Address Section */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-2">Địa chỉ</div>
                <textarea 
                  className={`w-full bg-transparent border-none focus:ring-0 p-0 text-[13px] font-medium text-slate-600 resize-none min-h-[40px] ${!isEditing ? 'cursor-default' : ''}`}
                  placeholder="Địa chỉ lắp đặt..."
                  value={customerAddress}
                  onChange={(e) => isEditing && setCustomerAddress(e.target.value)}
                  readOnly={!isEditing}
                />
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 bg-white border-t border-slate-100 flex gap-3">
               <button 
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-3.5 border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition-all active:scale-95"
              >
                Đóng
              </button>
              {(!editingRecord || isEditing) && (
                <button 
                  onClick={handleSave}
                  className="flex-[2] bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3.5 rounded-2xl font-bold shadow-lg shadow-emerald-200 transition-all active:scale-95 text-sm"
                >
                  {editingRecord ? 'Lưu thay đổi' : 'Lưu tài khoản'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
