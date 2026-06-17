import React, { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';

interface DateTimePickerProps {
  value: string; // format YYYY-MM-DDTHH:mm
  onChange: (val: string) => void;
  className?: string;
}

export const DateTimePicker: React.FC<DateTimePickerProps> = ({ value, onChange, className = '' }) => {
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [hour, setHour] = useState('');
  const [minute, setMinute] = useState('');
  const [isError, setIsError] = useState(false);

  const syncFromValue = (val: string) => {
    if (!val) return;
    const parts = val.split('T');
    if (parts.length === 2) {
      const dateParts = parts[0].split('-');
      const timeParts = parts[1].split(':');
      if (dateParts.length === 3 && timeParts.length >= 2) {
        setYear(dateParts[0]);
        setMonth(dateParts[1]);
        setDay(dateParts[2]);
        setHour(timeParts[0]);
        setMinute(timeParts[1]);
        setIsError(false);
        return;
      }
    }
    
    const parsedDate = new Date(val);
    if (!isNaN(parsedDate.getTime())) {
      setDay(String(parsedDate.getDate()).padStart(2, '0'));
      setMonth(String(parsedDate.getMonth() + 1).padStart(2, '0'));
      setYear(String(parsedDate.getFullYear()));
      setHour(String(parsedDate.getHours()).padStart(2, '0'));
      setMinute(String(parsedDate.getMinutes()).padStart(2, '0'));
      setIsError(false);
    }
  };

  // Synchronize state when the outer value changes
  useEffect(() => {
    syncFromValue(value);
  }, [value]);

  const validateAndCommit = () => {
    const currentYear = new Date().getFullYear();

    let dVal = day.trim();
    let mVal = month.trim();
    let yVal = year.trim();
    let hVal = hour.trim();
    let minVal = minute.trim();

    // If completely empty, revert
    if (!dVal && !mVal && !yVal && !hVal && !minVal) {
      syncFromValue(value);
      setIsError(false);
      return;
    }

    // Default values if empty
    const now = new Date();
    if (!dVal) dVal = String(now.getDate()).padStart(2, '0');
    if (!mVal) mVal = String(now.getMonth() + 1).padStart(2, '0');
    if (!yVal) yVal = String(now.getFullYear());
    if (!hVal) hVal = String(now.getHours()).padStart(2, '0');
    if (!minVal) minVal = String(now.getMinutes()).padStart(2, '0');

    let d = parseInt(dVal, 10);
    let m = parseInt(mVal, 10);
    let y = parseInt(yVal, 10);
    let h = parseInt(hVal, 10);
    let min = parseInt(minVal, 10);

    // Validate ranges & clamps
    if (isNaN(m) || m < 1) m = 1;
    if (m > 12) m = 12;

    if (isNaN(y) || y < 1000) y = currentYear;
    if (y > currentYear) y = currentYear;

    // Days in Month logic
    const maxDays = new Date(y, m, 0).getDate();
    if (isNaN(d) || d < 1) d = 1;
    if (d > maxDays) d = maxDays;

    if (isNaN(h) || h < 0) h = 0;
    if (h > 23) h = 23;

    if (isNaN(min) || min < 0) min = 0;
    if (min > 59) min = 59;

    setIsError(false);

    const cleanD = String(d).padStart(2, '0');
    const cleanM = String(m).padStart(2, '0');
    const cleanY = String(y);
    const cleanH = String(h).padStart(2, '0');
    const cleanMin = String(min).padStart(2, '0');

    setDay(cleanD);
    setMonth(cleanM);
    setYear(cleanY);
    setHour(cleanH);
    setMinute(cleanMin);

    const formatted = `${cleanY}-${cleanM}-${cleanD}T${cleanH}:${cleanMin}`;
    onChange(formatted);
  };

  const handleDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 2) {
      val = val.slice(0, 2);
    }
    const num = parseInt(val, 10);
    if (!isNaN(num) && num > 31) {
      val = '31';
    }
    setDay(val);
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 2) {
      val = val.slice(0, 2);
    }
    const num = parseInt(val, 10);
    if (!isNaN(num) && num > 12) {
      val = '12';
    }
    setMonth(val);
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 4) {
      val = val.slice(0, 4);
    }
    const currentYear = new Date().getFullYear();
    const num = parseInt(val, 10);
    if (val.length === 4 && !isNaN(num) && num > currentYear) {
      val = String(currentYear);
    }
    setYear(val);
  };

  const handleHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 2) {
      val = val.slice(0, 2);
    }
    const num = parseInt(val, 10);
    if (!isNaN(num) && num > 23) {
      val = '23';
    }
    setHour(val);
  };

  const handleMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 2) {
      val = val.slice(0, 2);
    }
    const num = parseInt(val, 10);
    if (!isNaN(num) && num > 59) {
      val = '59';
    }
    setMinute(val);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      validateAndCommit();
      e.currentTarget.blur();
    }
  };

  return (
    <div className={`relative flex items-center ${className}`}>
      {/* Visual Enclosed Group styled precisely as a text input */}
      <div 
        className={`flex items-center gap-0.5 bg-white border rounded px-2 py-1 text-xs font-bold transition-colors text-slate-800 ${
          isError 
            ? 'border-red-400 focus-within:border-red-500 focus-within:ring-1 focus-within:ring-red-50' 
            : 'border-slate-200 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-100'
        }`}
      >
        {/* Day */}
        <input
          type="text"
          maxLength={2}
          value={day}
          onChange={handleDayChange}
          onBlur={validateAndCommit}
          onKeyDown={handleKeyDown}
          placeholder="dd"
          className="w-[20px] text-center bg-transparent border-none outline-none p-0 cursor-text font-bold"
          title="Ngày (dd)"
        />
        <span className="text-slate-400 select-none">/</span>

        {/* Month */}
        <input
          type="text"
          maxLength={2}
          value={month}
          onChange={handleMonthChange}
          onBlur={validateAndCommit}
          onKeyDown={handleKeyDown}
          placeholder="mm"
          className="w-[20px] text-center bg-transparent border-none outline-none p-0 cursor-text font-bold"
          title="Tháng (mm)"
        />
        <span className="text-slate-400 select-none">/</span>

        {/* Year */}
        <input
          type="text"
          maxLength={4}
          value={year}
          onChange={handleYearChange}
          onBlur={validateAndCommit}
          onKeyDown={handleKeyDown}
          placeholder="yyyy"
          className="w-[38px] text-center bg-transparent border-none outline-none p-0 cursor-text font-bold"
          title="Năm (yyyy)"
        />

        <span className="w-1.5 select-none" />

        {/* Hour */}
        <input
          type="text"
          maxLength={2}
          value={hour}
          onChange={handleHourChange}
          onBlur={validateAndCommit}
          onKeyDown={handleKeyDown}
          placeholder="HH"
          className="w-[20px] text-center bg-transparent border-none outline-none p-0 cursor-text font-bold"
          title="Giờ (24h)"
        />
        <span className="text-slate-400 select-none">:</span>

        {/* Minute */}
        <input
          type="text"
          maxLength={2}
          value={minute}
          onChange={handleMinuteChange}
          onBlur={validateAndCommit}
          onKeyDown={handleKeyDown}
          placeholder="MM"
          className="w-[20px] text-center bg-transparent border-none outline-none p-0 cursor-text font-bold"
          title="Phút"
        />

        {/* Calendar Trigger Overlay - Native, light, zero-dependency */}
        <div className="relative overflow-hidden cursor-pointer text-slate-400 hover:text-blue-500 p-0.5 rounded transition-colors ml-1.5 flex items-center justify-center">
          <Calendar size={13} />
          {/* Overlay native picker input directly over the icon */}
          <input
            type="datetime-local"
            value={value || ''}
            onChange={(e) => {
              if (e.target.value) {
                onChange(e.target.value);
              }
            }}
            className="absolute inset-0 cursor-pointer opacity-0 w-full h-full"
            style={{ fontSize: '16px' }}
          />
        </div>
      </div>
    </div>
  );
};
