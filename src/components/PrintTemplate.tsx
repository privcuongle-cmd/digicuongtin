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

  const formattedDate = formatDateTime(date);

  const content = (
    <div id="print-section" className="fixed top-0 left-0 w-full min-h-screen bg-white text-slate-900 font-sans z-[999999] opacity-0 pointer-events-none print:relative print:opacity-100 print:z-auto print:pointer-events-auto p-4 md:p-8 shadow-inner text-[11px] md:text-sm">
      {/* Decorative background removed for cleaner printing */}
      
      {/* Header with Store Info */}
      <div className="flex justify-between items-start mb-4 pb-4 border-b-2 border-slate-800">
        <div className="flex gap-4">
          <div className="flex flex-col items-center justify-center p-1.5 bg-slate-900 text-white rounded-md aspect-square w-16">
            <span className="text-[7px] font-bold uppercase tracking-widest mb-0.5">QR CODE</span>
            <div className="bg-white p-0.5 rounded">
              <div className="w-8 h-8 border border-black flex items-center justify-center text-[6px] text-black font-mono">VINBA</div>
            </div>
          </div>
          <div className="space-y-0.5">
            <h1 className="font-extrabold text-base md:text-lg text-slate-900 uppercase tracking-tight mb-1">{printSettings.storeName}</h1>
            <p className="flex items-center gap-1 font-medium">
              <span className="font-bold text-slate-900">Đ/c:</span> {printSettings.address}
            </p>
            <p className="flex items-center gap-1 font-medium">
              <span className="font-bold text-slate-900">ĐT:</span> {printSettings.phone}
              <span className="mx-1 text-slate-300">|</span>
              <span className="font-bold text-slate-900">Email:</span> {printSettings.email}
            </p>
            <p className="flex items-center gap-1 font-medium">
              <span className="font-bold text-slate-900">NH:</span> {printSettings.bankInfo}
            </p>
          </div>
        </div>
        <div className="text-right flex flex-col items-end">
          <div className="px-3 py-1.5 bg-slate-100 rounded-md mb-1 border border-slate-200">
             <span className="text-[8px] block font-bold text-slate-500 uppercase">Số hóa đơn</span>
             <span className="text-sm font-black font-mono text-slate-900">{id}</span>
          </div>
          <p className="text-[10px] font-medium text-slate-500 italic">
            Ngày: {formattedDate}
          </p>
        </div>
      </div>

      {/* Invoice Title */}
      <div className="text-center mb-4">
        <h2 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-wider mb-1">{title}</h2>
      </div>

      {/* Customer Info */}
      <div className="mb-4 p-2.5 bg-white rounded-lg border border-slate-200 shadow-sm leading-relaxed">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <p className="flex items-center gap-1.5 w-full sm:w-auto">
            <span className="text-[10px] uppercase font-bold text-slate-500">{type === 'PHIEU_NHAP' ? 'Nhà cung cấp:' : 'Khách hàng:'}</span>
            <span className="font-bold text-[13px] text-slate-900">{partner}</span>
          </p>
          {phone && phone !== '---' && phone.trim() !== '' && phone !== 'undefined' && phone !== 'null' && (
            <p className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-500">SĐT:</span>
              <span className="font-bold text-[13px] text-slate-900">{phone}</span>
            </p>
          )}
          {address && address !== '---' && address.trim() !== '' && address !== 'undefined' && address !== 'null' && (
            <p className="flex items-center gap-1.5 w-full mt-1">
              <span className="text-[10px] uppercase font-bold text-slate-500">Địa chỉ:</span>
              <span className="font-medium text-[12px] text-slate-900">{address}</span>
            </p>
          )}
        </div>
      </div>

      {/* Table */}
      {items && items.length > 0 && (
        <div className="mb-4 rounded-lg border border-slate-300 overflow-hidden">
          <table className="w-full text-[11px] md:text-xs">
            <thead>
              <tr className="border-b border-slate-300 text-slate-800 bg-slate-50/50">
                <th className="py-1.5 px-2 text-center font-bold uppercase w-8">TT</th>
                <th className="py-1.5 px-2 text-left font-bold uppercase">Tên mặt hàng / Quy cách</th>
                <th className="py-1.5 px-2 text-center font-bold uppercase w-12">ĐVT</th>
                <th className="py-1.5 px-2 text-center font-bold uppercase w-10">SL</th>
                <th className="py-1.5 px-2 text-right font-bold uppercase w-20 md:w-24">Đơn giá</th>
                <th className="py-1.5 px-2 text-right font-bold uppercase w-20 md:w-28">Thành tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.map((item, idx) => (
                <tr key={`print-item-${item.name}-${idx}`} className="hover:bg-slate-50 transition-colors">
                  <td className="py-1.5 px-2 text-center border-r border-slate-200/50">{idx + 1}</td>
                  <td className="py-1.5 px-2 border-r border-slate-200/50">
                    <p className="font-bold text-slate-900">{item.name}</p>
                    {item.sn && (
                      <p className="text-[9px] text-slate-500 italic font-mono mt-0.5 leading-tight">
                        SN: {Array.isArray(item.sn) ? item.sn.join(', ') : item.sn}
                      </p>
                    )}
                  </td>
                  <td className="py-1.5 px-2 text-center font-medium border-r border-slate-200/50">{item.unit || 'Cái'}</td>
                  <td className="py-1.5 px-2 text-center font-bold text-slate-900 border-r border-slate-200/50">{item.qty}</td>
                  <td className="py-1.5 px-2 text-right font-medium border-r border-slate-200/50">{formatNumber(item.price)}</td>
                  <td className="py-1.5 px-2 text-right font-bold text-slate-900">{formatNumber(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Calculations section */}
      <div className="flex justify-end mb-6">
        <div className="w-full sm:w-[350px] space-y-1.5">
          <div className="flex justify-between font-medium text-xs px-1">
            <span>Cộng tiền hàng:</span>
            <span>{formatNumber(items?.reduce((s, i) => s + i.total, 0) || total)}</span>
          </div>
          {discount !== undefined && discount > 0 && (
            <div className="flex justify-between text-rose-600 font-bold text-xs px-1">
              <span>Chiết khấu:</span>
              <span>-{formatNumber(discount)}</span>
            </div>
          )}
          <div className="flex justify-between items-center border-t border-b border-slate-300 py-1.5 text-slate-900 my-1">
            <span className="font-bold uppercase text-[12px]">Tổng cộng:</span>
            <span className="text-sm md:text-base font-black">{formatNumber(total)}</span>
          </div>
          
          <div className="mb-2 text-center text-[10px] text-slate-800 italic font-medium leading-tight">
            (Bằng chữ: {numberToWordsVN(total)})
          </div>
          
          <div className="p-2 space-y-1 bg-slate-50 rounded border border-slate-200 text-xs text-slate-800">
            <div className="flex justify-between font-medium">
              <span>Nợ cũ:</span>
              <span className="font-bold">{formatNumber(oldDebt)}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>Đã thanh toán:</span>
              <span className="font-bold text-emerald-600">{formatNumber(paid)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-bold uppercase text-[10px]">Nợ sau đơn:</span>
              <span className="text-sm font-black tracking-tighter">{formatNumber(oldDebt + (total - paid))}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Signatures */}
      <div className="grid grid-cols-2 gap-4 text-center mt-6 mb-12 px-6">
        <div>
          <h4 className="text-[11px] font-bold uppercase tracking-wide text-slate-800 mb-1">{type === 'PHIEU_NHAP' ? 'Người giao hàng' : 'Người mua hàng'}</h4>
          <p className="text-[9px] italic text-slate-500 mb-12">(Ký và ghi rõ họ tên)</p>
          <p className="text-sm font-bold text-slate-900">{partner}</p>
        </div>
        <div>
          <h4 className="text-[11px] font-bold uppercase tracking-wide text-slate-800 mb-1">{type === 'PHIEU_NHAP' ? 'Người nhận hàng' : 'Người bán hàng'}</h4>
          <p className="text-[9px] italic text-slate-500 mb-12">(Ký và ghi rõ họ tên)</p>
          <p className="text-sm font-bold text-slate-900">{printSettings.storeName.replace('TIN HỌC ', '')}</p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto pt-4 border-t border-slate-300 text-center">
        <p className="text-slate-600 font-bold text-[9px] uppercase tracking-wider italic mb-1.5">
          {printSettings.footNote}
        </p>
        <p className="text-[8px] text-slate-400 font-medium tracking-tight">Cường Tín ERP System - In lúc: {formatDateTime(new Date())}</p>
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
