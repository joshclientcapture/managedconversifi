import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
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
import { toast } from "sonner";
import { Loader2, Eye, Trash2, Download, RefreshCw, FileText } from "lucide-react";
import { format } from "date-fns";
import type { Json } from "@/integrations/supabase/types";

interface OnboardingSubmission {
  id: string;
  first_name: string;
  last_name: string;
  company_name: string;
  email: string;
  phone: string;
  linkedin_url: string;
  website_url: string;
  industry: string;
  has_calendly: string;
  country: string;
  street_address: string;
  city_state: string;
  ideal_client: string | null;
  company_headcounts: Json | null;
  geography: string | null;
  industries: string | null;
  job_titles: string | null;
  problem_solved: string | null;
  service_description: string | null;
  success_stories: string | null;
  deal_size: string | null;
  sales_person: string | null;
  blacklist_urls: string | null;
  file_urls: Json | null;
  created_at: string;
}

const OnboardingList = () => {
  const [submissions, setSubmissions] = useState<OnboardingSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<OnboardingSubmission | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchSubmissions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("onboarding_submissions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch onboarding submissions");
      console.error(error);
    } else {
      setSubmissions(data || []);
    }
    setLoading(false);
  };

  const deleteSubmission = async (id: string) => {
    setDeletingId(id);
    const { error } = await supabase
      .from("onboarding_submissions")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete submission");
      console.error(error);
    } else {
      toast.success("Submission deleted");
      setSubmissions((prev) => prev.filter((s) => s.id !== id));
    }
    setDeletingId(null);
  };

  const downloadFile = async (filePath: string) => {
    const { data, error } = await supabase.storage
      .from("onboarding-files")
      .createSignedUrl(filePath, 60);

    if (error) {
      toast.error("Failed to get file URL");
      return;
    }

    window.open(data.signedUrl, "_blank");
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  return (
    <>
      <Card className="glass-panel">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Onboarding Submissions</CardTitle>
          <Button variant="outline" size="sm" onClick={fetchSubmissions} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              Loading...
            </div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No onboarding submissions yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Industry</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((submission) => (
                    <TableRow key={submission.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {submission.first_name} {submission.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground">{submission.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{submission.company_name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{submission.industry}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(submission.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedSubmission(submission)}
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="destructive"
                                size="sm"
                                disabled={deletingId === submission.id}
                              >
                                {deletingId === submission.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Submission?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete the onboarding submission for "{submission.company_name}".
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteSubmission(submission.id)}>
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

      {/* Detail Modal */}
      <Dialog open={!!selectedSubmission} onOpenChange={() => setSelectedSubmission(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedSubmission?.first_name} {selectedSubmission?.last_name} - {selectedSubmission?.company_name}
            </DialogTitle>
          </DialogHeader>
          {selectedSubmission && (
            <div className="space-y-6">
              {/* Contact Info Section */}
              <div className="rounded-lg border border-border p-4 space-y-4">
                <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Contact Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Email</p>
                    <p className="text-sm break-all">{selectedSubmission.email}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Phone</p>
                    <p className="text-sm">{selectedSubmission.phone}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">LinkedIn</p>
                    <a href={selectedSubmission.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline break-all">
                      {selectedSubmission.linkedin_url}
                    </a>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Website</p>
                    <a href={selectedSubmission.website_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline break-all">
                      {selectedSubmission.website_url}
                    </a>
                  </div>
                </div>
              </div>

              {/* Business Info Section */}
              <div className="rounded-lg border border-border p-4 space-y-4">
                <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Business Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Industry</p>
                    <p className="text-sm">{selectedSubmission.industry}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Calendly Account</p>
                    <Badge variant={selectedSubmission.has_calendly === "yes" ? "default" : "secondary"}>
                      {selectedSubmission.has_calendly === "yes" ? "Has Account" : "Will Create"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Deal Size</p>
                    <p className="text-sm">{selectedSubmission.deal_size || "Not specified"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Sales Person</p>
                    <p className="text-sm">{selectedSubmission.sales_person || "Not specified"}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Address</p>
                  <p className="text-sm">{selectedSubmission.street_address}</p>
                  <p className="text-sm">{selectedSubmission.city_state}, {selectedSubmission.country}</p>
                </div>
              </div>

              {/* Ideal Client Profile Section */}
              <div className="rounded-lg border border-border p-4 space-y-4">
                <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Ideal Client Profile</h3>
                
                {selectedSubmission.company_headcounts && Array.isArray(selectedSubmission.company_headcounts) && selectedSubmission.company_headcounts.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Target Company Sizes</p>
                    <div className="flex flex-wrap gap-2">
                      {(selectedSubmission.company_headcounts as string[]).map((size) => (
                        <Badge key={size} variant="outline">{size}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Target Geography</p>
                  <p className="text-sm">{selectedSubmission.geography || "Not specified"}</p>
                </div>

                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Target Industries</p>
                  <p className="text-sm">{selectedSubmission.industries || "Not specified"}</p>
                </div>

                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Target Job Titles</p>
                  <p className="text-sm">{selectedSubmission.job_titles || "Not specified"}</p>
                </div>

                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Ideal Client Description</p>
                  <div className="text-sm bg-muted/50 rounded-md p-3 whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                    {selectedSubmission.ideal_client || "Not specified"}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Problem Solved</p>
                  <div className="text-sm bg-muted/50 rounded-md p-3 whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                    {selectedSubmission.problem_solved || "Not specified"}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">How Their Service Works</p>
                  <div className="text-sm bg-muted/50 rounded-md p-3 whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                    {selectedSubmission.service_description || "Not specified"}
                  </div>
                </div>
              </div>

              {/* Success Stories Section */}
              <div className="rounded-lg border border-border p-4 space-y-4">
                <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Success Stories</h3>
                <div className="text-sm bg-muted/50 rounded-md p-3 whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                  {selectedSubmission.success_stories || "Not specified"}
                </div>
              </div>

              {/* Blacklist Section */}
              <div className="rounded-lg border border-border p-4 space-y-4">
                <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Blacklisted URLs</h3>
                <div className="text-sm font-mono bg-muted/50 rounded-md p-3 whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
                  {selectedSubmission.blacklist_urls || "None specified"}
                </div>
              </div>

              {/* Files Section */}
              {selectedSubmission.file_urls && Array.isArray(selectedSubmission.file_urls) && selectedSubmission.file_urls.length > 0 && (
                <div className="rounded-lg border border-border p-4 space-y-4">
                  <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Uploaded Files</h3>
                  <div className="space-y-2">
                    {(selectedSubmission.file_urls as string[]).map((filePath, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        className="w-full justify-start overflow-hidden"
                        onClick={() => downloadFile(filePath)}
                      >
                        <FileText className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span className="truncate">{filePath.split("/").pop()}</span>
                        <Download className="h-4 w-4 ml-auto flex-shrink-0" />
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Submitted Date */}
              <div className="text-xs text-muted-foreground text-center pt-2 border-t border-border">
                Submitted on {format(new Date(selectedSubmission.created_at), "MMMM d, yyyy 'at' h:mm a")}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default OnboardingList;
