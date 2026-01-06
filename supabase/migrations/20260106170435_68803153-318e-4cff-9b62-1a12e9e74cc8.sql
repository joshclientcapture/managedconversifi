-- Add new columns to client_connections
ALTER TABLE public.client_connections 
ADD COLUMN IF NOT EXISTS calendly_org_uri TEXT,
ADD COLUMN IF NOT EXISTS ghl_location_name TEXT;

-- Add new columns to bookings
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS event_type_name TEXT,
ADD COLUMN IF NOT EXISTS calendly_event_uri TEXT,
ADD COLUMN IF NOT EXISTS calendly_invitee_uri TEXT;