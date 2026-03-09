-- ============================================================
-- ENDURE OS — Migration 007: RLS for new Endure OS tables
-- ============================================================

-- Helper: check if current user is the owner role
-- auth_role() already defined in 002_rls.sql — using it here

-- ============================================================
-- JOB LABOUR
-- Owner: full access
-- Crew: read/write own rows for assigned jobs
-- ============================================================
ALTER TABLE job_labour ENABLE ROW LEVEL SECURITY;

CREATE POLICY "job_labour_owner_all" ON job_labour
  FOR ALL USING (auth_role() = 'owner');

-- Crew can read labour entries for jobs they're assigned to
CREATE POLICY "job_labour_crew_read" ON job_labour
  FOR SELECT USING (
    auth_role() IN ('owner', 'ops', 'finance')
    OR crew_id IN (
      SELECT id FROM crew WHERE auth_user_id = auth.uid()
    )
  );

-- Crew can insert/update their own labour entries
CREATE POLICY "job_labour_crew_write" ON job_labour
  FOR INSERT WITH CHECK (
    crew_id IN (
      SELECT id FROM crew WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "job_labour_crew_update" ON job_labour
  FOR UPDATE USING (
    crew_id IN (
      SELECT id FROM crew WHERE auth_user_id = auth.uid()
    )
  );

-- ============================================================
-- JOB MATERIALS
-- Owner + ops: full access
-- Crew: read only for their jobs
-- Finance: read only
-- ============================================================
ALTER TABLE job_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "job_materials_owner_ops_all" ON job_materials
  FOR ALL USING (auth_role() IN ('owner', 'ops'));

CREATE POLICY "job_materials_read" ON job_materials
  FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================================
-- PROFIT FIRST ACCOUNTS
-- Owner only — sensitive financial data
-- ============================================================
ALTER TABLE pf_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pf_accounts_owner_all" ON pf_accounts
  FOR ALL USING (auth_role() = 'owner');

-- Finance can read pf_accounts for reporting
CREATE POLICY "pf_accounts_finance_read" ON pf_accounts
  FOR SELECT USING (auth_role() IN ('owner', 'finance'));

-- ============================================================
-- DAILY LOGS
-- Owner + ops: full access
-- Crew: read/write own rows
-- Finance: read only
-- ============================================================
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daily_logs_owner_ops_all" ON daily_logs
  FOR ALL USING (auth_role() IN ('owner', 'ops'));

CREATE POLICY "daily_logs_crew_read" ON daily_logs
  FOR SELECT USING (
    auth_role() IN ('owner', 'ops', 'finance')
    OR crew_id IN (
      SELECT id FROM crew WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "daily_logs_crew_write" ON daily_logs
  FOR INSERT WITH CHECK (
    crew_id IN (
      SELECT id FROM crew WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "daily_logs_crew_update" ON daily_logs
  FOR UPDATE USING (
    crew_id IN (
      SELECT id FROM crew WHERE auth_user_id = auth.uid()
    )
  );

-- ============================================================
-- PHOTOS
-- Owner + ops: full access
-- Crew: read/write own uploads
-- ============================================================
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "photos_owner_ops_all" ON photos
  FOR ALL USING (auth_role() IN ('owner', 'ops'));

CREATE POLICY "photos_crew_read" ON photos
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "photos_crew_write" ON photos
  FOR INSERT WITH CHECK (
    crew_id IN (
      SELECT id FROM crew WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "photos_crew_update" ON photos
  FOR UPDATE USING (
    crew_id IN (
      SELECT id FROM crew WHERE auth_user_id = auth.uid()
    )
  );

-- ============================================================
-- CHECKIN RESPONSES
-- Owner: full access
-- Crew: read/write own check-ins
-- ============================================================
ALTER TABLE checkin_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "checkin_owner_all" ON checkin_responses
  FOR ALL USING (auth_role() = 'owner');

CREATE POLICY "checkin_crew_own" ON checkin_responses
  FOR SELECT USING (
    auth_role() = 'owner'
    OR crew_id IN (
      SELECT id FROM crew WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "checkin_crew_write" ON checkin_responses
  FOR INSERT WITH CHECK (
    crew_id IN (
      SELECT id FROM crew WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "checkin_crew_update" ON checkin_responses
  FOR UPDATE USING (
    crew_id IN (
      SELECT id FROM crew WHERE auth_user_id = auth.uid()
    )
  );

-- ============================================================
-- DECISIONS
-- Owner only — CEO-level strategic log
-- ============================================================
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "decisions_owner_all" ON decisions
  FOR ALL USING (auth_role() = 'owner');

-- ============================================================
-- PERSONAL FINANCE
-- Owner only — single-row personal net worth tracker
-- ============================================================
ALTER TABLE personal_finance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "personal_finance_owner_all" ON personal_finance
  FOR ALL USING (auth_role() = 'owner');
