-- Create kanban_workspaces table
CREATE TABLE public.kanban_workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  password TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create kanban_boards table
CREATE TABLE public.kanban_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.kanban_workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  password TEXT,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create kanban_columns table
CREATE TABLE public.kanban_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES public.kanban_boards(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER DEFAULT 0,
  webhook_url TEXT,
  webhook_trigger_mode TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create kanban_cards table
CREATE TABLE public.kanban_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  column_id UUID NOT NULL REFERENCES public.kanban_columns(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT,
  due_date DATE,
  position INTEGER DEFAULT 0,
  webhook_triggered BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create kanban_card_comments table
CREATE TABLE public.kanban_card_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES public.kanban_cards(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  author_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create kanban_card_attachments table
CREATE TABLE public.kanban_card_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES public.kanban_cards(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  uploaded_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create webhook_triggers table for tracking
CREATE TABLE public.webhook_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES public.kanban_cards(id) ON DELETE CASCADE,
  column_id UUID NOT NULL REFERENCES public.kanban_columns(id) ON DELETE CASCADE,
  triggered_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.kanban_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kanban_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kanban_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kanban_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kanban_card_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kanban_card_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_triggers ENABLE ROW LEVEL SECURITY;

-- RLS Policies (admin-only CRUD)
CREATE POLICY "Admins full access to workspaces" ON public.kanban_workspaces
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins full access to boards" ON public.kanban_boards
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins full access to columns" ON public.kanban_columns
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins full access to cards" ON public.kanban_cards
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins full access to comments" ON public.kanban_card_comments
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins full access to attachments" ON public.kanban_card_attachments
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins full access to webhook_triggers" ON public.webhook_triggers
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime for columns and cards
ALTER PUBLICATION supabase_realtime ADD TABLE public.kanban_columns;
ALTER PUBLICATION supabase_realtime ADD TABLE public.kanban_cards;

-- Create storage bucket for attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('kanban-attachments', 'kanban-attachments', false);

-- Storage policies for kanban-attachments bucket
CREATE POLICY "Admins can upload attachments" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'kanban-attachments' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view attachments" ON storage.objects
  FOR SELECT USING (bucket_id = 'kanban-attachments' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete attachments" ON storage.objects
  FOR DELETE USING (bucket_id = 'kanban-attachments' AND public.has_role(auth.uid(), 'admin'));