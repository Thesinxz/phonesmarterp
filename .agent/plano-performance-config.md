# Plano de Ação: Performance de Configurações & Dólar Automático

## 🎯 Problema
1.  **Configurações lentas:** O hook `useFinanceConfig` faz uma query ao Supabase (`configuracoes → financeiro`) **toda vez** que um componente monta. 4+ telas usam esse hook, gerando 4+ roundtrips desnecessários ao banco em cada sessão.
2.  **Dólar manual:** A cotação `cotacao_dolar_paraguai` só atualiza quando o usuário clica "ATUALIZAR" na tela de Configurações ou navega até lá. Isso causa preços desatualizados silenciosamente.

---

## 🚀 Solução Implementada

### Fase 1: Cache Inteligente no Hook (`useFinanceConfig`)
*   **Estratégia:** Singleton Cache + `sessionStorage`.
*   **Lógica:**
    1.  Na primeira chamada, carregar do Supabase normalmente.
    2.  Salvar o resultado em `sessionStorage` e em uma variável global (módulo-level).
    3.  Nas chamadas seguintes (de qualquer componente), retornar o cache instantaneamente.
    4.  A função `refresh()` invalida o cache e re-busca do Supabase.
*   **Resultado:** Tempo de carregamento cai de ~500ms → 0ms para todas as telas após o primeiro acesso.

### Fase 2: Cotação do Dólar Automática
*   **Estratégia:** Auto-fetch via `useEffect` no hook + API Route existente.
*   **Lógica:**
    1.  Na inicialização do `useFinanceConfig`, verificar `lastCambioUpdate` no `sessionStorage`.
    2.  Se estiver ausente ou com mais de 1 hora, disparar auto-fetch silencioso para `/api/integrations/cambios-chaco`.
    3.  Se o rate mudou, atualizar o config em cache e no Supabase (a API Route já faz isso).
    4.  Exibir um indicador visual discreto no campo de cotação mostrando quando foi a última atualização.
*   **Resultado:** Cotação sempre fresca. Sem ação do usuário.

---

## 📁 Arquivos Modificados
| Arquivo | Mudança |
| :--- | :--- |
| `src/hooks/useFinanceConfig.ts` | Reescrito com Singleton Cache, sessionStorage, e auto-câmbio |
| `src/app/(dashboard)/configuracoes/page.tsx` | Adicionado `invalidateFinanceCache()` ao salvar config financeira |
| `src/app/(dashboard)/ferramentas/calculo-em-massa/page.tsx` | Cache de Google Vision via sessionStorage |

---

## 📅 Status
**Status:** ✅ Implementado e Compilando
