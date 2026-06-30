-- ============================================================
--  Migration 053: Per-block vault-file sharing for break-glass
--
--  For each break-glass block (daily_care / medical / financial / legal)
--  the owner can enable specific Digital Vault documents to be shared with
--  that block's caregivers. Stored as { block: [vault_doc_id, ...] }.
--
--  v2: this maps onto child_member.permissions.vault_doc_ids per section.
-- ============================================================

ALTER TABLE protected.emergency_plan
  ADD COLUMN IF NOT EXISTS break_glass_files jsonb DEFAULT '{}'::jsonb;
