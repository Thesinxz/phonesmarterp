-- ============================================================
-- Migration 048: Fix RLS Permissions and FK Integrity
-- ============================================================

-- 1. CORREÇÃO DE RLS (usuarios)
-- Permite que Admin e Gerente possam editar membros da sua própria empresa.
DROP POLICY IF EXISTS "usuarios_update" ON public.usuarios;

CREATE POLICY "usuarios_update" ON public.usuarios
  FOR UPDATE USING (
    -- O próprio usuário pode se editar
    (SELECT auth.uid()) = auth_user_id 
    OR 
    -- Admins/Gerentes podem editar qualquer um do mesmo empresa_id
    EXISTS (
        SELECT 1 FROM public.usuarios admin_test
        WHERE admin_test.auth_user_id = auth.uid()
        AND admin_test.empresa_id = public.usuarios.empresa_id
        AND admin_test.papel IN ('admin', 'gerente')
    )
  );

-- 2. LIMPEZA DE ÓRFÃOS (Prep para FK)
-- Garante que não existam vínculos de usuários que não existem na tabela principal.
DELETE FROM public.usuario_vinculos_empresa
WHERE usuario_id NOT IN (SELECT id FROM public.usuarios);

-- 3. REPARO DE CONSTRAINT DE FK (usuario_vinculos_empresa)
-- Se a constraint estiver apontando para a tabela errada (ex: auth.users), corrigimos.
DO $$
BEGIN
    -- Removemos a constraint antiga se existir
    ALTER TABLE public.usuario_vinculos_empresa DROP CONSTRAINT IF EXISTS usuario_vinculos_empresa_usuario_id_fkey;
    
    -- Recriamos apontando para public.usuarios(id) explicitamente
    ALTER TABLE public.usuario_vinculos_empresa 
    ADD CONSTRAINT usuario_vinculos_empresa_usuario_id_fkey 
    FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;
END $$;

-- 4. Notificar PostgREST
NOTIFY pgrst, 'reload schema';
