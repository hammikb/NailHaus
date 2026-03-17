-- Add ship_from_address to vendors table for shipping label calculation
ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS ship_from_address JSONB DEFAULT '{}';
