import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  User, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  MoreVertical, 
  Edit3, 
  Trash2, 
  MessageSquare, 
  Send, 
  X,
  Lock,
  Bell,
  Settings,
  ArrowRight,
  ClipboardList,
  ShoppingCart,
  ShoppingBag,
  Wrench,
  Phone,
  MapPin,
  ExternalLink,
  Navigation,
  FileText,
  History,
  Image as ImageIcon,
  Loader2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Task, TelegramSettings, Customer, Invoice, MaintenanceRecord, FeedbackEntry } from '../types';
import { formatDateTime, parseDateString, smartParseDate, handlePhoneCall, formatDate } from '../lib/utils';
import { generateId } from '../lib/idUtils';
import { useMobileBackModal } from '../hooks/useMobileBackModal';
import { AddCustomerModal } from '../components/AddCustomerModal';
import { motion, AnimatePresence } from 'motion/react';
import { ImageLibraryModal } from '../components/ImageLibraryModal';

export const Tasks: React.FC = () => {
  const { 
    tasks, 
    addTask, 
    updateTask, 
    deleteTask, 
    users, 
    currentUser, 
    telegramSettings, 
    updateTelegramSettings,
    customers,
    addCustomer,
    invoices,
    maintenanceRecords,
    images
  } = useAppContext();

  const location = useLocation();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<Task['status'] | 'ALL' | 'NOT_COMPLETED'>('NOT_COMPLETED');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<Task | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  const [statusConfirm, setStatusConfirm] = useState<{ task: Task, newStatus: Task['status'] } | null>(null);
  const [confirmFeedback, setConfirmFeedback] = useState('');

  useEffect(() => {
    if (statusConfirm?.newStatus === 'COMPLETED') {
      setConfirmFeedback('');
    }
  }, [statusConfirm]);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [feedback, setFeedback] = useState('');
  const [status, setStatus] = useState<Task['status']>('TODO');
  const [priority, setPriority] = useState<Task['priority']>('MEDIUM');
  const [dueDate, setDueDate] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [showCustomerResults, setShowCustomerResults] = useState(false);

  // New customer modal state (Synced with Customers.tsx)
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');

  useEffect(() => {
    if (location.state?.openAddFromCustomer) {
      const c = location.state.openAddFromCustomer;
      setCustomerId(c.id);
      setIsModalOpen(true);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const navigate = useNavigate();

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setFeedback('');
    setStatus('TODO');
    setPriority('MEDIUM');
    setDueDate('');
    setAssignedTo('');
    setCustomerId('');
    setCustomerSearchTerm('');
    setEditingTask(null);
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'RECEIVING': return 'Tiếp nhận';
      case 'REPAIRING': return 'Đang sửa';
      case 'COMPLETED': return 'Đã xong';
      case 'RETURNED': return 'Đã trả khách';
      default: return status;
    }
  };

  // Helper to format duration/time remaining
  const getTimeRemaining = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      const dueDate = new Date(dateStr);
      const now = new Date();
      const diffInMs = dueDate.getTime() - now.getTime();
      
      if (diffInMs < 0) {
        return { text: 'Đã quá hạn', color: 'text-red-600' };
      }

      const diffInSecs = Math.floor(diffInMs / 1000);
      const diffInMins = Math.floor(diffInSecs / 60);
      const diffInHours = Math.floor(diffInMins / 60);
      const diffInDays = Math.floor(diffInHours / 24);

      if (diffInDays > 0) {
        return { text: `Còn ${diffInDays} ngày ${diffInHours % 24} giờ`, color: 'text-rose-600' };
      }
      
      const seconds = diffInSecs % 60;
      const minutes = diffInMins % 60;
      const hours = diffInHours % 24;

      return { 
        text: `Còn ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`, 
        color: 'text-rose-600' 
      };
    } catch (e) {
      return null;
    }
  };

  // State for real-time clock
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Helper to format time ago
  const getTimeAgo = (dateStr: string) => {
    try {
      const date = smartParseDate(dateStr);
      if (isNaN(date.getTime())) return { text: dateStr, color: 'text-slate-400' };

      const diffInMs = now.getTime() - date.getTime();
      const diffInSecs = Math.floor(diffInMs / 1000);
      const diffInMins = Math.floor(diffInSecs / 60);
      const diffInHours = Math.floor(diffInMins / 60);

      const color = diffInHours < 24 ? 'text-emerald-500' : 'text-red-500';

      if (diffInSecs < 60) return { text: `${Math.max(0, diffInSecs)} giây trước`, color };
      if (diffInMins < 60) return { text: `${diffInMins} phút trước`, color };
      
      if (diffInHours < 24) return { text: `${diffInHours} giờ trước`, color };
      
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 30) return { text: `${diffInDays} ngày trước`, color };
      
      return { text: formatDate(date), color };
    } catch (e) {
      return { text: dateStr, color: 'text-slate-400' };
    }
  };

  const getFeedbackHistory = (task: Task): FeedbackEntry[] => {
    if (!task.feedback || !task.feedback.trim()) return [];
    
    // Check if it's the old JSON format
    if (task.feedback.startsWith('[') && task.feedback.endsWith(']')) {
      try {
        const parsed = JSON.parse(task.feedback);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // Fallback to text parsing
      }
    }

    // New plain text format: Split by newline
    const lines = task.feedback.split('\n').filter(line => line.trim());
    return lines.map((line, index) => {
      // Try to extract metadata if it follows [time] user: message
      const match = line.match(/^\[(.*?)\] (.*?): (.*)$/);
      if (match) {
        return {
          id: `line-${index}`,
          timestamp: match[1],
          userName: match[2],
          message: match[3]
        };
      }
      return {
        id: `line-${index}`,
        message: line,
        timestamp: '',
        userName: 'Ghi chú'
      };
    });
  };

  const getLatestFeedbackMessage = (task: Task): string => {
    if (!task.feedback) return '';
    const lines = task.feedback.split('\n').filter(line => line.trim());
    if (lines.length > 0) {
      const lastLine = lines[lines.length - 1];
      const match = lastLine.match(/^\[.*?\] .*?: (.*)$/);
      return match ? match[1] : lastLine;
    }
    return '';
  };

  const formatTaskDuration = (startStr: string, endStr: string | number) => {
    try {
      const s = parseDateString(startStr);
      const e = typeof endStr === 'number' ? endStr : parseDateString(endStr);
      if (!s || !e || isNaN(s) || isNaN(e)) return '';
      
      // Handle the case where end might be slightly before start due to clock drift or parsing edge cases
      const diffInMs = Math.abs(e - s);
      const diffInMins = Math.floor(diffInMs / 60000);
      const diffInHours = Math.floor(diffInMins / 60);
      const diffInDays = Math.floor(diffInHours / 24);

      if (diffInDays > 0) {
        return `${diffInDays} ngày ${diffInHours % 24 > 0 ? `${diffInHours % 24} giờ` : ''}`;
      }
      if (diffInHours > 0) {
        return `${diffInHours} giờ ${diffInMins % 60 > 0 ? `${diffInMins % 60} phút` : ''}`;
      }
      if (diffInMins > 0) {
        return `${diffInMins} phút`;
      }
      return `1 phút`;
    } catch {
      return '';
    }
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description);
    setFeedback(getLatestFeedbackMessage(task));
    setStatus(task.status);
    setPriority(task.priority);
    setDueDate(task.dueDate || '');
    setAssignedTo(task.assignedTo || '');
    setCustomerId(task.customerId || '');
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!assignedTo) {
      alert('Vui lòng chọn nhân viên nhận việc để hiển thị thời gian nhé!');
      return;
    }

    const customer = customers.find(c => c.id === customerId);
    // Use customer name as title or default to 'N/A'
    const finalTitle = customer ? customer.name : 'N/A';

    const latestMsg = editingTask ? getLatestFeedbackMessage(editingTask) : '';
    
    let finalFeedback = editingTask?.feedback || '';

    if (feedback && feedback.trim() && feedback.trim() !== latestMsg) {
      const timeStr = formatDateTime(new Date());
      const userName = currentUser?.name || 'NV';
      const newLine = `[${timeStr}] ${userName}: ${feedback}`;
      finalFeedback = finalFeedback ? finalFeedback + '\n' + newLine : newLine;
    }

    const taskData: Task = {
      id: editingTask?.id || generateId('CV', tasks),
      title: finalTitle,
      description,
      feedback: finalFeedback,
      status,
      priority,
      dueDate,
      assignedTo,
      customerId,
      customerPhone: customer?.phone || '',
      customerAddress: customer?.address || customer?.location || '',
      taskType: editingTask?.taskType || 'GENERAL',
      relatedId: editingTask?.relatedId || '',
      purchaseId: editingTask?.purchaseId || '',
      repairId: editingTask?.repairId || '',
      createdBy: editingTask?.createdBy || currentUser?.name || 'Admin',
      createdAt: editingTask?.createdAt || formatDateTime(new Date()),
      completedAt: status === 'COMPLETED' ? (editingTask?.completedAt || formatDateTime(new Date())) : (status !== 'COMPLETED' ? '' : editingTask?.completedAt),
      updatedAt: new Date().toISOString()
    };

    if (editingTask) {
      updateTask(editingTask.id, taskData);
    } else {
      addTask(taskData);
    }

    setIsModalOpen(false);
    resetForm();
  };

  const getPriorityWeight = (p: Task['priority']) => {
    switch (p) {
      case 'CRITICAL': return 4;
      case 'HIGH': return 3;
      case 'MEDIUM': return 2;
      case 'LOW': return 1;
      default: return 0;
    }
  };

  const filteredTasks = tasks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' 
      ? true 
      : statusFilter === 'NOT_COMPLETED' 
        ? t.status !== 'COMPLETED' 
        : t.status === statusFilter;
    return matchesSearch && matchesStatus;
  }).sort((a, b) => parseDateString(b.createdAt) - parseDateString(a.createdAt));

  const totalPages = Math.ceil(filteredTasks.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedTasks = filteredTasks.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, rowsPerPage]);

  const getPriorityColor = (p: Task['priority']) => {
    switch(p) {
      case 'LOW': return 'bg-slate-100 text-slate-600';
      case 'MEDIUM': return 'bg-blue-50 text-blue-600';
      case 'HIGH': return 'bg-orange-50 text-orange-600';
      case 'CRITICAL': return 'bg-red-50 text-red-600';
      default: return 'bg-slate-50 text-slate-600';
    }
  };

  const getStatusIcon = (s: Task['status']) => {
    if (s === 'COMPLETED') {
      return (
        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded">
          <CheckCircle2 size={12} className="fill-emerald-600 text-white" />
          <span className="text-[9px] font-black uppercase">Hoàn thành</span>
        </div>
      );
    }
    return <MapPin size={16} fill="currentColor" className="text-rose-500" />;
  };

  useMobileBackModal(isModalOpen, () => setIsModalOpen(false)); // auto-injected
  useMobileBackModal(isAddCustomerModalOpen, () => setIsAddCustomerModalOpen(false));
  useMobileBackModal(showCustomerResults, () => setShowCustomerResults(false)); // auto-injected
  useMobileBackModal(!!selectedTaskDetail, () => {
    setSelectedTaskDetail(null);
  });
  useMobileBackModal(!!statusConfirm, () => setStatusConfirm(null));
  useMobileBackModal(!!editingTask, () => setEditingTask(null));

  return (
    <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="hidden md:flex text-2xl font-black text-slate-800 tracking-tighter items-center gap-2">
            Quản lý công việc
            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold ml-2">
              {tasks.length}
            </span>
          </h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
            <button 
              onClick={() => setStatusFilter('NOT_COMPLETED')}
              className="text-[10px] font-black text-rose-600 uppercase tracking-tight flex items-center gap-1 hover:opacity-80 transition-opacity"
            >
              <ClipboardList size={12} />
              {tasks.filter(t => t.status !== 'COMPLETED' && t.status !== 'CANCELLED').length} việc chưa xong
            </button>
            <button 
              onClick={() => setStatusFilter('TODO')}
              className="text-[10px] font-black text-orange-500 uppercase tracking-tight flex items-center gap-1 hover:opacity-80 transition-opacity"
            >
              <AlertCircle size={12} />
              {tasks.filter(t => t.status === 'TODO').length} việc chưa nhận
            </button>
            <button 
              onClick={() => setStatusFilter('ACCEPTED')}
              className="text-[10px] font-black text-blue-500 uppercase tracking-tight flex items-center gap-1 hover:opacity-80 transition-opacity"
            >
              <MapPin size={12} />
              {tasks.filter(t => t.status === 'ACCEPTED').length} việc chưa check-in
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative group flex-1 md:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm..." 
              className="pl-10 pr-4 py-2 bg-slate-100 border-none rounded-xl text-sm font-medium w-full md:w-[250px] outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>
          <button 
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="hidden md:flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-xl font-black text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95"
          >
            <Plus size={18} /> Thêm mới
          </button>
        </div>
      </div>

      {/* Filters Bar - Compact for Mobile */}
      <div className="bg-white border-b border-slate-100 px-4 md:px-6 py-1.5 flex items-center gap-1.5 overflow-x-auto custom-scrollbar shrink-0 scroll-smooth no-scrollbar">
        <button 
          onClick={() => setStatusFilter('NOT_COMPLETED')}
          className={`px-3 py-1.5 md:py-1.5 rounded-full text-[9px] md:text-[10px] font-black whitespace-nowrap transition-all ${statusFilter === 'NOT_COMPLETED' ? 'bg-blue-600 text-white shadow-md shadow-blue-100' : 'text-slate-500 hover:bg-slate-100'}`}
        >
          CÒN LẠI ({tasks.filter(t => t.status !== 'COMPLETED').length})
        </button>  
        <button 
          onClick={() => setStatusFilter('ALL')}
          className={`px-3 py-1.5 md:py-1.5 rounded-full text-[9px] md:text-[10px] font-black whitespace-nowrap transition-all ${statusFilter === 'ALL' ? 'bg-blue-600 text-white shadow-md shadow-blue-100' : 'text-slate-500 hover:bg-slate-100'}`}
        >
          TẤT CẢ ({tasks.length})
        </button>
        {[
          { label: 'CHƯA NHẬN', val: 'TODO' },
          { label: 'ĐÃ NHẬN', val: 'ACCEPTED' },
          { label: 'CHECK-IN', val: 'IN_PROGRESS' },
          { label: 'XONG', val: 'COMPLETED' },
          { label: 'HỦY', val: 'CANCELLED' },
        ].map(f => (
          <button 
            key={f.val}
            onClick={() => setStatusFilter(f.val as any)}
            className={`px-3 py-1.5 md:py-1.5 rounded-full text-[9px] md:text-[10px] font-black whitespace-nowrap transition-all ${statusFilter === f.val ? 'bg-blue-600 text-white shadow-md shadow-blue-100' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            {f.label} ({tasks.filter(t => t.status === f.val).length})
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        {/* Mobile Grid View */}
        <div className="grid grid-cols-1 md:hidden gap-4">
          <AnimatePresence mode="popLayout">
            {paginatedTasks.length === 0 ? (
              <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-300">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
                  <ClipboardList size={40} />
                </div>
                <p className="text-lg font-bold italic">Chưa có công việc nào</p>
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="mt-4 text-blue-600 font-bold hover:underline"
                >
                  Tạo công việc đầu tiên
                </button>
              </div>
            ) : (
              paginatedTasks.map(task => (
                <motion.div 
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  key={`mobile-task-${task.id}`} 
                  className="group bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-default relative overflow-hidden"
                >
                  {/* Priority Indicator */}
                  <div className={`absolute top-0 right-0 w-12 h-12 flex items-center justify-center translate-x-4 -translate-y-4 rotate-45 ${getPriorityColor(task.priority)} shadow-sm opacity-50`}></div>

                  <div className="flex justify-between items-start mb-1 relative">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(task.status)}
                      <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded italic">#{task.id}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => handleEdit(task)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button 
                        onClick={() => { if(confirm('Xóa công việc này?')) deleteTask(task.id); }}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div 
                    onClick={() => {
                      setSelectedTaskDetail(task);
                      if (task.status === 'TODO') {
                        updateTask(task.id, { ...task, status: 'ACCEPTED' });
                      }
                    }}
                    className="cursor-pointer"
                  >
                    <h3 className={`font-black leading-tight mb-2 transition-colors tracking-tight ${task.status !== 'COMPLETED' ? 'text-red-600 group-hover:text-red-700' : 'text-slate-800 group-hover:text-blue-700'}`}>
                      {customers.find(c => c.id === task.customerId)?.name || task.title || 'N/A'}
                    </h3>
                    <p className="text-sm text-slate-500 line-clamp-2 mb-2 leading-relaxed font-medium">
                      {task.description || 'Không có mô tả chi tiết'}
                    </p>
                    {getLatestFeedbackMessage(task) && (
                      <div className="flex items-start gap-1.5 bg-blue-50/50 px-2.5 py-1.5 rounded-lg border border-blue-100/50 mb-3">
                        <MessageSquare size={10} className="text-blue-500 mt-0.5 shrink-0" />
                        <p className="text-[10px] text-blue-700 font-bold line-clamp-1 italic">{getLatestFeedbackMessage(task)}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 mb-3">
                    {task.customerId ? (
                      <>
                        <a 
                          href="#"
                          onClick={(e) => handlePhoneCall(e, customers.find(c => c.id === task.customerId)?.phone)}
                          className="flex-1 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black hover:bg-emerald-700 transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-100 active:scale-95"
                        >
                          <Phone size={12} className="fill-white" /> {customers.find(c => c.id === task.customerId)?.phone}
                        </a>
                        <a 
                          href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(customers.find(c => c.id === task.customerId)?.location || '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black hover:bg-slate-200 transition-all flex items-center justify-center gap-1.5"
                        >
                          <Navigation size={12} /> Chỉ đường
                        </a>
                      </>
                    ) : (
                      <div className="flex-1 py-2 bg-slate-50 text-slate-400 rounded-xl text-[10px] font-black text-center italic">
                        Chưa gắn khách hàng
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5 mt-auto">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                       <div className="flex flex-col gap-0.5">
                         <div className="flex items-center gap-1.5 text-slate-400">
                           <Calendar size={12} />
                           <span>{task.dueDate ? formatDateTime(task.dueDate) : 'Không thời hạn'}</span>
                         </div>
                         {task.status !== 'COMPLETED' && task.dueDate && (
                           <div className={`text-[9px] font-black italic flex items-center gap-1 ${getTimeRemaining(task.dueDate)?.color}`}>
                             <Clock size={10} />
                             {getTimeRemaining(task.dueDate)?.text}
                           </div>
                         )}
                         {task.status === 'COMPLETED' && task.completedAt && formatTaskDuration(task.createdAt, task.completedAt) && (
                           <div className="text-[9px] font-black italic flex items-center gap-1 text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-100">
                             <CheckCircle2 size={10} />
                             {formatTaskDuration(task.createdAt, task.completedAt)}
                           </div>
                         )}
                       </div>
                       <div className={`px-2 py-0.5 rounded-full text-[9px] font-black ${getPriorityColor(task.priority)}`}>
                         {task.priority === 'CRITICAL' ? 'Khẩn cấp' : task.priority === 'HIGH' ? 'Cao' : task.priority === 'MEDIUM' ? 'Trung bình' : 'Thấp'}
                       </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 border border-white">
                          <User size={12} />
                        </div>
                        <span className="text-[10px] font-black text-slate-600 truncate max-w-[80px]">
                          {task.assignedTo || 'Chưa giao'}
                        </span>
                      </div>
                      {task.status === 'COMPLETED' && task.completedAt && formatTaskDuration(task.createdAt, task.completedAt) ? (
                        <div className="flex items-center gap-1 text-[9px] font-black italic text-emerald-600">
                          Hoàn thành trong {formatTaskDuration(task.createdAt, task.completedAt)}
                        </div>
                      ) : (
                        <div className={`flex items-center gap-1 text-[9px] font-black italic ${getTimeAgo(task.createdAt).color}`}>
                          <Clock size={10} />
                          {getTimeAgo(task.createdAt).text}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-w-[1000px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Khách hàng / Công việc</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider w-[180px]">Nhân viên</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider w-[140px]">Ưu tiên</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider w-[220px]">Thời gian</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider w-[160px]">Trạng thái</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider w-[120px] text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedTasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-300">
                      <ClipboardList size={40} className="mb-2 opacity-20" />
                      <p className="text-sm font-bold italic">Không tìm thấy công việc nào</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedTasks.map(task => {
                  const customer = customers.find(c => c.id === task.customerId);
                  return (
                    <tr 
                      key={`desktop-task-${task.id}`} 
                      className="hover:bg-blue-50/30 transition-colors group cursor-pointer"
                      onClick={() => {
                        setSelectedTaskDetail(task);
                        if (task.status === 'TODO') {
                          updateTask(task.id, { ...task, status: 'ACCEPTED' });
                        }
                      }}
                    >
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <p className={`text-sm font-black leading-tight transition-colors ${task.status !== 'COMPLETED' ? 'text-red-600 group-hover:text-red-700' : 'text-slate-800 group-hover:text-blue-700'}`}>
                              {customer?.name || task.title || 'N/A'}
                            </p>
                          </div>
                          <p className="text-[11px] text-slate-400 font-bold mt-0.5 line-clamp-1">{task.description || 'Không có mô tả chi tiết'}</p>
                          {customer && (
                            <div className="flex items-center gap-2 mt-2">
                              <a 
                                href="#"
                                onClick={(e) => handlePhoneCall(e, customer.phone)}
                                className="text-[9px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-lg flex items-center gap-1 hover:bg-emerald-100 transition-colors"
                              >
                                <Phone size={10} className="fill-emerald-600 text-transparent" /> {customer.phone}
                              </a>
                              <a 
                                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(customer.location || '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-[9px] font-black text-blue-600 bg-blue-50 border border-blue-100 px-2 py-1 rounded-lg flex items-center gap-1 hover:bg-blue-100 transition-colors"
                              >
                                <Navigation size={10} className="fill-blue-600 text-transparent" /> Chỉ đường
                              </a>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 border-2 border-white shadow-sm">
                            <User size={12} />
                          </div>
                          <span className="text-xs font-black text-slate-600">
                            {task.assignedTo || 'Chưa giao'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${getPriorityColor(task.priority)}`}>
                          {task.priority === 'CRITICAL' ? 'Khẩn cấp' : task.priority === 'HIGH' ? 'Cao' : task.priority === 'MEDIUM' ? 'Trung bình' : 'Thấp'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-bold">
                            <Calendar size={12} />
                            <span>{task.dueDate ? formatDateTime(task.dueDate) : 'Không thời hạn'}</span>
                          </div>
                          {task.status !== 'COMPLETED' ? (
                            <div className={`text-[10px] font-black italic flex items-center gap-1 ${task.dueDate ? getTimeRemaining(task.dueDate)?.color : getTimeAgo(task.createdAt).color}`}>
                              <Clock size={11} />
                              {task.dueDate ? getTimeRemaining(task.dueDate)?.text : getTimeAgo(task.createdAt).text}
                            </div>
                          ) : (
                            task.completedAt && (
                              <div className="text-[10px] font-black italic flex items-center gap-1 text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-lg border border-emerald-100 w-fit">
                                <CheckCircle2 size={11} />
                                {formatTaskDuration(task.createdAt, task.completedAt)}
                              </div>
                            )
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {task.status === 'COMPLETED' ? (
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full">
                              <CheckCircle2 size={12} className="fill-emerald-600 text-white" />
                              <span className="text-[10px] font-black uppercase">Hoàn thành</span>
                            </div>
                          ) : task.status === 'CANCELLED' ? (
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-400 rounded-full">
                              <X size={12} />
                              <span className="text-[10px] font-black uppercase">Đã hủy</span>
                            </div>
                          ) : task.status === 'IN_PROGRESS' ? (
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 text-white rounded-full shadow-sm shadow-emerald-100">
                              <Clock size={12} className="animate-pulse" />
                              <span className="text-[10px] font-black uppercase tracking-tight">Đang làm</span>
                            </div>
                          ) : (
                            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border ${task.status === 'TODO' ? 'bg-orange-50 text-orange-500 border-orange-100' : 'bg-blue-50 text-blue-500 border-blue-100'}`}>
                              <MapPin size={12} fill="currentColor" />
                              <span className="text-[10px] font-black uppercase">{task.status === 'TODO' ? 'Chưa nhận' : 'Đã nhận'}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleEdit(task); }}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); if(confirm('Xóa công việc này?')) deleteTask(task.id); }}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          
          {/* Pagination */}
          {filteredTasks.length > 0 && (
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-[11px] shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-bold uppercase tracking-wider">Hiển thị</span>
                <select 
                  value={rowsPerPage} 
                  onChange={(e) => setRowsPerPage(Number(e.target.value))}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-700 font-bold outline-none focus:border-blue-400"
                >
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="text-slate-400 font-bold uppercase tracking-wider">dòng / trang</span>
              </div>
              
              <div className="flex items-center gap-4">
                <span className="text-slate-400 font-bold uppercase tracking-wider hidden sm:inline">
                  {startIndex + 1} - {Math.min(endIndex, filteredTasks.length)} trên tổng {filteredTasks.length}
                </span>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-blue-50 hover:border-blue-200 transition-all shadow-sm"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="px-4 font-black text-slate-700 text-xs">{currentPage} / {totalPages || 1}</span>
                  <button 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-blue-50 hover:border-blue-200 transition-all shadow-sm"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Button for Mobile */}
      <button 
        onClick={() => { resetForm(); setIsModalOpen(true); }}
        className="md:hidden fixed bottom-24 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-all z-[90] ring-4 ring-blue-50"
      >
        <Plus size={28} />
      </button>

      {/* Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-0 md:p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white w-full max-w-5xl rounded-none md:rounded-3xl overflow-hidden shadow-2xl h-full md:h-auto md:max-h-[90vh] flex flex-col"
          >
            <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 text-white rounded-2xl shadow-lg flex items-center justify-center">
                  <Edit3 size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 tracking-tighter">
                    {editingTask ? 'Cập nhật công việc' : 'Tạo công việc mới'}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold italic leading-none mt-0.5">Điền thông tin chi tiết nhiệm vụ</p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
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
                    
                    {customerId ? (
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between group h-fit">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm">
                            <User size={20} />
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-800 leading-none">
                              {customers.find(c => c.id === customerId)?.name}
                            </p>
                            <p className="text-[10px] text-slate-500 font-bold mt-1 italic">
                              {customers.find(c => c.id === customerId)?.phone}
                            </p>
                          </div>
                        </div>
                        {currentUser?.role === 'ADMIN' && (
                          <button 
                            onClick={() => { setCustomerId(''); setCustomerSearchTerm(''); }}
                            className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-full text-slate-400 hover:text-red-500 hover:border-red-200 transition-all shadow-sm"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="relative">
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input 
                              type="text" 
                              value={customerSearchTerm}
                              onChange={(e) => {
                                setCustomerSearchTerm(e.target.value);
                                setShowCustomerResults(true);
                              }}
                              onFocus={() => setShowCustomerResults(true)}
                              placeholder="Tìm theo tên hoặc số điện thoại..."
                              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold shadow-sm outline-none focus:border-blue-500 transition-all font-bold"
                            />
                          </div>
                          <button 
                            type="button"
                            onClick={() => {
                              setNewCustomerName(customerSearchTerm);
                              setIsAddCustomerModalOpen(true);
                            }}
                            className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center border border-blue-700 hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-90"
                            title="Thêm khách hàng mới"
                          >
                            <Plus size={24} />
                          </button>
                        </div>

                        <AnimatePresence>
                          {showCustomerResults && customerSearchTerm.length > 0 && (
                            <motion.div 
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="absolute z-[101] left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden max-h-[250px] overflow-y-auto custom-scrollbar"
                            >
                              {customers.filter(c => 
                                c.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) || 
                                c.phone.includes(customerSearchTerm)
                              ).length === 0 ? (
                                <div className="p-8 flex flex-col items-center gap-4 text-center">
                                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                                    <Search size={32} />
                                  </div>
                                  <div>
                                    <p className="text-slate-500 text-sm font-black uppercase tracking-tight">Không tìm thấy khách hàng</p>
                                    <p className="text-slate-400 text-[10px] font-bold italic mt-1 pb-4">"{(customerSearchTerm)}" không có trong danh sách?</p>
                                    <button 
                                      onClick={() => {
                                        setNewCustomerName(customerSearchTerm);
                                        setIsAddCustomerModalOpen(true);
                                        setShowCustomerResults(false);
                                      }}
                                      className="w-full py-3 bg-blue-600 text-white rounded-xl font-black text-xs hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2"
                                    >
                                      <Plus size={16} /> THÊM MỚI KHÁCH HÀNG NÀY
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex justify-between items-center text-[10px] font-black text-slate-400 uppercase">
                                    <span>Kết quả tìm kiếm</span>
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setNewCustomerName(customerSearchTerm);
                                        setIsAddCustomerModalOpen(true);
                                        setShowCustomerResults(false);
                                      }}
                                      className="text-blue-600 hover:underline"
                                    >
                                      + Thêm mới
                                    </button>
                                  </div>
                                  {customers.filter(c => 
                                    c.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) || 
                                    c.phone.includes(customerSearchTerm)
                                  ).map(c => (
                                    <button 
                                      key={c.id}
                                      onClick={() => {
                                        setCustomerId(c.id || '');
                                        setShowCustomerResults(false);
                                        setCustomerSearchTerm('');
                                      }}
                                      className="w-full p-4 flex items-center gap-4 hover:bg-blue-50 border-b border-slate-50 last:border-0 transition-all text-left"
                                    >
                                      <div className="w-10 h-10 bg-white rounded-xl border border-slate-100 flex items-center justify-center text-blue-600 shadow-sm shrink-0">
                                        <User size={20} />
                                      </div>
                                      <div>
                                        <p className="text-sm font-black text-slate-800 leading-none">{c.name}</p>
                                        <p className="text-[11px] text-slate-500 font-bold mt-1.5">{c.phone}</p>
                                        {c.address && <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{c.address}</p>}
                                      </div>
                                    </button>
                                  ))}
                                </>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    {customerId && customers.find(c => c.id === customerId)?.location && (
                      <div className="mt-2 space-y-2">
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-3">
                          <MapPin className="text-red-500 shrink-0" size={16} />
                          <p className="text-[10px] font-bold text-slate-500 italic truncate flex-1">
                            {customers.find(c => c.id === customerId)?.address || customers.find(c => c.id === customerId)?.location}
                          </p>
                        </div>
                        <div className="aspect-[21/9] bg-white rounded-2xl border border-slate-200 overflow-hidden">
                          <iframe 
                            width="100%" 
                            height="100%" 
                            frameBorder="0" 
                            style={{ border: 0 }}
                            src={`https://maps.google.com/maps?q=${encodeURIComponent(customers.find(c => c.id === customerId)?.location || '')}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
                            allowFullScreen
                          ></iframe>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-wider">Nội dung công việc</label>
                    <textarea 
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      disabled={currentUser?.role !== 'ADMIN'}
                      placeholder="Mô tả công việc cần xử lý..." 
                      rows={4}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold placeholder:text-slate-300 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm resize-none disabled:bg-slate-100 disabled:text-slate-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-wider">Thông tin phản hồi (Mô tả chi tiết hơn / Kết quả)</label>
                    <textarea 
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="Nhập kết quả xử lý, phản hồi từ khách hàng hoặc ghi chú hoàn thành..." 
                      rows={4}
                      className="w-full px-4 py-3 bg-blue-50/50 border border-blue-100 rounded-2xl text-sm font-bold placeholder:text-slate-300 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm resize-none"
                    />
                  </div>
                </div>

                {/* Right Column */}
                <div className="md:col-span-5 space-y-6 pt-2">
                  <div className="space-y-4 p-5 bg-slate-50 rounded-3xl border border-slate-100">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-wider">Mức độ ưu tiên</label>
                      <select 
                        value={priority}
                        onChange={(e) => setPriority(e.target.value as any)}
                        disabled={currentUser?.role !== 'ADMIN'}
                        className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer shadow-sm disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                      >
                        <option value="LOW">Thấp</option>
                        <option value="MEDIUM">Trung bình</option>
                        <option value="HIGH">Cao</option>
                        <option value="CRITICAL">Khẩn cấp</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-wider">Trạng thái</label>
                      <select 
                        value={status}
                        onChange={(e) => setStatus(e.target.value as any)}
                        className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer shadow-sm"
                      >
                        <option value="DRAFT">Nháp</option>
                        <option value="TODO">Chưa bắt đầu (Đã giao)</option>
                        <option value="ACCEPTED">Đã nhận việc</option>
                        <option value="IN_PROGRESS">Đã Check-in</option>
                        <option value="COMPLETED">Đã hoàn thành</option>
                        <option value="CANCELLED">Đã hủy</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-wider">Người nhận việc (Nhân viên)</label>
                      <select 
                        value={assignedTo}
                        onChange={(e) => setAssignedTo(e.target.value)}
                        disabled={currentUser?.role !== 'ADMIN'}
                        className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer shadow-sm disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                      >
                        <option value="">-- Chọn nhân viên --</option>
                        {users.map(u => (
                          <option key={u.id} value={u.name}>{u.name}</option>
                        ))}
                        <option value="Admin">Admin</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-wider">Hạn chót hoàn thành</label>
                      <input 
                        type="date" 
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        disabled={currentUser?.role !== 'ADMIN'}
                        className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 transition-all cursor-pointer shadow-sm disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-200 flex gap-3 shrink-0">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-3.5 bg-white text-slate-500 rounded-2xl font-black text-[11px] border border-slate-200 hover:bg-slate-100 transition-all active:scale-95"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={handleSave}
                disabled={!assignedTo}
                className={`flex-[2] py-3.5 rounded-2xl font-black text-[11px] flex items-center justify-center gap-2 transition-all active:scale-95 ${!assignedTo ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-blue-600 text-white shadow-lg shadow-blue-200 hover:bg-blue-700'}`}
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${!assignedTo ? 'bg-slate-300' : 'bg-white/20'}`}>
                  <ArrowRight size={14} />
                </div>
                {editingTask ? 'Cập nhật ngay' : 'Xác nhận tạo việc'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Task Detail Modal */}
      <AnimatePresence>
        {selectedTaskDetail && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-0 md:p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-5xl rounded-none md:rounded-3xl overflow-hidden shadow-2xl flex flex-col h-full md:h-[90vh]"
            >
              <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 ${getPriorityColor(selectedTaskDetail.priority)} rounded-2xl flex items-center justify-center shadow-sm`}>
                    <ClipboardList size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800 tracking-tighter">
                      Chi tiết công việc #{selectedTaskDetail.id}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-slate-400 font-bold">{formatDateTime(selectedTaskDetail.createdAt)}</span>
                      <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                      <span className="text-[10px] text-blue-600 font-black">Bởi {selectedTaskDetail.createdBy}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleEdit(selectedTaskDetail)}
                    className="h-10 px-4 flex items-center justify-center gap-2 bg-white border border-slate-200 rounded-full text-blue-600 hover:bg-blue-50 transition-all shadow-sm"
                  >
                    <Edit3 size={18} />
                    <span className="text-[11px] font-black uppercase tracking-tight hidden sm:inline">
                      {currentUser?.role === 'ADMIN' ? 'Sửa' : 'Cập nhật'}
                    </span>
                  </button>
                  <button 
                    onClick={() => {
                      setSelectedTaskDetail(null);
                    }}
                    className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-full text-slate-400 hover:bg-slate-100 transition-all shadow-sm"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                {/* Status and Actions */}
                <section className="space-y-4">
                  <div className="flex flex-col gap-4">
                    {selectedTaskDetail.status === 'ACCEPTED' && (
                      <button 
                        onClick={() => {
                          const updated = { ...selectedTaskDetail, status: 'IN_PROGRESS' as const };
                          updateTask(selectedTaskDetail.id, updated);
                          setSelectedTaskDetail(updated);
                        }}
                        className="w-fit px-8 py-4 bg-emerald-600 text-white rounded-2xl text-sm font-black shadow-xl shadow-emerald-200 flex items-center gap-3 animate-bounce"
                      >
                        <MapPin size={20} /> NHẤN VÀO ĐÂY ĐỂ CHECK-IN TẠI NHÀ KHÁCH
                      </button>
                    )}

                    <div className="flex flex-wrap items-center gap-2">
                      <label className="text-[10px] font-black text-slate-400 w-full mb-1">Cập nhật nhanh trạng thái</label>
                      {[
                        { label: 'Chưa làm', val: 'TODO', color: 'bg-orange-50 text-orange-600' },
                        { label: 'Đã nhận', val: 'ACCEPTED', color: 'bg-blue-50 text-blue-600' },
                        { label: 'Đã Check-in', val: 'IN_PROGRESS', color: 'bg-emerald-50 text-emerald-600' },
                        { label: 'Xong', val: 'COMPLETED', color: 'bg-emerald-600 text-white' },
                        { label: 'Hủy', val: 'CANCELLED', color: 'bg-slate-100 text-slate-500' },
                      ].map(st => (
                        <button 
                          key={st.val}
                          onClick={() => {
                            setStatusConfirm({ task: selectedTaskDetail, newStatus: st.val as any });
                          }}
                          className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all border-2 ${selectedTaskDetail.status === st.val ? 'border-blue-500 ' + (selectedTaskDetail.status === 'COMPLETED' ? 'bg-emerald-600 text-white' : st.color) : 'border-transparent bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                        >
                          {st.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </section>

                {/* Content */}
                <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Customer Info & Map (Now on the Left) */}
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-50 rounded-3xl border border-slate-200 h-full">
                      <h4 className="text-[11px] font-black text-slate-400 mb-3 uppercase tracking-wider">Khách hàng</h4>
                      {selectedTaskDetail.customerId ? (
                        (() => {
                          const customer = customers.find(c => c.id === selectedTaskDetail.customerId);
                          if (!customer) return <p className="text-xs text-slate-400 font-bold italic">Không tìm thấy khách hàng</p>;
                          return (
                            <div className="space-y-3">
                              <div>
                                <p className="text-lg font-black text-slate-800 leading-none">{customer.name}</p>
                                <div className="flex flex-wrap items-center gap-2 mt-3">
                                  <a href="#" onClick={(e) => handlePhoneCall(e, customer.phone)} className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-all active:scale-95 border border-emerald-100">
                                    <Phone size={12} className="fill-emerald-600 text-transparent" /> {customer.phone}
                                  </a>
                                  {customer.phone2 && (
                                    <a href="#" onClick={(e) => handlePhoneCall(e, customer.phone2)} className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 transition-all active:scale-95 border border-blue-100">
                                      <Phone size={12} className="fill-blue-600 text-transparent" /> {customer.phone2} (SĐT 2)
                                    </a>
                                  )}
                                </div>
                              </div>
                              
                              <div className="space-y-2 pt-3 border-t border-slate-200">
                                <div className="flex items-start gap-2 text-xs font-semibold text-slate-600">
                                  <MapPin size={14} className="text-red-500 shrink-0" />
                                  <span>{customer.address || customer.location || 'Chưa cập nhật địa chỉ'}</span>
                                </div>
                                
                                {customer.location && (
                                    <div className="space-y-3 mt-4">
                                      <div className="aspect-video bg-white rounded-2xl border border-slate-200 overflow-hidden relative group shadow-sm transition-all hover:shadow-md">
                                        <iframe 
                                          width="100%" 
                                          height="100%" 
                                          frameBorder="0" 
                                          style={{ border: 0 }}
                                          src={`https://maps.google.com/maps?q=${encodeURIComponent(customer.location)}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
                                          allowFullScreen
                                        ></iframe>
                                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                          <p className="text-white text-[10px] font-black">Xem bản đồ chi tiết</p>
                                        </div>
                                      </div>
                                      <a 
                                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(customer.location)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-2 w-full py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95"
                                      >
                                        <Navigation size={14} /> Chỉ đường tới nhà khách
                                      </a>

                                      {/* Site Photos / Customer Images */}
                                      {(() => {
                                        const customerImages = images.filter(img => 
                                          (img.category === 'KhachHang' || img.category === 'Tasks') && 
                                          (img.name.toLowerCase().includes(customer.name.toLowerCase()) || 
                                           (customer.id && img.name.toLowerCase().includes(customer.id.toLowerCase())) ||
                                           img.name.toLowerCase().includes(selectedTaskDetail.id.toLowerCase()))
                                        );

                                        if (customerImages.length === 0 && !customer.image) return null;

                                        return (
                                          <div className="pt-2 space-y-2">
                                            <div className="flex items-center gap-2">
                                              <ImageIcon size={14} className="text-slate-400" />
                                              <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Hình ảnh thực tế</h5>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                              {customer.image && (
                                                <div className="aspect-[4/3] rounded-xl overflow-hidden border border-slate-200 bg-white group cursor-pointer relative" onClick={() => window.open(customer.image, '_blank')}>
                                                  <img src={customer.image} alt="Customer site" className="w-full h-full object-cover transition-transform group-hover:scale-110" referrerPolicy="no-referrer" />
                                                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <ExternalLink size={16} className="text-white" />
                                                  </div>
                                                </div>
                                              )}
                                              {customerImages.map((img) => (
                                                <div key={img.id} className="aspect-[4/3] rounded-xl overflow-hidden border border-slate-200 bg-white group cursor-pointer relative" onClick={() => window.open(img.url, '_blank')}>
                                                  <img src={img.url} alt={img.name} className="w-full h-full object-cover transition-transform group-hover:scale-110" referrerPolicy="no-referrer" />
                                                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <ExternalLink size={16} className="text-white" />
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        );
                                      })()}
                                    </div>
                                )}
                              </div>
                            </div>
                          );
                        })()
                      ) : (
                        <p className="text-xs text-slate-400 font-bold italic">Chưa gắn thẻ khách hàng</p>
                      )}
                    </div>
                  </div>

                  {/* Task Detailed Content (Now on the Right) */}
                  <div className="space-y-4 pt-4 md:pt-0">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 leading-none uppercase tracking-wider">Nội dung công việc</p>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                      <p className="text-base font-black text-slate-800 leading-snug">
                        {customers.find(c => c.id === selectedTaskDetail.customerId)?.name || selectedTaskDetail.title || 'N/A'}
                      </p>
                      {selectedTaskDetail.description && (
                        <div className="text-xs text-slate-500 font-medium leading-relaxed italic border-t border-slate-100 pt-2 whitespace-pre-wrap">
                          {selectedTaskDetail.description}
                        </div>
                      )}
                    </div>
                  </div>

                    <div className="mt-4 p-5 bg-blue-50/20 border border-blue-100/50 rounded-3xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-3 text-blue-100/30">
                        <MessageSquare size={40} />
                      </div>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3 relative z-10 flex items-center gap-1.5">
                        <Send size={12} className="text-blue-500" />
                        Lịch sử phản hồi / Kết quả xử lý
                      </h4>
                      
                      {(() => {
                        const history = getFeedbackHistory(selectedTaskDetail);
                        if (history.length === 0) {
                          return <p className="text-sm text-slate-400 font-bold italic relative z-10">Chưa có thông tin phản hồi cho công việc này.</p>;
                        }
                        
                        return (
                          <div className="space-y-4 relative z-10 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {history.slice().reverse().map((fb, idx) => (
                              <div key={fb.id} className={`p-4 rounded-2xl border ${idx === 0 ? 'bg-white border-blue-200 shadow-md ring-4 ring-blue-50' : 'bg-white border-slate-100'}`}>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-wider">{fb.userName}</span>
                                  <span className="text-[9px] font-bold text-slate-400">{formatDateTime(fb.timestamp)}</span>
                                </div>
                                <p className={`text-sm font-bold leading-relaxed ${idx === 0 ? 'text-slate-800' : 'text-slate-500'}`}>
                                  {fb.message}
                                </p>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>

                    <div className="flex flex-wrap gap-4 pt-4">
                       <div className="space-y-1 bg-slate-50 px-4 py-3 rounded-2xl border border-slate-100 flex-1 min-w-[150px]">
                         <p className="text-[10px] font-black text-slate-400 leading-none uppercase tracking-wider">Hạn chót</p>
                         <div className="flex items-center gap-2 mt-1.5 text-slate-700 font-black">
                            <Calendar size={14} className="text-blue-500" />
                            <span className="text-sm">{selectedTaskDetail.dueDate ? formatDateTime(selectedTaskDetail.dueDate) : 'Không thời hạn'}</span>
                         </div>
                       </div>
                       {selectedTaskDetail.status === 'COMPLETED' && selectedTaskDetail.completedAt ? (
                         <div className="space-y-1 bg-emerald-50 px-4 py-3 rounded-2xl border border-emerald-100 flex-1 min-w-[150px]">
                           <p className="text-[10px] font-black text-emerald-600 leading-none uppercase tracking-tight">Hoàn thành trong</p>
                           <div className="flex items-center gap-2 mt-1.5 text-emerald-700 font-black">
                              <CheckCircle2 size={14} />
                              <span className="text-sm">{formatTaskDuration(selectedTaskDetail.createdAt, selectedTaskDetail.completedAt)}</span>
                           </div>
                         </div>
                       ) : (
                         <div className="space-y-1 bg-red-50 px-4 py-3 rounded-2xl border border-red-100 flex-1 min-w-[150px]">
                           <p className="text-[10px] font-black text-red-500 leading-none uppercase tracking-tight">Thời gian đã qua</p>
                           <div className="flex items-center gap-2 mt-1.5 text-red-600 font-black">
                              <Clock size={14} />
                              <span className="text-sm">{formatTaskDuration(selectedTaskDetail.createdAt, now.getTime())} trước</span>
                           </div>
                         </div>
                       )}
                    </div>
                  </div>
                </section>

                {/* Sales & Maintenance History */}
                {selectedTaskDetail.customerId && (
                  <section className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[11px] font-black text-slate-400">Kết quả thực hiện tại việc này</h4>
                      {selectedTaskDetail.status === 'IN_PROGRESS' || selectedTaskDetail.status === 'COMPLETED' ? (
                        <div className="flex gap-2">
                          <button 
                            onClick={() => navigate(`/pos?customerId=${selectedTaskDetail.customerId}&taskId=${selectedTaskDetail.id}`)}
                            className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[9px] font-black hover:bg-emerald-700 transition-all flex items-center gap-1.5 shadow-sm"
                          >
                            <ShoppingCart size={12} /> Tạo đơn bán hàng
                          </button>
                          <button 
                            onClick={() => navigate(`/maintenance?type=repair&customerId=${selectedTaskDetail.customerId}&taskId=${selectedTaskDetail.id}`)}
                            className="px-3 py-1.5 bg-orange-500 text-white rounded-lg text-[9px] font-black hover:bg-orange-600 transition-all flex items-center gap-1.5 shadow-sm"
                          >
                            <Wrench size={12} /> Tạo phiếu sửa chữa
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-lg">
                          <Lock size={12} className="text-slate-400" />
                          <span className="text-[9px] font-bold text-slate-400 italic">Check-in để mở khóa chức năng</span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Linked Results */}
                      <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-emerald-50/30 border border-emerald-100 rounded-2xl overflow-hidden">
                           <div className="px-4 py-2 bg-emerald-100/50 border-b border-emerald-100 flex items-center gap-2 text-emerald-700">
                              <ShoppingBag size={14} />
                              <span className="text-[10px] font-black uppercase">Đơn bán trong công việc</span>
                           </div>
                           <div className="p-2">
                              {invoices.filter(inv => inv.taskId === selectedTaskDetail.id).length === 0 ? (
                                <p className="text-[10px] text-slate-400 italic p-4 text-center font-bold">Chưa tạo đơn bán cho công việc này</p>
                              ) : (
                                invoices
                                  .filter(inv => inv.taskId === selectedTaskDetail.id)
                                  .map(inv => (
                                    <div key={inv.id} className="p-3 bg-white hover:border-emerald-200 rounded-xl border border-transparent shadow-sm flex justify-between items-center transition-all mb-2 last:mb-0">
                                       <div>
                                          <p className="text-[11px] font-black text-slate-800">{inv.id}</p>
                                          <p className="text-[9px] font-bold text-slate-400 italic leading-none mt-1">{formatDateTime(inv.date)}</p>
                                       </div>
                                       <div className="text-right">
                                          <p className="text-sm font-black text-emerald-600 leading-none">{inv.total.toLocaleString()}đ</p>
                                          <p className="text-[10px] font-bold text-slate-400 italic mt-1">{inv.items.length} mặt hàng</p>
                                       </div>
                                    </div>
                                  ))
                              )}
                           </div>
                        </div>

                        <div className="bg-orange-50/30 border border-orange-100 rounded-2xl overflow-hidden">
                           <div className="px-4 py-2 bg-orange-100/50 border-b border-orange-100 flex items-center gap-2 text-orange-700">
                              <Wrench size={14} />
                              <span className="text-[10px] font-black uppercase">Phiếu sửa trong công việc</span>
                           </div>
                           <div className="p-2">
                              {maintenanceRecords.filter(m => m.taskId === selectedTaskDetail.id).length === 0 ? (
                                <p className="text-[10px] text-slate-400 italic p-4 text-center font-bold">Chưa tạo phiếu sửa cho công việc này</p>
                              ) : (
                                maintenanceRecords
                                  .filter(m => m.taskId === selectedTaskDetail.id)
                                  .map(m => (
                                    <div key={m.id} className="p-3 bg-white hover:border-orange-200 rounded-xl border border-transparent shadow-sm flex justify-between items-center transition-all mb-2 last:mb-0">
                                       <div>
                                          <div className="flex items-center gap-2">
                                             <p className="text-[11px] font-black text-slate-800">{m.id}</p>
                                             <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${m.status === 'COMPLETED' || m.status === 'RETURNED' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                                                {getStatusText(m.status)}
                                             </span>
                                          </div>
                                          <p className="text-[10px] font-bold text-slate-700 mt-1">{m.productName}</p>
                                       </div>
                                       <div className="text-right">
                                          <p className="text-sm font-black text-orange-600 leading-none">{m.cost.toLocaleString()}đ</p>
                                          <p className="text-[9px] font-bold text-slate-400 italic mt-1">{formatDateTime(m.date)}</p>
                                       </div>
                                    </div>
                                  ))
                              )}
                           </div>
                        </div>
                      </div>

                    </div>
                  </section>
                )}
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-200 flex gap-3 shrink-0 md:hidden">
                {currentUser?.role === 'ADMIN' && (
                  <button 
                    onClick={() => handleEdit(selectedTaskDetail)}
                    className="flex-1 py-3 bg-white text-blue-600 rounded-2xl font-black text-[11px] border border-blue-100 hover:bg-blue-50 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Edit3 size={16} />Chỉnh sửa công việc
                  </button>
                )}
                <button 
                  onClick={() => {
                    setSelectedTaskDetail(null);
                  }}
                  className="flex-[2] py-3 bg-slate-800 text-white rounded-2xl font-black text-[11px] shadow-lg shadow-slate-200 hover:bg-slate-900 transition-all active:scale-95"
                >
                  Đóng
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Status Confirmation Modal */}
      <AnimatePresence>
        {statusConfirm && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl p-8"
            >
              <div className="text-center space-y-4">
                <h3 className="text-xl font-black text-slate-800 tracking-tight">Xác nhận</h3>
                <p className="text-sm font-medium text-slate-500 px-4">
                  Bạn có đồng ý đổi trạng thái sang {' '}
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-black inline-block
                    ${statusConfirm.newStatus === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : 
                      statusConfirm.newStatus === 'IN_PROGRESS' ? 'bg-emerald-100 text-emerald-700' : 
                      statusConfirm.newStatus === 'ACCEPTED' ? 'bg-blue-100 text-blue-700' :
                      statusConfirm.newStatus === 'CANCELLED' ? 'bg-slate-200 text-slate-700' : 
                      'bg-orange-100 text-orange-700'}
                  `}>
                    {statusConfirm.newStatus === 'COMPLETED' ? 'Đã xong' : 
                     statusConfirm.newStatus === 'IN_PROGRESS' ? 'Đã Check-in' : 
                     statusConfirm.newStatus === 'ACCEPTED' ? 'Đã nhận việc' :
                     statusConfirm.newStatus === 'CANCELLED' ? 'Đã hủy' : 'Chưa làm'}
                  </span>?
                </p>

                <div className="bg-slate-50/80 rounded-2xl p-5 text-left space-y-4 border border-slate-100">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400  leading-none">KHÁCH HÀNG</p>
                    <p className="text-sm font-black text-slate-700 leading-tight">
                      {customers.find(c => c.id === statusConfirm.task.customerId)?.name || statusConfirm.task.title || 'N/A'}
                    </p>
                  </div>
                  {statusConfirm.task.description && (
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-slate-400 leading-none">GHI CHÚ / TÌNH TRẠNG</p>
                      <p className="text-[11px] font-medium text-slate-500 line-clamp-2 leading-relaxed">
                        {statusConfirm.task.description}
                      </p>
                    </div>
                  )}

                  {statusConfirm.newStatus === 'COMPLETED' && (
                    <div className="space-y-2 pt-2">
                      <p className="text-[10px] font-black text-blue-600 leading-none uppercase tracking-tight">KẾT QUẢ XỬ LÝ / PHẢN HỒI <span className="text-red-500">*</span></p>
                      <textarea 
                        value={confirmFeedback}
                        onChange={(e) => setConfirmFeedback(e.target.value)}
                        placeholder="Bắt buộc: Nhập kết quả xử lý để hoàn thành..."
                        rows={3}
                        className="w-full px-4 py-3 bg-blue-50 border-2 border-blue-100 rounded-2xl text-sm font-bold placeholder:text-blue-200 outline-none focus:border-blue-500 transition-all resize-none shadow-inner"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-4">
                  <button 
                    onClick={() => setStatusConfirm(null)}
                    className="py-4 bg-white border border-slate-200 text-slate-500 rounded-2xl text-[13px] font-black hover:bg-slate-50 transition-all active:scale-95"
                  >
                    Hủy bỏ
                  </button>
                  <button 
                    disabled={statusConfirm.newStatus === 'COMPLETED' && !confirmFeedback.trim()}
                    onClick={() => {
                      const nowTime = formatDateTime(new Date());
                      const nowISO = new Date().toISOString();
                      
                      let finalFeedback = statusConfirm.task.feedback || '';
                      if (confirmFeedback.trim()) {
                        const timeStr = formatDateTime(new Date());
                        const userName = currentUser?.name || 'NV';
                        const newMessageLine = `[${timeStr}] ${userName}: ${confirmFeedback.trim()}`;
                        finalFeedback = finalFeedback ? finalFeedback + '\n' + newMessageLine : newMessageLine;
                      }

                      const updatedTask = { 
                        ...statusConfirm.task, 
                        status: statusConfirm.newStatus,
                        feedback: finalFeedback,
                        updatedAt: nowISO,
                        completedAt: statusConfirm.newStatus === 'COMPLETED' ? nowTime : (statusConfirm.task.status === 'COMPLETED' && statusConfirm.newStatus !== 'COMPLETED' ? '' : statusConfirm.task.completedAt)
                      };

                      updateTask(statusConfirm.task.id, updatedTask);
                      
                      if (selectedTaskDetail && selectedTaskDetail.id === statusConfirm.task.id) {
                        setSelectedTaskDetail(updatedTask);
                      }
                      
                      setStatusConfirm(null);
                    }}
                    className={`py-4 rounded-2xl text-[13px] font-black shadow-lg transition-all active:scale-95 ${
                      statusConfirm.newStatus === 'COMPLETED' && !confirmFeedback.trim() 
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' 
                      : 'bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700'
                    }`}
                  >
                    Đồng ý
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Customer Modal */}
      <AddCustomerModal 
        isOpen={isAddCustomerModalOpen}
        onClose={() => setIsAddCustomerModalOpen(false)}
        initialName={newCustomerName}
        onSuccess={(customer) => {
          if (customer && customer.id) {
            setCustomerId(customer.id);
            setCustomerSearchTerm('');
            setShowCustomerResults(false);
            setIsAddCustomerModalOpen(false);
          }
        }}
      />
    </div>
  );
};
