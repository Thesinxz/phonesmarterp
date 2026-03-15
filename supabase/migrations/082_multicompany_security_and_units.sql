-- 1. Ensure units table exists and has critical columns (from 077/079 in case they failed)
CREATE TABLE IF NOT EXISTS public.units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  has_repair_lab BOOLEAN NOT NULL DEFAULT false,
  has_parts_stock BOOLEAN NOT NULL DEFAULT false,
  has_sales BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Add unit_id column to usuarios table
ALTER TABLE public.usuarios 
ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL;

-- 3. Ensure RLS is enabled on critical multi-company tables
ALTER TABLE public.usuario_vinculos_empresa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

-- 4. Create policies for usuario_vinculos_empresa
DROP POLICY IF EXISTS "Users can view their own company links" ON public.usuario_vinculos_empresa;
CREATE POLICY "Users can view their own company links"
ON public.usuario_vinculos_empresa
FOR SELECT
USING (auth_user_id = auth.uid());

-- 5. Create policies for usuarios (Profiles)
DROP POLICY IF EXISTS "Users can view their own profiles" ON public.usuarios;
CREATE POLICY "Users can view their own profiles"
ON public.usuarios
FOR SELECT
USING (auth_user_id = auth.uid());

-- 6. Updated provision_additional_company with unit support
CREATE OR REPLACE FUNCTION provision_additional_company(
  p_nome_empresa TEXT,
  p_subdominio TEXT,
  p_nome_usuario TEXT,
  p_email_usuario TEXT,
  p_auth_user_id UUID,
  p_cnpj TEXT DEFAULT NULL,
  p_emitente_json JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  empresa_id UUID,
  usuario_id UUID
) AS $$
DECLARE
  v_empresa_id UUID;
  v_usuario_id UUID;
  v_unit_id UUID;
BEGIN
  -- A. Criar a empresa
  INSERT INTO public.empresas (nome, subdominio, plano, cnpj)
  VALUES (p_nome_empresa, p_subdominio, 'starter', p_cnpj)
  RETURNING id INTO v_empresa_id;

  -- B. Criar uma UNIDADE padrão (Matriz)
  INSERT INTO public.units (empresa_id, name, has_repair_lab, has_parts_stock, has_sales)
  VALUES (v_empresa_id, 'Matriz', true, true, true)
  RETURNING id INTO v_unit_id;

  -- C. Criar o perfil de usuário vinculado (PAPEL ADMIN) com a unidade vinculada
  INSERT INTO public.usuarios (empresa_id, auth_user_id, nome, email, papel, ativo, unit_id)
  VALUES (v_empresa_id, p_auth_user_id, p_nome_usuario, p_email_usuario, 'admin', true, v_unit_id)
  RETURNING id INTO v_usuario_id;

  -- D. Criar o vínculo na tabela de multi-empresa
  INSERT INTO public.usuario_vinculos_empresa (usuario_id, empresa_id, papel, auth_user_id)
  VALUES (v_usuario_id, v_empresa_id, 'admin', p_auth_user_id);

  -- E. Se houver dados de emitente, salvar em configuracoes
  IF p_emitente_json IS NOT NULL AND p_emitente_json <> '{}'::jsonb THEN
      INSERT INTO public.configuracoes (empresa_id, chave, valor)
      VALUES (v_empresa_id, 'nfe_emitente', p_emitente_json);
  END IF;

  RETURN QUERY SELECT v_empresa_id, v_usuario_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 7. Sync and Cleanup
UPDATE public.usuario_vinculos_empresa uve
SET auth_user_id = u.auth_user_id
FROM public.usuarios u
WHERE uve.usuario_id = u.id
  AND uve.auth_user_id IS NULL;

-- Set a default unit for existing users who don't have one if units exist
UPDATE public.usuarios u
SET unit_id = (SELECT id FROM public.units WHERE empresa_id = u.empresa_id LIMIT 1)
WHERE unit_id IS NULL;
