export const EPD_TAGS = {
  assemblyType: [
    "unitized-vision",
    "unitized-shadowbox",
    "unitized-spandrel",
    "unitized-vision-fritted",
    "stone-panel-granite",
    "stone-panel-limestone",
    "stone-panel-sandstone",
    "stone-panel-terracotta",
    "uhpc-panel",
    "gfrc-panel",
    "metal-panel-aluminum",
  ] as const,

  framingType: [
    "cfmf-studs",
    "hss-mega-panel",
    "unitized-framing",
    "stick-framing",
  ] as const,

  exteriorFinish: [
    "vision-igu-clear",
    "vision-igu-low-e",
    "vision-igu-fritted",
    "spandrel-glass",
    "granite-veneer",
    "limestone-veneer",
    "sandstone-veneer",
    "terracotta-cladding",
    "uhpc-cladding",
    "gfrc-cladding",
    "aluminum-plate",
  ] as const,

  certifications: [
    "epd-verified",
    "leed-v5-eligible",
    "declare-label",
    "cradle-to-cradle",
    "greenguard-gold",
    "fsc-certified",
  ] as const,

  carbonTier: {
    LOW: "low-carbon",   // < 5,000 kgCO2e per 1000SF
    MID: "mid-carbon",   // 5,000 – 15,000 kgCO2e per 1000SF
    HIGH: "high-carbon", // > 15,000 kgCO2e per 1000SF
  } as const,
} as const;

export type AssemblyTypeTag = typeof EPD_TAGS.assemblyType[number];
export type FramingTypeTag = typeof EPD_TAGS.framingType[number];
export type ExteriorFinishTag = typeof EPD_TAGS.exteriorFinish[number];
export type CertificationTag = typeof EPD_TAGS.certifications[number];
export type CarbonTier = typeof EPD_TAGS.carbonTier[keyof typeof EPD_TAGS.carbonTier];
