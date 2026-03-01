"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft,
    User,
    Smartphone,
    History,
    Edit,
    Plus,
    Phone,
    Mail,
    MapPin,
    Calendar,
    Save,
    Trash2
} from "lucide-react";
import { getClienteById, updateCliente, getClienteStats, getClienteTimeline } from "@/services/clientes";
import { getEquipamentosByCliente, createEquipamento, deleteEquipamento } from "@/services/equipamentos";
import { type Cliente, type Equipamento } from "@/types/database";
import { GlassCard } from "@/components/ui/GlassCard";
import { formatDate } from "@/utils/formatDate";
import { formatCurrency } from "@/utils/formatCurrency";
import { ShoppingBag, ChevronRight, CheckCircle2, TrendingUp, Wrench } from "lucide-react";
import { cn } from "@/utils/cn";

export default function ClienteDetalhesPage() {
    const { id } = useParams() as { id: string };
    const router = useRouter();
    const [cliente, setCliente] = useState<Cliente | null>(null);
    const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [timeline, setTimeline] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddingEquipamento, setIsAddingEquipamento] = useState(false);

    // New equipment form state
    const [newEquip, setNewEquip] = useState({
        marca: "",
        modelo: "",
        imei: "",
        cor: "",
        observacoes: ""
    });

    useEffect(() => {
        loadData();
    }, [id]);

    async function loadData() {
        setLoading(true);
        try {
            const [clienteData, equipData, statsData, timelineData] = await Promise.all([
                getClienteById(id),
                getEquipamentosByCliente(id),
                getClienteStats(id),
                getClienteTimeline(id)
            ]);
            setCliente(clienteData);
            setEquipamentos(equipData);
            setStats(statsData);
            setTimeline(timelineData);
        } catch (error) {
            console.error("Erro ao carregar dados:", error);
        } finally {
            setLoading(false);
        }
    }

    async function handleAddEquipamento(e: React.FormEvent) {
        e.preventDefault();
        if (!cliente) return;

        try {
            await createEquipamento({
                cliente_id: cliente.id,
                empresa_id: cliente.empresa_id,
                marca: newEquip.marca,
                modelo: newEquip.modelo,
                imei: newEquip.imei || null,
                cor: newEquip.cor || null,
                observacoes: newEquip.observacoes || null
            });
            setNewEquip({ marca: "", modelo: "", imei: "", cor: "", observacoes: "" });
            setIsAddingEquipamento(false);
            loadData();
        } catch (error) {
            console.error("Erro ao adicionar equipamento:", error);
        }
    }

    async function handleDeleteEquipamento(equipId: string) {
        if (!confirm("Tem certeza que deseja remover este equipamento?")) return;
        try {
            await deleteEquipamento(equipId);
            loadData();
        } catch (error) {
            console.error("Erro ao deletar equipamento:", error);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
            </div>
        );
    }

    if (!cliente) {
        return (
            <div className="text-center py-12">
                <p className="text-slate-500">Cliente não encontrado.</p>
                <Link href="/clientes" className="mt-4 text-brand-500 hover:underline inline-block">
                    Voltar para lista
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6 page-enter">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/clientes" className="p-2 hover:bg-white/50 rounded-lg transition-colors">
                        <ArrowLeft className="w-5 h-5 text-slate-600" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">{cliente.nome}</h1>
                        <p className="text-slate-500 text-sm mt-0.5">Detalhes do Cliente</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button className="btn-secondary">
                        <History className="w-4 h-4" />
                        Histórico de OS
                    </button>
                    <button className="btn-primary">
                        <Edit className="w-4 h-4" />
                        Editar Cliente
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
                {/* Info Card */}
                <div className="col-span-1 space-y-6">
                    <GlassCard title="Informações" icon={User}>
                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <Phone className="w-4 h-4 text-slate-400 mt-0.5" />
                                <div>
                                    <p className="text-xs text-slate-400 uppercase font-semibold">Telefone</p>
                                    <p className="text-sm text-slate-700">{cliente.telefone || "Não informado"}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Mail className="w-4 h-4 text-slate-400 mt-0.5" />
                                <div>
                                    <p className="text-xs text-slate-400 uppercase font-semibold">E-mail</p>
                                    <p className="text-sm text-slate-700">{cliente.email || "Não informado"}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <span className="w-4 h-4 text-slate-400 mt-0.5 font-bold text-center">@</span>
                                <div>
                                    <p className="text-xs text-slate-400 uppercase font-semibold">Instagram</p>
                                    {cliente.instagram ? (
                                        <a href={`https://instagram.com/${cliente.instagram}`} target="_blank" rel="noopener noreferrer" className="text-sm text-brand-500 hover:underline">
                                            @{cliente.instagram}
                                        </a>
                                    ) : (
                                        <p className="text-sm text-slate-700">Não informado</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                                <div>
                                    <p className="text-xs text-slate-400 uppercase font-semibold">Endereço</p>
                                    <p className="text-sm text-slate-700">
                                        {cliente.endereco_json ? (
                                            `${(cliente.endereco_json as any).logradouro}, ${(cliente.endereco_json as any).numero}`
                                        ) : "Não informado"}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Plus className="w-4 h-4 text-slate-400 mt-0.5" />
                                <div>
                                    <p className="text-xs text-slate-400 uppercase font-semibold">CPF/CNPJ</p>
                                    <p className="text-sm text-slate-700">{cliente.cpf_cnpj || "Não informado"}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Smartphone className="w-4 h-4 text-slate-400 mt-0.5" />
                                <div>
                                    <p className="text-xs text-slate-400 uppercase font-semibold">Segmento</p>
                                    <span className={`badge ${cliente.segmento === 'vip' ? 'badge-purple' : 'badge-green'} mt-1`}>
                                        {cliente.segmento?.toUpperCase() || "NOVO"}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </GlassCard>

                    <GlassCard title="Fidelidade" icon={Calendar}>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500 font-medium">Total de OS</span>
                                <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">{stats?.totalOs || 0}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500 font-medium">Outros Pedidos</span>
                                <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-bold">{stats?.totalVendas || 0}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500 font-medium font-bold">Total Gasto</span>
                                <span className="text-brand-600 font-black text-base">{formatCurrency(stats?.totalGastoCentavos || 0)}</span>
                            </div>
                            <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-sm">
                                <span className="text-slate-500 font-medium">Pontos Acumulados</span>
                                <span className="text-amber-600 font-black flex items-center gap-1">
                                    <TrendingUp size={14} />
                                    {cliente.pontos_fidelidade || 0} pts
                                </span>
                            </div>
                        </div>
                    </GlassCard>
                </div>

                {/* Equipment List */}
                <div className="col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <Smartphone className="w-5 h-5 text-brand-500" />
                            Equipamentos
                        </h2>
                        <button
                            className="bg-brand-500/10 text-brand-600 px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-brand-500/20 transition-all flex items-center gap-2"
                            onClick={() => setIsAddingEquipamento(!isAddingEquipamento)}
                        >
                            <Plus className="w-4 h-4" />
                            Adicionar
                        </button>
                    </div>

                    {isAddingEquipamento && (
                        <div className="glass-card border-brand-200 bg-brand-50/30">
                            <form onSubmit={handleAddEquipamento} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-semibold text-slate-500 uppercase">Marca *</label>
                                        <input
                                            required
                                            className="input-glass mt-1"
                                            placeholder="Ex: Apple"
                                            value={newEquip.marca}
                                            onChange={e => setNewEquip({ ...newEquip, marca: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-slate-500 uppercase">Modelo *</label>
                                        <input
                                            required
                                            className="input-glass mt-1"
                                            placeholder="Ex: iPhone 13"
                                            value={newEquip.modelo}
                                            onChange={e => setNewEquip({ ...newEquip, modelo: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-slate-500 uppercase">IMEI / Serial</label>
                                        <input
                                            className="input-glass mt-1"
                                            placeholder="Opcional"
                                            value={newEquip.imei}
                                            onChange={e => setNewEquip({ ...newEquip, imei: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-slate-500 uppercase">Cor</label>
                                        <input
                                            className="input-glass mt-1"
                                            placeholder="Ex: Space Gray"
                                            value={newEquip.cor}
                                            onChange={e => setNewEquip({ ...newEquip, cor: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 uppercase">Observações</label>
                                    <input
                                        className="input-glass mt-1"
                                        placeholder="Ex: Tela trincada, marcas de uso"
                                        value={newEquip.observacoes}
                                        onChange={e => setNewEquip({ ...newEquip, observacoes: e.target.value })}
                                    />
                                </div>
                                <div className="flex justify-end gap-2 text-sm">
                                    <button
                                        type="button"
                                        className="px-3 py-1.5 text-slate-600 font-medium"
                                        onClick={() => setIsAddingEquipamento(false)}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="bg-brand-500 text-white px-4 py-1.5 rounded-lg font-semibold hover:bg-brand-600"
                                    >
                                        <Save className="w-4 h-4 mr-1 inline" />
                                        Salvar Equipamento
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-4">
                        {equipamentos.length === 0 ? (
                            <div className="glass-card py-12 text-center text-slate-400 italic">
                                Nenhum equipamento cadastrado para este cliente.
                            </div>
                        ) : (
                            equipamentos.map((equip) => (
                                <div key={equip.id} className="glass-card group hover:shadow-glass-lg transition-all flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center text-brand-500">
                                            <Smartphone size={24} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-800">{equip.marca} {equip.modelo}</h3>
                                            <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                                                {equip.imei && <span>IMEI: {equip.imei}</span>}
                                                {equip.cor && <span>Cor: {equip.cor}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-brand-500 transition-colors">
                                            <Edit size={16} />
                                        </button>
                                        <button
                                            className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                                            onClick={() => handleDeleteEquipamento(equip.id)}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Timeline de Atividades 360º */}
                    <div className="space-y-4 pt-4">
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <History className="w-5 h-5 text-brand-500" />
                            Histórico de Interações (360º)
                        </h2>

                        <div className="space-y-4 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                            {timeline.length === 0 ? (
                                <div className="glass-card py-10 text-center text-slate-400 italic before:hidden">
                                    Nenhuma interação registrada no histórico.
                                </div>
                            ) : (
                                timeline.map((item) => (
                                    <div key={item.id} className="flex gap-4 relative group">
                                        <div className={cn(
                                            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 z-10 transition-all shadow-sm",
                                            item.tipo === 'os' ? "bg-blue-100 text-blue-600 group-hover:bg-blue-500 group-hover:text-white" :
                                                item.tipo === 'venda' ? "bg-emerald-100 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white" :
                                                    "bg-purple-100 text-purple-600 group-hover:bg-purple-500 group-hover:text-white"
                                        )}>
                                            {item.tipo === 'os' ? <Wrench size={18} /> :
                                                item.tipo === 'venda' ? <ShoppingBag size={18} /> :
                                                    <TrendingUp size={18} />}
                                        </div>

                                        <div className="flex-1 glass-card hover:bg-white/80 transition-all cursor-pointer">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={cn(
                                                            "text-[9px] font-black uppercase px-2 py-0.5 rounded tracking-widest",
                                                            item.tipo === 'os' ? "bg-blue-50 text-blue-500" :
                                                                item.tipo === 'venda' ? "bg-emerald-50 text-emerald-500" :
                                                                    "bg-purple-50 text-purple-500"
                                                        )}>
                                                            {item.tipo === 'os' ? `Ordem #${String(item.numero || '').padStart(4, '0')}` :
                                                                item.tipo === 'venda' ? `Venda #${String(item.numero || '').padStart(4, '0')}` :
                                                                    `Financeiro #${String(item.numero || '').padStart(4, '0')}`}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 font-medium">{formatDate(item.data)}</span>
                                                    </div>
                                                    <p className="text-sm font-bold text-slate-800 mt-1">{item.descricao}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-black text-slate-700">{formatCurrency(item.valor)}</p>
                                                    <div className="flex items-center gap-1 justify-end mt-0.5">
                                                        <CheckCircle2 size={10} className="text-emerald-500" />
                                                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-tighter">{item.status}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <Link
                                                href={item.tipo === 'os' ? `/os/${item.id}` :
                                                    item.tipo === 'venda' ? `/vendas` :
                                                        `/financeiro`}
                                                className="text-[10px] font-bold text-brand-500 uppercase tracking-widest flex items-center gap-1 hover:gap-2 transition-all mt-3"
                                            >
                                                Ver Detalhes <ChevronRight size={10} />
                                            </Link>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
