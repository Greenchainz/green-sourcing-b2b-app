/**
 * GreenChainz Forma Extension — Left Panel
 *
 * Surfaces the GreenChainz material catalog inside Autodesk Forma's left panel.
 * Architects can search by keyword or category, view EPD / carbon data,
 * check Material Credit Scores, and fire an RFQ without leaving Forma.
 */

import { useState, useEffect, useCallback } from "preact/hooks";
import { Forma } from "forma-embedded-view-sdk/auto";
import {
  searchMaterials,
  getSwapSuggestions,
  mcsBadgeClass,
  mcsLabel,
  formatGwp,
} from "../../lib/greenchainz-api";
import type { GCMaterial } from "../../lib/types";

// Categories aligned with EC3 / CSI MasterFormat
const CATEGORIES = [
  "All",
  "Concrete",
  "Steel",
  "Timber",
  "Insulation",
  "Masonry",
  "Glass",
  "Roofing",
  "Aluminum",
  "Gypsum",
  "Flooring",
];

// Debounce hook — avoids API call on every keystroke
function useDebounce<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export function MaterialSearch() {
  const [query, setQuery]           = useState("");
  const [category, setCategory]     = useState("All");
  const [results, setResults]       = useState<GCMaterial[]>([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [toast, setToast]           = useState<string | null>(null);
  const [expanded, setExpanded]     = useState<string | null>(null);
  const [swaps, setSwaps]           = useState<Record<string, GCMaterial[]>>({});

  const debouncedQuery = useDebounce(query, 400);

  // ── Fetch materials whenever search params change ──────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function fetch() {
      setLoading(true);
      setError(null);
      try {
        const materials = await searchMaterials({
          query: debouncedQuery || undefined,
          category: category === "All" ? undefined : category,
          limit: 25,
        });
        if (!cancelled) setResults(materials);
      } catch (err) {
        if (!cancelled) setError("Could not load materials. Check your connection.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void fetch();
    return () => { cancelled = true; };
  }, [debouncedQuery, category]);

  // ── Show toast for 2.5s ───────────────────────────────────────────────────
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  // ── Expand a card and lazy-load swap suggestions ──────────────────────────
  async function toggleExpand(id: string) {
    if (expanded === id) {
      setExpanded(null);
      return;
    }
    setExpanded(id);
    if (!swaps[id]) {
      try {
        const suggestions = await getSwapSuggestions(id);
        setSwaps((prev) => ({ ...prev, [id]: suggestions }));
      } catch {
        // non-fatal — swaps panel just stays empty
      }
    }
  }

  // ── Add to RFQ and highlight element in Forma scene ──────────────────────
  async function handleAddToRfq(material: GCMaterial) {
    try {
      // Highlight the currently selected Forma element so the user can
      // associate the material with a specific building component
      const selection = await Forma.selection.getSelection();
      if (selection.length > 0) {
        await Forma.selection.clearSelection();
        await Forma.selection.setSelection({ paths: selection });
      }

      // Open GreenChainz RFQ flow in a floating panel
      await Forma.openFloatingPanel({
        embeddedViewId: "greenchainz-rfq",
        url: `https://greenchainz.com/rfq/new?materialId=${material.id}&source=forma`,
        title: `RFQ — ${material.name}`,
        preferredSize: { width: 480, height: 600 },
      });

      showToast(`Opening RFQ for ${material.name}…`);
    } catch {
      showToast("Couldn't open RFQ — try again");
    }
  }

  // ── View EPD document ──────────────────────────────────────────────────────
  function handleViewEpd(material: GCMaterial) {
    if (material.epdUrl) {
      window.open(material.epdUrl, "_blank", "noopener");
    } else if (material.ec3Id) {
      window.open(
        `https://buildingtransparency.org/ec3/epds/${material.ec3Id}`,
        "_blank",
        "noopener"
      );
    } else {
      showToast("No EPD document available for this material");
    }
  }

  return (
    <div id="app">
      {/* Header */}
      <div class="gc-header">
        <div class="gc-logo">G</div>
        <h1>GreenChainz</h1>
        <span>Verified Green Materials</span>
      </div>

      {/* Search input */}
      <div class="gc-search-row">
        <weave-input
          placeholder="Search materials…"
          value={query}
          onInput={(e: Event) => setQuery((e.target as HTMLInputElement).value)}
        />
      </div>

      {/* Category chips */}
      <div class="gc-filters">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            class={`gc-chip${category === cat ? " active" : ""}`}
            onClick={() => setCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Results */}
      {loading && <div class="gc-loading">Loading materials…</div>}
      {error   && <div class="gc-empty" style="color:#991b1b">{error}</div>}

      {!loading && !error && results.length === 0 && (
        <div class="gc-empty">
          No materials found.{" "}
          {query ? "Try a different search term." : "Select a category above."}
        </div>
      )}

      {!loading && !error && results.length > 0 && (
        <div class="gc-results">
          {results.map((m) => (
            <MaterialCard
              key={m.id}
              material={m}
              isExpanded={expanded === m.id}
              swapSuggestions={swaps[m.id] ?? null}
              onExpand={() => toggleExpand(m.id)}
              onAddToRfq={() => handleAddToRfq(m)}
              onViewEpd={() => handleViewEpd(m)}
            />
          ))}
        </div>
      )}

      {/* Toast */}
      {toast && <div class="gc-toast">{toast}</div>}
    </div>
  );
}

// ── Material card sub-component ───────────────────────────────────────────────

interface MaterialCardProps {
  material: GCMaterial;
  isExpanded: boolean;
  swapSuggestions: GCMaterial[] | null;
  onExpand: () => void;
  onAddToRfq: () => void;
  onViewEpd: () => void;
}

function MaterialCard({
  material,
  isExpanded,
  swapSuggestions,
  onExpand,
  onAddToRfq,
  onViewEpd,
}: MaterialCardProps) {
  const badgeClass = mcsBadgeClass(material.materialCreditScore);
  const badgeLabel = mcsLabel(material.materialCreditScore);

  return (
    <div class="gc-card" onClick={onExpand}>
      <div class="gc-card-header">
        <div class="gc-card-name">{material.name}</div>
        <span class={`gc-mcs-badge ${badgeClass}`}>{badgeLabel}</span>
      </div>

      <div class="gc-card-meta">
        {material.manufacturer && <span>{material.manufacturer}</span>}
        <span>{material.category}</span>
        {material.isVerified && (
          <span style="color:#16a34a;font-weight:600">✓ Verified</span>
        )}
      </div>

      <div class="gc-card-gwp">
        Carbon: <strong>{formatGwp(material.gwpPerUnit, material.gwpUnit)}</strong>
      </div>

      {/* Certifications */}
      {material.certifications && material.certifications.length > 0 && (
        <div style="margin-top:4px;display:flex;gap:4px;flex-wrap:wrap">
          {material.certifications.map((cert) => (
            <span
              key={cert}
              style="font-size:10px;background:#f0fdf4;color:#166534;border:1px solid #bbf7d0;border-radius:4px;padding:1px 6px"
            >
              {cert}
            </span>
          ))}
        </div>
      )}

      {/* Expanded: actions + swap suggestions */}
      {isExpanded && (
        <div onClick={(e) => e.stopPropagation()}>
          <div class="gc-card-actions">
            <weave-button variant="solid" onClick={onAddToRfq}>
              Add to RFQ
            </weave-button>
            <weave-button variant="outlined" onClick={onViewEpd}>
              View EPD
            </weave-button>
          </div>

          {/* Greener swap suggestions */}
          {swapSuggestions && swapSuggestions.length > 0 && (
            <div class="gc-swap-section">
              <h3>Greener Alternatives</h3>
              {swapSuggestions.slice(0, 3).map((swap) => {
                const saving =
                  material.gwpPerUnit && swap.gwpPerUnit
                    ? (
                        ((material.gwpPerUnit - swap.gwpPerUnit) /
                          material.gwpPerUnit) *
                        100
                      ).toFixed(0)
                    : null;

                return (
                  <div key={swap.id} class="gc-swap-card">
                    <div style="font-size:12px;font-weight:600">{swap.name}</div>
                    <div style="font-size:11px;margin-top:2px">
                      {formatGwp(swap.gwpPerUnit, swap.gwpUnit)}
                      {saving && (
                        <span class="gc-swap-saving"> — {saving}% less carbon</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {swapSuggestions && swapSuggestions.length === 0 && (
            <p style="font-size:11px;color:var(--text-dim);margin-top:8px">
              No greener alternatives on record for this material.
            </p>
          )}

          {swapSuggestions === null && (
            <p style="font-size:11px;color:var(--text-dim);margin-top:8px">
              Loading alternatives…
            </p>
          )}
        </div>
      )}
    </div>
  );
}
