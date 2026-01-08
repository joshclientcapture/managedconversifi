import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Column, Card } from '@/hooks/useKanbanData';
import { KanbanCard } from './KanbanCard';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Plus, Pencil, Trash2, Webhook } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KanbanColumnProps {
  column: Column;
  cards: Card[];
  onAddCard: () => void;
  onEditColumn: () => void;
  onDeleteColumn: () => void;
  onConfigureWebhook: () => void;
  onCardClick: (card: Card) => void;
}

export const KanbanColumn = ({
  column,
  cards,
  onAddCard,
  onEditColumn,
  onDeleteColumn,
  onConfigureWebhook,
  onCardClick
}: KanbanColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  const sortedCards = [...cards].sort((a, b) => a.position - b.position);

  return (
    <div className="flex flex-col w-72 min-w-[18rem] flex-shrink-0">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm text-foreground">{column.name}</h3>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {cards.length}
          </span>
          {column.webhook_url && (
            <Webhook className="h-3 w-3 text-primary" />
          )}
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onAddCard}>
              <Plus className="h-4 w-4 mr-2" />
              Add Card
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onEditColumn}>
              <Pencil className="h-4 w-4 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onConfigureWebhook}>
              <Webhook className="h-4 w-4 mr-2" />
              Configure Webhook
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDeleteColumn} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 space-y-2 p-2 rounded-lg min-h-[200px] transition-colors",
          "bg-muted/30 border border-dashed border-border/50",
          isOver && "bg-primary/10 border-primary/30"
        )}
      >
        <SortableContext items={sortedCards.map(c => c.id)} strategy={verticalListSortingStrategy}>
          {sortedCards.map(card => (
            <KanbanCard 
              key={card.id} 
              card={card} 
              onClick={() => onCardClick(card)}
            />
          ))}
        </SortableContext>

        {cards.length === 0 && (
          <div className="flex items-center justify-center h-20 text-xs text-muted-foreground">
            Drop cards here
          </div>
        )}
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={onAddCard}
        className="mt-2 w-full justify-start text-muted-foreground hover:text-foreground"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Card
      </Button>
    </div>
  );
};
