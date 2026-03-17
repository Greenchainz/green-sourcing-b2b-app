import { prisma } from "@/lib/prisma";
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

  return prisma.materialAssemblySpec.update({
    where: { id: input.assemblySpecId },
    data: {
      epdNumber: input.epdNumber,
      gwpA1A3: input.gwpA1A3,
      gwpDeclaredUnit: input.gwpDeclaredUnit,
      gwpMsfFactor: input.gwpMsfFactor,
      gwpPer1000sf,
      carbonTier,
      assemblyTypeTags: input.assemblyTypeTags,
      framingTypeTags: input.framingTypeTags,
      exteriorFinishTags: input.exteriorFinishTags,
      certificationTags: input.certificationTags,
    },
  });
}
