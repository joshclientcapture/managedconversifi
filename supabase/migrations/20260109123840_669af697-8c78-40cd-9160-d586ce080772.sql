-- Add archived column to bookings table
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_bookings_archived ON public.bookings(archived);

-- Add comment
COMMENT ON COLUMN public.bookings.archived IS 'Whether this booking has been archived (preserves original event_status)';