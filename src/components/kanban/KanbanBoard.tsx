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
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-6 py-3 border-b border-border">
        <h2 className="font-semibold text-lg">{board.name}</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={onAddColumn}
          className="gap-1"
        >
          <Plus className="h-4 w-4" />
          Add Column
        </Button>
      </div>
      <div className="flex-1 overflow-x-auto">
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

          {sortedColumns.length === 0 && (
            <div className="flex items-center justify-center w-full text-muted-foreground">
              <p className="text-sm">No columns yet. Click "Add Column" to get started.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
