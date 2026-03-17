/*
  Warnings:

  - You are about to drop the column `layer_name` on the `assembly_spec_components` table. All the data in the column will be lost.
  - Added the required column `layerName` to the `assembly_spec_components` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "idx_assembly_type_tags";

-- AlterTable
ALTER TABLE "assembly_spec_components" DROP COLUMN "layer_name",
ADD COLUMN     "layerName" VARCHAR(255) NOT NULL;

-- CreateIndex
CREATE INDEX "idx_assembly_type_tags" ON "material_assembly_specs"("assembly_type_tags");
