# 🏷️ Plano de Ação: Categorias nos Produtos + Precificação Automática

## Objetivo
Adicionar a coluna `categoria` à tabela `produtos`, vinculando cada produto a uma **CategoriaMargin** já configurada em `Configurações > Margens & Taxas`. Isso permite que o sistema calcule automaticamente:
- **Preço de venda** baseado na margem da categoria
- **Preço Pix** (com desconto do gateway)
- **Preço Parcelado** (com acréscimo do gateway)
- **NF obrigatória** (por categoria)
- **Garantia padrão** (por categoria)

---

## 📊 Contexto Atual

### Categorias já existentes (em `configuracoes.financeiro`):
```typescript
interface CategoriaMargin {
    nome: string;              // "Smartphone", "Peça", "Acessório"
    margem_padrao: number;     // Ex: 25 (= 25%)
    tipo_margem: "porcentagem" | "fixo";
    garantia_padrao_dias: number;
    nf_obrigatoria: boolean;
}
```

### Problemas atuais:
| Problema | Impacto |
|----------|---------|
| Produto não tem `categoria` | Impossível aplicar margem automaticamente |
| Preço de venda é digitado manualmente | Risco de precificar errado |
| PDV não mostra Pix/Débito/Crédito | Vendedor não sabe o preço por forma de pagamento |
| Vitrine pública usa `preco_venda_centavos` bruto | Não reflete desconto Pix real |
| Importação em massa falha ao tentar salvar categoria | Bug já corrigido (campo removido) |

---

## 🏗️ Arquitetura

```
configuracoes.financeiro
    ├── categorias: CategoriaMargin[]
    │   ├── "Smartphone"  → margem 25%, NF: sim
    │   ├── "Peça"        → margem 40%, NF: não
    │   └── "Acessório"   → margem 50%, NF: não
    │
    └── gateways: PaymentGateway[]
            └── "Status Pay" → pix: 1.5%, débito: 2%, crédito: [1x=3%, 2x=4%...]

produtos
    ├── nome: "iPhone 15 Pro 256GB"
    ├── categoria: "Smartphone"  ← NOVO CAMPO
    ├── preco_custo_centavos: 400000  (R$ 4.000)
    ├── preco_venda_centavos: 550000  (R$ 5.500 — calculado automaticamente)
    └── (calculados em tempo real no PDV/Vitrine):
        ├── preço Pix:    R$ 5.500 (sem taxa)
        ├── preço Débito:  R$ 5.612 (+ 2% gateway)
        └── preço 12x:     R$ 539,90/mês (+ taxa crédito)
```

---

## 📋 Etapas de Implementação

### ETAPA 1 — Migração SQL: Adicionar coluna `categoria`
**Arquivo:** `supabase/migrations/016_add_produto_categoria.sql`

```sql
-- Adicionar coluna categoria à tabela produtos
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS categoria TEXT DEFAULT NULL;

-- Índice para busca rápida por categoria
CREATE INDEX IF NOT EXISTS idx_produtos_categoria ON produtos(empresa_id, categoria);
```

**Tipo atualizado em:** `src/types/database.ts` → tabela `produtos`:
```typescript
categoria: string | null; // "Smartphone", "Peça", "Acessório", etc.
```

### ETAPA 2 — Formulário de Produto (Estoque Novo/Editar)
**Arquivos:** `estoque/novo/page.tsx` e `estoque/[id]/page.tsx`

Mudanças:
1. Carregar categorias de `configuracoes.financeiro.categorias[]`
2. Adicionar **Select de Categoria** no formulário
3. Quando o usuário seleciona categoria + digita custo:
   - Auto-calcular `preco_venda_centavos` usando `calculateReverseMarkup()`
   - Preencher **garantia padrão** automaticamente
   - Marcar se **NF obrigatória**
4. Permitir sobrescrever o preço de venda manualmente (mas mostrar aviso)

### ETAPA 3 — Função utilitária: `calculateProductPrices()`
**Arquivo:** `src/utils/product-pricing.ts`

Função centralizada que recebe um produto + config financeira e retorna todos os preços:

```typescript
interface ProductPrices {
    precoBase: number;           // centavos — preço sem taxa
    precoPix: number;            // centavos — preço Pix (base, sem acréscimo)
    precoDebito: number;         // centavos — com taxa débito
    parcelas: {
        qtd: number;
        valorParcela: number;    // centavos
        valorTotal: number;      // centavos
        taxa: number;            // %
    }[];
    margem: {
        valor: number;           // centavos
        percentual: number;      // %
    };
    imposto: number;             // centavos
    nfObrigatoria: boolean;
    garantiaDias: number;
}

function calculateProductPrices(
    produto: { preco_custo_centavos: number; preco_venda_centavos: number; categoria: string | null },
    config: FinanceiroConfig,
    gateway: PaymentGateway
): ProductPrices
```

### ETAPA 4 — PDV: Preços por Forma de Pagamento
**Arquivo:** `pdv/page.tsx`

No carrinho do PDV, além do preço base:
- Mostrar **Preço Pix** (verde) ao lado do total
- Mostrar **Preço Débito** ao lado
- Ao selecionar forma de pagamento (Pix/Débito/Crédito), o total ajusta automaticamente
- Breakdown visual: "Imposto: R$ X | Taxa Gateway: R$ Y | Lucro: R$ Z"

### ETAPA 5 — Estoque: Mostrar Categoria + Preço por Forma
**Arquivo:** `estoque/page.tsx`

Na tabela de estoque:
1. Adicionar coluna **Categoria** com badge colorido
2. Adicionar tooltip no preço mostrando "Pix: R$ X | Débito: R$ Y | 12x: R$ Z/mês"
3. Filtro por categoria

### ETAPA 6 — Importação em Massa: Categoria nos Produtos
**Arquivo:** `ferramentas/calculo-em-massa/page.tsx`

Ao importar para o estoque:
1. O campo `categoria` do OCR já existe no item
2. Agora será salvo corretamente na coluna `categoria` (após migração)
3. O `preco_venda_centavos` será calculado automaticamente pela margem da categoria

### ETAPA 7 — Vitrine: Preços Inteligentes
**Arquivo:** `api/vitrine/[subdominio]/produtos/route.ts`

A vitrine já calcula Pix/parcelas. Com a categoria:
1. Produtos podem ser filtrados por categoria na vitrine
2. Badge de categoria no card (se habilitado)
3. Garantia exibida: "90 dias de garantia" (vindo da categoria)

---

## 🔄 Fluxo Completo de Venda

```
1. CUSTO: Produto entra no estoque → custo R$ 4.000
   ↓
2. CATEGORIA: "Smartphone" → margem 25%, imposto 4%
   ↓
3. PREÇO BASE: R$ 4.000 / (1 - 0.25 - 0.04 - 0.015) = R$ 5.714
   ↓ (usando gateway "Status Pay")
4. PIX:     R$ 5.714 (sem taxa — preço base)
   DÉBITO:  R$ 5.714 / (1 - 0.02) = R$ 5.831
   1x:      R$ 5.714 / (1 - 0.03) = R$ 5.891
   12x:     R$ 5.714 / (1 - 0.12) = R$ 6.493 → R$ 541,12/mês
   ↓
5. VENDA: Cliente escolhe 12x → total R$ 6.493
   ↓
6. LUCRO: R$ 6.493 - R$ 4.000 - R$ 260 (imposto) - R$ 779 (taxa 12x) = R$ 1.454
```

---

## 📁 Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `supabase/migrations/016_add_produto_categoria.sql` | CRIAR | Migração SQL |
| `src/types/database.ts` | MODIFICAR | Adicionar `categoria` em produtos |
| `src/utils/product-pricing.ts` | CRIAR | Função centralizada de cálculo |
| `src/app/(dashboard)/estoque/novo/page.tsx` | MODIFICAR | Select de categoria + auto-preço |
| `src/app/(dashboard)/estoque/[id]/page.tsx` | MODIFICAR | Select de categoria no editar |
| `src/app/(dashboard)/estoque/page.tsx` | MODIFICAR | Coluna categoria + filtro |
| `src/app/(dashboard)/pdv/page.tsx` | MODIFICAR | Preços por forma de pagamento |
| `src/app/(dashboard)/ferramentas/calculo-em-massa/page.tsx` | MODIFICAR | Salvar categoria na coluna |
| `src/app/api/vitrine/[subdominio]/produtos/route.ts` | MODIFICAR | Filtro por categoria |

---

## ✅ Critérios de Conclusão

- [ ] Coluna `categoria` existe na tabela `produtos`
- [ ] Formulário de produto tem select de categoria
- [ ] Ao selecionar categoria + custo → preço auto-calculado
- [ ] PDV mostra preço Pix/Débito/Crédito ao lado do total
- [ ] Estoque exibe categoria com badge e filtro
- [ ] Importação em massa salva categoria corretamente
- [ ] Vitrine filtra por categoria
- [ ] `calculateProductPrices()` é a fonte única de cálculo

---

## 🚀 Ordem de Execução

1. **ETAPA 1** — Migração SQL (base do banco) ✅
2. **ETAPA 3** — Função utilitária (base do código) ✅
3. **ETAPA 2** — Formulário de produto (cadastro) ✅
4. **ETAPA 6** — Importação em massa (correção) ✅
5. **ETAPA 5** — Estoque visual (UX) ✅
6. **ETAPA 4** — PDV com preços dinâmicos (vendas) ✅
7. **ETAPA 7** — Vitrine com categorias (público) ✅

---

*Plano criado em: 2026-02-19*

## Status: ✅ CONCLUÍDO (Todas as etapas finalizadas!)
