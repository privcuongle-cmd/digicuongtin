import React from 'react';
import { createPortal } from 'react-dom';
import { formatNumber, formatDateTime, smartParseDate } from '../lib/utils';
import { useAppContext } from '../context/AppContext';
import { numberToWordsVN } from '../lib/numberToWords';

interface PrintTemplateProps {
  title: string;
  id: string;
  date: string;
  partner: string;
  phone?: string;
  address?: string; // Add address if available
  items?: { name: string; qty: number; price: number; total: number; sn?: string | string[]; unit?: string }[];
  total: number;
  paid: number;
  debt: number;
  oldDebt?: number;
  discount?: number;
  note?: string;
  type: 'HOA_DON' | 'PHIEU_NHAP' | 'THU' | 'CHI';
}

export const PrintTemplate: React.FC<PrintTemplateProps> = ({
  title, id, date, partner, phone, address, items, total, paid, debt, oldDebt = 0, discount, note, type
}) => {
  const { printSettings } = useAppContext();
  
  // Make retrieval of logo robust
  let shopLogo = localStorage.getItem('digikiot_shop_logo');
  if (!shopLogo || shopLogo === 'null' || shopLogo === 'undefined' || shopLogo.trim() === '') {
    shopLogo = 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEi6auaPmOx44Q9OW7UvYxDFynRdaFpGI3z4k1UdchG_WNFIxvxs1_CLIysGsUAlGwtYbyV_QfAvJZ5-56Rpw3B00n7uFcJmTorBIQTFDzibjMeu7CHf-D4rBW4VgOLCCfc5F7ve3mLwVjImG2tbYo3ge_180NTz1evh8WECho9-vbegny4ROtZKxieR/s1600/Logo-cuong-tin.png';
  }

  const formattedDate = formatDateTime(date);

  const parsedDateObj = smartParseDate(date);
  const formattedDay = parsedDateObj.getTime() > 0 ? parsedDateObj.getDate().toString().padStart(2, '0') : '';
  const formattedMonth = parsedDateObj.getTime() > 0 ? (parsedDateObj.getMonth() + 1).toString().padStart(2, '0') : '';
  const formattedYear = parsedDateObj.getTime() > 0 ? parsedDateObj.getFullYear().toString() : '';

  const content = (
    <div id="print-section" className="fixed top-0 left-0 w-full min-h-screen bg-white text-slate-900 font-sans z-[999999] opacity-0 pointer-events-none print:relative print:opacity-100 print:z-auto print:pointer-events-auto p-4 md:p-6 shadow-inner text-sm leading-normal">
      {/* Decorative background removed for cleaner printing */}
      
      {/* Header with Store Info */}
      <div className="flex justify-between items-start mb-4 pb-3 border-b border-slate-300">
        <div className="flex gap-4 items-center">
          {shopLogo && (
            <div className="w-20 h-20 shrink-0 bg-white flex items-center justify-center overflow-hidden">
              <img src={shopLogo} alt="Store Logo" referrerPolicy="no-referrer" className="max-w-full max-h-full object-contain" />
            </div>
          )}
          <div className="space-y-0.5 text-xs md:text-sm">
            <h1 className="font-bold text-sm md:text-base text-slate-900 uppercase tracking-wide mb-0.5">{printSettings.storeName}</h1>
            <p className="flex items-center gap-1 font-normal text-slate-850">
              <span className="text-slate-500 font-normal">Đ/c:</span> {printSettings.address}
            </p>
            <p className="flex items-center gap-1 font-normal text-slate-850">
              <span className="text-slate-500 font-normal">ĐT:</span> {printSettings.phone}
              <span className="mx-1.5 text-slate-300">|</span>
              <span className="text-slate-500 font-normal">Email:</span> {printSettings.email}
            </p>
            {printSettings.bankInfo && (
              <p className="flex items-center gap-1 font-normal text-slate-850">
                <span className="text-slate-500 font-normal">NH:</span> {printSettings.bankInfo}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Invoice Title Block centered */}
      <div className="text-center mb-4">
        <h2 className="text-lg md:text-xl font-bold text-slate-900 uppercase tracking-wider">{title}</h2>
        <p className="text-sm font-medium font-mono text-slate-905 mt-0.5">Số hóa đơn: {id}</p>
        <p className="text-sm text-slate-650 italic mt-0.5">Ngày {formattedDay} tháng {formattedMonth} năm {formattedYear}</p>
      </div>

      {/* Customer Info */}
      <div className="mb-4 py-1 leading-relaxed text-sm">
        <div className="space-y-1 text-slate-900">
          <div className="flex flex-wrap justify-between items-baseline gap-2">
            <p>
              <span className="text-slate-500 font-normal">{type === 'PHIEU_NHAP' ? 'Nhà cung cấp:' : 'Khách hàng:'} </span>
              <span className="font-semibold text-slate-950 text-sm md:text-base">{partner}</span>
            </p>
            {phone && phone !== '---' && phone.trim() !== '' && phone !== 'undefined' && phone !== 'null' && (
              <p>
                <span className="text-slate-500 font-normal">SĐT: </span>
                <span className="font-semibold text-slate-950 text-sm md:text-base">{phone}</span>
              </p>
            )}
          </div>
          {address && address !== '---' && address.trim() !== '' && address !== 'undefined' && address !== 'null' && (
            <p>
              <span className="text-slate-500 font-normal">Địa chỉ: </span>
              <span className="text-slate-800 text-sm md:text-base">{address}</span>
            </p>
          )}
        </div>
      </div>

      {/* Table */}
      {items && items.length > 0 && (
        <div className="mb-4">
          <table className="w-full text-sm border-collapse border border-slate-500">
            <thead>
              <tr className="bg-slate-100 text-slate-900 text-left font-bold border-b border-slate-500">
                <th className="py-1 px-2 text-center border-r border-slate-500 w-10">STT</th>
                <th className="py-1 px-2 border-r border-slate-500">Tên hàng</th>
                <th className="py-1 px-2 text-center border-r border-slate-500 w-16">ĐVT</th>
                <th className="py-1 px-2 text-center border-r border-slate-500 w-18">Số lượng</th>
                <th className="py-1 px-2 text-right border-r border-slate-500 w-24 md:w-28">Đơn giá</th>
                <th className="py-1 px-2 text-right w-24 md:w-32">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={`print-item-${item.name}-${idx}`} className="border-b border-slate-400 text-slate-900">
                  <td className="py-1 px-2 text-center border-r border-slate-400">{idx + 1}</td>
                  <td className="py-1 px-2 border-r border-slate-400">{item.name}</td>
                  <td className="py-1 px-2 text-center border-r border-slate-400">{item.unit || 'Cái'}</td>
                  <td className="py-1 px-2 text-center border-r border-slate-400">{item.qty}</td>
                  <td className="py-1 px-2 text-right border-r border-slate-400">{formatNumber(item.price)}</td>
                  <td className="py-1 px-2 text-right font-medium">{formatNumber(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Calculations section */}
      <div className="flex justify-end mb-4 text-sm">
        <div className="w-full sm:w-[450px] space-y-1.5 text-slate-900">
          <div className="flex justify-between items-center">
            <span className="font-normal text-slate-700">Tổng cộng:</span>
            <div className="flex w-36 justify-between items-baseline font-semibold">
              <span className="text-center w-12">{items?.reduce((s, i) => s + i.qty, 0)}</span>
              <span className="text-right flex-1">{formatNumber(items?.reduce((s, i) => s + i.total, 0) || total)}</span>
            </div>
          </div>
          {discount !== undefined && discount > 0 && (
            <div className="flex justify-between items-center text-rose-600">
              <span className="font-normal">Chiết khấu hóa đơn:</span>
              <span className="font-medium text-right w-24">{formatNumber(discount)}</span>
            </div>
          )}
          <div className="flex justify-between items-center border-t border-slate-300 py-1 font-bold text-slate-950">
            <span>Tổng thanh toán:</span>
            <span className="text-right w-24 font-bold">{formatNumber(total)}</span>
          </div>
          
          <div className="text-center text-xs text-slate-600 italic font-normal py-0.5">
            (Tổng thanh toán bằng chữ: {numberToWordsVN(total)})
          </div>
          
          <div className="pt-2 space-y-1.5 text-slate-850 border-t border-dashed border-slate-300">
            <div className="flex justify-between items-center">
              <span className="font-normal text-slate-700">
                {type === 'PHIEU_NHAP' ? 'Đã thanh toán cho NCC:' : 'Khách hàng thanh toán:'}
              </span>
              <span className="font-medium text-right w-24">{formatNumber(paid)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-normal text-slate-700">Nợ cũ:</span>
              <span className="font-medium text-right w-24">{formatNumber(oldDebt)}</span>
            </div>
            <div className="flex justify-between items-center border-t border-slate-300 pt-1.5 font-bold text-slate-950">
              <span className="font-semibold text-slate-850">
                {type === 'PHIEU_NHAP' ? 'Nợ sau tạo phiếu nhập:' : 'Số nợ sau tạo hóa đơn:'}
              </span>
              <span className="text-right w-24 font-semibold">{formatNumber(oldDebt + (total - paid))}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Signatures */}
      <div className="grid grid-cols-2 gap-4 text-center mt-6 mb-10 px-6 text-sm">
        <div>
          <h4 className="font-bold uppercase text-slate-800 mb-1">{type === 'PHIEU_NHAP' ? 'Người giao hàng' : 'Người mua hàng'}</h4>
          <p className="text-[11px] italic text-slate-400 mb-14">(Ký và ghi rõ họ tên)</p>
          <p className="font-semibold text-slate-900">{partner}</p>
        </div>
        <div className="flex flex-col items-center">
          <p className="text-slate-605 italic mb-1.5 text-xs self-end">Ngày {formattedDay} tháng {formattedMonth} năm {formattedYear}</p>
          <h4 className="font-bold uppercase text-slate-800 mb-1">{type === 'PHIEU_NHAP' ? 'Người nhận hàng' : 'Người bán hàng'}</h4>
          <p className="text-[11px] italic text-slate-400 mb-14">(Ký và ghi rõ họ tên)</p>
          <p className="font-semibold text-slate-900">{printSettings.storeName.replace('TIN HỌC ', '')}</p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto pt-2 border-t border-slate-300 text-center">
        <p className="text-slate-600 font-normal text-xs uppercase tracking-widest italic mb-1">
          {printSettings.footNote}
        </p>
        <p className="text-[10px] text-slate-400 tracking-wider">Cường Tín ERP System - In lúc: {formatDateTime(new Date())}</p>
      </div>

      {/* Print Helper for hidden UI in screen but visible in print */}
      <style>{`
        @media print {
          @page {
            margin: 8mm; /* Slightly more space for printing content */
            size: auto;
          }
          body { 
            background: white !important; 
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          #root { display: none !important; }
          #print-section { 
            position: relative !important;
            opacity: 1 !important;
            pointer-events: auto !important;
            padding: 0 !important;
            shadow: none !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>

  );

  return createPortal(content, document.body);
};
