-- Add service_description column to onboarding_submissions
ALTER TABLE public.onboarding_submissions
ADD COLUMN service_description text;