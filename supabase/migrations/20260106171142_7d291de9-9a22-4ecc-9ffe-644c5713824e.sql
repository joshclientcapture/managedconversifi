-- Add new columns to client_connections
ALTER TABLE public.client_connections 
ADD COLUMN IF NOT EXISTS watched_event_types JSONB;

-- Make calendly_user_uri and calendly_org_uri NOT NULL (update existing nulls first)
UPDATE public.client_connections SET calendly_user_uri = '' WHERE calendly_user_uri IS NULL;
UPDATE public.client_connections SET calendly_org_uri = '' WHERE calendly_org_uri IS NULL;
UPDATE public.client_connections SET ghl_location_name = '' WHERE ghl_location_name IS NULL;

ALTER TABLE public.client_connections 
ALTER COLUMN calendly_user_uri SET NOT NULL,
ALTER COLUMN calendly_org_uri SET NOT NULL,
ALTER COLUMN ghl_location_name SET NOT NULL;

-- Add new columns to bookings
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS event_type_uri TEXT,
ADD COLUMN IF NOT EXISTS event_status TEXT DEFAULT 'scheduled';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_bookings_client_connection ON public.bookings(client_connection_id);
CREATE INDEX IF NOT EXISTS idx_bookings_event_uri ON public.bookings(calendly_event_uri);
CREATE INDEX IF NOT EXISTS idx_client_connections_active ON public.client_connections(is_active);
CREATE INDEX IF NOT EXISTS idx_client_connections_user_uri ON public.client_connections(calendly_user_uri);

-- Drop existing foreign key and add with CASCADE
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_client_connection_id_fkey;
ALTER TABLE public.bookings 
ADD CONSTRAINT bookings_client_connection_id_fkey 
FOREIGN KEY (client_connection_id) REFERENCES public.client_connections(id) ON DELETE CASCADE;