-- Add client_timezone column to client_connections
ALTER TABLE public.client_connections 
ADD COLUMN IF NOT EXISTS client_timezone text NOT NULL DEFAULT 'UTC';