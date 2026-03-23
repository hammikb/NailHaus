CREATE TABLE IF NOT EXISTS vendor_follows (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vendor_id   UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, vendor_id)
);

CREATE INDEX IF NOT EXISTS idx_vendor_follows_user_id   ON vendor_follows(user_id);
CREATE INDEX IF NOT EXISTS idx_vendor_follows_vendor_id ON vendor_follows(vendor_id);
