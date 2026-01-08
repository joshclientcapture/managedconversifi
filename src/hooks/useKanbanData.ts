import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Workspace {
  id: string;
  name: string;
  password: string | null;
  created_at: string;
}

export interface Board {
  id: string;
  workspace_id: string;
  name: string;
  password: string | null;
  position: number;
  created_at: string;
}

export interface Column {
  id: string;
  board_id: string;
  name: string;
  position: number;
  webhook_url: string | null;
  webhook_trigger_mode: string | null;
  created_at: string;
}

export interface Card {
  id: string;
  column_id: string;
  title: string;
  description: string | null;
  priority: string | null;
  due_date: string | null;
  position: number;
  webhook_triggered: boolean | null;
  created_at: string;
}

export const useKanbanData = () => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);

  // Fetch all workspaces
  const fetchWorkspaces = useCallback(async () => {
    const { data, error } = await (supabase as any)
      .from('kanban_workspaces')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching workspaces:', error);
      toast.error('Failed to load workspaces');
      return;
    }
    setWorkspaces((data as Workspace[]) || []);
  }, []);

  // Fetch boards for selected workspace
  const fetchBoards = useCallback(async (workspaceId: string) => {
    const { data, error } = await (supabase as any)
      .from('kanban_boards')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('position', { ascending: true });

    if (error) {
      console.error('Error fetching boards:', error);
      return;
    }
    setBoards((data as Board[]) || []);
  }, []);

  // Fetch columns for selected board
  const fetchColumns = useCallback(async (boardId: string) => {
    const { data, error } = await (supabase as any)
      .from('kanban_columns')
      .select('*')
      .eq('board_id', boardId)
      .order('position', { ascending: true });

    if (error) {
      console.error('Error fetching columns:', error);
      return;
    }
    setColumns((data as Column[]) || []);
  }, []);

  // Fetch cards for selected board (via columns)
  const fetchCards = useCallback(async (boardId: string) => {
    const { data: columnsData } = await (supabase as any)
      .from('kanban_columns')
      .select('id')
      .eq('board_id', boardId);

    if (!columnsData?.length) {
      setCards([]);
      return;
    }

    const columnIds = columnsData.map((c: any) => c.id);
    const { data, error } = await (supabase as any)
      .from('kanban_cards')
      .select('*')
      .in('column_id', columnIds)
      .order('position', { ascending: true });

    if (error) {
      console.error('Error fetching cards:', error);
      return;
    }
    setCards((data as Card[]) || []);
  }, []);

  // Initial load
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchWorkspaces();
      setLoading(false);
    };
    init();
  }, [fetchWorkspaces]);

  // Load boards when workspace changes
  useEffect(() => {
    if (selectedWorkspaceId) {
      fetchBoards(selectedWorkspaceId);
    } else {
      setBoards([]);
    }
  }, [selectedWorkspaceId, fetchBoards]);

  // Load columns and cards when board changes
  useEffect(() => {
    if (selectedBoardId) {
      fetchColumns(selectedBoardId);
      fetchCards(selectedBoardId);
    } else {
      setColumns([]);
      setCards([]);
    }
  }, [selectedBoardId, fetchColumns, fetchCards]);

  // Realtime subscriptions
  useEffect(() => {
    if (!selectedBoardId) return;

    const columnsChannel = supabase
      .channel('kanban-columns-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'kanban_columns',
        filter: `board_id=eq.${selectedBoardId}`
      }, () => {
        fetchColumns(selectedBoardId);
      })
      .subscribe();

    const cardsChannel = supabase
      .channel('kanban-cards-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'kanban_cards'
      }, () => {
        fetchCards(selectedBoardId);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(columnsChannel);
      supabase.removeChannel(cardsChannel);
    };
  }, [selectedBoardId, fetchColumns, fetchCards]);

  // CRUD operations
  const createWorkspace = async (name: string, password?: string) => {
    const { data, error } = await (supabase as any)
      .from('kanban_workspaces')
      .insert({ name, password: password || null })
      .select()
      .single();

    if (error) {
      toast.error('Failed to create workspace');
      throw error;
    }
    setWorkspaces(prev => [...prev, data as Workspace]);
    return data as Workspace;
  };

  const updateWorkspace = async (id: string, updates: Partial<Workspace>) => {
    const { error } = await (supabase as any)
      .from('kanban_workspaces')
      .update(updates)
      .eq('id', id);

    if (error) {
      toast.error('Failed to update workspace');
      throw error;
    }
    setWorkspaces(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w));
  };

  const deleteWorkspace = async (id: string) => {
    const { error } = await (supabase as any)
      .from('kanban_workspaces')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete workspace');
      throw error;
    }
    setWorkspaces(prev => prev.filter(w => w.id !== id));
    if (selectedWorkspaceId === id) {
      setSelectedWorkspaceId(null);
      setSelectedBoardId(null);
    }
  };

  const createBoard = async (workspaceId: string, name: string, password?: string) => {
    const maxPosition = boards.reduce((max, b) => Math.max(max, b.position), -1);
    const { data, error } = await (supabase as any)
      .from('kanban_boards')
      .insert({ workspace_id: workspaceId, name, password: password || null, position: maxPosition + 1 })
      .select()
      .single();

    if (error) {
      toast.error('Failed to create board');
      throw error;
    }
    setBoards(prev => [...prev, data as Board]);
    return data as Board;
  };

  const updateBoard = async (id: string, updates: Partial<Board>) => {
    const { error } = await (supabase as any)
      .from('kanban_boards')
      .update(updates)
      .eq('id', id);

    if (error) {
      toast.error('Failed to update board');
      throw error;
    }
    setBoards(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  const deleteBoard = async (id: string) => {
    const { error } = await (supabase as any)
      .from('kanban_boards')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete board');
      throw error;
    }
    setBoards(prev => prev.filter(b => b.id !== id));
    if (selectedBoardId === id) {
      setSelectedBoardId(null);
    }
  };

  const createColumn = async (boardId: string, name: string) => {
    const maxPosition = columns.reduce((max, c) => Math.max(max, c.position), -1);
    const { data, error } = await (supabase as any)
      .from('kanban_columns')
      .insert({ board_id: boardId, name, position: maxPosition + 1 })
      .select()
      .single();

    if (error) {
      toast.error('Failed to create column');
      throw error;
    }
    setColumns(prev => [...prev, data as Column]);
    return data as Column;
  };

  const updateColumn = async (id: string, updates: Partial<Column>) => {
    const { error } = await (supabase as any)
      .from('kanban_columns')
      .update(updates)
      .eq('id', id);

    if (error) {
      toast.error('Failed to update column');
      throw error;
    }
    setColumns(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const deleteColumn = async (id: string) => {
    const { error } = await (supabase as any)
      .from('kanban_columns')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete column');
      throw error;
    }
    setColumns(prev => prev.filter(c => c.id !== id));
  };

  const createCard = async (columnId: string, title: string, description?: string, priority?: string, dueDate?: string) => {
    const columnCards = cards.filter(c => c.column_id === columnId);
    const maxPosition = columnCards.reduce((max, c) => Math.max(max, c.position), -1);
    
    const { data, error } = await (supabase as any)
      .from('kanban_cards')
      .insert({
        column_id: columnId,
        title,
        description: description || null,
        priority: priority || null,
        due_date: dueDate || null,
        position: maxPosition + 1
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to create card');
      throw error;
    }
    setCards(prev => [...prev, data as Card]);

    // Check if column has webhook for new cards
    const column = columns.find(c => c.id === columnId);
    if (column?.webhook_url) {
      await triggerWebhook((data as Card).id, columnId);
    }

    return data as Card;
  };

  const updateCard = async (id: string, updates: Partial<Card>) => {
    const { error } = await (supabase as any)
      .from('kanban_cards')
      .update(updates)
      .eq('id', id);

    if (error) {
      toast.error('Failed to update card');
      throw error;
    }
    setCards(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const deleteCard = async (id: string) => {
    const { error } = await (supabase as any)
      .from('kanban_cards')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete card');
      throw error;
    }
    setCards(prev => prev.filter(c => c.id !== id));
  };

  const moveCard = async (cardId: string, targetColumnId: string, newPosition: number) => {
    const card = cards.find(c => c.id === cardId);
    if (!card) return;

    const sourceColumnId = card.column_id;
    const targetColumn = columns.find(c => c.id === targetColumnId);

    // Update card position and column
    const { error } = await (supabase as any)
      .from('kanban_cards')
      .update({ column_id: targetColumnId, position: newPosition })
      .eq('id', cardId);

    if (error) {
      toast.error('Failed to move card');
      return;
    }

    // Update local state
    setCards(prev => prev.map(c => 
      c.id === cardId 
        ? { ...c, column_id: targetColumnId, position: newPosition }
        : c
    ));

    // Trigger webhook if column changed and has webhook configured
    if (sourceColumnId !== targetColumnId && targetColumn?.webhook_url) {
      const shouldTrigger = targetColumn.webhook_trigger_mode === 'every_time' ||
        (targetColumn.webhook_trigger_mode === 'first_time_only' && !card.webhook_triggered);
      
      if (shouldTrigger) {
        await triggerWebhook(cardId, targetColumnId);
      }
    }
  };

  const triggerWebhook = async (cardId: string, columnId: string) => {
    try {
      await supabase.functions.invoke('trigger-webhook', {
        body: { cardId, columnId }
      });
      
      // Mark card as webhook triggered
      await (supabase as any)
        .from('kanban_cards')
        .update({ webhook_triggered: true })
        .eq('id', cardId);
      
      setCards(prev => prev.map(c => 
        c.id === cardId ? { ...c, webhook_triggered: true } : c
      ));
    } catch (error) {
      console.error('Error triggering webhook:', error);
    }
  };

  const reorderColumns = async (reorderedColumns: Column[]) => {
    const updates = reorderedColumns.map((col, index) => ({
      id: col.id,
      position: index
    }));

    for (const update of updates) {
      await (supabase as any)
        .from('kanban_columns')
        .update({ position: update.position })
        .eq('id', update.id);
    }

    setColumns(reorderedColumns.map((col, index) => ({ ...col, position: index })));
  };

  return {
    workspaces,
    boards,
    columns,
    cards,
    loading,
    selectedWorkspaceId,
    selectedBoardId,
    setSelectedWorkspaceId,
    setSelectedBoardId,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    createBoard,
    updateBoard,
    deleteBoard,
    createColumn,
    updateColumn,
    deleteColumn,
    createCard,
    updateCard,
    deleteCard,
    moveCard,
    reorderColumns,
    refetchBoards: () => selectedWorkspaceId && fetchBoards(selectedWorkspaceId),
    refetchColumns: () => selectedBoardId && fetchColumns(selectedBoardId),
    refetchCards: () => selectedBoardId && fetchCards(selectedBoardId)
  };
};
