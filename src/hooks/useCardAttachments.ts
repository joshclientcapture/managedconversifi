import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CardAttachment {
  id: string;
  card_id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
}

export const useCardAttachments = (cardId: string | null) => {
  const [attachments, setAttachments] = useState<CardAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchAttachments = useCallback(async () => {
    if (!cardId) {
      setAttachments([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('kanban_card_attachments')
        .select('*')
        .eq('card_id', cardId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAttachments((data as CardAttachment[]) || []);
    } catch (error) {
      console.error('Error fetching attachments:', error);
      toast.error('Failed to load attachments');
    } finally {
      setLoading(false);
    }
  }, [cardId]);

  useEffect(() => {
    fetchAttachments();
  }, [fetchAttachments]);

  const uploadAttachment = useCallback(async (file: File) => {
    if (!cardId) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${cardId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('kanban-attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('kanban-attachments')
        .getPublicUrl(filePath);

      const { data, error } = await (supabase as any)
        .from('kanban_card_attachments')
        .insert({
          card_id: cardId,
          file_name: file.name,
          file_url: publicUrl,
          file_type: file.type,
          file_size: file.size
        })
        .select()
        .single();

      if (error) throw error;
      setAttachments(prev => [data as CardAttachment, ...prev]);
      toast.success('File uploaded');
    } catch (error) {
      console.error('Error uploading attachment:', error);
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
    }
  }, [cardId]);

  const deleteAttachment = useCallback(async (attachmentId: string, fileUrl: string) => {
    try {
      // Extract path from URL
      const urlParts = fileUrl.split('/kanban-attachments/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage.from('kanban-attachments').remove([filePath]);
      }

      const { error } = await (supabase as any)
        .from('kanban_card_attachments')
        .delete()
        .eq('id', attachmentId);

      if (error) throw error;
      setAttachments(prev => prev.filter(a => a.id !== attachmentId));
      toast.success('Attachment deleted');
    } catch (error) {
      console.error('Error deleting attachment:', error);
      toast.error('Failed to delete attachment');
    }
  }, []);

  return { attachments, loading, uploading, uploadAttachment, deleteAttachment, refetch: fetchAttachments };
};
