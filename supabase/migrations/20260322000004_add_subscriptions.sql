CREATE TABLE IF NOT EXISTS subscription_plans (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id           UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  description         TEXT,
  price_monthly       NUMERIC(10,2) NOT NULL,
  stripe_price_id     TEXT,          -- Stripe recurring Price ID
  items_per_month     INT NOT NULL DEFAULT 1,
  active              BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id                  UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
  stripe_subscription_id   TEXT UNIQUE,
  status                   TEXT NOT NULL DEFAULT 'active',  -- active | paused | cancelled
  current_period_end       TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscription_plans_vendor ON subscription_plans(vendor_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user        ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan        ON subscriptions(plan_id);
