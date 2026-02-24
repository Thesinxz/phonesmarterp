# Plano de Ação: Módulo Fiscal (SmartOS ERP)

Este é o planejamento detalhado para a implementação do módulo fiscal completo, abordando emissão e gestão de documentos (NF-e, NFC-e, NFS-e) e o controle de notas de entrada (Manifestação e Importação).

---

## 🏛 1. Arquitetura e Decisões Técnicas

A emissão fiscal será controlada por uma **API Fiscal Própria** que está sendo desenvolvida paralelamente. 
Portanto, o escopo do ERP SmartOS neste momento é desenvolver o **Frontend Totalmente Funcional** e a estrutura de Banco de Dados local para preparar, validar e armazenar as notas, deixando os "ganchos" (endpoints internos) prontos para a futura comunicação com essa API proprietária.

- **Foco do ERP**: UX impecável, validação de regras de negócio (NCM, CFOP, CSOSN tributário), cálculos prévios de impostos, e telas de gerenciamento de estado (Pendente, Autorizada, Rejeitada).
- **Sem integrações de terceiros**: Não usaremos Focus NFe ou Webmania. O payload JSON final será estruturado e enviado para a nossa própria infraestrutura.

---

## 🏗 2. Fases de Implementação (Frontend & Banco de Dados)

### Fase 1: Infraestrutura e Configurações Fiscais (Backend/DB)
Antes de emitir qualquer nota, as empresas precisam configurar os dados fiscais.
* **Banco de Dados**: 
  * Criar tabela `configuracoes_fiscais` (Dados de tributação, Regime, Alíquotas Padrão).
  * Criar tabela `documentos_fiscais` para centralizar dados de NF-e, NFC-e e NFS-e gerados.
  * Atualizar a tabela de `produtos` com NCM, CEST, CFOP e Origem, CST/CSOSN.
  * Atualizar a tabela de `clientes` com Inscrição Estadual e Indicador de IE.
* **Interface (UI)**:
  * Criar *Página de Configurações Fiscais* (Upload do Certificado Digital .pfx/Senha - que será salvo seguro para a API própria usar, Ambiente Homologação/Produção).
  * Criar painel de *Regras de Tributação* (Tributação por Estado, Natureza da Operação).

### Fase 2: NF-e (Modelo 55 - Compra/Venda)
Emissão de notas fiscais de prancheta, geralmente usadas para B2B (empresas) ou envio de mercadorias.
* **Interface**:
  * Tela: `fiscal/nfe` (Listagem com abas: Formulário, Pendentes, Autorizadas, Rejeitadas, Canceladas).
  * Tela: `fiscal/nfe/nova` (Formulário **completo** de emissão avulsa, interface para adicionar Itens, Transportadora, Volumes, Pagamento).
* **Funcionalidade Frontend**:
  * Lógica visual completa de montagem do objeto da Nota e botão "Transmitir" que enviará para nosso placeholder de API.
  * Viewers de PDF pré-prontos (DANFE) e opções de Carta de Correção.

### Fase 3: NFC-e (Modelo 65 - Consumidor Final)
O cupom fiscal eletrônico, essencial para o PDV. Exige velocidade.
* **Interface**:
  * Tela: `fiscal/nfce` (Visão geral dos cupons emitidos e contingência).
* **Integração PDV**:
  * Adicionar botão de "Emitir NFC-e" direto na tela de encerramento de venda do **PDV**.
  * Geração visual do QRCode e botão de impressão térmica (80mm) chamando o endpoint interno.

### Fase 4: NFS-e (Mão de Obra e Serviços)
Notas de serviço para as manutenções, consertos e garantias cobradas.
* **Interface**:
  * Tela: `fiscal/nfse` (Gerenciador e formulário de emissão).
* **Integração O.S.**:
  * Interação na **Ordem de Serviço (O.S.)** finalizada: extrair automaticamente itens marcados como "Serviço", código ISSQN e gerar a tela pré-preenchida da NFS-e.

### Fase 5: Entrada de Notas e Importação de XML (MD-e)
Gerenciador de XML recebidos de fornecedores.
* **Interface**:
  * Tela: `fiscal/entradas` (In-box de notas recebidas).
* **Funcionalidades UX**:
  * Interface para "Upload de XML".
  * Tela "Mágica" de Importação: O sistema lê o XML via javascript, cruza com bancos locais e mostra uma tabela interativa para:
    * Cadastrar automaticamente produtos novos ou parear existentes.
    * Alimentar o saldo no **Estoque**.
    * Gerar o parcelamento no módulo **Financeiro** (Contas a Pagar).

---

## 📋 Resumo das Novas Telas (Menu Fiscal)

```text
/fiscal                             (Dashboard de status das notas)
/fiscal/nfe                         (Gerenciamento de NF-e Mod. 55)
/fiscal/nfe/nova                    (Formulário de Emissão de NF-e)
/fiscal/nfce                        (Gerenciamento de NFC-e Mod. 65)
/fiscal/nfse                        (Gerenciamento de NFS-e Serviços)
/fiscal/entradas                    (Painel de compras e importação de XML)
/configuracoes/fiscal               (Ambiente, Certificados, Regras CFOP)
```

---

O foco 100% agora será **arquitetar o banco de dados** para suportar a montagem dessas notas, e criar as **Interfaces de Usuário (React/Tailwind)** ricas e funcionais, deixando os estados e botões de "Enviar" perfeitamente ligados à nossa futura API própria.
