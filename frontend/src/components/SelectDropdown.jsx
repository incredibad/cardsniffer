import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";

// Single-select popover (radio-style, closes on pick) — distinct from
// FilterDropdown's checkbox multi-select, which deliberately stays open so
// several boxes can be toggled in one visit.
export default function SelectDropdown({ value, options, onChange, className = "" }) {
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

  const current = options.find((o) => o.value === value);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-1 rounded-full border border-slate-200 dark:border-zinc-800 px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
      >
        <span>{current?.label ?? "Sort"}</span>
        <ChevronDown size={14} className={`transition-transform shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="card-frame absolute top-full right-0 mt-1 z-20 min-w-[9rem] py-1.5 px-1">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between gap-2 px-2 py-1.5 text-sm rounded-lg transition-colors ${
                o.value === value
                  ? "text-indigo-600 dark:text-indigo-400 font-medium"
                  : "text-slate-700 hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              {o.label}
              {o.value === value && <Check size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
