/**
 * GreenChainz Forma Extension — Right Analysis Panel
 *
 * When an architect selects a building element in Forma, this panel:
 *  1. Reads the element's material properties via the Forma SDK
 *  2. Looks up matching GreenChainz materials to pull verified EPD / GWP data
 *  3. Shows embodied carbon impact and surfaces greener swap suggestions
 *
 * This is the "SWAP Engine inside Forma" story.
 */

import { useState, useEffect } from "preact/hooks";
import { Forma } from "forma-embedded-view-sdk/auto";
import { searchMaterials, getSwapSuggestions, formatGwp } from "../../lib/greenchainz-api";
import type { GCMaterial } from "../../lib/types";

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
