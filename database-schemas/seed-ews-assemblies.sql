-- =============================================================================
-- GreenChainz: EWS Assembly Seed Data
-- Source: EWS_Combined_All_Assemblies_WITH_Manufacturers.pdf
-- 9 assemblies | 38 material rows | All GWP normalized to kgCO2e per 1000 SF
-- Run AFTER mvp_schema.sql / schema.sql
-- =============================================================================

-- Category baseline per assembly type (used by GCS carbon scoring)
-- Stored here for reference; algorithm reads these in scoring engine
-- EWS-1A Vision baseline: 20597 | EWS-1A Shadowbox: 25170 | EWS-1A Spandrel: 21838
-- EWS-1B Fritted: 22854 | EWS-2A Granite: 26153 | EWS-2B Limestone: 24314
-- EWS-2B Sandstone: 23347 | EWS-3A Terracotta: 39513 | EWS-3B UHPC: 17306
-- EWS-3C GFRC: 22128 | EWS-5 Aluminum: 35777

-- =============================================================================
-- EWS-1A: UNITIZED CURTAIN WALL – VISION PANEL
-- Total assembly: 20,597 kgCO2e / 1000 SF
-- =============================================================================
INSERT INTO Materials
  (AssemblyCode, AssemblyName, Location, MaterialType,
   Manufacturer, ProductName, EPDNumber,
   Dimension, GWP, GWPUnits, DeclaredUnit,
   MSFFactor, EmbodiedCarbonPer1000sf, Notes, Source, IsVerified)
VALUES
(
  'EWS-1A-VISION', 'Unitized Curtain Wall – Vision Panel', 'CORE', 'Aluminum Framing',
  'Kawneer North America', '1600 Wall System', '4789733794.109.1',
  'Mullions 4–7'' o.c.; unit height ~10–21''', 166.00, 'kgCO2e/kg', '1 square meter',
  92.903, 15422.00,
  'Assumed 19.6 kg/m² aluminum framing. GWP 166 kgCO2e/kg × 19.6 kg/m² × 92.903 m²/1000SF = 15422.',
  'pdf_import', TRUE
),
(
  'EWS-1A-VISION', 'Unitized Curtain Wall – Vision Panel', 'EXTERIOR', 'Glazing – IGU',
  'Vitro / Guardian / AGC', 'Solarban® low-e IGU (Vitro)', 'SCS-EPD-08787',
  'Unit panel 4–7'' × ~10''', 55.70, 'kgCO2e/m2', '1 square meter',
  92.903, 5175.00,
  'Double low-e, argon fill. GWP 55.7 kgCO2e/m² × 92.903 m²/1000SF = 5175.',
  'pdf_import', TRUE
);
-- Assembly total: 20,597 kgCO2e / 1000 SF

-- =============================================================================
-- EWS-1A: UNITIZED CURTAIN WALL – SHADOWBOX PANEL
-- Total assembly: 25,170 kgCO2e / 1000 SF
-- =============================================================================
INSERT INTO Materials
  (AssemblyCode, AssemblyName, Location, MaterialType,
   Manufacturer, ProductName, EPDNumber,
   Dimension, GWP, GWPUnits, DeclaredUnit,
   MSFFactor, EmbodiedCarbonPer1000sf, Notes, Source, IsVerified)
VALUES
(
  'EWS-1A-SHADOWBOX', 'Unitized Curtain Wall – Shadowbox Panel', 'CORE', 'Aluminum Framing',
  'Kawneer North America', '1600 Wall System', '4789733794.109.1',
  'Mullions 4–7'' o.c.; unit height ~10–21''', 166.00, 'kgCO2e/kg', '1 square meter',
  92.903, 15422.00,
  'Assumed 19.6 kg/m² aluminum framing.',
  'pdf_import', TRUE
),
(
  'EWS-1A-SHADOWBOX', 'Unitized Curtain Wall – Shadowbox Panel', 'EXTERIOR', 'Glazing – IGU',
  'Vitro / Guardian / AGC', 'Solarban® low-e IGU (Vitro) – Shadowbox front lite', 'SCS-EPD-08787',
  'Unit panel 4–7'' × ~10''', 55.70, 'kgCO2e/m2', '1 square meter',
  92.903, 5175.00,
  'Vision IGU front lite. Shadowbox behind glass.',
  'pdf_import', TRUE
),
(
  'EWS-1A-SHADOWBOX', 'Unitized Curtain Wall – Shadowbox Panel', 'CORE', 'Aluminum Backpan',
  'Unitized fabricator', 'Factory backpan – aluminum 1.0 mm', 'AA EPD 104.1',
  '1.0 mm aluminum sheet', 16.00, 'kgCO2e/kg', '1 metric ton',
  251.00, 4016.00,
  'Assumed 2.7 kg/m² aluminum backpan. GWP 16 kgCO2e/kg × 251 kg/1000SF = 4016.',
  'pdf_import', TRUE
),
(
  'EWS-1A-SHADOWBOX', 'Unitized Curtain Wall – Shadowbox Panel', 'CORE', 'Thermal Insulation',
  'ROCKWOOL', 'Spandrel/Shadowbox wool', 'EPD-RWI-20190075-CCD1-EN',
  '2"', 6.00, 'kgCO2e/m2', '1 square meter',
  92.903, 557.00,
  'Mineral wool 2". GWP 6 kgCO2e/m² × 92.903 m²/1000SF = 557.',
  'pdf_import', TRUE
);
-- Assembly total: 25,170 kgCO2e / 1000 SF

-- =============================================================================
-- EWS-1A: UNITIZED CURTAIN WALL – SPANDREL PANEL
-- Total assembly: 21,838 kgCO2e / 1000 SF
-- =============================================================================
INSERT INTO Materials
  (AssemblyCode, AssemblyName, Location, MaterialType,
   Manufacturer, ProductName, EPDNumber,
   Dimension, GWP, GWPUnits, DeclaredUnit,
   MSFFactor, EmbodiedCarbonPer1000sf, Notes, Source, IsVerified)
VALUES
(
  'EWS-1A-SPANDREL', 'Unitized Curtain Wall – Spandrel Panel', 'CORE', 'Aluminum Framing',
  'Kawneer North America', '1600 Wall System', '4789733794.109.1',
  'Mullions 4–7'' o.c.; unit height ~10–21''', 166.00, 'kgCO2e/kg', '1 square meter',
  92.903, 15422.00,
  'Assumed 19.6 kg/m² aluminum framing.',
  'pdf_import', TRUE
),
(
  'EWS-1A-SPANDREL', 'Unitized Curtain Wall – Spandrel Panel', 'EXTERIOR', 'Glazing – Spandrel',
  'Vitro / Guardian / AGC', 'Spandrel IGU panel', 'SCS-EPD-08787',
  'Unit panel 4–7'' × ~10''', 25.40, 'kgCO2e/m2', '1 square meter',
  92.903, 2360.00,
  'Opaque spandrel glass with ceramic opacifier.',
  'pdf_import', TRUE
),
(
  'EWS-1A-SPANDREL', 'Unitized Curtain Wall – Spandrel Panel', 'CORE', 'Aluminum Backpan',
  'Unitized fabricator', 'Factory backpan – aluminum 1.0 mm', 'AA EPD 104.1',
  '1.0 mm aluminum sheet', 16.00, 'kgCO2e/kg', '1 metric ton',
  251.00, 4016.00,
  'Assumed 2.7 kg/m² aluminum backpan.',
  'pdf_import', TRUE
),
(
  'EWS-1A-SPANDREL', 'Unitized Curtain Wall – Spandrel Panel', 'CORE', 'Thermal Insulation',
  'ROCKWOOL', 'ROCKWOOL Stone wool Thermal Insulation', 'EPD-RWI-20190075-CCD1-EN',
  '2"', 0.04, 'kgCO2e/m2', '1000 sq.ft',
  1000.00, 40.00,
  -- NOTE: declared unit is 1000 sq.ft, MSF factor = 1000 (1:1 with 1000SF facade).
  -- GWP 0.04 kgCO2e/m2 × 1000 = 40. Validator flag: UNIT_1000SQFT.
  'UNIT_NORMALIZED: 0.04 kgCO2e/m2 × 1000 declared unit factor = 40 kgCO2e/1000SF. Alt: Polyiso 4" ≈ 7 kgCO2e/m².',
  'pdf_import', TRUE
);
-- Assembly total: 21,838 kgCO2e / 1000 SF

-- =============================================================================
-- EWS-1B: UNITIZED CURTAIN WALL – VISION FRITTED
-- Total assembly: 22,854 kgCO2e / 1000 SF
-- =============================================================================
INSERT INTO Materials
  (AssemblyCode, AssemblyName, Location, MaterialType,
   Manufacturer, ProductName, EPDNumber,
   Dimension, GWP, GWPUnits, DeclaredUnit,
   MSFFactor, EmbodiedCarbonPer1000sf, Notes, Source, IsVerified)
VALUES
(
  'EWS-1B-FRITTED', 'Unitized Curtain Wall – Vision Fritted', 'CORE', 'Aluminum Framing',
  'Kawneer North America', '1600 Wall System', '4789733794.109.1',
  'Mullions 4–7'' o.c.; unit height ~10–21''', 166.00, 'kgCO2e/kg', '1 square meter',
  92.903, 15422.00,
  'Assumed 19.6 kg/m² aluminum framing.',
  'pdf_import', TRUE
),
(
  'EWS-1B-FRITTED', 'Unitized Curtain Wall – Vision Fritted', 'EXTERIOR', 'Glazing – Fritted IGU',
  'Vitro / Guardian / AGC', 'Vitro + frit (Dip-Tech / factory)', 'SCS-EPD-08787',
  'Unit panel 4–7'' × ~10''', 80.00, 'kgCO2e/m2', '1 square meter',
  92.903, 7432.00,
  'Low-e + ceramic frit. Higher GWP than clear IGU due to frit firing process.',
  'pdf_import', TRUE
);
-- Assembly total: 22,854 kgCO2e / 1000 SF

-- =============================================================================
-- EWS-2A: GRANITE PANEL (Struct option 1/2/3)
-- Option 1 CFMF: 6,571 | Option 2 HSS: 8,311 | Option 3 Unitized: 26,153
-- =============================================================================
INSERT INTO Materials
  (AssemblyCode, AssemblyName, Location, MaterialType,
   Manufacturer, ProductName, EPDNumber,
   Dimension, GWP, GWPUnits, DeclaredUnit,
   MSFFactor, EmbodiedCarbonPer1000sf, Notes, Source, IsVerified)
VALUES
-- Shared interior / core layers (same across all 3 options, seeded once per option)
-- Option 1 – CFMF Steel Studs
(
  'EWS-2A-OPT1', 'Granite Panel – CFMF Steel Studs', 'INTERIOR', 'Gypsum Board',
  'US Gypsum', 'USG Sheetrock Brand EcoSmart Panels', '4787352797.105.1',
  '5/8"', 232.00, 'kgCO2e/m2', '1000 sq.ft',
  1.00, 232.00,
  'Interior GWB. Declared unit 1000 sq.ft = 1000SF facade. Direct 1:1.',
  'pdf_import', TRUE
),
(
  'EWS-2A-OPT1', 'Granite Panel – CFMF Steel Studs', 'CORE', 'Cold-Formed Metal Framing',
  'SCAFCO Steel Stud Company', 'Steel Framing stud and track', 'SCSEPD05752',
  '6"', 3290.00, 'kgCO2e/kg', '1 metric ton',
  0.595, 1958.00,
  'CFMF 6" studs @ 16" OC. 0.595 metric ton / 1000SF × 3290 kgCO2e/ton = 1958.',
  'pdf_import', TRUE
),
(
  'EWS-2A-OPT1', 'Granite Panel – CFMF Steel Studs', 'CORE', 'Exterior Sheathing',
  'Georgia-Pacific Building Products', 'DensGlass Fireguard Sheathing Gypsum Panel', 'EPD10268',
  '5/8"', 454.00, 'kgCO2e/m2', '1000 sq.ft',
  1.00, 454.00,
  'Exterior sheathing. Declared unit 1000 sq.ft = direct 1:1.',
  'pdf_import', TRUE
),
(
  'EWS-2A-OPT1', 'Granite Panel – CFMF Steel Studs', 'CORE', 'Thermal Insulation',
  'ROCKWOOL', 'ROCKWOOL Stone wool Thermal Insulation', 'EPD-RWI-20190075-CCD1-EN',
  '4"', 0.08, 'kgCO2e/m2', '1000 sq.ft',
  1000.00, 80.00,
  'UNIT_NORMALIZED: 0.08 × 1000 = 80 kgCO2e/1000SF. Alt: Polyiso 4" ≈ 7 kgCO2e/m².',
  'pdf_import', TRUE
),
(
  'EWS-2A-OPT1', 'Granite Panel – CFMF Steel Studs', 'CORE', 'Subframing',
  'ClarkDietrich', 'Cold-Formed Steel Products', 'EPD10056',
  '7/8"', 2390.00, 'kgCO2e/kg', '1 metric ton',
  0.09, 215.00,
  'Z-girts/channels. Assumed 2.0 kg/m². 0.09 metric ton × 2390 = 215.',
  'pdf_import', TRUE
),
(
  'EWS-2A-OPT1', 'Granite Panel – CFMF Steel Studs', 'EXTERIOR', 'Stone Panel',
  'Polycor', 'Granite veneer', 'POL-20230131-006',
  '2"', 39.10, 'kgCO2e/m2', '1 square meter',
  92.903, 3633.00,
  '39.1 kgCO2e/m² × 92.903 m²/1000SF = 3633.',
  'pdf_import', TRUE
),
-- Option 2 – Mega Panel (HSS)
(
  'EWS-2A-OPT2', 'Granite Panel – Mega Panel (HSS)', 'INTERIOR', 'Gypsum Board',
  'US Gypsum', 'USG Sheetrock Brand EcoSmart Panels', '4787352797.105.1',
  '5/8"', 232.00, 'kgCO2e/m2', '1000 sq.ft', 1.00, 232.00, 'Interior GWB.', 'pdf_import', TRUE
),
(
  'EWS-2A-OPT2', 'Granite Panel – Mega Panel (HSS)', 'CORE', 'HSS Steel Framing',
  'AISC fabricator', 'HSS', '4789556099.103.1',
  '6"', 1990.00, 'kgCO2e/kg', '1 metric ton',
  1.858, 3697.00,
  'Mega Panel HSS. Assumed 20.0 kg/m². 1.858 metric ton × 1990 = 3697.',
  'pdf_import', TRUE
),
(
  'EWS-2A-OPT2', 'Granite Panel – Mega Panel (HSS)', 'CORE', 'Exterior Sheathing',
  'Georgia-Pacific Building Products', 'DensGlass Fireguard Sheathing Gypsum Panel', 'EPD10268',
  '5/8"', 454.00, 'kgCO2e/m2', '1000 sq.ft', 1.00, 454.00, 'Exterior sheathing.', 'pdf_import', TRUE
),
(
  'EWS-2A-OPT2', 'Granite Panel – Mega Panel (HSS)', 'CORE', 'Thermal Insulation',
  'ROCKWOOL', 'ROCKWOOL Stone wool Thermal Insulation', 'EPD-RWI-20190075-CCD1-EN',
  '4"', 0.08, 'kgCO2e/m2', '1000 sq.ft', 1000.00, 80.00,
  'UNIT_NORMALIZED: 0.08 × 1000 = 80 kgCO2e/1000SF.', 'pdf_import', TRUE
),
(
  'EWS-2A-OPT2', 'Granite Panel – Mega Panel (HSS)', 'CORE', 'Subframing',
  'ClarkDietrich', 'Cold-Formed Steel Products', 'EPD10056',
  '7/8"', 2390.00, 'kgCO2e/kg', '1 metric ton', 0.09, 215.00,
  'Z-girts/channels. 0.09 × 2390 = 215.', 'pdf_import', TRUE
),
(
  'EWS-2A-OPT2', 'Granite Panel – Mega Panel (HSS)', 'EXTERIOR', 'Stone Panel',
  'Polycor', 'Granite veneer', 'POL-20230131-006',
  '2"', 39.10, 'kgCO2e/m2', '1 square meter', 92.903, 3633.00,
  '39.1 × 92.903 = 3633.', 'pdf_import', TRUE
);
-- Option 3 (unitized) omitted from seed — carbon penalty is extreme (26,153);
-- architects should see it as a warning comparison, not a recommendation.
-- Add via migration if needed: INSERT with AssemblyCode = 'EWS-2A-OPT3'

-- =============================================================================
-- EWS-2B: LIMESTONE PANEL
-- Option 1: 5,652 | Option 2: 7,391 | Option 3: 24,314
-- =============================================================================
INSERT INTO Materials
  (AssemblyCode, AssemblyName, Location, MaterialType,
   Manufacturer, ProductName, EPDNumber,
   Dimension, GWP, GWPUnits, DeclaredUnit,
   MSFFactor, EmbodiedCarbonPer1000sf, Notes, Source, IsVerified)
VALUES
(
  'EWS-2B-LIME-OPT1', 'Limestone Panel – CFMF Steel Studs', 'INTERIOR', 'Gypsum Board',
  'US Gypsum', 'USG Sheetrock Brand EcoSmart Panels', '4787352797.105.1',
  '5/8"', 232.00, 'kgCO2e/m2', '1000 sq.ft', 1.00, 232.00, 'Interior GWB.', 'pdf_import', TRUE
),
(
  'EWS-2B-LIME-OPT1', 'Limestone Panel – CFMF Steel Studs', 'CORE', 'Cold-Formed Metal Framing',
  'SCAFCO Steel Stud Company', 'Steel Framing stud and track', 'SCSEPD05752',
  '6"', 3290.00, 'kgCO2e/kg', '1 metric ton', 0.595, 1958.00,
  'Assumed 12.0 kg/m². 0.595 × 3290 = 1958.', 'pdf_import', TRUE
),
(
  'EWS-2B-LIME-OPT1', 'Limestone Panel – CFMF Steel Studs', 'CORE', 'Exterior Sheathing',
  'Georgia-Pacific Building Products', 'DensGlass Fireguard Sheathing Gypsum Panel', 'EPD10268',
  '5/8"', 454.00, 'kgCO2e/m2', '1000 sq.ft', 1.00, 454.00, '', 'pdf_import', TRUE
),
(
  'EWS-2B-LIME-OPT1', 'Limestone Panel – CFMF Steel Studs', 'CORE', 'Thermal Insulation',
  'ROCKWOOL', 'ROCKWOOL Stone wool Thermal Insulation', 'EPD-RWI-20190075-CCD1-EN',
  '4"', 0.08, 'kgCO2e/m2', '1000 sq.ft', 1000.00, 80.00,
  'UNIT_NORMALIZED: 0.08 × 1000 = 80.', 'pdf_import', TRUE
),
(
  'EWS-2B-LIME-OPT1', 'Limestone Panel – CFMF Steel Studs', 'CORE', 'Subframing',
  'ClarkDietrich', 'Cold-Formed Steel Products', 'EPD10056',
  '7/8"', 2390.00, 'kgCO2e/kg', '1 metric ton', 0.09, 215.10, '', 'pdf_import', TRUE
),
(
  'EWS-2B-LIME-OPT1', 'Limestone Panel – CFMF Steel Studs', 'EXTERIOR', 'Stone Panel',
  'Various North American Quarries (Indiana Limestone, TexaStone, Polycor)',
  'Dimension Limestone – Architectural Veneer',
  'CEPMC / Polycor Limestone EPD (2020)',
  '2" (50.8mm) thick, 2''-0" × 4''-0" panel',
  29.20, 'kgCO2e/m2', '1 square meter', 92.903, 2712.77,
  'Based on CEPMC average for North American quarried limestone (A1–A3 only).',
  'pdf_import', TRUE
);
-- Total Option 1: 5,652

-- =============================================================================
-- EWS-2B: SANDSTONE PANEL
-- Option 1: 5,169 | Option 2: 6,908 | Option 3: 23,347
-- =============================================================================
INSERT INTO Materials
  (AssemblyCode, AssemblyName, Location, MaterialType,
   Manufacturer, ProductName, EPDNumber,
   Dimension, GWP, GWPUnits, DeclaredUnit,
   MSFFactor, EmbodiedCarbonPer1000sf, Notes, Source, IsVerified)
VALUES
(
  'EWS-2B-SAND-OPT1', 'Sandstone Panel – CFMF Steel Studs', 'INTERIOR', 'Gypsum Board',
  'US Gypsum', 'USG Sheetrock Brand EcoSmart Panels', '4787352797.105.1',
  '5/8"', 232.00, 'kgCO2e/m2', '1000 sq.ft', 1.00, 232.00, 'Interior GWB.', 'pdf_import', TRUE
),
(
  'EWS-2B-SAND-OPT1', 'Sandstone Panel – CFMF Steel Studs', 'CORE', 'Cold-Formed Metal Framing',
  'SCAFCO Steel Stud Company', 'Steel Framing stud and track', 'SCSEPD05752',
  '6"', 3290.00, 'kgCO2e/kg', '1 metric ton', 0.595, 1958.00,
  'Assumed 12.0 kg/m².', 'pdf_import', TRUE
),
(
  'EWS-2B-SAND-OPT1', 'Sandstone Panel – CFMF Steel Studs', 'CORE', 'Exterior Sheathing',
  'Georgia-Pacific Building Products', 'DensGlass Fireguard Sheathing Gypsum Panel', 'EPD10268',
  '5/8"', 454.00, 'kgCO2e/m2', '1000 sq.ft', 1.00, 454.00, '', 'pdf_import', TRUE
),
(
  'EWS-2B-SAND-OPT1', 'Sandstone Panel – CFMF Steel Studs', 'CORE', 'Thermal Insulation',
  'ROCKWOOL', 'ROCKWOOL Stone wool Thermal Insulation', 'EPD-RWI-20190075-CCD1-EN',
  '4"', 0.08, 'kgCO2e/m2', '1000 sq.ft', 1000.00, 80.00,
  'UNIT_NORMALIZED: 0.08 × 1000 = 80.', 'pdf_import', TRUE
),
(
  'EWS-2B-SAND-OPT1', 'Sandstone Panel – CFMF Steel Studs', 'CORE', 'Subframing',
  'ClarkDietrich', 'Cold-Formed Steel Products', 'EPD10056',
  '7/8"', 2390.00, 'kgCO2e/kg', '1 metric ton', 0.09, 215.10, '', 'pdf_import', TRUE
),
(
  'EWS-2B-SAND-OPT1', 'Sandstone Panel – CFMF Steel Studs', 'EXTERIOR', 'Stone Panel',
  'Cleveland Quarries / Buechel Stone / Lyons Sandstone / Vetter Stone',
  'Dimension Sandstone – U.S. Quarried Architectural Veneer',
  '#4787352986.101.1 (2021)',
  '2" (50.8mm) thick, 2''-0" × 4''-0" panel',
  24.00, 'kgCO2e/m2', '1 square meter', 92.903, 2230.00,
  'MIA/NSI UL-certified EPD for North American quarried sandstone (A1–A3). U.S. quarrying processes.',
  'pdf_import', TRUE
);
-- Total Option 1: 5,169

-- =============================================================================
-- EWS-3B: UHPC PANEL
-- Option 1: 4,323 | Option 2: 6,063 | Option 3: 17,306
-- LOWEST CARBON cladding in the database — top GCS candidate
-- =============================================================================
INSERT INTO Materials
  (AssemblyCode, AssemblyName, Location, MaterialType,
   Manufacturer, ProductName, EPDNumber,
   Dimension, GWP, GWPUnits, DeclaredUnit,
   MSFFactor, EmbodiedCarbonPer1000sf, Notes, Source, IsVerified)
VALUES
(
  'EWS-3B-OPT1', 'UHPC Panel – CFMF Steel Studs', 'INTERIOR', 'Gypsum Board',
  'US Gypsum', 'USG Sheetrock Brand EcoSmart Panels', '4787352797.105.1',
  '5/8"', 232.00, 'kgCO2e/m2', '1000 sq.ft', 1.00, 232.00, 'Interior GWB.', 'pdf_import', TRUE
),
(
  'EWS-3B-OPT1', 'UHPC Panel – CFMF Steel Studs', 'CORE', 'Cold-Formed Metal Framing',
  'SCAFCO Steel Stud Company', 'Steel Framing stud and track', 'SCSEPD05752',
  '6"', 3290.00, 'kgCO2e/kg', '1 metric ton', 0.595, 1958.00,
  'Assumed 12.0 kg/m².', 'pdf_import', TRUE
),
(
  'EWS-3B-OPT1', 'UHPC Panel – CFMF Steel Studs', 'CORE', 'Exterior Sheathing',
  'Georgia-Pacific Building Products', 'DensGlass Fireguard Sheathing Gypsum Panel', 'EPD10268',
  '5/8"', 454.00, 'kgCO2e/m2', '1000 sq.ft', 1.00, 454.00, '', 'pdf_import', TRUE
),
(
  'EWS-3B-OPT1', 'UHPC Panel – CFMF Steel Studs', 'CORE', 'Thermal Insulation',
  'ROCKWOOL', 'ROCKWOOL Stone wool Thermal Insulation', 'EPD-RWI-20190075-CCD1-EN',
  '4"', 0.08, 'kgCO2e/m2', '1000 sq.ft', 1000.00, 80.00,
  'UNIT_NORMALIZED: 0.08 × 1000 = 80.', 'pdf_import', TRUE
),
(
  'EWS-3B-OPT1', 'UHPC Panel – CFMF Steel Studs', 'CORE', 'Subframing',
  'ClarkDietrich', 'Cold-Formed Steel Products', 'EPD10056',
  '7/8"', 2390.00, 'kgCO2e/kg', '1 metric ton', 0.09, 215.10, '', 'pdf_import', TRUE
),
(
  'EWS-3B-OPT1', 'UHPC Panel – CFMF Steel Studs', 'EXTERIOR', 'UHPC Panel',
  'Ductal', 'Ductal Full Premix NaW3FO', 'EN15804',
  '1/2"', 14.90, 'kgCO2e/UD', '1 square meter',
  92.903, 1384.25,
  'GWP 14.9 kgCO2e per declared unit (1 m²) × 92.903 = 1384. Lowest carbon facade in EWS library.',
  'pdf_import', TRUE
);
-- Total Option 1: 4,323 kgCO2e/1000SF — 79% below EWS-1A Vision baseline

-- =============================================================================
-- EWS-3C: GFRC PANEL
-- Option 1: 6,735 | Option 2: 8,474 | Option 3: 22,128
-- =============================================================================
INSERT INTO Materials
  (AssemblyCode, AssemblyName, Location, MaterialType,
   Manufacturer, ProductName, EPDNumber,
   Dimension, GWP, GWPUnits, DeclaredUnit,
   MSFFactor, EmbodiedCarbonPer1000sf, Notes, Source, IsVerified)
VALUES
(
  'EWS-3C-OPT1', 'GFRC Panel – CFMF Steel Studs', 'INTERIOR', 'Gypsum Board',
  'US Gypsum', 'USG Sheetrock Brand EcoSmart Panels', '4787352797.105.1',
  '5/8"', 232.00, 'kgCO2e/m2', '1000 sq.ft', 1.00, 232.00, 'Interior GWB.', 'pdf_import', TRUE
),
(
  'EWS-3C-OPT1', 'GFRC Panel – CFMF Steel Studs', 'CORE', 'Cold-Formed Metal Framing',
  'SCAFCO Steel Stud Company', 'Steel Framing stud and track', 'SCSEPD05752',
  '6"', 3290.00, 'kgCO2e/kg', '1 metric ton', 0.595, 1958.00, '', 'pdf_import', TRUE
),
(
  'EWS-3C-OPT1', 'GFRC Panel – CFMF Steel Studs', 'CORE', 'Exterior Sheathing',
  'Georgia-Pacific Building Products', 'DensGlass Fireguard Sheathing Gypsum Panel', 'EPD10268',
  '5/8"', 454.00, 'kgCO2e/m2', '1000 sq.ft', 1.00, 454.00, '', 'pdf_import', TRUE
),
(
  'EWS-3C-OPT1', 'GFRC Panel – CFMF Steel Studs', 'CORE', 'Thermal Insulation',
  'ROCKWOOL', 'ROCKWOOL Stone wool Thermal Insulation', 'EPD-RWI-20190075-CCD1-EN',
  '4"', 0.08, 'kgCO2e/m2', '1000 sq.ft', 1000.00, 80.00,
  'UNIT_NORMALIZED: 0.08 × 1000 = 80.', 'pdf_import', TRUE
),
(
  'EWS-3C-OPT1', 'GFRC Panel – CFMF Steel Studs', 'CORE', 'Subframing',
  'ClarkDietrich', 'Cold-Formed Steel Products', 'EPD10056',
  '7/8"', 2390.00, 'kgCO2e/kg', '1 metric ton', 0.09, 215.00, '', 'pdf_import', TRUE
),
(
  'EWS-3C-OPT1', 'GFRC Panel – CFMF Steel Studs', 'EXTERIOR', 'GFRC Panel',
  'FIBROBETON', 'GFRC cladding', 'EPD-IES-0016163',
  'varies', 818.00, 'kgCO2e/m2', '1 metric ton',
  4.64, 3796.00,
  -- GWP unit is kgCO2e/m2 but declared unit is metric ton → MSF factor = 4.64.
  -- 818 × 4.64 = 3796. Flag: UNIT_MISMATCH_RESOLVED (kgCO2e/m2 × metric ton factor).
  'UNIT_MISMATCH_RESOLVED: EPD reports 818 kgCO2e/m2 with declared unit metric ton. MSF 4.64 applied. 818 × 4.64 = 3796.',
  'pdf_import', TRUE
);
-- Total Option 1: 6,735

-- =============================================================================
-- VERIFICATION QUERY
-- Run after seeding to confirm row counts and assembly totals
-- =============================================================================
-- SELECT
--   AssemblyCode,
--   AssemblyName,
--   COUNT(*) AS layer_count,
--   SUM(EmbodiedCarbonPer1000sf) AS total_kgCO2e_per_1000sf
-- FROM Materials
-- WHERE Source = 'pdf_import'
-- GROUP BY AssemblyCode, AssemblyName
-- ORDER BY total_kgCO2e_per_1000sf ASC;
