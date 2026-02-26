-- ============================================================
-- Migration 032: Vincular Usuario Equipe
-- ============================================================

CREATE OR REPLACE FUNCTION vincular_usuario_equipe(
  p_id_empresa UUID,
  p_email TEXT,
  p_nome TEXT,
  p_papel TEXT,
  p_permissoes JSONB
)
RETURNS UUID AS $$
DECLARE
  v_usuario_id UUID;
  v_exists BOOLEAN;
BEGIN
  -- Verificar se já existe vínculo
  SELECT EXISTS (
    SELECT 1 FROM empresa_vinculos ev
    JOIN usuarios u ON ev.usuario_id = u.id
    WHERE ev.empresa_id = p_id_empresa AND u.email = p_email
  ) INTO v_exists;

  IF v_exists THEN
    RAISE EXCEPTION 'Usuário já está vinculado a esta equipe.';
  END IF;

  -- Buscar usuário existente por email
  SELECT id INTO v_usuario_id FROM usuarios WHERE email = p_email LIMIT 1;

  -- Se não existir, criar usuário placeholder (auth_user_id nulo)
  IF v_usuario_id IS NULL THEN
    INSERT INTO usuarios (
      empresa_id,
      email,
      nome,
      papel,
      permissoes_json,
      ativo
    )
    VALUES (
      p_id_empresa,
      p_email,
      p_nome,
      p_papel,
      p_permissoes,
      true
    )
    RETURNING id INTO v_usuario_id;
  END IF;

  -- Criar o vínculo
  INSERT INTO empresa_vinculos (
    usuario_id,
    empresa_id,
    papel,
    permissoes
  )
  VALUES (
    v_usuario_id,
    p_id_empresa,
    p_papel,
    p_permissoes
  );

  RETURN v_usuario_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
