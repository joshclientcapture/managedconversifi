import { useState } from "react";
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
import { Calendar, ExternalLink, Check, X, Loader2, MessageSquare, Phone, Mail } from "lucide-react";
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

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'scheduled':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Scheduled</Badge>;
      case 'completed':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Completed</Badge>;
      case 'canceled':
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Canceled</Badge>;
      case 'rescheduled':
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Rescheduled</Badge>;
      default:
        return <Badge variant="outline">{status || 'Unknown'}</Badge>;
    }
  };

  const filteredBookings = bookings.filter(booking => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'upcoming') return booking.event_status === 'scheduled' && !isPast(booking.event_time);
    if (statusFilter === 'past') return isPast(booking.event_time);
    return booking.event_status === statusFilter;
  });

  return (
    <>
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
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{booking.event_type_name || 'N/A'}</TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {formatTime(booking.event_time)}
                        </TableCell>
                        <TableCell>{getStatusBadge(booking.event_status)}</TableCell>
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
                                className="h-7 px-2"
                                asChild
                              >
                                <a href={booking.reschedule_url} target="_blank" rel="noopener noreferrer">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  Reschedule
                                </a>
                              </Button>
                            )}
                            {!past && booking.cancel_url && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-destructive hover:text-destructive"
                                asChild
                              >
                                <a href={booking.cancel_url} target="_blank" rel="noopener noreferrer">
                                  <X className="h-3 w-3 mr-1" />
                                  Cancel
                                </a>
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
