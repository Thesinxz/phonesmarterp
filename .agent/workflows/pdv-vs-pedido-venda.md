# Plano de Ação: Diferenciação PDV vs Pedido de Venda

## Contexto e Problema

Atualmente o sistema possui dois módulos que se sobrepõem conceitualmente:

| Módulo | Rota | Situação Atual |
|---|---|---|
| **PDV** | `/pdv` | Caixa presencial com carrinho, pagamento e NFC-e |
| **Vendas** | `/vendas` | Histórico de vendas já finalizadas |

**O problema:** Não existe um fluxo de **Pedido de Venda** — uma venda remota, orçamento ou venda que ainda não foi paga/entregue. O PDV atual é 100% presencial e imediato. Precisamos criar um fluxo separado para vendas que passam por aprovação, entrega ou pagamento futuro.

---

## Definição dos Dois Conceitos

### 🟢 PDV — Ponto de Venda (Presencial / Imediato)
- Cliente está fisicamente na loja
- Pagamento é feito **na hora** (dinheiro, cartão, Pix)
- Estoque é baixado **imediatamente**
- NFC-e pode ser emitida na hora
- Financeiro é registrado como **pago**
- Fluxo: Adicionar produto → Selecionar cliente → Pagar → Finalizar

### 🔵 Pedido de Venda (Remoto / Orçamento / Parcelado)
- Cliente pode estar ausente (WhatsApp, telefone, e-commerce)
- Pagamento pode ser **futuro** (boleto, parcelado, a prazo)
- Estoque é **reservado**, não baixado imediatamente
- NF-e (não NFC-e) pode ser emitida após aprovação
- Financeiro registrado como **a receber**
- Fluxo: Criar pedido → Aprovar → Separar → Entregar → Receber pagamento

---

## Plano de Implementação

### Fase A — Banco de Dados e Tipos

**Tarefa A1:** Adicionar coluna `tipo` na tabela `vendas`
```sql
-- Migration a ser executada no Supabase
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'pdv' 
  CHECK (tipo IN ('pdv', 'pedido'));

ALTER TABLE vendas ADD COLUMN IF NOT EXISTS status_pedido TEXT DEFAULT NULL 
  CHECK (status_pedido IN ('rascunho', 'aguardando_aprovacao', 'aprovado', 'separando', 'enviado', 'entregue', 'cancelado'));

ALTER TABLE vendas ADD COLUMN IF NOT EXISTS canal_venda TEXT DEFAULT 'balcao'
  CHECK (canal_venda IN ('balcao', 'whatsapp', 'telefone', 'site', 'instagram'));
```

**Tarefa A2:** Atualizar `src/types/database.ts`
- Adicionar `tipo: "pdv" | "pedido"` ao schema de `vendas`
- Adicionar `status_pedido` e `canal_venda` ao schema

---

### Fase B — Serviços

**Tarefa B1:** Atualizar `src/services/vendas.ts`
- Separar `finalizarVenda()` (PDV) de `criarPedido()` (Pedido)
- `finalizarVenda()`: baixa estoque imediatamente, marca `pago: true`
- `criarPedido()`: reserva estoque, marca `pago: false`, status = `rascunho`
- Adicionar `atualizarStatusPedido(id, status)` para pipeline de aprovação
- Adicionar `getPedidos()` com filtros por status e canal

**Tarefa B2:** Criar `src/services/pedidos.ts`
- Lógica específica de pedidos: aprovação, separação, entrega
- Integração com financeiro ao confirmar pagamento
- Baixa de estoque apenas ao status `separando`

---

### Fase C — Interface PDV (Refinamento)

**Tarefa C1:** Refinar `/pdv` para ser 100% presencial
- Adicionar badge visual **"MODO CAIXA"** no header da página
- Mostrar relógio em tempo real (ambiente de caixa)
- Adicionar campo de **desconto em %** e **desconto em R$**
- Adicionar suporte a **troco** (informar valor recebido → calcular troco)
- Adicionar botão **"Sangria / Suprimento"** para controle de caixa
- Atalhos de teclado: `F2` = buscar produto, `F10` = finalizar, `ESC` = limpar

**Tarefa C2:** Melhorar UX do carrinho no PDV
- Permitir editar preço unitário (desconto por item)
- Mostrar margem de lucro em tempo real por item
- Adicionar campo de observação por item

---

### Fase D — Novo Módulo: Pedido de Venda

**Tarefa D1:** Criar página `/pedidos` (listagem)
- Rota: `src/app/(dashboard)/pedidos/page.tsx`
- Kanban de pedidos por status: Rascunho → Aprovado → Separando → Entregue
- Filtros por canal de venda (WhatsApp, Telefone, Site)
- Indicador de pedidos atrasados (criados há mais de X dias sem movimentação)

**Tarefa D2:** Criar página `/pedidos/novo` (criação)
- Formulário similar ao PDV, mas com campos extras:
  - Canal de venda (WhatsApp, Telefone, etc.)
  - Data de entrega prevista
  - Endereço de entrega (para delivery)
  - Condição de pagamento (à vista, 30/60/90, parcelado)
  - Observações internas e para o cliente
- Ao salvar: cria venda com `tipo = 'pedido'`, `status_pedido = 'rascunho'`

**Tarefa D3:** Criar página `/pedidos/[id]` (detalhes e pipeline)
- Timeline de status com histórico de mudanças
- Botões de ação por status:
  - `Rascunho` → botão "Enviar para Aprovação"
  - `Aguardando Aprovação` → botões "Aprovar" / "Recusar"
  - `Aprovado` → botão "Iniciar Separação"
  - `Separando` → botão "Marcar como Enviado/Entregue"
  - `Entregue` → botão "Confirmar Recebimento de Pagamento"
- Ao confirmar pagamento: baixa estoque + registra financeiro como pago

**Tarefa D4:** Adicionar Pedido de Venda à Sidebar
```tsx
{ label: "Pedidos de Venda", href: "/pedidos", icon: ClipboardCheck }
```

---

### Fase E — Integração WhatsApp para Pedidos

**Tarefa E1:** Notificação automática por status de pedido
- Status `aprovado` → WhatsApp: "Seu pedido foi aprovado! Previsão de entrega: X"
- Status `enviado` → WhatsApp: "Seu pedido foi enviado! Código de rastreio: X"
- Status `entregue` → WhatsApp: "Pedido entregue! Avalie nossa loja ⭐"

**Tarefa E2:** Criar template de WhatsApp para pedidos em `src/actions/notifications.ts`
- Função `notifyPedidoStatus(pedidoId, novoStatus)`

---

### Fase F — Relatórios Diferenciados

**Tarefa F1:** Separar métricas no Dashboard
- Card "Vendas PDV" (presenciais do dia)
- Card "Pedidos Abertos" (remotos pendentes)
- Card "Pedidos Atrasados" (alerta vermelho)

**Tarefa F2:** Atualizar `/relatorios`
- Gráfico de receita separado por canal (PDV vs Pedidos)
- Funil de conversão de pedidos (criados → aprovados → entregues)
- Taxa de cancelamento por canal

---

## Resumo Visual das Diferenças

```
PDV (Presencial)                    Pedido de Venda (Remoto)
─────────────────────────────────   ──────────────────────────────────
✅ Cliente na loja                  📱 Cliente ausente (WhatsApp/Tel)
✅ Pagamento imediato               📋 Pagamento futuro / a prazo
✅ Baixa de estoque imediata        🔒 Reserva de estoque
✅ NFC-e na hora                    📄 NF-e após aprovação
✅ Financeiro: pago                 💰 Financeiro: a receber
✅ Fluxo: 1 etapa                   🔄 Fluxo: 5+ etapas (pipeline)
✅ Atalhos de teclado               📊 Kanban de acompanhamento
```

---

## Prioridade de Execução

| Fase | Prioridade | Estimativa |
|---|---|---|
| A — Banco de Dados | 🔴 Alta | 1h |
| B — Serviços | 🔴 Alta | 2h |
| C — Refinamento PDV | 🟡 Média | 3h |
| D — Módulo Pedidos | 🔴 Alta | 6h |
| E — WhatsApp Pedidos | 🟡 Média | 2h |
| F — Relatórios | 🟢 Baixa | 2h |

**Total estimado: ~16h de desenvolvimento**
