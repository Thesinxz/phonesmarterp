export type Plan = 'starter' | 'essencial' | 'pro' | 'enterprise';

export type Feature =
  | 'os_kanban'
  | 'os_lista'
  | 'os_garantias'
  | 'vendas_pdv'
  | 'estoque_geral'
  | 'clientes_crm'
  | 'nfe'
  | 'nfce'
  | 'nfse'
  | 'xml_import'
  | 'imei'
  | 'estoque_pecas'
  | 'etiquetas'
  | 'contas_pagar_receber'
  | 'conciliacao_gateway'
  | 'relatorios_avancados'
  | 'relatorios_trade_in'
  | 'multi_empresa'
  | 'marketing_campanhas'
  | 'pos_venda_auto'
  | 'marketing_pdf'
  | 'marketing_aut' // alias for campaigns
  | 'balanco_estoque'
  | 'gestao_equipe'
  | 'comissoes_tecnicos'
  | 'auditoria_logs'
  | 'hub_contabilidade_feature'
  | 'api_integracao'
  | 'suporte_vip'
  | 'ia_ocr'
  | 'trade_in';

export const PLAN_NAMES: Record<Plan, string> = {
  starter: 'Starter',
  essencial: 'Essencial',
  pro: 'Pro',
  enterprise: 'Enterprise'
};

export const PLAN_FEATURES: Record<Plan, Feature[]> = {
  starter: [
    'os_kanban',
    'os_lista',
    'vendas_pdv',
    'estoque_geral',
    'clientes_crm',
  ],
  essencial: [
    'os_kanban',
    'os_lista',
    'os_garantias',
    'vendas_pdv',
    'estoque_geral',
    'clientes_crm',
    'nfe',
    'nfce',
    'nfse',
    'xml_import',
    'imei',
    'estoque_pecas',
    'etiquetas',
    'contas_pagar_receber',
    'conciliacao_gateway',
    'relatorios_avancados',
  ],
  pro: [
    'os_kanban',
    'os_lista',
    'os_garantias',
    'vendas_pdv',
    'estoque_geral',
    'clientes_crm',
    'nfe',
    'nfce',
    'nfse',
    'xml_import',
    'imei',
    'estoque_pecas',
    'etiquetas',
    'contas_pagar_receber',
    'conciliacao_gateway',
    'relatorios_avancados',
    'relatorios_trade_in',
    'multi_empresa',
    'marketing_campanhas',
    'marketing_aut',
    'pos_venda_auto',
    'marketing_pdf',
    'balanco_estoque',
    'gestao_equipe',
    'comissoes_tecnicos',
    'auditoria_logs',
  ],
  enterprise: [
    'os_kanban',
    'os_lista',
    'os_garantias',
    'vendas_pdv',
    'estoque_geral',
    'clientes_crm',
    'nfe',
    'nfce',
    'nfse',
    'xml_import',
    'imei',
    'estoque_pecas',
    'etiquetas',
    'contas_pagar_receber',
    'conciliacao_gateway',
    'relatorios_avancados',
    'relatorios_trade_in',
    'multi_empresa',
    'marketing_campanhas',
    'marketing_aut',
    'pos_venda_auto',
    'marketing_pdf',
    'balanco_estoque',
    'gestao_equipe',
    'comissoes_tecnicos',
    'auditoria_logs',
    'hub_contabilidade_feature',
    'api_integracao',
    'suporte_vip',
    'ia_ocr',
  ],
};

export const PLAN_LIMITS: Record<Plan, {
  maxUsuarios: number | null;
  maxTecnicos: number | null;
  maxOsPerMonth: number | null;
  maxStorageMB: number;
  maxEmpresas: number | null;
  maxUnidades: number | null;
}> = {
  starter: {
    maxUsuarios: 2,
    maxTecnicos: 1,
    maxOsPerMonth: 80,
    maxStorageMB: 500,
    maxEmpresas: 1,
    maxUnidades: 1,
  },
  essencial: {
    maxUsuarios: 5,
    maxTecnicos: 3,
    maxOsPerMonth: 200,
    maxStorageMB: 1024,
    maxEmpresas: 1,
    maxUnidades: 2,
  },
  pro: {
    maxUsuarios: 10,
    maxTecnicos: 5,
    maxOsPerMonth: null,
    maxStorageMB: 3072,
    maxEmpresas: 3,
    maxUnidades: 5,
  },
  enterprise: {
    maxUsuarios: null,
    maxTecnicos: null,
    maxOsPerMonth: null,
    maxStorageMB: 10240,
    maxEmpresas: null,
    maxUnidades: null,
  },
};

export function hasFeature(plan: Plan, feature: Feature, addons: string[] = []): boolean {
  // Check if feature belongs to plan
  if (PLAN_FEATURES[plan]?.includes(feature)) return true;
  
  // Check if feature is an active addon
  if (addons.includes(feature)) return true;

  return false;
}

export function getPlanLimit<K extends keyof (typeof PLAN_LIMITS)['starter']>(
  plan: Plan,
  limit: K
): (typeof PLAN_LIMITS)['starter'][K] | null {
  return PLAN_LIMITS[plan]?.[limit] ?? null;
}

export function getPlanForFeature(feature: Feature): Plan {
  if (PLAN_FEATURES.starter.includes(feature)) return 'starter';
  if (PLAN_FEATURES.essencial.includes(feature)) return 'essencial';
  if (PLAN_FEATURES.pro.includes(feature)) return 'pro';
  return 'enterprise';
}
