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
    ChevronUp,
    ChevronDown,
    RefreshCw,
    AlertCircle,
    Wifi,
    Clock,
    Tag,
    Shield,
} from "lucide-react";
import type { VitrineResponse, ProdutoVitrine } from "@/types/vitrine";

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

// ── Card do Produto para TV (fontes grandes) ──
function TVProdutoCard({ produto, mostrarGrade }: { produto: ProdutoVitrine; mostrarGrade: boolean }) {
    const melhorParcela = produto.parcelas.length > 0
        ? produto.parcelas[produto.parcelas.length - 1]
        : null;

    return (
        <div className="bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/10 rounded-3xl overflow-hidden transition-all duration-500 hover:border-white/20 group">
            {/* Imagem placeholder ou real */}
            <div className="aspect-[4/3] bg-gradient-to-br from-slate-800/60 to-slate-900/80 flex items-center justify-center relative overflow-hidden">
                {produto.imagem_url ? (
                    <img
                        src={produto.imagem_url}
                        alt={produto.nome}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                ) : (
                    <ShoppingBag className="w-20 h-20 text-slate-700" />
                )}

                {/* Grade badge grande */}
                {mostrarGrade && produto.grade && (
                    <div className="absolute top-5 left-5">
                        <span className={`
                            px-5 py-2.5 rounded-2xl text-lg font-black uppercase tracking-wider backdrop-blur-md
                            ${produto.grade === "A" ? "bg-emerald-500/20 text-emerald-300 border-2 border-emerald-500/40" :
                                produto.grade === "B" ? "bg-blue-500/20 text-blue-300 border-2 border-blue-500/40" :
                                    "bg-orange-500/20 text-orange-300 border-2 border-orange-500/40"}
                        `}>
                            Grade {produto.grade}
                        </span>
                    </div>
                )}

                {/* Últimas unidades */}
                {produto.poucas_unidades && (
                    <div className="absolute top-5 right-5">
                        <span className="px-4 py-2 rounded-xl text-sm font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                            Últimas unidades
                        </span>
                    </div>
                )}
            </div>

            {/* Conteúdo */}
            <div className="p-8 space-y-5">
                {/* Nome */}
                <div>
                    <h3 className="text-white font-black text-3xl leading-tight line-clamp-2 tracking-tight">
                        {produto.nome}
                    </h3>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                        {produto.categoria && (
                            <span className="inline-flex items-center gap-1.5 text-base text-indigo-300 bg-indigo-500/15 px-4 py-1.5 rounded-xl font-bold border border-indigo-500/20">
                                <Tag size={14} />
                                {produto.categoria}
                            </span>
                        )}
                        {produto.condicao && produto.condicao !== "novo_lacrado" && (
                            <span className="text-base font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-4 py-1.5 rounded-xl">
                                {produto.condicao === "seminovo" ? "Seminovo" : produto.condicao === "usado" ? "Usado" : "Peça/Insumo"}
                            </span>
                        )}
                        {produto.memoria_ram && (
                            <span className="text-lg text-slate-400 bg-slate-800/80 px-4 py-1.5 rounded-xl font-bold">
                                {produto.memoria_ram} RAM
                            </span>
                        )}
                        {produto.capacidade && (
                            <span className="text-lg text-slate-400 bg-slate-800/80 px-4 py-1.5 rounded-xl font-bold">
                                {produto.capacidade}
                            </span>
                        )}
                        {produto.cor && (
                            <span className="text-lg text-slate-400 bg-slate-800/80 px-4 py-1.5 rounded-xl font-bold">
                                {produto.cor}
                            </span>
                        )}
                        {(produto.garantia_dias ?? 0) > 0 && (
                            <span className="inline-flex items-center gap-1.5 text-sm text-cyan-300 bg-cyan-500/10 px-3 py-1.5 rounded-xl font-bold border border-cyan-500/20">
                                <Shield size={12} />
                                {produto.garantia_dias}d garantia
                            </span>
                        )}
                    </div>
                </div>

                {/* Separador gradiente */}
                <div className="h-0.5 bg-gradient-to-r from-emerald-500/30 via-indigo-500/30 to-transparent rounded-full" />

                {/* Preço Pix — DESTAQUE MÁXIMO */}
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Zap size={22} className="text-emerald-400" />
                        <span className="text-base font-bold uppercase tracking-widest text-emerald-400/80">
                            À vista no Pix
                        </span>
                    </div>
                    <p className="text-6xl font-black text-emerald-400 tracking-tighter leading-none">
                        {formatBRL(produto.preco_pix)}
                    </p>
                </div>

                {/* Parcelas */}
                {melhorParcela && (
                    <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl px-6 py-4">
                        <div className="flex items-center gap-2 mb-1">
                            <CreditCard size={18} className="text-indigo-400" />
                            <span className="text-sm font-bold uppercase tracking-widest text-indigo-400/80">
                                Parcelado no Cartão
                            </span>
                        </div>
                        <p className="text-3xl font-bold text-indigo-300 tracking-tight">
                            {melhorParcela.qtd}x de {formatBRL(melhorParcela.valor_parcela)}
                        </p>
                        {melhorParcela.taxa > 0 && (
                            <p className="text-sm text-slate-500 mt-1">
                                Total: {formatBRL(melhorParcela.valor_total)}
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Página Modo TV ──
export default function VitrineTV() {
    const params = useParams();
    const subdominio = params.subdominio as string;

    const [vitrineData, setVitrineData] = useState<VitrineResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Auto-scroll state
    const [isScrolling, setIsScrolling] = useState(true);
    const [scrollSpeed, setScrollSpeed] = useState(1); // 1 = normal, 0.5 = slow, 2 = fast
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [lastRefresh, setLastRefresh] = useState(new Date());

    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const animationFrameRef = useRef<number | null>(null);

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

    // Fetch inicial + auto-refresh a cada 5 minutos
    useEffect(() => {
        if (subdominio) fetchData();
        const interval = setInterval(fetchData, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [subdominio, fetchData]);

    // ── Relógio ──
    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);

    // ── Auto-scroll ──
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container || !isScrolling) return;

        let lastTimestamp = 0;
        const pixelsPerSecond = 30 * scrollSpeed; // 30px/s base

        function step(timestamp: number) {
            if (!container) return;

            if (lastTimestamp) {
                const delta = (timestamp - lastTimestamp) / 1000;
                container.scrollTop += pixelsPerSecond * delta;

                // Loop: quando chega ao final, volta ao topo suavemente
                const maxScroll = container.scrollHeight - container.clientHeight;
                if (container.scrollTop >= maxScroll - 2) {
                    container.scrollTop = 0;
                }
            }

            lastTimestamp = timestamp;
            animationFrameRef.current = requestAnimationFrame(step);
        }

        animationFrameRef.current = requestAnimationFrame(step);

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [isScrolling, scrollSpeed]);

    // ── Keyboard controls ──
    useEffect(() => {
        function handleKey(e: KeyboardEvent) {
            switch (e.key) {
                case " ":
                    e.preventDefault();
                    setIsScrolling(prev => !prev);
                    showControlsBriefly();
                    break;
                case "f":
                case "F":
                    toggleFullscreen();
                    break;
                case "+":
                case "=":
                    setScrollSpeed(prev => Math.min(prev + 0.5, 4));
                    showControlsBriefly();
                    break;
                case "-":
                    setScrollSpeed(prev => Math.max(prev - 0.5, 0.5));
                    showControlsBriefly();
                    break;
                case "Escape":
                    if (document.fullscreenElement) {
                        document.exitFullscreen();
                    }
                    break;
            }
        }

        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, []);

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

    // ── Show controls on mouse move ──
    function showControlsBriefly() {
        setShowControls(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
    }

    function handleMouseMove() {
        showControlsBriefly();
    }

    // ── Loading ──
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-6 bg-slate-950">
                <RefreshCw className="animate-spin text-indigo-400" size={64} />
                <p className="text-slate-400 font-medium text-2xl animate-pulse">Carregando vitrine...</p>
            </div>
        );
    }

    // ── Error ──
    if (error || !vitrineData) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-8 bg-slate-950">
                <AlertCircle size={64} className="text-red-400" />
                <div className="text-center">
                    <h2 className="text-3xl font-bold text-white">Loja não encontrada</h2>
                    <p className="text-slate-400 mt-2 text-lg">{error}</p>
                </div>
            </div>
        );
    }

    const { empresa, config, produtos } = vitrineData;

    return (
        <div
            className="h-screen bg-slate-950 overflow-hidden relative cursor-none select-none"
            onMouseMove={handleMouseMove}
        >
            {/* ── Header Fixo ── */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-slate-950 via-slate-950/95 to-transparent pb-8 pt-6 px-10">
                <div className="flex items-center justify-between">
                    {/* Logo + Nome */}
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-indigo-500 flex items-center justify-center shadow-xl shadow-indigo-500/30">
                            <ShoppingBag className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-white font-black text-3xl tracking-tight">{empresa.nome}</h1>
                            <p className="text-slate-500 text-lg font-medium">{config.titulo}</p>
                        </div>
                    </div>

                    {/* Relógio + Status */}
                    <div className="flex items-center gap-8">
                        {/* Indicador de conexão */}
                        <div className="flex items-center gap-2">
                            <Wifi size={18} className="text-emerald-400" />
                            <span className="text-sm text-slate-500">Atualizado {formatTime(lastRefresh)}</span>
                        </div>

                        {/* Relógio grande */}
                        <div className="text-right">
                            <p className="text-5xl font-black text-white tracking-tighter tabular-nums">
                                {formatTime(currentTime)}
                            </p>
                            <p className="text-slate-500 text-sm capitalize">
                                {formatDate(currentTime)}
                            </p>
                        </div>
                    </div>
                </div>
            </header>

            {/* ── Grid Scrollável ── */}
            <div
                ref={scrollContainerRef}
                className="h-screen overflow-y-auto scroll-smooth pt-36 pb-32 px-10"
                style={{ scrollbarWidth: "none" }}
            >
                {produtos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center min-h-[60vh]">
                        <ShoppingBag size={80} className="text-slate-800 mb-6" />
                        <p className="text-3xl text-slate-600 font-bold">Nenhum produto disponível</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-3 gap-8 max-w-[1800px] mx-auto">
                        {produtos.map((produto) => (
                            <TVProdutoCard
                                key={produto.id}
                                produto={produto}
                                mostrarGrade={config.mostrar_grade}
                            />
                        ))}

                        {/* Padding no final para o scroll loop funcionar */}
                        <div className="col-span-3 h-[50vh]" />
                    </div>
                )}
            </div>

            {/* ── Footer Fixo ── */}
            <footer className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent pt-8 pb-6 px-10">
                <div className="flex items-center justify-between">
                    <p className="text-slate-700 text-sm">
                        © {new Date().getFullYear()} {empresa.nome} • Powered by <span className="text-indigo-500 font-bold">SmartOS</span>
                    </p>
                    <div className="flex items-center gap-2 text-slate-700 text-sm">
                        <Clock size={14} />
                        <span>Auto-refresh a cada 5 minutos</span>
                    </div>
                </div>
            </footer>

            {/* ── Controles Flutuantes (aparecem no mouse move) ── */}
            <div className={`
                fixed bottom-20 left-1/2 -translate-x-1/2 z-50
                bg-slate-800/90 backdrop-blur-xl rounded-2xl border border-white/10
                px-6 py-3 flex items-center gap-4
                transition-all duration-500
                ${showControls ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}
            `}>
                {/* Play/Pause */}
                <button
                    onClick={() => setIsScrolling(prev => !prev)}
                    className="p-2 rounded-xl hover:bg-white/10 text-white transition-colors"
                    title="Space para pausar/retomar"
                >
                    {isScrolling ? <Pause size={20} /> : <Play size={20} />}
                </button>

                {/* Velocidade */}
                <div className="flex items-center gap-2 border-l border-white/10 pl-4">
                    <button
                        onClick={() => setScrollSpeed(prev => Math.max(prev - 0.5, 0.5))}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                    >
                        <ChevronDown size={16} />
                    </button>
                    <span className="text-white font-bold text-sm min-w-[40px] text-center">
                        {scrollSpeed}x
                    </span>
                    <button
                        onClick={() => setScrollSpeed(prev => Math.min(prev + 0.5, 4))}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                    >
                        <ChevronUp size={16} />
                    </button>
                </div>

                {/* Fullscreen */}
                <button
                    onClick={toggleFullscreen}
                    className="p-2 rounded-xl hover:bg-white/10 text-white transition-colors border-l border-white/10 pl-4 ml-2"
                    title="F para fullscreen"
                >
                    {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                </button>

                {/* Atalhos hint */}
                <div className="border-l border-white/10 pl-4 ml-2 text-[10px] text-slate-500 space-y-0.5">
                    <p><kbd className="text-white bg-white/10 px-1.5 py-0.5 rounded">Space</kbd> Pausar</p>
                    <p><kbd className="text-white bg-white/10 px-1.5 py-0.5 rounded">+/-</kbd> Velocidade</p>
                    <p><kbd className="text-white bg-white/10 px-1.5 py-0.5 rounded">F</kbd> Fullscreen</p>
                </div>
            </div>
        </div>
    );
}
