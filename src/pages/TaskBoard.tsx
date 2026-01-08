import { useState } from 'react';
import { DndContext, DragEndEvent, DragOverEvent, PointerSensor, useSensor, useSensors, closestCorners } from '@dnd-kit/core';
import { useKanbanData, Workspace, Board, Column, Card } from '@/hooks/useKanbanData';
import { usePasswordStore } from '@/hooks/usePasswordStore';
import { SimplifiedSidebar } from '@/components/kanban/SimplifiedSidebar';
import { KanbanBoard } from '@/components/kanban/KanbanBoard';
import { CreateWorkspaceModal } from '@/components/kanban/CreateWorkspaceModal';
import { CreateBoardModal } from '@/components/kanban/CreateBoardModal';
import { CreateColumnModal } from '@/components/kanban/CreateColumnModal';
import { CreateCardModal } from '@/components/kanban/CreateCardModal';
import { RenameModal } from '@/components/kanban/RenameModal';
import { ConfirmDialog } from '@/components/kanban/ConfirmDialog';
import { PasswordModal } from '@/components/kanban/PasswordModal';
import { ColumnWebhookModal } from '@/components/kanban/ColumnWebhookModal';
import { CardDetailSheet } from '@/components/kanban/CardDetailSheet';
import Header from '@/components/Header';
import { Loader2 } from 'lucide-react';

const TaskBoard = () => {
  const kanban = useKanbanData();
  const passwordStore = usePasswordStore();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // Modal states
  const [createWorkspaceOpen, setCreateWorkspaceOpen] = useState(false);
  const [createBoardOpen, setCreateBoardOpen] = useState(false);
  const [createBoardWorkspaceId, setCreateBoardWorkspaceId] = useState<string | null>(null);
  const [createColumnOpen, setCreateColumnOpen] = useState(false);
  const [createCardOpen, setCreateCardOpen] = useState(false);
  const [createCardColumnId, setCreateCardColumnId] = useState<string | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameItem, setRenameItem] = useState<{ type: string; id: string; name: string } | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState<{ type: string; id: string; name: string } | null>(null);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordItem, setPasswordItem] = useState<{ type: string; item: Workspace | Board } | null>(null);
  const [webhookOpen, setWebhookOpen] = useState(false);
  const [webhookColumn, setWebhookColumn] = useState<Column | null>(null);
  const [cardDetailOpen, setCardDetailOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  const selectedWorkspace = kanban.workspaces.find(w => w.id === kanban.selectedWorkspaceId);
  const selectedBoard = kanban.boards.find(b => b.id === kanban.selectedBoardId);

  const isWorkspaceLocked = (workspace: Workspace) => !passwordStore.isWorkspaceUnlocked(workspace.id, workspace.password);
  const isBoardLocked = (board: Board) => !passwordStore.isBoardUnlocked(board.id, board.password);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const cardId = active.id as string;
    const targetColumnId = over.id as string;
    
    const card = kanban.cards.find(c => c.id === cardId);
    const targetColumn = kanban.columns.find(c => c.id === targetColumnId);
    
    if (card && targetColumn && card.column_id !== targetColumnId) {
      const targetCards = kanban.cards.filter(c => c.column_id === targetColumnId);
      await kanban.moveCard(cardId, targetColumnId, targetCards.length);
    }
  };

  if (kanban.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <div className="flex-1 flex overflow-hidden">
        <SimplifiedSidebar
          workspaces={kanban.workspaces}
          boards={kanban.boards}
          selectedWorkspaceId={kanban.selectedWorkspaceId}
          selectedBoardId={kanban.selectedBoardId}
          onSelectWorkspace={kanban.setSelectedWorkspaceId}
          onSelectBoard={kanban.setSelectedBoardId}
          onCreateWorkspace={() => setCreateWorkspaceOpen(true)}
          onCreateBoard={(workspaceId) => { setCreateBoardWorkspaceId(workspaceId); setCreateBoardOpen(true); }}
          onEditWorkspace={(w) => { setRenameItem({ type: 'workspace', id: w.id, name: w.name }); setRenameOpen(true); }}
          onDeleteWorkspace={(w) => { setDeleteItem({ type: 'workspace', id: w.id, name: w.name }); setDeleteOpen(true); }}
          onEditBoard={(b) => { setRenameItem({ type: 'board', id: b.id, name: b.name }); setRenameOpen(true); }}
          onDeleteBoard={(b) => { setDeleteItem({ type: 'board', id: b.id, name: b.name }); setDeleteOpen(true); }}
          isWorkspaceLocked={isWorkspaceLocked}
          isBoardLocked={isBoardLocked}
          onUnlockWorkspace={(w) => { setPasswordItem({ type: 'workspace', item: w }); setPasswordOpen(true); }}
          onUnlockBoard={(b) => { setPasswordItem({ type: 'board', item: b }); setPasswordOpen(true); }}
        />

        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
          <KanbanBoard
            board={selectedBoard || null}
            columns={kanban.columns}
            cards={kanban.cards}
            onAddColumn={() => setCreateColumnOpen(true)}
            onEditColumn={(c) => { setRenameItem({ type: 'column', id: c.id, name: c.name }); setRenameOpen(true); }}
            onDeleteColumn={(c) => { setDeleteItem({ type: 'column', id: c.id, name: c.name }); setDeleteOpen(true); }}
            onConfigureWebhook={(c) => { setWebhookColumn(c); setWebhookOpen(true); }}
            onAddCard={(columnId) => { setCreateCardColumnId(columnId); setCreateCardOpen(true); }}
            onCardClick={(card) => { setSelectedCard(card); setCardDetailOpen(true); }}
          />
        </DndContext>
      </div>

      {/* Modals */}
      <CreateWorkspaceModal open={createWorkspaceOpen} onOpenChange={setCreateWorkspaceOpen} onSubmit={kanban.createWorkspace} />
      <CreateBoardModal open={createBoardOpen} workspaceName={selectedWorkspace?.name} onOpenChange={setCreateBoardOpen} onSubmit={(name, pwd) => kanban.createBoard(createBoardWorkspaceId!, name, pwd)} />
      <CreateColumnModal open={createColumnOpen} onOpenChange={setCreateColumnOpen} onSubmit={(name) => kanban.createColumn(kanban.selectedBoardId!, name)} />
      <CreateCardModal open={createCardOpen} columnName={kanban.columns.find(c => c.id === createCardColumnId)?.name} onOpenChange={setCreateCardOpen} onSubmit={(title, desc, pri, due) => kanban.createCard(createCardColumnId!, title, desc, pri, due)} />
      
      <RenameModal
        open={renameOpen}
        title={`Rename ${renameItem?.type}`}
        currentName={renameItem?.name || ''}
        onOpenChange={setRenameOpen}
        onSubmit={async (name) => {
          if (!renameItem) return;
          if (renameItem.type === 'workspace') await kanban.updateWorkspace(renameItem.id, { name });
          else if (renameItem.type === 'board') await kanban.updateBoard(renameItem.id, { name });
          else if (renameItem.type === 'column') await kanban.updateColumn(renameItem.id, { name });
        }}
      />

      <ConfirmDialog
        open={deleteOpen}
        title={`Delete ${deleteItem?.type}?`}
        description={`Are you sure you want to delete "${deleteItem?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onOpenChange={setDeleteOpen}
        onConfirm={async () => {
          if (!deleteItem) return;
          if (deleteItem.type === 'workspace') await kanban.deleteWorkspace(deleteItem.id);
          else if (deleteItem.type === 'board') await kanban.deleteBoard(deleteItem.id);
          else if (deleteItem.type === 'column') await kanban.deleteColumn(deleteItem.id);
          setDeleteOpen(false);
        }}
      />

      <PasswordModal
        open={passwordOpen}
        title={`Unlock ${passwordItem?.type}`}
        onOpenChange={setPasswordOpen}
        onSubmit={(pwd) => {
          if (!passwordItem) return false;
          if (passwordItem.type === 'workspace') {
            const w = passwordItem.item as Workspace;
            if (w.password === pwd) { passwordStore.unlockWorkspace(w.id, pwd); kanban.setSelectedWorkspaceId(w.id); return true; }
          } else {
            const b = passwordItem.item as Board;
            if (b.password === pwd) { passwordStore.unlockBoard(b.id, pwd); kanban.setSelectedBoardId(b.id); return true; }
          }
          return false;
        }}
      />

      <ColumnWebhookModal open={webhookOpen} column={webhookColumn} onOpenChange={setWebhookOpen} onSubmit={(url, mode) => kanban.updateColumn(webhookColumn!.id, { webhook_url: url, webhook_trigger_mode: mode })} />
      
      <CardDetailSheet
        open={cardDetailOpen}
        card={selectedCard}
        onOpenChange={setCardDetailOpen}
        onUpdate={(updates) => kanban.updateCard(selectedCard!.id, updates)}
        onDelete={async () => { await kanban.deleteCard(selectedCard!.id); setCardDetailOpen(false); }}
      />
    </div>
  );
};

export default TaskBoard;
