-- Add Discord integration columns to client_connections
ALTER TABLE client_connections
ADD COLUMN IF NOT EXISTS discord_webhook_url TEXT,
ADD COLUMN IF NOT EXISTS discord_channel_id TEXT,
ADD COLUMN IF NOT EXISTS discord_channel_name TEXT,
ADD COLUMN IF NOT EXISTS discord_guild_id TEXT,
ADD COLUMN IF NOT EXISTS discord_guild_name TEXT,
ADD COLUMN IF NOT EXISTS discord_enabled BOOLEAN DEFAULT false;

-- Make slack_channel_id nullable for Discord-only clients
ALTER TABLE client_connections
ALTER COLUMN slack_channel_id DROP NOT NULL;