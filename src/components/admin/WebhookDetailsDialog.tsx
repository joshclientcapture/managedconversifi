import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2, Loader2, Webhook } from "lucide-react";
import { toast } from "sonner";

interface CalendlyWebhook {
  uri: string;
  callback_url: string;
  created_at: string;
  updated_at: string;
  state: string;
  events: string[];
  scope: string;
  creator: string;
}

interface ClientConnection {
  id: string;
  client_name: string;
  calendly_token: string;
  calendly_org_uri: string;
  calendly_user_uri: string;
}

interface WebhookDetailsDialogProps {
  connection: ClientConnection | null;
  open: boolean;
  onClose: () => void;
}

const WebhookDetailsDialog = ({ connection, open, onClose }: WebhookDetailsDialogProps) => {
  const [webhooks, setWebhooks] = useState<CalendlyWebhook[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingWebhook, setDeletingWebhook] = useState<string | null>(null);

  const fetchWebhooks = async () => {
    if (!connection) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("list-calendly-webhooks", {
        body: {
          calendly_token: connection.calendly_token,
          org_uri: connection.calendly_org_uri,
          user_uri: connection.calendly_user_uri,
        },
      });

      if (error || !data.success) {
        throw new Error(data?.error || error?.message);
      }

      setWebhooks(data.webhooks || []);
    } catch (err) {
      toast.error("Failed to fetch webhooks");
      console.error(err);
    }
    setLoading(false);
  };

  const deleteWebhook = async (webhookUri: string) => {
    if (!connection) return;
    
    setDeletingWebhook(webhookUri);
    try {
      const { data, error } = await supabase.functions.invoke("delete-calendly-webhook", {
        body: {
          calendly_token: connection.calendly_token,
          webhook_uri: webhookUri,
        },
      });

      if (error || !data.success) {
        throw new Error(data?.error || error?.message);
      }

      toast.success("Webhook deleted");
      setWebhooks((prev) => prev.filter((w) => w.uri !== webhookUri));
    } catch (err) {
      toast.error("Failed to delete webhook");
      console.error(err);
    }
    setDeletingWebhook(null);
  };

  // Fetch webhooks when dialog opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && connection) {
      fetchWebhooks();
    } else {
      setWebhooks([]);
    }
    if (!isOpen) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Calendly Webhooks
          </DialogTitle>
          <DialogDescription>
            {connection?.client_name} - Manage webhook subscriptions
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : webhooks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Webhook className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No webhooks found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {webhooks.map((webhook) => (
                <div
                  key={webhook.uri}
                  className="p-4 border rounded-lg bg-muted/30 space-y-2"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{webhook.callback_url}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {webhook.events.map((event) => (
                          <Badge key={event} variant="secondary" className="text-xs">
                            {event.replace("invitee.", "")}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        State: {webhook.state} • Scope: {webhook.scope}
                      </p>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={deletingWebhook === webhook.uri}
                        >
                          {deletingWebhook === webhook.uri ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Webhook?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will remove the webhook subscription from Calendly. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteWebhook(webhook.uri)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WebhookDetailsDialog;
