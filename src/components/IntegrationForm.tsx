import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Link2, CheckCircle2, AlertCircle, Eye, EyeOff } from "lucide-react";
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

const formSchema = z.object({
  clientName: z.string().min(1, "Client name is required").max(100, "Client name must be less than 100 characters"),
  calendlyToken: z.string().min(1, "Calendly API Token is required"),
  ghlLocation: z.string().min(1, "Please select a GHL Location"),
});

type FormValues = z.infer<typeof formSchema>;

// Dummy data for GHL locations (will be replaced with Supabase data)
const GHL_LOCATIONS = [
  "Agent Media Marketing",
  "Aim Healthcare Recruiting",
  "Balanced Health",
];

type ConnectionStatus = "idle" | "connecting" | "connected" | "error";

interface ServiceStatuses {
  calendly: ConnectionStatus;
  ghl: ConnectionStatus;
  slack: ConnectionStatus;
  database: ConnectionStatus;
}

const IntegrationForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [connectionSuccess, setConnectionSuccess] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
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
    },
  });

  const simulateConnection = async (values: FormValues) => {
    setIsSubmitting(true);
    setConnectionError(null);
    setConnectionSuccess(false);

    // Simulate connecting to each service
    const services: (keyof ServiceStatuses)[] = ["calendly", "ghl", "slack", "database"];
    
    for (const service of services) {
      setStatuses((prev) => ({ ...prev, [service]: "connecting" }));
      await new Promise((resolve) => setTimeout(resolve, 600));
      setStatuses((prev) => ({ ...prev, [service]: "connected" }));
    }

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500));

    // For demo purposes, always succeed
    // In production, this would call the Supabase Edge Function
    setIsSubmitting(false);
    setConnectionSuccess(true);
    form.reset();
  };

  const onSubmit = async (values: FormValues) => {
    try {
      await simulateConnection(values);
    } catch (error) {
      setConnectionError("Failed to establish connection. Please check your credentials and try again.");
      setStatuses({
        calendly: "error",
        ghl: "error",
        slack: "error",
        database: "error",
      });
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setConnectionSuccess(false);
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
          {connectionSuccess && (
            <Alert className="border-success/30 bg-success/10 animate-fade-in-up">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <AlertTitle className="text-success font-semibold">Connection Active</AlertTitle>
              <AlertDescription className="text-success/80">
                All services have been successfully connected and activated.
                <Button
                  variant="link"
                  className="p-0 h-auto ml-2 text-success underline-offset-4"
                  onClick={resetForm}
                >
                  Set up another client
                </Button>
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-11 bg-background border-input focus:ring-2 focus:ring-primary/20 transition-all">
                            <SelectValue placeholder="Select GHL Location" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-popover border shadow-lg">
                          {GHL_LOCATIONS.map((location) => (
                            <SelectItem
                              key={location}
                              value={location}
                              className="cursor-pointer hover:bg-accent focus:bg-accent"
                            >
                              {location}
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
