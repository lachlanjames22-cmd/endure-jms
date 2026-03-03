-- ============================================================
-- ENDURE DECKING JMS — Migration 003: Seed Data
-- ============================================================

-- ============================================================
-- PRODUCTS (13 products from spec)
-- Columns: name, category, cost_per_m2, rate_full_subframe,
--          rate_over_concrete, rate_redeck, durability_score
-- ============================================================
INSERT INTO products (name, category, cost_per_m2, rate_full_subframe, rate_over_concrete, rate_redeck, durability_score, active) VALUES
  -- Timber
  ('Merbau 140mm',             'timber',    88.20, 420, 400, 165, 7.0, TRUE),
  ('Spotted Gum 140mm',        'timber',   203.70, 535, 525, 280, 8.5, TRUE),
  ('Jarrah 135mm',             'timber',   155.30, 490, 470, 230, 7.5, TRUE),
  ('Fijian Mahogany 140mm',    'timber',   150.90, 485, 465, 225, 8.5, TRUE),
  ('Blackbutt 136mm',          'timber',   211.40, 545, 535, 290, 8.0, TRUE),
  -- Composite
  ('EvaLast Apex 190x24',      'composite', 245.50, 580, 570, 320, 9.0, TRUE),
  ('EvaLast Infinity 135x25',  'composite', 152.00, 485, 470, 235, 9.0, TRUE),
  ('EvaLast Pioneer 145mm',    'composite', 306.00, 640, 635, 385, 9.0, TRUE),
  ('Modwood Natural Grain 138mm','composite',179.50, 510, 500, 255, 7.5, TRUE),
  ('Modwood Flame Shield',     'composite', 207.00, 540, 530, 280, 8.0, TRUE),
  ('MoistureShield Meridian',  'composite', 234.50, 565, 560, 305, 9.0, TRUE),
  ('Trex Transcend 140mm',     'composite', 267.50, 600, 595, 345, 8.5, TRUE),
  ('Millboard',                'composite', 405.00, 735, 745, 480, 9.5, TRUE);

-- ============================================================
-- CREW (6 members from spec)
-- ============================================================
INSERT INTO crew (name, type, base_rate, loaded_rate, payg_rate, pay_cycle, active) VALUES
  -- Owner
  ('Lachlan Endure',    'full_time',  NULL,  NULL, 0.26, 'weekly',      TRUE),
  -- Field staff — full time
  ('Baylee Taylor',     'full_time',  45.00, 55.00, NULL, 'fortnightly', TRUE),
  ('Marius Hauser',     'full_time',  38.00, 43.77, NULL, 'fortnightly', TRUE),
  -- Casuals
  ('Ash',               'casual',     38.00, 45.60, NULL, 'fortnightly', TRUE),
  ('Lachy',             'casual',     60.00, 72.00, NULL, 'fortnightly', TRUE),
  -- Subby
  ('Labourer (Subby)',  'subby',      35.00, 35.00, NULL, 'invoice',     TRUE),
  -- Experiment slot — inactive until toggled
  ('Leading Hand',      'experiment', 50.00, 57.59, NULL, 'fortnightly', FALSE);

-- ============================================================
-- SETTINGS
-- All business constants, thresholds, and config
-- ============================================================
INSERT INTO settings (key, value) VALUES

  -- Payroll config
  ('payroll_anchor_date',
   '"2025-01-06"'::jsonb),   -- fortnightly anchor — update to actual

  ('owner_pay_day',
   '"monday"'::jsonb),        -- day of week owner nominates

  -- Opening balance — update before going live
  ('opening_balance',
   '0'::jsonb),

  -- Workcover: paid months 1–10 of policy year (Jan–Oct default)
  ('workcover_active_months',
   '[1,2,3,4,5,6,7,8,9,10]'::jsonb),

  -- BAS quarters (month numbers when BAS falls due)
  ('bas_quarters',
   '[3,6,9,12]'::jsonb),     -- Mar, Jun, Sep, Dec

  -- Credit facility
  ('credit_facility_limit',
   '65000'::jsonb),
  ('credit_facility_drawn',
   '5000'::jsonb),

  -- Cash alert thresholds
  ('cash_warning_threshold',
   '20000'::jsonb),
  ('cash_critical_threshold',
   '10000'::jsonb),

  -- ---- COPS (Cost of Operations) constants ----
  ('cops_monthly_labour',
   '25009.86'::jsonb),
  ('cops_monthly_opex',
   '8714.93'::jsonb),
  ('cops_monthly_total',
   '33724.79'::jsonb),
  ('cops_daily_total',
   '1873.60'::jsonb),
  ('cops_daily_labour',
   '1389.44'::jsonb),
  ('cops_daily_opex',
   '484.16'::jsonb),
  ('cops_per_billable_hour_raw',
   '99.66'::jsonb),
  ('cops_per_billable_hour_75pct',
   '132.88'::jsonb),
  ('cops_billable_days_per_month',
   '18'::jsonb),
  ('cops_billable_days_per_year',
   '210'::jsonb),
  ('cops_breakeven_monthly',
   '33725'::jsonb),
  ('cops_revenue_target_45gp',
   '74944'::jsonb),

  -- ---- Payroll constants ----
  ('payroll_owner_salary_annual',
   '98000'::jsonb),
  ('payroll_owner_weekly_gross',
   '1884.62'::jsonb),
  ('payroll_owner_weekly_net',
   '1776'::jsonb),
  ('payroll_owner_billable_hrs_wk',
   '10'::jsonb),
  ('payroll_owner_nonbillable_hrs_wk',
   '20'::jsonb),
  ('payroll_fixed_weekly_field',   -- Baylee + Marius only
   '3886.89'::jsonb),
  ('payroll_total_weekly_inc_owner',
   '5771.51'::jsonb),

  -- ---- Opex line items (monthly) ----
  ('opex_breakdown', '{
    "workcover_insurance": 1666.67,
    "ato_debt_repayment": 1200,
    "motor_vehicle_fuel": 800,
    "car_holding_allowance": 900,
    "subscriptions": 600,
    "google_ads": 500,
    "content_retainer": 500,
    "buildxact": 399,
    "tools_consumables": 300,
    "accounting_fees": 200,
    "bookkeeping": 150,
    "vehicle_rm": 150,
    "credit_facility_fee": 120,
    "insurance_biz_vehicle": 107,
    "uniforms_ppe": 100,
    "vehicle_rego": 80,
    "vehicle_insurance": 80,
    "telephone_internet": 50,
    "bank_fees": 10,
    "filing_fees": 10
  }'::jsonb),

  -- ---- Pricing constants ----
  ('pricing_labour_day_rate',
   '2400'::jsonb),             -- charge-out per day
  ('pricing_labour_backcost_day',
   '1800'::jsonb),             -- backcost per day
  ('pricing_design_admin_fixed',
   '1000'::jsonb),             -- fixed design/admin fee
  ('pricing_subframe_rate_per_m2',
   '110'::jsonb),              -- standard subframe $/m²
  ('pricing_subframe_h4_premium',
   '20'::jsonb),               -- extra $/m² for H4 treatment
  ('pricing_complexity_hourly',
   '110'::jsonb),              -- Black tier complexity $/hr
  ('pricing_complexity_stairs_hrs',
   '6'::jsonb),                -- hrs per flight
  ('pricing_complexity_handrail_hrs',
   '0.5'::jsonb),              -- hrs per lm
  ('pricing_materials_markup',
   '0.10'::jsonb),             -- 10% buffer on materials passthrough
  ('pricing_gst_rate',
   '0.10'::jsonb),
  ('pricing_black_tier_markup',
   '0.20'::jsonb),             -- +20% on Black tier

  -- ---- Sales benchmarks ----
  ('sales_avg_jobs_per_month',
   '2.2'::jsonb),
  ('sales_target_jobs_per_month',
   '6'::jsonb),
  ('sales_avg_job_value',
   '20232'::jsonb),
  ('sales_avg_job_sqm',
   '32'::jsonb),
  ('sales_win_rate_actual',
   '0.38'::jsonb),
  ('sales_win_rate_target',
   '0.40'::jsonb),
  ('sales_target_monthly_revenue',
   '45087.58'::jsonb),
  ('sales_target_quotes_per_month',
   '15'::jsonb),
  ('sales_quote_followup_days',
   '10'::jsonb),
  ('sales_quote_expiry_days',
   '30'::jsonb),

  -- ---- GP / performance targets ----
  ('target_gp_pct',
   '0.45'::jsonb),
  ('target_gp_pct_amber',
   '0.36'::jsonb),
  ('target_revenue_per_hour',
   '100'::jsonb),
  ('target_revenue_per_hour_amber',
   '80'::jsonb),
  ('target_np_opex_benchmark_per_hour',
   '85'::jsonb),

  -- ---- Progress claim schedule (fractions of quoted_total_value) ----
  ('claim_schedule', '{
    "deposit": 0.10,
    "materials": 0.50,
    "subframe": 0.20,
    "completion": 0.20
  }'::jsonb),

  -- ---- Agent alerts config ----
  ('alert_payroll_cash_buffer_multiple',
   '1.5'::jsonb),              -- warn if cash < payroll × 1.5 within 3 days
  ('alert_pipeline_months_ahead',
   '3'::jsonb),                -- check pipeline covers N months remaining in quarter
  ('alert_bas_advance_days',
   '30'::jsonb),               -- warn N days before BAS quarter end
  ('alert_job_no_timesheet_days',
   '2'::jsonb);                -- alert if in_progress with no timesheet after N days

-- ============================================================
-- INITIAL AGENT MEMORY (standing instructions)
-- ============================================================
INSERT INTO agent_memory (type, content, context, active) VALUES
  ('instruction',
   'Do not schedule jobs to start on Mondays — use Tuesdays or later in the week.',
   'Ops scheduling preference from Lachlan.',
   TRUE),
  ('instruction',
   'Always warn before payroll fires if cash is under $25,000.',
   'Cash safety margin above the $20k warning threshold.',
   TRUE),
  ('instruction',
   'Ad spend ($1,000/month Google Ads + content retainer) is the primary lead lever. Flag if pipeline drops and ad status is unknown or paused.',
   'Sales pipeline health.',
   TRUE),
  ('instruction',
   'GP is always calculated on labour value only, never on total job revenue including materials passthrough.',
   'Non-negotiable finance rule.',
   TRUE),
  ('instruction',
   'Black tier jobs: price to be rejected. If won, the margin must justify the complexity — check actual GP% at completion.',
   'JW tier strategy.',
   TRUE);
