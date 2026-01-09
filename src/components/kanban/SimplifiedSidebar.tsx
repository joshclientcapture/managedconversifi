import { useState } from 'react';
import { Workspace, Board } from '@/hooks/useKanbanData';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible';
import {
  Building2,
  ChevronRight,
  LayoutGrid,
  Lock,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SimplifiedSidebarProps {
  workspaces: Workspace[];
  boards: Board[];
  selectedWorkspaceId: string | null;
  selectedBoardId: string | null;
  onSelectWorkspace: (id: string) => void;
  onSelectBoard: (id: string) => void;
  onCreateWorkspace: () => void;
  onCreateBoard: (workspaceId: string) => void;
  onEditWorkspace: (workspace: Workspace) => void;
  onDeleteWorkspace: (workspace: Workspace) => void;
  onEditBoard: (board: Board) => void;
  onDeleteBoard: (board: Board) => void;
  isWorkspaceLocked: (workspace: Workspace) => boolean;
  isBoardLocked: (board: Board) => boolean;
  onUnlockWorkspace: (workspace: Workspace) => void;
  onUnlockBoard: (board: Board) => void;
}

export const SimplifiedSidebar = ({
  workspaces,
  boards,
  selectedWorkspaceId,
  selectedBoardId,
  onSelectWorkspace,
  onSelectBoard,
  onCreateWorkspace,
  onCreateBoard,
  onEditWorkspace,
  onDeleteWorkspace,
  onEditBoard,
  onDeleteBoard,
  isWorkspaceLocked,
  isBoardLocked,
  onUnlockWorkspace,
  onUnlockBoard
}: SimplifiedSidebarProps) => {
  const [openWorkspaces, setOpenWorkspaces] = useState<string[]>([]);

  const toggleWorkspace = (id: string) => {
    setOpenWorkspaces(prev =>
      prev.includes(id) ? prev.filter(w => w !== id) : [...prev, id]
    );
  };

  const handleWorkspaceClick = (workspace: Workspace) => {
    if (isWorkspaceLocked(workspace)) {
      onUnlockWorkspace(workspace);
      return;
    }
    onSelectWorkspace(workspace.id);
    if (!openWorkspaces.includes(workspace.id)) {
      toggleWorkspace(workspace.id);
    }
  };

  const handleBoardClick = (board: Board) => {
    if (isBoardLocked(board)) {
      onUnlockBoard(board);
      return;
    }
    onSelectBoard(board.id);
  };

  return (
    <div className="w-64 border-r border-border bg-card/50 flex flex-col overflow-hidden" style={{ height: 'calc(100vh - 64px)' }}>
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold text-lg">Task Board</h2>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-3 py-2">
          {workspaces.map(workspace => {
            const isOpen = openWorkspaces.includes(workspace.id);
            const isSelected = selectedWorkspaceId === workspace.id;
            const workspaceBoards = boards.filter(b => b.workspace_id === workspace.id);
            const locked = isWorkspaceLocked(workspace);

            return (
              <Collapsible
                key={workspace.id}
                open={isOpen && !locked}
                onOpenChange={() => !locked && toggleWorkspace(workspace.id)}
              >
                <div
                  className={cn(
                    "flex items-center gap-1 rounded-md mb-1 mx-1",
                    isSelected && "ring-2 ring-primary"
                  )}
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 hover:bg-accent/50"
                      disabled={locked}
                    >
                      <ChevronRight
                        className={cn(
                          "h-4 w-4 transition-transform",
                          isOpen && "rotate-90"
                        )}
                      />
                    </Button>
                  </CollapsibleTrigger>

                  <Button
                    variant="ghost"
                    className="flex-1 justify-start gap-2 h-8 px-2 hover:bg-accent/50"
                    onClick={() => handleWorkspaceClick(workspace)}
                  >
                    <Building2 className="h-4 w-4" />
                    <span className="truncate">{workspace.name}</span>
                    {locked && <Lock className="h-3 w-3 ml-auto" />}
                  </Button>

                  {!locked && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 hover:bg-accent/50">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onCreateBoard(workspace.id)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Board
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEditWorkspace(workspace)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onDeleteWorkspace(workspace)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                <CollapsibleContent>
                  <div className="ml-4 pl-2 border-l border-border/50 space-y-1">
                    {workspaceBoards.map(board => {
                      const boardLocked = isBoardLocked(board);

                      return (
                        <div
                          key={board.id}
                          className={cn(
                            "flex items-center gap-1 rounded-md mb-1 mr-1",
                            selectedBoardId === board.id && "ring-2 ring-primary"
                          )}
                        >
                          <Button
                            variant="ghost"
                            className="flex-1 justify-start gap-2 h-8 px-2 hover:bg-accent/50"
                            onClick={() => handleBoardClick(board)}
                          >
                            <LayoutGrid className="h-4 w-4" />
                            <span className="truncate">{board.name}</span>
                            {boardLocked && <Lock className="h-3 w-3 ml-auto" />}
                          </Button>

                          {!boardLocked && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 hover:bg-accent/50">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => onEditBoard(board)}>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Rename
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => onDeleteBoard(board)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      );
                    })}

                    {workspaceBoards.length === 0 && (
                      <p className="text-xs text-muted-foreground px-2 py-1">
                        No boards yet
                      </p>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}

          {workspaces.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No workspaces yet
            </p>
          )}
        </div>
      </ScrollArea>

      <div className="p-2 border-t border-border">
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={onCreateWorkspace}
        >
          <Plus className="h-4 w-4" />
          New Workspace
        </Button>
      </div>
    </div>
  );
};
