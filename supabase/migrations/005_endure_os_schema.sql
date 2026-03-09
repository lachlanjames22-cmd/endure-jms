-- ============================================================
-- ENDURE OS — Migration 005: Endure OS Extended Schema
-- Adds new tables and extends existing ones for Endure OS / Jarvis
-- ============================================================

-- ============================================================
-- EXTEND CREW TABLE
-- Add phone, sentiment_score (may already exist), auth_user_id
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crew' AND column_name = 'phone'
  ) THEN
    ALTER TABLE crew ADD COLUMN phone TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crew' AND column_name = 'sentiment_score'
  ) THEN
    ALTER TABLE crew ADD COLUMN sentiment_score NUMERIC CHECK (sentiment_score BETWEEN 1 AND 10);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crew' AND column_name = 'auth_user_id'
  ) THEN
    ALTER TABLE crew ADD COLUMN auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crew' AND column_name = 'employment_type'
  ) THEN
    ALTER TABLE crew ADD COLUMN employment_type TEXT CHECK (employment_type IN ('fulltime', 'casual', 'abn'));
  END IF;
END $$;

-- ============================================================
-- EXTEND JOBS TABLE
-- Add Endure OS payment tracking and Jarvis-specific fields
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'job_type'
  ) THEN
    ALTER TABLE jobs ADD COLUMN job_type TEXT CHECK (job_type IN ('deck', 'pergola', 'deck_pergola', 'stairs', 'reno'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'jw_label'
  ) THEN
    ALTER TABLE jobs ADD COLUMN jw_label TEXT CHECK (jw_label IN ('red', 'black', 'blue'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'deposit_pct'
  ) THEN
    ALTER TABLE jobs ADD COLUMN deposit_pct NUMERIC DEFAULT 10;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'subframe_pct'
  ) THEN
    ALTER TABLE jobs ADD COLUMN subframe_pct NUMERIC DEFAULT 50;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'final_pct'
  ) THEN
    ALTER TABLE jobs ADD COLUMN final_pct NUMERIC DEFAULT 40;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'deposit_paid'
  ) THEN
    ALTER TABLE jobs ADD COLUMN deposit_paid BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'deposit_paid_at'
  ) THEN
    ALTER TABLE jobs ADD COLUMN deposit_paid_at TIMESTAMPTZ;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'subframe_paid'
  ) THEN
    ALTER TABLE jobs ADD COLUMN subframe_paid BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'subframe_paid_at'
  ) THEN
    ALTER TABLE jobs ADD COLUMN subframe_paid_at TIMESTAMPTZ;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'final_paid'
  ) THEN
    ALTER TABLE jobs ADD COLUMN final_paid BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'final_paid_at'
  ) THEN
    ALTER TABLE jobs ADD COLUMN final_paid_at TIMESTAMPTZ;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'stage'
  ) THEN
    ALTER TABLE jobs ADD COLUMN stage TEXT CHECK (stage IN ('before', 'frame', 'deck', 'complete'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'client_phone'
  ) THEN
    ALTER TABLE jobs ADD COLUMN client_phone TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'client_email'
  ) THEN
    ALTER TABLE jobs ADD COLUMN client_email TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'quoted_hrs'
  ) THEN
    ALTER TABLE jobs ADD COLUMN quoted_hrs NUMERIC;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'quoted_value'
  ) THEN
    ALTER TABLE jobs ADD COLUMN quoted_value NUMERIC;
  END IF;
END $$;

-- ============================================================
-- EXTEND CASHFLOW_EVENTS TABLE
-- Add pf_allocation jsonb and recurring fields
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cashflow_events' AND column_name = 'pf_allocation'
  ) THEN
    ALTER TABLE cashflow_events ADD COLUMN pf_allocation JSONB;
    COMMENT ON COLUMN cashflow_events.pf_allocation IS
      'Profit First split: {tax: n, profit: n, reserve: n, transactions: n}. Set on payment events only.';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cashflow_events' AND column_name = 'recurring'
  ) THEN
    ALTER TABLE cashflow_events ADD COLUMN recurring BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cashflow_events' AND column_name = 'recur_rule'
  ) THEN
    ALTER TABLE cashflow_events ADD COLUMN recur_rule TEXT
      CHECK (recur_rule IN ('fortnightly_tuesday', 'monthly_1st') OR recur_rule IS NULL);
  END IF;
END $$;

-- ============================================================
-- JOB LABOUR
-- ============================================================
CREATE TABLE IF NOT EXISTS job_labour (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id       UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  crew_id      UUID NOT NULL REFERENCES crew(id),
  date         DATE NOT NULL,
  hours        NUMERIC NOT NULL CHECK (hours > 0),
  rate_loaded  NUMERIC NOT NULL,   -- snapshot of loaded rate at time of entry
  cost         NUMERIC GENERATED ALWAYS AS (hours * rate_loaded) STORED,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_labour_job  ON job_labour(job_id);
CREATE INDEX IF NOT EXISTS idx_job_labour_crew ON job_labour(crew_id);
CREATE INDEX IF NOT EXISTS idx_job_labour_date ON job_labour(date);

-- ============================================================
-- JOB MATERIALS
-- ============================================================
CREATE TABLE IF NOT EXISTS job_materials (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id    UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  item      TEXT NOT NULL,
  qty       TEXT,
  cost      NUMERIC,
  supplier  TEXT,
  status    TEXT CHECK (status IN ('on_site', 'needed', 'ordered')) DEFAULT 'needed',
  date      DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_materials_job    ON job_materials(job_id);
CREATE INDEX IF NOT EXISTS idx_job_materials_status ON job_materials(status);

CREATE TRIGGER trg_job_materials_updated_at
  BEFORE UPDATE ON job_materials
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- PROFIT FIRST ACCOUNTS
-- ============================================================
CREATE TABLE IF NOT EXISTS pf_accounts (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL UNIQUE CHECK (name IN ('transactions', 'tax', 'reserve', 'profit')),
  balance    NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_pf_accounts_updated_at
  BEFORE UPDATE ON pf_accounts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- DAILY LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS daily_logs (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id     UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  crew_id    UUID NOT NULL REFERENCES crew(id),
  date       DATE NOT NULL,
  progress   TEXT,
  materials  TEXT,
  issues     TEXT,
  hrs_logged NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_logs_job  ON daily_logs(job_id);
CREATE INDEX IF NOT EXISTS idx_daily_logs_crew ON daily_logs(crew_id);
CREATE INDEX IF NOT EXISTS idx_daily_logs_date ON daily_logs(date);

-- ============================================================
-- PHOTOS
-- ============================================================
CREATE TABLE IF NOT EXISTS photos (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id       UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  crew_id      UUID REFERENCES crew(id),
  stage        TEXT CHECK (stage IN ('before', 'frame', 'deck', 'complete')),
  label        TEXT,
  storage_path TEXT NOT NULL,   -- Supabase Storage path
  sent_client  BOOLEAN DEFAULT FALSE,
  sent_at      TIMESTAMPTZ,
  uploaded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_photos_job   ON photos(job_id);
CREATE INDEX IF NOT EXISTS idx_photos_stage ON photos(stage);

-- ============================================================
-- CHECKIN RESPONSES
-- ============================================================
CREATE TABLE IF NOT EXISTS checkin_responses (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id              UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  crew_id             UUID NOT NULL REFERENCES crew(id),
  date                DATE NOT NULL,
  vibe                INTEGER NOT NULL CHECK (vibe BETWEEN 1 AND 5),
  callback_risk       BOOLEAN NOT NULL DEFAULT FALSE,
  note                TEXT,
  next_needs          TEXT,
  streak_contribution BOOLEAN GENERATED ALWAYS AS (vibe >= 4 AND callback_risk = FALSE) STORED,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_checkin_job  ON checkin_responses(job_id);
CREATE INDEX IF NOT EXISTS idx_checkin_crew ON checkin_responses(crew_id);
CREATE INDEX IF NOT EXISTS idx_checkin_date ON checkin_responses(date);

-- ============================================================
-- DECISIONS LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS decisions (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date      DATE NOT NULL DEFAULT CURRENT_DATE,
  decision  TEXT NOT NULL,
  options   TEXT,
  rationale TEXT,
  outcome   TEXT CHECK (outcome IN ('pending', 'correct', 'incorrect', 'n/a')) DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_decisions_date ON decisions(date);

-- ============================================================
-- PERSONAL FINANCE (single row for Lachlan)
-- ============================================================
CREATE TABLE IF NOT EXISTS personal_finance (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  home_value          NUMERIC DEFAULT 800000,
  mortgage_remaining  NUMERIC DEFAULT 400000,
  home_equity         NUMERIC GENERATED ALWAYS AS (home_value - mortgage_remaining) STORED,
  move_target         NUMERIC DEFAULT 1100000,
  ip_target           NUMERIC DEFAULT 800000,
  cash_savings        NUMERIC DEFAULT 0,
  business_equity     NUMERIC DEFAULT 0,   -- estimated, updated quarterly
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_personal_finance_updated_at
  BEFORE UPDATE ON personal_finance
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- FUNCTION: allocate_profit_first
-- Called when subframe_paid or final_paid is set on a job.
-- Splits the payment amount per Profit First percentages and
-- updates pf_accounts balances + creates cashflow_event record.
-- ============================================================
CREATE OR REPLACE FUNCTION allocate_profit_first(
  p_job_id    UUID,
  p_amount    NUMERIC,
  p_label     TEXT,
  p_event_date DATE
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_tax_pct     NUMERIC := 0.25;
  v_profit_pct  NUMERIC := 0.10;
  v_reserve_pct NUMERIC := 0.10;
  v_transact_pct NUMERIC := 0.55;
  v_tax_amt     NUMERIC;
  v_profit_amt  NUMERIC;
  v_reserve_amt NUMERIC;
  v_transact_amt NUMERIC;
  v_allocation  JSONB;
BEGIN
  -- Fetch PF percentages from settings if available
  BEGIN
    SELECT (value::TEXT)::NUMERIC INTO v_tax_pct     FROM settings WHERE key = 'pf_tax_pct';
    SELECT (value::TEXT)::NUMERIC INTO v_profit_pct  FROM settings WHERE key = 'pf_profit_pct';
    SELECT (value::TEXT)::NUMERIC INTO v_reserve_pct FROM settings WHERE key = 'pf_reserve_pct';
    SELECT (value::TEXT)::NUMERIC INTO v_transact_pct FROM settings WHERE key = 'pf_transact_pct';
    -- Convert from pct to fraction if stored as whole numbers
    IF v_tax_pct > 1 THEN v_tax_pct := v_tax_pct / 100; END IF;
    IF v_profit_pct > 1 THEN v_profit_pct := v_profit_pct / 100; END IF;
    IF v_reserve_pct > 1 THEN v_reserve_pct := v_reserve_pct / 100; END IF;
    IF v_transact_pct > 1 THEN v_transact_pct := v_transact_pct / 100; END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL; -- use defaults
  END;

  v_tax_amt     := ROUND(p_amount * v_tax_pct, 2);
  v_profit_amt  := ROUND(p_amount * v_profit_pct, 2);
  v_reserve_amt := ROUND(p_amount * v_reserve_pct, 2);
  v_transact_amt := p_amount - v_tax_amt - v_profit_amt - v_reserve_amt;  -- remainder to avoid rounding gap

  v_allocation := JSONB_BUILD_OBJECT(
    'tax',          v_tax_amt,
    'profit',       v_profit_amt,
    'reserve',      v_reserve_amt,
    'transactions', v_transact_amt
  );

  -- Update pf_accounts balances
  UPDATE pf_accounts SET balance = balance + v_tax_amt     WHERE name = 'tax';
  UPDATE pf_accounts SET balance = balance + v_profit_amt  WHERE name = 'profit';
  UPDATE pf_accounts SET balance = balance + v_reserve_amt WHERE name = 'reserve';
  UPDATE pf_accounts SET balance = balance + v_transact_amt WHERE name = 'transactions';

  -- Record in cashflow_events with PF allocation
  INSERT INTO cashflow_events (job_id, type, category, label, amount, scheduled_date, auto_generated, pf_allocation)
  VALUES (
    p_job_id,
    'inflow',
    'completion_claim',
    p_label,
    p_amount,
    p_event_date,
    TRUE,
    v_allocation
  );

  RETURN v_allocation;
END;
$$;

-- ============================================================
-- TRIGGER: auto Profit First allocation on subframe_paid / final_paid
-- ============================================================
CREATE OR REPLACE FUNCTION trg_job_payment_received()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_subframe_amount NUMERIC;
  v_final_amount    NUMERIC;
  v_allocation      JSONB;
BEGIN
  -- Subframe payment fired
  IF NEW.subframe_paid = TRUE AND (OLD.subframe_paid IS NULL OR OLD.subframe_paid = FALSE) THEN
    v_subframe_amount := COALESCE(NEW.quoted_value, NEW.quoted_total_value, 0) *
                         COALESCE(NEW.subframe_pct, 20) / 100;
    IF v_subframe_amount > 0 THEN
      v_allocation := allocate_profit_first(
        NEW.id,
        v_subframe_amount,
        COALESCE(NEW.name, NEW.client_name || ' — Subframe Claim'),
        COALESCE(NEW.subframe_paid_at::DATE, CURRENT_DATE)
      );
    END IF;
  END IF;

  -- Final payment fired
  IF NEW.final_paid = TRUE AND (OLD.final_paid IS NULL OR OLD.final_paid = FALSE) THEN
    v_final_amount := COALESCE(NEW.quoted_value, NEW.quoted_total_value, 0) *
                      COALESCE(NEW.final_pct, 40) / 100;
    IF v_final_amount > 0 THEN
      v_allocation := allocate_profit_first(
        NEW.id,
        v_final_amount,
        COALESCE(NEW.name, NEW.client_name || ' — Final Claim'),
        COALESCE(NEW.final_paid_at::DATE, CURRENT_DATE)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_job_pf_allocation
  AFTER UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION trg_job_payment_received();
