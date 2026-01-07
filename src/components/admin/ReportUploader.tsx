import { useState, useEffect } from "react";
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
import { Loader2, Upload, FileText, Trash2, Pencil, X, Check, ExternalLink, Calendar } from "lucide-react";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

interface ClientConnection {
  id: string;
  client_name: string;
}

interface Report {
  id: string;
  report_name: string;
  report_date: string;
  report_url: string;
}

interface ReportUploaderProps {
  connections: ClientConnection[];
  open: boolean;
  onClose: () => void;
  preselectedConnectionId?: string | null;
}

const ReportUploader = ({ connections, open, onClose, preselectedConnectionId }: ReportUploaderProps) => {
  const [uploading, setUploading] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<string>(preselectedConnectionId || "");
  const [reportName, setReportName] = useState("");
  const [reportDate, setReportDate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  
  // Existing reports state
  const [reports, setReports] = useState<Report[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingDateReportId, setEditingDateReportId] = useState<string | null>(null);
  const [editingDate, setEditingDate] = useState("");
  const [deletingReportId, setDeletingReportId] = useState<string | null>(null);

  // Update selection when preselectedConnectionId changes
  useEffect(() => {
    if (preselectedConnectionId) {
      setSelectedConnection(preselectedConnectionId);
    }
  }, [preselectedConnectionId]);

  // Fetch reports when connection changes
  useEffect(() => {
    if (selectedConnection && open) {
      fetchReports();
    } else {
      setReports([]);
    }
  }, [selectedConnection, open]);

  const fetchReports = async () => {
    if (!selectedConnection) return;
    
    setLoadingReports(true);
    try {
      const { data, error } = await supabase
        .from("reports")
        .select("id, report_name, report_date, report_url")
        .eq("client_connection_id", selectedConnection)
        .order("report_date", { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load reports");
    } finally {
      setLoadingReports(false);
    }
  };

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
      setReportName("");
      setReportDate("");
      setFile(null);
      fetchReports();
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload report");
    } finally {
      setUploading(false);
    }
  };

  const handleRename = async (reportId: string) => {
    if (!editingName.trim()) {
      toast.error("Report name cannot be empty");
      return;
    }

    try {
      const { error } = await supabase
        .from("reports")
        .update({ report_name: editingName })
        .eq("id", reportId);

      if (error) throw error;

      toast.success("Report renamed");
      setEditingReportId(null);
      setEditingName("");
      fetchReports();
    } catch (err) {
      console.error(err);
      toast.error("Failed to rename report");
    }
  };

  const handleDelete = async (reportId: string) => {
    setDeletingReportId(reportId);
    try {
      const { error } = await supabase
        .from("reports")
        .delete()
        .eq("id", reportId);

      if (error) throw error;

      toast.success("Report deleted");
      fetchReports();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete report");
    } finally {
      setDeletingReportId(null);
    }
  };

  const startEditing = (report: Report) => {
    setEditingReportId(report.id);
    setEditingName(report.report_name);
  };

  const cancelEditing = () => {
    setEditingReportId(null);
    setEditingName("");
  };

  const startEditingDate = (report: Report) => {
    setEditingDateReportId(report.id);
    setEditingDate(report.report_date);
  };

  const cancelEditingDate = () => {
    setEditingDateReportId(null);
    setEditingDate("");
  };

  const handleChangeDate = async (reportId: string) => {
    if (!editingDate) {
      toast.error("Date cannot be empty");
      return;
    }

    try {
      const { error } = await supabase
        .from("reports")
        .update({ report_date: editingDate })
        .eq("id", reportId);

      if (error) throw error;

      toast.success("Report date updated");
      setEditingDateReportId(null);
      setEditingDate("");
      fetchReports();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update date");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Manage Reports
          </DialogTitle>
          <DialogDescription>
            Upload, rename, or delete reports for this client
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

          {/* Existing Reports */}
          {selectedConnection && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="text-sm font-medium">Existing Reports</Label>
                {loadingReports ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : reports.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No reports uploaded yet</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {reports.map((report) => (
                      <div 
                        key={report.id} 
                        className="flex items-center gap-2 p-2 rounded-md bg-muted/50"
                      >
                        {editingReportId === report.id ? (
                          <>
                            <Input
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              className="flex-1 h-8"
                              autoFocus
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleRename(report.id)}
                            >
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={cancelEditing}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : editingDateReportId === report.id ? (
                          <>
                            <Input
                              type="date"
                              value={editingDate}
                              onChange={(e) => setEditingDate(e.target.value)}
                              className="flex-1 h-8"
                              autoFocus
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleChangeDate(report.id)}
                            >
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={cancelEditingDate}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{report.report_name}</p>
                              <p className="text-xs text-muted-foreground">{report.report_date}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => window.open(report.report_url, "_blank")}
                              title="View report"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => startEditingDate(report)}
                              title="Change date"
                            >
                              <Calendar className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => startEditing(report)}
                              title="Rename"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(report.id)}
                              disabled={deletingReportId === report.id}
                              title="Delete"
                            >
                              {deletingReportId === report.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Separator />
            </>
          )}

          {/* Upload New Report */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Upload New Report</Label>
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
            Close
          </Button>
          <Button onClick={handleUpload} disabled={uploading || !selectedConnection}>
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
