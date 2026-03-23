CREATE TABLE IF NOT EXISTS editorial_looks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  subtitle    TEXT,
  emoji       TEXT DEFAULT '💅',
  active      BOOLEAN NOT NULL DEFAULT true,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS editorial_look_items (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  look_id    UUID NOT NULL REFERENCES editorial_looks(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  UNIQUE(look_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_editorial_look_items_look ON editorial_look_items(look_id);
