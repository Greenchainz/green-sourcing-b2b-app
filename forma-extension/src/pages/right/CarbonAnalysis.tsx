/**
 * GreenChainz Forma Extension — Right Analysis Panel
 *
 * When an architect selects a building element in Forma, this panel:
 *  1. Reads the element's material properties via the Forma SDK
 *  2. Looks up matching GreenChainz materials to pull verified EPD / GWP data
 *  3. Shows embodied carbon impact and surfaces greener swap suggestions
 *  4. Fires the "Interceptor" callout when a high-carbon material is detected
 *     — this is GreenChainz's killer feature per docs/research/SALES_PSYCHOLOGY.md.
 *     The InterceptorSuggestion shape here mirrors the canonical type in
 *     lib/research/salesPsychology.ts — keep them aligned when the real
 *     tRPC interceptor API ships.
 *
 * This is the "SWAP Engine inside Forma" story.
 */

import { useState, useEffect } from "preact/hooks";
import { Forma } from "forma-embedded-view-sdk/auto";
import { searchMaterials, getSwapSuggestions, formatGwp } from "../../lib/greenchainz-api";
import type { GCMaterial } from "../../lib/types";

// Carbon threshold (kgCO₂e / unit) above which we fire the Interceptor callout.
// Concrete baseline ~300 kgCO₂e/m³, structural steel ~1500 kgCO₂e/tonne.
// Any material above this that has a verified lower-carbon swap is fair game.
const INTERCEPTOR_GWP_THRESHOLD = 200;

/**
 * Local mirror of lib/research/salesPsychology.ts → InterceptorSuggestion.
 * Extension is a separate Vite deployable — does not import parent lib.
 * If you change this shape, update the canonical type in the main repo.
 */
interface InterceptorSuggestion {
  supplierId: string;
  supplierName: string;
  /** % carbon delta vs the current material — positive means swap is lower */
  carbonDeltaPercent: number;
  /** Human-readable reason (must cite code compliance when possible) */
  reason: string;
  /** Resolved swap material */
  swap: GCMaterial;
}

interface ElementAnalysis {
  elementPath: string;
  elementName: string;
  detectedMaterial?: GCMaterial;
  swaps: GCMaterial[];
}

export function CarbonAnalysis() {
  const [analysis, setAnalysis]   = useState<ElementAnalysis | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [hasSelection, setHasSelection] = useState(false);

  // ── Listen for selection changes in Forma ─────────────────────────────────
  useEffect(() => {
    const unsubscribe = Forma.selection.subscribe(async ({ paths }) => {
      if (!paths || paths.length === 0) {
        setHasSelection(false);
        setAnalysis(null);
        return;
      }

      setHasSelection(true);
      setLoading(true);
      setError(null);

      try {
        const path = paths[0];

        // Get element properties from Forma
        const properties = await Forma.proposal.getPropertiesAt({ path }).catch(() => null);
        const elementName = properties?.name ?? path.split("/").pop() ?? "Selected Element";

        // Infer material from element name / type (Forma doesn't always expose
        // material names directly — we do our best with the element type)
        const materialKeyword = inferMaterialKeyword(elementName, properties);

        let detectedMaterial: GCMaterial | undefined;
        let swaps: GCMaterial[] = [];

        if (materialKeyword) {
          const candidates = await searchMaterials({ query: materialKeyword, limit: 1 });
          if (candidates.length > 0) {
            detectedMaterial = candidates[0];
            swaps = await getSwapSuggestions(detectedMaterial.id);
          }
        }

        setAnalysis({
          elementPath: path,
          elementName,
          detectedMaterial,
          swaps: swaps.slice(0, 3),
        });
      } catch (err) {
        setError("Couldn't analyse this element. Try selecting a different one.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // ── Open full GreenChainz analysis in floating panel ─────────────────────
  async function openFullAnalysis() {
    await Forma.openFloatingPanel({
      embeddedViewId: "greenchainz-carbon-full",
      url: "https://greenchainz.com/carbon-compare?source=forma",
      title: "GreenChainz — Carbon Analysis",
      preferredSize: { width: 560, height: 700 },
    });
  }

  return (
    <div id="app">
      <div class="gc-header">
        <div class="gc-logo">G</div>
        <h1>Carbon Analysis</h1>
      </div>

      {!hasSelection && (
        <div class="gc-empty">
          <p>Select a building element in Forma to see its carbon impact and greener material options.</p>
        </div>
      )}

      {hasSelection && loading && (
        <div class="gc-loading">Analysing element…</div>
      )}

      {hasSelection && error && (
        <div class="gc-empty" style="color:#991b1b">{error}</div>
      )}

      {hasSelection && !loading && !error && analysis && (
        <>
          {/* Element summary */}
          <div style="font-size:12px;color:var(--text-dim);margin-bottom:8px">
            Element: <strong style="color:var(--text-default)">{analysis.elementName}</strong>
          </div>

          {/* Detected material + carbon data */}
          {analysis.detectedMaterial ? (
            <>
              <div class="gc-carbon-summary">
                <div class="gc-carbon-label">Matched Material</div>
                <div style="font-size:13px;font-weight:600;margin-bottom:8px">
                  {analysis.detectedMaterial.name}
                  {analysis.detectedMaterial.isVerified && (
                    <span style="color:#16a34a;margin-left:6px;font-size:11px">✓ Verified EPD</span>
                  )}
                </div>
                <div class="gc-carbon-label">Embodied Carbon</div>
                <div class="gc-carbon-value">
                  {analysis.detectedMaterial.gwpPerUnit?.toFixed(1) ?? "—"}
                </div>
                <div class="gc-carbon-unit">
                  kgCO₂e / {analysis.detectedMaterial.gwpUnit ?? "unit"}
                </div>
              </div>

              {/* Interceptor callout — the killer feature.
                  Fires when GWP is above threshold AND a verified swap exists. */}
              {(() => {
                const top = pickInterceptorSuggestion(
                  analysis.detectedMaterial,
                  analysis.swaps
                );
                if (!top) return null;
                return <InterceptorCallout suggestion={top} />;
              })()}

              {/* Swap suggestions */}
              {analysis.swaps.length > 0 && (
                <div class="gc-swap-section">
                  <h3>Greener Alternatives</h3>
                  {analysis.swaps.map((swap) => {
                    const current = analysis.detectedMaterial?.gwpPerUnit;
                    const saving =
                      current && swap.gwpPerUnit
                        ? (((current - swap.gwpPerUnit) / current) * 100).toFixed(0)
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
            </>
          ) : (
            <div class="gc-empty">
              No verified EPD found for <strong>{analysis.elementName}</strong>.
              <br />
              <a
                href={`https://greenchainz.com/materials?q=${encodeURIComponent(analysis.elementName)}&source=forma`}
                target="_blank"
                rel="noopener"
                style="color:#16a34a;text-decoration:underline;font-size:12px"
              >
                Search GreenChainz catalog →
              </a>
            </div>
          )}

          {/* Full analysis CTA */}
          <div style="margin-top:12px">
            <weave-button variant="outlined" style="width:100%" onClick={openFullAnalysis}>
              Open Full Carbon Report
            </weave-button>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Infer a material search keyword from the Forma element name and properties.
 * Forma's element model doesn't always expose explicit material names, so we
 * do a best-effort keyword extraction from the element display name.
 *
 * Examples:
 *   "Concrete Core Wall" → "concrete"
 *   "Structural Steel Column" → "structural steel"
 *   "CLT Floor Panel" → "CLT"
 */
function inferMaterialKeyword(
  elementName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _properties: any
): string | null {
  const name = elementName.toLowerCase();

  const KEYWORD_MAP: Array<[RegExp, string]> = [
    [/\bclt\b|cross.laminated|mass timber/i, "Cross-Laminated Timber"],
    [/\bglulam\b/i,                           "Glulam"],
    [/\blvl\b|laminated veneer/i,             "LVL"],
    [/structural steel|steel (column|beam|frame)/i, "Structural Steel"],
    [/rebar|reinforc/i,                       "Rebar"],
    [/concrete|rc wall|rc slab|rc column/i,   "Ready-Mix Concrete"],
    [/brick|masonry|cmu/i,                    "Masonry"],
    [/insul/i,                                "Insulation"],
    [/glass|glazing|curtain wall/i,           "Flat Glass"],
    [/timber|wood|lumber/i,                   "Dimensional Lumber"],
    [/aluminum|aluminium/i,                   "Aluminum"],
    [/gypsum|drywall|plasterboard/i,          "Gypsum Board"],
    [/roof/i,                                 "Roofing Membranes"],
  ];

  for (const [pattern, keyword] of KEYWORD_MAP) {
    if (pattern.test(name)) return keyword;
  }

  // Fall back to the raw element name — might still return a result
  return elementName.length > 3 ? elementName : null;
}

// ── Interceptor logic ────────────────────────────────────────────────────────
// Canonical strategy: docs/research/SALES_PSYCHOLOGY.md (Framework 2 — Interceptor)
// "Interceptor must always cite ASTM / code compliance data when suggesting an
//  alternate — never pitch on carbon alone."

function pickInterceptorSuggestion(
  current: GCMaterial,
  swaps: GCMaterial[]
): InterceptorSuggestion | null {
  if (!current.gwpPerUnit || current.gwpPerUnit < INTERCEPTOR_GWP_THRESHOLD) {
    return null;
  }
  if (swaps.length === 0) return null;

  // Pick the swap with the biggest verified carbon delta
  const ranked = swaps
    .filter((s) => s.isVerified && s.gwpPerUnit && s.gwpPerUnit < current.gwpPerUnit!)
    .map((s) => ({
      swap: s,
      deltaPercent: ((current.gwpPerUnit! - s.gwpPerUnit!) / current.gwpPerUnit!) * 100,
    }))
    .sort((a, b) => b.deltaPercent - a.deltaPercent);

  if (ranked.length === 0) return null;

  const top = ranked[0];
  return {
    supplierId: top.swap.id,
    supplierName: top.swap.manufacturer ?? top.swap.name,
    carbonDeltaPercent: Math.round(top.deltaPercent),
    swap: top.swap,
    reason: buildInterceptorReason(current, top.swap, top.deltaPercent),
  };
}

function buildInterceptorReason(
  current: GCMaterial,
  swap: GCMaterial,
  deltaPercent: number
): string {
  const saving = Math.round(deltaPercent);
  // Must cite code compliance per canonical Interceptor grammar
  const complianceHint =
    swap.certifications && swap.certifications.length > 0
      ? ` (${swap.certifications.slice(0, 2).join(", ")})`
      : swap.isVerified
      ? " (verified EPD)"
      : "";
  return `${saving}% less embodied carbon vs ${current.name}${complianceHint}. Code-compliant alternate available from GreenChainz-verified supplier.`;
}

interface InterceptorCalloutProps {
  suggestion: InterceptorSuggestion;
}

function InterceptorCallout({ suggestion }: InterceptorCalloutProps) {
  async function handleRequestRfq() {
    await Forma.openFloatingPanel({
      embeddedViewId: "greenchainz-interceptor-rfq",
      url: `https://greenchainz.com/rfq/new?materialId=${suggestion.swap.id}&source=forma-interceptor`,
      title: `RFQ — ${suggestion.swap.name}`,
      preferredSize: { width: 480, height: 600 },
    });
  }

  return (
    <div
      class="gc-interceptor"
      style="margin:12px 0;padding:12px;border-radius:8px;background:linear-gradient(135deg,#ecfdf5 0%,#d1fae5 100%);border:1px solid #10b981"
    >
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
        <span style="font-size:16px">⚡</span>
        <span style="font-size:11px;font-weight:700;color:#065f46;text-transform:uppercase;letter-spacing:0.5px">
          Interceptor
        </span>
      </div>
      <div style="font-size:14px;font-weight:700;color:#064e3b;margin-bottom:4px">
        Cut {suggestion.carbonDeltaPercent}% of this element's embodied carbon
      </div>
      <div style="font-size:12px;color:#065f46;margin-bottom:8px">
        Switch to <strong>{suggestion.swap.name}</strong>
        {suggestion.swap.manufacturer && (
          <span> from {suggestion.swap.manufacturer}</span>
        )}
      </div>
      <div style="font-size:11px;color:#047857;margin-bottom:10px;line-height:1.4">
        {suggestion.reason}
      </div>
      <weave-button variant="solid" style="width:100%" onClick={handleRequestRfq}>
        Request RFQ for {suggestion.swap.name}
      </weave-button>
    </div>
  );
}
