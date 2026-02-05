import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const ToastContext = createContext(null);

let toastId = 0;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef({});

  const dismiss = useCallback((id) => {
    // Mark as exiting first for animation
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
    // Remove after animation
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      if (timersRef.current[id]) {
        clearTimeout(timersRef.current[id]);
        delete timersRef.current[id];
      }
    }, 300);
  }, []);

  const toast = useCallback(
    ({ message, icon, duration = 4000, type = 'info' }) => {
      const id = ++toastId;
      setToasts((prev) => [...prev, { id, message, icon, type, exiting: false }]);

      if (duration > 0) {
        timersRef.current[id] = setTimeout(() => dismiss(id), duration);
      }

      return id;
    },
    [dismiss]
  );

  // Cleanup all timers on unmount
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      {createPortal(
        <div className="toast-container" aria-live="polite" aria-atomic="false">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`toast-item toast-${t.type} ${t.exiting ? 'toast-exit' : 'toast-enter'}`}
              onClick={() => dismiss(t.id)}
              role="status"
            >
              {t.icon && <span className="toast-icon">{t.icon}</span>}
              <span className="toast-message">{t.message}</span>
            </div>
          ))}

          <style>{`
            .toast-container {
              position: fixed;
              top: calc(env(safe-area-inset-top, 0px) + 1rem);
              left: 50%;
              transform: translateX(-50%);
              z-index: 10000;
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 0.5rem;
              pointer-events: none;
              width: max-content;
              max-width: 90vw;
            }

            .toast-item {
              pointer-events: auto;
              display: flex;
              align-items: center;
              gap: 0.6rem;
              padding: 0.75rem 1.25rem;
              background: rgba(20, 20, 20, 0.85);
              backdrop-filter: blur(20px);
              -webkit-backdrop-filter: blur(20px);
              border: 1px solid rgba(255, 255, 255, 0.15);
              border-radius: 14px;
              color: #fff;
              font-family: var(--font-family, 'Outfit', sans-serif);
              font-size: 0.9rem;
              font-weight: 400;
              cursor: pointer;
              box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
              will-change: transform, opacity;
              white-space: nowrap;
            }

            .toast-icon {
              font-size: 1.2rem;
              flex-shrink: 0;
            }

            .toast-message {
              line-height: 1.3;
            }

            .toast-achievement {
              border-color: rgba(255, 215, 0, 0.3);
              background: rgba(30, 25, 10, 0.9);
            }

            .toast-success {
              border-color: rgba(100, 220, 100, 0.3);
            }

            .toast-enter {
              animation: toastSlideIn 0.35s cubic-bezier(0.21, 1.02, 0.73, 1) forwards;
            }

            .toast-exit {
              animation: toastSlideOut 0.3s ease-in forwards;
            }

            @keyframes toastSlideIn {
              from {
                opacity: 0;
                transform: translateY(-20px) scale(0.95);
              }
              to {
                opacity: 1;
                transform: translateY(0) scale(1);
              }
            }

            @keyframes toastSlideOut {
              from {
                opacity: 1;
                transform: translateY(0) scale(1);
              }
              to {
                opacity: 0;
                transform: translateY(-20px) scale(0.95);
              }
            }

            @media (max-width: 480px) {
              .toast-item {
                font-size: 0.85rem;
                padding: 0.65rem 1rem;
              }
            }
          `}</style>
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};
