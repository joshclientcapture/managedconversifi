-- Add conversifi_webhook_url to client_connections
ALTER TABLE public.client_connections
ADD COLUMN conversifi_webhook_url TEXT;

-- Create campaign_stats table
CREATE TABLE public.campaign_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_connection_id UUID NOT NULL REFERENCES public.client_connections(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  messages_sent INTEGER DEFAULT 0,
  replies_received INTEGER DEFAULT 0,
  connections_made INTEGER DEFAULT 0,
  meetings_booked INTEGER DEFAULT 0,
  campaign_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(client_connection_id, date)
);

-- Enable RLS
ALTER TABLE public.campaign_stats ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow public read of campaign_stats" 
ON public.campaign_stats 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert of campaign_stats" 
ON public.campaign_stats 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update of campaign_stats" 
ON public.campaign_stats 
FOR UPDATE 
USING (true);

-- Create index for performance
CREATE INDEX idx_campaign_stats_client_date ON public.campaign_stats(client_connection_id, date);