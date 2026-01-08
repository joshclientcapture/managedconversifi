import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/hooks/useKanbanData';
import { Badge } from '@/components/ui/badge';
import { Calendar, MessageSquare, Paperclip } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import { cn } from '@/lib/utils';

interface KanbanCardProps {
  card: Card;
  commentCount?: number;
  attachmentCount?: number;
  onClick?: () => void;
}

const priorityColors: Record<string, string> = {
  urgent: 'bg-red-500/20 text-red-400 border-red-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low: 'bg-green-500/20 text-green-400 border-green-500/30'
};

export const KanbanCard = ({ card, commentCount = 0, attachmentCount = 0, onClick }: KanbanCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  const dueDate = card.due_date ? new Date(card.due_date) : null;
  const isOverdue = dueDate && isPast(dueDate) && !isToday(dueDate);
  const isDueToday = dueDate && isToday(dueDate);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        "glass-panel p-3 rounded-lg cursor-grab active:cursor-grabbing",
        "border border-border/50 hover:border-primary/30 transition-all",
        "bg-card/80 backdrop-blur-sm shadow-sm hover:shadow-md",
        isDragging && "shadow-lg ring-2 ring-primary/50"
      )}
    >
      <h4 className="font-medium text-sm text-foreground mb-2 line-clamp-2">
        {card.title}
      </h4>

      {card.description && (
        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
          {card.description}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 mt-2">
        {card.priority && (
          <Badge 
            variant="outline" 
            className={cn("text-xs capitalize", priorityColors[card.priority])}
          >
            {card.priority}
          </Badge>
        )}

        {dueDate && (
          <Badge
            variant="outline"
            className={cn(
              "text-xs flex items-center gap-1",
              isOverdue && "bg-red-500/20 text-red-400 border-red-500/30",
              isDueToday && "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
              !isOverdue && !isDueToday && "bg-muted text-muted-foreground"
            )}
          >
            <Calendar className="h-3 w-3" />
            {format(dueDate, 'MMM d')}
          </Badge>
        )}

        <div className="flex-1" />

        {commentCount > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MessageSquare className="h-3 w-3" />
            {commentCount}
          </div>
        )}

        {attachmentCount > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Paperclip className="h-3 w-3" />
            {attachmentCount}
          </div>
        )}
      </div>
    </div>
  );
};
