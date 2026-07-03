import { useMemo, useState } from "react";
import { Search as SearchIcon, Loader2, X, LayoutGrid, Table as TableIcon, ArrowUp, ArrowDown } from "lucide-react";
import { api } from "../api";
import ResultCard from "../components/ResultCard";
import ResultTable from "../components/ResultTable";

const SORT_ORDER_KEY = "cardsniffer.sortOrder";

export default function Search() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [results, setResults] = useState([]);
  const [errors, setErrors] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [dismissedErrors, setDismissedErrors] = useState(false);
  const [lastQuery, setLastQuery] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // grid | table
  const [sortOrder, setSortOrder] = useState(
    () => localStorage.getItem(SORT_ORDER_KEY) || "asc"
  ); // asc | desc

  function updateSortOrder(order) {
    setSortOrder(order);
    localStorage.setItem(SORT_ORDER_KEY, order);
  }

  const sortedResults = useMemo(() => {
    const sorted = [...results];
    sorted.sort((a, b) => (sortOrder === "asc" ? a.price - b.price : b.price - a.price));
    return sorted;
  }, [results, sortOrder]);

  async function runSearch(e) {
    e?.preventDefault();
    const q = query.trim();
    if (!q) return;

    setStatus("loading");
    setDismissedErrors(false);
    try {
      const data = await api.search(q);
      setResults(data.results);
      setErrors(data.errors || []);
      setLastQuery(q);
      setStatus("success");
    } catch (err) {
      setErrorMessage(err.message || "Search failed");
      setStatus("error");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="page-header text-3xl">Search for a card</h1>
        <p className="text-stone-400 text-sm mt-1">
          Find listings across the stores Cardsniffer tracks.
        </p>
      </div>

      <form onSubmit={runSearch} className="flex gap-2">
        <div className="relative flex-1">
          <SearchIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. Lightning Bolt"
            className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-ink-900 border border-gold-700/40 text-stone-100 placeholder:text-stone-500 focus:outline-none focus:border-gold-500"
          />
        </div>
        <button
          type="submit"
          disabled={status === "loading" || !query.trim()}
          className="px-5 py-2.5 rounded-lg bg-gold-600 hover:bg-gold-500 disabled:opacity-50 disabled:cursor-not-allowed text-ink-950 font-semibold transition-colors flex items-center gap-2"
        >
          {status === "loading" && <Loader2 size={16} className="animate-spin" />}
          Search
        </button>
      </form>

      {status === "error" && (
        <div className="card-frame border-red-500/50 px-4 py-3 text-red-300 text-sm">
          {errorMessage}
        </div>
      )}

      {errors.length > 0 && !dismissedErrors && (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          <div>
            {errors.map((e) => (
              <div key={e.store}>
                <strong>{e.store}</strong> failed: {e.error}
              </div>
            ))}
          </div>
          <button onClick={() => setDismissedErrors(true)} className="text-amber-300 hover:text-amber-100">
            <X size={16} />
          </button>
        </div>
      )}

      {status === "success" && results.length === 0 && (
        <div className="text-center text-stone-500 py-12">
          No listings found for &ldquo;{lastQuery}&rdquo;.
        </div>
      )}

      {results.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-stone-500">
              {results.length} result{results.length === 1 ? "" : "s"}
            </p>
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-lg border border-gold-700/40 overflow-hidden">
                <button
                  onClick={() => updateSortOrder("asc")}
                  aria-label="Sort by price, low to high"
                  aria-pressed={sortOrder === "asc"}
                  title="Price: low to high"
                  className={`p-1.5 flex items-center gap-1 transition-colors ${
                    sortOrder === "asc"
                      ? "bg-gold-600 text-ink-950"
                      : "text-stone-400 hover:text-gold-300"
                  }`}
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  onClick={() => updateSortOrder("desc")}
                  aria-label="Sort by price, high to low"
                  aria-pressed={sortOrder === "desc"}
                  title="Price: high to low"
                  className={`p-1.5 flex items-center gap-1 transition-colors border-l border-gold-700/40 ${
                    sortOrder === "desc"
                      ? "bg-gold-600 text-ink-950"
                      : "text-stone-400 hover:text-gold-300"
                  }`}
                >
                  <ArrowDown size={16} />
                </button>
              </div>
              <div className="inline-flex rounded-lg border border-gold-700/40 overflow-hidden">
                <button
                  onClick={() => setViewMode("grid")}
                  aria-label="Grid view"
                  aria-pressed={viewMode === "grid"}
                  className={`p-1.5 transition-colors ${
                    viewMode === "grid"
                      ? "bg-gold-600 text-ink-950"
                      : "text-stone-400 hover:text-gold-300"
                  }`}
                >
                  <LayoutGrid size={16} />
                </button>
                <button
                  onClick={() => setViewMode("table")}
                  aria-label="Table view"
                  aria-pressed={viewMode === "table"}
                  className={`p-1.5 transition-colors border-l border-gold-700/40 ${
                    viewMode === "table"
                      ? "bg-gold-600 text-ink-950"
                      : "text-stone-400 hover:text-gold-300"
                  }`}
                >
                  <TableIcon size={16} />
                </button>
              </div>
            </div>
          </div>

          {viewMode === "grid" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
              {sortedResults.map((r, i) => (
                <ResultCard key={`${r.product_url}-${r.condition}-${i}`} result={r} />
              ))}
            </div>
          ) : (
            <ResultTable results={sortedResults} />
          )}
        </>
      )}
    </div>
  );
}
