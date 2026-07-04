import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search as SearchIcon,
  Loader2,
  X,
  LayoutGrid,
  Table as TableIcon,
  ChevronDown,
} from "lucide-react";
import { api } from "../api";
import ResultCard from "../components/ResultCard";
import ResultTable from "../components/ResultTable";
import InfoTooltip from "../components/InfoTooltip";
import FilterDropdown, { FilterDropdownOption } from "../components/FilterDropdown";
import SelectDropdown from "../components/SelectDropdown";
import { STORE_META } from "../storeMeta";

// Static rather than derived from the current results, so the filter bar's
// option list doesn't shrink/grow between searches — same set of checkboxes
// every time, matching how filter state itself now persists across searches.
const STORE_OPTIONS = Object.keys(STORE_META).sort();
// Best-to-worst condition order rather than alphabetical, since this is now
// a fixed list a human reads top to bottom. SP (Hareruya's "Slightly
// Played") sits alongside LP as a roughly-equivalent second tier — every
// other store uses one or the other, never both.
const CONDITION_OPTIONS = ["NM", "SP", "LP", "MP", "HP", "DMG"];

// Date sort only really applies to eBay (the only store with a per-listing
// "when posted" date) — everything else falls back to a price sort within
// its own group, but the eBay group always sits above it regardless.
const SORT_MODE_OPTIONS = [
  { value: "price_asc", label: "Price Asc" },
  { value: "price_desc", label: "Price Desc" },
  { value: "date_asc", label: "Date Asc" },
  { value: "date_desc", label: "Date Desc" },
];
const SORT_MODE_VALUES = SORT_MODE_OPTIONS.map((o) => o.value);

const SORT_MODE_KEY = "cardsniffer.sortMode";
const VIEW_MODE_KEY = "cardsniffer.viewMode";
const SHOW_ART_KEY = "cardsniffer.showArtCards";
const SHOW_FOREIGN_KEY = "cardsniffer.showForeignCards";
const EXACT_MATCH_KEY = "cardsniffer.exactMatchOnly";
const PRICING_MODE_KEY = "cardsniffer.pricingMode";
const HIDDEN_STORES_KEY = "cardsniffer.hiddenStores";
const HIDDEN_CONDITIONS_KEY = "cardsniffer.hiddenConditions";
const FOIL_FILTER_KEY = "cardsniffer.foilFilter";
const SUGGEST_DEBOUNCE_MS = 150;
const SUGGEST_MIN_LENGTH = 2;

function readStoredSet(key) {
  try {
    return new Set(JSON.parse(localStorage.getItem(key)) || []);
  } catch {
    return new Set();
  }
}

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
  const [sortMode, setSortMode] = useState(() => {
    const stored = localStorage.getItem(SORT_MODE_KEY);
    return SORT_MODE_VALUES.includes(stored) ? stored : "price_asc";
  });
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

  // Live filter bar (results row) — browser-persisted and carried over
  // between searches, same as the Show toggles below, rather than resetting
  // every time (a store/condition/foil preference is usually about the
  // person searching, not the specific query).
  const [barHiddenStores, setBarHiddenStores] = useState(() => readStoredSet(HIDDEN_STORES_KEY));
  const [barHiddenConditions, setBarHiddenConditions] = useState(() => readStoredSet(HIDDEN_CONDITIONS_KEY));
  const [foilFilter, setFoilFilter] = useState(
    () => localStorage.getItem(FOIL_FILTER_KEY) || "all"
  ); // all | foil | nonfoil

  useEffect(() => {
    localStorage.setItem(HIDDEN_STORES_KEY, JSON.stringify([...barHiddenStores]));
  }, [barHiddenStores]);

  useEffect(() => {
    localStorage.setItem(HIDDEN_CONDITIONS_KEY, JSON.stringify([...barHiddenConditions]));
  }, [barHiddenConditions]);

  useEffect(() => {
    localStorage.setItem(FOIL_FILTER_KEY, foilFilter);
  }, [foilFilter]);

  const [suggestions, setSuggestions] = useState([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const debounceRef = useRef(null);
  const suggestRequestId = useRef(0);
  const inputRef = useRef(null);

  // Sticky search-button mode: "search" (normal, all enabled stores) or
  // "ebay_snipe" (eBay only, exact query, force-sorted newest-first).
  // Deliberately not persisted to localStorage — resets to "search" on
  // page reload.
  const [searchMode, setSearchMode] = useState("search");
  const [searchMenuOpen, setSearchMenuOpen] = useState(false);
  const searchMenuRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!searchMenuOpen) return;
    function handleOutside(e) {
      if (searchMenuRef.current && !searchMenuRef.current.contains(e.target)) setSearchMenuOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [searchMenuOpen]);

  function updateSortMode(mode) {
    setSortMode(mode);
    localStorage.setItem(SORT_MODE_KEY, mode);
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
    if (sortMode === "price_asc" || sortMode === "price_desc") {
      const dir = sortMode === "price_asc" ? 1 : -1;
      return [...filteredResults].sort((a, b) => dir * (a.price - b.price));
    }

    // Date sort: only eBay results have a listed_at. That group sorts by
    // date and always sits above everything else, which falls back to a
    // price sort (in the same direction) since it has no date to sort by.
    const dir = sortMode === "date_asc" ? 1 : -1;
    const dated = filteredResults.filter((r) => r.listed_at);
    const undated = filteredResults.filter((r) => !r.listed_at);
    dated.sort((a, b) => dir * (new Date(a.listed_at) - new Date(b.listed_at)));
    undated.sort((a, b) => dir * (a.price - b.price));
    return [...dated, ...undated];
  }, [filteredResults, sortMode]);

  async function runSearchRequest(apiCall, q, { onSuccess } = {}) {
    setStatus("loading");
    setDismissedErrors(false);
    setSuggestOpen(false);
    setSuggestions([]);
    clearTimeout(debounceRef.current);
    suggestRequestId.current++; // invalidate any pending autocomplete fetch still in flight
    inputRef.current?.blur();
    try {
      const data = await apiCall(q);
      setResults(data.results);
      setErrors(data.errors || []);
      setLastQuery(q);
      setStatus("success");
      onSuccess?.();
    } catch (err) {
      setErrorMessage(err.message || "Search failed");
      setStatus("error");
    }
  }

  function performSearch(q) {
    return runSearchRequest(api.search, q);
  }

  // "eBay Snipe": exact query (no "MTG" appended), eBay only, force-sorted
  // newest-first so a fresh listing is never buried under price sort order.
  function performEbaySnipe(q) {
    return runSearchRequest(api.searchEbaySnipe, q, { onSuccess: () => updateSortMode("date_desc") });
  }

  function runCurrentMode(q) {
    if (searchMode === "ebay_snipe") performEbaySnipe(q);
    else performSearch(q);
  }

  function runSearch(e) {
    e?.preventDefault();
    const q = query.trim();
    if (!q) return;
    runCurrentMode(q);
  }

  // Selecting a mode from the dropdown both switches it (sticky until
  // changed again or the page reloads) and runs it immediately.
  function chooseSearchMode(mode) {
    setSearchMode(mode);
    setSearchMenuOpen(false);
    const q = query.trim();
    if (!q) return;
    if (mode === "ebay_snipe") performEbaySnipe(q);
    else performSearch(q);
  }

  function selectSuggestion(name) {
    setQuery(name);
    setSuggestions([]);
    setSuggestOpen(false);
    setActiveSuggestion(-1);
    runCurrentMode(name);
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
          <div ref={searchMenuRef} className="relative flex">
            <button
              type="submit"
              disabled={status === "loading" || !query.trim()}
              aria-label={searchMode === "ebay_snipe" ? "eBay Snipe" : "Search"}
              className={`inline-flex items-center justify-center gap-2 rounded-l-xl px-3 sm:px-5 py-2.5 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                searchMode === "ebay_snipe"
                  ? "bg-[#FFBD14] text-slate-900 hover:bg-[#e6a913]"
                  : "bg-indigo-600 text-white hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400"
              }`}
            >
              {status === "loading" ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <SearchIcon size={16} className="sm:hidden" />
              )}
              <span className="hidden sm:inline">{searchMode === "ebay_snipe" ? "eBay Snipe" : "Search"}</span>
            </button>
            <button
              type="button"
              onClick={() => setSearchMenuOpen((o) => !o)}
              aria-label="Search options"
              aria-expanded={searchMenuOpen}
              className={`inline-flex items-center justify-center rounded-r-xl border-l px-2 transition-colors ${
                searchMode === "ebay_snipe"
                  ? "bg-[#FFBD14] text-slate-900 hover:bg-[#e6a913] border-black/10"
                  : "bg-indigo-600 text-white hover:bg-indigo-500 border-white/20 dark:bg-indigo-500 dark:hover:bg-indigo-400"
              }`}
            >
              <ChevronDown size={14} className={`transition-transform ${searchMenuOpen ? "rotate-180" : ""}`} />
            </button>
            {searchMenuOpen && (
              <div className="card-frame absolute top-full right-0 mt-1 z-20 min-w-[9rem] py-1.5 px-1">
                <button
                  type="button"
                  onClick={() => chooseSearchMode("search")}
                  className={`flex w-full items-center gap-2 px-2 py-1.5 text-sm rounded-lg transition-colors ${
                    searchMode === "search"
                      ? "text-indigo-600 dark:text-indigo-400 font-medium"
                      : "text-slate-700 hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  }`}
                >
                  Search
                </button>
                <button
                  type="button"
                  onClick={() => chooseSearchMode("ebay_snipe")}
                  className={`flex w-full items-center gap-2 px-2 py-1.5 text-sm rounded-lg transition-colors ${
                    searchMode === "ebay_snipe"
                      ? "text-indigo-600 dark:text-indigo-400 font-medium"
                      : "text-slate-700 hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  }`}
                >
                  eBay Snipe
                </button>
              </div>
            )}
          </div>
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

      {(() => {
            // Filters/sort/view are always available — even before a search
            // is run or while one's in flight — so they can be set up ahead
            // of time rather than only appearing once results exist.
            const resultsCountEl = status === "success" && (
              <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-500 whitespace-nowrap">
                {filteredResults.length === results.length
                  ? `${results.length} result${results.length === 1 ? "" : "s"}`
                  : `${filteredResults.length}/${results.length} results`}
              </p>
            );

            const sortDropdownEl = (
              <SelectDropdown value={sortMode} options={SORT_MODE_OPTIONS} onChange={updateSortMode} />
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
                  STORE_OPTIONS.length - barHiddenStores.size < STORE_OPTIONS.length
                    ? STORE_OPTIONS.length - barHiddenStores.size
                    : null
                }
                onSelectAll={() => setBarHiddenStores(new Set())}
                onSelectNone={() => setBarHiddenStores(new Set(STORE_OPTIONS))}
              >
                {STORE_OPTIONS.map((option) => (
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
                  CONDITION_OPTIONS.length - barHiddenConditions.size < CONDITION_OPTIONS.length
                    ? CONDITION_OPTIONS.length - barHiddenConditions.size
                    : null
                }
                onSelectAll={() => setBarHiddenConditions(new Set())}
                onSelectNone={() => setBarHiddenConditions(new Set(CONDITION_OPTIONS))}
              >
                {CONDITION_OPTIONS.map((option) => (
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
                      {sortDropdownEl}
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
                    {sortDropdownEl}
                    {viewButtonsEl}
                  </div>
                </div>
              </>
            );
          })()}

      {status === "success" && results.length === 0 && (
        <div className="text-center text-slate-500 dark:text-zinc-500 py-12">
          No listings found for &ldquo;{lastQuery}&rdquo;.
        </div>
      )}

      {results.length > 0 && (
        filteredResults.length === 0 ? (
          <div className="text-center text-slate-500 dark:text-zinc-500 py-12">
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
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-5">
            {sortedResults.map((r, i) => (
              <ResultCard key={`${r.product_url}-${r.condition}-${i}`} result={r} pricingMode={pricingMode} />
            ))}
          </div>
        ) : (
          <ResultTable results={sortedResults} pricingMode={pricingMode} />
        )
      )}
    </div>
  );
}
