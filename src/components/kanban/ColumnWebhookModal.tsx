import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, Webhook } from 'lucide-react';
import { Column } from '@/hooks/useKanbanData';

interface ColumnWebhookModalProps {
  open: boolean;
  column: Column | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (webhookUrl: string | null, triggerMode: string | null) => Promise<void>;
}

export const ColumnWebhookModal = ({ open, column, onOpenChange, onSubmit }: ColumnWebhookModalProps) => {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [triggerMode, setTriggerMode] = useState('every_time');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (column) {
      setWebhookUrl(column.webhook_url || '');
      setTriggerMode(column.webhook_trigger_mode || 'every_time');
    }
  }, [column]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const url = webhookUrl.trim() || null;
      await onSubmit(url, url ? triggerMode : null);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    setLoading(true);
    try {
      await onSubmit(null, null);
      setWebhookUrl('');
      setTriggerMode('every_time');
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Configure Webhook
          </DialogTitle>
          <DialogDescription>
            Set up a webhook to be triggered when cards enter this column.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="webhookUrl">Webhook URL</Label>
              <Input
                id="webhookUrl"
                type="url"
                placeholder="https://example.com/webhook"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
              />
            </div>

            {webhookUrl && (
              <div className="space-y-3">
                <Label>Trigger Mode</Label>
                <RadioGroup value={triggerMode} onValueChange={setTriggerMode}>
                  <div className="flex items-start gap-3">
                    <RadioGroupItem value="every_time" id="every_time" className="mt-1" />
                    <div>
                      <Label htmlFor="every_time" className="font-medium">Every Time</Label>
                      <p className="text-sm text-muted-foreground">
                        Trigger the webhook every time a card enters this column
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <RadioGroupItem value="first_time_only" id="first_time_only" className="mt-1" />
                    <div>
                      <Label htmlFor="first_time_only" className="font-medium">First Time Only</Label>
                      <p className="text-sm text-muted-foreground">
                        Only trigger the first time a card enters this column
                      </p>
                    </div>
                  </div>
                </RadioGroup>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            {column?.webhook_url && (
              <Button type="button" variant="outline" onClick={handleClear} disabled={loading}>
                Remove Webhook
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
