-- ============================================================
-- Migration 045: Fix Invite RLS Policies (Legacy Compatibility)
-- ============================================================

-- Remover as políticas antigas que dependiam da tabela multi-empresa
-- "usuario_vinculos_empresa", a qual pode não ter registros para contas antigas/novas simplificadas.

DROP POLICY IF EXISTS "Admins podem ver convites da empresa" ON public.equipe_convites;
CREATE POLICY "Admins podem ver convites da empresa" ON public.equipe_convites FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.usuarios
            WHERE auth_user_id = auth.uid()
            AND empresa_id = public.equipe_convites.empresa_id
            AND papel IN ('admin', 'gerente', 'dono')
        )
    );

DROP POLICY IF EXISTS "Admins podem criar convites" ON public.equipe_convites;
CREATE POLICY "Admins podem criar convites" ON public.equipe_convites FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.usuarios
            WHERE auth_user_id = auth.uid()
            AND empresa_id = public.equipe_convites.empresa_id
            AND papel IN ('admin', 'gerente', 'dono')
        )
    );

DROP POLICY IF EXISTS "Admins podem deletar convites" ON public.equipe_convites;
CREATE POLICY "Admins podem deletar convites" ON public.equipe_convites FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.usuarios
            WHERE auth_user_id = auth.uid()
            AND empresa_id = public.equipe_convites.empresa_id
            AND papel IN ('admin', 'gerente', 'dono')
        )
    );

-- Atualiza a tabela com o user_id real para garantir a Foreign Key
-- Note que o 'criado_por' refere a public.usuarios(id)
-- Portanto, garantiremos que ele está preenchido pelo Frontend ou ignorado caso nulo.
