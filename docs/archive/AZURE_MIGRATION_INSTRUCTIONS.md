# Azure PostgreSQL Migration Instructions

## Run Swap Engine Migration on Azure Portal

### Step 1: Open Azure Portal Query Editor

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **greenchainz-db-prod** PostgreSQL server
3. Click **Query editor** in the left sidebar
4. Authenticate using your managed identity (founder1@greenchainz.com)

### Step 2: Run Migration SQL

Copy and paste the entire SQL script below into the Query Editor and click **Run**:

```sql
-- CreateTable
CREATE TABLE "material_technical_specs" (
    "id" SERIAL NOT NULL,
    "material_id" INTEGER NOT NULL,
    "astm_codes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ul_listing" VARCHAR(255),
    "ul_design_number" VARCHAR(50),
    "icc_es_report" VARCHAR(50),
    "fire_rating" VARCHAR(50),
    "fire_rating_standard" VARCHAR(100),
    "char_rate" VARCHAR(50),
    "compressive_strength_psi" INTEGER,
    "modulus_of_elasticity_ksi" INTEGER,
    "flexural_strength_psi" INTEGER,
    "tensile_strength_psi" INTEGER,
    "stiffness_ksi" INTEGER,
    "r_value_per_inch" DECIMAL(5,2),
    "lttr_15_year" DECIMAL(5,2),
    "perm_rating" DECIMAL(5,2),
    "thermal_u_value" DECIMAL(8,4),
    "stc_rating" INTEGER,
    "iic_rating" INTEGER,
    "nrc_rating" DECIMAL(3,2),
    "labor_units" DECIMAL(5,2),
    "cure_time_hours" INTEGER,
    "weight_per_unit" DECIMAL(8,2),
    "slump_workability" VARCHAR(50),
    "installation_difficulty" INTEGER,
    "lead_time_days" INTEGER,
    "otif_percentage" DECIMAL(5,2),
    "supplier_z_score" DECIMAL(5,2),
    "warranty_years" INTEGER,
    "maintenance_cycle_years" INTEGER,
    "expected_lifespan_years" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_technical_specs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing_data" (
    "id" SERIAL NOT NULL,
    "material_id" INTEGER NOT NULL,
    "price_per_unit" DECIMAL(10,2) NOT NULL,
    "unit" VARCHAR(50) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "state" VARCHAR(2),
    "city" VARCHAR(100),
    "zip_code" VARCHAR(10),
    "county" VARCHAR(100),
    "source" VARCHAR(50) NOT NULL,
    "source_date" TIMESTAMP(3),
    "source_url" TEXT,
    "project_name" VARCHAR(255),
    "contract_number" VARCHAR(100),
    "labor_rate_per_hour" DECIMAL(8,2),
    "total_labor_cost" DECIMAL(10,2),
    "data_confidence" INTEGER NOT NULL DEFAULT 50,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pricing_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "swap_validations" (
    "id" SERIAL NOT NULL,
    "incumbent_material_id" INTEGER NOT NULL,
    "sustainable_material_id" INTEGER NOT NULL,
    "project_id" INTEGER,
    "validation_status" VARCHAR(20) NOT NULL,
    "overall_score" DECIMAL(5,2) NOT NULL,
    "showstopper_results" JSONB NOT NULL,
    "passed_checks" INTEGER NOT NULL,
    "failed_checks" INTEGER NOT NULL,
    "skipped_checks" INTEGER NOT NULL,
    "recommendation" TEXT NOT NULL,
    "incumbent_total_cost" DECIMAL(10,2),
    "sustainable_total_cost" DECIMAL(10,2),
    "cost_delta_percentage" DECIMAL(5,2),
    "incumbent_gwp" DECIMAL(10,2),
    "sustainable_gwp" DECIMAL(10,2),
    "carbon_reduction_percentage" DECIMAL(5,2),
    "csi_form_url" TEXT,
    "csi_form_generated_at" TIMESTAMP(3),
    "validated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "requested_by" INTEGER,
    "rfq_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "swap_validations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_assembly_specs" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "total_thickness_inches" DECIMAL(5,2),
    "total_r_value" DECIMAL(5,2),
    "fire_rating" VARCHAR(50),
    "ul_design_number" VARCHAR(50),
    "stc_rating" INTEGER,
    "iic_rating" INTEGER,
    "total_cost_per_sf" DECIMAL(10,2),
    "total_gwp_per_sf" DECIMAL(10,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_assembly_specs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assembly_spec_components" (
    "id" SERIAL NOT NULL,
    "assembly_spec_id" INTEGER NOT NULL,
    "material_id" INTEGER NOT NULL,
    "layer_order" INTEGER NOT NULL,
    "layer_name" VARCHAR(255) NOT NULL,
    "quantity" DECIMAL(8,2) NOT NULL,
    "unit" VARCHAR(50) NOT NULL,
    "thickness_inches" DECIMAL(5,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assembly_spec_components_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_tech_specs_material" ON "material_technical_specs"("material_id");

-- CreateIndex
CREATE INDEX "idx_pricing_material" ON "pricing_data"("material_id");

-- CreateIndex
CREATE INDEX "idx_pricing_state" ON "pricing_data"("state");

-- CreateIndex
CREATE INDEX "idx_pricing_source" ON "pricing_data"("source");

-- CreateIndex
CREATE INDEX "idx_pricing_active" ON "pricing_data"("is_active");

-- CreateIndex
CREATE INDEX "idx_swap_incumbent" ON "swap_validations"("incumbent_material_id");

-- CreateIndex
CREATE INDEX "idx_swap_sustainable" ON "swap_validations"("sustainable_material_id");

-- CreateIndex
CREATE INDEX "idx_swap_status" ON "swap_validations"("validation_status");

-- CreateIndex
CREATE INDEX "idx_swap_project" ON "swap_validations"("project_id");

-- CreateIndex
CREATE INDEX "idx_assembly_specs_category" ON "material_assembly_specs"("category");

-- CreateIndex
CREATE INDEX "idx_assembly_specs_ul" ON "material_assembly_specs"("ul_design_number");

-- CreateIndex
CREATE INDEX "idx_assembly_comp_assembly" ON "assembly_spec_components"("assembly_spec_id");

-- CreateIndex
CREATE INDEX "idx_assembly_comp_material" ON "assembly_spec_components"("material_id");

-- AddForeignKey
ALTER TABLE "assembly_spec_components" ADD CONSTRAINT "assembly_spec_components_assembly_spec_id_fkey" FOREIGN KEY ("assembly_spec_id") REFERENCES "material_assembly_specs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
```

### Step 3: Verify Migration

After running the migration, verify the tables were created:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'material_technical_specs',
    'pricing_data',
    'swap_validations',
    'material_assembly_specs',
    'assembly_spec_components'
  )
ORDER BY table_name;
```

You should see all 5 tables listed.

### Step 4: Confirm Success

Once you see all 5 tables, reply with "migration complete" and I'll proceed to create the Next.js API routes.

---

## What This Migration Creates

- **material_technical_specs** (38 columns) — Showstopper metrics for swap validation
- **pricing_data** (21 columns) — Regional pricing from TXDOT, Craftsman, RSMeans
- **swap_validations** (24 columns) — Validation results with APPROVED/EXPERIMENTAL/REJECTED status
- **material_assembly_specs** (14 columns) — Assembly-level specifications
- **assembly_spec_components** (9 columns) — Junction table linking materials to assemblies

Total: 5 tables, 13 indexes, 1 foreign key constraint
