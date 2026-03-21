-- Migration 105: Update Quality Constraint
ALTER TABLE catalog_items DROP CONSTRAINT IF EXISTS catalog_items_quality_check;

ALTER TABLE catalog_items 
  ADD CONSTRAINT catalog_items_quality_check 
  CHECK (quality IN ('original', 'premium', 'oem', 'paralela', 'china', 'incell', '') OR quality IS NULL);
