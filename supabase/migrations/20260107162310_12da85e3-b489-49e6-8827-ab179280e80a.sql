-- Enable RLS on reports table
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Allow public read access to reports (for dashboard viewing)
CREATE POLICY "Allow public read of reports"
ON public.reports FOR SELECT
USING (true);

-- Allow public insert of reports (for admin uploads)
CREATE POLICY "Allow public insert of reports"
ON public.reports FOR INSERT
WITH CHECK (true);

-- Allow public delete of reports (for admin management)
CREATE POLICY "Allow public delete of reports"
ON public.reports FOR DELETE
USING (true);