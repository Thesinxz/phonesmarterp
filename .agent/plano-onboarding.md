# Plano de Implementação: Onboarding Completo ✅

## Status: IMPLEMENTADO

## Estrutura Final — 7 Passos

| # | Passo | Conteúdo | Salva em |
|---|-------|----------|----------|
| 1 | **CNPJ** | Busca automática via BrasilAPI: Razão Social, Fantasia, Endereço, Município, UF, CEP, Telefone, Email, Cód IBGE | — |
| 2 | **Dados Empresa** | Confirma/edita: Razão Social, Fantasia, IE, CRT, Telefone, Email, Endereço Completo | `nfe_emitente` + `empresas` |
| 3 | **Fiscal** | Ambiente (Homologação/Produção), Upload Certificado A1 (.pfx), Senha, CSC, CSC ID | `nfe_emitente` + `nfe_certificado` |
| 4 | **Categorias** | Taxa NF%, Câmbio USD/PY, Categorias (Nome, Tipo Margem, Margem, Garantia, NF obrigatória) | `financeiro` |
| 5 | **Pagamento** | Gateways: Nome, Taxa Pix%, Débito%, Tabela Crédito 1x-21x | `financeiro` |
| 6 | **APIs** | WhatsApp Business (Token, Phone ID, Templates, Toggle), Google Vision (API Key, Toggle) | `whatsapp` + `google_vision` |
| 7 | **Conclusão** | Resumo de tudo configurado + "Finalizar" | `system_onboarding.completed = true` |

## Arquitetura

- **Componente:** `src/components/onboarding/OnboardingWizard.tsx`
- **Hook de estado:** `src/hooks/useOnboardingStatus.ts`
- **Persistência:** tabela `configuracoes` (chave `system_onboarding`)
- **Save via RPC:** função `upsert_config` (mesma usada em Configurações)
- **Integrado em:** `src/app/(dashboard)/dashboard/page.tsx`
- **Trigger:** Aparece se `system_onboarding.completed === false`

## Notas

- Passos 3-6 podem ser "Pulados" (botão Pular)
- Passo 1 não exige dados — dá para avançar sem CNPJ
- Cada avanço salva dados automaticamente
- Reset via SQL: `DELETE FROM configuracoes WHERE chave = 'system_onboarding';`
- Reset via UI: `/ferramentas/reset-dev`
