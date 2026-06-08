export const DEFAULT_MATERIAL_CATEGORY_OPTIONS = [
  "Concrete",
  "Concrete & Masonry",
  "Steel",
  "Steel & Metal",
  "Timber",
  "Timber & Wood",
  "Wood / Timber",
  "Glass",
  "Glass / Glazing",
  "Glazing & Windows",
  "Insulation",
  "Roofing",
  "Flooring",
  "Cladding",
  "Cladding & Facades",
  "Aluminum",
  "Masonry / Brick",
  "Drywall / Gypsum",
  "HVAC Systems",
  "Electrical",
  "Plumbing",
  "Interior Finishes",
  "Doors & Hardware",
  "MEP",
  "Rebar",
  "Copper",
  "Stone",
  "Other",
] as const;

function normalizeCategoryValue(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function buildMaterialCategoryOptions(
  catalogCategories: Array<{ category: string | null | undefined }> | undefined,
  selectedCategories: string[] = []
) {
  const ordered = [
    ...DEFAULT_MATERIAL_CATEGORY_OPTIONS,
    ...(catalogCategories ?? []).map((entry) => entry.category ?? ""),
    ...selectedCategories,
  ];

  const byKey = new Map<string, string>();
  for (const value of ordered) {
    const normalized = normalizeCategoryValue(value);
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (!byKey.has(key)) {
      byKey.set(key, normalized);
    }
  }

  return Array.from(byKey.values()).sort((a, b) => a.localeCompare(b));
}

export function normalizeMaterialCategoryInput(value: string) {
  return normalizeCategoryValue(value);
}
