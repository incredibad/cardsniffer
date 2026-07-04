import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

// Compact "Label (N)" button that opens a popover — used for the live
// results-row filter bar (store, condition, show). Not a portal: only used
// where its ancestor doesn't clip with overflow-hidden. Pass className="flex-1"
// to stretch it to fill a flex row (mobile); left as an ordinary content-sized
// flex item otherwise (desktop).
export default function FilterDropdown({ label, badgeCount, children, className = "" }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-1 rounded-full border border-slate-200 dark:border-zinc-800 px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
      >
        <span className="flex items-center gap-1">
          {label}
          {badgeCount != null && (
            <span className="text-indigo-600 dark:text-indigo-400 font-medium">({badgeCount})</span>
          )}
        </span>
        <ChevronDown size={14} className={`transition-transform shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="card-frame absolute top-full left-0 mt-1 z-20 min-w-[10rem] max-h-64 overflow-y-auto py-1.5 px-2">
          {children}
        </div>
      )}
    </div>
  );
}

export function FilterDropdownOption({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-1.5 py-1 text-sm text-slate-700 dark:text-zinc-300 cursor-pointer whitespace-nowrap">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="accent-indigo-600 w-4 h-4"
      />
      {label}
    </label>
  );
}
