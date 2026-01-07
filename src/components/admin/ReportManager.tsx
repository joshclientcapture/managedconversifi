import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Pencil, Loader2, FileText, Check, X } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Report {
  id: string;
  report_name: string;
  report_url: string;
  report_date: string;
  client_connection_id: string;
  created_at: string;
}

interface ClientConnection {
  id: string;
  client_name: string;
}

interface ReportManagerProps {
  connections: ClientConnection[];
}

const ReportManager = ({ connections }: ReportManagerProps) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConnection, setSelectedConnection] = useState<string>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchReports = async () => {
    setLoading(true);
    let query = supabase
      .from("reports")
      .select("*")
      .order("report_date", { ascending: false });

    if (selectedConnection !== "all") {
      query = query.eq("client_connection_id", selectedConnection);
    }

    const { data, error } = await query;

    if (error) {
      toast.error("Failed to fetch reports");
      console.error(error);
    } else {
      setReports(data || []);
    }
    setLoading(false);
  };

  const startEditing = (report: Report) => {
    setEditingId(report.id);
    setEditName(report.report_name);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditName("");
  };

  const saveReport = async (reportId: string) => {
    if (!editName.trim()) {
      toast.error("Report name cannot be empty");
      return;
    }

    setSavingId(reportId);

    const { error } = await supabase
      .from("reports")
      .update({ report_name: editName.trim() })
      .eq("id", reportId);

    if (error) {
      toast.error("Failed to update report");
      console.error(error);
    } else {
      toast.success("Report renamed");
      setReports(prev =>
        prev.map(r =>
          r.id === reportId ? { ...r, report_name: editName.trim() } : r
        )
      );
      setEditingId(null);
      setEditName("");
    }

    setSavingId(null);
  };

  const deleteReport = async (report: Report) => {
    setDeletingId(report.id);

    try {
      // Extract the file path from URL
      const url = new URL(report.report_url);
      const pathParts = url.pathname.split("/storage/v1/object/public/reports/");
      const filePath = pathParts[1] || "";

      // Delete from storage if we have a valid path
      if (filePath) {
        const { error: storageError } = await supabase.storage
          .from("reports")
          .remove([decodeURIComponent(filePath)]);

        if (storageError) {
          console.warn("Failed to delete file from storage:", storageError);
        }
      }

      // Delete from database
      const { error } = await supabase
        .from("reports")
        .delete()
        .eq("id", report.id);

      if (error) throw error;

      toast.success("Report deleted");
      setReports(prev => prev.filter(r => r.id !== report.id));
    } catch (err) {
      toast.error("Failed to delete report");
      console.error(err);
    }

    setDeletingId(null);
  };

  const getClientName = (connectionId: string) => {
    return connections.find(c => c.id === connectionId)?.client_name || "Unknown";
  };

  useEffect(() => {
    fetchReports();
  }, [selectedConnection]);

  return (
    <Card className="glass-panel">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Reports
        </CardTitle>
        <Select value={selectedConnection} onValueChange={setSelectedConnection}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by client" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clients</SelectItem>
            {connections.map((conn) => (
              <SelectItem key={conn.id} value={conn.id}>
                {conn.client_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
            Loading...
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No reports found</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Report Name</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell>
                    {editingId === report.id ? (
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="max-w-xs"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveReport(report.id);
                          if (e.key === "Escape") cancelEditing();
                        }}
                      />
                    ) : (
                      <span className="font-medium">{report.report_name}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {getClientName(report.client_connection_id)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(report.report_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {editingId === report.id ? (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => saveReport(report.id)}
                            disabled={savingId === report.id}
                          >
                            {savingId === report.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4 text-green-600" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={cancelEditing}
                          >
                            <X className="h-4 w-4 text-red-600" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEditing(report)}
                            title="Rename"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="destructive"
                                size="sm"
                                disabled={deletingId === report.id}
                              >
                                {deletingId === report.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Report?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete "{report.report_name}" and remove the file from storage. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteReport(report)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default ReportManager;
