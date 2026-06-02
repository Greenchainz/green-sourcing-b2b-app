ALTER TABLE suppliers
ADD COLUMN IF NOT EXISTS "epdUrl" text,
ADD COLUMN IF NOT EXISTS "epdProgramOperator" varchar(150);
