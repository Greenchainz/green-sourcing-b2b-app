/**
 * Supplier ecosystem — typed data derived from
 * docs/research/SUPPLIER_ECOSYSTEM.md
 *
 * Every scraped company, every onboarded supplier, every SWAP-engine
 * recommendation should resolve to a SupplierCategory and a
 * MaterialReadiness value. Extend this file when new research lands.
 */

export enum SupplierCategory {
  LowCarbonConcrete = "LowCarbonConcrete",
  MassTimber = "MassTimber",
  ModifiedWood = "ModifiedWood",
  BioInsulation = "BioInsulation",
  Mycelium = "Mycelium",
  WasteValorization = "WasteValorization",
  AdvancedTech = "AdvancedTech",
}

export enum MaterialReadiness {
  High = "High",
  Medium = "Medium",
  Low = "Low",
}

export type CarbonAngle =
  | "CarbonSequestration"
  | "CarbonReduction"
  | "CarbonElimination"
  | "ByproductReuse"
  | "WasteValorization"
  | "Biophilic"
  | "Durability"
  | "Acoustic"
  | "Thermal";

export interface SupplierRecord {
  /** Canonical company name */
  company: string;
  /** Category this supplier belongs to (A-G) */
  category: SupplierCategory;
  /** One-line product / specialty */
  product: string;
  /** Sustainability angle — how it reduces impact */
  sustainabilityAngle: string;
  /** Pitch angle we lead with when onboarding */
  pitchAngle: string;
  /** How ready they are to be specified by a Tier 1 architect */
  readiness: MaterialReadiness;
  /** Primary carbon angle tags */
  carbonAngles: CarbonAngle[];
  /** Founding 50 candidate flag */
  foundingFiftyCandidate?: boolean;
}

export const SUPPLIER_CATEGORY_META: Record<
  SupplierCategory,
  { letter: string; title: string; description: string }
> = {
  [SupplierCategory.LowCarbonConcrete]: {
    letter: "A",
    title: "Low-Carbon Concrete & Masonry",
    description:
      "Cement is 8% of global CO2. Incumbent inertia and liability fear protect Portland. Startups offer drop-in replacements with equal strength.",
  },
  [SupplierCategory.MassTimber]: {
    letter: "B",
    title: "Mass Timber & Engineered Wood",
    description:
      "CLT/Glulam challenges steel and concrete for high-rise. Carbon storage, structural capacity, schedule advantage.",
  },
  [SupplierCategory.ModifiedWood]: {
    letter: "C",
    title: "Thermally Modified & Sustainable Wood",
    description:
      "Heat-treated wood replaces pressure-treated. Rot-resistant, toxin-free, high growth in decking/cladding.",
  },
  [SupplierCategory.BioInsulation]: {
    letter: "D",
    title: "Bio-Based & Agricultural Insulation / Panels",
    description:
      "Hemp, straw, bamboo, wool, wood fiber. Highest growth, most disruptive. Rebrand from 'hippie' to 'High-Performance Biological Composites.'",
  },
  [SupplierCategory.Mycelium]: {
    letter: "E",
    title: "Mycelium & Fungi",
    description:
      "Grown materials — mostly startups. Novel, biodegradable, speculative. Strong cool factor, weak scale.",
  },
  [SupplierCategory.WasteValorization]: {
    letter: "F",
    title: "Waste Valorization / Circular Economy",
    description:
      "Recycled plastic, textile, glass, biochar. Wide readiness range. Story = closing the loop on building waste.",
  },
  [SupplierCategory.AdvancedTech]: {
    letter: "G",
    title: "Advanced Tech, Glazing & Niche",
    description:
      "Smart glass, aerogel, living walls, seaweed, biochar, acoustic lighting. Mix of scaled incumbents and early-stage.",
  },
};

export const SUPPLIERS: SupplierRecord[] = [
  // Category A - Low-Carbon Concrete & Masonry
  { company: "Prometheus Materials", category: SupplierCategory.LowCarbonConcrete, product: "ProZERO algae bio-cement block", sustainabilityAngle: "Zero-carbon via microalgae / seashell formation.", pitchAngle: "Specification Security — ASTM compliance + cool factor.", readiness: MaterialReadiness.High, carbonAngles: ["CarbonElimination"], foundingFiftyCandidate: true },
  { company: "Biomason", category: SupplierCategory.LowCarbonConcrete, product: "Biolith tiles (bacteria-grown, no kiln)", sustainabilityAngle: "Ambient-temperature growth; no firing.", pitchAngle: "From niche to norm via pavers/facades to structural.", readiness: MaterialReadiness.High, carbonAngles: ["CarbonElimination"] },
  { company: "Brimstone", category: SupplierCategory.LowCarbonConcrete, product: "OPC from calcium silicate (no limestone)", sustainabilityAngle: "40%+ GWP reduction, identical chemistry, no engineer recalc.", pitchAngle: "Drop-in replacement. Interceptor flags when Portland Type I/II is specified.", readiness: MaterialReadiness.High, carbonAngles: ["CarbonReduction"], foundingFiftyCandidate: true },
  { company: "Fortera", category: SupplierCategory.LowCarbonConcrete, product: "ReCarb (CO2 captured + mineralized)", sustainabilityAngle: "10-60% reduction; bolt-on for legacy plants.", pitchAngle: "The Carbon Sink — active sequestration.", readiness: MaterialReadiness.Medium, carbonAngles: ["CarbonSequestration", "CarbonReduction"] },
  { company: "Sublime Systems", category: SupplierCategory.LowCarbonConcrete, product: "Electrochemical cement at ambient temp (MIT spin-off)", sustainabilityAngle: "No fossil fuels in chemistry.", pitchAngle: "Translate deep tech into Carbon Saved per Ton.", readiness: MaterialReadiness.High, carbonAngles: ["CarbonElimination"] },
  { company: "Geopolymer Solutions", category: SupplierCategory.LowCarbonConcrete, product: "Cold Fusion Concrete (geopolymer)", sustainabilityAngle: "Industrial byproduct + alkaline activation; high durability.", pitchAngle: "Durability-as-sustainability; facade focus.", readiness: MaterialReadiness.Medium, carbonAngles: ["ByproductReuse", "Durability"] },
  { company: "Wagners", category: SupplierCategory.LowCarbonConcrete, product: "EFC (Earth Friendly Concrete, zero Portland)", sustainabilityAngle: "Proven at Brisbane airport.", pitchAngle: "Expand from horizontal to vertical.", readiness: MaterialReadiness.Medium, carbonAngles: ["CarbonElimination"] },
  { company: "Urban Mining CT", category: SupplierCategory.LowCarbonConcrete, product: "Pozzotive (recycled glass pozzolan)", sustainabilityAngle: "Waste glass + low carbon.", pitchAngle: "Hyper-local circularity — NYC/Boston geo-targeting.", readiness: MaterialReadiness.High, carbonAngles: ["WasteValorization", "CarbonReduction"] },
  { company: "Blue Planet", category: SupplierCategory.LowCarbonConcrete, product: "Limestone aggregate grown from captured CO2", sustainabilityAngle: "Carbon negative even with standard cement.", pitchAngle: "Offset inside the mix.", readiness: MaterialReadiness.High, carbonAngles: ["CarbonSequestration"] },
  { company: "CarbiCrete", category: SupplierCategory.LowCarbonConcrete, product: "Precast CMU cured with CO2", sustainabilityAngle: "Eliminates cement; permanent CO2 sequestration.", pitchAngle: "Precast specialist filter.", readiness: MaterialReadiness.Medium, carbonAngles: ["CarbonSequestration", "ByproductReuse"] },
  { company: "Solidia Technologies", category: SupplierCategory.LowCarbonConcrete, product: "CO2-cured concrete", sustainabilityAngle: "Water-conserving cure; lighter product.", pitchAngle: "Water-wise concrete for drought zones.", readiness: MaterialReadiness.Medium, carbonAngles: ["CarbonSequestration"] },
  { company: "CarbonCure", category: SupplierCategory.LowCarbonConcrete, product: "CO2 injection (strengthens, reduces cement)", sustainabilityAngle: "Massive ready-mix partner network.", pitchAngle: "Local availability map.", readiness: MaterialReadiness.Medium, carbonAngles: ["CarbonSequestration", "CarbonReduction"] },
  { company: "Eco Material Technologies", category: SupplierCategory.LowCarbonConcrete, product: "Alternative cementitious binders", sustainabilityAngle: "Lower embodied carbon.", pitchAngle: "Supplementary cementitious option.", readiness: MaterialReadiness.Medium, carbonAngles: ["CarbonReduction"] },
  { company: "Terra CO2", category: SupplierCategory.LowCarbonConcrete, product: "Low-carbon cementitious materials", sustainabilityAngle: "CO2-based binders.", pitchAngle: "Early-stage alt.", readiness: MaterialReadiness.Medium, carbonAngles: ["CarbonReduction"] },
  { company: "Partanna", category: SupplierCategory.LowCarbonConcrete, product: "Carbon-negative concrete", sustainabilityAngle: "Direct sequestration.", pitchAngle: "Carbon-negative story for CSOs.", readiness: MaterialReadiness.High, carbonAngles: ["CarbonSequestration"] },
  { company: "C-Crete Technologies", category: SupplierCategory.LowCarbonConcrete, product: "Ceramic-like concrete (no Portland, pours traditional)", sustainabilityAngle: "Zero crew retraining.", pitchAngle: "Zero-training transition removes GC adoption barrier.", readiness: MaterialReadiness.High, carbonAngles: ["CarbonElimination"] },
  { company: "Hoffmann Green Cement", category: SupplierCategory.LowCarbonConcrete, product: "Clinker-free cement", sustainabilityAngle: "Lower energy, lower emissions.", pitchAngle: "Proven EU player.", readiness: MaterialReadiness.High, carbonAngles: ["CarbonReduction"] },
  { company: "Ecocem", category: SupplierCategory.LowCarbonConcrete, product: "GGBS cement (blast furnace slag)", sustainabilityAngle: "Industrial byproduct reuse.", pitchAngle: "Established scale.", readiness: MaterialReadiness.Medium, carbonAngles: ["ByproductReuse"] },
  { company: "Heidelberg Materials (EcoCrete)", category: SupplierCategory.LowCarbonConcrete, product: "EcoCrete line (incumbent transitioning)", sustainabilityAngle: "Large-scale repositioning.", pitchAngle: "Sell the green line, not the whole company.", readiness: MaterialReadiness.Medium, carbonAngles: ["CarbonReduction"] },
  { company: "Holcim (ECOPact / ECOPlanet)", category: SupplierCategory.LowCarbonConcrete, product: "Incumbent green product lines", sustainabilityAngle: "Established availability.", pitchAngle: "Segment the offering — pitch ECOPact specifically.", readiness: MaterialReadiness.Medium, carbonAngles: ["CarbonReduction"] },

  // Category B - Mass Timber
  { company: "Mercer Mass Timber", category: SupplierCategory.MassTimber, product: "CLT/Glulam at scale", sustainabilityAngle: "Carbon storage; structural capacity.", pitchAngle: "Capacity optimization for mid-market (schools, offices).", readiness: MaterialReadiness.High, carbonAngles: ["CarbonSequestration"] },
  { company: "SmartLam North America", category: SupplierCategory.MassTimber, product: "US commercial CLT", sustainabilityAngle: "Schedule savings vs concrete.", pitchAngle: "Sell their TIME to Developers/GCs.", readiness: MaterialReadiness.High, carbonAngles: ["CarbonSequestration"] },
  { company: "Binderholz", category: SupplierCategory.MassTimber, product: "European mass timber giant (US expansion)", sustainabilityAngle: "EU sophistication + EPD strength.", pitchAngle: "Global tech, local code — localize EU certs.", readiness: MaterialReadiness.High, carbonAngles: ["CarbonSequestration"] },
  { company: "StructureCraft", category: SupplierCategory.MassTimber, product: "Signature structures, complex engineering", sustainabilityAngle: "Precision + early design assist.", pitchAngle: "Early Design Assist — lock in before VE.", readiness: MaterialReadiness.High, carbonAngles: ["CarbonSequestration"] },
  { company: "Sterling Structural", category: SupplierCategory.MassTimber, product: "TerraLam CLT", sustainabilityAngle: "Rugged industrial-origin durability.", pitchAngle: "Diamond in the rough — industrial-grade exposed timber.", readiness: MaterialReadiness.Medium, carbonAngles: ["CarbonSequestration", "Durability"] },
  { company: "Kalesnikoff", category: SupplierCategory.MassTimber, product: "Multi-gen family mass timber, glulam", sustainabilityAngle: "Aesthetic quality, custom fab.", pitchAngle: "Curated quality for high-end residential.", readiness: MaterialReadiness.High, carbonAngles: ["CarbonSequestration", "Biophilic"] },
  { company: "Nordic Structures", category: SupplierCategory.MassTimber, product: "Glulam/CLT", sustainabilityAngle: "Established player.", pitchAngle: "Greenbuild exhibitor; proven.", readiness: MaterialReadiness.High, carbonAngles: ["CarbonSequestration"] },
  { company: "Sauter Timber", category: SupplierCategory.MassTimber, product: "Timber fabrication", sustainabilityAngle: "Custom capability.", pitchAngle: "Niche fabricator.", readiness: MaterialReadiness.Medium, carbonAngles: ["CarbonSequestration"] },
  { company: "SilvaSpan", category: SupplierCategory.MassTimber, product: "Commodity wood products", sustainabilityAngle: "Standard offering.", pitchAngle: "Standard.", readiness: MaterialReadiness.Medium, carbonAngles: ["CarbonSequestration"] },
  { company: "Element5", category: SupplierCategory.MassTimber, product: "CLT/Glulam emerging", sustainabilityAngle: "Growth-stage player.", pitchAngle: "Growth-stage.", readiness: MaterialReadiness.Medium, carbonAngles: ["CarbonSequestration"] },

  // Category C - Modified Wood
  { company: "Arbor Wood Co.", category: SupplierCategory.ModifiedWood, product: "Thermally modified domestic ash/pine", sustainabilityAngle: "Replaces tropical hardwood (rainforest).", pitchAngle: "Save the rainforest, specify domestic — Interceptor vs. Ipe.", readiness: MaterialReadiness.High, carbonAngles: ["CarbonSequestration"] },
  { company: "Thermory", category: SupplierCategory.ModifiedWood, product: "Thermal modification (ash, pine); global distribution", sustainabilityAngle: "Biophilia + recycling vs. composite.", pitchAngle: "Real wood no rot — penetrate Trex lock-in.", readiness: MaterialReadiness.High, carbonAngles: ["Biophilic", "CarbonSequestration"] },
  { company: "Delta Millworks", category: SupplierCategory.ModifiedWood, product: "Shou Sugi Ban + modified woods", sustainabilityAngle: "Longevity, no sealant.", pitchAngle: "Performance Art — OpEx savings justify cost.", readiness: MaterialReadiness.High, carbonAngles: ["Durability"] },
  { company: "Klaaswood", category: SupplierCategory.ModifiedWood, product: "Thermally modified with verified EMC", sustainabilityAngle: "Technical stability; no warp.", pitchAngle: "The Callback Killer — Construction Admin phase.", readiness: MaterialReadiness.High, carbonAngles: ["Durability"] },
  { company: "Kebony", category: SupplierCategory.ModifiedWood, product: "Bio-modified softwoods (furfuryl alcohol)", sustainabilityAngle: "Hardwood alternative, low carbon ship.", pitchAngle: "Norwegian pine vs. Amazon Ipe — GWP calculator.", readiness: MaterialReadiness.High, carbonAngles: ["CarbonReduction"] },
  { company: "Lunawood", category: SupplierCategory.ModifiedWood, product: "Thermowood global leader (Finland)", sustainabilityAngle: "Standardized consistency.", pitchAngle: "Scalable sustainability for large developments.", readiness: MaterialReadiness.High, carbonAngles: ["CarbonSequestration"] },
  { company: "Accoya", category: SupplierCategory.ModifiedWood, product: "Acetylated wood", sustainabilityAngle: "Alternative modification chemistry.", pitchAngle: "Established high performer.", readiness: MaterialReadiness.High, carbonAngles: ["Durability"] },
  { company: "Cambia", category: SupplierCategory.ModifiedWood, product: "Thermally modified (NFP brand)", sustainabilityAngle: "Modified wood performance.", pitchAngle: "Mid-market modified.", readiness: MaterialReadiness.Medium, carbonAngles: ["Durability"] },
  { company: "Nova USA Wood", category: SupplierCategory.ModifiedWood, product: "Sustainable hardwoods", sustainabilityAngle: "Domestic sourcing.", pitchAngle: "Regional option.", readiness: MaterialReadiness.Medium, carbonAngles: ["CarbonSequestration"] },
  { company: "Silva Timber", category: SupplierCategory.ModifiedWood, product: "Specialty timber", sustainabilityAngle: "Niche offering.", pitchAngle: "Niche.", readiness: MaterialReadiness.Medium, carbonAngles: ["CarbonSequestration"] },

  // Category D - Bio Insulation
  { company: "Hempitecture", category: SupplierCategory.BioInsulation, product: "HempWool insulation, hempcrete blocks", sustainabilityAngle: "US industrial-scale hemp; carbon storage.", pitchAngle: "Health & Safety — no itching, no VOC.", readiness: MaterialReadiness.Medium, carbonAngles: ["CarbonSequestration", "Thermal"] },
  { company: "IsoHemp", category: SupplierCategory.BioInsulation, product: "Prefab hempcrete blocks (5M units/yr)", sustainabilityAngle: "Solved drying-time; masonry-unit replacement.", pitchAngle: "The mason's green block — standard masons install.", readiness: MaterialReadiness.High, carbonAngles: ["CarbonSequestration"] },
  { company: "Americhanvre", category: SupplierCategory.BioInsulation, product: "Spray-applied hempcrete", sustainabilityAngle: "Labor cost reduction via spray.", pitchAngle: "Spray-applied sustainability for VEs.", readiness: MaterialReadiness.Medium, carbonAngles: ["CarbonSequestration"] },
  { company: "HempBlock USA", category: SupplierCategory.BioInsulation, product: "Biosys interlocking blocks", sustainabilityAngle: "Minimal skilled labor.", pitchAngle: "LEGO for adults — owner-builders.", readiness: MaterialReadiness.Low, carbonAngles: ["CarbonSequestration"] },
  { company: "EcoCocon", category: SupplierCategory.BioInsulation, product: "Prefab straw panels (cradle-to-cradle)", sustainabilityAngle: "Factory-engineered Passivhaus shell.", pitchAngle: "Prefabricated Passive House — airtight fast.", readiness: MaterialReadiness.High, carbonAngles: ["Thermal", "CarbonSequestration"] },
  { company: "ModCell", category: SupplierCategory.BioInsulation, product: "Straw bale cladding (schools, commercial)", sustainabilityAngle: "Carbon negativity at scale.", pitchAngle: "Institutional decarbonization for Campus Planners.", readiness: MaterialReadiness.High, carbonAngles: ["CarbonSequestration"] },
  { company: "MOSO Bamboo", category: SupplierCategory.BioInsulation, product: "Flooring, decking, cladding", sustainabilityAngle: "Harder than oak, fast growth.", pitchAngle: "Commercial interior durability first.", readiness: MaterialReadiness.High, carbonAngles: ["Durability"] },
  { company: "Lamboo", category: SupplierCategory.BioInsulation, product: "Structural bamboo", sustainabilityAngle: "Structural capacity.", pitchAngle: "Structural engineers' renewable beam option.", readiness: MaterialReadiness.High, carbonAngles: ["CarbonSequestration"] },
  { company: "dassoXTR", category: SupplierCategory.BioInsulation, product: "Fused bamboo, Class A fire rating", sustainabilityAngle: "Weather + fire rated.", pitchAngle: "Fire-rated bamboo for Landscape Architects.", readiness: MaterialReadiness.High, carbonAngles: ["Durability"] },
  { company: "Plyboo", category: SupplierCategory.BioInsulation, product: "Bamboo plywood, acoustic panels", sustainabilityAngle: "Acoustics + aesthetics.", pitchAngle: "Acoustic design for office designers.", readiness: MaterialReadiness.High, carbonAngles: ["Acoustic"] },
  { company: "Steico", category: SupplierCategory.BioInsulation, product: "Wood fiber insulation, I-joists", sustainabilityAngle: "Wood fiber + structural apps.", pitchAngle: "Greenbuild presence, EU scale.", readiness: MaterialReadiness.High, carbonAngles: ["Thermal"] },
  { company: "Gutex", category: SupplierCategory.BioInsulation, product: "Wood fiber insulation", sustainabilityAngle: "German engineering.", pitchAngle: "Established.", readiness: MaterialReadiness.High, carbonAngles: ["Thermal"] },
  { company: "Havelock Wool", category: SupplierCategory.BioInsulation, product: "Sheep wool insulation", sustainabilityAngle: "Natural, non-toxic.", pitchAngle: "Natural non-toxic for healthy building.", readiness: MaterialReadiness.Medium, carbonAngles: ["Thermal"] },
  { company: "Thermafleece", category: SupplierCategory.BioInsulation, product: "UK sheep wool insulation", sustainabilityAngle: "Proven UK-based.", pitchAngle: "Mid-scale.", readiness: MaterialReadiness.Medium, carbonAngles: ["Thermal"] },
  { company: "TimberHP", category: SupplierCategory.BioInsulation, product: "Wood fiber insulation", sustainabilityAngle: "Performance focus.", pitchAngle: "Growth.", readiness: MaterialReadiness.Medium, carbonAngles: ["Thermal"] },
  { company: "Gramitherm", category: SupplierCategory.BioInsulation, product: "Grass insulation", sustainabilityAngle: "Ag waste valorization.", pitchAngle: "Early-stage.", readiness: MaterialReadiness.Low, carbonAngles: ["WasteValorization"] },
  { company: "Oregon Shepherd", category: SupplierCategory.BioInsulation, product: "Regional wool insulation", sustainabilityAngle: "Regional sourcing.", pitchAngle: "Regional.", readiness: MaterialReadiness.Medium, carbonAngles: ["Thermal"] },
  { company: "Black Mountain Insulation", category: SupplierCategory.BioInsulation, product: "Wool insulation", sustainabilityAngle: "Regional.", pitchAngle: "Regional.", readiness: MaterialReadiness.Medium, carbonAngles: ["Thermal"] },
  { company: "Wool Insulation NZ", category: SupplierCategory.BioInsulation, product: "NZ wool insulation", sustainabilityAngle: "Regional sourcing.", pitchAngle: "Regional.", readiness: MaterialReadiness.Medium, carbonAngles: ["Thermal"] },
  { company: "New Frameworks", category: SupplierCategory.BioInsulation, product: "Straw/natural building panels", sustainabilityAngle: "Prefab straw systems.", pitchAngle: "Niche.", readiness: MaterialReadiness.Medium, carbonAngles: ["CarbonSequestration"] },
  { company: "GreenJams (Agrocrete)", category: SupplierCategory.BioInsulation, product: "Agri-fiber panels", sustainabilityAngle: "Waste valorization.", pitchAngle: "Early.", readiness: MaterialReadiness.Low, carbonAngles: ["WasteValorization"] },
  { company: "CalPlant", category: SupplierCategory.BioInsulation, product: "Rice straw MDF", sustainabilityAngle: "Agricultural byproduct.", pitchAngle: "Status check needed.", readiness: MaterialReadiness.Low, carbonAngles: ["WasteValorization"] },

  // Category E - Mycelium
  { company: "Ecovative", category: SupplierCategory.Mycelium, product: "Mycelium packaging, insulation, composites", sustainabilityAngle: "Grown, biodegradable, carbon neutral.", pitchAngle: "Grown not made — early-adopter architects.", readiness: MaterialReadiness.Low, carbonAngles: ["CarbonElimination"] },
  { company: "Mogu", category: SupplierCategory.Mycelium, product: "Mycelium acoustics, flooring", sustainabilityAngle: "Acoustic + aesthetic.", pitchAngle: "Sound + sustainability for Acousticians.", readiness: MaterialReadiness.Low, carbonAngles: ["Acoustic"] },
  { company: "MycoWorks", category: SupplierCategory.Mycelium, product: "Reishi/mycelium finishes", sustainabilityAngle: "Aesthetic + performance.", pitchAngle: "Luxury mycelium finishes.", readiness: MaterialReadiness.Low, carbonAngles: ["CarbonElimination"] },
  { company: "Biohm", category: SupplierCategory.Mycelium, product: "Mycelium insulation, boards", sustainabilityAngle: "Structural + insulating capability.", pitchAngle: "Experimental architects.", readiness: MaterialReadiness.Low, carbonAngles: ["Thermal"] },
  { company: "Grown.bio", category: SupplierCategory.Mycelium, product: "Mycelium packaging, interiors", sustainabilityAngle: "Biodegradable foam replacement.", pitchAngle: "Interior finishing only.", readiness: MaterialReadiness.Low, carbonAngles: ["CarbonElimination"] },
  { company: "Mykilio", category: SupplierCategory.Mycelium, product: "Mycelium housing concepts", sustainabilityAngle: "Fully grown structures.", pitchAngle: "Speculative; very long sales cycle.", readiness: MaterialReadiness.Low, carbonAngles: ["CarbonElimination"] },
  { company: "MycoHab", category: SupplierCategory.Mycelium, product: "Mycelium housing", sustainabilityAngle: "Fully grown structures.", pitchAngle: "Speculative.", readiness: MaterialReadiness.Low, carbonAngles: ["CarbonElimination"] },
  { company: "Eukarya", category: SupplierCategory.Mycelium, product: "Mycelium composites", sustainabilityAngle: "Experimental composites.", pitchAngle: "Research-grade.", readiness: MaterialReadiness.Low, carbonAngles: ["CarbonElimination"] },
  { company: "Blast Studio", category: SupplierCategory.Mycelium, product: "3D printed mycelium", sustainabilityAngle: "3D fabrication.", pitchAngle: "Research-grade.", readiness: MaterialReadiness.Low, carbonAngles: ["CarbonElimination"] },

  // Category F - Waste Valorization
  { company: "FabBRICK", category: SupplierCategory.WasteValorization, product: "Textile waste bricks", sustainabilityAngle: "Textile repurposing.", pitchAngle: "Zero textile waste for circular devs.", readiness: MaterialReadiness.Medium, carbonAngles: ["WasteValorization"] },
  { company: "Greenful", category: SupplierCategory.WasteValorization, product: "Textile panels", sustainabilityAngle: "Textile valorization.", pitchAngle: "Niche textile story.", readiness: MaterialReadiness.Low, carbonAngles: ["WasteValorization"] },
  { company: "ByFusion", category: SupplierCategory.WasteValorization, product: "Plastic blocks (polymer waste)", sustainabilityAngle: "Plastic repurposing.", pitchAngle: "Plastic waste to pavers — municipalities.", readiness: MaterialReadiness.Medium, carbonAngles: ["WasteValorization"] },
  { company: "Tangent Materials", category: SupplierCategory.WasteValorization, product: "HDPE lumber (recycled plastic)", sustainabilityAngle: "Rot-free plastic lumber.", pitchAngle: "Plastic lumber without chemicals.", readiness: MaterialReadiness.Medium, carbonAngles: ["WasteValorization", "Durability"] },
  { company: "The Good Plastic Company (Polygood)", category: SupplierCategory.WasteValorization, product: "Recycled plastic panels", sustainabilityAngle: "Plastic valorization.", pitchAngle: "Circular finishes.", readiness: MaterialReadiness.Medium, carbonAngles: ["WasteValorization"] },
  { company: "StoneCycling", category: SupplierCategory.WasteValorization, product: "WasteBasedBricks (construction waste)", sustainabilityAngle: "Construction waste closure loop.", pitchAngle: "Bricks from bricks — contractor circular story.", readiness: MaterialReadiness.Medium, carbonAngles: ["WasteValorization"] },
  { company: "Front", category: SupplierCategory.WasteValorization, product: "Sustainable materials hub (aggregator)", sustainabilityAngle: "Curated database overlap.", pitchAngle: "Potential partner/competitor — flag relationship.", readiness: MaterialReadiness.High, carbonAngles: ["WasteValorization"] },
  { company: "Smile Plastics", category: SupplierCategory.WasteValorization, product: "Recycled plastic tiles/panels", sustainabilityAngle: "Plastic to finishes.", pitchAngle: "Finishes story.", readiness: MaterialReadiness.Medium, carbonAngles: ["WasteValorization"] },
  { company: "Pretty Plastic", category: SupplierCategory.WasteValorization, product: "Recycled plastic panels", sustainabilityAngle: "Plastic to finishes.", pitchAngle: "Finishes story.", readiness: MaterialReadiness.Medium, carbonAngles: ["WasteValorization"] },
  { company: "Ultra-Poly", category: SupplierCategory.WasteValorization, product: "Recycled resins", sustainabilityAngle: "Plastic resin valorization.", pitchAngle: "Composite feedstock.", readiness: MaterialReadiness.Medium, carbonAngles: ["WasteValorization"] },
  { company: "American Plastic Lumber", category: SupplierCategory.WasteValorization, product: "Recycled plastic lumber", sustainabilityAngle: "Established recycled player.", pitchAngle: "Scale.", readiness: MaterialReadiness.Medium, carbonAngles: ["WasteValorization"] },
  { company: "Looptworks", category: SupplierCategory.WasteValorization, product: "Upcycled textiles", sustainabilityAngle: "Textile circularity.", pitchAngle: "Fashion crossover.", readiness: MaterialReadiness.Low, carbonAngles: ["WasteValorization"] },
  { company: "Evrnu", category: SupplierCategory.WasteValorization, product: "Textile recycling (regenerated fiber)", sustainabilityAngle: "Textile circularity.", pitchAngle: "Regenerated fiber.", readiness: MaterialReadiness.Medium, carbonAngles: ["WasteValorization"] },
  { company: "FABSCRAP", category: SupplierCategory.WasteValorization, product: "Textile recycling service", sustainabilityAngle: "Textile waste collection.", pitchAngle: "Adjacent service.", readiness: MaterialReadiness.Low, carbonAngles: ["WasteValorization"] },
  { company: "Aquafil (Econyl)", category: SupplierCategory.WasteValorization, product: "Regenerated nylon (ocean plastic)", sustainabilityAngle: "Ocean plastic to carpet.", pitchAngle: "Premium story for flooring designers.", readiness: MaterialReadiness.High, carbonAngles: ["WasteValorization"] },
  { company: "Interface (Net Effect)", category: SupplierCategory.WasteValorization, product: "Carpet tile line", sustainabilityAngle: "Incumbent green commitment.", pitchAngle: "Industry-leader circular line.", readiness: MaterialReadiness.High, carbonAngles: ["WasteValorization"] },
  { company: "Durat", category: SupplierCategory.WasteValorization, product: "Recycled solid surface", sustainabilityAngle: "Thermoset recycled.", pitchAngle: "Recycled surfaces.", readiness: MaterialReadiness.Medium, carbonAngles: ["WasteValorization"] },
  { company: "Resilica", category: SupplierCategory.WasteValorization, product: "Recycled glass surfaces", sustainabilityAngle: "Glass waste valorization.", pitchAngle: "Glass waste to luxury surfaces.", readiness: MaterialReadiness.High, carbonAngles: ["WasteValorization"] },
  { company: "IceStone", category: SupplierCategory.WasteValorization, product: "Recycled glass countertops", sustainabilityAngle: "Glass waste valorization.", pitchAngle: "Premium positioning.", readiness: MaterialReadiness.High, carbonAngles: ["WasteValorization"] },
  { company: "Vetrazzo", category: SupplierCategory.WasteValorization, product: "Recycled glass surfaces", sustainabilityAngle: "Glass waste valorization.", pitchAngle: "Premium positioning.", readiness: MaterialReadiness.High, carbonAngles: ["WasteValorization"] },

  // Category G - Advanced Tech
  { company: "View Inc.", category: SupplierCategory.AdvancedTech, product: "Electrochromic smart glass", sustainabilityAngle: "Dynamic solar control.", pitchAngle: "Smart grid integration for Energy Managers.", readiness: MaterialReadiness.High, carbonAngles: ["Thermal"] },
  { company: "SageGlass", category: SupplierCategory.AdvancedTech, product: "Electrochromic smart glass", sustainabilityAngle: "Dynamic solar control.", pitchAngle: "kWh reduction for Energy Managers.", readiness: MaterialReadiness.High, carbonAngles: ["Thermal"] },
  { company: "Halio", category: SupplierCategory.AdvancedTech, product: "Electrochromic smart glass", sustainabilityAngle: "Dynamic solar control.", pitchAngle: "Dynamic tint.", readiness: MaterialReadiness.High, carbonAngles: ["Thermal"] },
  { company: "AeroShield", category: SupplierCategory.AdvancedTech, product: "Aerogel windows", sustainabilityAngle: "Ultra-high R-value.", pitchAngle: "Triple-wall performance.", readiness: MaterialReadiness.High, carbonAngles: ["Thermal"] },
  { company: "RavenWindow", category: SupplierCategory.AdvancedTech, product: "Thermochromic filter", sustainabilityAngle: "Passive solar control.", pitchAngle: "Passive smart glass without power.", readiness: MaterialReadiness.Medium, carbonAngles: ["Thermal"] },
  { company: "Green Oasis", category: SupplierCategory.AdvancedTech, product: "Living walls", sustainabilityAngle: "Biophilic design, air quality.", pitchAngle: "Biophilic premium for corp wellness.", readiness: MaterialReadiness.Medium, carbonAngles: ["Biophilic"] },
  { company: "Habitat Horticulture", category: SupplierCategory.AdvancedTech, product: "Living walls, plantscapes", sustainabilityAngle: "Biophilic design.", pitchAngle: "Occupant health story.", readiness: MaterialReadiness.Medium, carbonAngles: ["Biophilic"] },
  { company: "Sargassum Eco Lumber", category: SupplierCategory.AdvancedTech, product: "Seaweed blocks", sustainabilityAngle: "Beach algae valorization.", pitchAngle: "Beach to building — coastal niche.", readiness: MaterialReadiness.Low, carbonAngles: ["WasteValorization"] },
  { company: "Carbonwave", category: SupplierCategory.AdvancedTech, product: "Seaweed products", sustainabilityAngle: "Seaweed valorization.", pitchAngle: "Early-stage.", readiness: MaterialReadiness.Low, carbonAngles: ["WasteValorization"] },
  { company: "Made of Air", category: SupplierCategory.AdvancedTech, product: "Biochar plastics, facades", sustainabilityAngle: "Carbon sequestration.", pitchAngle: "Sequestered carbon in facade.", readiness: MaterialReadiness.Low, carbonAngles: ["CarbonSequestration"] },
  { company: "Char Technologies", category: SupplierCategory.AdvancedTech, product: "Biochar", sustainabilityAngle: "Carbon sequestration.", pitchAngle: "Agricultural crossover.", readiness: MaterialReadiness.Low, carbonAngles: ["CarbonSequestration"] },
  { company: "Pacific Biochar", category: SupplierCategory.AdvancedTech, product: "Biochar", sustainabilityAngle: "Carbon sequestration.", pitchAngle: "Agricultural crossover.", readiness: MaterialReadiness.Low, carbonAngles: ["CarbonSequestration"] },
  { company: "Luxxbox", category: SupplierCategory.AdvancedTech, product: "Acoustic lighting", sustainabilityAngle: "Sound + light combo.", pitchAngle: "Office designer problem/solution combo.", readiness: MaterialReadiness.Medium, carbonAngles: ["Acoustic"] },
  { company: "Lumenear", category: SupplierCategory.AdvancedTech, product: "Acoustic lighting", sustainabilityAngle: "Sound + light combo.", pitchAngle: "Office designer combo.", readiness: MaterialReadiness.Medium, carbonAngles: ["Acoustic"] },
  { company: "Impact Acoustic", category: SupplierCategory.AdvancedTech, product: "Acoustic lighting and panels", sustainabilityAngle: "Sound absorption.", pitchAngle: "Acoustic solutions.", readiness: MaterialReadiness.Medium, carbonAngles: ["Acoustic"] },
];

/** Helper: filter by category. */
export function suppliersByCategory(category: SupplierCategory): SupplierRecord[] {
  return SUPPLIERS.filter((s) => s.category === category);
}

/** Helper: filter by readiness level. */
export function suppliersByReadiness(readiness: MaterialReadiness): SupplierRecord[] {
  return SUPPLIERS.filter((s) => s.readiness === readiness);
}

/** Helper: Founding 50 candidates. */
export function foundingFiftyCandidates(): SupplierRecord[] {
  return SUPPLIERS.filter((s) => s.foundingFiftyCandidate);
}

/** Helper: readiness score (3/2/1) for match algorithms. */
export function readinessScore(r: MaterialReadiness): number {
  return r === MaterialReadiness.High ? 3 : r === MaterialReadiness.Medium ? 2 : 1;
}
