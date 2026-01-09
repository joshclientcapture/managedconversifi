import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, RefreshCw, Hash, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface ClientConnection {
  id: string;
  client_name: string;
  ghl_api_key: string | null;
  conversifi_webhook_url: string | null;
  is_active: boolean;
  access_token: string | null;
  slack_channel_id: string | null;
  slack_channel_name: string | null;
  discord_channel_id: string | null;
  discord_channel_name: string | null;
  discord_guild_id: string | null;
  discord_guild_name: string | null;
  discord_webhook_url: string | null;
  discord_enabled: boolean | null;
}

interface SlackChannel {
  id: string;
  name: string;
}

interface DiscordChannel {
  id: string;
  name: string;
  guildId: string;
  guildName: string;
}

interface EditConnectionModalProps {
  connection: ClientConnection | null;
  onClose: () => void;
  onSave: () => void;
}

const EditConnectionModal = ({ connection, onClose, onSave }: EditConnectionModalProps) => {
  const [saving, setSaving] = useState(false);
  const [slackChannels, setSlackChannels] = useState<SlackChannel[]>([]);
  const [discordChannels, setDiscordChannels] = useState<DiscordChannel[]>([]);
  const [loadingSlack, setLoadingSlack] = useState(false);
  const [loadingDiscord, setLoadingDiscord] = useState(false);
  
  const [formData, setFormData] = useState({
    client_name: '',
    ghl_api_key: '',
    conversifi_webhook_url: '',
    is_active: true,
    slack_channel_id: '',
    discord_channel_id: '',
  });

  // Prefill form data when connection changes
  useEffect(() => {
    if (connection) {
      setFormData({
        client_name: connection.client_name || '',
        ghl_api_key: connection.ghl_api_key || '',
        conversifi_webhook_url: connection.conversifi_webhook_url || '',
        is_active: connection.is_active ?? true,
        slack_channel_id: connection.slack_channel_id || '',
        discord_channel_id: connection.discord_channel_id || '',
      });
    }
  }, [connection]);

  const fetchSlackChannels = useCallback(async () => {
    setLoadingSlack(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-slack-channels');
      if (error) throw error;
      setSlackChannels(data?.channels || []);
    } catch (error) {
      console.error('Error fetching Slack channels:', error);
    } finally {
      setLoadingSlack(false);
    }
  }, []);

  const fetchDiscordChannels = useCallback(async () => {
    setLoadingDiscord(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-discord-channels');
      if (error) throw error;
      setDiscordChannels(data?.channels || []);
    } catch (error) {
      console.error('Error fetching Discord channels:', error);
    } finally {
      setLoadingDiscord(false);
    }
  }, []);

  useEffect(() => {
    if (connection) {
      fetchSlackChannels();
      fetchDiscordChannels();
    }
  }, [connection, fetchSlackChannels, fetchDiscordChannels]);

  const handleSave = async () => {
    if (!connection) return;
    
    // Validate at least one channel is selected
    if (!formData.slack_channel_id && !formData.discord_channel_id) {
      toast.error('Please select at least one notification channel');
      return;
    }
    
    setSaving(true);

    try {
      const selectedSlackChannel = slackChannels.find(ch => ch.id === formData.slack_channel_id);
      const selectedDiscordChannel = discordChannels.find(ch => ch.id === formData.discord_channel_id);
      
      // Check if Discord channel changed and needs new webhook
      const discordChanged = formData.discord_channel_id !== connection.discord_channel_id;

      // If clearing Discord (had webhook before, now none), delete the old webhook
      if (discordChanged && !formData.discord_channel_id && connection.discord_webhook_url) {
        try {
          console.log('Deleting old Discord webhook...');
          const urlParts = connection.discord_webhook_url.split('/');
          const webhookId = urlParts[urlParts.length - 2];
          const webhookToken = urlParts[urlParts.length - 1];
          
          if (webhookId && webhookToken) {
            await fetch(`https://discord.com/api/webhooks/${webhookId}/${webhookToken}`, {
              method: 'DELETE'
            });
            console.log('Old Discord webhook deleted');
          }
        } catch (err) {
          console.warn('Failed to delete old webhook:', err);
          // Continue anyway
        }
      }

      if (discordChanged && formData.discord_channel_id) {
        // Create new Discord webhook (this function also updates the database with Discord fields)
        const { data: webhookData, error: webhookError } = await supabase.functions.invoke('setup-discord-webhook', {
          body: {
            client_connection_id: connection.id,
            channel_id: formData.discord_channel_id,
            channel_name: selectedDiscordChannel?.name || null,
            guild_id: selectedDiscordChannel?.guildId || null,
            guild_name: selectedDiscordChannel?.guildName || null
          }
        });

        if (webhookError) throw webhookError;
      }

      // Prepare update payload - don't include Discord fields if webhook was just created/updated
      const updatePayload: any = {
        client_name: formData.client_name,
        ghl_api_key: formData.ghl_api_key || null,
        conversifi_webhook_url: formData.conversifi_webhook_url || null,
        is_active: formData.is_active,
        slack_channel_id: formData.slack_channel_id || null,
        slack_channel_name: selectedSlackChannel?.name || null,
      };

      // Only update Discord fields if we didn't just call setup-discord-webhook
      if (!discordChanged || !formData.discord_channel_id) {
        updatePayload.discord_channel_id = formData.discord_channel_id || null;
        updatePayload.discord_channel_name = selectedDiscordChannel?.name || null;
        updatePayload.discord_guild_id = selectedDiscordChannel?.guildId || null;
        updatePayload.discord_guild_name = selectedDiscordChannel?.guildName || null;
        updatePayload.discord_webhook_url = formData.discord_channel_id ? connection.discord_webhook_url : null;
        updatePayload.discord_enabled = !!formData.discord_channel_id;
      }

      const { error } = await supabase
        .from('client_connections')
        .update(updatePayload)
        .eq('id', connection.id);

      if (error) throw error;

      toast.success('Connection updated');
      onSave();
      onClose();
    } catch (err) {
      toast.error('Failed to update connection');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (!connection) return null;

  const hasNotificationChannel = formData.slack_channel_id || formData.discord_channel_id;

  return (
    <Dialog open={!!connection} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Connection</DialogTitle>
          <DialogDescription>
            Update settings for {connection.client_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Client Name</Label>
            <Input
              value={formData.client_name}
              onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Access Token</Label>
            <div className="h-10 px-3 bg-muted/50 border rounded-md flex items-center">
              <code className="text-sm font-mono">{connection.access_token || 'N/A'}</code>
            </div>
            <p className="text-xs text-muted-foreground">Access token cannot be changed</p>
          </div>

          <div className="space-y-2">
            <Label>GHL API Key</Label>
            <Input
              type="password"
              placeholder="Enter GHL API Key"
              value={formData.ghl_api_key}
              onChange={(e) => setFormData({ ...formData, ghl_api_key: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">Required for creating contacts in GHL</p>
          </div>

          <div className="space-y-2">
            <Label>Conversifi Webhook URL</Label>
            <Input
              placeholder="https://server.conversifi.io/..."
              value={formData.conversifi_webhook_url}
              onChange={(e) => setFormData({ ...formData, conversifi_webhook_url: e.target.value })}
            />
          </div>

          {/* Notification Channels Section */}
          <div className="space-y-4 p-4 rounded-lg border border-dashed border-primary/30 bg-primary/5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Notification Channel</span>
              <span className="text-xs text-muted-foreground">(at least one required)</span>
            </div>

            {/* Slack Channel */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  Slack Channel
                  {formData.slack_channel_id && <CheckCircle2 className="h-3.5 w-3.5 text-success" />}
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={fetchSlackChannels}
                  disabled={loadingSlack}
                >
                  <RefreshCw className={`h-3 w-3 mr-1 ${loadingSlack ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
              <Select
                value={formData.slack_channel_id || "__NONE__"}
                onValueChange={(value) => setFormData({ ...formData, slack_channel_id: value === "__NONE__" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingSlack ? "Loading..." : "Select Slack channel"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__NONE__">None</SelectItem>
                  {slackChannels.map((channel) => (
                    <SelectItem key={channel.id} value={channel.id}>
                      <span className="flex items-center gap-2">
                        <Hash className="h-3 w-3 text-muted-foreground" />
                        {channel.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {connection.slack_channel_name && !formData.slack_channel_id && (
                <p className="text-xs text-muted-foreground">
                  Previously: #{connection.slack_channel_name}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground font-medium">OR</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Discord Channel */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  Discord Channel
                  {formData.discord_channel_id && <CheckCircle2 className="h-3.5 w-3.5 text-success" />}
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={fetchDiscordChannels}
                  disabled={loadingDiscord}
                >
                  <RefreshCw className={`h-3 w-3 mr-1 ${loadingDiscord ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
              <Select
                value={formData.discord_channel_id || "__NONE__"}
                onValueChange={(value) => setFormData({ ...formData, discord_channel_id: value === "__NONE__" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingDiscord ? "Loading..." : "Select Discord channel"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__NONE__">None</SelectItem>
                  {discordChannels.map((channel) => (
                    <SelectItem key={channel.id} value={channel.id}>
                      <span className="flex items-center gap-2">
                        <Hash className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground text-xs">{channel.guildName} /</span>
                        {channel.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {connection.discord_channel_name && !formData.discord_channel_id && (
                <p className="text-xs text-muted-foreground">
                  Previously: {connection.discord_guild_name} / #{connection.discord_channel_name}
                </p>
              )}
            </div>

            {!hasNotificationChannel && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Please select at least one notification channel
              </p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Active</Label>
              <p className="text-xs text-muted-foreground">Enable or disable this connection</p>
            </div>
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !hasNotificationChannel}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditConnectionModal;