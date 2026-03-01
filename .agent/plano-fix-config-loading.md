# Plano de Ação: Configurações Não Carregam Sem F5

## Diagnóstico

As configurações só carregam após F5 (full reload) porque o componente falha ao carregar dados durante a **navegação client-side** do Next.js (clicar no sidebar).

### Causas Raiz Identificadas

| # | Causa | Impacto | Arquivo |
|---|-------|---------|---------|
| 1 | **`loadConfigs` é uma função solta** — não é `useCallback`, então o `useEffect` captura uma versão "stale" (antiga) da função. Quando `profile?.empresa_id` já está disponível antes da montagem (navegação client-side), o efeito roda **mas a referência de `loadConfigs` é um closure antigo** | Dados não são buscados | `configuracoes/page.tsx` |
| 2 | **Cliente Supabase no nível de módulo (`const supabase = createClient()` — linha 37)** — Isso é correto para singleton, mas RLS depende da sessão do cookie. Em navegação client-side a sessão pode não estar sincronizada com o cookie no primeiro render | Dados retornam `[]` ou erro RLS | `configuracoes/page.tsx` |
| 3 | **`useEffect` não tem a função `loadConfigs` como dependência** — React ESLint rules exigem que funções usadas dentro de efeitos sejam incluídas nas dependências ou envolvidas em `useCallback` | Efeito pode não re-executar | `configuracoes/page.tsx` |

### Por Que F5 Funciona?

No F5, o ciclo completo acontece:
1. `isLoading = true` → exibe spinner
2. `AuthContext.onAuthStateChange` dispara → `profile` muda de `null` → `{empresa_id: ...}`
3. O `useEffect` detecta `profile?.empresa_id` mudando de `undefined` para `UUID`
4. `loadConfigs()` é chamado com o closure correto

Na navegação client-side:
1. `isLoading` já é `false` (AuthProvider mantém estado)
2. `profile` **já tem valor** quando o componente monta
3. `profile?.empresa_id` **não muda** — já era o UUID desde o início
4. O `useEffect` roda na montagem, mas `loadConfigs` pode estar com closure stale

## Correções

### Correção 1: Refatorar `loadConfigs` com `useCallback`
```tsx
// ANTES (closure stale)
async function loadConfigs() {
    if (!profile?.empresa_id) return;
    // ...busca dados
}

useEffect(() => {
    if (profile?.empresa_id) {
        loadConfigs();
    }
}, [profile?.empresa_id]); // ❌ loadConfigs não é dependência

// DEPOIS (correto)
const loadConfigs = useCallback(async () => {
    if (!profile?.empresa_id) return;
    // ...busca dados
}, [profile?.empresa_id]);

useEffect(() => {
    loadConfigs();
}, [loadConfigs]); // ✅ re-executa quando loadConfigs muda
```

### Correção 2: Adicionar estado de loading interno
```tsx
const [configsLoaded, setConfigsLoaded] = useState(false);

// Dentro de loadConfigs:
setConfigsLoaded(true);
```

### Correção 3: Log de diagnóstico temporário
Adicionar console.log no useEffect para validar que está sendo executado.

## Checklist de Validação

- [ ] Navegar para outra página e voltar para Configurações (sidebar) → dados carregam
- [ ] Fazer F5 na página de configurações → dados carregam
- [ ] Salvar uma configuração → toast de sucesso aparece
- [ ] Navegar para outra página e voltar → configuração salva persiste

## Status: ✅ IMPLEMENTADO
