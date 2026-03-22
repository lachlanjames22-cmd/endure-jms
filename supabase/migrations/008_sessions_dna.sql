-- ============================================================
-- Migration 008: Jarvis Sessions + Job DNA scores
-- ============================================================

-- ── Job DNA scores ────────────────────────────────────────────
-- Auto-calculated fields (derived from actuals)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS dna_efficiency    SMALLINT CHECK (dna_efficiency BETWEEN 1 AND 10);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS dna_margin        SMALLINT CHECK (dna_margin BETWEEN 1 AND 10);
-- Subjective fields (owner/ops rates after job)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS dna_complexity    SMALLINT CHECK (dna_complexity BETWEEN 1 AND 10);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS dna_repeatability SMALLINT CHECK (dna_repeatability BETWEEN 1 AND 10);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS dna_client        SMALLINT CHECK (dna_client BETWEEN 1 AND 10);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS dna_reviewed_at   TIMESTAMPTZ;

-- ── Jarvis sessions ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS jarvis_sessions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL DEFAULT 'New conversation',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jarvis_sessions_user_id ON jarvis_sessions (user_id, created_at DESC);

-- Session reference on conversation history
ALTER TABLE conversation_history ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES jarvis_sessions(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_conversation_history_session_id ON conversation_history (session_id, created_at ASC);

-- Auto-update updated_at on jarvis_sessions
CREATE OR REPLACE TRIGGER set_jarvis_sessions_updated_at
  BEFORE UPDATE ON jarvis_sessions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── RLS ───────────────────────────────────────────────────────
ALTER TABLE jarvis_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner can manage sessions"
  ON jarvis_sessions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
