-- ============================================================
--  NailHaus – Supabase PostgreSQL Schema
--  Run this in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- Profiles (one row per Supabase Auth user)
CREATE TABLE IF NOT EXISTS profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  role       TEXT NOT NULL DEFAULT 'buyer' CHECK (role IN ('buyer', 'vendor', 'admin')),
  disabled   BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vendors
CREATE TABLE IF NOT EXISTS vendors (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  tagline          TEXT DEFAULT '',
  description      TEXT DEFAULT '',
  emoji            TEXT DEFAULT '💅',
  bg_color         TEXT DEFAULT '#fde8e8',
  tags             TEXT[] DEFAULT '{}',
  verified         BOOLEAN DEFAULT FALSE,
  rating           NUMERIC(3,2) DEFAULT 0,
  total_sales      INTEGER DEFAULT 0,
  total_products   INTEGER DEFAULT 0,
  social_links     JSONB DEFAULT '{}',
  announcement     TEXT DEFAULT '',
  collections      JSONB DEFAULT '[]',
  shipping_profile JSONB,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id       UUID REFERENCES vendors(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT DEFAULT '',
  price           NUMERIC(10,2) NOT NULL,
  original_price  NUMERIC(10,2),
  emoji           TEXT DEFAULT '💅',
  bg_color        TEXT DEFAULT '#fde8e8',
  shape           TEXT DEFAULT 'almond',
  style           TEXT DEFAULT 'minimal',
  badge           TEXT,
  stock           INTEGER DEFAULT 0,
  tags            TEXT[] DEFAULT '{}',
  availability    TEXT DEFAULT 'in_stock',
  production_days INTEGER,
  occasions       TEXT[] DEFAULT '{}',
  collection_id   UUID,
  nail_count      INTEGER,
  sizes           TEXT DEFAULT '',
  finish          TEXT DEFAULT '',
  glue_included   BOOLEAN,
  reusable        BOOLEAN,
  wear_time       TEXT DEFAULT '',
  hidden          BOOLEAN DEFAULT FALSE,
  rating          NUMERIC(3,2) DEFAULT 0,
  review_count    INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES profiles(id) ON DELETE SET NULL,
  total            NUMERIC(10,2) NOT NULL,
  original_total   NUMERIC(10,2),
  discount_id      UUID,
  discount_savings NUMERIC(10,2) DEFAULT 0,
  status           TEXT DEFAULT 'confirmed',
  shipping_address JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Order Items
CREATE TABLE IF NOT EXISTS order_items (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  vendor_id  UUID REFERENCES vendors(id) ON DELETE SET NULL,
  qty        INTEGER NOT NULL DEFAULT 1,
  price      NUMERIC(10,2) NOT NULL
);

-- Reviews
CREATE TABLE IF NOT EXISTS reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES profiles(id) ON DELETE SET NULL,
  product_id      UUID REFERENCES products(id) ON DELETE CASCADE,
  vendor_id       UUID REFERENCES vendors(id) ON DELETE CASCADE,
  rating          INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title           TEXT,
  body            TEXT NOT NULL,
  helpful         INTEGER DEFAULT 0,
  photo           TEXT,
  vendor_reply    TEXT,
  vendor_reply_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Shipments
CREATE TABLE IF NOT EXISTS shipments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   UUID REFERENCES orders(id) ON DELETE CASCADE,
  vendor_id  UUID REFERENCES vendors(id) ON DELETE CASCADE,
  status     TEXT DEFAULT 'pending',
  shippo     JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Discounts
CREATE TABLE IF NOT EXISTS discounts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code       TEXT UNIQUE NOT NULL,
  type       TEXT NOT NULL CHECK (type IN ('percent', 'fixed')),
  value      NUMERIC(10,2) NOT NULL,
  max_uses   INTEGER DEFAULT 100,
  used_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  active     BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Restock Alerts
CREATE TABLE IF NOT EXISTS restock_alerts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, user_id)
);

-- Vendor Verification Requests
CREATE TABLE IF NOT EXISTS vendor_verification_requests (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id  UUID REFERENCES vendors(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  message    TEXT,
  links      TEXT[] DEFAULT '{}',
  status     TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin Audit Log
CREATE TABLE IF NOT EXISTS admin_audit (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action       TEXT NOT NULL,
  entity_type  TEXT,
  entity_id    UUID,
  note         TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_products_vendor_id  ON products(vendor_id);
CREATE INDEX IF NOT EXISTS idx_products_shape       ON products(shape);
CREATE INDEX IF NOT EXISTS idx_products_style       ON products(style);
CREATE INDEX IF NOT EXISTS idx_products_hidden      ON products(hidden);
CREATE INDEX IF NOT EXISTS idx_reviews_product_id  ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_vendor_id   ON reviews(vendor_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id       ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_vendor   ON order_items(vendor_id);
CREATE INDEX IF NOT EXISTS idx_shipments_vendor_id  ON shipments(vendor_id);
