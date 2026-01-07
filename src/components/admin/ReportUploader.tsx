import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Loader2, Upload, FileText } from "lucide-react";
import { toast } from "sonner";

interface ClientConnection {
  id: string;
  client_name: string;
}

interface ReportUploaderProps {
  connections: ClientConnection[];
  open: boolean;
  onClose: () => void;
}

const ReportUploader = ({ connections, open, onClose }: ReportUploaderProps) => {
  const [uploading, setUploading] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<string>("");
  const [reportName, setReportName] = useState("");
  const [reportDate, setReportDate] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const handleUpload = async () => {
    if (!selectedConnection || !reportName || !reportDate || !file) {
      toast.error("Please fill in all fields");
      return;
    }

    setUploading(true);
    try {
      // Upload file to storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${selectedConnection}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("reports")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("reports")
        .getPublicUrl(fileName);

      // Insert report record
      const { error: insertError } = await supabase
        .from("reports")
        .insert({
          client_connection_id: selectedConnection,
          report_name: reportName,
          report_url: urlData.publicUrl,
          report_date: reportDate,
        });

      if (insertError) throw insertError;

      toast.success("Report uploaded successfully");
      handleReset();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload report");
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setSelectedConnection("");
    setReportName("");
    setReportDate("");
    setFile(null);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Upload Report
          </DialogTitle>
          <DialogDescription>
            Upload a bi-weekly report for a client
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Client</Label>
            <Select value={selectedConnection} onValueChange={setSelectedConnection}>
              <SelectTrigger>
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent>
                {connections.map((conn) => (
                  <SelectItem key={conn.id} value={conn.id}>
                    {conn.client_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Report Name</Label>
            <Input
              placeholder="e.g., Campaign Report - Jan 1-15, 2025"
              value={reportName}
              onChange={(e) => setReportName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Report Date</Label>
            <Input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>PDF File</Label>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept=".pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="flex-1"
              />
            </div>
            {file && (
              <p className="text-xs text-muted-foreground">
                Selected: {file.name}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={uploading}>
            {uploading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            Upload Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReportUploader;
