# Plano de Ação: Evolução da Calculadora OCR (Smartos 2.0)

Este documento detalha as próximas fases de melhoria para o módulo de Cálculo em Massa via OCR, focando em precisão, experiência do usuário e inteligência de dados.

## 🎯 Objetivo
Transformar a captura de notas fiscais em um processo de "um clique", minimizando erros de interpretação e automatizando a vinculação com o estoque existente.

---

## 🚀 Fase 1: Inteligência e Precisão de Captura (Visão Computacional)

### 1.1 Detecção de Estrutura de Tabelas (Layout Analysis)
*   **Problema:** Atualmente usamos Regex linha a linha. Em notas com colunas muito próximas, o texto pode vir "misturado".
*   **Solução:** Implementar análise de blocos (Bounding Boxes) do Google Vision para identificar a grade da tabela.
*   **Ação:** Mapear coordenadas horizontais para isolar colunas de DESCRIÇÃO, QUANTIDADE e TOTAL de forma independente.

### 1.2 "Memória" de Categorização (Fuzzy Matching)
*   **Problema:** Itens novos ou com nomes levemente diferentes podem cair em categorias erradas.
*   **Solução:** Criar um histórico de aprendizado. Se o usuário corrigir "Tela iP 11" para a categoria "Peças", o sistema deve aprender que essa string pertence àquela categoria.
*   **Ação:** Implementar busca por similaridade (Levenshtein Distance) contra o banco de dados de produtos existentes.

---

## 🛠 Fase 2: Experiência do Usuário (UX/UI)

### 2.1 Preview Interativo no Passo 2
*   **Melhoria:** Exibir a imagem original ao lado da tabela de conferência.
*   **Funcionalidade:** Ao clicar em um campo de custo na tabela, o sistema destaca (zoom ou highlight) a região correspondente na imagem da nota fiscal para conferência rápida.

### 2.2 Edição em Massa (Bulk Actions)
*   **Funcionalidade:** Permitir selecionar múltiplos itens e aplicar uma "Categoria" ou "Margem" de uma só vez.
*   **Funcionalidade:** Atalhos de teclado (setas para navegar, Enter para confirmar) para acelerar a revisão técnica.

---

## 📊 Fase 3: Integração e Business Intelligence

### 3.1 Atualização de Preços vs. Novos Cadastros
*   **Funcionalidade:** Detectar automaticamente se o produto já existe no estoque (via Nome ou SKU).
*   **Lógica:** 
    *   Se existir: Sugerir atualização do PREÇO DE CUSTO e recalcular venda.
    *   Se não existir: Criar novo cadastro.

### 3.2 Histórico de Compras e Gráfico de Inflação
*   **Funcionalidade:** Salvar os dados processados para gerar relatórios de variação de preço por fornecedor.
*   **Valor:** Alertar o usuário quando o custo de um componente subiu mais de 10% comparado à última nota.

---

## 🔒 Fase 4: Infraestrutura e Segurança

### 4.1 Otimização de Custos Google Vision
*   **Estratégia:** Implementar um "limite de segurança" mensal de requisições configurável no painel administrativo.
*   **Processamento Local:** Melhorar o motor Tesseract.js (local) com treinamento específico para fontes de impressoras térmicas e ERPs comuns, reduzindo a dependência da API paga para notas simples.

---

## 📅 Cronograma Sugerido
| Semana | Foco |
| :--- | :--- |
| **S1** | Implementar Layout Analysis (Colunas Geométricas) |
| **S2** | Sistema de Aprendizado de Categorias (Memória) |
| **S3** | UI de Preview Lateral com Zoom Synchronized |
| **S4** | Lógica de "Update vs Create" no estoque |

---
**Elaborado por:** Antigravity AI
**Status:** Fases 1.2, 2.1, 2.2 e 3.1 Concluídas (Recálculo Pró-rata ativo).
