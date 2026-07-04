// Shared positioning for portal-rendered popovers (TruncatedTooltip,
// ImageHoverPreview): given the trigger's getBoundingClientRect(), picks
// whichever side (above/below) has more room and reports how much space is
// available there, so content can be capped to fit instead of running off
// the top/bottom of the viewport.
export function computePopoverPosition(rect, { margin = 8, maxWidth = 0 } = {}) {
  const spaceAbove = rect.top - margin;
  const spaceBelow = window.innerHeight - rect.bottom - margin;
  const placement = spaceAbove >= spaceBelow ? "above" : "below";

  return {
    left: Math.max(margin, Math.min(rect.left, window.innerWidth - maxWidth - margin)),
    top: placement === "above" ? rect.top - margin : rect.bottom + margin,
    transform: placement === "above" ? "translateY(-100%)" : "none",
    maxHeight: Math.max(80, placement === "above" ? spaceAbove : spaceBelow),
  };
}
