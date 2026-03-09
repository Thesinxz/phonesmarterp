# Guia de Backups e Recuperação — SmartOS ERP

Seguindo a **Regra 22**, um sistema sem backup testado é um sistema vulnerável. No SmartOS (Supabase), utilizamos uma estratégia híbrida.

## 1. Backups Automáticos (Infraestrutura)
O Supabase realiza backups diários automáticos da instância (PostgreSQL e Storage) para contas Pro.
- **Frequência**: Diária.
- **Retenção**: 7 dias (Starter) a 30 dias (Enterprise).
- **Recuperação**: Painel Supabase > Database > Backups > Restore Database.

## 2. Backup Manual (SQL Export)
Para segurança extra (exportação local), recomendamos um dump semanal via CLI.

**Pré-requisito**: [Supabase CLI](https://supabase.com/docs/guides/cli) instalado.

```bash
# Exportar esquema e dados para arquivo local
supabase db dump --db-url "postgres://postgres:[SENHA_DB]@aws-0-sa-east-1.pooler.supabase.com:5432/postgres" > backup_$(date +%F).sql
```

## 3. Teste de Restauração (Trimestral)
**CRÍTICO**: Não confie que o backup funciona sem testar.
1. Crie um projeto Supabase temporário (Sandbox).
2. Aplique o dump mais recente:
   ```bash
   psql -h aws-0-sa-east-1.pooler.supabase.com -U postgres -d postgres -f backup_v8.sql
   ```
3. Verifique se as tabelas de `usuarios`, `clientes` e `vendas` estão íntegras.

## 4. Backups de Arquivos (Storage)
Os buckets `produtos` e `logos` devem ser replicados para um bucket frio (S3/Glacier) se o volume de mídias for crítico para o negócio.

---

| Próximo Teste de Restauração | Responsável | Status |
|---|---|---|
| 01/06/2026 | Técnico Responsável | Pendente |
