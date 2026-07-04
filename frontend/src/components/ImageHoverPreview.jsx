import { useEffect, useRef, useState } from "react";

// Thumbnail that reveals a much larger preview of the same image on
// tap/hover, positioned above it. Tapping outside closes it.
export default function ImageHoverPreview({ src, alt, className = "" }) {
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

  if (!src) {
    return <div className={className} />;
  }

  return (
    <span ref={rootRef} className="relative inline-block">
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className={`${className} cursor-zoom-in`}
      />
      {open && (
        <div className="absolute z-30 left-0 bottom-full mb-2 p-1.5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xl">
          <img src={src} alt={alt} className="w-48 sm:w-60 rounded-xl object-contain" />
        </div>
      )}
    </span>
  );
}
