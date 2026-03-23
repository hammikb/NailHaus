CREATE TABLE IF NOT EXISTS discount_codes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id   UUID REFERENCES vendors(id) ON DELETE CASCADE,  -- NULL = platform-wide code
  code        TEXT NOT NULL UNIQUE,
  type        TEXT NOT NULL CHECK (type IN ('percent', 'fixed')),
  value       NUMERIC(10,2) NOT NULL,
  min_order   NUMERIC(10,2) DEFAULT 0,
  max_uses    INT,
  uses        INT NOT NULL DEFAULT 0,
  active      BOOLEAN NOT NULL DEFAULT true,
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_discount_codes_code      ON discount_codes(UPPER(code));
CREATE INDEX IF NOT EXISTS idx_discount_codes_vendor_id ON discount_codes(vendor_id);
