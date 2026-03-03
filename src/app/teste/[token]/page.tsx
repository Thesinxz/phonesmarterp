"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, XCircle, Smartphone, Shield, Maximize2, Play, List } from "lucide-react";
import { TesteSom } from "@/components/teste/TesteSom";
import { TesteTouch } from "@/components/teste/TesteTouch";
import { TesteTela } from "@/components/teste/TesteTela";
import { TesteCamera } from "@/components/teste/TesteCamera";
import { TesteMicrofone } from "@/components/teste/TesteMicrofone";
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
    { id: "auto_falante", label: "Alto-falante Inferior", emoji: "🔊" },
    { id: "som_auricular", label: "Auricular (Topo)", emoji: "🔈" },
    { id: "touch", label: "Touch Screen", emoji: "👆" },
    { id: "tela_display", label: "Tela / Display", emoji: "🎨" },
    { id: "camera_traseira", label: "Câmera Traseira", emoji: "📸" },
    { id: "camera_frontal", label: "Câmera Frontal", emoji: "🤳" },
    { id: "microfone", label: "Microfone", emoji: "🎤" },
    { id: "wifi", label: "Wi-Fi / Internet", emoji: "📶" },
];

export default function TestePage({ params }: { params: { token: string } }) {
    const [estado, setEstado] = useState<"loading" | "ready" | "testing" | "done" | "error" | "selective">("loading");
    const [osInfo, setOsInfo] = useState<OSInfo | null>(null);
    const [erroMsg, setErroMsg] = useState("");
    const [stepAtual, setStepAtual] = useState(0);
    const [resultados, setResultados] = useState<Record<string, TestResult>>({});
    const [enviando, setEnviando] = useState(false);
    const [modoAutomatico, setModoAutomatico] = useState(true);

    useEffect(() => {
        carregarOS();
    }, []);

    const toggleFullscreen = () => {
        const doc = document.documentElement;
        if (!document.fullscreenElement) {
            if (doc.requestFullscreen) {
                doc.requestFullscreen().catch(err => console.log(err));
            } else if ((doc as any).webkitRequestFullscreen) { /* Safari */
                (doc as any).webkitRequestFullscreen();
            } else if ((doc as any).msRequestFullscreen) { /* IE11 */
                (doc as any).msRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if ((document as any).webkitExitFullscreen) {
                (document as any).webkitExitFullscreen();
            }
        }
    };

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

        if (modoAutomatico) {
            if (stepAtual < TESTES.length - 1) {
                setTimeout(() => setStepAtual(prev => prev + 1), 300);
            } else {
                // Último teste
                setTimeout(() => setEstado("done"), 300);
            }
        } else {
            // No modo seletivo, após o resultado, volta para a lista
            setEstado("selective");
        }
    };

    const iniciarTesteSeletivo = (index: number) => {
        setStepAtual(index);
        setModoAutomatico(false);
        setEstado("testing");
        toggleFullscreen();
    };

    const iniciarDiagnosticoCompleto = () => {
        setModoAutomatico(true);
        setStepAtual(0);
        setEstado("testing");
        toggleFullscreen();
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
            } else {
                setEstado("done");
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
            <div className="min-h-screen flex items-center justify-center bg-slate-950">
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
            <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950">
                <div className="text-center max-w-sm">
                    <XCircle size={64} className="text-red-500 mx-auto mb-4" />
                    <h1 className="text-xl font-bold text-white mb-2">Teste Indisponível</h1>
                    <p className="text-white/60 text-sm">{erroMsg}</p>
                </div>
            </div>
        );
    }

    // === TELA INICIAL ===
    if (estado === "ready" || estado === "selective") {
        const totalTestados = Object.keys(resultados).length;

        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-950">
                <div className="text-center max-w-sm w-full">
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

                    <div className="flex flex-col gap-2 mt-4">
                        <button
                            onClick={toggleFullscreen}
                            className="py-3 rounded-xl bg-white/5 border border-white/10 text-white/70 font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all"
                        >
                            <Maximize2 size={14} /> ⛶ ATIVAR TELA CHEIA
                        </button>
                    </div>

                    <div className="mt-8 bg-white/5 rounded-2xl p-4 border border-white/10 text-left">
                        <div className="flex justify-between items-center mb-4">
                            <p className="text-white/60 text-xs font-bold uppercase tracking-wider">Bateria de Testes ({TESTES.length})</p>
                            <span className="text-indigo-400 text-[10px] font-bold">{totalTestados}/{TESTES.length} concluídos</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {TESTES.map((t, index) => (
                                <button
                                    key={t.id}
                                    onClick={() => iniciarTesteSeletivo(index)}
                                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all active:scale-95 ${resultados[t.id] === "ok" ? "bg-emerald-500/10 border-emerald-500/20" :
                                        resultados[t.id] === "defeito" ? "bg-red-500/10 border-red-500/20" :
                                            "bg-white/5 border-white/10"
                                        }`}
                                >
                                    <span className="text-xl">{t.emoji}</span>
                                    <div className="flex flex-col min-w-0">
                                        <p className="text-[10px] font-bold text-white truncate">{t.label}</p>
                                        <p className={`text-[8px] font-black uppercase ${resultados[t.id] === "ok" ? "text-emerald-400" :
                                            resultados[t.id] === "defeito" ? "text-red-400" : "text-white/30"
                                            }`}>
                                            {resultados[t.id] === "ok" ? "✓ OK" :
                                                resultados[t.id] === "defeito" ? "✗ Falha" : "Pendente"}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 mt-8">
                        <button
                            onClick={iniciarDiagnosticoCompleto}
                            className="w-full py-5 rounded-2xl bg-indigo-600 text-white font-bold text-xl active:scale-95 transition-transform shadow-xl shadow-indigo-500/30 flex items-center justify-center gap-3"
                        >
                            <Play size={24} fill="currentColor" /> Diagnóstico Completo
                        </button>

                        {totalTestados > 0 && (
                            <button
                                onClick={() => setEstado("done")}
                                className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold text-lg active:scale-95 transition-transform"
                            >
                                Finalizar e Enviar
                            </button>
                        )}
                    </div>

                    <p className="mt-4 text-[10px] text-white/30 uppercase font-bold tracking-widest text-center">
                        Toque em um teste para realizar individualmente
                    </p>
                </div>
            </div>
        );
    }

    // === TELA DE TESTES ===
    if (estado === "testing") {
        const testeAtual = TESTES[stepAtual];

        return (
            <div className="min-h-screen flex flex-col bg-slate-950">
                {/* Barra de progresso */}
                <div className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-white/5 p-4 safe-area-top">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setEstado(modoAutomatico ? "ready" : "selective")}
                                className="p-2 rounded-lg bg-white/5 text-white/50"
                            >
                                <List size={14} />
                            </button>
                            <span className="text-white/60 text-xs font-bold">
                                {modoAutomatico ? `Teste ${stepAtual + 1}/${TESTES.length}` : "Teste Individual"}
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            {modoAutomatico && <span className="text-indigo-400 text-xs font-bold">{progresso}%</span>}
                            <button
                                onClick={toggleFullscreen}
                                className="p-2 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:text-white transition-colors"
                                title="Tela Cheia"
                            >
                                <Maximize2 size={14} />
                            </button>
                        </div>
                    </div>
                    {modoAutomatico && (
                        <>
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
                        </>
                    )}
                </div>

                {/* Conteúdo do teste atual */}
                <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
                    {testeAtual.id === "auto_falante" && <TesteSom tipo="inferior" onResult={(ok) => handleResult(testeAtual.id, ok)} />}
                    {testeAtual.id === "som_auricular" && <TesteSom tipo="auricular" onResult={(ok) => handleResult(testeAtual.id, ok)} />}
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
            <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-950">
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

                    <div className="bg-white/5 rounded-2xl border border-white/10 p-4 mb-6 text-left max-h-60 overflow-y-auto scrollbar-thin">
                        <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">Resultado</p>
                        <div className="space-y-2">
                            {TESTES.map(t => {
                                const r = resultados[t.id];
                                return (
                                    <div key={t.id} className="flex items-center justify-between py-1 border-b border-white/5 last:border-0">
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

                    <button
                        onClick={() => setEstado("selective")}
                        className="w-full mt-4 py-3 rounded-xl text-white/40 text-xs font-bold uppercase tracking-widest hover:text-white"
                    >
                        Voltar e Corrigir Testes
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
