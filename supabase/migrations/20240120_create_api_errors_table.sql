-- Create API errors table for error isolation and tracking
CREATE TABLE IF NOT EXISTS public.api_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL CHECK (source IN ('toast', 'eventbrite', 'wisk', 'resy', 'audience_republic', 'meta', 'opendate', 'internal')),
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  error_type TEXT NOT NULL,
  message TEXT NOT NULL,
  context JSONB,
  stack_trace TEXT,
  occurred_at TIMESTAMPTZ NOT NULL,
  resolved BOOLEAN DEFAULT FALSE,
  resolution_notes TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  last_retry_at TIMESTAMPTZ,
  venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX idx_api_errors_source ON public.api_errors(source);
CREATE INDEX idx_api_errors_severity ON public.api_errors(severity);
CREATE INDEX idx_api_errors_occurred_at ON public.api_errors(occurred_at DESC);
CREATE INDEX idx_api_errors_resolved ON public.api_errors(resolved) WHERE resolved = FALSE;
CREATE INDEX idx_api_errors_venue_id ON public.api_errors(venue_id);

-- Enable RLS
ALTER TABLE public.api_errors ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Service role can manage API errors" ON public.api_errors
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create error recovery strategies table
CREATE TABLE IF NOT EXISTS public.error_recovery_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  error_pattern TEXT NOT NULL,
  strategy_type TEXT NOT NULL CHECK (strategy_type IN ('retry', 'fallback', 'circuit_breaker', 'manual')),
  strategy_config JSONB NOT NULL,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for recovery strategies
CREATE INDEX idx_error_recovery_source ON public.error_recovery_strategies(source);
CREATE INDEX idx_error_recovery_active ON public.error_recovery_strategies(is_active);

-- Enable RLS on recovery strategies
ALTER TABLE public.error_recovery_strategies ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for recovery strategies
CREATE POLICY "Service role can manage recovery strategies" ON public.error_recovery_strategies
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);