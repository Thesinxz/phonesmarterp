"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
    Shield, 
    ArrowLeft, 
    Smartphone, 
    Wrench, 
    AlertTriangle, 
    HelpCircle,
    Camera,
    CheckCircle2,
    Loader2,
    Package,
    User,
    ClipboardCheck
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { checkWarrantyValidity, openWarrantyClaim, openWarrantyRepairOS } from "@/app/actions/warranty";
import { toast } from "sonner";
import { cn } from "@/utils/cn";
import { formatDate } from "@/utils/formatDate";

function GarantiaNovaContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { profile } = useAuth();
    const osId = searchParams.get("os");

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [step, setStep] = useState(1);
    const [osInfo, setOsInfo] = useState<any>(null);
    const [technicians, setTechnicians] = useState<any[]>([]);

    const [form, setForm] = useState({
        claimType: "" as any,
        isCovered: true,
        customerComplaint: "",
        coverageReason: "",
        responsibleTechnicianId: "",
        supplierName: "",
        evidences: [] as File[]
    });

    useEffect(() => {
        if (osId) {
            loadInitialData();
        }
    }, [osId, profile?.empresa_id]);

    async function loadInitialData() {
        setLoading(true);
        try {
            const validity = await checkWarrantyValidity(osId!);
            setOsInfo(validity);

            // Carregar técnicos
            const supabase = createClient();
            const { data: users } = await (supabase.from("usuarios") as any)
                .select("id, nome")
                .eq("empresa_id", profile?.empresa_id)
                .eq("papel", "tecnico")
                .eq("ativo", true);
            setTechnicians(users || []);

        } catch (error) {
            console.error(error);
            toast.error("Erro ao carregar dados da OS");
        } finally {
            setLoading(false);
        }
    }

    const handleNextStep = () => {
        if (step === 2 && !form.claimType) {
            toast.error("Selecione um tipo de garantia");
            return;
        }
        if (step === 3 && !form.customerComplaint) {
            toast.error("Descreva o problema relatado");
            return;
        }
        setStep(step + 1);
    };

    const handleSubmit = async () => {
        if (!profile || !osId) return;
        setSaving(true);
        try {
            // 1. Abrir a claim
            const { claimId } = await openWarrantyClaim({
                tenantId: profile.empresa_id,
                unitId: profile.unit_id || "",
                originalOsId: osId,
                claimType: form.claimType,
                isCovered: form.isCovered,
                coverageReason: form.coverageReason || (form.isCovered ? "Coberto pela garantia" : "Não coberto"),
                customerComplaint: form.customerComplaint,
                responsibleTechnicianId: form.responsibleTechnicianId || undefined,
                supplierName: form.supplierName || undefined,
                openedBy: profile.id
            });

            // 2. Ação Final conforme tipo
            if (form.isCovered) {
                await openWarrantyRepairOS({
                    tenantId: profile.empresa_id,
                    claimId,
                    unitId: profile.unit_id || "",
                    technicianId: form.responsibleTechnicianId || profile.id
                });
                toast.success("Garantia aberta e nova OS de reparo criada!");
            } else {
                toast.success("Garantia registrada (não coberta).");
            }

            router.push(`/os/${osId}`);
        } catch (error) {
            console.error(error);
            toast.error("Erro ao processar garantia");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-24 text-center"><Loader2 className="animate-spin mx-auto text-indigo-500 w-12 h-12" /></div>;

    const originalOs = osInfo?.originalOs;

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20 pt-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                    <ArrowLeft size={20} className="text-slate-600" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Shield className="text-orange-500" /> Nova Garantia
                    </h1>
                    <p className="text-slate-500 text-sm font-medium">Vinculada à OS #{originalOs?.numero ? String(originalOs.numero).padStart(4, "0") : "-"}</p>
                </div>
            </div>

            {/* Stepper */}
            <div className="flex items-center justify-center gap-4 px-4 py-8 bg-white/40 backdrop-blur-sm rounded-3xl border border-white/50 shadow-sm">
                {[1, 2, 3, 4].map((s) => (
                    <div key={s} className="flex items-center gap-3">
                        <div className={cn(
                            "w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm transition-all duration-300",
                            step === s ? "bg-indigo-600 text-white shadow-xl shadow-indigo-200 scale-110" : 
                            step > s ? "bg-emerald-500 text-white" : "bg-white text-slate-400 border border-slate-100"
                        )}>
                            {step > s ? <CheckCircle2 size={18} /> : s}
                        </div>
                        {s < 4 && <div className={cn("w-12 h-1 bg-slate-200 rounded-full overflow-hidden", step > s && "bg-slate-200")}>
                            <div className={cn("h-full transition-all duration-700 w-0", step > s && "w-full bg-emerald-500")} />
                        </div>}
                    </div>
                ))}
            </div>

            {/* Passo 1: Resumo */}
            {step === 1 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <GlassCard title="Resumo do Atendimento Original" icon={ClipboardCheck}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-2">
                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Equipamento</label>
                                    <p className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                                        <Smartphone size={20} className="text-slate-300" /> {originalOs?.deviceModel}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Serviço Realizado</label>
                                    <p className="text-sm text-slate-600 leading-relaxed font-medium bg-slate-50 p-4 rounded-2xl border border-slate-100 italic">
                                        "{originalOs?.serviceDescription}"
                                    </p>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Responsável</label>
                                    <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-[10px]">
                                            {originalOs?.technicianName?.substring(0, 2).toUpperCase()}
                                        </div>
                                        {originalOs?.technicianName}
                                    </p>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Peças Utilizadas</label>
                                    <div className="flex flex-wrap gap-2">
                                        {originalOs?.partsUsed.length > 0 ? originalOs.partsUsed.map((p: any, i: number) => (
                                            <span key={i} className="px-3 py-1.5 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded-xl border border-indigo-100 flex items-center gap-1.5 hover:scale-105 transition-transform">
                                                <Package size={12} /> {p.name} <span className="opacity-50">•</span> {p.quality}
                                            </span>
                                        )) : <p className="text-xs text-slate-400 italic">Nenhuma peça registrada</p>}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Checklist de Saída</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                                        {originalOs?.checklistSummary.map((c: any, i: number) => (
                                            <div key={i} className="flex items-center gap-2.5">
                                                <div className={cn(
                                                    "w-4 h-4 rounded-full flex items-center justify-center",
                                                    c.passed ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"
                                                )}>
                                                    <CheckCircle2 size={10} />
                                                </div>
                                                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight truncate">{c.item}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="mt-8 p-5 bg-gradient-to-r from-amber-50 to-orange-50 rounded-3xl border border-amber-100 flex items-start gap-4">
                            <div className="w-10 h-10 rounded-2xl bg-white shadow-sm flex items-center justify-center shrink-0">
                                <AlertTriangle className="text-amber-500" size={20} />
                            </div>
                            <p className="text-sm text-amber-800 font-medium leading-relaxed">
                                Estes são os registros do atendimento original gravados no sistema. Use-os como referência para classificar se o novo problema é coberto ou não.
                            </p>
                        </div>
                    </GlassCard>
                    <div className="flex justify-end p-2">
                        <button onClick={handleNextStep} className="group h-14 px-10 rounded-2xl bg-indigo-600 text-white font-bold flex items-center gap-3 hover:bg-indigo-700 transition-all shadow-[0_10px_30px_-10px_rgba(79,70,229,0.5)]">
                            Próximo Passo <ArrowLeft size={18} className="rotate-180 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>
            )}

            {/* Passo 2: Classificação */}
            {step === 2 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="text-center space-y-2">
                        <h3 className="text-2xl font-black text-slate-800">Classificação da Garantia</h3>
                        <p className="text-slate-500 text-sm font-medium uppercase tracking-widest">Como você classifica este retorno?</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-2">
                        {[
                            { id: 'peca_defeituosa', icon: Wrench, title: 'Peça Defeituosa', desc: 'A peça instalada falhou por defeito de fábrica.', covered: true, details: 'Empresa cobre • Tenta ressarcir fornecedor', color: 'indigo' },
                            { id: 'erro_tecnico', icon: User, title: 'Erro do Técnico', desc: 'O serviço foi mal executado ou faltou algum ajuste.', covered: true, details: 'Empresa cobre • Registro interno para equipe', color: 'purple' },
                            { id: 'dano_acidental', icon: AlertTriangle, title: 'Dano Acidental', desc: 'Cliente danificou o aparelho após o reparo.', covered: false, details: 'Não coberto • Cobrar novo reparo', color: 'red' },
                            { id: 'nao_relacionado', icon: HelpCircle, title: 'Não Relacionado', desc: 'Problema novo, sem vínculo com o reparo original.', covered: false, details: 'Não coberto • Cobrar diagnóstico', color: 'slate' }
                        ].map((type) => (
                            <button
                                key={type.id}
                                onClick={() => setForm({ ...form, claimType: type.id, isCovered: type.covered })}
                                className={cn(
                                    "p-8 rounded-[2.5rem] border-2 text-left transition-all duration-300 group relative overflow-hidden",
                                    form.claimType === type.id 
                                        ? `border-indigo-600 bg-white shadow-2xl scale-[1.02]` 
                                        : "border-slate-100 bg-white/60 hover:border-slate-300 hover:shadow-xl hover:bg-white"
                                )}
                            >
                                <div className={cn(
                                    "w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300",
                                    form.claimType === type.id ? `bg-indigo-600 text-white shadow-lg` : `bg-slate-50 text-slate-400`
                                )}>
                                    <type.icon size={28} />
                                </div>
                                <h4 className="font-black text-slate-800 text-xl mb-2">{type.title}</h4>
                                <p className="text-sm text-slate-500 mb-6 leading-relaxed font-medium">{type.desc}</p>
                                <div className={cn(
                                    "inline-flex px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider",
                                    type.covered ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                                )}>
                                    {type.details}
                                </div>
                                {form.claimType === type.id && (
                                    <div className="absolute top-6 right-6 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center animate-in zoom-in duration-300">
                                        <CheckCircle2 size={16} />
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center justify-between pt-8 px-2">
                        <button onClick={() => setStep(1)} className="h-14 px-8 rounded-2xl border-2 border-slate-100 text-slate-500 font-bold hover:bg-slate-50 transition-colors uppercase text-xs tracking-widest">Voltar</button>
                        <button onClick={handleNextStep} className="h-14 px-12 rounded-2xl bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-200 uppercase text-xs tracking-widest hover:scale-105 active:scale-95 transition-all">Continuar</button>
                    </div>
                </div>
            )}

            {/* Passo 3: Evidências */}
            {step === 3 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                    <GlassCard title="Registrar Ocorrência" icon={Camera}>
                        <div className="space-y-8 p-2">
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 mb-3 block tracking-widest">O que o cliente relatou? (Obrigatório)</label>
                                <textarea
                                    value={form.customerComplaint}
                                    onChange={e => setForm({ ...form, customerComplaint: e.target.value })}
                                    className="w-full p-6 rounded-[2rem] border border-slate-100 bg-slate-50/50 h-32 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-300 transition-all text-sm font-medium"
                                    placeholder="Ex: A tela parou de dar touch no canto superior após 2 dias de uso..."
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 mb-3 block tracking-widest">Justificativa da Decisão</label>
                                <textarea
                                    value={form.coverageReason}
                                    onChange={e => setForm({ ...form, coverageReason: e.target.value })}
                                    className="w-full p-6 rounded-[2rem] border border-slate-100 bg-slate-50/50 h-24 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-300 transition-all text-sm font-medium"
                                    placeholder="Por que decidiu cobrir ou não a garantia?"
                                />
                                <p className="text-[10px] text-slate-400 mt-2 font-bold italic">Isso será gravado para histórico de auditoria.</p>
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 mb-4 block tracking-widest">Evidências (Fotos)</label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    <button className="aspect-square rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-indigo-500 hover:text-indigo-500 hover:bg-indigo-50/50 transition-all group">
                                        <div className="p-3 bg-slate-50 rounded-2xl group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                                            <Camera size={24} />
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-widest">Adicionar</span>
                                    </button>
                                </div>
                                {form.claimType === 'dano_acidental' && (
                                    <div className="mt-4 flex items-center gap-2 text-red-500 bg-red-50 p-3 rounded-xl border border-red-100">
                                        <AlertTriangle size={14} />
                                        <p className="text-[10px] font-bold uppercase tracking-tight">Foto obrigatória para prova de dano acidental (ex: tela quebrada)</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </GlassCard>
                    <div className="flex items-center justify-between p-2">
                        <button onClick={() => setStep(2)} className="h-14 px-8 rounded-2xl border-2 border-slate-100 text-slate-500 font-bold hover:bg-slate-50 transition-colors uppercase text-xs tracking-widest">Voltar</button>
                        <button onClick={handleNextStep} className="h-14 px-12 rounded-2xl bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-200 uppercase text-xs tracking-widest">Continuar</button>
                    </div>
                </div>
            )}

            {/* Passo 4: Ação Final */}
            {step === 4 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                    <GlassCard title="Ação de Encerramento" icon={Shield}>
                        <div className="space-y-8 p-2">
                            {form.isCovered ? (
                                <div className="space-y-8 animate-in zoom-in-95 duration-500">
                                    <div className="flex items-center gap-6 p-6 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-[2.5rem] border border-emerald-100 shadow-sm">
                                        <div className="w-16 h-16 rounded-[2rem] bg-emerald-500 text-white flex items-center justify-center font-bold shadow-lg shadow-emerald-200">
                                            <CheckCircle2 size={32} />
                                        </div>
                                        <div>
                                            <p className="text-xl font-black text-emerald-900">Cobertura Aprovada</p>
                                            <p className="text-sm text-emerald-700 font-medium">O reparo será realizado sem custos para o cliente.</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-6">
                                        {form.claimType === 'peca_defeituosa' && (
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block px-1">Fornecedor da Peça (Para Ressarcimento)</label>
                                                <input
                                                    type="text"
                                                    value={form.supplierName}
                                                    onChange={e => setForm({ ...form, supplierName: e.target.value })}
                                                    className="w-full h-14 px-6 rounded-2xl border border-slate-100 bg-slate-50 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-300 transition-all font-bold text-slate-700"
                                                    placeholder="Ex: Foxconn, Atacadista SP..."
                                                />
                                            </div>
                                        )}

                                        {form.claimType === 'erro_tecnico' && (
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block px-1">Técnico Responsável pelo Erro (Interno)</label>
                                                <select
                                                    value={form.responsibleTechnicianId}
                                                    onChange={e => setForm({ ...form, responsibleTechnicianId: e.target.value })}
                                                    className="w-full h-14 px-6 rounded-2xl border border-slate-100 bg-slate-50 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-300 transition-all font-bold text-slate-700"
                                                >
                                                    <option value="">Selecionar técnico...</option>
                                                    {technicians.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-8 animate-in zoom-in-95 duration-500">
                                    <div className="flex items-center gap-6 p-6 bg-gradient-to-r from-red-50 to-orange-50 rounded-[2.5rem] border border-red-100 shadow-sm">
                                        <div className="w-16 h-16 rounded-[2rem] bg-red-500 text-white flex items-center justify-center font-bold shadow-lg shadow-red-200">
                                            <AlertTriangle size={32} />
                                        </div>
                                        <div>
                                            <p className="text-xl font-black text-red-900">Garantia Não Coberta</p>
                                            <p className="text-sm text-red-700 font-medium">O incidente não atende aos critérios de cobertura.</p>
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 p-8 rounded-[3rem] border border-slate-100 text-center space-y-6">
                                        <p className="text-sm text-slate-600 font-bold uppercase tracking-widest">Próxima Ação Sugerida</p>
                                        <div className="flex flex-col sm:flex-row gap-3">
                                            <button className="flex-1 h-14 rounded-2xl bg-indigo-600 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-100 hover:scale-105 active:scale-95 transition-all">Sim, Abrir Nova OS</button>
                                            <button className="flex-1 h-14 rounded-2xl bg-white border-2 border-slate-100 text-slate-500 font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all">Apenas Registrar Recusa</button>
                                        </div>
                                    </div>

                                    {form.claimType === 'nao_relacionado' && (
                                        <div className="flex items-center justify-between p-6 bg-white border border-slate-100 rounded-[2rem] shadow-sm">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center">
                                                    <DollarSign size={20} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-slate-700 uppercase tracking-widest">Cobrar Diagnóstico?</p>
                                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-tighter">Valor Padrão: R$ 50,00</p>
                                                </div>
                                            </div>
                                            <button className="px-6 py-2 rounded-xl bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest border border-emerald-100 hover:bg-emerald-100 transition-colors">Ativar Cobrança</button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </GlassCard>
                    <div className="flex items-center justify-between p-2">
                        <button onClick={() => setStep(3)} className="h-14 px-8 rounded-2xl border-2 border-slate-100 text-slate-500 font-bold hover:bg-slate-50 transition-colors uppercase text-xs tracking-widest">Voltar</button>
                        <button 
                            onClick={handleSubmit} 
                            disabled={saving}
                            className="h-14 px-12 rounded-2xl bg-orange-600 text-white font-black uppercase text-xs tracking-widest shadow-[0_15px_30px_-10px_rgba(234,88,12,0.5)] disabled:opacity-50 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all"
                        >
                            {saving ? <Loader2 className="animate-spin" /> : <Shield size={18} />}
                            Confirmar e Salvar Garantia
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function DollarSign(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <line x1="12" x2="12" y1="2" y2="22" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
    );
}

export default function GarantiaNovaPage() {
    return (
        <Suspense fallback={<div className="p-24 text-center"><Loader2 className="animate-spin mx-auto text-indigo-500" /></div>}>
            <GarantiaNovaContent />
        </Suspense>
    );
}
