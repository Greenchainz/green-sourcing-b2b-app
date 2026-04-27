-- Add carbon_score column to materials
ALTER TABLE materials ADD COLUMN carbon_score DECIMAL(5,2) CHECK (carbon_score BETWEEN 0 AND 100);