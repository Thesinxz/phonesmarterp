"use client";

import { useState, useEffect, useRef } from "react";
import { invalidateFinanceCache, useFinanceConfig } from "@/hooks/useFinanceConfig";
import {
    Settings,
    Building2,
    FileText,
    Shield,
    MessageSquare,
    CheckCircle2,
    AlertTriangle,
    Upload,
    Eye,
    EyeOff,
    Save,
    RefreshCw,
    Wifi,
    WifiOff,
    ChevronRight,
    DollarSign,
    Percent,
    Trash2,
    History as HistoryIcon,
    Globe,
    CreditCard,
    ExternalLink,
    Search,
    Scan,
    Sparkles,
    ShoppingBag,
    Monitor,
    Copy,
    Link2,
    Loader2
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useRealtimeSubscription } from "@/hooks/useRealtime";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/utils/cn";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { syncConfigToAll } from "@/services/configuracoes";

type Tab = "empresa" | "fiscal" | "certificado" | "whatsapp" | "financeiro" | "ai_config" | "vitrine" | "etiquetas" | "auditoria" | "contador";

import { type WhatsappConfig, type FinanceiroConfig } from "@/types/configuracoes";

interface EmitenteConfig {
    razao_social: string;
    nome_fantasia: string;
    cnpj: string;
    ie: string;
    crt: string;
    logradouro: string;
    numero: string;
    bairro: string;
    municipio: string;
    codigo_municipio: string;
    uf: string;
    cep: string;
    telefone: string;
    email: string;
    codigo_uf: string;
    ambiente: "homologacao" | "producao";
}

interface CertConfig {
    pfx_base64: string;
    senha: string;
    csc: string;
    csc_id: string;
    validade?: string;
    nome_cert?: string;
}

interface ContadorConfig {
    email: string;
    dia_envio: number;
    enviar_xml_nfe: boolean;
    enviar_xml_nfce: boolean;
    enviar_relatorio_financeiro: boolean;
    enabled: boolean;
}

const ufs = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];
const codigosUF: Record<string, string> = {
    "AC": "12", "AL": "27", "AP": "16", "AM": "13", "BA": "29", "CE": "23", "DF": "53", "ES": "32", "GO": "52", "MA": "21", "MT": "51", "MS": "50", "MG": "31", "PA": "15", "PB": "25", "PR": "41", "PE": "26", "PI": "22", "RJ": "33", "RN": "24", "RS": "43", "RO": "11", "RR": "14", "SC": "42", "SP": "35", "SE": "28", "TO": "17"
};

export default function ConfiguracoesPage() {
    const { user, profile, isLoading } = useAuth();
    const { refresh: refreshFinanceConfig } = useFinanceConfig();
    const [activeTab, setActiveTab] = useState<Tab>("empresa");
    const [saving, setSaving] = useState(false);
    const [sefazStatus, setSefazStatus] = useState<"checking" | "online" | "offline" | "unconfigured">("unconfigured");
    const [showSenha, setShowSenha] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const [emitente, setEmitente] = useState<EmitenteConfig>({
        razao_social: "", nome_fantasia: "", cnpj: "", ie: "", crt: "1",
        logradouro: "", numero: "", bairro: "", municipio: "", codigo_municipio: "",
        uf: "SP", cep: "", telefone: "", email: "", codigo_uf: "35",
        ambiente: "homologacao",
    });

    const [certConfig, setCertConfig] = useState<CertConfig>({
        pfx_base64: "", senha: "", csc: "", csc_id: "", nome_cert: "",
    });

    const [whatsappConfig, setWhatsappConfig] = useState<WhatsappConfig>({
        api_token: "", phone_number_id: "", business_account_id: "", welcome_template: "", status_template: "", enabled: false
    });

    const [financeiroConfig, setFinanceiroConfig] = useState<FinanceiroConfig>({
        taxa_nota_fiscal_pct: 0,
        cotacao_dolar_paraguai: 5.32,
        nf_obrigatoria: false,
        categorias: [
            { nome: "Aparelhos", margem_padrao: 0, tipo_margem: "porcentagem", garantia_padrao_dias: 90, nf_obrigatoria: true },
            { nome: "Acessórios", margem_padrao: 0, tipo_margem: "porcentagem", garantia_padrao_dias: 30, nf_obrigatoria: false },
            { nome: "Peças", margem_padrao: 0, tipo_margem: "porcentagem", garantia_padrao_dias: 90, nf_obrigatoria: false }
        ],
        gateways: [
            {
                id: 'standard',
                nome: 'Padrão Sistema',
                taxa_pix_pct: 0,
                taxa_debito_pct: 0,
                taxas_credito: Array.from({ length: 21 }, (_, i) => ({ parcela: i + 1, taxa: 0 })),
                is_default: true,
                enabled: true
            }
        ]
    });


    const [geminiConfig, setGeminiConfig] = useState({
        api_key: "",
        enabled: false
    });

    const [expandedGatewayId, setExpandedGatewayId] = useState<string | null>('standard');

    const [vitrineConfig, setVitrineConfig] = useState({
        enabled: true,
        titulo: "Nossos Produtos",
        mensagem_whatsapp: "Olá! Vi um produto na vitrine e gostaria de mais informações.",
        mostrar_grade: true,
        max_parcelas: 12,
        cor_tema: "#6366f1",
        produtos_destaque: [] as string[],
    });

    const [contadorConfig, setContadorConfig] = useState<ContadorConfig>({
        email: "",
        dia_envio: 1,
        enviar_xml_nfe: true,
        enviar_xml_nfce: true,
        enviar_relatorio_financeiro: true,
        enabled: false
    });

    const [syncingAll, setSyncingAll] = useState(false);

    // CNPJ Busca State
    const [searchingCnpj, setSearchingCnpj] = useState(false);
    const [configsLoaded, setConfigsLoaded] = useState(false);

    // Realtime Sync
    useRealtimeSubscription({
        table: "configuracoes",
        filter: profile?.empresa_id ? `empresa_id=eq.${profile.empresa_id}` : undefined,
        callback: (payload: any) => {
            console.log("Realtime Configuração alterada:", payload.eventType, payload);

            if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
                const chave = payload.new.chave;
                const valor = payload.new.valor;

                // Atualiza instantaneamente a tela de acordo com a chave modificada
                if (chave === "nfe_emitente") setEmitente(valor as EmitenteConfig);
                if (chave === "nfe_certificado") {
                    const cert = valor as CertConfig;
                    setCertConfig({ ...cert, pfx_base64: cert.pfx_base64 ? "***CARREGADO***" : "" });
                }
                if (chave === "whatsapp") setWhatsappConfig(valor as any);
                if (chave === "financeiro") {
                    const config = valor as FinanceiroConfig;
                    if (config.gateways && Array.isArray(config.gateways)) {
                        config.gateways = config.gateways.map(gw => ({
                            ...gw,
                            taxa_pix_pct: gw.taxa_pix_pct ?? config.taxa_pix_pct ?? 0,
                            taxa_debito_pct: gw.taxa_debito_pct ?? config.taxa_debito_pct ?? 0,
                            taxas_credito: gw.taxas_credito ?? config.taxas_credito ?? Array.from({ length: 21 }, (_, i) => ({ parcela: i + 1, taxa: 0 })),
                        }));
                    }
                    if (!config.categorias) config.categorias = [];
                    setFinanceiroConfig(config);
                }
                if (chave === "gemini") setGeminiConfig(valor as any);
                if (chave === "vitrine") setVitrineConfig((prev: any) => ({ ...prev, ...valor as any }));
                if (chave === "contador") setContadorConfig(valor as any);

                toast.info(`Configuração "${chave}" foi atualizada remotamente.`, {
                    duration: 3000,
                    icon: '🔄'
                });
            }
        }
    });

    // ── Carregar configs: roda na montagem e quando empresa_id muda ──
    useEffect(() => {
        if (!profile?.empresa_id) return;

        let ignore = false;

        async function fetchConfigs() {
            if (!profile?.empresa_id) return;

            console.log("[Config] ▶ Iniciando carregamento para empresa:", profile.empresa_id);
            setConfigsLoaded(false);

            try {
                const supabase = createClient();
                const { data, error } = await supabase
                    .from('configuracoes')
                    .select('chave, valor')
                    .eq('empresa_id', profile.empresa_id);

                if (error) throw error;

                if (ignore) return;

                if (!data || data.length === 0) {
                    console.warn("[Config] ⚠ Nenhuma configuração encontrada no banco.");
                    setConfigsLoaded(true);
                    return;
                }

                console.log(`[Config] ✅ ${data.length} configs carregadas`);

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                data.forEach((row: any) => {
                    if (row.chave === "nfe_emitente") setEmitente(row.valor as EmitenteConfig);
                    if (row.chave === "nfe_certificado") {
                        const cert = row.valor as CertConfig;
                        setCertConfig({ ...cert, pfx_base64: cert.pfx_base64 ? "***CARREGADO***" : "" });
                    }
                    if (row.chave === "whatsapp") setWhatsappConfig(row.valor as any);
                    if (row.chave === "financeiro") {
                        const config = row.valor as FinanceiroConfig;
                        if (config.gateways && Array.isArray(config.gateways)) {
                            config.gateways = config.gateways.map(gw => ({
                                ...gw,
                                taxa_pix_pct: gw.taxa_pix_pct ?? config.taxa_pix_pct ?? 0,
                                taxa_debito_pct: gw.taxa_debito_pct ?? config.taxa_debito_pct ?? 0,
                                taxas_credito: gw.taxas_credito ?? config.taxas_credito ?? Array.from({ length: 21 }, (_, i) => ({ parcela: i + 1, taxa: 0 })),
                            }));
                        }
                        if (!config.categorias) config.categorias = [];
                        setFinanceiroConfig(config);
                    }
                    if (row.chave === "gemini") setGeminiConfig(row.valor as any);
                    if (row.chave === "vitrine") setVitrineConfig((prev: any) => ({ ...prev, ...row.valor as any }));
                    if (row.chave === "contador") setContadorConfig(row.valor as any);
                });

                setConfigsLoaded(true);
            } catch (err) {
                console.error("[Config] ❌ Erro inesperado:", err);
                setConfigsLoaded(true);
            }
        }

        fetchConfigs();

        return () => {
            ignore = true;
        };
    }, [profile?.empresa_id]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <RefreshCw className="animate-spin text-brand-500" size={40} />
                <p className="text-slate-500 font-medium animate-pulse">Carregando configurações...</p>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-6 text-center max-w-md mx-auto">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center">
                    <AlertTriangle size={32} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Perfil não encontrado</h2>
                    <p className="text-slate-500 mt-2">
                        Não conseguimos localizar seu perfil de empresa. Isso pode ocorrer se sua conta não foi totalmente provisionada ou se houve um erro na sincronização.
                    </p>
                </div>
                <button
                    onClick={() => window.location.reload()}
                    className="btn-primary"
                >
                    <RefreshCw size={18} />
                    Tentar Novamente
                </button>
            </div>
        );
    }

    async function buscarCnpj() {
        const cnpjClean = emitente.cnpj.replace(/\D/g, '');
        if (cnpjClean.length !== 14) {
            toast.error("CNPJ inválido. Digite 14 números.");
            return;
        }

        setSearchingCnpj(true);
        try {
            const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjClean}`);
            if (!res.ok) throw new Error("CNPJ não encontrado");
            const data = await res.json();

            setEmitente((prev: any) => ({
                ...prev,
                razao_social: data.razao_social || "",
                nome_fantasia: data.nome_fantasia || data.razao_social || "",
                logradouro: data.logradouro || "",
                numero: data.numero || "",
                bairro: data.bairro || "",
                municipio: data.municipio || "",
                uf: data.uf || "",
                cep: data.cep || "",
                telefone: data.ddd_telefone_1 || "",
                email: data.email || "",
                codigo_municipio: data.codigo_municipio_ibge || "",
                codigo_uf: codigosUF[data.uf] || ""
            }));

            toast.success("Dados da empresa carregados com sucesso!");
        } catch (error) {
            console.error(error);
            toast.error("Erro ao buscar CNPJ. Verifique se está correto.");
        } finally {
            setSearchingCnpj(false);
        }
    }

    async function saveConfig(chave: string, valor: any) {
        console.log(`[Config] Início do saveConfig para chave: ${chave}`);

        if (!profile || !profile.empresa_id) {
            console.error("[Config] Falha na validação do perfil!", { profile });
            toast.error("Erro: Perfil de empresa não encontrado. Tente recarregar a página.");
            return;
        }

        setSaving(true);
        try {
            console.log(`[Config] Chamando API segura para salvar ${chave}...`);

            const res = await fetch("/api/onboarding/save-config", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    empresa_id: profile.empresa_id,
                    configs: [{ chave, valor }]
                }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Erro ao salvar na API");
            }

            console.log("[Config] Salvo com sucesso via API!");
            toast.success("Configurações salvas!");

            if (chave === "financeiro") {
                invalidateFinanceCache();
                await refreshFinanceConfig();
            }
        } catch (err: any) {
            console.error("[Config] Erro capturado no catch:", err);
            toast.error("Erro ao salvar: " + (err.message || "Erro desconhecido"));
        } finally {
            setSaving(false);
        }
    }

    const handleSyncAll = async (key: string, value: any) => {
        if (!user || !profile) return;
        try {
            setSyncingAll(true);
            await syncConfigToAll(user.id, key, value);
            toast.success("Configuração propagada para todas as suas empresas!");
        } catch (error) {
            console.error(error);
            toast.error("Erro ao sincronizar empresas.");
        } finally {
            setSyncingAll(false);
        }
    };

    async function handleCertUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            const base64 = (ev.target?.result as string).split(",")[1];
            setCertConfig(prev => ({
                ...prev,
                pfx_base64: base64,
                nome_cert: file.name,
            }));
        };
        reader.readAsDataURL(file);
    }

    async function checkSefazStatus() {
        setSefazStatus("checking");
        try {
            const res = await fetch("/api/nfe/status");
            const data = await res.json();
            setSefazStatus(data.success ? "online" : "offline");
        } catch {
            setSefazStatus("offline");
        }
    }

    const tabs: { id: Tab; label: string; icon: any; desc: string }[] = [
        { id: "empresa", label: "Dados da Empresa", icon: Building2, desc: "Informações do emitente" },
        { id: "fiscal", label: "Configuração Fiscal", icon: FileText, desc: "NF-e / NFC-e / SEFAZ" },
        { id: "certificado", label: "Certificado Digital", icon: Shield, desc: "A1 (.pfx) + CSC" },
        { id: "whatsapp", label: "WhatsApp", icon: MessageSquare, desc: "Notificações automáticas" },
        { id: "financeiro", label: "Margens & Taxas", icon: DollarSign, desc: "Calculadoras e Lucro" },
        { id: "ai_config", label: "IA e OCR", icon: Sparkles, desc: "Gemini 2.5 Flash" },
        { id: "vitrine", label: "Vitrine Online", icon: ShoppingBag, desc: "Catálogo público + TV" },
        { id: "etiquetas", label: "Etiquetas", icon: Scan, desc: "Modelos Térmicos e A4" },
        { id: "contador", label: "Contabilidade", icon: FileText, desc: "Fechamento e XML Automático" },
        { id: "auditoria", label: "Auditoria", icon: HistoryIcon, desc: "Log de alterações e segurança" },
    ];

    return (
        <PermissionGuard modulo="configuracoes">
            <div className="space-y-6 page-enter pb-12">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Configurações</h1>
                        <p className="text-slate-500 text-sm mt-0.5">Gerencie integrações, dados fiscais e certificados</p>
                    </div>
                    {/* SEFAZ Status Badge */}
                    <button
                        onClick={checkSefazStatus}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold transition-all",
                            sefazStatus === "online" && "bg-emerald-50 border-emerald-200 text-emerald-700",
                            sefazStatus === "offline" && "bg-red-50 border-red-200 text-red-700",
                            sefazStatus === "checking" && "bg-slate-50 border-slate-200 text-slate-500 animate-pulse",
                            sefazStatus === "unconfigured" && "bg-slate-50 border-slate-200 text-slate-500",
                        )}
                    >
                        {sefazStatus === "online" && <><Wifi size={16} /> SEFAZ Online</>}
                        {sefazStatus === "offline" && <><WifiOff size={16} /> SEFAZ Offline</>}
                        {sefazStatus === "checking" && <><RefreshCw size={16} className="animate-spin" /> Verificando...</>}
                        {sefazStatus === "unconfigured" && <><RefreshCw size={16} /> Verificar SEFAZ</>}
                    </button>
                </div>

                <div className="flex gap-6">
                    {/* Sidebar Tabs */}
                    <div className="w-64 space-y-1.5 shrink-0">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all group",
                                    activeTab === tab.id
                                        ? "bg-brand-500 text-white shadow-brand-glow"
                                        : "bg-white/60 text-slate-600 hover:bg-white/80 border border-white/60"
                                )}
                            >
                                <tab.icon size={18} className={activeTab === tab.id ? "text-white" : "text-brand-500"} />
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-sm leading-tight">{tab.label}</p>
                                    <p className={cn("text-[10px] truncate", activeTab === tab.id ? "text-white/70" : "text-slate-400")}>
                                        {tab.desc}
                                    </p>
                                </div>
                                <ChevronRight size={14} className={activeTab === tab.id ? "text-white/70" : "text-slate-300"} />
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                        {/* ── EMPRESA ── */}
                        {activeTab === "empresa" && (
                            <GlassCard title="Dados do Emitente" icon={Building2}>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="label-sm">CNPJ *</label>
                                        <div className="flex gap-2 mt-1">
                                            <input
                                                className="input-glass font-mono flex-1"
                                                placeholder="00.000.000/0000-00"
                                                value={emitente.cnpj ?? ""}
                                                onChange={e => {
                                                    const v = e.target.value.replace(/\D/g, '');
                                                    if (v.length <= 14) {
                                                        setEmitente(p => ({ ...p, cnpj: v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5") }));
                                                    }
                                                }}
                                                onBlur={(e) => {
                                                    if (e.target.value.replace(/\D/g, '').length === 14 && !emitente.razao_social) {
                                                        buscarCnpj();
                                                    }
                                                }}
                                                maxLength={18}
                                            />
                                            <button
                                                onClick={buscarCnpj}
                                                disabled={searchingCnpj}
                                                className="px-3 rounded-lg bg-brand-100 text-brand-600 hover:bg-brand-200 transition-colors disabled:opacity-50"
                                                title="Buscar dados na Receita Federal"
                                            >
                                                {searchingCnpj ? <RefreshCw size={18} className="animate-spin" /> : <Search size={18} />}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="label-sm">Inscrição Estadual *</label>
                                        <input className="input-glass mt-1 font-mono" value={emitente.ie ?? ""}
                                            onChange={e => setEmitente(p => ({ ...p, ie: e.target.value }))}
                                            placeholder="Isento ou número"
                                        />
                                    </div>

                                    <div className="col-span-2">
                                        <label className="label-sm">Razão Social *</label>
                                        <input className="input-glass mt-1 bg-slate-50" value={emitente.razao_social ?? ""}
                                            onChange={e => setEmitente(p => ({ ...p, razao_social: e.target.value }))}
                                            placeholder="Preenchimento automático pelo CNPJ"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="label-sm">Nome Fantasia</label>
                                        <input className="input-glass mt-1" value={emitente.nome_fantasia ?? ""}
                                            onChange={e => setEmitente(p => ({ ...p, nome_fantasia: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label className="label-sm">CRT (Regime Tributário)</label>
                                        <select className="input-glass mt-1 appearance-none" value={emitente.crt ?? ""}
                                            onChange={e => setEmitente(p => ({ ...p, crt: e.target.value }))}>
                                            <option value="1">1 — Simples Nacional</option>
                                            <option value="2">2 — Simples Nacional (Excesso)</option>
                                            <option value="3">3 — Regime Normal (Lucro Real/Presumido)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="label-sm">E-mail</label>
                                        <input className="input-glass mt-1" type="email" value={emitente.email ?? ""}
                                            onChange={e => setEmitente(p => ({ ...p, email: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label className="label-sm">Telefone</label>
                                        <input className="input-glass mt-1" value={emitente.telefone ?? ""}
                                            onChange={e => setEmitente(p => ({ ...p, telefone: e.target.value }))} />
                                    </div>

                                    <div className="col-span-2 border-t border-slate-100 pt-4 mt-2">
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Endereço</p>
                                        <div className="grid grid-cols-3 gap-3">
                                            <div className="col-span-2">
                                                <label className="label-sm">Logradouro</label>
                                                <input className="input-glass mt-1" value={emitente.logradouro ?? ""}
                                                    onChange={e => setEmitente(p => ({ ...p, logradouro: e.target.value }))} />
                                            </div>
                                            <div>
                                                <label className="label-sm">Número</label>
                                                <input className="input-glass mt-1" value={emitente.numero ?? ""}
                                                    onChange={e => setEmitente(p => ({ ...p, numero: e.target.value }))} />
                                            </div>
                                            <div>
                                                <label className="label-sm">Bairro</label>
                                                <input className="input-glass mt-1" value={emitente.bairro ?? ""}
                                                    onChange={e => setEmitente(p => ({ ...p, bairro: e.target.value }))} />
                                            </div>
                                            <div>
                                                <label className="label-sm">Município</label>
                                                <input className="input-glass mt-1" value={emitente.municipio ?? ""}
                                                    onChange={e => setEmitente(p => ({ ...p, municipio: e.target.value }))} />
                                            </div>
                                            <div>
                                                <label className="label-sm">Cód. Município (IBGE)</label>
                                                <input className="input-glass mt-1 font-mono" placeholder="Ex: 3550308"
                                                    value={emitente.codigo_municipio ?? ""}
                                                    onChange={e => setEmitente(p => ({ ...p, codigo_municipio: e.target.value }))} />
                                            </div>
                                            <div>
                                                <label className="label-sm">UF</label>
                                                <select className="input-glass mt-1 appearance-none" value={emitente.uf ?? ""}
                                                    onChange={e => setEmitente(p => ({ ...p, uf: e.target.value, codigo_uf: codigosUF[e.target.value] || "" }))}>
                                                    {ufs.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="label-sm">CEP</label>
                                                <input className="input-glass mt-1 font-mono" value={emitente.cep ?? ""}
                                                    onChange={e => setEmitente(p => ({ ...p, cep: e.target.value }))} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-end mt-6">
                                    <button onClick={() => saveConfig("nfe_emitente", emitente)} disabled={saving} className="btn-primary">
                                        {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                                        Salvar Dados da Empresa
                                    </button>
                                </div>
                            </GlassCard>
                        )}

                        {/* ── FISCAL ── */}
                        {activeTab === "fiscal" && (
                            <div className="space-y-6">
                                <GlassCard title="Ambiente de Emissão" icon={FileText}>
                                    <div className="grid grid-cols-2 gap-4">
                                        {(["homologacao", "producao"] as const).map(amb => (
                                            <button
                                                key={amb}
                                                onClick={() => setEmitente(p => ({ ...p, ambiente: amb }))}
                                                className={cn(
                                                    "p-4 rounded-xl border-2 text-left transition-all",
                                                    emitente.ambiente === amb
                                                        ? amb === "producao"
                                                            ? "border-emerald-500 bg-emerald-50"
                                                            : "border-brand-500 bg-brand-50"
                                                        : "border-slate-100 bg-white/50 hover:border-slate-200"
                                                )}
                                            >
                                                <div className="flex items-center gap-2 mb-1">
                                                    {emitente.ambiente === amb
                                                        ? <CheckCircle2 size={16} className={amb === "producao" ? "text-emerald-600" : "text-brand-600"} />
                                                        : <div className="w-4 h-4 rounded-full border-2 border-slate-200" />
                                                    }
                                                    <span className="font-bold text-sm capitalize">{amb === "homologacao" ? "🧪 Homologação" : "🚀 Produção"}</span>
                                                </div>
                                                <p className="text-[11px] text-slate-400 ml-6">
                                                    {amb === "homologacao"
                                                        ? "Notas de teste — não têm validade fiscal"
                                                        : "Notas reais — emitidas para a SEFAZ"}
                                                </p>
                                            </button>
                                        ))}
                                    </div>

                                    {emitente.ambiente === "producao" && (
                                        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
                                            <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
                                            <p className="text-xs text-amber-700">
                                                <strong>Atenção:</strong> Em modo Produção, todas as notas emitidas têm validade fiscal real. Certifique-se de que os dados do emitente e o certificado estão corretos antes de ativar.
                                            </p>
                                        </div>
                                    )}

                                    <div className="flex justify-end mt-4">
                                        <button onClick={() => saveConfig("nfe_emitente", emitente)} disabled={saving} className="btn-primary">
                                            <Save size={16} />
                                            Salvar Ambiente
                                        </button>
                                    </div>
                                </GlassCard>

                                <GlassCard className="p-4 bg-slate-50/30">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-bold text-slate-700">Status da SEFAZ</p>
                                            <p className="text-xs text-slate-400">Verifique se o webservice está disponível</p>
                                        </div>
                                        <button onClick={checkSefazStatus} className="btn-secondary flex items-center gap-2">
                                            <RefreshCw size={14} className={sefazStatus === "checking" ? "animate-spin" : ""} />
                                            Verificar Agora
                                        </button>
                                    </div>
                                </GlassCard>
                            </div>
                        )}

                        {/* ── CERTIFICADO ── */}
                        {activeTab === "certificado" && (
                            <div className="space-y-6">
                                <GlassCard title="Certificado Digital A1 (.pfx)" icon={Shield}>
                                    <div className="space-y-4">
                                        {/* Upload Area */}
                                        <div
                                            onClick={() => fileRef.current?.click()}
                                            className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer hover:border-brand-300 hover:bg-brand-50/20 transition-all group"
                                        >
                                            <Upload size={32} className="mx-auto mb-3 text-slate-300 group-hover:text-brand-400 transition-colors" />
                                            {certConfig.nome_cert && certConfig.nome_cert !== "***CARREGADO***" ? (
                                                <div>
                                                    <p className="font-bold text-brand-600">{certConfig.nome_cert}</p>
                                                    <p className="text-xs text-slate-400 mt-1">Clique para trocar o certificado</p>
                                                </div>
                                            ) : certConfig.pfx_base64 === "***CARREGADO***" ? (
                                                <div>
                                                    <p className="font-bold text-emerald-600 flex items-center justify-center gap-2">
                                                        <CheckCircle2 size={16} /> Certificado carregado
                                                    </p>
                                                    <p className="text-xs text-slate-400 mt-1">Clique para substituir</p>
                                                </div>
                                            ) : (
                                                <div>
                                                    <p className="font-semibold text-slate-500">Clique para selecionar o arquivo .pfx</p>
                                                    <p className="text-xs text-slate-400 mt-1">Certificado A1 emitido por AC credenciada pela ICP-Brasil</p>
                                                </div>
                                            )}
                                            <input ref={fileRef} type="file" accept=".pfx,.p12" className="hidden" onChange={handleCertUpload} />
                                        </div>

                                        <div>
                                            <label className="label-sm">Senha do Certificado *</label>
                                            <div className="relative mt-1">
                                                <input
                                                    type={showSenha ? "text" : "password"}
                                                    className="input-glass pr-10 font-mono"
                                                    placeholder="Senha do arquivo .pfx"
                                                    value={certConfig.senha}
                                                    onChange={e => setCertConfig(p => ({ ...p, senha: e.target.value }))}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowSenha(!showSenha)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                                >
                                                    {showSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </GlassCard>

                                <GlassCard title="CSC — Código de Segurança do Contribuinte (NFC-e)" icon={Shield}>
                                    <p className="text-xs text-slate-400 mb-4">
                                        O CSC é fornecido pela SEFAZ do seu estado. Necessário apenas para emissão de <strong>NFC-e (Modelo 65)</strong>.
                                    </p>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="col-span-2">
                                            <label className="label-sm">CSC (Token)</label>
                                            <input className="input-glass mt-1 font-mono text-xs" placeholder="Ex: 000D06E3..."
                                                value={certConfig.csc}
                                                onChange={e => setCertConfig(p => ({ ...p, csc: e.target.value }))} />
                                        </div>
                                        <div>
                                            <label className="label-sm">CSC ID</label>
                                            <input className="input-glass mt-1 font-mono" placeholder="Ex: 0001"
                                                value={certConfig.csc_id}
                                                onChange={e => setCertConfig(p => ({ ...p, csc_id: e.target.value }))} />
                                        </div>
                                    </div>
                                    <div className="flex justify-end mt-6">
                                        <button
                                            onClick={() => {
                                                const toSave = { ...certConfig };
                                                if (toSave.pfx_base64 === "***CARREGADO***") delete (toSave as any).pfx_base64;
                                                saveConfig("nfe_certificado", toSave);
                                            }}
                                            disabled={saving}
                                            className="btn-primary"
                                        >
                                            <Shield size={16} />
                                            Salvar Certificado
                                        </button>
                                    </div>
                                </GlassCard>
                            </div>
                        )}

                        {/* ── WHATSAPP ── */}
                        {activeTab === "whatsapp" && (
                            <GlassCard title="WhatsApp Business API" icon={MessageSquare}>
                                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl mb-6 flex items-start gap-3">
                                    <MessageSquare size={20} className="text-emerald-600 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-bold text-emerald-800 text-sm">Notificações Automáticas</p>
                                        <p className="text-xs text-emerald-600 mt-0.5">
                                            Envie mensagens automáticas quando uma OS mudar de status, quando uma venda for concluída ou quando o estoque estiver baixo.
                                        </p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="label-sm">Token de Acesso (Meta Business)</label>
                                        <input className="input-glass mt-1 font-mono text-xs"
                                            placeholder="EAABs..."
                                            type="password"
                                            value={whatsappConfig.api_token || ""}
                                            onChange={e => setWhatsappConfig(p => ({ ...p, api_token: e.target.value }))}
                                        />
                                        <p className="text-[10px] text-slate-400 mt-1">
                                            Obtenha em: <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="text-brand-500 underline">developers.facebook.com</a>
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="label-sm">Phone Number ID</label>
                                            <input className="input-glass mt-1 font-mono"
                                                placeholder="123456789012345"
                                                value={whatsappConfig.phone_number_id || ""}
                                                onChange={e => setWhatsappConfig(p => ({ ...p, phone_number_id: e.target.value }))}
                                            />
                                        </div>
                                        <div>
                                            <label className="label-sm">Template Status</label>
                                            <input className="input-glass mt-1 font-mono"
                                                placeholder="os_update"
                                                value={whatsappConfig.status_template || ""}
                                                onChange={e => setWhatsappConfig(p => ({ ...p, status_template: e.target.value }))}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                                        <div>
                                            <p className="font-bold text-slate-700 text-sm">Ativar Notificações</p>
                                            <p className="text-xs text-slate-400">Enviar mensagens automáticas via WhatsApp</p>
                                        </div>
                                        <button
                                            onClick={() => setWhatsappConfig(p => ({ ...p, enabled: !p.enabled }))}
                                            className={cn(
                                                "w-12 h-6 rounded-full transition-all relative",
                                                whatsappConfig.enabled ? "bg-emerald-500" : "bg-slate-200"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-all",
                                                whatsappConfig.enabled ? "left-6" : "left-0.5"
                                            )} />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex justify-end mt-6">
                                    <button onClick={() => saveConfig("whatsapp", whatsappConfig)} disabled={saving} className="btn-primary">
                                        <Save size={16} />
                                        Salvar WhatsApp
                                    </button>
                                </div>
                            </GlassCard>
                        )}

                        {/* ── FINANCEIRO ── */}
                        {activeTab === "financeiro" && (
                            <div className="space-y-6">
                                <GlassCard title="Impostos e Margens Globais" icon={Percent}>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div>
                                            <label className="label-sm">Taxa Nota Fiscal (%)</label>
                                            <input type="number" className="input-glass mt-1"
                                                value={financeiroConfig.taxa_nota_fiscal_pct}
                                                onChange={e => setFinanceiroConfig(p => ({ ...p, taxa_nota_fiscal_pct: Number(e.target.value) }))} />
                                        </div>
                                        <div className="col-span-1 md:col-span-2">
                                            <div className="flex justify-between items-center mb-1">
                                                <label className="label-sm">Câmbio Dólar (Paraguai)</label>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        id="btn-update-cambio"
                                                        onClick={async () => {
                                                            const btn = document.getElementById('btn-update-cambio');
                                                            if (btn) {
                                                                btn.innerText = "BUSCANDO...";
                                                                btn.setAttribute('disabled', 'true');
                                                                btn.classList.add('opacity-50', 'cursor-not-allowed');
                                                            }

                                                            try {
                                                                const res = await fetch('/api/integrations/cambios-chaco');
                                                                const data = await res.json();

                                                                if (data.success) {
                                                                    setFinanceiroConfig(p => ({ ...p, cotacao_dolar_paraguai: data.rate }));
                                                                    if (btn) {
                                                                        btn.innerText = "ATUALIZADO!";
                                                                        btn.classList.remove('bg-slate-100', 'text-slate-400');
                                                                        btn.classList.add('bg-emerald-50', 'text-emerald-600');
                                                                    }
                                                                    setTimeout(() => {
                                                                        if (btn) {
                                                                            btn.innerText = "ATUALIZAR";
                                                                            btn.removeAttribute('disabled');
                                                                            btn.classList.remove('opacity-50', 'cursor-not-allowed', 'bg-emerald-50', 'text-emerald-600');
                                                                            btn.classList.add('bg-slate-100', 'text-slate-400');
                                                                        }
                                                                    }, 3000);
                                                                } else {
                                                                    throw new Error(data.error);
                                                                }
                                                            } catch (err) {
                                                                console.error(err);
                                                                alert("Erro ao conectar com API de Câmbio.");
                                                                if (btn) {
                                                                    btn.innerText = "ERRO";
                                                                    setTimeout(() => {
                                                                        btn.innerText = "ATUALIZAR";
                                                                        btn.removeAttribute('disabled');
                                                                        btn.classList.remove('opacity-50', 'cursor-not-allowed');
                                                                    }, 2000);
                                                                }
                                                            }
                                                        }}
                                                        className="text-[9px] font-bold text-slate-400 hover:text-brand-600 flex items-center gap-1 transition-colors bg-slate-100 hover:bg-brand-50 px-2 py-0.5 rounded-full cursor-pointer"
                                                        title="Busca a cotação atualizada na API da Cambios Chaco (Adrian Jara)"
                                                    >
                                                        <RefreshCw size={10} /> ATUALIZAR
                                                    </button>
                                                    <a
                                                        href="https://www.cambioschaco.com.py/pt-br/"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-[9px] font-black text-brand-500 hover:text-brand-600 flex items-center gap-1 transition-colors bg-brand-50 px-2 py-0.5 rounded-full"
                                                    >
                                                        CAMBIOS CHACO <ExternalLink size={10} />
                                                    </a>
                                                </div>
                                            </div>
                                            <div className="relative">
                                                <input type="number" step="0.01" className="input-glass mt-1 font-bold text-brand-600 pl-8"
                                                    value={financeiroConfig.cotacao_dolar_paraguai}
                                                    onChange={e => setFinanceiroConfig(p => ({ ...p, cotacao_dolar_paraguai: Number(e.target.value) }))} />
                                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">$</div>
                                            </div>
                                            <p className="text-[9px] text-slate-400 mt-1.5 font-medium leading-tight">
                                                Cotação sugerida: <span className="font-bold text-slate-500">Cambios Chaco (Adrian Jara)</span>.
                                                Utilizado nas ferramentas de importação.
                                            </p>
                                        </div>
                                    </div>
                                </GlassCard>

                                <GlassCard title="Categorias e Margens de Lucro" icon={Building2}>
                                    <div className="space-y-4">
                                        {(financeiroConfig.categorias || []).map((cat, idx) => (
                                            <div key={idx} className="grid grid-cols-12 gap-3 items-end bg-white/50 p-4 rounded-2xl border border-slate-100 hover:border-brand-100 transition-all">
                                                <div className="col-span-3">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Nome</label>
                                                    <input className="input-glass h-9 text-xs" value={cat.nome}
                                                        onChange={e => {
                                                            const newCats = [...financeiroConfig.categorias];
                                                            newCats[idx].nome = e.target.value;
                                                            setFinanceiroConfig(p => ({ ...p, categorias: newCats }));
                                                        }} />
                                                </div>
                                                <div className="col-span-2">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Tipo</label>
                                                    <select className="input-glass h-9 text-[10px] font-bold" value={cat.tipo_margem}
                                                        onChange={e => {
                                                            const newCats = [...financeiroConfig.categorias];
                                                            newCats[idx].tipo_margem = e.target.value as any;
                                                            setFinanceiroConfig(p => ({ ...p, categorias: newCats }));
                                                        }}>
                                                        <option value="porcentagem">%</option>
                                                        <option value="fixo">R$</option>
                                                    </select>
                                                </div>
                                                <div className="col-span-2">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Margem</label>
                                                    <input type="number" className="input-glass h-9 text-xs" value={cat.margem_padrao}
                                                        onChange={e => {
                                                            const newCats = [...financeiroConfig.categorias];
                                                            newCats[idx].margem_padrao = Number(e.target.value);
                                                            setFinanceiroConfig(p => ({ ...p, categorias: newCats }));
                                                        }} />
                                                </div>
                                                <div className="col-span-2">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Garantia</label>
                                                    <input type="number" className="input-glass h-9 text-xs" value={cat.garantia_padrao_dias}
                                                        onChange={e => {
                                                            const newCats = [...financeiroConfig.categorias];
                                                            newCats[idx].garantia_padrao_dias = Number(e.target.value);
                                                            setFinanceiroConfig(p => ({ ...p, categorias: newCats }));
                                                        }} />
                                                </div>
                                                <div className="col-span-2">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Exigir NF?</label>
                                                    <button
                                                        onClick={() => {
                                                            const newCats = [...financeiroConfig.categorias];
                                                            newCats[idx].nf_obrigatoria = !newCats[idx].nf_obrigatoria;
                                                            setFinanceiroConfig(p => ({ ...p, categorias: newCats }));
                                                        }}
                                                        className={cn(
                                                            "w-full h-9 rounded-lg border text-[9px] font-black transition-all flex items-center justify-center",
                                                            cat.nf_obrigatoria ? "bg-emerald-50 border-emerald-200 text-emerald-600" : "bg-slate-50 border-slate-200 text-slate-400"
                                                        )}
                                                    >
                                                        {cat.nf_obrigatoria ? "SIM" : "NÃO"}
                                                    </button>
                                                </div>
                                                <div className="col-span-1">
                                                    <button
                                                        onClick={() => {
                                                            const newCats = financeiroConfig.categorias.filter((_, i) => i !== idx);
                                                            setFinanceiroConfig(p => ({ ...p, categorias: newCats }));
                                                        }}
                                                        className="w-full h-9 text-red-400 hover:bg-red-50 rounded-lg flex items-center justify-center transition-all">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        <button
                                            onClick={() => setFinanceiroConfig(p => ({
                                                ...p,
                                                categorias: [...p.categorias, {
                                                    nome: "Nova Categoria",
                                                    margem_padrao: 0,
                                                    tipo_margem: "porcentagem",
                                                    garantia_padrao_dias: 90,
                                                    nf_obrigatoria: false
                                                }]
                                            }))}
                                            className="w-full py-2 border-2 border-dashed border-slate-200 rounded-xl text-xs font-bold text-slate-400 hover:border-brand-300 hover:text-brand-500 transition-all">
                                            + Adicionar Categoria
                                        </button>
                                    </div>
                                </GlassCard>

                                <GlassCard title="Gateways de Pagamento" icon={CreditCard}>
                                    <div className="space-y-4">
                                        {(financeiroConfig.gateways || []).map((gw, idx) => (
                                            <div key={gw.id} className="space-y-3 bg-slate-50/50 rounded-2xl border border-slate-100 p-4 transition-all">
                                                <div className="grid grid-cols-6 gap-3 items-end relative overflow-hidden">
                                                    {gw.is_default && <div className="absolute -top-4 -right-4 bg-brand-500 text-white text-[8px] font-black px-6 pt-5 pb-1 rounded-bl-3xl rotate-45 shadow-sm">PADRÃO</div>}
                                                    <div className="col-span-3">
                                                        <label className="label-sm">Nome do Gateway</label>
                                                        <input className="input-glass mt-1" value={gw.nome}
                                                            onChange={e => {
                                                                const newGws = [...financeiroConfig.gateways];
                                                                newGws[idx].nome = e.target.value;
                                                                setFinanceiroConfig(p => ({ ...p, gateways: newGws }));
                                                            }} />
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => {
                                                                const newGws = financeiroConfig.gateways.map((g, i) => ({ ...g, is_default: i === idx }));
                                                                setFinanceiroConfig(p => ({ ...p, gateways: newGws }));
                                                                setExpandedGatewayId(gw.id);
                                                            }}
                                                            className={cn(
                                                                "flex-1 h-10 rounded-xl border text-[10px] font-black uppercase transition-all",
                                                                gw.is_default ? "bg-brand-500 border-brand-500 text-white shadow-brand-glow" : "bg-white border-slate-200 text-slate-400 hover:border-brand-200"
                                                            )}
                                                        >
                                                            {gw.is_default ? "PADRÃO" : "USAR"}
                                                        </button>
                                                        <button
                                                            onClick={() => setExpandedGatewayId(expandedGatewayId === gw.id ? null : gw.id)}
                                                            className={cn(
                                                                "w-10 h-10 flex items-center justify-center rounded-xl transition-all border",
                                                                expandedGatewayId === gw.id ? "bg-brand-50 border-brand-200 text-brand-600" : "bg-white border-slate-200 text-slate-400"
                                                            )}
                                                        >
                                                            <Settings size={18} />
                                                        </button>
                                                        <button
                                                            disabled={gw.is_default}
                                                            onClick={() => {
                                                                const newGws = financeiroConfig.gateways.filter((_, i) => i !== idx);
                                                                setFinanceiroConfig(p => ({ ...p, gateways: newGws }));
                                                            }}
                                                            className="w-10 h-10 flex items-center justify-center text-red-400 hover:bg-red-50 rounded-xl disabled:opacity-30 transition-all border border-transparent hover:border-red-100"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Sub-painel de taxas específicas do Gateway */}
                                                {expandedGatewayId === gw.id && (
                                                    <div className="mt-4 pt-4 border-t border-slate-200 space-y-4 animate-in fade-in slide-in-from-top-2">
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div>
                                                                <label className="label-sm">Taxa Pix (%) — {gw.nome}</label>
                                                                <input type="number" className="input-glass mt-1" value={gw.taxa_pix_pct}
                                                                    onChange={e => {
                                                                        const newGws = [...financeiroConfig.gateways];
                                                                        newGws[idx].taxa_pix_pct = Number(e.target.value);
                                                                        setFinanceiroConfig(p => ({ ...p, gateways: newGws }));
                                                                    }} />
                                                            </div>
                                                            <div>
                                                                <label className="label-sm">Taxa Débito (%) — {gw.nome}</label>
                                                                <input type="number" className="input-glass mt-1" value={gw.taxa_debito_pct}
                                                                    onChange={e => {
                                                                        const newGws = [...financeiroConfig.gateways];
                                                                        newGws[idx].taxa_debito_pct = Number(e.target.value);
                                                                        setFinanceiroConfig(p => ({ ...p, gateways: newGws }));
                                                                    }} />
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <label className="label-sm block mb-2">Tabela de Crédito Parcelado (1x a 21x)</label>
                                                            <div className="grid grid-cols-3 md:grid-cols-7 gap-2">
                                                                {(gw.taxas_credito || []).map((taxa, tIdx) => (
                                                                    <div key={tIdx} className="space-y-1">
                                                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{taxa.parcela}x (%)</label>
                                                                        <input
                                                                            type="number"
                                                                            className="input-glass h-8 text-[11px] font-bold text-center"
                                                                            value={taxa.taxa}
                                                                            onChange={e => {
                                                                                const newGws = [...financeiroConfig.gateways];
                                                                                const newTaxas = [...newGws[idx].taxas_credito];
                                                                                newTaxas[tIdx].taxa = Number(e.target.value);
                                                                                newGws[idx].taxas_credito = newTaxas;
                                                                                setFinanceiroConfig(p => ({ ...p, gateways: newGws }));
                                                                            }}
                                                                        />
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                        <button
                                            onClick={() => setFinanceiroConfig(p => ({
                                                ...p,
                                                gateways: [...(p.gateways || []), {
                                                    id: Math.random().toString(36).substr(2, 9),
                                                    nome: "Novo Gateway",
                                                    taxa_fixa: 0,
                                                    taxa_porcentagem: 0,
                                                    taxa_pix_pct: 0,
                                                    taxa_debito_pct: 0,
                                                    taxas_credito: Array.from({ length: 21 }, (_, i) => ({ parcela: i + 1, taxa: 0 })),
                                                    is_default: false,
                                                    enabled: true
                                                }]
                                            }))}
                                            className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black text-slate-400 hover:border-brand-300 hover:text-brand-500 transition-all uppercase tracking-widest"
                                        >
                                            + Novo Gateway de Pagamento
                                        </button>
                                    </div>
                                </GlassCard>


                                <div className="flex justify-end">
                                    <button onClick={() => saveConfig("financeiro", financeiroConfig)} disabled={saving} className="btn-primary">
                                        <Save size={16} />
                                        Salvar Configurações Financeiras
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ── AI & OCR ── */}
                        {activeTab === "ai_config" && (
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-3 bg-brand-500 rounded-2xl text-white shadow-brand-glow">
                                        <Sparkles size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-slate-800 tracking-tight">Inteligência Artificial & OCR</h2>
                                        <p className="text-slate-500 text-sm">Motores avançados para reconhecimento de produtos e faturas</p>
                                    </div>
                                </div>

                                {/* Gemini Section */}
                                <GlassCard className="border-brand-100 bg-brand-50/10">
                                    <div className="space-y-6 p-4">
                                        <div className="flex items-center justify-between pb-4 border-b border-brand-100/20">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center text-white shadow-brand-glow">
                                                    <Sparkles size={20} />
                                                </div>
                                                <div>
                                                    <p className="font-black text-slate-800">Gemini 2.5-Flash IA 🚀</p>
                                                    <p className="text-xs text-slate-500">Extração ultra-precisa e estruturada de itens</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setGeminiConfig({ ...geminiConfig, enabled: !geminiConfig.enabled })}
                                                className={cn(
                                                    "w-12 h-6 rounded-full transition-all relative",
                                                    geminiConfig.enabled ? "bg-brand-500" : "bg-slate-200"
                                                )}
                                            >
                                                <div className={cn(
                                                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm",
                                                    geminiConfig.enabled ? "left-7" : "left-1"
                                                )} />
                                            </button>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="relative group">
                                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors" size={18} />
                                                <input
                                                    type={showSenha ? "text" : "password"}
                                                    className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-12 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-medium text-slate-700 shadow-sm"
                                                    placeholder="Insira sua API Key do Gemini"
                                                    value={geminiConfig.api_key}
                                                    onChange={(e) => setGeminiConfig({ ...geminiConfig, api_key: e.target.value })}
                                                />
                                            </div>

                                            <div className="p-3 bg-brand-50 border border-brand-100 rounded-xl">
                                                <p className="text-xs text-brand-700 leading-relaxed">
                                                    <strong>Por que usar?</strong> O Gemini não apenas lê o texto, mas <strong>entende</strong> o que é um produto, sua quantidade e custo, convertendo automaticamente para o estoque sem erros de regex.
                                                </p>
                                            </div>

                                            <div className="flex justify-end">
                                                <button onClick={() => saveConfig("gemini", geminiConfig)} disabled={saving} className="btn-primary">
                                                    <Save size={16} />
                                                    Salvar Gemini
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </GlassCard>

                            </div>
                        )}

                        {/* ── TAB: Vitrine Online ── */}
                        {activeTab === "vitrine" && (
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-3 bg-indigo-500 rounded-2xl text-white shadow-lg shadow-indigo-500/30">
                                        <ShoppingBag size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-slate-800 tracking-tight">Vitrine Online</h2>
                                        <p className="text-slate-500 text-sm">Catálogo público para clientes e Modo TV para a loja</p>
                                    </div>
                                </div>

                                {/* Toggle Ativo */}
                                <GlassCard className="border-indigo-100/50 bg-indigo-50/10">
                                    <div className="p-5 flex items-center justify-between">
                                        <div>
                                            <p className="font-bold text-slate-800">Vitrine Pública</p>
                                            <p className="text-xs text-slate-500 mt-0.5">Quando ativa, seus produtos ficam visíveis para qualquer pessoa</p>
                                        </div>
                                        <button
                                            onClick={() => setVitrineConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
                                            className={cn(
                                                "w-14 h-7 rounded-full transition-all relative",
                                                vitrineConfig.enabled ? "bg-emerald-500" : "bg-slate-200"
                                            )}
                                        >
                                            <div className={cn(
                                                "absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-sm",
                                                vitrineConfig.enabled ? "left-8" : "left-1"
                                            )} />
                                        </button>
                                    </div>
                                </GlassCard>

                                {/* Links da Vitrine */}
                                <GlassCard>
                                    <div className="p-5 space-y-4">
                                        <p className="font-bold text-slate-800 flex items-center gap-2"><Link2 size={16} className="text-indigo-500" /> Links da Vitrine</p>

                                        {/* URL da Vitrine */}
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-mono text-sm text-slate-600">
                                                {typeof window !== 'undefined' ? window.location.origin : ''}/v/minhaloja
                                            </div>
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(`${window.location.origin}/v/minhaloja`);
                                                    toast.success("Link copiado!");
                                                }}
                                                className="p-3 bg-indigo-50 rounded-xl text-indigo-600 hover:bg-indigo-100 transition-colors"
                                            >
                                                <Copy size={18} />
                                            </button>
                                            <a
                                                href="/v/minhaloja"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-3 bg-indigo-50 rounded-xl text-indigo-600 hover:bg-indigo-100 transition-colors"
                                            >
                                                <ExternalLink size={18} />
                                            </a>
                                        </div>

                                        {/* URL do Modo TV */}
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 font-mono text-sm text-slate-300">
                                                <Monitor size={14} className="inline mr-2 text-indigo-400" />
                                                {typeof window !== 'undefined' ? window.location.origin : ''}/v/minhaloja/tv
                                            </div>
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(`${window.location.origin}/v/minhaloja/tv`);
                                                    toast.success("Link do Modo TV copiado!");
                                                }}
                                                className="p-3 bg-slate-100 rounded-xl text-slate-600 hover:bg-slate-200 transition-colors"
                                            >
                                                <Copy size={18} />
                                            </button>
                                            <a
                                                href="/v/minhaloja/tv"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-3 bg-slate-100 rounded-xl text-slate-600 hover:bg-slate-200 transition-colors"
                                            >
                                                <ExternalLink size={18} />
                                            </a>
                                        </div>
                                    </div>
                                </GlassCard>

                                {/* Personalização */}
                                <GlassCard>
                                    <div className="p-5 space-y-5">
                                        <p className="font-bold text-slate-800">Personalização</p>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="label-sm">Título da Vitrine</label>
                                                <input
                                                    className="input-glass mt-1"
                                                    placeholder="Nossos Produtos"
                                                    value={vitrineConfig.titulo}
                                                    onChange={e => setVitrineConfig(prev => ({ ...prev, titulo: e.target.value }))}
                                                />
                                            </div>
                                            <div>
                                                <label className="label-sm">Máx. Parcelas Exibidas</label>
                                                <select
                                                    className="input-glass mt-1"
                                                    value={vitrineConfig.max_parcelas}
                                                    onChange={e => setVitrineConfig(prev => ({ ...prev, max_parcelas: Number(e.target.value) }))}
                                                >
                                                    <option value={3}>Até 3x</option>
                                                    <option value={6}>Até 6x</option>
                                                    <option value={10}>Até 10x</option>
                                                    <option value={12}>Até 12x</option>
                                                    <option value={18}>Até 18x</option>
                                                    <option value={21}>Até 21x</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="label-sm">Mensagem WhatsApp (pré-preenchida)</label>
                                            <textarea
                                                className="input-glass mt-1 h-20 resize-none"
                                                placeholder="Olá! Vi um produto na vitrine..."
                                                value={vitrineConfig.mensagem_whatsapp}
                                                onChange={e => setVitrineConfig(prev => ({ ...prev, mensagem_whatsapp: e.target.value }))}
                                            />
                                        </div>

                                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                            <div>
                                                <p className="font-bold text-sm text-slate-700">Mostrar Grade (A/B/C)</p>
                                                <p className="text-[10px] text-slate-400">Exibe o badge de grade nos cards</p>
                                            </div>
                                            <button
                                                onClick={() => setVitrineConfig(prev => ({ ...prev, mostrar_grade: !prev.mostrar_grade }))}
                                                className={cn(
                                                    "w-12 h-6 rounded-full transition-all relative",
                                                    vitrineConfig.mostrar_grade ? "bg-brand-500" : "bg-slate-200"
                                                )}
                                            >
                                                <div className={cn(
                                                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm",
                                                    vitrineConfig.mostrar_grade ? "left-7" : "left-1"
                                                )} />
                                            </button>
                                        </div>

                                        <div className="flex justify-end pt-2">
                                            <button onClick={() => saveConfig("vitrine", vitrineConfig)} disabled={saving} className="btn-primary">
                                                <Save size={16} />
                                                Salvar Vitrine
                                            </button>
                                        </div>
                                    </div>
                                </GlassCard>

                                {/* Dica Modo TV */}
                                <div className="p-4 bg-slate-800 border border-slate-700 rounded-2xl text-white">
                                    <div className="flex items-center gap-3 mb-3">
                                        <Monitor size={20} className="text-indigo-400" />
                                        <p className="font-bold">Dica: Modo TV 📺</p>
                                    </div>
                                    <p className="text-sm text-slate-300 leading-relaxed">
                                        Abra o link do <strong>Modo TV</strong> em sua Smart TV.
                                        Os produtos serão exibidos em um <strong>slideshow cinematográfico</strong> com QR Codes para compra imediata.
                                        Use <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-xs">Espaço</kbd> para pausar,
                                        <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-xs">F</kbd> para tela cheia e
                                        <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-xs">+/-</kbd> para ajustar o tempo de cada slide.
                                    </p>
                                </div>
                            </div>
                        )}
                        {/* ── TAB: Contabilidade ── */}
                        {activeTab === "contador" && (
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-3 bg-brand-500 rounded-2xl text-white shadow-brand-glow">
                                        <FileText size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-slate-800 tracking-tight">Hub de Contabilidade</h2>
                                        <p className="text-slate-500 text-sm">Automação de fechamento mensal e envio de XMLs</p>
                                    </div>
                                </div>

                                <GlassCard title="Automação de Envio Mensal" icon={RefreshCw}>
                                    <div className="p-5 flex items-center justify-between border-b border-slate-50 pb-6 mb-6">
                                        <div>
                                            <p className="font-bold text-slate-800">Envio Automático</p>
                                            <p className="text-xs text-slate-500 mt-0.5">Enviar pacotes de XML e relatórios no primeiro dia de cada mês</p>
                                        </div>
                                        <button
                                            onClick={() => setContadorConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
                                            className={cn(
                                                "w-14 h-7 rounded-full transition-all relative",
                                                contadorConfig.enabled ? "bg-emerald-500" : "bg-slate-200"
                                            )}
                                        >
                                            <div className={cn(
                                                "absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-sm",
                                                contadorConfig.enabled ? "left-8" : "left-1"
                                            )} />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <div>
                                                <label className="label-sm">E-mail do Contador (ou Escritório)</label>
                                                <input
                                                    className="input-glass mt-1"
                                                    placeholder="contabil@exemplo.com.br"
                                                    type="email"
                                                    value={contadorConfig.email}
                                                    onChange={e => setContadorConfig(prev => ({ ...prev, email: e.target.value }))}
                                                />
                                                <p className="text-[10px] text-slate-400 mt-1 italic">
                                                    * Os e-mails serão enviados com os arquivos em anexo (Zip).
                                                </p>
                                            </div>

                                            <div>
                                                <label className="label-sm">Dia de Envio (Todo mês)</label>
                                                <select
                                                    className="input-glass mt-1"
                                                    value={contadorConfig.dia_envio}
                                                    onChange={e => setContadorConfig(prev => ({ ...prev, dia_envio: Number(e.target.value) }))}
                                                >
                                                    {[1, 2, 3, 4, 5, 10].map(dia => (
                                                        <option key={dia} value={dia}>Dia {dia}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Arquivos a Incluir</p>

                                            <label className="flex items-center gap-3 cursor-pointer group">
                                                <input
                                                    type="checkbox"
                                                    checked={contadorConfig.enviar_xml_nfe}
                                                    onChange={e => setContadorConfig(prev => ({ ...prev, enviar_xml_nfe: e.target.checked }))}
                                                    className="w-4 h-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500"
                                                />
                                                <span className="text-xs font-bold text-slate-600 group-hover:text-slate-900 transition-colors">XMLs de NF-e (Produtos)</span>
                                            </label>

                                            <label className="flex items-center gap-3 cursor-pointer group">
                                                <input
                                                    type="checkbox"
                                                    checked={contadorConfig.enviar_xml_nfce}
                                                    onChange={e => setContadorConfig(prev => ({ ...prev, enviar_xml_nfce: e.target.checked }))}
                                                    className="w-4 h-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500"
                                                />
                                                <span className="text-xs font-bold text-slate-600 group-hover:text-slate-900 transition-colors">XMLs de NFC-e (Consumidor)</span>
                                            </label>

                                            <label className="flex items-center gap-3 cursor-pointer group">
                                                <input
                                                    type="checkbox"
                                                    checked={contadorConfig.enviar_relatorio_financeiro}
                                                    onChange={e => setContadorConfig(prev => ({ ...prev, enviar_relatorio_financeiro: e.target.checked }))}
                                                    className="w-4 h-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500"
                                                />
                                                <span className="text-xs font-bold text-slate-600 group-hover:text-slate-900 transition-colors">Relatório Financeiro (DRE/Fluxo)</span>
                                            </label>
                                        </div>
                                    </div>

                                    <div className="flex justify-end mt-8 gap-3">
                                        <button
                                            onClick={() => handleSyncAll("contador", contadorConfig)}
                                            disabled={saving || syncingAll}
                                            className="btn-secondary"
                                            title="Aplica este e-mail e regras para todas as empresas que você gerencia"
                                        >
                                            {syncingAll ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
                                            Propagar para Todas as Empresas
                                        </button>
                                        <button onClick={() => saveConfig("contador", contadorConfig)} disabled={saving} className="btn-primary">
                                            <Save size={16} />
                                            Salvar Configurações Contábeis
                                        </button>
                                    </div>
                                </GlassCard>

                                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-4">
                                    <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 shrink-0">
                                        <ExternalLink size={20} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-amber-800 text-sm">Dica de Gestão</p>
                                        <p className="text-xs text-amber-700 leading-relaxed mt-0.5">
                                            Manter o envio automático ativo reduz glosas fiscais e evita multas por falta de entrega de arquivos XML ao seu contador. O sistema agrupa tudo do mês anterior e envia em um único pacote organizado.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── TAB: Etiquetas ── */}
                        {activeTab === "etiquetas" && (
                            <div className="space-y-6">
                                <GlassCard title="Configuração de Etiquetas" icon={Scan}>
                                    <div className="p-6 text-center space-y-4">
                                        <div className="w-16 h-16 bg-brand-50 text-brand-500 rounded-full flex items-center justify-center mx-auto">
                                            <Scan size={32} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800">Modelos de Impressão</p>
                                            <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1">
                                                Configure as dimensões para folhas A4 (Pimaco) ou utilize os modelos padrão para impressoras térmicas.
                                            </p>
                                        </div>
                                        <div className="flex justify-center gap-3 pt-4">
                                            <Link href="/estoque/etiquetas" className="btn-secondary">
                                                Ir para Central de Impressão
                                            </Link>
                                            <Link href="/configuracoes/etiquetas/a4" className="btn-primary">
                                                Configurar Folha A4 (Pimaco)
                                            </Link>
                                        </div>
                                    </div>
                                </GlassCard>
                            </div>
                        )}

                        {/* ── TAB: Auditoria ── */}
                        {activeTab === "auditoria" && (
                            <div className="space-y-6">
                                <GlassCard title="Logs de Auditoria" icon={HistoryIcon}>
                                    <div className="p-6 text-center space-y-4">
                                        <div className="w-16 h-16 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center mx-auto">
                                            <HistoryIcon size={32} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800">Segurança e Histórico</p>
                                            <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1">
                                                Acompanhe todas as alterações feitas no sistema, desde mudanças de estoque até edições de vendas.
                                            </p>
                                        </div>
                                        <div className="flex justify-center pt-4">
                                            <Link href="/configuracoes/auditoria" className="btn-primary">
                                                Acessar Logs de Auditoria
                                            </Link>
                                        </div>
                                    </div>
                                </GlassCard>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </PermissionGuard>
    );
}
