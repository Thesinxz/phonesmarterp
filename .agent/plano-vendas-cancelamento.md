# Plano de Ação: Verificação e Correção do Módulo de Vendas/Pedidos

Este plano tem como objetivo identificar, mapear e corrigir os fluxos de cancelamento e de movimentação financeira/estoque para garantir que não haja vazamento ou valores presos no sistema.

## 1. Problema Identificado: Cancelamento de Pedidos e Vendas
Atualmente, no arquivo `src/services/vendas.ts`, a função `atualizarStatusPedido` atualiza o status de um pedido no banco de dados para `"cancelado"`, porém **NÃO realiza:**
- O estorno (devolução) da quantidade dos itens para o estoque (isso é fundamental caso o pedido já estivesse no status `separando` ou equivalente, onde o estoque já havia sido deduzido).
- A exclusão ou cancelamento dos títulos financeiros vinculados a este pedido (criados na função `criarPedido` como títulos *a receber pendentes*).
- O estorno dos pontos de fidelidade (caso tenham sido creditados).

## 2. Passos para a Correção no Backend (`src/services/vendas.ts`)

### A. Ajustar a função `atualizarStatusPedido`
Adicionar a lógica para tratar especificamente quando `status === "cancelado"`:
1. **Restaurar Estoque:**
   - Para cada item vinculado à venda/pedido, buscar a quantidade retirada e somar novamente ao campo `estoque_qtd` da tabela `produtos`.
2. **Limpar/Cancelar Financeiro:**
   - Localizar todos os títulos financeiros (na tabela `financeiro_titulos`) onde `origem_id` é o ID do pedido e `origem_tipo` é `"venda"`.
   - Excluir esses títulos e suas possíveis baixas (`caixa_movimentacoes`).
3. **Adicionar Log no Histórico do Produto:**
   - Registrar no histórico que as unidades voltaram ao estoque devido a "Cancelamento de Venda/Pedido".

### B. Adicionar função `cancelarVenda` (para PDV)
Atualmente a página de Vendas (`/vendas`) exibe vendas consolidadas do PDV, mas não parece possuir um fluxo explícito para cancelamento total (Diferente da view de Pedidos).
1. Se necessário, criar uma função de cancelamento que execute uma lógica semelhante à de estorno (com a diferença de que um PDV pode ter criado recebíveis faturados ou pagamentos à vista, o que requer extorno do caixa).

## 3. Passos para a Correção no Frontend (UI)

### A. Vendas PDV (`src/app/(dashboard)/vendas/page.tsx`)
1. Verificar se deveria existir um botão "Cancelar Venda" para vendas do PDV. Atualmente, os operadores podem estornar pagamentos de títulos, mas a venda em si precisa ser cancelada para retornar os itens à prateleira.

### B. Pedidos (`src/app/(dashboard)/pedidos/page.tsx` & componentes)
1. O fluxo do menu `PedidoMenuDropdown` já aciona `"cancelado"`. 
2. Precisamos apenas garantir que a UI lide de forma amigável e exiba notificações de que o estoque foi restituído.

## 4. Testes e Validação
1. **Testar Pedido:** Criar um pedido (rascunho -> aprovado -> separando [deduz estoque]). Cancelá-lo. Verificar se o estoque subiu e o boleto/"a receber" sumiu.
2. **Testar PDV (se implementado cancelamento):** Fazer a venda direta, abater estoque e caixa, depois cancelar. Checar reversão completa.

## Como proceder?
Podemos começar alterando a lógica no arquivo lógico principal (`src/services/vendas.ts`) e, em seguida, fazer testes manuais. Posso iniciar essas alterações para você agora mesmo.
