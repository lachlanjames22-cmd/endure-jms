-- ============================================================
-- ENDURE DECKING JMS — Migration 001: Core Schema
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================
CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role          TEXT NOT NULL CHECK (role IN ('owner', 'ops', 'finance')),
  full_name     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, role, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'ops'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE TABLE products (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                TEXT NOT NULL,
  category            TEXT NOT NULL CHECK (category IN ('timber', 'composite')),
  cost_per_m2         NUMERIC(10,2) NOT NULL,
  rate_full_subframe  NUMERIC(10,2) NOT NULL,  -- labour charge-out per m²
  rate_over_concrete  NUMERIC(10,2) NOT NULL,
  rate_redeck         NUMERIC(10,2) NOT NULL,
  durability_score    NUMERIC(3,1) NOT NULL,
  description         TEXT,
  active              BOOLEAN NOT NULL DEFAULT TRUE,
  deleted_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CREW
-- ============================================================
CREATE TABLE crew (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT NOT NULL,
  type         TEXT NOT NULL CHECK (type IN ('full_time', 'casual', 'subby', 'experiment')),
  base_rate    NUMERIC(10,2),   -- $/hr base
  loaded_rate  NUMERIC(10,2),   -- $/hr fully loaded (super + WC)
  payg_rate    NUMERIC(5,4),    -- PAYG withholding fraction (e.g. 0.26)
  pay_cycle    TEXT NOT NULL CHECK (pay_cycle IN ('weekly', 'fortnightly', 'invoice')),
  active       BOOLEAN NOT NULL DEFAULT TRUE,
  deleted_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- JOBS
-- ============================================================
CREATE TABLE jobs (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                      TEXT NOT NULL,
  client_name               TEXT NOT NULL,
  client_id_ghl             TEXT,                    -- GoHighLevel contact ID
  buildxact_estimate_id     TEXT,                    -- Buildxact estimate ref

  -- Status & classification
  status                    TEXT NOT NULL DEFAULT 'quoted'
                              CHECK (status IN ('quoted','won','scheduled','in_progress','complete','lost')),
  jw_tier                   TEXT NOT NULL DEFAULT 'red'
                              CHECK (jw_tier IN ('red','black','blue')),

  -- Job specs
  sqm                       NUMERIC(8,2),
  install_type              TEXT CHECK (install_type IN ('fullSubframe','overConcrete','redeck')),
  use_h4                    BOOLEAN NOT NULL DEFAULT FALSE,
  product_id                UUID REFERENCES products(id),

  -- Quoted financials (set at quote stage)
  quoted_total_value        NUMERIC(10,2),   -- inc materials, ex GST
  quoted_labour_value       NUMERIC(10,2),   -- ex materials passthrough
  quoted_gp_amount          NUMERIC(10,2),
  quoted_gp_pct             NUMERIC(6,4),    -- 0.45 = 45%
  quoted_labour_hours       NUMERIC(8,2),
  quoted_days               INTEGER,

  -- Actual financials (populated on complete)
  actual_labour_value       NUMERIC(10,2),
  actual_gp_amount          NUMERIC(10,2),
  actual_gp_pct             NUMERIC(6,4),
  actual_labour_hours       NUMERIC(8,2),

  -- Key dates (set by Ops when job is Won — triggers cashflow_events)
  start_date                DATE,
  materials_order_date      DATE,
  materials_delivery_date   DATE,
  subframe_complete_date    DATE,
  completion_date           DATE,

  -- Payment tracking dates (when cash actually received)
  deposit_paid_date         DATE,
  materials_claim_paid_date DATE,
  subframe_claim_paid_date  DATE,
  completion_paid_date      DATE,

  -- Sales lifecycle dates
  quote_sent_date           DATE,
  won_date                  DATE,
  lost_date                 DATE,
  lost_reason               TEXT,

  -- Complexity add-ons (Black tier)
  complexity_stairs         INTEGER DEFAULT 0,        -- number of flights
  complexity_handrail_lm    NUMERIC(8,2) DEFAULT 0,  -- linear metres
  complexity_curve_hrs      NUMERIC(8,2) DEFAULT 0,
  complexity_other_hrs      NUMERIC(8,2) DEFAULT 0,

  -- Subframe detail
  subframe_rate             NUMERIC(10,2),   -- $/m²
  subframe_h4               BOOLEAN NOT NULL DEFAULT FALSE,

  -- Location
  address                   TEXT,
  suburb                    TEXT,

  notes                     TEXT,
  deleted_at                TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for common query patterns
CREATE INDEX idx_jobs_status      ON jobs(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_jobs_start_date  ON jobs(start_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_jobs_won_date    ON jobs(won_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_jobs_quote_sent  ON jobs(quote_sent_date) WHERE deleted_at IS NULL;

-- ============================================================
-- QUOTE LINE ITEMS
-- ============================================================
CREATE TABLE quote_line_items (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id        UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  item_type     TEXT NOT NULL CHECK (item_type IN (
                  'labour', 'materials', 'subframe', 'design_admin',
                  'complexity_stairs', 'complexity_handrail',
                  'complexity_curve', 'complexity_other', 'gst'
                )),
  description   TEXT NOT NULL,
  quantity      NUMERIC(10,2),
  unit          TEXT,            -- m², hrs, flights, lm, fixed
  unit_rate     NUMERIC(10,2),
  amount        NUMERIC(10,2) NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_quote_line_items_job ON quote_line_items(job_id);

-- ============================================================
-- TIMESHEETS
-- ============================================================
CREATE TABLE timesheets (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id      UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  crew_id     UUID NOT NULL REFERENCES crew(id),
  date        DATE NOT NULL,
  day_index   INTEGER NOT NULL CHECK (day_index BETWEEN 1 AND 8),
  hours       NUMERIC(4,2) NOT NULL CHECK (hours > 0 AND hours <= 24),
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_timesheets_job    ON timesheets(job_id);
CREATE INDEX idx_timesheets_crew   ON timesheets(crew_id);
CREATE INDEX idx_timesheets_date   ON timesheets(date);

-- ============================================================
-- MATERIAL ACTUALS
-- ============================================================
CREATE TABLE material_actuals (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id          UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  supplier        TEXT NOT NULL,
  description     TEXT NOT NULL,
  allowed_amount  NUMERIC(10,2) NOT NULL,   -- budgeted (from quote)
  actual_amount   NUMERIC(10,2),            -- actual invoice
  variance        NUMERIC(10,2) GENERATED ALWAYS AS (actual_amount - allowed_amount) STORED,
  purchase_date   DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_material_actuals_job ON material_actuals(job_id);

-- ============================================================
-- CASHFLOW EVENTS
-- ============================================================
CREATE TABLE cashflow_events (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id           UUID REFERENCES jobs(id) ON DELETE SET NULL,
  type             TEXT NOT NULL CHECK (type IN ('inflow', 'outflow')),
  category         TEXT NOT NULL CHECK (category IN (
                     'deposit',
                     'materials_claim',
                     'subframe_claim',
                     'completion_claim',
                     'payroll',
                     'materials',
                     'opex',
                     'tax',
                     'adhoc'
                   )),
  label            TEXT NOT NULL,
  amount           NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  scheduled_date   DATE NOT NULL,
  paid_date        DATE,                     -- NULL = outstanding
  auto_generated   BOOLEAN NOT NULL DEFAULT FALSE,  -- TRUE = created by job date trigger
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cashflow_scheduled   ON cashflow_events(scheduled_date);
CREATE INDEX idx_cashflow_job         ON cashflow_events(job_id) WHERE job_id IS NOT NULL;
CREATE INDEX idx_cashflow_paid        ON cashflow_events(paid_date) WHERE paid_date IS NOT NULL;
CREATE INDEX idx_cashflow_type_cat    ON cashflow_events(type, category);

-- ============================================================
-- SETTINGS
-- ============================================================
CREATE TABLE settings (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- AGENT MEMORY
-- ============================================================
CREATE TABLE agent_memory (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type        TEXT NOT NULL CHECK (type IN ('preference', 'decision', 'instruction', 'context')),
  content     TEXT NOT NULL,
  context     TEXT,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type        TEXT NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('owner', 'ops', 'finance', 'all')),
  job_id      UUID REFERENCES jobs(id) ON DELETE SET NULL,
  read        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_role    ON notifications(role);
CREATE INDEX idx_notifications_unread  ON notifications(read) WHERE read = FALSE;
CREATE INDEX idx_notifications_job     ON notifications(job_id) WHERE job_id IS NOT NULL;

-- ============================================================
-- CONVERSATION HISTORY (for agent chat persistence)
-- ============================================================
CREATE TABLE conversation_history (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content     TEXT NOT NULL,
  metadata    JSONB,   -- store parsed actions, context snapshot ref, etc.
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conversation_user ON conversation_history(user_id, created_at DESC);

-- ============================================================
-- UPDATED_AT auto-maintenance trigger
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_crew_updated_at
  BEFORE UPDATE ON crew
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_material_actuals_updated_at
  BEFORE UPDATE ON material_actuals
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_cashflow_events_updated_at
  BEFORE UPDATE ON cashflow_events
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
