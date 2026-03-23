CREATE TABLE IF NOT EXISTS bundles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id   UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  discount_pct NUMERIC(5,2) DEFAULT 0,  -- e.g. 10 = 10% off bundle price
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bundle_items (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id  UUID NOT NULL REFERENCES bundles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE(bundle_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_bundles_vendor_id    ON bundles(vendor_id);
CREATE INDEX IF NOT EXISTS idx_bundle_items_bundle  ON bundle_items(bundle_id);
