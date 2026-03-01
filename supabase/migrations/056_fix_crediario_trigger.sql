-- Adicionando 'parcial' aos status da parcela
-- O Supabase / Postgres precisa de ALTER TABLE se fosse enum, mas como é texto com CHECK constraint, 
-- precisamos dropar a constraint e criar novamente.

ALTER TABLE crediario_parcelas DROP CONSTRAINT IF EXISTS crediario_parcelas_status_check;
ALTER TABLE crediario_parcelas ADD CONSTRAINT crediario_parcelas_status_check 
CHECK (status IN ('pendente', 'pago', 'parcial', 'atrasado', 'cancelado'));

-- Adicionar campo_extra para registrar o histórico de "valor já pago" se for parcial, 
-- O melhor approach sem mexer estruturalmente é simplesmente criar a nova parcela, MAS ajustar a Trigger
-- para que ela conte as pagas comparando a SOMA dos pagamentos com o VALOR TOTAL do crediário, 
-- ou então apenas ignorando o COUNT se for contar parcelas excedentes.

-- Abordagem com a Trigger:
-- O jeito mais à prova de falhas: O Crediário está quitado se e somente se:
-- Não houver NENHUMA parcela 'pendente', 'parcial' ou 'atrasado'.
-- (Ou seja, todas as parcelas ativas pertencentes ao crediário estão 'pago' ou 'cancelado').

CREATE OR REPLACE FUNCTION update_crediario_status()
RETURNS TRIGGER AS $$
DECLARE
  v_pendentes INTEGER;
  v_atrasadas INTEGER;
BEGIN
  -- Conta apenas as não pagas/canceladas
  SELECT COUNT(*) FILTER (WHERE status IN ('pendente', 'parcial')),
         COUNT(*) FILTER (WHERE status = 'atrasado')
  INTO v_pendentes, v_atrasadas
  FROM crediario_parcelas
  WHERE crediario_id = NEW.crediario_id;

  IF v_atrasadas > 0 THEN
    UPDATE crediarios SET status = 'inadimplente', updated_at = NOW()
    WHERE id = NEW.crediario_id;
  ELSIF v_pendentes > 0 THEN
    UPDATE crediarios SET status = 'ativo', updated_at = NOW()
    WHERE id = NEW.crediario_id;
  ELSE
    -- Se não há atrasadas, nem pendentes, nem parciais, então estão todas pagas ou canceladas
    UPDATE crediarios SET status = 'quitado', updated_at = NOW()
    WHERE id = NEW.crediario_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
