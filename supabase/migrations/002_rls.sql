-- ============================================================
-- ENDURE DECKING JMS — Migration 002: Row Level Security
-- ============================================================

-- Helper function: get current user's role from profiles
CREATE OR REPLACE FUNCTION auth_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- ============================================================
-- PROFILES
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can always read their own profile
CREATE POLICY "profiles_own_read" ON profiles
  FOR SELECT USING (id = auth.uid());

-- Owner can read all profiles
CREATE POLICY "profiles_owner_read_all" ON profiles
  FOR SELECT USING (auth_role() = 'owner');

-- Owner can update any profile (role management)
CREATE POLICY "profiles_owner_update" ON profiles
  FOR UPDATE USING (auth_role() = 'owner');

-- Users can update their own profile (name etc, not role)
CREATE POLICY "profiles_own_update" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- ============================================================
-- PRODUCTS — all roles read; owner manages
-- ============================================================
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "products_read" ON products
  FOR SELECT USING (auth.role() = 'authenticated' AND deleted_at IS NULL);

CREATE POLICY "products_owner_all" ON products
  FOR ALL USING (auth_role() = 'owner');

-- ============================================================
-- CREW — all roles read; owner manages
-- ============================================================
ALTER TABLE crew ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crew_read" ON crew
  FOR SELECT USING (auth.role() = 'authenticated' AND deleted_at IS NULL);

CREATE POLICY "crew_owner_all" ON crew
  FOR ALL USING (auth_role() = 'owner');

-- ============================================================
-- JOBS
-- Owner: full CRUD
-- Ops: read + update (no delete, no insert of financial fields)
-- Finance: read only
-- ============================================================
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read non-deleted jobs
CREATE POLICY "jobs_read" ON jobs
  FOR SELECT USING (auth.role() = 'authenticated' AND deleted_at IS NULL);

-- Owner: full access including soft-delete
CREATE POLICY "jobs_owner_all" ON jobs
  FOR ALL USING (auth_role() = 'owner');

-- Ops: insert new jobs (quotes)
CREATE POLICY "jobs_ops_insert" ON jobs
  FOR INSERT WITH CHECK (auth_role() IN ('owner', 'ops'));

-- Ops: update jobs (status, dates, notes — not financial fields enforced at app layer)
CREATE POLICY "jobs_ops_update" ON jobs
  FOR UPDATE USING (auth_role() IN ('owner', 'ops'));

-- Finance: no write access to jobs (read policy above covers SELECT)

-- ============================================================
-- QUOTE LINE ITEMS
-- Readable by all; writable by owner + ops (ops does quoting)
-- ============================================================
ALTER TABLE quote_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quote_items_read" ON quote_line_items
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "quote_items_write" ON quote_line_items
  FOR ALL USING (auth_role() IN ('owner', 'ops'));

-- ============================================================
-- TIMESHEETS
-- Ops: full CRUD (they enter on site)
-- Owner: full CRUD
-- Finance: read only (for backcosting reconciliation)
-- ============================================================
ALTER TABLE timesheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "timesheets_read" ON timesheets
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "timesheets_ops_write" ON timesheets
  FOR ALL USING (auth_role() IN ('owner', 'ops'));

-- ============================================================
-- MATERIAL ACTUALS
-- Ops: full CRUD
-- Owner: full CRUD
-- Finance: read only
-- ============================================================
ALTER TABLE material_actuals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "material_actuals_read" ON material_actuals
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "material_actuals_ops_write" ON material_actuals
  FOR ALL USING (auth_role() IN ('owner', 'ops'));

-- ============================================================
-- CASHFLOW EVENTS
-- Finance + Owner: full CRUD
-- Ops: read only (they see job-level events so they understand date impact)
-- NOTE: auto-generated events are created via SECURITY DEFINER functions,
--       not directly by ops users
-- ============================================================
ALTER TABLE cashflow_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cashflow_read_all" ON cashflow_events
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "cashflow_finance_write" ON cashflow_events
  FOR ALL USING (auth_role() IN ('owner', 'finance'));

-- ============================================================
-- SETTINGS
-- Owner: full access
-- Others: read only (they need COPS constants, etc.)
-- ============================================================
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings_read" ON settings
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "settings_owner_write" ON settings
  FOR ALL USING (auth_role() = 'owner');

-- ============================================================
-- AGENT MEMORY
-- Owner only — this is agent + owner config
-- ============================================================
ALTER TABLE agent_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agent_memory_owner" ON agent_memory
  FOR ALL USING (auth_role() = 'owner');

-- ============================================================
-- NOTIFICATIONS
-- Users see notifications for their role (or 'all')
-- Owner sees everything
-- ============================================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_own_role" ON notifications
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND (
      role = 'all'
      OR role = auth_role()
      OR auth_role() = 'owner'
    )
  );

-- Any role can mark their own notifications read (app enforces role match)
CREATE POLICY "notifications_mark_read" ON notifications
  FOR UPDATE USING (
    role = 'all'
    OR role = auth_role()
    OR auth_role() = 'owner'
  );

-- System creates notifications via SECURITY DEFINER functions
-- Owner can create manual notifications
CREATE POLICY "notifications_owner_write" ON notifications
  FOR INSERT WITH CHECK (auth_role() = 'owner');

-- ============================================================
-- CONVERSATION HISTORY
-- Users see only their own conversations
-- Owner can see all
-- ============================================================
ALTER TABLE conversation_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversation_own" ON conversation_history
  FOR SELECT USING (
    user_id = auth.uid()
    OR auth_role() = 'owner'
  );

CREATE POLICY "conversation_insert" ON conversation_history
  FOR INSERT WITH CHECK (user_id = auth.uid());
