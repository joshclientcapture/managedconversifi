import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, RefreshCw, Webhook, Pencil, Copy, Check, Loader2, Upload, FileText, Users, ClipboardList, Settings } from "lucide-react";
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
import WebhookDetailsDialog from "@/components/admin/WebhookDetailsDialog";
import ReportUploader from "@/components/admin/ReportUploader";
import AdminManager from "@/components/admin/AdminManager";
import OnboardingList from "@/components/admin/OnboardingList";
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

const Admin = () => {
  const [connections, setConnections] = useState<ClientConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingConnection, setEditingConnection] = useState<ClientConnection | null>(null);
  const [webhookConnection, setWebhookConnection] = useState<ClientConnection | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [reportUploaderOpen, setReportUploaderOpen] = useState(false);
  const [reportConnectionId, setReportConnectionId] = useState<string | null>(null);

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

  const openReportUploader = (connectionId: string) => {
    setReportConnectionId(connectionId);
    setReportUploaderOpen(true);
  };

  const deleteConnection = async (connection: ClientConnection) => {
    setDeletingId(connection.id);
    
    try {
      // Delete Calendly webhook first if it exists
      if (connection.calendly_webhook_id) {
        try {
          await supabase.functions.invoke("delete-calendly-webhook", {
            body: {
              calendly_token: connection.calendly_token,
              webhook_uri: connection.calendly_webhook_id,
            },
          });
        } catch (webhookErr) {
          console.warn("Failed to delete Calendly webhook:", webhookErr);
        }
      }

      const { error } = await supabase
        .from("client_connections")
        .delete()
        .eq("id", connection.id);

      if (error) throw error;

      toast.success("Connection and webhook deleted");
      setConnections((prev) => prev.filter((c) => c.id !== connection.id));
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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-semibold text-foreground">Admin Dashboard</h1>
              <p className="text-muted-foreground">Manage clients, onboarding, and settings</p>
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="connections" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
              <TabsTrigger value="connections" className="gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Connections</span>
              </TabsTrigger>
              <TabsTrigger value="onboarding" className="gap-2">
                <ClipboardList className="h-4 w-4" />
                <span className="hidden sm:inline">Onboarding</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-2">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Settings</span>
              </TabsTrigger>
            </TabsList>

            {/* Connections Tab */}
            <TabsContent value="connections" className="space-y-6">
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setReportUploaderOpen(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Report
                </Button>
                <Button variant="outline" onClick={fetchConnections} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>

              <Card className="glass-panel">
                <CardHeader>
                  <CardTitle>Client Connections</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                      Loading...
                    </div>
                  ) : connections.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No connections found</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Client</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {connections.map((conn) => (
                            <TableRow key={conn.id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{conn.client_name}</p>
                                  <p className="text-xs text-muted-foreground">{conn.ghl_location_name}</p>
                                  {conn.access_token && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-1.5 font-mono text-xs text-muted-foreground hover:text-foreground mt-1"
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
                                </div>
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
                                    onClick={() => openReportUploader(conn.id)}
                                    title="Upload Report"
                                  >
                                    <FileText className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setWebhookConnection(conn)}
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
                                        {deletingId === conn.id ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                          <Trash2 className="h-4 w-4" />
                                        )}
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
            </TabsContent>

            {/* Onboarding Tab */}
            <TabsContent value="onboarding">
              <OnboardingList />
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings">
              <AdminManager />
            </TabsContent>
          </Tabs>

          {/* Modals */}
          <EditConnectionModal
            connection={editingConnection}
            onClose={() => setEditingConnection(null)}
            onSave={fetchConnections}
          />
          
          <WebhookDetailsDialog
            connection={webhookConnection}
            open={!!webhookConnection}
            onClose={() => setWebhookConnection(null)}
            onRecreate={fetchConnections}
          />
          
          <ReportUploader
            connections={connections}
            open={reportUploaderOpen}
            onClose={() => {
              setReportUploaderOpen(false);
              setReportConnectionId(null);
            }}
            preselectedConnectionId={reportConnectionId}
          />
        </div>
      </main>
    </div>
  );
};

export default Admin;
