/**
 * Logger condicional para o SmartOS.
 * 
 * Em `development`: emite todos os logs normalmente.
 * Em `production`: silencia `log`, `warn` e `info`, mas mantém `error` ativo.
 * 
 * Uso: import { logger } from "@/lib/logger";
 *      logger.log("mensagem");           // silenciado em prod
 *      logger.error("erro crítico", e);  // sempre ativo
 */

const isDev = process.env.NODE_ENV !== "production";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LogFn = (...args: any[]) => void;

const noop: LogFn = () => { };

export const logger = {
    /** Debug log — silenciado em produção */
    log: isDev ? console.log.bind(console) : noop,

    /** Info log — silenciado em produção */
    info: isDev ? console.info.bind(console) : noop,

    /** Warning log — silenciado em produção */
    warn: isDev ? console.warn.bind(console) : noop,

    /** Error log — SEMPRE ativo (essencial para monitoramento) */
    error: console.error.bind(console),
};
