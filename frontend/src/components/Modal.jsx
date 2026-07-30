import { useEffect } from "react";
import { X } from "lucide-react";

// Centered dialog with a backdrop — click-outside or Escape both close it,
// matching the outside-click convention already used by FilterDropdown/
// HeaderMenu's popovers, just at full-screen scope instead of anchored.
export default function Modal({ title, onClose, children }) {
  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="card-frame w-full max-w-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="section-header">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-slate-400 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
