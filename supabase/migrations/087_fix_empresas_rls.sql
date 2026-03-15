-- ============================================================
-- Migration 087: Fix Empresas RLS for Multi-Company Discovery
-- ============================================================

-- A política anterior 'empresa_isolation' limitava a visibilidade
-- de empresas a apenas uma por vez (via get_my_empresa_id).
-- Isso impedia que o seletor de empresas listasse todas as opções.

-- 1. Remover política restritiva
DROP POLICY IF EXISTS "empresa_isolation" ON public.empresas;
DROP POLICY IF EXISTS "Permitir insert para novos usuarios" ON public.empresas;

-- 2. Criar nova política de SELECT que permite ver qualquer empresa onde o usuário tem um perfil
CREATE POLICY "allow_select_own_companies" ON public.empresas
  FOR SELECT
  USING (
    id IN (
      SELECT empresa_id 
      FROM public.usuarios 
      WHERE auth_user_id = auth.uid()
    )
  );

-- 3. Manter a política de INSERT necessária para novos cadastros
CREATE POLICY "allow_insert_for_signups" ON public.empresas
  FOR INSERT 
  WITH CHECK (true);

-- 4. Notificar PostgREST
NOTIFY pgrst, 'reload schema';
