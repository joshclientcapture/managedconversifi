-- Create onboarding_submissions table
CREATE TABLE public.onboarding_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  company_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  linkedin_url TEXT NOT NULL,
  website_url TEXT NOT NULL,
  industry TEXT NOT NULL,
  has_calendly TEXT NOT NULL,
  country TEXT NOT NULL,
  street_address TEXT NOT NULL,
  city_state TEXT NOT NULL,
  ideal_client TEXT,
  company_headcounts JSONB,
  geography TEXT,
  industries TEXT,
  job_titles TEXT,
  problem_solved TEXT,
  success_stories TEXT,
  deal_size TEXT,
  sales_person TEXT,
  blacklist_urls TEXT,
  file_urls JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.onboarding_submissions ENABLE ROW LEVEL SECURITY;

-- Only authenticated admins can read
CREATE POLICY "Admins can read onboarding submissions"
ON public.onboarding_submissions
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Public can insert (for the onboarding form)
CREATE POLICY "Public can insert onboarding submissions"
ON public.onboarding_submissions
FOR INSERT
WITH CHECK (true);

-- Admins can delete
CREATE POLICY "Admins can delete onboarding submissions"
ON public.onboarding_submissions
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_onboarding_submissions_updated_at
BEFORE UPDATE ON public.onboarding_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for onboarding files
INSERT INTO storage.buckets (id, name, public) VALUES ('onboarding-files', 'onboarding-files', false);

-- Storage policies - public can upload
CREATE POLICY "Anyone can upload onboarding files"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'onboarding-files');

-- Only authenticated admins can read
CREATE POLICY "Admins can read onboarding files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'onboarding-files' AND public.has_role(auth.uid(), 'admin'));