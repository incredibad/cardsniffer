import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { computePopoverPosition } from "../popoverPosition";

const MAX_WIDTH = 256; // px, matches max-w-[16rem] below

// Wraps a single line of (possibly truncated) text. If it's actually
// overflowing (scrollWidth > clientWidth), tapping/hovering it reveals a
// styled tooltip with the untruncated value, rendered into a portal so it
// isn't clipped by an ancestor's overflow-hidden (used elsewhere for corner
// rounding on cards/rows this component lives inside). Flips above/below
// depending on available space so it never renders off-screen.
export default function TruncatedTooltip({ as: As = "div", text, className = "" }) {
  const ref = useRef(null);
  const popupRef = useRef(null);
  const [truncated, setTruncated] = useState(false);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);

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
    if (!truncated || !ref.current) return;
    setPos(computePopoverPosition(ref.current.getBoundingClientRect(), { maxWidth: MAX_WIDTH }));
    setOpen(true);
  }

  return (
    <span className="relative block min-w-0">
      <As
        ref={ref}
        className={`${className} truncate ${truncated ? "cursor-help" : ""}`}
        onClick={() => (open ? setOpen(false) : show())}
        onMouseEnter={show}
        onMouseLeave={() => setOpen(false)}
      >
        {text}
      </As>
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
            className="z-50 max-w-[16rem] rounded-xl bg-slate-900 text-slate-100 dark:bg-zinc-800 dark:text-zinc-100 text-xs leading-snug px-3 py-2 shadow-lg whitespace-normal break-words overflow-y-auto"
          >
            {text}
          </div>,
          document.body
        )}
    </span>
  );
}
