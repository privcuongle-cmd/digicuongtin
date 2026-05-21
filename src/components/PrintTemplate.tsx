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
  const shopLogo = localStorage.getItem('digikiot_shop_logo') || 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEi6auaPmOx44Q9OW7UvYxDFynRdaFpGI3z4k1UdchG_WNFIxvxs1_CLIysGsUAlGwtYbyV_QfAvJZ5-56Rpw3B00n7uFcJmTorBIQTFDzibjMeu7CHf-D4rBW4VgOLCCfc5F7ve3mLwVjImG2tbYo3ge_180NTz1evh8WECho9-vbegny4ROtZKxieR/s1600/Logo-cuong-tin.png';

  const formattedDate = formatDateTime(date);

  const content = (
    <div id="print-section" className="fixed top-0 left-0 w-full min-h-screen bg-white text-slate-900 font-sans z-[999999] opacity-0 pointer-events-none print:relative print:opacity-100 print:z-auto print:pointer-events-auto p-4 md:p-8 shadow-inner text-sm md:text-base leading-relaxed">
      {/* Decorative background removed for cleaner printing */}
      
      {/* Header with Store Info */}
      <div className="flex justify-between items-start mb-6 pb-4 border-b-2 border-slate-800">
        <div className="flex gap-4 items-center">
          {shopLogo ? (
            <div className="w-20 h-20 shrink-0 bg-white flex items-center justify-center overflow-hidden">
              <img src={shopLogo} alt="Store Logo" referrerPolicy="no-referrer" className="max-w-full max-h-full object-contain" />
            </div>
          ) : (
            <div className="w-16 h-16 shrink-0 bg-slate-900 text-white rounded flex flex-col items-center justify-center p-1.5 grayscale">
              <span className="text-[8px] font-bold tracking-widest uppercase mb-0.5">QR CODE</span>
              <div className="bg-white p-0.5 rounded">
                <div className="w-8 h-8 border border-black flex items-center justify-center text-[7px] text-black font-mono font-bold">ERP</div>
              </div>
            </div>
          )}
          <div className="space-y-1">
            <h1 className="font-semibold text-lg md:text-xl text-slate-900 uppercase tracking-tight mb-1">{printSettings.storeName}</h1>
            <p className="flex items-center gap-1 font-medium text-xs md:text-sm text-slate-700">
              <span className="text-slate-500 font-normal">Đ/c:</span> {printSettings.address}
            </p>
            <p className="flex items-center gap-1 font-medium text-xs md:text-sm text-slate-700">
              <span className="text-slate-500 font-normal">ĐT:</span> {printSettings.phone}
              <span className="mx-2 text-slate-300">|</span>
              <span className="text-slate-500 font-normal">Email:</span> {printSettings.email}
            </p>
            <p className="flex items-center gap-1 font-medium text-xs md:text-sm text-slate-700">
              <span className="text-slate-500 font-normal">NH:</span> {printSettings.bankInfo}
            </p>
          </div>
        </div>
        <div className="text-right flex flex-col items-end">
          <div className="px-3 py-1 bg-slate-100 rounded border border-slate-200 mb-1">
             <span className="text-[9px] block text-slate-500 uppercase tracking-wider font-semibold">Số hóa đơn</span>
             <span className="text-sm font-medium font-mono text-slate-900">{id}</span>
          </div>
          <p className="text-xs text-slate-500 italic">
            Ngày: {formattedDate}
          </p>
        </div>
      </div>

      {/* Invoice Title */}
      <div className="text-center mb-6">
        <h2 className="text-2xl md:text-3xl font-semibold text-slate-900 uppercase tracking-widest">{title}</h2>
      </div>

      {/* Customer Info */}
      <div className="mb-6 p-4 bg-white rounded-lg border border-slate-200 leading-relaxed text-sm md:text-base">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6 text-slate-800">
          <p className="flex items-baseline gap-2">
            <span className="text-xs uppercase tracking-wider text-slate-500 font-medium shrink-0">{type === 'PHIEU_NHAP' ? 'Nhà cung cấp:' : 'Khách hàng:'}</span>
            <span className="font-semibold text-slate-900 text-sm md:text-base">{partner}</span>
          </p>
          {phone && phone !== '---' && phone.trim() !== '' && phone !== 'undefined' && phone !== 'null' && (
            <p className="flex items-baseline gap-2">
              <span className="text-xs uppercase tracking-wider text-slate-500 font-medium shrink-0">SĐT:</span>
              <span className="font-semibold text-slate-900 text-sm md:text-base">{phone}</span>
            </p>
          )}
          {address && address !== '---' && address.trim() !== '' && address !== 'undefined' && address !== 'null' && (
            <p className="flex items-baseline gap-2 sm:col-span-2 border-t border-slate-100 pt-2 mt-1">
              <span className="text-xs uppercase tracking-wider text-slate-500 font-medium shrink-0">Địa chỉ:</span>
              <span className="text-slate-800 text-sm md:text-base">{address}</span>
            </p>
          )}
        </div>
      </div>

      {/* Table */}
      {items && items.length > 0 && (
        <div className="mb-6 rounded-lg border border-slate-300 overflow-hidden">
          <table className="w-full text-xs md:text-sm">
            <thead>
              <tr className="border-b-2 border-slate-400 text-slate-800 bg-slate-50/50 text-left">
                <th className="py-2.5 px-3 text-center font-semibold uppercase w-10">TT</th>
                <th className="py-2.5 px-3 font-semibold uppercase">Tên mặt hàng / Quy cách</th>
                <th className="py-2.5 px-3 text-center font-semibold uppercase w-16">ĐVT</th>
                <th className="py-2.5 px-3 text-center font-semibold uppercase w-14">SL</th>
                <th className="py-2.5 px-3 text-right font-semibold uppercase w-24 md:w-28">Đơn giá</th>
                <th className="py-2.5 px-3 text-right font-semibold uppercase w-24 md:w-32">Thành tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.map((item, idx) => (
                <tr key={`print-item-${item.name}-${idx}`} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2.5 px-3 text-center border-r border-slate-200 text-slate-600">{idx + 1}</td>
                  <td className="py-2.5 px-3 border-r border-slate-200">
                    <p className="font-normal text-slate-900 text-sm md:text-base">{item.name}</p>
                    {item.sn && (
                      <p className="text-xs text-slate-500 font-mono mt-1 leading-tight">
                        SN: {Array.isArray(item.sn) ? item.sn.join(', ') : item.sn}
                      </p>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center border-r border-slate-200 text-slate-700">{item.unit || 'Cái'}</td>
                  <td className="py-2.5 px-3 text-center border-r border-slate-200 font-medium text-slate-900">{item.qty}</td>
                  <td className="py-2.5 px-3 text-right border-r border-slate-200 text-slate-700">{formatNumber(item.price)}</td>
                  <td className="py-2.5 px-3 text-right font-medium text-slate-900">{formatNumber(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Calculations section */}
      <div className="flex justify-end mb-8 text-xs md:text-sm">
        <div className="w-full sm:w-[380px] space-y-2 text-sm">
          <div className="flex justify-between font-medium px-1">
            <span>Cộng tiền hàng:</span>
            <span>{formatNumber(items?.reduce((s, i) => s + i.total, 0) || total)}</span>
          </div>
          {discount !== undefined && discount > 0 && (
            <div className="flex justify-between text-rose-600 font-medium px-1">
              <span>Chiết khấu:</span>
              <span>-{formatNumber(discount)}</span>
            </div>
          )}
          <div className="flex justify-between items-center border-t border-b border-slate-300 py-2.5 text-slate-900 my-1">
            <span className="font-semibold uppercase text-xs md:text-sm">Tổng cộng:</span>
            <span className="text-base md:text-lg font-bold">{formatNumber(total)}</span>
          </div>
          
          <div className="mb-2 text-center text-xs text-slate-600 italic font-medium leading-normal">
            (Bằng chữ: {numberToWordsVN(total)})
          </div>
          
          <div className="p-3 space-y-2 bg-slate-50 rounded border border-slate-200 text-slate-800 text-sm">
            <div className="flex justify-between font-medium">
              <span>Nợ cũ:</span>
              <span className="font-semibold">{formatNumber(oldDebt)}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>Đã thanh toán:</span>
              <span className="font-semibold text-emerald-600">{formatNumber(paid)}</span>
            </div>
            <div className="flex justify-between items-center border-t border-dashed border-slate-200 pt-2 mt-1.5">
              <span className="font-semibold uppercase text-xs text-slate-500">Nợ sau đơn:</span>
              <span className="text-base font-bold text-slate-900">{formatNumber(oldDebt + (total - paid))}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Signatures */}
      <div className="grid grid-cols-2 gap-6 text-center mt-8 mb-16 px-6 text-sm md:text-base">
        <div>
          <h4 className="text-xs md:text-sm font-semibold uppercase tracking-wider text-slate-700 mb-1">{type === 'PHIEU_NHAP' ? 'Người giao hàng' : 'Người mua hàng'}</h4>
          <p className="text-xs italic text-slate-400 mb-14">(Ký và ghi rõ họ tên)</p>
          <p className="font-medium text-slate-900 text-sm md:text-base">{partner}</p>
        </div>
        <div>
          <h4 className="text-xs md:text-sm font-semibold uppercase tracking-wider text-slate-700 mb-1">{type === 'PHIEU_NHAP' ? 'Người nhận hàng' : 'Người bán hàng'}</h4>
          <p className="text-xs italic text-slate-400 mb-14">(Ký và ghi rõ họ tên)</p>
          <p className="font-medium text-slate-900 text-sm md:text-base">{printSettings.storeName.replace('TIN HỌC ', '')}</p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto pt-4 border-t border-slate-300 text-center">
        <p className="text-slate-500 font-medium text-xs uppercase tracking-widest italic mb-1.5">
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
