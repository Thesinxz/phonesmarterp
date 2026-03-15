-- Corrigir papel do dono em todas as suas empresas
-- Usuário específico: adcffeeb-f4d5-43e4-a3b1-5db9523a92a8

UPDATE public.usuarios
SET papel = 'admin'
WHERE auth_user_id = 'adcffeeb-f4d5-43e4-a3b1-5db9523a92a8'
  AND papel <> 'admin';

-- Atualizar limite para refletir realidade atual do usuário
UPDATE public.usuarios
SET max_empresas = 3
WHERE auth_user_id = 'adcffeeb-f4d5-43e4-a3b1-5db9523a92a8';

-- Garantir que novas empresas sempre criem profile como owner
-- (Isso geralmente é tratado na trigger de provisionamento ou no código do app)
-- A trigger provision_new_company já deve estar ok, mas vamos revisar se necessário.
