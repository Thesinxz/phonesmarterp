-- ============================================================
-- Migration 040: Break RLS Recursion & Final Function Fixes
-- ============================================================

-- 1. RE-ESTRUTURAR get_my_empresa_id() COM SECURITY DEFINER
-- O erro de "hanging" (travamento) no INSERT de usuários ocorre porque as políticas 
-- de RLS entram em recursão infinita: 
-- USUARIOS (Policy) -> get_my_empresa_id() -> SELECT USUARIOS (Triggering Policy) -> Loop.
-- Usar SECURITY DEFINER interrompe a recursão pois a função executa como dono do banco.

CREATE OR REPLACE FUNCTION public.get_my_empresa_id()
RETURNS UUID 
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN (SELECT empresa_id FROM public.usuarios WHERE auth_user_id = auth.uid() LIMIT 1);
END;
$$;

-- 2. GARANTIR QUE vincular_usuario_equipe TAMBÉM SEJA SEGURO
CREATE OR REPLACE FUNCTION public.vincular_usuario_equipe(
  p_id_empresa UUID,
  p_email TEXT,
  p_nome TEXT,
  p_papel TEXT,
  p_permissoes JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usuario_id UUID;
BEGIN
  -- 1. Verificar se usuário já está na equipe (usando a tabela multi-empresa)
  IF EXISTS (
    SELECT 1 FROM public.usuario_vinculos_empresa ev
    JOIN public.usuarios u ON ev.usuario_id = u.id
    WHERE ev.empresa_id = p_id_empresa AND u.email = p_email
  ) THEN
    RAISE EXCEPTION 'Usuário já está vinculado a esta equipe.';
  END IF;

  -- 2. Buscar ou criar o registro base do usuário
  SELECT id INTO v_usuario_id FROM public.usuarios WHERE email = p_email LIMIT 1;

  IF v_usuario_id IS NULL THEN
    INSERT INTO public.usuarios (empresa_id, email, nome, papel, permissoes_json, ativo)
    VALUES (p_id_empresa, p_email, p_nome, p_papel, COALESCE(p_permissoes, '{}'::jsonb), true)
    RETURNING id INTO v_usuario_id;
  END IF;

  -- 3. Criar o vínculo na tabela multi-empresa
  INSERT INTO public.usuario_vinculos_empresa (usuario_id, empresa_id, papel, permissoes_custom_json)
  VALUES (v_usuario_id, p_id_empresa, p_papel, COALESCE(p_permissoes, '{}'::jsonb))
  ON CONFLICT DO NOTHING;

  RETURN v_usuario_id;
END;
$$;

-- 3. NOTIFY PostgREST
NOTIFY pgrst, 'reload schema';
