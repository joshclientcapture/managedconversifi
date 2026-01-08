import { Column, Card, Board } from '@/hooks/useKanbanData';
import { KanbanColumn } from './KanbanColumn';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface KanbanBoardProps {
  board: Board | null;
  columns: Column[];
  cards: Card[];
  onAddColumn: () => void;
  onEditColumn: (column: Column) => void;
  onDeleteColumn: (column: Column) => void;
  onConfigureWebhook: (column: Column) => void;
  onAddCard: (columnId: string) => void;
  onCardClick: (card: Card) => void;
}

export const KanbanBoard = ({
  board,
  columns,
  cards,
  onAddColumn,
  onEditColumn,
  onDeleteColumn,
  onConfigureWebhook,
  onAddCard,
  onCardClick
}: KanbanBoardProps) => {
  if (!board) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <h3 className="text-lg font-medium mb-2">No Board Selected</h3>
          <p className="text-sm">Select a board from the sidebar to get started</p>
        </div>
      </div>
    );
  }

  const sortedColumns = [...columns].sort((a, b) => a.position - b.position);

  return (
    <div className="flex-1 overflow-hidden">
      <div className="h-full overflow-x-auto">
        <div className="flex gap-4 p-6 h-full min-w-max">
          {sortedColumns.map(column => (
            <KanbanColumn
              key={column.id}
              column={column}
              cards={cards.filter(c => c.column_id === column.id)}
              onAddCard={() => onAddCard(column.id)}
              onEditColumn={() => onEditColumn(column)}
              onDeleteColumn={() => onDeleteColumn(column)}
              onConfigureWebhook={() => onConfigureWebhook(column)}
              onCardClick={onCardClick}
            />
          ))}

          <div className="w-72 min-w-[18rem] flex-shrink-0">
            <Button
              variant="outline"
              onClick={onAddColumn}
              className="w-full h-12 border-dashed border-2 text-muted-foreground hover:text-foreground hover:border-primary/50"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Column
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
