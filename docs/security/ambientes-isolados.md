# Separação de Ambientes (Staging vs Produção) — SmartOS ERP

Conforme as **Regras 23 e 24**, nunca teste em produção e nunca deixe webhooks de teste tocarem dados reais.

## 1. Topologia Recomendada
- **Produção**: URL `smartos.com.br`, Projeto Supabase `SmartOS_Prod`.
- **Staging (Teste)**: URL `staging.smartos.com.br` (via Vercel Preview), Projeto Supabase `SmartOS_Staging`.

## 2. Isolamento de Webhooks (EfíBank / Stripe)
Ao configurar Webhooks no ambiente de Staging (Sandbox):
- Use endpoints exclusivos: `https://staging.smartos.com.br/api/efibank/webhook`.
- Nunca use chaves de produção (Live Keys) no ambiente de teste.
- Verifique o payload: Webhooks de teste devem ter flags como `test_mode: true`.

## 3. Variáveis de Ambiente
Sempre utilize o arquivo `.env.local` apenas para desenvolvimento local. Para o servidor:
- Configure no **Vercel** diferentes valores para as chaves (Prod vs Preview).
- Chaves sensíveis (`SERVICE_ROLE`) de produção **nunca** devem ser acessíveis por desenvolvedores temporários.

## 4. Webhooks Internos
Webhooks que tocam sistemas de terceiros (disparo de WhatsApp, NF-e) devem ser silenciados em Staging através de um mock provider:

```typescript
// Exemplo em src/services/whatsapp.ts
if (process.env.NODE_ENV !== 'production') {
    logger.log("[MOCK] Disparo de WhatsApp silenciado em Staging");
    return { success: true, message: "Mocked" };
}
```

---

> [!WARNING]
> Nunca "force" um webhook de produção a disparar para uma URL de staging manualmente. Isso pode causar duplicação de saldo ou transações fantasmas.
