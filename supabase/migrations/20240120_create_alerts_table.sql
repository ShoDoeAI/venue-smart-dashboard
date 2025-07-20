-- Create alerts table for tracking system alerts
CREATE TABLE IF NOT EXISTS public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  value NUMERIC,
  threshold NUMERIC,
  context JSONB,
  source TEXT NOT NULL,
  group_id TEXT,
  action_suggestions JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX idx_alerts_created_at ON public.alerts(created_at DESC);
CREATE INDEX idx_alerts_resolved_at ON public.alerts(resolved_at) WHERE resolved_at IS NULL;
CREATE INDEX idx_alerts_type ON public.alerts(type);
CREATE INDEX idx_alerts_severity ON public.alerts(severity);
CREATE INDEX idx_alerts_venue_id ON public.alerts(venue_id);
CREATE INDEX idx_alerts_group_id ON public.alerts(group_id);

-- Enable RLS
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Service role can manage alerts" ON public.alerts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create alert history table for tracking changes
CREATE TABLE IF NOT EXISTS public.alert_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID NOT NULL REFERENCES public.alerts(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  performed_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for alert history
CREATE INDEX idx_alert_history_alert_id ON public.alert_history(alert_id);
CREATE INDEX idx_alert_history_created_at ON public.alert_history(created_at DESC);

-- Enable RLS on alert history
ALTER TABLE public.alert_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for alert history
CREATE POLICY "Service role can manage alert history" ON public.alert_history
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);