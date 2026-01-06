-- GHL Locations (populated by N8N)
CREATE TABLE public.ghl_locations (
  location_id TEXT PRIMARY KEY,
  location_name TEXT NOT NULL,
  owner_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Client Connections
CREATE TABLE public.client_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name TEXT NOT NULL,
  calendly_token TEXT NOT NULL,
  calendly_webhook_id TEXT,
  calendly_user_uri TEXT,
  ghl_location_id TEXT NOT NULL REFERENCES public.ghl_locations(location_id),
  slack_channel_id TEXT NOT NULL,
  slack_channel_name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bookings Log
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_connection_id UUID NOT NULL REFERENCES public.client_connections(id) ON DELETE CASCADE,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  event_type TEXT,
  event_time TIMESTAMP WITH TIME ZONE,
  calendly_event_id TEXT,
  raw_payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.ghl_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Public read access for ghl_locations (populated by N8N)
CREATE POLICY "Allow public read of ghl_locations"
ON public.ghl_locations FOR SELECT
USING (true);

-- Allow public insert/update for ghl_locations (for N8N automation)
CREATE POLICY "Allow public insert of ghl_locations"
ON public.ghl_locations FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public update of ghl_locations"
ON public.ghl_locations FOR UPDATE
USING (true);

-- Public access for client_connections (no auth required for this use case)
CREATE POLICY "Allow public read of client_connections"
ON public.client_connections FOR SELECT
USING (true);

CREATE POLICY "Allow public insert of client_connections"
ON public.client_connections FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public update of client_connections"
ON public.client_connections FOR UPDATE
USING (true);

-- Public access for bookings
CREATE POLICY "Allow public read of bookings"
ON public.bookings FOR SELECT
USING (true);

CREATE POLICY "Allow public insert of bookings"
ON public.bookings FOR INSERT
WITH CHECK (true);

-- Insert dummy GHL locations for testing
INSERT INTO public.ghl_locations (location_id, location_name, owner_name) VALUES
  ('loc_agent_media', 'Agent Media Marketing', 'John Smith'),
  ('loc_aim_healthcare', 'Aim Healthcare Recruiting', 'Sarah Johnson'),
  ('loc_balanced_health', 'Balanced Health', 'Mike Williams');

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_ghl_locations_updated_at
BEFORE UPDATE ON public.ghl_locations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_connections_updated_at
BEFORE UPDATE ON public.client_connections
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();