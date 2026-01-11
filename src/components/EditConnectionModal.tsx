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
import { Loader2, RefreshCw, Hash, CheckCircle2, AlertCircle, Calendar, X, Eye, EyeOff, Globe } from "lucide-react";
import { toast } from "sonner";

const TIMEZONES = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Central European (CET)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
];

interface ClientConnection {
  id: string;
  client_name: string;
  ghl_api_key: string | null;
  ghl_location_id: string | null;
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
  calendly_token: string | null;
  calendly_user_uri: string | null;
  watched_event_types: any; // JSON type from database
  client_timezone: string | null;
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

interface CalendlyEventType {
  uri: string;
  name: string;
  duration: number;
  active: boolean;
}

interface EditConnectionModalProps {
  connection: ClientConnection | null;
  onClose: () => void;
  onSave: () => void;
}

type ValidationStatus = "idle" | "validating" | "valid" | "error";

const EditConnectionModal = ({ connection, onClose, onSave }: EditConnectionModalProps) => {
  const [saving, setSaving] = useState(false);
  const [slackChannels, setSlackChannels] = useState<SlackChannel[]>([]);
  const [discordChannels, setDiscordChannels] = useState<DiscordChannel[]>([]);
  const [loadingSlack, setLoadingSlack] = useState(false);
  const [loadingDiscord, setLoadingDiscord] = useState(false);
  
  // Validation states
  const [ghlValidation, setGhlValidation] = useState<ValidationStatus>("idle");
  const [ghlError, setGhlError] = useState<string | null>(null);
  const [conversifiValidation, setConversifiValidation] = useState<ValidationStatus>("idle");
  const [conversifiError, setConversifiError] = useState<string | null>(null);
  
  // Calendly event types
  const [eventTypes, setEventTypes] = useState<CalendlyEventType[]>([]);
  const [loadingEventTypes, setLoadingEventTypes] = useState(false);
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>([]);
  
  const [showGhlKey, setShowGhlKey] = useState(false);
  
  const [formData, setFormData] = useState({
    client_name: '',
    ghl_api_key: '',
    conversifi_webhook_url: '',
    is_active: true,
    slack_channel_id: '',
    discord_channel_id: '',
    client_timezone: 'America/New_York',
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
        client_timezone: connection.client_timezone || 'America/New_York',
      });
      
      // Set initial selected event types from connection
      if (connection.watched_event_types && Array.isArray(connection.watched_event_types)) {
        setSelectedEventTypes(connection.watched_event_types);
      } else {
        setSelectedEventTypes([]);
      }
      
      // Set initial validation states based on existing data
      if (connection.ghl_api_key) {
        setGhlValidation("valid");
      }
      if (connection.conversifi_webhook_url) {
        setConversifiValidation("valid");
      }
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

  const fetchEventTypes = useCallback(async () => {
    if (!connection?.calendly_token || !connection?.calendly_user_uri) return;
    
    setLoadingEventTypes(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-calendly-event-types', {
        body: { 
          calendly_token: connection.calendly_token, 
          user_uri: connection.calendly_user_uri 
        }
      });
      
      if (error) throw error;
      setEventTypes(data?.eventTypes || []);
    } catch (error) {
      console.error('Error fetching event types:', error);
    } finally {
      setLoadingEventTypes(false);
    }
  }, [connection?.calendly_token, connection?.calendly_user_uri]);

  useEffect(() => {
    if (connection) {
      fetchSlackChannels();
      fetchDiscordChannels();
      fetchEventTypes();
    }
  }, [connection, fetchSlackChannels, fetchDiscordChannels, fetchEventTypes]);

  // Validate GHL API key
  const validateGhlApiKey = async (apiKey: string) => {
    if (!apiKey || apiKey.length < 10) {
      setGhlValidation("idle");
      setGhlError(null);
      return;
    }

    if (!connection?.ghl_location_id) {
      setGhlError('No GHL location configured');
      setGhlValidation("error");
      return;
    }

    setGhlValidation("validating");
    setGhlError(null);

    try {
      const { data, error } = await supabase.functions.invoke('validate-ghl-api-key', {
        body: { api_key: apiKey, location_id: connection.ghl_location_id }
      });

      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.error || 'Invalid API key');
      }

      setGhlValidation("valid");
    } catch (error) {
      console.error('GHL API key validation error:', error);
      setGhlError(error instanceof Error ? error.message : 'Failed to validate API key');
      setGhlValidation("error");
    }
  };

  // Validate Conversifi URL
  const validateConversifiUrl = async (url: string) => {
    if (!url || url.length < 10) {
      setConversifiValidation("idle");
      setConversifiError(null);
      return;
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      setConversifiError('Invalid URL format');
      setConversifiValidation("error");
      return;
    }

    setConversifiValidation("validating");
    setConversifiError(null);

    try {
      const { data, error } = await supabase.functions.invoke('validate-conversifi', {
        body: { webhook_url: url }
      });

      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to validate URL');
      }

      setConversifiValidation("valid");
    } catch (error) {
      console.error('Conversifi validation error:', error);
      setConversifiError(error instanceof Error ? error.message : 'Failed to validate Conversifi URL');
      setConversifiValidation("error");
    }
  };

  const toggleEventType = (uri: string) => {
    setSelectedEventTypes(prev => 
      prev.includes(uri) 
        ? prev.filter(u => u !== uri)
        : [...prev, uri]
    );
  };

  const selectAllEventTypes = () => {
    setSelectedEventTypes(eventTypes.map(et => et.uri));
  };

  const clearEventTypes = () => {
    setSelectedEventTypes([]);
  };

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

      // If Discord is being cleared (switching to Slack or clearing), delete the old webhook
      if (!formData.discord_channel_id && connection.discord_webhook_url) {
        try {
          console.log('Deleting Discord webhook (switching to Slack or clearing)...');
          const urlParts = connection.discord_webhook_url.split('/');
          const webhookId = urlParts[urlParts.length - 2];
          const webhookToken = urlParts[urlParts.length - 1];
          
          if (webhookId && webhookToken) {
            await fetch(`https://discord.com/api/webhooks/${webhookId}/${webhookToken}`, {
              method: 'DELETE'
            });
            console.log('Discord webhook deleted');
          }
        } catch (err) {
          console.warn('Failed to delete Discord webhook:', err);
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
        watched_event_types: selectedEventTypes.length > 0 ? selectedEventTypes : null,
        client_timezone: formData.client_timezone,
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

  const getValidationIcon = (status: ValidationStatus) => {
    switch (status) {
      case "validating":
        return <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />;
      case "valid":
        return <CheckCircle2 className="h-3.5 w-3.5 text-success" />;
      case "error":
        return <AlertCircle className="h-3.5 w-3.5 text-destructive" />;
      default:
        return null;
    }
  };

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
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                GHL API Key
                {getValidationIcon(ghlValidation)}
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-2"
                onClick={() => setShowGhlKey(!showGhlKey)}
              >
                {showGhlKey ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </Button>
            </div>
            <Input
              type={showGhlKey ? "text" : "password"}
              placeholder="Enter GHL API Key"
              value={formData.ghl_api_key}
              onChange={(e) => setFormData({ ...formData, ghl_api_key: e.target.value })}
              onBlur={(e) => validateGhlApiKey(e.target.value)}
            />
            {ghlValidation === "valid" && (
              <p className="text-xs text-success flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                API key validated successfully
              </p>
            )}
            {ghlError && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {ghlError}
              </p>
            )}
            <p className="text-xs text-muted-foreground">Required for creating contacts in GHL</p>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              Conversifi Webhook URL
              {getValidationIcon(conversifiValidation)}
            </Label>
            <Input
              placeholder="https://server.conversifi.io/..."
              value={formData.conversifi_webhook_url}
              onChange={(e) => setFormData({ ...formData, conversifi_webhook_url: e.target.value })}
              onBlur={(e) => validateConversifiUrl(e.target.value)}
            />
            {conversifiValidation === "valid" && (
              <p className="text-xs text-success flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Webhook URL validated successfully
              </p>
            )}
            {conversifiError && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {conversifiError}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Client Timezone
            </Label>
            <Select
              value={formData.client_timezone}
              onValueChange={(value) => setFormData({ ...formData, client_timezone: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              All booking notifications will be displayed in this timezone
            </p>
          </div>

          {/* Calendly Event Types Section */}
          {connection.calendly_token && (
            <div className="space-y-3 p-4 rounded-lg border border-dashed border-primary/30 bg-primary/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Calendly Event Types</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={fetchEventTypes}
                  disabled={loadingEventTypes}
                >
                  <RefreshCw className={`h-3 w-3 mr-1 ${loadingEventTypes ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>

              {loadingEventTypes ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Loading event types...
                </div>
              ) : eventTypes.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={selectAllEventTypes}
                    >
                      Select All
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={clearEventTypes}
                    >
                      Clear
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                    {eventTypes.map((et) => {
                      const isSelected = selectedEventTypes.includes(et.uri);
                      return (
                        <button
                          key={et.uri}
                          type="button"
                          onClick={() => toggleEventType(et.uri)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                            isSelected
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          }`}
                        >
                          {et.name}
                          {et.duration && <span className="opacity-70">({et.duration}m)</span>}
                          {isSelected && <X className="h-3 w-3" />}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {selectedEventTypes.length === 0
                      ? 'All events will be tracked (no filter)'
                      : `${selectedEventTypes.length} event type${selectedEventTypes.length === 1 ? '' : 's'} selected`}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No event types found</p>
              )}
            </div>
          )}

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
                onValueChange={(value) => setFormData({ 
                  ...formData, 
                  slack_channel_id: value === "__NONE__" ? "" : value,
                  discord_channel_id: value === "__NONE__" ? formData.discord_channel_id : "" // Clear Discord when Slack is selected
                })}
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
                onValueChange={(value) => setFormData({ 
                  ...formData, 
                  discord_channel_id: value === "__NONE__" ? "" : value,
                  slack_channel_id: value === "__NONE__" ? formData.slack_channel_id : "" // Clear Slack when Discord is selected
                })}
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
