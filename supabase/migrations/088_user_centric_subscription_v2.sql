-- ============================================================
-- Migration 088: User-Centric Subscription Plan V2
-- ============================================================

-- 1. Add missing trial and limit columns to usuarios (profiles)
ALTER TABLE public.usuarios 
ADD COLUMN IF NOT EXISTS trial_start TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS trial_end TIMESTAMPTZ DEFAULT (now() + INTERVAL '14 days'),
ADD COLUMN IF NOT EXISTS max_empresas INTEGER DEFAULT 1;

-- 2. Update the sync trigger function to include new columns
CREATE OR REPLACE FUNCTION public.sync_profile_subscription()
RETURNS TRIGGER AS $$
BEGIN
  -- Replicar dados de plano para todos os registros do mesmo auth_user_id
  UPDATE public.usuarios
  SET 
    plano = NEW.plano,
    plano_expira_em = NEW.plano_expira_em,
    stripe_customer_id = NEW.stripe_customer_id,
    stripe_subscription_id = NEW.stripe_subscription_id,
    trial_start = NEW.trial_start,
    trial_end = NEW.trial_end,
    max_empresas = NEW.max_empresas
  WHERE auth_user_id = NEW.auth_user_id
    AND id <> NEW.id;
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-apply trigger to include new columns in the update check
DROP TRIGGER IF EXISTS trigger_sync_profile_subscription ON public.usuarios;
CREATE TRIGGER trigger_sync_profile_subscription
AFTER UPDATE OF plano, plano_expira_em, stripe_customer_id, stripe_subscription_id, trial_start, trial_end, max_empresas ON public.usuarios
FOR EACH ROW
WHEN (pg_trigger_depth() < 1)
EXECUTE FUNCTION public.sync_profile_subscription();

-- 3. Trigger to ensure new companies inherit the owner's plan
CREATE OR REPLACE FUNCTION public.set_empresa_plano_from_owner()
RETURNS TRIGGER AS $$
DECLARE
  v_owner_plano TEXT;
BEGIN
  -- Se o subdominio indicar que é sistema (ex: admin), ignorar
  IF NEW.subdominio = 'admin' THEN
    RETURN NEW;
  END IF;

  -- Buscar plano do usuário que está vinculado como admin na primeira empresa (ou qualquer uma)
  SELECT plano INTO v_owner_plano
  FROM public.usuarios
  WHERE auth_user_id = (SELECT auth.uid()) -- Usamos auth.uid() se for via API, ou passamos via subquery se possível
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid()) -- Fallback
  ORDER BY created_at ASC
  LIMIT 1;

  NEW.plano := COALESCE(v_owner_plano, 'starter');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Initial Migration of existing data
-- Assume 'admin' is the equivalent of 'owner' in this system
UPDATE public.usuarios u
SET
  trial_start = e.created_at,
  trial_end = e.created_at + INTERVAL '14 days',
  max_empresas = CASE
    WHEN u.plano = 'starter' THEN 1
    WHEN u.plano = 'profissional' THEN 3
    ELSE 999
  END
FROM public.empresas e
WHERE e.id = u.empresa_id
  AND u.papel = 'admin';

-- 5. Update provision_new_company to set initial limits
CREATE OR REPLACE FUNCTION provision_new_company(
  p_nome_empresa TEXT,
  p_subdominio TEXT,
  p_nome_usuario TEXT,
  p_email_usuario TEXT,
  p_auth_user_id UUID,
  p_cnpj TEXT DEFAULT NULL,
  p_configs JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  empresa_id UUID,
  usuario_id UUID
) AS $$
DECLARE
  v_empresa_id UUID;
  v_usuario_id UUID;
  v_chave TEXT;
  v_valor JSONB;
BEGIN
  -- 1. Criar a empresa
  INSERT INTO public.empresas (nome, subdominio, plano, cnpj)
  VALUES (p_nome_empresa, p_subdominio, 'starter', p_cnpj)
  RETURNING id INTO v_empresa_id;

  -- 2. Criar o perfil de usuário (PAPEL ADMIN)
  INSERT INTO public.usuarios (
    empresa_id, auth_user_id, nome, email, papel, ativo, 
    plano, max_empresas, trial_start, trial_end
  )
  VALUES (
    v_empresa_id, p_auth_user_id, p_nome_usuario, p_email_usuario, 'admin', true,
    'starter', 1, now(), now() + INTERVAL '14 days'
  )
  RETURNING id INTO v_usuario_id;

  -- 3. Criar a UNIDADE padrão (Matriz)
  INSERT INTO public.units (empresa_id, name, has_repair_lab, has_parts_stock, has_sales)
  VALUES (v_empresa_id, 'Matriz', true, true, true);

  -- 4. Criar o vínculo oficial na tabela de multi-empresa
  INSERT INTO public.usuario_vinculos_empresa (usuario_id, empresa_id, papel, auth_user_id)
  VALUES (v_usuario_id, v_empresa_id, 'admin', p_auth_user_id);

  -- 5. Inserir configurações iniciais
  IF p_configs IS NOT NULL AND p_configs <> '{}'::jsonb THEN
      FOR v_chave, v_valor IN SELECT * FROM jsonb_each(p_configs)
      LOOP
          INSERT INTO public.configuracoes (empresa_id, chave, valor)
          VALUES (v_empresa_id, v_chave, v_valor)
          ON CONFLICT (empresa_id, chave) DO UPDATE SET valor = EXCLUDED.valor;
      END LOOP;
  END IF;

  RETURN QUERY SELECT v_empresa_id, v_usuario_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. Update provision_additional_company to handle limits and inheritance
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
  v_current_plano TEXT;
  v_current_expira TIMESTAMPTZ;
  v_trial_start TIMESTAMPTZ;
  v_trial_end TIMESTAMPTZ;
  v_max_empresas INTEGER;
  v_stripe_cust TEXT;
  v_stripe_sub TEXT;
  v_count INTEGER;
BEGIN
  -- A. Buscar plano e limites atuais do usuário
  SELECT plano, plano_expira_em, trial_start, trial_end, max_empresas, stripe_customer_id, stripe_subscription_id 
  INTO v_current_plano, v_current_expira, v_trial_start, v_trial_end, v_max_empresas, v_stripe_cust, v_stripe_sub
  FROM public.usuarios
  WHERE auth_user_id = p_auth_user_id
  LIMIT 1;

  -- B. Verificar limite de empresas
  SELECT count(*) INTO v_count 
  FROM public.usuarios 
  WHERE auth_user_id = p_auth_user_id;

  IF v_count >= COALESCE(v_max_empresas, 1) THEN
    RAISE EXCEPTION 'Limite de empresas atingido para o plano %', v_current_plano;
  END IF;

  -- C. Criar a empresa
  INSERT INTO public.empresas (nome, subdominio, plano, cnpj)
  VALUES (p_nome_empresa, p_subdominio, COALESCE(v_current_plano, 'starter'), p_cnpj)
  RETURNING id INTO v_empresa_id;

  -- D. Criar uma UNIDADE padrão (Matriz)
  INSERT INTO public.units (empresa_id, name, has_repair_lab, has_parts_stock, has_sales)
  VALUES (v_empresa_id, 'Matriz', true, true, true)
  RETURNING id INTO v_unit_id;

  -- E. Criar o perfil de usuário com o plano herdado
  INSERT INTO public.usuarios (
    empresa_id, auth_user_id, nome, email, papel, ativo, unit_id,
    plano, plano_expira_em, trial_start, trial_end, max_empresas,
    stripe_customer_id, stripe_subscription_id
  )
  VALUES (
    v_empresa_id, p_auth_user_id, p_nome_usuario, p_email_usuario, 'admin', true, v_unit_id,
    COALESCE(v_current_plano, 'starter'), v_current_expira, v_trial_start, v_trial_end, v_max_empresas,
    v_stripe_cust, v_stripe_sub
  )
  RETURNING id INTO v_usuario_id;

  -- F. Criar o vínculo na tabela de multi-empresa
  INSERT INTO public.usuario_vinculos_empresa (usuario_id, empresa_id, papel, auth_user_id)
  VALUES (v_usuario_id, v_empresa_id, 'admin', p_auth_user_id);

  -- G. Se houver dados de emitente, salvar em configuracoes
  IF p_emitente_json IS NOT NULL AND p_emitente_json <> '{}'::jsonb THEN
      INSERT INTO public.configuracoes (empresa_id, chave, valor)
      VALUES (v_empresa_id, 'nfe_emitente', p_emitente_json);
  END IF;

  RETURN QUERY SELECT v_empresa_id, v_usuario_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
