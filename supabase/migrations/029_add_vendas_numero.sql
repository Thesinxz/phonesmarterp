-- Migration: Add sequential number to Vendas

-- Create the sequence
CREATE SEQUENCE IF NOT EXISTS vendas_numero_seq START 1;

-- Add the column with the sequence as default
ALTER TABLE public.vendas 
ADD COLUMN IF NOT EXISTS numero INTEGER NOT NULL DEFAULT nextval('vendas_numero_seq');

-- Create an index to speed up searches by sale number
CREATE INDEX IF NOT EXISTS idx_vendas_numero ON public.vendas(empresa_id, numero);
