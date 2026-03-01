# Configuração Fiscal (NFC-e) - Phone Smart ERP

Este módulo permite a emissão de Nota Fiscal de Consumidor Eletrônica (NFC-e) diretamente pelo sistema.

## 🚀 Passos para Configuração

### 1. Banco de Dados
Certifique-se de que as migrations foram aplicadas no Supabase.
- `supabase/migrations/008_integrations_config.sql`: Cria tabela de configurações.
- `supabase/migrations/009_produtos_fiscais.sql`: Adiciona NCM/CFOP aos produtos.

### 2. Dependências do Sistema (Obrigatório)
A biblioteca de assinatura digital (`node-sped-nfe`) requer `openssl` e `xmllint` instalados no sistema operacional.

**MacOS:**
```bash
brew install openssl libxml2
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install openssl libxml2-utils
```

**Windows:**
Necessário instalar OpenSSL e adicionar ao PATH. Recomenda-se usar WSL.

### 3. Configuração no ERP
1. Acesse o menu **Configurações**.
2. Na aba **Dados da Empresa**, preencha CNPJ, IE e Endereço completos.
3. Na aba **Certificado Digital**, faça upload do arquivo `.pfx` (A1) e digite a senha.
4. Insira o **CSC (Token)** e **CSC ID** fornecidos pela SEFAZ (para homologação, pegue no site da SEFAZ do seu estado).
5. Na aba **Configuração Fiscal**, verifique se o status da SEFAZ está "Online".

### 4. Produtos
Ao cadastrar produtos, preencha:
- **NCM**: Obrigatório (Ex: 8517.12.31 para celulares).
- **CFOP**: Obrigatório (Ex: 5102 para venda mercadoria adquirida).
- **Origem**: 0 (Nacional) ou 1/2 (Importado).

## 🧪 Testes
O sistema vem configurado por padrão em **Homologação**. As notas emitidas não têm validade fiscal mas validam a integração.
Após testar, mude para **Produção** na tela de Configurações.
