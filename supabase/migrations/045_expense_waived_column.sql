-- Add waived_after_parents flag to financial_expenses
-- This marks expenses that disappear when parents are gone
-- (e.g. transport to a school the child won't attend after parents pass)

ALTER TABLE protected.financial_expenses
  ADD COLUMN IF NOT EXISTS waived_after_parents boolean NOT NULL DEFAULT false;
