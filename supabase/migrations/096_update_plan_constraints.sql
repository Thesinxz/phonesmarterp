-- Update check constraints for plans to match UI
ALTER TABLE public.empresas DROP CONSTRAINT IF EXISTS empresas_plano_check;
ALTER TABLE public.empresas ADD CONSTRAINT empresas_plano_check CHECK (plano IN ('starter', 'essencial', 'pro', 'enterprise', 'profissional'));

ALTER TABLE public.usuarios DROP CONSTRAINT IF EXISTS usuarios_plano_check;
ALTER TABLE public.usuarios ADD CONSTRAINT usuarios_plano_check CHECK (plano IN ('starter', 'essencial', 'pro', 'enterprise', 'profissional'));
