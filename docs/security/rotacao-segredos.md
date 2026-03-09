# Guia de Rotação de Segredos — SmartOS ERP

Para cumprir a **Regra 04** de segurança, todos os segredos e chaves de API devem ser rotacionados a cada **90 dias**, ou imediatamente em caso de suspeita de vazamento.

## Lista de Segredos para Rotação

| Serviço | Variáveis de Ambiente | Onde Gerar |
|---|---|---|
| **Supabase** | `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Dashboard Supabase > Settings > API |
| **Stripe** | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Dashboard Stripe > Developers > API Keys / Webhooks |
| **Gemini AI** | `GEMINI_API_KEY` | Google AI Studio |
| **EfíBank** | `EFIBANK_CLIENT_ID`, `EFIBANK_CLIENT_SECRET`, `EFIBANK_WEBHOOK_SECRET` | Dashboard Efí > API > Aplicações |
| **Vercel** | `CRON_SECRET` | Vercel Dashboard > Settings > Environment Variables |

---

## Procedimento de Rotação

### 1. Gerar novos valores
Acesse o painel de cada serviço e gere uma nova chave. **Não delete a chave antiga imediatamente** se o serviço permitir múltiplas chaves (ex: Stripe), para evitar downtime.

### 2. Atualizar Vercel (Produção)
1. Acesse o **Dashboard da Vercel** > Projeto > **Settings** > **Environment Variables**.
2. Edite os valores das chaves correspondentes.
3. Clique em **Save**.
4. **Importante**: Acione um novo Deploy para as mudanças entrarem em vigor.

### 3. Atualizar Ambiente Local
1. Atualize o arquivo `.env.local` na máquina de desenvolvimento.
2. Informe à equipe de desenvolvimento sobre a rotação.

### 4. Revogar chaves antigas
Após confirmar que o sistema está funcionando com as novas chaves (verificar Logs na Vercel), revogue/delete as chaves antigas nos respectivos dashboards.

---

## Calendário de Rotação

| Data Inicial | Próxima Rotação | Responsável | Status |
|---|---|---|---|
| 09/03/2026 | 07/06/2026 | Admin | Em dia |
