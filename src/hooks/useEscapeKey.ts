import { useEffect } from 'react';

// Ngăn xếp toàn cục để theo dõi các trình xử lý Esc theo thứ tự mở
const escapeStack: (() => void)[] = [];

/**
 * Hook để đóng popup khi nhấn phím Escape
 * @param handler Hàm sẽ được gọi khi nhấn Esc
 * @param isOpen Trạng thái mở của popup (chỉ đăng ký khi mở)
 */
export function useEscapeKey(handler: () => void, isOpen: boolean) {
  useEffect(() => {
    if (!isOpen) return;

    // Khi popup mở, đưa handler vào stack
    escapeStack.push(handler);
    
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // Lấy handler ở trên cùng của stack
        const topHandler = escapeStack[escapeStack.length - 1];
        
        // Chỉ thực thi nếu handler này là handler trên cùng
        if (topHandler === handler) {
          // Ngăn sự kiện lan tỏa để các component cha không bắt được
          event.preventDefault();
          event.stopImmediatePropagation();
          handler();
        }
      }
    };

    // Sử dụng capture phase để bắt sự kiện trước khi nó lan tỏa
    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      // Khi component unmount hoặc popup đóng, gỡ bỏ khỏi stack
      window.removeEventListener('keydown', handleKeyDown, true);
      const index = escapeStack.indexOf(handler);
      if (index !== -1) {
        escapeStack.splice(index, 1);
      }
    };
  }, [handler, isOpen]);
}
