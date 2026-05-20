import { useEffect, useRef } from 'react';

// Use a truly global stack
if (!window.__modalStack) {
  window.__modalStack = [];
}

let programmaticBackCount = 0;

declare global {
  interface Window {
    __modalStack: { id: string; close: () => void }[];
  }
}

// Global popstate handler (runs only once per navigation)
if (!window.__popStateHandlerRegistered) {
  window.addEventListener('popstate', (e) => {
    if (programmaticBackCount > 0) {
      programmaticBackCount--;
      return;
    }
    
    const stack = window.__modalStack;
    if (stack && stack.length > 0) {
      const topModal = stack.pop(); // Remove it from stack
      if (topModal) {
        topModal.close();
      }
    }
  });
  window.__popStateHandlerRegistered = true;
}

declare global {
  interface Window {
    __popStateHandlerRegistered?: boolean;
  }
}

export const useMobileBackModal = (isOpen: boolean, onClose: () => void) => {
  const onCloseRef = useRef(onClose);
  const modalIdRef = useRef(`modal_${Math.random().toString(36).substring(2, 9)}`);
  
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const modalId = modalIdRef.current;
    const stack = window.__modalStack;
    
    // Check if this modal is being remounted by Strict Mode and is already in the queue
    if ((window as any).__modalPendingCleanup?.[modalId]) {
      clearTimeout((window as any).__modalPendingCleanup[modalId]);
      delete (window as any).__modalPendingCleanup[modalId];
    } else {
      // Fresh mount
      stack.push({
        id: modalId,
        close: () => onCloseRef.current()
      });
      
      const currentLoc = window.location.pathname + window.location.search;
      window.history.pushState({ ...window.history.state, __modalId: modalId }, '', currentLoc + '#' + modalId);
    }

    return () => {
      // Delay cleanup to gracefully handle Strict Mode unmount/remount cycle
      if (!(window as any).__modalPendingCleanup) {
        (window as any).__modalPendingCleanup = {};
      }
      
      (window as any).__modalPendingCleanup[modalId] = setTimeout(() => {
        delete (window as any).__modalPendingCleanup[modalId];
        
        const index = window.__modalStack.findIndex(m => m.id === modalId);
        if (index > -1) {
          window.__modalStack.splice(index, 1);
          
          if (window.history.state?.__modalId === modalId || window.location.hash === '#' + modalId) {
            programmaticBackCount++;
            window.history.back();
          }
        }
      }, 50);
    };
  }, [isOpen]);
};

