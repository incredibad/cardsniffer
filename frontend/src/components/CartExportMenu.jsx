import { useEffect, useMemo, useRef, useState } from "react";
import { Download, ClipboardCopy, FileDown } from "lucide-react";
import { useToast } from "./Toast";
import SelectDropdown from "./SelectDropdown";

// Plain-text line formats for the clipboard export — the CSV export always
// carries full structured detail regardless of which of these is selected,
// since a spreadsheet has no reason to throw that away.
const FORMATS = [
  { value: "qtyx", label: "1x Grim Hireling", line: (item) => `${item.quantity}x ${item.card_name}` },
  { value: "qty", label: "1 Grim Hireling", line: (item) => `${item.quantity} ${item.card_name}` },
  { value: "name", label: "Grim Hireling", line: (item) => item.card_name },
];

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function csvField(value) {
  const s = value == null ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const CSV_COLUMNS = [
  ["Quantity", (i) => i.quantity],
  ["Card Name", (i) => i.card_name],
  ["Set", (i) => i.set_name ?? ""],
  ["Collector Number", (i) => i.collector_number ?? ""],
  ["Foil", (i) => (i.foil ? i.foil_treatment || "Foil" : "")],
  ["Condition", (i) => i.condition],
  ["Price", (i) => i.price],
  ["Currency", (i) => i.currency],
  ["Store", (i) => i.store_name],
  ["Product URL", (i) => i.product_url],
];

// Icon-only button + popover, reused by both the CartDrawer popout and the
// full Cart page — pick a store (or All Stores), pick a plain-text line
// format for Copy to Clipboard, or grab the fuller CSV regardless of that
// format choice. `items` is always the *full*, unfiltered cart list; the
// store choice here is independent of whatever tab/filter the surrounding
// page happens to be showing.
export default function CartExportMenu({ items, defaultStore = "all" }) {
  const [open, setOpen] = useState(false);
  const [storeChoice, setStoreChoice] = useState(defaultStore);
  const [format, setFormat] = useState("qtyx");
  const rootRef = useRef(null);
  const showToast = useToast();

  useEffect(() => {
    if (!open) return;
    function handleOutside(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  const storeNames = useMemo(() => [...new Set(items.map((i) => i.store_name))].sort(), [items]);

  const exportItems = useMemo(
    () => (storeChoice === "all" ? items : items.filter((i) => i.store_name === storeChoice)),
    [items, storeChoice]
  );

  if (items.length === 0) return null;

  const activeFormat = FORMATS.find((f) => f.value === format);

  async function copyToClipboard() {
    const text = exportItems.map(activeFormat.line).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      showToast(`Copied ${exportItems.length} card${exportItems.length === 1 ? "" : "s"} to clipboard`);
      setOpen(false);
    } catch {
      showToast("Couldn't copy to clipboard", "error");
    }
  }

  function downloadCsv() {
    const header = CSV_COLUMNS.map(([label]) => csvField(label)).join(",");
    const rows = exportItems.map((item) =>
      CSV_COLUMNS.map(([, get]) => csvField(get(item))).join(",")
    );
    const blob = new Blob([[header, ...rows].join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const storeSlug = storeChoice === "all" ? "all-stores" : slugify(storeChoice);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cardsniffer-cart-${storeSlug}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Export cart"
        title="Export cart"
        aria-expanded={open}
        className="text-slate-400 hover:text-indigo-600 dark:text-zinc-500 dark:hover:text-indigo-400 transition-colors"
      >
        <Download size={18} />
      </button>
      {open && (
        <div className="card-frame absolute right-0 top-full mt-2 z-50 w-64 p-3 flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-50">Export Cart</h3>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500 dark:text-zinc-500">Store</label>
            <SelectDropdown
              value={storeChoice}
              onChange={setStoreChoice}
              className="w-full"
              options={[
                { value: "all", label: "All Stores" },
                ...storeNames.map((name) => ({ value: name, label: name })),
              ]}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500 dark:text-zinc-500">Format (Copy)</label>
            <SelectDropdown value={format} onChange={setFormat} className="w-full" options={FORMATS} />
          </div>

          <p className="text-xs text-slate-400 dark:text-zinc-500">
            {exportItems.length} card{exportItems.length === 1 ? "" : "s"} selected
          </p>

          <div className="flex gap-2">
            <button
              onClick={copyToClipboard}
              disabled={exportItems.length === 0}
              className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-40 transition-colors dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-indigo-500/40 dark:hover:text-indigo-400"
            >
              <ClipboardCopy size={13} /> Copy
            </button>
            <button
              onClick={downloadCsv}
              disabled={exportItems.length === 0}
              className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-40 transition-colors dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-indigo-500/40 dark:hover:text-indigo-400"
            >
              <FileDown size={13} /> CSV
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
