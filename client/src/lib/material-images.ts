/**
 * Material category → image mapping.
 *
 * Priority: supplier-uploaded image > category placeholder.
 * Images stored in /images/materials/*.jpg (generated, 800px wide).
 *
 * When suppliers upload their own product photos, those are stored in
 * the material's imageUrl field and take priority over these placeholders.
 */

const CATEGORY_MAP: Record<string, string> = {
  // Concrete + cement
  Concrete: "/images/materials/concrete.jpg",
  Cement: "/images/materials/concrete.jpg",
  CastDecksAndUnderlayment: "/images/materials/concrete.jpg",
  ConcreteAdmixtures: "/images/materials/concrete.jpg",
  PrecastConcrete: "/images/materials/concrete.jpg",
  CivilPrecast: "/images/materials/concrete.jpg",
  StructuralPrecast: "/images/materials/concrete.jpg",
  ArchitecturalPrecast: "/images/materials/concrete.jpg",
  AutoclavedAeratedConcrete: "/images/materials/concrete.jpg",

  // Steel + metals
  Metals: "/images/materials/steel.jpg",
  Metal: "/images/materials/steel.jpg",
  Steel: "/images/materials/steel.jpg",
  Copper: "/images/materials/steel.jpg",
  RebarSteel: "/images/materials/steel.jpg",
  PlateSteel: "/images/materials/steel.jpg",
  HotRolledSections: "/images/materials/steel.jpg",
  ColdFormedFraming: "/images/materials/steel.jpg",
  MiscMetalFabrication: "/images/materials/steel.jpg",

  // Insulation
  Insulation: "/images/materials/insulation.jpg",
  BoardInsulation: "/images/materials/insulation.jpg",
  BlanketInsulation: "/images/materials/insulation.jpg",
  InsulatedWallPanels: "/images/materials/insulation.jpg",
  InsulatedRoofPanels: "/images/materials/insulation.jpg",
  AppliedFireproofing: "/images/materials/insulation.jpg",

  // Gypsum + drywall
  Gypsum: "/images/materials/gypsum.jpg",
  Drywall: "/images/materials/gypsum.jpg",
  "Gypsum Board": "/images/materials/gypsum.jpg",
  GypsumFinishingCompounds: "/images/materials/gypsum.jpg",
  CementBoard: "/images/materials/gypsum.jpg",
  SheathingPanels: "/images/materials/gypsum.jpg",

  // Glass + glazing
  Glass: "/images/materials/glass.jpg",
  Glazing: "/images/materials/glass.jpg",
  ProcessedNonInsulatingGlassPanes: "/images/materials/glass.jpg",
  Windows: "/images/materials/glass.jpg",
  CurtainWalls: "/images/materials/glass.jpg",
  FenestrationFraming: "/images/materials/glass.jpg",
  FenestrationHardware: "/images/materials/glass.jpg",
  Mirrors: "/images/materials/glass.jpg",

  // Aluminum
  Aluminium: "/images/materials/aluminum.jpg",
  Aluminum: "/images/materials/aluminum.jpg",
  AluminiumBillets: "/images/materials/aluminum.jpg",
  AluminiumSheetGoods: "/images/materials/aluminum.jpg",

  // Masonry
  Masonry: "/images/materials/masonry.jpg",
  CeramicTile: "/images/materials/masonry.jpg",
  Mortar: "/images/materials/masonry.jpg",
  Grouting: "/images/materials/masonry.jpg",
  CementGrout: "/images/materials/masonry.jpg",
  StoneCladding: "/images/materials/masonry.jpg",
  Cladding: "/images/materials/masonry.jpg",

  // Wood + timber
  Wood: "/images/materials/wood.jpg",
  Timber: "/images/materials/wood.jpg",
  NonStructuralWood: "/images/materials/wood.jpg",
  WoodFlooring: "/images/materials/wood.jpg",
  WoodJoists: "/images/materials/wood.jpg",
  PrefabricatedWoodInsulatedPanels: "/images/materials/wood.jpg",

  // Roofing
  Roofing: "/images/materials/roofing.jpg",
  MembraneRoofing: "/images/materials/roofing.jpg",
  BituminousRoofing: "/images/materials/roofing.jpg",
  RoofPanels: "/images/materials/roofing.jpg",
  SinglePlyPVC: "/images/materials/roofing.jpg",
  SinglePlyTPO: "/images/materials/roofing.jpg",
};

const DEFAULT_IMAGE = "/images/materials/default.jpg";

// The "Flooring" category spans materially different products (carpet, bamboo,
// polished concrete), so a single category image would be misleading. When a
// subcategory identifies the actual floor material, prefer a matching image.
// Subcategories without a good asset (e.g. carpet) intentionally fall through
// to the neutral default rather than a wrong image.
const SUBCATEGORY_MAP: Record<string, string> = {
  "Concrete Flooring": "/images/materials/concrete.jpg",
  "Hard Flooring": "/images/materials/wood.jpg",
};

/**
 * Get the image URL for a material.
 * If the material has a supplier-uploaded image (imageUrl), use that.
 * Otherwise prefer a subcategory-specific placeholder, then fall back to the
 * category placeholder, then a neutral default.
 */
export function getMaterialImage(
  category: string | null | undefined,
  supplierImageUrl?: string | null,
  subcategory?: string | null
): string {
  if (supplierImageUrl) return supplierImageUrl;
  if (subcategory && SUBCATEGORY_MAP[subcategory]) return SUBCATEGORY_MAP[subcategory];
  if (!category) return DEFAULT_IMAGE;
  return CATEGORY_MAP[category] || DEFAULT_IMAGE;
}
