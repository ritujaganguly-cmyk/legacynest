-- Feedback table — stores user feedback submitted via admin feedback form
CREATE TABLE IF NOT EXISTS public.feedback (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  email      text NOT NULL,
  subject    text NOT NULL,
  message    text NOT NULL,
  rating     int CHECK (rating BETWEEN 1 AND 5),
  status     text NOT NULL DEFAULT 'New',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone_can_submit_feedback" ON public.feedback
  FOR INSERT WITH CHECK (true);
CREATE POLICY "admin_can_read_feedback" ON public.feedback
  FOR SELECT USING (auth.role() = 'authenticated');
