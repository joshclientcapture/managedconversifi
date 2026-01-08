import { useState, useCallback } from 'react';

const STORAGE_KEY = 'kanban_passwords';

interface PasswordStore {
  workspaces: Record<string, string>;
  boards: Record<string, string>;
}

const getStoredPasswords = (): PasswordStore => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error reading password store:', e);
  }
  return { workspaces: {}, boards: {} };
};

const savePasswords = (store: PasswordStore) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
};

export const usePasswordStore = () => {
  const [store, setStore] = useState<PasswordStore>(getStoredPasswords);

  const isWorkspaceUnlocked = useCallback((workspaceId: string, password: string | null) => {
    if (!password) return true;
    return store.workspaces[workspaceId] === password;
  }, [store.workspaces]);

  const isBoardUnlocked = useCallback((boardId: string, password: string | null) => {
    if (!password) return true;
    return store.boards[boardId] === password;
  }, [store.boards]);

  const unlockWorkspace = useCallback((workspaceId: string, password: string) => {
    const newStore = {
      ...store,
      workspaces: { ...store.workspaces, [workspaceId]: password }
    };
    setStore(newStore);
    savePasswords(newStore);
  }, [store]);

  const unlockBoard = useCallback((boardId: string, password: string) => {
    const newStore = {
      ...store,
      boards: { ...store.boards, [boardId]: password }
    };
    setStore(newStore);
    savePasswords(newStore);
  }, [store]);

  const clearPasswords = useCallback(() => {
    const newStore = { workspaces: {}, boards: {} };
    setStore(newStore);
    savePasswords(newStore);
  }, []);

  return {
    isWorkspaceUnlocked,
    isBoardUnlocked,
    unlockWorkspace,
    unlockBoard,
    clearPasswords
  };
};
