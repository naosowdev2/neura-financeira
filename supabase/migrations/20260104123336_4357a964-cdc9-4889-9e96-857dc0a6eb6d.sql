-- Create table for weekly summaries
CREATE TABLE public.weekly_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  summary_data JSONB NOT NULL DEFAULT '{}',
  ai_analysis TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

-- Create table for push notification logs (anti-spam)
CREATE TABLE public.push_notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  alert_type TEXT NOT NULL,
  alert_id TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, alert_id)
);

-- Enable RLS
ALTER TABLE public.weekly_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_notification_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for weekly_summaries
CREATE POLICY "Users can view own weekly summaries"
  ON public.weekly_summaries FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weekly summaries"
  ON public.weekly_summaries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weekly summaries"
  ON public.weekly_summaries FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role policy for weekly_summaries (for edge functions)
CREATE POLICY "Service role can manage all weekly summaries"
  ON public.weekly_summaries FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS policies for push_notification_logs
CREATE POLICY "Users can view own push logs"
  ON public.push_notification_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all push logs"
  ON public.push_notification_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_weekly_summaries_user_week ON public.weekly_summaries(user_id, week_start DESC);
CREATE INDEX idx_weekly_summaries_unread ON public.weekly_summaries(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_push_logs_user_type ON public.push_notification_logs(user_id, alert_type, sent_at DESC);
CREATE INDEX idx_push_logs_cleanup ON public.push_notification_logs(sent_at);

-- Trigger for updated_at
CREATE TRIGGER update_weekly_summaries_updated_at
  BEFORE UPDATE ON public.weekly_summaries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();