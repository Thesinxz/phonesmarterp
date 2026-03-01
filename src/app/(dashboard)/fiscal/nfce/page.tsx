"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Search, QrCode, Ban, Eye, FileDigit } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { getDocumentosFiscais } from "@/services/fiscal";
import { useAuth } from "@/context/AuthContext";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatDate } from "@/utils/formatDate";
import { cn } from "@/utils/cn";

export default function NFCeListPage() {
    const { profile } = useAuth();
    const [documentos, setDocumentos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (profile?.empresa_id) {
            loadDocumentos();
        }
    }, [profile?.empresa_id]);

    async function loadDocumentos() {
        if (!profile) return;
        setLoading(true);
        try {
            const response = await getDocumentosFiscais(profile.empresa_id);
            const nfeDocs = response.filter((doc: any) => doc.tipo === "NFCE");
            setDocumentos(nfeDocs);
        } catch (error) {
            console.error("Erro ao carregar NFC-es", error);
        } finally {
            setLoading(false);
        }
    }

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'autorizado': return "bg-emerald-100 text-emerald-700";
            case 'cancelado': return "bg-red-100 text-red-700";
            case 'processando': return "bg-amber-100 text-amber-700";
            case 'erro': return "bg-rose-100 text-rose-700";
            default: return "bg-slate-100 text-slate-700";
        }
    };

    return (
        <div className="space-y-6 page-enter pb-12">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                        <QrCode className="text-emerald-500" /> Notas Fiscais de Consumidor (NFC-e)
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Gerencie as NFC-es (Mod. 65) emitidas via PDV</p>
                </div>
                <div className="flex gap-3">
                    <Link href="/fiscal/nfce/nova" className="btn-primary h-11 px-6 flex items-center gap-2">
                        <Plus size={18} /> Emitir NFC-e
                    </Link>
                </div>
            </div>

            <GlassCard className="p-0 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-white/50 flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            placeholder="Buscar por número da nota, venda, cpf..."
                            className="input-glass pl-10"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="text-[10px] uppercase text-slate-400 font-bold bg-slate-50/50">
                            <tr>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Série/Número</th>
                                <th className="px-6 py-4">Data Emissão</th>
                                <th className="px-6 py-4">Venda ID / Cliente</th>
                                <th className="px-6 py-4 text-right">Valor Total</th>
                                <th className="px-6 py-4 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                        <div className="flex justify-center mb-2">
                                            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                                        </div>
                                        Carregando documentos...
                                    </td>
                                </tr>
                            ) : documentos.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                        <FileDigit size={32} className="mx-auto mb-3 opacity-20" />
                                        Nenhuma NFC-e encontrada
                                    </td>
                                </tr>
                            ) : (
                                documentos.map(doc => (
                                    <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold uppercase", getStatusStyle(doc.status))}>
                                                {doc.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-slate-700">{doc.numero ? String(doc.numero).padStart(9, '0') : "S/N"}</p>
                                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">{doc.chave_acesso || "Sem chave"}</p>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {doc.data_emissao ? formatDate(doc.data_emissao) : formatDate(doc.created_at)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-medium text-slate-700">Venda: {doc.venda_id ? "Sim" : "Avulsa"}</p>
                                            <p className="text-xs text-slate-500 max-w-[200px] truncate">
                                                {doc.dados_json?.geral?.nomeConsumidor || doc.dados_json?.geral?.cpfCnpjConsumidor || "Consumidor Não Identificado"}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-slate-700">
                                            {formatCurrency(doc.valor_total_centavos || 0)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-center gap-2 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Visualizar Detalhes">
                                                    <Eye size={16} />
                                                </button>
                                                <button className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Cancelar Documento" disabled={doc.status === 'cancelado'}>
                                                    <Ban size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </GlassCard>
        </div>
    );
}
