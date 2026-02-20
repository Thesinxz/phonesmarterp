---
description: Plano de Ação - Onboarding Inicial e Configuração do APP
---

# 🚀 Plano de Ação: Onboarding & Configuração Inicial

Este documento descreve o fluxo de boas-vindas e configuração guiada (Wizard) para novos usuários após a criação da conta.

## Objetivo
Garantir que o usuário configure os **4 pilares essenciais** para o funcionamento do sistema (Empresa, Fiscal, Certificado e Financeiro) de forma intuitiva e sem atritos.

---

## 🏗️ Estrutura do Onboarding (Wizard)

O Onboarding será um modal de **tela cheia ou passo-a-passo** que bloqueia o uso parcial do sistema até que o básico esteja configurado.

### 📍 Passo 1: Boas-vindas & Dados da Empresa
**Objetivo:** Identificar quem está usando o sistema.
- **Visual:** "Bem-vindo ao SmartOS! Vamos configurar sua loja."
- **Ação:**
    - Campo único de **CNPJ** com busca automática (já implementado na config).
    - Ao encontrar, preenche: Razão Social, Fantasia, Endereço e Telefone.
    - Se não tiver CNPJ, botão "Configurar como Pessoa Física/Autônomo" (configura CPF).
- **Botão:** "Tudo certo, continuar →"

### 📍 Passo 2: Configuração Fiscal (Simplificada)
**Objetivo:** Definir se vai emitir nota agora ou depois.
- **Pergunta:** "Você deseja emitir notas fiscais pelo sistema agora?"
    - [ ] **Sim, quero emitir NFe/NFCe** (Habilita abas fiscais).
    - [ ] **Não, apenas controle interno** (Esconde/Desabilita abas fiscais por enquanto e marca ambiente como 'homologacao').
- **Se Sim:**
    - Pergunta: "Qual seu regime tributário?" (Simples Nacional vs Normal).
    - Upload do **Certificado A1** (Arrastar e soltar .pfx + Senha).
    - Validação imediata do certificado (testar senha).

### 📍 Passo 3: Financeiro Básico
**Objetivo:** Configurar como o usuário cobra.
- **Taxas de Cartão (Opcional):**
    - "Você usa maquininha?" -> Input rápido das taxas principais (Débito e Crédito 1x/12x).
    - Botão "Pular e usar taxas padrão (0%)".
- **Margem Padrão:**
    - "Qual sua margem de lucro ideal?" (Ex: 30%, 50%, 100%).
    - Define a margem padrão das categorias.

### 📍 Passo 4: Conclusão
**Objetivo:** Levar ao Dashboard com dados.
- **Resumo:** "Pronto! Sua loja [Nome Fantasia] está configurada."
- **Call to Action (CTA):**
    - [Criar primeira Venda]
    - [Cadastrar primeiro Produto]
    - [Ir para Dashboard]

---

## 🛠️ Detalhes Técnicos de Implementação

1. **Estado do Onboarding:**
   - Adicionar flag na tabela `empresas` ou `usuarios`: `onboarding_concluido (boolean)`.
   - Se `false`, redirecionar `/dashboard` para `/onboarding`.

2. **Componentes Novos:**
   - `src/app/(dashboard)/onboarding/page.tsx`: Página principal do wizard.
   - `src/components/onboarding/StepEmpresa.tsx`
   - `src/components/onboarding/StepFiscal.tsx`
   - `src/components/onboarding/StepFinanceiro.tsx`

3. **Integrações:**
   - Reutilizar a função `buscarCnpj` criada nas configurações.
   - Reutilizar `upsert_config` para salvar os passos individualmente.

## 📅 Roadmap Sugerido

| Etapa | Tarefa | Complexidade |
| :--- | :--- | :--- |
| **1** | Criar rota `/onboarding` e lógica de redirecionamento | Baixa |
| **2** | Implementar Step 1 (CNPJ Automático) | Média |
| **3** | Implementar Step 2 (Certificado + Fiscal) | Alta |
| **4** | Implementar Step 3 (Financeiro Rápido) | Baixa |
| **5** | Tela de Sucesso e liberação do acesso | Baixa |

---

## ✅ Próximos Passos (Imediato)
1. Aprovar este plano.
2. Iniciar criação da estrutura de pastas em `src/app/(dashboard)/onboarding`.
