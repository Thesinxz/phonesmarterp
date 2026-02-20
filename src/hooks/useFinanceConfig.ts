/**
 * useFinanceConfig — wrapper de compatibilidade
 *
 * Redireciona todas as chamadas para o FinanceConfigContext,
 * que vive no nível do layout do dashboard e carrega os dados
 * uma única vez, disponibilizando-os instantaneamente para
 * qualquer componente filho via SPA navigation.
 *
 * A interface pública é idêntica à anterior para não precisar
 * alterar nenhum consumidor.
 */
export { useFinanceConfigContext as useFinanceConfig, clearFinanceConfigCache as invalidateFinanceCache } from "@/context/FinanceConfigContext";
