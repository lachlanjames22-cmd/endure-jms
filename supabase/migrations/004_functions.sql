-- ============================================================
-- ENDURE DECKING JMS — Migration 004: Database Functions
-- Core business logic that must be atomic / server-side
-- ============================================================

-- ============================================================
-- FUNCTION: create_progress_claim_events
-- Called when Ops sets job dates (job moves to Won).
-- Reads claim schedule from settings, auto-creates 4 cashflow_events.
-- Runs as SECURITY DEFINER so Ops can trigger it without direct
-- cashflow_events write access.
-- ============================================================
CREATE OR REPLACE FUNCTION create_progress_claim_events(p_job_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_job             jobs%ROWTYPE;
  v_schedule        JSONB;
  v_deposit_pct     NUMERIC;
  v_materials_pct   NUMERIC;
  v_subframe_pct    NUMERIC;
  v_completion_pct  NUMERIC;
  v_total           NUMERIC;
BEGIN
  -- Fetch job
  SELECT * INTO v_job FROM jobs WHERE id = p_job_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job % not found', p_job_id;
  END IF;

  -- Validate required dates are set
  IF v_job.start_date IS NULL OR
     v_job.materials_delivery_date IS NULL OR
     v_job.subframe_complete_date IS NULL OR
     v_job.completion_date IS NULL THEN
    RAISE EXCEPTION 'All 4 job dates must be set before creating cashflow events';
  END IF;

  -- Fetch claim schedule percentages
  SELECT value INTO v_schedule FROM settings WHERE key = 'claim_schedule';
  v_deposit_pct     := (v_schedule->>'deposit')::NUMERIC;
  v_materials_pct   := (v_schedule->>'materials')::NUMERIC;
  v_subframe_pct    := (v_schedule->>'subframe')::NUMERIC;
  v_completion_pct  := (v_schedule->>'completion')::NUMERIC;

  -- Use quoted_total_value (inc materials, ex GST at this stage — GST billed separately)
  -- If the business bills GST on top, use quoted_total_value * 1.1
  v_total := COALESCE(v_job.quoted_total_value, 0);

  -- Remove any existing auto-generated events for this job
  -- (handles case where Ops corrects dates)
  DELETE FROM cashflow_events
  WHERE job_id = p_job_id AND auto_generated = TRUE
    AND category IN ('deposit','materials_claim','subframe_claim','completion_claim');

  -- Insert 4 progress claim events
  INSERT INTO cashflow_events (job_id, type, category, label, amount, scheduled_date, auto_generated)
  VALUES
    (p_job_id, 'inflow', 'deposit',
     v_job.name || ' — 10% Deposit',
     ROUND(v_total * v_deposit_pct, 2),
     v_job.start_date,
     TRUE),

    (p_job_id, 'inflow', 'materials_claim',
     v_job.name || ' — 50% Materials Claim',
     ROUND(v_total * v_materials_pct, 2),
     v_job.materials_delivery_date,
     TRUE),

    (p_job_id, 'inflow', 'subframe_claim',
     v_job.name || ' — 20% Subframe Claim',
     ROUND(v_total * v_subframe_pct, 2),
     v_job.subframe_complete_date,
     TRUE),

    (p_job_id, 'inflow', 'completion_claim',
     v_job.name || ' — 20% Completion Claim',
     ROUND(v_total * v_completion_pct, 2),
     v_job.completion_date,
     TRUE);

END;
$$;

-- ============================================================
-- FUNCTION: notify_finance_dates_set
-- Creates a notification for the finance role when Ops sets dates.
-- ============================================================
CREATE OR REPLACE FUNCTION notify_finance_dates_set(p_job_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_job jobs%ROWTYPE;
BEGIN
  SELECT * INTO v_job FROM jobs WHERE id = p_job_id;

  INSERT INTO notifications (type, title, body, role, job_id)
  VALUES (
    'dates_set',
    'Job dates updated — cashflow refreshed',
    'Ops set dates for ' || v_job.name ||
      '. Start: ' || TO_CHAR(v_job.start_date, 'DD Mon YYYY') ||
      ' | Completion: ' || TO_CHAR(v_job.completion_date, 'DD Mon YYYY') ||
      '. Progress claim events auto-created in cashflow.',
    'finance',
    p_job_id
  );
END;
$$;

-- ============================================================
-- FUNCTION: complete_job_snapshot
-- Called when Ops marks a job Complete.
-- Locks actual labour hours from timesheets.
-- Locks actual material cost from material_actuals.
-- Calculates actual GP.
-- Creates a notification for Finance.
-- ============================================================
CREATE OR REPLACE FUNCTION complete_job_snapshot(p_job_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_job              jobs%ROWTYPE;
  v_actual_hrs       NUMERIC;
  v_actual_mat_cost  NUMERIC;
  v_labour_backcost  NUMERIC;
  v_backcost_per_hr  NUMERIC;
  v_actual_labour_v  NUMERIC;
  v_actual_gp        NUMERIC;
  v_actual_gp_pct    NUMERIC;
  v_target_gp        NUMERIC;
BEGIN
  SELECT * INTO v_job FROM jobs WHERE id = p_job_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job % not found', p_job_id;
  END IF;

  -- Sum all timesheet hours for this job
  SELECT COALESCE(SUM(hours), 0)
  INTO v_actual_hrs
  FROM timesheets
  WHERE job_id = p_job_id;

  -- Sum actual material costs
  SELECT COALESCE(SUM(actual_amount), 0)
  INTO v_actual_mat_cost
  FROM material_actuals
  WHERE job_id = p_job_id AND actual_amount IS NOT NULL;

  -- Actual labour value = quoted_total_value minus actual material cost
  -- (materials is a passthrough, labour value is what's left)
  v_actual_labour_v := COALESCE(v_job.quoted_total_value, 0) - v_actual_mat_cost;

  -- Labour backcost = days worked × $1,800/day backcost
  -- Approximate days from hours (8hr days)
  v_labour_backcost := CEIL(v_actual_hrs / 8.0) * 1800;

  -- Actual GP
  v_actual_gp     := v_actual_labour_v - v_labour_backcost;
  v_actual_gp_pct := CASE
    WHEN v_actual_labour_v > 0 THEN v_actual_gp / v_actual_labour_v
    ELSE 0
  END;

  -- Update job with actuals
  UPDATE jobs SET
    actual_labour_hours  = v_actual_hrs,
    actual_labour_value  = v_actual_labour_v,
    actual_gp_amount     = v_actual_gp,
    actual_gp_pct        = v_actual_gp_pct,
    status               = 'complete',
    completion_date      = COALESCE(completion_date, CURRENT_DATE)
  WHERE id = p_job_id;

  -- Fetch GP target for alert check
  SELECT (value::TEXT)::NUMERIC INTO v_target_gp
  FROM settings WHERE key = 'target_gp_pct';

  -- Notify finance — always
  INSERT INTO notifications (type, title, body, role, job_id)
  VALUES (
    'job_complete',
    v_job.name || ' — marked complete',
    'Actuals locked: ' ||
      v_actual_hrs || ' hrs | Labour value $' || ROUND(v_actual_labour_v, 0) ||
      ' | GP ' || ROUND(v_actual_gp_pct * 100, 1) || '%' ||
      CASE WHEN v_actual_gp_pct < v_target_gp
        THEN ' ⚠ BELOW TARGET (' || ROUND(v_target_gp * 100, 0) || '%)'
        ELSE ''
      END,
    'finance',
    p_job_id
  );

  -- Notify owner if GP below target
  IF v_actual_gp_pct < v_target_gp THEN
    INSERT INTO notifications (type, title, body, role, job_id)
    VALUES (
      'gp_below_target',
      'GP below target — ' || v_job.name,
      'Actual GP: ' || ROUND(v_actual_gp_pct * 100, 1) || '% vs ' ||
        ROUND(v_target_gp * 100, 0) || '% target. Labour value: $' ||
        ROUND(v_actual_labour_v, 0) || ' | Hours: ' || v_actual_hrs,
      'owner',
      p_job_id
    );
  END IF;

END;
$$;

-- ============================================================
-- FUNCTION: get_cashflow_position
-- Returns 30-day rolling cashflow for the agent context endpoint.
-- Used by GET /api/cashflow/position
-- ============================================================
CREATE OR REPLACE FUNCTION get_cashflow_position()
RETURNS JSON LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_opening_balance  NUMERIC;
  v_today_balance    NUMERIC;
  v_day30_balance    NUMERIC;
  v_lowest_balance   NUMERIC := NULL;
  v_lowest_date      DATE    := NULL;
  v_running          NUMERIC;
  v_row              RECORD;
  v_warning          NUMERIC;
  v_critical         NUMERIC;
  v_status           TEXT;
BEGIN
  -- Get opening balance from settings
  SELECT (value::TEXT)::NUMERIC INTO v_opening_balance
  FROM settings WHERE key = 'opening_balance';

  SELECT (value::TEXT)::NUMERIC INTO v_warning
  FROM settings WHERE key = 'cash_warning_threshold';

  SELECT (value::TEXT)::NUMERIC INTO v_critical
  FROM settings WHERE key = 'cash_critical_threshold';

  v_opening_balance := COALESCE(v_opening_balance, 0);
  v_running := v_opening_balance;

  -- Walk all cashflow events from earliest paid/scheduled to today+30
  FOR v_row IN
    SELECT
      COALESCE(paid_date, scheduled_date) AS event_date,
      CASE type WHEN 'inflow' THEN amount ELSE -amount END AS net_amount
    FROM cashflow_events
    WHERE COALESCE(paid_date, scheduled_date) <= CURRENT_DATE + 30
    ORDER BY 1
  LOOP
    v_running := v_running + v_row.net_amount;

    IF v_row.event_date = CURRENT_DATE THEN
      v_today_balance := v_running;
    END IF;

    IF v_row.event_date <= CURRENT_DATE + 30 THEN
      IF v_lowest_balance IS NULL OR v_running < v_lowest_balance THEN
        v_lowest_balance := v_running;
        v_lowest_date    := v_row.event_date;
      END IF;
    END IF;
  END LOOP;

  -- If no events today, today's balance = running total through today
  v_today_balance  := COALESCE(v_today_balance, v_running);
  v_day30_balance  := v_running;
  v_lowest_balance := COALESCE(v_lowest_balance, v_running);

  -- Status
  v_status := CASE
    WHEN v_lowest_balance < v_critical THEN 'critical'
    WHEN v_lowest_balance < v_warning  THEN 'warning'
    ELSE 'healthy'
  END;

  RETURN JSON_BUILD_OBJECT(
    'balance_today',      ROUND(v_today_balance, 2),
    'projected_day_30',   ROUND(v_day30_balance, 2),
    'lowest_balance',     ROUND(v_lowest_balance, 2),
    'lowest_date',        v_lowest_date,
    'warning_threshold',  v_warning,
    'critical_threshold', v_critical,
    'status',             v_status
  );
END;
$$;

-- ============================================================
-- FUNCTION: get_pipeline_summary
-- Aggregates pipeline metrics for agent context endpoint.
-- ============================================================
CREATE OR REPLACE FUNCTION get_pipeline_summary()
RETURNS JSON LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT JSON_BUILD_OBJECT(
    'total_labour_value',
      COALESCE(SUM(quoted_labour_value) FILTER (WHERE status IN ('quoted','won','scheduled','in_progress')), 0),
    'total_job_value',
      COALESCE(SUM(quoted_total_value) FILTER (WHERE status IN ('quoted','won','scheduled','in_progress')), 0),
    'avg_gp_pct',
      ROUND(AVG(quoted_gp_pct) FILTER (WHERE status IN ('quoted','won','scheduled','in_progress')), 4),
    'count_by_status', JSON_BUILD_OBJECT(
      'quoted',      COUNT(*) FILTER (WHERE status = 'quoted'),
      'won',         COUNT(*) FILTER (WHERE status = 'won'),
      'scheduled',   COUNT(*) FILTER (WHERE status = 'scheduled'),
      'in_progress', COUNT(*) FILTER (WHERE status = 'in_progress')
    ),
    'count_by_tier', JSON_BUILD_OBJECT(
      'red',   COUNT(*) FILTER (WHERE jw_tier = 'red'   AND status IN ('quoted','won','scheduled','in_progress')),
      'black', COUNT(*) FILTER (WHERE jw_tier = 'black' AND status IN ('quoted','won','scheduled','in_progress')),
      'blue',  COUNT(*) FILTER (WHERE jw_tier = 'blue'  AND status IN ('quoted','won','scheduled','in_progress'))
    ),
    'quotes_awaiting_response',
      COALESCE(
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'id', id, 'name', name, 'client_name', client_name,
            'quote_sent_date', quote_sent_date,
            'days_since_sent', (CURRENT_DATE - quote_sent_date),
            'quoted_labour_value', quoted_labour_value
          )
        ) FILTER (WHERE status = 'quoted' AND quote_sent_date IS NOT NULL),
        '[]'
      ),
    'quotes_overdue_followup',
      COALESCE(
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'id', id, 'name', name, 'client_name', client_name,
            'days_since_sent', (CURRENT_DATE - quote_sent_date)
          )
        ) FILTER (
          WHERE status = 'quoted'
            AND quote_sent_date IS NOT NULL
            AND (CURRENT_DATE - quote_sent_date) > 10
        ),
        '[]'
      )
  )
  INTO v_result
  FROM jobs
  WHERE deleted_at IS NULL;

  RETURN v_result;
END;
$$;

-- ============================================================
-- TRIGGER: auto-call create_progress_claim_events
-- Fires when all 4 key dates transition from NULL → set on a Won job.
-- This means cashflow events are created automatically — Ops never
-- manually touches cashflow_events.
-- ============================================================
CREATE OR REPLACE FUNCTION trg_job_dates_changed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Only fire when job is won/scheduled and all 4 dates now present
  IF NEW.status IN ('won', 'scheduled', 'in_progress')
    AND NEW.start_date IS NOT NULL
    AND NEW.materials_delivery_date IS NOT NULL
    AND NEW.subframe_complete_date IS NOT NULL
    AND NEW.completion_date IS NOT NULL
    -- Only re-run if at least one date changed
    AND (
      NEW.start_date               IS DISTINCT FROM OLD.start_date OR
      NEW.materials_delivery_date  IS DISTINCT FROM OLD.materials_delivery_date OR
      NEW.subframe_complete_date   IS DISTINCT FROM OLD.subframe_complete_date OR
      NEW.completion_date          IS DISTINCT FROM OLD.completion_date
    )
  THEN
    PERFORM create_progress_claim_events(NEW.id);
    PERFORM notify_finance_dates_set(NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_job_dates
  AFTER UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION trg_job_dates_changed();
