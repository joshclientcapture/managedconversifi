import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trash2, RefreshCw, Webhook, Pencil, RotateCcw, Copy, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
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
import EditConnectionModal from "@/components/EditConnectionModal";
import Header from "@/components/Header";

interface ClientConnection {
  id: string;
  client_name: string;
  calendly_token: string;
  calendly_org_uri: string;
  calendly_user_uri: string;
  calendly_webhook_id: string | null;
  ghl_location_name: string;
  ghl_api_key: string | null;
  slack_channel_name: string | null;
  conversifi_webhook_url: string | null;
  access_token: string | null;
  is_active: boolean;
  created_at: string;
}

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

const Admin = () => {
  const [connections, setConnections] = useState<ClientConnection[]>([]);
  const [webhooks, setWebhooks] = useState<CalendlyWebhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [webhooksLoading, setWebhooksLoading] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<ClientConnection | null>(null);
  const [editingConnection, setEditingConnection] = useState<ClientConnection | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingWebhook, setDeletingWebhook] = useState<string | null>(null);
  const [recreatingWebhook, setRecreatingWebhook] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const fetchConnections = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("client_connections")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch connections");
      console.error(error);
    } else {
      setConnections(data || []);
    }
    setLoading(false);
  };

  const fetchWebhooks = async (connection: ClientConnection) => {
    setWebhooksLoading(true);
    setSelectedConnection(connection);
    setWebhooks([]);

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
    setWebhooksLoading(false);
  };

  const deleteWebhook = async (webhookUri: string) => {
    if (!selectedConnection) return;
    
    setDeletingWebhook(webhookUri);
    try {
      const { data, error } = await supabase.functions.invoke("delete-calendly-webhook", {
        body: {
          calendly_token: selectedConnection.calendly_token,
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

  const recreateWebhook = async (connection: ClientConnection) => {
    setRecreatingWebhook(connection.id);
    try {
      const { data, error } = await supabase.functions.invoke("recreate-calendly-webhook", {
        body: { connection_id: connection.id },
      });

      if (error || !data.success) {
        throw new Error(data?.error || error?.message);
      }

      toast.success(data.message || "Webhook recreated");
      fetchConnections();
    } catch (err) {
      toast.error("Failed to recreate webhook");
      console.error(err);
    }
    setRecreatingWebhook(null);
  };

  const deleteConnection = async (connection: ClientConnection) => {
    setDeletingId(connection.id);
    
    try {
      if (connection.calendly_webhook_id) {
        await supabase.functions.invoke("delete-calendly-webhook", {
          body: {
            calendly_token: connection.calendly_token,
            webhook_uri: connection.calendly_webhook_id,
          },
        });
      }

      const { error } = await supabase
        .from("client_connections")
        .delete()
        .eq("id", connection.id);

      if (error) throw error;

      toast.success("Connection deleted");
      setConnections((prev) => prev.filter((c) => c.id !== connection.id));
      
      if (selectedConnection?.id === connection.id) {
        setSelectedConnection(null);
        setWebhooks([]);
      }
    } catch (err) {
      toast.error("Failed to delete connection");
      console.error(err);
    }
    setDeletingId(null);
  };

  const copyAccessToken = (token: string | null) => {
    if (!token) return;
    navigator.clipboard.writeText(token);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  useEffect(() => {
    fetchConnections();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage client connections and webhooks</p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
          {/* Connections Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Client Connections</CardTitle>
              <Button variant="outline" size="sm" onClick={fetchConnections} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : connections.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No connections found</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Client</TableHead>
                        <TableHead>Token</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {connections.map((conn) => (
                        <TableRow 
                          key={conn.id}
                          className={selectedConnection?.id === conn.id ? "bg-muted/50" : ""}
                        >
                          <TableCell>
                            <div>
                              <p className="font-medium">{conn.client_name}</p>
                              <p className="text-xs text-muted-foreground">{conn.ghl_location_name}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {conn.access_token && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 font-mono text-xs"
                                onClick={() => copyAccessToken(conn.access_token)}
                              >
                                {copiedToken === conn.access_token ? (
                                  <Check className="h-3 w-3 mr-1 text-success" />
                                ) : (
                                  <Copy className="h-3 w-3 mr-1" />
                                )}
                                {conn.access_token}
                              </Button>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Badge variant={conn.is_active ? "default" : "secondary"}>
                                {conn.is_active ? "Active" : "Inactive"}
                              </Badge>
                              {!conn.ghl_api_key && (
                                <Badge variant="outline" className="text-amber-600 border-amber-300">
                                  No GHL Key
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingConnection(conn)}
                                title="Edit"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => recreateWebhook(conn)}
                                disabled={recreatingWebhook === conn.id}
                                title="Recreate Webhook"
                              >
                                {recreatingWebhook === conn.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <RotateCcw className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => fetchWebhooks(conn)}
                                disabled={webhooksLoading && selectedConnection?.id === conn.id}
                                title="View Webhooks"
                              >
                                <Webhook className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    disabled={deletingId === conn.id}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Connection?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will delete the connection for "{conn.client_name}" and remove any associated Calendly webhooks. This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteConnection(conn)}>
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Webhooks Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="h-5 w-5" />
                Calendly Webhooks
                {selectedConnection && (
                  <Badge variant="outline" className="ml-2">
                    {selectedConnection.client_name}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedConnection ? (
                <div className="text-center py-8 text-muted-foreground">
                  Select a connection to view webhooks
                </div>
              ) : webhooksLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading webhooks...</div>
              ) : webhooks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No webhooks found</div>
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
                              <Trash2 className="h-4 w-4" />
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
            </CardContent>
          </Card>
          </div>

          {/* Edit Modal */}
          <EditConnectionModal
            connection={editingConnection}
            onClose={() => setEditingConnection(null)}
            onSave={fetchConnections}
          />
        </div>
      </main>
    </div>
  );
};

export default Admin;
