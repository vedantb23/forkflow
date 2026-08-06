CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
  CREATE TYPE role AS ENUM ('CUSTOMER', 'RESTAURANT_OWNER', 'DELIVERY', 'ADMIN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE order_status AS ENUM
    ('PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE delivery_status AS ENUM ('UNASSIGNED', 'ASSIGNED', 'PICKED_UP', 'DELIVERED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,          -- login identity, no duplicates
  password_hash TEXT,                          -- null for Google-login users
  name          TEXT NOT NULL,
  phone         TEXT,
  role          role NOT NULL DEFAULT 'CUSTOMER',
  google_id     TEXT UNIQUE,                   -- set only for Google OAuth users
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS restaurants (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  description         TEXT,
  image_url           TEXT,                    -- Cloudinary URL (Day 3)
  cuisine             TEXT,
  address             TEXT,
  is_open             BOOLEAN NOT NULL DEFAULT true,
  max_orders_per_slot INT NOT NULL DEFAULT 5,  -- max orders per 15-min window
  owner_id            UUID NOT NULL REFERENCES users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_restaurants_owner ON restaurants(owner_id);

CREATE TABLE IF NOT EXISTS menu_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id     UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  description       TEXT,
  price             NUMERIC(10, 2) NOT NULL,   -- money = NUMERIC, never float
  image_url         TEXT,
  is_veg            BOOLEAN NOT NULL DEFAULT true,
  spice_level       INT NOT NULL DEFAULT 0,    -- 0 none, 1 mild, 2 medium, 3 hot
  stock             INT NOT NULL DEFAULT 0,    -- units available right now
  prep_time_minutes INT NOT NULL DEFAULT 15,
  is_available      BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE menu_items ADD COLUMN embedding vector(384);
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant ON menu_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_embedding ON menu_items USING ivfflat (embedding vector_cosine_ops);

CREATE TABLE IF NOT EXISTS carts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  restaurant_id UUID,                          -- which restaurant the cart is for
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cart_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id      UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  quantity     INT NOT NULL DEFAULT 1,
  UNIQUE (cart_id, menu_item_id)
);

CREATE TABLE IF NOT EXISTS orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  restaurant_id   UUID NOT NULL REFERENCES restaurants(id),
  status          order_status NOT NULL DEFAULT 'PENDING',
  total_amount    NUMERIC(10, 2) NOT NULL,
  slot_window     TIMESTAMPTZ NOT NULL,        -- the capacity window this order sits in
  idempotency_key TEXT UNIQUE,                 -- same key => same order
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant ON orders(restaurant_id);

CREATE TABLE IF NOT EXISTS order_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id       UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id   UUID NOT NULL REFERENCES menu_items(id),
  name_snapshot  TEXT NOT NULL,
  price_snapshot NUMERIC(10, 2) NOT NULL,
  quantity       INT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

CREATE TABLE IF NOT EXISTS payments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id       UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  status         payment_status NOT NULL DEFAULT 'PENDING',
  amount         NUMERIC(10, 2) NOT NULL,
  provider       TEXT,
  transaction_id TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS delivery_assignments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  partner_id  UUID REFERENCES users(id),       -- null until a partner is assigned
  status      delivery_status NOT NULL DEFAULT 'UNASSIGNED',
  current_lat DOUBLE PRECISION,                -- live location, pushed over Socket.io
  current_lng DOUBLE PRECISION,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_delivery_partner ON delivery_assignments(partner_id);

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['users','restaurants','menu_items','carts','orders','payments','delivery_assignments']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated_at ON %s', t, t);
    EXECUTE format('CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %s
                    FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t, t);
  END LOOP;
END $$;
