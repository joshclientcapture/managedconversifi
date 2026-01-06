import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Link2, CheckCircle2, AlertCircle, Eye, EyeOff, Hash } from "lucide-react";
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
  location_id: string;
  location_name: string;
  owner_name: string | null;
}

interface SlackChannel {
  id: string;
  name: string;
  is_private: boolean;
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

  // Fetch GHL locations from Supabase
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const { data, error } = await supabase
          .from('ghl_locations')
          .select('location_id, location_name, owner_name')
          .order('location_name');

        if (error) throw error;
        setGhlLocations(data || []);
      } catch (error) {
        console.error('Error fetching GHL locations:', error);
      } finally {
        setLoadingLocations(false);
      }
    };

    fetchLocations();
  }, []);

  // Fetch Slack channels from edge function
  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-slack-channels');
        
        if (error) throw error;
        setSlackChannels(data?.channels || []);
      } catch (error) {
        console.error('Error fetching Slack channels:', error);
      } finally {
        setLoadingChannels(false);
      }
    };

    fetchChannels();
  }, []);

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    setConnectionError(null);
    setConnectionSuccess(false);

    try {
      // Update status indicators
      setStatuses(prev => ({ ...prev, calendly: "connecting" }));
      
      // Get the selected channel name
      const selectedChannel = slackChannels.find(ch => ch.id === values.slackChannel);

      // Call the setup-client edge function
      const { data, error } = await supabase.functions.invoke('setup-client', {
        body: {
          client_name: values.clientName,
          calendly_token: values.calendlyToken,
          ghl_location_id: values.ghlLocation,
          slack_channel_id: values.slackChannel,
          slack_channel_name: selectedChannel?.name || ''
        }
      });

      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.error || 'Connection failed');
      }

      // Animate status updates
      setStatuses(prev => ({ ...prev, calendly: "connected" }));
      await new Promise(r => setTimeout(r, 300));
      setStatuses(prev => ({ ...prev, ghl: "connected" }));
      await new Promise(r => setTimeout(r, 300));
      setStatuses(prev => ({ ...prev, slack: "connected" }));
      await new Promise(r => setTimeout(r, 300));
      setStatuses(prev => ({ ...prev, database: "connected" }));

      setConnectionResult(data.connection);
      setConnectionSuccess(true);
      form.reset();

      // Auto-reset after 5 seconds
      setTimeout(() => {
        resetForm();
      }, 5000);

    } catch (error) {
      console.error('Connection error:', error);
      setConnectionError(error instanceof Error ? error.message : 'Failed to establish connection');
      setStatuses({
        calendly: "error",
        ghl: "error",
        slack: "error",
        database: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setConnectionSuccess(false);
    setConnectionResult(null);
    setStatuses({
      calendly: "idle",
      ghl: "idle",
      slack: "idle",
      database: "idle",
    });
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Main Form Card */}
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
          {/* Success Message */}
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

          {/* Error Message */}
          {connectionError && (
            <Alert variant="destructive" className="animate-fade-in-up">
              <AlertCircle className="h-5 w-5" />
              <AlertTitle>Connection Failed</AlertTitle>
              <AlertDescription>{connectionError}</AlertDescription>
            </Alert>
          )}

          {/* Status Indicators */}
          <div className="rounded-xl border bg-muted/30 p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Service Status</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1">
              <StatusIndicator label="Calendly" status={statuses.calendly} />
              <StatusIndicator label="GHL" status={statuses.ghl} />
              <StatusIndicator label="Slack" status={statuses.slack} />
              <StatusIndicator label="Database" status={statuses.database} />
            </div>
          </div>

          {/* Form */}
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
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ghlLocation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground font-medium">GHL Location</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-11 bg-background border-input focus:ring-2 focus:ring-primary/20 transition-all">
                            <SelectValue placeholder={loadingLocations ? "Loading locations..." : "Select GHL Location"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-popover border shadow-lg">
                          {ghlLocations.map((location) => (
                            <SelectItem
                              key={location.location_id}
                              value={location.location_id}
                              className="cursor-pointer hover:bg-accent focus:bg-accent"
                            >
                              {location.location_name} {location.owner_name && `(${location.owner_name})`}
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
                      <FormLabel className="text-foreground font-medium">Slack Channel</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-11 bg-background border-input focus:ring-2 focus:ring-primary/20 transition-all">
                            <SelectValue placeholder={loadingChannels ? "Loading channels..." : "Select Slack channel for notifications"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-popover border shadow-lg max-h-60">
                          {slackChannels.map((channel) => (
                            <SelectItem
                              key={channel.id}
                              value={channel.id}
                              className="cursor-pointer hover:bg-accent focus:bg-accent"
                            >
                              <span className="flex items-center gap-2">
                                <Hash className="h-3 w-3 text-muted-foreground" />
                                {channel.name}
                                {channel.is_private && <span className="text-xs text-muted-foreground">(private)</span>}
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
                  disabled={isSubmitting || !form.formState.isValid}
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
