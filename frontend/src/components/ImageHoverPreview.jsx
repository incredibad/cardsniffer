import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const MAX_WIDTH = 448; // px, matches the w-[min(85vw,28rem)] cap below

// Thumbnail that reveals a much larger preview of the same image on
// tap/hover, rendered into a portal (positioned via the trigger's own
// bounding rect) so it isn't clipped by an ancestor's overflow-hidden and can
// be sized well past the thumbnail itself. Tapping outside closes it.
export default function ImageHoverPreview({ src, alt, className = "" }) {
  const rootRef = useRef(null);
  const popupRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState(null);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e) {
      if (rootRef.current?.contains(e.target) || popupRef.current?.contains(e.target)) return;
      setOpen(false);
    }
    function handleDismiss() {
      setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    window.addEventListener("scroll", handleDismiss, true);
    window.addEventListener("resize", handleDismiss);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      window.removeEventListener("scroll", handleDismiss, true);
      window.removeEventListener("resize", handleDismiss);
    };
  }, [open]);

  if (!src) {
    return <div className={className} />;
  }

  function show() {
    if (!rootRef.current) return;
    setRect(rootRef.current.getBoundingClientRect());
    setOpen(true);
  }

  return (
    <span ref={rootRef} className="relative inline-block">
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onClick={() => (open ? setOpen(false) : show())}
        onMouseEnter={show}
        onMouseLeave={() => setOpen(false)}
        className={`${className} cursor-zoom-in`}
      />
      {open &&
        rect &&
        createPortal(
          <div
            ref={popupRef}
            style={{
              position: "fixed",
              left: Math.max(8, Math.min(rect.left, window.innerWidth - MAX_WIDTH - 8)),
              top: rect.top - 8,
              transform: "translateY(-100%)",
            }}
            className="z-50 p-1.5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xl"
          >
            <img src={src} alt={alt} className="w-[min(85vw,28rem)] rounded-xl object-contain" />
          </div>,
          document.body
        )}
    </span>
  );
}
