# 🏦 Plano de Ação: Gateway de Pagamento em Todo o App (✅ CONCLUÍDO)

## Objetivo
Fazer com que as taxas de cada Gateway de Pagamento (Pix, Débito, Crédito 1x–21x) sejam usadas corretamente em **todas** as ferramentas de cálculo do sistema, substituindo as taxas globais hardcoded por valores dinâmicos vindos das configurações.

---

## 📊 Diagnóstico Atual

### Onde as taxas são usadas hoje (e o problema):

| Ferramenta | Arquivo | Problema Atual |
|---|---|---|
| **Calculadora de Preços** | `ferramentas/calculadora/page.tsx` | ✅ Corrigido: Usa `useFinanceConfig` e `GatewaySelector` |
| **Cálculo em Massa** | `ferramentas/calculo-em-massa/page.tsx` | ✅ Corrigido: Usa `GatewaySelector` e exibe Pix/Crédito 1x com Breakdown |
| **Importação Pro (iPhone)** | `ferramentas/importacao/page.tsx` | ✅ Corrigido: Usa `GatewaySelector` e calcula custos finais |
| **Configurações** | `configuracoes/page.tsx` | ✅ Já implementado — cada gateway tem Pix, Débito e Crédito 1x–21x |

---

## 🛠️ Hook Compartilhado: `useFinanceConfig`

**Arquivo criado:** `src/hooks/useFinanceConfig.ts`

Este hook será a **fonte única de verdade** para configurações financeiras em todas as ferramentas.

```typescript
// Retorna:
{
  config: FinanceiroConfig | null,
  defaultGateway: PaymentGateway | null,  // gateway com is_default: true
  loading: boolean,
  refresh: () => void
}
```

**Benefício:** Qualquer mudança nas configurações se propaga automaticamente para todas as ferramentas sem duplicar código de fetch.

---

## 📋 Etapas de Implementação

### ETAPA 1 — Criar o Hook `useFinanceConfig`
**Arquivo:** `src/hooks/useFinanceConfig.ts`

- ✅ Busca `configuracoes` do Supabase (chave `financeiro`)
- ✅ Expõe `config`, `defaultGateway` (gateway com `is_default: true`), `loading`
- ✅ Faz migração automática: se o gateway não tiver `taxas_credito`, usa as globais como fallback

---

### ETAPA 2 — Atualizar a Calculadora de Preços
**Arquivo:** `ferramentas/calculadora/page.tsx`
**Novo nome sugerido:** "Precificador Inteligente"

**Mudanças:**
1. ✅ Substituir fetch manual pelo hook `useFinanceConfig`
2. ✅ Adicionar **seletor de Gateway** na interface (dropdown com todos os gateways cadastrados)
3. ✅ Usar `selectedGateway.taxa_pix_pct` em vez de `config.taxa_pix_pct`
4. ✅ Usar `selectedGateway.taxa_debito_pct` em vez de `config.taxa_debito_pct`
5. ✅ Usar `selectedGateway.taxas_credito` na tabela de parcelamento (1x–21x)
6. ✅ Mostrar badge "Gateway Padrão" no seletor

**Cálculo correto:**
```
Preço Pix    = Preço Base / (1 - taxa_pix_pct/100)
Preço Débito = Preço Base / (1 - taxa_debito_pct/100)
Preço Nx     = Preço Base / (1 - taxa_credito_Nx/100)
```

---

### ETAPA 3 — Atualizar o Cálculo em Massa
**Arquivo:** `ferramentas/calculo-em-massa/page.tsx`

**Mudanças:**
1. ✅ Substituir fetch manual pelo hook `useFinanceConfig`
2. ✅ Adicionar **seletor de Gateway** no painel de configuração
3. ✅ Para cada item extraído pelo OCR, calcular:
   - Preço à vista (sem taxa)
   - Preço Pix (com `gateway.taxa_pix_pct`)
   - Preço Débito (com `gateway.taxa_debito_pct`)
   - Preço 1x Crédito (com `gateway.taxas_credito[0].taxa`)
4. ✅ Exibir colunas na tabela de resultados
5. ✅ Implementado Breakdown visual (Tooltips) para Pix e Crédito 1x

---

### ETAPA 4 — Atualizar a Importação Pro (iPhone)
**Arquivo:** `ferramentas/importacao/page.tsx`

**Mudanças:**
1. ✅ Adicionar **seletor de Gateway** no painel de parâmetros (coluna esquerda)
2. ✅ O `precoSugerido` atual não considera taxa de gateway — corrigir:
   ```
   precoSugerido = custoFinalBrl / (1 - margemPadrao/100 - taxa_pix_pct/100)
   ```
3. ✅ Adicionar coluna extra na tabela: **"Venda Pix"** e **"Venda 1x Crédito"**
4. ✅ No resumo do lote, mostrar o preço médio de venda considerando o gateway

---

### ETAPA 5 — Seletor de Gateway Reutilizável
**Arquivo criado:** `src/components/ui/GatewaySelector.tsx`

Componente dropdown reutilizável que:
- ✅ Lista todos os gateways cadastrados
- ✅ Marca o padrão com badge
- ✅ Retorna o gateway selecionado via `onChange`
- ✅ Pode ser usado em todas as ferramentas

---

## 🔄 Fluxo de Dados Final

```
Configurações (Supabase)
    └── useFinanceConfig (hook)
            ├── Calculadora de Preços  → usa gateway selecionado
            ├── Cálculo em Massa       → usa gateway selecionado
            └── Importação Pro         → usa gateway selecionado
```

---

## ✅ Critérios de Conclusão

- [x] Hook `useFinanceConfig` criado e testado
- [x] Componente `GatewaySelector` criado
- [x] Calculadora de Preços usa gateway dinâmico (Pix, Débito, Crédito)
- [x] Cálculo em Massa usa gateway dinâmico
- [x] Importação Pro usa gateway para calcular preço sugerido final
- [x] Todas as ferramentas mostram qual gateway está ativo
- [x] Ao trocar o gateway, todos os preços recalculam instantaneamente

---

## 🚀 Ordem de Execução Recomendada (Concluída 19/02/2026)

1. **ETAPA 1** — Hook (base de tudo) ✅
2. **ETAPA 5** — Componente GatewaySelector (reutilizável) ✅
3. **ETAPA 2** — Calculadora (mais crítica, mais usada) ✅
4. **ETAPA 3** — Cálculo em Massa ✅
5. **ETAPA 4** — Importação Pro ✅

---

*Plano criado em: 2026-02-18 | Concluído em: 2026-02-19*
