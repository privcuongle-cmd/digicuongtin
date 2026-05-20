import React, { useState, useMemo, useRef } from 'react';
import { Search, Upload, Image as ImageIcon, Trash2, CheckCircle2, Loader2, Filter, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppContext } from '../context/AppContext';
import { ImageItem } from '../types';
import { cn } from '../lib/utils';

export const ImageGallery: React.FC = () => {
  const { images, uploadImage, deleteImage } = useAppContext();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả');
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = ['Tất cả', 'SanPham', 'KhachHang', 'Chung'];

  const filteredImages = useMemo(() => {
    return images.filter(img => {
      const matchesSearch = img.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'Tất cả' || img.category === selectedCategory;
      return matchesSearch && matchesCategory;
    }).sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeB - timeA;
    });
  }, [images, searchTerm, selectedCategory]);

  const totalPages = Math.ceil(filteredImages.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedImages = filteredImages.slice(startIndex, endIndex);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processAndUpload(file);
  };

  const processAndUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chọn tệp hình ảnh');
      return;
    }

    setIsUploading(true);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        // Use selected category for upload if not 'Tất cả', otherwise default to 'Chung'
        const category = selectedCategory === 'Tất cả' ? 'Chung' : selectedCategory;
        const res = await uploadImage(base64, file.name, category);
        if (res) {
          setSelectedImageId(res.id);
        } else {
          alert('Upload thất bại. Vui lòng kiểm tra lại cấu hình Google Drive.');
        }
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Upload error', error);
      setIsUploading(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) await processAndUpload(file);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa hình ảnh này không?')) {
      const success = await deleteImage(id);
      if (success) {
        if (selectedImageId === id) setSelectedImageId(null);
      } else {
        alert('Xóa thất bại. Vui lòng thử lại.');
      }
    }
  };

  const selectedImage = useMemo(() => 
    images.find(img => img.id === selectedImageId), 
  [images, selectedImageId]);

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
            <ImageIcon size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight">Thư viện hình ảnh</h3>
            <p className="text-xs text-slate-400 font-medium italic">Quản lý và lưu trữ hình ảnh trên Google Drive</p>
          </div>
        </div>
      </div>

      {/* Body Section */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Sidebar: Upload & Stats */}
        <div className="w-full lg:w-80 bg-slate-50/80 border-b lg:border-b-0 lg:border-r border-slate-100 p-6 flex flex-col gap-6 shrink-0 lg:overflow-y-auto">
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Tải lên hình ảnh</h4>
          
          {/* Upload Zone */}
          <div 
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="w-full min-h-[200px] border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center bg-white hover:border-blue-400 hover:bg-blue-50/50 transition-all cursor-pointer group relative overflow-hidden shadow-sm shrink-0"
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
              accept="image/*"
            />
            {isUploading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="animate-spin text-blue-600" size={40} />
                <p className="text-sm font-black text-blue-600 uppercase tracking-widest">Đang tải...</p>
              </div>
            ) : (
              <>
                <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-sm">
                  <Upload size={28} />
                </div>
                <div className="mt-4 text-center px-4">
                  <p className="text-sm font-black text-slate-700 tracking-tight">Kéo thả ảnh</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Lưu vào Drive & Sheet</p>
                </div>
              </>
            )}
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Thống kê</h4>
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 text-white shadow-lg flex flex-col justify-between h-28 relative overflow-hidden">
              <ImageIcon size={60} className="absolute -right-4 -bottom-4 opacity-20 rotate-12" />
              <span className="text-[10px] font-black uppercase tracking-widest opacity-80 z-10">Tổng số ảnh</span>
              <div className="flex items-baseline gap-2 z-10">
                <span className="text-4xl font-black">{images.length}</span>
                <span className="text-xs font-bold opacity-80 uppercase">Tấm</span>
              </div>
            </div>

            {selectedImage && (
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chi tiết ảnh</h4>
                <div className="aspect-square rounded-xl overflow-hidden border border-slate-100">
                  <img src={selectedImage.url} alt={selectedImage.name} className="w-full h-full object-cover" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-black text-slate-800 break-all">{selectedImage.name}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{selectedImage.timestamp}</p>
                </div>
                <button 
                  onClick={() => handleDelete(selectedImage.id)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-50 text-red-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-sm"
                >
                  <Trash2 size={16} />
                  Xóa hình ảnh
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Content: Library Grid */}
        <div className="flex-1 flex flex-col min-w-0 bg-white">
          {/* Filters & Search */}
          <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-4 shrink-0">
            <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    setCurrentPage(1);
                  }}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                    selectedCategory === cat 
                      ? "bg-white text-blue-600 shadow-sm border border-slate-200" 
                      : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  {cat === 'Tất cả' ? 'Tất cả' : (cat === 'SanPham' ? 'Sản phẩm' : (cat === 'KhachHang' ? 'Khách hàng' : 'Chung'))}
                </button>
              ))}
            </div>
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={18} />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm kiếm theo tên hình ảnh..." 
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all shadow-sm"
              />
            </div>
          </div>

          {/* Grid Area */}
          <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
            {filteredImages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center py-20 opacity-40">
                <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center text-slate-300 mb-6">
                  <ImageIcon size={48} />
                </div>
                <p className="text-slate-500 font-black uppercase tracking-[0.2em] text-xs">Không tìm thấy hình ảnh</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-5">
                {paginatedImages.map(img => (
                  <motion.div
                    layout
                    key={img.id}
                    onClick={() => setSelectedImageId(img.id)}
                    className={`relative aspect-[4/5] rounded-[2rem] overflow-hidden cursor-pointer group border-2 transition-all duration-300 ${
                      selectedImageId === img.id ? 'border-blue-600 ring-8 ring-blue-50' : 'border-transparent bg-white shadow-md hover:shadow-xl hover:translate-y-[-4px]'
                    }`}
                  >
                    <img 
                      src={img.url} 
                      alt={img.name} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                    />
                    
                    {/* Content Overlay */}
                    <div className="absolute inset-x-0 bottom-0 p-4 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300 bg-gradient-to-t from-slate-900/80 to-transparent">
                      <p className="text-[10px] text-white font-black truncate uppercase tracking-widest drop-shadow-md">{img.name}</p>
                    </div>

                    {/* Selection Checkmark */}
                    {selectedImageId === img.id && (
                      <div className="absolute top-4 right-4 bg-blue-600 text-white rounded-2xl p-2 shadow-2xl">
                        <CheckCircle2 size={24} />
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          {filteredImages.length > 0 && (
            <div className="px-6 py-4 border-t border-slate-200 bg-white flex items-center justify-between text-sm shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Hiển thị</span>
                <select 
                  value={pageSize} 
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="border border-slate-300 rounded px-2 py-1 bg-white focus:outline-none focus:border-blue-500 text-xs font-bold"
                >
                  <option value={12}>12</option>
                  <option value={24}>24</option>
                  <option value={48}>48</option>
                  <option value={96}>96</option>
                </select>
                <span className="text-slate-500">ảnh / trang</span>
              </div>
              
              <div className="flex items-center gap-4">
                <span className="text-slate-500 font-medium hidden sm:inline text-xs">
                  {startIndex + 1} - {Math.min(endIndex, filteredImages.length)} trên tổng {filteredImages.length}
                </span>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed bg-white transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="px-3 font-bold text-slate-700 text-xs">{currentPage} / {totalPages || 1}</span>
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
      </div>
    </div>
  );
};
