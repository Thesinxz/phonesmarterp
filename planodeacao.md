PHONE SMART ERP
Documento de Especificação Estratégica & Plano de Ação
Versão 2.0 — Consolidado para Equipe Antigravity
Repositório Visual: github.com/nextlevelbuilder/ui-ux-pro-max-skill

1. Visão Geral do Produto
Sistema SaaS multi-empresa para gestão completa de assistências técnicas. A plataforma deve cobrir todo o ciclo operacional: abertura de OS, diagnóstico, reparo, financeiro, estoque e emissão fiscal — com isolamento total de dados entre empresas e controle granular de permissões.

Atributo
Definição
Nome Provisório
Phone Smart ERP
Tipo de Produto
SaaS B2B Multi-tenant (assistências técnicas)
Repositório Visual
github.com/nextlevelbuilder/ui-ux-pro-max-skill
Estilo Visual
Glassmorphism + Bento Grid + Sidebar esquerda (conforme print)
Frontend
Next.js 14 + Tailwind CSS + TypeScript
Backend
Supabase (PostgreSQL + Auth + Edge Functions + Realtime)
Infra
Docker + VPS/Cloud + CI/CD
Multi-tenant
Row Level Security (RLS) + subdomínio por empresa

2. Diretrizes Visuais (Obrigatórias)
Todo o sistema deve seguir fielmente o estilo do repositório ui-ux-pro-max-skill e o print do dashboard enviado como referência. As seguintes regras são inegociáveis:

	•	Glassmorphism: cards com backdrop-blur, bordas semi-transparentes e sombra suave em todos os painéis
	•	Layout base: Sidebar fixa esquerda + Header superior + área de conteúdo central — idêntico ao print
	•	Paleta de cores: azul (#1E3A5F, #2E6DA4), roxo de destaque, cinza claro de fundo, branco nos cards
	•	Fundo: gradiente sutil (azul escuro → roxo escuro) na sidebar; fundo geral cinza claro ou branco
	•	Ícones: Lucide React — minimalistas, consistentes em tamanho
	•	Tipografia: Inter ou Geist (Next.js padrão) — hierarquia clara entre títulos, subtítulos e corpo
	•	Cards de métricas: estilo do print (OS Abertas, Clientes Ativos, Receita Mensal, Tempo Médio, Ticket Médio)
	•	Botões de ação primária: azul sólido com hover suave — ex: '+ Nova OS', 'Nova Venda'
	•	Barra de busca global no header superior
	•	Responsividade: funcionar em desktop (1920px) e tablet (1024px) — uso no balcão da loja

3. Landing Page Pública (Página de Marketing)
A landing page é a porta de entrada do produto SaaS. Deve ser otimizada para conversão, com visual glassmorphism, demonstração animada do produto e tabela de preços clara.
3.1 Hero Section
	•	Headline forte: ex. 'Gerencie sua assistência técnica do zero ao faturamento'
	•	Subheadline clara explicando o valor central em 1-2 linhas
	•	Botão CTA primário: 'Começar Teste Gratuito' (destaque máximo)
	•	Botão CTA secundário: 'Ver Demonstração' (outline)
	•	Mock animado do dashboard ao lado direito — exibindo cards de métricas em movimento
	•	Indicadores animados (contadores): OS abertas, Receita mensal, Técnicos ativos, Ticket médio
3.2 Seção Problema × Solução
	•	Bloco: Controle manual gera caos e erros
	•	Bloco: Falta de métricas impede decisões estratégicas
	•	Bloco: Desorganização financeira compromete o caixa
	•	Bloco: Solução centralizada — tudo em um só lugar
3.3 Seção de Funcionalidades (Cards Glassmorphism)
Cada card deve ter: Ícone + Título + Descrição + Micro benefício destacado.

Módulo
Descrição do Card
Ordens de Serviço
Campos personalizados, status em tempo real, histórico completo, timeline de eventos
Gestão de Clientes
Cadastro completo, histórico de equipamentos e serviços, observações internas
Controle de Técnicos
Atribuição de serviços, comissões automáticas, métricas de produtividade, ranking interno
Permissões RBAC
Controle por módulo e ação (CRUD), perfis customizáveis, permissões por empresa
Relatórios Inteligentes
Dashboard gerencial, receita por período, ticket médio, performance de técnicos, conversão de orçamentos
Multi-Empresa
Isolamento total de dados, subdomínio por empresa, gestão central administrativa
Notas Fiscais
Emissão de NF-e, NFC-e e NFS-e, integração com Sefaz, controle de certificados A1
Controle de Estoque
Cadastro de peças, baixa automática via OS, alerta de estoque mínimo, relatório de giro
Gestão Financeira
Contas a pagar/receber, fluxo de caixa, controle de comissões, DRE simplificado
3.4 Seção de Prova Social
	•	Logos de clientes parceiros
	•	Depoimentos (nome, empresa, foto, texto)
	•	Contadores animados: +1.000 OS gerenciadas, +R$ X processados, +X empresas ativas
3.5 Tabela de Preços

Recurso
Starter
Profissional
Enterprise
Empresas
1
1
Ilimitadas
Usuários
Até 3
Até 10
Ilimitados
Técnicos
Até 2
Até 8
Ilimitados
Emissão NF
Não
Sim (NFC-e)
Sim (NF-e/NFC-e/NFS-e)
Relatórios
Básicos
Avançados
Personalizados
Suporte
Email
Chat + Email
Dedicado
API Access
Não
Não
Sim
3.6 Trust Badges (Rodapé da Landing)
	•	SSL Seguro (HTTPS obrigatório)
	•	LGPD Compliant
	•	Backup diário automatizado
	•	Infraestrutura escalável (Docker + Cloud)
	•	Uptime 99.9%

4. Módulos do Sistema — Detalhamento Funcional
4.1 Dashboard (Tela Inicial)
	•	Cards de métricas em tempo real: OS Abertas, Clientes Ativos, Receita Mensal, Tempo Médio, Ticket Médio
	•	Faturamento do Dia: Total, Produtos, Serviços, Líquido
	•	Agenda da Semana: visualização 7 dias com eventos (Receber, Pagar, OS, Compromisso)
	•	Botões rápidos: + Nova OS e Nova Venda
	•	Barra de busca global no header
	•	Alerta de período de teste / plano ativo com CTA 'Ver Planos'
	•	Realtime: todos os indicadores atualizam sem refresh via Supabase Realtime
4.2 Ordens de Serviço
Campos obrigatórios:
	•	Número da OS (gerado automaticamente, sequencial por empresa)
	•	Cliente (busca por nome/CPF/telefone)
	•	Equipamento (marca, modelo, cor, número de série / IMEI)
	•	Problema relatado pelo cliente
	•	Diagnóstico técnico
	•	Peças utilizadas (com baixa automática no estoque)
	•	Técnico responsável
	•	Status (Aberta / Em Análise / Aguardando Peça / Em Execução / Finalizada / Entregue / Cancelada)
	•	Garantia (data de vencimento)
	•	Valor total + Forma de pagamento
Funcionalidades:
	•	Kanban Board com drag-and-drop entre status
	•	Timeline de eventos: log imutável de cada ação na OS
	•	Upload de fotos do equipamento na entrada e saída
	•	Assinatura digital do cliente na entrega (canvas HTML5)
	•	Checklist de entrada detalhado (parafusos, tela, FaceID, câmera, etc.)
	•	Gravação de padrão de desbloqueio visual (pattern lock)
	•	Geração automática de orçamento em PDF
	•	Atualização automática de status com envio de WhatsApp ao cliente
	•	Geração de NFS-e ao finalizar serviço (via Edge Function)
4.3 PDV — Ponto de Venda
	•	Adição de produtos via leitura de código de barras, busca ou seleção em grid
	•	Modo Vitrine (grid visual) e modo Lista
	•	Cálculo automático de desconto por forma de pagamento
	•	Formas de pagamento: Pix, Crédito (1-12x), Débito, Dinheiro
	•	Pagamento dividido (ex: parte dinheiro + parte crédito)
	•	Trade-in: aceitar dispositivo usado como parte do pagamento
	•	Vinculação a cliente existente ou cadastro rápido
	•	Emissão automática de NFC-e ao concluir venda
	•	Impressão de cupom térmico (58mm/80mm) e compartilhamento via WhatsApp
4.4 Gestão de Clientes (CRM)
Campos:
	•	Nome completo, CPF/CNPJ, Telefone, Email, Endereço completo, Observações internas
Relacionamentos e funcionalidades:
	•	Múltiplos equipamentos por cliente
	•	Histórico completo de OS e compras
	•	LTV (Lifetime Value) calculado automaticamente
	•	Programa de fidelidade: acúmulo e resgate de pontos
	•	Timeline de comunicações: WhatsApp, ligações, anotações
	•	Segmentação automática: Atacadista, VIP, Novo
	•	Histórico financeiro por cliente
4.5 Controle de Técnicos
Campos:
	•	Nome, Comissão %, Meta mensal (R$), Especialidades, Status (ativo/inativo)
Indicadores e funcionalidades:
	•	OS concluídas no período
	•	Receita gerada pelo técnico
	•	Tempo médio de reparo
	•	Ranking interno de produtividade
	•	Cálculo automático de comissão por OS finalizada
	•	Atribuição de OSs ao técnico
4.6 Permissões RBAC
Perfis padrão:
	•	Admin: acesso total ao sistema
	•	Gerente: acesso a todos módulos exceto configurações críticas
	•	Técnico: acesso a OS atribuídas, estoque (leitura), próprios indicadores
	•	Financeiro: acesso ao módulo financeiro, relatórios, notas fiscais
	•	Atendente: OS, Clientes, PDV — sem acesso a financeiro/configurações
Permissões granulares por módulo:
	•	Visualizar / Criar / Editar / Excluir / Aprovar / Emitir NF
	•	Perfis customizáveis pelo Admin da empresa
	•	Aplicado via RLS no banco + middleware no Next.js
4.7 Controle de Estoque
	•	Cadastro de produtos e peças com variações (cor, capacidade, grade A/B/C)
	•	Rastreamento por IMEI para dispositivos serializados
	•	Entrada e saída manual de estoque
	•	Baixa automática de peças ao finalizar OS
	•	Alerta de estoque mínimo (visual + notificação)
	•	Impressão de etiquetas QR Code/Barcode (ZPL/Brother)
	•	Relatório de giro e inventário
	•	Fornecedores vinculados a produtos
	•	Descrição automática de produto via IA (OpenAI GPT-4)
4.8 Gestão Financeira
	•	Contas a Pagar: faturas de fornecedores com alertas de vencimento
	•	Contas a Receber: parcelas de cartão (D+1, D+30...) e boletos
	•	Fluxo de caixa: entradas e saídas diárias
	•	Centro de custo por categoria
	•	DRE simplificado (P&L): geração mensal
	•	Controle de comissões dos técnicos
	•	Estimativa de carga tributária (Simples Nacional)
4.9 Notas Fiscais
	•	Emissão de NF-e (produtos), NFC-e (consumidor final) e NFS-e (serviços)
	•	Integração com SEFAZ via webservice oficial (certificado digital A1)
	•	Emissão automática ao finalizar venda no PDV (NFC-e) e OS (NFS-e)
	•	Armazenamento de XML no Supabase Storage
	•	Cancelamento e inutilização de notas
	•	Histórico e reimpressão DANFE
	•	Controle de validade do certificado digital
4.10 Relatórios & Dashboard Analítico
	•	Receita mensal por período (gráfico de linha)
	•	Receita por técnico (gráfico de barras)
	•	OS por status (gráfico de pizza)
	•	Ticket médio por período
	•	Lucro por período (receita - custo)
	•	Performance de técnicos: ranking, tempo médio, conversão
	•	Conversão de orçamentos (OS aceitas / total)
	•	Exportação em PDF e Excel
	•	Filtros por período, técnico, status, categoria
4.11 Ferramentas & Calculadoras
	•	Precificação Inteligente: custo + imposto (Simples Nacional) + comissão + margem = preço ideal. Lógica reversa disponível
	•	Calculadora de Importação: USD/PYG → BRL com frete e atravessador. Câmbio atualizado automaticamente
	•	OCR — Precificação em Massa: upload de lista de fornecedor (imagem), extração com Tesseract.js, inclusão em massa no estoque
4.12 Administração & Configurações
	•	Gerenciamento de usuários com papéis e permissões
	•	Configurações da empresa: logo, endereço, dados fiscais, credenciais NFe
	•	Logs de auditoria: quem criou/editou/deletou e quando
	•	Gerenciamento multi-unidade e franquias
	•	Configuração de subdomínio por empresa
	•	Gestão central administrativa (painel owner/superadmin)

5. Stack Tecnológica Completa
Frontend
Tecnologia
Detalhes
Framework
Next.js 14 (App Router + SSR/SSG)
Linguagem
TypeScript (strict mode)
Estilização
Tailwind CSS + clsx + tailwind-merge
Componentes UI
Repositório ui-ux-pro-max-skill + Shadcn/ui
Ícones
Lucide React
Charts
recharts
PDFs
jspdf + jspdf-autotable
Datas
date-fns
State
React Context API + Custom Hooks (sem Redux)
OCR
Tesseract.js (listas de fornecedores)

Backend & Infraestrutura
Serviço
Detalhes
Plataforma
Supabase (open-source, self-hostável)
Database
PostgreSQL com Row Level Security (RLS)
Autenticação
Supabase Auth (JWT + Magic Link + OAuth)
Edge Functions
Supabase Edge Functions (Deno) para integrações sensíveis
Storage
Supabase Storage — imagens, PDFs, XMLs fiscais, certificados A1
Realtime
Supabase Realtime (Postgres Changes via WebSocket)
Multi-tenant
RLS com empresa_id em todas as tabelas + subdomínio
Containerização
Docker + docker-compose (dev e produção)
CI/CD
GitHub Actions → deploy automático em VPS ou Railway/Fly.io

Integrações Externas
Integração
Serviço
Finalidade
WhatsApp
whatsapp-web.js / Cloud API
Notificações automáticas de OS e vendas
NF-e / NFC-e / NFS-e
FocusNFe ou similar
Assinatura e transmissão à SEFAZ
IA / Descrições
OpenAI GPT-4
Descrições de produtos e sugestão de preços
CEP / Endereço
Google Maps API / ViaCEP
Autocomplete de endereço no cadastro
OCR
Tesseract.js
Leitura de listas de fornecedores em imagem
Câmbio
AwesomeAPI ou similar
Cotação USD/PYG atualizada para calculadora
Pagamentos
Stripe / MercadoPago
Cobrança das assinaturas SaaS (futuro)

6. Arquitetura & Padrões de Código
Estrutura de Pastas (Next.js 14 App Router)
├── app/                     # Next.js App Router│   ├── (landing)/           # Landing page pública (marketing)│   ├── (auth)/              # Login, cadastro, recuperação de senha│   └── (dashboard)/         # App interno (protegido por auth)│       ├── dashboard/       # Tela inicial com métricas│       ├── os/              # Ordens de Serviço + Kanban│       ├── clientes/        # CRM de clientes│       ├── pdv/             # Ponto de Venda│       ├── estoque/         # Gestão de estoque│       ├── financeiro/      # Financeiro + DRE│       ├── tecnicos/        # Gestão de técnicos│       ├── relatorios/      # Dashboards e relatórios│       ├── fiscal/          # Notas fiscais│       └── configuracoes/   # Admin + RBAC + empresa├── components/              # Componentes reutilizáveis (UI atômico)│   ├── ui/                  # Shadcn + componentes do repositório│   ├── charts/              # Wrappers de recharts│   └── kanban/              # Board de OS├── services/                # Service Layer (Supabase por módulo)│   ├── osService.ts│   ├── clientesService.ts│   ├── estoqueService.ts│   └── financeiroService.ts├── hooks/                   # Custom hooks (useOS, useClientes...)├── context/                 # AuthContext, TenantContext├── utils/                   # formatCurrency, formatDate, etc.├── types/                   # TypeScript interfaces globais└── supabase/    ├── migrations/          # Migrations SQL versionadas    └── functions/           # Edge Functions (WhatsApp, NF-e, IA)

Tabelas Principais do Banco (PostgreSQL)
Tabela
Campos Principais
empresas
id, nome, cnpj, subdominio, plano, certificado_a1, created_at
usuarios
id, empresa_id, nome, email, papel, permissoes_json, ativo
clientes
id, empresa_id, nome, cpf_cnpj, telefone, email, endereco_json, pontos_fidelidade
equipamentos
id, cliente_id, empresa_id, marca, modelo, imei, cor, observacoes
ordens_servico
id, empresa_id, cliente_id, equipamento_id, tecnico_id, status, checklist_json, valor_total_centavos, garantia_ate
os_timeline
id, os_id, empresa_id, usuario_id, evento, criado_em (imutável)
produtos
id, empresa_id, nome, imei, grade, cor, capacidade, preco_custo_centavos, preco_venda_centavos, estoque_qtd, estoque_minimo
vendas
id, empresa_id, cliente_id, total_centavos, forma_pagamento, nfce_chave, created_at
financeiro
id, empresa_id, tipo, valor_centavos, categoria, centro_custo, vencimento, pago, created_at
tecnicos
id, empresa_id, usuario_id, comissao_pct, meta_mensal_centavos, especialidades[]
audit_logs
id, empresa_id, usuario_id, tabela, acao, dado_anterior_json, dado_novo_json, criado_em

Padrões e Regras de Desenvolvimento
	•	Service Layer obrigatório: toda comunicação com Supabase via src/services/*.ts — nunca chamar Supabase direto em componentes
	•	RLS em todas as tabelas: política padrão WHERE empresa_id = auth.jwt()->>'empresa_id' — garante isolamento total
	•	Middleware Next.js: identificar tenant por subdomínio (empresa.seuapp.com.br) e injetar empresa_id no JWT
	•	Migrations versionadas: uma migration por feature em supabase/migrations/ — NUNCA alterar banco manualmente em produção
	•	Valores monetários: sempre INTEGER em centavos no banco. Formatar apenas na exibição com formatCurrency(pt-BR)
	•	Edge Functions para segredos: WhatsApp, NF-e e OpenAI chamados via Supabase Edge Functions — chaves nunca no frontend
	•	Realtime seletivo: usar supabase.channel() apenas em telas que precisam (Dashboard, Kanban OS)
	•	TypeScript strict: sem 'any'. Tipos em src/types/*.ts para todas as entidades do banco

7. Multi-Tenant — Especificação Técnica
O isolamento entre empresas é um requisito crítico de segurança. A estratégia adota três camadas complementares:

Camada 1 — Subdomínio por Empresa
	•	Cada empresa acessa o sistema via subdomínio: minhaloja.phonesmart.com.br
	•	Next.js Middleware lê o subdomínio, consulta a tabela empresas e injeta empresa_id no contexto da sessão
	•	Permite personalização futura (logo, cores) por empresa
Camada 2 — Row Level Security (PostgreSQL)
	•	Todas as tabelas possuem coluna empresa_id NOT NULL
	•	Política RLS padrão: USING (empresa_id = (auth.jwt() ->> 'empresa_id')::uuid)
	•	Qualquer query sem o empresa_id correto no JWT retorna 0 resultados — sem exceções
	•	Superadmin tem política separada para painel de gestão central
Camada 3 — Middleware e API Routes
	•	Todas as API Routes e Server Actions validam empresa_id antes de processar
	•	Edge Functions validam o JWT e empresa_id antes de executar integrações
	•	Logs de auditoria registram empresa_id em toda operação sensível

8. Roadmap de Desenvolvimento
Fase 1 — Setup Base (Sprint 1-2)
Tarefa
Prioridade
Status
Clonar repositório ui-ux-pro-max-skill e adaptar para Next.js 14
🔴 Alta
✅ CONCLUÍDO
Setup Supabase: banco, auth, storage, migrations iniciais
🔴 Alta
✅ CONCLUÍDO
Layout base: Sidebar + Header + Roteamento (App Router)
🔴 Alta
✅ CONCLUÍDO
Autenticação completa (login, cadastro, recuperação de senha)
🔴 Alta
✅ CONCLUÍDO
Multi-tenant: subdomínio + RLS + middleware Next.js
🔴 Alta
✅ CONCLUÍDO
Dashboard com cards de métricas e realtime
🔴 Alta
✅ CONCLUÍDO

Fase 2 — Módulos Core (Sprint 3-6)
Tarefa
Prioridade
Status
RBAC: perfis, permissões granulares, RLS por papel
🔴 Alta
✅ CONCLUÍDO
Módulo OS: Kanban + checklist + timeline + assinatura digital
🔴 Alta
✅ CONCLUÍDO
Módulo Clientes: cadastro + equipamentos + histórico + CRM
🔴 Alta
✅ CONCLUÍDO
Módulo Técnicos: cadastro + métricas + comissões
🔴 Alta
✅ CONCLUÍDO
Módulo Estoque: CRUD + variações + IMEI + baixa automática
🔴 Alta
✅ CONCLUÍDO
PDV: carrinho + formas de pagamento + trade-in
🔴 Alta
✅ CONCLUÍDO
Módulo Financeiro: fluxo de caixa + DRE + contas a pagar/receber
🟡 Média
✅ CONCLUÍDO

Fase 3 — Integrações & Ferramentas (Sprint 7-9)
Tarefa
Prioridade
Status
WhatsApp: notificações automáticas de OS e PDV (Edge Function)
🔴 Alta
✅ CONCLUÍDO
NF-e / NFC-e / NFS-e via FocusNFe + SEFAZ (Edge Function)
🔴 Alta
✅ CONCLUÍDO
Impressão térmica 58mm/80mm + etiquetas QR/Barcode
🟡 Média
✅ CONCLUÍDO
Calculadoras: Smart Pricing + Importação + câmbio automático
🟡 Média
✅ CONCLUÍDO
OCR com Tesseract.js para precificação em massa
🟢 Baixa
✅ CONCLUÍDO
IA: descrições automáticas de produto (OpenAI GPT-4)
🟢 Baixa
✅ CONCLUÍDO

Fase 4 — Relatórios & Polimento (Sprint 10-11)
Tarefa
Prioridade
Status
Relatórios avançados: dashboards + filtros + exportação PDF/Excel
🟡 Média
✅ CONCLUÍDO
Programa de fidelidade (pontos e resgates)
🟢 Baixa
✅ CONCLUÍDO
Logs de auditoria completos
🟡 Média
✅ CONCLUÍDO
Gerenciamento multi-unidade / franquia
🟡 Média
✅ CONCLUÍDO
Testes E2E (Playwright) + QA completo
🔴 Alta
A FAZER

Fase 5 — Landing Page & Marketing (Sprint 12)
Tarefa
Prioridade
Status
Landing page: Hero + Problema/Solução + Cards de features
🔴 Alta
✅ CONCLUÍDO
Seção de prova social + depoimentos + contadores animados
🟡 Média
✅ CONCLUÍDO
Tabela de preços (Starter / Profissional / Enterprise)
🔴 Alta
✅ CONCLUÍDO
SEO: meta tags, sitemap, robots.txt, Open Graph
🟡 Média
✅ CONCLUÍDO
Otimização de conversão e trust badges
🟡 Média
✅ CONCLUÍDO

Fase 6 — Deploy & Infraestrutura (Sprint 13)
Tarefa
Prioridade
Status
Docker: Dockerfile + docker-compose para dev e produção
🔴 Alta
A FAZER
CI/CD: GitHub Actions para deploy automático
🔴 Alta
A FAZER
DNS + SSL + subdomínio wildcard (*.phonesmart.com.br)
🔴 Alta
A FAZER
Backup automático do banco (pg_dump agendado)
🔴 Alta
A FAZER
Monitoramento e alertas (uptime, erros, performance)
🟡 Média
A FAZER

9. Entregáveis Técnicos Esperados
Fase
Prazo Sugerido
Entregável
Fase 1
Semanas 1-2
Projeto configurado, auth, layout, dashboard + multi-tenant funcional
Fase 2
Semanas 3-6
RBAC, OS (Kanban + assinatura), Clientes, Técnicos, Estoque, PDV, Financeiro
Fase 3
Semanas 7-9
WhatsApp, NF-e/NFC-e/NFS-e, impressão, calculadoras, IA integradas
Fase 4
Semanas 10-11
Relatórios avançados, fidelidade, auditoria, multi-unidade, testes E2E
Fase 5
Semana 12
Landing page completa, SEO, pricing, conversão
Fase 6
Semana 13
Docker, CI/CD, DNS/SSL wildcard, backup, monitoramento, deploy produção

Checklist de Entregáveis Finais do Agente
	•	Código frontend completo (Next.js 14 + TypeScript)
	•	Backend estruturado (Supabase + Edge Functions documentadas)
	•	Banco de dados modelado com todas as migrations SQL versionadas
	•	Documentação da API (endpoints, payloads, autenticação)
	•	Ambiente Docker completo (Dockerfile + docker-compose dev + prod)
	•	Pipeline CI/CD configurado (GitHub Actions)
	•	Script de deploy automatizado
	•	Manual técnico de onboarding e manutenção
	•	README completo com instruções de instalação e variáveis de ambiente

10. Notas Críticas para o Agente Antigravity
	•	VISUAL OBRIGATÓRIO: clonar e adaptar ui-ux-pro-max-skill como base — não criar componentes do zero sem consultar o repositório primeiro
	•	Next.js 14 App Router: usar a estrutura de pastas (dashboard)/ com layout.tsx compartilhado — não usar Pages Router
	•	Supabase como único backend: NÃO usar Firebase. Cliente @supabase/supabase-js em todo o projeto
	•	RLS é inegociável: toda tabela deve ter RLS ativado e política empresa_id. Testar isolamento entre empresas antes de qualquer deploy
	•	Subdomínio wildcard: configurar DNS *.phonesmart.com.br desde a Fase 1 — o middleware de tenant depende disso
	•	Valores em centavos: armazenar SEMPRE como INTEGER no banco. Formatar apenas no frontend com Intl.NumberFormat
	•	Edge Functions para segredos: chaves de API (WhatsApp, OpenAI, NF-e) NUNCA no frontend — sempre via Supabase Edge Functions
	•	Migrations versionadas: supabase/migrations/ com timestamp no nome. Uma migration por feature. Nunca alterar banco manualmente
	•	IMEI com CHECK constraint: validar formato 15 dígitos no banco com CHECK (imei ~ '^[0-9]{15}$')
	•	Assinatura digital: usar canvas HTML5 com react-signature-canvas — salvar como base64 no Storage
	•	Timeline de OS: tabela os_timeline é append-only — sem UPDATE ou DELETE, apenas INSERT
	•	Docker obrigatório: todo ambiente deve rodar via docker-compose — sem dependências globais no host

Phone Smart ERP v2.0 — Documento Consolidado para Equipe Antigravity
