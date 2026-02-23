-- ============================================================
-- Migration 031: Fix User Deletion (Cascade and Set Null)
-- ============================================================

-- 1. Redefinir a ligação entre auth.users e usuarios para CASCADE
ALTER TABLE usuarios 
  DROP CONSTRAINT IF EXISTS usuarios_auth_user_id_fkey,
  ADD CONSTRAINT usuarios_auth_user_id_fkey 
    FOREIGN KEY (auth_user_id) 
    REFERENCES auth.users(id) 
    ON DELETE CASCADE;

-- 2. Redefinir a ligação entre usuarios e tecnicos para CASCADE
-- Se um usuário é deletado, o registro dele como técnico também deve sumir.
ALTER TABLE tecnicos
  DROP CONSTRAINT IF EXISTS tecnicos_usuario_id_fkey,
  ADD CONSTRAINT tecnicos_usuario_id_fkey
    FOREIGN KEY (usuario_id)
    REFERENCES usuarios(id)
    ON DELETE CASCADE;

-- 3. Redefinir a ligação em ordens_servico para SET NULL
-- Mantemos a OS mesmo se o técnico for deletado.
ALTER TABLE ordens_servico
  DROP CONSTRAINT IF EXISTS ordens_servico_tecnico_id_fkey,
  ADD CONSTRAINT ordens_servico_tecnico_id_fkey
    FOREIGN KEY (tecnico_id)
    REFERENCES usuarios(id)
    ON DELETE SET NULL;

-- 4. Redefinir a ligação em os_timeline para SET NULL
-- A linha do tempo da OS não pode impedir a deleção de um usuário.
ALTER TABLE os_timeline
  ALTER COLUMN usuario_id DROP NOT NULL,
  DROP CONSTRAINT IF EXISTS os_timeline_usuario_id_fkey,
  ADD CONSTRAINT os_timeline_usuario_id_fkey
    FOREIGN KEY (usuario_id)
    REFERENCES usuarios(id)
    ON DELETE SET NULL;

-- 5. Redefinir a ligação em audit_logs para SET NULL
-- Logs de auditoria devem ser mantidos, mas o usuario_id vira NULL se deletado.
ALTER TABLE audit_logs
  ALTER COLUMN usuario_id DROP NOT NULL,
  DROP CONSTRAINT IF EXISTS audit_logs_usuario_id_fkey,
  ADD CONSTRAINT audit_logs_usuario_id_fkey
    FOREIGN KEY (usuario_id)
    REFERENCES usuarios(id)
    ON DELETE SET NULL;
