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
                "glass-card p-2.5 mb-2 cursor-grab active:cursor-grabbing hover:translate-y-[-2px] transition-all border-l-4",
                priorityColor
            )}
        >
            <div className="flex justify-between items-start mb-1.5 relative">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-1 py-0.5 rounded">
                    #{String(os.numero).padStart(4, '0')}
                </span>

                <div className="relative group/menu">
                    <button className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors">
                        <MoreHorizontal size={14} />
                    </button>
                    <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-xl border border-slate-100 p-1 z-10 hidden group-hover/menu:block">
                        <button
                            onClick={(e) => { e.stopPropagation(); onEdit?.(os.id); }}
                            className="w-full text-left px-3 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-2"
                        >
                            <Edit3 size={12} className="opacity-50" />
                            Editar OS
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); if (window.confirm("Excluir permanentemente?")) onDelete?.(os.id); }}
                            className="w-full text-left px-3 py-1.5 text-[11px] font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
                        >
                            <Trash2 size={12} className="opacity-50" />
                            Excluir
                        </button>
                        <div className="h-px bg-slate-100 my-1" />
                        <p className="px-3 py-1 text-[9px] font-black text-slate-400 uppercase leading-none mt-1 mb-1">Mover...</p>
                        {[
                            { label: "Em Análise", value: "em_analise" },
                            { label: "Aguardando Peça", value: "aguardando_peca" },
                            { label: "Em Execução", value: "em_execucao" },
                            { label: "Finalizar", value: "finalizada", color: "text-emerald-600" },
                        ].map((opt) => (
                            <button
                                key={opt.value}
                                onClick={(e) => { e.stopPropagation(); onMoveStatus?.(os.id, opt.value); }}
                                className={cn("w-full text-left px-3 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition-colors", opt.color)}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div onClick={onClick} className="cursor-pointer">
                <div className="mb-2">
                    <h4 className="font-black text-slate-800 text-xs truncate leading-tight tracking-tight uppercase">
                        {os.equipamento?.modelo || (os as any).modelo_equipamento || "Sem Modelo"}
                    </h4>
                    <p className="text-[9px] text-slate-400 truncate font-bold uppercase tracking-tighter">
                        {os.equipamento?.marca || (os as any).marca_equipamento || "Sem Marca"}
                    </p>
                </div>

                <div className="bg-slate-50/50 rounded-lg p-2 mb-2 border border-slate-100/50">
                    <p className="text-[10px] text-slate-600 line-clamp-2 leading-tight font-medium">
                        {os.problema_relatado}
                    </p>
                </div>

                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-600 font-bold truncate pr-2">
                        <User size={10} className="text-slate-400 shrink-0" />
                        <span className="truncate">{os.cliente?.nome?.split(' ')[0]}...</span>
                    </div>
                    {os.valor_total_centavos > 0 && (
                        <span className="text-[11px] font-black text-brand-600 shrink-0">
                            R${(os.valor_total_centavos / 100).toFixed(0)}
                        </span>
                    )}
                </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100/60">
                <div className="flex items-center gap-1 text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                    <Clock size={10} className={cn(diffDays >= 3 ? "text-amber-500" : "text-slate-300")} />
                    <span className={cn(diffDays >= 3 && "text-amber-600")}>
                        {diffDays === 0 ? "Hoje" : `${diffDays}d`}
                    </span>
                </div>

                {os.tecnico ? (
                    <div className="flex items-center gap-1.5 overflow-hidden">
                        <span className="text-[8px] font-black text-slate-300 uppercase truncate max-w-[40px]">{os.tecnico.nome.split(' ')[0]}</span>
                        <div className="w-5 h-5 rounded-full bg-slate-200 border border-white flex items-center justify-center text-[9px] font-black text-slate-600 uppercase shrink-0">
                            {os.tecnico.nome.substring(0, 1)}
                        </div>
                    </div>
                ) : (
                    <div className="text-[8px] text-amber-500 font-black uppercase flex items-center gap-0.5">
                        <AlertCircle size={8} /> Pendente
                    </div>
                )}
            </div>
        </div>
    );
}
