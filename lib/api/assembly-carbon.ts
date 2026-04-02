import { query } from "@/lib/db";
import { calculateGwpPer1000sf, calculateCarbonTier } from "@/lib/utils/carbon-tier";
import {
  AssemblyTypeTag,
  CertificationTag,
  ExteriorFinishTag,
  FramingTypeTag,
} from "@/lib/constants/epd-tags";

interface AssemblyEpdInput {
  assemblySpecId: number;
  epdNumber: string;
  gwpA1A3: number;
  gwpDeclaredUnit: string;
  gwpMsfFactor: number;
  assemblyTypeTags: AssemblyTypeTag[];
  framingTypeTags: FramingTypeTag[];
  exteriorFinishTags: ExteriorFinishTag[];
  certificationTags: CertificationTag[];
}

export async function upsertAssemblyEpdData(input: AssemblyEpdInput) {
  const gwpPer1000sf = calculateGwpPer1000sf(input.gwpA1A3, input.gwpMsfFactor);
  const carbonTier = calculateCarbonTier(gwpPer1000sf);

  const result = await query(
    `UPDATE material_assembly_specs
     SET
       epd_number         = $1,
       gwp_a1_a3          = $2,
       gwp_declared_unit  = $3,
       gwp_msf_factor     = $4,
       gwp_per_1000sf     = $5,
       carbon_tier        = $6,
       assembly_type_tags = $7,
       framing_type_tags  = $8,
       exterior_finish_tags = $9,
       certification_tags = $10
     WHERE id = $11
     RETURNING *`,
    [
      input.epdNumber,
      input.gwpA1A3,
      input.gwpDeclaredUnit,
      input.gwpMsfFactor,
      gwpPer1000sf,
      carbonTier,
      JSON.stringify(input.assemblyTypeTags),
      JSON.stringify(input.framingTypeTags),
      JSON.stringify(input.exteriorFinishTags),
      JSON.stringify(input.certificationTags),
      input.assemblySpecId,
    ]
  );

  return result.rows[0] ?? null;
}
