import { useState, useEffect, useRef } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Card } from '@/hooks/useKanbanData';
import { useCardComments } from '@/hooks/useCardComments';
import { useCardAttachments } from '@/hooks/useCardAttachments';
import {
  Calendar,
  Paperclip,
  MessageSquare,
  Send,
  Trash2,
  Upload,
  FileIcon,
  Loader2,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface CardDetailSheetProps {
  open: boolean;
  card: Card | null;
  onOpenChange: (open: boolean) => void;
  onUpdate: (updates: Partial<Card>) => Promise<void>;
  onDelete: () => Promise<void>;
}

const priorityColors: Record<string, string> = {
  urgent: 'bg-red-500/20 text-red-400 border-red-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low: 'bg-green-500/20 text-green-400 border-green-500/30'
};

export const CardDetailSheet = ({ open, card, onOpenChange, onUpdate, onDelete }: CardDetailSheetProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<string>('');
  const [dueDate, setDueDate] = useState('');
  const [newComment, setNewComment] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { comments, loading: commentsLoading, addComment, deleteComment } = useCardComments(card?.id || null);
  const { attachments, loading: attachmentsLoading, uploading, uploadAttachment, deleteAttachment } = useCardAttachments(card?.id || null);

  useEffect(() => {
    if (card) {
      setTitle(card.title);
      setDescription(card.description || '');
      setPriority(card.priority || '');
      setDueDate(card.due_date ? card.due_date.split('T')[0] : '');
    }
  }, [card]);

  const handleSave = async () => {
    if (!card) return;
    setSaving(true);
    try {
      await onUpdate({
        title: title.trim(),
        description: description.trim() || null,
        priority: priority || null,
        due_date: dueDate || null
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !authorName.trim()) return;
    await addComment(authorName.trim(), newComment.trim());
    setNewComment('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadAttachment(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!card) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-hidden flex flex-col">
        <SheetHeader>
          <SheetTitle>Card Details</SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 pb-6">
            {/* Title */}
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Card title"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description..."
                rows={4}
              />
            </div>

            {/* Priority & Due Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>

            {/* Save Button */}
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>

            <Separator />

            {/* Attachments */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Paperclip className="h-4 w-4" />
                  Attachments ({attachments.length})
                </Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>

              {attachmentsLoading ? (
                <div className="text-sm text-muted-foreground">Loading...</div>
              ) : attachments.length > 0 ? (
                <div className="space-y-2">
                  {attachments.map(attachment => (
                    <div
                      key={attachment.id}
                      className="flex items-center gap-2 p-2 rounded-md bg-muted/50"
                    >
                      <FileIcon className="h-4 w-4 flex-shrink-0" />
                      <a
                        href={attachment.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm truncate flex-1 hover:underline"
                      >
                        {attachment.file_name}
                      </a>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => deleteAttachment(attachment.id, attachment.file_url)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No attachments</p>
              )}
            </div>

            <Separator />

            {/* Comments */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Comments ({comments.length})
              </Label>

              {/* Add Comment */}
              <div className="space-y-2">
                <Input
                  placeholder="Your name"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                />
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAddComment();
                      }
                    }}
                  />
                  <Button
                    size="icon"
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || !authorName.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {commentsLoading ? (
                <div className="text-sm text-muted-foreground">Loading...</div>
              ) : comments.length > 0 ? (
                <div className="space-y-3">
                  {comments.map(comment => (
                    <div key={comment.id} className="p-3 rounded-md bg-muted/50">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-medium text-sm">{comment.author_name}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {format(new Date(comment.created_at), 'MMM d, h:mm a')}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => deleteComment(comment.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-sm mt-1">{comment.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No comments yet</p>
              )}
            </div>

            <Separator />

            {/* Delete Card */}
            <Button
              variant="destructive"
              onClick={onDelete}
              className="w-full"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Card
            </Button>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
