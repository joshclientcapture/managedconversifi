-- Create reports table for storing bi-weekly PDF reports
CREATE TABLE public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_connection_id UUID NOT NULL REFERENCES public.client_connections(id) ON DELETE CASCADE,
  report_name TEXT NOT NULL,
  report_url TEXT NOT NULL,
  report_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create storage bucket for reports
INSERT INTO storage.buckets (id, name, public) VALUES ('reports', 'reports', true);

-- Allow public read access to reports
CREATE POLICY "Reports are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'reports');

-- Allow authenticated uploads to reports bucket (for admin)
CREATE POLICY "Anyone can upload reports"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'reports');

CREATE POLICY "Anyone can update reports"
ON storage.objects FOR UPDATE
USING (bucket_id = 'reports');

CREATE POLICY "Anyone can delete reports"
ON storage.objects FOR DELETE
USING (bucket_id = 'reports');