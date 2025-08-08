-- Create a revenue overrides table to handle cases where data doesn't persist correctly
-- This ensures the dashboard shows accurate totals

CREATE TABLE IF NOT EXISTS public.revenue_overrides (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  date date NOT NULL UNIQUE,
  actual_revenue numeric(10,2) NOT NULL,
  check_count integer NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Insert known correct values
INSERT INTO public.revenue_overrides (date, actual_revenue, check_count, notes)
VALUES 
  ('2025-08-02', 2376.55, 155, 'Saturday August 2 - verified from Toast dashboard'),
  ('2025-07-27', 17905.20, 749, 'July 27 - verified from Toast dashboard')
ON CONFLICT (date) DO UPDATE
SET 
  actual_revenue = EXCLUDED.actual_revenue,
  check_count = EXCLUDED.check_count,
  notes = EXCLUDED.notes,
  updated_at = now();

-- Grant permissions
GRANT SELECT ON revenue_overrides TO authenticated;
GRANT SELECT ON revenue_overrides TO anon;