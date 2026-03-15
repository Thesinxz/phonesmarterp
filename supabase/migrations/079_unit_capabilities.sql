-- Add capability flags to units table
ALTER TABLE units
  ADD COLUMN IF NOT EXISTS has_repair_lab BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_parts_stock BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_sales BOOLEAN NOT NULL DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN units.has_repair_lab IS 'Designates if the unit has a technical assistance laboratory';
COMMENT ON COLUMN units.has_parts_stock IS 'Designates if the unit maintains stock of parts for repairs';
COMMENT ON COLUMN units.has_sales IS 'Designates if the unit performs direct sales to customers';
