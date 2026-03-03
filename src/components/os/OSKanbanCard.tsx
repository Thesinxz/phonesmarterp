"use client";

import { Smartphone, User, Clock, AlertCircle, MoreHorizontal, ArrowRight, Edit3, Trash2 } from "lucide-react";
import { type OrdemServico } from "@/types/database";
import { cn } from "@/utils/cn";
import { formatDate, formatRelative } from "@/utils/formatDate";

interface OSKanbanCardProps {
    os: OrdemServico & {
        cliente: { nome: string },
        equipamento: { marca: string, modelo: string } | null,
        tecnico: { nome: string } | null,
        created_at: string;
        updated_at: string;
        prioridade: string;
        problema_relatado: string;
    };
    onClick?: () => void;
    onMoveStatus?: (osId: string, status: string) => void;
    onDelete?: (osId: string) => void;
    onEdit?: (osId: string) => void;
}

export function OSKanbanCard({ os, onClick, onMoveStatus, onDelete, onEdit }: OSKanbanCardProps) {
    const priorityColors: any = {
        baixa: "border-l-slate-300",
        media: "border-l-blue-400",
        alta: "border-l-amber-500",
        urgente: "border-l-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.1)]"
    };

    const priorityColor = priorityColors[os.prioridade?.toLowerCase()] || "border-l-slate-400";

    const diffDays = Math.floor((new Date().getTime() - new Date(os.updated_at || os.created_at).getTime()) / (1000 * 60 * 60 * 24));

    return (
        <div
            draggable
            onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", os.id);
                e.currentTarget.classList.add('opacity-50');
            }}
            onDragEnd={(e) => {
                e.currentTarget.classList.remove('opacity-50');
            }}
            onClick={onClick}
            className={cn(
                "glass-card p-4 mb-3 cursor-grab active:cursor-grabbing hover:scale-[1.02] transition-all border-l-4",
                priorityColor
            )}
        >
            <div className="flex justify-between items-start mb-2 relative">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    #{String(os.numero).padStart(4, '0')}
                </span>

                <div className="relative group/menu">
                    <button className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors">
                        <MoreHorizontal size={14} />
                    </button>
                    {/* Simple CSS Dropdown */}
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-slate-100 p-1 z-10 hidden group-hover/menu:block">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit?.(os.id);
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-2"
                        >
                            <Edit3 size={12} className="opacity-50" />
                            Editar OS
                        </button>

                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm("Deseja excluir permanentemente esta OS?")) {
                                    onDelete?.(os.id);
                                }
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
                        >
                            <Trash2 size={12} className="opacity-50" />
                            Excluir OS
                        </button>

                        <div className="h-px bg-slate-100 my-1" />

                        <p className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mover para...</p>
                        {[
                            { label: "Em Análise", value: "em_analise" },
                            { label: "Aguardando Peça", value: "aguardando_peca" },
                            { label: "Em Execução", value: "em_execucao" },
                            { label: "Finalizar", value: "finalizada", color: "text-emerald-600 hover:bg-emerald-50" },
                            { label: "Entregar", value: "entregue", color: "text-blue-600 hover:bg-blue-50" },
                            { label: "Cancelar", value: "cancelada", color: "text-red-600 hover:bg-red-50" },
                        ].map((opt) => (
                            <button
                                key={opt.value}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onMoveStatus?.(os.id, opt.value as any);
                                }}
                                className={cn(
                                    "w-full text-left px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-2",
                                    opt.color
                                )}
                            >
                                <ArrowRight size={12} className="opacity-50" />
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div onClick={onClick} className="cursor-pointer space-y-2">
                <div>
                    <h4 className="font-bold text-slate-800 text-sm mb-0.5 truncate leading-tight">
                        {os.equipamento?.modelo || (os as any).modelo_equipamento || "Sem Modelo"}
                    </h4>
                    <p className="text-[10px] text-slate-400 truncate uppercase tracking-tight">{os.equipamento?.marca || (os as any).marca_equipamento || "Sem Marca"}</p>
                </div>

                <div className="bg-slate-50/80 rounded-lg p-2 border border-slate-100/50">
                    <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">
                        <span className="font-bold text-[9px] uppercase text-slate-400 block mb-0.5">Problema:</span>
                        {os.problema_relatado}
                    </p>
                </div>

                {os.valor_total_centavos > 0 && (
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Orçamento</span>
                        <span className="text-xs font-black text-brand-600">
                            R$ {(os.valor_total_centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                    </div>
                )}

                <div className="flex items-center gap-2 text-xs text-slate-600">
                    <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                        <User size={10} className="text-slate-400" />
                    </div>
                    <span className="truncate font-medium">{os.cliente?.nome || "Cliente avulso"}</span>
                </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                    <Clock size={12} className={cn(diffDays >= 3 ? "text-amber-500" : "text-slate-300")} />
                    <span className={cn(diffDays >= 3 && "text-amber-600")}>
                        {diffDays === 0 ? "Hoje" : diffDays === 1 ? "1 dia" : `${diffDays} dias`}
                    </span>
                </div>

                {os.tecnico ? (
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold text-slate-300 uppercase shrink-0">{os.tecnico.nome.split(' ')[0]}</span>
                        <div className="w-6 h-6 rounded-full bg-brand-500 border-2 border-white shadow-sm flex items-center justify-center text-[10px] font-black text-white uppercase shrink-0">
                            {os.tecnico.nome.substring(0, 1)}
                        </div>
                    </div>
                ) : (
                    <div className="px-2 py-0.5 bg-amber-50 border border-amber-100 rounded-md text-[9px] text-amber-600 font-bold uppercase flex items-center gap-1">
                        <AlertCircle size={10} />
                        Sem técnico
                    </div>
                )}
            </div>
        </div>
    );
}
