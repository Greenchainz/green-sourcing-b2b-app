const DEFAULT_SETTINGS = {
  enabled: true,
  apiBaseUrl: "https://app.greenchainz.com/api/public",
};

const CATEGORY_HINTS = [
  "concrete",
  "cement",
  "drywall",
  "gypsum",
  "insulation",
  "lumber",
  "wood",
  "steel",
  "glass",
  "flooring",
  "paint",
  "tile",
  "roof",
  "roofing",
  "hvac",
  "door",
  "window",
];

const RETAIL_SWAP_MAP = [
  { patterns: ["office chair", "desk chair", "ergonomic chair"], terms: ["chair", "seating", "furniture"], category: "furniture" },
  { patterns: ["desk", "workstation"], terms: ["desk", "worksurface", "furniture"], category: "furniture" },
  { patterns: ["paint", "primer", "coating"], terms: ["paint", "low voc paint", "coating"], category: "paint" },
  { patterns: ["insulation", "foam board", "fiberglass batt"], terms: ["insulation", "mineral wool insulation"], category: "insulation" },
  { patterns: ["drywall", "sheetrock", "gypsum board"], terms: ["drywall", "gypsum"], category: "drywall" },
  { patterns: ["lumber", "plywood", "osb"], terms: ["lumber", "wood"], category: "lumber" },
  { patterns: ["concrete", "cement", "mortar", "ready mix"], terms: ["concrete", "cement"], category: "concrete" },
  { patterns: ["roof", "shingle", "membrane"], terms: ["roofing", "roof"], category: "roofing" },
  { patterns: ["floor", "flooring", "vinyl plank", "tile"], terms: ["flooring", "tile"], category: "flooring" },
  { patterns: ["window", "glazing"], terms: ["window", "glass"], category: "window" },
  { patterns: ["door"], terms: ["door"], category: "door" },
  { patterns: ["hvac", "air handler", "duct"], terms: ["hvac"], category: "hvac" },
];

function readSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(DEFAULT_SETTINGS, (settings) => resolve(settings));
  });
}

function normalizeApiBase(url) {
  if (typeof url !== "string") return DEFAULT_SETTINGS.apiBaseUrl;
  const trimmed = url.trim().replace(/\/+$/, "");
  return trimmed || DEFAULT_SETTINGS.apiBaseUrl;
}

function tokenize(value) {
  if (typeof value !== "string") return [];
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 3);
}

function pickCategoryHint(query) {
  const q = query.toLowerCase();
  for (const hint of CATEGORY_HINTS) {
    if (q.includes(hint)) return hint;
  }
  return "";
}

function detectRetailCategory(query, pageContext) {
  const q = `${query || ""} ${pageContext?.pageTitle || ""} ${pageContext?.host || ""}`.toLowerCase();
  for (const entry of RETAIL_SWAP_MAP) {
    if (entry.patterns.some((pattern) => q.includes(pattern))) {
      return entry;
    }
  }
  return null;
}

function normalizeSearchQuery(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 140);
}

function buildSearchCandidates(query, pageContext) {
  const normalizedQuery = normalizeSearchQuery(query);
  const candidates = [normalizedQuery];
  const mapped = detectRetailCategory(query, pageContext);

  if (mapped) {
    for (const term of mapped.terms) {
      candidates.push(normalizeSearchQuery(term));
      candidates.push(normalizeSearchQuery(`${term} sustainable`));
      candidates.push(normalizeSearchQuery(`${term} low carbon`));
    }
  }

  const pageTitle = normalizeSearchQuery(pageContext?.pageTitle);
  if (pageTitle && pageTitle !== normalizedQuery) {
    candidates.push(pageTitle);
  }

  const unique = [];
  const seen = new Set();
  for (const candidate of candidates) {
    if (!candidate || seen.has(candidate.toLowerCase())) continue;
    seen.add(candidate.toLowerCase());
    unique.push(candidate);
  }

  return { candidates: unique.slice(0, 7), mapped };
}

async function fetchSearch(apiBase, query, limit, categoryHint) {
  const searchParams = new URLSearchParams({
    q: query,
    limit: String(limit),
  });
  if (categoryHint) {
    searchParams.set("category", categoryHint);
  }
  const response = await fetch(`${apiBase}/materials/search?${searchParams.toString()}`);
  if (!response.ok) {
    throw new Error(`Search failed with status ${response.status}`);
  }
  return response.json();
}

function relevanceScore(query, material) {
  const queryTokens = new Set(tokenize(query));
  if (queryTokens.size === 0) return 0;

  const sourceText = `${material?.name || ""} ${material?.category || ""} ${material?.manufacturer || ""}`;
  const materialTokens = tokenize(sourceText);
  let score = 0;
  for (const token of materialTokens) {
    if (queryTokens.has(token)) score += 1;
  }

  if (typeof material?.materialCreditScore === "number") {
    score += Math.round(material.materialCreditScore / 20);
  }
  if (material?.isVerified) score += 2;
  return score;
}

function rankAndFilterMaterials(query, materials, limit) {
  if (!Array.isArray(materials)) return [];
  const ranked = materials
    .map((material) => ({ material, score: relevanceScore(query, material) }))
    .sort((a, b) => b.score - a.score)
    .filter((item) => item.score > 0)
    .slice(0, limit)
    .map((item) => item.material);

  return ranked.length > 0 ? ranked : materials.slice(0, limit);
}

async function searchMaterials(query, limit = 5, pageContext = null) {
  const settings = await readSettings();
  const apiBase = normalizeApiBase(settings.apiBaseUrl);
  const { candidates, mapped } = buildSearchCandidates(query, pageContext);
  const categoryHint = pickCategoryHint(query) || mapped?.category || "";

  const aggregated = [];
  const dedupe = new Set();

  for (const candidate of candidates) {
    const payload = await fetchSearch(apiBase, candidate, Math.max(limit, 8), categoryHint);
    const materials = Array.isArray(payload?.materials) ? payload.materials : [];
    for (const material of materials) {
      const key = String(material?.id || `${material?.name || ""}:${material?.category || ""}`);
      if (dedupe.has(key)) continue;
      dedupe.add(key);
      aggregated.push(material);
    }
    if (aggregated.length >= limit * 2) break;
  }

  const ranked = rankAndFilterMaterials(query, aggregated, limit);
  return {
    materials: ranked,
    apiBase,
    matchStrategy: mapped ? `retail-map:${mapped.category}` : "direct-query",
    queryCandidates: candidates,
  };
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(DEFAULT_SETTINGS, (settings) => {
    const nextSettings = {
      enabled: typeof settings.enabled === "boolean" ? settings.enabled : DEFAULT_SETTINGS.enabled,
      apiBaseUrl: normalizeApiBase(settings.apiBaseUrl),
    };
    chrome.storage.sync.set(nextSettings);
  });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message !== "object") {
    sendResponse({ ok: false, error: "Invalid request" });
    return false;
  }

  if (message.type === "gc:search-materials") {
    const query = typeof message.query === "string" ? message.query.trim() : "";
    const limit = Number.isFinite(Number(message.limit)) ? Number(message.limit) : 5;
    const pageContext = message.pageContext && typeof message.pageContext === "object" ? message.pageContext : null;
    if (!query) {
      sendResponse({ ok: false, error: "Query is required" });
      return false;
    }

    searchMaterials(query, Math.min(Math.max(limit, 1), 10), pageContext)
      .then(({ materials, apiBase, matchStrategy, queryCandidates }) =>
        sendResponse({ ok: true, materials, apiBase, matchStrategy, queryCandidates })
      )
      .catch((error) => sendResponse({ ok: false, error: error instanceof Error ? error.message : "Search failed" }));
    return true;
  }

  if (message.type === "gc:get-settings") {
    readSettings().then((settings) => sendResponse({ ok: true, settings }));
    return true;
  }

  if (message.type === "gc:set-settings") {
    const nextSettings = {
      enabled: typeof message.enabled === "boolean" ? message.enabled : DEFAULT_SETTINGS.enabled,
      apiBaseUrl: normalizeApiBase(message.apiBaseUrl),
    };
    chrome.storage.sync.set(nextSettings, () => sendResponse({ ok: true, settings: nextSettings }));
    return true;
  }

  sendResponse({ ok: false, error: "Unsupported message type" });
  return false;
});
