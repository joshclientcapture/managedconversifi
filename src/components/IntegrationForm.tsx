import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Link2, CheckCircle2, AlertCircle, Eye, EyeOff, Hash, RefreshCw, Calendar, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
// Removed Checkbox and Badge imports - using custom checkbox to avoid ref issues
import StatusIndicator from "./StatusIndicator";
import { supabase } from "@/integrations/supabase/client";

const formSchema = z.object({
  clientName: z.string().min(1, "Client name is required").max(100, "Client name must be less than 100 characters"),
  calendlyToken: z.string().min(1, "Calendly API Token is required"),
  ghlLocation: z.string().min(1, "Please select a GHL Location"),
  slackChannel: z.string().min(1, "Please select a Slack channel"),
});

type FormValues = z.infer<typeof formSchema>;

type ConnectionStatus = "idle" | "connecting" | "connected" | "error";

interface ServiceStatuses {
  calendly: ConnectionStatus;
  ghl: ConnectionStatus;
  slack: ConnectionStatus;
  database: ConnectionStatus;
}

interface GhlLocation {
  locationId: string;
  locationName: string;
  ownerName: string;
}

interface SlackChannel {
  id: string;
  name: string;
}

interface CalendlyInfo {
  userUri: string;
  orgUri: string;
  userName: string;
  userEmail: string;
}

interface CalendlyEventType {
  uri: string;
  name: string;
  duration: number;
  active: boolean;
  scheduling_url: string;
  type: string;
}

interface ConnectionResult {
  id: string;
  client_name: string;
  is_active: boolean;
}

const IntegrationForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [connectionSuccess, setConnectionSuccess] = useState(false);
  const [connectionResult, setConnectionResult] = useState<ConnectionResult | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [ghlLocations, setGhlLocations] = useState<GhlLocation[]>([]);
  const [slackChannels, setSlackChannels] = useState<SlackChannel[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [calendlyInfo, setCalendlyInfo] = useState<CalendlyInfo | null>(null);
  const [validatingCalendly, setValidatingCalendly] = useState(false);
  const [calendlyError, setCalendlyError] = useState<string | null>(null);
  const [eventTypes, setEventTypes] = useState<CalendlyEventType[]>([]);
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>([]);
  const [loadingEventTypes, setLoadingEventTypes] = useState(false);
  const [statuses, setStatuses] = useState<ServiceStatuses>({
    calendly: "idle",
    ghl: "idle",
    slack: "idle",
    database: "idle",
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientName: "",
      calendlyToken: "",
      ghlLocation: "",
      slackChannel: "",
    },
    mode: "onChange",
  });

  // Fetch GHL locations from edge function
  const fetchLocations = useCallback(async () => {
    setLoadingLocations(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-ghl-locations');
      
      if (error) throw error;
      setGhlLocations(data?.locations || []);
    } catch (error) {
      console.error('Error fetching GHL locations:', error);
    } finally {
      setLoadingLocations(false);
    }
  }, []);

  // Fetch Slack channels from edge function
  const fetchChannels = useCallback(async () => {
    setLoadingChannels(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-slack-channels');
      
      if (error) throw error;
      setSlackChannels(data?.channels || []);
    } catch (error) {
      console.error('Error fetching Slack channels:', error);
    } finally {
      setLoadingChannels(false);
    }
  }, []);

  // Fetch Calendly event types
  const fetchEventTypes = useCallback(async (token: string, userUri: string) => {
    setLoadingEventTypes(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-calendly-event-types', {
        body: { calendly_token: token, user_uri: userUri }
      });
      
      if (error) throw error;
      setEventTypes(data?.eventTypes || []);
    } catch (error) {
      console.error('Error fetching event types:', error);
    } finally {
      setLoadingEventTypes(false);
    }
  }, []);

  useEffect(() => {
    fetchLocations();
    fetchChannels();
  }, [fetchLocations, fetchChannels]);

  // Validate Calendly token on blur
  const validateCalendlyToken = async (token: string) => {
    if (!token || token.length < 10) {
      setCalendlyInfo(null);
      setCalendlyError(null);
      setEventTypes([]);
      setSelectedEventTypes([]);
      setStatuses(prev => ({ ...prev, calendly: "idle" }));
      return;
    }

    setValidatingCalendly(true);
    setCalendlyError(null);
    setStatuses(prev => ({ ...prev, calendly: "connecting" }));

    try {
      const { data, error } = await supabase.functions.invoke('get-calendly-info', {
        body: { calendly_token: token }
      });

      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.error || 'Invalid token');
      }

      const info = {
        userUri: data.userUri,
        orgUri: data.orgUri,
        userName: data.userName,
        userEmail: data.userEmail,
      };
      setCalendlyInfo(info);
      setStatuses(prev => ({ ...prev, calendly: "connected" }));
      
      // Fetch event types after successful validation
      fetchEventTypes(token, data.userUri);
    } catch (error) {
      console.error('Calendly validation error:', error);
      setCalendlyError(error instanceof Error ? error.message : 'Invalid Calendly token');
      setCalendlyInfo(null);
      setEventTypes([]);
      setSelectedEventTypes([]);
      setStatuses(prev => ({ ...prev, calendly: "error" }));
    } finally {
      setValidatingCalendly(false);
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

  const onSubmit = async (values: FormValues) => {
    if (!calendlyInfo) {
      setConnectionError('Please validate your Calendly token first');
      return;
    }

    setIsSubmitting(true);
    setConnectionError(null);
    setConnectionSuccess(false);

    try {
      const selectedLocation = ghlLocations.find(loc => loc.locationId === values.ghlLocation);
      const selectedChannel = slackChannels.find(ch => ch.id === values.slackChannel);

      const { data, error } = await supabase.functions.invoke('setup-client', {
        body: {
          client_name: values.clientName,
          calendly_token: values.calendlyToken,
          calendly_user_uri: calendlyInfo.userUri,
          calendly_org_uri: calendlyInfo.orgUri,
          watched_event_types: selectedEventTypes.length > 0 ? selectedEventTypes : null,
          ghl_location_id: values.ghlLocation,
          ghl_location_name: selectedLocation?.locationName || '',
          slack_channel_id: values.slackChannel,
          slack_channel_name: selectedChannel?.name || ''
        }
      });

      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.error || 'Connection failed');
      }

      setStatuses(prev => ({ ...prev, ghl: "connected" }));
      await new Promise(r => setTimeout(r, 300));
      setStatuses(prev => ({ ...prev, slack: "connected" }));
      await new Promise(r => setTimeout(r, 300));
      setStatuses(prev => ({ ...prev, database: "connected" }));

      setConnectionResult(data.connection);
      setConnectionSuccess(true);
      form.reset();
      setCalendlyInfo(null);
      setEventTypes([]);
      setSelectedEventTypes([]);

      setTimeout(() => {
        resetForm();
      }, 5000);

    } catch (error) {
      console.error('Connection error:', error);
      setConnectionError(error instanceof Error ? error.message : 'Failed to establish connection');
      setStatuses(prev => ({
        ...prev,
        ghl: "error",
        slack: "error",
        database: "error",
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setConnectionSuccess(false);
    setConnectionResult(null);
    setCalendlyInfo(null);
    setCalendlyError(null);
    setEventTypes([]);
    setSelectedEventTypes([]);
    setStatuses({
      calendly: "idle",
      ghl: "idle",
      slack: "idle",
      database: "idle",
    });
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <Card className="gradient-card shadow-card border-0 transition-all duration-300 hover:shadow-card-hover">
        <CardHeader className="space-y-1 pb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary shadow-button">
              <Link2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-foreground">
                Client Integration Setup
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Connect your client's services to activate the integration
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {connectionSuccess && connectionResult && (
            <Alert className="border-success/30 bg-success/10 animate-fade-in-up">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <AlertTitle className="text-success font-semibold">✅ Integration Active</AlertTitle>
              <AlertDescription className="text-success/80 space-y-2">
                <p><strong>Client:</strong> {connectionResult.client_name}</p>
                <p><strong>Connected Services:</strong> Calendly, GHL, Slack, Database</p>
                <p className="text-xs mt-2">Form will reset in 5 seconds...</p>
              </AlertDescription>
            </Alert>
          )}

          {connectionError && (
            <Alert variant="destructive" className="animate-fade-in-up">
              <AlertCircle className="h-5 w-5" />
              <AlertTitle>Connection Failed</AlertTitle>
              <AlertDescription>{connectionError}</AlertDescription>
            </Alert>
          )}

          <div className="rounded-xl border bg-muted/30 p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Service Status</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1">
              <StatusIndicator label="Calendly" status={statuses.calendly} />
              <StatusIndicator label="GHL" status={statuses.ghl} />
              <StatusIndicator label="Slack" status={statuses.slack} />
              <StatusIndicator label="Database" status={statuses.database} />
            </div>
          </div>

          {!connectionSuccess && (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="clientName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground font-medium">Client Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter client name"
                          className="h-11 bg-background border-input focus:ring-2 focus:ring-primary/20 transition-all"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="calendlyToken"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground font-medium">Calendly API Token</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showToken ? "text" : "password"}
                            placeholder="Paste Calendly Personal Access Token"
                            className="h-11 pr-10 bg-background border-input focus:ring-2 focus:ring-primary/20 transition-all"
                            {...field}
                            onBlur={(e) => {
                              field.onBlur();
                              validateCalendlyToken(e.target.value);
                            }}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-11 w-11 px-3 hover:bg-transparent"
                            onClick={() => setShowToken(!showToken)}
                          >
                            {showToken ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormDescription className="text-xs text-muted-foreground">
                        Get this from Calendly → Integrations → API & Webhooks
                      </FormDescription>
                      {validatingCalendly && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Validating token...
                        </p>
                      )}
                      {calendlyInfo && (
                        <p className="text-xs text-success flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Valid token for {calendlyInfo.userName} ({calendlyInfo.userEmail})
                        </p>
                      )}
                      {calendlyError && (
                        <p className="text-xs text-destructive flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {calendlyError}
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Event Types Multi-Select */}
                {calendlyInfo && (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-foreground font-medium">
                        Calendly Event Types
                        <span className="text-muted-foreground font-normal ml-1">(optional)</span>
                      </FormLabel>
                      {eventTypes.length > 0 && (
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                            onClick={selectAllEventTypes}
                          >
                            Select All
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                            onClick={clearEventTypes}
                          >
                            Clear
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    {loadingEventTypes ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading event types...
                      </div>
                    ) : eventTypes.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-2">
                        No active event types found
                      </p>
                    ) : (
                      <>
                        <div className="border rounded-lg bg-background p-3 space-y-2 max-h-48 overflow-y-auto">
                          {eventTypes.map((et) => {
                            const isSelected = selectedEventTypes.includes(et.uri);
                            return (
                              <div
                                key={et.uri}
                                className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${
                                  isSelected 
                                    ? 'bg-primary/10 border border-primary/30' 
                                    : 'hover:bg-muted/50'
                                }`}
                                onClick={() => toggleEventType(et.uri)}
                              >
                                <div className={`h-4 w-4 rounded border flex items-center justify-center ${
                                  isSelected ? 'bg-primary border-primary' : 'border-input'
                                }`}>
                                  {isSelected && (
                                    <CheckCircle2 className="h-3 w-3 text-primary-foreground" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-foreground truncate">
                                    {et.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {et.duration} min • {et.type}
                                  </p>
                                </div>
                                <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              </div>
                            );
                          })}
                        </div>
                        
                        {selectedEventTypes.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {selectedEventTypes.map((uri) => {
                              const et = eventTypes.find(e => e.uri === uri);
                              return et ? (
                                <span 
                                  key={uri} 
                                  className="inline-flex items-center gap-1 text-xs bg-secondary text-secondary-foreground pl-2 pr-1 py-0.5 rounded-md"
                                >
                                  {et.name}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleEventType(uri);
                                    }}
                                    className="ml-1 hover:bg-muted rounded-full p-0.5"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </span>
                              ) : null;
                            })}
                          </div>
                        )}
                        
                        <FormDescription className="text-xs text-muted-foreground">
                          {selectedEventTypes.length === 0 
                            ? "Leave empty to monitor all event types"
                            : `Monitoring ${selectedEventTypes.length} of ${eventTypes.length} event type(s)`
                          }
                        </FormDescription>
                      </>
                    )}
                  </FormItem>
                )}

                {/* Conversifi Webhook Section */}
                <div className="rounded-xl border bg-muted/30 p-4">
                  <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                    <Link2 className="h-4 w-4" />
                    Conversifi Webhook
                  </h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    Use this webhook URL in Conversifi to receive booking notifications
                  </p>
                  <div className="bg-background border rounded-md p-2 font-mono text-xs text-foreground break-all">
                    https://ifnxhardrbzrtoghhfcr.supabase.co/functions/v1/conversifi-webhook
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="ghlLocation"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel className="text-foreground font-medium">GHL Location</FormLabel>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                          onClick={fetchLocations}
                          disabled={loadingLocations}
                        >
                          <RefreshCw className={`h-3 w-3 mr-1 ${loadingLocations ? 'animate-spin' : ''}`} />
                          Refresh
                        </Button>
                      </div>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-11 bg-background border-input focus:ring-2 focus:ring-primary/20 transition-all">
                            <SelectValue placeholder={loadingLocations ? "Loading locations..." : "Select GHL Location"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-popover border shadow-lg max-h-60 z-50">
                          {ghlLocations.map((location) => (
                            <SelectItem
                              key={location.locationId}
                              value={location.locationId}
                              className="cursor-pointer hover:bg-accent focus:bg-accent"
                            >
                              {location.locationName} ({location.ownerName})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="slackChannel"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel className="text-foreground font-medium">Slack Channel</FormLabel>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                          onClick={fetchChannels}
                          disabled={loadingChannels}
                        >
                          <RefreshCw className={`h-3 w-3 mr-1 ${loadingChannels ? 'animate-spin' : ''}`} />
                          Refresh
                        </Button>
                      </div>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-11 bg-background border-input focus:ring-2 focus:ring-primary/20 transition-all">
                            <SelectValue placeholder={loadingChannels ? "Loading channels..." : "Select Slack channel for notifications"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-popover border shadow-lg max-h-60 z-50">
                          {slackChannels.map((channel) => (
                            <SelectItem
                              key={channel.id}
                              value={channel.id}
                              className="cursor-pointer hover:bg-accent focus:bg-accent"
                            >
                              <span className="flex items-center gap-2">
                                <Hash className="h-3 w-3 text-muted-foreground" />
                                {channel.name}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full h-12 gradient-primary text-primary-foreground font-semibold shadow-button hover:opacity-90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isSubmitting || !form.formState.isValid || !calendlyInfo}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Link2 className="mr-2 h-5 w-5" />
                      Connect & Activate
                    </>
                  )}
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default IntegrationForm;
