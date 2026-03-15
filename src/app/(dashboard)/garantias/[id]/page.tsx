"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
    Shield, 
    ArrowLeft, 
    Smartphone, 
    User, 
    CheckCircle2, 
    XCircle, 
    AlertTriangle,
    FileText,
    Wrench,
    Truck,
    Loader2,
    ClipboardCheck,
    HelpCircle,
    Camera,
    DollarSign
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { useAuth } from "@/context/AuthContext";
import { 
    getWarrantyClaimById, 
    closeWarrantyClaim, 
    denyWarrantyClaim, 
    updateSupplierClaimStatus 
} from "@/app/actions/warranty";
import { toast } from "sonner";
import { cn } from "@/utils/cn";
import { formatDate } from "@/utils/formatDate";
import Link from "next/link";

export default function GarantiaDetalhePage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const { profile } = useAuth();
    const [claim, setClaim] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (params.id) {
            loadClaim();
        }
    }, [params.id]);

    async function loadClaim() {
        setLoading(true);
        try {
            const data = await getWarrantyClaimById(params.id);
            setClaim(data);
        } catch (error) {
            toast.error("Erro ao carregar garantia");
        } finally {
            setLoading(false);
        }
    }

    const handleClose = async () => {
        if (!window.confirm("Confirmar encerramento desta garantia?")) return;
        setSaving(true);
        try {
            await closeWarrantyClaim({
                tenantId: profile!.empresa_id,
                claimId: claim.id,
                closedBy: profile!.id
            });
            toast.success("Garantia encerrada com sucesso");
            loadClaim();
        } catch (e) {
            toast.error("Erro ao encerrar garantia");
        } finally {
            setSaving(false);
        }
    };

    const handleDeny = async () => {
        const reason = window.prompt("Motivo da recusa:");
        if (!reason) return;
        setSaving(true);
        try {
            await denyWarrantyClaim({
                tenantId: profile!.empresa_id,
                claimId: claim.id,
                deniedBy: profile!.id,
                reason
            });
            toast.success("Garantia negada e registrada");
            loadClaim();
        } catch (e) {
            toast.error("Erro ao processar recusa");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-indigo-500 w-12 h-12" /></div>;
    if (!claim) return <div className="p-20 text-center text-slate-400">Garantia não encontrada.</div>;

    const claimTypeIcon = {
        peca_defeituosa: Wrench,
        erro_tecnico: User,
        dano_acidental: AlertTriangle,
        nao_relacionado: HelpCircle
    };
    const ClaimIcon = (claimTypeIcon as any)[claim.claim_type] || AlertTriangle;

    return (
        <div className="space-y-6 page-enter pb-20 pt-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="p-3 hover:bg-slate-100 rounded-2xl transition-colors border border-slate-100 shadow-sm">
                        <ArrowLeft className="w-5 h-5 text-slate-600" />
                    </button>
                    <div>
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Garantia <span className="text-indigo-600">#{claim.id.slice(0, 5).toUpperCase()}</span></h1>
                            <div className={cn(
                                "px-3 py-1.5 rounded-full text-[10px] font-black uppercase flex items-center gap-1.5 shadow-sm border",
                                claim.status === 'aberta' ? "bg-amber-50 text-amber-600 border-amber-100" :
                                claim.status === 'concluida' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                claim.status === 'negada' ? "bg-red-50 text-red-600 border-red-100" :
                                "bg-purple-50 text-purple-600 border-purple-100"
                            )}>
                                <div className={cn("w-1.5 h-1.5 rounded-full",
                                    claim.status === 'aberta' ? "bg-amber-500 animate-pulse" :
                                    claim.status === 'concluida' ? "bg-emerald-500" : "bg-slate-400"
                                )} />
                                {claim.status.replace('_', ' ')}
                            </div>
                        </div>
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">
                            Aberta em {formatDate(claim.created_at)} por {claim.opened_by_user?.nome}
                        </p>
                    </div>
                </div>

                <div className="flex gap-3">
                    {claim.status !== 'concluida' && claim.status !== 'negada' && (
                        <>
                            <button 
                                onClick={handleDeny}
                                disabled={saving}
                                className="h-12 px-6 rounded-2xl border-2 border-red-50 text-red-500 font-bold text-xs uppercase hover:bg-red-50 transition-all flex items-center gap-2"
                            >
                                <XCircle size={18} /> Negar Garantia
                            </button>
                            <button 
                                onClick={handleClose}
                                disabled={saving}
                                className="h-12 px-8 rounded-2xl bg-emerald-600 text-white font-bold text-xs uppercase hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                            >
                                <CheckCircle2 size={18} /> Concluir Garantia
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Coluna Principal */}
                <div className="md:col-span-2 space-y-8">
                    <GlassCard title="Problema e Triage" icon={AlertTriangle}>
                        <div className="space-y-8 p-2">
                            <div className="p-8 bg-slate-50/50 rounded-[2.5rem] border border-slate-100 shadow-inner relative overflow-hidden group">
                                <label className="text-[10px] font-black uppercase text-slate-400 mb-3 block tracking-widest">Reclamação do Cliente</label>
                                <div className="absolute top-8 right-8 text-slate-100 group-hover:text-slate-200 transition-colors">
                                    <Smartphone size={64} />
                                </div>
                                <p className="text-slate-700 font-bold text-lg leading-relaxed italic relative z-10">"{claim.customer_complaint}"</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm">
                                    <label className="text-[10px] font-black uppercase text-slate-400 mb-4 block tracking-widest px-1">Classificação Técnica</label>
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm">
                                            <ClaimIcon size={28} />
                                        </div>
                                        <div>
                                            <span className="font-black text-slate-800 text-lg block leading-tight">
                                                {claim.claim_type === 'peca_defeituosa' ? 'Peça Defeituosa' :
                                                 claim.claim_type === 'erro_tecnico' ? 'Erro Técnico' :
                                                 claim.claim_type === 'dano_acidental' ? 'Dano Acidental' : 'Não Relacionado'}
                                            </span>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-1">Identificado pela equipe</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm">
                                    <label className="text-[10px] font-black uppercase text-slate-400 mb-4 block tracking-widest px-1">Status de Cobertura</label>
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm",
                                            claim.is_covered ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                                        )}>
                                            {claim.is_covered ? <CheckCircle2 size={28} /> : <XCircle size={28} />}
                                        </div>
                                        <div>
                                            <span className={cn(
                                                "font-black text-lg block leading-tight uppercase",
                                                claim.is_covered ? "text-emerald-600" : "text-red-600"
                                            )}>
                                                {claim.is_covered ? 'Coberta' : 'Negada'}
                                            </span>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-1">Decisão Final</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {claim.coverage_reason && (
                                <div className="p-6 bg-indigo-50/30 rounded-3xl border border-indigo-100/50">
                                    <label className="text-[10px] font-black uppercase text-indigo-400 mb-3 block tracking-widest">Justificativa da Decisão</label>
                                    <p className="text-sm text-slate-600 font-bold leading-relaxed">{claim.coverage_reason}</p>
                                </div>
                            )}
                        </div>
                    </GlassCard>

                    {/* Evidências */}
                    <GlassCard title="Evidências e Fotos" icon={Camera}>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 p-2">
                            {claim.evidences?.length > 0 ? claim.evidences.map((ev: any) => (
                                <div key={ev.id} className="aspect-square rounded-[2rem] bg-slate-100 overflow-hidden relative group shadow-sm border border-slate-200">
                                    <img src={ev.file_url} alt="Evidencia" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                    <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                        <Link href={ev.file_url} target="_blank" className="p-3 bg-white rounded-2xl text-slate-900 shadow-xl hover:scale-110 transition-transform">
                                            <FileText size={20} />
                                        </Link>
                                    </div>
                                </div>
                            )) : (
                                <div className="col-span-4 py-16 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
                                    <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-100">
                                        <Camera className="text-slate-200" size={32} />
                                    </div>
                                    <p className="text-xs text-slate-400 font-black uppercase tracking-[0.2em]">Sem fotos registradas</p>
                                </div>
                            )}
                        </div>
                    </GlassCard>
                </div>

                {/* Lateral: Vínculos */}
                <div className="space-y-8">
                    <GlassCard title="Histórico da OS" icon={ClipboardCheck}>
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <Link 
                                    href={`/os/${claim.original_os_id}`} 
                                    className="text-lg font-black text-indigo-600 hover:text-indigo-700 transition-colors uppercase tracking-tight"
                                >
                                    OS #{String(claim.original_os?.numero).padStart(4, "0")}
                                </Link>
                                <div className="px-2 py-1 rounded bg-slate-100 text-[9px] font-black text-slate-400 uppercase">Original</div>
                            </div>
                            
                            <div className="space-y-3 py-6 border-y border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                                        <User size={16} />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Cliente</p>
                                        <p className="text-sm font-bold text-slate-700">{claim.original_os?.clientes?.nome}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                                        <Smartphone size={16} />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Equipamento</p>
                                        <p className="text-sm font-bold text-slate-700">{claim.original_os?.marca_equipamento} {claim.original_os?.modelo_equipamento}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                                        <Wrench size={16} />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Técnico Original</p>
                                        <p className="text-sm font-bold text-slate-700">{claim.original_os?.tecnico?.nome || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">Snapshot do Checklist</label>
                                <div className="grid grid-cols-1 gap-2 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                                    {claim.checklist_snapshot?.[0]?.checklist_data && Object.entries(claim.checklist_snapshot[0].checklist_data).slice(0, 5).map(([item, val]: any, i) => (
                                        <div key={i} className="flex items-center gap-3">
                                            <div className={cn(
                                                "w-4 h-4 rounded-full flex items-center justify-center text-[8px]",
                                                (val === true || val.status === 'ok') ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"
                                            )}>
                                                {(val === true || val.status === 'ok') ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                                            </div>
                                            <span className="text-[10px] text-slate-500 uppercase font-black tracking-tight truncate flex-1">{item}</span>
                                        </div>
                                    ))}
                                    {Object.keys(claim.checklist_snapshot?.[0]?.checklist_data || {}).length > 5 && (
                                        <p className="text-[9px] text-slate-300 font-bold uppercase mt-1 text-center italic">+ itens registrados no Snapshot</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </GlassCard>

                    {claim.is_covered && (
                        <GlassCard title="Acompanhamento do Reparo" icon={Wrench}>
                            {claim.warranty_os ? (
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <Link 
                                            href={`/os/${claim.warranty_os_id}`} 
                                            className="text-lg font-black text-indigo-600 hover:text-indigo-700 transition-colors uppercase tracking-tight"
                                        >
                                            OS #{String(claim.warranty_os.numero).padStart(4, "0")}
                                        </Link>
                                        <div className={cn(
                                            "px-3 py-1 rounded-full text-[9px] font-black uppercase shadow-sm border", 
                                            claim.warranty_os.status === 'finalizada' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-blue-50 text-blue-700 border-blue-100'
                                        )}>
                                            {claim.warranty_os.status}
                                        </div>
                                    </div>
                                    <div className="p-5 bg-indigo-50 border border-indigo-100 rounded-[2rem] shadow-sm flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100">
                                            <User size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Técnico em Garantia</p>
                                            <p className="text-sm font-bold text-indigo-700">{claim.warranty_os.tecnico?.nome || 'A definir'}</p>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center px-4 leading-relaxed">
                                        * Esta OS foi aberta automaticamente e tem custo zero para o cliente.
                                    </p>
                                </div>
                            ) : (
                                <div className="text-center py-6">
                                    <Wrench className="mx-auto text-slate-100 mb-4" size={48} />
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-4">OS de reparo não vinculada</p>
                                    <button 
                                        className="inline-flex h-10 px-6 rounded-xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-lg"
                                        onClick={() => window.alert('Vincular OS manualmente?') /* Futuro feature */}
                                    >
                                        Vincular Reparo
                                    </button>
                                </div>
                            )}
                        </GlassCard>
                    )}

                    {claim.claim_type === 'peca_defeituosa' && (
                        <GlassCard title="Relação Fornecedor" icon={Truck}>
                            <div className="space-y-6">
                                <div className="p-5 bg-slate-50 rounded-[2rem] border border-slate-100">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Fornecedor Envolvido</p>
                                    <p className="text-lg font-black text-slate-700">{claim.supplier_name || 'Não informado'}</p>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block px-1">Status Ressarcimento</label>
                                    <select 
                                        value={claim.supplier_claim_status}
                                        onChange={e => updateSupplierClaimStatus({ 
                                            tenantId: profile!.empresa_id, 
                                            claimId: claim.id, 
                                            status: e.target.value as any 
                                        }).then(() => { toast.success('Status fornecedor atualizado'); loadClaim(); })}
                                        className="w-full h-12 px-4 rounded-2xl border border-slate-100 bg-white text-xs font-bold text-slate-600 outline-none focus:ring-4 focus:ring-slate-100 transition-all shadow-sm"
                                    >
                                        <option value="pendente">Pendente</option>
                                        <option value="enviado">Enviado para Troca</option>
                                        <option value="ressarcido">Ressarcido / Trocado</option>
                                        <option value="negado">Negado pelo Fornecedor</option>
                                    </select>
                                </div>
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter text-center leading-relaxed italic">
                                    Controle interno para garantir que a empresa não tenha prejuízo pela peça defeituosa.
                                </p>
                            </div>
                        </GlassCard>
                    )}
                </div>
            </div>
        </div>
    );
}
