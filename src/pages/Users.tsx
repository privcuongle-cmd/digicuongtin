import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { useScrollLock } from '../hooks/useScrollLock';
import { User, hasPermission, UserPermissions } from '../types';
import { useMobileBackModal } from '../hooks/useMobileBackModal';
import { Plus, Search, Edit2, Trash2, Shield, User as UserIcon, Mail, Key, X, Check, AlertCircle, ChevronLeft, ChevronRight, TrendingUp, Truck, Wallet, CreditCard } from 'lucide-react';

const Users: React.FC = () => {
  const { users, currentUser, addUser, updateUser, deleteUser } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  useScrollLock(isModalOpen);
  
  // Form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'CASHIER' | 'STOCKKEEPER'>('CASHIER');

  // Permission checkboxes state
  const [canViewProfit, setCanViewProfit] = useState(true);
  const [canManageSuppliers, setCanManageSuppliers] = useState(true);
  const [canManageCashLedger, setCanManageCashLedger] = useState(true);
  const [canManageWallet, setCanManageWallet] = useState(true);

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.name.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => String(b.id || '').localeCompare(String(a.id || '')));

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setUsername(user.username);
      setPassword(''); // Don't show password
      setName(user.name);
      setRole(user.role);
      setCanViewProfit(hasPermission(user, 'canViewProfit'));
      setCanManageSuppliers(hasPermission(user, 'canManageSuppliers'));
      setCanManageCashLedger(hasPermission(user, 'canManageCashLedger'));
      setCanManageWallet(hasPermission(user, 'canManageWallet'));
    } else {
      setEditingUser(null);
      setUsername('');
      setPassword('');
      setName('');
      setRole('CASHIER');
      setCanViewProfit(false);
      setCanManageSuppliers(false);
      setCanManageCashLedger(true);
      setCanManageWallet(false);
    }
    setIsModalOpen(true);
  };

  const handleSelectRole = (r: 'ADMIN' | 'CASHIER' | 'STOCKKEEPER') => {
    setRole(r);
    if (r === 'ADMIN') {
      setCanViewProfit(true);
      setCanManageSuppliers(true);
      setCanManageCashLedger(true);
      setCanManageWallet(true);
    }
  };

  const handleSave = async () => {
    if (!username || !name || (!editingUser && !password)) {
      alert('Vui lòng điền đầy đủ thông tin');
      return;
    }

    const userPermissions: UserPermissions = {
      canViewProfit,
      canManageSuppliers,
      canManageCashLedger,
      canManageWallet
    };

    if (editingUser) {
      await updateUser(editingUser.id, {
        username,
        name,
        role,
        permissions: userPermissions,
        canViewProfit,
        canManageSuppliers,
        canManageCashLedger,
        canManageWallet,
        ...(password ? { password } : {})
      });
    } else {
      await addUser({
        id: `U${Date.now().toString().slice(-4)}`,
        username,
        password,
        name,
        role,
        permissions: userPermissions,
        canViewProfit,
        canManageSuppliers,
        canManageCashLedger,
        canManageWallet
      });
    }
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (id === currentUser?.id) {
      alert('Bạn không thể xóa chính mình!');
      return;
    }
    if (window.confirm('Bạn có chắc chắn muốn xóa người dùng này?')) {
      await deleteUser(id);
    }
  };

  if (currentUser?.role !== 'ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500">
        <AlertCircle size={48} className="mb-4 text-red-400" />
        <p className="text-lg font-bold">Truy cập bị từ chối</p>
        <p>Chỉ Quản trị viên mới có quyền truy cập trang này.</p>
      </div>
    );
  }

  useMobileBackModal(isModalOpen, () => setIsModalOpen(false)); // auto-injected
  useMobileBackModal(!!editingUser, () => setEditingUser(null)); // auto-injected

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Quản lý người dùng</h2>
          <p className="text-sm text-slate-500 font-medium">Thêm, sửa, xóa tài khoản nhân viên</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-md"
        >
          <Plus size={20} /> Thêm người dùng
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Tìm theo tên hoặc tài khoản..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-100 transition-all font-medium"
            />
          </div>
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                <th className="px-6 py-3">Người dùng</th>
                <th className="px-6 py-3">Tài khoản</th>
                <th className="px-6 py-3">Vai trò</th>
                <th className="px-6 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedUsers.map((user, idx) => (
                <tr key={`desktop-user-${user.id || idx}`} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
                        <UserIcon size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{user.name}</p>
                        <p className="text-xs text-slate-400 font-medium">ID: {user.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm bg-slate-100 px-2 py-1 rounded text-slate-600 font-bold">
                      {user.username}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider w-fit ${
                        user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' :
                        user.role === 'CASHIER' ? 'bg-blue-100 text-blue-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        <Shield size={10} />
                        {user.role === 'ADMIN' ? 'Quản trị viên' : user.role === 'CASHIER' ? 'Thu ngân' : 'Kho hàng'}
                      </span>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {hasPermission(user, 'canViewProfit') && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded flex items-center gap-1">
                            <TrendingUp size={9} /> Lợi nhuận
                          </span>
                        )}
                        {hasPermission(user, 'canManageSuppliers') && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded flex items-center gap-1">
                            <Truck size={9} /> NCC
                          </span>
                        )}
                        {hasPermission(user, 'canManageCashLedger') && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded flex items-center gap-1">
                            <Wallet size={9} /> Sổ quỹ
                          </span>
                        )}
                        {hasPermission(user, 'canManageWallet') && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded flex items-center gap-1">
                            <CreditCard size={9} /> Ví
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => handleOpenModal(user)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(user.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View - Card Layout */}
        <div className="md:hidden divide-y divide-slate-100">
          {paginatedUsers.length === 0 ? (
            <div className="p-12 text-center text-slate-400 italic">Không tìm thấy người dùng</div>
          ) : (
            paginatedUsers.map((user, idx) => (
              <div key={`mobile-user-${user.id || idx}`} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 ${
                    user.role === 'ADMIN' ? 'bg-purple-50 border-purple-100 text-purple-600' :
                    user.role === 'CASHIER' ? 'bg-blue-50 border-blue-100 text-blue-600' :
                    'bg-orange-50 border-orange-100 text-orange-600'
                  }`}>
                    {user.role === 'ADMIN' ? <Shield size={24} /> : <UserIcon size={24} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-black text-slate-800 leading-none">{user.name}</p>
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                        user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' :
                        user.role === 'CASHIER' ? 'bg-blue-100 text-blue-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {user.role === 'ADMIN' ? 'Hệ thống' : user.role === 'CASHIER' ? 'Bán hàng' : 'Kho'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-400">@{user.username}</span>
                      <span className="text-[10px] text-slate-300 font-mono">ID: {user.id}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2 shadow-sm border border-slate-100 rounded-xl p-1 bg-white">
                  <button 
                    onClick={() => handleOpenModal(user)}
                    className="p-2.5 text-blue-600 hover:bg-blue-50 active:bg-blue-100 rounded-lg transition-all"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button 
                    onClick={() => handleDelete(user.id)}
                    className="p-2.5 text-red-600 hover:bg-red-50 active:bg-red-100 rounded-lg transition-all border-t border-slate-50"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/30 flex items-center justify-between gap-4">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Trang {currentPage} / {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
                className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-blue-50 hover:border-blue-200 transition-all shadow-sm"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-blue-50 hover:border-blue-200 transition-all shadow-sm"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white w-full sm:max-w-xl md:max-w-3xl md:rounded-xl rounded-none shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col h-full md:h-auto">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
              <h3 className="text-lg font-black text-slate-800 tracking-tight uppercase">
                {editingUser ? 'Sửa người dùng' : 'Thêm người dùng mới'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 bg-white text-slate-400 rounded-full hover:bg-slate-200 transition-colors flex items-center justify-center shadow-sm">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4 flex-1 overflow-y-auto">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Tên hiển thị</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-100 font-bold text-slate-700"
                    placeholder="Nguyễn Văn A"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Tên đăng nhập</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-100 font-bold text-slate-700"
                    placeholder="admin, nhanvien01..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                  Mật khẩu {editingUser && '(Để trống nếu không đổi)'}
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-100 font-bold text-slate-700"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Vai trò</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['ADMIN', 'CASHIER', 'STOCKKEEPER'] as const).map(r => (
                    <button
                      key={r}
                      onClick={() => handleSelectRole(r)}
                      className={`py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${
                        role === r 
                          ? 'bg-blue-600 border-blue-600 text-white shadow-md' 
                          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      {r === 'ADMIN' ? 'Quản trị' : r === 'CASHIER' ? 'Thu ngân' : 'Kho hàng'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Permissions checkboxes section */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Shield size={14} className="text-blue-600" />
                    Phân quyền tính năng
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium">
                    Tích chọn các quyền cho phép tài khoản này sử dụng
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {/* 1. Quyền xem lợi nhuận */}
                  <label className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                    canViewProfit ? 'bg-emerald-50/70 border-emerald-200 text-slate-800' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100/50'
                  }`}>
                    <input 
                      type="checkbox"
                      checked={canViewProfit}
                      onChange={(e) => setCanViewProfit(e.target.checked)}
                      className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-bold block text-slate-800 flex items-center gap-1">
                        <TrendingUp size={12} className="text-emerald-600" /> Xem lợi nhuận
                      </span>
                      <span className="text-[10px] text-slate-400 block leading-tight mt-0.5">Hiển thị thông số lợi nhuận gộp trên Báo cáo & Tổng quan</span>
                    </div>
                  </label>

                  {/* 2. Chức năng nhà cung cấp */}
                  <label className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                    canManageSuppliers ? 'bg-blue-50/70 border-blue-200 text-slate-800' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100/50'
                  }`}>
                    <input 
                      type="checkbox"
                      checked={canManageSuppliers}
                      onChange={(e) => setCanManageSuppliers(e.target.checked)}
                      className="mt-0.5 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-bold block text-slate-800 flex items-center gap-1">
                        <Truck size={12} className="text-blue-600" /> Quản lý Nhà cung cấp
                      </span>
                      <span className="text-[10px] text-slate-400 block leading-tight mt-0.5">Truy cập danh sách, công nợ & giao dịch NCC</span>
                    </div>
                  </label>

                  {/* 3. Chức năng sổ quỹ */}
                  <label className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                    canManageCashLedger ? 'bg-amber-50/70 border-amber-200 text-slate-800' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100/50'
                  }`}>
                    <input 
                      type="checkbox"
                      checked={canManageCashLedger}
                      onChange={(e) => setCanManageCashLedger(e.target.checked)}
                      className="mt-0.5 w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-bold block text-slate-800 flex items-center gap-1">
                        <Wallet size={12} className="text-amber-600" /> Chức năng Sổ quỹ
                      </span>
                      <span className="text-[10px] text-slate-400 block leading-tight mt-0.5">Lập phiếu thu/chi & theo dõi dòng tiền mặt</span>
                    </div>
                  </label>

                  {/* 4. Quản lý ví */}
                  <label className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                    canManageWallet ? 'bg-purple-50/70 border-purple-200 text-slate-800' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100/50'
                  }`}>
                    <input 
                      type="checkbox"
                      checked={canManageWallet}
                      onChange={(e) => setCanManageWallet(e.target.checked)}
                      className="mt-0.5 w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-bold block text-slate-800 flex items-center gap-1">
                        <CreditCard size={12} className="text-purple-600" /> Quản lý ví
                      </span>
                      <span className="text-[10px] text-slate-400 block leading-tight mt-0.5">Xem & quản lý số dư, nạp/rút tiền ví điện tử</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex gap-3 shrink-0">
              <button 
                onClick={handleSave}
                className="flex-1 py-3 bg-blue-600 text-white font-black rounded-lg hover:bg-blue-700 transition-all shadow-md flex items-center justify-center gap-2 uppercase text-[11px] tracking-widest active:scale-95"
              >
                Lưu
              </button>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-3 bg-[#991b1b] text-white font-black rounded-lg hover:bg-[#7f1d1d] transition-all shadow-md uppercase text-[10px] tracking-widest active:scale-95 md:hidden"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
