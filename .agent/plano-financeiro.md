# Plano de Ação: Módulo Financeiro Completo

## 1. Visão Geral
Construir um módulo financeiro robusto e perfeitamente integrado com Vendas e Ordem de Serviço (OS), permitindo a gestão em tempo real do fluxo de caixa, PDV dinâmico, planejamento financeiro (contas a pagar/receber) e geração de relatórios avançados como o DRE.

## 2. Estrutura de Banco de Dados (Supabase)
Precisaremos criar ou aprimorar as seguintes tabelas:
- **`caixas`**: `id`, `empresa_id`, `usuario_abertura_id`, `usuario_fechamento_id`, `data_abertura`, `data_fechamento`, `saldo_inicial`, `saldo_final`, `diferenca_fechamento`, `status` (aberto/fechado).
- **`caixa_movimentacoes`**: `id`, `caixa_id`, `usuario_id` (quem executou a ação), `vendedor_id` (quem fez a venda/OS, suportando múltiplos vendedores por caixa), `tipo` (venda, recebimento_os, sangria, reforco), `valor_centavos`, `forma_pagamento`, `observacao`, `data_hora`.
- **`financeiro_controles`**: `id`, `empresa_id`, `tipo` (pagar/receber), `status` (pendente, pago, atrasado, cancelado), `valor_total_centavos`, `valor_pago_centavos`, `data_vencimento`, `data_pagamento`, `fornecedor_cliente_id`, `categoria`, `origem_tipo` (venda, os, manual, xml), `origem_id`.
- **`xml_importacoes`**: `id`, `empresa_id`, `chave_acesso`, `fornecedor_cnpj`, `fornecedor_nome`, `valor_total_centavos`, `data_emissao`, `status_processamento`.

## 3. Etapas de Desenvolvimento

### Fase 1: Gestão de Caixa (Frente de Loja / PDV)
- **Abertura e Fechamento de Caixa**: Modal/Página para abrir caixa exigindo saldo inicial em espécie. Fechamento deve contabilizar por formas de pagamento e calcular diferenças se houver e registrar quem abriu/fechou.
- **Movimentações de Caixa**:
  - **Sangria**: Retirada de dinheiro (ex: guardar no cofre, pagamento não programado), exigindo motivo e registrando quem retirou.
  - **Reforço**: Entrada extra de troco/dinheiro.
- **Múltiplos Vendedores**: A mesma sessão de caixa aberta poderá processar pagamentos atribuindo a venda/OS para vendedores diferentes (gerenciaremos a variável `vendedor_id` nas movimentações).
- **Relatório de Fechamento**: Resumo claro e com opção de impressão (estilo cupom/A4). Relatório mostrará totalizadores por: Forma de Pagamento, Vendedor (quem vendeu vs quem recebeu) e Categoria.

### Fase 2: Contas a Receber e Contas a Pagar
- **Contas a Receber**:
  - Integração automática: Vendas parceladas ou crediário geram parcelas nesta tela.
  - Notificações de clientes inadimplentes/atrasados.
  - Baixa de recebimento parcial e total.
- **Contas a Pagar**:
  - Cadastro de obrigações manuais (A/água, internet, salários).
  - **Importação de XML de Notas Fiscais**: Fazer upload do XML; o sistema extrai emitente, itens (podendo até retroalimentar estoque no futuro) e gera automaticamente os títulos a pagar derivados da nota.

### Fase 3: Integrações com Core (Vendas / OS)
- **Vendas**: Amarrar conclusão de venda a prazo no *Contas a Receber* e vendas à vista na *Movimentação de Caixa*.
- **Ordem de Serviço (OS)**: Ao realizar a "Entrega", perguntar forma de pagamento. Integrar o pagamento ao Caixa Atual. Exibir botão de atalho visual para faturamento.

### Fase 4: Analítico Financeiro (DRE e Dashboards)
- **Demonstração do Resultado do Exercício (DRE)**: Criar relatório gerencial exibindo num determinado período de competência: 
  - (+) Receita Bruta (Vendas + Serviços)
  - (-) Custos Produtos Vendidos e Peças (CMV)
  - (=) Lucro Bruto
  - (-) Despesas Operacionais (Contas a Pagar recorrentes)
  - (=) Lucro Líquido Operacional
- **Dashboards e Gráficos Rápidos**: Fluxo de Caixa Diário realizado vs Projetado na Dashboard principal (Contas a receber vs Pagar da semana).

## 4. Próximos Passos Imediatos
1. Executar Scripts SQL via Supabase para criação das tabelas acima (`caixas`, `caixa_movimentacoes`, `financeiro_controles`).
2. Desenvolver Componente/Tela de Abertura/Fechamento (Fluxo crítico).
3. Atualizar fluxo de OS e Vendas para bloquear ou interagir primariamente se existe Caixa Aberto.
