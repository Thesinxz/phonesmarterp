"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import {
    Zap,
    CreditCard,
    ShoppingBag,
    Pause,
    Play,
    Maximize,
    Minimize,
    RefreshCw,
    AlertCircle,
    Wifi,
    Clock,
    Tag,
    Shield,
    ChevronLeft,
    ChevronRight,
    QrCode
} from "lucide-react";
import type { VitrineResponse, ProdutoVitrine } from "@/types/vitrine";
import { useRealtimeSubscription } from "@/hooks/useRealtime";

function formatBRL(centavos: number): string {
    return (centavos / 100).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
    });
}

function formatTime(date: Date): string {
    return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(date: Date): string {
    return date.toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
    });
}

// ── Slide do Produto para TV (Tela Cheia) ──
function ProductSlide({
    produto,
    mostrarGrade,
    subdominio,
    isActive
}: {
    produto: ProdutoVitrine;
    mostrarGrade: boolean;
    subdominio: string;
    isActive: boolean;
}) {
    const melhorParcela = produto.parcelas.length > 0
        ? produto.parcelas[produto.parcelas.length - 1]
        : null;

    const shareUrl = typeof window !== "undefined"
        ? `${window.location.origin}/v/${subdominio}/produto/${produto.id}`
        : "";

    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(shareUrl)}`;

    return (
        <div className={`
            absolute inset-0 flex flex-col lg:flex-row items-center justify-center p-10 lg:p-20 gap-16 transition-all duration-1000 ease-in-out
            ${isActive ? "opacity-100 scale-100 translate-x-0" : "opacity-0 scale-110 translate-x-20 pointer-events-none"}
        `}>
            {/* Esquerda: Imagem Gigante */}
            <div className="w-full lg:w-1/2 h-full flex items-center justify-center relative">
                <div className="relative w-full aspect-square max-h-[70vh] rounded-[4rem] bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10 overflow-hidden shadow-[0_0_100px_rgba(99,102,241,0.15)] group">
                    {produto.imagem_url ? (
                        <img
                            src={produto.imagem_url}
                            alt={produto.nome}
                            className="w-full h-full object-contain p-12 transition-transform duration-[10s] ease-linear group-hover:scale-110"
                        />
                    ) : (
                        <ShoppingBag className="w-40 h-40 text-slate-800" />
                    )}

                    {/* Badge Condição */}
                    {produto.condicao && (
                        <div className="absolute top-10 left-10">
                            <span className="px-8 py-3 rounded-2xl text-xl font-black uppercase tracking-widest bg-indigo-500 text-white shadow-2xl">
                                {produto.condicao === "novo_lacrado" ? "Novo Lacrado" : produto.condicao === "seminovo" ? "Seminovo" : "Usado"}
                            </span>
                        </div>
                    )}
                </div>

                {/* QR Code Flutuante na Imagem */}
                <div className="absolute -bottom-8 -right-8 bg-white p-4 rounded-[2rem] shadow-2xl border-4 border-slate-900 group">
                    <div className="relative">
                        <img src={qrCodeUrl} alt="QR Code" className="w-32 h-32 lg:w-48 lg:h-48" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-xl">
                            <p className="text-[10px] font-black text-slate-900 text-center px-2">APONTE A CÂMERA<br />PARA COMPRAR</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Direita: Info e Preços Gigantes */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center space-y-10">
                <div className="space-y-4">
                    {produto.categoria && (
                        <span className="inline-flex items-center gap-2 text-xl text-indigo-400 font-black uppercase tracking-[0.3em]">
                            <Tag size={20} />
                            {produto.categoria}
                        </span>
                    )}
                    <h2 className="text-7xl lg:text-9xl font-black text-white leading-[0.9] tracking-tighter drop-shadow-2xl">
                        {produto.nome}
                    </h2>
                </div>

                {/* Grades e Specs */}
                <div className="flex flex-wrap gap-4">
                    {mostrarGrade && produto.grade && (
                        <span className={`
                            px-8 py-3 rounded-2xl text-2xl font-black uppercase border-4
                            ${produto.grade === "A" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" :
                                produto.grade === "B" ? "bg-blue-500/10 text-blue-400 border-blue-500/30" :
                                    "bg-orange-500/10 text-orange-400 border-orange-500/30"}
                        `}>
                            Grade {produto.grade}
                        </span>
                    )}
                    {produto.capacidade && (
                        <span className="px-8 py-3 rounded-2xl text-2xl font-black bg-white/5 text-slate-300 border-4 border-white/10 uppercase">
                            {produto.capacidade}
                        </span>
                    )}
                    {produto.cor && (
                        <span className="px-8 py-3 rounded-2xl text-2xl font-black bg-white/5 text-slate-300 border-4 border-white/10 uppercase">
                            {produto.cor}
                        </span>
                    )}
                </div>

                {/* Preços */}
                <div className="space-y-6 pt-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3 text-emerald-400">
                            <Zap size={32} />
                            <span className="text-2xl font-black uppercase tracking-[0.2em]">À vista no Pix</span>
                        </div>
                        <p className="text-[10rem] lg:text-[14rem] font-black text-emerald-400 leading-none tracking-tighter drop-shadow-[0_0_30px_rgba(52,211,153,0.3)]">
                            {formatBRL(produto.preco_pix).replace("R$", "").trim()}
                            <span className="text-5xl lg:text-6xl text-emerald-500/50 -ml-4 uppercase italic">Pix</span>
                        </p>
                    </div>

                    {melhorParcela && (
                        <div className="inline-block bg-indigo-500/10 border-l-[12px] border-indigo-500 rounded-r-[3rem] px-12 py-8">
                            <p className="text-3xl font-black text-white/60 uppercase tracking-widest mb-2 flex items-center gap-3">
                                <CreditCard size={28} />
                                No Cartão
                            </p>
                            <p className="text-6xl lg:text-8xl font-black text-indigo-300 tracking-tighter">
                                {melhorParcela.qtd}x de {formatBRL(melhorParcela.valor_parcela)}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Página Modo TV (Slideshow) ──
export default function VitrineTV() {
    const params = useParams();
    const subdominio = params.subdominio as string;

    const [vitrineData, setVitrineData] = useState<VitrineResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Slideshow state
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
    const [slideTime, setSlideTime] = useState(10); // segundos
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [lastRefresh, setLastRefresh] = useState(new Date());

    const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // ── Fetch Data ──
    const fetchData = useCallback(async () => {
        try {
            const res = await fetch(`/api/vitrine/${subdominio}/produtos`);
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Erro ao carregar");
            }
            const data: VitrineResponse = await res.json();
            setVitrineData(data);
            setLastRefresh(new Date());
            setError(null);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [subdominio]);

    // Realtime Sync
    useRealtimeSubscription({
        table: "produtos",
        filter: vitrineData?.empresa.id ? `empresa_id=eq.${vitrineData.empresa.id}` : undefined,
        callback: () => fetchData()
    });

    useRealtimeSubscription({
        table: "configuracoes",
        filter: vitrineData?.empresa.id ? `empresa_id=eq.${vitrineData.empresa.id}` : undefined,
        callback: () => fetchData()
    });

    useEffect(() => {
        if (subdominio) fetchData();
    }, [subdominio, fetchData]);

    // ── Relógio ──
    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);

    // ── Slideshow Timer ──
    useEffect(() => {
        if (!isPlaying || !vitrineData?.produtos.length) return;

        const timer = setInterval(() => {
            setCurrentIndex(prev => (prev + 1) % vitrineData.produtos.length);
        }, slideTime * 1000);

        return () => clearInterval(timer);
    }, [isPlaying, slideTime, vitrineData?.produtos.length]);

    // ── Keyboard controls ──
    useEffect(() => {
        function handleKey(e: KeyboardEvent) {
            switch (e.key) {
                case " ":
                    e.preventDefault();
                    setIsPlaying(prev => !prev);
                    showControlsBriefly();
                    break;
                case "f":
                case "F":
                    toggleFullscreen();
                    break;
                case "ArrowRight":
                    nextSlide();
                    break;
                case "ArrowLeft":
                    prevSlide();
                    break;
                case "+":
                case "=":
                    setSlideTime(prev => Math.max(prev - 2, 4));
                    showControlsBriefly();
                    break;
                case "-":
                    setSlideTime(prev => Math.min(prev + 2, 30));
                    showControlsBriefly();
                    break;
            }
        }

        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [vitrineData]);

    const nextSlide = () => {
        if (!vitrineData?.produtos.length) return;
        setCurrentIndex(prev => (prev + 1) % vitrineData.produtos.length);
        showControlsBriefly();
    };

    const prevSlide = () => {
        if (!vitrineData?.produtos.length) return;
        setCurrentIndex(prev => (prev - 1 + vitrineData.produtos.length) % vitrineData.produtos.length);
        showControlsBriefly();
    };

    // ── Fullscreen ──
    useEffect(() => {
        function handleFsChange() {
            setIsFullscreen(!!document.fullscreenElement);
        }
        document.addEventListener("fullscreenchange", handleFsChange);
        return () => document.removeEventListener("fullscreenchange", handleFsChange);
    }, []);

    function toggleFullscreen() {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            document.documentElement.requestFullscreen();
        }
    }

    // ── Controls UI ──
    function showControlsBriefly() {
        setShowControls(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-6 bg-[#020617]">
                <RefreshCw className="animate-spin text-indigo-400" size={80} />
                <p className="text-slate-400 font-black text-4xl animate-pulse tracking-tighter">SINCRONIZANDO VITRINE...</p>
            </div>
        );
    }

    if (error || !vitrineData) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-8 bg-[#020617] p-10 text-center">
                <AlertCircle size={100} className="text-red-500" />
                <div>
                    <h2 className="text-6xl font-black text-white tracking-tighter">CONEXÃO PERDIDA</h2>
                    <p className="text-slate-400 mt-4 text-2xl max-w-2xl mx-auto">{error || "Não foi possível carregar os produtos. Verifique sua conexão."}</p>
                </div>
                <button
                    onClick={() => window.location.reload()}
                    className="px-10 py-5 bg-white/5 border-4 border-white/10 text-white rounded-[2rem] text-2xl font-black hover:bg-white/10 transition-all uppercase"
                >
                    Tentar Novamente
                </button>
            </div>
        );
    }

    const { empresa, config, produtos } = vitrineData;

    return (
        <div
            className="h-screen bg-[#020617] overflow-hidden relative cursor-none select-none"
            onMouseMove={showControlsBriefly}
        >
            {/* ── Background Patterns ── */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/10 blur-[150px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/10 blur-[150px] rounded-full" />
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] mix-blend-overlay" />
            </div>

            {/* ── Header Fixo ── */}
            <header className="fixed top-0 left-0 right-0 z-50 p-12 flex items-center justify-between">
                <div className="flex items-center gap-8">
                    {empresa.logo_url ? (
                        <img src={empresa.logo_url} alt={`Logo ${empresa.nome}`} className="w-24 h-24 object-contain rounded-[2rem] bg-white p-2 shadow-[0_0_50px_rgba(99,102,241,0.4)]" />
                    ) : (
                        <div className="w-24 h-24 rounded-[2rem] bg-indigo-500 flex items-center justify-center shadow-[0_0_50px_rgba(99,102,241,0.4)]">
                            <ShoppingBag className="w-12 h-12 text-white" />
                        </div>
                    )}
                    <div>
                        <h1 className="text-white font-black text-6xl tracking-tighter leading-none">{empresa.nome}</h1>
                        <p className="text-indigo-400 text-2xl font-black uppercase tracking-[0.4em] mt-2">{config.titulo}</p>
                    </div>
                </div>

                <div className="flex items-center gap-12">
                    <div className="text-right">
                        <p className="text-[6rem] font-black text-white tracking-tighter leading-none tabular-nums drop-shadow-lg">
                            {formatTime(currentTime)}
                        </p>
                        <p className="text-slate-500 text-2xl font-black uppercase tracking-widest mt-2 drop-shadow-md">
                            {formatDate(currentTime)}
                        </p>
                    </div>
                </div>
            </header>

            {/* ── Slideshow Container ── */}
            <div className="h-full w-full relative">
                {produtos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full">
                        <ShoppingBag size={150} className="text-slate-900 mb-10" />
                        <p className="text-6xl text-slate-800 font-black uppercase tracking-tighter">Vitrine Vazia</p>
                    </div>
                ) : (
                    produtos.map((produto, index) => (
                        <ProductSlide
                            key={produto.id}
                            produto={produto}
                            mostrarGrade={config.mostrar_grade}
                            subdominio={subdominio}
                            isActive={index === currentIndex}
                        />
                    ))
                )}
            </div>

            {/* ── Footer / Barra de Progresso ── */}
            <footer className="fixed bottom-0 left-0 right-0 z-50 p-12">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 text-emerald-400">
                            <Wifi size={24} />
                            <span className="text-xl font-bold uppercase tracking-widest">Loja Online</span>
                        </div>
                        <div className="h-2 w-2 rounded-full bg-slate-800" />
                        <span className="text-xl font-bold text-slate-500 uppercase tracking-widest">
                            Produto {currentIndex + 1} de {produtos.length}
                        </span>
                    </div>

                    <div className="flex items-center gap-4 text-slate-600 text-xl font-black italic">
                        <ShoppingBag size={24} />
                        SMART OS TV MODE
                    </div>
                </div>

                {/* Progress Bar Slideshow */}
                <div className="h-4 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <div
                        key={currentIndex}
                        className="h-full bg-gradient-to-r from-indigo-500 via-emerald-500 to-indigo-500 animate-progress origin-left"
                        style={{ animationDuration: `${slideTime}s` }}
                    />
                </div>
            </footer>

            {/* ── Controles Flutuantes ── */}
            <div className={`
                fixed bottom-32 left-1/2 -translate-x-1/2 z-[100]
                bg-slate-900/95 backdrop-blur-2xl rounded-[3rem] border-4 border-white/10
                px-10 py-5 flex items-center gap-8 shadow-[0_0_100px_rgba(0,0,0,0.5)]
                transition-all duration-500
                ${showControls ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10 pointer-events-none"}
            `}>
                <button onClick={prevSlide} className="p-4 rounded-2xl hover:bg-white/10 text-white transition-all transform hover:scale-110 active:scale-95">
                    <ChevronLeft size={40} />
                </button>

                <button
                    onClick={() => setIsPlaying(prev => !prev)}
                    className="w-24 h-24 flex items-center justify-center rounded-[2rem] bg-indigo-500 text-white shadow-xl hover:bg-indigo-400 transition-all transform hover:scale-110 active:scale-95"
                >
                    {isPlaying ? <Pause size={48} fill="white" /> : <Play size={48} fill="white" className="ml-2" />}
                </button>

                <button onClick={nextSlide} className="p-4 rounded-2xl hover:bg-white/10 text-white transition-all transform hover:scale-110 active:scale-95">
                    <ChevronRight size={40} />
                </button>

                <div className="h-16 w-px bg-white/10 mx-2" />

                <div className="flex flex-col items-center">
                    <span className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Velocidade</span>
                    <div className="flex items-center gap-4">
                        <button onClick={() => setSlideTime(t => Math.min(t + 2, 30))} className="text-slate-400 hover:text-white">-</button>
                        <span className="text-2xl font-black text-white min-w-[3ch] text-center">{slideTime}s</span>
                        <button onClick={() => setSlideTime(t => Math.max(t - 2, 4))} className="text-slate-400 hover:text-white">+</button>
                    </div>
                </div>

                <div className="h-16 w-px bg-white/10 mx-2" />

                <button onClick={toggleFullscreen} className="p-4 rounded-2xl hover:bg-white/10 text-white transition-all transform hover:scale-110">
                    <Maximize size={40} />
                </button>
            </div>

            <style jsx global>{`
                @keyframes progress {
                    from { transform: scaleX(0); }
                    to { transform: scaleX(1); }
                }
                .animate-progress {
                    animation-name: progress;
                    animation-timing-function: linear;
                    animation-fill-mode: forwards;
                }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 0px;
                }
            `}</style>
        </div>
    );
}
