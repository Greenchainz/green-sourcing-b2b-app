// Green IQ — curated trivia bank for the GreenChainz Arcade.
//
// Every question is on-brand: sustainable materials, embodied carbon,
// certifications and green building basics. This doubles as soft marketing —
// playing it positions GreenChainz as the domain expert.
//
// Facts are intentionally kept to widely-accepted, verifiable statements.
// Add new questions freely; the engine shuffles and cycles automatically.

export interface TriviaQuestion {
  id: string;
  prompt: string;
  /** Exactly four options. The engine shuffles their display order. */
  options: [string, string, string, string];
  /** Index (0-3) of the correct option in `options`. */
  correct: number;
  /** Short "did you know" shown after answering. */
  fact: string;
  category: "materials" | "carbon" | "certifications" | "buildings";
}

export const TRIVIA_QUESTIONS: TriviaQuestion[] = [
  {
    id: "embodied-carbon",
    prompt: "What does “embodied carbon” refer to?",
    options: [
      "Emissions from making, moving and installing materials",
      "Emissions from running a building's HVAC",
      "Carbon captured by trees on site",
      "A building's total occupant commute footprint",
    ],
    correct: 0,
    fact: "Embodied carbon is locked in before a building even opens — which is why material choices at spec time matter so much.",
    category: "carbon",
  },
  {
    id: "cement-share",
    prompt: "Cement production is responsible for roughly what share of global CO₂ emissions?",
    options: ["About 8%", "About 1%", "About 25%", "About 45%"],
    correct: 0,
    fact: "If cement were a country, it would be the third-largest CO₂ emitter on Earth — behind only China and the USA.",
    category: "carbon",
  },
  {
    id: "epd",
    prompt: "In sustainable sourcing, what does “EPD” stand for?",
    options: [
      "Environmental Product Declaration",
      "Energy Performance Directive",
      "Emissions Prevention Document",
      "Extended Producer Duty",
    ],
    correct: 0,
    fact: "An EPD is like a nutrition label for a product's environmental impact — third-party verified and standardized.",
    category: "certifications",
  },
  {
    id: "fsc",
    prompt: "FSC certification is primarily associated with which material?",
    options: ["Wood and timber", "Structural steel", "Portland cement", "Float glass"],
    correct: 0,
    fact: "FSC — the Forest Stewardship Council — certifies wood from responsibly managed forests.",
    category: "certifications",
  },
  {
    id: "leed",
    prompt: "What does the green-building rating system “LEED” stand for?",
    options: [
      "Leadership in Energy and Environmental Design",
      "Low Emission Energy Directive",
      "Lifecycle Efficiency & Emissions Data",
      "Licensed Environmental Engineering Design",
    ],
    correct: 0,
    fact: "LEED is run by the U.S. Green Building Council and is one of the most widely used green-building rating systems in the world.",
    category: "certifications",
  },
  {
    id: "scm",
    prompt: "Which byproduct is commonly used to replace part of the cement in lower-carbon concrete?",
    options: ["Fly ash", "Beach sand", "Crushed granite", "Rebar filings"],
    correct: 0,
    fact: "Fly ash (from coal plants) and slag (from steelmaking) can replace a big chunk of cement clinker — the part that emits the most CO₂.",
    category: "materials",
  },
  {
    id: "clt",
    prompt: "Why is cross-laminated timber (CLT / “mass timber”) considered low-carbon?",
    options: [
      "The wood stores carbon that trees pulled from the air",
      "It is made without any energy at all",
      "It reflects sunlight to cool the planet",
      "It emits more CO₂ than steel but is cheaper",
    ],
    correct: 0,
    fact: "A single mass-timber building can store hundreds of tonnes of CO₂ in its structure for the life of the building.",
    category: "materials",
  },
  {
    id: "buildings-share",
    prompt: "Roughly what share of global energy-related CO₂ emissions comes from the buildings sector?",
    options: ["About 37%", "About 5%", "About 15%", "About 70%"],
    correct: 0,
    fact: "The UN puts buildings and construction at ~37% of energy-related emissions — the single biggest slice of the pie.",
    category: "buildings",
  },
  {
    id: "r-value",
    prompt: "A material's “R-value” measures its…",
    options: [
      "Resistance to heat flow (insulating ability)",
      "Percentage of recycled content",
      "Fire-resistance rating",
      "Embodied carbon per kilogram",
    ],
    correct: 0,
    fact: "Higher R-value = better insulation. It's one of the cheapest ways to cut a building's operational carbon.",
    category: "buildings",
  },
  {
    id: "bamboo",
    prompt: "Which of these is considered a “rapidly renewable” material?",
    options: ["Bamboo", "Old-growth oak", "Granite", "PVC"],
    correct: 0,
    fact: "Some bamboo species grow almost a metre a day, making them one of the fastest-renewing building materials on Earth.",
    category: "materials",
  },
  {
    id: "voc",
    prompt: "Choosing low-VOC paints and adhesives mainly improves…",
    options: [
      "Indoor air quality",
      "Structural strength",
      "A wall's R-value",
      "Concrete cure time",
    ],
    correct: 0,
    fact: "VOCs (volatile organic compounds) off-gas indoors. Low-VOC products help keep the air people actually breathe healthier.",
    category: "buildings",
  },
  {
    id: "operational-carbon",
    prompt: "“Operational carbon” refers to emissions from…",
    options: [
      "The energy used to run a building over its life",
      "Manufacturing the building's materials",
      "Demolishing the building at end of life",
      "Delivering materials to the site",
    ],
    correct: 0,
    fact: "As grids get cleaner and buildings get efficient, operational carbon shrinks — pushing embodied carbon into the spotlight.",
    category: "carbon",
  },
  {
    id: "embodied-share-growth",
    prompt: "As buildings become more energy-efficient, the relative importance of embodied carbon…",
    options: ["Increases", "Drops to zero", "Stays exactly the same", "Becomes negative"],
    correct: 0,
    fact: "For a new efficient building, embodied carbon can be over half of its total emissions over the coming decades.",
    category: "carbon",
  },
  {
    id: "aluminium",
    prompt: "Which metal is very energy-intensive to produce from ore, yet saves ~95% of that energy when recycled?",
    options: ["Aluminium", "Lead", "Tin", "Zinc"],
    correct: 0,
    fact: "Recycling aluminium uses about 5% of the energy of making it new — recycled content is a huge lever for this material.",
    category: "materials",
  },
  {
    id: "c2c",
    prompt: "Cradle to Cradle Certified® evaluates products mainly for…",
    options: [
      "Safe, circular material reuse",
      "Lowest possible purchase price",
      "Fastest shipping speed",
      "Highest compressive strength",
    ],
    correct: 0,
    fact: "Cradle to Cradle asks a simple question: at end of life, can this product safely become something new instead of landfill?",
    category: "certifications",
  },
  {
    id: "green-roof",
    prompt: "Green roofs help cities mainly by…",
    options: [
      "Reducing stormwater runoff and the urban heat-island effect",
      "Increasing glare for neighbours",
      "Raising a building's heating load",
      "Blocking all rooftop solar potential",
    ],
    correct: 0,
    fact: "A living roof soaks up rain and shades the building — cooling the city and easing pressure on storm drains.",
    category: "buildings",
  },
  {
    id: "clinker",
    prompt: "The biggest source of CO₂ in Portland cement comes from…",
    options: [
      "Heating limestone into clinker (calcination)",
      "Adding water during mixing",
      "Trucking it to the job site",
      "Letting it cure on site",
    ],
    correct: 0,
    fact: "Roughly 60% of cement's emissions come from the chemistry of calcination itself — not just the fuel burned.",
    category: "carbon",
  },
  {
    id: "steel-recycle",
    prompt: "Steel is a favourite of green specs partly because it is…",
    options: [
      "One of the most recycled materials in the world",
      "Fully biodegradable in soil",
      "Naturally carbon-negative",
      "Impossible to reuse",
    ],
    correct: 0,
    fact: "Steel can be recycled endlessly without losing quality — much of today's new steel already contains recycled scrap.",
    category: "materials",
  },
  {
    id: "hvac",
    prompt: "In a typical commercial building, the single largest energy end-use is usually…",
    options: ["Heating and cooling (HVAC)", "Elevators", "Digital signage", "Door locks"],
    correct: 0,
    fact: "HVAC often dominates a commercial building's energy bill — which is why insulation and glazing choices pay off fast.",
    category: "buildings",
  },
  {
    id: "embodied-energy",
    prompt: "A material's “embodied energy” is…",
    options: [
      "All the energy used to extract, make and deliver it",
      "The energy it will save over its life",
      "The heat it releases if burned",
      "Its measured R-value",
    ],
    correct: 0,
    fact: "Embodied energy and embodied carbon go hand in hand — cutting one usually cuts the other.",
    category: "carbon",
  },
  {
    id: "breeam",
    prompt: "Which of these is a green-building certification (like LEED) that started in the UK?",
    options: ["BREEAM", "ISO 9001", "OSHA 30", "ASTM A36"],
    correct: 0,
    fact: "BREEAM launched in 1990, making it one of the world's first green-building rating systems.",
    category: "certifications",
  },
  {
    id: "recycled-vs-renewable",
    prompt: "A material made from post-consumer waste is best described as having high…",
    options: ["Recycled content", "Rapidly renewable content", "Thermal mass", "Albedo"],
    correct: 0,
    fact: "“Recycled content” diverts waste from landfill; “rapidly renewable” means it regrows fast. Green specs love both.",
    category: "materials",
  },
];
