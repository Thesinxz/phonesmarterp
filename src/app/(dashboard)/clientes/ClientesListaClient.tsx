"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Search, Filter, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { getClientes, type ClienteFilters } from "@/services/clientes";
import { type Cliente } from "@/types/database";
import { GlassCard } from "@/components/ui/GlassCard";
import { useRealtimeSubscription } from "@/hooks/useRealtime";
import { toast } from "sonner";

interface Props {
    initialClientes: Cliente[];
    initialCount: number;
    empresaId: string;
}

export function ClientesListaClient({ initialClientes, initialCount, empresaId }: Props) {
    const [clientes, setClientes] = useState<Cliente[]>(initialClientes);
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState<ClienteFilters>({
        search: "",
        segmento: "",
    });
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        const timer = setTimeout(() => {
            setFilters((prev) => ({ ...prev, search: searchTerm }));
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        // Skip first load if filters are empty (already have initialClientes)
        if (filters.search === "" && filters.segmento === "") return;
        loadClientes();
    }, [filters]);

    useRealtimeSubscription({
        table: "clientes",
        filter: `empresa_id=eq.${empresaId}`,
        callback: (payload: any) => {
            if (payload.eventType === 'UPDATE') {
                setClientes(current => current.map(c =>
                    c.id === payload.new.id ? { ...c, ...payload.new } : c
                ));
            } else {
                loadClientes(true); // background refresh
            }
        }
    });

    async function loadClientes(background = false) {
        if (!background) setLoading(true);
        try {
            const { data } = await getClientes(1, 100, { ...filters, empresa_id: empresaId });
            setClientes(data);
        } catch (error) {
            console.error("Erro ao carregar clientes:", error);
            toast.error("Erro ao carregar clientes.");
        } finally {
            if (!background) setLoading(false);
        }
    }

    return (
        <div className="space-y-6 page-enter">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-slate-800">Clientes</h1>
                    <p className="text-slate-500 text-xs md:text-sm mt-0.5">Gerencie sua base de clientes ({clientes.length})</p>
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                    <Link
                        href="/clientes/novo"
                        className="btn-primary flex-1 sm:flex-initial justify-center"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="whitespace-nowrap">Novo Cliente</span>
                    </Link>
                </div>
            </div>

            {/* Filters */}
            <GlassCard className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 py-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nome, email ou CPF/CNPJ..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="input-glass pl-9 w-full"
                    />
                </div>
                <div className="w-full sm:w-48">
                    <select
                        className="input-glass appearance-none cursor-pointer w-full"
                        value={filters.segmento || ""}
                        onChange={(e) => setFilters((prev) => ({ ...prev, segmento: e.target.value }))}
                    >
                        <option value="">Todos os Segmentos</option>
                        <option value="novo">Novo</option>
                        <option value="vip">VIP</option>
                        <option value="atacadista">Atacadista</option>
                    </select>
                </div>
            </GlassCard>

            {/* Table */}
            <GlassCard className="overflow-hidden p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50/50 text-slate-500 font-medium border-b border-slate-100">
                            <tr className="whitespace-nowrap">
                                <th className="px-6 py-4">Nome</th>
                                <th className="px-6 py-4">Contato</th>
                                <th className="px-6 py-4">Segmento</th>
                                <th className="px-6 py-4">Fidelidade</th>
                                <th className="px-6 py-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-4"><div className="h-4 w-32 bg-slate-200 rounded" /></td>
                                        <td className="px-6 py-4"><div className="h-4 w-40 bg-slate-200 rounded" /></td>
                                        <td className="px-6 py-4"><div className="h-4 w-16 bg-slate-200 rounded" /></td>
                                        <td className="px-6 py-4"><div className="h-4 w-12 bg-slate-200 rounded" /></td>
                                        <td className="px-6 py-4"></td>
                                    </tr>
                                ))
                            ) : clientes.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                        Nenhum cliente encontrado.
                                    </td>
                                </tr>
                            ) : (
                                clientes.map((cliente) => (
                                    <tr key={cliente.id} className="hover:bg-slate-50/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-semibold text-slate-800">{cliente.nome}</div>
                                            {cliente.cpf_cnpj && <div className="text-xs text-slate-400">{cliente.cpf_cnpj}</div>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-slate-600 truncate max-w-[200px]">{cliente.email || "-"}</div>
                                            <div className="text-xs text-slate-400">{cliente.telefone || "-"}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {cliente.segmento && (
                                                <span className={`badge ${cliente.segmento === 'vip' ? 'badge-purple' :
                                                    cliente.segmento === 'atacadista' ? 'badge-blue' : 'badge-green'
                                                    }`}>
                                                    {cliente.segmento.toUpperCase()}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5 text-amber-600 font-medium">
                                                {cliente.pontos_fidelidade} pts
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link href={`/clientes/${cliente.id}`} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-brand-600 transition-colors">
                                                    <Edit className="w-4 h-4" />
                                                </Link>
                                                <button className="p-2 hover:bg-red-50 rounded-lg text-slate-500 hover:text-red-500 transition-colors">
                                                    <Trash2 className="w-4 h-4" />
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
