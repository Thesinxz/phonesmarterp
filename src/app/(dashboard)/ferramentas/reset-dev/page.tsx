"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { AlertTriangle, Trash2, RotateCcw, CheckCircle2, Loader2 } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";

const TABLES_TO_CLEAR = [
    "audit_logs",
    "os_timeline",
    "venda_itens",
    "vendas",
    "ordens_servico",
    "equipamentos",
    "financeiro",
    "produtos",
    "clientes",
    "tecnicos",
    "configuracoes",
];

export default function ResetDevPage() {
    const { profile, empresa } = useAuth();
    const [running, setRunning] = useState(false);
    const [log, setLog] = useState<string[]>([]);
    const [done, setDone] = useState(false);
    const [confirmText, setConfirmText] = useState("");

    const supabase = createClient();

    const addLog = (msg: string) => {
        setLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    async function handleReset() {
        if (!profile?.empresa_id) {
            addLog("❌ Erro: empresa_id não encontrado no perfil.");
            return;
        }

        setRunning(true);
        setDone(false);
        setLog([]);

        const empresaId = profile.empresa_id;
        addLog(`🏢 Empresa: ${empresa?.nome || empresaId}`);
        addLog(`🔄 Iniciando limpeza de ${TABLES_TO_CLEAR.length} tabelas...`);

        for (const table of TABLES_TO_CLEAR) {
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { error, count } = await (supabase.from(table) as any)
                    .delete({ count: "exact" })
                    .eq("empresa_id", empresaId);

                if (error) {
                    addLog(`⚠️ ${table}: ${error.message}`);
                } else {
                    addLog(`✅ ${table}: ${count ?? "?"} registros removidos`);
                }
            } catch (err: any) {
                addLog(`❌ ${table}: ${err.message}`);
            }
        }

        addLog("🎉 Limpeza concluída! Recarregue a página para ver o onboarding.");
        setDone(true);
        setRunning(false);
    }

    const canReset = confirmText === "RESETAR";

    return (
        <div className="space-y-6 page-enter pb-12 max-w-2xl mx-auto">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600">
                        <RotateCcw size={20} />
                    </div>
                    Reset de Desenvolvimento
                </h1>
                <p className="text-slate-500 text-sm mt-1">
                    Remove todos os dados da empresa e reseta o onboarding para testar do zero.
                </p>
            </div>

            {/* Warning */}
            <GlassCard className="p-6 border-red-200 bg-red-50/30">
                <div className="flex gap-4">
                    <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={24} />
                    <div>
                        <h3 className="font-bold text-red-800 mb-1">⚠️ Ação Irreversível</h3>
                        <p className="text-red-700 text-sm leading-relaxed">
                            Esta ação vai <strong>apagar permanentemente</strong> todos os dados da empresa:{" "}
                            clientes, produtos, ordens de serviço, vendas, financeiro, técnicos, configurações e logs de auditoria.
                        </p>
                        <p className="text-red-600 text-xs mt-2 font-bold uppercase tracking-wider">
                            Use apenas em ambiente de desenvolvimento/testes.
                        </p>
                    </div>
                </div>
            </GlassCard>

            {/* Info */}
            <GlassCard className="p-6">
                <h3 className="font-bold text-slate-800 mb-3">O que será apagado:</h3>
                <div className="grid grid-cols-2 gap-2">
                    {TABLES_TO_CLEAR.map(table => (
                        <div key={table} className="flex items-center gap-2 text-sm text-slate-600">
                            <Trash2 size={12} className="text-red-400" />
                            <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono">{table}</code>
                        </div>
                    ))}
                </div>
                <div className="mt-4 p-3 rounded-xl bg-blue-50 border border-blue-100">
                    <p className="text-blue-700 text-xs font-medium">
                        ℹ️ A tabela <code className="font-bold">empresas</code> e <code className="font-bold">usuarios</code> serão mantidas.
                        Apenas os dados operacionais serão removidos.
                    </p>
                </div>
            </GlassCard>

            {/* Confirm */}
            {!done && (
                <GlassCard className="p-6">
                    <label className="label-sm mb-2 block">
                        Digite <span className="font-mono font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">RESETAR</span> para confirmar:
                    </label>
                    <div className="flex gap-3">
                        <input
                            className="input-glass flex-1 font-mono text-center text-lg tracking-widest"
                            value={confirmText}
                            onChange={e => setConfirmText(e.target.value.toUpperCase())}
                            placeholder="RESETAR"
                            disabled={running}
                        />
                        <button
                            onClick={handleReset}
                            disabled={!canReset || running}
                            className="px-6 py-2.5 bg-red-500 hover:bg-red-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all flex items-center gap-2 shadow-lg"
                        >
                            {running ? (
                                <Loader2 size={18} className="animate-spin" />
                            ) : (
                                <Trash2 size={18} />
                            )}
                            {running ? "Executando..." : "Executar Reset"}
                        </button>
                    </div>
                </GlassCard>
            )}

            {/* Log */}
            {log.length > 0 && (
                <GlassCard className="p-0 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-900 flex items-center justify-between">
                        <h3 className="font-bold text-white text-sm flex items-center gap-2">
                            {done ? <CheckCircle2 size={16} className="text-emerald-400" /> : <Loader2 size={16} className="animate-spin text-blue-400" />}
                            Console de Execução
                        </h3>
                    </div>
                    <div className="bg-slate-950 p-4 max-h-[300px] overflow-y-auto font-mono text-xs space-y-1">
                        {log.map((line, i) => (
                            <div key={i} className={
                                line.includes("❌") ? "text-red-400" :
                                    line.includes("⚠️") ? "text-amber-400" :
                                        line.includes("✅") ? "text-emerald-400" :
                                            line.includes("🎉") ? "text-brand-400 font-bold" :
                                                "text-slate-400"
                            }>
                                {line}
                            </div>
                        ))}
                    </div>
                </GlassCard>
            )}

            {/* Post-reset action */}
            {done && (
                <div className="text-center">
                    <button
                        onClick={() => window.location.href = "/dashboard"}
                        className="btn-primary px-8 py-3 text-sm shadow-brand-glow"
                    >
                        <RotateCcw size={18} className="mr-2" />
                        Ir para Dashboard (Onboarding)
                    </button>
                </div>
            )}
        </div>
    );
}
