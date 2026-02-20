# Plano de Ação: Correção Completa do Setor de Autenticação

## 🔍 Diagnóstico (Auditoria Completa)

### Problemas Encontrados

| # | Problema | Causa Raiz | Severidade |
|:--|:---------|:-----------|:-----------|
| 1 | **Login só funciona em 1 navegador** | Cookies com `Secure: true` em ambiente de desenvolvimento bloqueiam autenticação via HTTP em outros dispositivos/browsers | 🔴 Crítico |
| 2 | **NavigatorLockAcquireTimeoutError** | Múltiplas instâncias do Supabase Client competiam pelo mesmo Navigator Lock, travando toda a autenticação | 🔴 Crítico |
| 3 | **Cadastro não funciona** | Após `signUp`, o Supabase pode exigir confirmação de email mas o sistema redireciona direto para `/dashboard`, causando erro de sessão | 🔴 Crítico |
| 4 | **Esqueci a senha não funciona** | A página `/recuperar-senha` redireciona para `/nova-senha` que **NÃO EXISTIA** — o link quebrava | 🔴 Crítico |
| 5 | **Não há callback route** | Faltava `/auth/callback` — rota obrigatória do Supabase para processar confirmação de email e reset de senha | 🔴 Crítico |
| 6 | **Não é possível deletar usuário** | Não existia API Route para deletar usuários (requer `supabaseAdmin.auth.admin.deleteUser()`) | 🟡 Médio |
| 7 | **Sem tela de confirmação de email** | Após cadastro, não havia feedback visual informando que o email precisa ser confirmado | 🟡 Médio |
| 8 | **Middleware interferia no callback** | O middleware executava `getUser()` ANTES de checar se era rota pública, interferindo no fluxo de callback | 🟡 Médio |
| 9 | **Erros 406/403 desnecessários** | FinanceConfigContext tentava carregar dados do DB mesmo sem sessão ativa | � Menor |

---

## 🚀 Plano de Execução

### Fase 1: Infraestrutura (Rotas Obrigatórias)
1. ✅ Criar rota `/auth/callback` — processa tokens de confirmação e reset
2. ✅ Criar página `/nova-senha` — formulário para redefinir senha
3. ✅ Criar página `/verificar-email` — tela pós-cadastro informando para checar inbox
4. ✅ Atualizar middleware com rotas públicas novas + early return para callback

### Fase 2: Fluxos Corrigidos
5. ✅ **Singleton do Supabase Client** — Corrigir NavigatorLockAcquireTimeoutError
6. ✅ Corrigir `cadastro/page.tsx` — redirecionar para `/verificar-email` + auto-provisionar empresa/perfil após confirmação
7. ✅ Corrigir cookies (Secure/SameSite) em client, middleware e server
8. ✅ Corrigir `recuperar-senha` — redirect para `/auth/callback?next=/nova-senha`
9. ✅ Corrigir login page — mensagens de erro traduzidas + detecção de callback errors
10. ✅ FinanceConfigContext — só carregar dados se houver sessão ativa
11. ✅ Criar API Route para deletar usuário (`/api/auth/delete-user`)

### Fase 2.5: Polimento e Limpeza (Dados Fantasma)
12. ✅ **Remover Dados Mock (Limpeza Profunda)** — Dashboard, Técnicos, **Relatórios (fakes removidos)**, Cliente Detalhes e Sidebar agora mostram dados reais ou estados vazios.
13. ✅ **Correção de Identidade** — Sidebar e Header mostram nome/plano da empresa real via AuthContext.

### Fase 3: Gestão de Usuários
14. Criar UI de gestão de equipe/usuários (convidar, listar, editar permissões)

---
## 📁 Arquivos Criados/Modificados
| Arquivo | Ação |
|:--------|:-----|
| `src/lib/supabase/client.ts` | **Modificado** — Singleton para evitar Navigator Lock timeout |
| `src/middleware.ts` | **Reescrito** — Early return para callback, rotas públicas atualizadas |
| `src/app/auth/callback/route.ts` | **Novo** — Callback handler (confirmação email + reset senha) |
| `src/app/(auth)/nova-senha/page.tsx` | **Novo** — Formulário de nova senha |
| `src/app/(auth)/verificar-email/page.tsx` | **Novo** — Tela de confirmação de email |
| `src/app/api/auth/delete-user/route.ts` | **Novo** — API para deletar usuário |
| `src/app/(auth)/cadastro/page.tsx` | **Modificado** — Fluxo de confirmação de email |
| `src/app/(auth)/login/page.tsx` | **Modificado** — Erros traduzidos, detecção callback errors |
| `src/app/(auth)/recuperar-senha/page.tsx` | **Modificado** — Redirect via callback |
| `src/context/AuthContext.tsx` | **Modificado** — Auto-provisão de empresa/perfil após confirmação |
| `src/context/FinanceConfigContext.tsx` | **Modificado** — Só carrega com sessão ativa |
| `src/lib/supabase/server.ts` | **Modificado** — Cookie options (Secure/SameSite) |

---
**Status:** ✅ Implementado e Verificado (sem NavigatorLockError)
