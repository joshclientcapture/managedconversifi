import { useState, useEffect } from "react";
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
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ClientConnection {
  id: string;
  client_name: string;
  ghl_api_key: string | null;
  conversifi_webhook_url: string | null;
  is_active: boolean;
  access_token: string | null;
}

interface EditConnectionModalProps {
  connection: ClientConnection | null;
  onClose: () => void;
  onSave: () => void;
}

const EditConnectionModal = ({ connection, onClose, onSave }: EditConnectionModalProps) => {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    client_name: '',
    ghl_api_key: '',
    conversifi_webhook_url: '',
    is_active: true,
  });

  // Prefill form data when connection changes
  useEffect(() => {
    if (connection) {
      setFormData({
        client_name: connection.client_name || '',
        ghl_api_key: connection.ghl_api_key || '',
        conversifi_webhook_url: connection.conversifi_webhook_url || '',
        is_active: connection.is_active ?? true,
      });
    }
  }, [connection]);

  const handleSave = async () => {
    if (!connection) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('client_connections')
        .update({
          client_name: formData.client_name,
          ghl_api_key: formData.ghl_api_key || null,
          conversifi_webhook_url: formData.conversifi_webhook_url || null,
          is_active: formData.is_active,
        })
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

  return (
    <Dialog open={!!connection} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
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
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditConnectionModal;
