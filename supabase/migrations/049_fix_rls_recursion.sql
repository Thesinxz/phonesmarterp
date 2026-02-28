-- ============================================================
-- Migration 049: Fix RLS Recursion in Usuarios Table
-- ============================================================

-- 1. Criar função SECURITY DEFINER para checar papel de admin
-- Isso interrompe a recursão porque a função não aplica RLS ao consultar 'usuarios' internamente.
CREATE OR REPLACE FUNCTION public.pode_gerenciar_equipe(p_empresa_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.usuarios 
    WHERE auth_user_id = auth.uid() 
    AND empresa_id = p_empresa_id
    AND papel IN ('admin', 'gerente')
    AND ativo = true
  );
END;
$$;

-- 2. Atualizar a Política de Update da tabela usuarios
DROP POLICY IF EXISTS "usuarios_update" ON public.usuarios;

CREATE POLICY "usuarios_update" ON public.usuarios
  FOR UPDATE USING (
    -- O próprio usuário pode se editar
    (SELECT auth.uid()) = auth_user_id 
    OR 
    -- Admins/Gerentes da mesma empresa podem editar outros (via função segura)
    public.pode_gerenciar_equipe(empresa_id)
  );

-- 3. Notificar PostgREST
NOTIFY pgrst, 'reload schema';
