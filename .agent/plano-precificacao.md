# Plano de Ação: Engenharia de Preços e Experiência Visual (Smartos 2.0)

Este plano foca na **Fase 3** da evolução do Cálculo em Massa, transformando a tabela estática em um simulador financeiro dinâmico e premium.

---

## 🛠 Fase 3.1: Nova Fórmula de Precificação (Profit Max Engine)

### 1. Cálculo por Lucro Desejado (Markup Inverso)
*   **Melhoria:** Atualmente calculamos `Preço = Custo / (1 - Margem - Taxas)`.
*   **Nova Função:** Permitir que o usuário defina o **LUCRO LÍQUIDO EM REAIS** que deseja no bolso por cada item (ex: "Quero ganhar R$ 500 nesse Poco X7").
*   **Lógica:** Reversão total da pirâmide de impostos e taxas para chegar no preço final.

### 2. Multi-Tier Pricing (Tabelas de Preço)
*   **Destaque:** Gerar automaticamente 3 preços por item:
    *   **Varejo:** Margem padrão.
    *   **Atacado (Acima de 3 unidades):** Margem reduzida.
    *   **Tabela de Revenda:** Margem mínima configurável.

### 3. Rateio de Custos Operacionais
*   **Funcionalidade:** Adicionar campo de "Custos Extras" (Frete da nota, Seguro, Taxa de entrega) que será rateado proporcionalmente ou fixamente entre os itens da nota.

---

## 🎨 Fase 3.2: Experiência Visual Premium (Dashboard de Resultados)

### 1. Gráfico de Composição (Price Breakdown)
*   **Visual:** Ao passar o mouse sobre um preço pix, mostrar um mini-card gráfico:
    *   🟩 Custo: 70% 
    *   🟧 Impostos: 6%
    *   🟦 Taxa Gateway: 2%
    *   💎 Lucro Real: 22%

### 2. Barra de Saúde Financeira (Profit Health)
*   **Feedback Visual:** Cores dinâmicas nos preços:
    *   🔴 **Vermelho:** Margem perigosa (abaixo de 10%).
    *   🟡 **Amarelo:** Margem moderada (10% - 20%).
    *   🟢 **Verde:** Margem saudável (acima de 20%).

### 3. Simulador de Parcelamento "Estilo Apple"
*   **UI:** Componente visual que simula as parcelas de 1x até 21x em tempo real para o usuário ver como a taxa de juros impacta o valor da parcela.

### 4. Resumo Consolidado (Total Harvest)
*   **Visual:** Uma barra flutuante no final da página mostrando:
    *   **Valor Total da Nota:** R$ X.XXX,XX
    *   **Potencial de Venda:** R$ Y.YYY,YY
    *   **Lucro Projetado Total:** R$ Z.ZZZ,ZZ (O "ouro" da importação)

---

## 📅 Cronograma de Implementação
| Fase | Entrega | Status |
| :--- | :--- | :--- |
| **3.1.1** | Função de Cálculo Reverso (Profit Target) | Próximo |
| **3.1.2** | Rateio de Frete/Seguro na Nota | Planejado |
| **3.2.1** | Componente breakdown (Visualização de composição) | Planejado |
| **3.2.2** | Barra de Lucro Consolidado | Planejado |

---
**Elaborado por:** Antigravity AI
**Aprovação:** Aguardando comando do usuário
