import React from 'react';
import { createPortal } from 'react-dom';
import { formatNumber, formatDateTime } from '../lib/utils';
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

  const content = (
    <div id="print-section" className="fixed top-0 left-0 w-full min-h-screen bg-white text-slate-900 font-sans z-[999999] opacity-0 pointer-events-none print:relative print:opacity-100 print:z-auto print:pointer-events-auto p-4 md:p-8 shadow-inner text-sm md:text-base leading-relaxed">
      {/* Decorative background removed for cleaner printing */}
      
      {/* Header with Store Info */}
      <div className="flex justify-between items-start mb-6 pb-4 border-b-2 border-slate-800">
        <div className="flex gap-4 items-center">
          {shopLogo && (
            <div className="w-24 h-24 shrink-0 bg-white flex items-center justify-center overflow-hidden">
              <img src={shopLogo} alt="Store Logo" referrerPolicy="no-referrer" className="max-w-full max-h-full object-contain" />
            </div>
          )}
          <div className="space-y-1">
            <h1 className="font-semibold text-xl md:text-2xl text-slate-900 uppercase tracking-wide mb-1">{printSettings.storeName}</h1>
            <p className="flex items-center gap-1 font-normal text-sm md:text-base text-slate-800">
              <span className="text-slate-500 font-normal">Đ/c:</span> {printSettings.address}
            </p>
            <p className="flex items-center gap-1 font-normal text-sm md:text-base text-slate-800">
              <span className="text-slate-500 font-normal">ĐT:</span> {printSettings.phone}
              <span className="mx-2 text-slate-300">|</span>
              <span className="text-slate-500 font-normal">Email:</span> {printSettings.email}
            </p>
            <p className="flex items-center gap-1 font-normal text-sm md:text-base text-slate-800">
              <span className="text-slate-500 font-normal">NH:</span> {printSettings.bankInfo}
            </p>
          </div>
        </div>
        <div className="text-right flex flex-col items-end">
          <div className="px-4 py-1.5 bg-slate-100 rounded border border-slate-200 mb-1.5">
             <span className="text-xs block text-slate-500 uppercase tracking-wider font-medium">Số hóa đơn</span>
             <span className="text-base font-normal font-mono text-slate-900">{id}</span>
          </div>
          <p className="text-sm text-slate-600 italic">
            Ngày: {formattedDate}
          </p>
        </div>
      </div>

      {/* Invoice Title */}
      <div className="text-center mb-6">
        <h2 className="text-2xl md:text-3xl font-semibold text-slate-900 uppercase tracking-widest">{title}</h2>
      </div>

      {/* Customer Info */}
      <div className="mb-6 p-4 bg-white rounded-lg border border-slate-200 leading-relaxed text-base md:text-lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2.5 gap-x-6 text-slate-800">
          <p className="flex items-baseline gap-2.5">
            <span className="text-xs md:text-sm uppercase tracking-wider text-slate-500 font-medium shrink-0">{type === 'PHIEU_NHAP' ? 'Nhà cung cấp:' : 'Khách hàng:'}</span>
            <span className="font-normal text-slate-900 text-base md:text-lg">{partner}</span>
          </p>
          {phone && phone !== '---' && phone.trim() !== '' && phone !== 'undefined' && phone !== 'null' && (
            <p className="flex items-baseline gap-2.5">
              <span className="text-xs md:text-sm uppercase tracking-wider text-slate-500 font-medium shrink-0">SĐT:</span>
              <span className="font-normal text-slate-900 text-base md:text-lg">{phone}</span>
            </p>
          )}
          {address && address !== '---' && address.trim() !== '' && address !== 'undefined' && address !== 'null' && (
            <p className="flex items-baseline gap-2.5 sm:col-span-2 border-t border-slate-100 pt-2.5 mt-1.5">
              <span className="text-xs md:text-sm uppercase tracking-wider text-slate-500 font-medium shrink-0">Địa chỉ:</span>
              <span className="text-slate-800 text-base md:text-lg">{address}</span>
            </p>
          )}
        </div>
      </div>

      {/* Table */}
      {items && items.length > 0 && (
        <div className="mb-6 rounded-lg border border-slate-300 overflow-hidden">
          <table className="w-full text-sm md:text-base">
            <thead>
              <tr className="border-b-2 border-slate-400 text-slate-800 bg-slate-50/50 text-left">
                <th className="py-3 px-3.5 text-center font-normal uppercase w-12">TT</th>
                <th className="py-3 px-3.5 font-normal uppercase">Tên mặt hàng / Quy cách</th>
                <th className="py-3 px-3.5 text-center font-normal uppercase w-20">ĐVT</th>
                <th className="py-3 px-3.5 text-center font-normal uppercase w-16">SL</th>
                <th className="py-3 px-3.5 text-right font-normal uppercase w-28 md:w-32">Đơn giá</th>
                <th className="py-3 px-3.5 text-right font-normal uppercase w-28 md:w-36">Thành tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.map((item, idx) => (
                <tr key={`print-item-${item.name}-${idx}`} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-3.5 text-center border-r border-slate-200 text-slate-600">{idx + 1}</td>
                  <td className="py-3 px-3.5 border-r border-slate-200">
                    <p className="font-normal text-slate-900 text-base md:text-lg">{item.name}</p>
                    {item.sn && (
                      <p className="text-xs md:text-sm text-slate-500 font-mono mt-1 leading-tight">
                        SN: {Array.isArray(item.sn) ? item.sn.join(', ') : item.sn}
                      </p>
                    )}
                  </td>
                  <td className="py-3 px-3.5 text-center border-r border-slate-200 text-slate-700">{item.unit || 'Cái'}</td>
                  <td className="py-3 px-3.5 text-center border-r border-slate-200 font-medium text-slate-900">{item.qty}</td>
                  <td className="py-3 px-3.5 text-right border-r border-slate-200 text-slate-700">{formatNumber(item.price)}</td>
                  <td className="py-3 px-3.5 text-right font-medium text-slate-900">{formatNumber(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Calculations section */}
      <div className="flex justify-end mb-8 text-sm md:text-base">
        <div className="w-full sm:w-[410px] space-y-2.5 text-base text-slate-800">
          <div className="flex justify-between font-normal px-1">
            <span>Cộng tiền hàng:</span>
            <span>{formatNumber(items?.reduce((s, i) => s + i.total, 0) || total)}</span>
          </div>
          {discount !== undefined && discount > 0 && (
            <div className="flex justify-between text-rose-600 font-normal px-1">
              <span>Chiết khấu:</span>
              <span>-{formatNumber(discount)}</span>
            </div>
          )}
          <div className="flex justify-between items-center border-t border-b border-slate-300 py-3 text-slate-950 my-1">
            <span className="font-medium uppercase text-sm md:text-base">Tổng cộng:</span>
            <span className="text-lg md:text-xl font-semibold">{formatNumber(total)}</span>
          </div>
          
          <div className="mb-3 text-center text-xs md:text-sm text-slate-600 italic font-normal leading-normal">
            (Bằng chữ: {numberToWordsVN(total)})
          </div>
          
          <div className="p-4 space-y-2.5 bg-slate-50 rounded border border-slate-200 text-slate-800 text-sm md:text-base">
            <div className="flex justify-between font-normal">
              <span>Nợ cũ:</span>
              <span className="font-normal text-slate-900">{formatNumber(oldDebt)}</span>
            </div>
            <div className="flex justify-between font-normal">
              <span>Đã thanh toán:</span>
              <span className="font-normal text-slate-900">{formatNumber(paid)}</span>
            </div>
            <div className="flex justify-between items-center border-t border-dashed border-slate-200 pt-3 mt-2">
              <span className="font-medium uppercase text-xs md:text-sm text-slate-500">Nợ sau đơn:</span>
              <span className="text-lg font-semibold text-slate-900">{formatNumber(oldDebt + (total - paid))}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Signatures */}
      <div className="grid grid-cols-2 gap-6 text-center mt-8 mb-16 px-6 text-sm md:text-base">
        <div>
          <h4 className="text-sm md:text-base font-normal uppercase tracking-wider text-slate-700 mb-1.5">{type === 'PHIEU_NHAP' ? 'Người giao hàng' : 'Người mua hàng'}</h4>
          <p className="text-xs md:text-sm italic text-slate-400 mb-16">(Ký và ghi rõ họ tên)</p>
          <p className="font-normal text-slate-900 text-base md:text-lg">{partner}</p>
        </div>
        <div>
          <h4 className="text-sm md:text-base font-normal uppercase tracking-wider text-slate-700 mb-1.5">{type === 'PHIEU_NHAP' ? 'Người nhận hàng' : 'Người bán hàng'}</h4>
          <p className="text-xs md:text-sm italic text-slate-400 mb-16">(Ký và ghi rõ họ tên)</p>
          <p className="font-normal text-slate-900 text-base md:text-lg">{printSettings.storeName.replace('TIN HỌC ', '')}</p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto pt-4 border-t border-slate-300 text-center">
        <p className="text-slate-600 font-normal text-sm uppercase tracking-widest italic mb-2">
          {printSettings.footNote}
        </p>
        <p className="text-xs text-slate-400 tracking-wider">Cường Tín ERP System - In lúc: {formatDateTime(new Date())}</p>
      </div>

      {/* Print Helper for hidden UI in screen but visible in print */}
      <style>{`
        @media print {
          @page {
            margin: 10mm; /* Narrower margins to fit A5 */
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
