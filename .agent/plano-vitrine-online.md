# 🛍️ Plano de Ação: Vitrine Online + Modo TV

## Objetivo
Criar uma vitrine pública onde clientes possam navegar pelos produtos da loja, ver preços **à vista** (Pix) e **parcelados** (crédito 1x–21x) com cálculo automático baseado nas taxas do gateway configurado. Inclui um **Modo TV** otimizado para telas grandes (televisores na loja).

---

## 📊 Contexto Técnico (do sistema atual)

| Item | Detalhes |
|------|----------|
| **Produto** | `produtos` — nome, preco_venda_centavos, grade (A/B/C), cor, capacidade, imei, estoque_qtd |
| **Taxas** | `configuracoes.financeiro` → gateways[].taxa_pix_pct, taxa_debito_pct, taxas_credito[1-21] |
| **Imposto** | `configuracoes.financeiro.taxa_nota_fiscal_pct` |
| **Pricing Engine** | `src/utils/pricing.ts` — calculateReverseMarkup() |
| **Empresa** | `empresas` — nome, logo_url, subdominio |

---

## 🏗️ Arquitetura

```
                       ┌──────────────────────────────────────┐
                       │     API Route (Server-Side)          │
                       │  /api/vitrine/[subdominio]/produtos  │
                       │  - Busca produtos com estoque > 0    │
                       │  - Busca gateway padrão (taxas)      │
                       │  - Calcula preços Pix + Parcelado    │
                       │  - NÃO expõe preço de custo          │
                       └──────────────┬───────────────────────┘
                                      │ JSON público
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                  ▼
           ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
           │ Vitrine Web  │  │   Modo TV    │  │  WhatsApp    │
           │ /v/[slug]    │  │ /v/[slug]/tv │  │  Link Share  │
           │ Responsivo   │  │ Auto-scroll  │  │  Catálogo    │
           └──────────────┘  └──────────────┘  └──────────────┘
```

### Rota Pública (sem autenticação):
- `/v/[subdominio]` → Vitrine responsiva (mobile + desktop)
- `/v/[subdominio]/tv` → Modo TV (fullscreen, auto-scroll)
- `/v/[subdominio]/produto/[id]` → Detalhe do produto (futuro)

---

## 📋 Etapas de Implementação

### ETAPA 1 — API de Produtos Públicos
**Arquivo:** `src/app/api/vitrine/[subdominio]/produtos/route.ts`

Cria uma API pública (sem auth) que:
1. Busca a empresa pelo `subdominio`
2. Busca produtos da empresa com `estoque_qtd > 0`
3. Busca `configuracoes` (chave `financeiro`) usando `supabaseAdmin` (service role)
4. Calcula os preços de exibição:
   - **Preço à Vista (Pix):** `preco_venda_centavos` (já é o preço final)
   - **Preço Parcelado:** Para cada parcela N de 1x a 12x:
     ```
     taxa = gateway_padrao.taxas_credito[N-1].taxa
     preco_parcela = preco_venda / (1 - taxa/100) / N
     preco_total_parcelado = preco_parcela * N
     ```
5. **NÃO retorna:** preco_custo_centavos, fornecedor_id, imei
6. Retorna JSON com lista de produtos públicos

```typescript
interface ProdutoVitrine {
    id: string;
    nome: string;
    cor: string | null;
    capacidade: string | null;
    grade: "A" | "B" | "C" | null;
    estoque_disponivel: boolean; // true/false (sem quantidade exata)
    preco_pix: number;          // centavos
    preco_debito: number;       // centavos
    parcelas: {
        qtd: number;            // 1-12
        valor_parcela: number;  // centavos
        valor_total: number;    // centavos
    }[];
    imagem_url: string | null;  // futuro
}
```

### ETAPA 2 — Página da Vitrine (Responsiva)
**Arquivo:** `src/app/v/[subdominio]/page.tsx`

Layout público (fora do dashboard, sem sidebar):

**Header:**
- Logo da empresa (se tiver) + Nome da loja
- Barra de busca
- Filtros: Grade (A/B/C), Categoria, Faixa de preço

**Grid de Produtos:**
- Cards com design premium (glassmorphism, gradientes)
- Cada card mostra:
  - Nome do produto + Badge Grade (A/B/C)
  - Cor + Capacidade
  - 💰 **Preço à vista (Pix)** em destaque verde (maior)
  - 💳 **Preço parcelado** em destaque menor (ex: "12x de R$ 199,90")
  - Badge "Em estoque" / "Últimas unidades"
- Grid: 2 colunas (mobile), 3 colunas (tablet), 4 colunas (desktop)
- Animação de entrada escalonada (stagger)

**Footer:**
- WhatsApp da loja (link direto)
- Endereço
- "Powered by SmartOS"

### ETAPA 3 — Modo TV 📺
**Arquivo:** `src/app/v/[subdominio]/tv/page.tsx`

Versão otimizada para televisores na loja:

**Características:**
- **Fullscreen** automático (sem barra de endereço)
- **Auto-scroll vertical** — desce lentamente mostrando todos os produtos
- Quando chega ao final, volta ao topo suavemente (loop infinito)
- **Font sizes grandes** — legível a 3+ metros de distância
- **Sem interação** — apenas visualização (sem busca, filtros, etc.)
- **Dark mode forçado** — melhor para TV

**Layout:**
- Header fixo: Logo + Nome da Loja + Data/Hora atual
- Grid grande: 3 colunas com cards maiores
- Cada card:
  - Nome em `text-3xl`
  - Preço Pix em `text-5xl font-black text-emerald-400`
  - Parcela em `text-2xl text-blue-300`
  - Grade badge grande
- Auto-refresh dos dados a cada 5 minutos (produtos novos aparecem)

**Controles (teclado):**
- `Space` → Pausar/Retomar scroll
- `F` → Fullscreen
- `+/-` → Velocidade do scroll
- `ESC` → Sair do fullscreen

### ETAPA 4 — Configuração da Vitrine no Painel Admin
**Arquivo:** Adicionar nova tab em `configuracoes/page.tsx`

Nova aba "Vitrine Online" nas configurações:
- **Toggle:** Vitrine pública ativa/desativa
- **URL pública:** Link copiável `seusite.com/v/minhaloja`
- **QR Code:** Gerar QR Code com a URL da vitrine
- **Personalização:**
  - Cor tema (usa brand color)
  - Título da vitrine (ex: "Ofertas da Semana")
  - Mensagem de WhatsApp (pré-configurada)
  - Mostrar grade? (sim/não)
  - Máx. parcelas exibidas (3x, 6x, 10x, 12x)
  - Produtos em destaque (marcar quais aparecem primeiro)
- **Link do Modo TV:** URL separada + botão "Abrir em nova aba"
- Salva em: `configuracoes` chave `vitrine`

### ETAPA 5 — Layout Público
**Arquivo:** `src/app/v/layout.tsx`

Layout dedicado para rotas públicas `/v/`:
- Sem sidebar, sem header do dashboard
- Sem autenticação necessária
- Meta tags para SEO e compartilhamento (Open Graph)
- Fonte Inter (Google Fonts)
- Responsivo desde mobile até 4K TV

---

## 🎨 Design da Vitrine

### Mobile (Card Compacto):
```
┌─────────────────────────┐
│  iPhone 15 Pro Max      │
│  256GB • Azul • Grade A │
│                         │
│  💰 R$ 5.499,00         │  ← verde, grande, negrito
│     à vista no Pix      │
│                         │
│  💳 12x R$ 499,90       │  ← azul, menor
│     sem juros*          │
│                         │
│  ● Em estoque           │  ← badge verde
└─────────────────────────┘
```

### TV (Card Grande):
```
┌─────────────────────────────────┐
│                                 │
│   iPhone 15 Pro Max             │  ← text-3xl
│   256GB • Azul                  │
│                                 │
│   ┌─────────┐  ┌──────────┐    │
│   │  GRADE  │  │ ESTOQUE  │    │
│   │    A    │  │    ✓     │    │
│   └─────────┘  └──────────┘    │
│                                 │
│   R$ 5.499                      │  ← text-5xl emerald
│   À VISTA NO PIX                │
│                                 │
│   ou 12x de R$ 499,90           │  ← text-2xl blue
│                                 │
└─────────────────────────────────┘
```

---

## 🔐 Segurança

| Aspecto | Abordagem |
|---------|-----------|
| **Preço de custo** | NUNCA exposto na API pública |
| **IMEI** | NUNCA exposto na API pública |
| **Fornecedor** | NUNCA exposto |
| **Quantidade exata** | Só "em estoque" ou "últimas unidades" |
| **Rate Limiting** | Limitar API a 60 req/min por IP |
| **Empresa** | Validar subdomínio antes de retornar dados |

---

## 📁 Estrutura de Arquivos

```
src/
├── app/
│   ├── v/                              ← NOVO: Rotas públicas
│   │   ├── layout.tsx                  ← Layout público (sem auth)
│   │   └── [subdominio]/
│   │       ├── page.tsx                ← Vitrine responsiva
│   │       └── tv/
│   │           └── page.tsx            ← Modo TV
│   └── api/
│       └── vitrine/
│           └── [subdominio]/
│               └── produtos/
│                   └── route.ts        ← API pública de produtos
├── components/
│   └── vitrine/
│       ├── ProdutoCard.tsx             ← Card de produto
│       ├── ProdutoCardTV.tsx           ← Card modo TV (maior)
│       ├── VitrineHeader.tsx           ← Header público
│       └── TVAutoScroll.tsx            ← Lógica de auto-scroll
└── types/
    └── vitrine.ts                      ← ProdutoVitrine interface
```

---

## ✅ Critérios de Conclusão

- [ ] API `/api/vitrine/[subdominio]/produtos` retorna produtos com preços calculados
- [ ] Página `/v/[subdominio]` mostra grid de produtos responsivo
- [ ] Preço à vista (Pix) e parcelado exibidos corretamente
- [ ] Modo TV com auto-scroll, dark mode, fontes grandes
- [ ] Modo TV com loop infinito e refresh automático
- [ ] Configuração de vitrine no painel admin
- [ ] QR Code gerado para link da vitrine
- [ ] Design premium (glassmorphism, gradientes, animações)
- [ ] Segurança: custo, IMEI, fornecedor nunca expostos
- [ ] Responsivo: mobile, tablet, desktop, TV

---

## 🚀 Ordem de Execução Recomendada

1. **ETAPA 5** — Layout público (base de tudo) ✅
2. **ETAPA 1** — API de produtos (dados) ✅
3. **ETAPA 2** — Vitrine responsiva (visual principal) ✅
4. **ETAPA 3** — Modo TV (diferencial) ✅
5. **ETAPA 4** — Configuração no painel admin ✅

---

*Plano criado em: 2026-02-19 | Concluído em: 2026-02-19*

## Status: ✅ IMPLEMENTADO

### URLs de teste:
- **Vitrine:** `http://localhost:3000/v/minhaloja`
- **Modo TV:** `http://localhost:3000/v/minhaloja/tv`
- **Config:** `http://localhost:3000/configuracoes` → tab "Vitrine Online"
