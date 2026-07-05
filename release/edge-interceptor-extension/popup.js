const DEFAULT_SETTINGS = {
  enabled: true,
  apiBaseUrl: "https://app.greenchainz.com/api/public",
};

const enabledEl = document.getElementById("enabled");
const apiBaseUrlEl = document.getElementById("apiBaseUrl");
const saveSettingsEl = document.getElementById("saveSettings");
const settingsStatusEl = document.getElementById("settingsStatus");
const searchInputEl = document.getElementById("searchInput");
const runSearchEl = document.getElementById("runSearch");
const searchStatusEl = document.getElementById("searchStatus");
const searchResultsEl = document.getElementById("searchResults");

function sendMessage(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => resolve(response));
  });
}

function renderResults(materials) {
  searchResultsEl.innerHTML = "";
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

    item.innerHTML = `
      <div class="name">${name}</div>
      <div class="meta">${category} · ${mcs} · ${gwp}</div>
      ${material?.epdUrl ? `<a href="${material.epdUrl}" target="_blank" rel="noreferrer">View EPD</a>` : ""}
    `;
    fragment.appendChild(item);
  }
  searchResultsEl.appendChild(fragment);
}

async function loadSettings() {
  const response = await sendMessage({ type: "gc:get-settings" });
  if (!response?.ok) {
    settingsStatusEl.textContent = "Failed to load settings.";
    return;
  }
  const settings = response.settings || DEFAULT_SETTINGS;
  enabledEl.checked = Boolean(settings.enabled);
  apiBaseUrlEl.value = settings.apiBaseUrl || DEFAULT_SETTINGS.apiBaseUrl;
}

saveSettingsEl.addEventListener("click", async () => {
  settingsStatusEl.textContent = "Saving...";
  const response = await sendMessage({
    type: "gc:set-settings",
    enabled: enabledEl.checked,
    apiBaseUrl: apiBaseUrlEl.value.trim(),
  });
  settingsStatusEl.textContent = response?.ok ? "Saved." : response?.error || "Save failed.";
});

runSearchEl.addEventListener("click", async () => {
  const query = searchInputEl.value.trim();
  if (!query) {
    searchStatusEl.textContent = "Enter a search query.";
    return;
  }

  searchStatusEl.textContent = "Searching...";
  searchResultsEl.innerHTML = "";
  const response = await sendMessage({
    type: "gc:search-materials",
    query,
    limit: 5,
    pageContext: {
      host: "popup-search",
      pageTitle: "",
      path: "",
    },
  });
  if (!response?.ok) {
    searchStatusEl.textContent = response?.error || "Search failed.";
    return;
  }

  const materials = Array.isArray(response.materials) ? response.materials : [];
  if (materials.length === 0) {
    searchStatusEl.textContent = "No verified alternatives found.";
    return;
  }
  const strategy =
    typeof response.matchStrategy === "string" && response.matchStrategy.startsWith("retail-map:")
      ? ` via ${response.matchStrategy.replace("retail-map:", "")} mapping`
      : "";
  searchStatusEl.textContent = `${materials.length} verified alternatives found${strategy}`;
  renderResults(materials);
});

void loadSettings();
