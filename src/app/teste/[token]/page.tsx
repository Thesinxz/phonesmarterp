"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, XCircle, Smartphone, Shield } from "lucide-react";
import { TesteSom } from "@/components/teste/TesteSom";
import { TesteTouch } from "@/components/teste/TesteTouch";
import { TesteTela } from "@/components/teste/TesteTela";
import { TesteCamera } from "@/components/teste/TesteCamera";
import { TesteMicrofone } from "@/components/teste/TesteMicrofone";
import { TesteVibracao } from "@/components/teste/TesteVibracao";
import { TesteConectividade } from "@/components/teste/TesteConectividade";

interface OSInfo {
    numero: number;
    equipamento: { marca: string; modelo: string; imei?: string; cor?: string };
    garantia_dias: number;
}

type TestResult = "ok" | "defeito" | "pendente";

interface TesteStep {
    id: string;
    label: string;
    emoji: string;
}

const TESTES: TesteStep[] = [
    { id: "som_inferior", label: "Alto-falante Inferior", emoji: "🔊" },
    { id: "som_auricular", label: "Auricular (Topo)", emoji: "🔈" },
    { id: "vibracao", label: "Vibração", emoji: "📳" },
    { id: "touch", label: "Touch Screen", emoji: "👆" },
    { id: "tela_display", label: "Tela / Display", emoji: "🎨" },
    { id: "camera_traseira", label: "Câmera Traseira", emoji: "📸" },
    { id: "camera_frontal", label: "Câmera Frontal", emoji: "🤳" },
    { id: "microfone", label: "Microfone", emoji: "🎤" },
    { id: "wifi", label: "Wi-Fi / Internet", emoji: "📶" },
];

export default function TestePage({ params }: { params: { token: string } }) {
    const [estado, setEstado] = useState<"loading" | "ready" | "testing" | "done" | "error">("loading");
    const [osInfo, setOsInfo] = useState<OSInfo | null>(null);
    const [erroMsg, setErroMsg] = useState("");
    const [stepAtual, setStepAtual] = useState(0);
    const [resultados, setResultados] = useState<Record<string, TestResult>>({});
    const [enviando, setEnviando] = useState(false);

    useEffect(() => {
        carregarOS();
    }, []);

    async function carregarOS() {
        try {
            const res = await fetch(`/api/teste/${params.token}`);
            if (!res.ok) {
                const data = await res.json();
                setErroMsg(data.error || "Erro desconhecido");
                setEstado("error");
                return;
            }
            const data = await res.json();
            setOsInfo(data);
            setEstado("ready");
        } catch {
            setErroMsg("Não foi possível conectar ao servidor.");
            setEstado("error");
        }
    }

    const handleResult = (testeId: string, ok: boolean) => {
        setResultados(prev => ({ ...prev, [testeId]: ok ? "ok" : "defeito" }));

        if (stepAtual < TESTES.length - 1) {
            setTimeout(() => setStepAtual(prev => prev + 1), 300);
        } else {
            // Último teste
            setTimeout(() => setEstado("done"), 300);
        }
    };

    async function enviarResultados() {
        setEnviando(true);
        try {
            const res = await fetch(`/api/teste/${params.token}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ resultados })
            });

            if (!res.ok) {
                const data = await res.json();
                alert(data.error || "Erro ao enviar");
            }
        } catch {
            alert("Erro de conexão");
        } finally {
            setEnviando(false);
        }
    }

    const progresso = Math.round((Object.keys(resultados).length / TESTES.length) * 100);

    // === TELA DE LOADING ===
    if (estado === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-white/60">Carregando teste...</p>
                </div>
            </div>
        );
    }

    // === TELA DE ERRO ===
    if (estado === "error") {
        return (
            <div className="min-h-screen flex items-center justify-center p-6">
                <div className="text-center max-w-sm">
                    <XCircle size={64} className="text-red-500 mx-auto mb-4" />
                    <h1 className="text-xl font-bold text-white mb-2">Teste Indisponível</h1>
                    <p className="text-white/60 text-sm">{erroMsg}</p>
                </div>
            </div>
        );
    }

    // === TELA INICIAL ===
    if (estado === "ready") {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6">
                <div className="text-center max-w-sm">
                    <div className="w-20 h-20 rounded-full bg-indigo-500/20 flex items-center justify-center mx-auto mb-6">
                        <Smartphone size={40} className="text-indigo-400" />
                    </div>
                    <p className="text-indigo-400 text-xs font-bold uppercase tracking-widest mb-2">SmartOS Diagnóstico</p>
                    <h1 className="text-2xl font-bold text-white mb-2">
                        OS #{String(osInfo?.numero).padStart(4, "0")}
                    </h1>
                    <p className="text-white/80 font-semibold">
                        {osInfo?.equipamento?.marca} {osInfo?.equipamento?.modelo}
                    </p>
                    {osInfo?.equipamento?.cor && (
                        <p className="text-white/40 text-sm">Cor: {osInfo.equipamento.cor}</p>
                    )}

                    <div className="mt-8 bg-white/5 rounded-2xl p-4 border border-white/10 text-left">
                        <p className="text-white/60 text-xs mb-3 font-bold uppercase tracking-wider">Bateria de Testes ({TESTES.length})</p>
                        <div className="grid grid-cols-3 gap-2">
                            {TESTES.map(t => (
                                <div key={t.id} className="text-center py-2 px-1 bg-white/5 rounded-lg">
                                    <span className="text-lg">{t.emoji}</span>
                                    <p className="text-[10px] text-white/50 mt-0.5 leading-tight">{t.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={() => setEstado("testing")}
                        className="w-full mt-8 py-5 rounded-2xl bg-indigo-600 text-white font-bold text-xl active:scale-95 transition-transform shadow-xl shadow-indigo-500/30"
                    >
                        ▶ Iniciar Diagnóstico
                    </button>
                </div>
            </div>
        );
    }

    // === TELA DE TESTES ===
    if (estado === "testing") {
        const testeAtual = TESTES[stepAtual];

        return (
            <div className="min-h-screen flex flex-col">
                {/* Barra de progresso */}
                <div className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-white/5 p-4 safe-area-top">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-white/60 text-xs font-bold">
                            Teste {stepAtual + 1}/{TESTES.length}
                        </span>
                        <span className="text-indigo-400 text-xs font-bold">{progresso}%</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                        <div
                            className="bg-indigo-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${progresso}%` }}
                        />
                    </div>
                    <div className="flex gap-1 mt-2">
                        {TESTES.map((t, i) => (
                            <div
                                key={t.id}
                                className={`h-1 flex-1 rounded-full transition-all ${resultados[t.id] === "ok" ? "bg-emerald-500" :
                                        resultados[t.id] === "defeito" ? "bg-red-500" :
                                            i === stepAtual ? "bg-indigo-500" : "bg-white/10"
                                    }`}
                            />
                        ))}
                    </div>
                </div>

                {/* Conteúdo do teste atual */}
                <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
                    {testeAtual.id === "som_inferior" && <TesteSom tipo="inferior" onResult={(ok) => handleResult(testeAtual.id, ok)} />}
                    {testeAtual.id === "som_auricular" && <TesteSom tipo="auricular" onResult={(ok) => handleResult(testeAtual.id, ok)} />}
                    {testeAtual.id === "vibracao" && <TesteVibracao onResult={(ok) => handleResult(testeAtual.id, ok)} />}
                    {testeAtual.id === "touch" && <TesteTouch onResult={(ok) => handleResult(testeAtual.id, ok)} />}
                    {testeAtual.id === "tela_display" && <TesteTela onResult={(ok) => handleResult(testeAtual.id, ok)} />}
                    {testeAtual.id === "camera_traseira" && <TesteCamera tipo="traseira" onResult={(ok) => handleResult(testeAtual.id, ok)} />}
                    {testeAtual.id === "camera_frontal" && <TesteCamera tipo="frontal" onResult={(ok) => handleResult(testeAtual.id, ok)} />}
                    {testeAtual.id === "microfone" && <TesteMicrofone onResult={(ok) => handleResult(testeAtual.id, ok)} />}
                    {testeAtual.id === "wifi" && <TesteConectividade onResult={(ok) => handleResult(testeAtual.id, ok)} />}
                </div>
            </div>
        );
    }

    // === TELA FINAL ===
    if (estado === "done") {
        const totalOk = Object.values(resultados).filter(r => r === "ok").length;
        const totalDefeito = Object.values(resultados).filter(r => r === "defeito").length;
        const tudoOk = totalDefeito === 0;

        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6">
                <div className="text-center max-w-sm w-full">
                    <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${tudoOk ? "bg-emerald-500/20" : "bg-amber-500/20"
                        }`}>
                        {tudoOk
                            ? <CheckCircle2 size={56} className="text-emerald-400" />
                            : <Shield size={56} className="text-amber-400" />
                        }
                    </div>

                    <h1 className="text-2xl font-bold text-white mb-2">
                        {tudoOk ? "Todos os Testes OK! ✅" : "Diagnóstico Concluído"}
                    </h1>
                    <p className="text-white/60 text-sm mb-6">
                        {tudoOk
                            ? "O aparelho passou em todos os testes de funcionalidade."
                            : `${totalDefeito} teste(s) apresentaram problema.`
                        }
                    </p>

                    {/* Resumo */}
                    <div className="bg-white/5 rounded-2xl border border-white/10 p-4 mb-6 text-left">
                        <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">Resultado</p>
                        <div className="space-y-2">
                            {TESTES.map(t => {
                                const r = resultados[t.id];
                                return (
                                    <div key={t.id} className="flex items-center justify-between py-1">
                                        <span className="text-white/80 text-sm flex items-center gap-2">
                                            <span>{t.emoji}</span> {t.label}
                                        </span>
                                        <span className={`text-sm font-bold ${r === "ok" ? "text-emerald-400" : "text-red-400"}`}>
                                            {r === "ok" ? "✅ OK" : "❌ Defeito"}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex gap-2 mb-3">
                        <div className="flex-1 bg-emerald-500/20 rounded-xl p-3 text-center">
                            <span className="text-2xl font-black text-emerald-400">{totalOk}</span>
                            <p className="text-emerald-400/60 text-[10px] font-bold uppercase">Aprovados</p>
                        </div>
                        <div className="flex-1 bg-red-500/20 rounded-xl p-3 text-center">
                            <span className="text-2xl font-black text-red-400">{totalDefeito}</span>
                            <p className="text-red-400/60 text-[10px] font-bold uppercase">Reprovados</p>
                        </div>
                    </div>

                    <button
                        onClick={enviarResultados}
                        disabled={enviando}
                        className="w-full py-5 rounded-2xl bg-indigo-600 text-white font-bold text-xl active:scale-95 transition-transform shadow-xl shadow-indigo-500/30 disabled:opacity-50 mt-4"
                    >
                        {enviando ? "Enviando..." : "📤 Enviar Resultado para a OS"}
                    </button>

                    <p className="text-white/30 text-xs mt-4">
                        OS #{String(osInfo?.numero).padStart(4, "0")} • {osInfo?.equipamento?.marca} {osInfo?.equipamento?.modelo}
                    </p>
                </div>
            </div>
        );
    }

    return null;
}
