// Diagonal rainbow sheen blended over a card image to signal "foil" — the
// standard CSS holo-card trick (rainbow gradient + color-dodge blend), used
// since not every store's own photography actually shows foil shine.
// Layered on top regardless of whether the source photo already has one;
// harmless if it does, just a slightly stronger sheen.
export default function FoilOverlay() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{
        mixBlendMode: "color-dodge",
        background:
          "linear-gradient(115deg, transparent 0%, rgba(255,0,0,0.5) 10%, rgba(255,154,0,0.5) 20%, rgba(208,222,33,0.5) 30%, rgba(79,220,74,0.5) 40%, rgba(63,218,216,0.5) 50%, rgba(47,201,226,0.5) 60%, rgba(28,127,238,0.5) 70%, rgba(95,21,242,0.5) 80%, rgba(186,12,248,0.5) 90%, transparent 100%)",
      }}
    />
  );
}
