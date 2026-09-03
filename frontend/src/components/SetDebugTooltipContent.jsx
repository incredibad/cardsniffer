// Content for the set-name subtitle's Tooltip — the raw, pre-resolution data
// behind setdb.py's canonical set_name_canonical/set_code, so a mismatch can
// be checked against the store's own listing (or eBay's title) during
// testing rather than just trusting the resolved result.
export default function SetDebugTooltipContent({ result }) {
  const { store_name, card_name, set_name, set_code_hint, set_code, set_name_canonical, collector_number } = result;
  // eBay's own "set_name" is actually the seller username (see ResultCard's
  // comment on the same field) — what setdb.py actually resolves against for
  // eBay is the listing title itself (card_name), so that's the raw value
  // worth showing here instead.
  const isEbay = store_name === "eBay";
  const rawLabel = isEbay ? "Raw title" : "Raw text";
  const rawValue = isEbay ? card_name : set_name;

  return (
    <div className="flex flex-col gap-0.5">
      <div className="font-semibold">Set resolution</div>
      <div>
        {rawLabel}: {rawValue || "—"}
      </div>
      {set_code_hint && <div>Store's own code: {set_code_hint}</div>}
      {collector_number && <div>Collector #: {collector_number}</div>}
      <div>Resolved: {set_code ? `${set_name_canonical} (${set_code})` : "Undetected"}</div>
    </div>
  );
}
