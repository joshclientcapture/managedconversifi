-- Add new columns to campaign_stats for better stats storage
ALTER TABLE campaign_stats ADD COLUMN IF NOT EXISTS total_prospects integer DEFAULT 0;
ALTER TABLE campaign_stats ADD COLUMN IF NOT EXISTS total_sent integer DEFAULT 0;
ALTER TABLE campaign_stats ADD COLUMN IF NOT EXISTS total_responses integer DEFAULT 0;
ALTER TABLE campaign_stats ADD COLUMN IF NOT EXISTS pending_requests integer DEFAULT 0;
ALTER TABLE campaign_stats ADD COLUMN IF NOT EXISTS acceptance_rate decimal DEFAULT 0;
ALTER TABLE campaign_stats ADD COLUMN IF NOT EXISTS response_rate decimal DEFAULT 0;

-- Add new columns to bookings for outcomes and action URLs
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS showed_up boolean DEFAULT NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS call_outcome text DEFAULT NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS closer_notes text DEFAULT NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reschedule_url text DEFAULT NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancel_url text DEFAULT NULL;

-- Enable realtime for bookings so dashboard can see updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;