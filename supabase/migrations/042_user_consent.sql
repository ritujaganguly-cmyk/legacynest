-- User consent records (DPDP Act 2023 — Section 6: Consent)
-- One row per consent event; never deleted, only new rows added.
CREATE TABLE IF NOT EXISTS public.user_consent (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version      text NOT NULL DEFAULT '1.0',   -- consent policy version
  purpose      text NOT NULL,                  -- 'spdi_collection' | 'data_sharing' | 'withdrawal'
  action       text NOT NULL DEFAULT 'given',  -- 'given' | 'withdrawn'
  ip_address   text,
  user_agent   text,
  consent_text text NOT NULL,                  -- full text of what was agreed to
  created_at   timestamptz DEFAULT now()
);
ALTER TABLE public.user_consent ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_owns_consent" ON public.user_consent
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_user_consent_user ON public.user_consent(user_id, purpose);

-- Track when user first saw and accepted the privacy terms
CREATE TABLE IF NOT EXISTS public.privacy_acknowledgement (
  user_id      uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  version      text NOT NULL DEFAULT '1.0',
  acknowledged_at timestamptz DEFAULT now()
);
ALTER TABLE public.privacy_acknowledgement ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_owns_ack" ON public.privacy_acknowledgement
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
