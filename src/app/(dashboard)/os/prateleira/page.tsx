"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { getOrdensServicoFinalizadas } from "@/services/os";
import { toast } from "sonner";
import {
    PackageOpen, Search, ArrowLeft, Clock, AlertTriangle,
    ShieldAlert, XCircle, MessagesSquare, CheckCircle2, Loader2, Info
} from "lucide-react";
import Link from "next/link";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/utils/cn";

export default function PrateleiraPage() {
    const { profile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [ordens, setOrdens] = useState<any[]>([]);
    const [search, setSearch] = useState("");
    const [ativoTab, setAtivoTab] = useState<"todos" | "recentes" | "alerta" | "abandono">("todos");

    // Modal de WhatsApp
    const [enviandoZAP, setEnviandoZAP] = useState(false);
    const [modalWppOpen, setModalWppOpen] = useState(false);
    const [osSelecionada, setOsSelecionada] = useState<any>(null);
    const [tipoWpp, setTipoWpp] = useState<"lembrete" | "taxa" | "abandono">("lembrete");

    useEffect(() => {
        if (!profile?.empresa_id) return;
        loadOrdens();
    }, [profile?.empresa_id]);

    async function loadOrdens() {
        try {
            setLoading(true);
            // Busca apenas OS Finalizadas ou Sem Conserto, mas que AINDA NÃO foram Entregues
            const data = await getOrdensServicoFinalizadas(profile!.empresa_id);
            // Mapeando para adicionar o campo calculado "dias_prontos"
            const hoje = new Date();
            const processada = data.map((os: any) => {
                const updated = new Date(os.updated_at); // Simplificação: usando updated_at como data de conclusão
                const dias = differenceInDays(hoje, updated);
                let nivel = "verde";
                if (dias > 30) nivel = "vermelho";
                else if (dias > 15) nivel = "laranja";
                else if (dias > 7) nivel = "amarelo";

                return { ...os, dias_prontos: dias, nivel_alerta: nivel };
            }).sort((a, b) => b.dias_prontos - a.dias_prontos); // Mais atrasados primeiro

            setOrdens(processada);
        } catch (error) {
            console.error("Erro ao carregar prateleira", error);
            toast.error("Erro ao carregar aparelhos da prateleira.");
        } finally {
            setLoading(false);
        }
    }

    const cardsStats = {
        total: ordens.length,
        recentes: ordens.filter(o => o.nivel_alerta === "verde" || o.nivel_alerta === "amarelo").length,
        alerta: ordens.filter(o => o.nivel_alerta === "laranja").length,
        abandono: ordens.filter(o => o.nivel_alerta === "vermelho").length,
    };

    const filtradas = ordens.filter(os => {
        const _search = search.toLowerCase();
        const matcheSearch =
            os.clientes?.nome?.toLowerCase().includes(_search) ||
            os.equipamentos?.marca?.toLowerCase().includes(_search) ||
            os.equipamentos?.modelo?.toLowerCase().includes(_search) ||
            os.numero?.toString().includes(_search);

        let matchTab = true;
        if (ativoTab === "recentes") matchTab = os.nivel_alerta === "verde" || os.nivel_alerta === "amarelo";
        if (ativoTab === "alerta") matchTab = os.nivel_alerta === "laranja";
        if (ativoTab === "abandono") matchTab = os.nivel_alerta === "vermelho";

        return matcheSearch && matchTab;
    });

    const handleOpenWhatsApp = (os: any, tipo: "lembrete" | "taxa" | "abandono") => {
        setOsSelecionada(os);
        setTipoWpp(tipo);
        setModalWppOpen(true);
    };

    const sendWhatsAppAPI = async () => {
        if (!osSelecionada) return;
        setEnviandoZAP(true);
        try {
            const res = await fetch("/api/whatsapp/lembrete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    telefone: osSelecionada.clientes?.telefone || "",
                    clienteNome: osSelecionada.clientes?.nome?.split(' ')[0] || "Cliente",
                    osNumero: osSelecionada.numero,
                    dias: osSelecionada.dias_prontos,
                    tipo: tipoWpp
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            toast.success("Mensagem enviada com sucesso ao cliente!");
            setModalWppOpen(false);
        } catch (error: any) {
            toast.error(error.message || "Falha na comunicação com o WhatsApp.");
        } finally {
            setEnviandoZAP(false);
        }
    };


    return (
        <div className="space-y-6 page-enter pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/os" className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
                            <PackageOpen className="text-brand-500" />
                            Aparelhos na Prateleira
                        </h1>
                        <p className="text-slate-500 text-sm">Controle de retenção, taxas e equipamentos esquecidos.</p>
                    </div>
                </div>
            </div>

            {/* Resumo de Risco (Kpis) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div
                    onClick={() => setAtivoTab("todos")}
                    className={cn(
                        "p-4 rounded-3xl border cursor-pointer hover:shadow-md transition-all",
                        ativoTab === "todos" ? "bg-slate-800 border-slate-900 shadow-lg text-white" : "bg-white border-slate-200"
                    )}
                >
                    <div className="text-xs font-bold uppercase tracking-wider opacity-70 mb-2">Total Aguardando</div>
                    <div className="text-3xl font-black">{cardsStats.total}</div>
                </div>

                <div
                    onClick={() => setAtivoTab("recentes")}
                    className={cn(
                        "p-4 rounded-3xl border cursor-pointer hover:shadow-md transition-all",
                        ativoTab === "recentes" ? "bg-emerald-500 border-emerald-600 shadow-lg shadow-emerald-500/20 text-white" : "bg-emerald-50 border-emerald-100 text-emerald-900"
                    )}
                >
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider opacity-70 mb-2 mt-0.5">
                        <CheckCircle2 size={14} /> Recentes (&lt; 15 dias)
                    </div>
                    <div className="text-3xl font-black">{cardsStats.recentes}</div>
                </div>

                <div
                    onClick={() => setAtivoTab("alerta")}
                    className={cn(
                        "p-4 rounded-3xl border cursor-pointer hover:shadow-md transition-all",
                        ativoTab === "alerta" ? "bg-amber-500 border-amber-600 shadow-lg shadow-amber-500/20 text-white" : "bg-amber-50 border-amber-100 text-amber-900"
                    )}
                >
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider opacity-70 mb-2 mt-0.5">
                        <AlertTriangle size={14} /> Risco (16-30 dias)
                    </div>
                    <div className="text-3xl font-black">{cardsStats.alerta}</div>
                </div>

                <div
                    onClick={() => setAtivoTab("abandono")}
                    className={cn(
                        "p-4 rounded-3xl border cursor-pointer hover:shadow-md transition-all relative overflow-hidden",
                        ativoTab === "abandono" ? "bg-red-500 border-red-600 shadow-lg shadow-red-500/20 text-white" : "bg-red-50 border-red-100 text-red-900"
                    )}
                >
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider opacity-70 mb-2 mt-0.5">
                        <ShieldAlert size={14} /> Abandono (&gt; 30 dias)
                    </div>
                    <div className="text-3xl font-black">{cardsStats.abandono}</div>
                </div>
            </div>

            {/* Barra de Busca e Tabela */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar cliente, aparelho ou #OS..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="py-20 flex flex-col items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-brand-500 mb-4" />
                        <span className="text-slate-500 text-sm">Auditoria da prateleira em andamento...</span>
                    </div>
                ) : filtradas.length === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center text-center">
                        <PackageOpen className="w-12 h-12 text-slate-200 mb-4" />
                        <p className="text-slate-500 font-medium">Nenhum aparelho na prateleira com os filtros atuais.</p>
                        <p className="text-slate-400 text-sm mt-1">Sua expedição está em dia!</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black tracking-wider border-b border-slate-200/60">
                                    <th className="p-4 font-bold rounded-tl-3xl">Tempo na Loja</th>
                                    <th className="p-4 font-bold text-center">O.S #</th>
                                    <th className="p-4 font-bold">Cliente</th>
                                    <th className="p-4 font-bold">Aparelho</th>
                                    <th className="p-4 font-bold text-right">Saldo Devedor</th>
                                    <th className="p-4 font-bold rounded-tr-3xl text-right">Comunicação</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {filtradas.map(os => {
                                    const alertaNivel = os.nivel_alerta;

                                    return (
                                        <tr key={os.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors group">
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={cn(
                                                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
                                                        alertaNivel === "verde" ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                                            alertaNivel === "amarelo" ? "bg-amber-50 text-amber-600 border-amber-100" :
                                                                alertaNivel === "laranja" ? "bg-orange-50 text-orange-600 border-orange-200" :
                                                                    "bg-red-50 text-red-600 border-red-200"
                                                    )}>
                                                        <Clock size={18} />
                                                    </div>
                                                    <div>
                                                        <div className={cn(
                                                            "font-black text-lg",
                                                            alertaNivel === "vermelho" ? "text-red-700" : "text-slate-800"
                                                        )}>
                                                            {os.dias_prontos} dias
                                                        </div>
                                                        <div className="text-[10px] font-bold text-slate-400 uppercase">
                                                            Aguardando
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="text-center font-bold text-brand-600 bg-brand-50 rounded-lg inline-block px-3 py-1 text-xs mx-auto">
                                                    #{os.numero}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <p className="font-bold text-slate-800 truncate max-w-[150px]">{os.clientes?.nome || "Balcão"}</p>
                                                <p className="text-xs text-slate-500">{os.clientes?.telefone || "Sem telefone"}</p>
                                            </td>
                                            <td className="p-4">
                                                <p className="font-medium text-slate-800">{os.equipamentos?.marca} {os.equipamentos?.modelo}</p>
                                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider rounded bg-slate-100 px-1 inline-block mt-0.5">
                                                    {os.status === 'finalizada' ? 'Pronto/Consertado' : 'Sem Conserto'}
                                                </p>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="font-black text-slate-700">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((os.valor_total_centavos || 0) / 100)}
                                                </div>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {os.dias_prontos < 15 ? (
                                                        <button onClick={() => handleOpenWhatsApp(os, "lembrete")} className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 transition-colors tooltip" data-tip="Lembrete" title="Enviar Lembrete">
                                                            <MessagesSquare size={16} />
                                                        </button>
                                                    ) : os.dias_prontos < 30 ? (
                                                        <button onClick={() => handleOpenWhatsApp(os, "taxa")} className="w-9 h-9 flex items-center justify-center rounded-xl bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors tooltip" title="Aviso de Taxa">
                                                            <AlertTriangle size={16} />
                                                        </button>
                                                    ) : (
                                                        <button onClick={() => handleOpenWhatsApp(os, "abandono")} className="w-9 h-9 flex items-center justify-center rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors tooltip" title="Notificação de Abandono (Jurídica)">
                                                            <ShieldAlert size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal de Disparo de WhatsApp */}
            {modalWppOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6">
                        <div className="mb-4 flex gap-3 text-emerald-600">
                            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                                <MessagesSquare size={18} />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 leading-tight">Agente WhatsApp</h3>
                                <p className="text-xs font-medium text-emerald-600">Automação Inteligente</p>
                            </div>
                        </div>

                        <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                            O sistema enviará uma mensagem pré-configurada de <b>{tipoWpp === "abandono" ? "Abandono e Leilão Legal" : tipoWpp === "taxa" ? "Multa de Taxa de Guarda" : "Lembrete Amigável"}</b> para o cliente <strong className="text-slate-800">{osSelecionada?.clientes?.nome || "Cliente"}</strong> no número <b>{osSelecionada?.clientes?.telefone || "—"}</b> referente à OS #{osSelecionada?.numero}.
                        </p>

                        {!osSelecionada?.clientes?.telefone ? (
                            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 flex gap-2 mb-6">
                                <XCircle size={14} className="shrink-0 mt-0.5" />
                                O cliente não possui telefone cadastrado. Vá ao menu clientes para corrigir.
                            </div>
                        ) : (
                            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] text-slate-500 font-medium flex gap-2 mb-6 shadow-inner">
                                <Info size={14} className="shrink-0 text-slate-400 mt-0.5" />
                                Confirme se a API de mensageria da loja está online antes do disparo.
                            </div>
                        )}

                        <div className="flex gap-2">
                            <button onClick={() => setModalWppOpen(false)} disabled={enviandoZAP} className="flex-1 py-3 bg-slate-50 text-slate-600 font-bold text-xs uppercase rounded-xl hover:bg-slate-100 transition-colors">Cancelar</button>
                            <button
                                onClick={sendWhatsAppAPI}
                                disabled={!osSelecionada?.clientes?.telefone || enviandoZAP}
                                className="flex-1 py-3 bg-emerald-500 text-white font-bold text-xs uppercase rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                            >
                                {enviandoZAP ? <Loader2 className="w-4 h-4 animate-spin" /> : "Disparar SMS/WhatsApp"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
