-- ============================================================
-- ENDURE DECKING JMS — Migration 005: New Modules
-- Client portal, cash allocation, CEO, review engine,
-- compliance, receipts, content calendar, proactive Jarvis
-- ============================================================

-- ============================================================
-- CLIENT PORTAL
-- ============================================================
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS portal_token UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS portal_active BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS client_email TEXT,
  ADD COLUMN IF NOT EXISTS client_phone TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_portal_token ON jobs(portal_token);

CREATE TABLE IF NOT EXISTS progress_photos (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id           UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  photo_url        TEXT NOT NULL,
  caption          TEXT,
  sent_to_client   BOOLEAN NOT NULL DEFAULT FALSE,
  posted_instagram BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_progress_photos_job ON progress_photos(job_id);

-- ============================================================
-- CASH ALLOCATION (Profit First)
-- ============================================================
CREATE TABLE IF NOT EXISTS cash_allocations (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cashflow_event_id    UUID REFERENCES cashflow_events(id) ON DELETE SET NULL,
  amount_received      NUMERIC(12,2) NOT NULL,
  tax_pct              NUMERIC(5,4) NOT NULL DEFAULT 0.15,
  tax_amount           NUMERIC(12,2) NOT NULL,
  profit_pct           NUMERIC(5,4) NOT NULL DEFAULT 0.10,
  profit_amount        NUMERIC(12,2) NOT NULL,
  owner_pay_pct        NUMERIC(5,4) NOT NULL DEFAULT 0.35,
  owner_pay_amount     NUMERIC(12,2) NOT NULL,
  float_pct            NUMERIC(5,4) NOT NULL DEFAULT 0.40,
  float_amount         NUMERIC(12,2) NOT NULL,
  message_sent         BOOLEAN NOT NULL DEFAULT FALSE,
  actioned             BOOLEAN NOT NULL DEFAULT FALSE,
  actioned_at          TIMESTAMPTZ,
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cash_allocations_event ON cash_allocations(cashflow_event_id);

-- ============================================================
-- CEO MODULE
-- ============================================================
CREATE TABLE IF NOT EXISTS ceo_vision (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category    TEXT NOT NULL CHECK (category IN ('mission','values','goals','nonnegotiables','scenarios','why')),
  content     TEXT NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wins_board (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT,
  category    TEXT NOT NULL CHECK (category IN ('financial','operational','team','personal','client')),
  win_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  source      TEXT NOT NULL DEFAULT 'owner' CHECK (source IN ('agent','owner')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS decision_journal (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision               TEXT NOT NULL,
  context                TEXT,
  jarvis_recommendation  TEXT,
  owner_decision         TEXT,
  outcome                TEXT,
  outcome_date           DATE,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- REVIEW & FOLLOW-UP ENGINE
-- ============================================================
CREATE TABLE IF NOT EXISTS client_sequences (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id          UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  sequence_type   TEXT NOT NULL CHECK (sequence_type IN ('review','referral','maintenance','completion')),
  step            INTEGER NOT NULL DEFAULT 1,
  scheduled_date  DATE NOT NULL,
  sent_date       DATE,
  channel         TEXT NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp','email','sms')),
  message_body    TEXT,
  response        TEXT,
  outcome         TEXT CHECK (outcome IN ('sent','responded','bounced','skipped','completed')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_sequences_job  ON client_sequences(job_id);
CREATE INDEX IF NOT EXISTS idx_client_sequences_date ON client_sequences(scheduled_date) WHERE sent_date IS NULL;

-- ============================================================
-- COMPLIANCE CALENDAR
-- ============================================================
CREATE TABLE IF NOT EXISTS compliance_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  category            TEXT NOT NULL CHECK (category IN (
                        'registration','insurance','licence',
                        'vehicle','workcover','membership','other'
                      )),
  renewal_date        DATE NOT NULL,
  cost                NUMERIC(10,2),
  provider            TEXT,
  notes               TEXT,
  reminder_60_sent    BOOLEAN NOT NULL DEFAULT FALSE,
  reminder_30_sent    BOOLEAN NOT NULL DEFAULT FALSE,
  reminder_7_sent     BOOLEAN NOT NULL DEFAULT FALSE,
  auto_renew          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_renewal ON compliance_items(renewal_date);

-- ============================================================
-- RECEIPT CAPTURE
-- ============================================================
CREATE TABLE IF NOT EXISTS receipts (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id               UUID REFERENCES jobs(id) ON DELETE SET NULL,
  supplier             TEXT,
  amount               NUMERIC(10,2) NOT NULL,
  category             TEXT CHECK (category IN (
                         'materials','fuel','tools','ppe','subcontractor','other'
                       )),
  photo_url            TEXT,
  receipt_date         DATE NOT NULL DEFAULT CURRENT_DATE,
  submitted_by         UUID REFERENCES crew(id) ON DELETE SET NULL,
  gst_amount           NUMERIC(10,2),
  notes                TEXT,
  bookkeeper_exported  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_receipts_job  ON receipts(job_id);
CREATE INDEX IF NOT EXISTS idx_receipts_date ON receipts(receipt_date);

-- ============================================================
-- CONTENT CALENDAR
-- ============================================================
CREATE TABLE IF NOT EXISTS content_calendar (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggested_date DATE NOT NULL,
  format         TEXT NOT NULL CHECK (format IN ('reel','post','story','carousel')),
  concept        TEXT NOT NULL,
  caption_draft  TEXT,
  hashtags       TEXT[],
  job_id         UUID REFERENCES jobs(id) ON DELETE SET NULL,
  suburb         TEXT,
  status         TEXT NOT NULL DEFAULT 'suggested'
                   CHECK (status IN ('suggested','approved','posted','skipped')),
  posted_at      TIMESTAMPTZ,
  reach          INTEGER,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_calendar_date ON content_calendar(suggested_date);

-- ============================================================
-- MEETINGS / TOOLBOX TALKS
-- ============================================================
CREATE TABLE IF NOT EXISTS meetings (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type         TEXT NOT NULL CHECK (type IN ('toolbox','client','team','supplier','one_on_one')),
  job_id       UUID REFERENCES jobs(id) ON DELETE SET NULL,
  meeting_date DATE NOT NULL DEFAULT CURRENT_DATE,
  audio_url    TEXT,
  transcript   TEXT,
  decisions    JSONB,    -- [{decision, owner, due_date}]
  action_items JSONB,   -- [{task, owner, due_date, done}]
  attendees    TEXT[],
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meetings_date ON meetings(meeting_date);
CREATE INDEX IF NOT EXISTS idx_meetings_job  ON meetings(job_id);

-- ============================================================
-- PROACTIVE JARVIS LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS proactive_messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_type TEXT NOT NULL CHECK (trigger_type IN (
                  'morning_brief','eod_summary','weekly_review',
                  'monthly_reflection','quote_nudge','payment_received',
                  'job_complete','cash_warning','cash_critical',
                  'crew_sentiment','owner_quiet','allocation'
                )),
  channel      TEXT NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp','email','voice')),
  recipient    TEXT NOT NULL,
  message_body TEXT NOT NULL,
  sent         BOOLEAN NOT NULL DEFAULT FALSE,
  sent_at      TIMESTAMPTZ,
  response     TEXT,
  metadata     JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proactive_messages_trigger ON proactive_messages(trigger_type, created_at);

-- ============================================================
-- RLS POLICIES for new tables
-- ============================================================

-- progress_photos: owners/ops can manage, portal reads via job token
ALTER TABLE progress_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "progress_photos_owner" ON progress_photos
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner','ops')));

-- cash_allocations: owner/finance only
ALTER TABLE cash_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cash_allocations_owner" ON cash_allocations
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner','finance')));

-- ceo_vision: owner only
ALTER TABLE ceo_vision ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ceo_vision_owner" ON ceo_vision
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner'));

-- wins_board: owner only
ALTER TABLE wins_board ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wins_board_owner" ON wins_board
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner'));

-- decision_journal: owner only
ALTER TABLE decision_journal ENABLE ROW LEVEL SECURITY;
CREATE POLICY "decision_journal_owner" ON decision_journal
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner'));

-- client_sequences: owner/ops
ALTER TABLE client_sequences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "client_sequences_staff" ON client_sequences
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner','ops')));

-- compliance_items: owner only
ALTER TABLE compliance_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "compliance_items_owner" ON compliance_items
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner'));

-- receipts: owner/ops/finance
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "receipts_staff" ON receipts
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner','ops','finance')));

-- content_calendar: owner only
ALTER TABLE content_calendar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "content_calendar_owner" ON content_calendar
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner'));

-- meetings: owner/ops
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "meetings_staff" ON meetings
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner','ops')));

-- proactive_messages: owner only
ALTER TABLE proactive_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "proactive_messages_owner" ON proactive_messages
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner'));
