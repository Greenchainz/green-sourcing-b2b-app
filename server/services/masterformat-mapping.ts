export interface AssemblyMapping {
  assemblyType: string;
  masterformatSection: string;
  categories: string[];
}

export const EWS_ASSEMBLY_MAPPINGS: Record<string, AssemblyMapping> = {
  "EWS-1A": {
    assemblyType: "Unitized Curtain Wall (Vision/Shadow/Spandrel)",
    masterformatSection: "08 44 13",
    categories: [
      "CurtainWalls", "Glass", "Aluminum", "Aluminium",
      "FenestrationFraming", "Windows", "ProcessedNonInsulatingGlassPanes",
    ],
  },
  "EWS-1B": {
    assemblyType: "Unitized Vision Fitted",
    masterformatSection: "08 44 13",
    categories: [
      "CurtainWalls", "Windows", "Glass",
      "FenestrationFraming", "ProcessedNonInsulatingGlassPanes",
    ],
  },
  "EWS-2A": {
    assemblyType: "Granite Panel",
    masterformatSection: "04 42 00",
    categories: ["StoneCladding", "Cladding", "Masonry"],
  },
  "EWS-2B": {
    assemblyType: "Natural Stone (Limestone/Sandstone)",
    masterformatSection: "04 42 00",
    categories: ["StoneCladding", "Masonry", "Cladding"],
  },
  "EWS-3A": {
    assemblyType: "Terracotta",
    masterformatSection: "04 73 00",
    categories: ["Masonry", "CeramicTile", "Cladding", "StoneCladding"],
  },
  "EWS-3B": {
    assemblyType: "UHPC",
    masterformatSection: "03 45 00",
    categories: ["Concrete", "PrecastConcrete", "ArchitecturalPrecast", "StructuralPrecast"],
  },
  "EWS-3C": {
    assemblyType: "GFRC",
    masterformatSection: "03 45 00",
    categories: ["Concrete", "ArchitecturalPrecast", "PrecastConcrete", "AutoclavedAeratedConcrete"],
  },
  "EWS-5": {
    assemblyType: "Aluminum Metal Panel",
    masterformatSection: "07 42 13",
    categories: [
      "Aluminum", "Aluminium", "AluminiumSheetGoods",
      "AluminiumBillets", "Cladding", "MiscMetalFabrication",
    ],
  },
};

const mappingByAssemblyType: Record<string, AssemblyMapping> = Object.values(EWS_ASSEMBLY_MAPPINGS)
  .reduce<Record<string, AssemblyMapping>>((acc, mapping) => {
    acc[mapping.assemblyType] = mapping;
    return acc;
  }, {});

export function getAssemblyMappingByCode(assemblyCode: string | null | undefined): AssemblyMapping | null {
  if (!assemblyCode) return null;
  return EWS_ASSEMBLY_MAPPINGS[assemblyCode] ?? null;
}

export function getAssemblyMappingByType(assemblyType: string | null | undefined): AssemblyMapping | null {
  if (!assemblyType) return null;
  return mappingByAssemblyType[assemblyType] ?? null;
}
