-- AlterTable
ALTER TABLE "material_assembly_specs" ADD COLUMN "epd_number" VARCHAR(100);
ALTER TABLE "material_assembly_specs" ADD COLUMN "gwp_a1_a3" DECIMAL(10,4);
ALTER TABLE "material_assembly_specs" ADD COLUMN "gwp_declared_unit" VARCHAR(50);
ALTER TABLE "material_assembly_specs" ADD COLUMN "gwp_msf_factor" DECIMAL(10,4);
ALTER TABLE "material_assembly_specs" ADD COLUMN "gwp_per_1000sf" DECIMAL(10,2);
ALTER TABLE "material_assembly_specs" ADD COLUMN "carbon_tier" VARCHAR(20);
ALTER TABLE "material_assembly_specs" ADD COLUMN "assembly_type_tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "material_assembly_specs" ADD COLUMN "framing_type_tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "material_assembly_specs" ADD COLUMN "exterior_finish_tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "material_assembly_specs" ADD COLUMN "certification_tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE INDEX "idx_assembly_epd_number" ON "material_assembly_specs"("epd_number");

-- CreateIndex
CREATE INDEX "idx_assembly_carbon_tier" ON "material_assembly_specs"("carbon_tier");

-- CreateIndex
CREATE INDEX "idx_assembly_type_tags" ON "material_assembly_specs" USING GIN ("assembly_type_tags");
