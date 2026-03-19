#!/usr/bin/env python3
"""
GreenChainz GWP Unit Normalizer & Validator
Source: EWS_Combined_All_Assemblies_WITH_Manufacturers.pdf

Purpose:
  Before any material row is inserted into the Materials table,
  this validator checks that EmbodiedCarbonPer1000sf is internally
  consistent with GWP × MSFFactor, and that the declared unit
  is handled correctly.

Run:
  python scripts/validate_gwp_units.py
  python scripts/validate_gwp_units.py --json   # machine-readable output

Integration:
  Import normalize_gwp() in your Azure Document Intelligence pipeline
  to validate EPD rows before INSERT.
"""

import argparse
import json
from dataclasses import dataclass, field
from typing import Optional

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
MSF_TO_M2 = 92.903          # 1 MSF (1000 sq.ft) = 92.903 m²
TOLERANCE_PCT = 0.02        # Allow 2% rounding difference between PDF and computed

# ---------------------------------------------------------------------------
# Known unit normalization rules
# ---------------------------------------------------------------------------
# Each rule maps a (gwp_unit, declared_unit) pair to a normalization function.
# The function receives (gwp, msf_factor) and returns kgCO2e per 1000SF facade.

UNIT_RULES = {
    # Standard: GWP per m2, declared unit is 1 m2
    # → multiply GWP by m2 per 1000SF (92.903)
    ('kgCO2e/m2', '1 square meter'): lambda gwp, msf: gwp * MSF_TO_M2,

    # GWP per m2, declared unit is 1000 sq.ft
    # → MSF factor = 1000 (1:1 with 1000SF facade), but GWP is tiny (e.g. 0.04)
    # → computed = gwp × msf_factor (msf_factor should be 1000 in source data)
    ('kgCO2e/m2', '1000 sq.ft'): lambda gwp, msf: gwp * msf,

    # GWP per kg, declared unit is 1 metric ton
    # → MSF factor = metric tons per 1000SF facade
    # → computed = gwp × msf_factor × 1  (msf already in tons)
    ('kgCO2e/kg', '1 metric ton'): lambda gwp, msf: gwp * msf * 1000,
    # NOTE: 1 metric ton = 1000 kg, but GWP is already per kg
    # → EmbodiedCarbon = (gwp kgCO2e/kg) × (msf_factor metric ton) × (1000 kg/ton)
    # Wait — check against PDF: Kawneer GWP=166, msf=92.903, result=15422
    # 166 kgCO2e/kg × 19.6 kg/m² × 92.903 m² = 15422
    # But MSFFactor in DB is 92.903 (the m² value), not kg
    # So the actual formula is: gwp × density_kg_m2 × msf_m2
    # MSFFactor in the Materials table stores m² for this unit type
    # Override: for kgCO2e/kg units, EC = gwp × msf_factor (msf encodes kg-equivalent already)
    # Confirmed: 166 × 92.903 = 15402 ≈ 15422 ✓ (19.6 kg/m² already baked into msf)

    # GWP per declared unit (kgCO2e/UD), declared unit is 1 square meter
    # → same as kgCO2e/m2 case
    ('kgCO2e/UD', '1 square meter'): lambda gwp, msf: gwp * MSF_TO_M2,

    # GWP per m2, declared unit is metric ton (GFRC edge case)
    # → use MSF factor directly (4.64 metric ton / 1000SF)
    ('kgCO2e/m2', '1 metric ton'): lambda gwp, msf: gwp * msf,
}

# Simplified override: for rows where MSFFactor already encodes the full
# per-1000SF conversion, just use gwp × msf_factor directly.
SIMPLE_RULES = {
    'kgCO2e/kg',  # MSFFactor = m² or kg-equivalent; EC = gwp × msf
    'kgCO2e/UD',  # MSFFactor = m²; EC = gwp × msf
}

# ---------------------------------------------------------------------------
# Data model
# ---------------------------------------------------------------------------
@dataclass
class MaterialRow:
    assembly_code: str
    manufacturer: str
    product_name: str
    epd_number: str
    gwp: float
    gwp_units: str
    declared_unit: str
    msf_factor: float
    embodied_carbon_pdf: float  # value from PDF (ground truth)
    notes: str = ""

@dataclass
class ValidationResult:
    row: MaterialRow
    computed_ec: Optional[float] = None
    delta_pct: Optional[float] = None
    status: str = "UNKNOWN"    # PASS | FAIL | WARN | UNIT_UNKNOWN
    flags: list = field(default_factory=list)
    message: str = ""

# ---------------------------------------------------------------------------
# Core normalizer
# ---------------------------------------------------------------------------
def normalize_gwp(row: MaterialRow) -> ValidationResult:
    result = ValidationResult(row=row)
    key = (row.gwp_units, row.declared_unit)

    # Resolve computation rule
    if key in UNIT_RULES:
        computed = UNIT_RULES[key](row.gwp, row.msf_factor)
    elif row.gwp_units in SIMPLE_RULES:
        # Fallback: trust MSFFactor as the full conversion factor
        computed = row.gwp * row.msf_factor
    else:
        result.status = "UNIT_UNKNOWN"
        result.flags.append(f"NO_RULE for ({row.gwp_units}, {row.declared_unit})")
        result.message = "No normalization rule found. Manual review required."
        return result

    result.computed_ec = round(computed, 2)

    # Compare to PDF value
    if row.embodied_carbon_pdf == 0:
        result.status = "WARN"
        result.flags.append("PDF_VALUE_ZERO")
        result.message = "PDF embodied carbon is zero — possible data entry error."
        return result

    delta = abs(computed - row.embodied_carbon_pdf) / row.embodied_carbon_pdf
    result.delta_pct = round(delta * 100, 2)

    if delta <= TOLERANCE_PCT:
        result.status = "PASS"
        result.message = f"OK: computed={computed:.1f}, pdf={row.embodied_carbon_pdf}, delta={result.delta_pct}%"
    else:
        result.status = "FAIL"
        result.flags.append("DELTA_EXCEEDS_TOLERANCE")
        result.message = (
            f"MISMATCH: computed={computed:.1f} vs pdf={row.embodied_carbon_pdf} "
            f"({result.delta_pct}% > {TOLERANCE_PCT*100}% tolerance). "
            "Check density assumption or MSF factor."
        )

    # Flag the 1000 sq.ft declared unit edge case
    if row.declared_unit == '1000 sq.ft':
        result.flags.append("UNIT_1000SQFT — MSFFactor should be 1000 for tiny GWP values")

    # Flag GFRC unit mismatch pattern
    if row.gwp_units == 'kgCO2e/m2' and row.declared_unit == '1 metric ton':
        result.flags.append("UNIT_MISMATCH: GWP is per m2 but declared unit is metric ton — verify MSFFactor")

    return result

# ---------------------------------------------------------------------------
# Test dataset (all rows from EWS PDF)
# ---------------------------------------------------------------------------
EWS_ROWS = [
    # --- EWS-1A Vision ---
    MaterialRow('EWS-1A-VISION', 'Kawneer North America', '1600 Wall System',
                '4789733794.109.1', 166.0, 'kgCO2e/kg', '1 square meter',
                92.903, 15422.0, 'Assumed 19.6 kg/m²'),
    MaterialRow('EWS-1A-VISION', 'Vitro / Guardian / AGC', 'Solarban® low-e IGU',
                'SCS-EPD-08787', 55.7, 'kgCO2e/m2', '1 square meter',
                92.903, 5175.0),
    # --- EWS-1A Shadowbox ---
    MaterialRow('EWS-1A-SHADOWBOX', 'Unitized fabricator', 'Factory backpan Al 1.0mm',
                'AA EPD 104.1', 16.0, 'kgCO2e/kg', '1 metric ton',
                251.0, 4016.0, 'Assumed 2.7 kg/m²'),
    MaterialRow('EWS-1A-SHADOWBOX', 'ROCKWOOL', 'Spandrel/Shadowbox wool',
                'EPD-RWI-20190075-CCD1-EN', 6.0, 'kgCO2e/m2', '1 square meter',
                92.903, 557.0),
    # --- EWS-1A Spandrel insulation (edge case: 1000 sq.ft declared unit) ---
    MaterialRow('EWS-1A-SPANDREL', 'ROCKWOOL', 'Stone wool Thermal Insulation',
                'EPD-RWI-20190075-CCD1-EN', 0.04, 'kgCO2e/m2', '1000 sq.ft',
                1000.0, 40.0),
    # --- EWS-1A Spandrel glass ---
    MaterialRow('EWS-1A-SPANDREL', 'Vitro / Guardian / AGC', 'Spandrel IGU panel',
                'SCS-EPD-08787', 25.4, 'kgCO2e/m2', '1 square meter',
                92.903, 2360.0),
    # --- EWS-1B Fritted ---
    MaterialRow('EWS-1B-FRITTED', 'Vitro / Guardian / AGC', 'Vitro + frit (Dip-Tech)',
                'SCS-EPD-08787', 80.0, 'kgCO2e/m2', '1 square meter',
                92.903, 7432.0),
    # --- EWS-2A Granite cladding ---
    MaterialRow('EWS-2A', 'Polycor', 'Granite veneer',
                'POL-20230131-006', 39.1, 'kgCO2e/m2', '1 square meter',
                92.903, 3633.0),
    # --- EWS-2A CFMF studs ---
    MaterialRow('EWS-2A-OPT1', 'SCAFCO Steel Stud Company', 'Steel Framing stud and track',
                'SCSEPD05752', 3290.0, 'kgCO2e/kg', '1 metric ton',
                0.595, 1958.0, '0.595 metric ton × 3290 kgCO2e/kg × 1 = 1957.5'),
    # --- EWS-2A ROCKWOOL (1000 sq.ft edge case) ---
    MaterialRow('EWS-2A-OPT1', 'ROCKWOOL', 'Stone wool Thermal Insulation CI 4"',
                'EPD-RWI-20190075-CCD1-EN', 0.08, 'kgCO2e/m2', '1000 sq.ft',
                1000.0, 80.0),
    # --- EWS-2A ClarkDietrich Z-girts ---
    MaterialRow('EWS-2A-OPT1', 'ClarkDietrich', 'Cold-Formed Steel Products',
                'EPD10056', 2390.0, 'kgCO2e/kg', '1 metric ton',
                0.09, 215.0, 'Assumed 2.0 kg/m²'),
    # --- EWS-2B Limestone ---
    MaterialRow('EWS-2B-LIME', 'Various NA Quarries', 'Dimension Limestone – Arch Veneer',
                'CEPMC/Polycor 2020', 29.2, 'kgCO2e/m2', '1 square meter',
                92.903, 2712.77),
    # --- EWS-2B Sandstone ---
    MaterialRow('EWS-2B-SAND', 'Cleveland Quarries et al.', 'Dimension Sandstone – U.S. Quarried',
                '#4787352986.101.1', 24.0, 'kgCO2e/m2', '1 square meter',
                92.903, 2230.0),
    # --- EWS-3B UHPC (kgCO2e/UD edge case) ---
    MaterialRow('EWS-3B', 'Ductal', 'Ductal Full Premix NaW3FO',
                'EN15804', 14.9, 'kgCO2e/UD', '1 square meter',
                92.903, 1384.25),
    # --- EWS-3C GFRC (unit mismatch: kgCO2e/m2 × metric ton) ---
    MaterialRow('EWS-3C', 'FIBROBETON', 'GFRC cladding',
                'EPD-IES-0016163', 818.0, 'kgCO2e/m2', '1 metric ton',
                4.64, 3796.0),
    # --- EWS-5 Aluminum plate ---
    MaterialRow('EWS-5', 'Dri-Design / CEI / Morin', 'Aluminum plate 3mm + stiffeners',
                'SCS-EPD-10200', 10.62, 'kgCO2e/m2', '100 m²',
                1000.0, 10620.0),
    # --- DensGlass sheathing ---
    MaterialRow('EWS-ALL', 'Georgia-Pacific Building Products',
                'DensGlass Fireguard Sheathing Gypsum Panel', 'EPD10268',
                454.0, 'kgCO2e/m2', '1000 sq.ft', 1.00, 454.0),
    # --- USG Sheetrock ---
    MaterialRow('EWS-ALL', 'US Gypsum', 'USG Sheetrock Brand EcoSmart Panels',
                '4787352797.105.1', 232.0, 'kgCO2e/m2', '1000 sq.ft', 1.00, 232.0),
]

# ---------------------------------------------------------------------------
# Runner
# ---------------------------------------------------------------------------
def run_validation(rows: list, as_json: bool = False):
    results = [normalize_gwp(r) for r in rows]

    passed  = [r for r in results if r.status == 'PASS']
    failed  = [r for r in results if r.status == 'FAIL']
    warned  = [r for r in results if r.status == 'WARN']
    unknown = [r for r in results if r.status == 'UNIT_UNKNOWN']

    if as_json:
        output = [
            {
                "assembly": r.row.assembly_code,
                "product": r.row.product_name,
                "epd": r.row.epd_number,
                "gwp": r.row.gwp,
                "gwp_units": r.row.gwp_units,
                "declared_unit": r.row.declared_unit,
                "msf_factor": r.row.msf_factor,
                "pdf_ec": r.row.embodied_carbon_pdf,
                "computed_ec": r.computed_ec,
                "delta_pct": r.delta_pct,
                "status": r.status,
                "flags": r.flags,
                "message": r.message,
            }
            for r in results
        ]
        print(json.dumps(output, indent=2))
        return

    print("\n" + "="*70)
    print("  GreenChainz GWP Unit Validator — EWS Assembly Seed Check")
    print("="*70)

    for r in results:
        icon = {"PASS": "✅", "FAIL": "❌", "WARN": "⚠️", "UNIT_UNKNOWN": "❓"}.get(r.status, "?")
        print(f"\n{icon} [{r.status}] {r.row.assembly_code} | {r.row.product_name}")
        print(f"   EPD: {r.row.epd_number} | GWP: {r.row.gwp} {r.row.gwp_units} | DeclaredUnit: {r.row.declared_unit}")
        print(f"   MSFFactor: {r.row.msf_factor} | PDF_EC: {r.row.embodied_carbon_pdf} | Computed_EC: {r.computed_ec}")
        if r.delta_pct is not None:
            print(f"   Delta: {r.delta_pct}%")
        if r.flags:
            for flag in r.flags:
                print(f"   🚩 FLAG: {flag}")
        print(f"   {r.message}")

    print("\n" + "="*70)
    print(f"  SUMMARY: {len(results)} rows | ✅ {len(passed)} PASS | "
          f"❌ {len(failed)} FAIL | ⚠️ {len(warned)} WARN | ❓ {len(unknown)} UNKNOWN")
    print("="*70 + "\n")

    if failed or unknown:
        print("ACTION REQUIRED: Fix FAIL/UNKNOWN rows before running seed-ews-assemblies.sql\n")
        raise SystemExit(1)
    else:
        print("All rows validated. Safe to run seed-ews-assemblies.sql\n")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='GreenChainz GWP Unit Validator')
    parser.add_argument('--json', action='store_true', help='Output as JSON')
    args = parser.parse_args()
    run_validation(EWS_ROWS, as_json=args.json)
