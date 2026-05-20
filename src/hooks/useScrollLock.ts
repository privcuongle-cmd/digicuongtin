import { useEffect, useId } from 'react';

// Use a truly global state for scroll locks that persists across renders
if (!window.__scrollLocks) {
  window.__scrollLocks = new Set<string>();
}

declare global {
  interface Window {
    __scrollLocks: Set<string>;
  }
}

export const useScrollLock = (isLocked: boolean) => {
  const id = useId();

  useEffect(() => {
    if (isLocked) {
      window.__scrollLocks.add(id);
    } else {
      window.__scrollLocks.delete(id);
    }

    const updateBodyStyle = () => {
      if (window.__scrollLocks.size > 0) {
        // Only set if not already hidden to avoid layout jumps
        if (document.body.style.overflow !== 'hidden') {
          const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
          document.body.style.overflow = 'hidden';
          if (scrollBarWidth > 0) {
            document.body.style.paddingRight = `${scrollBarWidth}px`;
          }
        }
      } else {
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
      }
    };

    updateBodyStyle();

    return () => {
      window.__scrollLocks.delete(id);
      updateBodyStyle();
    };
  }, [isLocked, id]);
};
