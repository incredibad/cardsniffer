import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { computePopoverPosition } from "../popoverPosition";

const MAX_WIDTH = 448; // px, matches the w-[min(85vw,28rem)] cap below

// Thumbnail that reveals a much larger preview of the same image on
// tap/hover, rendered into a portal (positioned via the trigger's own
// bounding rect) so it isn't clipped by an ancestor's overflow-hidden and can
// be sized well past the thumbnail itself. Flips above/below depending on
// available space so it never renders off-screen. Tapping outside closes it.
export default function ImageHoverPreview({ src, alt, className = "" }) {
  const rootRef = useRef(null);
  const popupRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);

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
    setPos(computePopoverPosition(rootRef.current.getBoundingClientRect(), { maxWidth: MAX_WIDTH }));
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
        pos &&
        createPortal(
          <div
            ref={popupRef}
            style={{
              position: "fixed",
              left: pos.left,
              top: pos.top,
              transform: pos.transform,
              maxHeight: pos.maxHeight,
            }}
            className="z-50 p-1.5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xl overflow-hidden"
          >
            <img
              src={src}
              alt={alt}
              style={{ maxHeight: pos.maxHeight - 12 }}
              className="w-[min(85vw,28rem)] max-w-full rounded-xl object-contain"
            />
          </div>,
          document.body
        )}
    </span>
  );
}
