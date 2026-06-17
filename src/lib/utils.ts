import * as React from 'react';

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount).replace('₫', 'đ');
};

export const formatNumber = (amount: number) => {
  return new Intl.NumberFormat('vi-VN').format(amount);
};

export const parseFormattedNumber = (value: any): number => {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return 0;
  return Number(value.replace(/\./g, '').replace(/,/g, '')) || 0;
};

export const parseDateString = (dateStr: string): number => {
  if (!dateStr) return 0;
  
  const d = smartParseDate(dateStr);
  const time = d.getTime();
  if (time > 0) return time;

  return 0;
};

export const smartParseDate = (dateStr: any): Date => {
  if (!dateStr) return new Date(0);
  if (dateStr instanceof Date) return dateStr;
  
  const str = String(dateStr);
  let year = 0, month = 0, day = 0;
  let hours = 0, minutes = 0, seconds = 0;
  let isIso = false;

  // Handle ISO format
  if (str.includes('T') || /^\d{4}-\d{2}-\d{2}/.test(str)) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      year = d.getFullYear();
      month = d.getMonth() + 1;
      day = d.getDate();
      hours = d.getHours();
      minutes = d.getMinutes();
      seconds = d.getSeconds();
      isIso = true;
    }
  }

  if (!isIso) {
    const tokens = str.split(/[\s,T]+/);
    // Find date part and time part
    const datePart = tokens.find(t => t.includes('/') || t.includes('-')) || tokens[0];
    const timePart = tokens.find(t => t.includes(':')) || (tokens.length > 1 ? tokens[1] : '00:00:00');

    let sep = datePart.includes('/') ? '/' : '-';
    const parts = datePart.split(sep);
    
    if (parts.length === 3) {
      if (parts[0].length === 4) { // YYYY/MM/DD
        year = parseInt(parts[0]);
        month = parseInt(parts[1]);
        day = parseInt(parts[2]);
      } else if (parts[2].length === 4) { // DD/MM/YYYY
        year = parseInt(parts[2]);
        month = parseInt(parts[1]);
        day = parseInt(parts[0]);
      } else if (parts[0].length <= 2 && parts[1].length <= 2 && parts[2].length === 2) {
        // Handle Short year formats (not recommended but possible)
        year = 2000 + parseInt(parts[2]);
        month = parseInt(parts[1]);
        day = parseInt(parts[0]);
      }
    }

    if (timePart) {
      const tParts = timePart.split(':');
      hours = parseInt(tParts[0] || '0');
      minutes = parseInt(tParts[1] || '0');
      seconds = parseInt(tParts[2] || '0');
    }
  }

  if (year === 0) {
    const d = new Date(str);
    return isNaN(d.getTime()) ? new Date(0) : d;
  }

  // Logic hoán đổi thông minh
  // Nếu tháng > 12, chắc chắn định dạng là MM/DD/YYYY
  if (month > 12) {
    const temp = month;
    month = day;
    day = temp;
  } 
  
  let d = new Date(year, month - 1, day, hours, minutes, seconds);
  
  // Kiểm tra hoán đổi tương lai
  const now = new Date();
  const buffer = new Date(now);
  buffer.setDate(buffer.getDate() + 1);
  
  if (d.getTime() > buffer.getTime() && day <= 12 && month <= 12) {
    const swapped = new Date(year, day - 1, month, hours, minutes, seconds);
    if (swapped.getTime() <= buffer.getTime()) {
      d = swapped;
    }
  }

  return d;
};

export const formatDateTime = (dateStr?: string | number | Date) => {
  if (!dateStr) return '';
  try {
    const date = smartParseDate(dateStr);
    if (!date.getTime() || isNaN(date.getTime())) return String(dateStr);

    const hh = date.getHours().toString().padStart(2, '0');
    const mm = date.getMinutes().toString().padStart(2, '0');
    const ss = date.getSeconds().toString().padStart(2, '0');
    const dd = date.getDate().toString().padStart(2, '0');
    const mo = (date.getMonth() + 1).toString().padStart(2, '0');
    const yyyy = date.getFullYear();

    return `${dd}/${mo}/${yyyy} ${hh}:${mm}:${ss}`;
  } catch (e) {
    return String(dateStr);
  }
};

export const formatDate = (dateStr?: string | number | Date) => {
  if (!dateStr) return '';
  try {
    const date = smartParseDate(dateStr);
    if (!date.getTime() || isNaN(date.getTime())) return String(dateStr);

    const dd = date.getDate().toString().padStart(2, '0');
    const mo = (date.getMonth() + 1).toString().padStart(2, '0');
    const yyyy = date.getFullYear();

    return `${dd}/${mo}/${yyyy}`;
  } catch (e) {
    return String(dateStr);
  }
};

export const formatDateDayMonth = (dateStr?: string | number | Date) => {
  if (!dateStr) return '';
  try {
    const date = smartParseDate(dateStr);
    if (!date.getTime() || isNaN(date.getTime())) return String(dateStr);

    const dd = date.getDate().toString().padStart(2, '0');
    const mo = (date.getMonth() + 1).toString().padStart(2, '0');

    return `${dd}/${mo}`;
  } catch (e) {
    return String(dateStr);
  }
};

export const formatDateTime24h = (dateStr?: string | number | Date) => {
  if (!dateStr) return '';
  try {
    const date = smartParseDate(dateStr);
    if (!date.getTime() || isNaN(date.getTime())) return String(dateStr);

    const dd = date.getDate().toString().padStart(2, '0');
    const mo = (date.getMonth() + 1).toString().padStart(2, '0');
    const yyyy = date.getFullYear();
    const hh = date.getHours().toString().padStart(2, '0');
    const mm = date.getMinutes().toString().padStart(2, '0');

    return `${dd}/${mo}/${yyyy} ${hh}:${mm}`;
  } catch (e) {
    return String(dateStr);
  }
};

export const formatDateTime12h = (dateStr?: string | number | Date) => {
  if (!dateStr) return '';
  try {
    const date = smartParseDate(dateStr);
    if (!date.getTime() || isNaN(date.getTime())) return String(dateStr);

    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const strHours = hours.toString().padStart(2, '0');

    const dd = date.getDate().toString().padStart(2, '0');
    const mo = (date.getMonth() + 1).toString().padStart(2, '0');
    const yyyy = date.getFullYear();

    return `${dd}/${mo}/${yyyy} ${strHours}:${minutes} ${ampm}`;
  } catch (e) {
    return String(dateStr);
  }
};

export const padPhone = (phone?: string | number) => {
  if (!phone) return '';
  let p = String(phone).trim();
  p = p.replace(/^'/, ''); // remove any leading apostrophe from Sheets
  if (p && !p.startsWith('0') && p !== '---') {
    p = '0' + p;
  }
  return p;
};

export const formatSnForDb = (sn: string | string[] | undefined | null) => {
  if (!sn) return '';
  const joined = Array.isArray(sn) ? sn.join(',') : String(sn);
  if (!joined) return '';
  return joined;
};

export const parseSnFromDb = (sn: any) => {
  if (!sn) return undefined;
  return String(sn).replace(/^'/, '');
};

export const handlePhoneCall = (e: React.MouseEvent, phone?: string) => {
  e.preventDefault();
  e.stopPropagation();
  if (!phone) return;
  const isAndroid = /Android/i.test(navigator.userAgent);
  const isZalo = /Zalo/i.test(navigator.userAgent);
  
  if (isAndroid && isZalo) {
    window.location.href = `intent:${phone}#Intent;scheme=tel;action=android.intent.action.DIAL;end`;
  } else {
    window.location.href = `tel:${phone}`;
  }
};

export function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
