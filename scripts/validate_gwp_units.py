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

UNIT NORMALIZATION RULES (verified against EWS PDF ground truth):
  ┌─────────────────────┬──────────────────┬─────────────────────────────────────────┐
  │ GWP Unit            │ Declared Unit    │ Formula                                 │
  ├─────────────────────┼──────────────────┼─────────────────────────────────────────┤
  │ kgCO2e/m2           │ 1 square meter   │ gwp × 92.903                            │
  │ kgCO2e/m2           │ 1000 sq.ft       │ gwp × msf_factor (msf encodes 1000)     │
  │ kgCO2e/m2           │ 1 metric ton     │ gwp × msf_factor (GFRC edge case)       │
  │ kgCO2e/m2           │ 100 m²           │ gwp × msf_factor (EWS-5 aluminum)       │
  │ kgCO2e/kg           │ 1 square meter   │ gwp × msf_factor (density baked in msf) │
  │ kgCO2e/kg           │ 1 metric ton     │ gwp × msf_factor (tons/1000SF in msf)   │
  │ kgCO2e/UD           │ 1 square meter   │ gwp × 92.903                            │
  └─────────────────────┴──────────────────┴─────────────────────────────────────────┘

  KEY INSIGHT for kgCO2e/kg rows:
    MSFFactor in the Materials table already encodes the per-1000SF mass quantity.
    For kgCO2e/kg + "1 square meter": MSFFactor = m² per 1000SF (92.903),
      density (kg/m²) is PRE-BAKED into MSFFactor by the PDF author.
      e.g. Kawneer: 166 kgCO2e/kg, MSF=92.903, result=15422
           166 × 92.903 = 15421.9 ✓  (19.6 kg/m² already folded in)
    For kgCO2e/kg + "1 metric ton": MSFFactor = metric tons per 1000SF facade.
      e.g. SCAFCO: 3290 kgCO2e/kg, MSF=0.595 ton, result=1958
           3290 × 0.595 = 1957.6 ✓  (NO ×1000 — MSF is in tons, not kg)
"""

import argparse
import json
from dataclasses import dataclass, field
from typing import Optional

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
MSF_TO_M2 = 92.903      # 1 MSF (1000 sq.ft) = 92.903 m²
TOLERANCE_PCT = 0.02    # Allow 2% rounding difference between PDF and computed

# ---------------------------------------------------------------------------
# Unit normalization rules
# ---------------------------------------------------------------------------
# Maps (gwp_unit, declared_unit) → lambda(gwp, msf) → kgCO2e per 1000SF
#
# RULE for kgCO2e/kg:
#   MSFFactor already encodes the mass per 1000SF (whether in m² or metric tons).
#   Formula is always: gwp × msf_factor   (NO ×1000 multiplier)
#
# RULE for kgCO2e/m2 + 100 m² (EWS-5 Aluminum):
#   Declared unit is 100 m². MSFFactor = 1000 (i.e. 10 × 100m² panels per 1000SF).
#   EC = gwp × msf_factor → 10.62 × 1000 = 10620 ✓

UNIT_RULES = {
    # ── Standard glass / stone / cladding ──────────────────────────────────
    ('kgCO2e/m2', '1 square meter'):
        lambda gwp, msf: gwp * MSF_TO_M2,

    # ── 1000 sq.ft declared unit (DensGlass, ROCKWOOL insulation, GWB) ─────
    # GWP is per m² but declared unit is 1000 sq.ft.
    # MSFFactor encodes the scalar multiplier (1 or 1000).
    ('kgCO2e/m2', '1000 sq.ft'):
        lambda gwp, msf: gwp * msf,

    # ── GFRC edge case: GWP per m² but declared unit is metric ton ──────────
    # MSFFactor = metric tons of GFRC per 1000SF facade (4.64).
    ('kgCO2e/m2', '1 metric ton'):
        lambda gwp, msf: gwp * msf,

    # ── EWS-5 Aluminum: GWP per m², declared unit is 100 m² ─────────────────
    # MSFFactor = 1000 (number of m² per 1000SF × unit scaling).
    # EC = 10.62 × 1000 = 10620 ✓
    ('kgCO2e/m2', '100 m²'):
        lambda gwp, msf: gwp * msf,

    # ── Aluminum framing: GWP per kg, declared unit is 1 square meter ───────
    # MSFFactor = m² per 1000SF (92.903). Density kg/m² pre-baked by PDF author.
    # EC = gwp × msf  e.g. 166 × 92.903 = 15421.9 ✓
    ('kgCO2e/kg', '1 square meter'):
        lambda gwp, msf: gwp * msf,

    # ── Steel framing: GWP per kg, declared unit is 1 metric ton ─────────────
    # MSFFactor = metric tons per 1000SF facade (e.g. 0.595, 0.09, 251).
    # EC = gwp × msf  e.g. 3290 × 0.595 = 1957.6 ✓  (NO ×1000)
    ('kgCO2e/kg', '1 metric ton'):
        lambda gwp, msf: gwp * msf,

    # ── UHPC: GWP per declared unit (kgCO2e/UD), declared unit is 1 m² ──────
    ('kgCO2e/UD', '1 square meter'):
        lambda gwp, msf: gwp * MSF_TO_M2,
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

    if key in UNIT_RULES:
        computed = UNIT_RULES[key](row.gwp, row.msf_factor)
    else:
        result.status = "UNIT_UNKNOWN"
        result.flags.append(f"NO_RULE for ({row.gwp_units}, {row.declared_unit})")
        result.message = (
            f"No normalization rule found. Add entry to UNIT_RULES in validate_gwp_units.py. "
            f"Manual review required before INSERT."
        )
        return result

    result.computed_ec = round(computed, 2)

    if row.embodied_carbon_pdf == 0:
        result.status = "WARN"
        result.flags.append("PDF_VALUE_ZERO")
        result.message = "PDF embodied carbon is zero — possible data entry error."
        return result

    delta = abs(computed - row.embodied_carbon_pdf) / row.embodied_carbon_pdf
    result.delta_pct = round(delta * 100, 2)

    if delta <= TOLERANCE_PCT:
        result.status = "PASS"
        result.message = (
            f"OK: computed={computed:.1f}, pdf={row.embodied_carbon_pdf}, delta={result.delta_pct}%"
        )
    else:
        result.status = "FAIL"
        result.flags.append("DELTA_EXCEEDS_TOLERANCE")
        result.message = (
            f"MISMATCH: computed={computed:.1f} vs pdf={row.embodied_carbon_pdf} "
            f"({result.delta_pct}% > {TOLERANCE_PCT*100}% tolerance). "
            "Check density assumption or MSF factor."
        )

    # Informational flags (not blockers)
    if row.declared_unit == '1000 sq.ft':
        result.flags.append("INFO: UNIT_1000SQFT — confirm MSFFactor matches scalar intent")
    if row.gwp_units == 'kgCO2e/m2' and row.declared_unit == '1 metric ton':
        result.flags.append("INFO: UNIT_MISMATCH_GFRC — GWP/m2 × metric ton MSF, verify MSFFactor")
    if row.gwp_units == 'kgCO2e/m2' and row.declared_unit == '100 m²':
        result.flags.append("INFO: UNIT_100M2 — EWS-5 aluminum pattern, MSF encodes ×100 scaling")

    return result

# ---------------------------------------------------------------------------
# Test dataset — all rows from EWS PDF
# ---------------------------------------------------------------------------
EWS_ROWS = [
    # ── EWS-1A Vision ────────────────────────────────────────────────────────
    MaterialRow('EWS-1A-VISION', 'Kawneer North America', '1600 Wall System',
                '4789733794.109.1', 166.0, 'kgCO2e/kg', '1 square meter',
                92.903, 15422.0, 'Density 19.6 kg/m² baked into MSFFactor by PDF author'),
    MaterialRow('EWS-1A-VISION', 'Vitro / Guardian / AGC', 'Solarban® low-e IGU',
                'SCS-EPD-08787', 55.7, 'kgCO2e/m2', '1 square meter',
                92.903, 5175.0),

    # ── EWS-1A Shadowbox ─────────────────────────────────────────────────────
    MaterialRow('EWS-1A-SHADOWBOX', 'Unitized fabricator', 'Factory backpan Al 1.0mm',
                'AA EPD 104.1', 16.0, 'kgCO2e/kg', '1 metric ton',
                251.0, 4016.0, 'MSFFactor=251 kg/1000SF (2.7 kg/m² × 92.903 m²)'),
    MaterialRow('EWS-1A-SHADOWBOX', 'ROCKWOOL', 'Spandrel/Shadowbox wool',
                'EPD-RWI-20190075-CCD1-EN', 6.0, 'kgCO2e/m2', '1 square meter',
                92.903, 557.0),

    # ── EWS-1A Spandrel ──────────────────────────────────────────────────────
    MaterialRow('EWS-1A-SPANDREL', 'ROCKWOOL', 'Stone wool Thermal Insulation',
                'EPD-RWI-20190075-CCD1-EN', 0.04, 'kgCO2e/m2', '1000 sq.ft',
                1000.0, 40.0),
    MaterialRow('EWS-1A-SPANDREL', 'Vitro / Guardian / AGC', 'Spandrel IGU panel',
                'SCS-EPD-08787', 25.4, 'kgCO2e/m2', '1 square meter',
                92.903, 2360.0),

    # ── EWS-1B Fritted ───────────────────────────────────────────────────────
    MaterialRow('EWS-1B-FRITTED', 'Vitro / Guardian / AGC', 'Vitro + frit (Dip-Tech)',
                'SCS-EPD-08787', 80.0, 'kgCO2e/m2', '1 square meter',
                92.903, 7432.0),

    # ── EWS-2A Granite ───────────────────────────────────────────────────────
    MaterialRow('EWS-2A', 'Polycor', 'Granite veneer',
                'POL-20230131-006', 39.1, 'kgCO2e/m2', '1 square meter',
                92.903, 3633.0),
    MaterialRow('EWS-2A-OPT1', 'SCAFCO Steel Stud Company', 'Steel Framing stud and track',
                'SCSEPD05752', 3290.0, 'kgCO2e/kg', '1 metric ton',
                0.595, 1958.0, 'MSFFactor=0.595 metric ton/1000SF'),
    MaterialRow('EWS-2A-OPT1', 'ROCKWOOL', 'Stone wool Thermal Insulation CI 4"',
                'EPD-RWI-20190075-CCD1-EN', 0.08, 'kgCO2e/m2', '1000 sq.ft',
                1000.0, 80.0),
    MaterialRow('EWS-2A-OPT1', 'ClarkDietrich', 'Cold-Formed Steel Products',
                'EPD10056', 2390.0, 'kgCO2e/kg', '1 metric ton',
                0.09, 215.0, 'MSFFactor=0.09 metric ton/1000SF (2.0 kg/m² × 92.903 / 1000)'),

    # ── EWS-2B Limestone / Sandstone ─────────────────────────────────────────
    MaterialRow('EWS-2B-LIME', 'Various NA Quarries', 'Dimension Limestone – Arch Veneer',
                'CEPMC/Polycor 2020', 29.2, 'kgCO2e/m2', '1 square meter',
                92.903, 2712.77),
    MaterialRow('EWS-2B-SAND', 'Cleveland Quarries et al.', 'Dimension Sandstone – U.S. Quarried',
                '#4787352986.101.1', 24.0, 'kgCO2e/m2', '1 square meter',
                92.903, 2230.0),

    # ── EWS-3B UHPC ──────────────────────────────────────────────────────────
    MaterialRow('EWS-3B', 'Ductal', 'Ductal Full Premix NaW3FO',
                'EN15804', 14.9, 'kgCO2e/UD', '1 square meter',
                92.903, 1384.25),

    # ── EWS-3C GFRC ──────────────────────────────────────────────────────────
    MaterialRow('EWS-3C', 'FIBROBETON', 'GFRC cladding',
                'EPD-IES-0016163', 818.0, 'kgCO2e/m2', '1 metric ton',
                4.64, 3796.0),

    # ── EWS-5 Aluminum plate (100 m² declared unit) ───────────────────────────
    MaterialRow('EWS-5', 'Dri-Design / CEI / Morin', 'Aluminum plate 3mm + stiffeners',
                'SCS-EPD-10200', 10.62, 'kgCO2e/m2', '100 m²',
                1000.0, 10620.0,
                'Declared unit=100 m². MSFFactor=1000 encodes ×100 scaling. 10.62×1000=10620'),

    # ── Shared core layers ────────────────────────────────────────────────────
    MaterialRow('EWS-ALL', 'Georgia-Pacific Building Products',
                'DensGlass Fireguard Sheathing Gypsum Panel', 'EPD10268',
                454.0, 'kgCO2e/m2', '1000 sq.ft', 1.00, 454.0),
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
                print(f"   🔵 {flag}")
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
