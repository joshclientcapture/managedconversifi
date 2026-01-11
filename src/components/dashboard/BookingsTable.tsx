import { useState, useRef } from "react";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar, ExternalLink, Check, X, Loader2, MessageSquare, Phone, Mail, Archive, ArchiveRestore, ChevronDown, ChevronUp, Upload, FileText } from "lucide-react";
import { toast } from "sonner";

interface Booking {
  id: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  event_type_name: string | null;
  event_time: string | null;
  event_status: string | null;
  reschedule_url: string | null;
  cancel_url: string | null;
  showed_up: boolean | null;
  call_outcome: string | null;
  closer_notes: string | null;
  raw_payload: any;
  archived: boolean | null;
  conversation_pdf_url?: string | null;
}

interface BookingsTableProps {
  bookings: Booking[];
  accessToken: string;
  timezone: string;
  onUpdate: () => void;
}

const CALL_OUTCOMES = [
  { value: 'closed', label: 'Closed Deal' },
  { value: 'no_close', label: 'No Close' },
  { value: 'follow_up', label: 'Follow-up Required' },
  { value: 'no_answer', label: 'No Answer' },
  { value: 'not_qualified', label: 'Not Qualified' },
  { value: 'rescheduled', label: 'Rescheduled' },
];

const BookingsTable = ({ bookings, accessToken, timezone, onUpdate }: BookingsTableProps) => {
  const [updating, setUpdating] = useState<string | null>(null);
  const [notesDialog, setNotesDialog] = useState<{ booking: Booking; notes: string } | null>(null);
  const [savingNotes, setSavingNotes] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const [uploadingPdf, setUploadingPdf] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedBookingForUpload, setSelectedBookingForUpload] = useState<string | null>(null);

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      const zonedDate = toZonedTime(date, timezone);
      return format(zonedDate, 'MMM d, yyyy h:mm a');
    } catch {
      return dateStr;
    }
  };

  const isPast = (dateStr: string | null) => {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
  };

  const updateBooking = async (bookingId: string, data: Partial<Booking>) => {
    setUpdating(bookingId);
    try {
      const { error } = await supabase.functions.invoke('update-booking', {
        body: { booking_id: bookingId, access_token: accessToken, ...data }
      });

      if (error) throw error;
      toast.success('Booking updated');
      onUpdate();
    } catch (err) {
      toast.error('Failed to update booking');
      console.error(err);
    } finally {
      setUpdating(null);
    }
  };

  const saveNotes = async () => {
    if (!notesDialog) return;
    setSavingNotes(true);
    try {
      const { error } = await supabase.functions.invoke('update-booking', {
        body: { 
          booking_id: notesDialog.booking.id, 
          access_token: accessToken,
          closer_notes: notesDialog.notes
        }
      });

      if (error) throw error;
      toast.success('Notes saved');
      setNotesDialog(null);
      onUpdate();
    } catch (err) {
      toast.error('Failed to save notes');
      console.error(err);
    } finally {
    setSavingNotes(false);
    }
  };

  const handleUploadClick = (bookingId: string) => {
    setSelectedBookingForUpload(bookingId);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedBookingForUpload) return;

    if (file.type !== 'application/pdf') {
      toast.error('Only PDF files are allowed');
      return;
    }

    setUploadingPdf(selectedBookingForUpload);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('booking_id', selectedBookingForUpload);
      formData.append('access_token', accessToken);

      const { data, error } = await supabase.functions.invoke('upload-conversation-pdf', {
        body: formData
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      toast.success('Conversation PDF uploaded and notification sent');
      onUpdate();
    } catch (err) {
      toast.error('Failed to upload conversation PDF');
      console.error(err);
    } finally {
      setUploadingPdf(null);
      setSelectedBookingForUpload(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const getStatusBadge = (status: string | null, eventTime: string | null) => {
    // Show "Awaiting Feedback" for past scheduled meetings
    if (status === 'scheduled' && isPast(eventTime)) {
      return <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20">Awaiting Feedback</Badge>;
    }
    
    switch (status) {
      case 'scheduled':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Scheduled</Badge>;
      case 'completed':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Completed</Badge>;
      case 'canceled':
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Canceled</Badge>;
      case 'rescheduled':
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Rescheduled</Badge>;
      case 'archived':
        return <Badge className="bg-gray-500/10 text-gray-600 border-gray-500/20">Archived</Badge>;
      default:
        return <Badge variant="outline">{status || 'Unknown'}</Badge>;
    }
  };

  const getCustomQuestions = (booking: Booking) => {
    try {
      const questionsAndAnswers = booking.raw_payload?.payload?.questions_and_answers || [];
      // Filter out phone-related questions - only filter if specifically asking for phone
      return questionsAndAnswers.filter((q: { question: string; answer: string }) => {
        const question = q.question?.toLowerCase() || '';
        const isPhoneQuestion = (
          (question.includes('phone') && question.includes('number')) ||
          question.includes('mobile') ||
          question.includes('phone number')
        );
        return !isPhoneQuestion;
      });
    } catch {
      return [];
    }
  };

  const getMeetingLink = (booking: Booking) => {
    try {
      return booking.raw_payload?.payload?.scheduled_event?.location?.join_url || null;
    } catch {
      return null;
    }
  };

  const toggleQuestions = (bookingId: string) => {
    setExpandedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(bookingId)) {
        newSet.delete(bookingId);
      } else {
        newSet.add(bookingId);
      }
      return newSet;
    });
  };

  const filteredBookings = bookings.filter(booking => {
    // Always hide archived bookings unless explicitly showing them
    if (booking.archived && statusFilter !== 'archived') return false;

    if (statusFilter === 'all') return true;
    if (statusFilter === 'archived') return booking.archived === true;
    if (statusFilter === 'upcoming') return booking.event_status === 'scheduled' && !isPast(booking.event_time);
    if (statusFilter === 'past') return isPast(booking.event_time);
    return booking.event_status === statusFilter;
  });

  return (
    <>
      {/* Hidden file input for PDF upload */}
      <input
        type="file"
        ref={fileInputRef}
        accept="application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />
      <Card className="gradient-card shadow-card">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Bookings
              </CardTitle>
              <CardDescription>{bookings.length} total bookings</CardDescription>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Bookings</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="past">Past</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="canceled">Canceled</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredBookings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No bookings found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contact</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Attendance</TableHead>
                    <TableHead>Outcome</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBookings.map((booking) => {
                    const past = isPast(booking.event_time);
                    const isUpdating = updating === booking.id;

                    return (
                      <TableRow key={booking.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium">{booking.contact_name || 'Unknown'}</p>
                            {booking.contact_email && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {booking.contact_email}
                              </p>
                            )}
                            {booking.contact_phone && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {booking.contact_phone}
                              </p>
                            )}
                            {getCustomQuestions(booking).length > 0 && (
                              <div className="mt-2 pt-2 border-t border-border">
                                <button
                                  onClick={() => toggleQuestions(booking.id)}
                                  className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors mb-1 w-full"
                                >
                                  {expandedQuestions.has(booking.id) ? (
                                    <ChevronUp className="h-3 w-3 text-gray-400" />
                                  ) : (
                                    <ChevronDown className="h-3 w-3 text-gray-400" />
                                  )}
                                  <span>Custom Questions ({getCustomQuestions(booking).length})</span>
                                </button>
                                {expandedQuestions.has(booking.id) && (
                                  <div className="pl-4">
                                    {getCustomQuestions(booking).map((q: { question: string; answer: string }, idx: number) => (
                                      <div key={idx} className="text-xs text-muted-foreground mb-1">
                                        <span className="font-medium">{q.question}:</span> {q.answer}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {getMeetingLink(booking) ? (
                            <a
                              href={getMeetingLink(booking) || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline flex items-center gap-1"
                            >
                              {booking.event_type_name || 'N/A'}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            booking.event_type_name || 'N/A'
                          )}
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {formatTime(booking.event_time)}
                        </TableCell>
                        <TableCell>{getStatusBadge(booking.event_status, booking.event_time)}</TableCell>
                        <TableCell>
                          {past && booking.event_status !== 'canceled' ? (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant={booking.showed_up === true ? "default" : "outline"}
                                className="h-7 px-2"
                                disabled={isUpdating}
                                onClick={() => updateBooking(booking.id, { showed_up: true })}
                              >
                                {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                              </Button>
                              <Button
                                size="sm"
                                variant={booking.showed_up === false ? "destructive" : "outline"}
                                className="h-7 px-2"
                                disabled={isUpdating}
                                onClick={() => updateBooking(booking.id, { showed_up: false })}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {past && booking.event_status !== 'canceled' ? (
                            <Select
                              value={booking.call_outcome || ''}
                              onValueChange={(value) => updateBooking(booking.id, { call_outcome: value })}
                              disabled={isUpdating}
                            >
                              <SelectTrigger className="h-7 w-[120px] text-xs">
                                <SelectValue placeholder="Select..." />
                              </SelectTrigger>
                              <SelectContent>
                                {CALL_OUTCOMES.map((outcome) => (
                                  <SelectItem key={outcome.value} value={outcome.value}>
                                    {outcome.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {/* Conversation PDF Upload/View Button - always show for non-canceled bookings */}
                            {booking.event_status !== 'canceled' && (
                              booking.conversation_pdf_url ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2 text-primary"
                                  asChild
                                  title="View Conversation"
                                >
                                  <a href={booking.conversation_pdf_url} target="_blank" rel="noopener noreferrer">
                                    <FileText className="h-3 w-3 mr-1" />
                                    View
                                  </a>
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2"
                                  onClick={() => handleUploadClick(booking.id)}
                                  disabled={uploadingPdf === booking.id}
                                  title="Upload Conversation PDF"
                                >
                                  {uploadingPdf === booking.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <>
                                      <Upload className="h-3 w-3 mr-1" />
                                      Upload
                                    </>
                                  )}
                                </Button>
                              )
                            )}
                            {past && booking.event_status !== 'canceled' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2"
                                onClick={() => setNotesDialog({ booking, notes: booking.closer_notes || '' })}
                              >
                                <MessageSquare className="h-3 w-3" />
                              </Button>
                            )}
                            {!past && booking.reschedule_url && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 w-7 p-0"
                                asChild
                                title="Reschedule"
                              >
                                <a href={booking.reschedule_url} target="_blank" rel="noopener noreferrer">
                                  <Calendar className="h-3 w-3" />
                                </a>
                              </Button>
                            )}
                            {!past && booking.cancel_url && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                asChild
                                title="Cancel"
                              >
                                <a href={booking.cancel_url} target="_blank" rel="noopener noreferrer">
                                  <X className="h-3 w-3" />
                                </a>
                              </Button>
                            )}
                            {!booking.archived ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 w-7 p-0"
                                onClick={() => updateBooking(booking.id, { archived: true })}
                                disabled={isUpdating}
                                title="Archive"
                              >
                                <Archive className="h-3 w-3" />
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 w-7 p-0"
                                onClick={() => updateBooking(booking.id, { archived: false })}
                                disabled={isUpdating}
                                title="Unarchive"
                              >
                                <ArchiveRestore className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes Dialog */}
      <Dialog open={!!notesDialog} onOpenChange={() => setNotesDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Closer Notes</DialogTitle>
            <DialogDescription>
              Add notes about the call with {notesDialog?.booking.contact_name}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Enter your notes here..."
            value={notesDialog?.notes || ''}
            onChange={(e) => notesDialog && setNotesDialog({ ...notesDialog, notes: e.target.value })}
            rows={5}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotesDialog(null)}>Cancel</Button>
            <Button onClick={saveNotes} disabled={savingNotes}>
              {savingNotes ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Save Notes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BookingsTable;
