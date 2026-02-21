"use client";

import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { type FinanceiroConfig, type PaymentGateway } from "@/types/configuracoes";

const supabase = createClient();

const STORAGE_KEY = "smartos_finance_config_v2";
const CAMBIO_TS_KEY = "smartos_last_cambio_update";
const CAMBIO_INTERVAL_MS = 60 * 60 * 1000; // 1 hora

// ─── Types ───────────────────────────────────────────────────────────────────
interface FinanceConfigState {
    config: FinanceiroConfig | null;
    defaultGateway: PaymentGateway | null;
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}

// ─── Context ─────────────────────────────────────────────────────────────────
const FinanceConfigContext = createContext<FinanceConfigState>({
    config: null,
    defaultGateway: null,
    loading: true,
    error: null,
    refresh: async () => { },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
function processConfig(rawConfig: FinanceiroConfig): { config: FinanceiroConfig; gateway: PaymentGateway | null } {
    if (rawConfig.gateways && rawConfig.gateways.length > 0) {
        rawConfig.gateways = rawConfig.gateways.map(gw => ({
            ...gw,
            taxa_pix_pct: gw.taxa_pix_pct ?? rawConfig.taxa_pix_pct ?? 0,
            taxa_debito_pct: gw.taxa_debito_pct ?? rawConfig.taxa_debito_pct ?? 0,
            taxas_credito: gw.taxas_credito ?? rawConfig.taxas_credito ?? Array.from({ length: 21 }, (_, i) => ({ parcela: i + 1, taxa: 0 })),
        }));
    }
    const gateway = rawConfig.gateways?.find(gw => gw.is_default) || rawConfig.gateways?.[0] || null;
    return { config: rawConfig, gateway };
}

function readFromStorage(): { config: FinanceiroConfig; gateway: PaymentGateway | null } | null {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return null;
}

function writeToStorage(config: FinanceiroConfig, gateway: PaymentGateway | null) {
    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ config, gateway }));
    } catch { /* ignore */ }
}

export function clearFinanceConfigCache() {
    try {
        sessionStorage.removeItem(STORAGE_KEY);
        sessionStorage.removeItem(CAMBIO_TS_KEY);
    } catch { /* ignore */ }
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function FinanceConfigProvider({ children }: { children: ReactNode }) {
    // Inicializa direto do sessionStorage para evitar flash de loading
    const cached = typeof window !== "undefined" ? readFromStorage() : null;

    const [config, setConfig] = useState<FinanceiroConfig | null>(null);
    const [defaultGateway, setDefaultGateway] = useState<PaymentGateway | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const cambioChecked = useRef(false);
    const isFetching = useRef(false);
    const initialized = useRef(false);

    const loadFromDB = useCallback(async () => {
        if (isFetching.current) return;
        isFetching.current = true;
        setLoading(true);
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data, error: sbError } = await (supabase.from("configuracoes") as any)
                .select("valor")
                .eq("chave", "financeiro")
                .single();

            if (sbError) throw sbError;

            if (data?.valor) {
                const { config: cfg, gateway } = processConfig(data.valor as FinanceiroConfig);
                setConfig(cfg);
                setDefaultGateway(gateway);
                writeToStorage(cfg, gateway);
            }
        } catch (err: any) {
            console.error("[FinanceConfig] Erro ao carregar:", err);
            setError(err.message);
        } finally {
            setLoading(false);
            isFetching.current = false;
        }
    }, []);

    // Carrega na montagem do Provider (ocorre 1x por sessão de aba, no layout)
    useEffect(() => {
        if (initialized.current) return;
        initialized.current = true;

        const checkAndLoad = async () => {
            try {
                // 1. Tentar carregar do storage primeiro (Client-side only)
                const storage = readFromStorage();
                if (storage) {
                    setConfig(storage.config);
                    setDefaultGateway(storage.gateway);
                    setLoading(false);
                    // Não retorna aqui, pois ainda precisamos verificar se o dólar mudou (abaixo)
                }

                // 2. Só buscar do DB se houver sessão ativa
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    // Se não tinha no storage, carrega do DB
                    if (!storage) {
                        await loadFromDB();
                    }
                } else {
                    setLoading(false);
                }
            } catch (err) {
                console.error("[FinanceConfig] Erro no checkAndLoad:", err);
                setLoading(false);
            }
        };
        checkAndLoad();
    }, [loadFromDB]);

    // Auto-refresh silencioso da cotação do dólar a cada 1h
    useEffect(() => {
        if (!config || cambioChecked.current) return;
        cambioChecked.current = true;

        const doAutoRefresh = async () => {
            try {
                const lastUpdate = sessionStorage.getItem(CAMBIO_TS_KEY);
                const now = Date.now();

                if (lastUpdate && (now - parseInt(lastUpdate, 10)) < CAMBIO_INTERVAL_MS) {
                    return; // Dentro da janela de 1h, não precisa atualizar
                }

                // Chama a API Route que já salva no banco e retorna a taxa nova
                const res = await fetch("/api/integrations/cambios-chaco", { cache: "no-store" });
                const data = await res.json();

                if (data.success && data.rate && data.rate !== config.cotacao_dolar_paraguai) {
                    sessionStorage.setItem(CAMBIO_TS_KEY, String(now));
                    setConfig(prev => {
                        if (!prev) return prev;
                        const updated = { ...prev, cotacao_dolar_paraguai: data.rate };
                        writeToStorage(updated, defaultGateway);
                        return updated;
                    });
                    console.log(`[AutoCambio] Cotação atualizada para: ${data.rate}`);
                } else if (data.success) {
                    // Taxa não mudou mas registrar o timestamp para evitar nova chamada
                    sessionStorage.setItem(CAMBIO_TS_KEY, String(now));
                }
            } catch (err) {
                console.warn("[AutoCambio] Erro silencioso:", err);
            }
        };

        doAutoRefresh();
    }, [config]); // eslint-disable-line react-hooks/exhaustive-deps

    const refresh = useCallback(async () => {
        clearFinanceConfigCache();
        cambioChecked.current = false;
        await loadFromDB();
    }, [loadFromDB]);

    return (
        <FinanceConfigContext.Provider value={{ config, defaultGateway, loading, error, refresh }}>
            {children}
        </FinanceConfigContext.Provider>
    );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useFinanceConfigContext() {
    return useContext(FinanceConfigContext);
}
