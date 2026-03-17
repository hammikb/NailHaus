-- Performance indexes based on real query patterns in NailHaus API routes.
-- Run this migration in your Supabase SQL editor or via `supabase db push`.

-- ─── products ─────────────────────────────────────────────────────────────────
-- All product list queries filter on hidden=false first
CREATE INDEX IF NOT EXISTS idx_products_hidden
  ON products (hidden);

-- Most common sort: popular (review_count DESC) with hidden filter
CREATE INDEX IF NOT EXISTS idx_products_hidden_review_count
  ON products (hidden, review_count DESC)
  WHERE hidden = false;

-- Rating sort
CREATE INDEX IF NOT EXISTS idx_products_hidden_rating
  ON products (hidden, rating DESC)
  WHERE hidden = false;

-- Newest sort
CREATE INDEX IF NOT EXISTS idx_products_hidden_created_at
  ON products (hidden, created_at DESC)
  WHERE hidden = false;

-- Price sorts
CREATE INDEX IF NOT EXISTS idx_products_hidden_price
  ON products (hidden, price)
  WHERE hidden = false;

-- Vendor listing filter (vendorId= queries)
CREATE INDEX IF NOT EXISTS idx_products_vendor_id
  ON products (vendor_id);

-- Shape / style filter pills
CREATE INDEX IF NOT EXISTS idx_products_shape
  ON products (shape);

CREATE INDEX IF NOT EXISTS idx_products_style
  ON products (style);

-- Availability filter
CREATE INDEX IF NOT EXISTS idx_products_availability
  ON products (availability);

-- ─── reviews ──────────────────────────────────────────────────────────────────
-- Fetched by product (product detail page)
CREATE INDEX IF NOT EXISTS idx_reviews_product_id
  ON reviews (product_id);

-- Fetched by vendor (vendor dashboard)
CREATE INDEX IF NOT EXISTS idx_reviews_vendor_id
  ON reviews (vendor_id);

-- Duplicate-review check (user+product)
CREATE INDEX IF NOT EXISTS idx_reviews_user_product
  ON reviews (user_id, product_id);

-- ─── orders ───────────────────────────────────────────────────────────────────
-- My orders page
CREATE INDEX IF NOT EXISTS idx_orders_user_id
  ON orders (user_id);

-- ─── order_items ──────────────────────────────────────────────────────────────
-- Vendor dashboard revenue aggregation
CREATE INDEX IF NOT EXISTS idx_order_items_vendor_id
  ON order_items (vendor_id);

-- Order detail join
CREATE INDEX IF NOT EXISTS idx_order_items_order_id
  ON order_items (order_id);

-- ─── wishlists ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_wishlists_user_id
  ON wishlists (user_id);

-- ─── vendors ──────────────────────────────────────────────────────────────────
-- Auth lookups (vendor by user_id)
CREATE INDEX IF NOT EXISTS idx_vendors_user_id
  ON vendors (user_id);

-- Vendor listing sort
CREATE INDEX IF NOT EXISTS idx_vendors_total_sales
  ON vendors (total_sales DESC);

-- ─── vendor_verification_requests ────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_verification_requests_vendor_id
  ON vendor_verification_requests (vendor_id);

CREATE INDEX IF NOT EXISTS idx_verification_requests_status
  ON vendor_verification_requests (status);

-- ─── profiles ─────────────────────────────────────────────────────────────────
-- Admin user list filter by role
CREATE INDEX IF NOT EXISTS idx_profiles_role
  ON profiles (role);
