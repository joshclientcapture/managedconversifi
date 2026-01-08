import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CardComment {
  id: string;
  card_id: string;
  author_name: string;
  content: string;
  created_at: string;
}

export const useCardComments = (cardId: string | null) => {
  const [comments, setComments] = useState<CardComment[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchComments = useCallback(async () => {
    if (!cardId) {
      setComments([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('kanban_card_comments')
        .select('*')
        .eq('card_id', cardId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments((data as CardComment[]) || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
      toast.error('Failed to load comments');
    } finally {
      setLoading(false);
    }
  }, [cardId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const addComment = useCallback(async (authorName: string, content: string) => {
    if (!cardId) return;

    try {
      const { data, error } = await (supabase as any)
        .from('kanban_card_comments')
        .insert({ card_id: cardId, author_name: authorName, content })
        .select()
        .single();

      if (error) throw error;
      setComments(prev => [...prev, data as CardComment]);
      toast.success('Comment added');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    }
  }, [cardId]);

  const deleteComment = useCallback(async (commentId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('kanban_card_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
      setComments(prev => prev.filter(c => c.id !== commentId));
      toast.success('Comment deleted');
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Failed to delete comment');
    }
  }, []);

  return { comments, loading, addComment, deleteComment, refetch: fetchComments };
};
