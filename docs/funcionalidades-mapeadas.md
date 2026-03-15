| # | Funcionalidade | Rota | Descrição | Complexidade | Categoria |
|---|---------------|------|-----------|--------------|-----------|
| 1 | Dashboard Geral | /dashboard | Visão macro de vendas, OS e financeiro | básica | Dashboard |
| 2 | PDV (Ponto de Venda) | /pdv | Interface rápida para vendas balcão | básica | Vendas |
| 3 | Gestão de Vendas | /vendas | Histórico de vendas e detalhamento | básica | Vendas |
| 4 | Ordens de Serviço (Lista) | /os | Listagem centralizada de ordens de serviço | básica | OS |
| 5 | Nova OS | /os/nova | Abertura de ordens com cliente e equipamento | básica | OS |
| 6 | Prateleira de OS | /os/prateleira | Organização física/status das ordens | básica | OS |
| 7 | Garantias de OS | /os/garantias | Gestão de retornos e prazos de garantia | intermediária | OS |
| 8 | Catálogo de Estoque | /estoque | Listagem geral de produtos e aparelhos | básica | Estoque |
| 9 | Gestão de IMEIs | /estoque/imeis | Controle individual por número de série | intermediária | Estoque |
| 10 | Gestão de Peças | /estoque/pecas | Peças de reposição e componentes | básica | Estoque |
| 11 | Películas e Acessórios | /estoque/peliculas | Grade específica para protetores de tela | básica | Estoque |
| 12 | Balanço de Estoque | /estoque/balanco | Auditoria e contagem física | avançada | Estoque |
| 13 | Impressão de Etiquetas | /estoque/etiquetas | Gerador de etiquetas térmicas e A4 | intermediária | Estoque |
| 14 | Movimentação Financeira | /financeiro | Fluxo de caixa (entradas e saídas) | básica | Financeiro |
| 15 | Contas a Pagar/Receber | /financeiro/titulos | Gestão de prazos e parcelamentos | intermediária | Financeiro |
| 16 | Conciliação por Gateway | /financeiro/gateways | Integração com taxas de operadoras | avançada | Financeiro |
| 17 | Importação de XML (Nota Fiscal) | /financeiro/notas-fiscais | Entrada de estoque via arquivo XML | avançada | Fiscal |
| 18 | Emissão de NF-e | /fiscal/nfe | Nota Fiscal Eletrônica de Produtos | avançada | Fiscal |
| 19 | Emissão de NFC-e | /fiscal/nfce | Nota Fiscal de Consumidor Eletrônica | avançada | Fiscal |
| 20 | Emissão de NFS-e | /fiscal/nfse | Nota Fiscal de Serviços Municipal | avançada | Fiscal |
| 21 | Relatórios de Trade-in | /relatorios/trade-ins | Desempenho de trocas de aparelhos | intermediária | Relatórios |
| 22 | Relatórios de Peças | /relatorios/pecas | Consumo de componentes em laboratório | intermediária | Relatórios |
| 23 | Marketing - Campanhas | /marketing/campanhas | Disparo de mensagens e promoções | avançada | Marketing |
| 24 | Pos-venda Automático | /marketing/pos-venda | Automação de contato após entrega | avançada | Marketing |
| 25 | Lista de Preços (Marketing) | /marketing/lista-precos | Gerador de PDFs para redes sociais | intermediária | Marketing |
| 26 | Gestão de Equipe | /equipe | Controle de usuários e produtividade | intermediária | Equipe |
| 27 | Gestão de Técnicos | /tecnicos | Comissões e produtividade técnica | intermediária | Equipe |
| 28 | Gestão de Clientes | /clientes | CRM básico com histórico de compras | básica | Clientes |
| 29 | Hub de Contabilidade | /configuracoes/contador | Fechamento mensal automatizado | avançada | Integrações |
| 30 | Multi-empresa / Unidades | /configuracoes/empresas | Gestão de filiais e subdomínios | avançada | Multi-empresa |
| 31 | Auditoria de Logs | /configuracoes/auditoria | Rastreio completo de alterações | avançada | Configurações |
