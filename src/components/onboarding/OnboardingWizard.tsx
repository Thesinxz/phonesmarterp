"use client";

import { useState, useEffect, useRef } from "react";
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";
import { useAuth } from "@/context/AuthContext";
import { GlassCard } from "@/components/ui/GlassCard";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/utils/cn";
import { toast } from "sonner";
import {
    ArrowRight,
    ArrowLeft,
    Check,
    Building2,
    Search,
    RefreshCw,
    Zap,
    FileText,
    CreditCard,
    MessageSquare,
    Sparkles,
    DollarSign,
    Shield,
    Trash2,
    Eye,
    EyeOff,
    Upload,
    CheckCircle2,
    AlertTriangle,
    ExternalLink
} from "lucide-react";
import {
    type EmitenteConfig,
    type FinanceiroConfig,
    type WhatsappConfig,
    type PaymentGateway,
    type CategoriaMargin,
} from "@/types/configuracoes";

const TOTAL_STEPS = 7;

const ufs = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];
const codigosUF: Record<string, string> = {
    "AC": "12", "AL": "27", "AP": "16", "AM": "13", "BA": "29", "CE": "23", "DF": "53", "ES": "32", "GO": "52", "MA": "21", "MT": "51", "MS": "50", "MG": "31", "PA": "15", "PB": "25", "PR": "41", "PE": "26", "PI": "22", "RJ": "33", "RN": "24", "RS": "43", "RO": "11", "RR": "14", "SC": "42", "SP": "35", "SE": "28", "TO": "17"
};

const STEP_META = [
    { step: 1, label: "CNPJ", icon: Search, desc: "Identifique sua empresa" },
    { step: 2, label: "Empresa", icon: Building2, desc: "Dados do emitente" },
    { step: 3, label: "Fiscal", icon: FileText, desc: "Ambiente e NFe" },
    { step: 4, label: "Categorias", icon: DollarSign, desc: "Margens e produtos" },
    { step: 5, label: "Pagamento", icon: CreditCard, desc: "Gateways e taxas" },
    { step: 6, label: "APIs", icon: Sparkles, desc: "WhatsApp e Vision" },
    { step: 7, label: "Pronto!", icon: Check, desc: "Revisão final" },
];

export default function OnboardingWizard() {
    const { status, updateStatus, completeOnboarding, skipOnboarding, loading } = useOnboardingStatus();
    const { profile } = useAuth();
    const supabase = createClient();

    const [currentStep, setCurrentStep] = useState(1);
    const [saving, setSaving] = useState(false);
    const [searchingCnpj, setSearchingCnpj] = useState(false);
    const [showSenha, setShowSenha] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    // ── State: Emitente ──
    const [emitente, setEmitente] = useState<EmitenteConfig>({
        razao_social: "", nome_fantasia: "", cnpj: "", ie: "", crt: "1",
        logradouro: "", numero: "", bairro: "", municipio: "", codigo_municipio: "",
        uf: "SP", cep: "", telefone: "", email: "", codigo_uf: "35",
        ambiente: "homologacao",
    });

    // ── State: Certificado ──
    const [certConfig, setCertConfig] = useState({
        pfx_base64: "", senha: "", csc: "", csc_id: "", nome_cert: "",
    });

    // ── State: Financeiro ──
    const [financeiroConfig, setFinanceiroConfig] = useState<FinanceiroConfig>({
        taxa_nota_fiscal_pct: 0,
        cotacao_dolar_paraguai: 5.32,
        nf_obrigatoria: false,
        categorias: [
            { nome: "Aparelhos", margem_padrao: 0, tipo_margem: "porcentagem", garantia_padrao_dias: 90, nf_obrigatoria: true },
            { nome: "Acessórios", margem_padrao: 0, tipo_margem: "porcentagem", garantia_padrao_dias: 30, nf_obrigatoria: false },
            { nome: "Peças", margem_padrao: 0, tipo_margem: "porcentagem", garantia_padrao_dias: 90, nf_obrigatoria: false },
        ],
        gateways: [
            {
                id: "standard",
                nome: "Padrão Sistema",
                taxa_pix_pct: 0,
                taxa_debito_pct: 0,
                taxas_credito: Array.from({ length: 21 }, (_, i) => ({ parcela: i + 1, taxa: 0 })),
                is_default: true,
                enabled: true,
            }
        ],
    });

    // ── State: WhatsApp ──
    const [whatsappConfig, setWhatsappConfig] = useState<WhatsappConfig>({
        api_token: "", phone_number_id: "", business_account_id: "", welcome_template: "", status_template: "", enabled: false,
    });

    // ── State: Google Vision ──
    const [googleVisionConfig, setGoogleVisionConfig] = useState({ api_key: "", enabled: false });

    // ── State: Gateway expandido ──
    const [expandedGatewayId, setExpandedGatewayId] = useState<string | null>("standard");

    // Load remote step
    useEffect(() => {
        if (status && !loading) setCurrentStep(status.step || 1);
    }, [status, loading]);

    // ── CNPJ Search ──
    async function buscarCnpj() {
        const cnpjClean = emitente.cnpj.replace(/\D/g, "");
        if (cnpjClean.length !== 14) {
            toast.error("CNPJ inválido. Digite 14 números.");
            return;
        }
        setSearchingCnpj(true);
        console.log("[OnboardingWizard] Buscando CNPJ:", cnpjClean);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        try {
            const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjClean}`, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                console.error("[OnboardingWizard] Erro BrasilAPI:", res.status, errorData);
                throw new Error("CNPJ não encontrado ou serviço indisponível");
            }

            const data = await res.json();
            console.log("[OnboardingWizard] Dados recebidos:", data);

            setEmitente(prev => ({
                ...prev,
                razao_social: data.razao_social || "",
                nome_fantasia: data.nome_fantasia || data.razao_social || "",
                logradouro: data.logradouro || "",
                numero: data.numero || "",
                bairro: data.bairro || "",
                municipio: data.municipio || "",
                uf: data.uf || "SP",
                cep: data.cep || "",
                telefone: data.ddd_telefone_1 || "",
                email: data.email || "",
                codigo_municipio: data.codigo_municipio_ibge || "",
                codigo_uf: codigosUF[data.uf] || "35",
            }));
            toast.success("Dados carregados da Receita Federal!");
        } catch (err: any) {
            console.error("[OnboardingWizard] Falha na busca de CNPJ:", err);
            if (err.name === 'AbortError') {
                toast.error("O serviço da Receita demorou muito a responder. Tente preencher manualmente.");
            } else {
                toast.error("Erro ao buscar CNPJ. Verifique se está correto.");
            }
        } finally {
            setSearchingCnpj(false);
        }
    }

    // ── Cert Upload ──
    function handleCertUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const base64 = (ev.target?.result as string).split(",")[1];
            setCertConfig(prev => ({ ...prev, pfx_base64: base64, nome_cert: file.name }));
        };
        reader.readAsDataURL(file);
    }

    // ── Save via API Route server-side (bypassa RLS e client issues) ──
    async function saveConfig(chave: string, valor: any) {
        if (!profile?.empresa_id) return;

        const res = await fetch("/api/onboarding/save-config", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                empresa_id: profile.empresa_id,
                configs: [{
                    chave,
                    valor,
                    is_secret: ["nfe_certificado", "whatsapp", "google_vision"].includes(chave),
                }],
            }),
        });

        const data = await res.json();
        if (!data.success) {
            throw new Error(data.error || `Erro ao salvar ${chave}`);
        }
    }

    // ── Navigation ──
    async function handleNext() {
        setSaving(true);
        try {
            if (currentStep === 1 || currentStep === 2) {
                await saveConfig("nfe_emitente", emitente);
                await (supabase.from("empresas") as any)
                    .update({
                        nome: emitente.nome_fantasia || emitente.razao_social,
                        cnpj: emitente.cnpj,
                    })
                    .eq("id", profile?.empresa_id);
            }
            if (currentStep === 3) {
                await saveConfig("nfe_emitente", emitente);
                if (certConfig.pfx_base64 && certConfig.pfx_base64 !== "***CARREGADO***") {
                    await saveConfig("nfe_certificado", certConfig);
                }
            }
            if (currentStep === 4 || currentStep === 5) {
                await saveConfig("financeiro", financeiroConfig);
            }
            if (currentStep === 6) {
                if (whatsappConfig.api_token) await saveConfig("whatsapp", whatsappConfig);
                if (googleVisionConfig.api_key) await saveConfig("google_vision", googleVisionConfig);
            }

            if (currentStep < TOTAL_STEPS) {
                const next = currentStep + 1;
                await updateStatus({ step: next });
                setCurrentStep(next);
            } else {
                await completeOnboarding();
                window.location.reload();
            }
        } catch (err: any) {
            console.error("Erro ao salvar passo:", err);
            toast.error("Erro ao salvar: " + (err.message || "Tente novamente"));
        } finally {
            setSaving(false);
        }
    }

    async function handleBack() {
        if (currentStep > 1) {
            const prev = currentStep - 1;
            await updateStatus({ step: prev });
            setCurrentStep(prev);
        }
    }

    async function handleSkip() {
        if (window.confirm("Deseja pular a configuração inicial? Você poderá configurar tudo depois no menu Configurações.")) {
            setSaving(true);
            try {
                await skipOnboarding();
                window.location.reload();
            } catch (err) {
                console.error("Erro ao pular onboarding:", err);
                toast.error("Erro ao pular configuração.");
            } finally {
                setSaving(false);
            }
        }
    }

    if (loading || !status || status.completed || status.skipped) return null;

    // ── RENDER ──
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="w-full max-w-4xl bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 overflow-hidden relative max-h-[90vh] flex flex-col">

                {/* Progress */}
                <div className="absolute top-0 left-0 w-full h-1 bg-slate-100 z-10">
                    <div className="h-full bg-gradient-to-r from-brand-500 to-brand-400 transition-all duration-500 ease-out"
                        style={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }} />
                </div>

                <div className="flex flex-1 min-h-0 overflow-hidden">
                    {/* Sidebar Steps */}
                    <div className="w-56 bg-slate-50/80 border-r border-slate-100 p-4 pt-8 hidden md:flex flex-col gap-1.5 shrink-0">
                        {STEP_META.map((s) => (
                            <div key={s.step} className={cn(
                                "flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all",
                                currentStep === s.step ? "bg-brand-500 text-white shadow-brand-glow" :
                                    currentStep > s.step ? "text-emerald-600 bg-emerald-50/50" : "text-slate-400"
                            )}>
                                <div className={cn(
                                    "w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-all",
                                    currentStep === s.step ? "bg-white/20" :
                                        currentStep > s.step ? "bg-emerald-100" : "bg-slate-100"
                                )}>
                                    {currentStep > s.step ? <Check size={12} /> : <s.icon size={12} />}
                                </div>
                                <div className="min-w-0">
                                    <p className="font-bold leading-tight truncate">{s.label}</p>
                                    <p className={cn("text-[9px] truncate", currentStep === s.step ? "text-white/70" : "text-slate-400")}>{s.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Content */}
                    <div className="flex-1 flex flex-col min-h-0">
                        <div className="flex-1 overflow-y-auto p-8 scrollbar-thin">
                            {/* ── STEP 1: CNPJ ── */}
                            {currentStep === 1 && (
                                <div className="space-y-6 animate-slide-up">
                                    <div className="text-center mb-8">
                                        <div className="w-16 h-16 bg-brand-100 rounded-3xl flex items-center justify-center text-brand-600 mb-4 mx-auto shadow-lg shadow-brand-200/50">
                                            <Zap size={32} />
                                        </div>
                                        <h2 className="text-2xl font-black text-slate-800">Bem-vindo ao SmartOS!</h2>
                                        <p className="text-slate-500 text-sm max-w-md mx-auto mt-2">
                                            Digite seu CNPJ e preencheremos automaticamente todos os dados da sua empresa pela Receita Federal.
                                        </p>
                                    </div>

                                    <div className="max-w-md mx-auto space-y-4">
                                        <div>
                                            <label className="label-sm">CNPJ da Empresa *</label>
                                            <div className="flex gap-2 mt-1.5">
                                                <input
                                                    className="input-glass flex-1 font-mono text-lg tracking-wider text-center"
                                                    placeholder="00.000.000/0000-00"
                                                    value={emitente.cnpj}
                                                    onChange={e => {
                                                        const v = e.target.value.replace(/\D/g, "");
                                                        if (v.length <= 14) {
                                                            setEmitente(p => ({ ...p, cnpj: v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5") }));
                                                        }
                                                    }}
                                                    maxLength={18}
                                                />
                                                <button
                                                    onClick={buscarCnpj}
                                                    disabled={searchingCnpj}
                                                    className="px-5 rounded-xl bg-brand-500 text-white hover:bg-brand-600 transition-colors disabled:opacity-50 flex items-center gap-2 font-bold text-sm shadow-brand-glow"
                                                >
                                                    {searchingCnpj ? <RefreshCw size={18} className="animate-spin" /> : <Search size={18} />}
                                                    Buscar
                                                </button>
                                            </div>
                                        </div>

                                        {emitente.razao_social && (
                                            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl animate-slide-up">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <CheckCircle2 size={16} className="text-emerald-600" />
                                                    <span className="font-bold text-emerald-800 text-sm">Empresa encontrada!</span>
                                                </div>
                                                <p className="text-emerald-700 text-sm font-medium">{emitente.razao_social}</p>
                                                <p className="text-emerald-600 text-xs">{emitente.municipio}/{emitente.uf}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* ── STEP 2: Dados Empresa ── */}
                            {currentStep === 2 && (
                                <div className="space-y-6 animate-slide-up">
                                    <h2 className="text-xl font-black text-slate-800">Dados do Emitente</h2>
                                    <p className="text-slate-500 text-sm -mt-4">Confirme e complete os dados da sua empresa. Eles aparecem nas NF-e e OS.</p>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2">
                                            <label className="label-sm">Razão Social *</label>
                                            <input className="input-glass mt-1" value={emitente.razao_social}
                                                onChange={e => setEmitente(p => ({ ...p, razao_social: e.target.value }))} />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="label-sm">Nome Fantasia</label>
                                            <input className="input-glass mt-1" value={emitente.nome_fantasia}
                                                onChange={e => setEmitente(p => ({ ...p, nome_fantasia: e.target.value }))} />
                                        </div>
                                        <div>
                                            <label className="label-sm">Inscrição Estadual *</label>
                                            <input className="input-glass mt-1 font-mono" value={emitente.ie} placeholder="Isento ou número"
                                                onChange={e => setEmitente(p => ({ ...p, ie: e.target.value }))} />
                                        </div>
                                        <div>
                                            <label className="label-sm">CRT (Regime Tributário)</label>
                                            <select className="input-glass mt-1 appearance-none" value={emitente.crt}
                                                onChange={e => setEmitente(p => ({ ...p, crt: e.target.value as "1" | "2" | "3" }))}>
                                                <option value="1">1 — Simples Nacional</option>
                                                <option value="2">2 — Simples (Excesso)</option>
                                                <option value="3">3 — Lucro Real/Presumido</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="label-sm">Telefone</label>
                                            <input className="input-glass mt-1" value={emitente.telefone}
                                                onChange={e => setEmitente(p => ({ ...p, telefone: e.target.value }))} />
                                        </div>
                                        <div>
                                            <label className="label-sm">E-mail</label>
                                            <input className="input-glass mt-1" type="email" value={emitente.email}
                                                onChange={e => setEmitente(p => ({ ...p, email: e.target.value }))} />
                                        </div>

                                        <div className="col-span-2 border-t border-slate-100 pt-4 mt-2">
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Endereço</p>
                                            <div className="grid grid-cols-3 gap-3">
                                                <div className="col-span-2">
                                                    <label className="label-sm">Logradouro</label>
                                                    <input className="input-glass mt-1" value={emitente.logradouro}
                                                        onChange={e => setEmitente(p => ({ ...p, logradouro: e.target.value }))} />
                                                </div>
                                                <div>
                                                    <label className="label-sm">Número</label>
                                                    <input className="input-glass mt-1" value={emitente.numero}
                                                        onChange={e => setEmitente(p => ({ ...p, numero: e.target.value }))} />
                                                </div>
                                                <div>
                                                    <label className="label-sm">Bairro</label>
                                                    <input className="input-glass mt-1" value={emitente.bairro}
                                                        onChange={e => setEmitente(p => ({ ...p, bairro: e.target.value }))} />
                                                </div>
                                                <div>
                                                    <label className="label-sm">Município</label>
                                                    <input className="input-glass mt-1" value={emitente.municipio}
                                                        onChange={e => setEmitente(p => ({ ...p, municipio: e.target.value }))} />
                                                </div>
                                                <div>
                                                    <label className="label-sm">Cód. IBGE</label>
                                                    <input className="input-glass mt-1 font-mono" value={emitente.codigo_municipio}
                                                        onChange={e => setEmitente(p => ({ ...p, codigo_municipio: e.target.value }))}
                                                        placeholder="Ex: 3550308" />
                                                </div>
                                                <div>
                                                    <label className="label-sm">UF</label>
                                                    <select className="input-glass mt-1 appearance-none" value={emitente.uf}
                                                        onChange={e => setEmitente(p => ({ ...p, uf: e.target.value, codigo_uf: codigosUF[e.target.value] || "" }))}>
                                                        {ufs.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="label-sm">CEP</label>
                                                    <input className="input-glass mt-1 font-mono" value={emitente.cep}
                                                        onChange={e => setEmitente(p => ({ ...p, cep: e.target.value }))} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ── STEP 3: Fiscal + Certificado ── */}
                            {currentStep === 3 && (
                                <div className="space-y-6 animate-slide-up">
                                    <h2 className="text-xl font-black text-slate-800">Configuração Fiscal</h2>
                                    <p className="text-slate-500 text-sm -mt-4">Defina o ambiente de emissão e faça upload do certificado digital.</p>

                                    {/* Ambiente */}
                                    <div>
                                        <label className="label-sm mb-2 block">Ambiente de Emissão</label>
                                        <div className="grid grid-cols-2 gap-4">
                                            {(["homologacao", "producao"] as const).map(amb => (
                                                <button key={amb} onClick={() => setEmitente(p => ({ ...p, ambiente: amb }))}
                                                    className={cn(
                                                        "p-4 rounded-xl border-2 text-left transition-all",
                                                        emitente.ambiente === amb
                                                            ? amb === "producao" ? "border-emerald-500 bg-emerald-50" : "border-brand-500 bg-brand-50"
                                                            : "border-slate-100 bg-white/50 hover:border-slate-200"
                                                    )}>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        {emitente.ambiente === amb
                                                            ? <CheckCircle2 size={16} className={amb === "producao" ? "text-emerald-600" : "text-brand-600"} />
                                                            : <div className="w-4 h-4 rounded-full border-2 border-slate-200" />}
                                                        <span className="font-bold text-sm">{amb === "homologacao" ? "🧪 Homologação" : "🚀 Produção"}</span>
                                                    </div>
                                                    <p className="text-[11px] text-slate-400 ml-6">
                                                        {amb === "homologacao" ? "Notas de teste — sem validade fiscal" : "Notas reais — emitidas para a SEFAZ"}
                                                    </p>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Certificado */}
                                    <div className="border-t border-slate-100 pt-6">
                                        <label className="label-sm mb-2 block">Certificado Digital A1 (.pfx)</label>
                                        <div onClick={() => fileRef.current?.click()}
                                            className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center cursor-pointer hover:border-brand-300 hover:bg-brand-50/20 transition-all group">
                                            <Upload size={24} className="mx-auto mb-2 text-slate-300 group-hover:text-brand-400" />
                                            {certConfig.nome_cert ? (
                                                <p className="font-bold text-brand-600 text-sm">{certConfig.nome_cert}</p>
                                            ) : (
                                                <p className="text-slate-400 text-sm">Clique para selecionar o .pfx</p>
                                            )}
                                            <input ref={fileRef} type="file" accept=".pfx,.p12" className="hidden" onChange={handleCertUpload} />
                                        </div>

                                        <div className="grid grid-cols-3 gap-4 mt-4">
                                            <div>
                                                <label className="label-sm">Senha do Certificado</label>
                                                <div className="relative mt-1">
                                                    <input type={showSenha ? "text" : "password"} className="input-glass pr-10 font-mono"
                                                        placeholder="Senha .pfx" value={certConfig.senha}
                                                        onChange={e => setCertConfig(p => ({ ...p, senha: e.target.value }))} />
                                                    <button type="button" onClick={() => setShowSenha(!showSenha)}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                                        {showSenha ? <EyeOff size={14} /> : <Eye size={14} />}
                                                    </button>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="label-sm">CSC (NFC-e)</label>
                                                <input className="input-glass mt-1 font-mono text-xs" placeholder="000D06E3..."
                                                    value={certConfig.csc}
                                                    onChange={e => setCertConfig(p => ({ ...p, csc: e.target.value }))} />
                                            </div>
                                            <div>
                                                <label className="label-sm">CSC ID</label>
                                                <input className="input-glass mt-1 font-mono" placeholder="0001"
                                                    value={certConfig.csc_id}
                                                    onChange={e => setCertConfig(p => ({ ...p, csc_id: e.target.value }))} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ── STEP 4: Categorias & Margens ── */}
                            {currentStep === 4 && (
                                <div className="space-y-6 animate-slide-up">
                                    <h2 className="text-xl font-black text-slate-800">Categorias & Margens</h2>
                                    <p className="text-slate-500 text-sm -mt-4">Configure as categorias dos seus produtos, margens de lucro e impostos.</p>

                                    {/* Impostos globais */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="label-sm">Taxa Nota Fiscal (%)</label>
                                            <input type="number" className="input-glass mt-1"
                                                value={financeiroConfig.taxa_nota_fiscal_pct}
                                                onChange={e => setFinanceiroConfig(p => ({ ...p, taxa_nota_fiscal_pct: Number(e.target.value) }))} />
                                        </div>
                                        <div>
                                            <label className="label-sm">Câmbio Dólar (Paraguai)</label>
                                            <input type="number" step="0.01" className="input-glass mt-1 font-bold"
                                                value={financeiroConfig.cotacao_dolar_paraguai}
                                                onChange={e => setFinanceiroConfig(p => ({ ...p, cotacao_dolar_paraguai: Number(e.target.value) }))} />
                                        </div>
                                    </div>

                                    {/* Categorias */}
                                    <div className="space-y-3">
                                        <label className="label-sm">Categorias de Produto</label>
                                        {financeiroConfig.categorias.map((cat, idx) => (
                                            <div key={idx} className="grid grid-cols-12 gap-2 items-end bg-white/50 p-3 rounded-xl border border-slate-100">
                                                <div className="col-span-3">
                                                    <label className="text-[9px] font-bold text-slate-400 uppercase">Nome</label>
                                                    <input className="input-glass h-8 text-xs" value={cat.nome}
                                                        onChange={e => {
                                                            const c = [...financeiroConfig.categorias]; c[idx].nome = e.target.value;
                                                            setFinanceiroConfig(p => ({ ...p, categorias: c }));
                                                        }} />
                                                </div>
                                                <div className="col-span-2">
                                                    <label className="text-[9px] font-bold text-slate-400 uppercase">Tipo</label>
                                                    <select className="input-glass h-8 text-[10px] font-bold" value={cat.tipo_margem}
                                                        onChange={e => {
                                                            const c = [...financeiroConfig.categorias]; c[idx].tipo_margem = e.target.value as any;
                                                            setFinanceiroConfig(p => ({ ...p, categorias: c }));
                                                        }}>
                                                        <option value="porcentagem">%</option>
                                                        <option value="fixo">R$</option>
                                                    </select>
                                                </div>
                                                <div className="col-span-2">
                                                    <label className="text-[9px] font-bold text-slate-400 uppercase">Margem</label>
                                                    <input type="number" className="input-glass h-8 text-xs" value={cat.margem_padrao}
                                                        onChange={e => {
                                                            const c = [...financeiroConfig.categorias]; c[idx].margem_padrao = Number(e.target.value);
                                                            setFinanceiroConfig(p => ({ ...p, categorias: c }));
                                                        }} />
                                                </div>
                                                <div className="col-span-2">
                                                    <label className="text-[9px] font-bold text-slate-400 uppercase">Garantia</label>
                                                    <input type="number" className="input-glass h-8 text-xs" value={cat.garantia_padrao_dias}
                                                        onChange={e => {
                                                            const c = [...financeiroConfig.categorias]; c[idx].garantia_padrao_dias = Number(e.target.value);
                                                            setFinanceiroConfig(p => ({ ...p, categorias: c }));
                                                        }} />
                                                </div>
                                                <div className="col-span-2">
                                                    <label className="text-[9px] font-bold text-slate-400 uppercase">NF?</label>
                                                    <button onClick={() => {
                                                        const c = [...financeiroConfig.categorias]; c[idx].nf_obrigatoria = !c[idx].nf_obrigatoria;
                                                        setFinanceiroConfig(p => ({ ...p, categorias: c }));
                                                    }} className={cn("w-full h-8 rounded-lg border text-[9px] font-black",
                                                        cat.nf_obrigatoria ? "bg-emerald-50 border-emerald-200 text-emerald-600" : "bg-slate-50 border-slate-200 text-slate-400"
                                                    )}>{cat.nf_obrigatoria ? "SIM" : "NÃO"}</button>
                                                </div>
                                                <div className="col-span-1">
                                                    <button onClick={() => {
                                                        setFinanceiroConfig(p => ({ ...p, categorias: p.categorias.filter((_, i) => i !== idx) }));
                                                    }} className="w-full h-8 text-red-400 hover:bg-red-50 rounded-lg flex items-center justify-center">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        <button onClick={() => setFinanceiroConfig(p => ({
                                            ...p, categorias: [...p.categorias, { nome: "Nova Categoria", margem_padrao: 0, tipo_margem: "porcentagem", garantia_padrao_dias: 90, nf_obrigatoria: false }]
                                        }))} className="w-full py-2 border-2 border-dashed border-slate-200 rounded-xl text-xs font-bold text-slate-400 hover:border-brand-300 hover:text-brand-500 transition-all">
                                            + Adicionar Categoria
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* ── STEP 5: Gateways ── */}
                            {currentStep === 5 && (
                                <div className="space-y-6 animate-slide-up">
                                    <h2 className="text-xl font-black text-slate-800">Gateways de Pagamento</h2>
                                    <p className="text-slate-500 text-sm -mt-4">Configure taxas de Pix, Débito e Crédito parcelado para cada maquininha.</p>

                                    {(financeiroConfig.gateways || []).map((gw, idx) => (
                                        <div key={gw.id} className="space-y-3 bg-slate-50/50 rounded-2xl border border-slate-100 p-4">
                                            <div className="grid grid-cols-6 gap-3 items-end">
                                                <div className="col-span-3">
                                                    <label className="label-sm">Nome do Gateway</label>
                                                    <input className="input-glass mt-1" value={gw.nome}
                                                        onChange={e => {
                                                            const g = [...financeiroConfig.gateways]; g[idx].nome = e.target.value;
                                                            setFinanceiroConfig(p => ({ ...p, gateways: g }));
                                                        }} />
                                                </div>
                                                <div>
                                                    <label className="label-sm">Pix (%)</label>
                                                    <input type="number" className="input-glass mt-1" value={gw.taxa_pix_pct}
                                                        onChange={e => {
                                                            const g = [...financeiroConfig.gateways]; g[idx].taxa_pix_pct = Number(e.target.value);
                                                            setFinanceiroConfig(p => ({ ...p, gateways: g }));
                                                        }} />
                                                </div>
                                                <div>
                                                    <label className="label-sm">Débito (%)</label>
                                                    <input type="number" className="input-glass mt-1" value={gw.taxa_debito_pct}
                                                        onChange={e => {
                                                            const g = [...financeiroConfig.gateways]; g[idx].taxa_debito_pct = Number(e.target.value);
                                                            setFinanceiroConfig(p => ({ ...p, gateways: g }));
                                                        }} />
                                                </div>
                                                <div className="flex items-end gap-1">
                                                    <button onClick={() => setExpandedGatewayId(expandedGatewayId === gw.id ? null : gw.id)}
                                                        className={cn("h-10 px-3 rounded-xl text-[10px] font-bold border transition-all",
                                                            expandedGatewayId === gw.id ? "bg-brand-50 border-brand-200 text-brand-600" : "bg-white border-slate-200 text-slate-400"
                                                        )}>
                                                        Crédito
                                                    </button>
                                                </div>
                                            </div>

                                            {expandedGatewayId === gw.id && (
                                                <div className="pt-3 border-t border-slate-200 animate-in fade-in">
                                                    <label className="label-sm mb-2 block">Tabela de Crédito (1x a 21x)</label>
                                                    <div className="grid grid-cols-7 gap-1.5">
                                                        {gw.taxas_credito.map((taxa, tIdx) => (
                                                            <div key={tIdx}>
                                                                <label className="text-[8px] font-black text-slate-400 block text-center">{taxa.parcela}x</label>
                                                                <input type="number" className="input-glass h-7 text-[10px] font-bold text-center"
                                                                    value={taxa.taxa}
                                                                    onChange={e => {
                                                                        const g = [...financeiroConfig.gateways];
                                                                        const t = [...g[idx].taxas_credito]; t[tIdx].taxa = Number(e.target.value);
                                                                        g[idx].taxas_credito = t;
                                                                        setFinanceiroConfig(p => ({ ...p, gateways: g }));
                                                                    }} />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    <button onClick={() => setFinanceiroConfig(p => ({
                                        ...p, gateways: [...(p.gateways || []), {
                                            id: Math.random().toString(36).substr(2, 9), nome: "Novo Gateway",
                                            taxa_pix_pct: 0, taxa_debito_pct: 0,
                                            taxas_credito: Array.from({ length: 21 }, (_, i) => ({ parcela: i + 1, taxa: 0 })),
                                            is_default: false, enabled: true,
                                        }]
                                    }))} className="w-full py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-xs font-bold text-slate-400 hover:border-brand-300 hover:text-brand-500 transition-all">
                                        + Novo Gateway
                                    </button>
                                </div>
                            )}

                            {/* ── STEP 6: APIs ── */}
                            {currentStep === 6 && (
                                <div className="space-y-6 animate-slide-up">
                                    <h2 className="text-xl font-black text-slate-800">Integrações & APIs</h2>
                                    <p className="text-slate-500 text-sm -mt-4">Configure WhatsApp e inteligência artificial. Pode pular e configurar depois.</p>

                                    {/* WhatsApp */}
                                    <div className="p-5 bg-emerald-50/50 border border-emerald-100 rounded-2xl space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white">
                                                <MessageSquare size={20} />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-bold text-emerald-800">WhatsApp Business API</p>
                                                <p className="text-xs text-emerald-600">Notificações automáticas de OS e vendas</p>
                                            </div>
                                            <button onClick={() => setWhatsappConfig(p => ({ ...p, enabled: !p.enabled }))}
                                                className={cn("w-12 h-6 rounded-full transition-all relative",
                                                    whatsappConfig.enabled ? "bg-emerald-500" : "bg-slate-200")}>
                                                <div className={cn("w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-all",
                                                    whatsappConfig.enabled ? "left-6" : "left-0.5")} />
                                            </button>
                                        </div>
                                        {whatsappConfig.enabled && (
                                            <div className="space-y-3 animate-in fade-in">
                                                <div>
                                                    <label className="label-sm">Token de Acesso (Meta Business)</label>
                                                    <input className="input-glass mt-1 font-mono text-xs" type="password" placeholder="EAABs..."
                                                        value={whatsappConfig.api_token}
                                                        onChange={e => setWhatsappConfig(p => ({ ...p, api_token: e.target.value }))} />
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="label-sm">Phone Number ID</label>
                                                        <input className="input-glass mt-1 font-mono" placeholder="123..."
                                                            value={whatsappConfig.phone_number_id}
                                                            onChange={e => setWhatsappConfig(p => ({ ...p, phone_number_id: e.target.value }))} />
                                                    </div>
                                                    <div>
                                                        <label className="label-sm">Template Status</label>
                                                        <input className="input-glass mt-1 font-mono" placeholder="os_update"
                                                            value={whatsappConfig.status_template}
                                                            onChange={e => setWhatsappConfig(p => ({ ...p, status_template: e.target.value }))} />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Google Vision */}
                                    <div className="p-5 bg-blue-50/50 border border-blue-100 rounded-2xl space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center text-white">
                                                <Sparkles size={20} />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-bold text-blue-800">Google Cloud Vision</p>
                                                <p className="text-xs text-blue-600">OCR profissional para faturas e notas</p>
                                            </div>
                                            <button onClick={() => setGoogleVisionConfig(p => ({ ...p, enabled: !p.enabled }))}
                                                className={cn("w-12 h-6 rounded-full transition-all relative",
                                                    googleVisionConfig.enabled ? "bg-brand-500" : "bg-slate-200")}>
                                                <div className={cn("w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-all",
                                                    googleVisionConfig.enabled ? "left-6" : "left-0.5")} />
                                            </button>
                                        </div>
                                        {googleVisionConfig.enabled && (
                                            <div className="animate-in fade-in">
                                                <label className="label-sm">API Key (Google Cloud)</label>
                                                <input className="input-glass mt-1 font-mono text-xs" type="password" placeholder="SUA_CHAVE_AQUI..."
                                                    value={googleVisionConfig.api_key}
                                                    onChange={e => setGoogleVisionConfig(p => ({ ...p, api_key: e.target.value }))} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* ── STEP 7: Conclusão ── */}
                            {currentStep === 7 && (
                                <div className="space-y-6 animate-slide-up flex flex-col items-center justify-center h-full text-center py-8">
                                    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 shadow-lg shadow-emerald-200/50">
                                        <Check size={40} strokeWidth={3} />
                                    </div>
                                    <h2 className="text-2xl font-black text-slate-800">Configuração Completa!</h2>
                                    <p className="text-slate-500 max-w-md">
                                        Sua empresa <span className="font-bold text-slate-800">{emitente.nome_fantasia || emitente.razao_social || "—"}</span> está pronta
                                        para emitir NF-e, gerenciar OS e vender.
                                    </p>

                                    <div className="bg-slate-50 rounded-2xl p-5 w-full max-w-md text-left space-y-2 border border-slate-100">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">CNPJ:</span>
                                            <span className="font-mono font-medium text-slate-800">{emitente.cnpj || "—"}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">Ambiente:</span>
                                            <span className="font-medium text-slate-800">{emitente.ambiente === "producao" ? "🚀 Produção" : "🧪 Homologação"}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">Categorias:</span>
                                            <span className="font-medium text-slate-800">{financeiroConfig.categorias.length} configuradas</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">Gateways:</span>
                                            <span className="font-medium text-slate-800">{financeiroConfig.gateways.length} configurados</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">WhatsApp:</span>
                                            <span className={cn("font-medium", whatsappConfig.enabled ? "text-emerald-600" : "text-slate-400")}>
                                                {whatsappConfig.enabled ? "Ativo" : "Desativado"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer Navigation */}
                        <div className="flex items-center justify-between p-6 border-t border-slate-100 bg-white/80 shrink-0">
                            <div className="flex items-center gap-3">
                                {currentStep > 1 ? (
                                    <button onClick={handleBack} disabled={saving}
                                        className="px-4 py-2 text-slate-400 hover:text-slate-600 font-bold text-sm flex items-center gap-2 transition-colors disabled:opacity-50">
                                        <ArrowLeft size={16} /> Voltar
                                    </button>
                                ) : <div />}
                            </div>

                            <div className="flex items-center gap-3">
                                {/* Mobile step indicator */}
                                <span className="text-xs text-slate-400 font-medium md:hidden">{currentStep}/{TOTAL_STEPS}</span>

                                {currentStep < TOTAL_STEPS && (
                                    <button onClick={handleSkip} disabled={saving}
                                        className="px-4 py-2 text-slate-400 hover:text-red-400 text-xs font-bold transition-colors uppercase tracking-widest">
                                        Pular Configuração
                                    </button>
                                )}

                                <button onClick={handleNext} disabled={saving}
                                    className="btn-primary px-6 py-2.5 flex items-center gap-2 shadow-brand-glow disabled:opacity-70">
                                    {saving ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : currentStep === TOTAL_STEPS ? (
                                        <><Check size={18} /> Finalizar</>
                                    ) : currentStep === 1 && !emitente.razao_social ? (
                                        <>Buscar CNPJ Primeiro</>
                                    ) : (
                                        <>Próximo <ArrowRight size={18} /></>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
