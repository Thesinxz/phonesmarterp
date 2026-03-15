-- ============================================================
-- Migration 086: User-Centric Subscription Plan
-- ============================================================

-- 1. Add plan-related columns to usuarios (profiles)
ALTER TABLE public.usuarios 
ADD COLUMN IF NOT EXISTS plano TEXT NOT NULL DEFAULT 'starter' CHECK (plano IN ('starter', 'profissional', 'enterprise')),
ADD COLUMN IF NOT EXISTS plano_expira_em TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS ultimo_acesso_empresa_id UUID REFERENCES public.empresas(id);

-- 2. Create trigger function to sync plan across all user profiles
CREATE OR REPLACE FUNCTION public.sync_profile_subscription()
RETURNS TRIGGER AS $$
BEGIN
  -- Replicar dados de plano para todos os registros do mesmo auth_user_id
  -- Exceto o próprio registro que disparou o trigger (para evitar recursão)
  UPDATE public.usuarios
  SET 
    plano = NEW.plano,
    plano_expira_em = NEW.plano_expira_em,
    stripe_customer_id = NEW.stripe_customer_id,
    stripe_subscription_id = NEW.stripe_subscription_id
  WHERE auth_user_id = NEW.auth_user_id
    AND id <> NEW.id;
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_sync_profile_subscription ON public.usuarios;
CREATE TRIGGER trigger_sync_profile_subscription
AFTER UPDATE OF plano, plano_expira_em, stripe_customer_id, stripe_subscription_id ON public.usuarios
FOR EACH ROW
WHEN (pg_trigger_depth() < 1) -- Proteção extra contra recursão
EXECUTE FUNCTION public.sync_profile_subscription();

-- 3. Update provision_new_company to handle initial plan
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
  -- Nota: plano inicial é sempre 'starter' para novos signups ou herda se tivermos lógica extra
  INSERT INTO public.usuarios (empresa_id, auth_user_id, nome, email, papel, ativo)
  VALUES (v_empresa_id, p_auth_user_id, p_nome_usuario, p_email_usuario, 'admin', true)
  RETURNING id INTO v_usuario_id;

  -- 3. Inserir configurações iniciais
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

-- 4. Update provision_additional_company to inherit plan from existing profile
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
  v_stripe_cust TEXT;
  v_stripe_sub TEXT;
BEGIN
  -- A. Buscar plano atual do usuário nos perfis existentes
  SELECT plano, plano_expira_em, stripe_customer_id, stripe_subscription_id 
  INTO v_current_plano, v_current_expira, v_stripe_cust, v_stripe_sub
  FROM public.usuarios
  WHERE auth_user_id = p_auth_user_id
  LIMIT 1;

  -- B. Criar a empresa
  INSERT INTO public.empresas (nome, subdominio, plano, cnpj)
  VALUES (p_nome_empresa, p_subdominio, COALESCE(v_current_plano, 'starter'), p_cnpj)
  RETURNING id INTO v_empresa_id;

  -- C. Criar uma UNIDADE padrão (Matriz)
  INSERT INTO public.units (empresa_id, name, has_repair_lab, has_parts_stock, has_sales)
  VALUES (v_empresa_id, 'Matriz', true, true, true)
  RETURNING id INTO v_unit_id;

  -- D. Criar o perfil de usuário com o plano herdado
  INSERT INTO public.usuarios (
    empresa_id, auth_user_id, nome, email, papel, ativo, unit_id,
    plano, plano_expira_em, stripe_customer_id, stripe_subscription_id
  )
  VALUES (
    v_empresa_id, p_auth_user_id, p_nome_usuario, p_email_usuario, 'admin', true, v_unit_id,
    COALESCE(v_current_plano, 'starter'), v_current_expira, v_stripe_cust, v_stripe_sub
  )
  RETURNING id INTO v_usuario_id;

  -- E. Criar o vínculo na tabela de multi-empresa
  INSERT INTO public.usuario_vinculos_empresa (usuario_id, empresa_id, papel, auth_user_id)
  VALUES (v_usuario_id, v_empresa_id, 'admin', p_auth_user_id);

  -- F. Se houver dados de emitente, salvar em configuracoes
  IF p_emitente_json IS NOT NULL AND p_emitente_json <> '{}'::jsonb THEN
      INSERT INTO public.configuracoes (empresa_id, chave, valor)
      VALUES (v_empresa_id, 'nfe_emitente', p_emitente_json);
  END IF;

  RETURN QUERY SELECT v_empresa_id, v_usuario_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
