import { useEffect, useRef, useState } from "react";

// Wraps a single line of (possibly truncated) text. If it's actually
// overflowing (scrollWidth > clientWidth), tapping/hovering it reveals a
// styled tooltip with the untruncated value. No-ops (plain text, no tooltip
// affordance) when the text already fits.
export default function TruncatedTooltip({ as: As = "div", text, className = "" }) {
  const ref = useRef(null);
  const [truncated, setTruncated] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => setTruncated(el.scrollWidth > el.clientWidth + 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text]);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  return (
    <span className="relative block min-w-0">
      <As
        ref={ref}
        className={`${className} truncate ${truncated ? "cursor-help" : ""}`}
        onClick={() => truncated && setOpen((o) => !o)}
        onMouseEnter={() => truncated && setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        {text}
      </As>
      {open && truncated && (
        <div
          role="tooltip"
          className="absolute z-30 bottom-full left-0 mb-1.5 max-w-[16rem] rounded-xl bg-slate-900 text-slate-100 dark:bg-zinc-800 dark:text-zinc-100 text-xs leading-snug px-3 py-2 shadow-lg whitespace-normal break-words"
        >
          {text}
        </div>
      )}
    </span>
  );
}
