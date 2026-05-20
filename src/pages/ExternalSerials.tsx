import React, { useState, useMemo } from 'react';
import { Search, Plus, Package, User, Code, FileText, Database, Edit2, Trash2, X, ShieldCheck, History, Hash, Calendar, Wrench, Send, ChevronRight, ChevronLeft } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { generateId } from '../lib/idUtils';
import { ExternalSerial, Customer, MaintenanceRecord } from '../types';
import { formatNumber, parseDateString, formatDateTime } from '../lib/utils';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { useMobileBackModal } from '../hooks/useMobileBackModal';

export const ExternalSerials: React.FC = () => {
  const { externalSerials, addExternalSerial, updateExternalSerial, deleteExternalSerial, currentUser, customers, addCustomer, maintenanceRecords } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customerSuggestions, setCustomerSuggestions] = useState<Customer[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [selectedSerialDetail, setSelectedSerialDetail] = useState<ExternalSerial | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<'info' | 'warranty'>('info');
  
  // Form state
  const [editId, setEditId] = useState<string | null>(null);
  const [product, setProduct] = useState('');
  const [sn, setSn] = useState('');
  const [customer, setCustomer] = useState('');
  const [source, setSource] = useState('');
  const [note, setNote] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  // Handle Escape key to close modals in layers
  useEscapeKey(() => setIsCustomerModalOpen(false), isCustomerModalOpen);
  useEscapeKey(() => setSelectedSerialDetail(null), !!selectedSerialDetail);
  useEscapeKey(() => setIsModalOpen(false), isModalOpen);

  const filteredSerials = useMemo(() => {
    const list = !searchTerm.trim() ? (externalSerials || []) : (externalSerials || []).filter(s => 
      (s.sn || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.product || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.customer || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.source || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
    return list;
  }, [externalSerials, searchTerm]);

  const totalPages = Math.ceil(filteredSerials.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedSerials = useMemo(() => {
    return filteredSerials
      .sort((a, b) => parseDateString(b.date) - parseDateString(a.date))
      .slice(startIndex, endIndex);
  }, [filteredSerials, startIndex, endIndex]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, rowsPerPage]);

  const openAddModal = () => {
    setEditId(null);
    setProduct('');
    setSn('');
    setCustomer('');
    setSource('');
    setNote('');
    setIsModalOpen(true);
  };

  const openEditModal = (serial: ExternalSerial) => {
    setEditId(serial.id);
    setProduct(serial.product);
    setSn(serial.sn);
    setCustomer(serial.customer || '');
    setSource(serial.source || '');
    setNote(serial.note || '');
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa bản ghi Serial này?')) {
      deleteExternalSerial(id);
    }
  };

  const handleSave = () => {
    if (!product || !sn) {
      alert('Vui lòng nhập tên sản phẩm và Serial Number');
      return;
    }

    if (editId) {
      updateExternalSerial(editId, {
        product,
        sn,
        customer,
        source,
        note
      });
    } else {
      const newSerial: ExternalSerial = {
        id: generateId('ES', externalSerials || []),
        date: formatDateTime(new Date()),
        product,
        sn,
        customer,
        source,
        createdBy: currentUser?.name || 'Hệ thống',
        note
      };
      addExternalSerial(newSerial);
    }

    setIsModalOpen(false);
  };

  useMobileBackModal(isModalOpen, () => setIsModalOpen(false)); // auto-injected
  useMobileBackModal(showCustomerDropdown, () => setShowCustomerDropdown(false)); // auto-injected
  useMobileBackModal(isCustomerModalOpen, () => setIsCustomerModalOpen(false)); // auto-injected
  useMobileBackModal(!!selectedSerialDetail, () => setSelectedSerialDetail(null));

  return (
    <div className="flex flex-col h-[calc(100vh-[96px])] bg-white md:rounded-xl shadow-sm border border-slate-200 md:m-6 overflow-hidden">
      {/* Toolbar */}
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-slate-50 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-md shrink-0">
            <Package size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800">External Serial</h1>
            <p className="text-xs text-slate-500 font-medium">Quản lý serial bên ngoài hệ thống</p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 flex items-center gap-2 focus-within:border-blue-500 transition-colors w-full sm:w-80 shadow-sm relative">
            <Search size={18} className="text-slate-400 shrink-0" />
            <input 
              type="text"
              placeholder="Tìm theo serial, tên KH, Tên SP..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent text-sm outline-none font-medium"
            />
          </div>
          <button 
            onClick={openAddModal}
            className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center justify-center gap-2 font-bold text-sm hover:bg-blue-700 transition-colors shadow-sm shrink-0"
          >
            <Plus size={18} /> Thêm Mới
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto bg-slate-50 md:bg-white">
        
        {/* Desktop Table View */}
        <table className="w-full text-left border-collapse hidden md:table">
          <thead className="sticky top-0 bg-white z-10 shadow-sm">
            <tr className="text-slate-500 text-xs font-bold uppercase tracking-wider">
              <th className="p-4 w-12 text-center">#</th>
              <th className="p-4">Ngày tạo</th>
              <th className="p-4">Sản phẩm</th>
              <th className="p-4">Serial Number</th>
              <th className="p-4">Khách hàng</th>
              <th className="p-4">Nguồn gốc</th>
              <th className="p-4">Ghi chú</th>
              <th className="p-4 w-24 text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedSerials.length > 0 ? (
              paginatedSerials.map((serial, idx) => (
                <tr 
                  key={`desktop-ext-ser-${serial.id}`} 
                  onClick={() => {
                    setSelectedSerialDetail(serial);
                    setActiveDetailTab('info');
                  }}
                  className="hover:bg-slate-50 transition-colors group cursor-pointer"
                >
                  <td className="p-4 text-center text-slate-400 text-sm font-medium">{idx + 1}</td>
                  <td className="p-4">
                    <p className="text-sm font-medium text-slate-600 leading-tight">{serial.date}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">Tạo bởi: {serial.createdBy || '---'}</p>
                  </td>
                  <td className="p-4 text-sm font-bold text-slate-800 max-w-[200px] truncate" title={serial.product}>{serial.product}</td>
                  <td className="p-4">
                    <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100 font-mono text-sm font-bold">
                      {serial.sn}
                    </span>
                  </td>
                  <td className="p-4 text-sm font-medium text-slate-800">{serial.customer || '---'}</td>
                  <td className="p-4 text-sm text-slate-600">{serial.source || '---'}</td>
                  <td className="p-4 text-sm text-slate-600 max-w-[150px] truncate" title={serial.note}>{serial.note || '---'}</td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEditModal(serial)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-blue-100 transition-colors cursor-pointer">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => handleDelete(serial.id)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-red-600 hover:bg-red-100 transition-colors cursor-pointer">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="p-12 text-center text-slate-400">
                  <Database size={48} className="mx-auto mb-4 opacity-20" />
                  <p className="font-medium text-lg">Chưa có dữ liệu</p>
                  <p className="text-sm mt-1">Không tìm thấy mã serial nào phù hợp.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Mobile Card View */}
        <div className="md:hidden pb-10">
          {paginatedSerials.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 p-4">
              {paginatedSerials.map((serial) => (
                <div 
                  key={`mobile-ext-ser-${serial.id}`} 
                  onClick={() => {
                    setSelectedSerialDetail(serial);
                    setActiveDetailTab('info');
                  }}
                  className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden active:bg-slate-50 transition-colors"
                >
                  <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-start">
                    <div className="flex-1 pr-2">
                       <span className="inline-block bg-blue-100 text-blue-700 px-2.5 py-1 rounded font-mono text-sm font-bold mb-1 border border-blue-200">
                        {serial.sn}
                      </span>
                      <p className="font-bold text-slate-800 text-sm">{serial.product}</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button onClick={() => openEditModal(serial)} className="w-8 h-8 rounded border border-slate-200 flex items-center justify-center text-slate-500 active:bg-slate-100">
                         <Edit2 size={14} />
                      </button>
                      <button onClick={() => handleDelete(serial.id)} className="w-8 h-8 rounded border border-slate-200 flex items-center justify-center text-red-500 active:bg-red-50">
                         <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="p-3 space-y-2 text-sm bg-white">
                    <div className="flex justify-between items-start gap-4">
                      <span className="text-slate-400 font-medium shrink-0">Khách hàng:</span>
                      <span className="text-slate-800 font-medium text-right">{serial.customer || '---'}</span>
                    </div>
                    <div className="flex justify-between items-start gap-4">
                      <span className="text-slate-400 font-medium shrink-0">Nguồn gốc:</span>
                      <span className="text-slate-800 text-right">{serial.source || '---'}</span>
                    </div>
                    <div className="flex justify-between items-start gap-4 border-t border-slate-50 pt-2">
                      <span className="text-slate-400 font-medium shrink-0">Ngày ghi nhận:</span>
                      <div className="text-right">
                        <span className="text-slate-600 block">{serial.date}</span>
                        <span className="text-slate-400 text-[10px] block">Bởi: {serial.createdBy || '---'}</span>
                      </div>
                    </div>
                    {serial.note && (
                      <div className="pt-2 border-t border-slate-50 mt-2">
                        <p className="text-slate-500 text-xs italic bg-amber-50 p-2 rounded border border-amber-100 text-justify">
                          "{serial.note}"
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
             <div className="p-12 text-center text-slate-400 mt-10">
                <Database size={48} className="mx-auto mb-4 opacity-20" />
                <p className="font-medium text-lg">Chưa có dữ liệu</p>
                <p className="text-sm mt-1">Gõ tìm kiếm hoặc thêm mới.</p>
             </div>
          )}
        </div>

        {/* Pagination */}
        {filteredSerials.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-200 bg-white flex items-center justify-between text-sm shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Hiển thị</span>
              <select 
                value={rowsPerPage} 
                onChange={(e) => setRowsPerPage(Number(e.target.value))}
                className="border border-slate-300 rounded px-2 py-1 bg-white focus:outline-none focus:border-blue-500"
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-slate-500">dòng / trang</span>
            </div>
            
            <div className="flex items-center gap-4">
              <span className="text-slate-500 font-medium hidden sm:inline">
                {startIndex + 1} - {Math.min(endIndex, filteredSerials.length)} trên tổng {filteredSerials.length}
              </span>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed bg-white transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="px-3 font-medium text-slate-700">{currentPage} / {totalPages || 1}</span>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="p-1.5 border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed bg-white transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 md:p-6 border-b border-slate-100 bg-slate-50">
              <h2 className="md:text-2xl text-xl font-bold text-slate-800">
                {editId ? 'Sửa thông tin Serial' : 'Thêm External Serial'}
              </h2>
              <p className="md:text-base text-sm text-slate-500 mt-1">Lưu trữ serial từ nguồn bên ngoài</p>
            </div>
            
            <div className="p-5 md:p-6 overflow-y-auto space-y-4">
              <div>
                <label className="block md:text-base text-sm font-bold text-slate-700 mb-1">Tên sản phẩm <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={product}
                  onChange={(e) => setProduct(e.target.value)}
                  placeholder="Nhập tên sản phẩm..."
                  className="w-full border shadow-sm border-slate-200 rounded-lg px-4 py-3 focus:border-blue-500 outline-none md:text-base text-sm font-medium transition-all"
                />
              </div>
              
              <div>
                <label className="block md:text-base text-sm font-bold text-slate-700 mb-1">Serial Number <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Code size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    value={sn}
                    onChange={(e) => setSn(e.target.value)}
                    placeholder="Nhập serial..."
                    className="w-full border shadow-sm border-slate-200 rounded-lg pl-10 pr-4 py-3 focus:border-blue-500 outline-none block font-mono md:text-xl text-base font-bold transition-all uppercase"
                  />
                </div>
              </div>

              <div className="relative">
                <label className="block md:text-base text-sm font-bold text-slate-700 mb-1">Khách hàng</label>
                <div className="relative">
                  <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    value={customer}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomer(val);
                      if (val.trim()) {
                        const filtered = (customers || []).filter(c => 
                          (c.name || '').toLowerCase().includes(val.toLowerCase()) || 
                          (c.phone || '').includes(val)
                        );
                        setCustomerSuggestions(filtered);
                        setShowCustomerDropdown(true);
                      } else {
                        setCustomerSuggestions([]);
                        setShowCustomerDropdown(false);
                      }
                    }}
                    onFocus={() => {
                        if (customer.trim()) setShowCustomerDropdown(true)
                    }}
                    onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                    placeholder="Tên khách hàng..."
                    className="w-full border shadow-sm border-slate-200 rounded-lg pl-10 pr-4 py-3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none md:text-base text-sm transition-all"
                  />
                </div>
                {showCustomerDropdown && (
                  <div className="absolute top-full left-0 right-0 z-50 bg-white border border-slate-200 rounded-lg shadow-xl mt-1 max-h-48 overflow-y-auto">
                    {customerSuggestions.map((c, idx) => (
                      <div 
                        key={`form-cust-sugg-${c.id || c.phone}-${idx}`} 
                        className="px-4 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-50"
                        onClick={() => {
                          setCustomer(c.name);
                          setShowCustomerDropdown(false);
                        }}
                      >
                        <p className="font-bold md:text-base text-sm text-slate-800">{c.name}</p>
                        <p className="md:text-sm text-xs text-slate-500">{c.phone}</p>
                      </div>
                    ))}
                    {customerSuggestions.length === 0 && customer.trim() !== '' && (
                      <div className="p-2">
                        <button 
                          className="w-full py-2 px-3 flex items-center justify-center gap-2 text-blue-600 bg-blue-50 border border-blue-100 rounded-lg hover:bg-blue-100 transition-colors md:text-sm text-xs font-bold"
                          onClick={(e) => {
                            e.preventDefault();
                            setIsCustomerModalOpen(true);
                            setShowCustomerDropdown(false);
                          }}
                        >
                          <Plus size={14} /> Thêm khách hàng mới
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block md:text-base text-sm font-bold text-slate-700 mb-1">Nguồn gốc</label>
                <input 
                  type="text" 
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="Ví dụ: Shopee, Lazada, Tinh Châu..."
                  className="w-full border shadow-sm border-slate-200 rounded-lg px-4 py-3 focus:border-blue-500 outline-none md:text-base text-sm transition-all"
                />
              </div>
              
              <div>
                <label className="block md:text-base text-sm font-bold text-slate-700 mb-1">Ghi chú</label>
                <div className="relative">
                  <FileText size={18} className="absolute left-3 top-3 text-slate-400" />
                  <textarea 
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Ghi chú thêm (khả năng đổi trả, bảo hành)..."
                    rows={3}
                    className="w-full border shadow-sm border-slate-200 rounded-lg pl-10 pr-4 py-3 focus:border-blue-500 outline-none md:text-base text-sm transition-all resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="p-5 md:p-6 border-t border-slate-100 flex flex-col-reverse sm:flex-row justify-end gap-3 bg-slate-50">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-full sm:w-auto px-6 py-3 sm:py-2.5 border-2 border-slate-200 text-slate-600 font-bold rounded-lg hover:bg-slate-100 transition-colors md:text-base text-sm"
              >
                Hủy
              </button>
              <button 
                onClick={handleSave}
                className="w-full sm:w-auto px-6 py-3 sm:py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors md:text-base text-sm shadow-sm flex items-center justify-center gap-2"
              >
                <Database size={18} /> {editId ? 'Cập nhật' : 'Lưu Serial'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Add Customer Modal */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-xl shadow-2xl overflow-hidden p-8">
            <h3 className="md:text-xl text-lg font-bold text-slate-800 mb-4 tracking-tight">Thêm khách hàng</h3>
            <div className="space-y-4">
              <input 
                type="text" 
                placeholder="Tên khách hàng *" 
                id="new-customer-name"
                defaultValue={customer}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg md:text-base text-sm font-semibold outline-none focus:border-blue-500 focus:bg-white transition-colors"
                autoFocus
              />
              <input 
                type="text" 
                placeholder="Số điện thoại *" 
                id="new-customer-phone"
                onChange={(e) => {
                  let val = e.target.value.replace(/[^0-9\s+]/g, '').trim();
                  if (val && !val.startsWith('0') && !val.startsWith('+')) val = '0' + val;
                  e.target.value = val;
                }}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg md:text-base text-sm font-semibold outline-none focus:border-blue-500 focus:bg-white transition-colors"
              />
              <input 
                type="text" 
                placeholder="Địa chỉ" 
                id="new-customer-address"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg md:text-base text-sm font-semibold outline-none focus:border-blue-500 focus:bg-white transition-colors"
              />
            </div>
            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => setIsCustomerModalOpen(false)}
                className="flex-1 py-3 bg-white text-slate-600 border border-slate-200 rounded-lg md:text-base text-sm font-bold hover:bg-slate-50 transition-colors shadow-sm"
              >
                Hủy
              </button>
              <button 
                onClick={() => {
                  const nameInput = document.getElementById('new-customer-name') as HTMLInputElement;
                  const phoneInput = document.getElementById('new-customer-phone') as HTMLInputElement;
                  const addressInput = document.getElementById('new-customer-address') as HTMLInputElement;
                  if (nameInput.value && phoneInput.value) {
                     addCustomer({
                       id: generateId('KH', customers),
                       name: nameInput.value,
                       phone: phoneInput.value,
                       address: addressInput.value,
                       totalSpent: 0,
                       point: 0
                     });
                     setCustomer(nameInput.value);
                     setIsCustomerModalOpen(false);
                  } else {
                     alert('Vui lòng nhập tên và số điện thoại');
                  }
                }}
                className="flex-1 py-3 bg-blue-600 text-white rounded-lg md:text-base text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm"
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}
      {/* External Serial Detail Modal */}
      {selectedSerialDetail && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center md:p-4 p-0 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-slate-50 w-full max-w-6xl h-full md:h-[90vh] md:rounded-2xl rounded-none shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-300">
            <div className="bg-white p-6 border-b border-slate-200 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                  <Package size={24} />
                </div>
                <div>
                  <h3 className="md:text-2xl text-xl font-black text-slate-800 tracking-tighter uppercase">{selectedSerialDetail.sn}</h3>
                  <p className="md:text-sm text-xs text-slate-500 font-bold tracking-widest">{selectedSerialDetail.product}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedSerialDetail(null)} 
                className="w-10 h-10 bg-slate-100 text-slate-400 rounded-full hover:bg-slate-200 transition-colors flex items-center justify-center"
              >
                <X size={20} />
              </button>
            </div>

            {/* Tabs Navigation */}
            <div className="bg-white border-b border-slate-200 flex shrink-0">
              <button 
                onClick={() => setActiveDetailTab('info')}
                className={`flex-1 py-4 px-4 flex items-center justify-center gap-2 md:text-sm text-xs font-black uppercase tracking-widest transition-all border-b-2 ${activeDetailTab === 'info' ? 'border-blue-600 text-blue-600 bg-blue-50/30' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                <FileText size={16} /> Thông tin
              </button>
              <button 
                onClick={() => setActiveDetailTab('warranty')}
                className={`flex-1 py-4 px-4 flex items-center justify-center gap-2 md:text-sm text-xs font-black uppercase tracking-widest transition-all border-b-2 ${activeDetailTab === 'warranty' ? 'border-blue-600 text-blue-600 bg-blue-50/30' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                <ShieldCheck size={16} /> Bảo hành / sửa chữa
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {activeDetailTab === 'info' ? (
                <div className="animate-in fade-in slide-in-from-right-2 duration-300 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
                        <h4 className="md:text-sm text-[11px] font-black text-slate-400 uppercase tracking-widest">Thông tin thiết bị</h4>
                      </div>
                      <div className="space-y-4">
                        <div className="flex flex-col gap-1">
                          <span className="md:text-xs text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Sản phẩm</span>
                          <span className="md:text-base text-sm text-slate-800 font-black">{selectedSerialDetail.product}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="md:text-xs text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Serial Number</span>
                          <span className="md:text-base text-sm text-blue-600 font-mono font-black bg-blue-50 px-2 py-1 rounded inline-block w-fit border border-blue-100">{selectedSerialDetail.sn}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="md:text-xs text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Nguồn gốc</span>
                          <span className="md:text-base text-sm text-slate-800 font-bold">{selectedSerialDetail.source || '---'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-1 h-4 bg-emerald-500 rounded-full"></div>
                        <h4 className="md:text-sm text-[11px] font-black text-slate-400 uppercase tracking-widest">Liên kết khách hàng</h4>
                      </div>
                      <div className="space-y-4">
                        <div className="flex flex-col gap-1">
                          <span className="md:text-xs text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Khách hàng</span>
                          <span className="md:text-base text-sm text-slate-800 font-black flex items-center gap-2">
                             <User size={14} className="text-slate-400" />
                             {selectedSerialDetail.customer || 'Chưa gán khách hàng'}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="md:text-xs text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Ngày ghi nhận</span>
                          <span className="md:text-base text-sm text-slate-800 font-bold flex items-center gap-2">
                             <Calendar size={14} className="text-slate-400" />
                             {selectedSerialDetail.date}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="md:text-xs text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Người tạo</span>
                          <span className="md:text-base text-sm text-slate-400 font-bold italic">{selectedSerialDetail.createdBy || 'Hệ thống'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-1 h-4 bg-amber-500 rounded-full"></div>
                      <h4 className="md:text-sm text-[11px] font-black text-slate-400 uppercase tracking-widest">Ghi chú chi tiết</h4>
                    </div>
                    <div className="md:text-base text-sm text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100 min-h-[80px] italic leading-relaxed">
                      {selectedSerialDetail.note || 'Không có ghi chú nào cho serial này.'}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="animate-in fade-in slide-in-from-right-2 duration-300">
                  {(() => {
                    const history = (maintenanceRecords || []).filter(m => m.serialNumber === selectedSerialDetail.sn);
                    
                    const getStatusStyle = (status: string) => {
                      switch (status) {
                        case 'RECEIVING': return 'bg-blue-50 text-blue-600 border-blue-100';
                        case 'REPAIRING': return 'bg-orange-50 text-orange-600 border-orange-100';
                        case 'COMPLETED': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
                        case 'RETURNED': return 'bg-slate-50 text-slate-600 border-slate-100';
                        default: return 'bg-slate-50 text-slate-600 border-slate-100';
                      }
                    };

                    const getStatusText = (status: string) => {
                      switch (status) {
                        case 'RECEIVING': return 'MỚI TIẾP NHẬN';
                        case 'REPAIRING': return 'ĐANG XỬ LÝ';
                        case 'COMPLETED': return 'ĐÃ XỬ LÝ XONG';
                        case 'RETURNED': return 'ĐÃ TRẢ KHÁCH';
                        default: return status;
                      }
                    };

                    return (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between mb-2">
                           <h4 className="md:text-sm text-[11px] font-black text-slate-400 uppercase tracking-widest">Lịch sử bảo hành ({history.length})</h4>
                        </div>
                        {history.length === 0 ? (
                          <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
                            <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                              <Wrench size={28} />
                            </div>
                            <p className="text-slate-400 italic md:text-base text-sm font-medium">Serial này chưa có lịch sử bảo hành/sửa chữa nào.</p>
                          </div>
                        ) : (
                          history.map(record => (
                            <div 
                              key={record.id} 
                              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-300 transition-all group/warranty"
                            >
                              <div className="flex flex-col sm:flex-row justify-between gap-4">
                                <div className="flex gap-4">
                                  <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover/warranty:bg-blue-50 group-hover/warranty:text-blue-500 transition-all shrink-0">
                                    <Wrench size={20} />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="md:text-xs text-[10px] font-black bg-slate-100 text-slate-600 px-2 py-0.5 rounded italic whitespace-nowrap">#{record.id}</span>
                                      <span className={`md:text-xs text-[9px] font-black px-2.5 py-0.5 rounded-full border ${getStatusStyle(record.status)} tracking-widest whitespace-nowrap`}>
                                        {getStatusText(record.status)}
                                      </span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                                      <div className="flex items-center gap-1.5 md:text-sm text-[10px] text-slate-500 font-bold uppercase tracking-tight">
                                        <Calendar size={12} />
                                        {record.date}
                                      </div>
                                      <div className="flex items-center gap-1.5 md:text-sm text-[10px] text-slate-500 font-bold uppercase tracking-tight">
                                        <User size={12} />
                                        {record.customerName}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex flex-col justify-between sm:items-end gap-2 shrink-0 sm:pl-4 sm:border-l border-slate-100">
                                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                    <p className="md:text-xs text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 italic">VẤN ĐỀ / LỖI:</p>
                                    <p className="md:text-sm text-xs text-slate-700 font-black leading-relaxed">{record.issue}</p>
                                  </div>
                                  <div className="flex items-center justify-between sm:justify-end gap-4 mt-auto">
                                    <div className="text-right">
                                      <p className="md:text-xs text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1 italic">Chi phí</p>
                                      <p className="md:text-base text-sm font-black text-rose-600">{formatNumber(record.cost)}đ</p>
                                    </div>
                                    {record.transferId && (
                                       <div className="flex items-center gap-1 md:text-xs text-[9px] font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full uppercase italic tracking-tighter">
                                         <Send size={10} /> Đã gửi tuyến
                                       </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end shrink-0">
               <button 
                onClick={() => setSelectedSerialDetail(null)}
                className="w-full py-3 bg-slate-800 text-white font-black rounded-lg uppercase text-[10px] tracking-widest hover:bg-slate-900 transition-colors shadow-lg shadow-slate-200"
              >
                Đóng chi tiết
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
