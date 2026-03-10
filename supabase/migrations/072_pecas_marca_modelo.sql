-- Migration: Add marca and modelo columns to pecas_catalogo
-- Run this in Supabase SQL Editor

ALTER TABLE public.pecas_catalogo
  ADD COLUMN IF NOT EXISTS marca TEXT,
  ADD COLUMN IF NOT EXISTS modelo TEXT;

-- Index for faster lookups by marca
CREATE INDEX IF NOT EXISTS idx_pecas_catalogo_marca ON public.pecas_catalogo(marca);
