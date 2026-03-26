-- Migration: Add plate column to products table
-- Purpose: Store license plate for vehicle-related products
-- Date: 2026-03-25

-- Add plate column
ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS plate TEXT,
  ADD CONSTRAINT plate_format_check 
    CHECK (
      plate IS NULL OR 
      plate ~* '^[A-Z]{2,4}-?\d{2,4}$' OR 
      plate ~* '^[A-Z]{2}-\d{2}-\d{2}$'
    );

-- Create index for faster plate lookups
CREATE INDEX IF NOT EXISTS idx_products_plate ON products(plate);

-- Add comment for documentation
COMMENT ON COLUMN products.plate IS 'License plate number (Chilean format: ABCD-12, AA-12-34, etc.)';

-- Grant permissions
GRANT SELECT ON products TO authenticated;
GRANT ALL ON products TO service_role;
