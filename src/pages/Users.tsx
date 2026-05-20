import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { useScrollLock } from '../hooks/useScrollLock';
import { User } from '../types';
import { useMobileBackModal } from '../hooks/useMobileBackModal';
import { Plus, Search, Edit2, Trash2, Shield, User as UserIcon, Mail, Key, X, Check, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';

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

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.name.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => b.id.localeCompare(a.id));

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
    } else {
      setEditingUser(null);
      setUsername('');
      setPassword('');
      setName('');
      setRole('CASHIER');
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!username || !name || (!editingUser && !password)) {
      alert('Vui lòng điền đầy đủ thông tin');
      return;
    }

    if (editingUser) {
      await updateUser(editingUser.id, {
        username,
        name,
        role,
        ...(password ? { password } : {})
      });
    } else {
      await addUser({
        id: `U${Date.now().toString().slice(-4)}`,
        username,
        password,
        name,
        role
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
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' :
                      user.role === 'CASHIER' ? 'bg-blue-100 text-blue-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>
                      <Shield size={10} />
                      {user.role === 'ADMIN' ? 'Quản trị viên' : user.role === 'CASHIER' ? 'Thu ngân' : 'Kho hàng'}
                    </span>
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
          <div className="bg-white w-full max-w-md md:rounded-xl rounded-none shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col h-full md:h-auto">
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
                      onClick={() => setRole(r)}
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
