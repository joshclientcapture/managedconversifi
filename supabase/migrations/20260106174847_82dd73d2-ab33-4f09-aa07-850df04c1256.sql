-- Add access_token column to client_connections
ALTER TABLE public.client_connections
ADD COLUMN access_token TEXT UNIQUE;

-- Create index for access_token lookups
CREATE INDEX idx_client_connections_access_token ON public.client_connections(access_token);

-- Add access_token to campaign_stats for easy reference
ALTER TABLE public.campaign_stats
ADD COLUMN access_token TEXT;

-- Add access_token to bookings for easy reference  
ALTER TABLE public.bookings
ADD COLUMN access_token TEXT;