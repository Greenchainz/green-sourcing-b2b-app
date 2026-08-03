-- Performance indexes for materials table
-- category is used in WHERE filters on every list query
-- manufacturerId is used in the JOIN to manufacturers table
CREATE INDEX IF NOT EXISTS idx_materials_category ON materials (category);
CREATE INDEX IF NOT EXISTS idx_materials_manufacturer_id ON materials ("manufacturerId");
CREATE INDEX IF NOT EXISTS idx_materials_data_source ON materials ("dataSource");
