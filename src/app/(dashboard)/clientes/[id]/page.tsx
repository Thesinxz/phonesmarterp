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
import { getClienteById, updateCliente } from "@/services/clientes";
import { getEquipamentosByCliente, createEquipamento, deleteEquipamento } from "@/services/equipamentos";
import { type Cliente, type Equipamento } from "@/types/database";
import { GlassCard } from "@/components/ui/GlassCard";
import { formatDate } from "@/utils/formatDate";

export default function ClienteDetalhesPage() {
    const { id } = useParams() as { id: string };
    const router = useRouter();
    const [cliente, setCliente] = useState<Cliente | null>(null);
    const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
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
            const [clienteData, equipData] = await Promise.all([
                getClienteById(id),
                getEquipamentosByCliente(id)
            ]);
            setCliente(clienteData);
            setEquipamentos(equipData);
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
                        <div className="space-y-3">
                            {/* 
                            TODO: Implement real calculations for these metrics
                            <div className="flex justify-between text-sm text-slate-600">
                                <span>Total de OS</span>
                                <span className="font-semibold text-slate-800">-</span>
                            </div>
                            <div className="flex justify-between text-sm text-slate-600">
                                <span>Total Gasto</span>
                                <span className="font-semibold text-brand-600">-</span>
                            </div>
                            */}
                            <div className="flex justify-between text-sm text-slate-600">
                                <span>Pontos Acumulados</span>
                                <span className="font-semibold text-amber-600">{cliente.pontos_fidelidade || 0} pts</span>
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
                </div>
            </div>
        </div>
    );
}
