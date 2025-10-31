-- Add updated_at column to events table if it doesn't exist
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Create a trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists (to avoid conflicts)
DROP TRIGGER IF EXISTS events_updated_at_trigger ON public.events;

-- Create trigger
CREATE TRIGGER events_updated_at_trigger
BEFORE UPDATE ON public.events
FOR EACH ROW
EXECUTE FUNCTION update_events_updated_at();
