import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search as SearchIcon,
  Loader2,
  X,
  LayoutGrid,
  Table as TableIcon,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { api } from "../api";
import ResultCard from "../components/ResultCard";
import ResultTable from "../components/ResultTable";
import InfoTooltip from "../components/InfoTooltip";
import FilterDropdown, { FilterDropdownOption } from "../components/FilterDropdown";

const SORT_ORDER_KEY = "cardsniffer.sortOrder";
const VIEW_MODE_KEY = "cardsniffer.viewMode";
const SHOW_ART_KEY = "cardsniffer.showArtCards";
const SHOW_FOREIGN_KEY = "cardsniffer.showForeignCards";
const EXACT_MATCH_KEY = "cardsniffer.exactMatchOnly";
const PRICING_MODE_KEY = "cardsniffer.pricingMode";
const SUGGEST_DEBOUNCE_MS = 150;
const SUGGEST_MIN_LENGTH = 2;

export default function Search() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [results, setResults] = useState([]);
  const [errors, setErrors] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [dismissedErrors, setDismissedErrors] = useState(false);
  const [lastQuery, setLastQuery] = useState("");
  const [viewMode, setViewMode] = useState(
    () => localStorage.getItem(VIEW_MODE_KEY) || "grid"
  ); // grid | table
  const [sortOrder, setSortOrder] = useState(
    () => localStorage.getItem(SORT_ORDER_KEY) || "asc"
  ); // asc | desc
  const [showArtCards, setShowArtCards] = useState(
    () => localStorage.getItem(SHOW_ART_KEY) === "true"
  );
  const [showForeignCards, setShowForeignCards] = useState(
    () => localStorage.getItem(SHOW_FOREIGN_KEY) === "true"
  );
  const [exactMatchOnly, setExactMatchOnly] = useState(
    () => localStorage.getItem(EXACT_MATCH_KEY) === "true"
  );
  const [pricingMode, setPricingMode] = useState(
    () => localStorage.getItem(PRICING_MODE_KEY) || "aud"
  ); // aud | original

  // Live filter bar (results row) — ephemeral, not browser-persisted, reset
  // on every new search.
  const [barHiddenStores, setBarHiddenStores] = useState(() => new Set());
  const [barHiddenConditions, setBarHiddenConditions] = useState(() => new Set());
  const [foilFilter, setFoilFilter] = useState("all"); // all | foil | nonfoil

  const [suggestions, setSuggestions] = useState([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const debounceRef = useRef(null);
  const suggestRequestId = useRef(0);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function updateSortOrder(order) {
    setSortOrder(order);
    localStorage.setItem(SORT_ORDER_KEY, order);
  }

  function updateShowArtCards(value) {
    setShowArtCards(value);
    localStorage.setItem(SHOW_ART_KEY, String(value));
  }

  function updateShowForeignCards(value) {
    setShowForeignCards(value);
    localStorage.setItem(SHOW_FOREIGN_KEY, String(value));
  }

  function updateExactMatchOnly(value) {
    setExactMatchOnly(value);
    localStorage.setItem(EXACT_MATCH_KEY, String(value));
  }

  function updatePricingMode(mode) {
    setPricingMode(mode);
    localStorage.setItem(PRICING_MODE_KEY, mode);
  }

  function updateViewMode(mode) {
    setViewMode(mode);
    localStorage.setItem(VIEW_MODE_KEY, mode);
  }

  function toggleSetMember(setter, value) {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  const barStoreOptions = useMemo(
    () => [...new Set(results.map((r) => r.store_name))].sort(),
    [results]
  );
  const barConditionOptions = useMemo(
    () => [...new Set(results.map((r) => r.condition))].sort(),
    [results]
  );

  const filteredResults = useMemo(() => {
    const needle = lastQuery.trim().toLowerCase();
    return results.filter(
      (r) =>
        (showArtCards || !r.is_art) &&
        (showForeignCards || !r.foreign) &&
        (!exactMatchOnly || r.card_name.trim().toLowerCase() === needle) &&
        !barHiddenStores.has(r.store_name) &&
        !barHiddenConditions.has(r.condition) &&
        (foilFilter === "all" || (foilFilter === "foil" ? r.foil : !r.foil))
    );
  }, [
    results,
    lastQuery,
    showArtCards,
    showForeignCards,
    exactMatchOnly,
    barHiddenStores,
    barHiddenConditions,
    foilFilter,
  ]);

  const sortedResults = useMemo(() => {
    const sorted = [...filteredResults];
    sorted.sort((a, b) => (sortOrder === "asc" ? a.price - b.price : b.price - a.price));
    return sorted;
  }, [filteredResults, sortOrder]);

  async function performSearch(q) {
    setStatus("loading");
    setDismissedErrors(false);
    setSuggestOpen(false);
    setSuggestions([]);
    clearTimeout(debounceRef.current);
    suggestRequestId.current++; // invalidate any pending autocomplete fetch still in flight
    inputRef.current?.blur();
    setBarHiddenStores(new Set());
    setBarHiddenConditions(new Set());
    setFoilFilter("all");
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

  function runSearch(e) {
    e?.preventDefault();
    const q = query.trim();
    if (!q) return;
    performSearch(q);
  }

  function selectSuggestion(name) {
    setQuery(name);
    setSuggestions([]);
    setSuggestOpen(false);
    setActiveSuggestion(-1);
    performSearch(name);
  }

  function handleQueryChange(value) {
    setQuery(value);
    setActiveSuggestion(-1);
    clearTimeout(debounceRef.current);

    const q = value.trim();
    if (q.length < SUGGEST_MIN_LENGTH) {
      setSuggestions([]);
      setSuggestOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const requestId = ++suggestRequestId.current;
      try {
        const res = await fetch(
          `https://api.scryfall.com/cards/autocomplete?q=${encodeURIComponent(q)}`
        );
        const data = await res.json();
        if (requestId !== suggestRequestId.current) return; // a newer request already landed
        setSuggestions(data.data || []);
        setSuggestOpen((data.data || []).length > 0);
      } catch {
        // Autocomplete is a nicety — silently drop failures, the search box still works.
      }
    }, SUGGEST_DEBOUNCE_MS);
  }

  function handleQueryKeyDown(e) {
    if (!suggestOpen || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveSuggestion((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveSuggestion((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter" && activeSuggestion >= 0) {
      e.preventDefault();
      selectSuggestion(suggestions[activeSuggestion]);
    } else if (e.key === "Escape") {
      setSuggestOpen(false);
      setActiveSuggestion(-1);
    }
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <div className="card-frame">
        <form onSubmit={runSearch} className="flex gap-2 p-2">
          <div className="relative flex-1">
            <SearchIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              onKeyDown={handleQueryKeyDown}
              onFocus={() => suggestions.length > 0 && setSuggestOpen(true)}
              onBlur={() => setTimeout(() => setSuggestOpen(false), 100)}
              placeholder="e.g. Lightning Bolt"
              autoComplete="off"
              role="combobox"
              aria-expanded={suggestOpen}
              aria-autocomplete="list"
              className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-transparent text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
            {suggestOpen && suggestions.length > 0 && (
              <ul className="card-frame absolute top-full left-0 right-0 mt-1 z-10 max-h-72 overflow-y-auto py-1">
                {suggestions.map((name, i) => (
                  <li key={name}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectSuggestion(name)}
                      className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
                        i === activeSuggestion
                          ? "bg-indigo-600 text-white"
                          : "text-slate-700 hover:bg-slate-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                      }`}
                    >
                      {name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button
            type="submit"
            disabled={status === "loading" || !query.trim()}
            aria-label="Search"
            className="btn-primary px-3 sm:px-5"
          >
            {status === "loading" ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <SearchIcon size={16} className="sm:hidden" />
            )}
            <span className="hidden sm:inline">Search</span>
          </button>
        </form>
      </div>

      {status === "error" && (
        <div className="card-frame border-red-300 dark:border-red-500/40 px-4 py-3 text-red-600 dark:text-red-300 text-sm">
          {errorMessage}
        </div>
      )}

      {errors.length > 0 && !dismissedErrors && (
        <div className="flex items-start justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
          <div>
            {errors.map((e) => (
              <div key={e.store}>
                <strong>{e.store}</strong> failed: {e.error}
              </div>
            ))}
          </div>
          <button
            onClick={() => setDismissedErrors(true)}
            className="text-amber-600 hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-100"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {status === "success" && filteredResults.length === 0 && (
        <div className="text-center text-slate-500 dark:text-zinc-500 py-12">
          {results.length === 0 ? (
            <>No listings found for &ldquo;{lastQuery}&rdquo;.</>
          ) : (
            <>
              <p>
                All {results.length} result{results.length === 1 ? "" : "s"} for &ldquo;{lastQuery}&rdquo; are
                hidden by the filters above.
              </p>
              <button
                onClick={() => {
                  setBarHiddenStores(new Set());
                  setBarHiddenConditions(new Set());
                  setFoilFilter("all");
                  updateShowArtCards(true);
                  updateShowForeignCards(true);
                  updateExactMatchOnly(false);
                }}
                className="mt-2 text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm font-medium"
              >
                Reset filters
              </button>
            </>
          )}
        </div>
      )}

      {filteredResults.length > 0 && (
        <>
          {(() => {
            const resultsCountEl = (
              <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-500 whitespace-nowrap">
                {filteredResults.length === results.length
                  ? `${results.length} result${results.length === 1 ? "" : "s"}`
                  : `${filteredResults.length}/${results.length} results`}
              </p>
            );

            const sortButtonsEl = (
              <div className="inline-flex rounded-full border border-slate-200 dark:border-zinc-800 overflow-hidden">
                <button
                  onClick={() => updateSortOrder("asc")}
                  aria-label="Sort by price, low to high"
                  aria-pressed={sortOrder === "asc"}
                  title="Price: low to high"
                  className={`segmented-btn p-1.5 flex items-center gap-1 ${sortOrder === "asc" ? "is-active" : ""}`}
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  onClick={() => updateSortOrder("desc")}
                  aria-label="Sort by price, high to low"
                  aria-pressed={sortOrder === "desc"}
                  title="Price: high to low"
                  className={`segmented-btn p-1.5 flex items-center gap-1 border-l border-slate-200 dark:border-zinc-800 ${
                    sortOrder === "desc" ? "is-active" : ""
                  }`}
                >
                  <ArrowDown size={16} />
                </button>
              </div>
            );

            const viewButtonsEl = (
              <div className="inline-flex rounded-full border border-slate-200 dark:border-zinc-800 overflow-hidden">
                <button
                  onClick={() => updateViewMode("grid")}
                  aria-label="Grid view"
                  aria-pressed={viewMode === "grid"}
                  className={`segmented-btn p-1.5 ${viewMode === "grid" ? "is-active" : ""}`}
                >
                  <LayoutGrid size={16} />
                </button>
                <button
                  onClick={() => updateViewMode("table")}
                  aria-label="Table view"
                  aria-pressed={viewMode === "table"}
                  className={`segmented-btn p-1.5 border-l border-slate-200 dark:border-zinc-800 ${
                    viewMode === "table" ? "is-active" : ""
                  }`}
                >
                  <TableIcon size={16} />
                </button>
              </div>
            );

            const storeDropdown = (stretch) => (
              <FilterDropdown
                label="Store"
                className={stretch ? "flex-1" : ""}
                badgeCount={
                  barStoreOptions.length - barHiddenStores.size < barStoreOptions.length
                    ? barStoreOptions.length - barHiddenStores.size
                    : null
                }
                onSelectAll={() => setBarHiddenStores(new Set())}
                onSelectNone={() => setBarHiddenStores(new Set(barStoreOptions))}
              >
                {barStoreOptions.map((option) => (
                  <FilterDropdownOption
                    key={option}
                    label={option}
                    checked={!barHiddenStores.has(option)}
                    onChange={() => toggleSetMember(setBarHiddenStores, option)}
                  />
                ))}
              </FilterDropdown>
            );

            const conditionDropdown = (stretch) => (
              <FilterDropdown
                label="Condition"
                className={stretch ? "flex-1" : ""}
                badgeCount={
                  barConditionOptions.length - barHiddenConditions.size < barConditionOptions.length
                    ? barConditionOptions.length - barHiddenConditions.size
                    : null
                }
                onSelectAll={() => setBarHiddenConditions(new Set())}
                onSelectNone={() => setBarHiddenConditions(new Set(barConditionOptions))}
              >
                {barConditionOptions.map((option) => (
                  <FilterDropdownOption
                    key={option}
                    label={option}
                    checked={!barHiddenConditions.has(option)}
                    onChange={() => toggleSetMember(setBarHiddenConditions, option)}
                  />
                ))}
              </FilterDropdown>
            );

            // Data-driven so a future "show X" toggle only needs an entry
            // here — Select All/None then covers it automatically instead
            // of needing its own case added by hand.
            const showToggles = [
              { key: "art", label: "Art cards", checked: showArtCards, onChange: updateShowArtCards },
              { key: "foreign", label: "Foreign cards", checked: showForeignCards, onChange: updateShowForeignCards },
              { key: "exact", label: "Exact match only", checked: exactMatchOnly, onChange: updateExactMatchOnly },
            ];

            const showDropdown = (stretch) => (
              <FilterDropdown
                label="Show"
                className={stretch ? "flex-1" : ""}
                badgeCount={showToggles.filter((t) => t.checked).length || null}
                onSelectAll={() => showToggles.forEach((t) => t.onChange(true))}
                onSelectNone={() => showToggles.forEach((t) => t.onChange(false))}
              >
                {showToggles.map((t) => (
                  <FilterDropdownOption
                    key={t.key}
                    label={t.label}
                    checked={t.checked}
                    onChange={(e) => t.onChange(e.target.checked)}
                  />
                ))}
              </FilterDropdown>
            );

            return (
              <>
                {/* Mobile: 3 rows — results+view, then dropdowns, then foil+currency,
                    rows 2/3 stretched to fill the width. */}
                <div className="flex sm:hidden flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    {resultsCountEl}
                    <div className="flex items-center gap-2">
                      {sortButtonsEl}
                      {viewButtonsEl}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {storeDropdown(true)}
                    {conditionDropdown(true)}
                    {showDropdown(true)}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex rounded-full border border-slate-200 dark:border-zinc-800 overflow-hidden">
                      {[
                        ["all", "All"],
                        ["foil", "Foil"],
                        ["nonfoil", "Nonfoil"],
                      ].map(([value, text], i) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setFoilFilter(value)}
                          aria-pressed={foilFilter === value}
                          className={`segmented-btn flex-1 px-2 py-1 text-xs ${
                            i > 0 ? "border-l border-slate-200 dark:border-zinc-800" : ""
                          } ${foilFilter === value ? "is-active" : ""}`}
                        >
                          {text}
                        </button>
                      ))}
                    </div>
                    <div className="flex-1 flex items-center gap-1">
                      <div className="flex-1 flex rounded-full border border-slate-200 dark:border-zinc-800 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => updatePricingMode("aud")}
                          aria-pressed={pricingMode === "aud"}
                          className={`segmented-btn flex-1 px-2 py-1 text-xs ${pricingMode === "aud" ? "is-active" : ""}`}
                        >
                          AUD
                        </button>
                        <button
                          type="button"
                          onClick={() => updatePricingMode("original")}
                          aria-pressed={pricingMode === "original"}
                          className={`segmented-btn flex-1 px-2 py-1 text-xs border-l border-slate-200 dark:border-zinc-800 ${
                            pricingMode === "original" ? "is-active" : ""
                          }`}
                        >
                          Original
                        </button>
                      </div>
                      <InfoTooltip>
                        When shown in AUD, Australian GST is applied for stores where it isn't already
                        included in the listed price.
                      </InfoTooltip>
                    </div>
                  </div>
                </div>

                {/* Desktop: single row — filter bar left, results/sort/view right. */}
                <div className="hidden sm:flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {storeDropdown(false)}
                    {conditionDropdown(false)}
                    {showDropdown(false)}
                    <div className="inline-flex rounded-full border border-slate-200 dark:border-zinc-800 overflow-hidden">
                      {[
                        ["all", "All"],
                        ["foil", "Foil"],
                        ["nonfoil", "Nonfoil"],
                      ].map(([value, text], i) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setFoilFilter(value)}
                          aria-pressed={foilFilter === value}
                          className={`segmented-btn px-3 py-1.5 text-sm ${
                            i > 0 ? "border-l border-slate-200 dark:border-zinc-800" : ""
                          } ${foilFilter === value ? "is-active" : ""}`}
                        >
                          {text}
                        </button>
                      ))}
                    </div>
                    <div className="inline-flex items-center gap-1.5">
                      <div className="inline-flex rounded-full border border-slate-200 dark:border-zinc-800 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => updatePricingMode("aud")}
                          aria-pressed={pricingMode === "aud"}
                          className={`segmented-btn px-3 py-1.5 text-sm ${pricingMode === "aud" ? "is-active" : ""}`}
                        >
                          AUD
                        </button>
                        <button
                          type="button"
                          onClick={() => updatePricingMode("original")}
                          aria-pressed={pricingMode === "original"}
                          className={`segmented-btn px-3 py-1.5 text-sm border-l border-slate-200 dark:border-zinc-800 ${
                            pricingMode === "original" ? "is-active" : ""
                          }`}
                        >
                          Original
                        </button>
                      </div>
                      <InfoTooltip>
                        When shown in AUD, Australian GST is applied for stores where it isn't already
                        included in the listed price.
                      </InfoTooltip>
                    </div>
                  </div>

                  <div className="flex flex-nowrap shrink-0 items-center gap-2">
                    {resultsCountEl}
                    {sortButtonsEl}
                    {viewButtonsEl}
                  </div>
                </div>
              </>
            );
          })()}

          {viewMode === "grid" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-5">
              {sortedResults.map((r, i) => (
                <ResultCard key={`${r.product_url}-${r.condition}-${i}`} result={r} pricingMode={pricingMode} />
              ))}
            </div>
          ) : (
            <ResultTable results={sortedResults} pricingMode={pricingMode} />
          )}
        </>
      )}
    </div>
  );
}
