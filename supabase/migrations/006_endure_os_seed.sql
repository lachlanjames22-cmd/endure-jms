-- ============================================================
-- ENDURE OS — Migration 006: Endure OS Seed Data
-- Business constants, crew, and Profit First accounts
-- ============================================================

-- ============================================================
-- SETTINGS: Endure OS business constants
-- Uses INSERT ... ON CONFLICT to be idempotent
-- ============================================================

-- Owner salary & fixed costs
INSERT INTO settings (key, value) VALUES
  ('owner_salary_weekly',    '1884.62'::jsonb),
  ('owner_salary_monthly',   '8167.00'::jsonb),
  ('opex_monthly',           '8714.93'::jsonb),
  ('total_fixed_monthly',    '16882.00'::jsonb),
  ('daily_fixed_burden',     '982.00'::jsonb),
  ('full_cost_pool_monthly', '31508.00'::jsonb),
  ('break_even_hourly',      '114.00'::jsonb),
  ('target_hourly',          '100.00'::jsonb),
  ('gp_target_pct',          '45'::jsonb),
  ('np_target_pct',          '20'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- Cash thresholds (update if different from existing)
INSERT INTO settings (key, value) VALUES
  ('cash_warn',    '20000'::jsonb),
  ('cash_crit',    '10000'::jsonb),
  ('credit_limit', '65000'::jsonb),
  ('credit_drawn', '5000'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- Liability accrual
INSERT INTO settings (key, value) VALUES
  ('liability_daily', '660.00'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- Profit First split percentages (stored as whole numbers, e.g. 25 = 25%)
INSERT INTO settings (key, value) VALUES
  ('pf_tax_pct',      '25'::jsonb),
  ('pf_profit_pct',   '10'::jsonb),
  ('pf_reserve_pct',  '10'::jsonb),
  ('pf_transact_pct', '55'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- BAS Q3 2026
INSERT INTO settings (key, value) VALUES
  ('bas_q3_due',    '"2026-04-28"'::jsonb),
  ('bas_q3_amount', '15151.00'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- Payroll
INSERT INTO settings (key, value) VALUES
  ('payroll_fortnightly_amount', '3886.89'::jsonb),
  ('payroll_cycle',              '"fortnightly_tuesday"'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- ============================================================
-- CREW: Endure OS crew members
-- Updates existing records to add phone/employment_type/sentiment,
-- or inserts if they don't exist
-- ============================================================

-- Lachlan James (owner)
INSERT INTO crew (name, type, base_rate, loaded_rate, payg_rate, pay_cycle, active, employment_type, sentiment_score)
VALUES (
  'Lachlan James',
  'full_time',
  NULL,
  NULL,
  0.26,
  'weekly',
  TRUE,
  'fulltime',
  NULL
)
ON CONFLICT DO NOTHING;

-- Update existing Lachlan Endure record if present, or handle by name match
UPDATE crew SET
  employment_type = 'fulltime',
  phone           = NULL   -- Lachlan sets this in app
WHERE name IN ('Lachlan Endure', 'Lachlan James') AND employment_type IS NULL;

-- Baylee Taylor — Lead Tradie
INSERT INTO crew (name, type, base_rate, loaded_rate, payg_rate, pay_cycle, active, employment_type, sentiment_score)
VALUES (
  'Baylee Taylor',
  'full_time',
  45.00,
  57.60,  -- base $45 × 1.28 on-costs = $57.60 loaded
  NULL,
  'fortnightly',
  TRUE,
  'fulltime',
  8
)
ON CONFLICT DO NOTHING;

UPDATE crew SET
  base_rate       = 45.00,
  loaded_rate     = 57.60,
  employment_type = 'fulltime',
  sentiment_score = COALESCE(sentiment_score, 8)
WHERE name = 'Baylee Taylor';

-- Marius Hauser — Tradie (sentiment: declining, score 5)
INSERT INTO crew (name, type, base_rate, loaded_rate, payg_rate, pay_cycle, active, employment_type, sentiment_score)
VALUES (
  'Marius Hauser',
  'full_time',
  38.00,
  48.64,  -- base $38 × 1.28 on-costs = $48.64 loaded
  NULL,
  'fortnightly',
  TRUE,
  'fulltime',
  5
)
ON CONFLICT DO NOTHING;

UPDATE crew SET
  base_rate       = 38.00,
  loaded_rate     = 48.64,
  employment_type = 'fulltime',
  sentiment_score = COALESCE(sentiment_score, 5)
WHERE name = 'Marius Hauser';

-- Ash — Casual (inactive)
UPDATE crew SET employment_type = 'casual' WHERE name = 'Ash';

-- Subcontractor — ABN labourer
UPDATE crew SET employment_type = 'abn' WHERE name IN ('Labourer (Subby)', 'Subcontractor');

-- ============================================================
-- PROFIT FIRST ACCOUNTS: Opening balances
-- ============================================================
INSERT INTO pf_accounts (name, balance) VALUES
  ('transactions', 24300.00),
  ('tax',          11200.00),
  ('reserve',      12000.00),
  ('profit',        4600.00)
ON CONFLICT (name) DO UPDATE SET balance = EXCLUDED.balance, updated_at = NOW();

-- ============================================================
-- PERSONAL FINANCE: Single row for Lachlan
-- ============================================================
INSERT INTO personal_finance (home_value, mortgage_remaining, move_target, ip_target, cash_savings, business_equity)
VALUES (800000, 400000, 1100000, 800000, 0, 0)
ON CONFLICT DO NOTHING;

-- ============================================================
-- CASHFLOW: Seed recurring payroll events
-- Next fortnightly payroll (Tuesdays)
-- ============================================================
INSERT INTO cashflow_events (label, amount, type, category, scheduled_date, auto_generated, recurring, recur_rule)
VALUES
  ('Fortnightly Payroll — Baylee + Marius', 3886.89, 'outflow', 'payroll', '2026-03-10', TRUE, TRUE, 'fortnightly_tuesday')
ON CONFLICT DO NOTHING;
