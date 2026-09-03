// Content for the set-name subtitle's Tooltip — the raw, pre-resolution data
// behind setdb.py's canonical set_name_canonical/set_code, so a mismatch can
// be checked against the store's own listing (or eBay's title) during
// testing rather than just trusting the resolved result.
export default function SetDebugTooltipContent({ result }) {
  const { set_name, set_code_hint, set_code, set_name_canonical, collector_number } = result;

  return (
    <div className="flex flex-col gap-0.5">
      <div className="font-semibold">Set resolution</div>
      <div>Raw text: {set_name || "—"}</div>
      {set_code_hint && <div>Store's own code: {set_code_hint}</div>}
      {collector_number && <div>Collector #: {collector_number}</div>}
      <div>Resolved: {set_code ? `${set_name_canonical} (${set_code})` : "Undetected"}</div>
    </div>
  );
}
