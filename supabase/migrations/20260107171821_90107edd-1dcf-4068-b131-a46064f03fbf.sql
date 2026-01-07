-- Add UPDATE policy for reports table
CREATE POLICY "Allow public update of reports"
ON public.reports
FOR UPDATE
USING (true)
WITH CHECK (true);