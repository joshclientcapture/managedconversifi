-- Add conversation PDF URL column to bookings table
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS conversation_pdf_url TEXT;