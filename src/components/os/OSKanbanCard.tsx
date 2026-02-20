"use client";

import { Smartphone, User, Clock, AlertCircle, MoreHorizontal, ArrowRight } from "lucide-react";
import { type OrdemServico } from "@/types/database";
import { cn } from "@/utils/cn";
import { formatDate, formatRelative } from "@/utils/formatDate";

interface OSKanbanCardProps {
    os: OrdemServico & {
        cliente: { nome: string },
        equipamento: { marca: string, modelo: string } | null,
        tecnico: { nome: string } | null,
        created_at: string
    };
    onClick?: () => void;
    onMoveStatus?: (osId: string, status: string) => void;
}

export function OSKanbanCard({ os, onClick, onMoveStatus }: OSKanbanCardProps) {
    const priorityColor = os.valor_total_centavos > 50000 ? "border-l-amber-500" : "border-l-brand-400";

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

            <div onClick={onClick} className="cursor-pointer">
                {os.valor_total_centavos > 0 && (
                    <span className="block text-xs font-bold text-brand-600 mb-1">
                        R$ {(os.valor_total_centavos / 100).toFixed(2)}
                    </span>
                )}

                <h4 className="font-bold text-slate-800 text-sm mb-1 truncate leading-tight">
                    {os.equipamento?.modelo || (os as any).modelo_equipamento || "Sem Modelo"}
                </h4>
                <p className="text-[10px] text-slate-400 mb-3 truncate">{os.equipamento?.marca || (os as any).marca_equipamento || "Sem Marca"}</p>

                <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                    <User size={12} className="text-slate-400" />
                    <span className="truncate">{os.cliente?.nome || "Cliente não identificado"}</span>
                </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 capitalize">
                    <Clock size={12} />
                    <span>{formatRelative(os.created_at)}</span>
                </div>

                {os.tecnico ? (
                    <div className="flex items-center gap-1">
                        <div className="w-5 h-5 rounded-full bg-brand-100 flex items-center justify-center text-[10px] font-bold text-brand-700 uppercase">
                            {os.tecnico.nome.substring(0, 1)}
                        </div>
                    </div>
                ) : (
                    <div className="text-[10px] text-amber-600 font-semibold flex items-center gap-1">
                        <AlertCircle size={10} />
                        Sem técnico
                    </div>
                )}
            </div>
        </div>
    );
}
