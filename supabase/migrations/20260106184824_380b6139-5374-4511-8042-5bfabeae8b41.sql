-- Allow public delete of client_connections
CREATE POLICY "Allow public delete of client_connections"
ON public.client_connections
FOR DELETE
USING (true);