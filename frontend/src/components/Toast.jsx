import { createContext, useCallback, useContext, useRef, useState } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";

// Lightweight app-wide toast notifications — stacked bottom-centre,
// auto-dismissed. First consumer is add-to-cart feedback, but showToast is
// generic: showToast("message") or showToast("message", "error").
const ToastContext = createContext(null);

export function useToast() {
  return useContext(ToastContext);
}

const TOAST_MS = 2500;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);

  const showToast = useCallback((message, variant = "success") => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, TOAST_MS);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex flex-col items-center gap-2 pointer-events-none px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="toast-pop flex items-center gap-2 max-w-sm rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-lg bg-slate-900/95 dark:bg-zinc-800/95"
          >
            {t.variant === "error" ? (
              <AlertCircle size={16} className="shrink-0 text-red-400" />
            ) : (
              <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
            )}
            <span className="min-w-0">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
