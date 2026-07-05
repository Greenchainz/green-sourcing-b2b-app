const BUY_SIGNALS = [
  "add to cart",
  "add to basket",
  "buy now",
  "checkout",
  "place order",
  "purchase",
  "request quote",
  "get it now",
  "start order",
];

const NEGATIVE_SIGNALS = [
  "blog",
  "article",
  "docs",
  "documentation",
  "privacy",
  "terms",
  "support",
  "about",
  "careers",
];

const DOMAIN_ADAPTERS = {
  "amazon.com": {
    productSelectors: ["#productTitle", "h1.a-size-large"],
    strongSignals: ["add to cart", "buy now"],
  },
  "homedepot.com": {
    productSelectors: ["h1.product-title__title", "h1[data-testid='product-title']"],
    strongSignals: ["add to cart", "bulk pricing"],
  },
  "lowes.com": {
    productSelectors: ["h1[data-testid='product-title']", "h1"],
    strongSignals: ["add to cart", "buy now"],
  },
  "grainger.com": {
    productSelectors: ["h1[data-testid='product-title']", "h1"],
    strongSignals: ["add to cart", "add to cart now"],
  },
  "walmart.com": {
    productSelectors: ["h1[data-automation-id='product-title']", "h1"],
    strongSignals: ["add to cart", "buy now"],
  },
};

const MIN_INTENT_SCORE = 5;
const WIDGET_ID = "gc-interceptor-widget";
let isOpen = false;

function findDomainAdapter() {
  const host = window.location.hostname.toLowerCase();
  const keys = Object.keys(DOMAIN_ADAPTERS);
  for (const key of keys) {
    if (host === key || host.endsWith(`.${key}`)) {
      return DOMAIN_ADAPTERS[key];
    }
  }
  return null;
}

function computeIntentScore() {
  let score = 0;
  const titleText = `${document.title} ${window.location.pathname}`.toLowerCase();
  const bodyText = (document.body?.innerText || "").toLowerCase().slice(0, 5000);
  const adapter = findDomainAdapter();

  for (const signal of BUY_SIGNALS) {
    if (titleText.includes(signal)) score += 2;
    if (bodyText.includes(signal)) score += 1;
  }

  const interactive = document.querySelectorAll("button, a, input[type='submit']");
  let strongCtas = 0;
  for (const node of interactive) {
    const text = (node.textContent || node.getAttribute("value") || "").toLowerCase().trim();
    if (!text) continue;
    if (BUY_SIGNALS.some((signal) => text.includes(signal))) {
      strongCtas += 1;
      score += 2;
    }
    if (text.includes("cart") || text.includes("checkout")) {
      score += 1;
    }
  }

  if (strongCtas >= 2) score += 2;

  for (const signal of NEGATIVE_SIGNALS) {
    if (titleText.includes(signal) || window.location.pathname.toLowerCase().includes(signal)) {
      score -= 2;
    }
  }

  if (adapter) {
    score += 2;
    for (const signal of adapter.strongSignals) {
      if (bodyText.includes(signal)) score += 1;
    }
  }

  return score;
}

function hasPurchaseSignals() {
  return computeIntentScore() >= MIN_INTENT_SCORE;
}

function extractSchemaProductName() {
  const scripts = document.querySelectorAll("script[type='application/ld+json']");
  for (const script of scripts) {
    const raw = script.textContent;
    if (!raw) continue;
    try {
      const json = JSON.parse(raw);
      const asArray = Array.isArray(json) ? json : [json];
      for (const item of asArray) {
        if (!item || typeof item !== "object") continue;
        const type = String(item["@type"] || "").toLowerCase();
        const name = typeof item.name === "string" ? item.name.trim() : "";
        if (type.includes("product") && name) return name;
      }
    } catch {
      continue;
    }
  }
  return "";
}

function extractCandidateQuery() {
  const adapter = findDomainAdapter();
  if (adapter) {
    for (const selector of adapter.productSelectors) {
      const node = document.querySelector(selector);
      if (node?.textContent?.trim()) return node.textContent.trim();
    }
  }

  const schemaProduct = extractSchemaProductName();
  if (schemaProduct) return schemaProduct;

  const h1 = document.querySelector("h1");
  if (h1?.textContent?.trim()) return h1.textContent.trim().slice(0, 120);

  const ogTitle = document.querySelector("meta[property='og:title']");
  const ogValue = ogTitle?.getAttribute("content");
  if (ogValue?.trim()) return ogValue.trim().slice(0, 120);

  return document.title.trim().slice(0, 120);
}

function buildPageContext() {
  return {
    host: window.location.hostname,
    pageTitle: document.title.slice(0, 160),
    path: window.location.pathname.slice(0, 160),
  };
}

function createWidget() {
  if (document.getElementById(WIDGET_ID)) return;

  const root = document.createElement("div");
  root.id = WIDGET_ID;
  root.innerHTML = `
    <button id="gc-open" type="button" title="Open GreenChainz Interceptor">GC</button>
    <section id="gc-panel" aria-live="polite">
      <header>
        <h3>GreenChainz Interceptor</h3>
        <button id="gc-close" type="button" aria-label="Close interceptor panel">×</button>
      </header>
      <p id="gc-summary">Purchase intent detected on this page. Want greener alternatives before checkout?</p>
      <div class="gc-actions">
        <button id="gc-find" type="button">Find greener alternatives</button>
      </div>
      <div id="gc-status"></div>
      <ul id="gc-results"></ul>
      <a id="gc-open-app" href="https://app.greenchainz.com/revit-plugin" target="_blank" rel="noreferrer">Open GreenChainz</a>
    </section>
  `;
  document.body.appendChild(root);

  const panel = root.querySelector("#gc-panel");
  const openBtn = root.querySelector("#gc-open");
  const closeBtn = root.querySelector("#gc-close");
  const findBtn = root.querySelector("#gc-find");
  const status = root.querySelector("#gc-status");
  const results = root.querySelector("#gc-results");

  function toggle(open) {
    isOpen = open;
    panel.classList.toggle("open", open);
  }

  openBtn.addEventListener("click", () => toggle(!isOpen));
  closeBtn.addEventListener("click", () => toggle(false));

  findBtn.addEventListener("click", async () => {
    const query = extractCandidateQuery();
    status.textContent = `Searching greener options for: ${query}`;
    results.innerHTML = "";

    chrome.runtime.sendMessage({ type: "gc:search-materials", query, limit: 5, pageContext: buildPageContext() }, (response) => {
      if (!response?.ok) {
        status.textContent = response?.error || "Search failed. Try again.";
        return;
      }

      const materials = Array.isArray(response.materials) ? response.materials : [];
      if (materials.length === 0) {
        status.textContent = "No verified alternatives found for this page yet.";
        return;
      }

      const strategy =
        typeof response.matchStrategy === "string" && response.matchStrategy.startsWith("retail-map:")
          ? ` using ${response.matchStrategy.replace("retail-map:", "")} mapping`
          : "";
      status.textContent = `${materials.length} verified alternatives found${strategy}`;
      const fragment = document.createDocumentFragment();
      for (const material of materials) {
        const item = document.createElement("li");
        const name = material?.name || "Unnamed material";
        const category = material?.category || "Unknown category";
        const mcs =
          typeof material?.materialCreditScore === "number"
            ? `MCS ${Math.round(material.materialCreditScore)}`
            : "MCS N/A";
        const gwp =
          typeof material?.gwpPerUnit === "number"
            ? `GWP ${material.gwpPerUnit} ${material?.gwpUnit || "kg"}`
            : "GWP N/A";
        const epdUrl = typeof material?.epdUrl === "string" ? material.epdUrl : null;
        item.innerHTML = `
          <div class="gc-result-name">${name}</div>
          <div class="gc-result-meta">${category} · ${mcs} · ${gwp}</div>
          ${epdUrl ? `<a href="${epdUrl}" target="_blank" rel="noreferrer">View EPD</a>` : ""}
        `;
        fragment.appendChild(item);
      }
      results.appendChild(fragment);
      toggle(true);
    });
  });
}

function initialize() {
  chrome.runtime.sendMessage({ type: "gc:get-settings" }, (response) => {
    const enabled = Boolean(response?.settings?.enabled ?? true);
    if (!enabled) return;
    if (!hasPurchaseSignals()) return;
    createWidget();
  });
}

if (document.readyState === "complete" || document.readyState === "interactive") {
  initialize();
} else {
  window.addEventListener("DOMContentLoaded", initialize, { once: true });
}
