import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

// Compact "Label (N)" button that opens a checkbox-list popover — used for
// the live results-row filter bar (store, condition). Not a portal: only
// used where its ancestor doesn't clip with overflow-hidden.
export default function FilterDropdown({ label, options, hiddenSet, onToggle }) {
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

  const shownCount = options.length - options.filter((o) => hiddenSet.has(o)).length;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex items-center gap-1 rounded-full border border-slate-200 dark:border-zinc-800 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
      >
        {label}
        {shownCount < options.length && (
          <span className="text-indigo-600 dark:text-indigo-400 font-medium">({shownCount})</span>
        )}
        <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="card-frame absolute top-full left-0 mt-1 z-20 min-w-[10rem] max-h-64 overflow-y-auto py-1.5 px-2">
          {options.map((option) => (
            <label
              key={option}
              className="flex items-center gap-1.5 py-1 text-sm text-slate-700 dark:text-zinc-300 cursor-pointer whitespace-nowrap"
            >
              <input
                type="checkbox"
                checked={!hiddenSet.has(option)}
                onChange={() => onToggle(option)}
                className="accent-indigo-600 w-4 h-4"
              />
              {option}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
