import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { computePopoverPosition } from "../popoverPosition";

const MAX_WIDTH = 224; // px, matches max-w-[14rem] below

// Wraps arbitrary trigger content (e.g. the store badge) and reveals a
// styled tooltip with extra info on hover/tap — rendered into a portal so it
// isn't clipped by an ancestor's overflow-hidden, same pattern as
// TruncatedTooltip/ImageHoverPreview. Unlike TruncatedTooltip this always
// shows on interaction rather than only when the trigger's own text overflows.
export default function Tooltip({ content, children, className = "" }) {
  const ref = useRef(null);
  const popupRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e) {
      if (ref.current?.contains(e.target) || popupRef.current?.contains(e.target)) return;
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

  function show() {
    if (!ref.current) return;
    setPos(computePopoverPosition(ref.current.getBoundingClientRect(), { maxWidth: MAX_WIDTH }));
    setOpen(true);
  }

  return (
    <span
      ref={ref}
      className={`inline-flex ${className}`}
      onClick={() => (open ? setOpen(false) : show())}
      onMouseEnter={show}
      onMouseLeave={() => setOpen(false)}
    >
      {children}
      {open &&
        pos &&
        createPortal(
          <div
            ref={popupRef}
            role="tooltip"
            style={{
              position: "fixed",
              left: pos.left,
              top: pos.top,
              transform: pos.transform,
              maxHeight: pos.maxHeight,
            }}
            className="z-50 max-w-[14rem] rounded-xl bg-slate-900 text-slate-100 dark:bg-zinc-800 dark:text-zinc-100 text-xs leading-snug px-3 py-2 shadow-lg whitespace-normal break-words overflow-y-auto"
          >
            {content}
          </div>,
          document.body
        )}
    </span>
  );
}
