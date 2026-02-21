"use client";

import { Shield, Check, Lock } from "lucide-react";
import { cn } from "@/utils/cn";

interface PermissoesConfigProps {
    permissions: any;
    onChange: (newPermissions: any) => void;
}

const MODULOS = [
    { id: "vendas", label: "Vendas", actions: ["view", "create", "edit", "delete"] },
    { id: "financeiro", label: "Financeiro", actions: ["view", "create", "edit", "delete"] },
    { id: "estoque", label: "Estoque", actions: ["view", "create", "edit", "delete"] },
    { id: "ordens_servico", label: "Ordens de Serviço", actions: ["view", "create", "edit", "delete"] },
    { id: "configuracoes", label: "Configurações", actions: ["view"] },
    { id: "equipe", label: "Gestão de Equipe", actions: ["view", "create", "edit", "delete"] },
];

export default function PermissoesConfig({ permissions, onChange }: PermissoesConfigProps) {
    const handleToggle = (modulo: string, action: string) => {
        const newPerms = { ...permissions };
        if (!newPerms[modulo]) newPerms[modulo] = {};

        newPerms[modulo][action] = !newPerms[modulo][action];
        onChange(newPerms);
    };

    const isAllSelected = (modulo: string) => {
        const m = MODULOS.find(mod => mod.id === modulo);
        if (!m) return false;
        return m.actions.every(action => permissions[modulo]?.[action]);
    };

    const handleToggleAll = (modulo: string) => {
        const m = MODULOS.find(mod => mod.id === modulo);
        if (!m) return;

        const allOn = isAllSelected(modulo);
        const newPerms = { ...permissions };
        if (!newPerms[modulo]) newPerms[modulo] = {};

        m.actions.forEach(action => {
            newPerms[modulo][action] = !allOn;
        });

        onChange(newPerms);
    };

    if (permissions?.all) {
        return (
            <div className="bg-brand-50 border border-brand-100 rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-brand-500 flex items-center justify-center shadow-xl shadow-brand-500/20">
                    <Shield className="text-white w-8 h-8" />
                </div>
                <div>
                    <h3 className="text-brand-900 font-bold uppercase tracking-tight">Acesso Total (Admin)</h3>
                    <p className="text-brand-700/60 text-xs mt-1">Este papel possui todas as permissões do sistema habilitadas por padrão.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {MODULOS.map((modulo) => (
                <div key={modulo.id} className="bg-slate-50 border border-slate-200/60 rounded-2xl overflow-hidden">
                    <div className="bg-white px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-brand-500" />
                            <span className="text-xs font-bold text-slate-800 uppercase tracking-tight">{modulo.label}</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => handleToggleAll(modulo.id)}
                            className={cn(
                                "text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md transition-all",
                                isAllSelected(modulo.id) ? "text-brand-600 bg-brand-50" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                            )}
                        >
                            {isAllSelected(modulo.id) ? "Desmarcar Todos" : "Marcar Todos"}
                        </button>
                    </div>
                    <div className="p-4 grid grid-cols-2 gap-3">
                        {modulo.actions.map((action) => (
                            <label
                                key={action}
                                className={cn(
                                    "flex items-center justify-between group cursor-pointer p-3 rounded-xl border transition-all",
                                    permissions[modulo.id]?.[action]
                                        ? "bg-white border-brand-200 shadow-sm"
                                        : "bg-transparent border-transparent hover:bg-white/50"
                                )}
                            >
                                <span className={cn(
                                    "text-[10px] font-extrabold uppercase tracking-widest transition-colors",
                                    permissions[modulo.id]?.[action] ? "text-brand-700" : "text-slate-400 group-hover:text-slate-600"
                                )}>
                                    {action === 'view' && 'Visualizar'}
                                    {action === 'create' && 'Criar'}
                                    {action === 'edit' && 'Editar'}
                                    {action === 'delete' && 'Excluir'}
                                </span>
                                <div onClick={(e) => {
                                    e.preventDefault();
                                    handleToggle(modulo.id, action);
                                }} className={cn(
                                    "w-5 h-5 rounded-lg flex items-center justify-center transition-all border",
                                    permissions[modulo.id]?.[action]
                                        ? "bg-brand-500 border-brand-600 text-white shadow-lg shadow-brand-500/20"
                                        : "bg-slate-100 border-slate-200 text-transparent"
                                )}>
                                    <Check size={12} strokeWidth={4} />
                                </div>
                            </label>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
